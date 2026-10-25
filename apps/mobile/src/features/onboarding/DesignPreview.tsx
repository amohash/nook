import { useState } from 'react';
import { Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Button, ExploreDesignPreview } from '../../components';
import { theme } from '../../theme';
import { createDemoQuery } from '@space/fixtures';
import { PreferencesScreen, type PreferenceValues } from '../preferences';
import { LocationScreen } from './LocationScreen';
import { StudyStyleScreen } from './StudyStyleScreen';
import { WelcomeScreen } from './WelcomeScreen';
import type { StudyStyleId } from './studyStyle';

export type DesignPreviewProps = { screen?: 'welcome' | 'study-style' | 'location' | 'preferences' | 'components' };

/** Development-only isolated screens. No routes, storage, GPS request or real save.
 * D mounts a chosen screen in the existing shell for device review. */
export function DesignPreview({ screen = 'study-style' }: DesignPreviewProps) {
  const [showComponents, setShowComponents] = useState(screen === 'components');
  const [query] = useState(() => createDemoQuery());
  const [preferences, setPreferences] = useState<PreferenceValues>(query);
  const [styles, setStyles] = useState<StudyStyleId[]>(['quiet', 'outlets']);
  const [selectedId, setSelectedId] = useState<string | null>('ut-austin');
  const back = () => Alert.alert('Preview: Back pressed');
  const skip = () => Alert.alert('Preview: Skip pressed — nothing saved');
  if (showComponents) return <SafeAreaProvider>
    <StatusBar style="dark" />
    <ExploreDesignPreview onClose={screen === 'components' ? undefined : () => setShowComponents(false)} />
  </SafeAreaProvider>;
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
      styles={styles} onStylesChange={setStyles}
      origin={{ origin: query.origin, busy: false, error: null, accuracyMeters: null,
        onDevice: () => Alert.alert('Preview only', 'D connects foreground GPS. No permission requested in this preview.'),
        onManual: () => Alert.alert('Preview: Use UT Austin pressed') }}
      onSave={() => Alert.alert('Preview preferences — not saved')} onCancel={back}
      onReset={() => {setPreferences(createDemoQuery()); setStyles([]);}}
      onRedoOnboarding={() => Alert.alert('Preview: Redo onboarding pressed — nothing cleared')} />}
    <SafeAreaView edges={['bottom']} style={{ paddingHorizontal: theme.spacing.xl, backgroundColor: theme.colors.background }}>
      <Button label="Explore component states" variant="outline" onPress={() => setShowComponents(true)} />
    </SafeAreaView>
  </SafeAreaProvider>;
}
