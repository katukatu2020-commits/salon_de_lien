export type CouponLike = {
  status: string;
  discountType: string;
  discountValue: string;
  validUntil: Date;
};

export function formatCouponDiscount(couponOrDiscountType: CouponLike | string, discountValueInput?: string) {
  const discountType = typeof couponOrDiscountType === "string" ? couponOrDiscountType : couponOrDiscountType.discountType;
  const discountValue = typeof couponOrDiscountType === "string" ? discountValueInput ?? "" : couponOrDiscountType.discountValue;

  if (discountType === "percentage") {
    return `${discountValue}%OFF`;
  }

  if (discountType === "fixed_amount") {
    const amount = Number(discountValue);
    return Number.isFinite(amount) ? `${amount.toLocaleString("ja-JP")}円OFF` : `${discountValue}円OFF`;
  }

  return discountValue;
}

export function couponStatusLabel(status: string) {
  if (status === "issued") {
    return "発行済み";
  }

  if (status === "used") {
    return "使用済み";
  }

  if (status === "expired") {
    return "期限切れ";
  }

  if (status === "cancelled") {
    return "取消";
  }

  return "下書き";
}

export function effectiveCouponStatus(coupon: CouponLike, now = new Date()) {
  if (coupon.status === "issued" && coupon.validUntil.getTime() < startOfToday(now).getTime()) {
    return "expired";
  }

  return coupon.status;
}

export function couponStatusTone(status: string) {
  if (status === "issued") {
    return "green";
  }

  if (status === "expired" || status === "cancelled") {
    return "amber";
  }

  if (status === "used") {
    return "stone";
  }

  return "stone";
}

export function startOfToday(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function inputDateValue(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return localDate.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}
