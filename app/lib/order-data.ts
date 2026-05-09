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

const ORDER_STORAGE_KEY = "lux-eyewear-orders";

export const defaultBankInfo = {
  bankName: "국민은행",
  accountNumber: "123-456-7890",
  accountHolder: "럭셔리 아이웨어",
  depositDue: "48시간 이내",
};

export function loadOrders(): OrderItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const saved = window.localStorage.getItem(ORDER_STORAGE_KEY);
    if (!saved) return [];
    return JSON.parse(saved) as OrderItem[];
  } catch {
    return [];
  }
}

export function saveOrders(orders: OrderItem[]) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(orders));
}

export function appendOrder(order: OrderItem) {
  const current = loadOrders();
  saveOrders([...current, order]);
}

export function updateOrder(updatedOrder: OrderItem) {
  const current = loadOrders();
  const next = current.map((order) => (order.id === updatedOrder.id ? updatedOrder : order));
  saveOrders(next);
}

export function deleteOrder(orderId: string) {
  const current = loadOrders();
  const next = current.filter((order) => order.id !== orderId);
  saveOrders(next);
}

export function clearOrders() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ORDER_STORAGE_KEY);
}
