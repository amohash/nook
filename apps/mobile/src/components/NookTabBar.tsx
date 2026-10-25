import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

export type NookTabBarProps = BottomTabBarProps;
type TabLabel = 'Map' | 'Friends' | 'Bookmarks' | 'Profile';

/** D supplies route names (index/map, friends, saved/bookmarks, profile), or a
 * matching options.title. Other routes and href:null screens stay out of the bar. */
function tabLabel(name: string, title?: string): TabLabel | null {
  const labels: Record<string, TabLabel> = {
    index: 'Map', map: 'Map', friends: 'Friends', saved: 'Bookmarks', bookmarks: 'Bookmarks', profile: 'Profile',
  };
  return labels[title?.toLowerCase() ?? ''] ?? labels[name.toLowerCase()] ?? null;
}

/** Standard Expo Router JS Tabs bar; never creates routes or owns navigation state. */
export function NookTabBar({ state, descriptors, navigation, insets }: NookTabBarProps) {
  return <View accessibilityRole="tablist" style={[styles.bar, { paddingBottom: Math.max(insets.bottom, theme.spacing.xs),
    paddingLeft: insets.left, paddingRight: insets.right }]}>
    {state.routes.map((route, index) => {
      const options = descriptors[route.key]?.options ?? {};
      const label = tabLabel(route.name, options.title);
      if (!label || (options as typeof options & { href?: unknown }).href === null
        || StyleSheet.flatten(options.tabBarItemStyle)?.display === 'none') return null;
      const selected = state.index === index;
      const color = selected ? theme.colors.text : theme.colors.textMuted;
      return <Pressable key={route.key} accessibilityRole="tab"
        accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
        accessibilityState={{ selected }} aria-selected={selected} testID={options.tabBarButtonTestID}
        onPress={() => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!selected && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        }}
        onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
        style={styles.tab}>
        <StrokeIcon label={label} color={color} />
        <Text style={[styles.label, { color, fontWeight: selected
          ? theme.typography.weight.semibold : theme.typography.weight.regular }]}>{label}</Text>
      </Pressable>;
    })}
  </View>;
}

// Code-native 24-unit stroke geometry; decorative children are hidden from AT.
function StrokeIcon({ label, color }: { label: TabLabel; color: string }) {
  const line = (x: number, y: number, endX: number, endY: number, key: string) => {
    const length = Math.hypot(endX - x, endY - y);
    return <View key={key} style={{ position: 'absolute', backgroundColor: color,
      height: theme.borders.icon, width: length, borderRadius: theme.radii.pill,
      left: (x + endX - length) / 2, top: (y + endY) / 2 - theme.borders.icon / 2,
      transform: [{ rotate: `${Math.atan2(endY - y, endX - x)}rad` }] }} />;
  };
  const head = (left: number, top: number, size: number, key: string) => <View key={key}
    style={{ position: 'absolute', left, top, width: size, height: size,
      borderRadius: theme.radii.pill, borderWidth: theme.borders.icon, borderColor: color }} />;
  const shoulders = (left: number, top: number, width: number, key: string) => <View key={key}
    style={{ position: 'absolute', left, top, width, height: 8,
      borderTopLeftRadius: theme.radii.pill, borderTopRightRadius: theme.radii.pill,
      borderWidth: theme.borders.icon, borderBottomWidth: 0, borderColor: color }} />;
  return <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.icon}>
    {label === 'Map' && <>{line(3, 5, 9, 3, 'a')}{line(9, 3, 15, 5, 'b')}{line(15, 5, 21, 3, 'c')}
      {line(3, 5, 3, 21, 'd')}{line(9, 3, 9, 19, 'e')}{line(15, 5, 15, 21, 'f')}{line(21, 3, 21, 19, 'g')}
      {line(3, 21, 9, 19, 'h')}{line(9, 19, 15, 21, 'i')}{line(15, 21, 21, 19, 'j')}</>}
    {label === 'Bookmarks' && <>{line(6, 3, 18, 3, 'a')}{line(6, 3, 6, 22, 'b')}{line(18, 3, 18, 22, 'c')}
      {line(6, 22, 12, 17, 'd')}{line(12, 17, 18, 22, 'e')}</>}
    {label === 'Profile' && <>{head(8, 3, 8, 'a')}{shoulders(4, 14, 16, 'b')}</>}
    {label === 'Friends' && <>{head(4, 3, 8, 'a')}{shoulders(1, 14, 14, 'b')}
      {line(17, 4, 20, 6, 'c')}{line(20, 6, 20, 10, 'd')}{line(20, 10, 17, 12, 'e')}{shoulders(17, 15, 6, 'f')}</>}
  </View>;
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: theme.colors.background,
    borderTopWidth: theme.borders.thin, borderTopColor: theme.colors.chipBorder, paddingTop: theme.spacing.xs },
  tab: { flex: 1, minWidth: theme.sizes.tapTarget, minHeight: theme.sizes.tapTarget,
    alignItems: 'center', justifyContent: 'flex-start', paddingHorizontal: theme.spacing.xxs, gap: theme.spacing.xxs },
  icon: { width: theme.sizes.tabIcon, height: theme.sizes.tabIcon },
  label: { textAlign: 'center', flexShrink: 1, maxWidth: '100%', fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.caption, lineHeight: theme.typography.lineHeight.caption },
});
