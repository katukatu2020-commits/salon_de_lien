import fs from "node:fs";

const servicePath = "/app/customer-withdrawal-v309.js";
const source = fs.readFileSync(servicePath, "utf8");

const requestStart = source.indexOf("  async function requestWithdrawal(req, res) {");
const confirmStart = source.indexOf("  async function confirmWithdrawal(req, res) {");
const handleStart = source.indexOf("  async function handle(req, res, url) {");
if (requestStart < 0 || confirmStart < 0 || handleStart < 0) {
  throw new Error("Customer withdrawal service functions are missing");
}

const requestSection = source.slice(requestStart, confirmStart);
const confirmSection = source.slice(confirmStart, handleStart);

if (!requestSection.includes("if (!validOrigin(req))")) {
  throw new Error("The authenticated withdrawal request lost its origin protection");
}
if (confirmSection.includes("validOrigin(req)")) {
  throw new Error("The email-token confirmation still rejects mail-app origins");
}
for (const marker of [
  "TOKEN_PATTERN.test(token)",
  "hashToken(token)",
  '"usedAt" IS NULL AND "expiresAt">NOW()',
  "Withdrawal token was already consumed",
]) {
  if (!confirmSection.includes(marker)) {
    throw new Error(`Token confirmation is missing ${marker}`);
  }
}

console.log("customer-withdrawal-confirm-v339 runtime verification passed");
