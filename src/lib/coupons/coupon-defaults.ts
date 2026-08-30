import { addDays, inputDateValue } from "@/lib/coupons";

export const DEFAULT_COUPON_SALON_INFO = {
  salonNameJa: "ORIMIA",
  salonNameSub: "ORIMIA",
  address: "岡山県岡山市北区駅前町1-1-118",
  access: "岡山駅徒歩3分 / イコットニコット手前",
  hours: "営業時間: 10:00〜19:00",
  reservation: "ネット予約・即時予約OK",
  payments: "Visa / Mastercard / Amex / Diners / Discover / paypay"
} as const;

export const DEFAULT_COUPON_MENUS = [
  "カット",
  "カラー",
  "パーマ",
  "トリートメント",
  "ヘッドスパ",
  "カット + カラー"
] as const;

export const DEFAULT_SALON_MESSAGE =
  "これからも、あなたの「キレイ」と「心地よさ」を大切にサポートしてまいります。";

export function defaultCouponIssueDates(now = new Date()) {
  return {
    issuedAt: inputDateValue(now),
    expiresAt: inputDateValue(addDays(now, 14))
  };
}

export function defaultFooterAddress() {
  return `${DEFAULT_COUPON_SALON_INFO.address}\n${DEFAULT_COUPON_SALON_INFO.access}`;
}
