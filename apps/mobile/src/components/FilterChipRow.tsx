import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';
import { Chip } from './Chip';

export type FilterChipRowProps = {
  options: { id: 'study' | 'friends'; label: string }[];
  selectedId: 'study' | 'friends' | null;
  onSelect: (id: 'study' | 'friends') => void;
  filterCount: number;
  onOpenFilters: () => void;
};

export function FilterChipRow({ options, selectedId, onSelect, filterCount, onOpenFilters }: FilterChipRowProps) {
  const count = Number.isFinite(filterCount) ? Math.max(0, Math.floor(filterCount)) : 0;
  return <View style={styles.row}>
    <View accessibilityRole="radiogroup" accessibilityLabel="Intent" style={[styles.row, styles.intents]}>
      {options.map(({ id, label }) => <Chip key={id} label={label} selectionRole="radio"
        selected={selectedId === id} onPress={() => onSelect(id)} />)}
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={`Filters, ${count} active filter groups`}
      onPress={onOpenFilters} style={styles.filters}>
      <Text style={styles.label}>Filters</Text>
      {count > 0 && <View style={styles.badge}><Text style={styles.count}>{count}</Text></View>}
    </Pressable>
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.xs, maxWidth: '100%' },
  intents: { flexShrink: 1, minWidth: theme.spacing.none },
  filters: { minHeight: theme.sizes.tapTarget, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.lg, borderRadius: theme.radii.pill,
    borderWidth: theme.borders.thin, borderColor: theme.colors.chipBorder, paddingVertical: theme.spacing.xs },
  label: { color: theme.colors.text, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.body, lineHeight: theme.typography.lineHeight.body },
  badge: { backgroundColor: theme.colors.buttonBackground, borderRadius: theme.radii.pill,
    paddingHorizontal: theme.spacing.xs, paddingVertical: theme.spacing.xxs },
  count: { color: theme.colors.buttonText, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.caption, lineHeight: theme.typography.lineHeight.caption },
});
