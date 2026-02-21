import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import {
  CART_EVENTS,
  clearCart,
  getCartDetailedItems,
  getCartTotal,
  removeFromCart,
  updateCartItemQuantity,
} from "@/lib/cart";

const Cart = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState(getCartDetailedItems());
  const [total, setTotal] = useState(getCartTotal());

  const syncCart = () => {
    setItems(getCartDetailedItems());
    setTotal(getCartTotal());
  };

  useEffect(() => {
    syncCart();
    window.addEventListener(CART_EVENTS.updated, syncCart);
    window.addEventListener("storage", syncCart);
    return () => {
      window.removeEventListener(CART_EVENTS.updated, syncCart);
      window.removeEventListener("storage", syncCart);
    };
  }, []);

  return (
    <Layout>
      <div className="pt-28 pb-16">
        <div className="container">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-display font-bold">Your Cart</h1>
            {items.length > 0 && (
              <Button variant="outline" onClick={clearCart}>
                Clear Cart
              </Button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="rounded-xl border border-border p-8 text-center">
              <p className="text-muted-foreground mb-4">Your cart is empty.</p>
              <Button asChild>
                <Link to="/shop">Go to Shop</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={item.productId}
                    className="rounded-xl border border-border p-4 flex gap-4 items-center"
                  >
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-20 h-20 rounded-md object-cover"
                    />
                    <div className="flex-1">
                      <Link to={`/product/${item.product.id}`} className="font-semibold hover:text-primary">
                        {item.product.name}
                      </Link>
                      <p className="text-sm text-muted-foreground">{item.product.unit}</p>
                      <p className="text-sm text-primary font-bold mt-1">Rs {item.product.price}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateCartItemQuantity(item.productId, item.quantity - 1)}
                      >
                        -
                      </Button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateCartItemQuantity(item.productId, item.quantity + 1)}
                      >
                        +
                      </Button>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">Rs {item.lineTotal}</p>
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="text-xs text-muted-foreground hover:text-destructive"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-border p-5 h-fit">
                <h2 className="font-display font-bold text-xl mb-4">Summary</h2>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>Items</span>
                  <span>{items.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm mb-4">
                  <span>Total</span>
                  <span className="font-semibold">Rs {total}</span>
                </div>
                <Button className="w-full" onClick={() => navigate("/checkout/cart")}>
                  Proceed to Checkout
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Cart;
