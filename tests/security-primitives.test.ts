import assert from "node:assert/strict";
import test from "node:test";
import {
  generateCustomerPortalToken,
  hashCustomerPortalToken,
  isCustomerPortalTokenFormat
} from "../src/lib/auth/customer-portal-token";
import { createAdminSessionToken, verifyAdminSessionToken } from "../src/lib/auth/admin-session";
import { createCustomerSessionToken, verifyCustomerSessionToken } from "../src/lib/auth/customer-session";
import {
  PRODUCT_REVIEW_COMMENT_MAX_LENGTH,
  PRODUCT_REVIEW_COMMENT_MIN_LENGTH,
  PRODUCT_REVIEW_POINT_VALID_DAYS,
  PRODUCT_REVIEW_REQUEST_VALID_DAYS,
  productReviewPointExpiresAt,
  reviewRequestExpiresAt
} from "../src/lib/products/product-review";
import {
  REVIEW_REWARD_ROLL_MAX,
  reviewRewardForRoll,
  reviewRewardPrizesFromSettings
} from "../src/lib/points/review-reward";
import { validateCouponIssueInput } from "../src/lib/coupons/coupon-validation";
import {
  REFERRAL_DISCOUNT_RATES,
  referralDiscountAmount
} from "../src/lib/points/referral-reward";
import { parseReservationEmail } from "../src/lib/appointments/reservation-email";
import { LONG_HAIR_FEES, longHairFee, percentageDiscountAmount } from "../src/lib/appointments/checkout-items";
import { bookingStartTimes, isBookingRangeAvailable } from "../src/lib/appointments/customer-booking";
import { isBookingRangeWithinCapacityOverrides } from "../src/lib/appointments/booking-capacity";
import {
  generatePasswordResetToken,
  hashPasswordResetToken,
  isDeliverableRecoveryEmail,
  isPasswordResetTokenFormat
} from "../src/lib/auth/password-reset";
import {
  formatJapaneseMobilePhone,
  generatePhoneRegistrationToken,
  generateSmsVerificationCode,
  hashPhoneRegistrationToken,
  hashSmsVerificationCode,
  maskJapaneseMobilePhone,
  normalizeJapaneseMobilePhone,
  secureHashMatches
} from "../src/lib/auth/phone-verification";
import {
  generateCustomerRegistrationToken,
  hashCustomerRegistrationToken,
  isCustomerRegistrationTokenFormat,
  sanitizeCustomerRegistrationContext
} from "../src/lib/auth/customer-registration-invite";

test("customer portal tokens are opaque, random and stored as SHA-256 hashes", () => {
  const first = generateCustomerPortalToken();
  const second = generateCustomerPortalToken();

  assert.equal(isCustomerPortalTokenFormat(first), true);
  assert.equal(isCustomerPortalTokenFormat(second), true);
  assert.notEqual(first, second);
  assert.match(hashCustomerPortalToken(first), /^[a-f0-9]{64}$/);
  assert.notEqual(hashCustomerPortalToken(first), first);
  assert.equal(hashCustomerPortalToken(first), hashCustomerPortalToken(first));
});

test("password reset links use opaque one-time-token primitives", () => {
  const first = generatePasswordResetToken();
  const second = generatePasswordResetToken();
  assert.equal(isPasswordResetTokenFormat(first), true);
  assert.equal(isPasswordResetTokenFormat(second), true);
  assert.notEqual(first, second);
  assert.match(hashPasswordResetToken(first), /^[a-f0-9]{64}$/);
  assert.notEqual(hashPasswordResetToken(first), first);
  assert.equal(isDeliverableRecoveryEmail("customer@example.com"), true);
  assert.equal(isDeliverableRecoveryEmail("demo@customer.salon-de-lien.local"), false);
});

test("customer registration email links are opaque and keep only bounded referral context", () => {
  const first = generateCustomerRegistrationToken();
  const second = generateCustomerRegistrationToken();
  assert.equal(isCustomerRegistrationTokenFormat(first), true);
  assert.equal(isCustomerRegistrationTokenFormat(second), true);
  assert.notEqual(first, second);
  assert.match(hashCustomerRegistrationToken(first), /^[a-f0-9]{64}$/);
  assert.notEqual(hashCustomerRegistrationToken(first), first);

  const context = sanitizeCustomerRegistrationContext({
    source: " customer-app ",
    campaign: "a".repeat(100),
    referrer: "LIEN-A8K3X"
  });
  assert.equal(context.source, "customer-app");
  assert.equal(context.campaign?.length, 80);
  assert.equal(context.referrer, "LIEN-A8K3X");
});

test("customer registration accepts only Japanese mobile numbers and binds one-time SMS proofs", () => {
  const secret = "s".repeat(64);
  const challengeId = "challenge-01";
  const phoneE164 = normalizeJapaneseMobilePhone("090-1234-5678");
  assert.equal(phoneE164, "+819012345678");
  assert.equal(normalizeJapaneseMobilePhone("03-1234-5678"), null);
  assert.equal(normalizeJapaneseMobilePhone("090-1234-567"), null);
  assert.equal(formatJapaneseMobilePhone(phoneE164!), "090-1234-5678");
  assert.equal(maskJapaneseMobilePhone(phoneE164!), "090-****-5678");

  const code = generateSmsVerificationCode();
  assert.match(code, /^\d{6}$/);
  const codeHash = hashSmsVerificationCode({ challengeId, phoneE164: phoneE164!, code, secret });
  assert.equal(secureHashMatches(codeHash, hashSmsVerificationCode({ challengeId, phoneE164: phoneE164!, code, secret })), true);
  assert.equal(secureHashMatches(codeHash, hashSmsVerificationCode({ challengeId, phoneE164: phoneE164!, code: "000000", secret })), false);

  const registrationToken = generatePhoneRegistrationToken();
  assert.match(registrationToken, /^[A-Za-z0-9_-]{40,}$/);
  assert.equal(
    secureHashMatches(
      hashPhoneRegistrationToken({ challengeId, token: registrationToken, secret }),
      hashPhoneRegistrationToken({ challengeId, token: registrationToken, secret })
    ),
    true
  );
});

test("backoffice session preserves role and tenant and expires", async () => {
  const secret = "a".repeat(64);
  const now = Date.UTC(2026, 7, 1, 0, 0, 0);
  const token = await createAdminSessionToken({
    email: "staff@example.com",
    secret,
    role: "STAFF",
    organizationId: "org-test",
    userId: "user-test",
    now,
    sessionHours: 1
  });

  const active = await verifyAdminSessionToken(token, secret, now + 30 * 60 * 1000);
  assert.equal(active?.role, "STAFF");
  assert.equal(active?.organizationId, "org-test");
  assert.equal(active?.userId, "user-test");
  assert.equal(await verifyAdminSessionToken(token, secret, now + 61 * 60 * 1000), null);
});

test("customer session is scoped to one customer and rejects expiration or tampering", async () => {
  const secret = "c".repeat(64);
  const now = Date.UTC(2026, 7, 3, 0, 0, 0);
  const token = await createCustomerSessionToken({
    loginId: "Customer_01",
    customerId: "customer-01",
    organizationId: "org-test",
    userId: "customer-user-01",
    secret,
    now,
    sessionDays: 1
  });

  const active = await verifyCustomerSessionToken(token, secret, now + 12 * 60 * 60 * 1000);
  assert.equal(active?.role, "CUSTOMER");
  assert.equal(active?.subject, "customer_01");
  assert.equal(active?.customerId, "customer-01");
  assert.equal(active?.organizationId, "org-test");
  assert.equal(await verifyCustomerSessionToken(`${token}x`, secret, now), null);
  assert.equal(await verifyCustomerSessionToken(token, secret, now + 25 * 60 * 60 * 1000), null);
});

test("purchased-product survey expires after 30 days and awarded points after 40 days", () => {
  const visitedAt = new Date("2026-08-03T00:00:00.000Z");
  const awardedAt = new Date("2026-08-20T00:00:00.000Z");
  const surveyExpiresAt = reviewRequestExpiresAt("purchased", visitedAt);
  const pointExpiresAt = productReviewPointExpiresAt(awardedAt);

  assert.equal(PRODUCT_REVIEW_POINT_VALID_DAYS, 40);
  assert.equal(PRODUCT_REVIEW_REQUEST_VALID_DAYS, 30);
  assert.equal((surveyExpiresAt.getTime() - visitedAt.getTime()) / 86_400_000, 30);
  assert.equal((pointExpiresAt.getTime() - awardedAt.getTime()) / 86_400_000, 40);
});

test("product review comments require 50 to 500 characters", () => {
  assert.equal(PRODUCT_REVIEW_COMMENT_MIN_LENGTH, 50);
  assert.equal(PRODUCT_REVIEW_COMMENT_MAX_LENGTH, 500);
});

test("review reward roulette follows the 1%, 9%, 90% boundaries", () => {
  assert.equal(reviewRewardForRoll(0), 1_000);
  assert.equal(reviewRewardForRoll(99), 1_000);
  assert.equal(reviewRewardForRoll(100), 200);
  assert.equal(reviewRewardForRoll(999), 200);
  assert.equal(reviewRewardForRoll(1_000), 80);
  assert.equal(reviewRewardForRoll(REVIEW_REWARD_ROLL_MAX - 1), 80);

  const counts = { 80: 0, 200: 0, 1000: 0 };
  for (let roll = 0; roll < REVIEW_REWARD_ROLL_MAX; roll += 1) {
    counts[reviewRewardForRoll(roll)] += 1;
  }
  assert.deepEqual(counts, { 80: 9_000, 200: 900, 1000: 100 });
});

test("owner review reward settings change both prizes and probability boundaries", () => {
  const prizes = reviewRewardPrizesFromSettings({
    firstPoints: 1_500,
    firstRate: 2,
    secondPoints: 300,
    secondRate: 18,
    thirdPoints: 100,
    thirdRate: 80
  });
  assert.equal(reviewRewardForRoll(199, prizes), 1_500);
  assert.equal(reviewRewardForRoll(200, prizes), 300);
  assert.equal(reviewRewardForRoll(1_999, prizes), 300);
  assert.equal(reviewRewardForRoll(2_000, prizes), 100);
});

test("owner coupon policy controls discount and validity limits", () => {
  const issuedAt = new Date("2026-08-08T00:00:00+09:00");
  const base = {
    customerId: "customer-test",
    customerName: "山田花子",
    discountRate: 15,
    targetMenus: ["トリートメント"],
    issuedAt,
    expiresAt: new Date("2026-08-22T00:00:00+09:00"),
    couponCode: "4512345678906"
  };
  const policy = { minimumDiscountRate: 10, maximumDiscountRate: 20, maximumValidDays: 14 };
  assert.deepEqual(validateCouponIssueInput(base, issuedAt, policy).errors, []);
  assert.match(validateCouponIssueInput({ ...base, discountRate: 25 }, issuedAt, policy).errors.join("\n"), /10〜20/);
  assert.match(
    validateCouponIssueInput({ ...base, expiresAt: new Date("2026-08-23T00:00:00+09:00") }, issuedAt, policy).errors.join("\n"),
    /14日以内/
  );
});

test("friend referral coupons apply the correct percentage to service charges", () => {
  assert.equal(REFERRAL_DISCOUNT_RATES.referrer, 15);
  assert.equal(REFERRAL_DISCOUNT_RATES.referredCustomer, 20);
  assert.equal(referralDiscountAmount(8_800, REFERRAL_DISCOUNT_RATES.referrer), 1_320);
  assert.equal(referralDiscountAmount(8_800, REFERRAL_DISCOUNT_RATES.referredCustomer), 1_760);
  assert.equal(referralDiscountAmount(0, REFERRAL_DISCOUNT_RATES.referrer), 0);
});

test("kanzashi reservation parser reads an inline appointed staff field", () => {
  const result = parseReservationEmail({
    subject: "新規のご予約が確定しました（2026/08/07）",
    content:
      "■予約詳細ページ https://kanzashi.com/reservation/315097736 ■来店日時 2026/08/07 13:30 ■店舗名 Salon de Lien（美容室） ■担当スタッフ 小林 美奈子■予約時メニュー カット+カラー+Aujuaトリートメント ¥13,800 ■ご来店者名 中川千里 ■電話番号 090-1234-5678 ■合計施術時間 150分"
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.customerName, "中川千里");
  assert.equal(result.value.staffName, "小林 美奈子");
  assert.equal(result.value.bookingReference, "315097736");
  assert.equal(result.value.menu, "カット+カラー+Aujuaトリートメント ¥13,800");
  assert.equal(result.value.durationMinutes, 150);
});

test("kanzashi cancellation email is recognized as a cancelled appointment", () => {
  const result = parseReservationEmail({
    subject: "ご予約がキャンセルされました（2026/08/07）",
    content:
      "■予約詳細ページ https://kanzashi.com/reservation/315097736 ■来店日時 2026/08/07 13:30 ■担当スタッフ 小林 美奈子 ■予約時メニュー カット+カラー ■ご来店者名 中川千里 ■電話番号 090-1234-5678"
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.bookingReference, "315097736");
  assert.equal(result.value.status, "キャンセル");
});

test("checkout long hair fees and percentage discounts use the configured amounts", () => {
  assert.deepEqual(LONG_HAIR_FEES, { M: 600, L: 1100, LL: 1700 });
  assert.equal(longHairFee("M"), 600);
  assert.equal(longHairFee("L"), 1100);
  assert.equal(longHairFee("LL"), 1700);
  assert.equal(longHairFee("invalid"), 0);
  assert.equal(percentageDiscountAmount(11_600, 20), 2_320);
});

test("customer booking availability respects staff capacity and appointment duration", () => {
  const setting = {
    staffKey: "test",
    staffName: "テスト担当",
    maxConcurrentAppointments: 1,
    workStartMinutes: 600,
    workEndMinutes: 720
  };
  const existing = [{ startMinutes: 630, durationMinutes: 60 }];
  assert.equal(isBookingRangeAvailable({ startMinutes: 600, durationMinutes: 60, setting, existing }), false);
  assert.equal(isBookingRangeAvailable({ startMinutes: 690, durationMinutes: 30, setting, existing }), true);
  assert.deepEqual(bookingStartTimes({ durationMinutes: 30, setting, existing }), [600, 690]);
});

test("staff with capacity two can accept one more overlapping customer booking", () => {
  const setting = {
    staffKey: "test",
    staffName: "テスト担当",
    maxConcurrentAppointments: 2,
    workStartMinutes: 600,
    workEndMinutes: 720
  };
  const existing = [{ startMinutes: 600, durationMinutes: 120 }];
  assert.equal(isBookingRangeAvailable({ startMinutes: 600, durationMinutes: 60, setting, existing }), false);
  assert.equal(isBookingRangeAvailable({ startMinutes: 615, durationMinutes: 60, setting, existing }), false);
  assert.equal(isBookingRangeAvailable({ startMinutes: 630, durationMinutes: 60, setting, existing }), true);
  assert.equal(isBookingRangeAvailable({ startMinutes: 690, durationMinutes: 60, setting, existing }), false);
});

test("manual reception capacity overrides apply across all staff", () => {
  const existing = [{ startMinutes: 600, durationMinutes: 60 }];
  assert.equal(
    isBookingRangeWithinCapacityOverrides({
      startMinutes: 600,
      durationMinutes: 30,
      existing,
      overrides: [{ slotStartMinutes: 600, capacity: 1 }]
    }),
    false
  );
  assert.equal(
    isBookingRangeWithinCapacityOverrides({
      startMinutes: 630,
      durationMinutes: 30,
      existing,
      overrides: [{ slotStartMinutes: 630, capacity: 2 }]
    }),
    true
  );
  assert.equal(
    isBookingRangeWithinCapacityOverrides({
      startMinutes: 690,
      durationMinutes: 30,
      existing,
      overrides: []
    }),
    true
  );
});
