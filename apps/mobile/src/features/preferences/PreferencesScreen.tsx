import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Chip, ErrorState, LoadingState } from '../../components';
import { theme } from '../../theme/theme';
import { VIBE_LABELS, toggleVibe, type PreferenceValues } from './preferences';

export type PreferencesScreenProps = {
  /** Controlled draft; D supplies defaults/hydration from the one shared adapter. */
  value: PreferenceValues;
  onChange: (value: PreferenceValues) => void;
  onSave: () => void;
  onCancel: () => void;
  /** Reset edits the draft; persistence still occurs only on Save. */
  onReset: () => void;
  loading?: boolean;
  saving?: boolean;
  error?: string | null;
  onRetryLoad?: () => void;
  /** Default to the two intents already supported by D's preset controls. */
  availableIntents?: readonly PreferenceValues['intent'][];
};

export function PreferencesScreen({ value, onChange, onSave, onCancel, onReset, loading = false,
  saving = false, error, onRetryLoad, availableIntents = ['study', 'friends'] }: PreferencesScreenProps) {
  const selectedTags = Object.values(value.tagWeights).filter((weight) => (weight ?? 0) > 0).length;
  const walkOptions = [...new Set([5, 10, 15, 20, 30, 45, 60, value.maxWalkMinutes])].sort((a, b) => a - b);
  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
    {/* iOS edit-form convention: Cancel leading, Save trailing, always reachable. */}
    <View style={styles.bar}>
      <BarButton label="Cancel" disabled={saving} onPress={onCancel} />
      <Text accessibilityRole="header" numberOfLines={1} style={styles.barTitle}>Preferences</Text>
      <BarButton label="Save" emphasized busy={saving} disabled={saving || loading} onPress={onSave} />
    </View>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.page}>
      <Text style={styles.body}>Used to rank places for you. Saved on this device.</Text>
      {loading ? <LoadingState message="Loading your preferences…" /> : <>
        {error && <ErrorState title="Preferences unavailable" message={error}
          action={onRetryLoad ? { label: 'Retry', onPress: onRetryLoad } : undefined} />}
        <Text accessibilityRole="header" style={styles.heading}>What are you planning?</Text>
        <View accessibilityRole="radiogroup" accessibilityLabel="Intent" style={styles.row}>
          {([{ id: 'study', label: 'Study' }, { id: 'friends', label: 'Meet friends' },
            { id: 'date', label: 'Date night' }, { id: 'cheap_eats', label: 'Cheap eats' }] as const)
            .filter(({ id }) => availableIntents.includes(id) || value.intent === id).map(({ id, label }) =>
            <Chip key={id} label={label} selectionRole="radio" selected={value.intent === id} disabled={saving}
              onPress={() => onChange({ ...value, intent: id })} />)}
        </View>
        <Text accessibilityRole="header" style={styles.heading}>Your vibe</Text>
        <Text style={styles.body}>Pick up to three. These rank places higher; they never hide one.</Text>
        <View style={styles.row}>
          {VIBE_LABELS.map(({ id, label }) => <Chip key={id} label={label} selected={(value.tagWeights[id] ?? 0) > 0}
            disabled={saving || (selectedTags >= 3 && !(value.tagWeights[id] ?? 0))}
            onPress={() => onChange(toggleVibe(value, id))} />)}
        </View>
        <Text accessibilityRole="header" style={styles.heading}>Maximum price</Text>
        <Text style={styles.body}>With a cap set, places with unknown prices are hidden.</Text>
        <View accessibilityRole="radiogroup" accessibilityLabel="Maximum price" style={styles.row}>
          {([null, 0, 1, 2, 3, 4] as const).map((price) => <Chip key={String(price)}
            label={price === null ? 'Any price' : price === 0 ? 'Free only' : `Up to ${'$'.repeat(price)}`}
            selectionRole="radio" selected={value.maxPriceLevel === price} disabled={saving}
            onPress={() => onChange({ ...value, maxPriceLevel: price })} />)}
        </View>
        <Text accessibilityRole="header" style={styles.heading}>Walking distance</Text>
        <View accessibilityRole="radiogroup" accessibilityLabel="Maximum estimated walk" style={styles.row}>
          {walkOptions.map((minutes) => <Chip key={minutes} label={`${minutes} min`} selectionRole="radio"
            selected={value.maxWalkMinutes === minutes} disabled={saving}
            onPress={() => onChange({ ...value, maxWalkMinutes: minutes })} />)}
        </View>
        <Text accessibilityRole="header" style={styles.heading}>Wi-Fi and outlets</Text>
        <Text style={styles.body}>Prefer ranks places higher. Require hides places without confirmed Wi-Fi or outlets.</Text>
        {(['wifi', 'outlets'] as const).map((amenity) => <View key={amenity} style={styles.section}>
          <Text style={styles.body}>{amenity === 'wifi' ? 'Wi-Fi' : 'Outlets'}</Text>
          <View accessibilityRole="radiogroup" accessibilityLabel={amenity === 'wifi' ? 'Wi-Fi preference' : 'Outlets preference'} style={styles.row}>
            {(['ignore', 'prefer', 'require'] as const).map((choice) => <Chip key={choice}
              label={choice === 'ignore' ? 'Any' : choice === 'prefer' ? 'Prefer' : 'Require'}
              selectionRole="radio" selected={value.amenities[amenity] === choice} disabled={saving}
              onPress={() => onChange({ ...value, amenities: { ...value.amenities, [amenity]: choice } })} />)}
          </View>
        </View>)}
        <View style={styles.section}>
          <Button label="Reset to defaults" variant="outline" disabled={saving} onPress={onReset} />
        </View>
      </>}
    </ScrollView>
  </SafeAreaView>;
}

function BarButton({ label, onPress, disabled, busy = false, emphasized = false }:
  { label: string; onPress: () => void; disabled: boolean; busy?: boolean; emphasized?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled, busy }} disabled={disabled}
    onPress={onPress} hitSlop={theme.spacing.xs} style={({ pressed }) => [styles.barButton, (pressed || disabled) && styles.dimmed]}>
    {busy ? <ActivityIndicator accessibilityLabel={`${label} in progress`} color={theme.colors.text} />
      : <Text style={[styles.barLabel, emphasized && styles.barLabelEmphasized]}>{label}</Text>}
  </Pressable>;
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.xs,
    minHeight: theme.sizes.tapTarget + theme.spacing.xs, paddingHorizontal: theme.spacing.md,
    borderBottomWidth: theme.borders.thin, borderBottomColor: theme.colors.chipBorder },
  barTitle: { flex: 1, textAlign: 'center', color: theme.colors.text, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.button, lineHeight: theme.typography.lineHeight.button,
    fontWeight: theme.typography.weight.semibold },
  barButton: { minWidth: theme.sizes.tapTarget, minHeight: theme.sizes.tapTarget,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: theme.spacing.xs },
  barLabel: { color: theme.colors.text, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.button, lineHeight: theme.typography.lineHeight.button },
  barLabelEmphasized: { fontWeight: theme.typography.weight.bold },
  dimmed: { opacity: theme.opacity.disabled },
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { flex: 1 },
  page: { flexGrow: 1, width: '100%', maxWidth: theme.sizes.contentMaxWidth, alignSelf: 'center',
    padding: theme.spacing.xl, gap: theme.spacing.lg },
  heading: { color: theme.colors.text, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.button, lineHeight: theme.typography.lineHeight.button,
    fontWeight: theme.typography.weight.semibold },
  body: { color: theme.colors.textMuted, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.body, lineHeight: theme.typography.lineHeight.body },
  row: { flexDirection: 'row', flexWrap: 'wrap', columnGap: theme.spacing.xs },
  section: { gap: theme.spacing.md },
});
