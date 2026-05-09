import { isSupabaseReady, supabase } from "./supabase-client";

export type OrderItem = {
  id: string;
  productId: string;
  productName: string;
  productPrice: string;
  quantity: number;
  totalPrice: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  deliveryNote?: string;
  status: "입금대기" | "결제완료" | "배송중" | "취소";
  createdAt: string;
  bankInfo: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    depositDue: string;
  };
};

const ORDERS_TABLE = "orders";

export const defaultBankInfo = {
  bankName: "국민은행",
  accountNumber: "123-456-7890",
  accountHolder: "럭셔리 아이웨어",
  depositDue: "48시간 이내",
};

export async function loadOrders(): Promise<OrderItem[]> {
  if (typeof window === "undefined") {
    return [];
  }

  if (!isSupabaseReady) {
    console.error("Supabase environment variables are not configured.");
    return [];
  }

  try {
    const { data, error } = await supabase!
      .from(ORDERS_TABLE)
      .select("*")
      .order("createdAt", { ascending: false });

    if (error) {
      console.error("Supabase order load failed:", error);
      return [];
    }

    return Array.isArray(data) ? (data as OrderItem[]) : [];
  } catch (error) {
    console.error("Supabase order load failed:", error);
    return [];
  }
}

export async function saveOrders(orders: OrderItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  if (!isSupabaseReady) {
    throw new Error("Supabase environment variables are not configured.");
  }

  const deleteResult = await supabase!.from(ORDERS_TABLE).delete().neq("id", "");
  if (deleteResult.error) {
    console.error("Supabase order bulk delete failed:", deleteResult.error);
    throw deleteResult.error;
  }

  if (orders.length > 0) {
    const { error } = await supabase!.from(ORDERS_TABLE).insert(orders);
    if (error) {
      console.error("Supabase order bulk save failed:", error);
      throw error;
    }
  }
}

export async function appendOrder(order: OrderItem) {
  if (typeof window === "undefined") {
    return;
  }

  if (!isSupabaseReady) {
    throw new Error("Supabase environment variables are not configured.");
  }

  const { error } = await supabase!.from(ORDERS_TABLE).insert(order);
  if (error) {
    console.error("Supabase order insert failed:", error);
    throw error;
  }
}

export async function updateOrder(updatedOrder: OrderItem) {
  if (!isSupabaseReady) {
    throw new Error("Supabase environment variables are not configured.");
  }

  const { error } = await supabase!
    .from(ORDERS_TABLE)
    .update(updatedOrder)
    .eq("id", updatedOrder.id);
  if (error) {
    console.error("Supabase order update failed:", error);
    throw error;
  }
}

export async function deleteOrder(orderId: string) {
  if (!isSupabaseReady) {
    throw new Error("Supabase environment variables are not configured.");
  }

  const { error } = await supabase!.from(ORDERS_TABLE).delete().eq("id", orderId);
  if (error) {
    console.error("Supabase order delete failed:", error);
    throw error;
  }
}

export async function clearOrders() {
  if (typeof window === "undefined") return;

  if (!isSupabaseReady) {
    throw new Error("Supabase environment variables are not configured.");
  }

  const { error } = await supabase!.from(ORDERS_TABLE).delete().neq("id", "");
  if (error) {
    console.error("Supabase clear orders failed:", error);
    throw error;
  }
}
