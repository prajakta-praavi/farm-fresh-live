const ADMIN_TOKEN_KEY = "rushivan_admin_token";
const ADMIN_USER_KEY = "rushivan_admin_user";

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: "admin";
}

export const getAdminToken = () => localStorage.getItem(ADMIN_TOKEN_KEY);

export const setAdminSession = (token: string, user: AdminUser) => {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
  localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
};

export const clearAdminSession = () => {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_USER_KEY);
};

export const getAdminUser = (): AdminUser | null => {
  const raw = localStorage.getItem(ADMIN_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminUser;
  } catch {
    return null;
  }
};

