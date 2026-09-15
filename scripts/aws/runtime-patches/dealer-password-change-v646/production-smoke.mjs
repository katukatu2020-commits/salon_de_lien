import assert from 'node:assert/strict'

const base = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')

const ready = await fetch(base + '/api/health/ready', { cache: 'no-store' })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-dealer-password-change'), 'v646')
assert.equal(ready.headers.get('x-lien-stamp-reward-pricing'), 'v645')
assert.equal(ready.headers.get('x-lien-business-account-approvals'), 'v643')

const login = await fetch(base + '/dealer/login', { cache: 'no-store' })
assert.equal(login.status, 200)
assert.match(await login.text(), /\/api\/dealer\/auth\/login/)

const protectedPage = await fetch(base + '/dealer/password-change', { cache: 'no-store', redirect: 'manual' })
assert.equal(protectedPage.status, 404)

console.log(JSON.stringify({
  release: 'dealer-password-change-v646',
  productionVerified: true,
  releaseHeaderVerified: true,
  dealerLoginAvailable: true,
  passwordPageProtected: true,
}))
