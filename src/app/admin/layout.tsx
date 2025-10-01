// src/app/admin/layout.tsx
import type { Metadata } from 'next'

// إيقاف الكاش داخل الـ Admin
export const dynamic = 'force-dynamic'  // من أجل عدم استخدام الـ Cache
export const revalidate = 0  // لتعطيل التحديث التلقائي للمحتوى

export const metadata: Metadata = {
  title: 'لوحة الإدارة — مكتبة أبرار للهواتف والإكسسوارات',
  description: 'إدارة الهواتف والإكسسوارات والتصنيفات والطلبات.',
  // يمكن إضافة خصائص أخرى مثل robots إذا كنت بحاجة للتحكم في فهرسة محركات البحث
  robots: {
    index: false,  // لا يسمح لمحركات البحث بفهرسة الصفحات الخاصة بالإدارة
    follow: false,  // لا تتبع الروابط على هذه الصفحة
  },
}

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // لا نستخدم <html> ولا <body> في Layout متداخل
  return (
    <section className="min-h-screen bg-[#f7f7f7]">
      {/* إذا تم إضافة شريط التنقل (Navbar) أو مكونات أخرى مثل الـ Toaster في app/layout.tsx، فليس هناك حاجة لتكرارها هنا */}
      <div className="container mx-auto px-4 py-6">
        {children}
      </div>
    </section>
  )
}
