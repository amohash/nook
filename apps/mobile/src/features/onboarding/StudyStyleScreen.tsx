import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Chip } from '../../components';
import { theme } from '../../theme/theme';
import { STUDY_STYLE_OPTIONS, toggleStudyStyle, type StudyStyleId } from './studyStyle';
import type { PreferenceValues } from '../preferences';
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
  selected?: readonly StudyStyleId[];
  onSelectedChange?: (selected: StudyStyleId[]) => void;
  preferences?: PreferenceValues;
  onPreferencesChange?: (values: PreferenceValues) => void;
  saving?: boolean;
  error?: string | null;
};

export function StudyStyleScreen({ initialSelected = [], onBack, onContinue, onSkip, saving = false, error, selected: controlled, onSelectedChange, preferences, onPreferencesChange }: StudyStyleScreenProps) {
  const [localSelected, setLocalSelected] = useState<StudyStyleId[]>(() => [...new Set(initialSelected)]);

  const selected = controlled ?? localSelected;
  const setSelected = (next: StudyStyleId[]) => {setLocalSelected(next); onSelectedChange?.(next);};

  return <SafeAreaView style={s.safeArea}>
    <ScrollView style={s.scroll} contentContainerStyle={s.page}>
      <OnboardingHeader step={2} onBack={onBack} />

      <View style={s.introduction}>
        <Text accessibilityRole="header" style={s.title}>What fits your plans?</Text>
        <Text style={s.helper}>Pick what matters. You can change this anytime in Profile.</Text>
      </View>

      {preferences && onPreferencesChange && <View style={styles.sections}>
        <Text style={styles.label}>What are you here for?</Text>
        <View accessibilityRole="radiogroup" accessibilityLabel="Intent" style={styles.choices}>
          {(['study', 'friends'] as const).map((intent) => <Chip key={intent}
            label={intent === 'study' ? 'Study' : 'Meet Friends'} selectionRole="radio"
            selected={preferences.intent === intent} onPress={() => onPreferencesChange({...preferences, intent})} />)}
        </View>
        <Text style={styles.label}>Budget</Text>
        <View accessibilityRole="radiogroup" accessibilityLabel="Budget" style={styles.choices}>
          {([null, 0, 1, 2, 3, 4] as const).map((price) => <Chip key={String(price)}
            label={price === null ? 'Any price' : price === 0 ? 'Free only' : `Up to ${'$'.repeat(price)}`}
            selectionRole="radio" selected={preferences.maxPriceLevel === price}
            onPress={() => onPreferencesChange({...preferences, maxPriceLevel: price})} />)}
        </View>
        <Text style={s.helper}>With a budget set, places with unknown prices are hidden.</Text>
        <Text style={styles.label}>How far will you walk?</Text>
        <View accessibilityRole="radiogroup" accessibilityLabel="Estimated walking limit" style={styles.choices}>
          {[5, 10, 15, 20, 30, 45, 60].map((minutes) => <Chip key={minutes} label={`${minutes} min`}
            selectionRole="radio" selected={preferences.maxWalkMinutes === minutes}
            onPress={() => onPreferencesChange({...preferences, maxWalkMinutes: minutes})} />)}
        </View>
      </View>}
      <Text style={styles.label}>Nice to have</Text>
      <Text style={s.helper}>Shown on your profile. Most also rank places higher; they never hide a place.</Text>
      <View style={styles.choices}>
        {STUDY_STYLE_OPTIONS.map(({ id, label }) => <Chip key={id} label={id === 'coffee_nearby' || id === 'whiteboards' ? `${label} · profile only` : label}
          selected={selected.includes(id)}
          onPress={() => setSelected(toggleStudyStyle(selected, id))} />)}
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
  sections: {gap: theme.spacing.sm, marginTop: theme.spacing.lg},
  label: {...s.helper, color: theme.colors.text, fontWeight: '600', marginTop: theme.spacing.lg},
  choices: { flexDirection: 'row', flexWrap: 'wrap', columnGap: theme.spacing.xs,
    rowGap: theme.spacing.none, marginTop: theme.spacing.lg },
  error: { ...s.helper, color: theme.colors.error },
});
