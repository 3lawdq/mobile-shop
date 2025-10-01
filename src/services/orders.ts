import { supabaseBrowser } from "@lib/supabaseClient";  // تأكد من المسار الصحيح

// تعريف نوع البيانات الخاصة بالطلب
export type OrderItem = {
  id: number;
  title: string;
  image: string;
  quantity: number;
};

export type Order = {
  id: string;
  created_at: string;
  total: number;
  items: OrderItem[] | null;
  status: string;
  user_id: string;
};

// وظيفة لجلب جميع الطلبات
export const getAllOrders = async () => {
  try {
    const { data, error } = await supabaseBrowser
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    // تحويل البيانات إلى النوع Order[]
    if (data) {
      return data.map((item: any) => ({
        id: item.id,
        created_at: item.created_at,
        total: item.total,
        items: item.items ? item.items.map((i: any) => ({
          id: i.id,
          title: i.title,
          image: i.image,
          quantity: i.quantity,
        })) : null,
        status: item.status,
        user_id: item.user_id,
      })) as Order[];
    }
    return [];
  } catch (error) {
    console.error("Error fetching orders:", error);
    throw error;
  }
};

// وظيفة لجلب طلب معين بناءً على معرف الـ id
export const getOrderById = async (id: string) => {
  try {
    const { data, error } = await supabaseBrowser
      .from("orders")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw new Error(error.message);

    // تحويل البيانات إلى النوع Order
    return {
      id: data.id,
      created_at: data.created_at,
      total: data.total,
      items: data.items ? data.items.map((i: any) => ({
        id: i.id,
        title: i.title,
        image: i.image,
        quantity: i.quantity,
      })) : null,
      status: data.status,
      user_id: data.user_id,
    } as Order;
  } catch (error) {
    console.error("Error fetching order:", error);
    throw error;
  }
};

// باقي الوظائف تبقى كما هي، فقط تأكد من تحويل البيانات بشكل صحيح باستخدام `map` مثل المثال السابق.
