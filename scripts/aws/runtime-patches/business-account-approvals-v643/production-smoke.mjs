import assert from 'node:assert/strict'

const base = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')

const ready = await fetch(base + '/api/health/ready', { redirect: 'manual' })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-business-account-approvals'), 'v643')
assert.equal(ready.headers.get('x-lien-managed-bank-accounts'), 'v629')
assert.equal(ready.headers.get('x-lien-customer-store-limit'), 'v642')

const platform = await fetch(base + '/platform', { redirect: 'manual' })
assert.ok([302, 303].includes(platform.status))
assert.match(String(platform.headers.get('location')), /\/platform\/login/)

const applications = await fetch(base + '/platform/inquiries', { redirect: 'manual' })
assert.ok([302, 303].includes(applications.status))
assert.match(String(applications.headers.get('location')), /\/platform\/login/)

for (const path of ['/business/salon', '/business/dealer', '/dealer/login', '/admin/login']) {
  const response = await fetch(base + path, { redirect: 'manual' })
  assert.equal(response.status, 200, path)
  const body = await response.text()
  if (path.startsWith('/business/')) assert.match(body, /問い合わせ|相談/)
  if (path.endsWith('/login')) assert.match(body, /パスワード/)
}

console.log(JSON.stringify({ release: 'business-account-approvals-v643', ready: true, protectedPlatform: true, publicApplications: true, logins: true }))
