import { SessionGate } from '../src/features/session/SessionGate';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, StyleSheet, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import type { Query } from '@space/contracts';
import { PreferencesScreen, type PreferenceValues } from '../src/features/preferences';
import type { StudyStyleId } from '../src/features/onboarding';
import { useSession } from '../src/data/SessionProvider';
import { createInitialQuery } from '../src/data/initialQuery';
import { PreferenceSchema } from '../src/data/settings';
import { CAMPUS_ORIGIN } from '../src/features/explore/origin';
import { useOrigin } from '../src/features/explore/useOrigin';
import { theme } from '../src/theme';

// Off by default: redo currently goes through reset(), which also clears saved places.
const REDO_ONBOARDING_ENABLED = process.env.EXPO_PUBLIC_REDO_ONBOARDING === '1';

function Preferences() {
  const {session, savePreferences, setQuery, reset} = useSession();
  const [draft, setDraft] = useState<PreferenceValues>(() => session!.settings.preferences);
  const [styles, setStyles] = useState<StudyStyleId[]>(() => [...session!.settings.styles]);
  const [origin, setOrigin] = useState<Query['origin']>(() => session!.query.origin);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const mounted = useRef(true);
  const selectOrigin = useCallback((next: Query['origin']) => {setOrigin(next); setSaved(false);}, []);
  const location = useOrigin(selectOrigin);
  useEffect(() => {mounted.current = true; return () => {mounted.current = false;};}, []);
  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(timer);
  }, [saved]);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => saving);
    return () => subscription.remove();
  }, [saving]);
  if (!session) return null;
  const dirty = JSON.stringify(draft) !== JSON.stringify(session.settings.preferences)
    || JSON.stringify(styles) !== JSON.stringify(session.settings.styles)
    || JSON.stringify(origin) !== JSON.stringify(session.query.origin);
  const back = () => {if (!saving) {location.cancel(); if (router.canGoBack()) router.back(); else router.replace('/');}};
  const persist = async (values: PreferenceValues, choices: StudyStyleId[], start: Query['origin']) => {
    if (saving) return;
    location.cancel(); setSaving(true); setSaved(false); setError(null);
    try {
      await savePreferences(values, choices);
      // Origin is session state (not persisted); apply it only after the save succeeds.
      setQuery((current) => JSON.stringify(current.origin) === JSON.stringify(start) ? current : {...current, origin: start});
      if (mounted.current) setSaved(true);
    } catch {if (mounted.current) setError('Preferences could not be saved on this device. Your previous settings are unchanged.');}
    finally {if (mounted.current) setSaving(false);}
  };
  const resetToDefaults = () => {
    const defaults = PreferenceSchema.parse(createInitialQuery(session.city, new Date().toISOString()));
    const start = {...CAMPUS_ORIGIN, source: 'manual' as const};
    setDraft(defaults); setStyles([]); setOrigin(start);
    void persist(defaults, [], start);
  };
  const redoOnboarding = async () => {
    if (saving) return;
    location.cancel(); setSaving(true); setError(null);
    try {await reset(); if (mounted.current) router.replace('/onboarding');}
    catch {if (mounted.current) setError('Reset could not be saved. Please try again.');}
    finally {if (mounted.current) setSaving(false);}
  };
  return <View style={s.page}>
    <Stack.Screen options={{headerShown: false, gestureEnabled: !saving}} />
    <PreferencesScreen value={draft} onChange={(value) => {setDraft(value); setSaved(false);}}
      styles={styles} onStylesChange={(value) => {setStyles(value); setSaved(false);}}
      origin={{origin, busy: location.busy, error: location.error, accuracyMeters: location.accuracyMeters,
        onDevice: () => {void location.useDevice();}, onManual: location.useManual}}
      onSave={() => {void persist(draft, styles, origin);}} onCancel={back}
      onReset={resetToDefaults} onRedoOnboarding={REDO_ONBOARDING_ENABLED ? () => {void redoOnboarding();} : undefined}
      dirty={dirty} saved={saved} saving={saving} error={error} />
  </View>;
}
const s = StyleSheet.create({page: {flex: 1, backgroundColor: theme.colors.background}});

export default function PreferencesRoute() {return <SessionGate><Preferences /></SessionGate>;}
