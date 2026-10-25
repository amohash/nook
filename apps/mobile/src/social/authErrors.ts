export type AuthErrorKind =
  | 'invalid_email' | 'missing_password' | 'password_too_short' | 'invalid_credentials' | 'email_taken'
  | 'confirm_email' | 'rate_limited' | 'network' | 'social_off' | 'unknown';

export const MIN_PASSWORD_LENGTH = 8;

export const AUTH_ERROR_TEXT: Record<AuthErrorKind, string> = {
  invalid_email: 'Enter a valid email address.',
  missing_password: 'Enter your password.',
  password_too_short: `Password is too short. Use at least ${MIN_PASSWORD_LENGTH} characters.`,
  invalid_credentials: 'Wrong email or password.',
  email_taken: 'That email is already registered. Choose “I have an account” to sign in.',
  confirm_email: 'Check your email to confirm your account, then sign in.',
  rate_limited: 'Too many tries. Wait a minute and try again.',
  network: 'Can’t reach Nook right now. Check your connection and try again.',
  social_off: 'Accounts aren’t available in this build.',
  unknown: 'Something went wrong. Try again.',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Client-side checks before any network call. */
export function credentialProblem(email: string, password: string, mode: 'signUp' | 'signIn'): AuthErrorKind | null {
  if (!EMAIL_PATTERN.test(email.trim())) return 'invalid_email';
  if (!password) return 'missing_password';
  if (mode === 'signUp' && password.length < MIN_PASSWORD_LENGTH) return 'password_too_short';
  return null;
}

/** Maps Supabase Auth errors (by code, then status/message) to plain-language kinds. */
export function authErrorKind(error: unknown): AuthErrorKind {
  if (!error || typeof error !== 'object') return 'unknown';
  const { name, code, status, message } = error as { name?: string; code?: string; status?: number; message?: string };
  if (name === 'AuthRetryableFetchError' || status === 0 || /network request failed|failed to fetch|load failed/i.test(message ?? '')) return 'network';
  switch (code) {
    case 'invalid_credentials': return 'invalid_credentials';
    case 'user_already_exists':
    case 'email_exists': return 'email_taken';
    case 'weak_password': return 'password_too_short';
    case 'email_address_invalid':
    case 'validation_failed': return 'invalid_email';
    case 'email_not_confirmed': return 'confirm_email';
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit': return 'rate_limited';
  }
  if (status === 429) return 'rate_limited';
  if (/invalid login credentials/i.test(message ?? '')) return 'invalid_credentials';
  if (/already registered/i.test(message ?? '')) return 'email_taken';
  return 'unknown';
}
