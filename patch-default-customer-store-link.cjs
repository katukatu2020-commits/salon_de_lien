const fs = require("node:fs");

function replaceOnce(filePath, before, after, label) {
  const source = fs.readFileSync(filePath, "utf8");
  const occurrences = source.split(before).length - 1;
  if (occurrences !== 1) {
    throw new Error(`${label}: expected one match in ${filePath}, found ${occurrences}`);
  }
  const updated = source.replace(before, after);
  new Function(updated);
  fs.writeFileSync(filePath, updated, "utf8");
  console.log(`Patched ${label}: ${filePath}`);
}

const actionChunk = "/app/.next/server/chunks/2241.js";
replaceOnce(
  actionChunk,
  '}\nreturn g&&await t.contactLog.create',
  '}\nlet registeredAppUser=await t.appUser.findFirst({where:{customerId:p.id,role:"CUSTOMER"},select:{id:!0}});registeredAppUser&&await t.$executeRawUnsafe(\'INSERT INTO "CustomerStoreLink" ("id","appUserId","organizationId","customerId","createdAt") VALUES ($1,$2,$3,$4,NOW()) ON CONFLICT DO NOTHING\',"customer-store-link-"+p.id,registeredAppUser.id,P,p.id);\nreturn g&&await t.contactLog.create',
  "new customer default store link"
);

const customerLinks = "/app/customer-links-v293.js";
replaceOnce(
  customerLinks,
  "  async function storesPage(req, res, url) {\n    const session = await currentCustomer(req)\n    const rows = await prisma.$queryRawUnsafe",
  "  async function storesPage(req, res, url) {\n    const session = await currentCustomer(req)\n    await prisma.$executeRawUnsafe('INSERT INTO \\\"CustomerStoreLink\\\" (\\\"id\\\",\\\"appUserId\\\",\\\"organizationId\\\",\\\"customerId\\\",\\\"createdAt\\\") VALUES ($1,$2,$3,$4,NOW()) ON CONFLICT DO NOTHING', `customer-store-link-${session.customerId}`, session.userId, session.organizationId, session.customerId)\n    const rows = await prisma.$queryRawUnsafe",
  "registered stores self-heal"
);

const actionSource = fs.readFileSync(actionChunk, "utf8");
const storesSource = fs.readFileSync(customerLinks, "utf8");
if (!actionSource.includes('"customer-store-link-"+p.id')) {
  throw new Error("Registration-time store link is missing");
}
if (!storesSource.includes("`customer-store-link-${session.customerId}`")) {
  throw new Error("Registered-stores self-heal is missing");
}

console.log("Default Salon de Lien customer-store linking enabled.");
