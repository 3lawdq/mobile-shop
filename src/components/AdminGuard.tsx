// src/components/AdminGuard.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabaseBrowser } from '@lib/supabaseClient'

type Props = { children: React.ReactNode }

export default function AdminGuard({ children }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let mounted = true

    async function check() {
      try {
        // 1) التحقق من الجلسة
        const {
          data: { session },
          error: sessionErr,
        } = await supabaseBrowser.auth.getSession()

        if (sessionErr || !session?.user) {
          if (pathname !== '/admin/login') router.replace('/admin/login')
          return
        }

        // 2) جلب الدور من جدول profiles (حسب مخططك: user_id أو id)
        const userId = session.user.id
        const { data: profile, error: profileErr } = await supabaseBrowser
          .from('profiles')
          .select('role')
          .eq('user_id', userId)
          .single()

        if (profileErr || !profile) {
          router.replace('/admin/login')
          return
        }

        // 3) السماح فقط للمشرف
        if (profile.role !== 'admin') {
          router.replace('/')
          return
        }
      } catch (err) {
        console.error('Error during admin check:', err)
        router.replace('/admin/login')
      } finally {
        if (mounted) setChecking(false)
      }
    }

    check()
    return () => {
      mounted = false
    }
  }, [router, pathname])

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white font-[Cairo]">
        <p className="text-gray-500 text-lg">جاري التحقق من الصلاحيات…</p>
      </div>
    )
  }

  return <>{children}</>
}
