import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service Role Key مطلوبة للحذف/التعديل
)

async function handle(req: Request) {
  try {
    // ===== تحقق المصادقة =====
    const authHeader = req.headers.get('authorization') ?? ''
    if (!authHeader) {
      return NextResponse.json({ ok: false, message: 'Unauthorized: Missing token' }, { status: 401 })
    }
    const token = authHeader.split(' ')[1]
    if (!token) {
      return NextResponse.json({ ok: false, message: 'Unauthorized: Invalid token format' }, { status: 401 })
    }

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)
    if (authErr || !user) {
      return NextResponse.json({ ok: false, message: 'Unauthorized: Invalid token' }, { status: 401 })
    }

    // ===== تحقق الدور (أدمن) =====
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .or(`id.eq.${user.id},user_id.eq.${user.id}`)
      .maybeSingle()

    const role = profile?.role ?? 'user'
    if (profileErr || role !== 'admin') {
      return NextResponse.json({ ok: false, message: 'Forbidden: Admin role required' }, { status: 403 })
    }

    // ===== قراءة الـ id =====
    const body = await req.json().catch(() => ({} as { id?: string | number }))
    const id = body?.id
    if (id === undefined || id === null) {
      return NextResponse.json({ ok: false, message: 'المعرّف (id) مطلوب' }, { status: 400 })
    }

    // توحيد المعرف: رقم أو نص (يدعم جداول معرفاتها نصية)
    const idNum = Number(id)
    const matchId = Number.isFinite(idNum) ? idNum : String(id)

    // ===== إيجاد بديل (اختياري) لربط المنتجات قبل الحذف =====
    // نحاول إيجاد brand بديل مثل other / غير-محدد / unbranded
    let fallbackBrandId: number | string | null = null
    const { data: fallback } = await supabaseAdmin
      .from('brands')
      .select('id, slug')
      .in('slug', ['other', 'غير-محدد', 'unbranded'])
      .limit(1)
      .maybeSingle()

    if (fallback) fallbackBrandId = fallback.id

    // ===== تحديث المنتجات المرتبطة =====
    // جدول المنتجات هو "products" ونربط بالحقل brand_id
    const { error: productsUpdateErr } = await supabaseAdmin
      .from('products')
      .update({ brand_id: fallbackBrandId ?? null })
      .eq('brand_id', matchId)

    if (productsUpdateErr) {
      return NextResponse.json(
        { ok: false, message: 'فشل تحديث المنتجات المرتبطة: ' + productsUpdateErr.message },
        { status: 500 }
      )
    }

    // ===== حذف العلامة التجارية =====
    const { error: delErr } = await supabaseAdmin
      .from('brands')
      .delete()
      .eq('id', matchId)

    if (delErr) {
      return NextResponse.json(
        { ok: false, message: 'فشل حذف العلامة التجارية: ' + delErr.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, message: 'تم حذف العلامة التجارية' }, { status: 200 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ ok: false, message: 'Unexpected error: ' + msg }, { status: 500 })
  }
}

export async function DELETE(req: Request) { return handle(req) }
export async function POST(req: Request)   { return handle(req) }
