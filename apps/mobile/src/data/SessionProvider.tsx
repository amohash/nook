import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode, type SetStateAction } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QuerySchema, type DiscoveryResponse, type TesterSessionResponse, type City, type Query } from '@space/contracts';
import { provider, recovery } from '.';
import { queryAfterSwitch } from './recovery';
import { createInitialQuery } from './initialQuery';
import { applyPreferences, applyStudyStyles, onboardingQuery, createSettingsStore, defaultSettings, PreferenceSchema, RankingPreferencesSchema,
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
  savePreferences(values: PreferenceValues, styles?: StudyStyleId[]): Promise<void>;
  reset(): Promise<void>;
  nearby: {enabled: boolean; busy: boolean; result: DiscoveryResponse | null; error: string | null};
  testerSession: TesterSessionResponse | null;
  authorizeNearby(accessCode: string): Promise<void>;
  refreshNearby(): void;
  toggleSaved(id: string): Promise<void>;
};
const Context = createContext<SessionValue | null>(null);
export function SessionProvider({children}: {children: ReactNode}) {
  const {revision} = useSyncExternalStore(recovery.subscribe, recovery.getState, recovery.getState);
  const [testerSession, setTesterSession] = useState<TesterSessionResponse | null>(null);
  const [nearbyAttempt, setNearbyAttempt] = useState(0);
  const [nearbyState, setNearbyState] = useState<{key: string; busy: boolean; result: DiscoveryResponse | null; error: string | null} | null>(null);
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
  const nearbyEnabled = process.env.EXPO_PUBLIC_NEARBY_ENABLED === '1' && recovery.getState().choice === 'api' && session?.city.mode !== 'demo';
  const originKey = session ? JSON.stringify([revision, session.query.origin]) : '';
  const discoveryGeneration = useRef(0);
  const refreshRequested = useRef(false);
  useEffect(() => {setTesterSession(null); setNearbyState(null);}, [revision]);
  useEffect(() => {
    const generation = ++discoveryGeneration.current;
    if (!nearbyEnabled || !session || !testerSession) return;
    let active = true;
    const key = originKey;
    const origin = session.query.origin;
    const refresh = refreshRequested.current;
    refreshRequested.current = false;
    const current = () => active && generation === discoveryGeneration.current && revision === recovery.getState().revision;
    setNearbyState({key, busy: true, result: null, error: null});
    void provider.discover!({sessionId: testerSession.sessionId, origin, refresh}).then((result) => {
      if (!current()) return;
      setNearbyState({key, busy: false, result, error: null});
      setSession((value) => value && JSON.stringify(value.query.origin) === JSON.stringify(origin)
        ? {...value, query: QuerySchema.parse({...value.query, snapshotId: result.snapshotId ?? undefined})} : value);
    }).catch(() => {if (current()) setNearbyState({key, busy: false, result: null,
      error: 'Nearby discovery unavailable. Retry, renew tester access, or explicitly choose an offline dataset.'});});
    return () => {active = false;};
    // Filters are deliberately excluded: only origin, access and explicit Refresh acquire candidates.
  }, [originKey, nearbyEnabled, testerSession, nearbyAttempt, revision, setSession]);
  const authorizeNearby = async (accessCode: string) => {
    const result = await provider.createTesterSession!({accessCode});
    if (revision !== recovery.getState().revision) return;
    ++discoveryGeneration.current;
    setNearbyState(null);
    setSession((value) => value ? {...value, query: {...value.query, snapshotId: undefined}} : value);
    setTesterSession(result);
  };
  const refreshNearby = () => {
    refreshRequested.current = true;
    ++discoveryGeneration.current;
    setSession((value) => value ? {...value, query: {...value.query, snapshotId: undefined}} : value);
    setNearbyState(null); setNearbyAttempt((value) => value + 1);
  };
  const currentNearby = nearbyState?.key === originKey ? nearbyState : null;
  const nearby = {enabled: nearbyEnabled, busy: nearbyEnabled && !!testerSession && (!currentNearby || currentNearby.busy),
    result: currentNearby?.result ?? null, error: currentNearby?.error ?? null};
  const setQuery = useCallback((update: SetStateAction<Query>) => {
    setSession((current) => {
      if (!current) return current;
      const query = QuerySchema.parse(typeof update === 'function' ? update(current.query) : update);
      if (JSON.stringify(query.origin) !== JSON.stringify(current.query.origin)) {
        query.snapshotId = undefined;
        ++discoveryGeneration.current;
      }
      return {...current, query};
    });
  }, [setSession]);
  const finishOnboarding = async (styles: StudyStyleId[], values?: PreferenceValues) => {
    if (!session) throw new Error('Session unavailable');
    const query = onboardingQuery(session.query, styles, values ?? session.settings.preferences);
    const settings = await store.update(settingsKey(session.city), (current) => ({...(current ?? session.settings),
      completed: true, styles, preferences: PreferenceSchema.parse(query), rankingPreferences: RankingPreferencesSchema.parse(query)}));
    setSession((current) => current ? {...current, settings,
      query: {...query, origin: current.query.origin, departAt: current.query.departAt}} : current);
  };
  // Optional styles mirror restoredQuery: explicit preference edits stay authoritative over style tags.
  const savePreferences = async (values: PreferenceValues, styles?: StudyStyleId[]) => {
    if (!session) throw new Error('Session unavailable');
    const preferences = PreferenceSchema.parse(values);
    const apply = (query: Query) => applyPreferences(styles ? applyStudyStyles(query, styles) : query, preferences);
    const query = apply(session.query);
    const settings = await store.update(settingsKey(session.city), (current) => ({...(current ?? session.settings), preferences,
      ...(styles ? {styles} : {}), rankingPreferences: RankingPreferencesSchema.parse(query)}));
    setSession((current) => current ? {...current, settings, query: apply(current.query)} : current);
  };
  const toggleSaved = async (id: string) => {
    if (!session) throw new Error('Session unavailable');
    const savingNew = !session.settings.savedIds.includes(id);
    const detail = savingNew ? await provider.getSpot(id,
      nearby.result?.snapshot?.spots.some((spot) => spot.id === id) ? session.query.snapshotId : undefined) : null;
    const settings = await store.update(settingsKey(session.city), (current) => {
      const value = current ?? session.settings;
      const ids = value.savedIds;
      const removing = ids.includes(id);
      const savedPlaces = (value.savedPlaces ?? []).filter((item) => item.spot.id !== id);
      return {...value, savedIds: removing ? ids.filter((item) => item !== id) : [...ids, id],
        savedPlaces: !removing && detail ? [...savedPlaces, detail] : savedPlaces};
    });
    const {savedIds, savedPlaces} = settings;
    setSession((current) => current ? {...current, settings: {...current.settings, savedIds, savedPlaces}} : current);
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
    recoverStorage, setQuery, finishOnboarding, savePreferences, reset, toggleSaved, nearby, testerSession, authorizeNearby, refreshNearby}}>{children}</Context.Provider>;
}
export function useSession() {
  const context = useContext(Context);
  if (!context) throw new Error('SessionProvider missing');
  return context;
}
