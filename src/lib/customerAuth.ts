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
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(CUSTOMER_USER_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CustomerSessionUser;
  } catch {
    return null;
  }
};

export const setCustomerUser = (user: CustomerSessionUser) => {
  try {
    localStorage.setItem(CUSTOMER_USER_KEY, JSON.stringify(user));
  } catch {
    // ignore storage failures
  }
};

export const clearCustomerUser = () => {
  try {
    localStorage.removeItem(CUSTOMER_USER_KEY);
  } catch {
    // ignore storage failures
  }
};

