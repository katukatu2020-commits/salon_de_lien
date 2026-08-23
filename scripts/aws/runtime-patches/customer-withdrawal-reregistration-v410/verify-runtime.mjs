import fs from "node:fs";

const servicePath = "/app/customer-withdrawal-v309.js";
const service = fs.readFileSync(servicePath, "utf8");

for (const marker of [
  "Release credentials from past withdrawals while retaining the customer",
  `'withdrawn+' || u."id" || '@customer.salon-de-lien.local'`,
  `DELETE FROM "CustomerPhoneIdentity" p USING "Customer" c`,
  `'withdrawn+' || "id" || '@customer.salon-de-lien.local'`,
  `DELETE FROM "CustomerPhoneIdentity" WHERE "customerId"=$1`,
]) {
  if (!service.includes(marker)) throw new Error(`v410 marker missing: ${marker}`);
}

if (service.includes(`UPDATE "AppUser" SET "active"=FALSE, "updatedAt"=NOW() WHERE "customerId"=$1`)) {
  throw new Error("old withdrawal-only deactivation remains");
}

new Function(service);
console.log("customer withdrawal re-registration v410 verified");
