import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { SpotDetail } from '@space/contracts';
import { provider } from '../../src/data';
import { PlaceNotFoundError } from '../../src/data/providers';

export default function Detail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<SpotDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<'missing' | 'unavailable' | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(null); setDetail(null);
    provider.getSpot(id).then((data) => { if (active) setDetail(data); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof PlaceNotFoundError ? 'missing' : 'unavailable'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, attempt]);
  const spot = detail?.spot;
  return <ScrollView contentContainerStyle={s.page}>
    {loading && <ActivityIndicator color="#bbef91" accessibilityLabel="Loading place details" />}
    {error && <><Text role="alert" style={s.title}>{error === 'missing' ? 'Place not found' : 'Place unavailable'}</Text>
      <Text style={s.body}>{error === 'missing' ? 'This place is not in the selected dataset. Return to the list to choose another place.' : 'This place could not be loaded. Retry or return to the list.'}</Text>
      {error === 'unavailable' && <Pressable accessibilityRole="button" style={s.button} onPress={() => setAttempt((a) => a + 1)}><Text style={s.action}>Retry</Text></Pressable>}</>}
    {spot && <>
      <View style={s.placeholder}><Text style={s.illustration}>S P A C E</Text><Text style={s.body}>Image unavailable · illustrative venue</Text></View>
      <Text style={s.badge}>{spot.datasetMode === 'demo' ? 'DEMO SCENARIO · FICTIONAL VENUE' : `${spot.datasetMode.toUpperCase()} DATASET`}</Text>
      <Text style={s.title}>{spot.name}</Text><Text style={s.body}>{spot.categories.join(' · ')}{ '\n' }{spot.address}</Text>
      <View style={s.panel}><Text style={s.heading}>What we know</Text>
        <Text style={s.body}>Price: {spot.priceLevel.value === null ? 'Unknown' : spot.priceLevel.value === 0 ? 'Free (synthetic)' : `${'$'.repeat(spot.priceLevel.value)} (synthetic)`}</Text>
        <Text style={s.body}>Rating: {spot.rating.value === null ? 'Unknown · no real reviews' : spot.rating.value}</Text>
        <Text style={s.body}>Review count: {spot.reviewCount.value ?? 'Unknown'}</Text>
        <Text style={s.body}>Wi-Fi: {spot.wifi.value ?? 'unknown'} · Outlets: {spot.outlets.value ?? 'unknown'} (synthetic)</Text>
        <Text style={s.body}>Hours: {spot.hoursStatus === 'known' ? 'Synthetic weekly schedule; not verified venue hours' : 'Unknown'}</Text>
        <Text style={s.body}>Timezone: {spot.timezone}</Text>
      </View>
      <View style={s.panel}><Text style={s.heading}>Scenario notes</Text>
        <Text style={s.body}>{spot.summary.value ?? 'Summary unavailable'}</Text>
        <Text style={s.tags}>{Object.keys(spot.tags.value ?? {}).join(' · ')}</Text>
        <Text style={s.body}>Typical activity: unknown. Seat availability: unknown.</Text>
      </View>
      <Text style={s.small}>Source: {spot.summary.source}{ '\n' }Observation time: unknown{ '\n' }Fixture timestamp: {spot.fetchedAt}{ '\n' }Dataset: {spot.datasetVersion}</Text>
    </>}
    <Pressable accessibilityRole="button" style={s.button}
      onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/'); }}>
      <Text style={s.action}>← Back to places</Text>
    </Pressable>
  </ScrollView>;
}
const s = StyleSheet.create({
  page: { padding: 24, gap: 20, paddingBottom: 48, width: '100%', maxWidth: 680, alignSelf: 'center' },
  placeholder: { minHeight: 150, borderRadius: 20, backgroundColor: '#23382d', padding: 24, justifyContent: 'center', gap: 12 },
  illustration: { color: '#bbef91', fontSize: 26, letterSpacing: 6, fontWeight: '700' },
  badge: { color: '#bbef91', fontSize: 12, letterSpacing: 1, fontWeight: '700' },
  title: { color: '#eff7ef', fontSize: 30, fontWeight: '700' }, body: { color: '#b4c3c9', fontSize: 15, lineHeight: 24 },
  panel: { backgroundColor: '#18242c', padding: 20, borderRadius: 18, gap: 12 },
  heading: { color: '#eff7ef', fontSize: 20, fontWeight: '600' }, tags: { color: '#bbef91', fontSize: 14 },
  small: { color: '#a2b3b9', fontSize: 12, lineHeight: 21 },
  button: { minHeight: 48, justifyContent: 'center' }, action: { color: '#bbef91', fontSize: 16, paddingVertical: 12 },
});
