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
import {
  isReservationNotificationEmail,
  parseReservationEmail
} from "../src/lib/appointments/reservation-email";
import { mergeReservationEmailDetails } from "../src/lib/appointments/import-reservation-email";
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
  assert.equal(result.value.staffAssignment, "named");
  assert.equal(result.value.bookingReference, "315097736");
  assert.equal(result.value.menu, "カット+カラー+Aujuaトリートメント ¥13,800");
  assert.equal(result.value.durationMinutes, 150);
});

test("kanzashi reservation parser supports legacy white-square field separators", () => {
  const result = parseReservationEmail({
    subject: "新規のご予約が確定しました（2026/08/02）",
    content:
      "□予約詳細ページ https://kanzashi.com/reservation/314000000 □来店日時 2026/08/02 10:00 □店舗名 Salon de Lien（美容室） □担当スタッフ 渡邊 浩明□予約時メニュー カット□合計施術時間 50 分□予約時合計金額 4,500 円□お客様名（カナ） 山田 太郎（ヤマダタロウ）□電話番号 09012345678"
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.staffName, "渡邊 浩明");
  assert.equal(result.value.staffAssignment, "named");
  assert.equal(result.value.durationMinutes, 50);
  assert.equal(result.value.customerName, "山田 太郎");
});

test("salon board reservation parser reads named staff, duration, price, and reference", () => {
  const result = parseReservationEmail({
    subject: "【当日】予約連絡",
    sender: "SALON BOARD <yoyaku_system@salonboard.com>",
    content: `
Salon de Lien様
HOT PEPPER Beauty「SALON BOARD」にお客様からご予約が入りました。
◇ご予約内容
■予約番号
BF50000001
■氏名
山田 太郎（ヤマダ タロウ）
■来店日時
2026年08月16日（日）17:00
■スタイリスト
渡辺 浩明
■メニュー
カット（SB込）
シャンプー・ブロー込み
（メニュー金額：4,500円）
（施術時間目安：1時間）
■合計金額
予約時合計金額 4,500円
`
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.customerName, "山田 太郎");
  assert.equal(result.value.bookingReference, "BF50000001");
  assert.equal(result.value.staffName, "渡邊 浩明");
  assert.equal(result.value.staffAssignment, "named");
  assert.equal(result.value.durationMinutes, 60);
  assert.equal(result.value.estimatedPrice, 4_500);
  assert.equal(result.value.status, "予約確定");
});

test("salon board reservation parser only assigns free when the email explicitly says so", () => {
  const freeResult = parseReservationEmail({
    subject: "【明日】予約連絡",
    content:
      "■予約番号 BF50000002 ■氏名 佐藤 花子（サトウ ハナコ） ■来店日時 2026年08月17日（月）10:30 ■スタイリスト 指名なし ■メニュー カット （施術時間目安：60分）"
  });
  const unknownResult = parseReservationEmail({
    subject: "予約内容変更連絡",
    content:
      "■予約番号 BF50000003 ■氏名 鈴木 一郎（スズキ イチロウ） ■来店日時 2026年08月18日（火）11:00 ■メニュー カラー"
  });

  assert.equal(freeResult.ok, true);
  if (freeResult.ok) {
    assert.equal(freeResult.value.staffName, "フリー");
    assert.equal(freeResult.value.staffAssignment, "free");
  }
  assert.equal(unknownResult.ok, true);
  if (unknownResult.ok) {
    assert.equal(unknownResult.value.staffName, null);
    assert.equal(unknownResult.value.staffAssignment, "unknown");
    assert.equal(unknownResult.value.status, "変更受付");
  }
});

test("reservation parser prefers a concrete stylist over a generic free marker", () => {
  const result = parseReservationEmail({
    subject: "【かんざし結】新規のご予約が確定しました",
    content: [
      "■予約番号 KZ50000005",
      "■氏名 田中 花子（タナカ ハナコ）",
      "■来店日時 2026年08月20日（木）13:30",
      "■ご指名 指名なし",
      "■予約時担当スタイリスト名 谷崎 太二",
      "■メニュー カット＋カラー",
      "■合計施術時間 2時間30分"
    ].join("\n")
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.staffName, "谷崎 太二");
  assert.equal(result.value.staffAssignment, "named");
});

test("reservation parser recognizes additional Kanzashi stylist labels", () => {
  for (const [label, expected] of [
    ["ご指名担当者", "浅野 清美"],
    ["予約時担当スタッフ", "小林 美奈子"],
    ["予約時スタイリスト", "渡辺 浩明"]
  ] as const) {
    const result = parseReservationEmail({
      subject: "【かんざし結】新規のご予約が確定しました",
      content: `■予約番号 KZ-${label}\n■氏名 田中 花子\n■来店日時 2026年08月21日（金）10:00\n■${label} ${expected}\n■メニュー カット`
    });
    assert.equal(result.ok, true);
    if (!result.ok) continue;
    assert.equal(result.value.staffAssignment, "named");
    assert.notEqual(result.value.staffName, "フリー");
  }
});

test("salon board point and last-minute subject variants remain confirmed reservations", () => {
  for (const subject of [
    "【ポイント利用】予約連絡",
    "【ポイント利用明日】予約連絡",
    "【ポイント利用当日】予約連絡",
    "【当日10時30分】直前予約が入りました"
  ]) {
    const result = parseReservationEmail({
      subject,
      content:
        "■予約番号 BF50000004 ■氏名 高橋 美咲（タカハシ ミサキ） ■来店日時 2026年08月19日（水）14:00 ■スタイリスト 浅野 清美 ■メニュー カット＋カラー （施術時間目安：2時間30分）"
    });
    assert.equal(result.ok, true);
    if (!result.ok) continue;
    assert.equal(result.value.status, "予約確定");
    assert.equal(result.value.durationMinutes, 150);
    assert.equal(result.value.staffName, "浅野 清美");
  }
});

test("salon board cancellation keeps its staff data and is recognized as cancelled", () => {
  const result = parseReservationEmail({
    subject: "【明日】キャンセル連絡",
    content:
      "■予約番号 BF50000005 ■氏名 田中 次郎（タナカ ジロウ） ■来店日時 2026年08月20日（木）13:00 ■スタイリスト 谷崎 太二 ■メニュー カット＋ヘッドスパ （施術時間目安：1時間30分）"
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.status, "キャンセル");
  assert.equal(result.value.staffName, "谷崎 太二");
  assert.equal(result.value.durationMinutes, 90);
});

test("reservation address confirmation mail is not treated as a customer reservation", () => {
  assert.equal(
    isReservationNotificationEmail({
      subject: "【SALON BOARD】予約お知らせメールアドレスの確認",
      content:
        "本メールアドレスはSALON BOARDで予約お知らせメールの宛先として設定されました。以下のURLをクリックして、メールアドレスを有効にしてください。"
    }),
    false
  );
  assert.equal(
    isReservationNotificationEmail({
      subject: "予約連絡",
      content:
        "■予約番号 BF50000006 ■氏名 山田 太郎（ヤマダ タロウ） ■来店日時 2026年08月21日（金）15:00 ■スタイリスト 小林 美奈子 ■メニュー カット"
    }),
    true
  );
});

test("reservation updates preserve known details when a later email omits them", () => {
  const existing = {
    staffName: "小林 美奈子",
    durationMinutes: 120,
    menu: "カット＋カラー",
    estimatedPrice: 12_000
  };
  assert.deepEqual(
    mergeReservationEmailDetails(
      {
        staffAssignment: "unknown",
        staffName: null,
        durationMinutes: null,
        menu: null,
        estimatedPrice: null
      },
      existing
    ),
    existing
  );
  assert.equal(
    mergeReservationEmailDetails(
      {
        staffAssignment: "free",
        staffName: "フリー",
        durationMinutes: null,
        menu: null,
        estimatedPrice: null
      },
      existing
    ).staffName,
    "フリー"
  );
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
