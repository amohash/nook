import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useFocusEffect } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { estimatedWalkMinutes } from '@space/core';
import { Button, EmptyState, ErrorState, LoadingState } from '../components';
import { useSession } from '../data/SessionProvider';
import { StudyPreferencesRow, usePreferenceTags } from '../features/preferences';
import { theme } from '../theme';
import { useAuth } from './AuthProvider';
import { getSupabase } from './client';
import { formStyles } from './FormField';
import { Avatar, CountsRow, PillButton, profileStyles, SAVED_VISIBILITY, SavedSpotListRow, VibeCard } from './profileParts';
import { savedSpotMeta, vibeLineFrom, vibeTagsFrom } from './profileRules';
import { fetchFollowCounts, type FollowCounts, type FollowKind } from './socialApi';

// Design: docs/design/social-profile-own.png
export type ProfileSavedSpot = { id: string; name: string; meta: string; imageUrl: string | null };
export type ProfileIdentity = { id: string; username: string; display_name: string | null; major: string | null; avatar_url: string | null };

export type ProfileViewProps = {
  profile: ProfileIdentity;
  counts: { saved: number; followers: number | null; following: number | null };
  vibe: { line: string | null; tags: readonly string[] };
  savedSpots: readonly ProfileSavedSpot[];
  onEditProfile: () => void;
  onOpenFollowList: (kind: FollowKind) => void;
  onEditPreferences: () => void;
  onOpenSpot: (spotId: string) => void;
  onSignOut: () => void;
  countsError?: boolean;
};

/** Presentational own profile; ProfileScreen supplies live data. Previews can pass labelled test data. */
export function ProfileView({ profile, counts, vibe, savedSpots, onEditProfile, onOpenFollowList, onEditPreferences,
  onOpenSpot, onSignOut, countsError }: ProfileViewProps) {
  const handle = [`@${profile.username}`, profile.major].filter(Boolean).join(' · ');
  return <ScrollView contentContainerStyle={[formStyles.page, styles.page]}>
    <View style={styles.header}>
      <Text accessibilityRole="header" style={formStyles.title}>Profile</Text>
      <PillButton label="Edit profile" onPress={onEditProfile} />
    </View>
    <View style={profileStyles.identity}>
      <Avatar id={profile.id} url={profile.avatar_url} name={profile.display_name} username={profile.username} />
      <Text style={profileStyles.name}>{profile.display_name || profile.username}</Text>
      <Text style={profileStyles.handle}>{handle}</Text>
    </View>
    <CountsRow items={[
      { label: 'saved', value: counts.saved },
      { label: 'followers', value: counts.followers, onPress: () => onOpenFollowList('followers') },
      { label: 'following', value: counts.following, onPress: () => onOpenFollowList('following') },
    ]} />
    {countsError && <Text style={[formStyles.small, styles.centerText]}>Couldn’t load follower counts right now.</Text>}
    <VibeCard line={vibe.line} tags={vibe.tags}
      footer={<StudyPreferencesRow variant="link" tags={vibe.tags} onPress={onEditPreferences} />} />
    <View style={profileStyles.list}>
      <View style={profileStyles.sectionHead}>
        <Text accessibilityRole="header" style={profileStyles.sectionTitle}>Saved spots</Text>
        <Text style={formStyles.small}>{SAVED_VISIBILITY}</Text>
      </View>
      {savedSpots.length ? savedSpots.map((spot) => <SavedSpotListRow key={spot.id} name={spot.name} meta={spot.meta}
        imageUrl={spot.imageUrl} onPress={() => onOpenSpot(spot.id)} />)
        : <Text style={formStyles.small}>No saved spots yet. Tap Save on a place to keep it here.</Text>}
    </View>
    <Button label="Sign out" variant="outline" onPress={onSignOut} />
  </ScrollView>;
}

/** Shown when signed out or when social is off. */
export function GuestProfileCard({ onSignIn, onCreateAccount }: { onSignIn?: () => void; onCreateAccount?: () => void }) {
  const { enabled } = useAuth();
  return <View style={[formStyles.card, styles.guest]}>
    <Text style={[formStyles.cardTitle, styles.centerText]}>Create a profile to follow friends and share your study vibe</Text>
    {enabled ? <View style={styles.actions}>
      {onSignIn && <Button label="Sign in" onPress={onSignIn} />}
      {onCreateAccount && <Button label="Create account" variant="outline" onPress={onCreateAccount} />}
    </View> : <Text style={[formStyles.small, styles.centerText]}>Accounts aren’t available in this build. Saves stay on this device.</Text>}
  </View>;
}

export type ProfileScreenProps = {
  onEditProfile: () => void;
  onOpenFollowList: (kind: FollowKind, userId: string) => void;
  onEditPreferences: () => void;
  onOpenSpot: (spotId: string) => void;
  onSignIn?: () => void;
  onCreateAccount?: () => void;
  /** Signed in without a profile row. Defaults to onCreateAccount. */
  onFinishProfile?: () => void;
};

export function ProfileScreen(props: ProfileScreenProps) {
  const auth = useAuth();
  const { session } = useSession();
  const preferenceTags = usePreferenceTags();
  const [counts, setCounts] = useState<FollowCounts | null>(null);
  const [countsError, setCountsError] = useState(false);
  const userId = auth.profile?.id ?? null;

  useFocusEffect(useCallback(() => {
    const client = getSupabase();
    if (!client || !userId) return;
    let active = true;
    setCountsError(false);
    fetchFollowCounts(client, userId).then((value) => { if (active) setCounts(value); })
      .catch(() => { if (active) setCountsError(true); });
    return () => { active = false; };
  }, [userId]));

  const savedSpots = useMemo<ProfileSavedSpot[]>(() => {
    if (!session) return [];
    const places = new Map((session.settings.savedPlaces ?? []).map((detail) => [detail.spot.id, detail.spot]));
    return session.settings.savedIds.map((id) => {
      const spot = places.get(id);
      if (!spot) return { id, name: 'Saved place', meta: 'Details aren’t stored on this device', imageUrl: null };
      return { id, name: spot.name, imageUrl: spot.image?.url ?? null,
        meta: savedSpotMeta(spot.categories[0], estimatedWalkMinutes(session.query.origin, spot)) };
    });
  }, [session]);

  const page = (children: ReactNode) => <SafeAreaView edges={['top']} style={styles.safe}>{children}</SafeAreaView>;
  if (auth.status === 'off' || auth.status === 'signedOut') return page(<ScrollView contentContainerStyle={formStyles.page}>
    <Text accessibilityRole="header" style={formStyles.title}>Profile</Text>
    <GuestProfileCard onSignIn={props.onSignIn} onCreateAccount={props.onCreateAccount} />
  </ScrollView>);
  if (auth.status === 'loading') return page(<View style={formStyles.page}><LoadingState message="Loading your profile…" /></View>);
  if (auth.status === 'profileError') return page(<View style={formStyles.page}>
    <ErrorState title="Profile unavailable" message="Check your connection and try again."
      action={{ label: 'Retry', onPress: () => void auth.refreshProfile() }} /></View>);
  if (auth.status === 'needsProfile' || !auth.profile) return page(<View style={formStyles.page}>
    <EmptyState title="Finish your profile" message="Pick a username so friends can find you."
      action={(props.onFinishProfile ?? props.onCreateAccount) && { label: 'Set up profile',
        onPress: (props.onFinishProfile ?? props.onCreateAccount)! }} /></View>);

  const tags = vibeTagsFrom(preferenceTags);
  return page(<ProfileView profile={auth.profile} vibe={{ line: vibeLineFrom(tags), tags }} savedSpots={savedSpots}
    counts={{ saved: session?.settings.savedIds.length ?? 0, followers: counts?.followers ?? null, following: counts?.following ?? null }}
    countsError={countsError} onEditProfile={props.onEditProfile}
    onOpenFollowList={(kind) => props.onOpenFollowList(kind, auth.profile!.id)}
    onEditPreferences={props.onEditPreferences} onOpenSpot={props.onOpenSpot} onSignOut={() => void auth.signOut()} />);
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  page: { gap: theme.spacing.xl },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md },
  centerText: { textAlign: 'center' },
  guest: { alignItems: 'stretch', gap: theme.spacing.lg },
  actions: { gap: theme.spacing.md },
});
