import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionProvider } from '../src/data/SessionProvider';
import { theme } from '../src/theme';

function Shell() {
  return <>
    <StatusBar style="dark" />
    <Stack screenOptions={{headerStyle: {backgroundColor: theme.colors.background}, headerTintColor: theme.colors.text,
      contentStyle: {backgroundColor: theme.colors.background}}}>
      <Stack.Screen name="index" options={{title: 'Nook'}} />
      <Stack.Screen name="spot/[id]" options={{title: 'Place details'}} />
      <Stack.Screen name="onboarding" options={{headerShown: false, gestureEnabled: false}} />
      <Stack.Screen name="preferences" options={{headerShown: false}} />
      <Stack.Screen name="design-preview" options={{headerShown: false}} />
    </Stack>
  </>;
}
export default function Layout() {
  return <SafeAreaProvider><SessionProvider><Shell /></SessionProvider></SafeAreaProvider>;
}
