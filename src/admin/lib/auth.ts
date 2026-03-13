import type { UserRole } from "@/admin/types";

const ADMIN_TOKEN_KEY = "rushivan_admin_token";
const ADMIN_USER_KEY = "rushivan_admin_user";
export const ADMIN_SESSION_EVENT = "rushivan-admin-session-updated";

export interface AdminUser {
  id: number;
  name: string;
  username?: string;
  email: string;
  profile_image?: string | null;
  last_login?: string | null;
  role: UserRole | "admin";
}

export const getAdminToken = () => {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setAdminSession = (token: string, user: AdminUser) => {
  try {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
  } catch {
    // ignore storage failures
  }
  window.dispatchEvent(new Event(ADMIN_SESSION_EVENT));
};

export const clearAdminSession = () => {
  try {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
  } catch {
    // ignore storage failures
  }
  window.dispatchEvent(new Event(ADMIN_SESSION_EVENT));
};

export const getAdminUser = (): AdminUser | null => {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(ADMIN_USER_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminUser;
  } catch {
    return null;
  }
};
