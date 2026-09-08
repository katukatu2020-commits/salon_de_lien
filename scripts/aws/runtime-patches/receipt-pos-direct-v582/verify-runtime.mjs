import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
const client = fs.readFileSync(path.join(root, 'public', 'receipt-pos-direct-v582.js'), 'utf8')

for (const required of [
  'orimia-receipt-pos-direct-script-v582',
  '/receipt-pos-direct-v582.js?v=582-release1',
  "X-Lien-Receipt-Pos-Direct', 'v582'",
  'http://127.0.0.1:17615',
  'receipt-pos-direct-v582-csp',
]) assert.ok(server.includes(required), `server invariant missing: ${required}`)

assert.ok(!server.includes('id=\\"orimia-receipt-physical-roll-script-v579\\"'), 'legacy receipt script is still injected')

for (const required of [
  '__orimiaReceiptPosDirectV582',
  '__orimiaReceiptPhysicalRollV579 = api',
  "const BRIDGE_URL = 'http://127.0.0.1:17615'",
  "fetchBridge('/status'",
  "fetchBridge('/print'",
  'collectReceipt',
  'bridgeConnected',
  'host.replaceChildren(copy)',
  'if (printPending || document.documentElement.hasAttribute(PRINTING_ATTRIBUTE)) return',
]) assert.ok(client.includes(required), `client invariant missing: ${required}`)

console.log(JSON.stringify({ release:'receipt-pos-direct-v582', verified:true }))
