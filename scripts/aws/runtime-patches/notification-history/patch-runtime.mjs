import fs from "node:fs";
import path from "node:path";

const root = process.env.RUNTIME_ROOT || "/app";
const serverPath = path.join(root, "server.js");
const clientPath = path.join(root, "commercial-admin-v101.js");
const storeProfilePath = path.join(root, "store-profile.js");

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`${label}: patch anchor was not found`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`${label}: patch anchor is not unique`);
  }
  return source.slice(0, first) + after + source.slice(first + before.length);
}

function replaceRange(source, start, end, replacement, label) {
  const from = source.indexOf(start);
  if (from < 0) throw new Error(`${label}: start anchor was not found`);
  const to = source.indexOf(end, from + start.length);
  if (to < 0) throw new Error(`${label}: end anchor was not found`);
  return source.slice(0, from) + replacement + source.slice(to);
}

let server = fs.readFileSync(serverPath, "utf8");
let client = fs.readFileSync(clientPath, "utf8");
let storeProfile = fs.readFileSync(storeProfilePath, "utf8");

server = replaceRange(
  server,
  "async function staffNotifications(req, res, markRead = false) {",
  "async function handleWithChatLink(handle, req, res, audience) {",
  `async function staffNotifications(req, res, options = {}) {
  const markRead = Boolean(options.markRead)
  const history = Boolean(options.history)
  const session = await chatSession(req, 'staff')
  if (!session) return json(res, 401, { error: 'ログインが必要です。' })
  await ensureLienEnhancementTables()
  const notificationState = (await prisma.$queryRawUnsafe('SELECT * FROM "StaffNotificationState" WHERE "userId"=$1 LIMIT 1', session.userId))[0]
  const since = notificationState?.appointmentsReadAt || new Date(0)
  const appointments = history
    ? await prisma.$queryRawUnsafe('SELECT a."id",a."createdAt",a."scheduledAt",a."menu",a."status",c."name" AS "customerName" FROM "Appointment" a JOIN "Customer" c ON c."id"=a."customerId" WHERE c."organizationId"=$1 AND c."deletedAt" IS NULL ORDER BY a."createdAt" DESC LIMIT 100', session.organizationId)
    : await prisma.$queryRawUnsafe('SELECT a."id",a."createdAt",a."scheduledAt",a."menu",a."status",c."name" AS "customerName" FROM "Appointment" a JOIN "Customer" c ON c."id"=a."customerId" WHERE c."organizationId"=$1 AND c."deletedAt" IS NULL AND a."createdAt">$2 ORDER BY a."createdAt" DESC LIMIT 30', session.organizationId, since)
  const messages = history
    ? await prisma.$queryRawUnsafe('SELECT m."id",m."createdAt",LEFT(m."body",180) AS "body",t."id" AS "threadId",c."id" AS "customerId",c."name" AS "customerName" FROM "ChatMessage" m JOIN "ChatThread" t ON t."id"=m."threadId" JOIN "Customer" c ON c."id"=t."customerId" WHERE t."organizationId"=$1 AND c."deletedAt" IS NULL AND m."senderType"=\\'customer\\' ORDER BY m."createdAt" DESC LIMIT 100', session.organizationId)
    : []
  const messageCount = await unreadChatCount(req, 'staff')
  if (markRead) await prisma.$executeRawUnsafe('INSERT INTO "StaffNotificationState" ("userId","organizationId","appointmentsReadAt","updatedAt") VALUES ($1,$2,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("userId") DO UPDATE SET "appointmentsReadAt"=CURRENT_TIMESTAMP,"updatedAt"=CURRENT_TIMESTAMP', session.userId, session.organizationId)
  return json(res, 200, {
    count: history ? appointments.length + messages.length : appointments.length + messageCount,
    appointmentCount: appointments.length,
    messageCount,
    appointments,
    messages,
    readAt: notificationState?.appointmentsReadAt || null,
  })
}

`,
  "staff notification API"
);

server = replaceOnce(
  server,
  "if (url.pathname === '/api/lien-staff-notifications') return await staffNotifications(req, res, url.searchParams.get('read') === '1')",
  "if (url.pathname === '/api/lien-staff-notifications') return await staffNotifications(req, res, { markRead: url.searchParams.get('read') === '1', history: url.searchParams.get('history') === '1' })",
  "staff notification route"
);

server = replaceRange(
  server,
  "      if (url.pathname === '/admin/notifications') {",
  "      if (url.pathname === '/admin/chat') {",
  `      if (url.pathname === '/admin/notifications') {
        const session = await chatSession(req, 'staff')
        if (!session) { res.statusCode = 302; res.setHeader('Location', '/admin/login'); return res.end() }
        res.statusCode = 302
        res.setHeader('Location', '/admin/appointments?notificationHistory=1')
        res.setHeader('Cache-Control', 'no-store')
        return res.end()
      }
`,
  "notification history page route"
);

client = replaceRange(
  client,
  "  async function toggleNotificationPanel(button) {",
  "  function toggleStoreMenu(button) {",
  `  async function toggleNotificationPanel(button) {
    if (!button?.isConnected) return
    window.location.assign('/admin/notifications')
  }

`,
  "notification bell navigation"
);

const historyClient = fs.readFileSync(
  process.env.NOTIFICATION_HISTORY_CLIENT || "/tmp/notification-history-client.js",
  "utf8"
);

client = replaceOnce(
  client,
  "  function enhance() {",
  historyClient + "  function enhance() {",
  "notification history client"
);

client = replaceOnce(
  client,
  "enhanceMenuPage(); enhanceSettingsPage(); enhanceAccountTheme(); enhanceContextSettings()",
  "enhanceMenuPage(); enhanceSettingsPage(); enhanceAccountTheme(); enhanceContextSettings(); enhanceNotificationHistoryPage()",
  "notification history boot"
);

storeProfile = replaceOnce(
  storeProfile,
  "res.setHeader('Cache-Control', 'public, max-age=300')",
  "res.setHeader('Cache-Control', 'private, no-store')",
  "commercial admin cache policy"
);

fs.writeFileSync(serverPath, server, "utf8");
fs.writeFileSync(clientPath, client, "utf8");
fs.writeFileSync(storeProfilePath, storeProfile, "utf8");
console.log(JSON.stringify({ patched: true, serverPath, clientPath, storeProfilePath }));
