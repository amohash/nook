import { useCallback, useState, type ReactNode } from 'react';
import { useFocusEffect } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, EmptyState, ErrorState, LoadingState } from '../components';
import { usePreferenceTags } from '../features/preferences';
import { theme } from '../theme';
import { useAuth } from './AuthProvider';
import { getSupabase } from './client';
import { formStyles } from './FormField';
import { BackChevron, LockIcon } from './icons';
import { Avatar, CountsRow, profileStyles, SavedSpotListRow, VibeCard } from './profileParts';
import { savedSpotMeta, tagsInCommon, vibeTagsFrom } from './profileRules';
import { GuestProfileCard } from './ProfileScreen';
import { fetchFollowCounts, fetchFollowingIds, fetchPublicProfile, fetchSavedSpots, follow, unfollow,
  type FollowCounts, type FollowKind, type PublicProfile, type SavedSpotRow } from './socialApi';

// Design: docs/design/social-profile-other.png. Nook stores no pronouns, so copy uses "they".
export type UserProfileViewProps = {
  user: PublicProfile;
  counts: FollowCounts | null;
  myTags: readonly string[];
  isSelf: boolean;
  following: boolean;
  followBusy?: boolean;
  /** Visible only to the owner and their followers (RLS); null while loading. */
  savedSpots: readonly SavedSpotRow[] | null;
  onToggleFollow: () => void;
  onOpenFollowList: (kind: FollowKind) => void;
  onOpenSpot: (spotId: string) => void;
  onBack?: () => void;
};

export function UserProfileView({ user, counts, myTags, isSelf, following, followBusy, savedSpots, onToggleFollow,
  onOpenFollowList, onOpenSpot, onBack }: UserProfileViewProps) {
  const theirTags = vibeTagsFrom(user.vibe_tags);
  const common = tagsInCommon(theirTags, myTags);
  const canSeeSaves = isSelf || following;
  return <ScrollView contentContainerStyle={[formStyles.page, styles.page]}>
    {onBack && <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack}
      style={[formStyles.iconButton, styles.back]}><BackChevron /></Pressable>}
    <View style={profileStyles.identity}>
      <Avatar id={user.id} url={user.avatar_url} name={user.display_name} username={user.username} />
      <Text accessibilityRole="header" style={profileStyles.name}>{user.display_name || user.username}</Text>
      <Text style={profileStyles.handle}>{[`@${user.username}`, user.major].filter(Boolean).join(' · ')}</Text>
    </View>
    <CountsRow items={[
      { label: 'followers', value: counts?.followers ?? null, onPress: () => onOpenFollowList('followers') },
      { label: 'following', value: counts?.following ?? null, onPress: () => onOpenFollowList('following') },
    ]} />
    {!isSelf && <Button label={following ? 'Following' : 'Follow'} variant={following ? 'outline' : 'primary'}
      onPress={onToggleFollow} busy={followBusy} selected={following}
      accessibilityHint={following ? `Stops following @${user.username}` : `Follows @${user.username}`} />}
    <VibeCard line={user.vibe_line} tags={theirTags} highlight={common}
      aside={!isSelf && common.length ? `${common.length} ${common.length === 1 ? 'tag' : 'tags'} in common` : undefined} />
    {canSeeSaves ? <View style={profileStyles.list}>
      <Text accessibilityRole="header" style={profileStyles.sectionTitle}>Saved spots</Text>
      {savedSpots === null ? <LoadingState message="Loading saved spots…" />
        : savedSpots.length ? savedSpots.map((spot) => <SavedSpotListRow key={spot.spot_id} name={spot.name}
          meta={savedSpotMeta(spot.category, null)} onPress={() => onOpenSpot(spot.spot_id)} />)
          : <Text style={formStyles.small}>No saved spots yet.</Text>}
    </View> : <View style={[formStyles.card, styles.private]}>
      <LockIcon />
      <Text accessibilityRole="header" style={[formStyles.cardTitle, styles.privateTitle]}>Saved spots are private</Text>
      <Text style={[formStyles.small, styles.center]}>Follow @{user.username} to see the places they save.</Text>
    </View>}
  </ScrollView>;
}

export type UserProfileScreenProps = {
  userId: string;
  onBack?: () => void;
  onOpenSpot: (spotId: string) => void;
  onOpenFollowList: (kind: FollowKind, userId: string) => void;
  onSignIn?: () => void;
  onCreateAccount?: () => void;
};

export function UserProfileScreen({ userId, onBack, onOpenSpot, onOpenFollowList, onSignIn, onCreateAccount }: UserProfileScreenProps) {
  const auth = useAuth();
  const myTags = vibeTagsFrom(usePreferenceTags());
  const me = auth.user?.id ?? null;
  const [user, setUser] = useState<PublicProfile | null | undefined>(undefined);
  const [counts, setCounts] = useState<FollowCounts | null>(null);
  const [following, setFollowing] = useState(false);
  const [saved, setSaved] = useState<SavedSpotRow[] | null>(null);
  const [error, setError] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const loadSaved = useCallback(async () => {
    const client = getSupabase();
    if (!client) return;
    setSaved(null);
    try { setSaved(await fetchSavedSpots(client, userId)); } catch { setSaved([]); }
  }, [userId]);

  useFocusEffect(useCallback(() => {
    const client = getSupabase();
    if (!client || !me) return;
    let active = true;
    setError(false); setUser(undefined);
    Promise.all([fetchPublicProfile(client, userId), fetchFollowCounts(client, userId), fetchFollowingIds(client, me)])
      .then(([profile, nextCounts, ids]) => {
        if (!active) return;
        setUser(profile); setCounts(nextCounts); setFollowing(ids.has(userId));
        if (profile && (ids.has(userId) || me === userId)) void loadSaved();
      })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [userId, me, attempt, loadSaved]));

  const toggleFollow = async () => {
    const client = getSupabase();
    if (!client || !me || followBusy) return;
    setFollowBusy(true);
    const next = !following;
    try {
      if (next) await follow(client, me, userId); else await unfollow(client, me, userId);
      setFollowing(next);
      setCounts((value) => value && { ...value, followers: Math.max(0, value.followers + (next ? 1 : -1)) });
      if (next) void loadSaved(); else setSaved(null);
    } catch {
      setError(true);
    } finally {
      setFollowBusy(false);
    }
  };

  const page = (children: ReactNode) => <SafeAreaView edges={['top']} style={styles.safe}>{children}</SafeAreaView>;
  if (auth.status === 'off' || auth.status === 'signedOut') return page(<View style={formStyles.page}>
    <GuestProfileCard onSignIn={onSignIn} onCreateAccount={onCreateAccount} /></View>);
  if (error && !user) return page(<View style={formStyles.page}><ErrorState title="Profile unavailable"
    message="Check your connection and try again." action={{ label: 'Retry', onPress: () => setAttempt((n) => n + 1) }} /></View>);
  if (user === undefined) return page(<View style={formStyles.page}><LoadingState message="Loading profile…" /></View>);
  if (user === null) return page(<View style={formStyles.page}><EmptyState title="Profile not found"
    message="This person may have deleted their account." action={onBack && { label: 'Back', onPress: onBack }} /></View>);
  return page(<UserProfileView user={user} counts={counts} myTags={myTags} isSelf={me === userId} following={following}
    followBusy={followBusy} savedSpots={saved} onToggleFollow={() => void toggleFollow()} onBack={onBack}
    onOpenFollowList={(kind) => onOpenFollowList(kind, userId)} onOpenSpot={onOpenSpot} />);
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  page: { gap: theme.spacing.xl },
  back: { alignSelf: 'flex-start', marginLeft: -theme.spacing.md },
  private: { alignItems: 'center', gap: theme.spacing.sm },
  privateTitle: { fontSize: theme.typography.size.section, lineHeight: theme.typography.lineHeight.section, textAlign: 'center' },
  center: { textAlign: 'center' },
});
