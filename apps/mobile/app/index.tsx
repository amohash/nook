import { SessionGate } from '../src/features/session/SessionGate';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { QuerySchema, type Query, type Recommendation } from '@space/contracts';
import { DEMO_LABEL } from '@space/fixtures';
import { provider } from '../src/data';
import { useSession } from '../src/data/SessionProvider';
import { SpotCard } from '../src/components';
import { theme } from '../src/theme';
import { FiltersSheet } from '../src/features/explore/FiltersSheet';
import { activeFilterCount, applyExploreFilters, applyIntentPreset, priceLabel, resetExploreFilters } from '../src/features/explore/filters';
import { OriginControls } from '../src/features/explore/OriginControls';
import { useOrigin } from '../src/features/explore/useOrigin';

function Explore() {
  const {session, setQuery} = useSession();
  const query = session?.query ?? null;
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
    <Link href="/preferences" asChild><Pressable accessibilityRole="link" style={s.chip} onPress={location.cancel}><Text style={s.chipText}>Preferences</Text></Pressable></Link>
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
    {loading && <ActivityIndicator color={theme.colors.chipSelectedText} accessibilityLabel="Loading places" style={s.loader} />}
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
      <SpotCard result={result} rank={index + 1} accessibilityRole="link" onPress={location.cancel} />
    </Link>)}
    <Text style={s.footer}>{response && `Ranked among ${response.metrics.candidateCount} known ${response.mode === 'demo' ? 'fictional ' : ''}candidates. `}Walking estimates use straight-line distance with a detour heuristic.</Text>
  </ScrollView>
    {draft && <FiltersSheet query={draft} onChange={setDraft} onClose={() => setDraft(null)}
      onApply={() => { setQuery((current) => current ? applyExploreFilters(current, draft) : current); setDraft(null); }} />}
  </>;
}

const s = StyleSheet.create({
  page: { padding: 24, gap: 16, paddingBottom: 48, width: '100%', maxWidth: 680, alignSelf: 'center' },
  eyebrow: { color: theme.colors.chipSelectedText, fontSize: 12, letterSpacing: 3, fontWeight: '700' },
  title: { color: theme.colors.text, fontSize: 40, lineHeight: 46, fontWeight: '700' },
  body: { color: theme.colors.textMuted, fontSize: 15, lineHeight: 23 },
  banner: { backgroundColor: theme.colors.chipSelectedBackground, padding: 16, borderRadius: 14, gap: 8 },
  badge: { color: theme.colors.chipSelectedText, fontSize: 13, fontWeight: '600' },
  small: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 20 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 18, borderWidth: 1, borderColor: theme.colors.chipBorder, borderRadius: 24 },
  selected: { backgroundColor: theme.colors.chipSelectedBackground, borderColor: theme.colors.chipSelectedText },
  chipText: { color: theme.colors.text, fontSize: 15, fontWeight: '600' },
  section: { color: theme.colors.text, fontSize: 23, fontWeight: '600', marginTop: 8 },
  card: { padding: 20, gap: 12, borderRadius: 20, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.chipBorder },
  topline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  rank: { color: theme.colors.chipSelectedText, fontSize: 20, fontWeight: '700' }, score: { color: theme.colors.chipSelectedText, fontSize: 13 },
  cardTitle: { color: theme.colors.text, fontSize: 21, fontWeight: '600' },
  reason: { color: theme.colors.text, fontSize: 14 }, action: { color: theme.colors.chipSelectedText, fontSize: 14, marginTop: 4 },
  loader: { padding: 30 }, footer: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 19 },
});

export default function ExploreRoute() {return <SessionGate><Explore /></SessionGate>;}
