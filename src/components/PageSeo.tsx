// src/components/PageSeo.tsx
'use client'

import { NextSeo } from 'next-seo'

type Props = {
  title: string
  description?: string
  /** مثال: '/product/iphone-15' — سيُبنى منه canonical */
  path?: string
  /** رابط صورة OG (ويُفضّل أن يكون مطلقًا https) */
  image?: string
  /** لمنع الفهرسة عند الحاجة */
  noindex?: boolean
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com'
const SITE_NAME = 'متجر الهواتف والإكسسوارات'

export default function PageSeo({ title, description, path = '', image, noindex }: Props) {
  const canonical = path
    ? (path.startsWith('http')
        ? path
        : new URL(path.startsWith('/') ? path : `/${path}`, SITE_URL).toString())
    : SITE_URL

  const images = image
    ? [{ url: image, width: 1200, height: 630, alt: title }]
    : undefined

  return (
    <NextSeo
      title={title}
      description={description}
      canonical={canonical}
      noindex={!!noindex}
      openGraph={{
        url: canonical,
        title,
        description,
        site_name: SITE_NAME,
        images,
      }}
      twitter={{ cardType: 'summary_large_image' }}
    />
  )
}
