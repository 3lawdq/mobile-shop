// src/components/AuthLoginForm.tsx
'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@lib/supabaseClient'
import Image from 'next/image'

/**
 * نموذج تسجيل الدخول (للمستخدم العادي أو الأدمن)
 * - يسجّل بالبريد/كلمة المرور أو Google OAuth
 * - يتحقق من دور المستخدم من جدول profiles
 * - إن requireAdmin=true يُحوّل غير الأدمن إلى الصفحة الرئيسية
 * - يحترم بارامتر ?next=/some/path إن وُجد بعد نجاح الدخول
 */
export default function AuthLoginForm({ requireAdmin = false }: { requireAdmin?: boolean }) {
  const router = useRouter()
  const search = useSearchParams()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [pending, setPending] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  // دعم ?next=... للعودة لما بعد الدخول
  const nextParamRaw = search.get('next') || search.get('redirect') || '/'
  const nextParam = nextParamRaw?.startsWith('/') ? nextParamRaw : '/'

  async function afterSessionEstablished(redirectFallback: string = '/') {
    // جلب المستخدم الحالي
    const {
      data: { user },
      error: getUserErr,
    } = await supabaseBrowser.auth.getUser()

    if (getUserErr || !user) {
      setErr('لم يتم إنشاء الجلسة بشكل صحيح.')
      return
    }

    // جلب الدور من profiles (يدعم user_id كمفتاح منطقي)
    const { data: profile } = await supabaseBrowser
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()

    const role = (profile?.role ?? 'user') as 'admin' | 'user'

    if (requireAdmin && role !== 'admin') {
      setErr('تم تسجيل الدخول، لكن لا تملك صلاحية الأدمن.')
      router.replace('/')
      return
    }

    // التحويل: الأدمن إلى /admin، غير ذلك إلى next أو fallback
    router.replace(role === 'admin' ? '/admin' : nextParam || redirectFallback)
    router.refresh()
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    setPending(true)

    try {
      const { error } = await supabaseBrowser.auth.signInWithPassword({ email, password })
      if (error) {
        setErr('فشل تسجيل الدخول: ' + error.message)
        return
      }
      await afterSessionEstablished('/')
    } catch {
      setErr('حدث خطأ غير متوقع أثناء تسجيل الدخول.')
    } finally {
      setPending(false)
    }
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    setErr('')

    try {
      // نعيد المستخدم لصفحة الكولباك مع تمرير redirect للعودة لاحقًا
      const redirectTo = `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(
        nextParam || '/'
      )}`

      const { error } = await supabaseBrowser.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      })

      if (error) setErr('فشل تسجيل الدخول باستخدام Google: ' + error.message)
    } catch {
      setErr('حدث خطأ أثناء محاولة التسجيل باستخدام Google')
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleLogin}
      className="bg-white text-[#26333f] p-8 rounded-lg shadow-lg w-full max-w-md"
    >
      <h2 className="text-2xl font-bold mb-6 text-center">
        {requireAdmin ? 'تسجيل دخول الأدمن' : 'تسجيل الدخول'}
      </h2>

      {err && <p className="text-red-600 mb-4 text-center text-sm">{err}</p>}

      {/* زر Google */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={googleLoading}
        className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 mb-6"
      >
        {googleLoading ? (
          <span className="text-sm">جاري التحميل...</span>
        ) : (
          <>
            <Image src="/google-icon.svg" alt="Google" width={20} height={20} className="mr-2" />
            <span>الدخول باستخدام Google</span>
          </>
        )}
      </button>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">أو</span>
        </div>
      </div>

      {/* البريد وكلمة المرور */}
      <input
        type="email"
        placeholder="البريد الإلكتروني"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full border border-gray-300 rounded px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-[#b89c70] focus:border-transparent"
        required
        autoComplete="email"
      />

      <input
        type="password"
        placeholder="كلمة المرور"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full border border-gray-300 rounded px-4 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-[#b89c70] focus:border-transparent"
        required
        autoComplete="current-password"
      />

      <button
        type="submit"
        disabled={pending}
        className="bg-[#b89c70] text-white w-full py-2 rounded hover:bg-[#a68c60] disabled:opacity-60 transition-colors"
      >
        {pending ? 'جاري الدخول…' : 'دخول'}
      </button>
    </form>
  )
}
