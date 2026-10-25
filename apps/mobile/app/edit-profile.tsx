import { Redirect, useRouter } from 'expo-router';
import { LoadingState } from '../src/components';
import { SessionGate } from '../src/features/session/SessionGate';
import { EditProfileScreen, useAuth } from '../src/social';

function EditProfile() {
  const router = useRouter();
  const auth = useAuth();
  if (auth.loading) return <LoadingState message="Loading account…" />;
  if (!auth.profile) return <Redirect href="/(tabs)/profile" />;
  return <EditProfileScreen onDone={() => router.replace('/(tabs)/profile')} onBack={() => router.back()} />;
}

export default function EditProfileRoute() {return <SessionGate><EditProfile /></SessionGate>;}
