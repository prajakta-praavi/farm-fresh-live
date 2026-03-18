import { useEffect, useState } from "react";
import { adminApi } from "@/admin/lib/api";
import type { Coupon } from "@/admin/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CouponFormState = {
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: string;
  min_order_amount: string;
  expiry_date: string;
  usage_limit: string;
  status: "Active" | "Inactive";
};

const emptyForm = (): CouponFormState => ({
  code: "",
  discount_type: "percentage",
  discount_value: "",
  min_order_amount: "",
  expiry_date: "",
  usage_limit: "",
  status: "Active",
});

const AdminCoupons = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [form, setForm] = useState<CouponFormState>(emptyForm());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadCoupons = async () => {
    const data = await adminApi.getCoupons();
    setCoupons(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    loadCoupons().catch((err) => setError(err instanceof Error ? err.message : "Failed to load coupons"));
  }, []);

  const resetForm = () => {
    setForm(emptyForm());
    setEditingId(null);
  };

  const onSave = async () => {
    setError("");
    setNotice("");
    const trimmedCode = form.code.trim().toUpperCase();
    const discountValue = Number(form.discount_value);
    if (!trimmedCode) {
      setError("Coupon code is required.");
      return;
    }
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      setError("Discount value must be greater than 0.");
      return;
    }

    const payload = {
      code: trimmedCode,
      discount_type: form.discount_type,
      discount_value: discountValue,
      min_order_amount: form.min_order_amount ? Number(form.min_order_amount) : 0,
      expiry_date: form.expiry_date ? form.expiry_date : null,
      usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
      status: form.status,
    };

    try {
      if (editingId) {
        await adminApi.updateCoupon(editingId, payload);
        setNotice("Coupon updated.");
      } else {
        await adminApi.addCoupon(payload);
        setNotice("Coupon added.");
      }
      resetForm();
      await loadCoupons();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save coupon");
    }
  };

  const onEdit = (coupon: Coupon) => {
    setError("");
    setNotice("");
    setEditingId(coupon.id);
    setForm({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: String(coupon.discount_value ?? ""),
      min_order_amount: String(coupon.min_order_amount ?? ""),
      expiry_date: coupon.expiry_date || "",
      usage_limit: coupon.usage_limit != null ? String(coupon.usage_limit) : "",
      status: coupon.status,
    });
  };

  const onDelete = async (id: number) => {
    if (!window.confirm("Delete this coupon?")) return;
    setError("");
    setNotice("");
    try {
      await adminApi.deleteCoupon(id);
      await loadCoupons();
      setNotice("Coupon deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete coupon");
    }
  };

  const onToggleStatus = async (coupon: Coupon) => {
    setError("");
    setNotice("");
    try {
      const nextStatus = coupon.status === "Active" ? "Inactive" : "Active";
      await adminApi.updateCouponStatus(coupon.id, nextStatus);
      await loadCoupons();
      setNotice(`Coupon ${nextStatus === "Active" ? "activated" : "deactivated"}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-4">
        <h1 className="text-2xl font-bold mb-1">Coupons</h1>
        <p className="text-sm text-slate-500">Create and manage discount coupons.</p>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <h2 className="text-lg font-semibold mb-4">{editingId ? "Edit Coupon" : "Add Coupon"}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">Coupon Code</label>
            <Input
              value={form.code}
              onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
              placeholder="SAVE10"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Discount Type</label>
            <select
              className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
              value={form.discount_type}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  discount_type: e.target.value === "fixed" ? "fixed" : "percentage",
                }))
              }
            >
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Discount Value</label>
            <Input
              type="number"
              min="0"
              value={form.discount_value}
              onChange={(e) => setForm((prev) => ({ ...prev, discount_value: e.target.value }))}
              placeholder={form.discount_type === "percentage" ? "10" : "100"}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Minimum Order Amount</label>
            <Input
              type="number"
              min="0"
              value={form.min_order_amount}
              onChange={(e) => setForm((prev) => ({ ...prev, min_order_amount: e.target.value }))}
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Expiry Date</label>
            <Input
              type="date"
              value={form.expiry_date}
              onChange={(e) => setForm((prev) => ({ ...prev, expiry_date: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Usage Limit</label>
            <Input
              type="number"
              min="0"
              value={form.usage_limit}
              onChange={(e) => setForm((prev) => ({ ...prev, usage_limit: e.target.value }))}
              placeholder="Leave empty for unlimited"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Status</label>
            <select
              className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
              value={form.status}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  status: e.target.value === "Inactive" ? "Inactive" : "Active",
                }))
              }
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        {error ? <p className="text-sm text-red-600 mt-3">{error}</p> : null}
        {notice ? <p className="text-sm text-emerald-600 mt-3">{notice}</p> : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={onSave}>{editingId ? "Update Coupon" : "Add Coupon"}</Button>
          {editingId ? (
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
          ) : null}
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <h2 className="text-lg font-semibold mb-4">All Coupons</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-3 py-2 font-semibold">Code</th>
                <th className="px-3 py-2 font-semibold">Type</th>
                <th className="px-3 py-2 font-semibold">Value</th>
                <th className="px-3 py-2 font-semibold">Min Order</th>
                <th className="px-3 py-2 font-semibold">Expiry</th>
                <th className="px-3 py-2 font-semibold">Usage</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-slate-500">
                    No coupons created yet.
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => (
                  <tr key={coupon.id} className="border-t">
                    <td className="px-3 py-2 font-medium">{coupon.code}</td>
                    <td className="px-3 py-2 capitalize">{coupon.discount_type}</td>
                    <td className="px-3 py-2">
                      {coupon.discount_type === "percentage"
                        ? `${coupon.discount_value}%`
                        : `₹ ${coupon.discount_value}`}
                    </td>
                    <td className="px-3 py-2">₹ {coupon.min_order_amount}</td>
                    <td className="px-3 py-2">{coupon.expiry_date || "No expiry"}</td>
                    <td className="px-3 py-2">
                      {coupon.used_count} / {coupon.usage_limit ?? "Unlimited"}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                          coupon.status === "Active"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {coupon.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => onEdit(coupon)}>
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => onToggleStatus(coupon)}>
                          {coupon.status === "Active" ? "Deactivate" : "Activate"}
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => onDelete(coupon.id)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminCoupons;
