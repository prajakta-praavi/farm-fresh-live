import { useEffect, useMemo, useState } from "react";
import { adminApi } from "@/admin/lib/api";
import type { Category, Product } from "@/admin/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ProductForm = {
  id?: number;
  name: string;
  price: string;
  category_id: string;
  description: string;
  image_url: string;
  stock_quantity: string;
  unit: string;
  hsn_code: string;
};

const defaultForm: ProductForm = {
  name: "",
  price: "",
  category_id: "",
  description: "",
  image_url: "",
  stock_quantity: "",
  unit: "",
  hsn_code: "",
};

const AdminProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<ProductForm>(defaultForm);
  const [error, setError] = useState("");
  const isEdit = useMemo(() => Boolean(form.id), [form.id]);

  const load = async () => {
    const [productsData, categoriesData] = await Promise.all([adminApi.getProducts(), adminApi.getCategories()]);
    setProducts(productsData);
    setCategories(categoriesData);
  };

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, []);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      const payload = {
        name: form.name,
        price: Number(form.price),
        category_id: Number(form.category_id),
        description: form.description,
        image_url: form.image_url,
        stock_quantity: Number(form.stock_quantity),
        unit: form.unit,
        hsn_code: form.hsn_code,
      };
      if (form.id) {
        await adminApi.updateProduct(form.id, payload);
      } else {
        await adminApi.addProduct(payload);
      }
      setForm(defaultForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  };

  const onEdit = (product: Product) => {
    setForm({
      id: product.id,
      name: product.name,
      price: String(product.price),
      category_id: String(product.category_id),
      description: product.description || "",
      image_url: product.image_url || "",
      stock_quantity: String(product.stock_quantity),
      unit: product.unit || "",
      hsn_code: product.hsn_code || "",
    });
  };

  const onDelete = async (id: number) => {
    if (!window.confirm("Delete this product?")) return;
    await adminApi.deleteProduct(id);
    await load();
  };

  const onStockUpdate = async (id: number, stock_quantity: number) => {
    await adminApi.updateStock(id, stock_quantity);
    await load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Product Management</h1>
      <form onSubmit={onSubmit} className="rounded-xl border bg-white p-4 space-y-3">
        <h2 className="font-semibold">{isEdit ? "Edit Product" : "Add New Product"}</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Input placeholder="Product name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
          <Input
            placeholder="Price"
            type="number"
            min={0}
            value={form.price}
            onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
            required
          />
          <select
            className="h-10 rounded-md border px-3 text-sm"
            value={form.category_id}
            onChange={(e) => setForm((p) => ({ ...p, category_id: e.target.value }))}
            required
          >
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <Input
            placeholder="Stock quantity"
            type="number"
            min={0}
            value={form.stock_quantity}
            onChange={(e) => setForm((p) => ({ ...p, stock_quantity: e.target.value }))}
            required
          />
          <Input placeholder="Unit (e.g. 250gm)" value={form.unit} onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))} />
          <Input placeholder="HSN code" value={form.hsn_code} onChange={(e) => setForm((p) => ({ ...p, hsn_code: e.target.value }))} />
          <Input
            placeholder="Image URL (uploaded path)"
            value={form.image_url}
            onChange={(e) => setForm((p) => ({ ...p, image_url: e.target.value }))}
            className="md:col-span-2"
          />
          <Textarea
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            className="md:col-span-2"
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit">{isEdit ? "Update Product" : "Add Product"}</Button>
          {isEdit ? (
            <Button type="button" variant="outline" onClick={() => setForm(defaultForm)}>
              Cancel Edit
            </Button>
          ) : null}
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </form>

      <div className="rounded-xl border bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Category</th>
              <th className="p-3">Price</th>
              <th className="p-3">Stock</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-t">
                <td className="p-3">{product.name}</td>
                <td className="p-3">{product.category_name}</td>
                <td className="p-3">Rs {Number(product.price).toFixed(2)}</td>
                <td className="p-3">
                  <Input
                    type="number"
                    min={0}
                    defaultValue={product.stock_quantity}
                    onBlur={(e) => onStockUpdate(product.id, Number(e.target.value))}
                    className="h-8 w-24"
                  />
                </td>
                <td className="p-3 space-x-2">
                  <Button size="sm" onClick={() => onEdit(product)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => onDelete(product.id)}>
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminProducts;

