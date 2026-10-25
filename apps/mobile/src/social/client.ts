import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { socialConfig } from './config';

let client: SupabaseClient | null = null;

/** The only place a Supabase client is created: lazily, after the social gate passes, then cached. */
export function getSupabase(): SupabaseClient | null {
  if (!socialConfig.enabled) return null;
  client ??= createClient(socialConfig.url, socialConfig.anonKey, {
    auth: { storage: AsyncStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
  return client;
}
