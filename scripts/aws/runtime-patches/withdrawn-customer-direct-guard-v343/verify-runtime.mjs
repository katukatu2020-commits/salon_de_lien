import fs from "node:fs";
const server = fs.readFileSync("/app/server.js", "utf8");
for (const required of [
  "withdrawn-customer-direct-guard-v343",
  "url.pathname.match(/^\\/admin\\/customers\\/([^/]+)$/)",
  'AND "deletedAt" IS NULL LIMIT 1',
  "/admin/customers?notice=customer-unavailable",
]) {
  if (!server.includes(required)) throw new Error(`Direct customer guard missing: ${required}`);
}
new Function(server);
console.log("Withdrawn customer direct guard v343 verification passed");
