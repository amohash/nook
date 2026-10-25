import { useCallback, useState, type ReactNode } from 'react';
import { useFocusEffect } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, ErrorState, LoadingState } from '../components';
import { theme } from '../theme';
import { useAuth } from './AuthProvider';
import { getSupabase } from './client';
import { useFollowState } from './followState';
import { formStyles } from './FormField';
import { BackChevron } from './icons';
import { PersonRow } from './profileParts';
import { fetchFollowList, type FollowKind, type PublicProfile } from './socialApi';

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
      message={kind === 'followers' ? 'When people follow this profile, they’ll show here.' : 'Find classmates by username.'} />}
    renderItem={({ item: person }) => <PersonRow person={person} following={followingIds.has(person.id)}
      busy={busyIds?.has(person.id)} showFollow={!!myId && person.id !== myId} onToggleFollow={() => onToggleFollow(person.id)}
      onOpen={onOpenUser && (() => onOpenUser(person.id))} />} />;
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
  const follows = useFollowState(me);
  const [people, setPeople] = useState<PublicProfile[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useFocusEffect(useCallback(() => {
    const client = getSupabase();
    if (!client || !me) return;
    let active = true;
    setPeople(null); setLoadError(false);
    fetchFollowList(client, userId, kind).then((list) => { if (active) setPeople(list); })
      .catch(() => { if (active) setLoadError(true); });
    return () => { active = false; };
  }, [userId, kind, me, attempt]));

  const page = (children: ReactNode) => <SafeAreaView edges={['top']} style={styles.safe}>{children}</SafeAreaView>;
  if (!auth.enabled || !me) return page(<View style={formStyles.page}>
    <EmptyState title="Sign in to see friends" message="Followers and following need an account." /></View>);
  if (loadError || follows.loadError) return page(<View style={formStyles.page}><ErrorState title="List unavailable"
    message="Check your connection and try again." action={{ label: 'Retry', onPress: () => { setAttempt((n) => n + 1); follows.retry(); } }} /></View>);
  if (!people || !follows.loaded) return page(<View style={formStyles.page}><LoadingState message="Loading…" /></View>);
  return page(<FollowListView kind={kind} people={people} myId={me} followingIds={follows.followingIds} busyIds={follows.busyIds}
    onToggleFollow={(id) => void follows.toggle(id)} onOpenUser={onOpenUser} onBack={onBack} error={follows.error} />);
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  page: { gap: theme.spacing.lg },
  header: { gap: theme.spacing.xs },
  back: { alignSelf: 'flex-start', marginLeft: -theme.spacing.md },
});
