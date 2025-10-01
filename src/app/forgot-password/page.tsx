// src/app/forgot-password/page.tsx
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser as supabase } from '@lib/supabaseClient';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // رابط إعادة التوجيه بعد الضغط على رابط الاستعادة من البريد
  const redirectTo = useMemo(() => {
    const base =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (typeof window !== 'undefined' ? window.location.origin : '');
    return base ? `${base}/reset-password` : undefined;
  }, []);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!emailValid) {
      setError('أدخل بريدًا إلكترونيًا صحيحًا.');
      return;
    }

    setLoading(true);
    try {
      const { error: supaError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo, // ⚠️ ضعه ضمن Allowed Redirect URLs في Supabase
      });

      if (supaError) {
        setError('❌ حدث خطأ أثناء إرسال رابط الاستعادة: ' + supaError.message);
      } else {
        setMessage('✅ تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني.');
      }
    } catch {
      setError('❌ حدث خطأ غير متوقع.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-gray-900 font-[Cairo] py-8">
      <div className="bg-white border border-gray-200 p-8 rounded-2xl shadow-sm w-full max-w-md">
        <h2 className="text-2xl font-extrabold mb-6 text-center">استعادة كلمة المرور</h2>

        {error && <p className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</p>}
        {message && <p className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">{message}</p>}

        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="block text-sm mb-1 font-medium">البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="example@email.com"
              required
              autoComplete="email"
            />
            {!emailValid && email.length > 0 && (
              <p className="text-xs text-red-600 mt-1">أدخل بريدًا إلكترونيًا صحيحًا.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !emailValid}
            className="w-full bg-primary text-white py-3 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {loading ? 'جاري الإرسال…' : 'إرسال رابط الاستعادة'}
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
