'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { User } from '@supabase/supabase-js';
import dynamic from 'next/dynamic';
import { supabaseBrowser as supabase } from '@lib/supabaseClient';

const PageSeo = dynamic(() => import('@/components/PageSeo'), { ssr: false });

type OrderItem = {
  title?: string;
  quantity?: number;
  image?: string;
};

type OrderRow = {
  id: string;
  user_id: string | null;
  created_at: string;
  status: string | null;
  total: number | null;
  // قد يكون Array أو كائن JSON فيه items أو أي شكل آخر
  items: OrderItem[] | Record<string, OrderItem[]>;
};

function normalizeItems(items: OrderItem[] | Record<string, OrderItem[]>): OrderItem[] {
  if (Array.isArray(items)) return items;

  if (items && typeof items === 'object' && Array.isArray((items as Record<string, OrderItem[]>).items)) {
    return (items as Record<string, OrderItem[]>).items;
  }

  if (items && typeof items === 'object') {
    const vals = Object.values(items as Record<string, OrderItem[]>);
    if (vals.every((v) => v && typeof v === 'object')) return vals.flat();
  }

  return [];
}

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

export default function OrdersPage() {
  const router = useRouter();
  const mounted = useRef(true);

  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>('');

  const loadOrders = async (userId: string) => {
    setErr('');
    const { data, error } = await supabase
      .from('orders')
      .select('id,user_id,created_at,status,total,items')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      setErr(error.message || 'فشل في جلب الطلبات');
      setOrders([]);
      return;
    }
    setOrders((data as OrderRow[]) ?? []);
  };

  useEffect(() => {
    mounted.current = true;

    (async () => {
      setLoading(true);
      const { data: authData } = await supabase.auth.getUser();
      if (!mounted.current) return;

      const u = authData.user ?? null;
      setUser(u);

      if (u) {
        await loadOrders(u.id);
      } else {
        setOrders([]);
      }

      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        await loadOrders(u.id);
      } else {
        setOrders([]);
      }
    });

    return () => {
      mounted.current = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  // ===== حالات الواجهة =====
  if (loading) {
    return (
      <div className="min-h-screen bg-white text-slate-900 font-[Cairo] pt-24 px-6">
        <div className="max-w-3xl mx-auto">
          <PageSeo title="طلباتي" description="قائمة طلباتك" path="/orders" />
          <div className="bg-white border border-gray-200 p-6 rounded-lg shadow">
            <p className="animate-pulse">جارٍ تحميل الطلبات…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white text-slate-900 font-[Cairo] pt-24 px-6">
        <div className="max-w-md mx-auto bg-white border border-gray-200 p-6 rounded-lg shadow text-center">
          <h1 className="text-xl font-bold mb-2">الطلبات</h1>
          <p className="mb-4 text-gray-600">⚠️ يرجى تسجيل الدخول لعرض طلباتك.</p>
          <Link
            href="/login?next=/orders"
            className="inline-block bg-[#0ea5e9] text-white py-2 px-4 rounded hover:opacity-90 transition"
          >
            تسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 font-[Cairo] pt-24 px-6">
      <PageSeo title="طلباتي" description="قائمة طلباتك الأخيرة" path="/orders" />
      <div className="max-w-5xl mx-auto">
        <div className="bg-white border border-gray-200 p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">📦 طلباتي</h1>
            <Link href="/phones" className="text-sm underline text-sky-600 hover:text-sky-700">
              متابعة التسوق
            </Link>
          </div>

          {err && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
              {err}
            </div>
          )}

          {orders.length === 0 ? (
            <div className="text-center text-gray-600">
              لا توجد طلبات محفوظة لهذا الحساب.
              <div className="mt-4">
                <Link
                  href="/phones"
                  className="inline-block bg-[#0ea5e9] text-white py-2 px-4 rounded hover:opacity-90 transition"
                >
                  ابدأ التسوق
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => {
                const items = normalizeItems(order.items);
                const qty =
                  items.reduce((sum, i) => sum + (typeof i?.quantity === 'number' ? i.quantity : 1), 0) || 0;

                return (
                  <div key={order.id} className="border border-gray-200 rounded-lg p-5">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold">
                          رقم الطلب: <span className="text-sky-700">{order.id}</span>
                        </p>
                        <p className="text-sm text-gray-600">
                          التاريخ: {new Date(order.created_at).toLocaleString('ar-SA')}
                        </p>
                      </div>
                      <div className="text-sm text-right">
                        <p>العناصر: {qty}</p>
                        <p>الإجمالي: {Number(order.total ?? 0).toFixed(2)} ر.س</p>
                        <p className="mt-1 font-medium">{renderStatus(order.status)}</p>
                      </div>
                    </div>

                    {items.length > 0 && (
                      <div className="flex gap-2 mt-4">
                        {items.slice(0, 4).map((it, idx) => (
                          <Image
                            key={idx}
                            src={it.image || '/vercel.svg'}
                            alt={it.title || 'صورة منتج'}
                            width={56}
                            height={72}
                            className="rounded border object-cover bg-gray-50"
                          />
                        ))}
                      </div>
                    )}

                    <div className="mt-4 text-end">
                      <button
                        onClick={() => router.push(`/orders/${order.id}`)}
                        className="text-sm bg-[#0ea5e9] text-white py-2 px-4 rounded hover:opacity-90 transition"
                      >
                        عرض التفاصيل
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
