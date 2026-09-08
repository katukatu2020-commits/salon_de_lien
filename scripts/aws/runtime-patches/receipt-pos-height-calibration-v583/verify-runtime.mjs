import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
const client = fs.readFileSync(path.join(root, 'public', 'receipt-pos-direct-v582.js'), 'utf8')

for (const required of [
  "X-Lien-Receipt-Height-Calibrated', 'v583'",
  'receipt-pos-height-calibration-v583',
  "X-Lien-Receipt-Pos-Direct', 'v582'",
]) assert.ok(server.includes(required), `server invariant missing: ${required}`)

for (const required of [
  '__orimiaReceiptPosDirectV582',
  "const BRIDGE_URL = 'http://127.0.0.1:17615'",
  "fetchBridge('/print'",
]) assert.ok(client.includes(required), `client invariant missing: ${required}`)

console.log(JSON.stringify({ release:'receipt-pos-height-calibration-v583', verified:true }))
