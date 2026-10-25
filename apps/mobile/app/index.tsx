import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import type { Query, Recommendation } from '@space/contracts';
import { createDemoQuery, DEMO_LABEL } from '@space/fixtures';
import { provider } from '../src/data';

export default function Explore() {
  const [query, setQuery] = useState<Query>(() => createDemoQuery());
  const [response, setResponse] = useState<Recommendation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(null); setResponse(null);
    provider.recommend(query).then((data) => { if (active) setResponse(data); })
      .catch(() => { if (active) setError('Places could not be loaded. Check your connection and try again.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; }; // Ignore stale requests after a filter change or unmount.
  }, [query, attempt]);
  const chooseIntent = (intent: 'study' | 'friends') => setQuery((current) => ({ ...current, intent,
    groupSize: intent === 'study' ? 1 : 4, targetNoise: intent === 'study' ? 0.15 : 0.65,
    tagWeights: intent === 'study' ? { study: 1, quiet: 1 } : { lively: 1, group_friendly: 1 } }));
  return <ScrollView contentContainerStyle={s.page}>
    <Text style={s.eyebrow}>FIND YOUR SPACE</Text>
    <Text style={s.title}>A place for{ '\n' }this moment.</Text>
    <Text style={s.body}>Manual origin · UT Austin campus{ '\n' }Demo clock · Oct 24, 2026, 6:00 PM America/Chicago</Text>
    <View style={s.banner}><Text style={s.badge}>{response ? response.mode === 'demo' ? DEMO_LABEL : `${response.mode} dataset` : loading ? 'Loading dataset…' : 'Dataset unavailable'}</Text>
      {response?.mode === 'demo' && <Text style={s.small}>Illustrative locations. No real reviews, Muse output, or seat availability.</Text>}</View>
    <View style={s.row}>
      {(['study', 'friends'] as const).map((intent) => <Pressable key={intent} accessibilityRole="button"
        accessibilityState={{ selected: query.intent === intent }} onPress={() => chooseIntent(intent)}
        style={[s.chip, query.intent === intent && s.selected]}><Text style={s.chipText}>{intent === 'study' ? 'Solo study' : 'Meet friends'}</Text></Pressable>)}
    </View>
    <View style={s.row}>
      <Pressable accessibilityRole="button" accessibilityState={{ selected: query.maxPriceLevel === 0 }}
        style={[s.chip, query.maxPriceLevel === 0 && s.selected]}
        onPress={() => setQuery((q) => ({ ...q, maxPriceLevel: q.maxPriceLevel === 0 ? null : 0 }))}>
        <Text style={s.chipText}>Free only</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityState={{ selected: query.categories.includes('cafe') }}
        style={[s.chip, query.categories.includes('cafe') && s.selected]}
        onPress={() => setQuery((q) => ({ ...q, categories: q.categories.includes('cafe') ? [] : ['cafe'] }))}>
        <Text style={s.chipText}>Cafés only</Text>
      </Pressable>
      <Pressable accessibilityRole="button" style={s.chip} onPress={() => setQuery(createDemoQuery())}><Text style={s.chipText}>Reset</Text></Pressable>
    </View>
    <Text style={s.section}>{loading ? 'Finding matches…' : error ? 'Places unavailable' : `${response?.results.length ?? 0} places for you`}</Text>
    <Text style={s.small}>Within {query.maxWalkMinutes} min estimated walk · {query.maxPriceLevel === 0 ? 'strict free-only cap' : 'no price cap'}</Text>
    {loading && <ActivityIndicator color="#bbef91" accessibilityLabel="Loading places" style={s.loader} />}
    {error && <View style={s.card}><Text role="alert" style={s.body}>{error}</Text>
      <Pressable accessibilityRole="button" style={s.chip} onPress={() => setAttempt((a) => a + 1)}><Text style={s.chipText}>Retry</Text></Pressable></View>}
    {!loading && response?.results.length === 0 && <View style={s.card}><Text style={s.cardTitle}>No matching places</Text>
      <Text style={s.body}>Your strict constraints stay in place. Change a filter or reset to explore again.</Text>
      <Pressable accessibilityRole="button" style={s.chip} onPress={() => setQuery(createDemoQuery())}><Text style={s.chipText}>Reset filters</Text></Pressable></View>}
    {response?.results.map((result, index) => <Link key={result.spotId} href={{ pathname: '/spot/[id]', params: { id: result.spotId } }} asChild>
      <Pressable accessibilityRole="link" style={s.card}>
        <View style={s.topline}><Text style={s.rank}>0{index + 1}</Text><Text style={s.score}>Fit score {Math.round(result.score)}/100</Text></View>
        <Text style={s.cardTitle}>{result.spot.name}</Text>
        <Text style={s.small}>{result.spot.categories.join(' · ')} · {result.estimatedWalkMinutes} min estimated walk</Text>
        {result.reasons.slice(1).map((reason) => <Text key={reason.code} style={s.reason}>{reason.text}</Text>)}
        <Text style={s.action}>Explore this place →</Text>
      </Pressable>
    </Link>)}
    <Text style={s.footer}>{response && `Ranked among ${response.metrics.candidateCount} known ${response.mode === 'demo' ? 'fictional ' : ''}candidates. `}Walking estimates use straight-line distance with a detour heuristic.</Text>
  </ScrollView>;
}

const s = StyleSheet.create({
  page: { padding: 24, gap: 16, paddingBottom: 48, width: '100%', maxWidth: 680, alignSelf: 'center' },
  eyebrow: { color: '#bbef91', fontSize: 12, letterSpacing: 3, fontWeight: '700' },
  title: { color: '#eff7ef', fontSize: 40, lineHeight: 46, fontWeight: '700' },
  body: { color: '#b4c3c9', fontSize: 15, lineHeight: 23 },
  banner: { backgroundColor: '#233224', padding: 16, borderRadius: 14, gap: 8 },
  badge: { color: '#c7efb2', fontSize: 13, fontWeight: '600' },
  small: { color: '#b4c3c9', fontSize: 13, lineHeight: 20 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 18, borderWidth: 1, borderColor: '#43564d', borderRadius: 24 },
  selected: { backgroundColor: '#34513b', borderColor: '#bbef91' },
  chipText: { color: '#eff7ef', fontSize: 15, fontWeight: '600' },
  section: { color: '#eff7ef', fontSize: 23, fontWeight: '600', marginTop: 8 },
  card: { padding: 20, gap: 12, borderRadius: 20, backgroundColor: '#18242c', borderWidth: 1, borderColor: '#2c3d47' },
  topline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  rank: { color: '#bbef91', fontSize: 20, fontWeight: '700' }, score: { color: '#bbef91', fontSize: 13 },
  cardTitle: { color: '#eff7ef', fontSize: 21, fontWeight: '600' },
  reason: { color: '#d4e0d5', fontSize: 14 }, action: { color: '#bbef91', fontSize: 14, marginTop: 4 },
  loader: { padding: 30 }, footer: { color: '#a2b3b9', fontSize: 12, lineHeight: 19 },
});
