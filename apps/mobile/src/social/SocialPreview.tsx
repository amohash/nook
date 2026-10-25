import { useState, type ReactNode } from 'react';
import { ScrollView, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components';
import { theme } from '../theme';
import { AuthPreviewProvider, useAuth } from './AuthProvider';
import { socialConfig } from './config';
import { CreateProfileScreen } from './CreateProfileScreen';
import { EditProfileScreen } from './EditProfileScreen';
import { FollowListScreen } from './FollowListScreen';
import { ProfileScreen, ProfileView } from './ProfileScreen';
import { SignInScreen } from './SignInScreen';
import type { FollowKind, PublicProfile } from './socialApi';
import { UserProfileScreen, UserProfileView } from './UserProfileScreen';

/**
 * Dev-only harness until D adds routes. Render inside SessionProvider + AuthProvider.
 * "Live" views use the real nook-social project from .env (accounts are real).
 * "Test data" views are fictional, make no network calls and are labelled on screen.
 */
const VIEWS = [
  { id: 'live', label: 'Live auth' },
  { id: 'profile-live', label: 'Profile (live)' },
  { id: 'edit-live', label: 'Edit profile (live)' },
  { id: 'follows-live', label: 'Follow list (live)' },
  { id: 'profile-test', label: 'Profile (test data)' },
  { id: 'user-test', label: 'Other profile (test data)' },
  { id: 'create-design', label: 'Create profile (design)' },
] as const;
type ViewId = (typeof VIEWS)[number]['id'];

export function SocialPreview() {
  const [view, setView] = useState<ViewId>('live');
  return <View style={styles.page}>
    <ScrollView horizontal style={styles.toolbarScroll} contentContainerStyle={styles.toolbar}>
      {VIEWS.map(({ id, label }) => <Pressable key={id} accessibilityRole="tab" accessibilityState={{ selected: view === id }}
        onPress={() => setView(id)} style={[styles.tab, view === id && styles.selected]}>
        <Text style={styles.text}>{label}</Text>
      </Pressable>)}
    </ScrollView>
    {view === 'live' && <LiveAuth />}
    {view === 'profile-live' && <LiveProfileFlow />}
    {view === 'edit-live' && <EditProfileScreen onDone={() => setView('profile-live')} />}
    {view === 'follows-live' && <LiveFollowLists />}
    {view === 'profile-test' && <TestBanner><TestProfile /></TestBanner>}
    {view === 'user-test' && <TestBanner><TestUserProfile /></TestBanner>}
    {view === 'create-design' && <AuthPreviewProvider><CreateProfileScreen onBack={() => setView('live')} /></AuthPreviewProvider>}
  </View>;
}

function TestBanner({ children }: { children: ReactNode }) {
  return <View style={styles.page}><Text style={styles.banner}>Test data · fictional people and places · nothing is saved</Text>{children}</View>;
}

const TEST_TAGS = ['Study', 'Silent', 'Outlets', 'Open late'];

function TestProfile() {
  const [note, setNote] = useState<string | null>(null);
  return <>
    {note && <Text style={styles.banner}>{note}</Text>}
    <ProfileView profile={{ id: 'test-user-1', username: 'testuser', display_name: 'Test Student', major: 'Computer Science', avatar_url: null }}
      counts={{ saved: 2, followers: 4, following: 4 }} vibe={{ line: 'Silent · Outlets · Open late studier', tags: TEST_TAGS }}
      savedSpots={[
        { id: 'test-spot-1', name: 'Sample library (test)', meta: 'Library · 5 min walk', imageUrl: null },
        { id: 'test-spot-2', name: 'Sample café (test)', meta: 'Café · 8 min walk', imageUrl: null },
      ]}
      onEditProfile={() => setNote('Edit profile tapped')} onOpenFollowList={(kind) => setNote(`${kind} tapped`)}
      onEditPreferences={() => setNote('Edit study preferences tapped')} onOpenSpot={(id) => setNote(`Open spot ${id}`)}
      onSignOut={() => setNote('Sign out tapped')} />
  </>;
}

const TEST_PERSON: PublicProfile = { id: 'test-user-2', username: 'testfriend', display_name: 'Test Friend', major: 'Psychology',
  avatar_url: null, vibe_tags: ['Study', 'Silent', 'Solo', 'Coffee nearby'], vibe_line: 'Silent · Solo · Coffee nearby studier',
  created_at: '2026-10-25T00:00:00Z' };

function TestUserProfile() {
  const [following, setFollowing] = useState(false);
  return <UserProfileView user={TEST_PERSON} counts={{ followers: following ? 13 : 12, following: 9 }} myTags={TEST_TAGS}
    isSelf={false} following={following} onToggleFollow={() => setFollowing((value) => !value)}
    savedSpots={following ? [{ spot_id: 'test-spot-3', name: 'Sample reading room (test)', category: 'library', saved_at: '' }] : null}
    onOpenFollowList={() => {}} onOpenSpot={() => {}} onBack={() => {}} />;
}

type Route = { name: 'profile' } | { name: 'edit' } | { name: 'list'; kind: FollowKind; userId: string } | { name: 'user'; userId: string };

function LiveProfileFlow() {
  const [stack, setStack] = useState<Route[]>([{ name: 'profile' }]);
  const [note, setNote] = useState<string | null>(null);
  const push = (route: Route) => setStack((value) => [...value, route]);
  const back = () => setStack((value) => value.length > 1 ? value.slice(0, -1) : value);
  const route = stack[stack.length - 1]!;
  const openSpot = (id: string) => setNote(`Would open spot ${id} (D routes /spot/[id])`);
  return <View style={styles.page}>
    {note && <Text style={styles.banner}>{note}</Text>}
    {route.name === 'profile' && <ProfileScreen onEditProfile={() => push({ name: 'edit' })}
      onOpenFollowList={(kind, userId) => push({ name: 'list', kind, userId })}
      onEditPreferences={() => setNote('Would open study preferences (D routes /preferences)')} onOpenSpot={openSpot}
      onSignIn={() => setNote('Use the Live auth tab to sign in')} onCreateAccount={() => setNote('Use the Live auth tab')} />}
    {route.name === 'edit' && <EditProfileScreen onBack={back} onDone={back} />}
    {route.name === 'list' && <FollowListScreen userId={route.userId} kind={route.kind} onBack={back}
      onOpenUser={(userId) => push({ name: 'user', userId })} />}
    {route.name === 'user' && <UserProfileScreen userId={route.userId} onBack={back} onOpenSpot={openSpot}
      onOpenFollowList={(kind, userId) => push({ name: 'list', kind, userId })} />}
  </View>;
}

function LiveFollowLists() {
  const { user } = useAuth();
  const [kind, setKind] = useState<FollowKind>('following');
  if (!user) return <Text style={styles.banner}>Sign in on the Live auth tab first.</Text>;
  return <View style={styles.page}>
    <View style={styles.toolbar}>{(['followers', 'following'] as const).map((id) => <Pressable key={id} accessibilityRole="tab"
      accessibilityState={{ selected: kind === id }} onPress={() => setKind(id)} style={[styles.tab, kind === id && styles.selected]}>
      <Text style={styles.text}>{id}</Text></Pressable>)}</View>
    <FollowListScreen key={kind} userId={user.id} kind={kind} />
  </View>;
}

function LiveAuth() {
  const auth = useAuth();
  const [mode, setMode] = useState<'signUp' | 'signIn'>('signIn');
  const banner = <Text style={styles.banner}>status: {auth.status}
    {!socialConfig.enabled ? ` (${socialConfig.reason})` : ''} · real nook-social project</Text>;
  if (auth.status === 'loading') return <View style={styles.page}>{banner}<Text style={styles.text}>Loading…</Text></View>;
  if (auth.status === 'off' || auth.status === 'signedOut') return <View style={styles.page}>{banner}
    <SignInScreen key={mode} initialMode={mode} onContinueAsGuest={() => {}} /></View>;
  if (auth.status === 'needsProfile') return <View style={styles.page}>{banner}<CreateProfileScreen /></View>;
  if (auth.status === 'profileError') return <View style={styles.page}>{banner}
    <Button label="Retry loading profile" onPress={() => void auth.refreshProfile()} /></View>;
  const { profile } = auth;
  return <ScrollView contentContainerStyle={styles.content}>{banner}
    <Text style={styles.text}>Signed in as {auth.user?.email}</Text>
    <Text style={styles.code}>{JSON.stringify({ ...profile, phone_hash: profile?.phone_hash ? '<64-char hash>' : null }, null, 2)}</Text>
    <Button label="Sign out" variant="outline" onPress={() => { setMode('signIn'); void auth.signOut(); }} />
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.colors.background },
  content: { gap: theme.spacing.md, padding: theme.spacing.lg },
  toolbarScroll: { flexGrow: 0 },
  toolbar: { flexDirection: 'row', gap: theme.spacing.xs, padding: theme.spacing.xs },
  tab: { minHeight: theme.sizes.tapTarget, justifyContent: 'center', paddingHorizontal: theme.spacing.md,
    borderWidth: theme.borders.thin, borderColor: theme.colors.chipBorder, borderRadius: theme.radii.field },
  selected: { backgroundColor: theme.colors.chipSelectedBackground },
  banner: { color: theme.colors.secondaryText, fontSize: theme.typography.size.caption, paddingHorizontal: theme.spacing.lg },
  text: { color: theme.colors.text, fontSize: theme.typography.size.body, lineHeight: theme.typography.lineHeight.body },
  code: { color: theme.colors.text, fontFamily: 'monospace', fontSize: theme.typography.size.caption },
});
