import { NextConfig } from 'next';
import dotenv from 'dotenv';

dotenv.config(); // تحميل .env.local

const isDev = process.env.NODE_ENV !== 'production';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: false,
    domains: [
      'dlbfbhjqfleuslpvilwj.supabase.co',
      'svgsilh.com',
      'images.samsung.com',
      'www.aljazeera.net',
      'upload.wikimedia.org',
      'cdn.shortpixel.ai',
      'encrypted-tbn0.gstatic.com',
      'cdn.turing.com',
    ],
    remotePatterns: [
      { protocol: 'https', hostname: 'dlbfbhjqfleuslpvilwj.supabase.co', pathname: '/**' },
      { protocol: 'https', hostname: 'svgsilh.com', pathname: '/**' },
      { protocol: 'https', hostname: 'images.samsung.com', pathname: '/**' },
      { protocol: 'https', hostname: 'www.aljazeera.net', pathname: '/**' },
      { protocol: 'https', hostname: 'upload.wikimedia.org', pathname: '/**' },
      { protocol: 'https', hostname: 'cdn.shortpixel.ai', pathname: '/**' },
      { protocol: 'https', hostname: 'encrypted-tbn0.gstatic.com', pathname: '/**' },
      { protocol: 'https', hostname: 'cdn.turing.com', pathname: '/**' },
    ],
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE: process.env.SUPABASE_SERVICE_ROLE,
  },
};


export default nextConfig;
