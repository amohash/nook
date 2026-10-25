import { useEffect, useState, type ReactNode } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, ErrorState, LoadingState } from '../components';
import { theme } from '../theme';
import { useAuth } from './AuthProvider';
import { getSupabase } from './client';
import { formStyles } from './FormField';
import { BackChevron } from './icons';
import { Avatar, PillButton } from './profileParts';
import { personSubtitle } from './profileRules';
import { fetchFollowingIds, fetchFollowList, follow, unfollow, type FollowKind, type PublicProfile } from './socialApi';

// Row layout follows docs/design/social-friends.png.
export type FollowListViewProps = {
  kind: FollowKind;
  people: readonly PublicProfile[];
  myId: string | null;
  followingIds: ReadonlySet<string>;
  busyIds?: ReadonlySet<string>;
  onToggleFollow: (personId: string) => void;
  onOpenUser?: (personId: string) => void;
  onBack?: () => void;
  error?: string | null;
};

export function FollowListView({ kind, people, myId, followingIds, busyIds, onToggleFollow, onOpenUser, onBack, error }: FollowListViewProps) {
  const title = kind === 'followers' ? 'Followers' : 'Following';
  return <FlatList data={people} keyExtractor={(person) => person.id} contentContainerStyle={[formStyles.page, styles.page]}
    ListHeaderComponent={<View style={styles.header}>
      {onBack && <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack}
        style={[formStyles.iconButton, styles.back]}><BackChevron /></Pressable>}
      <Text accessibilityRole="header" style={formStyles.title}>{title}</Text>
      {error && <Text accessibilityRole="alert" style={formStyles.alert}>{error}</Text>}
    </View>}
    ListEmptyComponent={<EmptyState title={kind === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
      message={kind === 'followers' ? 'When people follow this profile, they’ll show here.' : 'Follow friends to see the spots they save.'} />}
    renderItem={({ item: person }) => {
      const isMe = person.id === myId;
      const isFollowing = followingIds.has(person.id);
      const name = person.display_name || person.username;
      const identity = <>
        <Avatar id={person.id} url={person.avatar_url} name={person.display_name} username={person.username} size={48} />
        <View style={styles.text}>
          <Text style={styles.name} numberOfLines={2}>{name}</Text>
          <Text style={formStyles.small} numberOfLines={2}>{personSubtitle(person.username, person.vibe_tags)}</Text>
        </View>
      </>;
      return <View style={styles.row}>
        {onOpenUser ? <Pressable accessibilityRole="link" accessibilityLabel={`${name}, @${person.username}`}
          onPress={() => onOpenUser(person.id)} style={styles.identity}>{identity}</Pressable>
          : <View style={styles.identity}>{identity}</View>}
        {!isMe && myId && <PillButton label={isFollowing ? 'Following' : 'Follow'} variant={isFollowing ? 'outline' : 'primary'}
          busy={busyIds?.has(person.id)} onPress={() => onToggleFollow(person.id)}
          accessibilityLabel={isFollowing ? `Following @${person.username}. Tap to unfollow.` : `Follow @${person.username}`} />}
      </View>;
    }} />;
}

export type FollowListScreenProps = {
  userId: string;
  kind: FollowKind;
  onBack?: () => void;
  onOpenUser?: (personId: string) => void;
};

export function FollowListScreen({ userId, kind, onBack, onOpenUser }: FollowListScreenProps) {
  const auth = useAuth();
  const me = auth.user?.id ?? null;
  const [people, setPeople] = useState<PublicProfile[] | null>(null);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const client = getSupabase();
    if (!client || !me) return;
    let active = true;
    setPeople(null); setLoadError(false);
    Promise.all([fetchFollowList(client, userId, kind), fetchFollowingIds(client, me)])
      .then(([list, ids]) => { if (active) { setPeople(list); setFollowingIds(ids); } })
      .catch(() => { if (active) setLoadError(true); });
    return () => { active = false; };
  }, [userId, kind, me, attempt]);

  const toggle = async (personId: string) => {
    const client = getSupabase();
    if (!client || !me || busyIds.has(personId)) return;
    const next = !followingIds.has(personId);
    setActionError(null);
    setBusyIds((ids) => new Set(ids).add(personId));
    try {
      if (next) await follow(client, me, personId); else await unfollow(client, me, personId);
      setFollowingIds((ids) => { const copy = new Set(ids); if (next) copy.add(personId); else copy.delete(personId); return copy; });
    } catch {
      setActionError('Couldn’t update. Check your connection and try again.');
    } finally {
      setBusyIds((ids) => { const copy = new Set(ids); copy.delete(personId); return copy; });
    }
  };

  const page = (children: ReactNode) => <SafeAreaView edges={['top']} style={styles.safe}>{children}</SafeAreaView>;
  if (!auth.enabled || !me) return page(<View style={formStyles.page}>
    <EmptyState title="Sign in to see friends" message="Followers and following need an account." /></View>);
  if (loadError) return page(<View style={formStyles.page}><ErrorState title="List unavailable"
    message="Check your connection and try again." action={{ label: 'Retry', onPress: () => setAttempt((n) => n + 1) }} /></View>);
  if (!people) return page(<View style={formStyles.page}><LoadingState message="Loading…" /></View>);
  return page(<FollowListView kind={kind} people={people} myId={me} followingIds={followingIds} busyIds={busyIds}
    onToggleFollow={(id) => void toggle(id)} onOpenUser={onOpenUser} onBack={onBack} error={actionError} />);
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  page: { gap: theme.spacing.lg },
  header: { gap: theme.spacing.xs },
  back: { alignSelf: 'flex-start', marginLeft: -theme.spacing.md },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.md },
  identity: { flex: 1, minWidth: 180, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, minHeight: theme.sizes.tapTarget },
  text: { flex: 1, gap: theme.spacing.xxs },
  name: { color: theme.colors.text, fontFamily: theme.typography.bodyFamily, fontSize: theme.typography.size.section,
    lineHeight: theme.typography.lineHeight.section, fontWeight: theme.typography.weight.medium },
});
