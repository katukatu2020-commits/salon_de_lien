import fs from "node:fs";

const commercialPath = "/app/commercial-admin-v101.js";
let source = fs.readFileSync(commercialPath, "utf8");

const before = ".ca-shift-drag-source{opacity:0!important;visibility:hidden!important}";
const after = ".ca-shift-drag-source{opacity:0!important;visibility:visible!important;pointer-events:auto!important;contain:layout style paint!important}";
const matches = source.split(before).length - 1;

if (matches !== 1) {
  throw new Error(`Expected one drag source rule, found ${matches}`);
}

source = source.replace(before, after);
fs.writeFileSync(commercialPath, source);
