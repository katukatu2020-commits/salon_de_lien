import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const mode = process.argv[2] || 'verify'
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

const server = read('server.js')
const inquiries = read('business-inquiries-v637.js')

if (mode === 'snapshot') {
  assert.match(server, /X-Lien-Style-Admin-Local-Pagination', 'v650'/)
  assert.doesNotMatch(server, /X-Lien-Business-Application-Phone-Type/)
  assert.match(inquiries, /return !value \|\| \/\^\[0-9\+\(\)\\-\\s\]\{8,30\}\$\//)
  assert.match(inquiries, /type="tel" name="phone" maxlength="30" autocomplete="tel" inputmode="tel">/)
  assert.match(inquiries, /type="hidden" name="audience"/)
  console.log(JSON.stringify({ release: 'business-application-phone-type-v651', mode, parent: 'v650', ok: true }))
  process.exit(0)
}

assert.match(server, /X-Lien-Business-Application-Phone-Type', 'v651'/)
assert.match(server, /X-Lien-Style-Admin-Local-Pagination', 'v650'/)
assert.match(inquiries, /PUBLIC_APPLICATION_AUDIENCES = new Set\(\['salon', 'dealer'\]\)/)
assert.match(inquiries, /PUBLIC_APPLICATION_AUDIENCES\.has\(audience\)/)
assert.doesNotMatch(inquiries, /return !value \|\|/)
assert.match(inquiries, /<span>申請種別 <b>必須<\/b><\/span><select name="audience" required>/)
assert.match(inquiries, /option\('salon', safeAudience, 'サロン'\)/)
assert.match(inquiries, /option\('dealer', safeAudience, 'ディーラー'\)/)
assert.doesNotMatch(inquiries, /type="hidden" name="audience"/)
assert.match(inquiries, /name="phone" maxlength="30" autocomplete="tel" inputmode="tel" required>/)
assert.match(inquiries, /<b>必須<\/b><\/span><input type="tel"/)

console.log(JSON.stringify({ release: 'business-application-phone-type-v651', mode, phoneRequired: true, explicitApplicationType: true, historicalSchemaPreserved: true }))
