import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { QuerySchema, type SpotDetail } from '@space/contracts';
import { DEMO_NOW, demoPlaceNotes, demoNoteWarnings } from '@space/fixtures';
import { useSession } from '../../src/data/SessionProvider';
import { hoursStatus, venueTime } from '../../src/features/explore/presentation';
import { isShareCancellation, matchingRecommendation, publicAccessLabel, publicMapsUrl, shareMessage,
  supportedReasons, type RecommendationContext } from '../../src/features/detail/explanations';
import { PlaceAssistant } from '../../src/features/explore/PlaceAssistant';
import { provider } from '../../src/data';
import { RecoveryControls } from '../../src/data/RecoveryControls';
import { PlaceNotFoundError } from '../../src/data/providers';
import { EvidenceLabel, SpotDetailLayout } from '../../src/components';
import { priceLabel } from '../../src/components/content';
import { SessionGate } from '../../src/features/session/SessionGate';
import { theme } from '../../src/theme';

function Detail() {
  const {id, saved} = useLocalSearchParams<{id: string; saved?: string}>();
  const {session, toggleSaved, nearby} = useSession();
  const query = session!.query;
  const [context, setContext] = useState<RecommendationContext | null>(null);
  const [fitLoading, setFitLoading] = useState(true);
  const [fitError, setFitError] = useState(false);
  const [fitAttempt, setFitAttempt] = useState(0);
  const [showProviderEvidence, setShowProviderEvidence] = useState(false);
  useEffect(() => {
    let active = true;
    setContext(null); setFitLoading(true); setFitError(false);
    if (nearby.enabled && !query.snapshotId) {setFitLoading(false); return;}
    provider.recommend(QuerySchema.parse({...query, limit: 200})).then((response) => {if (active) setContext({query, response});})
      .catch(() => {if (active) setFitError(true);})
      .finally(() => {if (active) setFitLoading(false);});
    return () => {active = false;};
  }, [query, id, fitAttempt, nearby.enabled]);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => {mounted.current = true; return () => {mounted.current = false;};}, []);
  const router = useRouter();
  const [detail, setDetail] = useState<SpotDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<'missing' | 'unavailable' | null>(null);
  const [attempt, setAttempt] = useState(0);
  const archived = saved === '1' ? session!.settings.savedPlaces?.find((item) => item.spot.id === id) : undefined;
  const detailSnapshotId = nearby.result?.snapshot?.spots.some((item) => item.id === id) ? query.snapshotId : undefined;
  useEffect(() => {
    let active = true;
    setLoading(true); setError(null); setDetail(null);
    setShowProviderEvidence(false);
    const load = archived ? Promise.resolve({...archived, spot: {...archived.spot,
      datasetMode: archived.spot.datasetMode === 'demo' ? 'demo' as const : 'cached' as const}}) : provider.getSpot(id, detailSnapshotId);
    load.then((data) => {if (active) setDetail(data);})
      .catch((cause: unknown) => {if (active) setError(cause instanceof PlaceNotFoundError ? 'missing' : 'unavailable');})
      .finally(() => {if (active) setLoading(false);});
    return () => {active = false;};
  }, [id, attempt, detailSnapshotId, archived]);
  const spot = detail?.spot;
  const demoNotes = spot ? demoPlaceNotes(spot) : null;
  const result = spot ? matchingRecommendation(spot, query, context) : null;
  const warnings = demoNoteWarnings(result?.warnings ?? [], demoNotes);
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
  const onBack = () => {if (router.canGoBack()) router.back(); else router.replace('/');};
  if (loading) return <SpotDetailLayout state="loading" onBack={onBack} />;
  if (!spot) return <View style={{flex: 1}}>
    <SpotDetailLayout state="error" onBack={onBack} error={{
      title: error === 'missing' ? 'Place not found' : 'Place unavailable',
      message: error === 'missing' ? 'This place is not in the selected dataset. Return to the list.' : 'This place could not be loaded. Retry or return to the list.',
      action: error === 'unavailable' ? {label: 'Retry', onPress: () => setAttempt((a) => a + 1)} : undefined,
    }} />
    <RecoveryControls expanded />
  </View>;
  return <SpotDetailLayout state="ready" onBack={onBack}
    name={spot.name} photoUrl={spot.image?.url} photoAttribution={spot.image?.attribution}
    category={spot.categories.join(' · ')} walkMinutes={result?.estimatedWalkMinutes ?? null}
    rating={spot.rating.value} reviewCount={spot.reviewCount.value} fitScore={result?.score ?? null}
    openStatus={demoNotes ? {status: 'unknown', label: `Team demo hours: ${demoNotes.facts.hours}`} : status}
    dataset={{mode: spot.datasetMode, fetchedAt: spot.fetchedAt,
      description: spot.datasetMode === 'demo' ? 'Fictional venue and synthetic scenario facts.' : archived ? 'Saved public place snapshot; current conditions unverified.' : undefined}}
    typicalCrowd={spot.typicalCrowd} weekday={moment.weekday} currentHour={moment.hour}
    activityNote={demoNotes ? {text: demoNotes.typicalActivity, source: demoNotes.label} : undefined}
    liveObservation={spot.liveObservation}
    vibe={{summary: spot.summary, tags: Object.keys(spot.tags.value ?? {}).map((tag) => tag.replaceAll('_', ' '))}}
    facts={{
      wifi: spot.wifi.value === null || spot.wifi.value === 'unknown' ? null : spot.wifi.value === 'yes' ? 'Yes' : 'No',
      outlets: spot.outlets.value === null || spot.outlets.value === 'unknown' ? null : spot.outlets.value === 'yes' ? 'Yes' : 'No',
      noise: spot.noise.value === null ? null : `${Math.round(spot.noise.value * 100)}/100 · sourced atmosphere estimate`,
      price: spot.priceLevel.value === null ? null : priceLabel(spot.priceLevel.value),
      hours: spot.hoursStatus === 'known' ? 'Weekly schedule available; source times apply' : null,
      publicAccess: spot.publicAccess.value === null || spot.publicAccess.value === 'unknown' ? null : publicAccessLabel(spot),
      ...demoNotes?.facts,
    }}
    actionError={actionError}
    actions={{saved: session!.settings.savedIds.includes(id), saving, mapsDisabled: !url,
      onSave: () => {void save();}, onShare: () => {void share();}, onOpenMaps: () => {void openLink(url);}}}
    footnote={<>
      <PlaceAssistant placeIds={[spot.id]} />
      <Text style={s.body}>{spot.address}</Text>
      <Text style={s.small}>{result ? 'Estimated arrival' : 'Selected start (travel not included)'}: {moment.label} · {query.sessionMinutes} min session</Text>
      <View style={s.panel}><Text style={s.heading}>Why this spot</Text>
        {demoNotes && <>
          <Text style={s.small}>{demoNotes.label}</Text>
          <Text style={s.small}>These notes describe the demo locations. Fit scores and strict filters still use the separate provider evidence.</Text>
          {warnings.map((warning, index) => <Text key={`demo-${index}`} style={s.body}>{warning}</Text>)}
        </>}
        {result ? <>
          <Text style={s.small}>Matches in the current ranked shortlist. Fit is based on available evidence, not guaranteed conditions.</Text>
          {reasons.map((reason) => <View key={reason.code}>
            <Text style={s.body}>{reason.text}</Text>
            {reason.evidence ? <EvidenceLabel evidence={reason.evidence} /> :
              <Text style={s.small}>Estimated from distance; actual walking routes may differ.</Text>}
          </View>)}
          {!reasons.length && <Text style={s.body}>No supported fit explanations available.</Text>}
          {!demoNotes && warnings.length > 0 && <Text style={s.heading}>Things to check</Text>}
          {!demoNotes && warnings.map((warning, index) => <Text key={index} style={s.body}>{warning}</Text>)}
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
      <Text style={s.small}>{demoNotes ? 'Typical activity is a qualitative team demo note, not a current observation.' : `Historical typical crowd at the selected time in ${spot.timezone}. This is not seat availability.`} Walking estimates use distance, not a verified route.</Text>
      {!spot.liveObservation && <Text style={s.small}>Current observation unknown.</Text>}
      {spot.datasetMode === 'demo' && <Text style={s.small}>Maps is unavailable for fictional demo places.</Text>}
      <View style={s.panel}><Text style={s.heading}>{demoNotes ? 'Provider evidence' : 'Fact sources'}</Text>
        {demoNotes && <>
          <Text style={s.small}>Separate from the team-provided demo notes above. Provider fields may still be unknown.</Text>
          <Pressable accessibilityRole="button" accessibilityState={{expanded: showProviderEvidence}}
            onPress={() => setShowProviderEvidence((value) => !value)}>
            <Text style={s.action}>{showProviderEvidence ? 'Hide provider evidence' : 'Show provider evidence'}</Text>
          </Pressable>
        </>}
        {(!demoNotes || showProviderEvidence) && <>
        <EvidenceLabel label="Price" evidence={spot.priceLevel} />
        <EvidenceLabel label="Rating" evidence={spot.rating} />
        <EvidenceLabel label="Review count" evidence={spot.reviewCount} />
        <EvidenceLabel label="Wi-Fi" evidence={spot.wifi} />
        <EvidenceLabel label="Outlets" evidence={spot.outlets} />
        <EvidenceLabel label="Noise" evidence={spot.noise} />
        <Text style={s.body}>{publicAccessLabel(spot)}</Text>
        <EvidenceLabel label="Public access" evidence={spot.publicAccess} />
        <EvidenceLabel label="Vibe tags" evidence={spot.tags} />
        {!spot.summary.value?.trim() && <><Text style={s.small}>Summary unavailable.</Text><EvidenceLabel evidence={spot.summary} /></>}
        <Text style={s.small}>Hours fetched: {spot.hoursFetchedAt ?? 'Unknown'} · Timezone: {spot.timezone}</Text>
        <Text style={s.small}>Seat availability: unknown.</Text>
        {detail!.evidence.length === 0 && <Text style={s.small}>Additional source snippets are unavailable here. Fact source labels and timestamps are shown above.</Text>}
        {detail!.evidence.map((evidence) => <Pressable key={evidence.id} accessibilityRole="link"
          disabled={!evidence.sourceUrl || !/^https?:\/\//.test(evidence.sourceUrl)} onPress={() => {void openLink(evidence.sourceUrl);}}>
          <Text style={s.small}>{evidence.text}</Text>{evidence.sourceUrl && <Text style={s.action}>View source →</Text>}
        </Pressable>)}
        </>}
      </View>
      <Text style={s.small}>Dataset: {spot.datasetVersion}</Text>
    </>}
  />;
}
export default function DetailRoute() {return <SessionGate><Detail /></SessionGate>;}
const s = StyleSheet.create({
  body: {color: theme.colors.text, fontSize: 15, lineHeight: 24},
  panel: {backgroundColor: theme.colors.surface, padding: 20, borderRadius: 18, gap: 12},
  heading: {color: theme.colors.text, fontSize: 20, fontWeight: '600'},
  small: {color: theme.colors.textMuted, fontSize: 12, lineHeight: 21},
  action: {color: theme.colors.chipSelectedText, fontSize: 16, paddingVertical: 12},
});
