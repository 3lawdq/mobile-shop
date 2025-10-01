// src/app/login/page.tsx
'use client';

import { Suspense } from 'react';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabaseBrowser as supabase } from '@lib/supabaseClient';
import Image from 'next/image';

function safeInternal(target: string | null | undefined) {
  if (!target) return '/';
  try {
    if (target.startsWith('/')) return target;
    return '/';
  } catch {
    return '/';
  }
}

const LoginPage = () => {
  const router = useRouter();
  const search = useSearchParams();
  const message = search.get('message');
  const nextParam = safeInternal(search.get('next') || search.get('redirect') || '/');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [showResend, setShowResend] = useState(false);
  const [resendPending, setResendPending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  const [checking, setChecking] = useState(true);
  const ranOnceRef = useRef(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (ranOnceRef.current) return;
    ranOnceRef.current = true;

    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          router.replace('/');
          return;
        }
        setChecking(false);
      } catch (error) {
        console.error('Error getting user:', error);
        setErr('حدث خطأ أثناء التحقق من الجلسة');
        setChecking(false);
      }
    })();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setShowResend(false);
    setResendMsg('');

    if (!email.includes('@') || !email.includes('.')) {
      setErr('صيغة البريد الإلكتروني غير صحيحة');
      return;
    }
    if (password.length < 6) {
      setErr('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setErr('فشل تسجيل الدخول: ' + error.message);
        if (error.message.toLowerCase().includes('confirm')) setShowResend(true);
        return;
      }

      if (data.user) {
        startTransition(() => {
          router.replace(nextParam || '/');
          router.refresh();
        });
      }
    } catch (error) {
      setErr('حدث خطأ غير متوقع أثناء تسجيل الدخول');
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setErr('');
    setShowResend(false);
    setResendMsg('');

    try {
      const redirectTo = `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(
        nextParam || '/'
      )}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, queryParams: { access_type: 'offline', prompt: 'consent' } },
      });

      if (error) setErr('فشل تسجيل الدخول باستخدام Google: ' + error.message);
    } catch {
      setErr('حدث خطأ أثناء المصادقة مع Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    setResendPending(true);
    setErr('');
    setResendMsg('');

    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) setErr('فشل في إعادة إرسال رابط التفعيل: ' + error.message);
      else setResendMsg('✅ تم إرسال رابط التفعيل مجددًا إلى بريدك.');
    } catch {
      setErr('حدث خطأ أثناء إعادة إرسال الرابط.');
    } finally {
      setResendPending(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-gray-900 font-[Cairo] py-8">
      <div className="bg-white border border-gray-200 p-8 rounded-2xl shadow-sm w-full max-w-md">
        <h2 className="text-2xl font-extrabold mb-6 text-center text-gray-900">تسجيل الدخول</h2>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {message}
          </div>
        )}

        {err && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-2 text-sm">
            {err}
          </div>
        )}

        {showResend && (
          <div className="text-sm mt-2 text-center">
            <button
              onClick={handleResendConfirmation}
              disabled={resendPending}
              className="text-primary hover:underline disabled:opacity-50"
            >
              {resendPending ? '...جاري الإرسال' : 'إعادة إرسال رابط التفعيل'}
            </button>
            {resendMsg && <p className="text-green-600 mt-2 text-sm">{resendMsg}</p>}
          </div>
        )}

        {/* زر Google */}
        <button
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6 mb-6"
        >
          {googleLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
              <span>جاري التحميل...</span>
            </>
          ) : (
            <>
              <Image src="/google-icon.svg" alt="Google" width={20} height={20} className="w-5 h-5 mr-2" />
              <span>الدخول باستخدام Google</span>
            </>
          )}
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">أو</span>
          </div>
        </div>

        {/* نموذج البريد وكلمة المرور */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm mb-2 font-medium">البريد الإلكتروني</label>
            <input
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm mb-2 font-medium">كلمة المرور</label>
            <input
              type="password"
              placeholder="أدخل كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading || isPending}
            className="w-full bg-primary text-white py-3 px-4 rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors font-medium"
          >
            {loading || isPending ? 'جاري الدخول...' : 'دخول'}
          </button>
        </form>

        <div className="text-center mt-6 space-y-3">
          <p className="text-sm text-gray-600">
            ليس لديك حساب؟{' '}
            <Link href="/signup" className="text-primary hover:underline font-medium">
              أنشئ حسابًا
            </Link>
          </p>
          <p className="text-sm text-gray-600">
            <Link href="/forgot-password" className="text-primary hover:underline">
              نسيت كلمة المرور؟
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default function Login() {
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center">جاري التحميل...</div>}>
      <LoginPage />
    </Suspense>
  );
}
