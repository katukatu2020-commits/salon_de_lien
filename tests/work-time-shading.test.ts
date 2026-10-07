import assert from "node:assert/strict";
import test from "node:test";
import { workTimeShading, resolveWorkingHours } from "../src/lib/appointments/work-time-shading";

test("selected date overrides standard attendance hours and weekly holidays", () => {
  const staff = { workStartMinutes: 600, workEndMinutes: 1140, closedWeekdays: "3" };
  const policy = { plannedStart: "08:00", plannedEnd: "19:00" };
  assert.deepEqual(resolveWorkingHours(staff, "2026-10-07", policy), { workStartMinutes: 0, workEndMinutes: 0 });
  assert.deepEqual(resolveWorkingHours(staff, "2026-10-08", policy), { workStartMinutes: 480, workEndMinutes: 1140 });
  assert.deepEqual(resolveWorkingHours(staff, "2026-10-07", policy, { isDayOff: false, startMinutes: 660, endMinutes: 840 }), { workStartMinutes: 660, workEndMinutes: 840 });
  assert.deepEqual(resolveWorkingHours(staff, "2026-10-08", policy, { isDayOff: true, startMinutes: 660, endMinutes: 840 }), { workStartMinutes: 0, workEndMinutes: 0 });
});

test("working time shades only before start and after end", () => {
  assert.deepEqual(workTimeShading({ workStartMinutes: 660, workEndMinutes: 840 }, 480, 1200), { before: 25, after: 50 });
});

test("holiday, invalid hours and hours outside the displayed day shade the whole row", () => {
  for (const [start, end] of [[0, 0], [NaN, 900], [900, 800], [300, 480], [1200, 1400]]) {
    assert.deepEqual(workTimeShading({ workStartMinutes: start, workEndMinutes: end }, 480, 1200), { before: 100, after: 0 });
  }
});

test("hours spanning store hours do not overflow", () => {
  assert.deepEqual(workTimeShading({ workStartMinutes: 420, workEndMinutes: 1300 }, 480, 1200), { before: 0, after: 0 });
});

test("unassigned staff pool is not a physical staff holiday", () => {
  assert.deepEqual(workTimeShading({ key: "free", workStartMinutes: 0, workEndMinutes: 0 }, 480, 1200), { before: 0, after: 0 });
  assert.deepEqual(workTimeShading({ key: "free", workStartMinutes: 0, workEndMinutes: 0 }, 480, 1200, true), { before: 100, after: 0 });
});
