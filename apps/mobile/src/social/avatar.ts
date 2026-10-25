import * as ImagePicker from 'expo-image-picker';
import type { SupabaseClient } from '@supabase/supabase-js';

// Matches the avatars bucket limits in supabase-social/migrations/001_social.sql.
const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export type PickedAvatar = { base64: string; mimeType: string; uri: string };
export type AvatarUploadResult = { ok: true; url: string } | { ok: false; message: string };

/** Library only (no camera), square crop. Returns null if the user cancels. */
export async function pickAvatar(): Promise<PickedAvatar | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.6, base64: true,
  });
  const asset = result.canceled ? null : result.assets[0];
  if (!asset?.base64) return null;
  return { base64: asset.base64, mimeType: asset.mimeType ?? 'image/jpeg', uri: asset.uri };
}

function bytesFromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Uploads to avatars/{uid}/avatar.jpg (overwriting) and returns a cache-busted public URL. */
export async function uploadAvatar(client: SupabaseClient, userId: string, picked: PickedAvatar): Promise<AvatarUploadResult> {
  if (!ALLOWED_TYPES.includes(picked.mimeType)) return { ok: false, message: 'Choose a JPEG, PNG or WebP photo.' };
  const bytes = bytesFromBase64(picked.base64);
  if (bytes.byteLength > MAX_BYTES) return { ok: false, message: 'That photo is too large. Choose one under 2 MB.' };
  const path = `${userId}/avatar.jpg`;
  const { error } = await client.storage.from('avatars').upload(path, bytes, { contentType: picked.mimeType, upsert: true });
  if (error) return { ok: false, message: 'Couldn’t upload your photo. Try again or skip for now.' };
  const { data } = client.storage.from('avatars').getPublicUrl(path);
  return { ok: true, url: `${data.publicUrl}?v=${Date.now()}` };
}
