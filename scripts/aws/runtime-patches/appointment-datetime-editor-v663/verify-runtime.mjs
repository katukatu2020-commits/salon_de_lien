import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const snapshot = process.argv.includes('snapshot')
const client = fs.readFileSync(path.join(root, 'staff-breaks-checkout-menu-client-v442.js'), 'utf8')
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')

assert.match(client, /shift-customer-search-v662/)
assert.match(server, /X-Lien-Shift-Customer-Search[^\n]+v662/)

if (snapshot) {
  assert.doesNotMatch(client, /appointment-datetime-editor-v663/)
  assert.doesNotMatch(server, /X-Lien-Appointment-Datetime-Editor/)
  console.log(JSON.stringify({ release: 'appointment-datetime-editor-v663', snapshotVerified: true }))
  process.exit(0)
}

assert.equal(client.split('/* appointment-datetime-editor-v663 */').length - 1, 1)
assert.match(client, /__orimiaAppointmentDatetimeEditorV663/)
assert.match(client, /data-orimia-appointment-datetime-trigger-v663/)
assert.match(client, /\/api\/admin\/appointments\/\$\{encodeURIComponent\(id\)\}\/schedule/)
assert.match(client, /durationMinutes,/)
assert.match(client, /staffName,/)
assert.match(client, /minutes % 15/)
assert.match(client, /addEventListener\('pointerdown'/)
assert.match(client, /trigger\.hidden = true/)
assert.match(client, /受付時間やほかの予約と重なる場合は保存できません/)
assert.match(server, /X-Lien-Appointment-Datetime-Editor', 'v663'/)
assert.equal(server.split('/* appointment-datetime-editor-v663 */').length - 1, 1)

console.log(JSON.stringify({ release: 'appointment-datetime-editor-v663', runtimeVerified: true }))
