'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { supabaseBrowser as supabase } from '@lib/supabaseClient';

const PageSeo = dynamic(() => import('@/components/PageSeo'), { ssr: false });

type OrderItem = {
  id?: number | string;
  title?: string;
  quantity?: number;
  image?: string;
  category?: string;
  price?: number;
};

type CustomerInfo = {
  fullName?: string;
  phone?: string;
  address?: string;
  contactMethod?: 'whatsapp' | 'call' | string;
} | null;

type OrderRow = {
  id: string;
  user_id: string | null;
  created_at: string | null;
  status: string | null;
  total: number | null;
  items: OrderItem[] | Record<string, OrderItem[]>;
  notes: Record<string, string> | null;
  customer_info: CustomerInfo;
};

function renderStatus(status: string | null | undefined) {
  switch (status) {
    case 'بانتظار المعالجة':
      return '⏳ بانتظار المعالجة';
    case 'قيد التحضير':
      return '🔄 قيد التحضير';
    case 'تم التوصيل':
      return '🎉 تم التوصيل';
    default:
      return status || '—';
  }
}

function normalizeItems(items: OrderItem[] | Record<string, OrderItem[]>): OrderItem[] {
  if (Array.isArray(items)) return items;

  if (items && typeof items === 'object') {
    if (Array.isArray((items as Record<string, OrderItem[]>).items)) return (items as Record<string, OrderItem[]>).items;
    const vals = Object.values(items as Record<string, OrderItem[]>);
    if (vals.every((v) => v && typeof v === 'object')) return vals.flat();
  }

  return [];
}

export default function OrderDetailsPage() {
  const params = useParams<{ id: string }>();
  const orderId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const router = useRouter();
  const mounted = useRef(true);

  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [err, setErr] = useState('');

  const loadRole = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .or(`id.eq.${uid},user_id.eq.${uid}`)
      .maybeSingle<{ role: string | null }>();

    if (!error && data?.role === 'admin') setRole('admin');
    else setRole('user');
  }, []);

  const loadOrder = useCallback(async (uid?: string | null) => {
    if (!orderId) return;
    setErr('');

    const { data, error } = await supabase
      .from('orders')
      .select('id,user_id,created_at,status,total,items,notes,customer_info')
      .eq('id', orderId)
      .maybeSingle<OrderRow>();

    if (error) {
      setErr(error.message || 'تعذر جلب تفاصيل الطلب.');
      setOrder(null);
      return;
    }

    if (data && uid && role !== 'admin' && data.user_id && data.user_id !== uid) {
      setErr('لا تملك صلاحية الوصول لهذا الطلب.');
      setOrder(null);
      return;
    }

    setOrder(data ?? null);
  }, [orderId, role]);

  useEffect(() => {
    mounted.current = true;

    (async () => {
      if (!orderId) return;
      setLoading(true);

      const { data: authData } = await supabase.auth.getUser();
      if (!mounted.current) return;

      const u = authData.user ?? null;
      setUser(u);

      if (u) {
        await loadRole(u.id);
        await loadOrder(u.id);
      } else {
        await loadOrder(undefined);
      }

      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        await loadRole(u.id);
        await loadOrder(u.id);
      } else {
        setRole('user');
        await loadOrder(undefined);
      }
    });

    return () => {
      mounted.current = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, [orderId, loadRole, loadOrder]);

  const handleUpdateStatus = async (newStatus: string) => {
    if (!order || role !== 'admin') return;
    setUpdating(true);
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', order.id);

    if (error) {
      alert('حدث خطأ أثناء تحديث الحالة: ' + (error.message || ''));
    } else {
      setOrder((prev) => (prev ? { ...prev, status: newStatus } : prev));
      alert('✅ تم تحديث حالة الطلب.');
    }
    setUpdating(false);
  };

  const handleDelete = async () => {
    if (!order || role !== 'admin') return;
    const confirmed = confirm('هل أنت متأكد من حذف هذا الطلب نهائيًا؟');
    if (!confirmed) return;

    const { error } = await supabase.from('orders').delete().eq('id', order.id);
    if (error) {
      alert('حدث خطأ أثناء الحذف: ' + (error.message || ''));
    } else {
      alert('🗑️ تم حذف الطلب بنجاح.');
      router.push('/orders');
    }
  };

  // حالات الواجهة
  if (loading) {
    return (
      <div className="min-h-screen bg-white text-slate-900 font-[Cairo] pt-24 px-6">
        <div className="max-w-3xl mx-auto">
          <PageSeo title="تفاصيل الطلب" description="عرض تفاصيل طلبك" path={`/orders/${orderId ?? ''}`} />
          <div className="bg-white border border-gray-200 p-6 rounded-lg shadow">
            <p className="animate-pulse">جاري تحميل تفاصيل الطلب…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white text-slate-900 font-[Cairo] pt-24 px-6">
        <div className="max-w-md mx-auto bg-white border border-gray-200 p-6 rounded-lg shadow text-center">
          <h1 className="text-xl font-bold mb-2">تفاصيل الطلب</h1>
          <p className="mb-4 text-gray-600">يرجى تسجيل الدخول لعرض تفاصيل الطلب.</p>
          <button
            onClick={() => router.push(`/login?next=${encodeURIComponent(`/orders/${orderId}`)}`)}
            className="inline-block bg-[#0ea5e9] text-white py-2 px-4 rounded hover:opacity-90 transition"
          >
            تسجيل الدخول
          </button>
        </div>
      </div>
    );
  }

  if (err || !order) {
    return (
      <div className="min-h-screen bg-white text-slate-900 font-[Cairo] pt-24 px-6">
        <div className="max-w-md mx-auto bg-white border border-gray-200 p-6 rounded-lg shadow text-center">
          <h1 className="text-xl font-bold mb-2">تفاصيل الطلب</h1>
          <p className="mb-4 text-red-600">{err || 'لم يتم العثور على الطلب أو لا تملك صلاحية الوصول.'}</p>
          <button
            onClick={() => router.push('/orders')}
            className="inline-block bg-[#0ea5e9] text-white py-2 px-4 rounded hover:opacity-90 transition"
          >
            العودة للطلبات
          </button>
        </div>
      </div>
    );
  }

  const items = normalizeItems(order.items);
  const notes = order.notes ?? {};
  const qty = items.reduce((s, it) => s + (typeof it?.quantity === 'number' ? it.quantity : 1), 0);

  const noteFor = (it: OrderItem, idx: number) =>
    notes[String(it.id ?? '')] ?? notes[String(idx)] ?? (it.title ? notes[it.title] : undefined) ?? null;

  return (
    <div className="min-h-screen bg-white text-slate-900 font-[Cairo] pt-24 px-6">
      <PageSeo title="تفاصيل الطلب" description="عرض تفاصيل طلبك" path={`/orders/${orderId}`} />
      <div className="max-w-4xl mx-auto bg-white border border-gray-200 p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">تفاصيل الطلب</h1>
          <button
            onClick={() => router.push('/orders')}
            className="text-sm underline text-sky-600 hover:text-sky-700"
          >
            العودة لسجل الطلبات
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-1">
          رقم الطلب: <span className="text-sky-700 font-semibold">{order.id}</span>
        </p>
        <p className="text-sm text-gray-600 mb-6">
          التاريخ: {order.created_at ? new Date(order.created_at).toLocaleString('ar-SA') : '—'}
        </p>

        <div className="grid gap-2 mb-6 text-sm bg-gray-50 p-4 rounded text-gray-700">
          <p><strong>الاسم:</strong> {order.customer_info?.fullName || '—'}</p>
          <p><strong>رقم الهاتف:</strong> {order.customer_info?.phone || '—'}</p>
          <p><strong>العنوان:</strong> {order.customer_info?.address || '—'}</p>
          <p>
            <strong>طريقة التواصل:</strong>{' '}
            {order.customer_info?.contactMethod === 'whatsapp' ? 'واتساب' : 'اتصال'}
          </p>
          <p>
            <strong>الحالة:</strong> <span className="text-yellow-700">{renderStatus(order.status)}</span>
          </p>
          <p>
            <strong>إجمالي العناصر:</strong> {qty} — <strong>الإجمالي:</strong>{' '}
            {Number(order.total ?? 0).toFixed(2)} ر.س
          </p>
        </div>

        <h2 className="text-lg font-bold mb-4">المنتجات المطلوبة</h2>
        {items.length === 0 ? (
          <p className="text-gray-600">لا توجد عناصر في هذا الطلب.</p>
        ) : (
          <div className="space-y-4 mb-6">
            {items.map((it, idx) => (
              <div key={idx} className="flex gap-4 border-b pb-4">
                <div className="w-16 h-20 relative rounded overflow-hidden border bg-gray-100">
                  <Image
                    src={it.image || '/vercel.svg'}
                    alt={it.title || 'صورة منتج'}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{it.title || '—'}</h3>
                  <p className="text-sm">الكمية: {it.quantity ?? 1}</p>
                  {it.category && <p className="text-sm text-gray-500">التصنيف: {it.category}</p>}
                  {(() => {
                    const n = noteFor(it, idx);
                    return n ? <p className="text-sm text-gray-600 mt-1">ملاحظة: {n}</p> : null;
                  })()}
                </div>
                {typeof it.price === 'number' && (
                  <div className="text-sm text-right text-gray-700 min-w-[90px]">
                    {(it.price ?? 0).toFixed(2)} ر.س
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {role === 'admin' && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6">
            <div className="flex items-center gap-2">
              <span className="text-sm">تغيير الحالة:</span>
              <select
                value={order.status ?? 'بانتظار المعالجة'}
                onChange={(e) => handleUpdateStatus(e.target.value)}
                disabled={updating}
                className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
              >
                <option value="بانتظار المعالجة">بانتظار المعالجة</option>
                <option value="قيد التحضير">قيد التحضير</option>
                <option value="تم التوصيل">تم التوصيل</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <button
                disabled={updating}
                onClick={() => handleUpdateStatus('تم التوصيل')}
                className="bg-green-600 text-white py-2 px-4 rounded hover:opacity-90 transition disabled:opacity-60"
              >
                تحديد كـ &quot;تم التوصيل&quot;
              </button>

              <button
                disabled={updating}
                onClick={handleDelete}
                className="bg-red-600 text-white py-2 px-4 rounded hover:opacity-90 transition disabled:opacity-60"
              >
                حذف الطلب نهائيًا
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
