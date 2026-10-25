import { describe, expect, it } from 'vitest';
import { authErrorKind, credentialProblem } from './authErrors';
import { isSecretKey, resolveSocialConfig } from './config';
import { avatarToneIndex, discoverableAfter, initialFor, personSubtitle, phoneAction, normalizeUsernameInput, savedRow, savedSpotMeta, tagsInCommon, toE164, usernameProblem, vibeLineFrom,
  vibeTagsFrom } from './profileRules';

const jwt = (payload: object) => `x.${btoa(JSON.stringify(payload)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')}.y`;
const sha256Hex = async (text: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))]
  .map((byte) => byte.toString(16).padStart(2, '0')).join('');

describe('social gate', () => {
  it('is on only with flag 1 and both public values', () => {
    expect(resolveSocialConfig({ flag: '1', url: 'https://x.supabase.co', anonKey: 'anon' }))
      .toEqual({ enabled: true, url: 'https://x.supabase.co', anonKey: 'anon' });
    expect(resolveSocialConfig({})).toEqual({ enabled: false, reason: 'flag_off' });
    expect(resolveSocialConfig({ flag: 'true', url: 'u', anonKey: 'k' }).enabled).toBe(false);
    expect(resolveSocialConfig({ flag: '1', url: ' ', anonKey: 'k' })).toEqual({ enabled: false, reason: 'missing_env' });
    expect(resolveSocialConfig({ flag: '1', url: 'u', anonKey: '' })).toEqual({ enabled: false, reason: 'missing_env' });
  });

  it('refuses secret and service-role keys', () => {
    expect(isSecretKey('sb_secret_abc')).toBe(true);
    expect(isSecretKey(jwt({ role: 'service_role' }))).toBe(true);
    expect(isSecretKey(jwt({ role: 'anon' }))).toBe(false);
    expect(isSecretKey('sb_publishable_abc')).toBe(false);
    expect(resolveSocialConfig({ flag: '1', url: 'u', anonKey: jwt({ role: 'service_role' }) }))
      .toEqual({ enabled: false, reason: 'secret_key' });
  });
});

describe('auth errors', () => {
  it('checks credentials before the network', () => {
    expect(credentialProblem('nope', 'longenough', 'signUp')).toBe('invalid_email');
    expect(credentialProblem('a@b.co', '', 'signIn')).toBe('missing_password');
    expect(credentialProblem('a@b.co', 'short', 'signUp')).toBe('password_too_short');
    expect(credentialProblem('a@b.co', 'short', 'signIn')).toBeNull();
    expect(credentialProblem(' a@b.co ', '12345678', 'signUp')).toBeNull();
  });

  it('maps Supabase errors to plain-language kinds', () => {
    expect(authErrorKind({ code: 'invalid_credentials', status: 400 })).toBe('invalid_credentials');
    expect(authErrorKind({ code: 'user_already_exists', status: 422 })).toBe('email_taken');
    expect(authErrorKind({ code: 'weak_password', status: 422 })).toBe('password_too_short');
    expect(authErrorKind({ name: 'AuthRetryableFetchError', status: 0 })).toBe('network');
    expect(authErrorKind(new TypeError('Network request failed'))).toBe('network');
    expect(authErrorKind({ status: 429 })).toBe('rate_limited');
    expect(authErrorKind({ message: 'Invalid login credentials' })).toBe('invalid_credentials');
    expect(authErrorKind({ code: 'something_new' })).toBe('unknown');
  });
});

describe('profile rules', () => {
  it('keeps usernames lowercase and within the database pattern', () => {
    expect(normalizeUsernameInput('Long Horn_1')).toBe('longhorn_1');
    expect(usernameProblem('ab')).not.toBeNull();
    expect(usernameProblem('a-b-c')).not.toBeNull();
    expect(usernameProblem('a'.repeat(21))).not.toBeNull();
    expect(usernameProblem('reader_42')).toBeNull();
  });

  it('normalizes phones to E.164 with a US default', () => {
    expect(toE164('(512) 555-0123')).toBe('+15125550123');
    expect(toE164('1-512-555-0123')).toBe('+15125550123');
    expect(toE164('+44 20 7946 0958')).toBe('+442079460958');
    expect(toE164('555-0123')).toBeNull();
    expect(toE164('012 555 0123')).toBeNull();
    expect(toE164('call me')).toBeNull();
  });

  it('gives one hash per number however it was typed (SHA-256 of E.164, 64 lowercase hex)', async () => {
    const hash = await sha256Hex(toE164('(512) 555-0123')!);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(await sha256Hex(toE164('+1 512 555 0123')!)).toBe(hash);
  });

  it('puts intent first, caps vibe tags at 10 and templates a line from the top three non-intent tags', () => {
    const tags = vibeTagsFrom(['Silent', 'Outlets', 'Silent', 'Open late', 'Solo', 'Group tables', 'Good Wi-Fi',
      'Coffee nearby', 'Outdoors', 'Whiteboards', 'Study', 'Cozy']);
    expect(tags).toHaveLength(10);
    expect(new Set(tags).size).toBe(10);
    expect(tags[0]).toBe('Study');
    expect(vibeTagsFrom(['Silent', 'Outlets', 'Study'])).toEqual(['Study', 'Silent', 'Outlets']);
    expect(vibeLineFrom(['Study', 'Silent', 'Outlets', 'Open late', 'Solo'])).toBe('Silent · Outlets · Open late studier');
    expect(vibeLineFrom(['Study', 'Silent'])).toBe('Silent studier');
    expect(vibeLineFrom(['Study'])).toBeNull();
  });
});

describe('profile display helpers', () => {
  it('derives initials and a stable avatar tone', () => {
    expect(initialFor('maya lopez', 'maya')).toBe('M');
    expect(initialFor('  ', 'zachg')).toBe('Z');
    expect(initialFor(null, null)).toBe('?');
    expect(avatarToneIndex('user-1', 4)).toBe(avatarToneIndex('user-1', 4));
    expect(avatarToneIndex('user-1', 4)).toBeGreaterThanOrEqual(0);
  });

  it('finds tags in common and formats saved rows without inventing unknowns', () => {
    expect(tagsInCommon(['Study', 'Silent', 'Solo', 'Coffee nearby'], ['study', 'Silent', 'Outlets'])).toEqual(['Study', 'Silent']);
    expect(savedSpotMeta('library', 4.6)).toBe('Library · 5 min walk');
    expect(savedSpotMeta('coffee_shop', null)).toBe('Coffee shop');
    expect(savedSpotMeta(null, 0.2)).toBe('1 min walk');
    expect(savedSpotMeta(null, null)).toBe('');
  });
});

describe('saved spots sync rows', () => {
  it('snapshots name and first category for saved_spots', () => {
    expect(savedRow('u1', 's1', { name: 'Pocket Library', categories: ['library', 'cafe'] }))
      .toEqual({ user_id: 'u1', spot_id: 's1', name: 'Pocket Library', category: 'library' });
    expect(savedRow('u1', 's2', { name: 'X', categories: [] }).category).toBeNull();
  });
});

describe('edit profile phone rules', () => {
  it('replaces, clears or keeps the stored hash and never leaves discovery on without one', () => {
    expect(phoneAction({ hasSaved: true, enteredE164: '+15125550123', removed: false })).toBe('replace');
    expect(phoneAction({ hasSaved: true, enteredE164: null, removed: true })).toBe('clear');
    expect(phoneAction({ hasSaved: false, enteredE164: null, removed: true })).toBe('keep');
    expect(phoneAction({ hasSaved: true, enteredE164: null, removed: false })).toBe('keep');
    expect(discoverableAfter('keep', true, true)).toBe(true);
    expect(discoverableAfter('keep', false, true)).toBe(false);
    expect(discoverableAfter('clear', true, true)).toBe(false);
    expect(discoverableAfter('replace', false, true)).toBe(true);
    expect(discoverableAfter('replace', false, false)).toBe(false);
  });

  it('builds person subtitles like the Friends design', () => {
    expect(personSubtitle('maya', ['Study', 'Silent', 'Solo', 'Coffee nearby'])).toBe('@maya · Silent · Solo');
    expect(personSubtitle('d', [])).toBe('@d');
  });
});
