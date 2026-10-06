import assert from 'node:assert/strict'
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
for (const file of ['staff-breaks-checkout-menu-client-v442.js', 'public/appointment-datetime-v684.js']) {
  execFileSync(process.execPath, ['--check', '/app/' + file])
  const source = fs.readFileSync('/app/' + file, 'utf8')
  assert.ok(source.includes('__lienStaffBreakDragV702'))
  assert.ok(source.includes("for (const edge of ['start', 'end'])"))
  assert.ok(source.includes('data-checkout-service-item'), 'Keep v701 checkout editor')
  const controller = source.slice(source.indexOf('/* shift-line-break-interaction-v461 */'), source.indexOf('  function setHidden('))
  assert.ok(controller.includes('updateBlock(block, preview, preview.lane)'))
  assert.ok(!controller.includes('location.reload()'), 'Drag save must not reload')
  assert.ok(source.includes('if (state.scheduleTimer) return'), 'Continuous DOM mutations must not starve handle binding')
}
assert.ok(fs.readFileSync('/app/server.js', 'utf8').includes("'X-Lien-Staff-Break-Drag', 'v702'"))
execFileSync(process.execPath, ['--test', '/tmp/lien-v702/runtime-tests.cjs'], { stdio: 'inherit' })
console.log('PASS v702 runtime: drag/resize controllers, existing APIs, permissions and overlap guards')
