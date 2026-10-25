import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { QuerySchema, type Query, type Recommendation } from '@space/contracts';
import { DEMO_LABEL } from '@space/fixtures';
import { provider } from '../src/data';
import { createInitialQuery } from '../src/data/initialQuery';
import { FiltersSheet } from '../src/features/explore/FiltersSheet';
import { activeFilterCount, applyExploreFilters, applyIntentPreset, priceLabel, resetExploreFilters } from '../src/features/explore/filters';
import { OriginControls } from '../src/features/explore/OriginControls';
import { useOrigin } from '../src/features/explore/useOrigin';

export default function Explore() {
  const [query, setQuery] = useState<Query | null>(null);
  const [draft, setDraft] = useState<Query | null>(null);
  const [response, setResponse] = useState<Recommendation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const selectOrigin = useCallback((origin: Query['origin']) => {
    setQuery((current) => current ? QuerySchema.parse({ ...current, origin }) : current);
  }, []);
  const location = useOrigin(selectOrigin);
  useEffect(() => {
    if (query) return;
    let active = true;
    setLoading(true); setError(null);
    provider.listCities().then((cities) => {
      if (!active) return;
      const city = cities[0];
      if (!city) throw new Error('No supported datasets');
      setQuery(createInitialQuery(city, new Date().toISOString()));
    }).catch(() => {
      if (active) { setError('Dataset could not be loaded. Check your connection and try again.'); setLoading(false); }
    });
    return () => { active = false; };
  }, [query, attempt]);
  useEffect(() => {
    if (!query) return;
    let active = true;
    setLoading(true); setError(null); setResponse(null);
    provider.recommend(query).then((data) => { if (active) setResponse(data); })
      .catch(() => { if (active) setError('Places could not be loaded. Check your connection and try again.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; }; // Ignore stale requests after a filter change or unmount.
  }, [query, attempt]);
  const chooseIntent = (intent: 'study' | 'friends') => setQuery((current) => current ? applyIntentPreset(current, intent) : current);
  if (!query) return <View style={s.page}>
    <Text style={s.section}>{loading ? 'Loading dataset…' : 'Dataset unavailable'}</Text>
    {loading ? <ActivityIndicator accessibilityLabel="Loading dataset" /> : <>
      <Text role="alert" style={s.body}>{error}</Text>
      <Pressable accessibilityRole="button" style={s.chip} onPress={() => setAttempt((a) => a + 1)}><Text style={s.chipText}>Retry</Text></Pressable>
    </>}
  </View>;
  const resultCount = response?.results.length ?? 0;
  return <><ScrollView contentContainerStyle={s.page}>
    {__DEV__ && <Link href="/design-preview" asChild>
      <Pressable accessibilityRole="link" style={s.chip}><Text style={s.chipText}>Preview A’s design</Text></Pressable>
    </Link>}
    <Text style={s.eyebrow}>FIND YOUR SPACE</Text>
    <Text style={s.title}>A place for{ '\n' }this moment.</Text>
    <OriginControls origin={query.origin} busy={location.busy} error={location.error} accuracyMeters={location.accuracyMeters}
      onDevice={() => { void location.useDevice(); }} onManual={location.useManual} />
    <Text style={s.body}>{response?.mode === 'demo' ? 'Demo clock' : 'Departure'} · {query.departAt}</Text>
    <View style={s.banner}><Text style={s.badge}>{response ? response.mode === 'demo' ? DEMO_LABEL : `${response.mode} dataset` : loading ? 'Loading dataset…' : 'Dataset unavailable'}</Text>
      {response?.mode === 'demo' && <Text style={s.small}>Illustrative locations. No real reviews, Muse output, or seat availability.</Text>}</View>
    <View style={s.row}>
      {(['study', 'friends'] as const).map((intent) => <Pressable key={intent} accessibilityRole="button"
        accessibilityState={{ selected: query.intent === intent }} aria-pressed={query.intent === intent} onPress={() => chooseIntent(intent)}
        style={[s.chip, query.intent === intent && s.selected]}><Text style={s.chipText}>{intent === 'study' ? 'Study' : 'Meet Friends'}</Text></Pressable>)}
    </View>
    <View style={s.row}>
      <Pressable accessibilityRole="button" style={s.chip} onPress={() => setDraft(QuerySchema.parse(query))}>
        <Text style={s.chipText}>Filters ({activeFilterCount(query)})</Text>
      </Pressable>
    </View>
    <Text style={s.section}>{loading ? 'Finding matches…' : error ? 'Places unavailable' : `${resultCount} ${resultCount === 1 ? 'place' : 'places'} for you`}</Text>
    <Text style={s.small}>Within {query.maxWalkMinutes} min estimated walk · {priceLabel(query.maxPriceLevel)}{ '\n' }
      Categories: {query.categories.length ? query.categories.join(', ') : 'any'} · {query.intent === 'study' ? 'Solo study' : 'Meeting friends'}
    </Text>
    {loading && <ActivityIndicator color="#bbef91" accessibilityLabel="Loading places" style={s.loader} />}
    {error && <View style={s.card}><Text role="alert" style={s.body}>{error}</Text>
      <Pressable accessibilityRole="button" style={s.chip} onPress={() => setAttempt((a) => a + 1)}><Text style={s.chipText}>Retry</Text></Pressable></View>}
    {!loading && response?.results.length === 0 && <View style={s.card}><Text style={s.cardTitle}>No matching places</Text>
      <Text style={s.body}>No known places meet the selected origin, category, price and estimated walk limits. Your constraints stay in place; edit filters or reset to Study defaults.</Text>
      {query.origin.source === 'device' && <><Text style={s.body}>Your location may be outside this campus dataset's walking range. Explore from UT Austin without changing your filters.</Text>
        <Pressable accessibilityRole="button" style={s.chip} onPress={location.useManual}><Text style={s.chipText}>Explore from UT Austin</Text></Pressable></>}
      <Text style={s.small}>{Object.entries(response.excludedCounts).map(([code, count]) => `${code.replaceAll('_', ' ')}: ${count}`).join(' · ')}</Text>
      <Pressable accessibilityRole="button" style={s.chip} onPress={() => setDraft(QuerySchema.parse(query))}><Text style={s.chipText}>Edit filters</Text></Pressable>
      <Pressable accessibilityRole="button" style={s.chip} onPress={() => setQuery(resetExploreFilters(query))}><Text style={s.chipText}>Reset filters</Text></Pressable></View>}
    {response?.results.map((result, index) => <Link key={result.spotId} href={{ pathname: '/spot/[id]', params: { id: result.spotId } }} asChild>
      <Pressable accessibilityRole="link" style={s.card} onPress={location.cancel}>
        <View style={s.topline}><Text style={s.rank}>0{index + 1}</Text><Text style={s.score}>Fit score {Math.round(result.score)}/100</Text></View>
        <Text style={s.cardTitle}>{result.spot.name}</Text>
        <Text style={s.small}>{result.spot.categories.join(' · ')} · {result.estimatedWalkMinutes} min estimated walk</Text>
        {result.reasons.slice(1).map((reason) => <Text key={reason.code} style={s.reason}>{reason.text}</Text>)}
        <Text style={s.action}>Explore this place →</Text>
      </Pressable>
    </Link>)}
    <Text style={s.footer}>{response && `Ranked among ${response.metrics.candidateCount} known ${response.mode === 'demo' ? 'fictional ' : ''}candidates. `}Walking estimates use straight-line distance with a detour heuristic.</Text>
  </ScrollView>
    {draft && <FiltersSheet query={draft} onChange={setDraft} onClose={() => setDraft(null)}
      onApply={() => { setQuery((current) => current ? applyExploreFilters(current, draft) : current); setDraft(null); }} />}
  </>;
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
