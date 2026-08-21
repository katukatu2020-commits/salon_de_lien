import fs from "node:fs";

function replaceOnce(source, before, after, label) {
  const occurrences = source.split(before).length - 1;
  if (occurrences !== 1) throw new Error(`${label}: expected one match, found ${occurrences}`);
  return source.replace(before, after);
}

function replacePatternOnce(source, pattern, replacement, label) {
  const matches = source.match(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`)) || [];
  if (matches.length !== 1) throw new Error(`${label}: expected one match, found ${matches.length}`);
  return source.replace(pattern, replacement);
}

const actionChunkPath = "/app/.next/server/chunks/2241.js";
let actionChunk = fs.readFileSync(actionChunkPath, "utf8");
const automaticRegistrationLink = 'let registeredAppUser=await t.appUser.findFirst({where:{customerId:p.id,role:"CUSTOMER"},select:{id:!0}});registeredAppUser&&await t.$executeRawUnsafe(\'INSERT INTO "CustomerStoreLink" ("id","appUserId","organizationId","customerId","createdAt") VALUES ($1,$2,$3,$4,NOW()) ON CONFLICT DO NOTHING\',"customer-store-link-"+p.id,registeredAppUser.id,P,p.id);\n';
actionChunk = replaceOnce(actionChunk, automaticRegistrationLink, "", "remove registration-time automatic store link");
new Function(actionChunk);
fs.writeFileSync(actionChunkPath, actionChunk, "utf8");

const customerLinksPath = "/app/customer-links-v293.js";
let customerLinks = fs.readFileSync(customerLinksPath, "utf8");
customerLinks = replaceOnce(
  customerLinks,
  `      await prisma.$executeRawUnsafe('UPDATE "Organization" SET "publicCode"=CASE WHEN "id"=\\'org_salon_de_lien\\' THEN \\'LIEN-SALON\\' WHEN "id"=\\'org_showcase_yohaku\\' THEN \\'LIEN-YOHAKU\\' ELSE \\'STORE-\\'||UPPER(SUBSTRING(MD5("id") FROM 1 FOR 8)) END WHERE "publicCode" IS NULL')`,
  `      await prisma.$executeRawUnsafe('UPDATE "Organization" SET "publicCode"=CASE WHEN "id"=\\'org_salon_de_lien\\' THEN \\'LIEN-SALON\\' WHEN "id"=\\'org_showcase_yohaku\\' THEN \\'LIEN-YOHAKU\\' ELSE \\'STORE-\\'||UPPER(SUBSTRING(MD5("id") FROM 1 FOR 8)) END WHERE "publicCode" IS NULL')\n      await prisma.$executeRawUnsafe('DELETE FROM "CustomerStoreLink" WHERE "id"=\\'customer-store-link-\\'||"customerId"')`,
  "remove legacy deterministic automatic links",
);
customerLinks = replaceOnce(
  customerLinks,
  `  async function stores(req, res, url) {\n    const session = await currentCustomer(req)\n    await ensureSchema()\n    await prisma.$executeRawUnsafe('INSERT INTO "CustomerStoreLink" ("id","appUserId","organizationId","customerId","createdAt") VALUES ($1,$2,$3,$4,NOW()) ON CONFLICT DO NOTHING', crypto.randomUUID(), session.userId, session.organizationId, session.customerId)`,
  `  async function availableStores(session) {\n    await ensureSchema()\n    return prisma.$queryRawUnsafe(\`SELECT l."organizationId",l."customerId",o."name",o."publicCode",TRUE AS "linked",\n        CASE WHEN l."organizationId"=$2 THEN TRUE ELSE FALSE END AS "current",l."createdAt"\n      FROM "CustomerStoreLink" l JOIN "Organization" o ON o."id"=l."organizationId"\n      JOIN "Customer" c ON c."id"=l."customerId" AND c."deletedAt" IS NULL\n      WHERE l."appUserId"=$1\n      UNION ALL\n      SELECT o."id" AS "organizationId",c."id" AS "customerId",o."name",o."publicCode",FALSE AS "linked",TRUE AS "current",c."createdAt"\n      FROM "AppUser" u JOIN "Customer" c ON c."id"=u."customerId" AND c."deletedAt" IS NULL\n      JOIN "Organization" o ON o."id"=u."organizationId"\n      WHERE u."id"=$1 AND u."organizationId"=$2 AND u."role"=\\'CUSTOMER\\' AND u."active"=TRUE\n        AND NOT EXISTS (SELECT 1 FROM "CustomerStoreLink" x WHERE x."appUserId"=u."id")\n      ORDER BY "current" DESC,"createdAt"\`, session.userId, session.organizationId)\n  }\n\n  async function stores(req, res, url) {\n    const session = await currentCustomer(req)\n    await ensureSchema()`,
  "add browse-only current store fallback",
);
customerLinks = replacePatternOnce(
  customerLinks,
  /    if \(req\.method === 'GET'\) \{\n      const rows = await prisma\.\$queryRawUnsafe\(`SELECT l\."organizationId",l\."customerId",o\."name",o\."publicCode",CASE WHEN l\."organizationId"=\$2 THEN TRUE ELSE FALSE END AS "current"[\s\S]*?      return json\(res, 200, \{ stores: rows \}\)\n    \}/,
  `    if (req.method === 'GET') {\n      const rows = await availableStores(session)\n      return json(res, 200, { stores: rows })\n    }`,
  "use available stores API",
);
customerLinks = replacePatternOnce(
  customerLinks,
  /  async function storesPage\(req, res, url\) \{\n    const session = await currentCustomer\(req\)\n    await prisma\.\$executeRawUnsafe\([^\n]+\)\n    const rows = await prisma\.\$queryRawUnsafe\(`[\s\S]*?session\.userId, session\.organizationId\)\n/,
  `  async function storesPage(req, res, url) {\n    const session = await currentCustomer(req)\n    const rows = await availableStores(session)\n`,
  "remove stores-page self-link",
);
customerLinks = replacePatternOnce(
  customerLinks,
  /    const cards = rows\.map\(store => `[^\n]+\.join\(''\)\n/,
  `    const cards = rows.map(store => \`<article class="registered-store-card \${store.current ? 'current' : ''}"><span class="registered-store-mark"><img src="/api/lien-store-icon?organizationId=\${encodeURIComponent(store.organizationId)}" alt="\${escapeHtml(store.name)}の店舗アイコン" width="52" height="52" loading="lazy" decoding="async" style="display:block;width:52px;height:52px;max-width:52px;max-height:52px;object-fit:cover"></span><div><strong>\${escapeHtml(store.name)}</strong><p>\${store.linked ? (store.current ? '現在利用中の店舗' : '登録済み') : '利用可能な店舗（未選択）'}</p></div>\${store.linked ? (store.current ? '<span class="registered-store-current">利用中</span>' : \`<button type="button" data-switch-store="\${escapeHtml(store.organizationId)}">切り替える</button>\`) : '<span class="registered-store-current">閲覧中</span>'}</article>\`).join('')\n`,
  "label unlinked store without claiming registration",
);
new Function(customerLinks);
fs.writeFileSync(customerLinksPath, customerLinks, "utf8");

const storeStaffPath = "/app/customer-store-staff-v276.js";
let storeStaff = fs.readFileSync(storeStaffPath, "utf8");
storeStaff = replacePatternOnce(
  storeStaff,
  /  async function ensureCurrentStoreLink\(session\) \{[\s\S]*?\n  \}\n\n  async function linkedStores\(session\) \{[\s\S]*?\n  \}\n\n  async function createSystemNotification/,
  `  async function linkedStores(session) {\n    await ensureSchema()\n    return prisma.$queryRawUnsafe(\n      \`SELECT l."organizationId",l."customerId",o."name",o."publicCode",o."iconImageUrl",TRUE AS "linked",\n              CASE WHEN l."organizationId"=$2 THEN TRUE ELSE FALSE END AS "current",l."createdAt"\n       FROM "CustomerStoreLink" l JOIN "Organization" o ON o."id"=l."organizationId"\n       JOIN "Customer" c ON c."id"=l."customerId" AND c."organizationId"=l."organizationId" AND c."deletedAt" IS NULL\n       WHERE l."appUserId"=$1\n       UNION ALL\n       SELECT o."id",c."id",o."name",o."publicCode",o."iconImageUrl",FALSE,TRUE,c."createdAt"\n       FROM "AppUser" u JOIN "Customer" c ON c."id"=u."customerId" AND c."deletedAt" IS NULL\n       JOIN "Organization" o ON o."id"=u."organizationId"\n       WHERE u."id"=$1 AND u."organizationId"=$2 AND u."role"=\\'CUSTOMER\\' AND u."active"=TRUE\n         AND NOT EXISTS (SELECT 1 FROM "CustomerStoreLink" x WHERE x."appUserId"=u."id")\n       ORDER BY "current" DESC,"createdAt"\`,\n      session.userId,\n      session.organizationId,\n    )\n  }\n\n  async function createSystemNotification`,
  "store staff browse-only fallback",
);
storeStaff = replaceOnce(
  storeStaff,
  `    await ensureCurrentStoreLink(session)\n    await prisma.$executeRawUnsafe('UPDATE "AppUser" SET "organizationId"=$1,"customerId"=$2,"updatedAt"=NOW() WHERE "id"=$3 AND "role"=\\'CUSTOMER\\' AND "active"=TRUE', organizationId, customerId, session.userId)`,
  `    await prisma.$executeRawUnsafe('UPDATE "AppUser" SET "organizationId"=$1,"customerId"=$2,"updatedAt"=NOW() WHERE "id"=$3 AND "role"=\\'CUSTOMER\\' AND "active"=TRUE', organizationId, customerId, session.userId)`,
  "do not backfill previous store while switching",
);
storeStaff = replacePatternOnce(
  storeStaff,
  /    const cards = stores\.map\(store => `[^\n]+\.join\(''\)\n/,
  `    const cards = stores.map(store => \`<article class="registered-store-card \${store.current ? 'current' : ''}"><span class="registered-store-mark"><img src="/api/lien-store-icon?organizationId=\${encodeURIComponent(store.organizationId)}" alt="\${escapeHtml(store.name)}の店舗アイコン" width="52" height="52" loading="lazy" decoding="async" style="display:block;width:52px;height:52px;max-width:52px;max-height:52px;object-fit:cover" onerror="this.style.display='none';this.parentElement.textContent='\${String(store.name || '店').trim().slice(0, 1)}'"></span><div><strong>\${escapeHtml(store.name)}</strong><p>\${store.linked ? (store.current ? '現在利用中の店舗' : '登録済み') : '利用可能な店舗（未選択）'}</p></div>\${store.linked ? (store.current ? '<span class="registered-store-current">利用中</span>' : \`<button type="button" data-switch-store="\${escapeHtml(store.organizationId)}">切り替える</button>\`) : '<span class="registered-store-current">閲覧中</span>'}</article>\`).join('')\n`,
  "store staff unlinked label",
);
new Function(storeStaff);
fs.writeFileSync(storeStaffPath, storeStaff, "utf8");

console.log("Customer store selection is now explicit; browse-only store context remains visible.");
