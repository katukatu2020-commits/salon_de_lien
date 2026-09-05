import fs from 'node:fs'
import { spawnSync } from 'node:child_process'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const clientPath = `${root}/staff-breaks-checkout-menu-client-v442.js`
const servicePath = `${root}/staff-breaks-checkout-menu-v442.js`
const serverPath = `${root}/server.js`
const client = fs.readFileSync(clientPath, 'utf8')
const service = fs.readFileSync(servicePath, 'utf8')
const server = fs.readFileSync(serverPath, 'utf8')

const checks = [
  [client.includes('manual-booking-break-interaction-v535'), 'release marker is installed'],
  [client.includes('control.disabled = true\n      control.required = false'), 'hidden break controls start disabled and optional'],
  [client.includes('setBreakControlsActive(state, enabled)'), 'break controls follow the selected mode'],
  [client.includes('control.required = enabled'), 'break-only validation is scoped to break mode'],
  [client.includes('syncBreakTimingFromAppointment(state)'), 'selected grid time is copied to the break form'],
  [client.includes("sourceStart?.addEventListener('input', syncSourceStart)"), 'late grid presets stay synchronized'],
  [client.includes('lien-break-resize-v461'), 'break cards keep the right-edge resize handle'],
  [client.includes('beginBreakDrag(event, block, item'), 'break cards keep pointer drag handling'],
  [client.includes("method: 'PATCH'"), 'break card changes are persisted'],
  [service.includes('async function updateBreak'), 'break update endpoint remains available'],
  [service.includes("req.method === 'PATCH'"), 'break update route remains available'],
  [server.includes("X-Lien-Manual-Booking-Break-Interaction', 'v535'"), 'readiness marker is installed'],
]

for (const [condition, label] of checks) {
  if (!condition) throw new Error(`runtime verification failed: ${label}`)
}

for (const file of [clientPath, servicePath, serverPath]) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' })
  if (result.status !== 0) throw new Error(`${file}: ${result.stderr || result.stdout}`)
}

console.log(`manual booking and break interaction v535 verified (${checks.length} checks)`)
