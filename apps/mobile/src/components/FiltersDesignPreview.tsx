import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Query } from '@space/contracts';
import { createDemoQuery } from '@space/fixtures';
import { activeFilterCount, applyIntentPreset, ATMOSPHERE_OPTIONS, CATEGORY_OPTIONS,
  priceLabel, resetExploreFilters, VIBE_OPTIONS } from '../features/explore/filters';
import { theme } from '../theme';
import { Chip } from './Chip';
import { ChipGroup } from './ChipGroup';
import { FilterSection } from './FilterSection';
import { LevelPicker } from './LevelPicker';
import { OriginCard, type OriginCardProps } from './OriginCard';
import { SegmentedControl } from './SegmentedControl';
import { SheetContainer } from './SheetContainer';

const initialDraft = (): Query => ({ ...createDemoQuery(), categories: ['cafe'], maxPriceLevel: 2, maxWalkMinutes: 10 });
const minutes = (values: number[]) => values.map((value) => ({ value, label: `${value} min` }));

/** Development specimen only. Parent supplies SafeAreaProvider and a bounded height.
 * No Modal, navigation, location requests, persistence or recommendation calls.
 */
export function FiltersDesignPreview({ originState = 'manual' }: {
  originState?: 'manual' | 'denied' | 'locating' | 'device';
}) {
  const [query, onChange] = useState(initialDraft);
  const [note, setNote] = useState('Illustrative draft · no changes saved or applied to results.');
  const [manual, setManual] = useState(false);
  const originProps: OriginCardProps = {
    origin: { ...query.origin, source: !manual && originState === 'device' ? 'device' : 'manual' },
    busy: !manual && originState === 'locating',
    error: !manual && originState === 'denied' ? 'Location permission denied. Use UT Austin.' : null,
    accuracyMeters: null,
    onDevice: () => setNote('Preview callback: Use my location. No permission requested.'),
    onManual: () => { setManual(true); setNote('Preview callback: Use UT Austin.'); },
  };
  return <View style={styles.preview}>
    <SheetContainer title={`Filters (${activeFilterCount(query)})`}
      onCancel={() => { onChange(initialDraft()); setNote('Preview Cancel: draft discarded; no results changed.'); }}
      onReset={() => { onChange(resetExploreFilters(query)); setNote('Preview Reset: defaults restored in draft only.'); }}
      onApply={() => setNote(`Preview Apply: ${activeFilterCount(query)} changed groups. No results changed.`)}>
      <Text accessibilityLiveRegion="polite" style={styles.body}>{note}</Text>
      <Text style={styles.body}>{activeFilterCount(query)} active filters · changed groups from Study defaults. Changes take effect on Apply.</Text>
      <OriginCard {...originProps} />
      <FilterSection title="Intent presets" helper="Study is solo; Meet Friends uses four people. Presets keep strict constraints and session length.">
        <SegmentedControl accessibilityLabel="Intent presets" options={[{ value: 'study', label: 'Study' }, { value: 'friends', label: 'Meet Friends' }] as const}
          value={query.intent} onChange={(intent: Query['intent']) => { if (intent === 'study' || intent === 'friends') onChange(applyIntentPreset(query, intent)); }} />
      </FilterSection>
      <FilterSection title="Place category" helper="Select any combination. No selection means any category.">
        <ChipGroup accessibilityLabel="Place category" options={CATEGORY_OPTIONS} selected={query.categories}
          onToggle={(value) => onChange({ ...query, categories: query.categories.includes(value)
            ? query.categories.filter((category) => category !== value) : [...query.categories, value] })} />
      </FilterSection>
      <FilterSection title="Maximum price" helper="A strict cap excludes unknown prices. Dollar signs are price levels, not exact amounts.">
        <SegmentedControl accessibilityLabel="Maximum price" options={([null, 0, 1, 2, 3, 4] as const).map((value) => ({ value, label: priceLabel(value) }))}
          value={query.maxPriceLevel} onChange={(maxPriceLevel) => onChange({ ...query, maxPriceLevel })} />
      </FilterSection>
      <FilterSection title="Maximum estimated walk">
        <SegmentedControl accessibilityLabel="Maximum estimated walk" options={minutes([5, 10, 15, 20, 30, 45, 60])}
          value={query.maxWalkMinutes} onChange={(maxWalkMinutes) => onChange({ ...query, maxWalkMinutes })} />
      </FilterSection>
      <FilterSection title="Atmosphere preference" helper="Atmosphere and vibe influence ranking; they do not exclude places or promise available seats.">
        <LevelPicker accessibilityLabel="Target noise" steps={ATMOSPHERE_OPTIONS} value={query.targetNoise}
          onChange={(targetNoise) => onChange({ ...query, targetNoise })} />
        <Text style={styles.body}>Crowd preference follows the selected intent preset.</Text>
      </FilterSection>
      <FilterSection title="Vibe preferences">
        <ChipGroup accessibilityLabel="Vibe preferences" options={VIBE_OPTIONS.map((value) => ({ value, label: value.replaceAll('_', ' ') }))}
          selected={VIBE_OPTIONS.filter((tag) => (query.tagWeights[tag] ?? 0) > 0)} onToggle={(tag) => {
            const tagWeights = { ...query.tagWeights };
            if ((tagWeights[tag] ?? 0) > 0) delete tagWeights[tag]; else tagWeights[tag] = 1;
            onChange({ ...query, tagWeights });
          }} />
      </FilterSection>
      <FilterSection title="Group size" helper="Group suitability is a ranking preference, not a seating guarantee.">
        <SegmentedControl accessibilityLabel="Group size" options={[1, 2, 3, 4, 5, 6, 7, 8].map((value) => ({ value, label: value === 1 ? '1 person · Solo' : `${value} people` }))}
          value={query.groupSize} onChange={(groupSize) => onChange({ ...query, groupSize })} />
      </FilterSection>
      <FilterSection title="Session duration" helper={`Selected: ${query.sessionMinutes} minutes after estimated arrival.`}>
        <SegmentedControl accessibilityLabel="Session duration" options={minutes([15, 30, 45, 60, 90, 120, 180, 240])}
          value={query.sessionMinutes} onChange={(sessionMinutes) => onChange({ ...query, sessionMinutes })} />
        <Chip label="Open for my session" selected={query.requireOpenForSession}
          onPress={() => onChange({ ...query, requireOpenForSession: !query.requireOpenForSession })} />
        <Text style={styles.body}>When required, verified hours must cover arrival through session end. Unknown or stale hours are excluded.</Text>
      </FilterSection>
      {(['wifi', 'outlets'] as const).map((amenity) => <FilterSection key={amenity} title={amenity === 'wifi' ? 'Wi-Fi' : 'Outlets'}
        helper="Prefer affects ranking. Require excludes unknown, negative or insufficient evidence.">
        <SegmentedControl accessibilityLabel={`${amenity} preference`} options={(['ignore', 'prefer', 'require'] as const).map((value) => ({ value, label: value === 'require' ? 'Require · strict' : value === 'prefer' ? 'Prefer' : 'Ignore' }))}
          value={query.amenities[amenity]} onChange={(value) => onChange({ ...query, amenities: { ...query.amenities, [amenity]: value } })} />
      </FilterSection>)}
      <FilterSection title="Access" helper="Public only requires positive public-access evidence; unknown access is excluded.">
        <SegmentedControl accessibilityLabel="Access" options={[{ value: 'any', label: 'Any access' }, { value: 'public_only', label: 'Public only · strict' }] as const}
          value={query.access} onChange={(access) => onChange({ ...query, access })} />
      </FilterSection>
      <Text style={styles.body}>Reset restores Study, 1 person, 60 minutes, open-session off, Wi-Fi/outlets preferred, any access, any category, no price cap, 15-minute walk and quiet study vibes. Reset takes effect on Apply.</Text>
    </SheetContainer>
  </View>;
}

const styles = StyleSheet.create({
  preview: { flex: 1, minHeight: theme.spacing.none, backgroundColor: theme.colors.background },
  body: { color: theme.colors.secondaryText, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.body, lineHeight: theme.typography.lineHeight.body },
});
