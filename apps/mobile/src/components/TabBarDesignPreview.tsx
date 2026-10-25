import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { EmptyState } from './States';
import { NookTabBar, type NookTabBarProps } from './NookTabBar';
import { BookmarksPlaceholder, FriendsPlaceholder, ProfilePlaceholder } from './TabPlaceholders';

const routes = ['map', 'friends', 'bookmarks', 'profile'].map((name) => ({ key: `preview-${name}`, name }));

/** Local-only adapter for inspecting the standard bar without adding real routes. */
export function TabBarDesignPreview() {
  const [index, setIndex] = useState(0);
  const [eventText, setEventText] = useState('Tap each tab to preview its selected state.');
  const insets = useSafeAreaInsets();
  // Only emitter.emit and navigateToTab are consumed by NookTabBar. This specimen deliberately has
  // no Router or real navigation object; production receives the complete props.
  const props = {
    state: { index, routes },
    descriptors: Object.fromEntries(routes.map((route) => [route.key, { options: {} }])),
    emitter: {
      emit: ({ type, target }: { type: string; target: string }) => {
        setEventText(`Preview only: ${type} · ${target.replace('preview-', '')}`);
        return { defaultPrevented: false };
      },
    },
    navigateToTab: (key: string) => setIndex(routes.findIndex((route) => route.key === key)),
    insets,
  } as unknown as NookTabBarProps;
  return <View style={styles.example}>
    <Text accessibilityRole="header" style={styles.heading}>TabBar + coming-soon screens</Text>
    <Text style={styles.body}>Local visual preview · no routes, accounts or saved data. D keeps the working Saved screen.</Text>
    <Text accessibilityLiveRegion="polite" style={styles.body}>{eventText}</Text>
    <View style={styles.screen}>
      {index === 0 && <EmptyState title="Map tab preview" message="D connects the existing Explore screen here." />}
      {index === 1 && <FriendsPlaceholder />}
      {index === 2 && <BookmarksPlaceholder />}
      {index === 3 && <ProfilePlaceholder />}
    </View>
    <NookTabBar {...props} />
  </View>;
}

const styles = StyleSheet.create({
  example: { gap: theme.spacing.md },
  heading: { color: theme.colors.text, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.button, lineHeight: theme.typography.lineHeight.button,
    fontWeight: theme.typography.weight.semibold },
  body: { color: theme.colors.textMuted, fontFamily: theme.typography.bodyFamily,
    fontSize: theme.typography.size.body, lineHeight: theme.typography.lineHeight.body },
  screen: { minHeight: theme.sizes.thumbnail },
});
