'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabaseBrowser } from '../../../../../lib/supabaseClient'

type CategoryRow = {
  id: number
  name: string
  slug: string
  description?: string | null
  created_at?: string | null
}

export default function CategoryDetailsPage() {
  const params = useParams()
  const slugParam = params?.slug
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam

  const [category, setCategory] = useState<CategoryRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      if (!slug) return
      setLoading(true)
      setError(null)

      const { data, error } = await supabaseBrowser
        .from('categories')
        .select('id,name,slug,description,created_at')
        .eq('slug', slug)
        .maybeSingle()
        .overrideTypes<CategoryRow>()

      if (error || !data) {
        setError('❌ لم يتم العثور على التصنيف')
        setCategory(null)
      } else {
        setCategory(data)
      }
      setLoading(false)
    })()
  }, [slug])

  if (loading) {
    return <p className="text-center p-10 font-[Cairo]">جاري التحميل...</p>
  }

  if (error) {
    return <p className="text-red-600 text-center p-10 font-[Cairo]">{error}</p>
  }

  if (!category) return null

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white rounded shadow font-[Cairo]">
      <div className="flex items-start justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold text-[#ec7302]">
          📄 تفاصيل تصنيف الهواتف والإكسسوارات: {category.name}
        </h1>
        <Link
          href="/admin/products/categories"
          className="text-sm text-blue-600 hover:underline"
        >
          ← عودة إلى التصنيفات
        </Link>
      </div>

      <div className="space-y-3 text-sm text-gray-700">
        <p>
          <strong>الاسم:</strong> {category.name}
        </p>
        <p>
          <strong>الرابط (slug):</strong> {category.slug}
        </p>
        {category.description && (
          <p>
            <strong>الوصف:</strong> {category.description}
          </p>
        )}
        <p>
          <strong>تاريخ الإضافة:</strong>{' '}
          {category.created_at
            ? new Date(category.created_at).toLocaleDateString('ar-EG')
            : '—'}
        </p>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Link
          href={`/admin/products/categories/${category.slug}/edit`}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          تعديل
        </Link>
        <Link
          href={`/admin/products/categories/${category.slug}/delete`}
          className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
        >
          حذف
        </Link>
      </div>
    </div>
  )
}
