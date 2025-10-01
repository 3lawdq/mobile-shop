import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  // ✳️ مرّر طلبات OPTIONS مباشرة (CORS)
  if (req.method === 'OPTIONS') {
    return NextResponse.next();
  }

  // ✳️ اختياري: لو وسّعت الـ matcher لاحقًا، تأكد من استثناء مسارات الأوث
  const pathname = req.nextUrl.pathname;
  if (pathname.startsWith('/auth/')) {
    return NextResponse.next();
  }

  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set({ name, value, ...options } as any);
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set({ name, value: '', ...options, maxAge: 0 } as any);
        },
      },
    }
  );

  // يُحدّث كوكيز الجلسة تلقائياً إن لزم
  const { data: { session } } = await supabase.auth.getSession();

  // حماية مسارات الإدارة
  const isAdminRoute = pathname.startsWith('/admin') && pathname !== '/admin/login';

  if (isAdminRoute) {
    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = '/admin/login';
      return NextResponse.redirect(url);
    }

    // جلب الدور من profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', session.user.id)
      .maybeSingle();

    const role = profile?.role ?? 'user';
    if (role !== 'admin') {
      const url = req.nextUrl.clone();
      url.pathname = '/admin/login';
      return NextResponse.redirect(url);
    }

    // كوكي الدور (مفيد للواجهة)
    res.cookies.set('sb-role', role, {
      path: '/',
      sameSite: 'lax',
      httpOnly: false, // لو تحتاج قراءته بالعميل
      secure: process.env.NODE_ENV === 'production', // ✅ للإنتاج
      maxAge: 60 * 60 * 24 * 7, // أسبوع
    });
  }

  return res;
}

// ✅ الميدلوير فعّال فقط على /admin و /api — لا يمس /auth/callback
export const config = {
  matcher: [
    '/admin/:path*',
    '/api/:path*',
  ],
};
