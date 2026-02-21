import { Navigate, Outlet } from "react-router-dom";
import { getAdminToken } from "@/admin/lib/auth";

const AdminProtectedRoute = () => {
  const token = getAdminToken();
  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }
  return <Outlet />;
};

export default AdminProtectedRoute;

