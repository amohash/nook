import { ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { RecoveryControls } from '../../src/data/RecoveryControls';
import { StudyPreferencesRow, usePreferenceTags } from '../../src/features/preferences';
import { ProfileScreen, useAuth } from '../../src/social';

export default function Profile() {
  const router = useRouter();
  const auth = useAuth();
  const tags = usePreferenceTags();
  return <><ProfileScreen onEditProfile={() => router.push('/edit-profile')}
    onOpenFollowList={(kind, userId) => router.push({pathname: '/follow-list', params: {kind, userId}})}
    onEditPreferences={() => router.push('/preferences')}
    onOpenSpot={(id) => router.push({pathname: '/spot/[id]', params: {id, saved: '1'}})}
    onSignIn={() => router.push('/sign-in')}
    onCreateAccount={() => router.push({pathname: '/sign-in', params: {mode: 'signUp'}})}
    onFinishProfile={() => router.push('/create-profile')} />
    <ScrollView style={{maxHeight: 180}} contentContainerStyle={{padding: 16, gap: 16}}>
      <RecoveryControls />
      {!auth.profile && <StudyPreferencesRow tags={tags} onPress={() => router.push('/preferences')} />}
    </ScrollView></>;
}
