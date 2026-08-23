import fs from "node:fs";
import vm from "node:vm";

const experiencePath = "/app/customer-experience-v395.js";
const source = fs.readFileSync(experiencePath, "utf8");

for (const marker of [
  "data-customer-bottom-nav",
  "data-customer-bottom-nav-inner",
  "data-customer-bottom-nav-item",
  "flex-direction:column!important",
  "box-sizing:border-box!important",
  "label: 'チャット相談'",
  "normalizeBottomNavigation()",
]) {
  if (!source.includes(marker)) throw new Error(`bottom navigation marker missing: ${marker}`);
}

if (!source.includes("height:calc(var(--customer-nav-height) + env(safe-area-inset-bottom))!important")) {
  throw new Error("safe-area-aware navigation height is missing");
}
if (!source.includes("new MutationObserver(() => { applyCustomerConsistency(); normalizeBottomNavigation();")) {
  throw new Error("navigation is not normalized after client-side updates");
}
if (source.includes(".cx-customer-nav-active{background:#f7e7e1")) {
  throw new Error("legacy active pill styling remains");
}

new vm.Script(source);
console.log("customer mobile bottom navigation v411 verified");
