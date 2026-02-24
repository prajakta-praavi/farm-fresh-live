import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { getCustomerUser } from "@/lib/customerAuth";
import { customerApi } from "@/lib/customerApi";

const CustomerProtectedRoute = () => {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState<boolean>(!!getCustomerUser());

  useEffect(() => {
    customerApi
      .me()
      .then(() => setAuthorized(true))
      .catch(() => setAuthorized(false))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-500">Checking account session...</div>;
  }
  if (!authorized) {
    return <Navigate to="/customer/login" replace />;
  }
  return <Outlet />;
};

export default CustomerProtectedRoute;

