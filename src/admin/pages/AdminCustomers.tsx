import { useEffect, useMemo, useState } from "react";
import { adminApi } from "@/admin/lib/api";
import type { CustomerRecord, Order } from "@/admin/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const AdminCustomers = () => {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [ordersByCustomer, setOrdersByCustomer] = useState<Record<number, Order[]>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const loadCustomers = async (query = "") => {
    setLoading(true);
    setError("");
    try {
      const data = await adminApi.getCustomers(query);
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers().catch(() => undefined);
  }, []);

  const onSearch = async () => {
    await loadCustomers(search);
  };

  const onDelete = async (id: number) => {
    if (!window.confirm("Delete this customer?")) return;
    try {
      await adminApi.deleteCustomer(id);
      setCustomers((prev) => prev.filter((item) => item.id !== id));
      if (selectedCustomerId === id) {
        setSelectedCustomerId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete customer");
    }
  };

  const onViewOrders = async (customerId: number) => {
    setSelectedCustomerId(customerId);
    if (ordersByCustomer[customerId]) return;
    try {
      const orders = await adminApi.getCustomerOrders(customerId);
      setOrdersByCustomer((prev) => ({ ...prev, [customerId]: orders }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load customer orders");
    }
  };

  const selectedOrders = useMemo(() => {
    if (!selectedCustomerId) return [];
    return ordersByCustomer[selectedCustomerId] || [];
  }, [ordersByCustomer, selectedCustomerId]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Customers</h1>

      <div className="rounded-xl border bg-white p-4">
        <div className="flex flex-wrap gap-2">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, email, phone"
            className="max-w-md"
          />
          <Button type="button" onClick={onSearch}>
            Search
          </Button>
          <Button type="button" variant="outline" onClick={() => loadCustomers("")}>
            Reset
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Registered</th>
              <th className="p-3">Last Login</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id} className="border-t">
                <td className="p-3">{customer.name}</td>
                <td className="p-3">{customer.email}</td>
                <td className="p-3">{customer.phone}</td>
                <td className="p-3">{new Date(customer.created_at).toLocaleString()}</td>
                <td className="p-3">
                  {customer.last_login ? new Date(customer.last_login).toLocaleString() : "-"}
                </td>
                <td className="p-3 space-x-2">
                  <Button size="sm" variant="outline" onClick={() => onViewOrders(customer.id)}>
                    Orders
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => onDelete(customer.id)}>
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
            {customers.length === 0 && !loading ? (
              <tr>
                <td className="p-4 text-center text-slate-500" colSpan={6}>
                  No customers found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {selectedCustomerId ? (
        <div className="rounded-xl border bg-white p-4">
          <h2 className="font-semibold mb-3">Customer Order History</h2>
          <div className="space-y-2">
            {selectedOrders.length === 0 ? (
              <p className="text-sm text-slate-500">No orders for selected customer.</p>
            ) : (
              selectedOrders.map((order) => (
                <div key={order.id} className="rounded-lg border p-3 text-sm">
                  <p>
                    <span className="font-semibold">Order #{order.id}</span> | {order.order_status} | {order.payment_status}
                  </p>
                  <p>Total: Rs {order.total_amount}</p>
                  <p>Date: {new Date(order.created_at).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
};

export default AdminCustomers;

