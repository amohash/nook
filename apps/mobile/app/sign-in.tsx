import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ErrorState, LoadingState } from '../src/components';
import { SessionGate } from '../src/features/session/SessionGate';
import { SignInScreen, useAuth } from '../src/social';

function SignIn() {
  const router = useRouter();
  const {mode} = useLocalSearchParams<{mode?: string}>();
  const auth = useAuth();
  // Wait for the profile lookup; a sign-in callback can precede its resolved state.
  useEffect(() => {
    if (auth.status === 'needsProfile') router.replace('/create-profile');
    if (auth.status === 'ready') router.replace('/(tabs)/profile');
  }, [auth.status, router]);
  if (auth.loading) return <LoadingState message="Loading account…" />;
  if (auth.profileError) return <ErrorState title="Profile unavailable" message="Check your connection and retry."
    action={{label: 'Retry', onPress: () => void auth.refreshProfile()}} />;
  return <SignInScreen initialMode={mode === 'signUp' ? 'signUp' : 'signIn'}
    onContinueAsGuest={() => router.replace('/(tabs)/map')} />;
}

export default function SignInRoute() {return <SessionGate><SignIn /></SessionGate>;}
