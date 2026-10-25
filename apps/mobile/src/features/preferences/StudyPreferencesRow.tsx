import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme/theme';

export type StudyPreferencesRowProps = {
  onPress: () => void;
  /** Saved labels from getPreferenceTags/usePreferenceTags; empty shows the default hint. */
  tags?: readonly string[];
};

export function StudyPreferencesRow({ onPress, tags = [] }: StudyPreferencesRowProps) {
  const summary = tags.length ? tags.join(' · ') : 'Study style, starting point and limits';
  return <Pressable accessibilityRole="button" accessibilityLabel="Study preferences" accessibilityHint={summary}
    onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
    <View style={styles.text}>
      <Text style={styles.title}>Study preferences</Text>
      <Text style={styles.summary}>{summary}</Text>
    </View>
    <Text importantForAccessibility="no" accessibilityElementsHidden style={styles.chevron}>›</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  row: { minHeight: theme.sizes.tapTarget, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
    paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.lg, backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.field, borderWidth: theme.borders.thin, borderColor: theme.colors.chipBorder },
  pressed: { backgroundColor: theme.colors.placeholder },
  text: { flex: 1, gap: theme.spacing.xxs },
  title: { color: theme.colors.text, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.button, lineHeight: theme.typography.lineHeight.button,
    fontWeight: theme.typography.weight.semibold },
  summary: { color: theme.colors.secondaryText, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.body, lineHeight: theme.typography.lineHeight.body },
  chevron: { color: theme.colors.textMuted, fontSize: theme.typography.size.title,
    lineHeight: theme.typography.lineHeight.title },
});
