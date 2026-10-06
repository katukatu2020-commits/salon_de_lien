import assert from "node:assert/strict";
import test from "node:test";
import { appointmentShiftHref, checkoutDisplay } from "../src/lib/appointments/checkout-display";

test("paid appointments are pink, unpaid appointments are yellow", () => {
  assert.equal(checkoutDisplay(true).label, "会計済み");
  assert.equal(checkoutDisplay(true).style.backgroundColor, "#fce7f0");
  assert.equal(checkoutDisplay(false).label, "未会計");
  assert.equal(checkoutDisplay(false).style.backgroundColor, "#fff4bd");
});

test("receipt returns to the appointment date in Japan, including month boundaries", () => {
  assert.equal(appointmentShiftHref(new Date("2026-09-30T16:00:00Z")), "/admin/appointments?month=2026-10&date=2026-10-01#staff-schedule");
});
