import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { clearAdminSession, getAdminUser } from "@/admin/lib/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/admin/dashboard", label: "Dashboard" },
  { to: "/admin/products", label: "Products" },
  { to: "/admin/orders", label: "Orders" },
  { to: "/admin/farm-stay", label: "Farm Stay" },
];

const AdminLayout = () => {
  const user = getAdminUser();
  const navigate = useNavigate();

  const onLogout = () => {
    clearAdminSession();
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="grid min-h-screen md:grid-cols-[240px_1fr]">
        <aside className="border-r bg-white p-4">
          <Link to="/admin/dashboard" className="block text-xl font-semibold text-emerald-700 mb-6">
            Rushivan Admin
          </Link>
          <nav className="space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
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
          </nav>
          <Button onClick={onLogout} className="mt-6 w-full bg-slate-800 hover:bg-slate-900">
            Logout
          </Button>
        </aside>

        <main className="p-4 md:p-8">
          <div className="mb-6 rounded-lg border bg-white p-4">
            <p className="text-sm text-slate-600">
              Logged in as <span className="font-semibold text-slate-900">{user?.name || "Admin"}</span> ({user?.email})
            </p>
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

