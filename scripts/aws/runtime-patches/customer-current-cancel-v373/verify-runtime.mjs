import fs from 'node:fs'

function requireMarkers(file, markers) {
  const source = fs.readFileSync(file, 'utf8')
  for (const marker of markers) {
    if (!source.includes(marker)) throw new Error(`${file}: missing ${marker}`)
  }
  return source
}

const client = requireMarkers('/app/public/customer-current-cancel-v373.js', [
  '__lienCustomerCurrentCancelV373',
  '予約をキャンセル',
  '/api/lien-customer-appointment-cancel',
  'data-customer-appointment-id',
  'lien-current-cancel-v373__button',
])
new Function(client)

const layout = requireMarkers('/app/.next/static/chunks/app/u/(account)/layout-customer-stability-v373.js', [
  '/customer-current-cancel-v373.js',
  'data-lien-customer-current-cancel-v373',
  'new MutationObserver(ensure)',
])
new Function(layout)

for (const file of [
  '/app/.next/app-build-manifest.json',
  '/app/.next/server/app/u/(account)/appointments/page_client-reference-manifest.js',
]) requireMarkers(file, ['layout-customer-stability-v373.js'])

const service = requireMarkers('/app/customer-appointment-cancellation-v362.js', [
  '/api/lien-customer-appointment-cancel',
  'StaffSystemNotification',
])
new Function('require', 'module', 'exports', service)

console.log('customer current reservation cancellation v373 verified')
