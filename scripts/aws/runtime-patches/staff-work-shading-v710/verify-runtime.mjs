import assert from 'node:assert/strict'
import fs from 'node:fs'
const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const read = file => fs.readFileSync(root + '/' + file, 'utf8')
for (const file of ['.next/static/chunks/app/admin/appointments/page-staff-work-shading-v710.js', '.next/server/app/admin/appointments/page.js']) {
  const code = read(file)
  assert.match(code, /function workTimeShading/)
  assert.match(code, /"data-work-shade": "before"/)
  assert.match(code, /"data-work-shade": "after"/)
  assert.match(code, /backgroundColor: "#e2e4e7"/)
  assert.match(code, /workTimeShading\(e,__businessOpen,__businessClose,__businessSchedule.isClosed\).before/)
  assert.match(code, /workTimeShading\(e,__businessOpen,__businessClose,__businessSchedule.isClosed\).after/)
}
assert.match(read('.next/server/app/admin/appointments/page.js'), /rowsForDate\(v\._, x.organizationId, P \|\| N \+ "-01"\)/)
for (const manifest of ['.next/app-build-manifest.json', '.next/server/app/admin/appointments/page_client-reference-manifest.js']) {
  assert.match(read(manifest), /page-staff-work-shading-v710.js/)
  assert.doesNotMatch(read(manifest), /page-checkout-shift-v700.capacity-v705.js/)
}
assert.match(read('server.js'), /X-Lien-Staff-Work-Shading/)
console.log('v710 runtime PASS: active client/server shading, holiday bounds, daily schedule resolver and chunk manifests')
