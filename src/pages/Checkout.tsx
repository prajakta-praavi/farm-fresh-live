import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import checkoutBreadcrumbImage from "@/assets/checkout_breadcrub.png";
import { products } from "@/data/mockData";
import { getCartDetailedItems, getCartTotal, clearCart } from "@/lib/cart";
import { openRazorpayCheckout } from "@/lib/razorpay";

interface CheckoutFormState {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  pincode: string;
}

interface CheckoutOrderItem {
  product_id?: number;
  product_name: string;
  quantity: number;
  unit_price: number;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const Checkout = () => {
  const { target } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isPaying, setIsPaying] = useState(false);
  const [form, setForm] = useState<CheckoutFormState>({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    pincode: "",
  });

  const checkoutData = useMemo(() => {
    if (target === "stay") {
      const checkIn = searchParams.get("checkIn");
      const checkOut = searchParams.get("checkOut");
      const stayLabel =
        checkIn && checkOut ? `Farm Stay (${checkIn} to ${checkOut})` : "Farm Stay";
      return {
        title: "Farm Stay Checkout",
        productName: stayLabel,
        amount: 5900,
        backTo: "/stay",
        orderItems: [{ product_name: stayLabel, quantity: 1, unit_price: 5900 }] as CheckoutOrderItem[],
      };
    }

    if (target === "cart") {
      const cartItems = getCartDetailedItems();
      if (cartItems.length === 0) return null;
      return {
        title: `Cart Checkout (${cartItems.length} items)`,
        productName: cartItems.map((item) => item.product.name).join(", "),
        amount: getCartTotal(),
        backTo: "/cart",
        orderItems: cartItems.map((item) => ({
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.product.price,
        })) as CheckoutOrderItem[],
      };
    }

    const productId = Number(target);
    const product = products.find((item) => item.id === productId);
    if (!product) return null;
    const variants = product.variants?.length
      ? product.variants
      : [{ label: product.unit, price: product.price }];
    const selectedIndex = Number(searchParams.get("variant") || 0);
    const selectedVariant = variants[selectedIndex] ?? variants[0];
    return {
      title: "Checkout",
      productName: `${product.name} (${selectedVariant.label})`,
      amount: selectedVariant.price,
      backTo: `/product/${product.id}`,
      orderItems: [
        {
          product_id: product.id,
          product_name: `${product.name} (${selectedVariant.label})`,
          quantity: 1,
          unit_price: selectedVariant.price,
        },
      ] as CheckoutOrderItem[],
    };
  }, [target, searchParams]);

  if (!checkoutData) {
    return (
      <Layout>
        <div className="pt-28 pb-16">
          <div className="container">
            <h1 className="text-2xl font-display font-bold mb-3">Checkout not available</h1>
            <p className="text-muted-foreground mb-6">No item found for checkout.</p>
            <Button asChild>
              <Link to="/shop">Back to Shop</Link>
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const onFormChange =
    (key: keyof CheckoutFormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [key]: event.target.value }));
    };

  const handleCheckout = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !form.fullName.trim() ||
      !form.email.trim() ||
      !form.phone.trim() ||
      !form.address.trim() ||
      !form.pincode.trim()
    ) {
      alert("Please fill all checkout details.");
      return;
    }

    setIsPaying(true);
    try {
      const paymentResponse = await openRazorpayCheckout({
        amountInRupees: checkoutData.amount,
        productName: checkoutData.productName,
        customer: {
          name: form.fullName,
          email: form.email,
          phone: form.phone,
          address: form.address,
          pincode: form.pincode,
        },
      });

      if (API_BASE_URL) {
        await fetch(`${API_BASE_URL}/api/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customer_name: form.fullName,
            customer_email: form.email,
            customer_phone: form.phone,
            customer_address: form.address,
            customer_pincode: form.pincode,
            total_amount: checkoutData.amount,
            payment_status: "Paid",
            order_status: "Pending",
            razorpay_order_id: paymentResponse.razorpay_order_id || "",
            razorpay_payment_id: paymentResponse.razorpay_payment_id || "",
            razorpay_signature: paymentResponse.razorpay_signature || "",
            items: checkoutData.orderItems,
          }),
        });
      }

      alert("Payment successful.");
      if (target === "cart") {
        clearCart();
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to start payment.";
      alert(message);
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <Layout>
      <div className="pt-28 pb-16">
        <PageBreadcrumb image={checkoutBreadcrumbImage} alt="Checkout banner" />
        <div className="container max-w-3xl">
          <div className="mb-6">
            <button
              onClick={() => navigate(checkoutData.backTo)}
              className="text-sm text-primary hover:underline"
            >
              Back
            </button>
          </div>

          <div className="rounded-xl border border-border p-5 md:p-6">
            <h1 className="text-2xl font-display font-bold mb-4">{checkoutData.title}</h1>
            <form onSubmit={handleCheckout} className="space-y-3">
              <div>
                <label className="text-sm font-medium">Full Name</label>
                <input
                  value={form.fullName}
                  onChange={onFormChange("fullName")}
                  className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
                  placeholder="Enter full name"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={onFormChange("email")}
                    className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <input
                    value={form.phone}
                    onChange={onFormChange("phone")}
                    className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
                    placeholder="10 digit mobile number"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Address</label>
                <textarea
                  value={form.address}
                  onChange={onFormChange("address")}
                  className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm min-h-20"
                  placeholder="Full delivery address"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Pincode</label>
                <input
                  value={form.pincode}
                  onChange={onFormChange("pincode")}
                  className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
                  placeholder="6 digit pincode"
                />
              </div>

              <div className="rounded-lg bg-muted p-3 text-sm">
                <p>
                  <span className="font-semibold">Items:</span> {checkoutData.productName}
                </p>
                <p>
                  <span className="font-semibold">Payable Amount:</span> Rs {checkoutData.amount}
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={isPaying}>
                {isPaying ? "Processing..." : "Proceed to Payment"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Checkout;
