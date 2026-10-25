import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Chip, ChipGroup, ErrorState, FilterSection, LoadingState, OriginCard, SegmentedControl,
  type OriginCardProps } from '../../components';
import { theme } from '../../theme/theme';
import { STUDY_STYLE_OPTIONS, toggleStudyStyle, type StudyStyleId } from '../onboarding/studyStyle';
import { VIBE_LABELS, toggleVibe, type PreferenceValues } from './preferences';

export type PreferencesScreenProps = {
  /** Controlled draft; D supplies defaults/hydration from the one shared adapter. */
  value: PreferenceValues;
  onChange: (value: PreferenceValues) => void;
  /** Same choices as onboarding's Study style step. */
  styles: readonly StudyStyleId[];
  onStylesChange: (styles: StudyStyleId[]) => void;
  /** D's useOrigin state and callbacks; omitted hides the starting point section. */
  origin?: OriginCardProps;
  onSave: () => void;
  onCancel: () => void;
  /** Called only after the user confirms. */
  onReset: () => void;
  /** Called only after the user confirms; omitted hides the link. */
  onRedoOnboarding?: () => void;
  /** Disables Save when there is nothing new to persist. */
  dirty?: boolean;
  /** Shows the small "Saved" confirmation above Save. */
  saved?: boolean;
  loading?: boolean;
  saving?: boolean;
  error?: string | null;
  onRetryLoad?: () => void;
  /** Default to the two intents already supported by D's preset controls. */
  availableIntents?: readonly PreferenceValues['intent'][];
};

const INTENTS = [{ value: 'study', label: 'Study' }, { value: 'friends', label: 'Meet friends' },
  { value: 'date', label: 'Date night' }, { value: 'cheap_eats', label: 'Cheap eats' }] as const;
const PRICES = ([null, 0, 1, 2, 3, 4] as const).map((value) =>
  ({ value, label: value === null ? 'No cap' : value === 0 ? 'Free only' : '$'.repeat(value) }));
const AMENITY_CHOICES = [{ value: 'ignore', label: 'No preference' }, { value: 'prefer', label: 'Prefer' },
  { value: 'require', label: 'Require (strict)' }] as const;
const STYLE_OPTIONS = STUDY_STYLE_OPTIONS.map(({ id, label }) => ({ value: id, label }));

export function PreferencesScreen({ value, onChange, styles: selectedStyles, onStylesChange, origin, onSave, onCancel,
  onReset, onRedoOnboarding, dirty = true, saved = false, loading = false, saving = false, error, onRetryLoad,
  availableIntents = ['study', 'friends'] }: PreferencesScreenProps) {
  const [confirming, setConfirming] = useState<'reset' | 'redo' | null>(null);
  const selectedTags = Object.values(value.tagWeights).filter((weight) => (weight ?? 0) > 0).length;
  const walkOptions = [...new Set([5, 10, 15, 20, 30, 45, 60, value.maxWalkMinutes])].sort((a, b) => a - b)
    .map((minutes) => ({ value: minutes, label: `${minutes} min` }));
  return <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
    <View style={styles.header}>
      <View style={styles.back}><Button label="Back" variant="outline" disabled={saving} onPress={onCancel} /></View>
      <Text accessibilityRole="header" style={styles.title}>Study preferences</Text>
    </View>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Text style={styles.body}>Saved on this device and used as your defaults when finding a place.</Text>
      {loading ? <LoadingState message="Loading your preferences…" /> : <>
        {error && <ErrorState title="Preferences unavailable" message={error}
          action={onRetryLoad ? { label: 'Retry', onPress: onRetryLoad } : undefined} />}
        <FilterSection title="Study style"
          helper="Shown on your profile. Silent, Some chatter and Solo adjust ranking targets; set vibes, Wi-Fi and outlets below.">
          <ChipGroup accessibilityLabel="Study style" options={STYLE_OPTIONS} selected={selectedStyles}
            onToggle={(id) => onStylesChange(toggleStudyStyle(selectedStyles, id))} />
        </FilterSection>
        {origin && <FilterSection title="Starting point"
          helper="Applies when you save, for this session. After a restart the app starts from UT Austin campus.">
          <OriginCard {...origin} />
        </FilterSection>}
        <FilterSection title="What are you planning?">
          <SegmentedControl accessibilityLabel="Intent" value={value.intent}
            options={INTENTS.filter((option) => availableIntents.includes(option.value) || value.intent === option.value)}
            onChange={(intent) => onChange({ ...value, intent })} />
        </FilterSection>
        <FilterSection title="Your vibe" helper="Choose up to three. These are preferences, not promises about available seats.">
          <View style={styles.row}>
            {VIBE_LABELS.map(({ id, label }) => <Chip key={id} label={label} selected={(value.tagWeights[id] ?? 0) > 0}
              disabled={saving || (selectedTags >= 3 && !(value.tagWeights[id] ?? 0))}
              onPress={() => onChange(toggleVibe(value, id))} />)}
          </View>
        </FilterSection>
        <FilterSection title="Maximum price" helper="A price cap is strict and excludes unknown prices. Dollar signs are price levels.">
          <SegmentedControl accessibilityLabel="Maximum price" options={PRICES} value={value.maxPriceLevel}
            onChange={(maxPriceLevel) => onChange({ ...value, maxPriceLevel })} />
        </FilterSection>
        <FilterSection title="Maximum estimated walk">
          <SegmentedControl accessibilityLabel="Maximum estimated walk" options={walkOptions} value={value.maxWalkMinutes}
            onChange={(maxWalkMinutes) => onChange({ ...value, maxWalkMinutes })} />
        </FilterSection>
        <FilterSection title="Wi-Fi and outlets" helper="Prefer influences ranking. Require is strict and excludes unknown evidence.">
          {(['wifi', 'outlets'] as const).map((amenity) => <View key={amenity} style={styles.amenity}>
            <Text style={styles.label}>{amenity === 'wifi' ? 'Wi-Fi' : 'Outlets'}</Text>
            <SegmentedControl accessibilityLabel={amenity === 'wifi' ? 'Wi-Fi preference' : 'Outlets preference'}
              options={AMENITY_CHOICES} value={value.amenities[amenity]}
              onChange={(choice) => onChange({ ...value, amenities: { ...value.amenities, [amenity]: choice } })} />
          </View>)}
        </FilterSection>
        <View style={styles.actions}>
          {confirming ? <View accessibilityLiveRegion="polite" style={styles.confirm}>
            <Text style={styles.label}>{confirming === 'reset' ? 'Reset preferences to defaults?' : 'Redo onboarding?'}</Text>
            <Text style={styles.body}>{confirming === 'reset'
              ? 'Clears your study style and limits, uses UT Austin as the starting point and saves right away. Saved places are kept.'
              : 'Clears your preferences and saved places on this device, then restarts onboarding.'}</Text>
            <Button label={confirming === 'reset' ? 'Reset to defaults' : 'Clear and redo onboarding'} disabled={saving}
              onPress={() => {const action = confirming === 'reset' ? onReset : onRedoOnboarding; setConfirming(null); action?.();}} />
            <Button label="Keep my preferences" variant="outline" onPress={() => setConfirming(null)} />
          </View> : <>
            <Button label="Reset to defaults" variant="outline" disabled={saving} onPress={() => setConfirming('reset')} />
            {onRedoOnboarding && <Button label="Redo onboarding" variant="outline" disabled={saving}
              onPress={() => setConfirming('redo')} />}
          </>}
        </View>
      </>}
    </ScrollView>
    {!loading && <View style={styles.footer}>
      {saved && <Text accessibilityLiveRegion="polite" role="status" style={styles.saved}>✓ Saved</Text>}
      <Button label="Save preferences" busy={saving} disabled={!dirty} onPress={onSave} />
    </View>}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.md },
  back: { minWidth: theme.sizes.controlMinWidth },
  scroll: { flex: 1 },
  page: { flexGrow: 1, width: '100%', maxWidth: theme.sizes.contentMaxWidth, alignSelf: 'center',
    paddingHorizontal: theme.spacing.xl, paddingBottom: theme.spacing.xl },
  title: { flexShrink: 1, color: theme.colors.text, fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.size.title, lineHeight: theme.typography.lineHeight.title,
    fontWeight: theme.typography.weight.bold },
  label: { color: theme.colors.text, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.button, lineHeight: theme.typography.lineHeight.button,
    fontWeight: theme.typography.weight.semibold },
  body: { color: theme.colors.textMuted, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.body, lineHeight: theme.typography.lineHeight.body },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
  amenity: { gap: theme.spacing.xs },
  actions: { gap: theme.spacing.md, paddingTop: theme.spacing.lg },
  confirm: { gap: theme.spacing.md, padding: theme.spacing.lg, backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card },
  footer: { gap: theme.spacing.xs, paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md, borderTopWidth: theme.borders.thin, borderTopColor: theme.colors.chipBorder,
    backgroundColor: theme.colors.background },
  saved: { color: theme.colors.sageText, fontFamily: theme.typography.bodyFamily, textAlign: 'center',
    fontSize: theme.typography.size.body, lineHeight: theme.typography.lineHeight.body,
    fontWeight: theme.typography.weight.semibold },
});
