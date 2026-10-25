import { StyleSheet, Text, View } from 'react-native';
import type { DatasetMode, Evidence } from '@space/contracts';
import { theme } from '../theme/theme';
import { datasetLabel, evidenceLabel } from './content';

export type EvidenceLabelProps = { evidence: Evidence<unknown>; label?: string };

export function EvidenceLabel({ evidence, label }: EvidenceLabelProps) {
  return <Text style={styles.evidence}>{label ? `${label} · ` : ''}{evidenceLabel(evidence)}</Text>;
}

export type DatasetLabelProps = { mode: DatasetMode; description?: string; fetchedAt?: string };

export function DatasetLabel({ mode, description, fetchedAt }: DatasetLabelProps) {
  return <View style={styles.banner}>
    <Text style={styles.title}>{datasetLabel(mode)}</Text>
    {description && <Text style={styles.evidence}>{description}</Text>}
    {fetchedAt && <Text style={styles.evidence}>Dataset fetched: {fetchedAt}</Text>}
  </View>;
}

const styles = StyleSheet.create({
  banner: { borderRadius: theme.radii.card, padding: theme.spacing.lg,
    backgroundColor: theme.colors.chipSelectedBackground, gap: theme.spacing.xxs },
  title: { color: theme.colors.text, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.body, lineHeight: theme.typography.lineHeight.body,
    fontWeight: theme.typography.weight.semibold },
  evidence: { color: theme.colors.textMuted, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.caption, lineHeight: theme.typography.lineHeight.caption },
});
