import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { SpotDetail } from '@space/contracts';
import { provider } from '../../src/data';
import { PlaceNotFoundError } from '../../src/data/providers';
import { DatasetLabel, EvidenceLabel, ErrorState, LoadingState } from '../../src/components';
import { priceLabel, ratingLabel } from '../../src/components/content';
import { SessionGate } from '../../src/features/session/SessionGate';
import { theme } from '../../src/theme';

function Detail() {
  const {id} = useLocalSearchParams<{id: string}>();
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
  const [imageFailed, setImageFailed] = useState(false);
  return <ScrollView contentContainerStyle={s.page}>
    {loading && <LoadingState message="Loading place details…" />}
    {error && <ErrorState title={error === 'missing' ? 'Place not found' : 'Place unavailable'}
      message={error === 'missing' ? 'This place is not in the selected dataset. Return to the list.' : 'This place could not be loaded. Retry or return to the list.'}
      action={error === 'unavailable' ? {label: 'Retry', onPress: () => setAttempt((a) => a + 1)} : undefined} />}
    {spot && <>
      {spot.image && !imageFailed ? <><Image source={{uri: spot.image.url}} accessibilityLabel={`${spot.name} photo`}
        style={s.image} onError={() => setImageFailed(true)} /><Text style={s.small}>Photo: {spot.image.attribution}</Text></>
        : <View style={s.placeholder}><Text style={s.body}>Image unavailable</Text></View>}
      <DatasetLabel mode={spot.datasetMode} fetchedAt={spot.fetchedAt}
        description={spot.datasetMode === 'demo' ? 'Fictional venue and synthetic scenario facts.' : undefined} />
      <Text style={s.title}>{spot.name}</Text>
      <Text style={s.body}>{spot.categories.join(' · ')}{'\n'}{spot.address}</Text>
      <View style={s.panel}><Text style={s.heading}>What we know</Text>
        <Text style={s.body}>Price: {priceLabel(spot.priceLevel.value)}</Text>
        <EvidenceLabel evidence={spot.priceLevel} />
        <Text style={s.body}>{ratingLabel(spot.rating.value, spot.reviewCount.value)}</Text>
        <EvidenceLabel evidence={spot.rating} />
        <Text style={s.body}>Wi-Fi: {spot.wifi.value ?? 'unknown'} · Outlets: {spot.outlets.value ?? 'unknown'}</Text>
        <EvidenceLabel label="Wi-Fi" evidence={spot.wifi} />
        <EvidenceLabel label="Outlets" evidence={spot.outlets} />
        <Text style={s.body}>Hours: {spot.hoursStatus === 'known' ? 'Weekly schedule available; source times apply' : 'Unknown'}</Text>
        <Text style={s.small}>Hours fetched: {spot.hoursFetchedAt ?? 'Unknown'} · Timezone: {spot.timezone}</Text>
      </View>
      <View style={s.panel}><Text style={s.heading}>Summary and evidence</Text>
        <Text style={s.body}>{spot.summary.value ?? 'Summary unavailable'}</Text>
        <EvidenceLabel evidence={spot.summary} />
        <Text style={s.body}>{Object.keys(spot.tags.value ?? {}).join(' · ') || 'Vibe tags unknown'}</Text>
        <Text style={s.body}>Seat availability: unknown.</Text>
        {detail.evidence.map((evidence) => <Text key={evidence.id} style={s.small}>{evidence.text}</Text>)}
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
