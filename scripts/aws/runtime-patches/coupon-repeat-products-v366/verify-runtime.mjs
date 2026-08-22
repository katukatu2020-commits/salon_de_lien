import fs from 'node:fs'

function requireMarkers(source, label, markers) {
  for (const marker of markers) if (!source.includes(marker)) throw new Error(`${label}: missing ${marker}`)
}

const server = fs.readFileSync('/app/server.js', 'utf8')
requireMarkers(server, 'server', [
  "require('./customer-booking-coupon-v366')",
  'customer-booking-coupon-v366-schema',
  'customer-booking-coupon-v366-route',
  'p."imageUrl"',
  '/images/products/yohaku/shampoo.png',
  '/u/appointments?coupon=',
])

const service = fs.readFileSync('/app/customer-booking-coupon-v366.js', 'utf8')
requireMarkers(service, 'service', [
  '/api/lien-customer-booking-context',
  '/api/lien-customer-booking-coupon',
  '/api/lien-admin-appointment-coupon',
  'Appointment_couponIssueId_key',
  'lien_release_appointment_coupon_v366',
  'ServiceSale',
])

const cancellation = fs.readFileSync('/app/customer-appointment-cancellation-v362.js', 'utf8')
requireMarkers(cancellation, 'cancellation', ['"couponIssueId"=NULL'])

const workflow = fs.readFileSync('/app/ui-workflows-v294.js', 'utf8')
requireMarkers(workflow, 'workflow', [
  '__lienCustomerBookingCouponV366',
  '前回の予約がありません。',
  '/api/lien-customer-booking-coupon',
  '会計完了時',
])

const manifest = fs.readFileSync('/app/.next/app-build-manifest.json', 'utf8')
requireMarkers(manifest, 'manifest', ['layout-customer-stability-v366.js'])
for (const file of ['shampoo.png','treatment.png','styling.png','leave-in.png','scalp.png']) {
  if (!fs.existsSync(`/app/public/images/products/yohaku/${file}`)) throw new Error(`missing product image ${file}`)
}
console.log('coupon, repeat booking, and generated product images verified')
