'use server'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'  // استخدام createClient من @supabase/supabase-js

// مولّد الـ slug يدعم العربية ويزيل التشكيل
function toSlug(input: string) {
  const s = (input || '').trim().toLowerCase()
  return s
    .replace(/\s+/g, '-')              // مسافات → -
    .replace(/[^\p{L}\p{N}-]+/gu, '')  // إبقاء أحرف/أرقام/شرطة فقط (يدعم العربية)
    .replace(/-+/g, '-')               // دمج الشرطات
    .replace(/^-|-$/g, '')             // إزالة الشرطة من الطرفين
}

async function handle(req: Request) {
  // استخراج التوكن من الهيدر
  const authHeader = req.headers.get('authorization') ?? ''
  if (!authHeader) {
    return NextResponse.json({ ok: false, message: 'Unauthorized: Missing token' }, { status: 401 })
  }
  const token = authHeader.split(' ')[1] // استخراج التوكن من الهيدر (Bearer token)
  if (!token) {
    return NextResponse.json({ ok: false, message: 'Unauthorized: Invalid token format' }, { status: 401 })
  }

  // عميل Supabase خادمي (بدون الكوكيز المخصصة)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!  // استخدم Service Role Key هنا
  )

  // التحقق من صحة التوكن باستخدام supabase.auth
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) {
    return NextResponse.json({ ok: false, message: 'Unauthorized: Invalid token' }, { status: 401 })
  }

  // التحقق من صلاحية الأدمن
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('role')
    .or(`id.eq.${user.id},user_id.eq.${user.id}`)
    .maybeSingle()

  const role = profile?.role ?? 'user'
  if (profileErr || role !== 'admin') {
    return NextResponse.json(
      { ok: false, message: 'Forbidden: Admin role required' },
      { status: 403 }
    )
  }

  // قراءة الجسم للتحقق من وجود الـ id
  const body = await req.json().catch(() => ({} as { id?: unknown; name?: string; slug?: string }))
  const errors: string[] = []
  if (body.id === undefined || body.id === null) errors.push('المعرّف (id) مطلوب')
  if (!body.name?.trim()) errors.push('الاسم مطلوب')

  const nextSlug = toSlug(body.slug || body.name || '')
  if (!nextSlug) errors.push('slug غير صالح')

  if (errors.length) {
    return NextResponse.json({ ok: false, message: errors.join(' | ') }, { status: 400 })
  }

  // توحيد المعرف
  const idNum = Number(body.id)
  const matchId = Number.isFinite(idNum) ? idNum : String(body.id)

  // تحقق تفرد الـ slug
  const { data: existing } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', nextSlug)
    .neq('id', matchId)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { ok: false, message: 'هناك تصنيف آخر بنفس الـ slug. اختر قيمة مختلفة.' },
      { status: 409 }
    )
  }

  // التحديث
  const { data, error } = await supabase
    .from('categories')
    .update({ name: body.name!.trim(), slug: nextSlug })
    .eq('id', matchId)
    .select('id,name,slug')
    .maybeSingle()

  if (error) {
    return NextResponse.json(
      { ok: false, message: 'فشل التحديث: ' + error.message },
      { status: 500 }
    )
  }

  if (!data) {
    return NextResponse.json(
      { ok: false, message: 'لم يتم العثور على التصنيف أو لا تملك صلاحية تعديله.' },
      { status: 404 }
    )
  }

  return NextResponse.json({ ok: true, category: data }, { status: 200 })
}

// استخدم نفس الدالة لجميع الطلبات
export async function PUT(req: Request) {
  return handle(req)
}

export async function POST(req: Request) {
  return handle(req)
}
