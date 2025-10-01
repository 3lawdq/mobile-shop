import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// تأكد من أن المفاتيح البيئية موجودة
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// التحقق من وجود المفاتيح البيئية
if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  throw new Error('supabaseKey is required');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

// إعداد التصنيف الافتراضي
const DEFAULT_CATEGORY_SLUG = 'uncategorized';
const DEFAULT_CATEGORY_NAME = 'غير مصنف';

export async function DELETE(req: Request) {
  try {
    // --- Auth: Bearer token ---
    const authHeader = req.headers.get('authorization') ?? '';
    if (!authHeader) {
      return NextResponse.json({ ok: false, message: 'Unauthorized: Missing token' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
      return NextResponse.json({ ok: false, message: 'Unauthorized: Invalid token format' }, { status: 401 });
    }

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ ok: false, message: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    // --- Role check (admin only) ---
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .or(`id.eq.${user.id},user_id.eq.${user.id}`)
      .maybeSingle();

    if (profileErr || (profile?.role ?? 'user') !== 'admin') {
      return NextResponse.json({ ok: false, message: 'Forbidden: Admin role required' }, { status: 403 });
    }

    // --- Read body ---
    const body = await req.json().catch(() => ({} as { id?: unknown }));
    const id = body?.id;
    if (id === undefined || id === null) {
      return NextResponse.json({ ok: false, message: 'المعرّف (id) مطلوب' }, { status: 400 });
    }

    const idNum = Number(id);
    const matchId = Number.isFinite(idNum) ? idNum : String(id);

    // --- Make sure the category to delete exists ---
    const { data: cat, error: catErr } = await supabaseAdmin
      .from('categories')
      .select('id, slug')
      .eq('id', matchId)
      .maybeSingle();

    if (catErr || !cat) {
      return NextResponse.json({ ok: false, message: 'التصنيف غير موجود' }, { status: 404 });
    }

    // --- Ensure default category exists (for reassignment) ---
    let defaultCategoryId: number | string | null = null;

    const { data: existingDefault } = await supabaseAdmin
      .from('categories')
      .select('id')
      .eq('slug', DEFAULT_CATEGORY_SLUG)
      .maybeSingle();

    if (existingDefault?.id) {
      defaultCategoryId = existingDefault.id;
    } else {
      // أنشئ التصنيف الافتراضي إذا لم يكن موجودًا
      const { data: created, error: createDefaultErr } = await supabaseAdmin
        .from('categories')
        .insert({
          name: DEFAULT_CATEGORY_NAME,
          slug: DEFAULT_CATEGORY_SLUG,
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (createDefaultErr || !created?.id) {
        return NextResponse.json(
          { ok: false, message: 'تعذّر إنشاء التصنيف الافتراضي لإعادة ربط المنتجات' },
          { status: 500 }
        );
      }
      defaultCategoryId = created.id;
    }

    // منع حالة حذف التصنيف الافتراضي نفسه
    if (String(cat.id) === String(defaultCategoryId)) {
      return NextResponse.json(
        { ok: false, message: 'لا يمكن حذف التصنيف الافتراضي' },
        { status: 400 }
      );
    }

    // --- Reassign products belonging to this category to default category ---
    const { error: reassignmentErr } = await supabaseAdmin
      .from('products')
      .update({ category_id: defaultCategoryId })
      .eq('category_id', matchId);

    if (reassignmentErr) {
      return NextResponse.json(
        { ok: false, message: 'فشل تحديث المنتجات المرتبطة: ' + reassignmentErr.message },
        { status: 500 }
      );
    }

    // --- Delete the category ---
    const { error: deleteErr } = await supabaseAdmin
      .from('categories')
      .delete()
      .eq('id', matchId);

    if (deleteErr) {
      return NextResponse.json(
        { ok: false, message: 'فشل حذف التصنيف: ' + deleteErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, message: 'تم حذف التصنيف' }, { status: 200 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, message: 'خطأ غير متوقع: ' + msg }, { status: 500 });
  }
}

// (اختياري) دعم POST لنفس السلوك
export const POST = DELETE;
