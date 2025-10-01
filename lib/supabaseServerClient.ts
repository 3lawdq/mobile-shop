import { cookies as nextCookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY! // تأكد من هذا المفتاح إذا كنت تستخدمه

if (!url || !key || !serviceRoleKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE')
}

/** واجهة مبسّطة متوافقة مع CookieStore في Next */
type CookieStoreLike = {
  get: (name: string) => { value: string } | string | undefined
  set?: (name: string, value: string, options?: CookieOptions) => void
  delete?: (name: string) => void
}

/** تهيئة موحَّدة لمخزن الكوكيز (إما الممرّر، أو من Next) */
function resolveCookieStore(cookieStore?: CookieStoreLike): CookieStoreLike {
  return cookieStore ?? (nextCookies() as unknown as CookieStoreLike)
}

/**
 * يُنشئ عميل Supabase على الخادم:
 * - يقبل CookieStore خارجي (Route Handler/Server Action) أو يستخدم cookies() من Next.
 * - يطبّق PKCE + إدارة الجلسة عبر الكوكيز.
 */
export function createSupabaseServerClient(cookieStore?: CookieStoreLike) {
  const store = resolveCookieStore(cookieStore)

  return createServerClient(url, key, {
    cookies: {
      get(name: string) {
        const c = store.get(name)
        // دعم القيم المختلفة (Cookie من Next أو string مباشرة)
        return typeof c === 'string' ? c : c?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          store.set?.(name, value, options)
        } catch {
          // قد نكون في سياق قراءة فقط (RSC) — تجاهل بهدوء
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          if (store.delete) {
            store.delete(name)
          } else if (store.set) {
            // بديل آمن إذا لم تتوفر delete
            store.set(name, '', { ...options, maxAge: 0 })
          }
        } catch {
          // تجاهل في سياقات القراءة فقط
        }
      },
    },
    auth: {
      persistSession: false,     // على الخادم لا نحتاج حفظ الجلسة
      autoRefreshToken: true,
      detectSessionInUrl: false, // لا حاجة على الخادم
      flowType: 'pkce',
    },
  })
}

/** تسجيل خروج على الخادم (يناسب Route Handlers/Server Actions) */
export async function serverSignOut() {
  const supabase = createSupabaseServerClient()
  await supabase.auth.signOut()
}

/** جلب المستخدم الحالي على الخادم (آمن للاستخدام في RSC) */
export async function serverGetUser() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}
