import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';
import { observationTime, type LiveObservation } from './exploreContent';

export type LiveObservationBadgeProps = { liveObservation: LiveObservation };

export function LiveObservationBadge({ liveObservation }: LiveObservationBadgeProps) {
  if (liveObservation === null) return null;
  return <View style={styles.badge}>
    <Text style={styles.heading}>Reported observation</Text>
    <Text style={styles.text}>{liveObservation.text}</Text>
    <Text style={styles.time}>{observationTime(liveObservation)}</Text>
  </View>;
}
const styles = StyleSheet.create({
  badge: { backgroundColor: theme.colors.observationBackground, borderRadius: theme.radii.field,
    borderLeftWidth: theme.spacing.xxs, borderLeftColor: theme.colors.observationBorder,
    padding: theme.spacing.lg, gap: theme.spacing.xxs },
  heading: { color: theme.colors.observationText, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.caption, lineHeight: theme.typography.lineHeight.caption, fontWeight: theme.typography.weight.semibold },
  text: { color: theme.colors.text, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.body, lineHeight: theme.typography.lineHeight.body },
  time: { color: theme.colors.secondaryText, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.caption, lineHeight: theme.typography.lineHeight.caption },
});
