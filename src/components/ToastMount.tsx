// src/components/ToastMount.tsx
'use client'

import { Toaster } from 'react-hot-toast'

export default function ToastMount() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        style: {
          background: '#f9fafb',         // خلفية فاتحة تناسب متجر الهواتف
          color: '#111827',             // نص غامق (tailwind gray-900)
          fontFamily: 'Cairo, sans-serif',
          border: '1px solid #0ea5e9',  // أزرق رئيسي
        },
        success: { iconTheme: { primary: '#0ea5e9', secondary: '#ffffff' } },
        error:   { iconTheme: { primary: '#ef4444', secondary: '#ffffff' } },
      }}
    />
  )
}
