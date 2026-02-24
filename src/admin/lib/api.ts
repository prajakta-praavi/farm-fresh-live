import type {
  AdminProfile,
  Attribute,
  AttributeTerm,
  Category,
  CustomerRecord,
  DashboardOverview,
  FarmStayInquiry,
  Order,
  Product,
  ProductVariation,
} from "@/admin/types";
import { clearAdminSession, getAdminToken } from "@/admin/lib/auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost/farm-fresh-dwell-main/backend";

const buildUrl = (path: string) => `${API_BASE_URL}${path}`;

function handleUnauthorized(response: Response): void {
  if (response.status !== 401) return;
  clearAdminSession();
  window.location.href = "/admin/login";
}

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
    credentials: "include",
  });
  handleUnauthorized(response);

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json?.message || "Request failed");
  }
  return json as T;
}

export const adminApi = {
  login: (email: string, password: string) =>
    request<{
      token: string;
      user: { id: number; name: string; username?: string; email: string; profile_image?: string | null; last_login?: string | null; role: "admin" };
    }>(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) },
      false
    ),
  logout: () => request<{ success: boolean }>("/api/auth/logout", { method: "POST" }),
  getAdminMe: () => request<AdminProfile>("/api/admin/me"),
  updateAdminProfile: (payload: { name: string; username: string; email: string }) =>
    request<AdminProfile>("/api/admin/profile", { method: "PUT", body: JSON.stringify(payload) }),
  changeAdminPassword: (payload: { current_password: string; new_password: string }) =>
    request<{ success: boolean }>("/api/admin/profile/password", { method: "PATCH", body: JSON.stringify(payload) }),
  uploadAdminProfileImage: async (file: File) => {
    const formData = new FormData();
    formData.append("image", file);

    const headers = new Headers();
    const token = getAdminToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);

    const response = await fetch(buildUrl("/api/admin/profile/photo"), {
      method: "POST",
      headers,
      body: formData,
      credentials: "include",
    });
    handleUnauthorized(response);

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(json?.message || "Profile image upload failed");
    }
    return json as { profile_image: string };
  },

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
  getProductVariations: (productId: number) => request<ProductVariation[]>(`/api/products/${productId}/variations`),
  saveProductVariations: (productId: number, variations: ProductVariation[]) =>
    request<{ success: boolean }>(`/api/products/${productId}/variations`, {
      method: "PUT",
      body: JSON.stringify({ variations }),
    }),

  getAttributes: () => request<Attribute[]>("/api/attributes"),
  addAttribute: (name: string) =>
    request<Attribute>("/api/attributes", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  updateAttribute: (id: number, name: string) =>
    request<Attribute>(`/api/attributes/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name }),
    }),
  deleteAttribute: (id: number) =>
    request<{ success: boolean }>(`/api/attributes/${id}`, {
      method: "DELETE",
    }),

  getAttributeTerms: (attributeId: number) => request<AttributeTerm[]>(`/api/attributes/${attributeId}/terms`),
  addAttributeTerm: (attributeId: number, payload: { term_name?: string; quantity_value?: number | string; unit?: string }) =>
    request<AttributeTerm>(`/api/attributes/${attributeId}/terms`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateAttributeTerm: (termId: number, payload: { term_name?: string; quantity_value?: number | string; unit?: string }) =>
    request<AttributeTerm>(`/api/attribute-terms/${termId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteAttributeTerm: (termId: number) =>
    request<{ success: boolean }>(`/api/attribute-terms/${termId}`, {
      method: "DELETE",
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

  uploadProductImage: async (file: File) => {
    const formData = new FormData();
    formData.append("image", file);

    const headers = new Headers();
    const token = getAdminToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);

    const response = await fetch(buildUrl("/api/uploads"), {
      method: "POST",
      headers,
      body: formData,
      credentials: "include",
    });
    handleUnauthorized(response);

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(json?.message || "Image upload failed");
    }
    return json as { image_url: string };
  },

  getCustomers: (search = "") =>
    request<CustomerRecord[]>(`/api/admin/customers${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ""}`),
  deleteCustomer: (id: number) => request<{ success: boolean }>(`/api/admin/customers/${id}`, { method: "DELETE" }),
  getCustomerOrders: (id: number) => request<Order[]>(`/api/admin/customers/${id}/orders`),
};
