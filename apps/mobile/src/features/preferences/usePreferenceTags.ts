import { useSession } from '../../data/SessionProvider';
import { getPreferenceTags } from './preferences';

/** Saved study style and vibe labels for this device, e.g. for a Profile vibe card. */
export function usePreferenceTags(): string[] {
  const { session } = useSession();
  return session ? getPreferenceTags(session.settings) : [];
}
