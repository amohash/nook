import { describe, expect, it } from 'vitest';
import { AVATAR_MAX_BYTES, avatarBytesProblem, sniffImageType, storageErrorKind } from './avatarRules';

const bytes = (...head: (number | string)[]) => {
  const out: number[] = [];
  for (const part of head) {
    if (typeof part === 'string') out.push(...[...part].map((c) => c.charCodeAt(0)));
    else out.push(part);
  }
  return new Uint8Array(out);
};
const jpeg = bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0x10);
const png = bytes(0x89, 'PNG', 0x0d, 0x0a);
const webp = bytes('RIFF', 0, 0, 0, 0, 'WEBP');
const heic = bytes(0, 0, 0, 0x18, 'ftyp', 'heic');

describe('avatar type detection', () => {
  it('sniffs JPEG, PNG, WebP and HEIC from bytes', () => {
    expect(sniffImageType(jpeg)).toBe('image/jpeg');
    expect(sniffImageType(png)).toBe('image/png');
    expect(sniffImageType(webp)).toBe('image/webp');
    expect(sniffImageType(heic)).toBe('image/heic');
    expect(sniffImageType(bytes('GIF89a'))).toBeNull();
    expect(sniffImageType(new Uint8Array())).toBeNull();
  });

  it('applies the bucket rules before uploading', () => {
    expect(avatarBytesProblem(jpeg)).toEqual({ kind: null, type: 'image/jpeg' });
    expect(avatarBytesProblem(heic)).toEqual({ kind: 'heic' });
    expect(avatarBytesProblem(bytes('GIF89a'))).toEqual({ kind: 'unsupported_type' });
    const big = new Uint8Array(AVATAR_MAX_BYTES + 1); big.set(jpeg);
    expect(avatarBytesProblem(big)).toEqual({ kind: 'too_large' });
  });
});

describe('storage error mapping (bodies observed from nook-social)', () => {
  it('maps size, type, policy, auth and network errors', () => {
    expect(storageErrorKind({ statusCode: '413', message: 'The object exceeded the maximum allowed size' })).toBe('too_large');
    expect(storageErrorKind({ statusCode: '415', message: 'mime type image/heic is not supported' })).toBe('heic');
    expect(storageErrorKind({ statusCode: '415', message: 'mime type image/gif is not supported' })).toBe('unsupported_type');
    expect(storageErrorKind({ statusCode: '403', message: 'new row violates row-level security policy' })).toBe('permission');
    expect(storageErrorKind({ statusCode: '404', message: 'Bucket not found' })).toBe('bucket_missing');
    expect(storageErrorKind({ statusCode: '401', message: 'invalid JWT' })).toBe('signed_out');
    expect(storageErrorKind(new TypeError('Failed to fetch'))).toBe('network');
    expect(storageErrorKind({ statusCode: '500', message: 'Internal' })).toBe('unknown');
  });
});
