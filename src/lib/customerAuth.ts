export interface CustomerSessionUser {
  id: number;
  name: string;
  email: string;
  phone: string;
  created_at?: string;
  last_login?: string | null;
}

const CUSTOMER_USER_KEY = "rushivan_customer_user";

export const getCustomerUser = (): CustomerSessionUser | null => {
  const raw = localStorage.getItem(CUSTOMER_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CustomerSessionUser;
  } catch {
    return null;
  }
};

export const setCustomerUser = (user: CustomerSessionUser) => {
  localStorage.setItem(CUSTOMER_USER_KEY, JSON.stringify(user));
};

export const clearCustomerUser = () => {
  localStorage.removeItem(CUSTOMER_USER_KEY);
};

