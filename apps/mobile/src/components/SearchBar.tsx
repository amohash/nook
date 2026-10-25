import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { theme } from '../theme';

export type SearchBarProps = {
  value: string;
  onChangeText: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  accessibilityLabel?: string;
};

export function SearchBar({ value, onChangeText, onSubmit, placeholder = 'Search areas or places',
  accessibilityLabel = 'Search starting point' }: SearchBarProps) {
  return <View style={styles.bar}>
    <TextInput value={value} onChangeText={onChangeText} onSubmitEditing={() => onSubmit?.(value)}
      accessibilityLabel={accessibilityLabel} placeholder={placeholder} placeholderTextColor={theme.colors.textMuted}
      returnKeyType="search" style={styles.input} />
    {value.length > 0 && <Pressable accessibilityRole="button" accessibilityLabel="Clear search"
      onPress={() => onChangeText('')} style={styles.clear}><Text style={styles.clearText}>×</Text></Pressable>}
  </View>;
}
const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.background,
    borderWidth: theme.borders.thin, borderColor: theme.colors.chipBorder, borderRadius: theme.radii.pill,
    paddingHorizontal: theme.spacing.lg },
  input: { flex: 1, minWidth: theme.spacing.none, minHeight: theme.sizes.tapTarget, paddingVertical: theme.spacing.md,
    color: theme.colors.text, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.button, lineHeight: theme.typography.lineHeight.button },
  clear: { minWidth: theme.sizes.tapTarget, minHeight: theme.sizes.tapTarget, alignItems: 'center', justifyContent: 'center' },
  clearText: { color: theme.colors.textMuted, fontSize: theme.typography.size.title },
});
