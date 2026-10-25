import { Redirect } from 'expo-router';
import { SessionGate } from '../src/features/session/SessionGate';

export default function Index() {
  return <SessionGate><Redirect href="/(tabs)/map" /></SessionGate>;
}
