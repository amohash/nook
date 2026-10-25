import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

export type FilterSectionProps = { title: string; helper?: string; children: ReactNode };

export function FilterSection({ title, helper, children }: FilterSectionProps) {
  return <View style={styles.section}>
    <Text accessibilityRole="header" style={styles.title}>{title}</Text>
    {helper && <Text style={styles.helper}>{helper}</Text>}
    {children}
  </View>;
}

const styles = StyleSheet.create({
  section: { gap: theme.spacing.xs, paddingVertical: theme.spacing.lg,
    borderBottomWidth: theme.borders.thin, borderBottomColor: theme.colors.chipBorder },
  title: { color: theme.colors.text, fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.size.section, lineHeight: theme.typography.lineHeight.section,
    fontWeight: theme.typography.weight.bold },
  helper: { color: theme.colors.secondaryText, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.body, lineHeight: theme.typography.lineHeight.body },
});
