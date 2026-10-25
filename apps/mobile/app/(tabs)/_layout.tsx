import { Tabs } from 'expo-router';
import { SessionGate } from '../../src/features/session/SessionGate';
import { theme } from '../../src/theme';

// A's NookTabBar can be mounted with Tabs' tabBar callback when it is available.
// Keep the route names stable so replacing its presentation needs no route changes.
export default function MainTabs() {
  return <SessionGate><Tabs initialRouteName="map" backBehavior="history" screenOptions={{
    headerStyle: {backgroundColor: theme.colors.background},
    headerTintColor: theme.colors.text,
    sceneStyle: {backgroundColor: theme.colors.background},
    tabBarActiveTintColor: theme.colors.chipSelectedText,
    tabBarInactiveTintColor: theme.colors.textMuted,
    tabBarStyle: {backgroundColor: theme.colors.background},
    tabBarIconStyle: {display: 'none'},
    tabBarLabelStyle: {fontSize: 13},
    tabBarHideOnKeyboard: true,
  }}>
    <Tabs.Screen name="map" options={{title: 'Map', tabBarAccessibilityLabel: 'Map tab'}} />
    <Tabs.Screen name="friends" options={{title: 'Friends', tabBarAccessibilityLabel: 'Friends tab'}} />
    <Tabs.Screen name="bookmarks" options={{title: 'Bookmarks', tabBarAccessibilityLabel: 'Bookmarks tab'}} />
    <Tabs.Screen name="profile" options={{title: 'Profile', tabBarAccessibilityLabel: 'Profile tab'}} />
  </Tabs></SessionGate>;
}
