import { COUPON_TEMPLATE, type CouponTemplateField, type CouponTemplateFieldKey, type CouponRect } from "@/lib/coupons/coupon-template.config";
import type { CouponIssueDisplayData } from "@/lib/coupons/coupon-validation";

export type CouponRenderValues = {
  customer_name: string;
  discount_number: string;
  discount_percent_symbol: string;
  discount_off_text: string;
  target_menu_lines: string[];
  expiry_date: string;
  coupon_code: string;
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

export function formatCouponFlyerDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const weekday = WEEKDAYS[date.getDay()];
  return `${year} / ${month} / ${day} (${weekday})`;
}

export function buildCouponRenderValues(issue: CouponIssueDisplayData): CouponRenderValues {
  const menus = issue.targetMenus.length > 0 ? issue.targetMenus : ["カット"];

  return {
    customer_name: issue.customerName.trim() || "あなた",
    discount_number: String(issue.discountRate),
    discount_percent_symbol: "%",
    discount_off_text: "OFF",
    target_menu_lines: menus.slice(0, maxTargetMenuLines()),
    expiry_date: formatCouponFlyerDate(issue.expiresAt),
    coupon_code: issue.couponCode
  };
}

export function maxTargetMenuLines() {
  const field = COUPON_TEMPLATE.fields.target_menu_lines;
  return field.type === "multiline_list" ? field.max_lines : 5;
}

export function fieldRectStyle(rect: CouponRect) {
  return {
    x: rect.x,
    y: rect.y,
    width: rect.w,
    height: rect.h
  };
}

export function estimateFittedFontSize(field: CouponTemplateField, text: string) {
  const lines = Math.max(1, text.split(/\r?\n/g).length);
  const longest = Math.max(...text.split(/\r?\n/g).map(estimateTextUnits), 1);
  const widthSize = field.bbox.w / longest;
  const heightSize = field.bbox.h / Math.max(1, lines);
  return Math.max(field.min_font_size, Math.floor(Math.min(field.max_font_size, widthSize, heightSize)));
}

export function couponFlyerWarnings(issue: CouponIssueDisplayData) {
  const warnings: string[] = [];
  const values = buildCouponRenderValues(issue);

  if (issue.targetMenus.length > maxTargetMenuLines()) {
    warnings.push(`対象メニューが${maxTargetMenuLines()}件を超えているため、表示されない項目があります。`);
  }

  (Object.keys(COUPON_TEMPLATE.fields) as CouponTemplateFieldKey[]).forEach((key) => {
    const field = COUPON_TEMPLATE.fields[key];
    if (field.type === "multiline_list") {
      values.target_menu_lines.forEach((line) => {
        if (estimateFittedFontSize(field, line) <= field.min_font_size && estimateTextUnits(line) * field.min_font_size > field.bbox.w) {
          warnings.push("対象メニューが長いため、印刷時にエラーになる可能性があります。");
        }
      });
      return;
    }

    const value = stringValueForField(values, field.input_key);
    if (estimateFittedFontSize(field, value) <= field.min_font_size && estimateTextUnits(value) * field.min_font_size > field.bbox.w) {
      warnings.push(`${fieldLabel(key)}が長いため、印刷時にエラーになる可能性があります。`);
    }
  });

  return Array.from(new Set(warnings));
}

export function stringValueForField(values: CouponRenderValues, inputKey: string) {
  if (inputKey === "customer_name") return values.customer_name;
  if (inputKey === "discount_number") return values.discount_number;
  if (inputKey === "discount_percent_symbol") return values.discount_percent_symbol;
  if (inputKey === "discount_off_text") return values.discount_off_text;
  if (inputKey === "expiry_date") return values.expiry_date;
  if (inputKey === "coupon_code") return values.coupon_code;
  return "";
}

function estimateTextUnits(value: string) {
  return Array.from(value).reduce((total, char) => {
    if (char === " " || char === "　") return total + 0.35;
    if (/[\u0000-\u007f]/.test(char)) return total + 0.62;
    return total + 1;
  }, 0);
}

function fieldLabel(key: CouponTemplateFieldKey) {
  const labels: Record<CouponTemplateFieldKey, string> = {
    customer_name: "顧客名",
    discount_number: "割引率",
    discount_percent: "%",
    discount_off: "OFF",
    target_menu_lines: "対象メニュー",
    expiry_date: "有効期限",
    coupon_code: "識別コード"
  };

  return labels[key] ?? key;
}
