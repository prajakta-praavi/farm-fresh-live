import type { Category, DashboardOverview, FarmStayInquiry, Order, Product } from "@/admin/types";
import { getAdminToken } from "@/admin/lib/auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost/farm-fresh-dwell-main/backend";

const buildUrl = (path: string) => `${API_BASE_URL}${path}`;

async function request<T>(path: string, init?: RequestInit, withAuth = true): Promise<T> {
  const headers = new Headers(init?.headers || {});
  headers.set("Content-Type", "application/json");
  if (withAuth) {
    const token = getAdminToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(buildUrl(path), {
    ...init,
    headers,
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json?.message || "Request failed");
  }
  return json as T;
}

export const adminApi = {
  login: (email: string, password: string) =>
    request<{ token: string; user: { id: number; name: string; email: string; role: "admin" } }>(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) },
      false
    ),

  getOverview: () => request<DashboardOverview>("/api/dashboard/overview"),

  getProducts: () => request<Product[]>("/api/products"),
  getCategories: () => request<Category[]>("/api/categories"),
  addProduct: (payload: Partial<Product>) =>
    request<Product>("/api/products", { method: "POST", body: JSON.stringify(payload) }),
  updateProduct: (id: number, payload: Partial<Product>) =>
    request<Product>(`/api/products/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteProduct: (id: number) => request<{ success: boolean }>(`/api/products/${id}`, { method: "DELETE" }),
  updateStock: (id: number, stock_quantity: number) =>
    request<Product>(`/api/products/${id}/stock`, {
      method: "PATCH",
      body: JSON.stringify({ stock_quantity }),
    }),

  getOrders: () => request<Order[]>("/api/orders"),
  getOrder: (id: number) => request<Order>(`/api/orders/${id}`),
  updateOrderStatus: (id: number, order_status: Order["order_status"]) =>
    request<Order>(`/api/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ order_status }),
    }),

  getFarmStayInquiries: () => request<FarmStayInquiry[]>("/api/farm-stay-inquiries"),
  updateFarmStayStatus: (id: number, status: FarmStayInquiry["status"]) =>
    request<FarmStayInquiry>(`/api/farm-stay-inquiries/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};

