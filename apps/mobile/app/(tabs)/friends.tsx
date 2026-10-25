import { useRouter } from 'expo-router';
import { FriendsScreen } from '../../src/social';

export default function Friends() {
  const router = useRouter();
  return <FriendsScreen onOpenProfile={(id) => router.push({pathname: '/user/[id]', params: {id}})}
    onSignIn={() => router.push('/sign-in')}
    onCreateAccount={() => router.push({pathname: '/sign-in', params: {mode: 'signUp'}})} />;
}
