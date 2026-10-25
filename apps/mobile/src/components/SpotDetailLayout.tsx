import { useState, type ReactNode } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Spot } from '@space/contracts';
import { theme } from '../theme';
import { ActionRow, type ActionRowProps } from './ActionRow';
import { BusynessChart } from './BusynessChart';
import { Chip } from './Chip';
import { DatasetLabel, EvidenceLabel, type DatasetLabelProps } from './EvidenceLabel';
import { LiveObservationBadge } from './LiveObservationBadge';
import { OpenStatusPill, type OpenStatusPillProps } from './OpenStatusPill';
import { ErrorState, LoadingState, type MessageStateProps } from './States';
import { normalizedFit } from './exploreContent';
import { detailFacts, detailMeta, type SpotDetailFacts } from './spotDetailContent';

export type SpotDetailReadyProps = {
  state: 'ready';
  name: string;
  photoUrl?: string | null;
  photoAttribution?: string | null;
  category?: string | null;
  walkMinutes?: number | null;
  rating?: number | null;
  reviewCount?: number | null;
  fitScore: number | null;
  openStatus: OpenStatusPillProps;
  dataset: DatasetLabelProps;
  typicalCrowd: Spot['typicalCrowd'];
  weekday: number;
  currentHour: number;
  liveObservation?: Spot['liveObservation'];
  vibe?: { summary: Spot['summary']; tags: readonly string[] } | null;
  facts: SpotDetailFacts;
  footnote?: ReactNode;
  actions: ActionRowProps;
  actionError?: string | null;
};

export type SpotDetailLayoutProps = { onBack: () => void } & (
  | SpotDetailReadyProps
  | { state: 'loading'; loadingMessage?: string }
  | { state: 'error'; error: MessageStateProps }
);
export type { SpotDetailFacts } from './spotDetailContent';

function BackButton({ onBack }: { onBack: () => void }) {
  return <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
    <View accessible={false} style={styles.chevron} />
  </Pressable>;
}

/** Display only. D owns fetching, status/timezone/fit computation and all actions. */
export function SpotDetailLayout(props: SpotDetailLayoutProps) {
  const insets = useSafeAreaInsets();
  const [failedPhotoUrl, setFailedPhotoUrl] = useState<string | null>(null);
  if (props.state !== 'ready') return <SafeAreaView style={styles.page}>
    <ScrollView contentContainerStyle={styles.stateContent}>
      <BackButton onBack={props.onBack} />
      {props.state === 'loading' ? <LoadingState message={props.loadingMessage ?? 'Loading place details…'} />
        : <ErrorState {...props.error} />}
    </ScrollView>
  </SafeAreaView>;
  const facts = detailFacts(props.facts);
  const meta = detailMeta(props);
  const fit = normalizedFit(props.fitScore);
  const summary = props.vibe?.summary.value?.trim();
  const failedPhoto = failedPhotoUrl !== null && failedPhotoUrl === props.photoUrl;
  const hasPhoto = !!props.photoUrl && !failedPhoto;
  // Without a photo, the hero collapses to a back-button row instead of an empty placeholder block.
  const heroHeight = (hasPhoto ? theme.sizes.detailHero : theme.sizes.tapTarget + theme.spacing.lg) + insets.top;
  return <View style={styles.page}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
      <View style={[styles.hero, !hasPhoto && styles.heroWithoutPhoto, { height: heroHeight }]}>
        {hasPhoto && <Image source={{ uri: props.photoUrl! }} style={StyleSheet.absoluteFill}
          accessibilityLabel={`${props.name} photo`} resizeMode="cover" onError={() => setFailedPhotoUrl(props.photoUrl ?? null)} />}
        <View style={[styles.floatingBack, { top: insets.top + theme.spacing.lg, left: insets.left + theme.spacing.lg }]}>
          <BackButton onBack={props.onBack} />
        </View>
      </View>
      <View style={[styles.content, { paddingLeft: insets.left + theme.spacing.xl, paddingRight: insets.right + theme.spacing.xl }]}>
        {props.photoAttribution && <Text style={styles.caption}>Photo: {props.photoAttribution}</Text>}
        <View style={styles.intro}>
          <Text accessibilityRole="header" style={styles.title}>{props.name}</Text>
          {!!meta && <Text style={styles.body}>{meta}</Text>}
          <View style={styles.fit}><Text style={styles.fitText}>Fit for you: {fit === null ? 'unknown' : `${Math.round(fit)}/100`}</Text></View>
          <View style={styles.status}><OpenStatusPill {...props.openStatus} />
            <View style={styles.dataset}><DatasetLabel {...props.dataset} variant="caption" /></View>
          </View>
        </View>
        <View style={styles.section}>
          <BusynessChart typicalCrowd={props.typicalCrowd} weekday={props.weekday} currentHour={props.currentHour} />
          <LiveObservationBadge liveObservation={props.liveObservation ?? null} />
        </View>
        {!!summary && props.vibe && <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.heading}>The vibe</Text>
          <Text style={styles.summary}>{summary}</Text>
          <View style={styles.tags}>{[...new Set(props.vibe.tags)].map((tag) => <Chip key={tag}
            label={tag} selected={false} displayOnly onPress={() => {}} />)}</View>
          <EvidenceLabel evidence={props.vibe.summary} variant="compact" />
        </View>}
        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.heading}>What we know</Text>
          <View style={styles.facts}>{facts.known.map((fact) => <View key={fact.id} style={styles.fact}>
            <Text style={styles.factLabel}>{fact.label}</Text><Text style={styles.body}>{fact.value}</Text>
          </View>)}</View>
          {facts.unknownCaption && <Text style={styles.caption}>{facts.unknownCaption}</Text>}
        </View>
        {props.footnote}
      </View>
    </ScrollView>
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.footer}>
      <ScrollView contentContainerStyle={styles.actions}>
        {props.actionError && <Text accessibilityRole="alert" style={styles.error}>{props.actionError}</Text>}
        <ActionRow {...props.actions} />
      </ScrollView>
    </SafeAreaView>
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { paddingBottom: theme.spacing.xl },
  stateContent: { padding: theme.spacing.xl, gap: theme.spacing.xl },
  hero: { width: '100%', backgroundColor: theme.colors.placeholder },
  heroWithoutPhoto: { backgroundColor: theme.colors.background },
  floatingBack: { position: 'absolute' },
  back: { width: theme.sizes.tapTarget, height: theme.sizes.tapTarget, borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center',
    shadowColor: theme.colors.text, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.16, shadowRadius: 6, elevation: 3 },
  chevron: { width: theme.sizes.backChevron, height: theme.sizes.backChevron,
    borderLeftWidth: theme.borders.icon, borderBottomWidth: theme.borders.icon, borderColor: theme.colors.text,
    transform: [{ rotate: '45deg' }] },
  content: { paddingTop: theme.spacing.xl, gap: theme.spacing.xl },
  intro: { gap: theme.spacing.xs },
  title: { color: theme.colors.text, fontFamily: theme.typography.headingFamily, fontSize: theme.typography.size.title,
    lineHeight: theme.typography.lineHeight.title, fontWeight: theme.typography.weight.bold },
  body: { color: theme.colors.text, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.body, lineHeight: theme.typography.lineHeight.body },
  caption: { color: theme.colors.secondaryText, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.caption, lineHeight: theme.typography.lineHeight.caption },
  fit: { alignSelf: 'flex-start', borderRadius: theme.radii.pill, backgroundColor: theme.colors.chipSelectedBackground,
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs },
  fitText: { color: theme.colors.sageText, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.caption, lineHeight: theme.typography.lineHeight.caption, fontWeight: theme.typography.weight.semibold },
  status: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.xs },
  dataset: { flexShrink: 1, maxWidth: '100%' },
  section: { gap: theme.spacing.md },
  heading: { color: theme.colors.text, fontFamily: theme.typography.bodyFamily, fontSize: theme.typography.size.section,
    lineHeight: theme.typography.lineHeight.section, fontWeight: theme.typography.weight.semibold },
  summary: { color: theme.colors.text, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.button, lineHeight: theme.typography.lineHeight.button },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md },
  fact: { flexBasis: theme.layout.detailFactBasis, flexGrow: 1, gap: theme.spacing.xxs },
  factLabel: { color: theme.colors.secondaryText, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.caption, lineHeight: theme.typography.lineHeight.caption },
  footer: { maxHeight: theme.layout.detailActionsMaxHeight, backgroundColor: theme.colors.background,
    borderTopWidth: theme.borders.thin, borderColor: theme.colors.chipBorder },
  actions: { paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.md, gap: theme.spacing.xs },
  error: { color: theme.colors.error, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.body, lineHeight: theme.typography.lineHeight.body },
});
