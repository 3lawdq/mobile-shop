// src/app/profile/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { supabaseBrowser as supabase } from '@lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { Loader2, Pencil, Save, X, LogOut } from 'lucide-react';

const PageSeo = dynamic(() => import('@/components/PageSeo'), { ssr: false });

type ProfileRow = {
  id: string;        // uuid
  user_id: string;   // equals auth.user.id
  role: string;      // 'user' | 'admin' ...
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  email: string | null;
  updated_at: string; // timestamptz
};

type OrderItem = {
  id?: string;
  title?: string;
  quantity?: number;
  image?: string;
};

type OrderRow = {
  id: string;
  user_id: string;
  created_at: string;
  status: string | null;
  total: number | null;
  items: OrderItem[] | null; // jsonb
};

const formatCurrency = (n?: number | null) =>
  typeof n === 'number' && !Number.isNaN(n) ? `${n.toFixed(2)} ر.س` : '—';

const formatDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('ar-SA') : '—';

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [authName, setAuthName] = useState<string | null>(null);
  const [authAvatar, setAuthAvatar] = useState<string | null>(null);
  const [authPhone, setAuthPhone] = useState<string | null>(null);

  const [hasProfile, setHasProfile] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const [orders, setOrders] = useState<OrderRow[]>([]);

useEffect(() => {
  const fetchData = async () => {
    setLoading(true);
    
    // 1) جلب المستخدم
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr) {
      console.error(userErr);
      toast.error('تعذر التحقق من جلسة المستخدم.');
      setLoading(false);
      return;
    }
    if (!user) {
      setAuthUserId(null);
      setLoading(false);
      return;
    }

    setAuthUserId(user.id);
    setAuthEmail(typeof user.email === 'string' ? user.email : null);

    // ميتاداتا بشكل آمن
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const m = (k: string) => (typeof meta[k] === 'string' ? (meta[k] as string) : null);

    const metaAvatar = m('avatar_url') ?? m('picture') ?? null;

    setAuthName(m('name') ?? m('full_name'));
    setAuthAvatar(metaAvatar);
    setAuthPhone(m('phone_number'));

    // 2) جلب/إنشاء بروفايل
    let profileRow: ProfileRow | null = null;

    const { data: p, error: pErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle<ProfileRow>();

    if (pErr) {
      console.error(pErr);
      toast.error('حدث خطأ أثناء جلب بيانات الحساب.');
    }

    if (p) {
      profileRow = p;
    } else {
      // ✳️ لا يوجد صف — ننشئه تلقائيًا بـ upsert على user_id
      const payload = {
        user_id: user.id,  // تأكد من أن user_id هو نفس الـ JWT
        full_name: fullName.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        updated_at: new Date().toISOString(), // إضافة تاريخ التعديل
      };

      console.log("Upsert Payload:", payload); // لتوضيح البيانات التي يتم إرسالها

      const { data: created, error: cErr } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'user_id' })
        .select()
        .single<ProfileRow>();

      if (cErr) {
        console.error('create profile error:', cErr); // طباعة الخطأ بالكامل
        toast.error(`حدث خطأ أثناء إنشاء البروفايل: ${JSON.stringify(cErr)}`);
        profileRow = null;
      } else {
        profileRow = created;
      }
    }

    // 3) ملء حالة الواجهة
    if (profileRow) {
      setHasProfile(true);
      setIsEditing(false);
      setFullName(profileRow.full_name ?? '');
      setPhone(profileRow.phone ?? '');
      setEmail(profileRow.email ?? (user.email ?? ''));
      setAvatarUrl(profileRow.avatar_url ?? (metaAvatar ?? ''));
      setUpdatedAt(profileRow.updated_at ?? null);
    } else {
      setHasProfile(false);
      setIsEditing(false);
      setFullName(m('name') ?? m('full_name') ?? '');
      setPhone(m('phone_number') ?? '');
      setEmail(user.email ?? '');
      setAvatarUrl(metaAvatar ?? '');
      setUpdatedAt(null);
    }

    // 4) الطلبات الأخيرة
    const { data: ord, error: oErr } = await supabase
      .from('orders')
      .select('id,user_id,created_at,status,total,items')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (oErr) {
      console.error(oErr);
      toast.error('تعذر جلب الطلبات.');
    } else {
      setOrders((ord ?? []) as OrderRow[]);
    }

    setLoading(false);
  };

  fetchData();
}, []);


const handleSave = async () => {
  if (!authUserId) return;
  setSaving(true);

  try {
    const payload = {
      user_id: authUserId,
      full_name: fullName.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      avatar_url: avatarUrl.trim() || null,
      updated_at: new Date().toISOString(), // إضافة تاريخ التعديل
    };

    console.log("Saving Payload:", payload); // توضيح البيانات التي يتم إرسالها عند الحفظ

    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single<ProfileRow>();

    if (error) {
      const msg = error?.message || String(error);
      console.error('Error during upsert:', msg);
      toast.error(`تعذر حفظ البيانات: ${msg}`);

      return;
    }

    setHasProfile(true);
    setIsEditing(false);
    setUpdatedAt(data?.updated_at ?? new Date().toISOString()); // تعيين تاريخ التعديل الجديد
    toast.success('✅ تم حفظ بيانات الحساب بنجاح');
  } catch (e: unknown) {
    console.error('save profile failed:', e);
    if (e instanceof Error) {
      toast.error(e.message || 'تعذر حفظ البيانات. تأكد من الصلاحيات ومن أن رقم الجوال غير مستخدم.');
    } else {
      toast.error('تعذر حفظ البيانات. حدث خطأ غير متوقع.');
    }
  } finally {
    setSaving(false);
  }
};





  if (loading) {
    return (
      <div className="bg-white text-gray-900 min-h-screen pt-24 px-6 font-[Cairo]">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 text-gray-700">
            <Loader2 className="animate-spin" />
            <span>جاري التحميل…</span>
          </div>
        </div>
      </div>
    );
  }

  if (!authUserId) {
    return (
      <div className="bg-white text-gray-900 min-h-screen pt-24 px-6 font-[Cairo]">
        <div className="max-w-3xl mx-auto bg-white border border-gray-200 p-6 rounded-2xl shadow-sm text-center">
          <h1 className="text-2xl font-extrabold mb-2">الحساب</h1>
          <p className="mb-4 text-gray-600">يجب تسجيل الدخول للوصول إلى صفحة حسابك.</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-primary text-white px-5 py-2 font-semibold hover:bg-primary-dark transition"
          >
            تسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageSeo title="حسابي" description="إدارة بياناتك وطلباتك" path="/profile" />
      <div className="bg-white text-gray-900 min-h-screen pt-24 px-6 font-[Cairo]">
        <div className="max-w-5xl mx-auto space-y-6">
          <section className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-extrabold">
                حسابي {hasProfile ? '' : <span className="text-sm text-amber-600">(غير محفوظ بعد)</span>}
              </h1>
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-md bg-green-600 text-white px-4 py-2 font-semibold hover:opacity-90 disabled:opacity-60"
                    >
                      {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={18} />}
                      حفظ
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="inline-flex items-center gap-2 rounded-md border px-4 py-2 font-semibold hover:bg-gray-50"
                    >
                      <X size={18} />
                      إلغاء
                    </button>
                  </>
                ) : (
                  <>
                    {!hasProfile && (
                      <button
                        onClick={handleSave}
                        className="inline-flex items-center gap-2 rounded-md bg-green-600 text-white px-4 py-2 font-semibold hover:opacity-90"
                      >
                        <Save size={18} />
                        حفظ الآن
                      </button>
                    )}
                    <button
                      onClick={() => setIsEditing(true)}
                      className="inline-flex items-center gap-2 rounded-md border px-4 py-2 font-semibold hover:bg-gray-50"
                    >
                      <Pencil size={18} />
                      تعديل
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 mb-5">
              <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-100">
                <Image
                  src={(avatarUrl || authAvatar || '/images/placeholders/phone-placeholder.jpg') as string}
                  alt="Avatar"
                  fill
                  sizes="64px"
                  unoptimized
                />
              </div>
              <div>
                <p className="text-lg font-extrabold">{fullName || authName || 'بدون اسم'}</p>
                <p className="text-sm text-gray-600">{email || authEmail || '—'}</p>
                {updatedAt && (
                  <p className="text-xs text-gray-500 mt-1">
                    آخر تحديث: {formatDate(updatedAt)}
                  </p>
                )}
              </div>
            </div>

            {isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm text-gray-600">الاسم الكامل</span>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="اكتب اسمك هنا"
                  />
                </label>

                <label className="block">
                  <span className="text-sm text-gray-600">رقم الجوال</span>
                  <input
                    type="tel"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="05xxxxxxxx"
                  />
                </label>

                <label className="block">
                  <span className="text-sm text-gray-600">البريد الإلكتروني</span>
                  <input
                    type="email"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                  />
                </label>

                <label className="block">
                  <span className="text-sm text-gray-600">رابط الصورة الشخصية</span>
                  <input
                    type="url"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </label>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-gray-500">الاسم الكامل</div>
                  <div className="font-semibold">{fullName || authName || '—'}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-gray-500">رقم الجوال</div>
                  <div className="font-semibold">{phone || authPhone || '—'}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-gray-500">البريد الإلكتروني</div>
                  <div className="font-semibold">{email || authEmail || '—'}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-gray-500">الصورة الشخصية</div>
                  <div className="font-semibold truncate">
                    {avatarUrl || authAvatar || '—'}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* الطلبات الأخيرة */}
          <section className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-extrabold">طلباتي</h2>
              <Link
                href="/orders"
                className="text-sm underline text-primary hover:text-primary-dark"
              >
                عرض كل الطلبات
              </Link>
            </div>

            {orders.length === 0 ? (
              <p className="text-gray-600">لا توجد طلبات حتى الآن.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-4">رقم الطلب</th>
                      <th className="py-2 pr-4">التاريخ</th>
                      <th className="py-2 pr-4">الحالة</th>
                      <th className="py-2 pr-4">الإجمالي</th>
                      <th className="py-2 pr-4">العناصر</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => {
                      const count = Array.isArray(o.items) ? o.items.length : 0;
                      return (
                        <tr key={o.id} className="border-b last:border-0">
                          <td className="py-2 pr-4">
                            <code className="text-xs">{o.id.slice(0, 8)}…</code>
                          </td>
                          <td className="py-2 pr-4">{formatDate(o.created_at)}</td>
                          <td className="py-2 pr-4">{o.status ?? '—'}</td>
                          <td className="py-2 pr-4">{formatCurrency(o.total)}</td>
                          <td className="py-2 pr-4">{count} منتج</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* إجراءات الحساب */}
          <section className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
            <h3 className="text-lg font-extrabold mb-3">إجراءات</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={async () => {
                  const { error } = await supabase.auth.signOut();
                  if (error) {
                    toast.error('تعذر تسجيل الخروج.');
                    return;
                  }
                  toast.success('تم تسجيل الخروج بنجاح.');
                  window.location.href = '/';
                }}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 border font-semibold hover:bg-gray-50"
              >
                <LogOut size={18} />
                تسجيل الخروج
              </button>

              <Link
                href="/"
                className="rounded-lg px-4 py-2 bg-primary text-white font-semibold hover:bg-primary-dark"
              >
                متابعة التسوق
              </Link>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
