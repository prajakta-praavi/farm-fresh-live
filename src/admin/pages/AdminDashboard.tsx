import { useEffect, useState } from "react";
import { adminApi } from "@/admin/lib/api";
import type { DashboardOverview } from "@/admin/types";

const cardClasses = "rounded-xl border bg-white p-4";

const AdminDashboard = () => {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi
      .getOverview()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, []);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return <p>Loading dashboard...</p>;

  const recentOrders = Array.isArray(data.recentOrders) ? data.recentOrders : [];
  const totalProducts = Number(data.totalProducts ?? 0);
  const totalOrders = Number(data.totalOrders ?? 0);
  const totalCustomers = Number(data.totalCustomers ?? 0);
  const totalRevenue = Number(data.totalRevenue ?? 0);
  const totalFarmStayInquiries = Number(data.totalFarmStayInquiries ?? 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard Overview</h1>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className={cardClasses}>
          <p className="text-sm text-slate-500">Total Products</p>
          <p className="text-2xl font-bold">{totalProducts}</p>
        </div>
        <div className={cardClasses}>
          <p className="text-sm text-slate-500">Total Orders</p>
          <p className="text-2xl font-bold">{totalOrders}</p>
        </div>
        <div className={cardClasses}>
          <p className="text-sm text-slate-500">Total Customers</p>
          <p className="text-2xl font-bold">{totalCustomers}</p>
        </div>
        <div className={cardClasses}>
          <p className="text-sm text-slate-500">Total Revenue</p>
          <p className="text-2xl font-bold">₹ {totalRevenue.toFixed(2)}</p>
        </div>
        <div className={cardClasses}>
          <p className="text-sm text-slate-500">Farm Stay Inquiries</p>
          <p className="text-2xl font-bold">{totalFarmStayInquiries}</p>
        </div>
      </div>

      <div className="rounded-xl border bg-white overflow-x-auto">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Recent Orders</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="p-3">Order ID</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Payment</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.map((order) => (
              <tr key={order.id} className="border-t">
                <td className="p-3">#{order.id}</td>
                <td className="p-3">{order.customer_name}</td>
                <td className="p-3">₹ {Number(order.total_amount).toFixed(2)}</td>
                <td className="p-3">{order.payment_status}</td>
                <td className="p-3">{order.order_status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDashboard;
