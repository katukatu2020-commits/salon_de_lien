import fs from 'node:fs'
import { spawnSync } from 'node:child_process'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const cropRuntimePath = `${root}/customer-link-ui-v293.js`
const staffRuntimePath = `${root}/admin-staff-experience-v276.js`
const cropRuntime = fs.readFileSync(cropRuntimePath, 'utf8')
const staffRuntime = fs.readFileSync(staffRuntimePath, 'utf8')

const markerIndex = cropRuntime.indexOf('staff-image-selection-v467')
const blockEnd = cropRuntime.indexOf('\n    })\n  }', markerIndex)
const settlement = cropRuntime.slice(markerIndex, blockEnd)

const assertions = [
  [markerIndex >= 0, 'the reviewed v467 marker exists'],
  [settlement.includes('let settled = false'), 'crop completion has a single-settlement guard'],
  [settlement.includes('resolve(value)'), 'the selected cropped file is resolved'],
  [settlement.includes('dialog.overlay.remove()'), 'confirmed crops close without dispatching cancellation'],
  [settlement.includes("dialog.overlay.addEventListener('lien:close', () => settle(null)"), 'manual dialog close still cancels safely'],
  [!settlement.includes('dialog.close(); resolve(value)'), 'the cancellation-before-confirmation race is removed'],
  [cropRuntime.includes('const transfer = new DataTransfer()'), 'the cropped file is assigned back to the file input'],
  [cropRuntime.includes("input.dispatchEvent(new Event('change', { bubbles: true }))"), 'the staff form receives the confirmed file change'],
  [staffRuntime.includes('if (form.avatar.files[0]) await saveAvatar(staff.key, form.avatar.files[0])'), 'staff editor submits the selected image'],
  [staffRuntime.includes("request('/api/admin/staff-profile'"), 'staff images use the existing authorized profile API'],
]

for (const [condition, label] of assertions) {
  if (!condition) throw new Error(`runtime verification failed: ${label}`)
}

for (const file of [cropRuntimePath, staffRuntimePath]) {
  const syntax = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' })
  if (syntax.status !== 0) throw new Error(`${file}: ${syntax.stderr || syntax.stdout}`)
}

console.log(`staff image selection v467 verified (${assertions.length} assertions)`)
