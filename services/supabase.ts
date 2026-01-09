
import { createClient } from '@supabase/supabase-js';

/**
 * ARCHIVAL DATA SERVICE
 * Safely initializes the Supabase client using environment-injected credentials.
 */

const getSafeEnv = (key: string): string => {
  try {
    // 1. Check window.process.env (standard shim)
    if (typeof window !== 'undefined' && (window as any).process?.env?.[key]) {
      return (window as any).process.env[key];
    }
    // 2. Check build-time process.env
    if (typeof process !== 'undefined' && process.env && (process.env as any)[key]) {
      return (process.env as any)[key];
    }
    // 3. Check Vite-specific import.meta.env
    const meta = import.meta as any;
    if (meta?.env && meta.env[key]) {
      return meta.env[key];
    }
  } catch (e) {
    console.error(`Archival Error: Critical failure retrieving env key [${key}]`);
  }
  return "";
};

const supabaseUrl = getSafeEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getSafeEnv('VITE_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("ARCHIVAL WARNING: Supabase credentials missing. Local nodes may be disconnected.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
