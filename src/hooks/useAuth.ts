// src/hooks/useAuth.ts
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabaseBrowser as supabase } from '@lib/supabaseClient';

type Profile =
  | {
      id: string;
      user_id: string;
      role: string | null;
      full_name: string | null;
      email: string | null;
      avatar_url: string | null;
      updated_at?: string | null;
    }
  | null;

type Role = 'admin' | 'user' | 'unknown';

// user_metadata الشائعة من Google/Supabase
type UserMetadata = {
  name?: string;
  full_name?: string;
  picture?: string;
};

export function useAuth() {
  const mounted = useRef(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile>(null);
  const [role, setRole] = useState<Role>('unknown');
  const [loading, setLoading] = useState(true);

  const normalizeRole = (r?: string | null): Role => {
    const v = (r ?? '').toString().trim().toLowerCase();
    return v === 'admin' ? 'admin' : 'user';
  };

  // جلب البروفايل مع دعم id أو user_id
  const fetchProfile = useCallback(async (uid: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, role, full_name, phone, email, avatar_url, updated_at') // تأكد من أن العمود phone موجود
      .eq('user_id', uid)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error.message);
      return { profile: null as Profile, role: 'user' as Role };
    }

    return {
      profile: (data as Profile) ?? null,
      role: normalizeRole(data?.role),
    };
  } catch (err) {
    console.error('Error fetching profile data:', err);
    return { profile: null as Profile, role: 'user' as Role };
  }
}, []);



  // تهيئة الجلسة
  const bootstrap = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!mounted.current) return;

      if (error) {
        setUser(null);
        setProfile(null);
        setRole('user');
        setLoading(false);
        return;
      }

      setUser(user ?? null);
      if (user) {
        const { profile, role } = await fetchProfile(user.id);
        if (!mounted.current) return;
        setProfile(profile);
        setRole(role);
      } else {
        setProfile(null);
        setRole('user');
      }
    } catch (err) {
      console.error('Error during bootstrap:', err);
      setUser(null);
      setProfile(null);
      setRole('user');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [fetchProfile]);

  useEffect(() => {
    mounted.current = true;
    bootstrap();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          const { profile, role } = await fetchProfile(u.id);
          if (!mounted.current) return;
          setProfile(profile);
          setRole(role);
        } else {
          setProfile(null);
          setRole('user');
        }
      }
    );

    return () => {
      mounted.current = false;
      subscription?.subscription?.unsubscribe?.();
    };
  }, [bootstrap, fetchProfile]);

  const refresh = useCallback(() => bootstrap(), [bootstrap]);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error during sign-out:', err);
    } finally {
      if (!mounted.current) return;
      setUser(null);
      setProfile(null);
      setRole('user');
    }
  }, []);

  // عرض الاسم الكامل
  const displayName = useMemo(
    () =>
      profile?.full_name?.trim() ||
      (user?.user_metadata as UserMetadata)?.name ||
      (user?.user_metadata as UserMetadata)?.full_name ||
      user?.email ||
      '',
    [profile?.full_name, user]
  );

  // البريد المعروض
  const displayEmail = useMemo(
    () => user?.email || profile?.email || '',
    [user?.email, profile?.email]
  );

  // الصورة الشخصية
  const avatarUrl = useMemo(
    () =>
      (profile?.avatar_url ||
        (user?.user_metadata as UserMetadata)?.picture ||
        '') as string,
    [profile?.avatar_url, user]
  );

  // هل هو أدمن؟
  const isAdmin = role === 'admin';

  return {
    user,
    profile,
    role,
    isAdmin,
    displayName,
    displayEmail,
    avatarUrl,
    loading,
    refresh,
    logout,
  };
}
