const fs = require("node:fs");

const chunk = fs.readFileSync("/app/.next/server/chunks/2241.js", "utf8");
const links = fs.readFileSync("/app/customer-links-v293.js", "utf8");
const staff = fs.readFileSync("/app/customer-store-staff-v276.js", "utf8");

if (chunk.includes("registeredAppUser&&await") || chunk.includes('"customer-store-link-"+p.id')) {
  throw new Error("Registration still creates an implicit store link");
}
for (const marker of [
  'FALSE AS "linked",TRUE AS "current"',
  "利用可能な店舗（未選択）",
  'DELETE FROM "CustomerStoreLink" WHERE "id"=',
]) {
  if (!links.includes(marker)) throw new Error(`Missing customer-links marker: ${marker}`);
}
if (links.includes("async function storesPage(req, res, url) {\n    const session = await currentCustomer(req)\n    await prisma.$executeRawUnsafe('INSERT INTO")) {
  throw new Error("Stores page still self-links the customer");
}
if (staff.includes("async function ensureCurrentStoreLink")) throw new Error("Store staff fallback still self-links customers");
if (!staff.includes("利用可能な店舗（未選択）")) throw new Error("Store staff fallback label is missing");

new Function(chunk);
new Function(links);
new Function(staff);
console.log("Customer store selection runtime verified.");
