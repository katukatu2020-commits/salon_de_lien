import fs from "node:fs";

const page = fs.readFileSync("/app/.next/server/app/admin/customers/messages/page.js", "utf8");
const actions = fs.readFileSync("/app/.next/server/chunks/9845.js", "utf8");
const client = fs.readFileSync("/app/public/automated-coupon-fields-v412.js", "utf8");

const checks = [
  [page, '/automated-coupon-fields-v412.js?v=412', "v412 browser asset"],
  [page, 'FROM "AppUser" u', "current staff account fallback"],
  [page, 'u."organizationId"=$1', "tenant-scoped staff fallback"],
  [page, 'u."role"::text IN (\\\'ADMIN\\\',\\\'STAFF\\\')', "staff role restriction"],
  [page, 's."onLeave"=TRUE', "leave exclusion"],
  [actions, 'FROM "AppUser" u', "matching server validation source"],
  [actions, 'AND "staffName"=$2 LIMIT 1', "selected stylist validation"],
  [client, 'field.style.display = active ? "" : "none"', "reliable conditional visibility"],
  [client, 'form.dataset.conditionalFieldsBound = "v412"', "idempotent event binding"],
  [client, 'stylistSelect.disabled = !hasCandidates', "candidate-aware selector state"],
];

for (const [source, snippet, label] of checks) {
  if (!source.includes(snippet)) throw new Error(`Missing ${label}: ${snippet}`);
}

if (page.includes('/automated-coupon-fields-v330.js"')) {
  throw new Error("The messages page still references the stale v330 asset");
}

console.log("automated coupon stylist selector v412 runtime verification passed");
