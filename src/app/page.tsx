'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { supabaseBrowser as supabase } from '@lib/supabaseClient';
import ProductCard from '@/components/ProductCard';
import { toast } from 'react-hot-toast';
import { motion, Variants } from 'framer-motion';

// Components for client-side only
const TopSlider = dynamic(() => import('@/components/TopSlider'), { ssr: false });
const PageSeo = dynamic(() => import('@/components/PageSeo'), { ssr: false });

// 🛒 Cart store
import { useCartStore } from '@/store/cart';

// ---------- Types ----------
interface Product {
  id: number | string;
  name?: string;
  brand_id?: number | null;
  category_id?: number | null;
  thumbnail_url?: string | null;
  slug?: string | null;
  price?: number | null;
  final_price?: number | null;
  discount_percent?: number | null;
  rating?: number | null;
  description?: string | null;
  created_at?: string | null;
  is_new?: boolean;
  is_trending?: boolean;
}

// ---------- Helper functions ----------
const validImage = (url?: string | null) =>
  url && typeof url === 'string' && url.startsWith('http') ? url : '/vercel.svg';

// ---------- Variants for animations ----------
const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: [0.98, 1.01, 1],
    transition: { duration: 0.7, ease: 'easeOut' },
  },
};

const gridContainerVariants: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const gridItemVariants: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: 'easeOut' } },
};

// ---------- Section component ----------
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.section
      className="py-10 md:py-14 first:pt-8 md:first:pt-10 last:pb-8 md:last:pb-10"
      variants={sectionVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.18 }}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <h3 className="text-2xl md:text-3xl font-extrabold text-primary mb-5">{title}</h3>
        {children}
      </div>
    </motion.section>
  );
}

function ProductsSkeleton({ count = 8 }: { count?: number }) {
  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6"
      variants={gridContainerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="rounded-2xl bg-white ring-1 ring-black/5 shadow-sm overflow-hidden"
          variants={gridItemVariants}
        >
          <div className="h-56 bg-gray-100 animate-pulse" />
          <div className="p-4 space-y-3">
            <div className="h-4 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse" />
            <div className="h-9 bg-gray-200 rounded animate-pulse" />
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

function Hero() {
  return (
    <motion.section
      className="relative overflow-hidden"
      variants={sectionVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[#ff8a1a] via-[#ee7103] to-[#d56503]" />
      <div className="absolute inset-0 opacity-[0.06] bg-[url('/noise.svg')] bg-cover" />
      <div className="relative max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-20 text-center text-white">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          تسوّق هواتفك وإكسسواراتك من <span className="underline decoration-white/50">Mobile Shop</span>
        </h1>
        <p className="mt-4 md:mt-6 text-lg md:text-xl text-white/90">
          أحدث الهواتف، سماعات، شواحن، وحمايات — اختيارات أصلية وبأفضل الأسعار.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/phones"
            className="inline-flex items-center justify-center rounded-xl bg-white text-gray-900 px-6 py-3 font-semibold hover:opacity-90 transition"
          >
            استكشف الهواتف
          </Link>
          <Link
            href="/accessories"
            className="inline-flex items-center justify-center rounded-xl bg-gray-900/10 text-white border border-white/30 px-6 py-3 font-semibold hover:bg-white/10 transition"
          >
            تصفح الإكسسوارات
          </Link>
        </div>
      </div>
    </motion.section>
  );
}

function FeaturedCategories() {
  const cats = [
    { label: 'هواتف', emoji: '📱', href: '/phones' },
    { label: 'سماعات', emoji: '🎧', href: '/categories/سماعات' },
    { label: 'شواحن', emoji: '🔌', href: '/categories/شواحن' },
    { label: 'إكسسوارات', emoji: '🧩', href: '/accessories' },
  ];

  return (
    <Section title="تصنيفات مختارة">
      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-6 justify-center"
        variants={gridContainerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
      >
        {cats.map((c) => (
          <motion.div key={c.label} variants={gridItemVariants}>
            <Link
              href={c.href}
              className="group flex flex-col items-center justify-center bg-white text-gray-900 rounded-2xl p-6 ring-1 ring-black/5 shadow-sm hover:shadow-md transition-all duration-300"
            >
              <div className="flex items-center gap-2 text-2xl font-bold">
                <span>{c.emoji}</span>
                <span>{c.label}</span>
              </div>
              <div className="mt-2 text-sm text-primary group-hover:translate-x-1 transition">
                تصفح الآن →
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      <div className="text-center mt-6">
        <Link href="/categories" className="underline text-primary hover:text-primary-dark transition">
          عرض كل التصنيفات
        </Link>
      </div>
    </Section>
  );
}

// ---------- الصفحة ----------
export default function Home() {
  const [newProducts, setNewProducts] = useState<Product[]>([]);
  const [topProducts, setTopProducts] = useState<Product[]>([]);
  const [bestRatedProducts, setBestRatedProducts] = useState<Product[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const addToCart = useCartStore((s) => s.addToCart);

  useEffect(() => {
    (async () => {
      setLoading(true);

      const { data: newest, error: newestErr } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(8);
      if (!newestErr && newest) setNewProducts(newest as Product[]);

      const { data: bestRated, error: ratedErr } = await supabase
        .from('products')
        .select('*')
        .order('rating', { ascending: false })
        .limit(8);
      if (!ratedErr && bestRated) setBestRatedProducts(bestRated as Product[]);

      let trending: Product[] = [];
      const { data: byTrending, error: trErr } = await supabase
        .from('products')
        .select('*')
        .eq('is_trending', true)
        .order('created_at', { ascending: false })
        .limit(8);
      if (!trErr && byTrending && (byTrending as Product[]).length > 0) {
        trending = byTrending as Product[];
      } else {
        trending = (newest as Product[]) || [];
      }
      setTrendingProducts(trending);

      const { data: sliderRaw } = await supabase
        .from('products')
        .select('*')
        .order('rating', { ascending: false })
        .limit(16);
      const slider = (sliderRaw || [])
        .filter((p: Product) => validImage(p.thumbnail_url))
        .slice(0, 6);
      setTopProducts(slider as Product[]);

      setLoading(false);
    })();
  }, []);

  const descBase = 'اكتشف أحدث الهواتف والإكسسوارات الأصلية بأسعار منافسة وخدمة موثوقة.';
  const description = topProducts.length
    ? `${descBase} تصفح المنتجات الأعلى تقييماً والأكثر رواجاً والواصل حديثاً مع عروض مميزة.`
    : descBase;

  const sectionLinks: Record<string, string> = {
    'الأفضل تقييمًا': '/phones?sort=rating_desc',
    'الأكثر رواجًا': '/phones?sort=trending',
    'وصل حديثاً': '/phones?sort=latest',
  };

  return (
    <div className="bg-white text-gray-900 min-h-screen font-[Cairo]">
      <PageSeo
        title="الرئيسية"
        description={description}
        path="/"
        image={topProducts.length ? validImage(topProducts[0].thumbnail_url) : undefined}
      />

      <main className="pt-14 md:pt-16 space-y-8 md:space-y-12">
        {topProducts.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            <TopSlider
              items={topProducts
                .filter((p) => p.name && p.thumbnail_url && (p.slug || p.id))
                .map((p) => ({
                  name: p.name!,
                  slug: p.slug || String(p.id),
                  thumbnail_url: validImage(p.thumbnail_url),
                }))}
            />
          </div>
        )}

        <Hero />

        <FeaturedCategories />

        {[ 
          { title: 'الأفضل تقييمًا', data: bestRatedProducts },
          { title: 'الأكثر رواجًا', data: trendingProducts },
          { title: 'وصل حديثاً', data: newProducts },
        ].map((section, i) => (
          <Section key={i} title={section.title}>
            {loading ? (
              <ProductsSkeleton />
            ) : section.data.length > 0 ? (
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6"
                variants={gridContainerVariants}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.18 }}
              >
                {section.data.map((product) => (
                  <motion.div key={product.id} variants={gridItemVariants}>
                    <ProductCard
                      product={product}
                      priority
                      onAdd={(p) => {
                        addToCart(p, 1);
                        toast.success('تمت إضافة المنتج إلى السلة');
                      }}
                    />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <p className="text-center text-gray-500">لا توجد منتجات متاحة الآن.</p>
            )}
            <div className="text-center mt-6">
              <Link
                href={sectionLinks[section.title] || '/phones'}
                className="inline-flex items-center gap-2 underline text-primary hover:text-primary-dark transition"
              >
                عرض الكل
                <span aria-hidden>→</span>
              </Link>
            </div>
          </Section>
        ))}

        <Section title="من نحن">
          <p className="max-w-2xl mx-auto text-center text-lg text-gray-700">
            Mobile Shop وجهتك الأولى لأحدث الهواتف والإكسسوارات الأصلية. نحرص على تجربة شراء
            سهلة وسريعة ودعم مابعد البيع لتكون راضيًا دائمًا.
          </p>
        </Section>
      </main>

      <Link
        href="https://wa.me/966500000000"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 left-6 bg-[#25D366] text-white px-4 py-3 rounded-full shadow-lg hover:scale-105 transition-all"
      >
        تواصل عبر واتساب
      </Link>

      <footer className="border-t border-gray-200 mt-10">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-10 text-center text-sm text-gray-600">
          <p className="text-primary font-semibold">
            © {new Date().getFullYear()} Mobile Shop. جميع الحقوق محفوظة.
          </p>
          <p className="opacity-80 mt-1">اختيارات ذكية، تجربة أذكى.</p>
        </div>
      </footer>
    </div>
  );
}
