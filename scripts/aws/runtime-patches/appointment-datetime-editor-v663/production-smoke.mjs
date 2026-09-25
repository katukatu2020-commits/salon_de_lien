import assert from 'node:assert/strict'

const base = String(process.env.VERIFY_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')

const health = await fetch(`${base}/api/health/ready`, { cache: 'no-store' })
assert.equal(health.status, 200)
assert.equal(health.headers.get('x-lien-appointment-datetime-editor'), 'v663')
assert.equal(health.headers.get('x-lien-shift-customer-search'), 'v662')

const asset = await fetch(`${base}/staff-breaks-checkout-menu-client-v442.js?v=663-appointment-datetime1`, { cache: 'no-store' })
assert.equal(asset.status, 200)
const source = await asset.text()
assert.match(source, /__orimiaAppointmentDatetimeEditorV663/)
assert.match(source, /data-orimia-appointment-datetime-trigger-v663/)
assert.match(source, /\/api\/admin\/appointments\/\$\{encodeURIComponent\(id\)\}\/schedule/)
assert.match(source, /appointment-datetime-editor-v663/)

console.log(JSON.stringify({ release: 'appointment-datetime-editor-v663', productionSmokeVerified: true }))
