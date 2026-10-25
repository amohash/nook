import { SessionGate } from '../src/features/session/SessionGate';
import { useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { PreferencesScreen, type PreferenceValues } from '../src/features/preferences';
import { Button } from '../src/components';
import { useSession } from '../src/data/SessionProvider';
import { createInitialQuery } from '../src/data/initialQuery';
import { PreferenceSchema } from '../src/data/settings';
import { theme } from '../src/theme';

function Preferences() {
  const {session, savePreferences, reset} = useSession();
  const [draft, setDraft] = useState<PreferenceValues>(() => PreferenceSchema.parse(session!.query));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mounted = useRef(true);
  useEffect(() => {mounted.current = true; return () => {mounted.current = false;};}, []);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => saving);
    return () => subscription.remove();
  }, [saving]);
  const back = () => {if (!saving) {if (router.canGoBack()) router.back(); else router.replace('/');}};
  const save = async () => {
    if (saving) return;
    setSaving(true); setError(null);
    try {await savePreferences(draft); if (mounted.current) {if (router.canGoBack()) router.back(); else router.replace('/');}}
    catch {setError('Preferences could not be saved on this device. Your previous settings are unchanged.');}
    finally {setSaving(false);}
  };
  const resetApp = async () => {
    if (saving) return;
    setSaving(true); setError(null);
    try {await reset(); if (mounted.current) router.replace('/onboarding');}
    catch {setError('Reset could not be saved. Please try again.');}
    finally {setSaving(false);}
  };
  if (!session) return null;
  return <View style={s.page}>
    <Stack.Screen options={{headerShown: false, gestureEnabled: !saving}} />
    <PreferencesScreen value={draft} onChange={setDraft} onSave={() => {void save();}}
      onCancel={back} onReset={() => setDraft(PreferenceSchema.parse(createInitialQuery(session.city, new Date().toISOString())))}
      saving={saving} error={error} />
    <View style={[s.reset, {paddingBottom: Math.max(insets.bottom, 16)}]}><Button label="Reset local preferences, saves & onboarding" variant="outline" disabled={saving}
      onPress={() => {void resetApp();}} /></View>
  </View>;
}
const s = StyleSheet.create({page: {flex: 1, backgroundColor: theme.colors.background},
  reset: {padding: 16}});

export default function PreferencesRoute() {return <SessionGate><Preferences /></SessionGate>;}
