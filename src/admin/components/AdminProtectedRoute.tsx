import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { adminApi } from "@/admin/lib/api";
import { getAdminToken } from "@/admin/lib/auth";

const AdminProtectedRoute = () => {
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState<boolean>(!!getAdminToken());

  useEffect(() => {
    adminApi
      .getAdminMe()
      .then(() => setAuthorized(true))
      .catch(() => setAuthorized(!!getAdminToken()))
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return <div className="p-8 text-center text-sm text-slate-500">Checking admin session...</div>;
  }
  if (!authorized) {
    return <Navigate to="/admin/login" replace />;
  }
  return <Outlet />;
};

export default AdminProtectedRoute;
