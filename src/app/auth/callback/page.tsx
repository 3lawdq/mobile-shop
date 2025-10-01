// src/app/auth/callback/page.tsx
'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

function safeInternal(target: string | null | undefined): string {
  if (!target) return '/';
  try {
    if (target.startsWith('/')) return target;
    return '/';
  } catch {
    return '/';
  }
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const ranOnce = useRef(false);

  useEffect(() => {
    if (ranOnce.current) return;
    ranOnce.current = true;

    // قراءة باراميترات OAuth من العنوان
    const params = new URLSearchParams(window.location.search);

    const errorDesc = params.get('error_description') || params.get('error');
    if (errorDesc) {
      router.replace(`/login?message=${encodeURIComponent(errorDesc)}`);
      return;
    }

    const nextParam =
      params.get('redirect') ||
      params.get('next') ||
      params.get('redirect_to') ||
      '/';

    const finalPath = safeInternal(nextParam);
    router.replace(finalPath);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-gray-900">
      <div className="flex items-center gap-3">
        <span className="inline-block h-5 w-5 rounded-full border-2 border-gray-300 border-t-primary animate-spin" />
        <span className="text-sm">جاري إكمال تسجيل الدخول…</span>
      </div>
    </div>
  );
}
