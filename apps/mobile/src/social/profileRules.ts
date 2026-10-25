// Mirrors the CHECK constraints in supabase-social/migrations/001_social.sql.
export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;
export const DISPLAY_NAME_MAX = 50;
export const MAJOR_MAX = 60;
export const VIBE_TAG_MAX = 10;

/** Lowercases and drops spaces as the user types; the pattern check reports anything else. */
export function normalizeUsernameInput(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '');
}

export function usernameProblem(value: string): string | null {
  if (!value) return 'Choose a username.';
  return USERNAME_PATTERN.test(value) ? null : 'Use 3–20 characters: lowercase letters, numbers or _.';
}

export function displayNameProblem(value: string): string | null {
  const name = value.trim();
  if (!name) return 'Enter your name.';
  return name.length > DISPLAY_NAME_MAX ? `Keep it to ${DISPLAY_NAME_MAX} characters.` : null;
}

export function majorProblem(value: string): string | null {
  return value.trim().length > MAJOR_MAX ? `Keep it to ${MAJOR_MAX} characters.` : null;
}

/**
 * E.164 with a US default: 10 digits → +1…, 11 digits starting with 1 → +…, "+" numbers kept as given.
 * Returns null for anything that isn't a plausible number.
 */
export function toE164(input: string, defaultCountryCode = '1'): string | null {
  const trimmed = input.trim();
  if (!trimmed || /[^\d\s()+.-]/.test(trimmed)) return null;
  const digits = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('+')) return digits.length >= 8 && digits.length <= 15 && digits[0] !== '0' ? `+${digits}` : null;
  if (defaultCountryCode === '1') {
    if (digits.length === 10 && /^[2-9]/.test(digits)) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith('1') && /^[2-9]/.test(digits.slice(1))) return `+${digits}`;
    return null;
  }
  return digits.length >= 6 && digits.length <= 15 ? `+${defaultCountryCode}${digits}` : null;
}

// Intent labels describe what the user does, not a vibe; "Study studier" reads badly.
const INTENT_LABELS = new Set(['Study', 'Meet Friends']);

/** Unique tags, intent first (as in docs/design), capped at 10. */
export function vibeTagsFrom(preferenceTags: readonly string[]): string[] {
  const unique = [...new Set(preferenceTags.map((tag) => tag.trim()).filter(Boolean))];
  return [...unique.filter((tag) => INTENT_LABELS.has(tag)), ...unique.filter((tag) => !INTENT_LABELS.has(tag))]
    .slice(0, VIBE_TAG_MAX);
}

/** Template line from the top three non-intent tags, e.g. "Silent · Outlets · Open late studier". No AI. */
export function vibeLineFrom(tags: readonly string[]): string | null {
  const top = tags.filter((tag) => !INTENT_LABELS.has(tag)).slice(0, 3);
  return top.length ? `${top.join(' · ')} studier` : null;
}

/** One display initial from the name, else the username. */
export function initialFor(displayName: string | null | undefined, username: string | null | undefined): string {
  const source = (displayName?.trim() || username?.trim() || '?').replace(/^@/, '');
  return [...source][0]!.toUpperCase();
}

/** Stable index into the avatar palette, so a person keeps the same colour everywhere. */
export function avatarToneIndex(id: string, tones: number): number {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % tones;
}

/** Their tags that I also have (case-insensitive), in their order. */
export function tagsInCommon(theirs: readonly string[], mine: readonly string[]): string[] {
  const own = new Set(mine.map((tag) => tag.toLowerCase()));
  return theirs.filter((tag) => own.has(tag.toLowerCase()));
}

/** "Library · 5 min walk"; parts that are unknown are left out rather than guessed. */
export function savedSpotMeta(category: string | null | undefined, walkMinutes: number | null | undefined): string {
  const label = category ? category.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) : null;
  const walk = walkMinutes == null || !Number.isFinite(walkMinutes) ? null : `${Math.max(1, Math.round(walkMinutes))} min walk`;
  return [label, walk].filter(Boolean).join(' · ');
}

/** Row for saved_spots; name/category are a display snapshot of the place when saved. */
export function savedRow(userId: string, spotId: string, spot: { name: string; categories: readonly string[] }) {
  return { user_id: userId, spot_id: spotId, name: spot.name.slice(0, 200), category: spot.categories[0]?.slice(0, 80) ?? null };
}

export type PhoneAction = 'keep' | 'replace' | 'clear';

/** Edit profile: a newly entered (valid) number replaces the saved hash; "Remove" clears it; otherwise keep. */
export function phoneAction({ hasSaved, enteredE164, removed }: { hasSaved: boolean; enteredE164: string | null; removed: boolean }): PhoneAction {
  if (enteredE164) return 'replace';
  return removed && hasSaved ? 'clear' : 'keep';
}

/** Discoverable only when a hash will exist after the edit. */
export function discoverableAfter(action: PhoneAction, hasSaved: boolean, wanted: boolean): boolean {
  return wanted && (action === 'replace' || (action === 'keep' && hasSaved));
}

/** "@maya · Silent · Solo": username plus up to two non-intent tags, as in the Friends design. */
export function personSubtitle(username: string, tags: readonly string[]): string {
  return [`@${username}`, ...tags.filter((tag) => !INTENT_LABELS.has(tag)).slice(0, 2)].join(' · ');
}
