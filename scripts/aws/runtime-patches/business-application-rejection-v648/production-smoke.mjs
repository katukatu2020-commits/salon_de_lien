import assert from 'node:assert/strict'

const base = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')

const ready = await fetch(base + '/api/health/ready', { cache: 'no-store' })
assert.equal(ready.status, 200)
for (const [header, value] of [
  ['x-lien-business-application-rejection', 'v648'],
  ['x-lien-style-admin-pagination', 'v647'],
  ['x-lien-dealer-password-change', 'v646'],
  ['x-lien-business-account-approvals', 'v643'],
]) assert.equal(ready.headers.get(header), value, `${header} is not ready`)

const applications = await fetch(base + '/platform/inquiries', { cache: 'no-store', redirect: 'manual' })
assert.ok([302, 303].includes(applications.status))
assert.match(String(applications.headers.get('location')), /\/platform\/login/)

const unauthenticatedReject = await fetch(base + '/api/platform/inquiries/production-smoke/reject', {
  method: 'POST',
  headers: {
    origin: base,
    'content-type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({ reason: 'production smoke must never reach mutation' }),
  redirect: 'manual',
})
assert.ok([302, 303].includes(unauthenticatedReject.status))
assert.match(String(unauthenticatedReject.headers.get('location')), /\/platform\/login/)

for (const path of ['/business/salon', '/business/dealer']) {
  const response = await fetch(base + path, { cache: 'no-store', redirect: 'manual' })
  assert.equal(response.status, 200, path)
  assert.match(await response.text(), /問い合わせ|相談/)
}

console.log(JSON.stringify({
  release: 'business-application-rejection-v648',
  releaseHeadersVerified: true,
  protectedOperatorRoutes: true,
  unauthenticatedMutationBlocked: true,
  applicationFormsAvailable: true,
}))
