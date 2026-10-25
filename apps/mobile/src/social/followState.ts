import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabase } from './client';
import { toggledSet } from './friendsRules';
import { fetchFollowingIds, follow, unfollow } from './socialApi';

export const FOLLOW_ERROR = 'Couldn’t update. Check your connection and try again.';

/**
 * Who I follow, with optimistic Follow/Following toggles that roll back on error.
 * One request per person at a time; `busyIds` lets rows show progress.
 */
export function useFollowState(me: string | null) {
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const busy = useRef(new Set<string>());
  // Mirror of followingIds so toggle reads the current value synchronously.
  const ids = useRef<Set<string>>(new Set());
  const apply = useCallback((next: Set<string>) => { ids.current = next; setFollowingIds(next); }, []);

  useEffect(() => {
    const client = getSupabase();
    if (!client || !me) return;
    let active = true;
    setLoaded(false); setLoadError(false);
    fetchFollowingIds(client, me).then((found) => { if (active) { apply(found); setLoaded(true); } })
      .catch(() => { if (active) setLoadError(true); });
    return () => { active = false; };
  }, [me, attempt, apply]);

  const toggle = useCallback(async (personId: string) => {
    const client = getSupabase();
    if (!client || !me || personId === me || busy.current.has(personId)) return;
    busy.current.add(personId);
    setBusyIds(new Set(busy.current));
    setError(null);
    const next = !ids.current.has(personId);
    apply(toggledSet(ids.current, personId, next)); // optimistic
    try {
      if (next) await follow(client, me, personId); else await unfollow(client, me, personId);
    } catch {
      apply(toggledSet(ids.current, personId, !next)); // roll back
      setError(FOLLOW_ERROR);
    } finally {
      busy.current.delete(personId);
      setBusyIds(new Set(busy.current));
    }
  }, [me, apply]);

  return { followingIds, busyIds, loaded, loadError, error, toggle, retry: () => setAttempt((n) => n + 1) };
}
