import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = 'force-dynamic'

/**
 * مخطط الإدخال للمنتج (هواتف/إكسسوارات)
 * - حافظنا على نفس روح ملف الكتب مع توسعة الحقول الخاصة بالهواتف:
 *   device_id (هوية/موديل)، primary_color (اللون الأساسي)، similar_color (لون مقارب).
 * - brand_id اختياري لكن مُستحسن للهواتف.
 */
type AddProductBody = {
  title: string
  price: number
  slug?: string | null
  image_url: string            // الصورة الرئيسية
  rating?: number | null
  category_id: string | number | null
  brand_id?: string | number | null
  description?: string | null
  is_new?: boolean
  is_trending?: boolean
  discount_percent?: number | null
  stock?: number | null

  // إضافات متجر الهواتف
  device_id?: string | null     // هوية/موديل الجهاز (SKU/Model)
  primary_color?: string | null // اللون الأساسي (hex أو اسم)
  similar_color?: string | null // لون مقارب/ثانوي
}

/** توليد slug عربي/لاتيني آمن */
function toSlug(input: string): string {
  const s = (input || '').trim().toLowerCase()
  return s
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/** التحقق من بيانات المنتج */
function validateProductData(body: Partial<AddProductBody>): string[] {
  const errors: string[] = []

  if (!body.title?.trim()) errors.push('الاسم/العنوان مطلوب')

  if (body.price == null || Number.isNaN(Number(body.price)) || Number(body.price) < 0) {
    errors.push('السعر غير صالح')
  }

  if (!body.image_url?.trim() || !/^https?:\/\//i.test(String(body.image_url))) {
    errors.push('رابط الصورة يجب أن يبدأ بـ http/https')
  }

  if (body.rating != null) {
    const r = Number(body.rating)
    if (Number.isNaN(r) || r < 0 || r > 5) errors.push('التقييم يجب أن يكون بين 0 و 5')
  }

  if (body.category_id == null || body.category_id === '') {
    errors.push('التصنيف مطلوب')
  }

  if (body.discount_percent != null) {
    const d = Number(body.discount_percent)
    if (Number.isNaN(d) || d < 0 || d > 90) errors.push('نسبة الخصم يجب أن تكون بين 0 و 90')
  }

  if (body.stock != null) {
    const s = Number(body.stock)
    if (Number.isNaN(s) || s < 0) errors.push('المخزون لا يمكن أن يكون سالبًا')
  }

  // اختياري: لو أردت فرض device_id على الهواتف فقط يمكن فحص category لاحقًا
  if (body.device_id != null && String(body.device_id).length > 64) {
    errors.push('هوية الجهاز device_id طويلة جدًا')
  }

  return errors
}

export async function POST(req: Request) {
  try {
    // ===== تحقق الـ Bearer =====
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ ok: false, message: 'Unauthorized: Missing token' }, { status: 401 })
    }
    const token = authHeader.split(' ')[1]
    if (!token) {
      return NextResponse.json({ ok: false, message: 'Unauthorized: Invalid token format' }, { status: 401 })
    }

    const {
      data: { user },
      error: authErr,
    } = await supabaseAdmin.auth.getUser(token)
    if (authErr || !user) {
      return NextResponse.json({ ok: false, message: 'Unauthorized: Invalid token' }, { status: 401 })
    }

    // ===== تحقق الدور (أدمن) =====
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()

    if ((profile?.role ?? 'user') !== 'admin') {
      return NextResponse.json({ ok: false, message: 'Forbidden: Admin role required' }, { status: 403 })
    }

    // ===== قراءة الجسم + توليد slug + فاليديشن =====
    const body = (await req.json()) as Partial<AddProductBody>
    if (!body.slug) body.slug = toSlug(body.title || '')

    const errors = validateProductData(body)
    if (errors.length) {
      return NextResponse.json({ ok: false, message: errors.join(' | ') }, { status: 400 })
    }

    // تطبيع الأنواع للأرقام/النصوص
    const toId = (v: unknown) => {
      if (v == null || v === '') return null
      const n = Number(v)
      return Number.isFinite(n) ? n : String(v)
    }

    const category_id = toId(body.category_id)
    const brand_id = toId(body.brand_id)

    // ===== تحضير الحمولة للإدراج =====
    const payload = {
      title: body.title!.trim(),
      price: Number(body.price),
      slug: body.slug!.trim(),
      image_url: body.image_url!.trim(),
      rating: body.rating == null ? null : Number(body.rating),
      category_id,
      brand_id,
      description: body.description?.trim() || null,
      is_new: !!body.is_new,
      is_trending: !!body.is_trending,
      discount_percent:
        body.discount_percent == null
          ? 0
          : Math.max(0, Math.min(90, Math.floor(Number(body.discount_percent)))),
      stock:
        body.stock == null
          ? 0
          : Math.max(0, Math.floor(Number(body.stock))),

      // إضافات الهواتف
      device_id: body.device_id?.trim() || null,
      primary_color: body.primary_color?.trim() || null,
      similar_color: body.similar_color?.trim() || null,
    }

    // ===== فحوصات فريدة (slug / device_id) =====
    const { data: existsSlug } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('slug', payload.slug)
      .limit(1)
      .maybeSingle()

    if (existsSlug) {
      return NextResponse.json({ ok: false, message: 'الـ slug مستخدم مسبقًا' }, { status: 409 })
    }

    if (payload.device_id) {
      const { data: existsDevice } = await supabaseAdmin
        .from('products')
        .select('id')
        .eq('device_id', payload.device_id)
        .limit(1)
        .maybeSingle()

      if (existsDevice) {
        return NextResponse.json({ ok: false, message: 'هوية الجهاز (device_id) مستخدمة مسبقًا' }, { status: 409 })
      }
    }

    // ===== الإدراج =====
    const { data, error } = await supabaseAdmin
      .from('products')
      .insert(payload)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json(
        { ok: false, message: 'حدث خطأ أثناء إضافة المنتج: ' + error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { ok: true, message: 'تمت إضافة المنتج بنجاح', product: data },
      { status: 201 }
    )
  } catch (e) {
    console.error('Unexpected error:', e)
    return NextResponse.json({ ok: false, message: 'خطأ في صيغة الطلب' }, { status: 400 })
  }
}
