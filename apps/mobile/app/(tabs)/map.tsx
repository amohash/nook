import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { QuerySchema, type Query, type Recommendation, type Spot } from '@space/contracts';
import { DEMO_LABEL, DEMO_NOW } from '@space/fixtures';
import { provider } from '../../src/data';
import { RecoveryControls } from '../../src/data/RecoveryControls';
import { useSession } from '../../src/data/SessionProvider';
import { Button, DatasetLabel, EmptyState, ErrorState, FilterChipRow, LoadingState, MapListToggle,
  NowLaterControl, SearchBar, SpotCard } from '../../src/components';
import { theme } from '../../src/theme';
import { SessionGate } from '../../src/features/session/SessionGate';
import { FiltersSheet } from '../../src/features/explore/FiltersSheet';
import { activeFilterCount, applyExploreFilters, applyIntentPreset, priceLabel, resetExploreFilters } from '../../src/features/explore/filters';
import { applyRelaxation, relaxationActions } from '../../src/features/explore/relaxations';
import { OriginControls } from '../../src/features/explore/OriginControls';
import { useOrigin } from '../../src/features/explore/useOrigin';
import { PlaceMap } from '../../src/features/explore/PlaceMap';
import { departureAt, lookupPlaces, venueTime } from '../../src/features/explore/presentation';

function Explore() {
  const {session, setQuery} = useSession();
  const query = session!.query;
  const city = session!.city;
  const router = useRouter();
  const [draft, setDraft] = useState<Query | null>(null);
  const [loaded, setLoaded] = useState<{query: Query; data: Recommendation} | null>(null);
  const response = loaded?.query === query ? loaded.data : null;
  const consumedResponse = useRef<Recommendation | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [view, setView] = useState<'map' | 'list'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [timeMode, setTimeMode] = useState<'now' | 'later'>('now');
  const [offset, setOffset] = useState<0 | 60 | 120>(0);
  const [search, setSearch] = useState('');
  const [places, setPlaces] = useState<Spot[]>([]);
  const [lookupLoading, setLookupLoading] = useState(true);
  const [lookupFailed, setLookupFailed] = useState(false);
  const [lookupAttempt, setLookupAttempt] = useState(0);
  const selectOrigin = useCallback((origin: Query['origin']) => setQuery((current) => QuerySchema.parse({...current, origin})), [setQuery]);
  const location = useOrigin(selectOrigin);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(false); setLoaded(null); setSelectedId(null);
    provider.recommend(query).then((data) => {if (active) setLoaded({query, data});})
      .catch(() => {if (active) setError(true);})
      .finally(() => {if (active) setLoading(false);});
    return () => {active = false;};
  }, [query, attempt]);
  useEffect(() => {
    let active = true;
    setPlaces([]); setLookupFailed(false); setLookupLoading(true);
    provider.listSpots(city.id).then((snapshot) => {if (active) setPlaces(snapshot.spots);})
      .catch(() => {if (active) setLookupFailed(true);})
      .finally(() => {if (active) setLookupLoading(false);});
    return () => {active = false;};
  }, [city.id, lookupAttempt]);
  const changeTime = (minutes: 0 | 60 | 120) => {
    setOffset(minutes); setTimeMode(minutes === 0 ? 'now' : 'later');
    const now = city.mode === 'demo' ? DEMO_NOW : new Date().toISOString();
    setQuery((current) => QuerySchema.parse({...current, departAt: departureAt(now, minutes)}));
  };
  const chooseIntent = (intent: 'study' | 'friends') => setQuery((current) => applyIntentPreset(current, intent));
  const relaxations = response ? relaxationActions(query, response.relaxations) : [];
  const chooseRelaxation = (proposal: unknown) => {
    if (loading || error || !response || response.results.length || consumedResponse.current === response) return;
    consumedResponse.current = response;
    setQuery((current) => current === query ? applyRelaxation(current, proposal) : current);
  };
  const lookup = lookupPlaces(places, search);
  const selected = response?.results.find((r) => r.spotId === selectedId) ?? response?.results[0];
  const shown = view === 'map' && selected ? [selected] : response?.results ?? [];
  return <><ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
    <View style={s.row}>
      <Button label="Preferences" variant="outline" onPress={() => {location.cancel(); router.push('/preferences');}} />
      <Button label={`Saved places (${session!.settings.savedIds.length})`} variant="outline" onPress={() => {location.cancel(); router.push('/saved');}} />
      {__DEV__ && <Button label="Preview A’s design" variant="outline" onPress={() => {location.cancel(); router.push('/design-preview');}} />}
    </View>
    <RecoveryControls />
    <Text style={s.eyebrow}>FIND YOUR NOOK</Text>
    <Text style={s.title}>A place for{'\n'}this moment.</Text>
    <SearchBar value={search} onChangeText={(value) => setSearch(value.slice(0, 120))}
      onSubmit={() => Keyboard.dismiss()} placeholder="Find a place by name" accessibilityLabel="Find a place in this dataset" />
    {search.trim().length > 0 && <View style={s.panel}>
      <Text style={s.heading}>Place lookup</Text>
      <Text style={s.small}>Looks up this dataset by name/address. Recommendation filters do not apply to these lookup links.</Text>
      {lookupLoading ? <LoadingState message="Loading place lookup…" /> : lookupFailed ? <ErrorState title="Place lookup unavailable"
        message="Recommendations remain separate. Retry the place directory." action={{label: 'Retry lookup', onPress: () => setLookupAttempt((value) => value + 1)}} />
        : lookup.length ? lookup.map((spot) => <Button key={spot.id} label={spot.name} variant="outline"
          onPress={() => {location.cancel(); Keyboard.dismiss(); router.push({pathname: '/spot/[id]', params: {id: spot.id}});}} />)
          : <EmptyState title="No place found" message="Try another name or clear your search." action={{label: 'Clear search', onPress: () => setSearch('')}} />}
    </View>}
    <OriginControls origin={query.origin} busy={location.busy} error={location.error} accuracyMeters={location.accuracyMeters}
      onDevice={() => {void location.useDevice();}} onManual={location.useManual} />
    <DatasetLabel mode={response?.mode ?? city.mode} description={city.mode === 'demo' ? DEMO_LABEL : `Dataset ${city.datasetVersion}`} />
    <NowLaterControl mode={timeMode} onModeChange={(mode) => changeTime(mode === 'now' ? 0 : offset || 60)}
      presets={[{id: '60', label: 'In 1 hour'}, {id: '120', label: 'In 2 hours'}]}
      selectedPresetId={offset ? String(offset) : null} onSelectPreset={(id) => changeTime(id === '120' ? 120 : 60)}
      timeLabel={`${city.mode === 'demo' ? 'Demo clock · ' : ''}${venueTime(query.departAt, city.timezone).label}`}
      timezoneLabel={city.timezone} />
    <FilterChipRow options={[{id: 'study', label: 'Study'}, {id: 'friends', label: 'Meet Friends'}]}
      selectedId={query.intent === 'study' || query.intent === 'friends' ? query.intent : null}
      onSelect={chooseIntent} filterCount={activeFilterCount(query)} onOpenFilters={() => setDraft(QuerySchema.parse(query))} />
    <MapListToggle value={view} onChange={setView} />
    <Text style={s.heading}>{loading ? 'Finding matches…' : error ? 'Places unavailable' : `${response?.results.length ?? 0} places for you`}</Text>
    <Text style={s.small}>Within {query.maxWalkMinutes} min estimated walk · {priceLabel(query.maxPriceLevel)}{'\n'}
      Categories: {query.categories.length ? query.categories.join(', ') : 'any'} · {query.intent === 'study' ? 'Solo study' : 'Meeting friends'}</Text>
    {loading && <LoadingState />}
    {error && <ErrorState title="Places unavailable" message="Places could not be loaded. Check your connection and retry."
      action={{label: 'Retry', onPress: () => setAttempt((a) => a + 1)}} />}
    {!loading && response?.results.length === 0 && <View style={s.panel}>
      <EmptyState title="No matching places" message="No known places meet your selected constraints. Choose one constraint to change, edit filters or explicitly reset. Constraints are never relaxed automatically; a change may still return no matches."
        action={{label: 'Edit filters', onPress: () => setDraft(QuerySchema.parse(query))}} />
      <Text style={s.small}>{Object.entries(response.excludedCounts).map(([code, count]) => `${code.replaceAll('_', ' ')}: ${count}`).join(' · ')}</Text>
      {relaxations.length > 0 ? <>
        <Text style={s.heading}>Change one constraint</Text>
        {relaxations.map((action) => <Button key={JSON.stringify(action.patch)} label={action.label} variant="outline"
          accessibilityHint="Applies only this change and searches again. Other constraints stay selected."
          onPress={() => chooseRelaxation(action)} />)}
      </> : <Text style={s.small}>No individual changes are available. Edit filters or reset them to try again.</Text>}
      {query.origin.source === 'device' && <Button label="Explore from UT Austin" onPress={location.useManual} variant="outline" />}
      <Button label="Reset filters" variant="outline" onPress={() => setQuery(resetExploreFilters(query))} />
    </View>}
    {view === 'map' && !!response?.results.length && <PlaceMap results={response.results} origin={query.origin}
      departAt={query.departAt} selectedId={selected?.spotId ?? null} onSelect={setSelectedId} onFallback={() => setView('list')} />}
    {shown.map((result) => <Link key={result.spotId} href={{pathname: '/spot/[id]', params: {id: result.spotId, arrivalAt: result.arrivalAt}}} asChild>
      <SpotCard result={result} rank={(response?.results.findIndex((r) => r.spotId === result.spotId) ?? 0) + 1}
        accessibilityRole="link" onPress={location.cancel} />
    </Link>)}
    <Text style={s.small}>{response && `Ranked among ${response.metrics.candidateCount} known candidates. `}Walking estimates use straight-line distance with a detour heuristic.</Text>
  </ScrollView>
    {draft && <FiltersSheet query={draft} onChange={setDraft} onClose={() => setDraft(null)}
      onApply={() => {setQuery((current) => applyExploreFilters(current, draft)); setDraft(null);}} />}
  </>;
}
const s = StyleSheet.create({
  page: {padding: 24, gap: 16, paddingBottom: 48, width: '100%', maxWidth: 680, alignSelf: 'center'},
  row: {gap: 8}, eyebrow: {color: theme.colors.chipSelectedText, fontSize: 12, letterSpacing: 3, fontWeight: '700'},
  title: {color: theme.colors.text, fontSize: 40, lineHeight: 46, fontWeight: '700'},
  heading: {color: theme.colors.text, fontSize: 22, fontWeight: '600'},
  small: {color: theme.colors.textMuted, fontSize: 13, lineHeight: 20},
  panel: {backgroundColor: theme.colors.surface, padding: 16, gap: 12, borderRadius: 20},
});
export default function ExploreRoute() {return <SessionGate><Explore /></SessionGate>;}
