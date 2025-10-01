// src/app/layout.tsx
import Head from 'next/head'
import './globals.css'
import ClientShell from '@/components/ClientShell'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;800&display=swap&subset=arabic,latin"
        />
      </Head>
      <html lang="ar" dir="rtl">
        <body className="font-sans antialiased bg-white text-gray-900">
          {/* ClientShell يحوي الـ Navbar/Toaster/Providers */}
          <ClientShell>{children}</ClientShell>
        </body>
      </html>
    </>
  )
}
