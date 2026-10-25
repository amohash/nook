import { useState } from 'react';
import { Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createDemoQuery } from '@space/fixtures';
import { PreferencesScreen, type PreferenceValues } from '../preferences';
import { LocationScreen } from './LocationScreen';
import { StudyStyleScreen } from './StudyStyleScreen';
import { WelcomeScreen } from './WelcomeScreen';

export type DesignPreviewProps = { screen?: 'welcome' | 'study-style' | 'location' | 'preferences' };

/** Development-only isolated screens. No routes, storage, GPS request or real save.
 * D mounts a chosen screen in the existing shell for device review. */
export function DesignPreview({ screen = 'study-style' }: DesignPreviewProps) {
  const [query] = useState(() => createDemoQuery());
  const [preferences, setPreferences] = useState<PreferenceValues>(query);
  const [selectedId, setSelectedId] = useState<string | null>('ut-austin');
  const back = () => Alert.alert('Preview: Back pressed');
  const skip = () => Alert.alert('Preview: Skip pressed — nothing saved');
  return <SafeAreaProvider>
    <StatusBar style="dark" />
    {screen === 'welcome' && <WelcomeScreen onGetStarted={() => Alert.alert('Preview: Get started pressed')} onSkip={skip} />}
    {screen === 'study-style' && <StudyStyleScreen onBack={back} onSkip={skip}
      onContinue={(selected) => Alert.alert('Preview selection — not saved', selected.join(', ') || 'No choices selected')} />}
    {screen === 'location' && <LocationScreen onBack={back} selectedId={selectedId} onSelect={setSelectedId}
      options={[{ id: 'ut-austin', label: 'UT Austin main campus', origin: { ...query.origin, source: 'manual' } }]}
      onUseLocation={() => Alert.alert('Preview only', 'D connects foreground GPS. No permission requested in this preview.')}
      onContinue={() => Alert.alert('Preview starting point — not saved', selectedId ?? 'None')} />}
    {screen === 'preferences' && <PreferencesScreen value={preferences} onChange={setPreferences}
      onSave={() => Alert.alert('Preview preferences — not saved')} onCancel={back}
      onReset={() => setPreferences(createDemoQuery())} />}
  </SafeAreaProvider>;
}
