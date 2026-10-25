import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';
import { Chip } from './Chip';

export type NowLaterControlProps = {
  mode: 'now' | 'later';
  onModeChange: (mode: 'now' | 'later') => void;
  presets: { id: string; label: string }[];
  selectedPresetId: string | null;
  onSelectPreset: (id: string) => void;
  timeLabel: string;
  timezoneLabel: string;
};

/** All dates, labels and timezone interpretation come from D. */
export function NowLaterControl({ mode, onModeChange, presets, selectedPresetId, onSelectPreset,
  timeLabel, timezoneLabel }: NowLaterControlProps) {
  return <View style={styles.section}>
    <View accessibilityRole="radiogroup" accessibilityLabel="Departure time mode" style={styles.row}>
      {(['now', 'later'] as const).map((value) => <Chip key={value} label={value === 'now' ? 'Now' : 'Later'}
        selectionRole="radio" selected={mode === value} onPress={() => onModeChange(value)} />)}
    </View>
    {mode === 'later' && <View accessibilityRole="radiogroup" accessibilityLabel="Later departure presets" style={styles.row}>
      {presets.map(({ id, label }) => <Chip key={id} label={label} selectionRole="radio"
        selected={selectedPresetId === id} onPress={() => onSelectPreset(id)} />)}
      {presets.length === 0 && <Text style={styles.caption}>No later times configured.</Text>}
    </View>}
    <Text style={styles.caption}>{timeLabel} · {timezoneLabel}</Text>
  </View>;
}
const styles = StyleSheet.create({
  section: { gap: theme.spacing.xs },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
  caption: { color: theme.colors.textMuted, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.caption, lineHeight: theme.typography.lineHeight.caption },
});
