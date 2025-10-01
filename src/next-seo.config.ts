// src/next-seo.config.ts
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com'

const SEO = {
  titleTemplate: '%s | متجر الهواتف',
  defaultTitle: 'متجر الهواتف',
  description: 'اكتشف أحدث الهواتف الذكية والإكسسوارات الأصلية بأفضل الأسعار.',
  openGraph: {
    type: 'website',
    locale: 'ar_AR',
    url: SITE_URL, // قيمة افتراضية
    site_name: 'متجر الهواتف',
    images: [
      {
        url: `${SITE_URL}/og-default.jpg`, // يمكنك رفع صورة OG مخصصة للمتجر
        width: 1200,
        height: 630,
        alt: 'متجر الهواتف',
      },
    ],
  },
  twitter: {
    cardType: 'summary_large_image',
  },
  additionalMetaTags: [
    { name: 'theme-color', content: '#ec7302' }, // اللون البرتقالي الخاص بالمتجر
  ],
  additionalLinkTags: [
    { rel: 'icon', href: '/favicon.ico' },
    // ⚠️ لا canonical هنا — سنضبطه ديناميكيًا عبر PageSeo
  ],
}

export default SEO
