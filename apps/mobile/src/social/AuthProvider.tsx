import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import type { Session, User } from '@supabase/supabase-js';
import { useSession } from '../data/SessionProvider';
import { getPreferenceTags } from '../features/preferences';
import { AUTH_ERROR_TEXT, authErrorKind, credentialProblem, type AuthErrorKind } from './authErrors';
import { getSupabase } from './client';
import { fetchOwnProfile, updateVibe, type Profile } from './profileApi';
import { vibeLineFrom, vibeTagsFrom } from './profileRules';
import { backfillSavedSpots } from './savedSync';

export type AuthResult = { ok: true } | { ok: false; kind: AuthErrorKind; message: string };
/** off: social disabled (guest mode). needsProfile: signed in without a profiles row.
 * profileError: signed in, but the profile couldn't be loaded (e.g. offline); call refreshProfile. */
export type AuthStatus = 'off' | 'loading' | 'signedOut' | 'needsProfile' | 'ready' | 'profileError';

export type AuthContextValue = {
  enabled: boolean;
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  /** The profile couldn't be loaded (e.g. offline); retry with refreshProfile. */
  profileError: boolean;
  signUp(email: string, password: string): Promise<AuthResult>;
  signIn(email: string, password: string): Promise<AuthResult>;
  signOut(): Promise<void>;
  refreshProfile(): Promise<void>;
};

const failure = (kind: AuthErrorKind): AuthResult => ({ ok: false, kind, message: AUTH_ERROR_TEXT[kind] });

const GUEST: AuthContextValue = {
  enabled: false, status: 'off', session: null, user: null, profile: null, loading: false, profileError: false,
  signUp: async () => failure('social_off'), signIn: async () => failure('social_off'),
  signOut: async () => {}, refreshProfile: async () => {},
};

const AuthContext = createContext<AuthContextValue>(GUEST);

/** Must sit inside SessionProvider. With social off it renders children with a static guest value. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => getSupabase(), []);
  return client ? <SignedInCapableProvider>{children}</SignedInCapableProvider>
    : <AuthContext.Provider value={GUEST}>{children}</AuthContext.Provider>;
}

function SignedInCapableProvider({ children }: { children: ReactNode }) {
  const client = getSupabase()!;
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  // undefined: not loaded yet for this user; null: loaded, no row.
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [profileError, setProfileError] = useState(false);
  const userId = session?.user.id ?? null;

  useEffect(() => {
    let active = true;
    void client.auth.getSession().then(({ data }) => {
      if (active) { setSession(data.session); setSessionLoading(false); }
    });
    // Only set state here: calling other Supabase methods inside this callback can deadlock auth.
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, next) => {
      if (active) { setSession(next); setSessionLoading(false); }
    });
    // Native apps don't get browser visibility events; refresh tokens only while foregrounded.
    const appState = Platform.OS === 'web' ? null : AppState.addEventListener('change', (state) => {
      if (state === 'active') void client.auth.startAutoRefresh();
      else void client.auth.stopAutoRefresh();
    });
    return () => { active = false; subscription.unsubscribe(); appState?.remove(); };
  }, [client]);

  const loadProfile = useCallback(async (id: string, isCurrent: () => boolean = () => true) => {
    setProfileError(false);
    try {
      const row = await fetchOwnProfile(client, id);
      if (isCurrent()) setProfile(row);
    } catch {
      if (isCurrent()) setProfileError(true);
    }
  }, [client]);

  useEffect(() => {
    setProfile(undefined);
    if (!userId) return;
    let active = true;
    void loadProfile(userId, () => active);
    return () => { active = false; };
  }, [userId, loadProfile]);

  useVibeSync(client, profile ?? null, setProfile);
  useSavedBackfill(userId);

  const signUp = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const problem = credentialProblem(email, password, 'signUp');
    if (problem) return failure(problem);
    try {
      const { data, error } = await client.auth.signUp({ email: email.trim(), password });
      if (error) return failure(authErrorKind(error));
      // With confirmation on, an existing email returns a user with no identities instead of an error.
      if (data.user && data.user.identities?.length === 0) return failure('email_taken');
      return data.session ? { ok: true } : failure('confirm_email');
    } catch (error) {
      return failure(authErrorKind(error));
    }
  }, [client]);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const problem = credentialProblem(email, password, 'signIn');
    if (problem) return failure(problem);
    try {
      const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
      return error ? failure(authErrorKind(error)) : { ok: true };
    } catch (error) {
      return failure(authErrorKind(error));
    }
  }, [client]);

  const signOut = useCallback(async () => {
    const { error } = await client.auth.signOut();
    // Offline: still clear the local session so the device returns to guest mode.
    if (error) await client.auth.signOut({ scope: 'local' });
  }, [client]);

  const refreshProfile = useCallback(async () => { if (userId) await loadProfile(userId); }, [userId, loadProfile]);

  const loading = sessionLoading || (!!userId && profile === undefined && !profileError);
  const status: AuthStatus = loading ? 'loading' : !userId ? 'signedOut' : profile ? 'ready'
    : profileError ? 'profileError' : 'needsProfile';
  const value = useMemo<AuthContextValue>(() => ({
    enabled: true, status, session, user: session?.user ?? null, profile: profile ?? null, loading, profileError,
    signUp, signIn, signOut, refreshProfile,
  }), [status, session, profile, loading, profileError, signUp, signIn, signOut, refreshProfile]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** First sign-in on this device (per user and dataset): upload existing local saves once. */
function useSavedBackfill(userId: string | null) {
  const { session } = useSession();
  const scope = session ? `${session.city.mode}:${session.city.id}:${session.city.datasetVersion}` : null;
  const places = session?.settings.savedPlaces;
  const savedIds = session?.settings.savedIds;
  useEffect(() => {
    if (!userId || !scope || !savedIds) return;
    void backfillSavedSpots(userId, scope, (places ?? []).filter(({ spot }) => savedIds.includes(spot.id)));
  }, [userId, scope, places, savedIds]);
}

/** Keeps profiles.vibe_tags/vibe_line in step with this device's saved study preferences. */
function useVibeSync(client: NonNullable<ReturnType<typeof getSupabase>>, profile: Profile | null,
  setProfile: (profile: Profile) => void) {
  const { session } = useSession();
  const tags = session ? vibeTagsFrom(getPreferenceTags(session.settings)) : null;
  const line = tags ? vibeLineFrom(tags) : null;
  const wanted = tags ? JSON.stringify([tags, line]) : null;
  const attempted = useRef<string | null>(null);
  useEffect(() => {
    if (!profile || !tags || wanted === null) return;
    if (JSON.stringify([profile.vibe_tags, profile.vibe_line]) === wanted) return;
    // One attempt per distinct value, so a failing update can't loop.
    const key = `${profile.id}:${wanted}`;
    if (attempted.current === key) return;
    attempted.current = key;
    updateVibe(client, profile.id, tags, line).then(setProfile).catch(() => {});
  }, [client, profile, wanted, tags, line, setProfile]);
}

/** Design previews only: looks signed in without a profile; makes no auth calls. */
export function AuthPreviewProvider({ children }: { children: ReactNode }) {
  const value = useMemo<AuthContextValue>(() => ({ ...GUEST, enabled: true, status: 'needsProfile',
    user: { id: '00000000-0000-4000-8000-000000000000', email: 'preview@example.com' } as User }), []);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
