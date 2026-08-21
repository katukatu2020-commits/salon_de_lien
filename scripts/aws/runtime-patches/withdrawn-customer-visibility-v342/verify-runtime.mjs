import fs from "node:fs";

const withdrawal = fs.readFileSync("/app/customer-withdrawal-v309.js", "utf8");
const platform = fs.readFileSync("/app/platform-operator.js", "utf8");
const server = fs.readFileSync("/app/server.js", "utf8");
const chat = fs.readFileSync("/app/.next/server/app/admin/customers/messages/page.js", "utf8");

for (const required of [
  'WHERE "customerId"=$1\', row.customerId',
  'c."deletedAt" IS NOT NULL AND u."active"=TRUE',
  'CustomerPortalAccess" p SET "revokedAt"=NOW()',
]) {
  if (!withdrawal.includes(required)) throw new Error(`Withdrawal invariant missing: ${required}`);
}

for (const required of [
  '/platform/customers',
  '退会済み',
  '店舗側の顧客一覧・検索・カルテ・チャットには表示されません',
  'withdrawnCustomerCount',
  'CUSTOMER RECORD / READ ONLY',
]) {
  if (!platform.includes(required)) throw new Error(`Platform customer record feature missing: ${required}`);
}

if (!server.includes('WHERE t."organizationId"=$1 AND c."deletedAt" IS NULL ORDER BY t."updatedAt" DESC')) {
  throw new Error("Runtime store chat still includes withdrawn customers");
}
if (!chat.includes('WHERE t."organizationId"=$1 AND c."deletedAt" IS NULL ORDER BY t."updatedAt" DESC')) {
  throw new Error("Compiled store chat still includes withdrawn customers");
}

new Function(withdrawal);
new Function(platform);
new Function(server);
console.log("Withdrawn customer visibility v342 verification passed");
