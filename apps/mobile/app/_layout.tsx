import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function Layout() {
  return <>
    <StatusBar style="light" />
    <Stack screenOptions={{ headerStyle: { backgroundColor: '#121b20' }, headerTintColor: '#eff7ef',
      contentStyle: { backgroundColor: '#0c1318' } }}>
      <Stack.Screen name="index" options={{ title: 'Space' }} />
      <Stack.Screen name="spot/[id]" options={{ title: 'Place details' }} />
    </Stack>
  </>;
}
