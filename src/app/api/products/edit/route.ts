import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// ===== أنواع الطلب =====
type Body = {
  id: string | number

  // الأساسية
  title?: string
  price?: number
  slug?: string | null
  image_url?: string // إن كنت تستخدم "image_url" في products
  cover_url?: string // توافقاً مع المشروع القديم؛ سنحوّله إلى image_url إن وُجد
  rating?: number | null
  category_id?: string | number
  brand_id?: string | number | null
  description?: string | null
  is_new?: boolean
  is_trending?: boolean
  discount_percent?: number
  stock?: number

  // تخصّص الهواتف/الإكسسوارات
  is_accessory?: boolean | null
  primary_color_name?: string | null
  primary_color_hex?: string | null
  similar_colors?: string[] | null // مصفوفة ألوان قريبة (أسماء أو hex)
}

// ===== أدوات مساعدة =====
function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function isHex(s?: string | null) {
  if (!s) return false
  return /^#?[0-9a-fA-F]{6}$/.test(s)
}

function normalizeHex(s?: string | null) {
  if (!s) return null
  const v = s.startsWith('#') ? s : `#${s}`
  return v.toLowerCase()
}

function validateRequired(b: Partial<Body>) {
  const errors: string[] = []
  if (b.id === undefined || b.id === null) errors.push('المعرّف (id) مطلوب')
  if (!b.title?.trim()) errors.push('العنوان مطلوب')
  if (b.price == null || Number.isNaN(Number(b.price)) || Number(b.price) < 0)
    errors.push('السعر غير صالح')

  // نقبل cover_url أو image_url (إحداهما)
  const image = b.image_url ?? b.cover_url
  if (!image?.trim() || !/^https?:\/\//i.test(image))
    errors.push('رابط الصورة يجب أن يبدأ بـ http/https')

  if (b.rating != null && (Number(b.rating) < 0 || Number(b.rating) > 5))
    errors.push('التقييم يجب أن يكون بين 0 و 5')

  if (b.category_id === undefined || b.category_id === null)
    errors.push('category_id مطلوب')

  if (b.primary_color_hex && !isHex(b.primary_color_hex))
    errors.push('صيغة اللون الأساسية (HEX) غير صحيحة (مثال: #112233)')

  return errors
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role key
)

export async function PUT(req: Request) {
  try {
    // ===== التحقق من التوكن =====
    const authHeader = req.headers.get('authorization') ?? ''
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

    // ===== التحقق من الدور (أدمن فقط) =====
    const { data: profile, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profErr || (profile?.role ?? 'user') !== 'admin') {
      return NextResponse.json({ ok: false, message: 'Forbidden: Admin role required' }, { status: 403 })
    }

    // ===== قراءة الجسم + فحص =====
    const body = (await req.json()) as Partial<Body>
    const errors = validateRequired(body)
    if (errors.length) {
      return NextResponse.json({ ok: false, message: errors.join(' | ') }, { status: 400 })
    }

    const idNum = Number(body.id)
    if (!Number.isFinite(idNum)) {
      return NextResponse.json({ ok: false, message: 'id يجب أن يكون رقمًا صالحًا' }, { status: 400 })
    }
    const matchId = idNum

    // ===== التأكد من وجود المنتج =====
    const { data: product, error: productErr } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', matchId)
      .maybeSingle()

    if (productErr || !product) {
      return NextResponse.json({ ok: false, message: 'لم يتم العثور على المنتج.' }, { status: 404 })
    }

    // ===== بناء Patch للتحديث =====
    const patch: Record<string, unknown> = {}

    if (body.title !== undefined)               patch.title = String(body.title).trim()
    if (body.price !== undefined)               patch.price = Number(body.price)
    if (body.slug !== undefined)                patch.slug = (body.slug?.toString().trim() || null)

    const img = body.image_url ?? body.cover_url
    if (img !== undefined)                      patch.image_url = String(img).trim()

    if (body.rating !== undefined)              patch.rating = body.rating == null ? null : Number(body.rating)

    if (body.category_id !== undefined) {
      const cidNum = Number(body.category_id)
      patch.category_id = Number.isFinite(cidNum) ? cidNum : body.category_id
    }

    if (body.brand_id !== undefined) {
      if (body.brand_id === null) {
        patch.brand_id = null
      } else {
        const bidNum = Number(body.brand_id)
        patch.brand_id = Number.isFinite(bidNum) ? bidNum : body.brand_id
      }
    }

    if (body.description !== undefined)         patch.description = (body.description?.toString().trim() || null)
    if (body.is_new !== undefined)              patch.is_new = Boolean(body.is_new)
    if (body.is_trending !== undefined)         patch.is_trending = Boolean(body.is_trending)
    if (body.discount_percent !== undefined)    patch.discount_percent = clamp(Number(body.discount_percent) || 0, 0, 90)
    if (body.stock !== undefined)               patch.stock = Math.max(0, Number(body.stock) || 0)

    // حقول الهواتف/الإكسسوارات الإضافية
    if (body.is_accessory !== undefined)        patch.is_accessory = body.is_accessory === null ? null : Boolean(body.is_accessory)
    if (body.primary_color_name !== undefined)  patch.primary_color_name = body.primary_color_name?.toString().trim() || null
    if (body.primary_color_hex !== undefined)   patch.primary_color_hex = body.primary_color_hex ? normalizeHex(body.primary_color_hex) : null
    if (body.similar_colors !== undefined) {
      // تنظيف المصفوفة (تفريغ القيم الفارغة)
      const arr = Array.isArray(body.similar_colors)
        ? body.similar_colors.map((v) => String(v).trim()).filter(Boolean)
        : null
      patch.similar_colors = arr && arr.length ? arr : null
    }

    // ===== تنفيذ التحديث =====
    const { data, error: updateErr } = await supabaseAdmin
      .from('products')
      .update(patch)
      .eq('id', matchId)
      .select('id')
      .maybeSingle()

    if (updateErr) {
      return NextResponse.json(
        { ok: false, message: 'خطأ أثناء تحديث المنتج: ' + updateErr.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { ok: true, message: 'تم تحديث المنتج بنجاح', id: data?.id },
      { status: 200 }
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, message: 'حدث خطأ غير متوقع: ' + msg }, { status: 500 })
  }
}
