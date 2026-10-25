import { useCallback, useEffect, useState } from 'react';
import { BackHandler, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button, ErrorState, LoadingState } from '../../components';
import { useSession } from '../../data/SessionProvider';
import { WelcomeScreen, StudyStyleScreen, LocationScreen } from '../onboarding';
import type { StudyStyleId } from '../onboarding/studyStyle';
import { CAMPUS_ORIGIN } from '../explore/origin';
import { useOrigin } from '../explore/useOrigin';
import { theme } from '../../theme';
import type { Query } from '@space/contracts';

export function OnboardingFlow() {
  const {session, setQuery, finishOnboarding} = useSession();
  const [step, setStep] = useState(0);
  const [styles, setStyles] = useState<StudyStyleId[]>(session?.settings.styles ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
  const finish = async (choices: StudyStyleId[]) => {
    if (saving) return;
    location.cancel(); setSaving(true); setError(null);
    try { await finishOnboarding(choices); router.replace('/'); }
    catch {setError('Preferences could not be saved on this device. Try again.');}
    finally {setSaving(false);}
  };
  if (!session) return null;
  if (saving) return <View style={s.page}><LoadingState message="Saving preferences on this device…" /></View>;
  if (error) return <View style={s.page}><ErrorState title="Could not save preferences" message={error}
    action={{label: 'Retry', onPress: () => {void finish(styles);}}} />
    <Button label="Back" variant="outline" onPress={() => setError(null)} /></View>;
  if (step === 0) return <WelcomeScreen onGetStarted={() => setStep(1)}
    onSkip={() => {setStyles([]); void finish([]);}} />;
  if (step === 1) return <View style={s.fill}>
    <Text style={[s.note, {paddingTop: insets.top + 12}]}>Silent + Some chatter uses Balanced noise. Group tables is a vibe, not seat availability. Coffee nearby and Whiteboards are saved-only choices; no supported matching evidence yet.</Text>
    <StudyStyleScreen initialSelected={styles} onBack={back}
      onContinue={(selected) => {setStyles(selected); setStep(2);}}
      onSkip={() => {setStyles(session.settings.styles); setStep(2);}} />
  </View>;
  return <LocationScreen options={[{id: 'ut-austin', label: 'UT Austin main campus', origin: {...CAMPUS_ORIGIN, source: 'manual'}}]}
    selectedId={session.query.origin.source === 'manual' ? 'ut-austin' : null}
    onSelect={location.useManual} onUseLocation={() => {void location.useDevice();}}
    onBack={back} onContinue={() => {void finish(styles);}}
    status={location.busy ? 'requesting' : session.query.origin.source === 'device' ? 'ready' : 'idle'}
    deviceOriginLabel={session.query.origin.source === 'device' ? 'Device location · one-time reading' : undefined}
    error={location.error} />;
}
const s = StyleSheet.create({
  fill: {flex: 1, backgroundColor: theme.colors.background},
  page: {flex: 1, padding: 24, justifyContent: 'center', gap: 16, backgroundColor: theme.colors.background},
  note: {color: theme.colors.textMuted, backgroundColor: theme.colors.background, padding: 12, fontSize: 12},
});
