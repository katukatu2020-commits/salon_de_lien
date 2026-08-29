import fs from 'node:fs'
import { spawnSync } from 'node:child_process'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const marker = 'shift-line-break-interaction-v461'
const oldChunkName = 'page-shift-staff-drop-v444.js'
const newChunkName = 'page-shift-line-break-v461.js'
const newChunkPath = `${root}/.next/static/chunks/app/admin/appointments/${newChunkName}`
const appManifestPath = `${root}/.next/app-build-manifest.json`
const clientManifestPath = `${root}/.next/server/app/admin/appointments/page_client-reference-manifest.js`
const servicePath = `${root}/staff-breaks-checkout-menu-v442.js`
const clientPath = `${root}/staff-breaks-checkout-menu-client-v442.js`

function count(source, value) {
  return source.split(value).length - 1
}

function check(condition, label) {
  if (!condition) throw new Error(`runtime verification failed: ${label}`)
}

const shift = fs.readFileSync(newChunkPath, 'utf8')
const appManifest = fs.readFileSync(appManifestPath, 'utf8')
const clientManifest = fs.readFileSync(clientManifestPath, 'utf8')
const service = fs.readFileSync(servicePath, 'utf8')
const client = fs.readFileSync(clientPath, 'utf8')

const assertions = [
  [shift.includes(marker), 'cache-busted shift chunk contains the release marker'],
  [shift.includes('label: "LINE予約"'), 'LINE route appears in the shift legend'],
  [shift.includes('symbol: "L"'), 'LINE route has a dedicated compact symbol'],
  [shift.includes('lien-route-line-v461'), 'LINE route uses the dedicated green visual token'],
  [shift.includes('line公式|line予約|\\bline\\b|liff'), 'legacy LINE source strings are detected'],
  [count(appManifest, newChunkName) === 1 && count(appManifest, oldChunkName) === 0, 'app manifest points only to v461'],
  [count(clientManifest, newChunkName) === 7 && count(clientManifest, oldChunkName) === 0, 'client manifest points only to v461'],
  [service.includes(`/* ${marker} */`), 'break PATCH API route is installed'],
  [service.includes('async function updateBreak'), 'break update transaction is installed'],
  [service.includes("req.method === 'PATCH'"), 'break update endpoint accepts PATCH'],
  [service.includes("step: 15"), 'new break data is validated in 15-minute increments'],
  [service.includes('pg_advisory_xact_lock'), 'break updates retain serialized staff/date locking'],
  [service.includes('status: { notIn: [...CLOSED_APPOINTMENT_STATUSES] }'), 'break updates reject appointment overlap'],
  [client.includes(marker), 'break interaction client contains the release marker'],
  [client.includes('lien-route-line-v461'), 'LINE legend color is supplied by the client runtime'],
  [client.includes('休憩（予約受付を停止）'), 'break is selectable from the menu control'],
  [client.includes("method: 'PATCH'"), 'break cards persist drag and resize changes'],
  [client.includes("'lien:shift-drag-start'"), 'break cards use the shared shift drag UX events'],
  [client.includes('lien-break-resize-v461'), 'break cards expose the right-edge resize handle'],
  [client.includes('SNAP_MINUTES = 15'), 'break move and resize snap to the same 15-minute grid'],
]

for (const [condition, label] of assertions) check(condition, label)

for (const file of [newChunkPath, servicePath, clientPath]) {
  const syntax = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' })
  if (syntax.status !== 0) throw new Error(`${file}: ${syntax.stderr || syntax.stdout}`)
}

console.log(`shift LINE and break interaction v461 verified (${assertions.length} assertions)`)
