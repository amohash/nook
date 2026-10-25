import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { ActionRow } from './ActionRow';
import { BusynessChart } from './BusynessChart';
import { Button } from './Button';
import { EvidenceLabel } from './EvidenceLabel';
import { FilterChipRow } from './FilterChipRow';
import { LiveObservationBadge } from './LiveObservationBadge';
import { MapLegend, MapPin } from './MapPin';
import { MapListToggle } from './MapListToggle';
import { NowLaterControl } from './NowLaterControl';
import { OpenStatusPill } from './OpenStatusPill';
import { SearchBar } from './SearchBar';
import { SheetContainer } from './SheetContainer';
import type { OpenStatus, TypicalCrowd } from './exploreContent';

const FETCHED = '2026-10-24T18:00:00-05:00';
const intentOptions = [{ id: 'study' as const, label: 'Study' }, { id: 'friends' as const, label: 'Meet Friends' }];
const presets = [{ id: 'six', label: 'Oct 24, 6 PM' }, { id: 'eight', label: 'Oct 24, 8 PM' }];
const gaps: TypicalCrowd = { source: 'synthetic', fetchedAt: FETCHED, entries: [
  { weekday: 6, hour: 12, value: 0.4 }, { weekday: 6, hour: 6, value: 0.1 },
  { weekday: 6, hour: 9, value: null }, { weekday: 6, hour: 12, value: 0.8 },
  { weekday: 6, hour: 18, value: 0.5 },
] };
const zeros: TypicalCrowd = { source: 'synthetic', fetchedAt: FETCHED,
  entries: Array.from({ length: 24 }, (_, hour) => ({ weekday: 6, hour, value: 0 })) };
const allNull: TypicalCrowd = { source: 'synthetic', fetchedAt: FETCHED, entries: [{ weekday: 6, hour: 9, value: null }] };
const statuses: OpenStatus[] = ['open', 'closing_soon', 'closed', 'temporarily_closed', 'permanently_closed', 'unknown', 'stale'];

/** Labeled synthetic visual specimens. No API calls, GPS, storage or native actions. */
export function ExploreDesignPreview({ onClose }: { onClose?: () => void }) {
  const [intent, setIntent] = useState<'study' | 'friends'>('study');
  const [emptyIntent, setEmptyIntent] = useState<'study' | 'friends' | null>(null);
  const [view, setView] = useState<'map' | 'list'>('map');
  const [search, setSearch] = useState('UT Austin main campus');
  const [emptySearch, setEmptySearch] = useState('');
  const [mode, setMode] = useState<'now' | 'later'>('now');
  const [preset, setPreset] = useState<string | null>('six');
  const selectedTimeLabel = presets.find(({ id }) => id === preset)?.label ?? 'No preset selected';
  const [saved, setSaved] = useState(false);
  const [otherSaved, setOtherSaved] = useState(true);
  const [note, setNote] = useState('Preview only. Data and timestamps are illustrative, not provider observations.');
  return <SafeAreaView style={styles.page}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text accessibilityRole="header" style={styles.title}>Explore component states</Text>
      <Text style={styles.body}>Demo visual fixtures · fixed sample time · no live claims or saved changes</Text>
      {onClose && <Button label="Back to screen preview" variant="outline" onPress={onClose} />}
      <Text accessibilityLiveRegion="polite" style={styles.body}>{note}</Text>

      <Text accessibilityRole="header" style={styles.heading}>MapPin + MapLegend</Text>
      <View style={styles.row}>
        <MapPin fitScore={90} rank={1} typicalLevel="quiet" selected label="Selected specimen" />
        <MapPin fitScore={90} typicalLevel="busy" label="Same fit, busy ring" />
        <MapPin fitScore={45} rank={2} typicalLevel="moderate" />
        <MapPin fitScore={10} typicalLevel="quiet" />
        <MapPin fitScore={null} typicalLevel="unknown" />
        <MapPin fitScore={90} typicalLevel="unknown" selected />
      </View>
      <MapLegend />

      <Text accessibilityRole="header" style={styles.heading}>Intent and Filters · 2, 0, selected and unselected</Text>
      <FilterChipRow options={intentOptions} selectedId={intent} onSelect={setIntent} filterCount={2} onOpenFilters={() => setNote('Filters (2) pressed. D owns the modal.')} />
      <FilterChipRow options={intentOptions} selectedId={emptyIntent} onSelect={setEmptyIntent} filterCount={0} onOpenFilters={() => setNote('Filters (0) pressed. Badge is hidden.')} />
      <FilterChipRow options={intentOptions} selectedId="friends" onSelect={(id) => setNote(`Selected intent callback: ${id}`)} filterCount={2} onOpenFilters={() => setNote('Friends specimen filters pressed.')} />

      <Text accessibilityRole="header" style={styles.heading}>Map / List</Text>
      <MapListToggle value={view} onChange={setView} />
      <MapListToggle value="list" onChange={(value) => setNote(`View callback: ${value}`)} />
      <Text accessibilityRole="header" style={styles.heading}>Controlled search · filled and empty</Text>
      <SearchBar value={search} onChangeText={setSearch} onSubmit={(value) => setNote(`Search submitted: ${value}`)} />
      <SearchBar value={emptySearch} onChangeText={setEmptySearch} />

      <Text accessibilityRole="header" style={styles.heading}>Historical chart · gaps, unsorted duplicates</Text>
      <BusynessChart typicalCrowd={gaps} weekday={6} currentHour={12} />
      <Text accessibilityRole="header" style={styles.heading}>Highlighted hour with missing data</Text>
      <BusynessChart typicalCrowd={gaps} weekday={6} currentHour={9} />
      <Text accessibilityRole="header" style={styles.heading}>Historical chart · real zeros</Text>
      <BusynessChart typicalCrowd={zeros} weekday={6} currentHour={9} />
      <Text accessibilityRole="header" style={styles.heading}>Null dataset</Text>
      <BusynessChart typicalCrowd={null} weekday={6} currentHour={9} />
      <Text accessibilityRole="header" style={styles.heading}>All-null / missing hours</Text>
      <BusynessChart typicalCrowd={allNull} weekday={6} currentHour={9} />
      <Text accessibilityRole="header" style={styles.heading}>Source-label specimens</Text>
      <Text style={styles.body}>Typography examples only; no real SerpApi, Muse or curated records are claimed here.</Text>
      {(['serpapi', 'muse', 'curated', 'synthetic'] as const).map((source) => <EvidenceLabel key={source} source={source} fetchedAt={FETCHED} />)}

      <Text accessibilityRole="header" style={styles.heading}>Observation · observed time, fetched fallback, null</Text>
      <LiveObservationBadge liveObservation={{ text: 'Demo observation sample', observedAt: '2026-10-24T17:55:00-05:00', fetchedAt: FETCHED, numericValue: null }} />
      <LiveObservationBadge liveObservation={{ text: 'Demo text-only observation sample', observedAt: null, fetchedAt: FETCHED, numericValue: null }} />
      <Text style={styles.body}>The null badge below intentionally renders nothing:</Text>
      <LiveObservationBadge liveObservation={null} />

      <Text accessibilityRole="header" style={styles.heading}>All seven computed status specimens</Text>
      <View style={styles.statuses}>{statuses.map((status) => <OpenStatusPill key={status} status={status} />)}</View>
      <OpenStatusPill status="stale" label="Custom label from D" />

      <Text accessibilityRole="header" style={styles.heading}>Now / Later · D supplies time and timezone</Text>
      <NowLaterControl mode={mode} onModeChange={setMode} presets={presets} selectedPresetId={preset} onSelectPreset={setPreset}
        timeLabel={mode === 'now' ? 'Demo clock · Oct 24, 2026, 6 PM' : `Demo preset · ${selectedTimeLabel}, 2026`} timezoneLabel="America/Chicago" />
      <NowLaterControl mode="later" onModeChange={(value) => setNote(`Time mode callback: ${value}`)} presets={presets}
        selectedPresetId={preset} onSelectPreset={setPreset} timeLabel={`Demo future preset · ${selectedTimeLabel}, 2026`} timezoneLabel="America/Chicago" />
      <NowLaterControl mode="later" onModeChange={() => setNote('Empty presets specimen')} presets={[]} selectedPresetId={null}
        onSelectPreset={() => setNote('No preset selected')} timeLabel="No configured departure" timezoneLabel="America/Chicago" />

      <Text accessibilityRole="header" style={styles.heading}>ActionRow · not saved / saved</Text>
      <ActionRow saved={saved} onSave={() => setSaved((value) => !value)} onShare={() => setNote('Share callback only; no OS share opened.')}
        onOpenMaps={() => setNote('Maps callback only; no URL opened.')} />
      <ActionRow saved={otherSaved} onSave={() => setOtherSaved((value) => !value)} onShare={() => setNote('Share callback only.')}
        onOpenMaps={() => setNote('Maps callback only.')} />
      <ActionRow saved saving mapsDisabled onSave={() => setNote('Busy save should be disabled')}
        onShare={() => setNote('Share callback only.')} onOpenMaps={() => setNote('Disabled maps should not open')} />

      <Text accessibilityRole="header" style={styles.heading}>Sheet · scroll content; Apply stays outside it</Text>
      <View style={styles.sheetExample}>
        <SheetContainer title="Filters specimen" onCancel={() => setNote('Cancel pressed. D closes the sheet.')}
          onReset={() => setNote('Reset pressed. D resets the draft only.')} onApply={() => setNote('Apply pressed. D applies the draft.')}>
          {Array.from({ length: 12 }, (_, index) => <Text key={index} style={styles.body}>Demo filter section {index + 1} · scroll inside this sheet.</Text>)}
        </SheetContainer>
      </View>
      <Text accessibilityRole="header" style={styles.heading}>Sheet · applying</Text>
      <View style={styles.sheetExample}>
        <SheetContainer title="Applying specimen" applying onCancel={() => setNote('Cancel applying callback.')}
          onReset={() => setNote('Busy Reset should be disabled.')} onApply={() => setNote('Busy Apply should be disabled.')}>
          <Text style={styles.body}>Busy visual specimen only; no request is running.</Text>
        </SheetContainer>
      </View>
      <Text accessibilityRole="header" style={styles.heading}>Sheet · Apply disabled</Text>
      <View style={styles.sheetExample}>
        <SheetContainer title="Disabled specimen" applyDisabled onCancel={() => setNote('Cancel disabled specimen.')}
          onReset={() => setNote('Reset disabled specimen.')} onApply={() => setNote('Disabled Apply should not run.')}>
          <Text style={styles.body}>D supplies applyDisabled; this component does not validate or change filters.</Text>
        </SheetContainer>
      </View>
      <Text accessibilityLiveRegion="polite" style={styles.body}>{note}</Text>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.xl, gap: theme.spacing.lg, width: '100%', maxWidth: theme.sizes.contentMaxWidth, alignSelf: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.xs },
  statuses: { gap: theme.spacing.xs },
  title: { color: theme.colors.text, fontFamily: theme.typography.headingFamily, fontSize: theme.typography.size.title,
    lineHeight: theme.typography.lineHeight.title, fontWeight: theme.typography.weight.bold },
  heading: { color: theme.colors.text, fontFamily: theme.typography.bodyFamily, fontSize: theme.typography.size.button,
    lineHeight: theme.typography.lineHeight.button, fontWeight: theme.typography.weight.semibold },
  body: { color: theme.colors.textMuted, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.body, lineHeight: theme.typography.lineHeight.body },
  sheetExample: { height: theme.sizes.previewSheet, borderWidth: theme.borders.thin, borderColor: theme.colors.chipBorder, borderRadius: theme.radii.card },
});
