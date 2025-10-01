import { createClient, SupabaseClient } from '@supabase/supabase-js';

// الحصول على المتغيرات البيئية
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // استخدم المفتاح الصحيح

// التحقق من وجود المتغيرات البيئية
if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  console.error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE');
  throw new Error('Supabase URL, Anonymous Key, or Service Role Key is missing');
}

// منع إنشاء أكثر من عميل مع HMR
declare global {
  var __supabase: SupabaseClient | undefined;
}

// Helper لتوليد redirect URL
export const getRedirectTo = (path = '/auth/callback') => {
  const envBase = process.env.NEXT_PUBLIC_SITE_URL;
  const origin =
    (typeof window !== 'undefined' && window.location?.origin) ||
    envBase ||
    'http://localhost:3000';
  return `${origin}${path}`;
};

// إنشاء العميل
export const supabaseBrowser =
  globalThis.__supabase ??
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: 'pkce', // ✅ مهم لـ Google OAuth
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

globalThis.__supabase = supabaseBrowser;

// إنشاء عميل Supabase للـ Service Role (يستخدم في الخوادم فقط)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

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
