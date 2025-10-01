'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import Pagination from '@/components/Pagination';
import { supabaseBrowser as supabase } from '@lib/supabaseClient';
import { useCartStore, type CartProduct } from '@/store/cart';
import { toast } from 'react-hot-toast';
import Filters from '@/components/Filters';

const PAGE_SIZE = 24;

export default function AccessoriesList() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const addToCart = useCartStore((s) => s.addToCart);

  const [accessories, setAccessories] = useState<CartProduct[]>([]);
  const [categories, setCategories] = useState<{ name: string; slug: string }[]>([]);
  const [brands, setBrands] = useState<{ name: string; slug: string }[]>([]);
  const [hasNext, setHasNext] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const categorySlug = searchParams.get('category')?.trim() || '';
  const brand = searchParams.get('brand')?.trim() || '';
  const minRaw = searchParams.get('min')?.trim() || '';
  const maxRaw = searchParams.get('max')?.trim() || '';
  const sort = (searchParams.get('sort')?.trim() || 'latest') as 'latest' | 'price_asc' | 'price_desc' | 'rating_desc' | 'sold_desc';
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

    router.replace(`/accessories?${next.toString()}`);
  };

  useEffect(() => {
    let canceled = false;
    setLoading(true);

    (async () => {
      try {
        let q = supabase.from('accessories').select('*', { count: 'exact' });

        // التحقق من وجود categorySlug وإضافتها إلى الاستعلام
        if (categorySlug) {
          const { data: catArr, error: catErr } = await supabase
            .from('categories')
            .select('id')
            .eq('slug', categorySlug)
            .limit(1);
          if (catErr) throw new Error(`Category Error: ${catErr.message}`);
          const cat = catArr?.[0];
          if (cat?.id) q = q.eq('category_id', cat.id);
        }

        // التحقق من وجود brand وإضافتها إلى الاستعلام
        if (brand) q = q.ilike('brand', `%${brand}%`);
        
        // التحقق من وجود min و max price وإضافتها إلى الاستعلام
        if (typeof min === 'number') q = q.gte('price', min);
        if (typeof max === 'number') q = q.lte('price', max);

        const { data: accessoriesData, count: totalCount, error: accessoriesError } = await q.range(from, to);
        
        if (accessoriesError) throw new Error(`Accessories Error: ${accessoriesError.message}`);

        if (canceled) return;
        setAccessories(accessoriesData);
        setHasNext(totalCount ? to + 1 < totalCount : (accessoriesData?.length ?? 0) === PAGE_SIZE);
      } catch (error) {
        console.error('fetch accessories error', error);
        toast.error('فشل في جلب البيانات!'); // عرض رسالة للمستخدم
        setAccessories([]);
        setHasNext(false);
      } finally {
        if (canceled) return;
        setLoading(false);
      }
    })();

    return () => {
      canceled = true;
    };
  }, [categorySlug, brand, min, max, sort, page, from, to]);

  useEffect(() => {
    // جلب الفئات والعلامات التجارية
    (async () => {
      try {
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('name, slug');
        
        if (categoriesError) {
          console.error('Error fetching categories', categoriesError);
          setCategories([]); // في حال حدوث خطأ، تعيين مصفوفة فارغة
        } else {
          // التحقق إذا كانت البيانات مصفوفة
          setCategories(Array.isArray(categoriesData) ? categoriesData : []);
        }

        const { data: brandsData, error: brandsError } = await supabase
          .from('brands')
          .select('name, slug');

        if (brandsError) {
          console.error('Error fetching brands', brandsError);
          setBrands([]); // في حال حدوث خطأ، تعيين مصفوفة فارغة
        } else {
          // التحقق إذا كانت البيانات مصفوفة
          setBrands(Array.isArray(brandsData) ? brandsData : []);
        }
      } catch (error) {
        console.error('Unexpected error occurred:', error);
        setCategories([]); // تعيين مصفوفة فارغة في حال حدوث أي خطأ غير متوقع
        setBrands([]); // تعيين مصفوفة فارغة في حال حدوث أي خطأ غير متوقع
      }
    })();
  }, []);

  return (
    <div className="bg-[#26333f] text-white min-h-screen pt-24 px-6 font-[Cairo]">
      <div className="max-w-6xl mx-auto bg-white text-[#26333f] p-6 rounded-lg shadow-lg">
        <div className="flex flex-col gap-6 md:flex-row">
          <aside className="w-full shrink-0 md:w-64">
            <Filters
              categories={categories}
              brands={brands}
              selectedCategory={categorySlug}
              selectedBrand={brand}
              minPrice={searchParams.get('min') ?? ''}
              maxPrice={searchParams.get('max') ?? ''}
              onChange={(filters) => updateQuery({ ...filters, page: 1 })}
            />
          </aside>

          <main className="flex-1">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h1 className="text-xl font-bold">ملحقات</h1>
              <div className="flex items-center gap-3">
                {loading && <span className="text-sm text-gray-500 animate-pulse">يتم التحميل…</span>}
                <label className="text-sm text-gray-600 flex items-center gap-2">
                  ترتيب حسب:
                  <select
                    value={sort}
                    onChange={(e) => updateQuery({ sort: e.target.value, page: 1 })}
                    className="border border-gray-300 rounded px-2 py-1 text-sm text-[#26333f] bg-white"
                  >
                    <option value="latest">الأحدث</option>
                    <option value="rating_desc">الأعلى تقييمًا</option>
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
            ) : accessories.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {accessories.map((acc, i) => (
                  <ProductCard
                    key={String(acc.id)}
                    product={acc}
                    priority={i < 6}
                    onAdd={(cartProduct: CartProduct) => {
                      addToCart(cartProduct, 1);
                      toast.success('تمت إضافة المنتج إلى السلة');
                    }}
                  />
                ))}
              </div>
            ) : (
              <p className="mt-6 text-center text-gray-500">لا توجد ملحقات متاحة بهذا الفلتر.</p>
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
