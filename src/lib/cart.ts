import { products } from "@/data/mockData";

const CART_STORAGE_KEY = "rushivan_cart_items";
const CART_UPDATED_EVENT = "cart-updated";

export interface CartItem {
  productId: number;
  quantity: number;
}

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

export const addToCart = (productId: number, quantity = 1) => {
  const current = getCartItems();
  const existing = current.find((item) => item.productId === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    current.push({ productId, quantity });
  }
  setCartItems(current);
};

export const updateCartItemQuantity = (productId: number, quantity: number) => {
  const current = getCartItems();
  const updated = current
    .map((item) =>
      item.productId === productId ? { ...item, quantity: Math.max(1, quantity) } : item
    )
    .filter((item) => item.quantity > 0);
  setCartItems(updated);
};

export const removeFromCart = (productId: number) => {
  const current = getCartItems();
  setCartItems(current.filter((item) => item.productId !== productId));
};

export const clearCart = () => {
  setCartItems([]);
};

export const getCartCount = (): number => {
  return getCartItems().reduce((sum, item) => sum + item.quantity, 0);
};

export const getCartDetailedItems = () => {
  const items = getCartItems();
  return items
    .map((item) => {
      const product = products.find((productItem) => productItem.id === item.productId);
      if (!product) return null;
      return {
        ...item,
        product,
        lineTotal: product.price * item.quantity,
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
