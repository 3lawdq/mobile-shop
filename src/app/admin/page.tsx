'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabaseBrowser } from '@lib/supabaseClient'
import { toast } from 'react-hot-toast'

export default function AdminHomePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 1) التحقق من الجلسة
        const { data: { session }, error: sessionError } = await supabaseBrowser.auth.getSession()
        if (sessionError || !session) {
          router.replace('/admin/login')
          return
        }

        // 2) جلب المستخدم
        const { data: { user }, error: userError } = await supabaseBrowser.auth.getUser()
        if (userError || !user) {
          router.replace('/admin/login')
          return
        }

        // 3) جلب الدور من profiles
        const { data: profile, error: profileError } = await supabaseBrowser
          .from('profiles')
          .select('role')
          .or(`id.eq.${user.id},user_id.eq.${user.id}`)
          .single()

        if (profileError || !profile) {
          router.replace('/admin/login')
          return
        }

        if (profile.role !== 'admin') {
          // ليس مشرفًا
          toast.error('ليس لديك صلاحية كأدمن.')
          router.replace('/')
          return
        }

        setLoading(false)
      } catch {
        router.replace('/admin/login')
      }
    }

    checkAuth()
  }, [router])

  const handleLogout = async () => {
    try {
      // استخدم المسار الخادمي لضمان حذف كوكي الجلسة + sb-role
      await fetch('/auth/signout', { method: 'POST' })
    } finally {
      // حدّث الشجرة الخدمية ثم وجّه للّوجين (أو الرئيسية)
      router.refresh()
      router.replace('/login')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center font-[Cairo]">
        <p>جاري التحقق…</p>
      </div>
    )
  }

  return (
    <div className="p-10 font-[Cairo] bg-[#f4f4f4] min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-[#26333f] text-center">لوحة تحكم المشرف</h1>

      <div className="grid gap-4 max-w-md mx-auto">
        {/* إدارة الهواتف */}
        <Link
          href="/admin/products"
          className="block bg-[#ec7302] text-white py-3 rounded text-center hover:opacity-90 transition"
        >
          📱 إدارة الهواتف
        </Link>

        {/* إضافة هاتف */}
        <Link
          href="/admin/products/add"
          className="block bg-green-600 text-white py-3 rounded text-center hover:opacity-90 transition"
        >
          ➕ إضافة هاتف جديد
        </Link>

        {/* إدارة التصنيفات */}
        <Link
          href="/admin/categories"
          className="block bg-[#795548] text-white py-3 rounded text-center hover:opacity-90 transition"
        >
          🗂️ إدارة التصنيفات
        </Link>

        {/* إضافة تصنيف */}
        <Link
          href="/admin/categories/add"
          className="block bg-indigo-600 text-white py-3 rounded text-center hover:opacity-90 transition"
        >
          ➕ إضافة تصنيف جديد
        </Link>

        {/* تسجيل الخروج */}
        <button
          onClick={handleLogout}
          className="bg-red-600 text-white py-3 rounded w-full hover:opacity-90 transition"
        >
          🚪 تسجيل الخروج
        </button>
      </div>
    </div>
  )
}
