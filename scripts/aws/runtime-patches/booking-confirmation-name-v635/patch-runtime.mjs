import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const marker = 'booking-confirmation-name-v635'
const appointmentPage = '.next/server/app/admin/appointments/page.js'
const changes = []

function replaceExact(file, before, after, expected, label) {
  const target = path.join(root, file)
  const source = fs.readFileSync(target, 'utf8')
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  fs.writeFileSync(target, source.split(before).join(after))
  changes.push({ file, label, count })
}

const operationHistoryName = `                                            className:
                                              "mt-2 inline-block font-semibold text-[color:var(--lien-primary-dark)] hover:underline",
                                            children: e.customer.name,`

replaceExact(
  appointmentPage,
  operationHistoryName,
  `                                            className:
                                              "mt-2 inline-block font-semibold text-[color:var(--lien-primary-dark)] hover:underline",
                                            "data-booking-confirmation-name-v635":
                                              "予約登録" === e.purpose && "予約確定" === e.outcome
                                                ? "customer-name-only"
                                                : void 0,
                                            children:
                                              "予約登録" === e.purpose && "予約確定" === e.outcome
                                                ? require("/app/booking-confirmation-name-v635.js").displayBookingConfirmationNameV635(e.customer.name)
                                                : e.customer.name,`,
  1,
  'render confirmed booking history with the customer name only',
)

const readinessAnchor = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Style-Demo-Ordering', 'v634') /* style-demo-ordering-v634-ready */"
replaceExact(
  'server.js',
  readinessAnchor,
  `${readinessAnchor}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Booking-Confirmation-Name', 'v635') /* ${marker}-ready */`,
  1,
  'booking confirmation name readiness marker',
)

fs.writeFileSync('/tmp/booking-confirmation-name-v635-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({ release: marker, modified: [...new Set(changes.map(change => change.file))] }))
