import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, LoadingState } from '../components';
import { theme } from '../theme';
import { useAuth } from './AuthProvider';
import { getSupabase } from './client';
import { contactsMatchingEnabled } from './config';
import { contactsAvailable, findContactMatches } from './contacts';
import { useFollowState } from './followState';
import { formStyles } from './FormField';
import { normalizeSearch, prefixPattern, SEARCH_DEBOUNCE_MS, SEARCH_LIMIT } from './friendsRules';
import { SearchIcon } from './icons';
import { PersonRow, profileStyles } from './profileParts';
import { GuestProfileCard } from './ProfileScreen';
import { fetchFollowList, searchProfiles, type ContactMatch, type PublicProfile } from './socialApi';

// Design: docs/design/social-friends.png. Contacts wording is fixed by docs/design/README.md.
export const CONTACTS_TITLE = 'Find friends from your contacts';
export const CONTACTS_NOTE = 'We check which contacts use Nook. Numbers are hashed on your phone; only the hashes are sent. Only people who turned on “find me by number” can be found.';

type Person = Pick<PublicProfile, 'id' | 'username' | 'display_name' | 'avatar_url'> & { vibe_tags?: string[] };
export type SearchState = { status: 'idle' | 'loading' | 'done' | 'error'; query: string; results: Person[] };
export type ContactsState = { status: 'idle' | 'checking' | 'denied' | 'matched' | 'error' | 'unavailable'; matches: Person[] };

export type FriendsViewProps = {
  query: string;
  onQueryChange: (value: string) => void;
  search: SearchState;
  /** null while loading. Includes people followed this session so they can be undone. */
  following: Person[] | null;
  followingCount: number | null;
  followingIds: ReadonlySet<string>;
  busyIds: ReadonlySet<string>;
  onToggleFollow: (person: Person) => void;
  onOpenProfile: (userId: string) => void;
  /** null hides the contacts card (EXPO_PUBLIC_CONTACTS_MATCHING off). */
  contacts: ContactsState | null;
  onCheckContacts: () => void;
  error?: string | null;
};

const displayQuery = (typed: string) => {
  const trimmed = typed.trim();
  return trimmed.startsWith('@') || /\s/.test(trimmed) ? trimmed : `@${trimmed}`;
};

export function FriendsView({ query, onQueryChange, search, following, followingCount, followingIds, busyIds, onToggleFollow,
  onOpenProfile, contacts, onCheckContacts, error }: FriendsViewProps) {
  const [focused, setFocused] = useState(false);
  const searching = !!normalizeSearch(query);
  const row = (person: Person) => <PersonRow key={person.id} person={person} following={followingIds.has(person.id)}
    busy={busyIds.has(person.id)} onToggleFollow={() => onToggleFollow(person)} onOpen={() => onOpenProfile(person.id)} />;

  return <ScrollView contentContainerStyle={[formStyles.page, styles.page]} keyboardShouldPersistTaps="handled">
    <Text accessibilityRole="header" style={formStyles.title}>Friends</Text>
    <View style={[styles.search, focused && styles.searchFocused]}>
      <SearchIcon />
      <TextInput value={query} onChangeText={onQueryChange} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        placeholder="Search by name or @username" placeholderTextColor={theme.colors.textMuted}
        accessibilityLabel="Search people by name or username" autoCapitalize="none" autoCorrect={false} returnKeyType="search"
        maxLength={41} style={styles.searchInput} />
      {query.length > 0 && <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => onQueryChange('')}
        style={formStyles.iconButton}><Text style={styles.clear}>✕</Text></Pressable>}
    </View>
    {error && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={formStyles.alert}>{error}</Text>}

    {searching && <View style={profileStyles.list}>
      <Text style={formStyles.eyebrow}>Results</Text>
      {search.status === 'loading' || search.query !== normalizeSearch(query)
        ? <View accessibilityLiveRegion="polite" style={styles.inline}><ActivityIndicator color={theme.colors.textMuted} />
          <Text style={formStyles.small}>Searching…</Text></View>
        : search.status === 'error' ? <Text accessibilityLiveRegion="polite" style={formStyles.alert}>Couldn’t search right now. Check your connection.</Text>
          : search.results.length ? search.results.map(row)
            : <Text accessibilityLiveRegion="polite" style={formStyles.small}>No one found for ‘{displayQuery(query)}’</Text>}
    </View>}

    {contacts && <View style={formStyles.card}>
      <Text accessibilityRole="header" style={styles.cardTitle}>{CONTACTS_TITLE}</Text>
      <Text style={formStyles.small}>{CONTACTS_NOTE}</Text>
      {contacts.status === 'unavailable' ? <Text style={[formStyles.small, styles.strong]}>Available on the phone app.</Text>
        : contacts.status === 'denied' ? <Text accessibilityLiveRegion="polite" style={[formStyles.small, styles.strong]}>No problem, search by username instead</Text>
          : contacts.status === 'matched' ? contacts.matches.length
            ? <View style={profileStyles.list}>{contacts.matches.map(row)}</View>
            : <Text accessibilityLiveRegion="polite" style={formStyles.small}>None of your contacts are on Nook yet, or they haven’t turned on “find me by number.” Try searching by username.</Text>
            : <>
              {contacts.status === 'error' && <Text accessibilityLiveRegion="polite" style={formStyles.alert}>Couldn’t check your contacts. Try again.</Text>}
              <Button label="Check my contacts" variant="outline" busy={contacts.status === 'checking'} onPress={onCheckContacts} />
            </>}
    </View>}

    <View style={profileStyles.list}>
      <Text style={formStyles.eyebrow}>Following · {followingCount ?? '–'}</Text>
      {following === null ? <LoadingState message="Loading who you follow…" />
        : following.length ? following.map(row) : <Text style={formStyles.small}>Find classmates by username.</Text>}
    </View>
  </ScrollView>;
}

export type FriendsScreenProps = {
  onOpenProfile: (userId: string) => void;
  onSignIn?: () => void;
  onCreateAccount?: () => void;
};

export function FriendsScreen({ onOpenProfile, onSignIn, onCreateAccount }: FriendsScreenProps) {
  const auth = useAuth();
  const me = auth.status === 'ready' ? auth.user?.id ?? null : null;
  const follows = useFollowState(me);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState<SearchState>({ status: 'idle', query: '', results: [] });
  const [loadedFollowing, setLoadedFollowing] = useState<Person[] | null>(null);
  const [extra, setExtra] = useState<Person[]>([]); // followed this session, newest first
  const [contacts, setContacts] = useState<ContactsState>({ status: contactsAvailable ? 'idle' : 'unavailable', matches: [] });
  const searchSeq = useRef(0);

  useEffect(() => {
    const client = getSupabase();
    if (!client || !me) return;
    let active = true;
    fetchFollowList(client, me, 'following').then((list) => { if (active) setLoadedFollowing(list); })
      .catch(() => { if (active) setLoadedFollowing([]); });
    return () => { active = false; };
  }, [me]);

  useEffect(() => {
    const client = getSupabase();
    const normalized = normalizeSearch(query);
    if (!client || !me || !normalized) { setSearch({ status: 'idle', query: '', results: [] }); return; }
    const seq = ++searchSeq.current;
    const timer = setTimeout(() => {
      setSearch({ status: 'loading', query: normalized, results: [] });
      searchProfiles(client, me, prefixPattern(normalized), SEARCH_LIMIT)
        .then((results) => { if (seq === searchSeq.current) setSearch({ status: 'done', query: normalized, results }); })
        .catch(() => { if (seq === searchSeq.current) setSearch({ status: 'error', query: normalized, results: [] }); });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, me]);

  const following = useMemo(() => {
    if (!loadedFollowing) return null;
    const seen = new Set(loadedFollowing.map((person) => person.id));
    return [...extra.filter((person) => !seen.has(person.id)), ...loadedFollowing];
  }, [loadedFollowing, extra]);

  const toggleFollow = (person: Person) => {
    if (!follows.followingIds.has(person.id)) setExtra((list) => [person, ...list.filter((item) => item.id !== person.id)]);
    void follows.toggle(person.id);
  };

  const checkContacts = async () => {
    const client = getSupabase();
    if (!client) return;
    setContacts({ status: 'checking', matches: [] });
    const result = await findContactMatches(client);
    setContacts(result.status === 'matched' ? { status: 'matched', matches: result.matches as ContactMatch[] }
      : { status: result.status, matches: [] });
  };

  const page = (children: ReactNode) => <SafeAreaView edges={['top']} style={styles.safe}>{children}</SafeAreaView>;
  if (auth.status === 'off' || auth.status === 'signedOut') return page(<ScrollView contentContainerStyle={formStyles.page}>
    <Text accessibilityRole="header" style={formStyles.title}>Friends</Text>
    <GuestProfileCard onSignIn={onSignIn} onCreateAccount={onCreateAccount} />
  </ScrollView>);
  if (!me) return page(<View style={formStyles.page}><LoadingState message="Loading…" /></View>);
  return page(<FriendsView query={query} onQueryChange={setQuery} search={search} following={following}
    followingCount={follows.loaded ? follows.followingIds.size : null} followingIds={follows.followingIds} busyIds={follows.busyIds}
    onToggleFollow={toggleFollow} onOpenProfile={onOpenProfile}
    contacts={contactsMatchingEnabled ? contacts : null} onCheckContacts={() => void checkContacts()}
    error={follows.error ?? (follows.loadError ? 'Couldn’t load who you follow. Check your connection.' : null)} />);
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  page: { gap: theme.spacing.xl },
  search: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, minHeight: theme.sizes.buttonMinHeight,
    paddingLeft: theme.spacing.lg, paddingRight: theme.spacing.xxs, borderRadius: theme.radii.pill,
    borderWidth: theme.borders.thin, borderColor: theme.colors.chipBorder, backgroundColor: theme.colors.surface },
  searchFocused: { borderColor: theme.colors.chipSelectedBorder, borderWidth: theme.borders.outline },
  searchInput: { flex: 1, minWidth: 0, minHeight: theme.sizes.tapTarget, paddingVertical: theme.spacing.md,
    color: theme.colors.text, fontFamily: theme.typography.bodyFamily, fontSize: theme.typography.size.button,
    lineHeight: theme.typography.lineHeight.button },
  clear: { color: theme.colors.textMuted, fontSize: theme.typography.size.section, lineHeight: theme.typography.lineHeight.section },
  inline: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, minHeight: theme.sizes.tapTarget },
  cardTitle: { color: theme.colors.text, fontFamily: theme.typography.bodyFamily, fontSize: theme.typography.size.section,
    lineHeight: theme.typography.lineHeight.section, fontWeight: theme.typography.weight.semibold },
  strong: { color: theme.colors.text, fontWeight: theme.typography.weight.medium },
});
