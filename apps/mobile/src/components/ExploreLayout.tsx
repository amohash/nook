import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Image, PanResponder, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme';
import wordmark from '../../assets/nook-wordmark.png';
import { datasetCaption, filtersChipLabel } from './content';
import type { DatasetLabelProps } from './EvidenceLabel';
import type { FilterChipRowProps } from './FilterChipRow';
import type { MapListToggleProps } from './MapListToggle';
import type { SearchBarProps } from './SearchBar';
import { MapLegend } from './MapPin';
import { rubberBand, sheetDestination, sheetHeights, type ExploreSheetPosition } from './exploreSheet';

const BODY_FADE_DISTANCE = 90;
const BUTTON_FADE_DISTANCE = 48;
const BUTTON_GAP = 12;

export type ExploreLayoutProps = {
  /** Fill the screen with D's map. The parent must not inset this layout at the top. */
  mapSlot?: ReactNode;
  /** Legacy alias; retained for existing routes until D adopts mapSlot. */
  map?: ReactNode;
  /** D supplies a bounded FlatList/ScrollView, including loading/error/empty states. */
  children: ReactNode;
  search: SearchBarProps;
  activeTab?: 'places' | 'muse';
  onTabChange?: (tab: 'places' | 'muse') => void;
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
  /** Space the map should keep clear: the controls above it and the peeking sheet below it. */
  onMapInsetsChange?: (insets: {top: number; bottom: number}) => void;
  /** Legacy props remain source-compatible; there is no Map/List toggle or timestamp line. */
  mode?: MapListToggleProps['value'];
  onModeChange?: MapListToggleProps['onChange'];
  subtitle?: string;
  /** Existing controls remain reachable inside the expanded sheet during D's migration. */
  topAccessory?: ReactNode;
};

/** Presentation/gestures only: D owns map rendering, results, controls and navigation. */
export function ExploreLayout({ mapSlot, map, children, search, filters, title, dataset,
  activeTab = 'places', onTabChange, timeLabel = 'Now', onTimePress, originLabel = 'UT Austin', onOriginPress, avatar, onAvatarPress,
  onRecenter, sheetPosition, onSheetPositionChange, onMapInsetsChange, mode, subtitle, topAccessory }: ExploreLayoutProps) {
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const [height, setHeight] = useState(window.height);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [localPosition, setLocalPosition] = useState<ExploreSheetPosition>(mode === 'list' ? 'expanded' : 'peek');
  const position = sheetPosition ?? localPosition;
  const [legendOpen, setLegendOpen] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [overlayHeight, setOverlayHeight] = useState(0);
  // The sheet is one fixed-size layer; translateY slides it, so the drag never triggers layout.
  const sizes = useMemo(() => sheetHeights(height, headerHeight, 0, overlayHeight > 0 ? overlayHeight : undefined),
    [height, headerHeight, overlayHeight]);
  const hiddenAt = useCallback((next: ExploreSheetPosition) => sizes.expanded - sizes[next], [sizes]);
  const peekY = hiddenAt('peek');
  const sheetY = useRef(new Animated.Value(hiddenAt(position))).current;
  const currentY = useRef(hiddenAt(position));
  const dragStart = useRef(hiddenAt(position));
  const isMeasured = useRef(false);
  useEffect(() => {
    const listener = sheetY.addListener(({value}) => {currentY.current = value;});
    return () => sheetY.removeListener(listener);
  }, [sheetY]);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {if (active) setReduceMotion(enabled);});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {active = false; subscription.remove();};
  }, []);
  const animateTo = useCallback((next: ExploreSheetPosition, velocity = 0) => {
    sheetY.stopAnimation();
    if (reduceMotion) sheetY.setValue(hiddenAt(next));
    else Animated.spring(sheetY, {toValue: hiddenAt(next), velocity, useNativeDriver: true,
      stiffness: 260, damping: 30, mass: 1, overshootClamping: true}).start();
  }, [sheetY, hiddenAt, reduceMotion]);
  useEffect(() => {
    const isReady = headerHeight > 0 && overlayHeight > 0;
    // Layout measurements arrive after mount: snap to them silently, then animate real changes.
    if (isReady && isMeasured.current) animateTo(position);
    else {sheetY.stopAnimation(); sheetY.setValue(hiddenAt(position)); isMeasured.current = isReady;}
    return () => sheetY.stopAnimation();
  }, [animateTo, hiddenAt, headerHeight, overlayHeight, position, sheetY]);
  useEffect(() => {
    if (headerHeight > 0 && overlayHeight > 0) onMapInsetsChange?.({top: overlayHeight, bottom: sizes.peek});
  }, [headerHeight, overlayHeight, onMapInsetsChange, sizes.peek]);
  const settle = useCallback((next: ExploreSheetPosition, velocity = 0) => {
    if (sheetPosition === undefined) setLocalPosition(next);
    if (next !== position) onSheetPositionChange?.(next);
    // Controlled parents may decline a change; their prop stays authoritative.
    animateTo(next, velocity);
  }, [animateTo, onSheetPositionChange, position, sheetPosition]);
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 4 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderGrant: () => {sheetY.stopAnimation(); dragStart.current = currentY.current;},
    onPanResponderMove: (_, gesture) => sheetY.setValue(rubberBand(dragStart.current + gesture.dy, 0, peekY)),
    onPanResponderRelease: (_, gesture) => settle(sheetDestination(sizes.expanded - currentY.current, gesture.vy, sizes), gesture.vy),
    onPanResponderTerminate: () => animateTo(position),
  }), [animateTo, peekY, position, settle, sheetY, sizes]);
  const fadeStart = Math.max(0, peekY - BODY_FADE_DISTANCE);
  const bodyOpacity = sheetY.interpolate({inputRange: [fadeStart, Math.max(peekY, fadeStart + 1)], outputRange: [1, 0], extrapolate: 'clamp'});
  const buttonsY = Animated.add(sheetY, -(sizes.expanded + BUTTON_GAP));
  const buttonsOpacity = sheetY.interpolate({inputRange: [0, BUTTON_FADE_DISTANCE], outputRange: [0, 1], extrapolate: 'clamp'});
  const count = Number.isFinite(filters.filterCount) ? Math.max(0, Math.floor(filters.filterCount)) : 0;
  const filtersChip = filtersChipLabel(count);
  return <View style={styles.page} onLayout={(event) => setHeight(event.nativeEvent.layout.height)}>
    <View testID="explore-map-slot" style={StyleSheet.absoluteFill}>{mapSlot ?? map}</View>
    <View pointerEvents="box-none" style={[styles.overlay, {paddingTop: insets.top + 8}]}
      onLayout={(event) => setOverlayHeight(Math.ceil(event.nativeEvent.layout.height))}>
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
      {onTabChange && <View accessibilityRole="tablist" accessibilityLabel="Explore views" style={styles.tabs}>
        {(['places', 'muse'] as const).map((tab) => <Pressable key={tab} accessibilityRole="tab"
          accessibilityLabel={tab === 'places' ? 'Places' : 'Muse'} accessibilityState={{selected: activeTab === tab}}
          onPress={() => onTabChange(tab)} style={[styles.tab, activeTab === tab && styles.selectedChip]}>
          <Text style={[styles.chipText, activeTab === tab && styles.selectedText]}>{tab === 'places' ? 'Places' : '✦ Muse'}</Text>
        </Pressable>)}
      </View>}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled"
        style={styles.chipScroll} contentContainerStyle={[styles.chips, {paddingLeft: insets.left + 16, paddingRight: insets.right + 16}]}>
        <View accessibilityRole="radiogroup" accessibilityLabel="Intent" style={styles.intentRow}>
          {filters.options.map(({id, label}) => <Pressable key={id} accessibilityRole="radio" accessibilityLabel={label}
            accessibilityState={{checked: filters.selectedId === id}} aria-checked={filters.selectedId === id}
            onPress={() => filters.onSelect(id)} style={[styles.chip, filters.selectedId === id && styles.selectedChip]}>
            <Text style={[styles.chipText, filters.selectedId === id && styles.selectedText]}>{label}</Text>
          </Pressable>)}
        </View>
        <FloatingChip label={filtersChip.label} accessibilityLabel={filtersChip.accessibilityLabel} onPress={filters.onOpenFilters} />
      </ScrollView>
    </View>
    {/* Map buttons ride on the sheet's top edge, so they are never covered and fade out when it is fully open. */}
    <Animated.View pointerEvents={position === 'expanded' ? 'none' : 'box-none'}
      style={[styles.mapButtons, {right: insets.right + 16, opacity: buttonsOpacity, transform: [{translateY: buttonsY}]}]}>
      {legendOpen && <View style={[styles.legend, styles.shadow]}><MapLegend /></View>}
      <Pressable accessibilityRole="button" accessibilityLabel={legendOpen ? 'Hide map legend' : 'Show map legend'}
        accessibilityState={{expanded: legendOpen}} onPress={() => setLegendOpen((value) => !value)}
        style={[styles.roundButton, styles.shadow]}><Text style={styles.legendIcon}>ⓘ</Text></Pressable>
      {onRecenter && <Pressable accessibilityRole="button" accessibilityLabel="Recenter map" onPress={onRecenter}
        style={[styles.roundButton, styles.shadow]}><Text style={styles.iconText}>⌖</Text></Pressable>}
    </Animated.View>
    <Animated.View testID="explore-bottom-sheet" style={[styles.sheet, styles.shadow, {height: sizes.expanded,
      paddingLeft: insets.left, paddingRight: insets.right, transform: [{translateY: sheetY}]}]}>
      <View {...pan.panHandlers} onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}>
        <View>
          <View accessible accessibilityRole="adjustable" accessibilityLabel="Places sheet"
            accessibilityHint="Drag up to see places. Drag down to return to the map." accessibilityState={{expanded: position === 'expanded'}}
            accessibilityActions={[{name: 'expand', label: 'Expand places'}, {name: 'collapse', label: 'Collapse places'}]}
            onAccessibilityAction={(event) => settle(event.nativeEvent.actionName === 'expand' ? 'expanded' : 'peek')}
            style={styles.handleTarget}>
            <View accessible={false} style={styles.handle} />
          </View>
        </View>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>{title || 'Places for you'}</Text>
          {!!subtitle && <Text numberOfLines={1} style={styles.answer}>{subtitle}</Text>}
          <View style={styles.contextRow}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Time: ${timeLabel}`} disabled={!onTimePress}
              onPress={onTimePress} hitSlop={{top: 8, bottom: 8, left: 4, right: 4}} style={styles.contextButton}>
              <Text style={styles.contextText}>{timeLabel} ▾</Text>
            </Pressable>
            <Text accessible={false} style={styles.caption}>·</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`Origin: ${originLabel}`} disabled={!onOriginPress}
              onPress={onOriginPress} hitSlop={{top: 8, bottom: 8, left: 4, right: 4}} style={styles.contextButton}>
              <Text style={styles.contextText} numberOfLines={1}>{originLabel} ▾</Text>
            </Pressable>
          </View>
          <Text style={styles.caption}>{datasetCaption(dataset.mode, dataset.description)}</Text>
        </View>
      </View>
      <Animated.View style={[styles.body, {opacity: bodyOpacity}]} pointerEvents={position === 'peek' ? 'none' : 'auto'} aria-hidden={position === 'peek'}
        accessibilityElementsHidden={position === 'peek'} importantForAccessibility={position === 'peek' ? 'no-hide-descendants' : 'auto'}>
        {topAccessory && <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={styles.accessories}
          contentContainerStyle={styles.accessoryContent}>{topAccessory}</ScrollView>}
        <View style={styles.cards}>{children}</View>
      </Animated.View>
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
  tabs: {flexDirection: 'row', marginHorizontal: 16, marginTop: 8, alignSelf: 'flex-start', borderRadius: 24, padding: 3, backgroundColor: theme.colors.background, gap: 4,
    shadowColor: '#403620', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3},
  tab: {minHeight: 44, paddingHorizontal: 22, justifyContent: 'center', borderRadius: 22},
  chipScroll: {flexGrow: 0, marginTop: 8},
  chips: {gap: 8, alignItems: 'center', paddingBottom: 8},
  intentRow: {flexDirection: 'row', gap: 8},
  chip: {minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.chipBorder, borderRadius: 999},
  selectedChip: {backgroundColor: theme.colors.chipSelectedBackground, borderColor: theme.colors.chipSelectedBorder},
  chipText: {color: theme.colors.text, fontSize: 14, lineHeight: 20, fontFamily: theme.typography.bodyFamily},
  selectedText: {color: theme.colors.sageText, fontWeight: '600'},
  mapButtons: {position: 'absolute', bottom: 0, alignItems: 'flex-end', gap: 8},
  roundButton: {width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center'},
  legendIcon: {fontSize: 22, color: theme.colors.text},
  legend: {width: 240, maxWidth: '100%', borderRadius: 16, padding: 14, backgroundColor: theme.colors.background},
  sheet: {position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: theme.colors.background,
    borderTopLeftRadius: 24, borderTopRightRadius: 24},
  handleTarget: {minHeight: 44, alignItems: 'center', justifyContent: 'center'},
  handle: {width: 40, height: 5, borderRadius: 3, backgroundColor: theme.colors.grey},
  answer: {color: theme.colors.text, fontSize: 15, lineHeight: 22, fontWeight: '600', fontFamily: theme.typography.bodyFamily},
  contextRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  contextButton: {minHeight: 32, justifyContent: 'center', flexShrink: 1},
  contextText: {color: theme.colors.sageText, fontSize: 14, lineHeight: 20, fontWeight: '600', fontFamily: theme.typography.bodyFamily},
  header: {paddingHorizontal: 20, paddingBottom: 12, gap: 4},
  title: {fontSize: 24, lineHeight: 30, fontFamily: theme.typography.headingFamily, fontWeight: '700', color: theme.colors.text},
  caption: {fontSize: 12, lineHeight: 18, color: theme.colors.secondaryText, fontFamily: theme.typography.bodyFamily},
  body: {flex: 1, minHeight: 0, overflow: 'hidden'},
  accessories: {flexGrow: 0, maxHeight: '45%'},
  accessoryContent: {paddingHorizontal: 20, paddingBottom: 12, gap: 8},
  cards: {flex: 1, minHeight: 0},
});
