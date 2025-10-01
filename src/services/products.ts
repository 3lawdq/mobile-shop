import { supabaseBrowser } from "@lib/supabaseClient"; // تأكد من أن المسار صحيح

export type Product = {
  id: string;
  slug: string;
  title: string;
  brand: string;
  price: number;
  rating: number;
  image: string;
  description: string;
  is_new: boolean;
  is_trending: boolean;
  discount_percent: number;
  stock: number;
  category: string;
  created_at: string;
};

// وظيفة لجلب جميع المنتجات
export const getAllProducts = async () => {
  try {
    const { data, error } = await supabaseBrowser
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    // تحقق من هيكل البيانات المسترجعة وتأكد من أنه يتوافق مع Product[]
    if (data) {
      // التعامل مع البيانات للتأكد من التوافق مع Product[]
      return data.map((item: any) => ({
        id: item.id,
        slug: item.slug,
        title: item.title || '',
        brand: item.brand || '',
        price: item.price || 0,
        rating: item.rating || 0,
        image: item.image || '',
        description: item.description || '',
        is_new: item.is_new || false,
        is_trending: item.is_trending || false,
        discount_percent: item.discount_percent || 0,
        stock: item.stock || 0,
        category: item.category || '',
        created_at: item.created_at || '',
      })) as Product[];
    }
    return [];
  } catch (error) {
    console.error("Error fetching products:", error);
    throw error;
  }
};
