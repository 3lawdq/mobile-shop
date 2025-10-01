// src/app/reset-password/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabaseBrowser as supabase } from '@lib/supabaseClient';

export default function ResetPasswordPage() {
  const router = useRouter();

  const [ready, setReady] = useState(false);   // انتهاء فحص الجلسة
  const [canReset, setCanReset] = useState(false); // وجود جلسة استعادة فعلية
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    let mounted = true;

    // مراقبة تغيّر حالة المصادقة لرصد PASSWORD_RECOVERY
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'PASSWORD_RECOVERY') {
        setCanReset(true);
        setReady(true);
      } else if (event === 'SIGNED_IN' && session?.user) {
        setCanReset(true);
        setReady(true);
      } else if (event === 'SIGNED_OUT') {
        setCanReset(false);
      }
    });

    // فحص مبدئي للجلسة (Supabase يلتقط hash تلقائيًا)
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setCanReset(!!data.session);
      } catch (e) {
        console.error('Error checking password recovery session:', e);
        setCanReset(false);
      } finally {
        if (mounted) setReady(true);
      }
    })();

    return () => {
      mounted = false;
      sub.subscription?.unsubscribe?.();
    };
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setMsg('');

    if (!canReset) {
      setErr('رابط الاستعادة غير صالح أو منتهي. افتح الرابط مباشرةً من بريدك الإلكتروني.');
      return;
    }
    if (newPassword.length < 6) {
      setErr('❌ كلمة المرور يجب أن تكون 6 أحرف على الأقل.');
      return;
    }
    if (newPassword !== confirm) {
      setErr('❌ كلمتا المرور غير متطابقتين.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setMsg('✅ تم تحديث كلمة المرور بنجاح! سيتم تحويلك لتسجيل الدخول…');
      setTimeout(() => {
        router.replace(
          '/login?message=' + encodeURIComponent('يمكنك الآن تسجيل الدخول بكلمتك الجديدة.')
        );
      }, 1500);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'حدث خطأ غير معروف.';
      setErr('فشل في تحديث كلمة المرور: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-gray-900 font-[Cairo] px-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" />
      </div>
    );
  }

  if (!canReset) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-gray-900 font-[Cairo] px-6">
        <div className="bg-white border border-gray-200 p-8 rounded-2xl shadow-sm w-full max-w-md text-center">
          <h2 className="text-2xl font-extrabold mb-4">تعيين كلمة مرور جديدة</h2>
          <p className="text-sm text-red-600 mb-4">
            لا توجد جلسة استعادة فعّالة. يرجى فتح رابط الاستعادة من بريدك الإلكتروني مرة أخرى.
          </p>
          <Link href="/forgot-password" className="text-primary hover:underline text-sm">
            إعادة طلب رابط الاستعادة
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-gray-900 font-[Cairo] py-8">
      <div className="bg-white border border-gray-200 p-8 rounded-2xl shadow-sm w-full max-w-md">
        <h2 className="text-2xl font-extrabold mb-6 text-center">تعيين كلمة مرور جديدة</h2>

        {err && <p className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{err}</p>}
        {msg && <p className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">{msg}</p>}

        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="block text-sm mb-1 font-medium">كلمة المرور الجديدة</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="********"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 font-medium">تأكيد كلمة المرور</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="********"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-3 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {loading ? 'جاري التحديث…' : 'تحديث كلمة المرور'}
          </button>
        </form>

        <div className="text-center mt-6 text-sm">
          <Link href="/login" className="text-primary hover:underline">
            العودة لتسجيل الدخول
          </Link>
        </div>
      </div>
    </div>
  );
}
