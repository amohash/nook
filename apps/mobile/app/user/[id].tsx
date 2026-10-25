import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { SessionGate } from '../../src/features/session/SessionGate';
import { UserProfileScreen } from '../../src/social';

export default function UserProfileRoute() {
  const router = useRouter();
  const {id} = useLocalSearchParams<{id?: string}>();
  if (!id) return <Redirect href="/(tabs)/friends" />;
  return <SessionGate><UserProfileScreen userId={id} onBack={() => router.back()}
    onOpenSpot={(spotId) => router.push({pathname: '/spot/[id]', params: {id: spotId}})}
    onOpenFollowList={(kind, userId) => router.push({pathname: '/follow-list', params: {kind, userId}})}
    onSignIn={() => router.push('/sign-in')}
    onCreateAccount={() => router.push({pathname: '/sign-in', params: {mode: 'signUp'}})} /></SessionGate>;
}
