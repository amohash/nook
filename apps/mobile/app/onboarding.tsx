import { SessionGate } from '../src/features/session/SessionGate';
import { Stack } from 'expo-router';
import { OnboardingFlow } from '../src/features/session/OnboardingFlow';
export default function Onboarding() {
  return <><Stack.Screen options={{headerShown: false}} /><SessionGate><OnboardingFlow /></SessionGate></>;
}
