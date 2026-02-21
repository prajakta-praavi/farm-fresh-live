declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, callback: (response: unknown) => void) => void;
    };
  }
}

const RAZORPAY_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

const loadRazorpayScript = async (): Promise<void> => {
  if (window.Razorpay) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay checkout script."));
    document.body.appendChild(script);
  });
};

export const openRazorpayCheckout = async ({
  amountInRupees,
  productName,
  customer,
}: {
  amountInRupees: number;
  productName: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    pincode: string;
  };
}): Promise<void> => {
  const key = import.meta.env.VITE_RAZORPAY_KEY_ID;
  if (!key) {
    throw new Error("Missing Razorpay key id. Set VITE_RAZORPAY_KEY_ID in your environment.");
  }

  await loadRazorpayScript();
  if (!window.Razorpay) {
    throw new Error("Razorpay is unavailable.");
  }

  const razorpay = new window.Razorpay({
    key,
    amount: Math.round(amountInRupees * 100),
    currency: "INR",
    name: "Rushivan Agro",
    description: `Payment for ${productName}`,
    prefill: {
      name: customer.name,
      email: customer.email,
      contact: customer.phone,
    },
    notes: {
      address: customer.address,
      pincode: customer.pincode,
      product: productName,
    },
    handler: () => {
      alert("Payment successful.");
    },
    modal: {
      ondismiss: () => {
        // No-op by design to avoid noisy alerts on close.
      },
    },
    theme: {
      color: "#166534",
    },
  });

  razorpay.on("payment.failed", () => {
    alert("Payment failed. Please try again.");
  });

  razorpay.open();
};
