import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(process.argv[2] || '/app')
const files = {
  server: 'server.js',
  operations: 'appointment-operations-v267.js',
  shiftLegacy: '.next/static/chunks/app/admin/appointments/page-shift-layout-20260812-02.capacity-persist-v44.business-schedule-v127.shift-hydration-gate-v131.js',
  shiftCurrent: '.next/static/chunks/app/admin/appointments/page-shift-layout-20260812-02.capacity-persist-v44.business-schedule-v267.js',
  commercial: 'commercial-admin-v101.js',
  customer: 'customer-runtime-v267.js',
  layout: '.next/static/chunks/app/layout-sidebar-boundary-20260812-01.customertabs.sms-compliance-v1.admin-mobile-v38.staff-unified-v48.tenant-runtime-v267.js',
  appBuildManifest: '.next/app-build-manifest.json',
  appointmentClientManifest: '.next/server/app/admin/appointments/page_client-reference-manifest.js',
  settingsLoader: '.next/static/chunks/app/admin/settings/page-71d9fc25361d9e65.js',
  settingsClientManifest: '.next/server/app/admin/settings/page_client-reference-manifest.js',
}

const expectedHashes = {
  [files.server]: '54e8cf805a4da97bfd2dd1d14364e819875b45c139eaca5bc24579730aeb599d',
  [files.operations]: 'd4e0b9f450f82d238c95424c6858d7b2e03570cf842f49cec8602dd0c8211793',
  [files.shiftLegacy]: '9f7f37d2dbbb21d214c2d546bd25ff54ef45c46d14421994c7c62e5da33c07e6',
  [files.shiftCurrent]: '32497c0f349ccbd4bb9cdff164eb0f248f4bffd108081cca3b6978f413508923',
  [files.commercial]: '0e36f67dee2b91cd4640a078b16ab80d9bbac2d1edb4bfdb96231b31d1c800f7',
  [files.customer]: '42eeb01f6d4a3ca03df2498b3ca998900b32ac2574c7b549d67b639c104caff8',
  [files.layout]: '837ded3c3a23defc37a66908883c6e48df3e55190999d4467a2f4ebc438f0d09',
  [files.appBuildManifest]: '78e01772fdf169c1f2cf419dadb90df20aa21f5c14854115f41b371f69e936c0',
  [files.appointmentClientManifest]: '3850b176fdf8e33b8c5b3f1a9ce03cf6245c846680380216c7c96b5d0311dc8e',
  [files.settingsLoader]: 'c7119f9a30cdaa37971c73abdfb58685ad05d15196c48ec77b612157e131d403',
  [files.settingsClientManifest]: '9445b2533a97409131a706b0432e38b1527fadb05a551526e29af579bf021ef8',
}

function digest(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function readChecked(name) {
  const target = path.join(root, name)
  const source = fs.readFileSync(target, 'utf8')
  const actual = digest(source)
  if (actual !== expectedHashes[name]) {
    throw new Error(`Release 294 parent mismatch: ${name} expected ${expectedHashes[name]}, received ${actual}`)
  }
  return source
}

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before)
  if (first < 0) throw new Error(`Release 294 marker missing: ${label}`)
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`Release 294 marker is not unique: ${label}`)
  return source.slice(0, first) + after + source.slice(first + before.length)
}

function replaceExpected(source, before, after, expectedCount, label) {
  const actualCount = source.split(before).length - 1
  if (actualCount !== expectedCount) throw new Error(`Release 294 marker count mismatch: ${label} expected ${expectedCount}, received ${actualCount}`)
  return source.split(before).join(after)
}

function write(name, source) {
  fs.writeFileSync(path.join(root, name), source, 'utf8')
}

// Server: serve the bounded client helper, expose the active staff directory,
// and preserve unread state in history before marking the current view as read.
let server = readChecked(files.server)
server = replaceOnce(
  server,
  "      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)\n",
  "      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)\n      if (url.pathname === '/ui-workflows-v294.js' && req.method === 'GET') {\n        res.statusCode = 200\n        res.setHeader('Content-Type', 'application/javascript; charset=utf-8')\n        res.setHeader('Cache-Control', 'private, no-store')\n        res.setHeader('X-Content-Type-Options', 'nosniff')\n        res.end(fs.readFileSync(path.join(dir, 'ui-workflows-v294.js')))\n        return\n      }\n",
  'server runtime asset route',
)
server = replaceOnce(
  server,
  "    return json(res, 200, { threads, thread: thread || null, messages, staff: audience === 'customer' ? availableStaff : organizationStaff })",
  "    return json(res, 200, { threads, thread: thread || null, messages, staff: audience === 'customer' ? availableStaff : organizationStaff, directory: audience === 'customer' ? organizationStaff : undefined })",
  'customer chat staff directory',
)
server = replaceOnce(
  server,
  `? await prisma.$queryRawUnsafe('SELECT m."id",m."createdAt",LEFT(m."body",180) AS "body",t."id" AS "threadId",c."id" AS "customerId",c."name" AS "customerName" FROM "ChatMessage" m JOIN "ChatThread" t ON t."id"=m."threadId" JOIN "Customer" c ON c."id"=t."customerId" WHERE t."organizationId"=$1 AND c."deletedAt" IS NULL AND m."senderType"=\\'customer\\' ORDER BY m."createdAt" DESC LIMIT 100', session.organizationId)`,
  `? await prisma.$queryRawUnsafe('SELECT m."id",m."createdAt",LEFT(m."body",180) AS "body",t."id" AS "threadId",t."staffLastReadAt",c."id" AS "customerId",c."name" AS "customerName" FROM "ChatMessage" m JOIN "ChatThread" t ON t."id"=m."threadId" JOIN "Customer" c ON c."id"=t."customerId" WHERE t."organizationId"=$1 AND c."deletedAt" IS NULL AND m."senderType"=\\'customer\\' ORDER BY m."createdAt" DESC LIMIT 100', session.organizationId)`,
  'notification message read timestamp',
)
server = replaceOnce(
  server,
  `  const messageCount = await unreadChatCount(req, 'staff')\n  if (markRead) await prisma.$executeRawUnsafe`,
  `  const messageCount = await unreadChatCount(req, 'staff')\n  const appointmentItems = appointments.map(item => ({ ...item, isUnread: new Date(item.createdAt).getTime() > new Date(appointmentSince).getTime() }))\n  const messageItems = messages.map(item => ({ ...item, isUnread: !item.staffLastReadAt || new Date(item.createdAt).getTime() > new Date(item.staffLastReadAt).getTime() }))\n  const eventItems = events.map(item => ({ ...item, isUnread: new Date(item.createdAt).getTime() > new Date(eventSince).getTime() }))\n  if (markRead) await prisma.$executeRawUnsafe`,
  'notification unread projection',
)
server = replaceOnce(server, '    appointments,\n    messages,\n    events,', '    appointments: appointmentItems,\n    messages: messageItems,\n    events: eventItems,', 'notification history response')
write(files.server, server)

// Appointment service: retain 15-minute appointment starts, allow new 10-minute
// treatment durations, and keep existing 45-minute (5-minute divisible) menus valid.
let operations = readChecked(files.operations)
operations = replaceOnce(
  operations,
  "  if (!Number.isInteger(durationMinutes) || durationMinutes < 15 || durationMinutes > 540 || durationMinutes % 15 !== 0) {\n    throw new RequestError('施術時間は15分単位で指定してください。')\n  }",
  "  if (!Number.isInteger(durationMinutes) || durationMinutes < 10 || durationMinutes > 540 || durationMinutes % 5 !== 0) {\n    throw new RequestError('施術時間は10分単位で指定してください。')\n  }",
  'treatment duration validation',
)
write(files.operations, operations)

// Shift UI: only duration editing changes to 10 minutes. Appointment movement
// remains on the established 15-minute start-time grid.
function patchShift(name) {
  let shift = readChecked(name)
  shift = replaceOnce(shift, 'min: "15",\n                                      max: "540",\n                                      step: "15",', 'min: "10",\n                                      max: "540",\n                                      step: "10",', `${name} manual duration input`)
  shift = replaceOnce(shift, '})(r / O),\n            l = A.current.find', '})(r / O, "resize" === n.mode ? 10 : 15),\n            l = A.current.find', `${name} pointer duration snap`)
  shift = replaceOnce(shift, 'n.originDurationMinutes + i,\n              15,', 'n.originDurationMinutes + i,\n              10,', `${name} pointer duration minimum`)
  shift = replaceOnce(shift, 'i = Math.max(15, i - 15)', 'i = Math.max(10, i - 10)', `${name} keyboard duration decrease`)
  shift = replaceOnce(shift, 'i = Math.min(__businessClose - a, i + 15)', 'i = Math.min(__businessClose - a, i + 10)', `${name} keyboard duration increase`)
  shift = replaceOnce(shift, '予約をドラッグして移動、右端を引いて施術時間を変更できます。15分単位で保存されます。', '予約をドラッグして移動、右端を引いて施術時間を変更できます。施術時間は10分単位で保存されます。', `${name} duration help text`)
  write(name, shift)
}
patchShift(files.shiftLegacy)
patchShift(files.shiftCurrent)

// The current shift chunk has an immutable cache lifetime. Publish the patched
// bytes under a new filename and update the two parent manifests that reference
// it so existing browsers and CloudFront cannot reuse the release-293 asset.
const shiftV267Basename = path.basename(files.shiftCurrent)
const shiftV294Basename = shiftV267Basename.replace('business-schedule-v267.js', 'business-schedule-v294.js')
const shiftV294Path = path.join(path.dirname(files.shiftCurrent), shiftV294Basename)
fs.writeFileSync(path.join(root, shiftV294Path), fs.readFileSync(path.join(root, files.shiftCurrent), 'utf8'), 'utf8')
for (const [manifestName, expectedCount] of [[files.appBuildManifest, 1], [files.appointmentClientManifest, 7]]) {
  let manifest = readChecked(manifestName)
  manifest = replaceExpected(manifest, shiftV267Basename, shiftV294Basename, expectedCount, `${manifestName} shift cache bust`)
  write(manifestName, manifest)
}

// Embedded settings run in their own document. Give that document the same
// bounded helper and publish the loader under a fresh name so cached copies do
// not keep showing the store registration code in unrelated settings dialogs.
const settingsLoaderBasename = path.basename(files.settingsLoader)
const settingsLoaderV294Basename = settingsLoaderBasename.replace('.js', '.settings-dialog-v294.js')
const settingsLoaderV294Path = path.join(path.dirname(files.settingsLoader), settingsLoaderV294Basename)
let settingsLoader = readChecked(files.settingsLoader)
settingsLoader += `\n;(()=>{if(document.querySelector('script[data-lien-ui-workflows-v294]'))return;const script=document.createElement('script');script.src='/ui-workflows-v294.js?v=294-2';script.defer=true;script.dataset.lienUiWorkflowsV294='1';document.head.appendChild(script)})()\n`
write(settingsLoaderV294Path, settingsLoader)
let appManifestAfterShift = fs.readFileSync(path.join(root, files.appBuildManifest), 'utf8')
appManifestAfterShift = replaceExpected(appManifestAfterShift, settingsLoaderBasename, settingsLoaderV294Basename, 1, 'settings app manifest cache bust')
write(files.appBuildManifest, appManifestAfterShift)
let settingsClientManifest = readChecked(files.settingsClientManifest)
settingsClientManifest = replaceExpected(settingsClientManifest, settingsLoaderBasename, settingsLoaderV294Basename, 3, 'settings client manifest cache bust')
write(files.settingsClientManifest, settingsClientManifest)

// Notification history: preserve read state returned by the API, add an
// unread-only filter, and distinguish unread rows without an aggressive alert.
let commercial = readChecked(files.commercial)
commercial = replaceOnce(
  commercial,
  '.ca-notification-history-item:hover{border-color:var(--ca-primary,#8f4f42);transform:translateY(-1px);box-shadow:0 12px 28px rgba(61,43,36,.08)}',
  '.ca-notification-history-item:hover{border-color:var(--ca-primary,#8f4f42);transform:translateY(-1px);box-shadow:0 12px 28px rgba(61,43,36,.08)}.ca-notification-history-item.is-unread{border-color:#dfb8b1;background:#fffaf8;box-shadow:inset 3px 0 0 #a85b50,0 8px 24px rgba(61,43,36,.055)}.ca-notification-history-item.is-read{opacity:.82}.ca-notification-history-unread{display:inline-flex;align-items:center;gap:5px;border-radius:999px;background:#f5e1dc;padding:3px 8px;color:#8f4f42;font-size:10px;font-weight:800}.ca-notification-history-unread::before{width:6px;height:6px;border-radius:50%;background:#a85b50;content:""}',
  'notification row states css',
)
commercial = replaceOnce(commercial, 'href: `/admin/appointments/${encodeURIComponent(item.id)}` }))', 'href: `/admin/appointments/${encodeURIComponent(item.id)}`, isUnread: Boolean(item.isUnread) }))', 'appointment unread mapping')
commercial = replaceOnce(commercial, 'href: `/admin/customers/messages?chat=1&threadId=${encodeURIComponent(item.threadId || \'\')}` }))', 'href: `/admin/customers/messages?chat=1&threadId=${encodeURIComponent(item.threadId || \'\')}`, isUnread: Boolean(item.isUnread) }))', 'message unread mapping')
commercial = replaceOnce(commercial, "href: item.href || '/admin/appointments?notificationHistory=1' }))", "href: item.href || '/admin/appointments?notificationHistory=1', isUnread: Boolean(item.isUnread) }))", 'event unread mapping')
commercial = replaceOnce(commercial, "const visible = filter === 'all' ? items : items.filter(item => item.type === filter)", "const visible = filter === 'all' ? items : filter === 'unread' ? items.filter(item => item.isUnread) : items.filter(item => item.type === filter)", 'notification unread filter')
commercial = replaceOnce(commercial, 'class="ca-notification-history-item ${esc(item.type)}"', 'class="ca-notification-history-item ${esc(item.type)} ${item.isUnread ? \'is-unread\' : \'is-read\'}"', 'notification row class')
commercial = replaceOnce(commercial, '<span class="ca-notification-history-kind">${item.type ===', '${item.isUnread ? \'<span class="ca-notification-history-unread">未読</span>\' : \'\'}<span class="ca-notification-history-kind">${item.type ===', 'notification unread badge')
commercial = replaceOnce(commercial, 'data-ca-notification-filter="all">すべて</button>', 'data-ca-notification-filter="all">すべて</button><button class="ca-notification-history-tab" type="button" role="tab" aria-selected="false" data-ca-notification-filter="unread">未読のみ</button>', 'notification unread tab')
commercial += `\n;(()=>{if(document.querySelector('script[data-lien-ui-workflows-v294]'))return;const script=document.createElement('script');script.src='/ui-workflows-v294.js?v=294-2';script.defer=true;script.dataset.lienUiWorkflowsV294='1';document.head.appendChild(script)})()\n`
write(files.commercial, commercial)

let customer = readChecked(files.customer)
customer += `\n;(()=>{if(document.querySelector('script[data-lien-ui-workflows-v294]'))return;const script=document.createElement('script');script.src='/ui-workflows-v294.js?v=294-2';script.defer=true;script.dataset.lienUiWorkflowsV294='1';document.head.appendChild(script)})()\n`
write(files.customer, customer)

// Remove only the customer-chart SMS status injector. SMS verification APIs and
// customer registration controls remain untouched.
let layout = readChecked(files.layout)
const smsMarker = "  const label='SMS認証・同意状況'"
const smsIndex = layout.indexOf(smsMarker)
if (smsIndex < 0) throw new Error('Release 294 SMS panel marker missing')
const smsStart = layout.lastIndexOf(';(()=>{', smsIndex)
const smsEnd = layout.indexOf('\n\n;(()=>{', smsIndex)
if (smsStart < 0 || smsEnd < 0) throw new Error('Release 294 SMS panel boundary missing')
layout = layout.slice(0, smsStart) + layout.slice(smsEnd + 2)
write(files.layout, layout)

console.log('Release 294 runtime patch applied.')
