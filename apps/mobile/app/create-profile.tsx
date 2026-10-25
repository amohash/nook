import { Redirect, useRouter } from 'expo-router';
import { ErrorState, LoadingState } from '../src/components';
import { SessionGate } from '../src/features/session/SessionGate';
import { CreateProfileScreen, useAuth } from '../src/social';

function CreateProfile() {
  const router = useRouter();
  const auth = useAuth();
  if (auth.loading) return <LoadingState message="Loading account…" />;
  if (!auth.enabled || !auth.user) return <Redirect href="/sign-in" />;
  if (auth.profileError) return <ErrorState title="Profile unavailable" message="Check your connection and retry."
    action={{label: 'Retry', onPress: () => void auth.refreshProfile()}} />;
  if (auth.profile) return <Redirect href="/(tabs)/profile" />;
  return <CreateProfileScreen onDone={() => router.replace('/(tabs)/profile')}
    onBack={() => {void auth.signOut().then(() => router.replace('/sign-in'));}} />;
}

export default function CreateProfileRoute() {return <SessionGate><CreateProfile /></SessionGate>;}
