import { COUPON_TEMPLATE } from "@/lib/coupons/coupon-template.config";
import { isValidCouponCode, normalizeCouponCode } from "@/lib/coupons/coupon-code";
import { DEFAULT_SALON_MESSAGE, defaultFooterAddress, DEFAULT_COUPON_SALON_INFO } from "@/lib/coupons/coupon-defaults";

export type CouponIssueStatus = "issued" | "used" | "expired" | "cancelled";

export type CouponIssueInput = {
  customerId: string;
  customerName: string;
  discountRate: number;
  targetMenus: string[];
  issuedAt: Date;
  expiresAt: Date;
  couponCode: string;
  salonMessage?: string | null;
  footerAddress?: string | null;
  footerHours?: string | null;
  footerReservation?: string | null;
  footerPayments?: string | null;
};

export type CouponIssueDisplayData = Omit<CouponIssueInput, "customerId"> & {
  status?: string;
  templateVersion?: string;
};

export type CouponValidationResult = {
  errors: string[];
  warnings: string[];
};

export type CouponValidationPolicy = {
  minimumDiscountRate: number;
  maximumDiscountRate: number;
  maximumValidDays: number;
};

const DEFAULT_COUPON_VALIDATION_POLICY: CouponValidationPolicy = {
  minimumDiscountRate: 5,
  maximumDiscountRate: 30,
  maximumValidDays: 20
};

function isValidDate(date: Date) {
  return date instanceof Date && Number.isFinite(date.getTime());
}

export function parseDateInput(value: FormDataEntryValue | string | null | undefined) {
  const raw = typeof value === "string" ? value.trim() : "";

  if (!raw) {
    return null;
  }

  const date = new Date(`${raw}T00:00:00`);
  return isValidDate(date) ? date : null;
}

export function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function normalizeTargetMenus(value: string | string[] | null | undefined) {
  const values = Array.isArray(value) ? value : String(value ?? "").split(/\r?\n|,/g);

  return values
    .map((menu) => menu.trim())
    .filter(Boolean);
}

const CUSTOMER_NAME_MAX_CHARS = 14;
const SALON_MESSAGE_MAX_CHARS = 56;
const FOOTER_ADDRESS_MAX_CHARS = 52;
const FOOTER_HOURS_MAX_CHARS = 38;
const FOOTER_RESERVATION_MAX_CHARS = 18;
const FOOTER_PAYMENTS_MAX_CHARS = 56;

const targetMenuField = COUPON_TEMPLATE.fields.target_menu_lines;
const TARGET_MENU_MAX_ITEMS = targetMenuField.type === "multiline_list" ? targetMenuField.max_lines : 5;
const TARGET_MENU_MAX_CHARS_PER_ITEM = 12;

export function readCouponIssueInput(customerId: string, formData: FormData): CouponIssueInput {
  const issuedAt = parseDateInput(formData.get("issuedAt"));
  const expiresAt = parseDateInput(formData.get("expiresAt"));
  const discountRate = Number(formData.get("discountRate"));
  const customerName = String(formData.get("customerName") ?? "").trim();
  const couponCode = normalizeCouponCode(String(formData.get("couponCode") ?? ""));

  return {
    customerId,
    customerName,
    discountRate,
    targetMenus: normalizeTargetMenus(String(formData.get("targetMenus") ?? "")),
    issuedAt: issuedAt ?? new Date("Invalid Date"),
    expiresAt: expiresAt ?? new Date("Invalid Date"),
    couponCode,
    salonMessage: nullableString(formData.get("salonMessage")),
    footerAddress: nullableString(formData.get("footerAddress")) ?? defaultFooterAddress(),
    footerHours: nullableString(formData.get("footerHours")) ?? DEFAULT_COUPON_SALON_INFO.hours,
    footerReservation: nullableString(formData.get("footerReservation")) ?? DEFAULT_COUPON_SALON_INFO.reservation,
    footerPayments: nullableString(formData.get("footerPayments")) ?? DEFAULT_COUPON_SALON_INFO.payments
  };
}

function nullableString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function validateCouponIssueInput(
  input: CouponIssueInput,
  now = new Date(),
  policy: CouponValidationPolicy = DEFAULT_COUPON_VALIDATION_POLICY
): CouponValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const customerNameMax = CUSTOMER_NAME_MAX_CHARS;

  if (!input.customerId) {
    errors.push("customerIdが取得できません。");
  }

  if (!input.customerName) {
    errors.push("顧客名を入力してください。");
  } else if (input.customerName.length > customerNameMax) {
    errors.push(`顧客名は${customerNameMax}文字以内にしてください。`);
  } else if (input.customerName.length > 10) {
    warnings.push("顧客名が長いため、チラシ上では自動調整されます。");
  }

  if (!Number.isInteger(input.discountRate) || input.discountRate < policy.minimumDiscountRate || input.discountRate > policy.maximumDiscountRate) {
    errors.push(`割引率は${policy.minimumDiscountRate}〜${policy.maximumDiscountRate}の整数で入力してください。`);
  }

  if (input.targetMenus.length === 0) {
    errors.push("対象メニューを1件以上入力してください。");
  }

  if (input.targetMenus.length > TARGET_MENU_MAX_ITEMS) {
    errors.push(`対象メニューは${TARGET_MENU_MAX_ITEMS}件以内にしてください。`);
  }

  input.targetMenus.forEach((menu) => {
    const maxChars = TARGET_MENU_MAX_CHARS_PER_ITEM;
    if (menu.length > maxChars) {
      warnings.push(`「${menu}」は長いため、チラシ上では省略されます。`);
    }
  });

  if (!isValidDate(input.issuedAt)) {
    errors.push("発行日を正しく入力してください。");
  }

  if (!isValidDate(input.expiresAt)) {
    errors.push("有効期限を正しく入力してください。");
  }

  if (isValidDate(input.issuedAt) && isValidDate(input.expiresAt)) {
    if (input.expiresAt.getTime() <= input.issuedAt.getTime()) {
      errors.push("有効期限は発行日より後の日付にしてください。");
    }

    if (input.expiresAt.getTime() < today.getTime()) {
      errors.push("有効期限が過去日になっています。");
    }

    const maximumExpiresAt = new Date(input.issuedAt);
    maximumExpiresAt.setDate(maximumExpiresAt.getDate() + policy.maximumValidDays);
    if (input.expiresAt.getTime() > maximumExpiresAt.getTime()) {
      errors.push(`有効期限は発行日から${policy.maximumValidDays}日以内にしてください。`);
    }
  }

  if (!input.couponCode) {
    errors.push("識別コードを入力してください。");
  } else if (!isValidCouponCode(input.couponCode)) {
    errors.push("識別コードは13桁のJANコード形式で入力してください。");
  }

  validateTextLength(input.salonMessage ?? DEFAULT_SALON_MESSAGE, SALON_MESSAGE_MAX_CHARS, "サロンからの一言", errors);
  validateTextLength(input.footerAddress ?? defaultFooterAddress(), FOOTER_ADDRESS_MAX_CHARS, "住所・アクセス", errors);
  validateTextLength(input.footerHours ?? DEFAULT_COUPON_SALON_INFO.hours, FOOTER_HOURS_MAX_CHARS, "営業時間", errors);
  validateTextLength(input.footerReservation ?? DEFAULT_COUPON_SALON_INFO.reservation, FOOTER_RESERVATION_MAX_CHARS, "予約案内", errors);
  validateTextLength(input.footerPayments ?? DEFAULT_COUPON_SALON_INFO.payments, FOOTER_PAYMENTS_MAX_CHARS, "支払い方法", errors);

  return { errors, warnings };
}

function validateTextLength(value: string, maxChars: number | undefined, label: string, errors: string[]) {
  if (maxChars && value.length > maxChars) {
    errors.push(`${label}は${maxChars}文字以内にしてください。`);
  }
}

export function effectiveCouponIssueStatus(issue: { status: string; expiresAt: Date }, now = new Date()): CouponIssueStatus {
  if (issue.status === "issued") {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (issue.expiresAt.getTime() < today.getTime()) {
      return "expired";
    }
  }

  if (issue.status === "used" || issue.status === "cancelled") {
    return issue.status;
  }

  return "issued";
}

export function couponIssueStatusLabel(status: string) {
  if (status === "issued") return "発行済み";
  if (status === "used") return "使用済み";
  if (status === "expired") return "期限切れ";
  if (status === "cancelled") return "取消";
  return status;
}
