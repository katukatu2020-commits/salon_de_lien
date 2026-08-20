import fs from "node:fs";

const oldName = "page-shift-layout-20260812-02.capacity-persist-v44.business-schedule-v294.js";
const newName = "page-shift-layout-20260812-02.capacity-persist-v44.business-schedule-v294.shift-drag-v334.js";
const newPath = `/app/.next/static/chunks/app/admin/appointments/${newName}`;
const referenceFiles = [
  "/app/.next/app-build-manifest.json",
  "/app/.next/server/app/admin/appointments/page_client-reference-manifest.js",
];

const chunk = fs.readFileSync(newPath, "utf8");
for (const snippet of [
  'window.addEventListener("pointermove", i, !0)',
  'window.addEventListener("pointerup", l, !0)',
  'document.querySelectorAll(".shift-lane[data-staff-name]")',
]) {
  if (!chunk.includes(snippet)) throw new Error(`Versioned chunk is missing ${snippet}`);
}

for (const referenceFile of referenceFiles) {
  const source = fs.readFileSync(referenceFile, "utf8");
  if (!source.includes(newName)) throw new Error(`${referenceFile} is missing the new chunk`);
  if (source.includes(oldName)) throw new Error(`${referenceFile} still references the cached chunk`);
}

console.log("shift-drag-cache-v335 runtime verification passed");
