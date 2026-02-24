import { useEffect, useMemo, useRef, useState } from "react";
import { adminApi } from "@/admin/lib/api";
import type { Attribute, AttributeTerm, Category, Product, ProductVariation } from "@/admin/types";
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
  gst_rate: string;
};

type VariationRow = {
  id?: number;
  row_id: string;
  attribute_id: string;
  term_id: string;
  value: string;
  quantity_value: string;
  unit: string;
  price: string;
  stock: string;
  sku: string;
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
  gst_rate: "",
};

const fallbackCategories: Category[] = [
  { id: 1, name: "Dairy Products" },
  { id: 2, name: "Fresh Fruits" },
  { id: 3, name: "Gau Seva Products" },
  { id: 4, name: "Natural Sweetness" },
  { id: 5, name: "Spices & Condiments" },
  { id: 6, name: "Grains & Pulses" },
  { id: 7, name: "Farm Stay" },
];

const createVariationRow = (): VariationRow => ({
  row_id: `${Date.now()}-${Math.random()}`,
  attribute_id: "",
  term_id: "",
  value: "",
  quantity_value: "",
  unit: "",
  price: "",
  stock: "",
  sku: "",
});

const AdminProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [termsByAttribute, setTermsByAttribute] = useState<Record<number, AttributeTerm[]>>({});
  const [variations, setVariations] = useState<VariationRow[]>([]);
  const [form, setForm] = useState<ProductForm>(defaultForm);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const isEdit = useMemo(() => Boolean(form.id), [form.id]);
  const categoryOptions = categories.length > 0 ? categories : fallbackCategories;
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const ensureTermsLoaded = async (attributeId: number) => {
    if (!attributeId || termsByAttribute[attributeId]) return;
    const terms = await adminApi.getAttributeTerms(attributeId);
    setTermsByAttribute((prev) => ({ ...prev, [attributeId]: Array.isArray(terms) ? terms : [] }));
  };

  const load = async () => {
    const [productsData, categoriesData, attributesData] = await Promise.all([
      adminApi.getProducts(),
      adminApi.getCategories(),
      adminApi.getAttributes(),
    ]);
    setProducts(Array.isArray(productsData) ? productsData : []);
    setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    setAttributes(Array.isArray(attributesData) ? attributesData : []);
  };

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, []);

  const resetEditor = () => {
    setForm(defaultForm);
    setVariations([]);
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        price: Number(form.price || 0),
        category_id: Number(form.category_id),
        description: form.description,
        image_url: form.image_url,
        stock_quantity: Number(form.stock_quantity || 0),
        unit: form.unit,
        hsn_code: form.hsn_code,
        gst_rate: Number(form.gst_rate || 0),
      };
      let productId = form.id ?? 0;
      if (form.id) {
        await adminApi.updateProduct(form.id, payload);
      } else {
        const created = await adminApi.addProduct(payload);
        productId = created.id;
      }

      if (productId > 0) {
        const validVariations: ProductVariation[] = variations
          .filter((row) => row.attribute_id && row.term_id)
          .map((row) => ({
            id: row.id,
            attribute_id: Number(row.attribute_id),
            term_id: Number(row.term_id),
            value: row.value.trim() || `${row.quantity_value || ""} ${row.unit || ""}`.trim(),
            quantity_value: row.quantity_value ? Number(row.quantity_value) : null,
            unit: row.unit || null,
            price: Number(row.price || 0),
            stock: Number(row.stock || 0),
            sku: row.sku.trim() || null,
          }));

        await adminApi.saveProductVariations(productId, validVariations);
      }

      resetEditor();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const onEdit = async (product: Product) => {
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
      gst_rate: String(product.gst_rate ?? 0),
    });

    setError("");
    try {
      const data = await adminApi.getProductVariations(product.id);
      const mapped = (Array.isArray(data) ? data : []).map((item) => ({
        id: item.id,
        row_id: `${item.id}-${Math.random()}`,
        attribute_id: String(item.attribute_id),
        term_id: String(item.term_id),
        value: item.value,
        quantity_value: item.quantity_value != null ? String(item.quantity_value) : "",
        unit: item.unit || "",
        price: String(item.price),
        stock: String(item.stock),
        sku: item.sku || "",
      }));
      setVariations(mapped);

      const uniqueAttributes = Array.from(new Set(mapped.map((row) => Number(row.attribute_id)).filter((id) => id > 0)));
      await Promise.all(uniqueAttributes.map((attributeId) => ensureTermsLoaded(attributeId)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load product variations");
      setVariations([]);
    }
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

  const onImagePick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError("");
      setUploading(true);
      const response = await adminApi.uploadProductImage(file);
      setForm((prev) => ({ ...prev, image_url: response.image_url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploading(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    }
  };

  const onVariationChange = (rowId: string, key: keyof VariationRow, value: string) => {
    setVariations((prev) =>
      prev.map((row) => {
        if (row.row_id !== rowId) return row;
        if (key === "attribute_id") {
          return { ...row, attribute_id: value, term_id: "", value: "", quantity_value: "", unit: "" };
        }
        if (key === "term_id") {
          const attributeId = Number(row.attribute_id || 0);
          const terms = attributeId > 0 ? termsByAttribute[attributeId] || [] : [];
          const selected = terms.find((term) => String(term.id) === value);
          return {
            ...row,
            term_id: value,
            value: selected?.term_name || "",
            quantity_value: selected?.quantity_value != null ? String(selected.quantity_value) : "",
            unit: selected?.unit || "",
          };
        }
        return { ...row, [key]: value };
      })
    );
    if (key === "attribute_id" && value) {
      ensureTermsLoaded(Number(value)).catch(() => undefined);
    }
  };

  const addVariationRow = () => {
    setVariations((prev) => [...prev, createVariationRow()]);
  };

  const removeVariationRow = (rowId: string) => {
    setVariations((prev) => prev.filter((row) => row.row_id !== rowId));
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Product Management</h1>
      <form onSubmit={onSubmit} className="rounded-xl border bg-white p-4 space-y-4">
        <h2 className="font-semibold">{isEdit ? "Edit Product" : "Add New Product"}</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Input placeholder="Product name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
          <Input
            placeholder="Base Price"
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
            {categoryOptions.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <Input
            placeholder="Base Stock quantity"
            type="number"
            min={0}
            value={form.stock_quantity}
            onChange={(e) => setForm((p) => ({ ...p, stock_quantity: e.target.value }))}
            required
          />
          <Input placeholder="Base Unit (e.g. 250gm)" value={form.unit} onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))} />
          <Input placeholder="HSN code" value={form.hsn_code} onChange={(e) => setForm((p) => ({ ...p, hsn_code: e.target.value }))} />
          <Input
            placeholder="GST rate % (e.g. 5)"
            type="number"
            min={0}
            step="0.01"
            value={form.gst_rate}
            onChange={(e) => setForm((p) => ({ ...p, gst_rate: e.target.value }))}
          />
          <Input
            placeholder="Image URL (uploaded path)"
            value={form.image_url}
            onChange={(e) => setForm((p) => ({ ...p, image_url: e.target.value }))}
            className="md:col-span-2"
          />
          <div className="md:col-span-2 flex flex-wrap items-center gap-3">
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={onImagePick} />
            <Button type="button" variant="outline" onClick={() => imageInputRef.current?.click()} disabled={uploading}>
              {uploading ? "Uploading..." : "Upload Image"}
            </Button>
            {form.image_url ? <span className="text-xs text-slate-600 break-all">{form.image_url}</span> : null}
          </div>
          {form.image_url ? (
            <div className="md:col-span-2">
              <img src={form.image_url} alt="Product preview" className="h-20 w-20 rounded-md border object-cover" />
            </div>
          ) : null}
          <Textarea
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            className="md:col-span-2"
          />
        </div>

        <div className="space-y-3 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold">Variations (Term-wise Pricing & Stock)</h3>
            <Button type="button" variant="outline" onClick={addVariationRow}>
              Add Variation
            </Button>
          </div>
          {variations.length === 0 ? (
            <p className="text-sm text-slate-600">No variations added. You can still use base price/unit.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="bg-slate-50 text-left">
                  <tr>
                    <th className="p-2">Attribute</th>
                    <th className="p-2">Term</th>
                    <th className="p-2">Quantity</th>
                    <th className="p-2">Unit</th>
                    <th className="p-2">Price</th>
                    <th className="p-2">Stock</th>
                    <th className="p-2">SKU</th>
                    <th className="p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {variations.map((row) => {
                    const attributeId = Number(row.attribute_id || 0);
                    const terms = attributeId > 0 ? termsByAttribute[attributeId] || [] : [];
                    return (
                      <tr key={row.row_id} className="border-t">
                        <td className="p-2">
                          <select
                            className="h-9 w-full rounded-md border px-2"
                            value={row.attribute_id}
                            onChange={(event) => onVariationChange(row.row_id, "attribute_id", event.target.value)}
                          >
                            <option value="">Select</option>
                            {attributes.map((attribute) => (
                              <option key={attribute.id} value={attribute.id}>
                                {attribute.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <select
                            className="h-9 w-full rounded-md border px-2"
                            value={row.term_id}
                            onChange={(event) => onVariationChange(row.row_id, "term_id", event.target.value)}
                            disabled={!row.attribute_id}
                          >
                            <option value="">Select</option>
                            {terms.map((term) => (
                              <option key={term.id} value={term.id}>
                                {term.term_name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <Input value={row.quantity_value} placeholder="Auto from term" readOnly />
                        </td>
                        <td className="p-2">
                          <Input value={row.unit} placeholder="Auto from term" readOnly />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            min={0}
                            value={row.price}
                            onChange={(event) => onVariationChange(row.row_id, "price", event.target.value)}
                            placeholder="0"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            min={0}
                            value={row.stock}
                            onChange={(event) => onVariationChange(row.row_id, "stock", event.target.value)}
                            placeholder="0"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            value={row.sku}
                            onChange={(event) => onVariationChange(row.row_id, "sku", event.target.value)}
                            placeholder="SKU (optional)"
                          />
                        </td>
                        <td className="p-2">
                          <Button type="button" variant="destructive" size="sm" onClick={() => removeVariationRow(row.row_id)}>
                            Remove
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {categories.length === 0 ? (
          <p className="text-xs text-amber-700">Using default categories because API categories are empty.</p>
        ) : null}
        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Update Product" : "Add Product"}
          </Button>
          {isEdit ? (
            <Button type="button" variant="outline" onClick={resetEditor}>
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
              <th className="p-3">GST %</th>
              <th className="p-3">Stock</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-t">
                <td className="p-3">{product.name}</td>
                <td className="p-3">{product.category_name}</td>
                <td className="p-3">₹ {Number(product.price).toFixed(2)}</td>
                <td className="p-3">{Number(product.gst_rate ?? 0).toFixed(2)}%</td>
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
