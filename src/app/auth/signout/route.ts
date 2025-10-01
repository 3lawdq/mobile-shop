// src/app/auth/signout/route.ts
'use server'

import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { parse } from 'cookie'

// POST: sign out
export async function POST(req: Request) {
  const res = NextResponse.json({ ok: true })

  // قراءة الكوكيز من الطلب
  const reqCookieHeader = req.headers.get('cookie') ?? ''
  const requestCookies = parse(reqCookieHeader)

  // تهيئة Supabase client مع adapter للكوكيز
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return requestCookies[name]
        },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set(name, value, options)
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set(name, '', { ...options, maxAge: 0 })
        },
      },
    }
  )

  // إنهاء الجلسة
  try {
    await supabase.auth.signOut()
  } catch (error) {
    console.error('Sign out error:', error)
  }

  // تنظيف كوكي الدور (إن استُخدم)
  res.cookies.set('sb-role', '', {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
  })

  return res
}

// دعم GET بنفس السلوك
export const GET = POST
