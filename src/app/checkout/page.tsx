'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import toast from 'react-hot-toast';
import { supabaseBrowser } from '@lib/supabaseClient';
import { useCartStore } from '@/store/cart';

interface RawProduct {
  id: string | number;
  title?: string | null;         // اسم المنتج/الهاتف
  brand?: string | null;         // العلامة التجارية (بديل author)
  category_id?: number | null;
  price?: number | null;
  final_price?: number | null;
  cover_url?: string | null;
  image_url?: string | null;     // إن وجِدت
  rating?: number | null;
  slug?: string | null;
  created_at?: string | null;
  stock?: number | null;
  primary_color?: string | null; // ميزات إضافية للهواتف
  similar_colors?: string[] | null;
}

export default function CategoryPage() {
  const params = useParams();
  const slugParam = params?.category;
  const decodedCategory = typeof slugParam === 'string' ? decodeURIComponent(slugParam) : '';

  const [products, setProducts] = useState<RawProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // فلاتر الهواتف
  const [brands, setBrands] = useState<string[]>([]);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedRating, setSelectedRating] = useState(0);
  const [sortOrder, setSortOrder] = useState('');

  const addToCart = useCartStore((s) => s.addToCart);

  // محوّل RawProduct → عنصر للسلة متوافق مع المتجر الحالي
  const toCartItem = (p: RawProduct) => ({
    id: p.id,
    name: p.title ?? 'بدون اسم',  // التأكد من وجود name
    price: p.final_price ?? p.price ?? 0,
    image: p.cover_url ?? p.image_url ?? '/vercel.svg',
    slug: p.slug ?? undefined,
    rating: p.rating ?? undefined,
    category: String(p.category_id ?? ''),
    cover_url: p.cover_url ?? '',
    created_at: p.created_at ?? '',
    note: p.brand ?? undefined, // اختياري: حفظ العلامة داخل note
  });

  useEffect(() => {
    const fetchProducts = async () => {
      if (!decodedCategory) return;
      setLoading(true);
      try {
        // إيجاد التصنيف
        const { data: categoryRow, error: catErr } = await supabaseBrowser
          .from('categories')
          .select('id')
          .eq('slug', decodedCategory)
          .maybeSingle();

        if (catErr) throw catErr;

        if (!categoryRow?.id) {
          setProducts([]);
          setBrands([]);
          setLoading(false);
          return;
        }

        // جلب المنتجات داخل هذا التصنيف
        const { data: productsData, error: productsErr } = await supabaseBrowser
          .from('products')
          .select('*') // نحتاج كل الحقول (rating, stock, primary_color ...)
          .eq('category_id', categoryRow.id);

        if (productsErr) throw productsErr;

        const list = (productsData ?? []) as RawProduct[];
        setProducts(list);

        // قائمة العلامات التجارية (brand) المتاحة
        const uniqBrands = Array.from(
          new Set(list.map((b) => (b.brand ?? '').trim()).filter(Boolean))
        ).sort();
        setBrands(uniqBrands);
      } catch (err: unknown) {
        console.error(err);
        toast.error('حدث خطأ أثناء تحميل المنتجات');
        setProducts([]);
        setBrands([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [decodedCategory]);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (selectedBrand) result = result.filter((p) => (p.brand ?? '').trim() === selectedBrand);
    if (selectedRating > 0) result = result.filter((p) => (p.rating ?? 0) >= selectedRating);

    if (sortOrder === 'price_asc')
      result.sort(
        (a, b) => (a.final_price ?? a.price ?? 0) - (b.final_price ?? b.price ?? 0)
      );
    else if (sortOrder === 'price_desc')
      result.sort(
        (a, b) => (b.final_price ?? b.price ?? 0) - (a.final_price ?? a.price ?? 0)
      );

    return result;
  }, [products, selectedBrand, selectedRating, sortOrder]);

  return (
    <div className="bg-white text-slate-900 min-h-screen pt-24 px-6 font-[Cairo]">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">📱 تصنيف: {decodedCategory}</h1>

        {/* شريط الفلاتر (علامة تجارية / تقييم / ترتيب) */}
        <div className="bg-white border border-gray-200 p-4 rounded shadow mb-6 flex flex-wrap gap-4 justify-between items-center sticky top-24 z-10">
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="p-2 border rounded"
          >
            <option value="">كل العلامات</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <select
            value={selectedRating}
            onChange={(e) => setSelectedRating(Number(e.target.value))}
            className="p-2 border rounded"
          >
            <option value={0}>كل التقييمات</option>
            {[5, 4, 3, 2, 1].map((r) => (
              <option key={r} value={r}>
                {r} نجوم أو أكثر
              </option>
            ))}
          </select>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="p-2 border rounded"
          >
            <option value="">ترتيب افتراضي</option>
            <option value="price_asc">السعر: من الأقل إلى الأعلى</option>
            <option value="price_desc">السعر: من الأعلى إلى الأقل</option>
          </select>
        </div>

        {loading ? (
          <p className="text-center">جاري تحميل المنتجات...</p>
        ) : filteredProducts.length === 0 ? (
          <p className="text-center">لا توجد منتجات في هذا التصنيف حالياً.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product, i) => (
              <ProductCard
                key={product.id}
                product={product}
                priority={i < 4}
                onAdd={() => {
                  const cartItem = toCartItem(product);
                  addToCart(cartItem, 1);
                  toast.success('تمت إضافة المنتج إلى السلة');
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
