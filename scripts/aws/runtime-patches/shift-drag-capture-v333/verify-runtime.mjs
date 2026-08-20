import fs from "node:fs";

const commercialPath = "/app/commercial-admin-v101.js";
const source = fs.readFileSync(commercialPath, "utf8");

const required = [
  ".ca-shift-drag-source{opacity:0!important;visibility:visible!important",
  "pointer-events:auto!important",
  "contain:layout style paint!important",
  "requestAnimationFrame(renderPointer)",
  "lien:shift-drag-pointer",
  "lien:shift-drag-move",
];

for (const snippet of required) {
  if (!source.includes(snippet)) throw new Error(`Missing ${snippet}`);
}

if (source.includes(".ca-shift-drag-source{opacity:0!important;visibility:hidden!important}")) {
  throw new Error("The pointer-capture element is still hidden");
}

console.log("shift-drag-capture-v333 runtime verification passed");
