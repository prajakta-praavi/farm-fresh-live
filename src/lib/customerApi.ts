import { clearCustomerUser, setCustomerUser, type CustomerSessionUser } from "@/lib/customerAuth";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost/farm-fresh-dwell-main/backend";

const buildUrl = (path: string) => `${API_BASE_URL}${path}`;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers || {});
  headers.set("Content-Type", "application/json");
  const response = await fetch(buildUrl(path), {
    ...init,
    headers,
    credentials: "include",
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json?.message || "Request failed");
  }
  return json as T;
}

export interface CustomerOrder {
  id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  customer_pincode: string;
  order_status: string;
  payment_status: string;
  total_amount: number;
  created_at: string;
}

export const customerApi = {
  register: async (payload: {
    name: string;
    email: string;
    phone: string;
    password: string;
    confirm_password: string;
  }) => {
    const result = await request<{ customer: CustomerSessionUser }>("/api/customer/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (result.customer) setCustomerUser(result.customer);
    return result;
  },

  login: async (payload: { email: string; password: string }) => {
    const result = await request<{ customer: CustomerSessionUser }>("/api/customer/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (result.customer) setCustomerUser(result.customer);
    return result;
  },

  logout: async () => {
    await request<{ success: boolean }>("/api/customer/logout", { method: "POST" });
    clearCustomerUser();
  },

  me: async () => {
    const data = await request<CustomerSessionUser>("/api/customer/me");
    setCustomerUser(data);
    return data;
  },

  updateProfile: async (payload: { name: string; phone: string }) => {
    const data = await request<CustomerSessionUser>("/api/customer/profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    setCustomerUser(data);
    return data;
  },

  changePassword: (payload: { current_password: string; new_password: string }) =>
    request<{ success: boolean }>("/api/customer/password", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  getOrders: () => request<CustomerOrder[]>("/api/customer/orders"),
};

