import fs from "node:fs";

const shiftPath = "/app/.next/static/chunks/app/admin/appointments/page-shift-layout-20260812-02.capacity-persist-v44.business-schedule-v294.js";
const source = fs.readFileSync(shiftPath, "utf8");

const required = [
  'window.addEventListener("pointermove", i, !0)',
  'window.addEventListener("pointerup", l, !0)',
  'window.removeEventListener("pointermove", r.globalMove, !0)',
  "sourceElement: a",
  "sourceElement: n.sourceElement",
  'if ("touch" !== n.pointerType && (1 & e.buttons) == 0) return;',
  "onLostPointerCapture: () => {}",
  "previewAppointment: null",
  'document.querySelectorAll(".shift-lane[data-staff-name]")',
];

for (const snippet of required) {
  if (!source.includes(snippet)) throw new Error(`Missing ${snippet}`);
}

const forbidden = [
  "onPointerMove: B",
  "onPointerUp: G",
  "onLostPointerCapture: (e) => J(e, !0)",
];

for (const snippet of forbidden) {
  if (source.includes(snippet)) throw new Error(`Still contains ${snippet}`);
}

console.log("shift-drag-global-v334 runtime verification passed");
