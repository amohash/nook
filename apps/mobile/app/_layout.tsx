import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionProvider } from '../src/data/SessionProvider';
import { AuthProvider } from '../src/social';
import { theme } from '../src/theme';

function Shell() {
  return <>
    <StatusBar style="dark" />
    <Stack screenOptions={{headerStyle: {backgroundColor: theme.colors.background}, headerTintColor: theme.colors.text,
      contentStyle: {backgroundColor: theme.colors.background}}}>
      <Stack.Screen name="index" options={{headerShown: false}} />
      <Stack.Screen name="(tabs)" options={{headerShown: false}} />
      <Stack.Screen name="spot/[id]" options={{headerShown: false}} />
      <Stack.Screen name="onboarding" options={{headerShown: false, gestureEnabled: false}} />
      <Stack.Screen name="saved" options={{title: 'Saved places'}} />
      <Stack.Screen name="preferences" options={{headerShown: false}} />
      <Stack.Screen name="sign-in" options={{headerShown: false}} />
      <Stack.Screen name="create-profile" options={{headerShown: false}} />
      <Stack.Screen name="edit-profile" options={{headerShown: false}} />
      <Stack.Screen name="user/[id]" options={{headerShown: false}} />
      <Stack.Screen name="follow-list" options={{headerShown: false}} />
      <Stack.Screen name="design-preview" options={{headerShown: false}} />
    </Stack>
  </>;
}
export default function Layout() {
  return <SafeAreaProvider><SessionProvider><AuthProvider><Shell /></AuthProvider></SessionProvider></SafeAreaProvider>;
}
