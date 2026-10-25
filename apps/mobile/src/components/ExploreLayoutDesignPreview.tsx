import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Recommendation } from '@space/contracts';
import { DEMO_NOW, snapshot } from '@space/fixtures';
import { theme } from '../theme';
import { Button } from './Button';
import { Chip } from './Chip';
import { ExploreLayout } from './ExploreLayout';
import { MapPin } from './MapPin';
import { SpotCard } from './SpotCard';
import { EmptyState, ErrorState, LoadingState } from './States';

const example = snapshot.spots[0]!;
const result: Recommendation['results'][number] = {
  spotId: example.id, score: 85, evidenceCoverage: 0.5, estimatedWalkMinutes: 7,
  arrivalAt: DEMO_NOW, reasons: [], warnings: [], spot: { ...example,
    rating: { ...example.rating, value: 4.5 }, reviewCount: { ...example.reviewCount, value: 42 },
    typicalCrowd: { source: 'synthetic', fetchedAt: DEMO_NOW, entries: [{ weekday: 6, hour: 18, value: 0 }] },
  },
};

export function ExploreLayoutDesignPreview({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<'map' | 'list'>('map');
  const [search, setSearch] = useState('UT Austin');
  const [intent, setIntent] = useState<'study' | 'friends'>('study');
  const [state, setState] = useState<'cards' | 'loading' | 'error' | 'empty'>('cards');
  const [note, setNote] = useState('Fictional fixtures · no real map, provider facts or saved changes.');
  return <ExploreLayout mode={mode} onModeChange={setMode}
    title="Places for your plans" subtitle={note}
    dataset={{ mode: 'demo', description: 'Fictional venues and synthetic facts' }}
    search={{ value: search, onChangeText: setSearch, onSubmit: () => setNote('Preview search callback only.') }}
    filters={{ options: [{ id: 'study', label: 'Study' }, { id: 'friends', label: 'Meet Friends' }],
      selectedId: intent, onSelect: setIntent, filterCount: 2,
      onOpenFilters: () => setNote('Filters callback only. D opens the real sheet.') }}
    topAccessory={<View style={styles.controls}>
      <Button label="Back to component states" variant="outline" onPress={onClose} />
      <View style={styles.states}>{(['cards', 'loading', 'error', 'empty'] as const).map((value) => <Chip key={value}
        label={value} selectionRole="radio" selected={state === value} onPress={() => setState(value)} />)}</View>
    </View>}
    map={<View style={styles.map}>
      <Text style={styles.mapLabel}>Illustrative map slot · not real map tiles</Text>
      <View style={styles.pins}><MapPin fitScore={85} rank={1} typicalLevel="quiet" />
        <MapPin fitScore={null} rank={2} typicalLevel="unknown" /></View>
    </View>}>
    <ScrollView nestedScrollEnabled contentContainerStyle={styles.list}>
      {state === 'cards' && <>
        <SpotCard variant="compact" result={result} rank={1} typicalCrowdValue={0}
          onPress={() => setNote('Compact card callback only. D opens details.')} />
        <SpotCard variant="compact" result={{ ...result, spot: example, score: 0 }} rank={2}
          onPress={() => setNote('Limited-details card callback only.')} />
        <Text style={styles.body}>Default variant retained:</Text>
        <SpotCard result={result} rank={3} onPress={() => setNote('Default card callback only.')} />
      </>}
      {state === 'loading' && <LoadingState message="Loading specimen · no request running" />}
      {state === 'error' && <ErrorState title="Error specimen" message="Example load failure."
        action={{ label: 'Retry specimen', onPress: () => setState('cards') }} />}
      {state === 'empty' && <EmptyState title="No matching places" message="Successful empty-response specimen; no constraints were changed." />}
    </ScrollView>
  </ExploreLayout>;
}

const styles = StyleSheet.create({
  controls: { backgroundColor: theme.colors.background, gap: theme.spacing.xs, padding: theme.spacing.xxs },
  states: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
  map: { flex: 1, backgroundColor: theme.colors.fitLow, justifyContent: 'center', alignItems: 'center', gap: theme.spacing.lg },
  mapLabel: { color: theme.colors.text, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.caption, lineHeight: theme.typography.lineHeight.caption },
  pins: { flexDirection: 'row', gap: theme.spacing.hero },
  list: { padding: theme.spacing.lg, gap: theme.spacing.md },
  body: { color: theme.colors.text, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.body, lineHeight: theme.typography.lineHeight.body },
});
