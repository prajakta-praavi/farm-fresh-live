import type {
  AdminProfile,
  Attribute,
  AttributeTerm,
  BlogCategory,
  BlogPost,
  Category,
  Coupon,
  CustomerRecord,
  DashboardOverview,
  FarmStayInquiry,
  ManagedUser,
  Order,
  PaginatedUsers,
  Product,
  StockMovement,
  ProductVariation,
  UserRole,
} from "@/admin/types";
import { clearAdminSession, getAdminToken } from "@/admin/lib/auth";

const CONFIGURED_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
const CONFIGURED_API_CANDIDATES = CONFIGURED_API_BASE_URL
  ? CONFIGURED_API_BASE_URL.endsWith("/index.php")
    ? [CONFIGURED_API_BASE_URL]
    : [`${CONFIGURED_API_BASE_URL}/index.php`, CONFIGURED_API_BASE_URL]
  : [];
const FALLBACK_API_BASE_URLS =
  typeof window !== "undefined"
    ? [
        `${window.location.origin}/backend/index.php`,
        `${window.location.origin}/backend`,
        `${window.location.origin}/farm-fresh/farm-fresh-live/backend/index.php`,
        `${window.location.origin}/farm-fresh/farm-fresh-live/backend`,
        `${window.location.origin}/farm-fresh/backend/index.php`,
        `${window.location.origin}/farm-fresh/backend`,
        "http://localhost/farm-fresh/farm-fresh-live/backend",
        "http://localhost/farm-fresh/backend",
        "https://api.rushivanagro.com",
        "https://www.rushivanagro.com/backend/index.php",
        "https://www.rushivanagro.com/backend",
      ]
    : [];
const API_BASE_CANDIDATES = Array.from(
  new Set([...CONFIGURED_API_CANDIDATES, ...FALLBACK_API_BASE_URLS].filter(Boolean))
);
const buildUrl = (baseUrl: string, path: string) => `${baseUrl}${path}`;
const NON_RETRYABLE_ERROR = "NON_RETRYABLE_HTTP_ERROR";
const isJsonResponse = (response: Response): boolean =>
  (response.headers.get("content-type") || "").toLowerCase().includes("application/json");
const looksLikeHtmlPayload = (payload: unknown): boolean => {
  if (!payload || typeof payload !== "object") return false;
  const raw = String((payload as { _raw?: string })._raw || "").trim().toLowerCase();
  return raw.startsWith("<!doctype") || raw.startsWith("<html");
};

async function parseJsonResponse(response: Response): Promise<unknown> {
  const raw = await response.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return { _raw: raw };
  }
}

function toApiErrorMessage(payload: unknown, defaultMessage: string, response: Response): string {
  if (payload && typeof payload === "object") {
    const message = String((payload as { message?: string }).message || "").trim();
    if (message) return message;
    const raw = String((payload as { _raw?: string })._raw || "").trim();
    if (raw) return `${defaultMessage} (HTTP ${response.status}): ${raw.slice(0, 200)}`;
  }
  return `${defaultMessage} (HTTP ${response.status})`;
}

function handleUnauthorized(response: Response): void {
  if (response.status !== 401) return;
  clearAdminSession();
  window.location.href = "/admin/login";
}

const isRouteNotFound = (response: Response, payload: unknown): boolean => {
  if (response.status === 404) return true;
  if (!payload || typeof payload !== "object") return false;
  const message = String((payload as { message?: string }).message || "").toLowerCase();
  if (message.includes("route not found") || message.includes("not found")) {
    return true;
  }
  const raw = String((payload as { _raw?: string })._raw || "").toLowerCase();
  return raw.includes("not found") || raw.includes("404");
};

const shouldTryNextBase = (response: Response, payload: unknown): boolean => {
  if (isRouteNotFound(response, payload)) return true;
  // Some live servers return 405 when /backend/api/* is not routed to index.php.
  return response.status === 405;
};

async function request<T>(path: string, init?: RequestInit, withAuth = true): Promise<T> {
  const headers = new Headers(init?.headers || {});
  headers.set("Content-Type", "application/json");
  if (withAuth) {
    const token = getAdminToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  let lastError: Error | null = null;
  for (const baseUrl of API_BASE_CANDIDATES) {
    try {
      const response = await fetch(buildUrl(baseUrl, path), {
        ...init,
        headers,
        credentials: "include",
      });
      handleUnauthorized(response);

      const json = await parseJsonResponse(response);
      if (response.ok) {
        const isJson = isJsonResponse(response);
        if (!isJson && looksLikeHtmlPayload(json)) {
          const isLastCandidate = baseUrl === API_BASE_CANDIDATES[API_BASE_CANDIDATES.length - 1];
          if (!isLastCandidate) {
            continue;
          }
          throw new Error("Request failed (non-JSON response)");
        }
        return json as T;
      }

      const errorMessage = toApiErrorMessage(json, "Request failed", response);
      const isLastCandidate = baseUrl === API_BASE_CANDIDATES[API_BASE_CANDIDATES.length - 1];
      if (!isLastCandidate && shouldTryNextBase(response, json)) {
        continue;
      }
      const error = new Error(errorMessage);
      (error as Error & { code?: string }).code = NON_RETRYABLE_ERROR;
      throw error;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Failed to fetch");
      if ((lastError as Error & { code?: string }).code === NON_RETRYABLE_ERROR) {
        throw lastError;
      }
      const isLastCandidate = baseUrl === API_BASE_CANDIDATES[API_BASE_CANDIDATES.length - 1];
      if (!isLastCandidate) {
        continue;
      }
    }
  }
  throw lastError || new Error("Failed to fetch");
}

async function uploadRequest<T>(path: string, formData: FormData, defaultMessage: string): Promise<T> {
  const headers = new Headers();
  const token = getAdminToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let lastError: Error | null = null;
  for (const baseUrl of API_BASE_CANDIDATES) {
    try {
      const response = await fetch(buildUrl(baseUrl, path), {
        method: "POST",
        headers,
        body: formData,
        credentials: "include",
      });
      handleUnauthorized(response);

      const json = await parseJsonResponse(response);
      if (response.ok) {
        const isJson = isJsonResponse(response);
        if (!isJson && looksLikeHtmlPayload(json)) {
          const isLastCandidate = baseUrl === API_BASE_CANDIDATES[API_BASE_CANDIDATES.length - 1];
          if (!isLastCandidate) {
            continue;
          }
          throw new Error(`${defaultMessage} (non-JSON response)`);
        }
        return json as T;
      }

      const errorMessage = toApiErrorMessage(json, defaultMessage, response);
      const isLastCandidate = baseUrl === API_BASE_CANDIDATES[API_BASE_CANDIDATES.length - 1];
      if (!isLastCandidate && shouldTryNextBase(response, json)) {
        continue;
      }
      const error = new Error(errorMessage);
      (error as Error & { code?: string }).code = NON_RETRYABLE_ERROR;
      throw error;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(defaultMessage);
      if ((lastError as Error & { code?: string }).code === NON_RETRYABLE_ERROR) {
        throw lastError;
      }
      const isLastCandidate = baseUrl === API_BASE_CANDIDATES[API_BASE_CANDIDATES.length - 1];
      if (!isLastCandidate) {
        continue;
      }
    }
  }
  throw lastError || new Error(defaultMessage);
}

export const adminApi = {
  login: (email: string, password: string) =>
    request<{
      token: string;
      user: {
        id: number;
        name: string;
        username?: string;
        email: string;
        profile_image?: string | null;
        last_login?: string | null;
        role: UserRole | "admin";
        source?: "admins" | "users" | "token";
      };
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
    return uploadRequest<{ profile_image: string }>("/api/admin/profile/photo", formData, "Profile image upload failed");
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
  getStockMovements: async () => {
    try {
      return await request<StockMovement[]>("/api/stock-movements");
    } catch (error) {
      const message = String((error as Error)?.message || "").toLowerCase();
      if (message.includes("route not found") || message.includes("not found")) {
        return [];
      }
      throw error;
    }
  },

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
  updateOrderStatus: (
    id: number,
    order_status: Order["order_status"],
    tracking?: { tracking_number?: string; tracking_url?: string }
  ) =>
    request<Order>(`/api/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({
        order_status,
        ...(tracking || {}),
      }),
    }),

  getCoupons: () => request<Coupon[]>("/api/admin/coupons"),
  addCoupon: (payload: {
    code: string;
    discount_type: Coupon["discount_type"];
    discount_value: number;
    min_order_amount?: number;
    expiry_date?: string | null;
    usage_limit?: number | null;
    status?: Coupon["status"];
  }) => request<Coupon>("/api/admin/coupons", { method: "POST", body: JSON.stringify(payload) }),
  updateCoupon: (id: number, payload: Partial<Coupon>) =>
    request<Coupon>(`/api/admin/coupons/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  updateCouponStatus: (id: number, status: Coupon["status"]) =>
    request<Coupon>(`/api/admin/coupons/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  deleteCoupon: (id: number) => request<{ success: boolean }>(`/api/admin/coupons/${id}`, { method: "DELETE" }),

  getFarmStayInquiries: () => request<FarmStayInquiry[]>("/api/farm-stay-inquiries"),
  updateFarmStayStatus: (id: number, status: FarmStayInquiry["status"]) =>
    request<FarmStayInquiry>(`/api/farm-stay-inquiries/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  uploadProductImage: async (file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    return uploadRequest<{ image_url: string }>("/api/uploads", formData, "Image upload failed");
  },

  getCustomers: (search = "") =>
    request<CustomerRecord[]>(`/api/admin/customers${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ""}`),
  deleteCustomer: (id: number) => request<{ success: boolean }>(`/api/admin/customers/${id}`, { method: "DELETE" }),
  getCustomerOrders: (id: number) => request<Order[]>(`/api/admin/customers/${id}/orders`),

  getUsers: async (params: { search?: string; role?: UserRole | ""; page?: number; per_page?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.search?.trim()) query.set("search", params.search.trim());
    if (params.role?.trim()) query.set("role", params.role.trim());
    if (params.page) query.set("page", String(params.page));
    if (params.per_page) query.set("per_page", String(params.per_page));
    const path = `/api/admin/users${query.toString() ? `?${query.toString()}` : ""}`;
    try {
      return await request<PaginatedUsers>(path);
    } catch (error) {
      const message = String((error as Error)?.message || "").toLowerCase();
      if (message.includes("route not found") || message.includes("not found")) {
        return {
          items: [],
          pagination: {
            page: params.page || 1,
            per_page: params.per_page || 10,
            total: 0,
            total_pages: 1,
          },
        };
      }
      throw error;
    }
  },
  addUser: (payload: { username: string; email: string; password: string; role: UserRole }) =>
    request<ManagedUser>("/api/admin/users", { method: "POST", body: JSON.stringify(payload) }),
  updateUser: (id: number, payload: { username: string; email: string; role: UserRole; password?: string }) =>
    request<ManagedUser>(`/api/admin/users/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteUser: (id: number) => request<{ success: boolean }>(`/api/admin/users/${id}`, { method: "DELETE" }),

  getBlogs: async () => {
    try {
      return await request<BlogPost[]>("/api/blogs");
    } catch (error) {
      const message = String((error as Error)?.message || "").toLowerCase();
      if (message.includes("route not found") || message.includes("not found")) {
        return [];
      }
      throw error;
    }
  },
  addBlog: (payload: {
    title: string;
    author_name: string;
    excerpt: string;
    content: string;
    image_url: string;
    category: string;
    is_published: number;
    publish_at: string | null;
  }) => request<BlogPost>("/api/blogs", { method: "POST", body: JSON.stringify(payload) }),
  updateBlog: (
    id: number,
    payload: {
      title: string;
      author_name: string;
      excerpt: string;
      content: string;
      image_url: string;
      category: string;
      is_published: number;
      publish_at: string | null;
    }
  ) => request<BlogPost>(`/api/blogs/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteBlog: (id: number) => request<{ success: boolean }>(`/api/blogs/${id}`, { method: "DELETE" }),

  getBlogCategories: async () => {
    try {
      return await request<BlogCategory[]>("/api/blog-categories");
    } catch (error) {
      const message = String((error as Error)?.message || "").toLowerCase();
      if (message.includes("route not found") || message.includes("not found")) {
        return [];
      }
      throw error;
    }
  },
  addBlogCategory: (name: string) =>
    request<BlogCategory>("/api/blog-categories", { method: "POST", body: JSON.stringify({ name }) }),
  deleteBlogCategory: (id: number) => request<{ success: boolean }>(`/api/blog-categories/${id}`, { method: "DELETE" }),
};
