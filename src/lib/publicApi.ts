import { products as mockProducts } from "@/data/mockData";

export interface PublicProductVariation {
  id: number;
  attribute_id: number;
  term_id: number;
  value: string;
  quantity_value?: number | null;
  unit?: string | null;
  price: number;
  stock: number;
  sku?: string | null;
  attribute_name: string;
  term_name: string;
}

export interface PublicProduct {
  id: number;
  name: string;
  description?: string;
  image: string;
  price: number;
  category: string;
  unit: string;
  hsnCode?: string;
  gstRate?: number;
  stockQuantity?: number;
  variations?: PublicProductVariation[];
}

export const PUBLIC_CATALOG_KEY = "rushivan_public_catalog";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost/farm-fresh-dwell-main/backend";

interface ApiProduct {
  id: number | string;
  name: string;
  description?: string;
  image_url?: string;
  price: number | string;
  category: string;
  unit: string;
  hsn_code?: string;
  gst_rate?: number | string;
  stock_quantity?: number | string;
  variations?: ApiVariation[];
}

interface ApiVariation {
  id: number | string;
  attribute_id: number | string;
  term_id: number | string;
  value: string;
  quantity_value?: number | string | null;
  unit?: string | null;
  price: number | string;
  stock: number | string;
  sku?: string | null;
  attribute_name?: string;
  term_name?: string;
}

const normalizeVariation = (item: ApiVariation): PublicProductVariation => ({
  id: Number(item.id),
  attribute_id: Number(item.attribute_id),
  term_id: Number(item.term_id),
  value: item.value || "",
  quantity_value: item.quantity_value != null ? Number(item.quantity_value) : null,
  unit: item.unit || null,
  price: Number(item.price || 0),
  stock: Number(item.stock || 0),
  sku: item.sku || null,
  attribute_name: item.attribute_name || "",
  term_name: item.term_name || "",
});

const normalizeProduct = (item: ApiProduct): PublicProduct => ({
  id: Number(item.id),
  name: item.name,
  description: item.description || "",
  image: item.image_url || "",
  price: Number(item.price || 0),
  category: item.category || "General",
  unit: item.unit || "1 unit",
  hsnCode: item.hsn_code || "",
  gstRate: Number(item.gst_rate || 0),
  stockQuantity: Number(item.stock_quantity || 0),
  variations: Array.isArray(item.variations) ? item.variations.map((variation) => normalizeVariation(variation)) : [],
});

const toMockProduct = (item: (typeof mockProducts)[number]): PublicProduct => ({
  id: item.id,
  name: item.name,
  description: "",
  image: item.image,
  price: item.price,
  category: item.category,
  unit: item.unit,
  hsnCode: item.hsnCode || "",
  gstRate: 0,
  stockQuantity: 999,
  variations: (item.variants || []).map((variation, index) => ({
    id: -(item.id * 1000 + index + 1),
    attribute_id: -1,
    term_id: -1,
    value: variation.label,
    price: variation.price,
    stock: 999,
    sku: null,
    attribute_name: "Weight",
    term_name: "Unit",
  })),
});

const mockCatalog = mockProducts.map((item) => toMockProduct(item));

export const getCachedPublicCatalog = (): PublicProduct[] => {
  const raw = localStorage.getItem(PUBLIC_CATALOG_KEY);
  if (!raw) return mockCatalog;
  try {
    const parsed = JSON.parse(raw) as PublicProduct[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : mockCatalog;
  } catch {
    return mockCatalog;
  }
};

export const getPublicProducts = async (): Promise<PublicProduct[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/public/products`);
    const json = await response.json().catch(() => []);
    if (!response.ok || !Array.isArray(json)) {
      return getCachedPublicCatalog();
    }
    const mapped = json.map((item) => normalizeProduct(item as ApiProduct));
    if (mapped.length > 0) {
      localStorage.setItem(PUBLIC_CATALOG_KEY, JSON.stringify(mapped));
      return mapped;
    }
    return getCachedPublicCatalog();
  } catch {
    return getCachedPublicCatalog();
  }
};

export const getPublicProductById = async (id: number): Promise<PublicProduct | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/public/products/${id}`);
    const json = await response.json().catch(() => null);
    if (!response.ok || !json) {
      return getCachedPublicCatalog().find((item) => item.id === id) ?? null;
    }
    const normalized = normalizeProduct(json as ApiProduct);
    const existing = getCachedPublicCatalog().filter((item) => item.id !== normalized.id);
    localStorage.setItem(PUBLIC_CATALOG_KEY, JSON.stringify([normalized, ...existing]));
    return normalized;
  } catch {
    return getCachedPublicCatalog().find((item) => item.id === id) ?? null;
  }
};
