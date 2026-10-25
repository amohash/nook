import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, ErrorState, LoadingState } from '../../components';
import { useSession } from '../../data/SessionProvider';
import { WelcomeScreen, StudyStyleScreen, LocationScreen } from '../onboarding';
import type { StudyStyleId } from '../onboarding/studyStyle';
import { CAMPUS_ORIGIN } from '../explore/origin';
import { useOrigin } from '../explore/useOrigin';
import { createInitialQuery } from '../../data/initialQuery';
import { PreferenceSchema } from '../../data/settings';
import type { PreferenceValues } from '../preferences';
import { theme } from '../../theme';
import type { Query } from '@space/contracts';

export function OnboardingFlow() {
  const {session, setQuery, finishOnboarding} = useSession();
  const [step, setStep] = useState(0);
  const [styles, setStyles] = useState<StudyStyleId[]>(session?.settings.styles ?? []);
  const [preferences, setPreferences] = useState<PreferenceValues>(() => session!.settings.preferences);
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const select = useCallback((origin: Query['origin']) => setQuery((current) => ({...current, origin})), [setQuery]);
  const location = useOrigin(select);
  const back = useCallback(() => {if (!saving) { location.cancel(); setError(null); setStep((value) => Math.max(0, value - 1)); }}, [saving, location.cancel]);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (saving) return true;
      if (step > 0) {back(); return true;}
      return false;
    });
    return () => subscription.remove();
  }, [step, saving, back]);
  const finish = async (choices: StudyStyleId[], values = preferences) => {
    if (savingRef.current) return;
    savingRef.current = true;
    location.cancel(); setSaving(true); setError(null);
    try { await finishOnboarding(choices, values); router.replace('/(tabs)/map'); }
    catch {setError('Preferences could not be saved on this device. Try again.');}
    finally {savingRef.current = false; setSaving(false);}
  };
  if (!session) return null;
  if (saving) return <View style={s.page}><LoadingState message="Saving preferences on this device…" /></View>;
  if (error) return <View style={s.page}><ErrorState title="Could not save preferences" message={error}
    action={{label: 'Retry', onPress: () => {void finish(styles);}}} />
    <Button label="Back" variant="outline" onPress={() => setError(null)} /></View>;
  if (step === 0) return <WelcomeScreen onGetStarted={() => setStep(1)}
    onSkip={() => {
      const defaults = PreferenceSchema.parse(createInitialQuery(session.city, new Date().toISOString()));
      location.useManual(); setStyles([]); setPreferences(defaults); void finish([], defaults);
    }} />;
  if (step === 1) return <StudyStyleScreen initialSelected={styles} selected={styles} onSelectedChange={setStyles}
    preferences={preferences} onPreferencesChange={setPreferences} onBack={back}
    onContinue={(selected) => {setStyles(selected); setStep(2);}}
    onSkip={() => {setStyles(session.settings.styles); setPreferences(session.settings.preferences); setStep(2);}} />;
  return <LocationScreen options={[{id: 'ut-austin', label: 'UT Austin main campus', origin: {...CAMPUS_ORIGIN, source: 'manual'}}]}
    selectedId={session.query.origin.source === 'manual' ? 'ut-austin' : null}
    onSelect={location.useManual} onUseLocation={() => {void location.useDevice();}}
    onBack={back} onContinue={() => {void finish(styles);}}
    status={location.busy ? 'requesting' : session.query.origin.source === 'device' ? 'ready' : 'idle'}
    deviceOriginLabel={session.query.origin.source === 'device' ? 'Device location · one-time reading' : undefined}
    error={location.error} />;
}
const s = StyleSheet.create({
  page: {flex: 1, padding: 24, justifyContent: 'center', gap: 16, backgroundColor: theme.colors.background},
});
