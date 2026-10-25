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

export function vibeTagsFrom(preferenceTags: readonly string[]): string[] {
  return [...new Set(preferenceTags.map((tag) => tag.trim()).filter(Boolean))].slice(0, VIBE_TAG_MAX);
}

// Intent labels describe what the user does, not a vibe; "Study studier" reads badly.
const INTENT_LABELS = new Set(['Study', 'Meet Friends']);

/** Template line from the top three non-intent tags, e.g. "Silent · Outlets · Open late studier." No AI. */
export function vibeLineFrom(tags: readonly string[]): string | null {
  const top = tags.filter((tag) => !INTENT_LABELS.has(tag)).slice(0, 3);
  return top.length ? `${top.join(' · ')} studier.` : null;
}
