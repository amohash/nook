import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Image, PanResponder, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme';
import wordmark from '../../assets/nook-wordmark.png';
import { datasetLabel } from './content';
import type { DatasetLabelProps } from './EvidenceLabel';
import type { FilterChipRowProps } from './FilterChipRow';
import type { MapListToggleProps } from './MapListToggle';
import type { SearchBarProps } from './SearchBar';
import { MapLegend } from './MapPin';
import { sheetDestination, sheetHeights, type ExploreSheetPosition } from './exploreSheet';

export type ExploreLayoutProps = {
  /** Fill the screen with D's map. The parent must not inset this layout at the top. */
  mapSlot?: ReactNode;
  /** Legacy alias; retained for existing routes until D adopts mapSlot. */
  map?: ReactNode;
  /** D supplies a bounded FlatList/ScrollView, including loading/error/empty states. */
  children: ReactNode;
  search: SearchBarProps;
  filters: FilterChipRowProps;
  title: string;
  dataset: DatasetLabelProps;
  timeLabel?: string;
  onTimePress?: () => void;
  originLabel?: string;
  onOriginPress?: () => void;
  avatar?: ReactNode;
  onAvatarPress?: () => void;
  onRecenter?: () => void;
  sheetPosition?: ExploreSheetPosition;
  onSheetPositionChange?: (position: ExploreSheetPosition) => void;
  /** Legacy props remain source-compatible; there is no Map/List toggle or timestamp line. */
  mode?: MapListToggleProps['value'];
  onModeChange?: MapListToggleProps['onChange'];
  subtitle?: string;
  /** Existing controls remain reachable inside the expanded sheet during D's migration. */
  topAccessory?: ReactNode;
};

/** Presentation/gestures only: D owns map rendering, results, controls and navigation. */
export function ExploreLayout({ mapSlot, map, children, search, filters, title, dataset,
  timeLabel = 'Now', onTimePress, originLabel = 'UT Austin', onOriginPress, avatar, onAvatarPress,
  onRecenter, sheetPosition, onSheetPositionChange, mode, topAccessory }: ExploreLayoutProps) {
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const [height, setHeight] = useState(window.height);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [localPosition, setLocalPosition] = useState<ExploreSheetPosition>(mode === 'list' ? 'expanded' : 'peek');
  const position = sheetPosition ?? localPosition;
  const [legendOpen, setLegendOpen] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const sizes = useMemo(() => sheetHeights(height, headerHeight, insets.bottom), [height, headerHeight, insets.bottom]);
  const sheetHeight = useRef(new Animated.Value(sizes[position])).current;
  const currentHeight = useRef(sizes[position]);
  const dragStart = useRef(sizes[position]);
  useEffect(() => {
    const listener = sheetHeight.addListener(({value}) => {currentHeight.current = value;});
    return () => sheetHeight.removeListener(listener);
  }, [sheetHeight]);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {if (active) setReduceMotion(enabled);});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {active = false; subscription.remove();};
  }, []);
  const animateTo = useCallback((next: ExploreSheetPosition) => {
    sheetHeight.stopAnimation();
    if (reduceMotion) sheetHeight.setValue(sizes[next]);
    else Animated.spring(sheetHeight, {toValue: sizes[next], useNativeDriver: false,
      tension: 100, friction: 22, overshootClamping: true}).start();
  }, [sheetHeight, sizes, reduceMotion]);
  useEffect(() => {animateTo(position); return () => sheetHeight.stopAnimation();}, [animateTo, position, sheetHeight]);
  const settle = useCallback((next: ExploreSheetPosition) => {
    if (sheetPosition === undefined) setLocalPosition(next);
    if (next !== position) onSheetPositionChange?.(next);
    // Controlled parents may decline a change; their prop stays authoritative.
    animateTo(sheetPosition === undefined ? next : sheetPosition);
  }, [animateTo, onSheetPositionChange, position, sheetPosition]);
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderGrant: () => {sheetHeight.stopAnimation(); dragStart.current = currentHeight.current;},
    onPanResponderMove: (_, gesture) => sheetHeight.setValue(Math.max(sizes.peek, Math.min(sizes.expanded, dragStart.current - gesture.dy))),
    onPanResponderRelease: (_, gesture) => settle(sheetDestination(currentHeight.current, gesture.vy, sizes)),
    onPanResponderTerminate: () => animateTo(position),
  }), [animateTo, position, settle, sheetHeight, sizes]);
  const count = Number.isFinite(filters.filterCount) ? Math.max(0, Math.floor(filters.filterCount)) : 0;
  const toggleSheet = () => settle(position === 'peek' ? 'expanded' : 'peek');
  return <View style={styles.page} onLayout={(event) => setHeight(event.nativeEvent.layout.height)}>
    <View testID="explore-map-slot" style={StyleSheet.absoluteFill}>{mapSlot ?? map}</View>
    <View pointerEvents="box-none" style={[styles.overlay, {paddingTop: insets.top + 8}]}>
      <View style={[styles.searchPill, styles.shadow, {marginLeft: insets.left + 16, marginRight: insets.right + 16}]}>
        <Image source={wordmark} accessibilityLabel="Nook" resizeMode="contain" style={styles.mark} />
        <TextInput value={search.value} onChangeText={search.onChangeText}
          onSubmitEditing={() => search.onSubmit?.(search.value)} returnKeyType="search"
          accessibilityLabel={search.accessibilityLabel ?? 'Search study spots'}
          placeholder={search.placeholder ?? 'Search study spots'} placeholderTextColor={theme.colors.textMuted}
          style={styles.searchInput} />
        {!!search.value && <Pressable accessibilityRole="button" accessibilityLabel="Clear search"
          onPress={() => search.onChangeText('')} style={styles.iconButton}><Text style={styles.iconText}>×</Text></Pressable>}
        {onAvatarPress ? <Pressable accessibilityRole="button" accessibilityLabel="Open Profile" onPress={onAvatarPress} style={styles.iconButton}>
          {avatar ?? <View accessible={false} style={styles.avatar}><View style={styles.avatarHead} /><View style={styles.avatarBody} /></View>}
        </Pressable> : avatar ? <View style={styles.iconButton}>{avatar}</View> : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled"
        style={styles.chipScroll} contentContainerStyle={[styles.chips, {paddingLeft: insets.left + 16, paddingRight: insets.right + 16}]}>
        <View accessibilityRole="radiogroup" accessibilityLabel="Intent" style={styles.intentRow}>
          {filters.options.map(({id, label}) => <Pressable key={id} accessibilityRole="radio" accessibilityLabel={label}
            accessibilityState={{checked: filters.selectedId === id}} aria-checked={filters.selectedId === id}
            onPress={() => filters.onSelect(id)} style={[styles.chip, filters.selectedId === id && styles.selectedChip]}>
            <Text style={[styles.chipText, filters.selectedId === id && styles.selectedText]}>{label}</Text>
          </Pressable>)}
        </View>
        <FloatingChip label={`Filters (${count})`} onPress={filters.onOpenFilters} />
        <FloatingChip label={timeLabel} accessibilityLabel={`Time: ${timeLabel}`} onPress={onTimePress} />
        <FloatingChip label={originLabel} accessibilityLabel={`Origin: ${originLabel}`} onPress={onOriginPress} />
      </ScrollView>
      <View pointerEvents="box-none" style={[styles.legendArea, {marginRight: insets.right + 16, marginLeft: insets.left + 16}]}>
        <Pressable accessibilityRole="button" accessibilityLabel={legendOpen ? 'Hide map legend' : 'Show map legend'}
          accessibilityState={{expanded: legendOpen}} onPress={() => setLegendOpen((value) => !value)}
          style={[styles.roundButton, styles.shadow]}><Text style={styles.legendIcon}>ⓘ</Text></Pressable>
        {legendOpen && <View style={[styles.legend, styles.shadow]}><MapLegend /></View>}
      </View>
    </View>
    {onRecenter && <Animated.View pointerEvents="box-none" style={[styles.recenter, {right: insets.right + 16, bottom: Animated.add(sheetHeight, 12)}]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Recenter map" onPress={onRecenter}
        style={[styles.roundButton, styles.shadow]}><Text style={styles.iconText}>⌖</Text></Pressable>
    </Animated.View>}
    <Animated.View testID="explore-bottom-sheet" style={[styles.sheet, styles.shadow, {height: sheetHeight,
      paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right}]}>
      <View onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}>
        <View {...pan.panHandlers}>
          <Pressable accessibilityRole="button" accessibilityLabel={position === 'peek' ? 'Expand places' : 'Collapse places'}
            accessibilityHint="Tap or drag vertically to change the sheet height." accessibilityState={{expanded: position === 'expanded'}}
            accessibilityActions={[{name: 'expand', label: 'Expand places'}, {name: 'collapse', label: 'Collapse places'}]}
            onAccessibilityAction={(event) => settle(event.nativeEvent.actionName === 'expand' ? 'expanded' : 'peek')}
            onPress={toggleSheet} style={styles.handleTarget}>
            <View accessible={false} style={styles.handle} />
          </Pressable>
        </View>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>{title || 'Places for you'}</Text>
          <Text style={styles.caption}>{datasetLabel(dataset.mode)}{dataset.description ? ` · ${dataset.description}` : ''}</Text>
        </View>
      </View>
      <View style={[styles.body, position === 'peek' && {opacity: 0}]} pointerEvents={position === 'peek' ? 'none' : 'auto'} aria-hidden={position === 'peek'}
        accessibilityElementsHidden={position === 'peek'} importantForAccessibility={position === 'peek' ? 'no-hide-descendants' : 'auto'}>
        {topAccessory && <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={styles.accessories}
          contentContainerStyle={styles.accessoryContent}>{topAccessory}</ScrollView>}
        <View style={styles.cards}>{children}</View>
      </View>
    </Animated.View>
  </View>;
}

function FloatingChip({label, accessibilityLabel, onPress}: {label: string; accessibilityLabel?: string; onPress?: () => void}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label}
    accessibilityState={{disabled: !onPress}} disabled={!onPress} onPress={onPress} style={styles.chip}>
    <Text style={styles.chipText}>{label}</Text>
  </Pressable>;
}
const styles = StyleSheet.create({
  page: {flex: 1, minHeight: 0, backgroundColor: theme.colors.background},
  overlay: {position: 'absolute', top: 0, left: 0, right: 0},
  shadow: {shadowColor: '#403620', shadowOffset: {width: 0, height: 3}, shadowOpacity: 0.14, shadowRadius: 10, elevation: 5},
  searchPill: {flexDirection: 'row', alignItems: 'center', borderRadius: 999, paddingLeft: 16, paddingRight: 6,
    minHeight: 56, backgroundColor: theme.colors.background},
  mark: {width: 42, height: 24, marginRight: 10},
  searchInput: {flex: 1, minWidth: 0, minHeight: 52, paddingVertical: 12, color: theme.colors.text,
    fontSize: 16, fontFamily: theme.typography.bodyFamily},
  iconButton: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center'},
  iconText: {fontSize: 24, color: theme.colors.text},
  avatar: {width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.chipSelectedBackground, alignItems: 'center', justifyContent: 'center'},
  avatarHead: {width: 8, height: 8, borderWidth: 1.5, borderRadius: 5, borderColor: theme.colors.sageText},
  avatarBody: {width: 16, height: 8, marginTop: 2, borderWidth: 1.5, borderTopLeftRadius: 8, borderTopRightRadius: 8, borderColor: theme.colors.sageText},
  chipScroll: {flexGrow: 0, marginTop: 8},
  chips: {gap: 8, alignItems: 'center', paddingBottom: 8},
  intentRow: {flexDirection: 'row', gap: 8},
  chip: {minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.chipBorder, borderRadius: 999},
  selectedChip: {backgroundColor: theme.colors.chipSelectedBackground, borderColor: theme.colors.chipSelectedBorder},
  chipText: {color: theme.colors.text, fontSize: 14, lineHeight: 20, fontFamily: theme.typography.bodyFamily},
  selectedText: {color: theme.colors.sageText, fontWeight: '600'},
  legendArea: {alignItems: 'flex-end', gap: 8},
  roundButton: {width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center'},
  legendIcon: {fontSize: 22, color: theme.colors.text},
  legend: {width: 240, maxWidth: '100%', borderRadius: 16, padding: 14, backgroundColor: theme.colors.background},
  recenter: {position: 'absolute'},
  sheet: {position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: theme.colors.background,
    borderTopLeftRadius: 24, borderTopRightRadius: 24},
  handleTarget: {minHeight: 44, alignItems: 'center', justifyContent: 'center'},
  handle: {width: 36, height: 4, borderRadius: 2, backgroundColor: theme.colors.chipBorder},
  header: {paddingHorizontal: 20, paddingBottom: 12, gap: 4},
  title: {fontSize: 24, lineHeight: 30, fontFamily: theme.typography.headingFamily, fontWeight: '700', color: theme.colors.text},
  caption: {fontSize: 12, lineHeight: 18, color: theme.colors.secondaryText, fontFamily: theme.typography.bodyFamily},
  body: {flex: 1, minHeight: 0, overflow: 'hidden'},
  accessories: {flexGrow: 0, maxHeight: '45%'},
  accessoryContent: {paddingHorizontal: 20, paddingBottom: 12, gap: 8},
  cards: {flex: 1, minHeight: 0},
});
