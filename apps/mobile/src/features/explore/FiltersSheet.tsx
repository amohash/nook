import { theme } from '../../theme';
import { useEffect } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SheetContainer } from '../../components';
import type { Query } from '@space/contracts';
import { activeFilterCount, applyIntentPreset, ATMOSPHERE_OPTIONS, CATEGORY_OPTIONS,
  priceLabel, resetExploreFilters, VIBE_OPTIONS } from './filters';

function Choice({ label, selected, onPress, multiple = false }: {
  label: string; selected: boolean; onPress: () => void; multiple?: boolean;
}) {
  return <Pressable accessibilityRole={multiple ? 'checkbox' : 'radio'} accessibilityState={{ checked: selected }} aria-checked={selected}
    onPress={onPress} style={[s.chip, selected && s.selected]}>
    <Text style={s.chipText}>{label}</Text>
  </Pressable>;
}

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
        <SheetContainer title="Filters" onCancel={onClose} onReset={() => onChange(resetExploreFilters(query))} onApply={onApply}>
          <Text style={s.body}>{activeFilterCount(query)} active filters · changed groups from Study defaults. Changes take effect on Apply.</Text>
          <Text style={s.heading}>Intent presets</Text>
          <Text style={s.body}>Study is solo; Meet Friends uses a group of four. Presets keep your category, price and walk limits.</Text>
          <View accessibilityRole="radiogroup" accessibilityLabel="Intent presets" style={s.row}>
            <Choice label="Study" selected={query.intent === 'study'} onPress={() => onChange(applyIntentPreset(query, 'study'))} />
            <Choice label="Meet Friends" selected={query.intent === 'friends'} onPress={() => onChange(applyIntentPreset(query, 'friends'))} />
          </View>
          <Text style={s.heading}>Place category</Text>
          <Text style={s.body}>Select any combination. No selection means any category.</Text>
          <View style={s.row}>
            {CATEGORY_OPTIONS.map(({ value, label }) => <Choice key={value} label={label} multiple
              selected={query.categories.includes(value)} onPress={() => onChange({ ...query,
                categories: query.categories.includes(value) ? query.categories.filter((category) => category !== value) : [...query.categories, value],
              })} />)}
          </View>
          <Text style={s.heading}>Maximum price</Text>
          <Text style={s.body}>A strict cap excludes unknown prices. Dollar signs are price levels, not exact amounts.</Text>
          <View accessibilityRole="radiogroup" accessibilityLabel="Maximum price" style={s.row}>
            {([null, 0, 1, 2, 3, 4] as const).map((value) => <Choice key={String(value)} label={priceLabel(value)}
              selected={query.maxPriceLevel === value} onPress={() => onChange({ ...query, maxPriceLevel: value })} />)}
          </View>
          <Text style={s.heading}>Maximum estimated walk</Text>
          <View accessibilityRole="radiogroup" accessibilityLabel="Maximum estimated walk" style={s.row}>
            {[5, 10, 15, 20, 30, 45, 60].map((value) => <Choice key={value} label={`${value} min`}
              selected={query.maxWalkMinutes === value} onPress={() => onChange({ ...query, maxWalkMinutes: value })} />)}
          </View>
          <Text style={s.heading}>Atmosphere preference</Text>
          <Text style={s.body}>Atmosphere and vibe influence ranking; they do not exclude places or promise available seats.</Text>
          <View accessibilityRole="radiogroup" accessibilityLabel="Atmosphere preference" style={s.row}>
            {ATMOSPHERE_OPTIONS.map(({ value, label }) => <Choice key={value} label={label}
              selected={query.targetNoise === value} onPress={() => onChange({ ...query, targetNoise: value })} />)}
          </View>
          <Text style={s.heading}>Vibe preferences</Text>
          <View style={s.row}>
            {VIBE_OPTIONS.map((tag) => <Choice key={tag} label={tag.replaceAll('_', ' ')} multiple
              selected={(query.tagWeights[tag] ?? 0) > 0} onPress={() => {
                const tagWeights = { ...query.tagWeights };
                if ((tagWeights[tag] ?? 0) > 0) delete tagWeights[tag]; else tagWeights[tag] = 1;
                onChange({ ...query, tagWeights });
              }} />)}
          </View>
        </SheetContainer>
      </View>
    </View>
  </Modal>;
}

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
