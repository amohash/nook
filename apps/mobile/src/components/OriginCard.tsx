import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { OriginControls } from '../features/explore/OriginControls';
import { theme } from '../theme';
import { Button } from './Button';

// Type-only dependency keeps this drop-in API aligned without importing GPS code.
export type OriginCardProps = ComponentProps<typeof OriginControls>;

export function OriginCard({ origin, busy, error, accuracyMeters, onDevice, onManual }: OriginCardProps) {
  return <View style={styles.card}>
    <Text style={styles.title}>Starting from: {origin.source === 'manual' ? 'UT Austin campus' : accuracyMeters !== null && accuracyMeters >= 100 ? 'Approximate location' : 'Device location'}</Text>
    <Text style={styles.body}>{origin.source === 'manual'
      ? 'Manual origin · explore the UT Austin area without location permission.'
      : `One-time reading · ${accuracyMeters === null ? 'accuracy unknown' : `reported accuracy ±${Math.ceil(accuracyMeters)} m`}. Walking times are estimates.`}</Text>
    <View style={styles.row}>
      <View style={styles.action}><Button variant="outline" label={busy ? 'Finding location…' : error ? 'Retry my location' : 'Use my location'}
        busy={busy} onPress={onDevice} /></View>
      <View style={styles.action}><Button variant="outline" label="Use UT Austin" onPress={onManual} /></View>
    </View>
    {busy && <Text accessibilityLiveRegion="polite" style={styles.body}>Keeping the selected origin until a location is ready. Use UT Austin to cancel.</Text>}
    {error && <Text accessibilityRole="alert" role="alert" style={styles.error}>{error} The selected origin has not changed. Retry or use UT Austin.</Text>}
  </View>;
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing.md, backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card, padding: theme.spacing.lg },
  title: { color: theme.colors.text, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.button, lineHeight: theme.typography.lineHeight.button,
    fontWeight: theme.typography.weight.semibold },
  body: { color: theme.colors.secondaryText, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.body, lineHeight: theme.typography.lineHeight.body },
  error: { color: theme.colors.error, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.body, lineHeight: theme.typography.lineHeight.body },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
  action: { flexGrow: 1, flexShrink: 1, flexBasis: theme.sizes.controlMinWidth, minWidth: theme.sizes.tapTarget },
});
