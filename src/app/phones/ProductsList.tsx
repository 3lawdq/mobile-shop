'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { supabaseBrowser as supabase } from '@lib/supabaseClient';
import Pagination from '@/components/Pagination';
import Filters from '@/components/Filters'; 
import { useCartStore, type CartProduct } from '@/store/cart';
import ProductCard from '@/components/ProductCard'; // تأكد من استيراد ProductCard هنا

const PAGE_SIZE = 24;

type ProductRow = {
  id: number | string;
  slug: string;
  name: string;
  price?: number | null;
  final_price?: number | null;
  rating?: number | null;
  image?: string | null;
  cover_url?: string | null;
  brand_id?: number | string | null;
  brand_name?: string | null; 
  primary_color?: string | null;
  similar_color?: string | null;
};

type CategoryLite = { name: string; slug: string };
type BrandLite = { name: string; slug: string };

export default function ProductsList() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const addToCart = useCartStore((s) => s.addToCart);

  const [items, setItems] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<CategoryLite[]>([]);  
  const [brands, setBrands] = useState<BrandLite[]>([]);  

  const [hasNext, setHasNext] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const categorySlug = searchParams.get('category')?.trim() || '';
  const brandName = searchParams.get('author')?.trim() || ''; 
  const minRaw = searchParams.get('min')?.trim() || '';
  const maxRaw = searchParams.get('max')?.trim() || '';
  const sort = (searchParams.get('sort')?.trim() || 'latest') as
    'latest' | 'price_asc' | 'price_desc' | 'rating_desc' | 'sold_desc';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));

  const min = minRaw && !isNaN(Number(minRaw)) ? Number(minRaw) : undefined;
  const max = maxRaw && !isNaN(Number(maxRaw)) ? Number(maxRaw) : undefined;
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const updateQuery = (params: Record<string, string | number | undefined | null>) => {
    const current = new URLSearchParams(searchParams.toString());
    const next = new URLSearchParams(current.toString());

    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === '' || value === undefined) next.delete(key);
      else next.set(key, String(value));
    });

    if (next.toString() === current.toString()) return;
    router.replace(`/phones?${next.toString()}`);
  };

  useEffect(() => {
    let canceled = false;

    (async () => {
      try {
        const [{ data: cats }, { data: brs }] = await Promise.all([
          supabase.from('categories').select('name,slug').order('name', { ascending: true }),
          supabase.from('brands').select('name,slug').order('name', { ascending: true }),
        ]);

        if (canceled) return;
        setCategories((cats ?? []) as CategoryLite[]);
        setBrands((brs ?? []) as BrandLite[]);  
      } catch {
        if (!canceled) {
          setCategories([]);
          setBrands([]);
        }
      }
    })();

    return () => { canceled = true; };
  }, []);

  useEffect(() => {
    let canceled = false;
    setLoading(true);

    (async () => {
      try {
        let q = supabase.from('products').select('*', { count: 'exact' });

        if (categorySlug) {
          const { data: catArr } = await supabase
            .from('categories')
            .select('id')
            .eq('slug', categorySlug)
            .limit(1);
          const cat = catArr?.[0];
          if (cat?.id) q = q.eq('category_id', cat.id);
        }

        if (brandName) {
          q = q.ilike('brand_name', `%${brandName}%`); 
        }

        if (typeof min === 'number') q = q.gte('final_price', min).gte('price', min);
        if (typeof max === 'number') q = q.lte('final_price', max).lte('price', max);

        const { data, count, error } = await q.range(from, to);
        if (error) throw error;

        if (canceled) return;
        setItems((data ?? []) as ProductRow[]);
        setHasNext(count ? to + 1 < count : (data?.length ?? 0) === PAGE_SIZE);
      } catch (error) {
        console.error('fetch products error', error);
        if (!canceled) {
          setItems([]);
          setHasNext(false);
        }
      } finally {
        if (!canceled) setLoading(false);
      }
    })();

    return () => { canceled = true; };
  }, [categorySlug, brandName, min, max, sort, page, from, to]);

  const renderCardPrice = (p: ProductRow) => {
    const price = typeof p.final_price === 'number' ? p.final_price : (typeof p.price === 'number' ? p.price : null);
    return price != null ? `${price.toFixed(2)} ر.س` : '—';
  };

  const toCartShape = (p: ProductRow): CartProduct => {
    const img =
      (p.cover_url && p.cover_url.startsWith('http')) ? p.cover_url :
      (p.image && p.image.startsWith('http')) ? p.image : '/vercel.svg';

    return {
      id: p.id,
      name: p.name,  // هنا نستخدم name بدلاً من title
      price: typeof p.price === 'number' ? p.price : (typeof p.final_price === 'number' ? p.final_price : 0),
      image: img,
      slug: p.slug,
      rating: typeof p.rating === 'number' ? p.rating : undefined,
      thumbnail_url: p.cover_url ?? '',  // استبدال cover_url بـ thumbnail_url
      created_at: '',
    };
  };

  const list = useMemo(() => items ?? [], [items]);

  return (
    <div className="bg-white text-slate-900 min-h-screen pt-24 px-6 font-[Cairo]">
      <div className="max-w-6xl mx-auto bg-white p-6 rounded-lg">
        <div className="flex flex-col gap-6 md:flex-row">
          <aside className="w-full shrink-0 md:w-64">
            <Filters
              categories={categories}
              brands={brands}
              selectedCategory={categorySlug}
              selectedBrand={brandName}
              minPrice={searchParams.get('min') ?? ''}
              maxPrice={searchParams.get('max') ?? ''}
              onChange={(filters) => updateQuery({ ...filters, page: 1 })}
            />
          </aside>

          <main className="flex-1">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h1 className="text-xl font-bold">الهواتف والإكسسوارات</h1>
              <div className="flex items-center gap-3">
                {loading && <span className="text-sm text-gray-500 animate-pulse">يتم التحميل…</span>}
                <label className="text-sm text-gray-600 flex items-center gap-2">
                  ترتيب حسب:
                  <select
                    value={sort}
                    onChange={(e) => updateQuery({ sort: e.target.value, page: 1 })}
                    className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
                  >
                    <option value="latest">الأحدث</option>
                    <option value="rating_desc">الأفضل تقييمًا</option>
                    <option value="price_asc">السعر: من الأقل للأعلى</option>
                    <option value="price_desc">السعر: من الأعلى للأقل</option>
                    <option value="sold_desc">الأكثر مبيعًا</option>
                  </select>
                </label>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-lg border border-gray-200 overflow-hidden">
                    <div className="h-40 bg-gray-100 animate-pulse" />
                    <div className="p-3 space-y-2">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      <div className="h-4 w-2/3 bg-gray-100 rounded animate-pulse" />
                      <div className="h-8 bg-gray-100 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : list.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {list.map((p, i) => {
                  return (
                    <ProductCard key={p.id} product={p} />
                  );
                })}
              </div>
            ) : (
              <p className="mt-6 text-center text-gray-500">لا توجد منتجات بهذه الفلاتر.</p>
            )}

            <Pagination
              page={page}
              hasNext={hasNext}
              onPageChange={(newPage) => updateQuery({ page: newPage })}
            />
          </main>
        </div>
      </div>
    </div>
  );
}
