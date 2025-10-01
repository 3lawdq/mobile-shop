// src/app/admin/products/add/layout.tsx
// Server Component (بدون 'use client')

export const revalidate = 0;  // تعطيل التحديث التلقائي للمحتوى لتجنب الكاش
// أو بدلاً منها:
// export const dynamic = 'force-dynamic';  // لمنع الكاش تمامًا داخل هذه الصفحة

export default function AddProductLayout({ children }: { children: React.ReactNode }) {
  // محتوى الصفحة الخاصة بإضافة المنتج سيتم هنا
  return <>{children}</>;
}
