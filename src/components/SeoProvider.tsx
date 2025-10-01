// src/components/SeoProvider.tsx
'use client'

import { DefaultSeo } from 'next-seo'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com'
const SITE_NAME = 'متجر الهواتف والإكسسوارات'

export default function SeoProvider() {
  return (
    <DefaultSeo
      titleTemplate={`%s | ${SITE_NAME}`}
      defaultTitle={SITE_NAME}
      description="تسوق هواتف ذكية وإكسسوارات أصلية بأسعار منافسة وشحن سريع داخل المملكة."
      canonical={SITE_URL}
      openGraph={{
        type: 'website',
        url: SITE_URL,
        site_name: SITE_NAME,
        locale: 'ar_SA',
      }}
      twitter={{ cardType: 'summary_large_image' }}
      additionalMetaTags={[
        { name: 'theme-color', content: '#ffffff' }, // واجهة فاتحة
        { name: 'application-name', content: SITE_NAME },
        { name: 'apple-mobile-web-app-title', content: SITE_NAME },
      ]}
    />
  )
}
