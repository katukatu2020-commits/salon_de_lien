import fs from "node:fs";

const server = fs.readFileSync("/app/server.js", "utf8");

const required = [
  '"storeHiddenAt" IS NULL AND "createdAt">NOW()',
  '"storeHiddenAt" IS NULL GROUP BY 1,2 HAVING COUNT(*)>1',
  'c."storeHiddenAt" IS NULL AND COALESCE(a."source"',
  'c."storeHiddenAt" IS NULL AND m."senderType"',
  "const customerHrefPattern = /^\\/admin\\/customers",
  "const visibleEvents = events.filter",
  "const eventItems = visibleEvents.map",
  "appointmentItems.length + messageCount + eventItems.length",
  "eventItems.filter(item => item.isUnread).length : eventItems.length",
];

for (const marker of required) {
  if (!server.includes(marker)) throw new Error(`missing notification target integrity marker: ${marker}`);
}

const forbidden = [
  `FROM "Customer" WHERE "organizationId"=$1 AND "deletedAt" IS NULL AND "createdAt">NOW()-INTERVAL \'7 days\'`,
  `const eventItems = events.map(item => ({ ...item, isUnread: !readKeys.has('event:' + item.id) }))`,
  `: appointments.length + messageCount + events.length,`,
  `: events.length,`,
];

for (const marker of forbidden) {
  if (server.includes(marker)) throw new Error(`legacy notification visibility logic remains: ${marker}`);
}

if (!fs.existsSync("/app/.customer-photo-resilience-v433-count")) {
  throw new Error("v433 customer-detail resilience parent marker is missing");
}

console.log("Notification target integrity v434 verification passed");
