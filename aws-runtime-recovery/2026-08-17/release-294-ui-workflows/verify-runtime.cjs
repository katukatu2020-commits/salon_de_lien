'use strict'

const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(process.argv[2] || '/app')
const files = {
  server: 'server.js',
  operations: 'appointment-operations-v267.js',
  shiftLegacy: '.next/static/chunks/app/admin/appointments/page-shift-layout-20260812-02.capacity-persist-v44.business-schedule-v127.shift-hydration-gate-v131.js',
  shiftCurrent: '.next/static/chunks/app/admin/appointments/page-shift-layout-20260812-02.capacity-persist-v44.business-schedule-v267.js',
  commercial: 'commercial-admin-v101.js',
  customer: 'customer-runtime-v267.js',
  layout: '.next/static/chunks/app/layout-sidebar-boundary-20260812-01.customertabs.sms-compliance-v1.admin-mobile-v38.staff-unified-v48.tenant-runtime-v267.js',
  ui: 'ui-workflows-v294.js',
  appBuildManifest: '.next/app-build-manifest.json',
  appointmentClientManifest: '.next/server/app/admin/appointments/page_client-reference-manifest.js',
  shiftCacheBusted: '.next/static/chunks/app/admin/appointments/page-shift-layout-20260812-02.capacity-persist-v44.business-schedule-v294.js',
  settingsCacheBusted: '.next/static/chunks/app/admin/settings/page-71d9fc25361d9e65.settings-dialog-v294.js',
  settingsClientManifest: '.next/server/app/admin/settings/page_client-reference-manifest.js',
}

function read(name) {
  return fs.readFileSync(path.join(root, name), 'utf8')
}

function requireMarkers(name, markers) {
  const source = read(name)
  for (const marker of markers) {
    if (!source.includes(marker)) throw new Error(`Release 294 verification failed: ${name} missing ${marker}`)
  }
  return source
}

const server = requireMarkers(files.server, [
  "url.pathname === '/ui-workflows-v294.js'",
  "directory: audience === 'customer' ? organizationStaff : undefined",
  'staffLastReadAt',
  'appointments: appointmentItems',
  'isUnread:',
])
const operations = requireMarkers(files.operations, [
  'durationMinutes < 10',
  'durationMinutes % 5 !== 0',
  '施術時間は10分単位で指定してください。',
])
function verifyShift(name) {
  return requireMarkers(name, [
    'min: "10"',
    'step: "10"',
    '"resize" === n.mode ? 10 : 15',
    'Math.max(10, i - 10)',
    'i + 10',
    '施術時間は10分単位で保存されます。',
  ])
}
const shiftLegacy = verifyShift(files.shiftLegacy)
const shiftCurrent = verifyShift(files.shiftCurrent)
const shiftCacheBusted = verifyShift(files.shiftCacheBusted)
const appBuildManifest = requireMarkers(files.appBuildManifest, ['business-schedule-v294.js', 'settings-dialog-v294.js'])
const appointmentClientManifest = requireMarkers(files.appointmentClientManifest, ['business-schedule-v294.js'])
const settingsCacheBusted = requireMarkers(files.settingsCacheBusted, ['/ui-workflows-v294.js?v=294-2'])
const settingsClientManifest = requireMarkers(files.settingsClientManifest, ['settings-dialog-v294.js'])
const commercial = requireMarkers(files.commercial, [
  'data-ca-notification-filter="unread"',
  'ca-notification-history-unread',
  "item.isUnread ? 'is-unread' : 'is-read'",
  '/ui-workflows-v294.js?v=294-2',
])
const customer = requireMarkers(files.customer, ['/ui-workflows-v294.js?v=294-2'])
const layout = read(files.layout)
if (layout.includes('SMS認証・同意状況')) throw new Error('Release 294 verification failed: SMS panel injector still exists')
const ui = requireMarkers(files.ui, [
  'window.__lienUiWorkflowsV294',
  'data-chat-staff-list',
  '会話を選択してください',
  'トークを始めましょう',
  "location.pathname === '/admin/products'",
  "location.pathname === '/admin/settings'",
  "text !== '店舗識別コード' && text !== '店舗登録用QRコード'",
])

for (const [name, source] of Object.entries({ server, operations, shiftLegacy, shiftCurrent, shiftCacheBusted, settingsCacheBusted, commercial, customer, layout, ui, appointmentClientManifest, settingsClientManifest })) {
  try { new Function(source) }
  catch (error) { throw new Error(`Release 294 JavaScript syntax failed for ${name}: ${error.message}`) }
}
JSON.parse(appBuildManifest)

console.log('Release 294 runtime verification passed.')
