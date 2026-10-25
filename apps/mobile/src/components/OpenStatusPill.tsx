import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';
import { OPEN_STATUS_LABELS, type OpenStatus } from './exploreContent';

export type OpenStatusPillProps = { status: OpenStatus; label?: string };

export function OpenStatusPill({ status, label }: OpenStatusPillProps) {
  const grey = status === 'unknown' || status === 'stale';
  const backgroundColor = status === 'open' ? theme.colors.chipSelectedBackground
    : status === 'closing_soon' ? theme.colors.amberBackground : grey ? theme.colors.greyBackground : theme.colors.rustBackground;
  const color = status === 'open' ? theme.colors.sageText : status === 'closing_soon' ? theme.colors.text
    : grey ? theme.colors.greyText : theme.colors.rustText;
  const text = label ?? OPEN_STATUS_LABELS[status];
  return <View accessible accessibilityLabel={status === 'stale' ? `Warning: ${text}` : text} style={[styles.pill, { backgroundColor }]}>
    {status === 'stale' && <Text accessible={false} style={[styles.text, { color }]}>⚠</Text>}
    <Text style={[styles.text, { color }]}>{text}</Text>
  </View>;
}
const styles = StyleSheet.create({
  pill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xxs,
    maxWidth: '100%', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs, borderRadius: theme.radii.pill },
  text: { color: theme.colors.text, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.body, lineHeight: theme.typography.lineHeight.body, flexShrink: 1 },
});
