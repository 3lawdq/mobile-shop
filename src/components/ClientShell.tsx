'use client'

import React from 'react'
import dynamic from 'next/dynamic'

// ✅ تحميل مكونات العميل فقط
const Navbar = dynamic(() => import('@/components/Navbar'), { ssr: false })
const SeoProvider = dynamic(() => import('@/components/SeoProvider'), { ssr: false })
const ToastMount = dynamic(() => import('@/components/ToastMount'), { ssr: false })

export default function ClientShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* إدارة الـ SEO */}
      <SeoProvider />

      {/* الشريط العلوي */}
      <Navbar />

      {/* المحتوى الرئيسي */}
      <main className="pt-[96px]">{children}</main>

      {/* التنبيهات */}
      <ToastMount />
    </>
  )
}
