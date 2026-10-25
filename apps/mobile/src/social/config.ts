// Social (accounts/profiles) is P1 and off unless explicitly enabled with a complete public config.
// Only the anon/publishable key belongs here; RLS in the nook-social project is the guard.

export type SocialConfig =
  | { enabled: true; url: string; anonKey: string }
  | { enabled: false; reason: 'flag_off' | 'missing_env' | 'secret_key' };

type SocialEnv = { flag?: string; url?: string; anonKey?: string };

/** True for keys that must never ship in a client: new-style secret keys or legacy service-role JWTs. */
export function isSecretKey(key: string): boolean {
  if (key.startsWith('sb_secret_')) return true;
  const payload = key.split('.')[1];
  if (!payload) return false;
  try {
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '='));
    return (JSON.parse(json) as { role?: unknown }).role === 'service_role';
  } catch {
    return false;
  }
}

export function resolveSocialConfig({ flag, url, anonKey }: SocialEnv): SocialConfig {
  if (flag?.trim() !== '1') return { enabled: false, reason: 'flag_off' };
  const cleanUrl = url?.trim() ?? '';
  const cleanKey = anonKey?.trim() ?? '';
  if (!cleanUrl || !cleanKey) return { enabled: false, reason: 'missing_env' };
  if (isSecretKey(cleanKey)) return { enabled: false, reason: 'secret_key' };
  return { enabled: true, url: cleanUrl, anonKey: cleanKey };
}

// Expo inlines EXPO_PUBLIC_* only for direct `process.env.NAME` reads.
export const socialConfig = resolveSocialConfig({
  flag: process.env.EXPO_PUBLIC_SOCIAL_ENABLED,
  url: process.env.EXPO_PUBLIC_SUPABASE_URL,
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
});

if (!socialConfig.enabled && socialConfig.reason === 'secret_key') {
  // Never log the key itself.
  console.warn('Social disabled: EXPO_PUBLIC_SUPABASE_ANON_KEY is a secret/service-role key. Use the anon key.');
}

export const isSocialEnabled = () => socialConfig.enabled;

/** Contacts matching (Friends) is a separate opt-in on top of social: EXPO_PUBLIC_CONTACTS_MATCHING=1. Default off. */
export const contactsMatchingEnabled = socialConfig.enabled && process.env.EXPO_PUBLIC_CONTACTS_MATCHING?.trim() === '1';
