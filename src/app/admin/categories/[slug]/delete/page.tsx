'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@lib/supabaseClient'

type CategoryRow = { id: number; name: string; slug: string }

function safeDecode(v: string): string {
  try { return decodeURIComponent(v) } catch { return v }
}

export default function DeleteCategoryPage() {
  const { slug } = useParams()
  const routeSlug = safeDecode(String(slug ?? ''))

  const router = useRouter()
  const [category, setCategory] = useState<CategoryRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    ;(async () => {
      if (!routeSlug) return
      setLoading(true)
      setErr(null)

      const { data, error } = await supabaseBrowser
        .from('categories')
        .select('id,name,slug')
        .eq('slug', routeSlug)
        .maybeSingle()

      if (error || !data) {
        setErr('⚠️ لم يتم العثور على التصنيف')
        setCategory(null)
      } else {
        setCategory(data as CategoryRow)
      }
      setLoading(false)
    })()
  }, [routeSlug])

  const handleDelete = async () => {
    if (!category || deleting) return
    const confirmed = confirm(`هل أنت متأكد من حذف التصنيف "${category.name}"؟ لا يمكن التراجع.`)
    if (!confirmed) return

    setDeleting(true)
    setErr(null)
    try {
      // الحصول على الجلسة والتوكن باستخدام getSession()
      const { data: { session }, error } = await supabaseBrowser.auth.getSession()
      if (error || !session) {
        throw new Error('مشكلة في الجلسة أو التوكن.')
      }

      const token = session.access_token
      if (!token) {
        throw new Error('التوكن مفقود')
      }

      // إرسال طلب حذف التصنيف عبر API endpoint
      const res = await fetch('/api/categories/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // إضافة التوكن هنا
        },
        body: JSON.stringify({ id: category.id }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data?.message || 'حدث خطأ أثناء حذف التصنيف.')
      }

      alert('✅ تم حذف التصنيف بنجاح')
      router.replace('/admin/products/categories')
      router.refresh()
    } catch (e: unknown) {
      if (e instanceof Error) {
        setErr(e.message || '❌ فشل الحذف. حاول مجددًا.')
      } else {
        setErr('❌ فشل الحذف. حاول مجددًا.')
      }
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <div className="text-center py-20 font-[Cairo]">جاري تحميل بيانات التصنيف...</div>
  }

  if (err) {
    return (
      <div className="min-h-screen py-20 px-4 font-[Cairo]">
        <div className="max-w-xl mx-auto bg-white p-6 rounded shadow text-center">
          <p className="text-red-600 mb-4">{err}</p>
          <Link href="/admin/products/categories" className="text-blue-600 hover:underline">
            ← عودة إلى التصنيفات
          </Link>
        </div>
      </div>
    )
  }

  if (!category) return null

  return (
    <div className="min-h-screen py-20 px-4 font-[Cairo] bg-[#f9f9f9]">
      <div className="max-w-xl mx-auto bg-white p-6 rounded shadow">
        <h1 className="text-xl font-bold mb-4 text-red-700">🗑️ حذف التصنيف</h1>
        <p className="mb-6 text-sm text-gray-700">
          هل أنت متأكد أنك تريد حذف التصنيف <strong>{category.name}</strong>؟<br />
          لا يمكن التراجع عن هذا الإجراء.
        </p>

        {err && <p className="text-red-600 mb-4">{err}</p>}

        <div className="flex gap-4">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="bg-red-600 text-white px-5 py-2 rounded hover:bg-red-700 transition disabled:opacity-60"
          >
            {deleting ? 'جاري الحذف…' : 'نعم، حذف'}
          </button>

          <button
            onClick={() => router.push('/admin/products/categories')}
            className="bg-gray-300 text-black px-5 py-2 rounded hover:bg-gray-400 transition"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  )
}
