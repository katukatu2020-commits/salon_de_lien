import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const source = fs.readFileSync(`${root}/admin-staff-experience-v276.js`, 'utf8')
const updater = source.slice(
  source.indexOf('/* staff-avatar-stability-v463'),
  source.indexOf('\n\n  function staffCard', source.indexOf('/* staff-avatar-stability-v463')),
)

assert.ok(updater.includes("source.searchParams.set('audience', 'staff')"))
assert.equal((updater.match(/Date\.now\(\)/g) || []).length, 0)
assert.equal((updater.match(/image\.src = target/g) || []).length, 1)
assert.ok(updater.includes("image.getAttribute('src') !== target"))

console.log('staff avatar stability v463 tests passed')
