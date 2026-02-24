import { useEffect, useState } from "react";
import { customerApi, type CustomerOrder } from "@/lib/customerApi";

const CustomerOrders = () => {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    customerApi
      .getOrders()
      .then((data) => setOrders(data))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load orders"));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My Orders</h1>
      <div className="rounded-xl border bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="p-3">Order</th>
              <th className="p-3">Status</th>
              <th className="p-3">Payment</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t">
                <td className="p-3">#{order.id}</td>
                <td className="p-3">{order.order_status}</td>
                <td className="p-3">{order.payment_status}</td>
                <td className="p-3">Rs {order.total_amount}</td>
                <td className="p-3">{new Date(order.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {orders.length === 0 ? (
              <tr>
                <td className="p-4 text-center text-slate-500" colSpan={5}>
                  No orders found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
};

export default CustomerOrders;

