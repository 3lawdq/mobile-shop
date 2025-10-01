import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type Body = {
  name?: string
  slug?: string | null
}

function validate({ name, slug }: Body): string[] {
  const errors: string[] = []
  if (!name?.trim()) errors.push('اسم التصنيف مطلوب')
  if (!slug?.trim()) errors.push('الـ slug مطلوب')

  if (slug) {
    const s = slug.trim()
    if (!/^[a-z0-9-]+$/.test(s)) {
      errors.push('الـ slug يجب أن يكون أحرفًا إنجليزية وأرقامًا وشرطات فقط (kebab-case)')
    }
  }
  return errors
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service Role Key
)

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') ?? ''
    if (!authHeader) {
      return NextResponse.json({ ok: false, message: 'Unauthorized: Missing token' }, { status: 401 })
    }
    const token = authHeader.split(' ')[1]
    if (!token) {
      return NextResponse.json({ ok: false, message: 'Unauthorized: Invalid token format' }, { status: 401 })
    }

    // تحقق المستخدم من Supabase
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)
    if (authErr || !user) {
      return NextResponse.json({ ok: false, message: 'Unauthorized: Invalid token' }, { status: 401 })
    }

    // السماح للأدمن فقط
    const { data: profile, error: profileErr } = await supabaseAdmin
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

    // قراءة الجسم + التحقق
    const body = (await req.json()) as Body
    const errors = validate(body)
    if (errors.length) {
      return NextResponse.json(
        { ok: false, message: errors.join(' | ') },
        { status: 400 }
      )
    }

    const name = body.name!.trim()
    const slug = body.slug!.trim()

    // تفرد الـ slug
    const { data: exists } = await supabaseAdmin
      .from('categories')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (exists) {
      return NextResponse.json(
        { ok: false, message: 'الـ slug مستخدم مسبقًا' },
        { status: 409 }
      )
    }

    // الإدخال
    const { data, error } = await supabaseAdmin
      .from('categories')
      .insert({ name, slug, created_at: new Date().toISOString() })
      .select('*')
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json(
        { ok: false, message: 'حدث خطأ أثناء إضافة التصنيف: ' + error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        ok: true,
        message: 'تمت إضافة التصنيف بنجاح',
        category: {
          id: String(data.id),
          name: data.name,
          slug: data.slug,
          created_at: data.created_at,
        },
      },
      { status: 201 }
    )
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Unexpected error:', msg)
    return NextResponse.json(
      { ok: false, message: 'خطأ في صيغة الطلب' },
      { status: 400 }
    )
  }
}
