import { StyleSheet, Text, View } from 'react-native';
import type { DatasetMode, Evidence } from '@space/contracts';
import { theme } from '../theme/theme';
import { datasetCaption, datasetLabel, evidenceLabel, sourceTime } from './content';
import { crowdSourceLabel, type TypicalCrowd } from './exploreContent';

export type EvidenceLabelProps = (
  | { evidence: Evidence<unknown>; label?: string; source?: never; fetchedAt?: never }
  | { source: NonNullable<TypicalCrowd>['source']; fetchedAt: string; evidence?: never; label?: never }
) & { variant?: 'default' | 'compact' };

export function EvidenceLabel(props: EvidenceLabelProps) {
  if (props.source !== undefined) return <Text style={[styles.evidence, styles.source]}>{crowdSourceLabel(props.source)} · Updated {sourceTime(props.fetchedAt)}</Text>;
  const { evidence, label } = props;
  if (props.variant === 'compact') return <Text style={[styles.evidence, styles.source]}>
    Source: {evidence.source} · {evidence.observedAt ? `Observed ${sourceTime(evidence.observedAt)}` : `Updated ${sourceTime(evidence.fetchedAt)}`}
  </Text>;
  return <Text style={styles.evidence}>{label ? `${label} · ` : ''}{evidenceLabel(evidence)}</Text>;
}

export type DatasetLabelProps = { mode: DatasetMode; description?: string; fetchedAt?: string; variant?: 'banner' | 'caption' };

export function DatasetLabel({ mode, description, fetchedAt, variant = 'banner' }: DatasetLabelProps) {
  if (variant === 'caption') return <Text style={[styles.evidence, styles.source]}>
    {datasetCaption(mode, description)}{fetchedAt ? ` · Updated ${sourceTime(fetchedAt)}` : ''}
  </Text>;
  return <View style={styles.banner}>
    <Text style={styles.title}>{datasetLabel(mode)}</Text>
    {description && <Text style={styles.evidence}>{description}</Text>}
    {fetchedAt && <Text style={styles.evidence}>Updated {sourceTime(fetchedAt)}</Text>}
  </View>;
}

const styles = StyleSheet.create({
  source: { color: theme.colors.secondaryText },
  banner: { borderRadius: theme.radii.card, padding: theme.spacing.lg,
    backgroundColor: theme.colors.chipSelectedBackground, gap: theme.spacing.xxs },
  title: { color: theme.colors.text, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.body, lineHeight: theme.typography.lineHeight.body,
    fontWeight: theme.typography.weight.semibold },
  evidence: { color: theme.colors.textMuted, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.caption, lineHeight: theme.typography.lineHeight.caption },
});
