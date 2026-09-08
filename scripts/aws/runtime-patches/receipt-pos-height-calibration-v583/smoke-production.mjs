import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

for (let attempt = 1; attempt <= 24; attempt += 1) {
  const response = await fetch(`${baseUrl}/api/health/ready?smoke=v583-${Date.now()}-${attempt}`, { cache:'no-store' })
  if (
    response.status === 200
    && response.headers.get('x-lien-receipt-height-calibrated') === 'v583'
    && response.headers.get('x-lien-receipt-pos-direct') === 'v582'
    && response.headers.get('x-lien-dealer-contract-pricing') === 'v581'
  ) {
    const script = await fetch(`${baseUrl}/receipt-pos-direct-v582.js?smoke=v583`, { cache:'no-store' })
    assert.equal(script.status, 200)
    assert.match(await script.text(), /__orimiaReceiptPosDirectV582/)
    console.log(JSON.stringify({ release:'receipt-pos-height-calibration-v583', production:true, readOnly:true }))
    process.exit(0)
  }
  await sleep(1500)
}

assert.fail('production readiness did not reach v583')
