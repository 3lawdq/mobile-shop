'use server'

import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { parse } from 'cookie'

export async function GET(req: Request) {
  const res = NextResponse.json({ ok: true })

  // قراءة الكوكيز
  const reqCookies = parse(req.headers.get('cookie') ?? '') as Record<string, string>

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string): string | undefined {
          return reqCookies?.[name]
        },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set(name, value, options)
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set(name, '', { ...options, maxAge: 0 })
        },
      },
      global: req.headers.get('authorization')
        ? { headers: { Authorization: req.headers.get('authorization')! } }
        : undefined,
    }
  )

  try {
    // الحصول على بيانات المستخدم
    const { data, error } = await supabase.auth.getUser()

    if (error) {
      return NextResponse.json(
        { ok: false, message: 'فشل في جلب بيانات المستخدم: ' + error.message },
        { status: 401 }
      )
    }

    if (!data?.user) {
      return NextResponse.json(
        { ok: false, message: 'لم يتم العثور على مستخدم مسجل دخول.' },
        { status: 401 }
      )
    }

    return NextResponse.json({ user: data.user, ok: true })
  } catch (e: unknown) {
    // تحويل الاستثناء إلى نص عام إذا لم يحتوي على خاصية message
    const errorMessage = e instanceof Error ? e.message : String(e)
    return NextResponse.json(
      { ok: false, message: 'حدث خطأ غير متوقع: ' + errorMessage },
      { status: 500 }
    )
  }
}
