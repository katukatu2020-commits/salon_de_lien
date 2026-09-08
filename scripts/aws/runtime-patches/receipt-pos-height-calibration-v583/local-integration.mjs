import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3145').replace(/\/$/, '')

const ready = await fetch(`${baseUrl}/api/health/ready?integration=v583`, { headers:{ 'Cache-Control':'no-cache' } })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-receipt-height-calibrated'), 'v583')
assert.equal(ready.headers.get('x-lien-receipt-pos-direct'), 'v582')
assert.equal(ready.headers.get('x-lien-dealer-contract-pricing'), 'v581')

const script = await fetch(`${baseUrl}/receipt-pos-direct-v582.js?integration=v583`, { cache:'no-store' })
assert.equal(script.status, 200)
assert.match(await script.text(), /__orimiaReceiptPosDirectV582/)

console.log(JSON.stringify({
  release:'receipt-pos-height-calibration-v583',
  readiness:true,
  browserIntegration:'v582',
}))
