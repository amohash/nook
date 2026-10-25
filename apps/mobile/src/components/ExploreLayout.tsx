import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { datasetLabel } from './content';
import type { DatasetLabelProps } from './EvidenceLabel';
import { FilterChipRow, type FilterChipRowProps } from './FilterChipRow';
import { MapListToggle, type MapListToggleProps } from './MapListToggle';
import { SearchBar, type SearchBarProps } from './SearchBar';

export type ExploreLayoutProps = {
  map: ReactNode;
  /** D supplies a FlatList/ScrollView, including its loading/error/empty state. */
  children: ReactNode;
  search: SearchBarProps;
  filters: FilterChipRowProps;
  mode: MapListToggleProps['value'];
  onModeChange: MapListToggleProps['onChange'];
  title: string;
  subtitle: string;
  dataset: DatasetLabelProps;
  /** Optional existing origin/time/status controls, still owned by D. */
  topAccessory?: ReactNode;
};

/** Visual slots only. No map implementation, queries, sheet gestures or navigation. */
export function ExploreLayout({ map, children, search, filters, mode, onModeChange,
  title, subtitle, dataset, topAccessory }: ExploreLayoutProps) {
  const insets = useSafeAreaInsets();
  const [height, setHeight] = useState(0);
  const [controlsHeight, setControlsHeight] = useState(0);
  const available = Math.max(0, height - controlsHeight);
  const sheetHeight = mode === 'list' ? available : Math.min(available, height * theme.layout.exploreSheetRatio);
  return <View style={styles.page} onLayout={(event) => setHeight(event.nativeEvent.layout.height)}>
    <View style={StyleSheet.absoluteFill} pointerEvents={mode === 'list' ? 'none' : 'auto'}
      aria-hidden={mode === 'list'}
      accessibilityElementsHidden={mode === 'list'} importantForAccessibility={mode === 'list' ? 'no-hide-descendants' : 'auto'}>
      {map}
    </View>
    <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled"
      onLayout={(event) => setControlsHeight(event.nativeEvent.layout.height)}
      style={{ flexGrow: 0, maxHeight: height > 0 ? height * theme.layout.exploreControlsRatio : undefined }}
      contentContainerStyle={[styles.controls, { paddingTop: insets.top + theme.spacing.xs,
        paddingLeft: insets.left + theme.spacing.lg, paddingRight: insets.right + theme.spacing.lg }]}>
      <SearchBar {...search} />
      <View style={styles.intents}><FilterChipRow {...filters} /></View>
      {topAccessory}
      <View style={styles.toggleRow}><View style={styles.toggle}>
        <MapListToggle value={mode} onChange={onModeChange} />
      </View></View>
    </ScrollView>
    <View style={[styles.sheet, { height: sheetHeight, paddingBottom: insets.bottom,
      paddingLeft: insets.left, paddingRight: insets.right }]}>
      <ScrollView nestedScrollEnabled style={{ flexGrow: 0, maxHeight: sheetHeight * theme.layout.exploreHeaderRatio }}
        contentContainerStyle={styles.header}>
        <View accessible={false} style={styles.handle} />
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <Text style={styles.caption}>{datasetLabel(dataset.mode)}{dataset.description ? ` · ${dataset.description}` : ''}
          {dataset.fetchedAt ? ` · Dataset fetched: ${dataset.fetchedAt}` : ''}</Text>
      </ScrollView>
      <View style={styles.list}>{children}</View>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.colors.background },
  controls: { gap: theme.spacing.xs, paddingBottom: theme.spacing.xs },
  intents: { backgroundColor: theme.colors.background, borderRadius: theme.radii.field, padding: theme.spacing.xxs },
  toggleRow: { alignItems: 'flex-end' },
  toggle: { backgroundColor: theme.colors.background, borderRadius: theme.radii.pill, padding: theme.spacing.xxs },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radii.sheet, borderTopRightRadius: theme.radii.sheet,
    borderWidth: theme.borders.thin, borderColor: theme.colors.chipBorder, overflow: 'hidden' },
  header: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md, gap: theme.spacing.xxs },
  handle: { alignSelf: 'center', width: theme.sizes.tapTarget, height: theme.spacing.xxs,
    marginVertical: theme.spacing.xs, backgroundColor: theme.colors.chipBorder, borderRadius: theme.radii.pill },
  title: { color: theme.colors.text, fontFamily: theme.typography.headingFamily,
    fontSize: theme.typography.size.title, lineHeight: theme.typography.lineHeight.title, fontWeight: theme.typography.weight.bold },
  subtitle: { color: theme.colors.textMuted, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.body, lineHeight: theme.typography.lineHeight.body },
  caption: { color: theme.colors.secondaryText, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.caption, lineHeight: theme.typography.lineHeight.caption },
  list: { flex: 1, minHeight: 0 },
});
