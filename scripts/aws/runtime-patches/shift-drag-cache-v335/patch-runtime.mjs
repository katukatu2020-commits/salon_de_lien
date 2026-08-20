import fs from "node:fs";
import path from "node:path";

const oldName = "page-shift-layout-20260812-02.capacity-persist-v44.business-schedule-v294.js";
const newName = "page-shift-layout-20260812-02.capacity-persist-v44.business-schedule-v294.shift-drag-v334.js";
const staticDirectory = "/app/.next/static/chunks/app/admin/appointments";
const oldPath = path.join(staticDirectory, oldName);
const newPath = path.join(staticDirectory, newName);
const referenceFiles = [
  "/app/.next/app-build-manifest.json",
  "/app/.next/server/app/admin/appointments/page_client-reference-manifest.js",
];

fs.copyFileSync(oldPath, newPath);

for (const referenceFile of referenceFiles) {
  const source = fs.readFileSync(referenceFile, "utf8");
  const matches = source.split(oldName).length - 1;
  if (matches < 1) throw new Error(`Missing old chunk reference in ${referenceFile}`);
  fs.writeFileSync(referenceFile, source.replaceAll(oldName, newName));
}
