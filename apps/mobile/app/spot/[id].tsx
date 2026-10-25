import { useEffect, useRef, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { SpotDetail } from '@space/contracts';
import { DEMO_NOW } from '@space/fixtures';
import { useSession } from '../../src/data/SessionProvider';
import { hoursStatus, venueTime } from '../../src/features/explore/presentation';
import { isShareCancellation, matchingRecommendation, publicAccessLabel, publicMapsUrl, shareMessage,
  supportedReasons, type RecommendationContext } from '../../src/features/detail/explanations';
import { provider } from '../../src/data';
import { RecoveryControls } from '../../src/data/RecoveryControls';
import { PlaceNotFoundError } from '../../src/data/providers';
import { ActionRow, BusynessChart, DatasetLabel, EvidenceLabel, ErrorState, LiveObservationBadge, LoadingState, OpenStatusPill } from '../../src/components';
import { priceLabel, ratingLabel } from '../../src/components/content';
import { SessionGate } from '../../src/features/session/SessionGate';
import { theme } from '../../src/theme';

function Detail() {
  const {id} = useLocalSearchParams<{id: string}>();
  const {session, toggleSaved} = useSession();
  const query = session!.query;
  const [context, setContext] = useState<RecommendationContext | null>(null);
  const [fitLoading, setFitLoading] = useState(true);
  const [fitError, setFitError] = useState(false);
  const [fitAttempt, setFitAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setContext(null); setFitLoading(true); setFitError(false);
    provider.recommend(query).then((response) => {if (active) setContext({query, response});})
      .catch(() => {if (active) setFitError(true);})
      .finally(() => {if (active) setFitLoading(false);});
    return () => {active = false;};
  }, [query, id, fitAttempt]);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => {mounted.current = true; return () => {mounted.current = false;};}, []);
  const router = useRouter();
  const [detail, setDetail] = useState<SpotDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<'missing' | 'unavailable' | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(null); setDetail(null);
    provider.getSpot(id).then((data) => {if (active) setDetail(data);})
      .catch((cause: unknown) => {if (active) setError(cause instanceof PlaceNotFoundError ? 'missing' : 'unavailable');})
      .finally(() => {if (active) setLoading(false);});
    return () => {active = false;};
  }, [id, attempt]);
  const spot = detail?.spot;
  const result = spot ? matchingRecommendation(spot, query, context) : null;
  const reasons = spot ? supportedReasons(spot, result) : [];
  const selectedTime = result?.arrivalAt ?? query.departAt;
  const moment = venueTime(selectedTime, spot?.timezone ?? session!.city.timezone);
  const now = session!.city.mode === 'demo' ? DEMO_NOW : new Date().toISOString();
  const status = spot ? hoursStatus(spot, selectedTime, session!.query.sessionMinutes, now) : {status: 'unknown' as const};
  const url = spot ? publicMapsUrl(spot) : null;
  const save = async () => {
    if (saving) return;
    setSaving(true); setActionError(null);
    try {await toggleSaved(id);}
    catch {if (mounted.current) setActionError('This place could not be saved. Please try again.');}
    finally {if (mounted.current) setSaving(false);}
  };
  const openLink = async (link: string | undefined | null) => {
    if (!link || !/^https?:\/\//.test(link)) return;
    setActionError(null);
    try {await Linking.openURL(link);}
    catch {if (mounted.current) setActionError('The link could not be opened. Please try again.');}
  };
  const share = async () => {
    if (!spot) return;
    setActionError(null);
    try {await Share.share({message: shareMessage(spot, query, context)});}
    catch (cause) {if (mounted.current && !isShareCancellation(cause)) setActionError('Sharing is unavailable. Try again on your phone.');}
  };
  const [imageFailed, setImageFailed] = useState(false);
  return <ScrollView contentContainerStyle={s.page}>
    {loading && <LoadingState message="Loading place details…" />}
    {error && <ErrorState title={error === 'missing' ? 'Place not found' : 'Place unavailable'}
      message={error === 'missing' ? 'This place is not in the selected dataset. Return to the list.' : 'This place could not be loaded. Retry or return to the list.'}
      action={error === 'unavailable' ? {label: 'Retry', onPress: () => setAttempt((a) => a + 1)} : undefined} />}
    {error && <RecoveryControls expanded />}
    {spot && <>
      {spot.image && !imageFailed ? <><Image source={{uri: spot.image.url}} accessibilityLabel={`${spot.name} photo`}
        style={s.image} onError={() => setImageFailed(true)} /><Text style={s.small}>Photo: {spot.image.attribution}</Text></>
        : <View style={s.placeholder}><Text style={s.body}>Image unavailable</Text></View>}
      <DatasetLabel mode={spot.datasetMode} fetchedAt={spot.fetchedAt}
        description={spot.datasetMode === 'demo' ? 'Fictional venue and synthetic scenario facts.' : undefined} />
      <Text style={s.title}>{spot.name}</Text>
      <Text style={s.body}>{spot.categories.join(' · ')}{'\n'}{spot.address}</Text>
      <OpenStatusPill status={status.status} label={status.label} />
      <Text style={s.small}>{result ? 'Estimated arrival' : 'Selected start (travel not included)'}: {moment.label} · {query.sessionMinutes} min session</Text>
      <ActionRow saved={session!.settings.savedIds.includes(id)} saving={saving} mapsDisabled={!url}
        onSave={() => {void save();}} onShare={() => {void share();}} onOpenMaps={() => {void openLink(url);}} />
      {spot.datasetMode === 'demo' && <Text style={s.small}>Maps is unavailable for fictional demo places.</Text>}
      {actionError && <Text role="alert" style={s.body}>{actionError}</Text>}
      <View style={s.panel}><Text style={s.heading}>Why this spot</Text>
        {result ? <>
          <Text style={s.small}>Matches in the current ranked shortlist. Fit is based on available evidence, not guaranteed conditions.</Text>
          {reasons.map((reason) => <View key={reason.code}>
            <Text style={s.body}>{reason.text}</Text>
            {reason.evidence ? <EvidenceLabel evidence={reason.evidence} /> :
              <Text style={s.small}>Estimated from distance; actual walking routes may differ.</Text>}
          </View>)}
          {!reasons.length && <Text style={s.body}>No supported fit explanations available.</Text>}
          {result.warnings.length > 0 && <Text style={s.heading}>Things to check</Text>}
          {result.warnings.map((warning, index) => <Text key={index} style={s.body}>{warning}</Text>)}
        </> : <>
          <Text style={s.body}>{fitLoading ? 'Checking fit with your current preferences…' : fitError
            ? 'Fit check unavailable. Place facts are shown below.'
            : 'This place is not verified in the current ranked shortlist. It may not satisfy your selected filters.'}</Text>
          <Text style={s.small}>Saved and name-lookup places are not automatically recommendations.</Text>
          {!fitLoading && <Pressable accessibilityRole="button" onPress={() => setFitAttempt((value) => value + 1)}>
            <Text style={s.action}>Check fit again</Text>
          </Pressable>}
        </>}
      </View>
      <BusynessChart typicalCrowd={spot.typicalCrowd} weekday={moment.weekday} currentHour={moment.hour} />
      <Text style={s.small}>Historical typical crowd at the selected time in {spot.timezone}. This is not seat availability.</Text>
      <LiveObservationBadge liveObservation={spot.liveObservation} />
      {!spot.liveObservation && <Text style={s.small}>Current observation unknown.</Text>}
      <View style={s.panel}><Text style={s.heading}>What we know</Text>
        <Text style={s.body}>Price: {priceLabel(spot.priceLevel.value)}</Text>
        <EvidenceLabel evidence={spot.priceLevel} />
        <Text style={s.body}>{ratingLabel(spot.rating.value, spot.reviewCount.value)}</Text>
        <EvidenceLabel evidence={spot.rating} />
        <Text style={s.body}>Wi-Fi: {spot.wifi.value ?? 'unknown'} · Outlets: {spot.outlets.value ?? 'unknown'}</Text>
        <EvidenceLabel label="Wi-Fi" evidence={spot.wifi} />
        <EvidenceLabel label="Outlets" evidence={spot.outlets} />
        <Text style={s.body}>{publicAccessLabel(spot)}</Text>
        <EvidenceLabel label="Public access" evidence={spot.publicAccess} />
        <Text style={s.body}>Hours: {spot.hoursStatus === 'known' ? 'Weekly schedule available; source times apply' : 'Unknown'}</Text>
        <Text style={s.small}>Hours fetched: {spot.hoursFetchedAt ?? 'Unknown'} · Timezone: {spot.timezone}</Text>
      </View>
      <View style={s.panel}><Text style={s.heading}>Summary and evidence</Text>
        <Text style={s.body}>{spot.summary.value ?? 'Summary unavailable'}</Text>
        <EvidenceLabel evidence={spot.summary} />
        <Text style={s.body}>{Object.keys(spot.tags.value ?? {}).join(' · ') || 'Vibe tags unknown'}</Text>
        <Text style={s.body}>Seat availability: unknown.</Text>
        {detail.evidence.length === 0 && <Text style={s.small}>Additional source snippets are unavailable here. Fact source labels and timestamps are shown above.</Text>}
        {detail.evidence.map((evidence) => <Pressable key={evidence.id} accessibilityRole="link"
          disabled={!evidence.sourceUrl || !/^https?:\/\//.test(evidence.sourceUrl)} onPress={() => {void openLink(evidence.sourceUrl);}}>
          <Text style={s.small}>{evidence.text}</Text>{evidence.sourceUrl && <Text style={s.action}>View source →</Text>}
        </Pressable>)}
      </View>
      <Text style={s.small}>Dataset: {spot.datasetVersion}</Text>
    </>}
    <Pressable accessibilityRole="button" style={s.button}
      onPress={() => {if (router.canGoBack()) router.back(); else router.replace('/');}}>
      <Text style={s.action}>← Back to places</Text>
    </Pressable>
  </ScrollView>;
}
export default function DetailRoute() {return <SessionGate><Detail /></SessionGate>;}
const s = StyleSheet.create({
  page: {padding: 24, gap: 20, paddingBottom: 48, width: '100%', maxWidth: 680, alignSelf: 'center'},
  image: {height: 180, width: '100%', borderRadius: 20},
  placeholder: {minHeight: 150, borderRadius: 20, backgroundColor: theme.colors.placeholder, padding: 24, justifyContent: 'center'},
  title: {color: theme.colors.text, fontSize: 30, fontWeight: '700'},
  body: {color: theme.colors.text, fontSize: 15, lineHeight: 24},
  panel: {backgroundColor: theme.colors.surface, padding: 20, borderRadius: 18, gap: 12},
  heading: {color: theme.colors.text, fontSize: 20, fontWeight: '600'},
  small: {color: theme.colors.textMuted, fontSize: 12, lineHeight: 21},
  button: {minHeight: 48, justifyContent: 'center'},
  action: {color: theme.colors.chipSelectedText, fontSize: 16, paddingVertical: 12},
});
