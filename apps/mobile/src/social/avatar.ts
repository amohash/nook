import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { SupabaseClient } from '@supabase/supabase-js';
import { theme } from '../theme';
import { AVATAR_ERROR_TEXT, AVATAR_SIZE, avatarBytesProblem, storageErrorKind, type AvatarErrorKind } from './avatarRules';

export type PickedAvatar = { uri: string; base64?: string; file?: Blob };
export type AvatarUploadResult = { ok: true; url: string } | { ok: false; kind: AvatarErrorKind; message: string };

const fail = (kind: AvatarErrorKind): AvatarUploadResult => ({ ok: false, kind, message: AVATAR_ERROR_TEXT[kind] });

/** Development-only diagnostics. Never includes the key or tokens. */
function devLog(stage: string, details: Record<string, unknown>) {
  if (__DEV__) console.warn(`[social] avatar ${stage}`, details);
}

export type PickResult = { ok: true; picked: PickedAvatar } | { ok: false; kind: AvatarErrorKind; message: string } | null;

/** Library only (no camera). Native crops square and asks iOS for JPEG instead of HEIC. Null if cancelled. */
export async function pickAvatar(): Promise<PickResult> {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7,
      // Web ignores cropping/quality and returns the original File; avatarBytes re-encodes it.
      base64: Platform.OS !== 'web',
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return null;
    return { ok: true, picked: { uri: asset.uri, base64: asset.base64 ?? undefined, file: asset.file ?? undefined } };
  } catch (error) {
    // Web reads image metadata while picking, so formats the browser can't decode (e.g. HEIC) fail here.
    devLog('pick failed', { message: (error as Error)?.message });
    return { ok: false, kind: 'decode', message: AVATAR_ERROR_TEXT.decode };
  }
}

function bytesFromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Web: decode in the browser and re-encode as a centre-cropped 512px JPEG (handles PNG/WebP, big photos, and HEIC where the browser can decode it). */
async function webSquareJpeg(picked: PickedAvatar): Promise<Uint8Array> {
  const source = picked.file ?? await (await fetch(picked.uri)).blob();
  const bitmap = await createImageBitmap(source);
  const side = Math.min(bitmap.width, bitmap.height);
  const size = Math.min(AVATAR_SIZE, side);
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas unavailable');
  context.fillStyle = theme.colors.background; // transparent PNG areas become the app background, not black
  context.fillRect(0, 0, size, size);
  context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  if (!blob) throw new Error('JPEG encoding failed');
  return new Uint8Array(await blob.arrayBuffer());
}

async function avatarBytes(picked: PickedAvatar): Promise<Uint8Array | AvatarErrorKind> {
  if (Platform.OS === 'web') {
    try {
      return await webSquareJpeg(picked);
    } catch (error) {
      const head = picked.file ? new Uint8Array(await picked.file.slice(0, 16).arrayBuffer()) : null;
      devLog('decode failed', { message: (error as Error)?.message, fileType: picked.file?.type, fileSize: picked.file?.size });
      return head && avatarBytesProblem(head).kind === 'heic' ? 'heic' : 'decode';
    }
  }
  if (!picked.base64) return 'decode';
  return bytesFromBase64(picked.base64);
}

/**
 * Uploads to avatars/{session user id}/avatar.jpg (upsert) and returns a cache-busted public URL.
 * The path always comes from the live session so it matches the storage policy `(foldername)[1] = auth.uid()`.
 */
export async function uploadAvatar(client: SupabaseClient, expectedUserId: string, picked: PickedAvatar): Promise<AvatarUploadResult> {
  const { data: { session } } = await client.auth.getSession();
  if (!session) return fail('signed_out');
  if (session.user.id !== expectedUserId) {
    devLog('session mismatch', { sessionUser: session.user.id, screenUser: expectedUserId });
    return fail('permission');
  }
  const bytes = await avatarBytes(picked);
  if (typeof bytes === 'string') return fail(bytes);
  const check = avatarBytesProblem(bytes);
  if (check.kind) {
    devLog('rejected before upload', { kind: check.kind, bytes: bytes.byteLength });
    return fail(check.kind);
  }
  const path = `${session.user.id}/avatar.jpg`;
  const { error } = await client.storage.from('avatars').upload(path, bytes, { contentType: check.type, upsert: true });
  if (error) {
    const kind = storageErrorKind(error);
    const { statusCode, error: code } = error as { statusCode?: string; error?: string };
    devLog('upload failed', { kind, path, contentType: check.type, bytes: bytes.byteLength, statusCode, code, message: error.message });
    return fail(kind);
  }
  const { data } = client.storage.from('avatars').getPublicUrl(path);
  return { ok: true, url: `${data.publicUrl}?v=${Date.now()}` };
}
