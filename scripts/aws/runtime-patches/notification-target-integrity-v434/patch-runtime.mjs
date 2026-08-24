import fs from "node:fs";

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  return source.replace(before, after);
}

function replaceCount(source, before, after, expected, label) {
  const count = source.split(before).length - 1;
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`);
  return source.split(before).join(after);
}

const serverPath = "/app/server.js";
let server = fs.readFileSync(serverPath, "utf8");

server = replaceOnce(
  server,
  `FROM "ChatThread" t LEFT JOIN "StaffBookingSetting" s ON s."organizationId"=t."organizationId" AND s."staffKey"=t."staffKey" WHERE t."organizationId"=$1`,
  `FROM "ChatThread" t LEFT JOIN "StaffBookingSetting" s ON s."organizationId"=t."organizationId" AND s."staffKey"=t."staffKey" JOIN "Customer" c ON c."id"=t."customerId" WHERE t."organizationId"=$1 AND c."organizationId"=t."organizationId" AND c."deletedAt" IS NULL AND c."storeHiddenAt" IS NULL`,
  "staff unread chat visibility",
);

server = replaceOnce(
  server,
  String.raw`FROM "Customer" WHERE "organizationId"=$1 AND "deletedAt" IS NULL AND "createdAt">NOW()-INTERVAL \'7 days\'`,
  String.raw`FROM "Customer" WHERE "organizationId"=$1 AND "deletedAt" IS NULL AND "storeHiddenAt" IS NULL AND "createdAt">NOW()-INTERVAL \'7 days\'`,
  "new customer notification visibility",
);

server = replaceOnce(
  server,
  `FROM "Customer" WHERE "organizationId"=$1 AND "deletedAt" IS NULL GROUP BY 1,2 HAVING COUNT(*)>1 LIMIT 40`,
  `FROM "Customer" WHERE "organizationId"=$1 AND "deletedAt" IS NULL AND "storeHiddenAt" IS NULL GROUP BY 1,2 HAVING COUNT(*)>1 LIMIT 40`,
  "duplicate customer notification visibility",
);

server = replaceCount(
  server,
  `WHERE a."id"=$1 AND c."organizationId"=$2 AND c."deletedAt" IS NULL LIMIT 1`,
  `WHERE a."id"=$1 AND c."organizationId"=$2 AND c."deletedAt" IS NULL AND c."storeHiddenAt" IS NULL LIMIT 1`,
  2,
  "appointment notification read validation",
);

server = replaceOnce(
  server,
  String.raw`WHERE c."organizationId"=$1 AND c."deletedAt" IS NULL AND COALESCE(a."source",\'\') NOT LIKE \'ses:%\' ORDER BY a."createdAt" DESC LIMIT 100`,
  String.raw`WHERE c."organizationId"=$1 AND c."deletedAt" IS NULL AND c."storeHiddenAt" IS NULL AND COALESCE(a."source",\'\') NOT LIKE \'ses:%\' ORDER BY a."createdAt" DESC LIMIT 100`,
  "appointment notification history visibility",
);

server = replaceOnce(
  server,
  String.raw`WHERE c."organizationId"=$1 AND c."deletedAt" IS NULL AND COALESCE(a."source",\'\') NOT LIKE \'ses:%\' AND NOT EXISTS`,
  String.raw`WHERE c."organizationId"=$1 AND c."deletedAt" IS NULL AND c."storeHiddenAt" IS NULL AND COALESCE(a."source",\'\') NOT LIKE \'ses:%\' AND NOT EXISTS`,
  "unread appointment notification visibility",
);

server = replaceOnce(
  server,
  String.raw`WHERE t."organizationId"=$1 AND c."deletedAt" IS NULL AND m."senderType"=\'customer\' ORDER BY m."createdAt" DESC LIMIT 100`,
  String.raw`WHERE t."organizationId"=$1 AND c."organizationId"=t."organizationId" AND c."deletedAt" IS NULL AND c."storeHiddenAt" IS NULL AND m."senderType"=\'customer\' ORDER BY m."createdAt" DESC LIMIT 100`,
  "chat notification history visibility",
);

server = replaceOnce(
  server,
  `  const readRows = history ? await prisma.$queryRawUnsafe('SELECT "notificationType","notificationId" FROM "StaffNotificationRead" WHERE "userId"=$1 AND "organizationId"=$2', session.userId, session.organizationId) : []`,
  `  const customerHrefPattern = /^\\/admin\\/customers\\/([^/?#]+)(?:[/?#]|$)/
  const eventCustomerIds = [...new Set(events.map(item => {
    const match = customerHrefPattern.exec(String(item.href || ''))
    if (!match || ['messages', 'new'].includes(match[1])) return null
    try { return decodeURIComponent(match[1]) } catch { return null }
  }).filter(Boolean))]
  const visibleCustomerRows = eventCustomerIds.length
    ? await prisma.$queryRawUnsafe('SELECT "id" FROM "Customer" WHERE "organizationId"=$1 AND "deletedAt" IS NULL AND "storeHiddenAt" IS NULL', session.organizationId)
    : []
  const visibleCustomerIds = new Set(visibleCustomerRows.map(item => item.id))
  const visibleEvents = events.filter(item => {
    const match = customerHrefPattern.exec(String(item.href || ''))
    if (!match || ['messages', 'new'].includes(match[1])) return true
    try { return visibleCustomerIds.has(decodeURIComponent(match[1])) } catch { return false }
  })
  const readRows = history ? await prisma.$queryRawUnsafe('SELECT "notificationType","notificationId" FROM "StaffNotificationRead" WHERE "userId"=$1 AND "organizationId"=$2', session.userId, session.organizationId) : []`,
  "visible event target resolution",
);

server = replaceOnce(
  server,
  `  const eventItems = events.map(item => ({ ...item, isUnread: !readKeys.has('event:' + item.id) }))`,
  `  const eventItems = visibleEvents.map(item => ({ ...item, isUnread: !readKeys.has('event:' + item.id) }))`,
  "visible event mapping",
);

server = replaceOnce(
  server,
  `: appointments.length + messageCount + events.length,`,
  `: appointmentItems.length + messageCount + eventItems.length,`,
  "notification count visibility",
);

server = replaceOnce(
  server,
  `eventCount: history ? eventItems.filter(item => item.isUnread).length : events.length,`,
  `eventCount: history ? eventItems.filter(item => item.isUnread).length : eventItems.length,`,
  "event count visibility",
);

fs.writeFileSync(serverPath, server);
fs.writeFileSync("/app/.notification-target-integrity-v434", "ok\n");
console.log("Notification target integrity v434 runtime patched");
