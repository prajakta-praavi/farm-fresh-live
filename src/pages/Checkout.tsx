import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import checkoutBreadcrumbImage from "@/assets/checkout_breadcrub.webp";
import { products } from "@/data/mockData";
import { getCartDetailedItems, clearCart } from "@/lib/cart";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { getCachedPublicCatalog, getPublicProductById, getPublicProducts, type PublicProduct } from "@/lib/public-api";
import { customerApi } from "@/lib/customerApi";

interface CheckoutFormState {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  pincode: string;
}

interface CheckoutOrderItem {
  product_id?: number;
  variation_id?: number | null;
  attribute_name?: string;
  term_name?: string;
  variation_value?: string;
  quantity_value?: number | null;
  unit?: string | null;
  sku?: string | null;
  gst_rate?: number;
  product_name: string;
  quantity: number;
  unit_price: number;
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
const FALLBACK_API_BASE_URL =
  typeof window !== "undefined" ? `${window.location.origin}/backend` : "";
const buildInvoiceId = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const token = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `INV-${y}${m}${d}-${token}`;
};

const GST_BY_PRODUCT_KEYWORD: Array<{ key: string; rate: number }> = [
  { key: "tur dal", rate: 5 },
  { key: "chana dal", rate: 5 },
  { key: "moog (whole)", rate: 5 },
  { key: "moog dal mogar", rate: 5 },
  { key: "moog dal chilka", rate: 5 },
  { key: "udid (whole)", rate: 5 },
  { key: "udid dal plain", rate: 5 },
  { key: "udid dal chilka", rate: 5 },
  { key: "pavta", rate: 0 },
  { key: "organic strawberry", rate: 0 },
  { key: "strawberry jam", rate: 12 },
  { key: "desi gir cow ghee", rate: 5 },
  { key: "raw honey", rate: 0 },
  { key: "rajma", rate: 0 },
  { key: "turmeric", rate: 5 },
  { key: "nachani", rate: 5 },
  { key: "finger millet", rate: 5 },
  { key: "jawar", rate: 5 },
  { key: "jaggery block", rate: 5 },
  { key: "jaggery cubes", rate: 0 },
  { key: "jaggery powder", rate: 5 },
  { key: "gaumutra", rate: 5 },
  { key: "cowdung dhup", rate: 5 },
  { key: "cow dung dhup", rate: 5 },
  { key: "cowdung diya", rate: 5 },
  { key: "cow dung diya", rate: 5 },
  { key: "cowdung cake", rate: 5 },
  { key: "cow dung cake", rate: 5 },
];

const resolveGstRate = (name: string, fallbackRate: number): number => {
  const normalized = (name || "").toLowerCase();
  const matched = GST_BY_PRODUCT_KEYWORD.find((item) => normalized.includes(item.key));
  if (matched) return matched.rate;
  return Number.isFinite(fallbackRate) ? fallbackRate : 0;
};

const createRazorpayOrder = async (
  baseUrl: string,
  payload: {
    amount: number;
    currency: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
  }
) => {
  const response = await fetch(`${baseUrl}/api/payments/razorpay/order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
  };
  return { response, data };
};

const Checkout = () => {
  const { target } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isPaying, setIsPaying] = useState(false);
  const [catalog, setCatalog] = useState<PublicProduct[]>(() => getCachedPublicCatalog());
  const [singleProduct, setSingleProduct] = useState<PublicProduct | null>(null);
  const [form, setForm] = useState<CheckoutFormState>({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    pincode: "",
  });

  useEffect(() => {
    customerApi
      .me()
      .then((customer) =>
        setForm((prev) => ({
          ...prev,
          fullName: prev.fullName || customer.name || "",
          email: prev.email || customer.email || "",
          phone: prev.phone || customer.phone || "",
        }))
      )
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    getPublicProducts()
      .then((items) => {
        if (Array.isArray(items) && items.length > 0) {
          setCatalog(items);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const productId = Number(target || 0);
    if (!productId || target === "cart" || target === "stay") {
      setSingleProduct(null);
      return;
    }
    const fallback =
      catalog.find((item) => item.id === productId) ||
      getCachedPublicCatalog().find((item) => item.id === productId) ||
      null;
    setSingleProduct(fallback);
    getPublicProductById(productId)
      .then((freshProduct) => {
        if (freshProduct) {
          setSingleProduct(freshProduct);
        }
      })
      .catch(() => undefined);
  }, [target, catalog]);

  const checkoutData = useMemo(() => {
    if (target === "stay") {
      const checkIn = searchParams.get("checkIn");
      const checkOut = searchParams.get("checkOut");
      const days = Math.max(1, Number(searchParams.get("days") || 1));
      const rooms = Math.max(0, Math.min(2, Number(searchParams.get("rooms") || 0)));
      const guests = Math.max(1, Math.min(15, Number(searchParams.get("guests") || 1)));
      const extraBeds = Math.max(0, Number(searchParams.get("extraBeds") || 0));
      const tentGuests = Math.max(0, Number(searchParams.get("tentGuests") || 0));
      const accommodationType = decodeURIComponent(searchParams.get("accommodationType") || "ROOM");
      const subtotalPerNight = Math.max(0, Number(searchParams.get("subtotalPerNight") || 0));
      const gstRate = Math.max(0, Number(searchParams.get("gstRate") || 0));
      const gstAmountPerNight = Math.max(0, Number(searchParams.get("gstAmountPerNight") || 0));
      const totalPerNight = Math.max(0, Number(searchParams.get("totalPerNight") || 0));
      const roomAmount = rooms * 3000 + extraBeds * 1000;
      const tentAmount = tentGuests * 1000;
      const computedSubtotal = subtotalPerNight > 0 ? subtotalPerNight : roomAmount + tentAmount;
      const computedGst = gstAmountPerNight > 0 ? gstAmountPerNight : (computedSubtotal * gstRate) / 100;
      const computedPerNight = totalPerNight > 0 ? totalPerNight : computedSubtotal + computedGst;
      const totalSubtotal = computedSubtotal * days;
      const totalGst = computedGst * days;
      const totalAmount = computedPerNight * days;
      const stayLabel =
        checkIn && checkOut ? `Farm Stay (${checkIn} to ${checkOut})` : "Farm Stay";
      return {
        title: "Farm Stay Checkout",
        productName: `${stayLabel} - ${guests} guest(s), ${accommodationType}, ${days} day${days > 1 ? "s" : ""}`,
        subtotal: totalSubtotal,
        gstAmount: totalGst,
        totalAmount,
        backTo: "/stay",
        orderItems: [
          {
            product_name: `${stayLabel} - ${guests} guest(s), Rooms: ${rooms}, Extra Beds: ${extraBeds}, Tent Guests: ${tentGuests}, Type: ${accommodationType}, Days: ${days}`,
            quantity: days,
            unit_price: computedPerNight,
            gst_rate: gstRate,
          },
        ] as CheckoutOrderItem[],
      };
    }

    if (target === "cart") {
      const cartItems = getCartDetailedItems();
      if (cartItems.length === 0) return null;
      const orderItems = cartItems.map((item) => {
        const catalogProduct =
          catalog.find((catalogItem) => catalogItem.id === item.product.id) ||
          catalog.find((catalogItem) => catalogItem.name.trim().toLowerCase() === item.product.name.trim().toLowerCase());
        const variationLabel =
          item.variationLabel ||
          (item.variationId != null
            ? catalogProduct?.variations?.find((variation) => variation.id === item.variationId)?.value || ""
            : "");
        return {
          product_id: item.product.id,
          variation_id: item.variationId ?? null,
          attribute_name: item.variationAttribute || "",
          term_name: variationLabel,
          variation_value: variationLabel,
          quantity_value: null,
          unit: null,
          sku: item.sku ?? null,
          gst_rate: resolveGstRate(item.product.name, Number(catalogProduct?.gstRate ?? item.product.gstRate ?? 0)),
          product_name: variationLabel ? `${item.product.name} (${variationLabel})` : item.product.name,
          quantity: item.quantity,
          unit_price: Number(item.unitPrice ?? item.product.price),
        };
      }) as CheckoutOrderItem[];
      const subtotal = orderItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
      const gstAmount = orderItems.reduce(
        (sum, item) => sum + ((item.unit_price * item.quantity * Number(item.gst_rate || 0)) / 100),
        0
      );
      return {
        title: `Cart Checkout (${cartItems.length} items)`,
        productName: cartItems.map((item) => item.product.name).join(", "),
        subtotal,
        gstAmount,
        totalAmount: subtotal + gstAmount,
        backTo: "/cart",
        orderItems,
      };
    }

    const productId = Number(target);
    const variationIdParam = searchParams.get("variationId");
    const variationId = variationIdParam ? Number(variationIdParam) : null;
    const catalogProduct =
      singleProduct ||
      catalog.find((item) => item.id === productId) ||
      getCachedPublicCatalog().find((item) => item.id === productId);
    const product = catalogProduct || products.find((item) => item.id === productId);
    if (!product) return null;
    const selectedVariation =
      "variations" in product && Array.isArray(product.variations)
        ? variationId != null
          ? product.variations.find((item) => item.id === variationId) || product.variations[0]
          : product.variations[0]
        : null;
    const selectedLabel = selectedVariation ? selectedVariation.value : product.unit;
    const selectedPrice = selectedVariation ? Number(selectedVariation.price) : Number(product.price);
    const gstRate = resolveGstRate(product.name, Number(product.gstRate || 0));
    const gstAmount = (selectedPrice * gstRate) / 100;
    return {
      title: "Checkout",
      productName: `${product.name} (${selectedLabel})`,
      subtotal: selectedPrice,
      gstAmount,
      totalAmount: selectedPrice + gstAmount,
      backTo: `/product/${product.id}`,
      orderItems: [
        {
          product_id: product.id,
          variation_id: selectedVariation?.id ?? null,
          attribute_name: selectedVariation?.attribute_name || "",
          term_name: selectedVariation?.term_name || "",
          variation_value: selectedLabel,
          quantity_value: selectedVariation?.quantity_value ?? null,
          unit: selectedVariation?.unit ?? null,
          sku: selectedVariation?.sku ?? null,
          gst_rate: gstRate,
          product_name: `${product.name} (${selectedLabel})`,
          quantity: 1,
          unit_price: selectedPrice,
        },
      ] as CheckoutOrderItem[],
    };
  }, [target, searchParams, catalog, singleProduct]);

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

  const appliedGstRates = Array.from(
    new Set(
      checkoutData.orderItems
        .map((item) => Number(item.gst_rate ?? 0))
        .filter((rate) => Number.isFinite(rate))
    )
  ).sort((a, b) => a - b);
  const appliedGstLabel =
    appliedGstRates.length === 1
      ? `${appliedGstRates[0].toFixed(2)}%`
      : appliedGstRates.map((rate) => `${rate.toFixed(2)}%`).join(", ");

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
      if (!API_BASE_URL) {
        throw new Error("API base URL is missing.");
      }
      const invoiceId = buildInvoiceId();
      const orderPayload = {
        amount: checkoutData.totalAmount,
        currency: "INR",
        customer_name: form.fullName,
        customer_email: form.email,
        customer_phone: form.phone,
      };

      let resolvedApiBaseUrl = API_BASE_URL;
      let razorpayOrderResult = await createRazorpayOrder(API_BASE_URL, orderPayload);

      const shouldTryFallback =
        (!razorpayOrderResult.response.ok &&
          (razorpayOrderResult.response.status === 404 ||
            (razorpayOrderResult.data.message || "").toLowerCase().includes("route not found"))) ||
        !razorpayOrderResult.data.id;

      if (
        shouldTryFallback &&
        FALLBACK_API_BASE_URL &&
        FALLBACK_API_BASE_URL !== API_BASE_URL
      ) {
        const fallbackResult = await createRazorpayOrder(FALLBACK_API_BASE_URL, orderPayload);
        if (fallbackResult.response.ok && fallbackResult.data.id) {
          resolvedApiBaseUrl = FALLBACK_API_BASE_URL;
          razorpayOrderResult = fallbackResult;
        }
      }

      if (!razorpayOrderResult.response.ok || !razorpayOrderResult.data.id) {
        throw new Error(razorpayOrderResult.data.message || "Unable to create Razorpay order.");
      }

      const paymentResponse = await openRazorpayCheckout({
        amountInRupees: checkoutData.totalAmount,
        productName: checkoutData.productName,
        razorpayOrderId: razorpayOrderResult.data.id,
        invoiceId,
        customer: {
          name: form.fullName,
          email: form.email,
          phone: form.phone,
          address: form.address,
          pincode: form.pincode,
        },
      });

      const orderResponse = await fetch(`${resolvedApiBaseUrl}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          customer_name: form.fullName,
          customer_email: form.email,
          customer_phone: form.phone,
          customer_address: form.address,
          customer_pincode: form.pincode,
          total_amount: checkoutData.totalAmount,
          payment_status: "Paid",
          order_status: "Pending",
          invoice_id: invoiceId,
          razorpay_order_id: paymentResponse.razorpay_order_id || razorpayOrderResult.data.id || "",
          razorpay_payment_id: paymentResponse.razorpay_payment_id || "",
          razorpay_signature: paymentResponse.razorpay_signature || "",
          items: checkoutData.orderItems,
        }),
      });
      const orderResult = await orderResponse.json().catch(() => ({} as { message?: string }));
      if (!orderResponse.ok) {
        throw new Error(orderResult.message || "Unable to place order.");
      }

      const placedOrderId = (orderResult as { id?: number; invoice_id?: string }).id;
      alert(
        `Payment Successful!\nThank you for your purchase. Your order has been placed successfully.\nOrder ID: #${
          placedOrderId || invoiceId
        }`
      );
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
                <p className="break-words">
                  <span className="font-semibold">Items:</span> {checkoutData.productName}
                </p>
                <p>
                  <span className="font-semibold">GST Rate{appliedGstRates.length > 1 ? "s" : ""}:</span>{" "}
                  {appliedGstLabel}
                </p>
                <p>
                  <span className="font-semibold">Subtotal:</span> {"\u20B9"} {checkoutData.subtotal.toFixed(2)}
                </p>
                <p>
                  <span className="font-semibold">GST:</span> {"\u20B9"} {checkoutData.gstAmount.toFixed(2)}
                </p>
                <p>
                  <span className="font-semibold">Payable Amount:</span> {"\u20B9"} {checkoutData.totalAmount.toFixed(2)}
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
