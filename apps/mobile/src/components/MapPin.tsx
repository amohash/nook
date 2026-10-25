import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';
import { normalizedFit, type TypicalLevel } from './exploreContent';

export type MapPinProps = {
  fitScore: number | null;
  rank?: number;
  typicalLevel: TypicalLevel;
  selected?: boolean;
  label?: string;
};

const ringColors = { quiet: theme.colors.sage, moderate: theme.colors.amber, busy: theme.colors.rust, unknown: theme.colors.grey };

export function MapPin({ fitScore, rank, typicalLevel, selected = false, label }: MapPinProps) {
  const fit = normalizedFit(fitScore);
  const high = fit !== null && fit >= 67;
  const fill = fit === null ? theme.colors.placeholder : high ? theme.colors.fitHigh
    : fit >= 34 ? theme.colors.fitModerate : theme.colors.fitLow;
  return <View accessible accessibilityRole="image" accessibilityState={{ selected }}
    accessibilityLabel={[label, rank === undefined ? null : `Rank ${rank}`,
      fit === null ? 'Fit unknown' : `Fit score ${Math.round(fit)} out of 100`,
      typicalLevel === 'unknown' ? 'Typical crowd unknown' : `Usually ${typicalLevel} at this time`,
      selected ? 'Selected' : null].filter(Boolean).join('. ')}
    style={[styles.halo, selected && styles.selected]}>
    <View style={styles.ringBacking}>
      <View style={[styles.ring, { borderColor: ringColors[typicalLevel], borderStyle: typicalLevel === 'unknown' ? 'dashed' : 'solid' }]}>
        <View style={[styles.pin, { backgroundColor: fill }]}>
          <Text style={[styles.score, high && styles.light]}>{fit === null ? '?' : Math.round(fit)}</Text>
        </View>
      </View>
    </View>
    {rank !== undefined && <Text style={styles.rank}>#{rank}</Text>}
  </View>;
}

export function MapLegend() {
  return <Text style={styles.legend}>Pin = fit for you · Ring = usually busy at this time · Dashed = no data</Text>;
}

const styles = StyleSheet.create({
  halo: { width: theme.sizes.mapHalo, minHeight: theme.sizes.mapHalo, alignItems: 'center', justifyContent: 'center',
    borderWidth: theme.borders.icon, borderColor: theme.colors.transparent, borderRadius: theme.radii.card },
  selected: { borderColor: theme.colors.text },
  // A cream rim on both sides of the stroke gives it a known contrast background.
  ringBacking: { padding: theme.borders.icon, borderRadius: theme.radii.pill, backgroundColor: theme.colors.background },
  ring: { width: theme.sizes.mapRing, height: theme.sizes.mapRing, borderRadius: theme.radii.pill,
    borderWidth: theme.borders.icon, alignItems: 'center', justifyContent: 'center',
    // Opaque backing keeps ring contrast independent of the map tiles and fit fill.
    backgroundColor: theme.colors.background },
  pin: { width: theme.sizes.mapPin, height: theme.sizes.mapPin, borderRadius: theme.radii.pill,
    alignItems: 'center', justifyContent: 'center' },
  score: { color: theme.colors.text, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.caption, fontWeight: theme.typography.weight.bold },
  light: { color: theme.colors.buttonText },
  rank: { color: theme.colors.text, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.caption, lineHeight: theme.typography.lineHeight.caption,
    backgroundColor: theme.colors.background, borderRadius: theme.radii.pill, paddingHorizontal: theme.spacing.xxs },
  legend: { color: theme.colors.textMuted, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.caption, lineHeight: theme.typography.lineHeight.caption },
});
