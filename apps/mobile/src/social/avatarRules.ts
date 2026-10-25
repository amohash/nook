// Pure avatar checks; mirrors the avatars bucket in supabase-social/migrations/001_social.sql.
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const AVATAR_SIZE = 512;

export type AvatarType = (typeof AVATAR_TYPES)[number];
export type AvatarErrorKind = 'too_large' | 'unsupported_type' | 'heic' | 'permission' | 'signed_out'
  | 'bucket_missing' | 'network' | 'decode' | 'unknown';

export const AVATAR_ERROR_TEXT: Record<AvatarErrorKind, string> = {
  too_large: 'Photo too large. Choose one under 2 MB.',
  unsupported_type: 'Only JPEG, PNG or WebP photos can be used.',
  heic: 'HEIC photos aren’t supported here. Choose a JPEG or PNG, or export the photo as JPEG.',
  permission: 'Permission denied: you can only upload your own photo. Sign out and back in, then try again.',
  signed_out: 'Your session has ended. Sign in again to add a photo.',
  bucket_missing: 'Photo storage isn’t set up yet. You can skip the photo for now.',
  network: 'Couldn’t reach Nook. Check your connection and try again.',
  decode: 'Couldn’t read that photo. Choose a JPEG or PNG; HEIC photos can’t be opened here.',
  unknown: 'Couldn’t upload your photo. Try again or skip for now.',
};

/** Detects the real image type from the first bytes; never trusts the file name or picker mimeType. */
export function sniffImageType(bytes: Uint8Array): AvatarType | 'image/heic' | null {
  const at = (i: number) => bytes[i] ?? -1;
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if (at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return 'image/jpeg';
  if (at(0) === 0x89 && ascii(1, 4) === 'PNG') return 'image/png';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  if (ascii(4, 8) === 'ftyp' && /^(heic|heix|hevc|hevx|heim|heis|mif1|msf1)$/.test(ascii(8, 12))) return 'image/heic';
  return null;
}

/** Problem with bytes we're about to upload, or null when they match the bucket rules. */
export function avatarBytesProblem(bytes: Uint8Array): { kind: AvatarErrorKind } | { kind: null; type: AvatarType } {
  const type = sniffImageType(bytes);
  if (type === 'image/heic') return { kind: 'heic' };
  if (!type) return { kind: 'unsupported_type' };
  if (bytes.byteLength > AVATAR_MAX_BYTES) return { kind: 'too_large' };
  return { kind: null, type };
}

/** Maps Supabase Storage errors (statusCode/code/message) to a specific message kind. */
export function storageErrorKind(error: unknown): AvatarErrorKind {
  if (!error || typeof error !== 'object') return 'unknown';
  const { name, message = '', statusCode, status } = error as { name?: string; message?: string; statusCode?: string | number; status?: number };
  const code = String(statusCode ?? status ?? '');
  if (/failed to fetch|network request failed|load failed/i.test(message)
    || (name === 'StorageUnknownError' && /fetch/i.test(message))) return 'network';
  if (code === '413' || /maximum allowed size|payload too large/i.test(message)) return 'too_large';
  if (code === '415' || /mime type/i.test(message)) return /heic|heif/i.test(message) ? 'heic' : 'unsupported_type';
  if (/bucket not found/i.test(message)) return 'bucket_missing';
  if (code === '403' || /row-level security|unauthorized|access denied/i.test(message)) return 'permission';
  if (code === '401' || /jwt|token/i.test(message)) return 'signed_out';
  return 'unknown';
}
