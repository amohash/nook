import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { LoadingState } from '../src/components';
import { SessionGate } from '../src/features/session/SessionGate';
import { FollowListScreen, useAuth } from '../src/social';

function FollowList() {
  const router = useRouter();
  const {userId, kind} = useLocalSearchParams<{userId?: string; kind?: string}>();
  const auth = useAuth();
  if (auth.loading) return <LoadingState message="Loading account…" />;
  if (!auth.user) return <Redirect href="/sign-in" />;
  if (!userId || (kind !== 'followers' && kind !== 'following')) return <Redirect href="/(tabs)/profile" />;
  return <FollowListScreen userId={userId} kind={kind} onBack={() => router.back()}
    onOpenUser={(id) => router.push({pathname: '/user/[id]', params: {id}})} />;
}

export default function FollowListRoute() {return <SessionGate><FollowList /></SessionGate>;}
