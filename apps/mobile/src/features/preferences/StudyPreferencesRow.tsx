import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme/theme';

export type StudyPreferencesRowProps = {
  onPress: () => void;
  /** Saved labels from getPreferenceTags/usePreferenceTags; empty shows the default hint. */
  tags?: readonly string[];
  /** link: compact "Edit study preferences ›" row for the Profile vibe card (docs/design/social-profile-own.png). */
  variant?: 'card' | 'link';
};

export function StudyPreferencesRow({ onPress, tags = [], variant = 'card' }: StudyPreferencesRowProps) {
  const summary = tags.length ? tags.join(' · ') : 'Study style, starting point and limits';
  if (variant === 'link') return <Pressable accessibilityRole="button" accessibilityLabel="Edit study preferences"
    accessibilityHint={summary} onPress={onPress} style={({ pressed }) => [styles.link, pressed && styles.linkPressed]}>
    <Text style={styles.linkText}>Edit study preferences</Text>
    <Text importantForAccessibility="no" accessibilityElementsHidden style={styles.linkChevron}>›</Text>
  </Pressable>;
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
  link: { minHeight: theme.sizes.tapTarget, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  linkPressed: { opacity: theme.opacity.disabled },
  linkText: { flex: 1, color: theme.colors.sageText, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.button, lineHeight: theme.typography.lineHeight.button },
  linkChevron: { color: theme.colors.sageText, fontSize: theme.typography.size.section,
    lineHeight: theme.typography.lineHeight.section },
});
