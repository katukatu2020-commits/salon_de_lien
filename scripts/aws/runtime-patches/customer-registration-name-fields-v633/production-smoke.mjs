import assert from 'node:assert/strict'

const base = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')

const health = await fetch(base + '/api/health/ready', { redirect: 'manual' })
assert.equal(health.status, 200)
assert.equal(health.headers.get('x-lien-customer-registration-name-fields'), 'v633')
assert.equal(health.headers.get('x-lien-salon-onboarding-guides'), 'removed-v632')
assert.equal(health.headers.get('x-lien-dealer-pricing-pagination'), 'v631')

const registration = await fetch(base + '/u/register', { redirect: 'manual' })
assert.equal(registration.status, 200)
const html = await registration.text()
assert.match(html, /お客様アプリ初回登録/)

const invalidInvite = await fetch(base + '/u/register/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', {
  redirect: 'manual',
})
assert.equal(invalidInvite.status, 200)
assert.match(await invalidInvite.text(), /登録リンクを確認できません/)

console.log(JSON.stringify({
  release: 'customer-registration-name-fields-v633',
  productionVerified: true,
  readinessVerified: true,
  registrationRoutesVerified: true,
}))
