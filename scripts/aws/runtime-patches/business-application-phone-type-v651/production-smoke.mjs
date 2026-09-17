import assert from 'node:assert/strict'

const base = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')

const ready = await fetch(base + '/api/health/ready', { redirect: 'manual' })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-business-application-phone-type'), 'v651')
assert.equal(ready.headers.get('x-lien-style-admin-local-pagination'), 'v650')
assert.equal(ready.headers.get('x-lien-business-application-rejection'), 'v648')

for (const route of ['/business', '/business/salon', '/business/dealer']) {
  const response = await fetch(base + route, { redirect: 'manual' })
  assert.equal(response.status, 200)
  const html = await response.text()
  assert.match(html, /<select name="audience" required>/)
  assert.match(html, /<option value="salon"/)
  assert.match(html, /<option value="dealer"/)
  assert.doesNotMatch(html, /type="hidden" name="audience"/)
  assert.doesNotMatch(html, /<option value="other"/)
  assert.match(html, /name="phone" maxlength="30" autocomplete="tel" inputmode="tel" required>/)
}

const invalidMissingPhone = await fetch(base + '/api/public/business-inquiries', {
  method: 'POST',
  redirect: 'manual',
  headers: { 'content-type': 'application/x-www-form-urlencoded', origin: base },
  body: new URLSearchParams({ audience: 'salon', sourcePath: '/business/salon', organizationName: 'Production Validation', contactName: 'Validation User', email: 'validation@example.invalid', preferredContact: 'email', message: '電話番号の必須検証を行う送信です。', privacyAccepted: '1' }),
})
assert.equal(invalidMissingPhone.status, 303)
assert.equal(invalidMissingPhone.headers.get('location'), '/business/salon?inquiry=invalid#contact')

const invalidType = await fetch(base + '/api/public/business-inquiries', {
  method: 'POST',
  redirect: 'manual',
  headers: { 'content-type': 'application/x-www-form-urlencoded', origin: base },
  body: new URLSearchParams({ audience: 'other', sourcePath: '/business', organizationName: 'Production Validation', contactName: 'Validation User', email: 'validation@example.invalid', phone: '090-0000-0000', preferredContact: 'email', message: '申請種別のサーバー検証を行う送信です。', privacyAccepted: '1' }),
})
assert.equal(invalidType.status, 303)
assert.equal(invalidType.headers.get('location'), '/business?inquiry=invalid#contact')

console.log(JSON.stringify({ release: 'business-application-phone-type-v651', productionVerified: true, phoneRequired: true, applicationTypes: ['salon', 'dealer'], previousReleasesPreserved: true }))
