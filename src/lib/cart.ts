import { products } from "@/data/mockData";
import { getCachedPublicCatalog } from "@/lib/publicApi";

const CART_STORAGE_KEY = "rushivan_cart_items";
const CART_UPDATED_EVENT = "cart-updated";

export interface CartItem {
  productId: number;
  quantity: number;
  variationId?: number | null;
  variationLabel?: string;
  variationAttribute?: string;
  sku?: string | null;
  unitPrice?: number;
}

type AddToCartOptions = {
  variationId?: number | null;
  variationLabel?: string;
  variationAttribute?: string;
  sku?: string | null;
  unitPrice?: number;
};

const safeParse = (value: string | null): CartItem[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as CartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const emitCartUpdated = () => {
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
};

export const getCartItems = (): CartItem[] => {
  return safeParse(localStorage.getItem(CART_STORAGE_KEY));
};

export const setCartItems = (items: CartItem[]) => {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  emitCartUpdated();
};

export const addToCart = (productId: number, quantity = 1, options?: AddToCartOptions) => {
  const current = getCartItems();
  const variationId = options?.variationId ?? null;
  const existing = current.find(
    (item) => item.productId === productId && (item.variationId ?? null) === variationId
  );
  if (existing) {
    existing.quantity += quantity;
  } else {
    current.push({
      productId,
      quantity,
      variationId,
      variationLabel: options?.variationLabel,
      variationAttribute: options?.variationAttribute,
      sku: options?.sku ?? null,
      unitPrice: options?.unitPrice,
    });
  }
  setCartItems(current);
};

export const updateCartItemQuantity = (
  productId: number,
  quantity: number,
  variationId: number | null = null
) => {
  const current = getCartItems();
  const updated = current
    .map((item) =>
      item.productId === productId && (item.variationId ?? null) === variationId
        ? { ...item, quantity: Math.max(1, quantity) }
        : item
    )
    .filter((item) => item.quantity > 0);
  setCartItems(updated);
};

export const removeFromCart = (productId: number, variationId: number | null = null) => {
  const current = getCartItems();
  setCartItems(
    current.filter(
      (item) => !(item.productId === productId && (item.variationId ?? null) === variationId)
    )
  );
};

export const clearCart = () => {
  setCartItems([]);
};

export const getCartCount = (): number => {
  return getCartItems().reduce((sum, item) => sum + item.quantity, 0);
};

export const getCartDetailedItems = () => {
  const items = getCartItems();
  const catalog = getCachedPublicCatalog();
  return items
    .map((item) => {
      const dynamicProduct = catalog.find((productItem) => productItem.id === item.productId);
      const product =
        dynamicProduct ??
        products.find((productItem) => productItem.id === item.productId) ??
        null;
      if (!product) return null;
      const unitPrice = Number(item.unitPrice ?? product.price);
      return {
        ...item,
        product,
        unitPrice,
        lineTotal: unitPrice * item.quantity,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
};

export const getCartTotal = () => {
  return getCartDetailedItems().reduce((sum, item) => sum + item.lineTotal, 0);
};

export const CART_EVENTS = {
  updated: CART_UPDATED_EVENT,
};

