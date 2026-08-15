import assert from "node:assert/strict";
import test from "node:test";
import { inferBookingProvider } from "../src/lib/appointments/booking-provider";
import {
  assignScheduleLanes,
  rangesOverlap,
  snapMinutes,
  validateScheduleRange
} from "../src/lib/appointments/schedule";

test("予約時刻は15分単位へ丸める", () => {
  assert.equal(snapMinutes(607), 600);
  assert.equal(snapMinutes(608), 615);
});

test("営業時間外と不正な施術時間を拒否する", () => {
  assert.equal(validateScheduleRange({ startMinutes: 600, durationMinutes: 60 }), null);
  assert.match(validateScheduleRange({ startMinutes: 590, durationMinutes: 60 }) ?? "", /15分単位/);
  assert.match(validateScheduleRange({ startMinutes: 600, durationMinutes: 0 }) ?? "", /施術時間/);
  assert.match(validateScheduleRange({ startMinutes: 1110, durationMinutes: 60 }) ?? "", /営業時間内/);
});

test("終了時刻と開始時刻が接する予約は重複しない", () => {
  assert.equal(
    rangesOverlap(
      { startMinutes: 600, durationMinutes: 60 },
      { startMinutes: 660, durationMinutes: 60 }
    ),
    false
  );
  assert.equal(
    rangesOverlap(
      { startMinutes: 600, durationMinutes: 75 },
      { startMinutes: 660, durationMinutes: 60 }
    ),
    true
  );
});

test("重なる予約は別レーンへ、連続予約は同じレーンへ配置する", () => {
  const result = assignScheduleLanes([
    { id: "a", startMinutes: 600, durationMinutes: 60 },
    { id: "b", startMinutes: 630, durationMinutes: 60 },
    { id: "c", startMinutes: 660, durationMinutes: 30 }
  ]);
  assert.equal(result.lanes.get("a"), 0);
  assert.equal(result.lanes.get("b"), 1);
  assert.equal(result.lanes.get("c"), 0);
  assert.equal(result.laneCount, 2);
});

test("予約元をかんざし結とHOT PEPPERで区別する", () => {
  assert.equal(inferBookingProvider({ source: "gmail:abc", subject: "新規のご予約が確定しました" }), "kanzashi");
  assert.equal(
    inferBookingProvider({ source: "notice@salonboard.com", subject: "HOT PEPPER Beauty ご予約通知" }),
    "hotpepper"
  );
  assert.equal(inferBookingProvider({ source: "お客様アプリ" }), "customer_app");
});
