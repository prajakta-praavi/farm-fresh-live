export type DeliveryChargeOptions = {
  threshold?: number;
  charge?: number;
  includeDiscounts?: boolean;
  discountAmount?: number;
};

export type DeliveryChargeResult = {
  subtotal: number;
  effectiveSubtotal: number;
  threshold: number;
  charge: number;
  deliveryCharge: number;
  eligibleForFreeDelivery: boolean;
  remainingAmount: number;
  message: string;
};

const normalizeAmount = (value: number) => (Number.isFinite(value) ? Math.max(0, value) : 0);

export const computeDeliveryCharge = (
  subtotal: number,
  options?: DeliveryChargeOptions
): DeliveryChargeResult => {
  const threshold = normalizeAmount(options?.threshold ?? 1000);
  const charge = normalizeAmount(options?.charge ?? 99);
  const discountAmount = normalizeAmount(options?.discountAmount ?? 0);
  const includeDiscounts = options?.includeDiscounts ?? false;

  const safeSubtotal = normalizeAmount(subtotal);
  const effectiveSubtotal = includeDiscounts ? Math.max(0, safeSubtotal - discountAmount) : safeSubtotal;
  const eligibleForFreeDelivery = effectiveSubtotal >= threshold;
  const deliveryCharge = eligibleForFreeDelivery ? 0 : charge;
  const remainingAmount = eligibleForFreeDelivery ? 0 : Math.max(0, threshold - effectiveSubtotal);
  const message = eligibleForFreeDelivery
    ? "You are eligible for Free Delivery"
    : `Add \u20B9${Math.ceil(remainingAmount)} more to get Free Delivery`;

  return {
    subtotal: safeSubtotal,
    effectiveSubtotal,
    threshold,
    charge,
    deliveryCharge,
    eligibleForFreeDelivery,
    remainingAmount,
    message,
  };
};
