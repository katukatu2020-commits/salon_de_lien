import fs from 'node:fs'

function assertIncludes(source, marker, label) {
  if (!source.includes(marker)) throw new Error(`${label}: missing ${marker}`)
}

const server = fs.readFileSync('/app/server.js', 'utf8')
assertIncludes(server, '?detail=${encodeURIComponent(data.appointment.id)}#current-reservations', 'customer home detail route')
assertIncludes(server, 'createCustomerAppointmentCancellationService', 'customer cancellation API service')
const cancellationService = fs.readFileSync('/app/customer-appointment-cancellation-v362.js', 'utf8')
assertIncludes(cancellationService, "'/api/lien-customer-appointment-cancel'", 'customer cancellation API route')
assertIncludes(cancellationService, 'StaffSystemNotification', 'store cancellation notification')

const client = fs.readFileSync('/app/public/customer-appointment-cancel-v370.js', 'utf8')
for (const marker of [
  '__lienCustomerAppointmentCancelV370',
  '予約の詳細・キャンセル',
  '予約をキャンセルする',
  '/api/lien-customer-appointment-cancel',
  'data-customer-appointment-id',
]) assertIncludes(client, marker, 'customer cancellation client')
new Function(client)

const layout = fs.readFileSync('/app/.next/static/chunks/app/u/(account)/layout-customer-stability-v370.js', 'utf8')
assertIncludes(layout, '/customer-appointment-cancel-v370.js', 'customer layout loader')
assertIncludes(layout, "location.pathname!=='/u/appointments'", 'customer appointment route guard')

const buildManifest = fs.readFileSync('/app/.next/app-build-manifest.json', 'utf8')
assertIncludes(buildManifest, 'layout-customer-stability-v370.js', 'app build manifest')

console.log('customer appointment cancellation v370 verified')
