import { createClient } from '@supabase/supabase-js';
import { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );
}

// منع إنشاء أكثر من عميل مع HMR
declare global {
  var __supabase: SupabaseClient | undefined;
}

// Helper لتوليد redirect URL
const getRedirectTo = (path = '/auth/callback') => {
  const envBase = process.env.NEXT_PUBLIC_SITE_URL;
  const origin =
    (typeof window !== 'undefined' && window.location?.origin) ||
    envBase ||
    'http://localhost:3000';
  return `${origin}${path}`;
};

export const supabaseBrowser =
  globalThis.__supabase ??
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: 'pkce',         // ✅ مهم لـ Google OAuth
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

globalThis.__supabase = supabaseBrowser;

// ========= Helpers =========
export const signUpWithEmail = (email: string, password: string) =>
  supabaseBrowser.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getRedirectTo(),
    },
  });

export const signInWithEmail = (email: string, password: string) =>
  supabaseBrowser.auth.signInWithPassword({ email, password });

export const signInWithGoogle = () =>
  supabaseBrowser.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: getRedirectTo('/auth/callback'), // ✅ يوجه لصفحة الكولباك
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

export const signOut = () => supabaseBrowser.auth.signOut();

export const getUser = () => supabaseBrowser.auth.getUser();
export const getSession = () => supabaseBrowser.auth.getSession();
