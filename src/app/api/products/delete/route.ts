import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service Role فقط في الراوتات الخادمية
)

export async function DELETE(req: Request) {
  try {
    // ===== التحقق من التوكن (Bearer) =====
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

    // ===== السماح للأدمن فقط =====
    const { data: profile, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profErr || (profile?.role ?? 'user') !== 'admin') {
      return NextResponse.json({ ok: false, message: 'Forbidden: Admin role required' }, { status: 403 })
    }

    // ===== قراءة المعرّف =====
    const { id } = await req.json().catch((err) => {
      console.error('Error reading request body:', err)
      throw new Error('Failed to parse request body')
    })

    if (!id) {
      return NextResponse.json({ message: 'Missing ID' }, { status: 400 })
    }

    // ===== حذف العلاقات التابعة (لتجنّب تعارضات FK إن لم تكن CASCADE) =====
    // المراجعات الخاصة بالمنتج
    const { error: revErr } = await supabaseAdmin
      .from('reviews_products')
      .delete()
      .eq('product_id', id)
    if (revErr) {
      console.error('Error deleting product reviews:', revErr)
      throw new Error('Error deleting related reviews')
    }

    // صور المنتج (إن وُجد جدول product_images)
    const { error: imgErr } = await supabaseAdmin
      .from('product_images')
      .delete()
      .eq('product_id', id)
    if (imgErr) {
      console.error('Error deleting product images:', imgErr)
      throw new Error('Error deleting related images')
    }

    // عناصر السلة المرتبطة
    const { error: cartItemsErr } = await supabaseAdmin
      .from('cart_items')
      .delete()
      .eq('product_id', id)
    if (cartItemsErr) {
      console.error('Error deleting cart items:', cartItemsErr)
      throw new Error('Error deleting related cart items')
    }

    // المفضلة المرتبطة (إن كانت تُخزن product_id)
    const { error: favErr } = await supabaseAdmin
      .from('favorites')
      .delete()
      .eq('product_id', id)
    if (favErr) {
      console.error('Error deleting favorites:', favErr)
      throw new Error('Error deleting related favorites')
    }

    // ملاحظة: لا نحذف order_items حفاظًا على سجل الطلبات.
    // يُفضّل أن يكون FK هناك ON DELETE SET NULL أو يمنع حذف المنتج إن كان مستخدمًا في طلبات.

    // ===== حذف المنتج نفسه =====
    const { error: prodErr } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', id)

    if (prodErr) {
      console.error('Error deleting product:', prodErr)
      throw new Error('Error deleting the product')
    }

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.error('Internal Server Error:', e.message)
      return NextResponse.json({ message: e.message ?? 'Internal Server Error' }, { status: 500 })
    }
    console.error('Unexpected error:', e)
    return NextResponse.json({ message: 'Unexpected error occurred' }, { status: 500 })
  }
}
