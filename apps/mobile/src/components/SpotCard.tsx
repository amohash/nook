import { forwardRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { HostInstance, PressableProps } from 'react-native';
import type { Recommendation } from '@space/contracts';
import { theme } from '../theme/theme';
import { DatasetLabel, EvidenceLabel } from './EvidenceLabel';
import { cardNotes, priceLabel, ratingLabel } from './content';
import { compactCardDetails } from './compactCardContent';
import { normalizedFit, typicalLevel, typicalWording } from './exploreContent';

export type SpotCardProps = Pick<PressableProps, 'onPress' | 'onLongPress' | 'testID' | 'accessibilityRole'> & {
  result: Recommendation['results'][number];
  rank?: number;
  variant?: 'default' | 'compact';
  /** Historical hour value supplied by D; no timezone or hours calculation here. */
  typicalCrowdValue?: number | null;
};

function SpotThumbnail({ image, name }: { image: Recommendation['results'][number]['spot']['image']; name: string }) {
  const [failed, setFailed] = useState(false);
  return image && !failed
    ? <Image source={{ uri: image.url }} accessibilityLabel={`${name} photo`} style={styles.thumbnail}
      onError={() => setFailed(true)} />
    : <View accessibilityLabel="Image unavailable" accessible style={styles.thumbnail} />;
}

// Forward the ref and Pressable handlers so D can use <Link asChild> unchanged.
export const SpotCard = forwardRef<HostInstance, SpotCardProps>(function SpotCard({ result, rank, variant = 'default',
  typicalCrowdValue = null, accessibilityRole = 'button', ...props }, ref) {
  const { spot } = result;
  if (variant === 'compact') {
    const details = compactCardDetails(result);
    const fit = normalizedFit(result.score);
    const hasTypical = typicalLevel(typicalCrowdValue) !== 'unknown';
    const notes = cardNotes(result.warnings);
    return <Pressable {...props} ref={ref} accessibilityRole={accessibilityRole}
      accessibilityHint="Opens place details" style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.topline}>
        {rank !== undefined && <Text accessibilityLabel={`Rank ${rank}`} style={styles.rank}>{rank}</Text>}
        <View style={styles.fitBadge}><Text style={styles.fitText}>Fit {fit === null ? 'unknown' : `${Math.round(fit)}/100`}</Text></View>
      </View>
      <View style={styles.content}>
        <SpotThumbnail key={spot.image?.url ?? spot.id} image={spot.image} name={spot.name} />
        <View style={styles.description}>
          <Text style={styles.title}>{spot.name}</Text>
          <Text style={styles.body}>{details.metadata}</Text>
          {details.limited && <Text style={styles.caption}>Limited details</Text>}
          {hasTypical && <Text style={styles.typical}>{typicalWording(typicalCrowdValue)}</Text>}
        </View>
      </View>
      {spot.image && <Text style={styles.caption}>Photo: {spot.image.attribution}</Text>}
      {notes.first && <Text style={styles.caption}>{notes.first}{notes.more > 0 ? ` · ${notes.more} more ${notes.more === 1 ? 'note' : 'notes'} in details` : ''}</Text>}
      {hasTypical && spot.typicalCrowd
        ? <EvidenceLabel source={spot.typicalCrowd.source} fetchedAt={spot.typicalCrowd.fetchedAt} />
        : <EvidenceLabel variant="compact" evidence={spot.rating} />}
    </Pressable>;
  }
  return <Pressable {...props} ref={ref} accessibilityRole={accessibilityRole}
    accessibilityHint="Opens place details"
    style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
    <View style={styles.topline}>
      {rank !== undefined && <Text style={styles.rank}>{String(rank).padStart(2, '0')}</Text>}
      <Text style={styles.body}>Fit score {Math.round(result.score)}/100</Text>
    </View>
    <View style={styles.content}>
      <SpotThumbnail key={spot.image?.url ?? spot.id} image={spot.image} name={spot.name} />
      <View style={styles.description}>
        <Text style={styles.title}>{spot.name}</Text>
        <Text style={styles.body}>{spot.categories.join(' · ')} · {result.estimatedWalkMinutes} min estimated walk</Text>
        <Text style={styles.body}>{priceLabel(spot.priceLevel.value)}</Text>
        <Text style={styles.body}>{ratingLabel(spot.rating.value, spot.reviewCount.value)}</Text>
      </View>
    </View>
    {spot.image && <Text style={styles.body}>Photo: {spot.image.attribution}</Text>}
    <DatasetLabel mode={spot.datasetMode} description={spot.datasetMode === 'demo' ? 'Illustrative data; not live seat availability.' : undefined} />
    {result.reasons.map((reason, index) => <Text key={`${reason.code}-${index}`} style={styles.reason}>{reason.text}</Text>)}
    {result.reasons.length === 0 && <Text style={styles.body}>No evidence-backed reasons available.</Text>}
    {result.warnings.map((warning, index) => <Text key={index} style={styles.body}>{warning}</Text>)}
    <EvidenceLabel label="Price evidence" evidence={spot.priceLevel} />
    <Text style={styles.action}>Explore this place →</Text>
  </Pressable>;
});

const styles = StyleSheet.create({
  fitBadge: { paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xxs,
    borderRadius: theme.radii.pill, backgroundColor: theme.colors.chipSelectedBackground },
  fitText: { color: theme.colors.sageText, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.caption, lineHeight: theme.typography.lineHeight.caption,
    fontWeight: theme.typography.weight.semibold },
  caption: { color: theme.colors.secondaryText, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.caption, lineHeight: theme.typography.lineHeight.caption },
  typical: { color: theme.colors.text, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.body, lineHeight: theme.typography.lineHeight.body },
  card: { width: '100%', padding: theme.spacing.lg, gap: theme.spacing.md,
    backgroundColor: theme.colors.surface, borderColor: theme.colors.chipBorder,
    borderWidth: theme.borders.thin, borderRadius: theme.radii.card },
  pressed: { borderColor: theme.colors.chipSelectedBorder },
  content: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md },
  description: { flex: 1, gap: theme.spacing.xxs },
  thumbnail: { width: theme.sizes.thumbnail, height: theme.sizes.thumbnail,
    borderRadius: theme.radii.field, backgroundColor: theme.colors.placeholder },
  topline: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md,
    alignItems: 'center', justifyContent: 'space-between' },
  rank: { color: theme.colors.chipSelectedText, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.section, lineHeight: theme.typography.lineHeight.section,
    fontWeight: theme.typography.weight.bold },
  title: { color: theme.colors.text, fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.size.section, lineHeight: theme.typography.lineHeight.section,
    fontWeight: theme.typography.weight.bold },
  body: { color: theme.colors.textMuted, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.body, lineHeight: theme.typography.lineHeight.body },
  reason: { color: theme.colors.text, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.body, lineHeight: theme.typography.lineHeight.body },
  action: { color: theme.colors.chipSelectedText, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.body, lineHeight: theme.typography.lineHeight.body,
    fontWeight: theme.typography.weight.semibold },
});
