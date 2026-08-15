export type ReceiptSaleSummary = {
  serviceBaseAmount: number;
  longHairCharge: { label: string; amount: number } | null;
  couponDiscount: { label: string; amount: number } | null;
  pointDiscount: number;
  subtotal: number;
  includedTax: number;
  taxRate: number;
};

function numberFromMatch(value?: string) {
  return value ? Number(value.replace(/,/g, "")) : null;
}

export function receiptNumber(saleId: string, paidAt: Date) {
  const date = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  })
    .format(paidAt)
    .replace(/\D/g, "");
  const suffix = saleId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase().padStart(6, "0");
  return `SDL-${date}-${suffix}`;
}

export function buildReceiptSaleSummary(input: {
  saleAmount: number;
  note: string | null;
  productTotal: number;
  fallbackTaxRate: number;
  fallbackPointDiscount?: number;
}) {
  const note = input.note ?? "";
  const serviceMatch = note.match(/基本施術料金\s*([\d,]+)円/);
  const longHairMatch = note.match(/ロング料金\s*(M|L|LL)\s*\+([\d,]+)円/);
  const couponMatch = note.match(/(?:^|\/)\s*クーポン\s+(.+?)\s+-([\d,]+)円(?=\s*\/|$)/);
  const pointMatch = note.match(/ポイント割引\s*([\d,]+)円/);
  const taxMatch = note.match(/うち消費税（(\d+)%）\s*([\d,]+)円/);

  const longHairAmount = numberFromMatch(longHairMatch?.[2]) ?? 0;
  const couponAmount = numberFromMatch(couponMatch?.[2]) ?? 0;
  const pointDiscount = numberFromMatch(pointMatch?.[1]) ?? input.fallbackPointDiscount ?? 0;
  const serviceBaseAmount =
    numberFromMatch(serviceMatch?.[1]) ??
    Math.max(0, input.saleAmount + couponAmount + pointDiscount - input.productTotal - longHairAmount);
  const taxRate = numberFromMatch(taxMatch?.[1]) ?? input.fallbackTaxRate;
  const includedTax =
    numberFromMatch(taxMatch?.[2]) ??
    (taxRate > 0 ? Math.floor((input.saleAmount * taxRate) / (100 + taxRate)) : 0);

  return {
    serviceBaseAmount,
    longHairCharge: longHairMatch
      ? { label: `ロング料金 ${longHairMatch[1]}`, amount: longHairAmount }
      : null,
    couponDiscount:
      couponMatch && couponAmount > 0
        ? { label: couponMatch[1].trim(), amount: couponAmount }
        : null,
    pointDiscount,
    subtotal: serviceBaseAmount + longHairAmount + input.productTotal,
    includedTax,
    taxRate
  } satisfies ReceiptSaleSummary;
}
