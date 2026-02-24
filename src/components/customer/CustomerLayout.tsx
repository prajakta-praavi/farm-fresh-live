import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { customerApi } from "@/lib/customerApi";
import { clearCustomerUser, getCustomerUser } from "@/lib/customerAuth";

const navItems = [
  { to: "/customer/dashboard", label: "Dashboard" },
  { to: "/customer/orders", label: "My Orders" },
  { to: "/customer/profile", label: "Profile" },
];

const CustomerLayout = () => {
  const customer = getCustomerUser();
  const navigate = useNavigate();

  const onLogout = () => {
    customerApi.logout().catch(() => undefined);
    clearCustomerUser();
    navigate("/customer/login");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto grid min-h-screen max-w-6xl md:grid-cols-[220px_1fr]">
        <aside className="border-r bg-white p-4">
          <h1 className="text-lg font-bold text-emerald-700">Customer Panel</h1>
          <p className="mt-1 text-xs text-slate-500">{customer?.email}</p>
          <nav className="mt-6 space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "block rounded-lg px-3 py-2 text-sm font-medium",
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
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default CustomerLayout;

