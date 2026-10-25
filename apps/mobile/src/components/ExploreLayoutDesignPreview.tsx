import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Recommendation } from '@space/contracts';
import { createDemoQuery, DEMO_NOW, snapshot } from '@space/fixtures';
import { rankSpots } from '@space/core';
import { theme } from '../theme';
import { ExploreLayout } from './ExploreLayout';
import type { ExploreSheetPosition } from './exploreSheet';
import { SpotCard } from './SpotCard';
import { EmptyState, ErrorState, LoadingState } from './States';

export type ExplorePreviewCase = 'peek' | 'expanded' | 'loading' | 'empty' | 'error';
const cases: ExplorePreviewCase[] = ['peek', 'expanded', 'loading', 'empty', 'error'];
const results: Recommendation['results'] = rankSpots(snapshot.spots, createDemoQuery(), {now: DEMO_NOW}).results
  .map((result) => ({...result, spot: snapshot.spots.find((spot) => spot.id === result.spotId)!}));

/** Local presentation preview. Neutral map slot; no map, location or provider calls. */
export function ExploreLayoutDesignPreview({onClose, initialCase = 'peek'}: {onClose: () => void; initialCase?: ExplorePreviewCase}) {
  const [specimen, setSpecimen] = useState(initialCase);
  const [position, setPosition] = useState<ExploreSheetPosition>(initialCase === 'peek' ? 'peek' : 'expanded');
  const [search, setSearch] = useState('');
  const [intent, setIntent] = useState<'study' | 'friends'>('study');
  const [note, setNote] = useState('Fictional fixtures; preview callbacks only.');
  const chooseCase = (value: ExplorePreviewCase) => {setSpecimen(value); setPosition(value === 'peek' ? 'peek' : 'expanded');};
  return <View style={styles.page}>
    <ExploreLayout sheetPosition={position} onSheetPositionChange={setPosition}
      title={specimen === 'loading' ? 'Finding places…' : specimen === 'empty' ? '0 places for you'
        : specimen === 'error' ? 'Places unavailable' : '3 places for you'}
      dataset={{mode: 'demo', description: 'Fictional venues · fixed scenario'}}
      search={{value: search, onChangeText: setSearch, onSubmit: () => setNote('Search callback; no lookup performed.')}}
      filters={{options: [{id: 'study', label: 'Study'}, {id: 'friends', label: 'Meet Friends'}],
        selectedId: intent, onSelect: (value) => {setIntent(value); setNote('Intent callback; specimen cards stay fixed.');},
        filterCount: 2, onOpenFilters: () => {setNote('Filters callback. D opens the existing sheet.'); setPosition('expanded');}}}
      timeLabel="Now" onTimePress={() => {setNote('Time callback. D opens Now / In 1 hour / In 2 hours.'); setPosition('expanded');}}
      originLabel="UT Austin" onOriginPress={() => {setNote('Origin callback. D opens existing origin controls.'); setPosition('expanded');}}
      onAvatarPress={() => {setNote('Avatar callback. D navigates to Profile for settings.'); setPosition('expanded');}}
      onRecenter={() => {setNote('Recenter callback only; no location requested.'); setPosition('expanded');}}
      mapSlot={<View style={styles.map}>
        <Text style={styles.mapLabel}>Map slot · neutral stand-in</Text>
        <Text style={styles.mapCaption}>No map tiles or location data</Text>
      </View>}>
      <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}>
        {(specimen === 'peek' || specimen === 'expanded') && results.map((result, index) =>
          <SpotCard key={result.spotId} variant="compact" result={result} rank={index + 1}
            onPress={() => setNote(`Card callback: ${result.spot.name}. D opens detail.`)} />)}
        {specimen === 'loading' && <LoadingState message="Loading specimen · no request running" />}
        {specimen === 'empty' && <EmptyState title="No matching places" message="Empty-response specimen. Your constraints have not changed."
          action={{label: 'Edit filters specimen', onPress: () => setNote('Edit filters callback only.')}} />}
        {specimen === 'error' && <ErrorState title="Places unavailable" message="Load-failure specimen inside the sheet."
          action={{label: 'Retry specimen', onPress: () => chooseCase('expanded')}} />}
        <Text accessibilityLiveRegion="polite" style={styles.note}>{note}</Text>
      </ScrollView>
    </ExploreLayout>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.toolbar} contentContainerStyle={styles.toolbarContent}>
      <Pressable accessibilityRole="button" onPress={onClose} style={styles.control}><Text style={styles.label}>Back</Text></Pressable>
      {cases.map((value) => <Pressable key={value} accessibilityRole="button" accessibilityLabel={`Preview ${value}`}
        accessibilityState={{selected: specimen === value}} onPress={() => chooseCase(value)}
        style={[styles.control, specimen === value && styles.selected]}><Text style={styles.label}>{value}</Text></Pressable>)}
    </ScrollView>
  </View>;
}
const styles = StyleSheet.create({
  page: {flex: 1, minHeight: 0},
  map: {flex: 1, backgroundColor: theme.colors.greyBackground, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 4},
  mapLabel: {color: theme.colors.greyText, fontFamily: theme.typography.bodyFamily, fontSize: 14, lineHeight: 20, textAlign: 'center'},
  mapCaption: {color: theme.colors.greyText, fontFamily: theme.typography.bodyFamily, fontSize: 12, lineHeight: 18},
  list: {paddingHorizontal: 20, paddingBottom: 24, gap: 12},
  note: {color: theme.colors.secondaryText, fontSize: 12, lineHeight: 18},
  toolbar: {flexGrow: 0, backgroundColor: theme.colors.surface},
  toolbarContent: {gap: 8, paddingHorizontal: 8, paddingVertical: 4},
  control: {minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', borderRadius: 12},
  selected: {backgroundColor: theme.colors.chipSelectedBackground},
  label: {fontSize: 12, lineHeight: 18, color: theme.colors.text},
});
