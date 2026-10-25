import { Platform } from 'react-native';
import { Contact, ContactField, requestPermissionsAsync } from 'expo-contacts';
import type { SupabaseClient } from '@supabase/supabase-js';
import { matchNumbers } from './friendsRules';
import { hashPhone } from './phoneHash';
import { matchContactHashes, type ContactMatch } from './socialApi';

export type ContactsResult =
  | { status: 'matched'; matches: ContactMatch[] }
  | { status: 'denied' | 'unavailable' | 'error' };

function devLog(stage: string, details: Record<string, unknown>) {
  if (__DEV__) console.warn(`[social] contacts ${stage}`, details);
}

export const contactsAvailable = Platform.OS !== 'web';

/**
 * Asks permission, reads phone numbers only (no names or other fields), hashes them on-device
 * with the same SHA-256/E.164 function as profiles, and sends only hashes to match_contacts.
 */
export async function findContactMatches(client: SupabaseClient): Promise<ContactsResult> {
  if (!contactsAvailable) return { status: 'unavailable' };
  try {
    const permission = await requestPermissionsAsync();
    if (!permission.granted) return { status: 'denied' };
    const details = await Contact.getAllDetails([ContactField.PHONES] as const);
    const numbers = details.flatMap((contact) => (contact.phones ?? []).map((phone) => phone.number ?? '')).filter(Boolean);
    const matches = await matchNumbers(numbers, hashPhone, (hashes) => matchContactHashes(client, hashes));
    return { status: 'matched', matches };
  } catch (error) {
    devLog('failed', { message: (error as Error)?.message });
    return { status: 'error' };
  }
}
