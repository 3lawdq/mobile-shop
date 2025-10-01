'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { supabaseBrowser } from '@lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'

// أعلى الملف (بعد الأنواع الموجودة)
type SupabaseError = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

type CategoryRow = { id: number; name: string };

type ProductRow = {
  id: number;
  title: string;
  brand: string;
  price: number;
  image_url: string | null;
  category_id: number | null;
  rating?: number | null;
  description?: string | null;
  created_at?: string | null;
  categories?: { name: string | null } | null;
}

export default function AdminProductsPage() {
  const { isAdmin, loading: authLoading } = useAuth()
  const [products, setProducts] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) {
      alert('ليس لديك صلاحية الوصول إلى هذه الصفحة.');
      return;
    }

    const fetchProducts = async () => {
      try {
        setLoading(true);

        const { data: rows } = await supabaseBrowser
          .from('products')
          .select(`
            id, title, brand, price, image_url, category_id, rating, description, created_at,
            categories!products_category_id_fkey ( name )
          `)
          .order('id', { ascending: true })
          .throwOnError()
          .returns<ProductRow[]>();

        setProducts(rows ?? []);
      } catch (e: unknown) {
        const err = e as SupabaseError; // ✅ بدون any
        console.error('خطأ أثناء جلب المنتجات:', {
          message: err?.message,
          details: err?.details,
          hint: err?.hint,
          code: err?.code,
        });

        if (err?.code === 'PGRST116' || /relationship/i.test(err?.message || '')) {
          try {
            const { data: plain } = await supabaseBrowser
              .from('products')
              .select('id,title,brand,price,image_url,category_id,rating,description,created_at')
              .order('id', { ascending: true })
              .throwOnError()
              .returns<Omit<ProductRow, 'categories'>[]>();

            const catIds = Array.from(
              new Set((plain ?? []).map(b => b.category_id).filter((x): x is number => typeof x === 'number'))
            );

            let nameById = new Map<number, string>();
            if (catIds.length) {
              const { data: cats } = await supabaseBrowser
                .from('categories')
                .select('id,name')
                .in('id', catIds)
                .throwOnError()
                .returns<CategoryRow[]>();

              nameById = new Map(cats?.map((c) => [c.id, c.name]) ?? []);
            }

            const withCats: ProductRow[] = (plain ?? []).map(b => ({
              ...b,
              categories: { name: nameById.get(b.category_id ?? -1) ?? null },
            }));

            setProducts(withCats);
          } catch (e2: unknown) {
            const fallbackErr = e2 as SupabaseError; // ✅ بدون any
            console.error('فشل الـ fallback:', {
              message: fallbackErr?.message,
              details: fallbackErr?.details,
              hint: fallbackErr?.hint,
              code: fallbackErr?.code,
            });
            setProducts([]);
          }
        } else {
          setProducts([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [authLoading, isAdmin]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return products
    return products.filter(
      (p) =>
        (p.title ?? '').toLowerCase().includes(term) ||
        (p.brand ?? '').toLowerCase().includes(term)
    )
  }, [products, q])

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return

    // الحصول على التوكن من الجلسة
    const { data: { session } } = await supabaseBrowser.auth.getSession()
    const accessToken = session?.access_token

    if (!accessToken) {
      alert('❌ فشل الحذف: التوكن غير صالح أو مفقود')
      return
    }

    // إرسال طلب الحذف مع التوكن في الهيدر
    const res = await fetch(`/api/products/delete/`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,  // تمرير التوكن في الهيدر
      },
      body: JSON.stringify({ id }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert('❌ فشل الحذف: ' + (data?.message || res.statusText))
      return
    }

    // تحديث قائمة المنتجات بعد الحذف
    setProducts((prev) => prev.filter((p) => p.id !== id))
    alert('✅ تم حذف المنتج بنجاح')
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-[Cairo]">
        <p className="text-gray-500 text-lg">جاري تحميل المنتجات...</p>
      </div>
    )
  }

  return (
    <div className="p-6 bg-[#26333f] min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#b89c70]">📦 إدارة المنتجات</h1>
        <Link
          href="/admin/products/add"
          className="bg-green-600 text-white px-5 py-2.5 rounded-xl hover:bg-green-700 transition-all"
        >
          ➕ إضافة منتج جديد
        </Link>
      </div>

      <input
        type="text"
        placeholder="🔍 ابحث عن منتج..."
        className="border-2 border-gray-300 px-4 py-2 mb-4 w-full rounded-lg"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {filtered.length === 0 ? (
        <p className="text-xl text-[#b89c70]">لا توجد منتجات مطابقة لبحثك.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="py-3 px-4 text-right">ID</th>
                <th className="py-3 px-4 text-right">الصورة</th>
                <th className="py-3 px-4 text-right">العنوان</th>
                <th className="py-3 px-4 text-right">الماركة</th>
                <th className="py-3 px-4 text-right">القسم</th>
                <th className="py-3 px-4 text-right">السعر</th>
                <th className="py-3 px-4 text-right">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="py-2 px-4">{product.id}</td>
                  <td className="py-2 px-4">
                    <div className="w-[50px] h-[70px]">
                      <Image
                        src={product.image_url || '/fallback-product.png'}
                        alt={product.title || 'منتج'}
                        width={50}
                        height={70}
                        className="w-full h-full object-contain rounded-lg"
                      />
                    </div>
                  </td>
                  <td className="py-2 px-4">{product.title}</td>
                  <td className="py-2 px-4">{product.brand}</td>
                  <td className="py-2 px-4">{product.categories?.name ?? ''}</td>
                  <td className="py-2 px-4">{Number(product.price).toFixed(2)} ر.س</td>
                  <td className="py-2 px-4 space-x-2 space-y-1 rtl:space-x-reverse">
                    <Link
                      href={`/admin/products/edit/${product.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      تعديل
                    </Link>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="text-red-600 hover:underline"
                    >
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
