import fs from 'node:fs'
import path from 'node:path'

function requireMarkers(source, label, markers) {
  for (const marker of markers) {
    if (!source.includes(marker)) throw new Error(`${label}: missing ${marker}`)
  }
}

const server = fs.readFileSync('/app/server.js', 'utf8')
requireMarkers(server, 'server', [
  "require('./customer-appointment-cancellation-v362')",
  'customer-appointment-cancellation-v362-service',
  'customer-appointment-cancellation-v362-route',
])

const service = fs.readFileSync('/app/customer-appointment-cancellation-v362.js', 'utf8')
requireMarkers(service, 'cancellation service', [
  '/api/lien-customer-appointment-cancel',
  'session.customerId',
  'session.organizationId',
  "'キャンセル'",
  'StaffSystemNotification',
  'ContactLog',
])

const workflow = fs.readFileSync('/app/ui-workflows-v294.js', 'utf8')
requireMarkers(workflow, 'customer workflow', [
  '__lienCustomerAppointmentCancelV362',
  'data-customer-appointment-id',
  '/api/lien-customer-appointment-cancel',
  '.lien-chat-v294__message-row.mine{align-self:flex-end;flex-direction:row-reverse}',
  '.lien-chat-v294__message-row.mine .lien-chat-v294__message{border-radius:17px 17px 5px 17px',
])
if (workflow.includes('.lien-chat-v294__message-row.mine{align-self:flex-start;flex-direction:row}')) {
  throw new Error('legacy reversed customer chat side remains')
}

const appointmentServerPath = '/app/.next/server/app/u/(account)/appointments/page.js'
const staticDirectory = '/app/.next/static/chunks/app/u/(account)/appointments'
const appointmentClientPath = path.join(staticDirectory, fs.readdirSync(staticDirectory).find(name => name.endsWith('.js')))
for (const target of [appointmentServerPath, appointmentClientPath]) {
  const source = fs.readFileSync(target, 'utf8')
  requireMarkers(source, target, ['"data-customer-appointment-id":e.id'])
}

const home = fs.readFileSync('/app/.next/server/app/u/(account)/home/page.js', 'utf8')
requireMarkers(home, 'customer home', ['"data-customer-next-appointment-id":j.id'])

const customerLayout = fs.readFileSync(
  '/app/.next/static/chunks/app/u/(account)/layout-customer-stability-v362.js',
  'utf8',
)
requireMarkers(customerLayout, 'customer layout cache key', ['ui-workflows-v294.js?v=362'])
if (customerLayout.includes('ui-workflows-v294.js?v=296-1')) {
  throw new Error('legacy customer workflow cache key remains')
}
const appBuildManifest = fs.readFileSync('/app/.next/app-build-manifest.json', 'utf8')
requireMarkers(appBuildManifest, 'app build manifest', ['layout-customer-stability-v362.js'])
if (appBuildManifest.includes('layout-customer-stability-v298.js')) {
  throw new Error('legacy customer layout chunk remains in app build manifest')
}

console.log('customer appointment cancellation and chat side verified')
