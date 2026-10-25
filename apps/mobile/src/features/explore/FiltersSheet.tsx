import { theme } from '../../theme';
import { useEffect } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SheetContainer, Chip, ChipGroup, FilterSection, LevelPicker, SegmentedControl } from '../../components';
import type { Query } from '@space/contracts';
import { activeFilterCount, applyIntentPreset, ATMOSPHERE_OPTIONS, CATEGORY_OPTIONS,
  priceLabel, resetExploreFilters, VIBE_OPTIONS } from './filters';

export function FiltersSheet({ query, onChange, onApply, onClose }: {
  query: Query; onChange: (query: Query) => void; onApply: () => void; onClose: () => void;
}) {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const dismiss = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', dismiss);
    return () => window.removeEventListener('keydown', dismiss);
  }, [onClose]);
  return <Modal transparent animationType="slide" visible onRequestClose={onClose}>
    <View style={s.overlay}>
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss filters" onPress={onClose} style={StyleSheet.absoluteFill} />
      <View accessibilityViewIsModal onAccessibilityEscape={onClose} role="dialog" aria-modal aria-label="Filters"
        style={s.sheet}>
        <SheetContainer title={`Filters (${activeFilterCount(query)})`} onCancel={onClose} onReset={() => onChange(resetExploreFilters(query))} onApply={onApply}>
          <Text style={s.body}>{activeFilterCount(query)} active filters · changed groups from Study defaults. Changes take effect on Apply.</Text>
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
        <Text style={s.body}>Crowd preference follows the selected intent preset.</Text>
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
        <Text style={s.body}>When required, verified hours must cover arrival through session end. Unknown or stale hours are excluded.</Text>
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
      <Text style={s.body}>Reset restores Study, 1 person, 60 minutes, open-session off, Wi-Fi/outlets preferred, any access, any category, no price cap, 15-minute walk and quiet study vibes. Reset takes effect on Apply.</Text>
        </SheetContainer>
      </View>
    </View>
  </Modal>;
}

const minutes = (values: number[]) => values.map((value) => ({value, label: `${value} min`}));

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { height: '90%', width: '100%', maxWidth: 680, alignSelf: 'center', backgroundColor: theme.colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, gap: 12 },
  title: { color: theme.colors.text, fontSize: 26, fontWeight: '700' },
  content: { paddingHorizontal: 20, paddingBottom: 24, gap: 12 },
  heading: { color: theme.colors.text, fontSize: 19, fontWeight: '600', marginTop: 12 },
  body: { color: theme.colors.textMuted, fontSize: 14, lineHeight: 21 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 16, borderWidth: 1, borderColor: theme.colors.chipBorder, borderRadius: 24 },
  selected: { backgroundColor: theme.colors.chipSelectedBackground, borderColor: theme.colors.chipSelectedText },
  chipText: { color: theme.colors.text, fontSize: 15, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, gap: 12, borderTopWidth: 1, borderColor: theme.colors.chipBorder },
});
