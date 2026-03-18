import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Check } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import checkoutBreadcrumbImage from "@/assets/checkout_breadcrub.webp";
import { products } from "@/data/mockData";
import { getCartDetailedItems, clearCart } from "@/lib/cart";
import { computeDeliveryCharge } from "@/lib/delivery";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { getCachedPublicCatalog, getPublicProductById, getPublicProducts, type PublicProduct } from "@/lib/public-api";
import { customerApi } from "@/lib/customerApi";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";

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

interface CouponInfo {
  code: string;
  discountAmount: number;
  discountType?: "percentage" | "fixed";
  discountValue?: number;
  message?: string;
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

const validateCouponRequest = async (
  baseUrl: string,
  payload: { code: string; subtotal: number }
) => {
  const response = await fetch(`${baseUrl}/api/coupons/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => ({}))) as {
    message?: string;
    discount_amount?: number;
    discount_type?: "percentage" | "fixed";
    discount_value?: number;
    coupon_code?: string;
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
  const { toast } = useToast();
  const [successOpen, setSuccessOpen] = useState(false);
  const [successOrderId, setSuccessOrderId] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponInfo, setCouponInfo] = useState<CouponInfo | null>(null);
  const [couponNotice, setCouponNotice] = useState("");
  const [couponError, setCouponError] = useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
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
        deliveryCharge: 0,
        deliveryMessage: "",
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
      const delivery = computeDeliveryCharge(subtotal, { includeDiscounts: false });
      return {
        title: `Cart Checkout (${cartItems.length} items)`,
        productName: cartItems.map((item) => item.product.name).join(", "),
        subtotal,
        gstAmount,
        deliveryCharge: delivery.deliveryCharge,
        deliveryMessage: delivery.message,
        totalAmount: subtotal + gstAmount + delivery.deliveryCharge,
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
    const delivery = computeDeliveryCharge(selectedPrice, { includeDiscounts: false });
    return {
      title: "Checkout",
      productName: `${product.name} (${selectedLabel})`,
      subtotal: selectedPrice,
      gstAmount,
      deliveryCharge: delivery.deliveryCharge,
      deliveryMessage: delivery.message,
      totalAmount: selectedPrice + gstAmount + delivery.deliveryCharge,
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

  const discountAmount = couponInfo?.discountAmount ?? 0;
  const payableTotal = Math.max(0, checkoutData.totalAmount - discountAmount);
  const canApplyCoupon = target !== "stay";

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

  const onApplyCoupon = async () => {
    if (!canApplyCoupon) return;
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      setCouponError("Please enter a coupon code.");
      setCouponNotice("");
      return;
    }
    setIsApplyingCoupon(true);
    setCouponError("");
    setCouponNotice("");
    try {
      const payload = { code, subtotal: checkoutData.subtotal };
      let result = await validateCouponRequest(API_BASE_URL, payload);
      const shouldTryFallback =
        (!result.response.ok &&
          (result.response.status === 404 ||
            (result.data.message || "").toLowerCase().includes("route not found"))) ||
        !result.data;
      if (shouldTryFallback && FALLBACK_API_BASE_URL && FALLBACK_API_BASE_URL !== API_BASE_URL) {
        const fallbackResult = await validateCouponRequest(FALLBACK_API_BASE_URL, payload);
        if (fallbackResult.response.ok) {
          result = fallbackResult;
        }
      }
      if (!result.response.ok) {
        throw new Error(result.data.message || "Invalid coupon");
      }
      const discountAmountValue = Number(result.data.discount_amount || 0);
      if (!Number.isFinite(discountAmountValue) || discountAmountValue <= 0) {
        throw new Error("Coupon discount is not applicable.");
      }
      setCouponInfo({
        code: result.data.coupon_code || code,
        discountAmount: discountAmountValue,
        discountType: result.data.discount_type,
        discountValue: result.data.discount_value,
        message: result.data.message,
      });
      setCouponNotice(result.data.message || "Coupon applied.");
      setCouponError("");
    } catch (error) {
      setCouponInfo(null);
      setCouponError(error instanceof Error ? error.message : "Failed to apply coupon");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const onRemoveCoupon = () => {
    setCouponInfo(null);
    setCouponNotice("");
    setCouponError("");
    setCouponCode("");
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
      toast({
        title: "Missing details",
        description: "Please fill all checkout details.",
        variant: "destructive",
      });
      return;
    }

    setIsPaying(true);
    try {
      if (!API_BASE_URL) {
        throw new Error("API base URL is missing.");
      }
      const invoiceId = buildInvoiceId();
      const orderPayload = {
        amount: payableTotal,
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
        amountInRupees: payableTotal,
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
          total_amount: payableTotal,
          coupon_code: couponInfo?.code || "",
          discount_amount: couponInfo?.discountAmount || 0,
          discount_type: couponInfo?.discountType || null,
          discount_value: couponInfo?.discountValue || 0,
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
      setSuccessOrderId(String(placedOrderId || invoiceId));
      setSuccessOpen(true);
      if (target === "cart") {
        clearCart();
      }
      setForm({
        fullName: "",
        email: "",
        phone: "",
        address: "",
        pincode: "",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to start payment.";
      toast({
        title: "Payment Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <Layout>
      <div className="pt-28 pb-16">
        <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
          <DialogContent className="max-w-md p-0">
            <div className="flex flex-col items-center gap-4 px-6 pb-6 pt-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md">
                <Check className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-foreground">Thank you for ordering!</h2>
                <p className="text-sm text-muted-foreground">
                  Your order has been placed successfully.
                </p>
                {successOrderId ? (
                  <p className="text-sm font-medium text-emerald-700">Order ID: #{successOrderId}</p>
                ) : null}
              </div>
              <div className="mt-2 flex w-full flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSuccessOpen(false);
                    navigate("/customer/orders");
                  }}
                >
                  View Order
                </Button>
                <Button
                  type="button"
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => {
                    setSuccessOpen(false);
                    navigate("/shop");
                  }}
                >
                  Continue Shopping
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
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

              {canApplyCoupon ? (
                <div className="rounded-lg border border-border bg-white p-3">
                  <label className="text-sm font-medium">Coupon Code</label>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <input
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
                      placeholder="Enter coupon code"
                      disabled={isApplyingCoupon}
                    />
                    {couponInfo ? (
                      <Button type="button" variant="outline" onClick={onRemoveCoupon}>
                        Remove
                      </Button>
                    ) : (
                      <Button type="button" onClick={onApplyCoupon} disabled={isApplyingCoupon}>
                        {isApplyingCoupon ? "Applying..." : "Apply"}
                      </Button>
                    )}
                  </div>
                  {couponNotice ? (
                    <p className="mt-2 text-xs text-emerald-700">{couponNotice}</p>
                  ) : null}
                  {couponError ? <p className="mt-2 text-xs text-red-600">{couponError}</p> : null}
                </div>
              ) : null}

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
                {checkoutData.deliveryMessage ? (
                  <>
                    <p>
                      <span className="font-semibold">Delivery:</span>{" "}
                      {checkoutData.deliveryCharge === 0
                        ? "Free"
                        : `\u20B9 ${checkoutData.deliveryCharge.toFixed(2)}`}
                    </p>
                    <p className="text-xs text-muted-foreground">{checkoutData.deliveryMessage}</p>
                  </>
                ) : null}
                {discountAmount > 0 ? (
                  <p>
                    <span className="font-semibold">Discount:</span> - {"\u20B9"}{" "}
                    {discountAmount.toFixed(2)}
                  </p>
                ) : null}
                <p>
                  <span className="font-semibold">Payable Amount:</span> {"\u20B9"} {payableTotal.toFixed(2)}
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
