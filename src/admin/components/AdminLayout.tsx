import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { ADMIN_SESSION_EVENT, clearAdminSession, getAdminUser, type AdminUser } from "@/admin/lib/auth";
import { adminApi } from "@/admin/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import logo from "@/assets/rushivan_agro.png";

const navItems = [
  { to: "/admin/dashboard", label: "Dashboard" },
  { to: "/admin/products", label: "Products" },
  { to: "/admin/orders", label: "Orders" },
  { to: "/admin/customers", label: "Customers" },
  { to: "/admin/attributes", label: "Attributes" },
  { to: "/admin/coupons", label: "Coupons" },
  { to: "/admin/blogs", label: "Blogs" },
  { to: "/admin/farm-stay", label: "Farm Stay" },
];

const userNavItems = [
  { to: "/admin/users", label: "All Users" },
  { to: "/admin/users/add", label: "Add User" },
  { to: "/admin/users/profile", label: "Profile" },
];

const AdminLayout = () => {
  const [user, setUser] = useState<AdminUser | null>(() => getAdminUser());
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const navigate = useNavigate();
  const apiBase =
    import.meta.env.VITE_API_BASE_URL || "http://localhost/farm-fresh-dwell-main/backend";

  useEffect(() => {
    const refreshUser = () => setUser(getAdminUser());
    window.addEventListener(ADMIN_SESSION_EVENT, refreshUser);
    window.addEventListener("storage", refreshUser);
    return () => {
      window.removeEventListener(ADMIN_SESSION_EVENT, refreshUser);
      window.removeEventListener("storage", refreshUser);
    };
  }, []);

  const onLogout = () => {
    adminApi.logout().catch(() => undefined);
    clearAdminSession();
    navigate("/admin/login");
  };

  const profileImage =
    user?.profile_image && user.profile_image.startsWith("/")
      ? `${apiBase}${user.profile_image}`
      : user?.profile_image || "";

  const handleNavClick = () => setIsMobileNavOpen(false);

  const navContent = (
    <>
      <Link to="/admin/dashboard" className="mb-6 block" onClick={handleNavClick}>
        <img src={logo} alt="Rushivan Aagro" className="h-10 w-auto object-contain" />
      </Link>
      <nav className="space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={handleNavClick}
            className={({ isActive }) =>
              cn(
                "block rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive ? "bg-emerald-600 text-white" : "text-slate-700 hover:bg-slate-100"
              )
            }
          >
            {item.label}
          </NavLink>
        ))}

        <div className="pt-2">
          <p className="px-3 py-2 text-sm font-semibold text-slate-800">Users</p>
          <div className="space-y-1 pl-3">
            {userNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  cn(
                    "block rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive ? "bg-emerald-600 text-white" : "text-slate-700 hover:bg-slate-100"
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
      <Button onClick={onLogout} className="mt-6 w-full bg-slate-800 hover:bg-slate-900">
        Logout
      </Button>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="grid min-h-screen md:grid-cols-[240px_1fr]">
        <aside className="hidden border-r bg-white p-4 md:block">{navContent}</aside>

        <main className="p-4 md:p-6">
          <div className="mb-4 flex items-center justify-between rounded-lg border bg-white px-3 py-2 md:hidden">
            <Link to="/admin/dashboard" className="flex items-center gap-2" onClick={handleNavClick}>
              <img src={logo} alt="Rushivan Aagro" className="h-8 w-auto object-contain" />
              <span className="text-sm font-semibold text-slate-900">Admin</span>
            </Link>
            <Button
              type="button"
              variant="outline"
              className="h-9 px-3"
              onClick={() => setIsMobileNavOpen(true)}
            >
              Menu
            </Button>
          </div>
          <div className="mb-6 rounded-lg border bg-white px-4 py-3">
            <div className="flex items-center justify-end gap-3">
              <Link to="/admin/profile" className="flex items-center gap-3 rounded-md px-1 py-1 hover:bg-slate-50">
                <img
                  src={profileImage || "https://placehold.co/44x44?text=A"}
                  alt="Admin profile"
                  className="h-11 w-11 rounded-full border object-cover"
                />
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">{user?.name || "Admin"}</p>
                  <p className="text-xs text-slate-500">{user?.email || ""}</p>
                </div>
              </Link>
            </div>
          </div>
          <Outlet />
        </main>
      </div>

      <div
        className={cn("fixed inset-0 z-40 md:hidden", isMobileNavOpen ? "pointer-events-auto" : "pointer-events-none")}
        aria-hidden={!isMobileNavOpen}
      >
        <button
          type="button"
          className={cn(
            "absolute inset-0 bg-slate-900/50 transition-opacity",
            isMobileNavOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setIsMobileNavOpen(false)}
          aria-label="Close menu overlay"
        />
        <aside
          className={cn(
            "absolute left-0 top-0 flex h-full w-72 flex-col bg-white p-4 shadow-xl transition-transform",
            isMobileNavOpen ? "translate-x-0" : "-translate-x-full"
          )}
          aria-label="Admin navigation"
        >
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-900">Navigation</span>
            <Button
              type="button"
              variant="ghost"
              className="h-8 px-2 text-slate-600"
              onClick={() => setIsMobileNavOpen(false)}
            >
              Close
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">{navContent}</div>
        </aside>
      </div>
    </div>
  );
};

export default AdminLayout;
