import { useEffect, useState } from "react";
import { adminApi } from "@/admin/lib/api";
import type { Order } from "@/admin/types";

const ORDER_STATUS_OPTIONS: Order["order_status"][] = ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"];

const AdminOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    const data = await adminApi.getOrders();
    setOrders(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Failed to load orders"));
  }, []);

  const onStatusChange = async (id: number, order_status: Order["order_status"]) => {
    await adminApi.updateOrderStatus(id, order_status);
    await load();
    if (selectedOrder?.id === id) {
      const fullOrder = await adminApi.getOrder(id);
      setSelectedOrder(fullOrder);
    }
  };

  const onViewDetails = async (id: number) => {
    const fullOrder = await adminApi.getOrder(id);
    setSelectedOrder(fullOrder);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Order Management</h1>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-xl border bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="p-3">Order</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Payment</th>
                <th className="p-3">Status</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t">
                  <td className="p-3">#{order.id}</td>
                  <td className="p-3">{order.customer_name}</td>
                  <td className="p-3">₹ {Number(order.total_amount).toFixed(2)}</td>
                  <td className="p-3">{order.payment_status}</td>
                  <td className="p-3">
                    <select
                      className="h-9 rounded-md border px-2"
                      value={order.order_status}
                      onChange={(e) => onStatusChange(order.id, e.target.value as Order["order_status"])}
                    >
                      {ORDER_STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">
                    <button className="text-emerald-700 hover:underline" onClick={() => onViewDetails(order.id)}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <h2 className="font-semibold mb-3">Order Details</h2>
          {!selectedOrder ? (
            <p className="text-sm text-slate-600">Select an order to view details.</p>
          ) : (
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-semibold">Customer:</span> {selectedOrder.customer_name}
              </p>
              <p>
                <span className="font-semibold">Email:</span> {selectedOrder.customer_email}
              </p>
              <p>
                <span className="font-semibold">Phone:</span> {selectedOrder.customer_phone}
              </p>
              <p>
                <span className="font-semibold">Address:</span> {selectedOrder.customer_address} - {selectedOrder.customer_pincode}
              </p>
              <p>
                <span className="font-semibold">Payment:</span> {selectedOrder.payment_status}
              </p>
              <p>
                <span className="font-semibold">Razorpay Payment ID:</span> {selectedOrder.razorpay_payment_id || "-"}
              </p>
              <div className="pt-2">
                <p className="font-semibold mb-1">Products</p>
                <ul className="space-y-1">
                  {(selectedOrder.items || []).map((item) => (
                    <li key={item.id} className="rounded border p-2">
                      {item.product_name}
                      {item.attribute_name || item.term_name || item.variation_value
                        ? ` (${[item.attribute_name, item.term_name, item.variation_value].filter(Boolean).join(" / ")})`
                        : ""}
                      {item.sku ? ` [SKU: ${item.sku}]` : ""} x {item.quantity} - ₹ {Number(item.total_price).toFixed(2)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminOrders;
