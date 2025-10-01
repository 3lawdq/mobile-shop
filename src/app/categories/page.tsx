import Link from 'next/link';
import { createSupabaseServerClient } from '@lib/supabaseServerClient';
import PageSeo from '@/components/PageSeo';
import ClientOnly from '@/components/ClientOnly';

type Category = {
  id: number;
  name: string;
  slug: string;
  created_at: string | null;
  count: number;
};

export const revalidate = 0;

export default async function CategoriesPage() {
  const supabase = await createSupabaseServerClient();

  // جلب جميع التصنيفات
  const { data, error } = await supabase
    .from('categories')
    .select('id,name,slug,created_at')
    .order('name', { ascending: true });

  if (error || !data) {
    return (
      <div className="min-h-screen bg-white text-slate-900 pt-24 px-6 font-[Cairo]">
        <h1 className="text-3xl font-bold text-center text-[#b89c70] mb-10">📱 جميع التصنيفات</h1>
        <p className="text-center">حدث خطأ في جلب التصنيفات.</p>
      </div>
    );
  }

  // جلب عدد المنتجات المرتبطة بكل تصنيف
  const categories: Category[] = await Promise.all(
    data.map(async (c) => {
      const { data: productsData, error: productsError } = await supabase
        .from('products')          // ← استبدال books بـ products
        .select('id', { count: 'exact' })
        .eq('category_id', c.id);

      if (productsError) {
        // لا نكسر الصفحة—نُظهر 0 عند الخطأ
      }

      const productCount = productsData ? productsData.length : 0;

      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        created_at: c.created_at,
        count: productCount,
      };
    })
  );

  return (
    <div className="min-h-screen bg-white text-slate-900 pt-24 px-6 font-[Cairo]">
      <ClientOnly>
        <PageSeo title="جميع التصنيفات" path="/categories" />
      </ClientOnly>

      <h1 className="text-3xl font-bold text-center text-[#b89c70] mb-10">📱 جميع التصنيفات</h1>

      {categories.length === 0 ? (
        <p className="text-center">لا توجد تصنيفات حاليًا.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/categories/${encodeURIComponent(cat.slug)}`}
              className="bg-white border border-gray-200 text-slate-900 p-6 rounded shadow hover:scale-105 transition-all duration-300 text-center"
            >
              <h2 className="text-xl font-bold mb-2">{cat.name}</h2>
              <p className="text-sm text-gray-600">{cat.count} منتج</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
