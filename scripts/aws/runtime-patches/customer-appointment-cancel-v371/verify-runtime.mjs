import fs from 'node:fs'

function assertIncludes(source, marker, label) {
  if (!source.includes(marker)) throw new Error(`${label}: missing ${marker}`)
}

const client = fs.readFileSync('/app/public/customer-appointment-cancel-v371.js', 'utf8')
for (const marker of [
  '__lienCustomerAppointmentCancelV371',
  'lienCancelEnhanced',
  '.lien-cancel-v362__detail-button',
  '.lien-cancel-v370__button',
  '予約の詳細・キャンセル',
  '予約をキャンセルする',
]) assertIncludes(client, marker, 'customer cancellation client')
new Function(client)

const layout = fs.readFileSync('/app/.next/static/chunks/app/u/(account)/layout-customer-stability-v371.js', 'utf8')
assertIncludes(layout, '/customer-appointment-cancel-v371.js', 'customer layout loader')
if (layout.includes('/customer-appointment-cancel-v370.js')) throw new Error('legacy v370 cancellation loader remains')

const buildManifest = fs.readFileSync('/app/.next/app-build-manifest.json', 'utf8')
assertIncludes(buildManifest, 'layout-customer-stability-v371.js', 'app build manifest')

console.log('customer appointment cancellation v371 verified')
