import fs from "node:fs";

const oldName = "page-shift-layout-20260812-02.capacity-persist-v44.business-schedule-v294.shift-empty-cell-v338.js";
const newName = "page-shift-layout-20260812-02.capacity-persist-v44.business-schedule-v294.shift-stable-v341.js";
const shiftPath = `/app/.next/static/chunks/app/admin/appointments/${newName}`;
const shift = fs.readFileSync(shiftPath, "utf8");
const commercial = fs.readFileSync("/app/commercial-admin-v101.js", "utf8");

for (const required of [
  'document.addEventListener("selectstart", p, !0)',
  'window.addEventListener("pointerup", c, !0)',
  'grabOffsetMinutes: o',
  'e.getCoalescedEvents()',
  'a && (X(a.id, a), Y(a))',
  'n.pointerId !== e.pointerId || !1 === e.isPrimary || (void 0 !== e.button && 0 !== e.button)',
]) {
  if (!shift.includes(required)) throw new Error(`Missing stable drag behavior: ${required}`);
}

for (const forbidden of [
  'a.setPointerCapture(e.pointerId)',
  'n.sourceElement.setPointerCapture(e.pointerId)',
  'let a = r.previewAppointment || s',
]) {
  if (shift.includes(forbidden)) throw new Error(`Obsolete drag behavior remains: ${forbidden}`);
}

if (!commercial.includes('.lien-shift-drag-active .shift-lane button{pointer-events:none!important')) {
  throw new Error("Appointment cards still intercept an active drag");
}

for (const referenceFile of [
  "/app/.next/app-build-manifest.json",
  "/app/.next/server/app/admin/appointments/page_client-reference-manifest.js",
]) {
  const manifest = fs.readFileSync(referenceFile, "utf8");
  if (!manifest.includes(newName) || manifest.includes(oldName)) {
    throw new Error(`Manifest did not move to the stable drag chunk: ${referenceFile}`);
  }
}

new Function(shift);
new Function(commercial);
console.log("Stable shift drag v341 runtime verification passed");
