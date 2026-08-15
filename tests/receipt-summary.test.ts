import assert from "node:assert/strict";
import test from "node:test";
import { buildReceiptSaleSummary, receiptNumber } from "../src/lib/appointments/receipt";

test("receipt summary preserves checkout note amounts", () => {
  const summary = buildReceiptSaleSummary({
    saleAmount: 12_480,
    note: "基本施術料金 10,000円 / ロング料金 M +600円 / 商品 3,300円 / クーポン 限定クーポン 10%OFF（SDL-001） -1,060円 / ポイント割引 360円 / お支払い 12,480円 / うち消費税（10%） 1,134円",
    productTotal: 3_300,
    fallbackTaxRate: 10
  });

  assert.equal(summary.serviceBaseAmount, 10_000);
  assert.deepEqual(summary.longHairCharge, { label: "ロング料金 M", amount: 600 });
  assert.deepEqual(summary.couponDiscount, { label: "限定クーポン 10%OFF（SDL-001）", amount: 1_060 });
  assert.equal(summary.pointDiscount, 360);
  assert.equal(summary.subtotal, 13_900);
  assert.equal(summary.includedTax, 1_134);
});

test("receipt summary has safe fallbacks for historic sale notes", () => {
  const summary = buildReceiptSaleSummary({
    saleAmount: 8_800,
    note: null,
    productTotal: 0,
    fallbackTaxRate: 10,
    fallbackPointDiscount: 200
  });

  assert.equal(summary.serviceBaseAmount, 9_000);
  assert.equal(summary.pointDiscount, 200);
  assert.equal(summary.includedTax, 800);
});

test("receipt number is deterministic and printable", () => {
  const value = receiptNumber("cm123abc-xyz789", new Date("2026-08-08T03:00:00.000Z"));
  assert.match(value, /^SDL-20260808-[A-Z0-9]{6}$/);
  assert.equal(value, receiptNumber("cm123abc-xyz789", new Date("2026-08-08T03:00:00.000Z")));
});
