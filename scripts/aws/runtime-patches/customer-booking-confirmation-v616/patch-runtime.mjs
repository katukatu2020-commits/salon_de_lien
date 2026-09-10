import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const marker = 'customer-booking-confirmation-v616'
const here = path.dirname(fileURLToPath(import.meta.url))
const changes = []

function replaceExact(file, before, after, expected, label) {
  const target = path.join(root, file)
  const source = fs.readFileSync(target, 'utf8')
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  fs.writeFileSync(target, source.split(before).join(after))
  changes.push({ kind: 'replace', file, before, after, count })
}

function addFile(sourceName, targetName) {
  const target = path.join(root, targetName)
  if (fs.existsSync(target)) throw new Error(`${targetName}: target already exists`)
  fs.copyFileSync(path.join(here, sourceName), target)
  changes.push({ kind: 'add', file: targetName })
}

addFile('customer-booking-confirmation-v616.js', 'public/customer-booking-confirmation-v616.js')
addFile('customer-booking-coupon-v616.js', 'customer-booking-coupon-v616.js')
addFile('customer-appointment-cancellation-v616.js', 'customer-appointment-cancellation-v616.js')

replaceExact(
  'server.js',
  "const { createCustomerAppointmentCancellationService } = require('./customer-appointment-cancellation-v362') /* customer-appointment-cancellation-v362-require */",
  "const { createCustomerAppointmentCancellationService } = require('./customer-appointment-cancellation-v616') /* customer-appointment-cancellation-v616-require */",
  1,
  'customer cancellation service upgrade',
)
replaceExact(
  'server.js',
  "const { createCustomerBookingCouponService } = require('./customer-booking-coupon-v366') /* customer-booking-coupon-v366-require */",
  "const { createCustomerBookingCouponService } = require('./customer-booking-coupon-v616') /* customer-booking-coupon-v616-require */",
  1,
  'customer coupon service upgrade',
)

const customerRouteAnchor = '  if (!customerRoute) return output'
replaceExact(
  'server.js',
  customerRouteAnchor,
  `${customerRouteAnchor}\n  if (pathname === '/u/appointments' && !output.includes('customer-booking-confirmation-v616')) {\n    output = output.replace('</head>', '<script id="customer-booking-confirmation-v616" src="/customer-booking-confirmation-v616.js?v=616-release1" defer></script></head>')\n  } /* ${marker}-assets */`,
  1,
  'customer booking confirmation assets',
)

const readinessAnchor = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Style-Publisher-Comments', 'v615') /* style-publisher-comments-v615-ready */"
replaceExact(
  'server.js',
  readinessAnchor,
  `${readinessAnchor}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Booking-Confirmation', 'v616') /* ${marker}-ready */`,
  1,
  'customer booking confirmation readiness header',
)

const appointmentServerPage = '.next/server/app/u/(account)/appointments/page.js'
const appointmentAttributeBefore = '"data-customer-appointment-id":e.id,className:'
const appointmentAttributeAfter = '"data-customer-appointment-id":e.id,"data-customer-appointment-at":e.scheduledAt,className:'
replaceExact(
  appointmentServerPage,
  appointmentAttributeBefore,
  appointmentAttributeAfter,
  1,
  'server-rendered appointment cancellation date',
)

const appointmentStaticDirectory = path.join(root, '.next/static/chunks/app/u/(account)/appointments')
const activeAppointmentChunks = fs.readdirSync(appointmentStaticDirectory)
  .filter(name => name.endsWith('.current-cancel-v374.js'))
if (activeAppointmentChunks.length !== 1) {
  throw new Error(`${marker}: expected one active appointment client chunk, found ${activeAppointmentChunks.length}`)
}
const appointmentClientPage = path.join('.next/static/chunks/app/u/(account)/appointments', activeAppointmentChunks[0])
replaceExact(
  appointmentClientPage,
  appointmentAttributeBefore,
  appointmentAttributeAfter,
  1,
  'hydrated appointment cancellation date',
)

fs.writeFileSync('/tmp/customer-booking-confirmation-v616-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({
  release: marker,
  modified: [...new Set(changes.filter(change => change.kind === 'replace').map(change => change.file))],
  added: changes.filter(change => change.kind === 'add').map(change => change.file),
}))
