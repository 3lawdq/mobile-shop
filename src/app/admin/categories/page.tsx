'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@lib/supabaseClient'

type ProductCategoryRow = {
  id: number | string
  name: string
  slug: string
  created_at?: string | null
}

export default function AdminProductCategoriesPage() {
  const [rows, setRows] = useState<ProductCategoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  useEffect(() => {
    ;(async () => {
      setLoading(true)

      // جلب الفئات فقط مع الأعمدة المطلوبة
      const { data, error } = await supabaseBrowser
        .from('product_categories')
        .select('id,name,slug,created_at')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('حدث خطأ في جلب الفئات:', error.message)
        setRows([])
      } else {
        setRows((data as ProductCategoryRow[]) ?? [])
      }
      setLoading(false)
    })()
  }, [])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return rows
    return rows.filter(
      (c) =>
        (c.name ?? '').toLowerCase().includes(term) ||
        (c.slug ?? '').toLowerCase().includes(term)
    )
  }, [rows, q])

  return (
    <div className="p-6 font-[Cairo] min-h-screen bg-[#f9f9f9]">
      <div className="max-w-4xl mx-auto bg-white rounded shadow p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold text-[#26333f]">📱 إدارة فئات المنتجات</h1>
          <Link
            href="/admin/products/categories/add"
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            ➕ إضافة فئة منتج
          </Link>
        </div>

        <input
          type="text"
          placeholder="🔍 ابحث بالاسم أو الـ slug..."
          className="border-2 border-gray-300 px-4 py-2 mb-4 w-full rounded-lg"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        {loading ? (
          <p>جاري تحميل الفئات...</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-500">لا توجد فئات مطابقة.</p>
        ) : (
          <table className="w-full table-auto border-collapse text-sm text-center">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-4 py-2">#</th>
                <th className="border px-4 py-2">الاسم</th>
                <th className="border px-4 py-2">الرابط (slug)</th>
                <th className="border px-4 py-2">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((cat, idx) => (
                <tr key={String(cat.id)} className="hover:bg-gray-50">
                  <td className="border px-4 py-2">{idx + 1}</td>
                  <td className="border px-4 py-2 font-semibold">{cat.name}</td>
                  <td className="border px-4 py-2 text-gray-600">{cat.slug}</td>
                  <td className="border px-4 py-2 space-x-2 rtl:space-x-reverse">
                    <Link
                      href={`/admin/products/categories/${encodeURIComponent(cat.slug)}/edit`}
                      className="text-blue-600 hover:underline"
                    >
                      تعديل
                    </Link>
                    <Link
                      href={`/admin/products/categories/${encodeURIComponent(cat.slug)}/delete`}
                      className="text-red-600 hover:underline"
                    >
                      حذف
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
