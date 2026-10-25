import { StyleSheet, View } from 'react-native';
import { theme } from '../theme';
import { Chip } from './Chip';

export type MapListToggleProps = { value: 'map' | 'list'; onChange: (value: 'map' | 'list') => void };

export function MapListToggle({ value, onChange }: MapListToggleProps) {
  return <View accessibilityRole="radiogroup" accessibilityLabel="Results view" style={styles.row}>
    {(['map', 'list'] as const).map((mode) => <Chip key={mode} label={mode === 'map' ? 'Map' : 'List'}
      selectionRole="radio" selected={value === mode} onPress={() => onChange(mode)} />)}
  </View>;
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs } });
