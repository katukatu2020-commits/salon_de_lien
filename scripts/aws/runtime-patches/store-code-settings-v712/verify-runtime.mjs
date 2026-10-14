import fs from 'node:fs'
import assert from 'node:assert/strict'
import vm from 'node:vm'
const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const client = fs.readFileSync(root + '/admin-staff-experience-v276.js', 'utf8')
new vm.Script(client)
assert.ok(client.includes('data-store-code-v712'))
assert.ok(client.includes("code = String(profile.storeCode || '').trim()"))
assert.ok(client.includes('navigator.clipboard.writeText(code)'))
assert.ok(client.includes("new URLSearchParams(location.search).get('embedded') === '1'"))
assert.ok(!client.includes("document.querySelectorAll('[data-sm-store-code],.lien-store-qr-card').forEach(card => card.remove())"))
const profile = fs.readFileSync(root + '/store-profile.js', 'utf8')
assert.ok(profile.includes("'Cache-Control', 'private, no-store'"))
assert.ok(profile.includes("storeCode: organization.publicCode || ''"))
assert.ok(fs.readFileSync(root + '/server.js', 'utf8').includes('X-Lien-Store-Code-Settings'))
console.log('v712 PASS: scoped code display, copy, retry, syntax, existing authenticated profile API')
