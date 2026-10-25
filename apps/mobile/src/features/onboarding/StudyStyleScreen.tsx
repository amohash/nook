import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Chip } from '../../components';
import { theme } from '../../theme/theme';
import { STUDY_STYLE_OPTIONS, toggleStudyStyle, type StudyStyleId } from './studyStyle';
import { OnboardingHeader, OnboardingProgress, onboardingStyles as s } from './OnboardingParts';

export type StudyStyleScreenProps = {
  /** D hydrates these from the shared adapter before mounting. Empty on first use.
   * Remount with a new key when resetting onboarding or loading another profile. */
  initialSelected?: readonly StudyStyleId[];
  onBack: () => void;
  /** D persists through the shared adapter here, then advances on success. */
  onContinue: (selected: StudyStyleId[]) => void;
  onSkip: () => void;
  /** D supplies these while persisting; Skip remains a separate non-saving action. */
  saving?: boolean;
  error?: string | null;
};

export function StudyStyleScreen({ initialSelected = [], onBack, onContinue, onSkip, saving = false, error }: StudyStyleScreenProps) {
  const [selected, setSelected] = useState<StudyStyleId[]>(() => [...new Set(initialSelected)]);

  return <SafeAreaView style={s.safeArea}>
    <ScrollView style={s.scroll} contentContainerStyle={s.page}>
      <OnboardingHeader step={2} onBack={onBack} />

      <View style={s.introduction}>
        <Text accessibilityRole="header" style={s.title}>How do you like to study?</Text>
        <Text style={s.helper}>Pick as many as you like. Supported preferences help rank spots that fit the way you study.</Text>
      </View>

      <View style={styles.choices}>
        {STUDY_STYLE_OPTIONS.map(({ id, label }) => <Chip key={id} label={label}
          selected={selected.includes(id)}
          onPress={() => setSelected((current) => toggleStudyStyle(current, id))} />)}
      </View>

      <View style={s.footer}>
        {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        <OnboardingProgress step={2} />
        <View style={s.actions}>
          <Button label="Continue" busy={saving} onPress={() => onContinue([...selected])} />
          <Button label="Skip" variant="outline" onPress={onSkip} />
        </View>
      </View>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  choices: { flexDirection: 'row', flexWrap: 'wrap', columnGap: theme.spacing.xs,
    rowGap: theme.spacing.none, marginTop: theme.spacing.lg },
  error: { ...s.helper, color: theme.colors.error },
});
