import assert from "node:assert/strict";
import test from "node:test";
import { parseReservationMenu, mergeImportedMenu } from "../src/lib/appointments/reservation-menu.cjs";
import { parseReservationEmail } from "../src/lib/appointments/reservation-email";

test("menu and total fields do not consume coupons, point fields or notes", () => {
  const parsed = parseReservationMenu("予約時クーポン: 9月限定20%OFF\n予約時メニュー: カット\nカラー\n予約時合計金額: 8,800円\n利用ポイント: 200pt\n備考: 次回はスパ");
  assert.equal(parsed.menu, "カット + カラー");
  assert.equal(parsed.estimatedPrice, 8800);
  assert.equal(parsed.reviewReason, null);
});

test("changed menus supersede explicitly marked previous menus", () => {
  const parsed = parseReservationMenu("【変更前】\nメニュー: 頭皮リセットスパ\n料金: 4,400円\n【変更後】\nメニュー: カット\n料金: 5,500円");
  assert.equal(parsed.menu, "カット");
  assert.equal(parsed.estimatedPrice, 5500);
  assert.equal(parseReservationMenu("変更前のメニュー: スパ\n変更後のメニュー: カラー").menu, "カラー");
});

test("conflicting menus and prices are flagged rather than guessed", () => {
  const parsed = parseReservationMenu("メニュー: カット\nメニュー: スパ\n合計金額: 4,000円\n合計金額: 6,000円");
  assert.equal(parsed.menu, null);
  assert.equal(parsed.estimatedPrice, null);
  assert.ok(parsed.reviewReason);
});

test("coupon-only and incidental numbers never become a default menu or charge", () => {
  const coupon = parseReservationMenu("クーポン: 20%OFF\n電話番号: 09012345678");
  assert.equal(coupon.menu, null);
  assert.equal(coupon.estimatedPrice, null);
  const menu = parseReservationMenu("メニュー: 60分カット 通常6,000円→5,000円");
  assert.equal(menu.estimatedPrice, null);
  assert.ok(menu.reviewReason);
});

test("all menu lines survive, quoted mail and bracketed metadata do not", () => {
  const result = parseReservationMenu("■メニュー\nカット(SB込)\nカラー\n(メニュー金額: 8,800円)\n(施術時間目安: 2時間)\n> メニュー: スパ");
  assert.equal(result.menu, "カット(SB込) + カラー");
  assert.equal(result.estimatedPrice, 8800);
});

test("a changed menu without a new amount cannot retain the old charge", () => {
  const old = { menu: "スパ", estimatedPrice: 4400 };
  assert.deepEqual(mergeImportedMenu(parseReservationMenu("メニュー: カット"), old), { menu: "カット", estimatedPrice: null });
  assert.deepEqual(mergeImportedMenu(parseReservationMenu("予約日時: 2026/10/10 10:00"), old), old);
  assert.deepEqual(mergeImportedMenu(parseReservationMenu("メニュー: カット\nメニュー: カラー"), old), { menu: null, estimatedPrice: null });
});

test("source reservation parser uses the same menu extraction", () => {
  const result = parseReservationEmail({ subject: "予約連絡", content: "■予約番号 MENU701\n■氏名 テスト 顧客\n■来店日時 2026/10/10 10:00\n■予約時クーポン 20%OFF\n■予約時メニュー カット\nカラー\n■予約時合計金額 8,800円" });
  assert.equal(result.ok, true);
  if (result.ok) { assert.equal(result.value.menu, "カット + カラー"); assert.equal(result.value.estimatedPrice, 8800); }
});
