import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

for (let attempt = 1; attempt <= 20; attempt += 1) {
  const response = await fetch(`${baseUrl}/api/health/ready?smoke=v577-${Date.now()}-${attempt}`, { cache:'no-store' })
  if (
    response.status === 200
      && response.headers.get('x-lien-owner-billing-tab') === 'v577'
      && response.headers.get('x-lien-dealer-operations') === 'v576'
      && response.headers.get('x-lien-customer-chart-header-actions') === 'v575'
  ) break
  if (attempt === 20) assert.fail(`production readiness did not reach v577; last status ${response.status}`)
  await sleep(1500)
}

const clientResponse = await fetch(`${baseUrl}/sales-ledger-v318.js?v=577-smoke-${Date.now()}`, { cache:'no-store' })
assert.equal(clientResponse.status, 200)
const client = await clientResponse.text()
assert.match(client, /owner-billing-tab-v577/)
assert.match(client, /function syncOwnerAnalyticsTabs\(\)/)
assert.match(client, /addEventListener\('pageshow', enhance\)/)

process.env.TEST_BASE_URL = baseUrl
await import('./browser-regression.mjs')
