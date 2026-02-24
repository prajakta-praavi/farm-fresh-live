import { useEffect, useState } from "react";
import { customerApi, type CustomerOrder } from "@/lib/customerApi";
import { getCustomerUser } from "@/lib/customerAuth";

const CustomerDashboard = () => {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [error, setError] = useState("");
  const user = getCustomerUser();

  useEffect(() => {
    customerApi
      .getOrders()
      .then((data) => setOrders(data))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load orders"));
  }, []);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Welcome, {user?.name || "Customer"}</h1>
      <div className="rounded-xl border bg-white p-4">
        <h2 className="font-semibold mb-2">Profile Summary</h2>
        <p className="text-sm text-slate-700">Email: {user?.email}</p>
        <p className="text-sm text-slate-700">Phone: {user?.phone}</p>
      </div>
      <div className="rounded-xl border bg-white p-4">
        <h2 className="font-semibold mb-3">Recent Orders</h2>
        <div className="space-y-2">
          {orders.slice(0, 5).map((order) => (
            <div key={order.id} className="rounded-md border p-3 text-sm">
              <p className="font-medium">Order #{order.id}</p>
              <p>Status: {order.order_status}</p>
              <p>Payment: {order.payment_status}</p>
              <p>Total: ₹ {order.total_amount}</p>
            </div>
          ))}
          {orders.length === 0 ? <p className="text-sm text-slate-500">No orders yet.</p> : null}
        </div>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
};

export default CustomerDashboard;
