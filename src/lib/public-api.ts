import { products as mockProducts } from "@/data/mockData";
import { blogPosts as mockBlogPosts } from "@/data/mockData";

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
const DEMO_OUT_OF_STOCK_PRODUCT_NAME = "udid dal plain";
const EXCLUDED_PRODUCT_NAMES = new Set(["payment test product", "guava"]);
const normalizeCategoryName = (category: string): string =>
  (category || "").trim().toLowerCase() === "natural sweetness"
    ? "Natural Sweeteners"
    : category || "General";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost/farm-fresh-dwell-main/backend";

const PUBLIC_API_BASE_CANDIDATES =
  typeof window !== "undefined"
    ? Array.from(
        new Set(
          [
            API_BASE_URL,
            `${window.location.origin}/backend`,
            `${window.location.origin}/farm-fresh/farm-fresh-live/backend`,
            `${window.location.origin}/farm-fresh-live/backend`,
            "http://localhost/backend",
            "http://localhost/farm-fresh/farm-fresh-live/backend",
            "http://localhost/farm-fresh-live/backend",
            "https://api.rushivanagro.com",
            "https://www.rushivanagro.com/backend",
          ].filter(Boolean)
        )
      )
    : [API_BASE_URL];

const makeAbsoluteUrl = (baseUrl: string, value?: string | null): string => {
  const path = (value || "").trim();
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith("/")) return `${baseUrl}${path}`;
  return `${baseUrl}/${path.replace(/^\/+/, "")}`;
};

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
  category: normalizeCategoryName(item.category || ""),
  unit: item.unit || "1 unit",
  hsnCode: item.hsn_code || "",
  gstRate: Number(item.gst_rate || 0),
  stockQuantity: Number(item.stock_quantity || 0),
  variations: Array.isArray(item.variations) ? item.variations.map((variation) => normalizeVariation(variation)) : [],
});

const markDemoOutOfStock = (product: PublicProduct): PublicProduct => {
  if ((product.name || "").trim().toLowerCase() !== DEMO_OUT_OF_STOCK_PRODUCT_NAME) {
    return product;
  }
  return {
    ...product,
    stockQuantity: 0,
    variations: (product.variations || []).map((variation) => ({ ...variation, stock: 0 })),
  };
};

const isExcludedProduct = (product: PublicProduct): boolean =>
  EXCLUDED_PRODUCT_NAMES.has((product.name || "").trim().toLowerCase());

const toMockProduct = (item: (typeof mockProducts)[number]): PublicProduct => ({
  id: item.id,
  name: item.name,
  description: "",
  image: item.image,
  price: item.price,
  category: normalizeCategoryName(item.category),
  unit: item.unit,
  hsnCode: item.hsnCode || "",
  gstRate: 0,
  stockQuantity: (item.name || "").trim().toLowerCase() === DEMO_OUT_OF_STOCK_PRODUCT_NAME ? 0 : 999,
  variations: (item.variants || []).map((variation, index) => ({
    id: -(item.id * 1000 + index + 1),
    attribute_id: -1,
    term_id: -1,
    value: variation.label,
    price: variation.price,
    stock: (item.name || "").trim().toLowerCase() === DEMO_OUT_OF_STOCK_PRODUCT_NAME ? 0 : 999,
    sku: null,
    attribute_name: "Weight",
    term_name: "Unit",
  })),
});

const mockCatalog = mockProducts.map((item) => toMockProduct(item));

export const getCachedPublicCatalog = (): PublicProduct[] => {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(PUBLIC_CATALOG_KEY);
  } catch {
    return mockCatalog;
  }
  if (!raw) return mockCatalog;
  try {
    const parsed = JSON.parse(raw) as PublicProduct[];
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed.map((item) =>
          markDemoOutOfStock({
            ...item,
            category: normalizeCategoryName(item.category || ""),
          })
        ).filter((item) => !isExcludedProduct(item))
      : mockCatalog;
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
    const mapped = json
      .map((item) => markDemoOutOfStock(normalizeProduct(item as ApiProduct)))
      .filter((item) => !isExcludedProduct(item));
    if (mapped.length > 0) {
      try {
        localStorage.setItem(PUBLIC_CATALOG_KEY, JSON.stringify(mapped));
      } catch {
        // ignore storage failures
      }
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
    const normalized = markDemoOutOfStock(normalizeProduct(json as ApiProduct));
    if (isExcludedProduct(normalized)) {
      return null;
    }
    const existing = getCachedPublicCatalog().filter((item) => item.id !== normalized.id);
    try {
      localStorage.setItem(PUBLIC_CATALOG_KEY, JSON.stringify([normalized, ...existing]));
    } catch {
      // ignore storage failures
    }
    return normalized;
  } catch {
    return getCachedPublicCatalog().find((item) => item.id === id) ?? null;
  }
};

export interface PublicBlogPost {
  id: number;
  slug: string;
  title: string;
  author: string;
  excerpt: string;
  image: string;
  category: string;
  date: string;
  readTime: string;
  content: string[];
}

interface ApiBlogPost {
  id: number | string;
  slug: string;
  title: string;
  author_name?: string | null;
  excerpt?: string;
  image_url?: string | null;
  category?: string;
  read_time?: string;
  publish_at?: string | null;
  created_at?: string;
  content?: string;
}

const formatBlogDate = (value?: string): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const normalizeBlogContent = (content?: string): string[] => {
  const text = (content || "").trim();
  if (!text) return [];
  return text
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
};

const normalizeApiBlog = (item: ApiBlogPost, baseUrl: string): PublicBlogPost => ({
  id: Number(item.id),
  slug: item.slug || "",
  title: item.title || "",
  author: (item.author_name || "").trim() || "Rushivan Aagro",
  excerpt: item.excerpt || "",
  image: makeAbsoluteUrl(baseUrl, item.image_url || ""),
  category: item.category || "General",
  date: formatBlogDate((item.publish_at || "").trim() || item.created_at) || "",
  readTime: item.read_time || "5 min read",
  content: normalizeBlogContent(item.content),
});

const mockBlogs: PublicBlogPost[] = mockBlogPosts.map((post) => ({
  id: post.id,
  slug: post.slug,
  title: post.title,
  author: "Rushivan Aagro",
  excerpt: post.excerpt,
  image: post.image,
  category: post.category,
  date: post.date,
  readTime: post.readTime,
  content: Array.isArray(post.content) ? post.content : [],
}));

export const getPublicBlogs = async (): Promise<PublicBlogPost[]> => {
  for (const baseUrl of PUBLIC_API_BASE_CANDIDATES) {
    try {
      const response = await fetch(`${baseUrl}/api/public/blogs`);
      const json = await response.json().catch(() => []);
      if (!response.ok || !Array.isArray(json)) {
        continue;
      }
      const mapped = json
        .map((item) => normalizeApiBlog(item as ApiBlogPost, baseUrl))
        .filter((item) => item.slug !== "" && item.title !== "");
      if (mapped.length > 0) {
        return mapped;
      }
    } catch {
      continue;
    }
  }
  return mockBlogs;
};

export const getPublicBlogBySlug = async (slug: string): Promise<PublicBlogPost | null> => {
  const cleanSlug = (slug || "").trim();
  if (!cleanSlug) return null;

  for (const baseUrl of PUBLIC_API_BASE_CANDIDATES) {
    try {
      const response = await fetch(`${baseUrl}/api/public/blogs/${encodeURIComponent(cleanSlug)}`);
      const json = await response.json().catch(() => null);
      if (!response.ok || !json) {
        continue;
      }
      return normalizeApiBlog(json as ApiBlogPost, baseUrl);
    } catch {
      continue;
    }
  }

  return mockBlogs.find((item) => item.slug === cleanSlug) || null;
};
