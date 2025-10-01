'use server'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// مولّد slug يدعم العربية ويزيل التشكيل/الرموز غير المسموحة
function toSlug(input: string) {
  const s = (input || '').trim().toLowerCase()
  return s
    .replace(/\s+/g, '-')               // مسافات → -
    .replace(/[^\p{L}\p{N}-]+/gu, '')   // أحرف/أرقام/شرطة فقط (يدعم العربية)
    .replace(/-+/g, '-')                // دمج الشرطات المتتابعة
    .replace(/^-|-$/g, '')              // إزالة الشرطة من الطرفين
}

async function handle(req: Request) {
  try {
    // ===== مصادقة بالتوكن =====
    const authHeader = req.headers.get('authorization') ?? ''
    if (!authHeader) {
      return NextResponse.json({ ok: false, message: 'Unauthorized: Missing token' }, { status: 401 })
    }
    const token = authHeader.split(' ')[1]
    if (!token) {
      return NextResponse.json({ ok: false, message: 'Unauthorized: Invalid token format' }, { status: 401 })
    }

    // عميل Supabase بخدمة الدور (للتعديل)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // التحقق من صحة التوكن
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
      return NextResponse.json({ ok: false, message: 'Forbidden: Admin role required' }, { status: 403 })
    }

    // ===== قراءة الجسم والتحقق =====
    type Body = {
      id: string | number
      name?: string
      slug?: string | null
      logo_url?: string | null
      country?: string | null
      website?: string | null
      primary_color?: string | null     // لون الهوية الأساسي (Hex/RGB...)
      similar_color?: string | null     // لون مقارب/مساند
      description?: string | null
    }

    const body = (await req.json().catch(() => ({}))) as Partial<Body>

    const errors: string[] = []
    if (body.id === undefined || body.id === null) errors.push('المعرّف (id) مطلوب')
    if (!body.name?.trim()) errors.push('اسم العلامة مطلوب')

    const nextSlug = toSlug(body.slug || body.name || '')
    if (!nextSlug) errors.push('slug غير صالح')

    if (errors.length) {
      return NextResponse.json({ ok: false, message: errors.join(' | ') }, { status: 400 })
    }

    // توحيد المعرف (رقم أو نص)
    const idNum = Number(body.id)
    const matchId = Number.isFinite(idNum) ? idNum : String(body.id)

    // التأكد من تفرد الـ slug لعلامة أخرى
    const { data: existing } = await supabase
      .from('brands')
      .select('id')
      .eq('slug', nextSlug)
      .neq('id', matchId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { ok: false, message: 'هناك علامة تجارية أخرى بنفس الـ slug. اختر قيمة مختلفة.' },
        { status: 409 }
      )
    }

    // تجهيز بيانات التحديث
    const patch: Record<string, unknown> = {
      name: body.name!.trim(),
      slug: nextSlug,
    }

    if (body.logo_url !== undefined)     patch.logo_url     = body.logo_url?.toString().trim() || null
    if (body.country !== undefined)      patch.country      = body.country?.toString().trim() || null
    if (body.website !== undefined)      patch.website      = body.website?.toString().trim() || null
    if (body.primary_color !== undefined)patch.primary_color= body.primary_color?.toString().trim() || null
    if (body.similar_color !== undefined)patch.similar_color= body.similar_color?.toString().trim() || null
    if (body.description !== undefined)  patch.description  = body.description?.toString().trim() || null

    // التحديث
    const { data, error } = await supabase
      .from('brands')
      .update(patch)
      .eq('id', matchId)
      .select('id,name,slug,logo_url,country,website,primary_color,similar_color,description,updated_at')
      .maybeSingle()

    if (error) {
      return NextResponse.json(
        { ok: false, message: 'فشل التحديث: ' + error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { ok: false, message: 'لم يتم العثور على العلامة أو لا تملك صلاحية تعديلها.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ ok: true, brand: data }, { status: 200 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ ok: false, message: 'Unexpected error: ' + msg }, { status: 500 })
  }
}

export async function PUT(req: Request)  { return handle(req) }
export async function POST(req: Request) { return handle(req) }
