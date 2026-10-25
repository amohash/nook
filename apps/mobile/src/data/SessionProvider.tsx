import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode, type SetStateAction } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QuerySchema, type City, type Query } from '@space/contracts';
import { provider, recovery } from '.';
import { queryAfterSwitch } from './recovery';
import { createInitialQuery } from './initialQuery';
import { applyPreferences, onboardingQuery, createSettingsStore, defaultSettings, PreferenceSchema, RankingPreferencesSchema,
  restoredQuery, settingsKey, type Settings } from './settings';
import type { StudyStyleId } from '../features/onboarding/studyStyle';
import type { PreferenceValues } from '../features/preferences';

const store = createSettingsStore(AsyncStorage);
type Session = {city: City; query: Query; settings: Settings};
type SessionValue = {
  session: Session | null; loading: boolean; error: string | null; retry(): void;
  recoverStorage(): Promise<void>;
  setQuery(update: SetStateAction<Query>): void;
  finishOnboarding(styles: StudyStyleId[], values?: PreferenceValues): Promise<void>;
  savePreferences(values: PreferenceValues): Promise<void>;
  reset(): Promise<void>;
  toggleSaved(id: string): Promise<void>;
};
const Context = createContext<SessionValue | null>(null);
export function SessionProvider({children}: {children: ReactNode}) {
  const {revision} = useSyncExternalStore(recovery.subscribe, recovery.getState, recovery.getState);
  const [session, commitSession] = useState<Session | null>(null);
  const [loadedRevision, setLoadedRevision] = useState(-1);
  const previous = useRef<Session | null>(null);
  // Every async session action captures this setter's generation, including
  // onboarding/preferences saves. Disk writes stay in their original namespace.
  const setSession = useCallback((update: SetStateAction<Session | null>) => {
    if (revision !== recovery.getState().revision) return;
    commitSession((current) => {
      if (revision !== recovery.getState().revision) return current;
      const next = typeof update === 'function' ? update(current) : update;
      if (next) previous.current = next;
      return next;
    });
  }, [revision]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [pendingCity, setPendingCity] = useState<City | null>(null);
  useEffect(() => {
    let active = true;
    const isCurrent = () => active && revision === recovery.getState().revision;
    setLoading(true); setError(null); setPendingCity(null); setSession(null);
    void (async () => {
      const city = (await provider.listCities())[0];
      if (!city) throw new Error('No datasets available');
      if (!isCurrent()) return;
      setPendingCity(city);
      const saved = await store.load(settingsKey(city));
      if (!isCurrent()) return;
      const initial = restoredQuery(city, saved, new Date().toISOString());
      const query = queryAfterSwitch(previous.current?.query, city, initial);
      const settings = saved ?? defaultSettings(query);
      setSession({city, query, settings: {...settings, completed: settings.completed || previous.current?.settings.completed || false}});
      setLoadedRevision(revision);
    })().catch(() => {
      if (isCurrent()) setError('The dataset or local preferences could not be loaded. Check your connection and retry.');
    }).finally(() => {if (isCurrent()) setLoading(false);});
    return () => {active = false;};
  }, [attempt, revision, setSession]);
  const setQuery = useCallback((update: SetStateAction<Query>) => {
    setSession((current) => current ? {...current, query: QuerySchema.parse(
      typeof update === 'function' ? update(current.query) : update)} : current);
  }, [setSession]);
  const finishOnboarding = async (styles: StudyStyleId[], values?: PreferenceValues) => {
    if (!session) throw new Error('Session unavailable');
    const query = onboardingQuery(session.query, styles, values ?? session.settings.preferences);
    const settings = await store.update(settingsKey(session.city), (current) => ({...(current ?? session.settings),
      completed: true, styles, preferences: PreferenceSchema.parse(query), rankingPreferences: RankingPreferencesSchema.parse(query)}));
    setSession((current) => current ? {...current, settings,
      query: {...query, origin: current.query.origin, departAt: current.query.departAt}} : current);
  };
  const savePreferences = async (values: PreferenceValues) => {
    if (!session) throw new Error('Session unavailable');
    const preferences = PreferenceSchema.parse(values);
    const query = applyPreferences(session.query, preferences);
    const settings = await store.update(settingsKey(session.city), (current) => ({...(current ?? session.settings), preferences,
      rankingPreferences: RankingPreferencesSchema.parse(query)}));
    setSession((current) => current ? {...current, settings,
      query: applyPreferences(current.query, preferences)} : current);
  };
  const toggleSaved = async (id: string) => {
    if (!session) throw new Error('Session unavailable');
    const settings = await store.update(settingsKey(session.city), (current) => {
      const value = current ?? session.settings;
      const ids = value.savedIds;
      return {...value, savedIds: ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]};
    });
    const savedIds = settings.savedIds;
    setSession((current) => current ? {...current, settings: {...current.settings, savedIds}} : current);
  };
  const reset = async () => {
    if (!session) throw new Error('Session unavailable');
    const query = createInitialQuery(session.city, new Date().toISOString());
    const settings = defaultSettings(query);
    await store.save(settingsKey(session.city), settings);
    setSession({...session, query, settings});
  };
  const recoverStorage = async () => {
    if (!pendingCity) throw new Error('Dataset unavailable');
    await store.save(settingsKey(pendingCity), defaultSettings(createInitialQuery(pendingCity, new Date().toISOString())));
    if (revision !== recovery.getState().revision) return;
    previous.current = null;
    setAttempt((value) => value + 1);
  };
  return <Context.Provider value={{session: loadedRevision === revision ? session : null, loading: loading || (loadedRevision !== revision && !error), error, retry: () => setAttempt((value) => value + 1),
    recoverStorage, setQuery, finishOnboarding, savePreferences, reset, toggleSaved}}>{children}</Context.Provider>;
}
export function useSession() {
  const context = useContext(Context);
  if (!context) throw new Error('SessionProvider missing');
  return context;
}
