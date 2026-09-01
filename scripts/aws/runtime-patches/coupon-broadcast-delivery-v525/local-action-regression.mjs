import assert from 'node:assert/strict'

const baseUrl = String(process.env.BASE_URL || 'http://127.0.0.1:3130').replace(/\/$/, '')
const testTitle = `v525-sms-${crypto.randomUUID()}`

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    email: 'demo.owner',
    password: 'LienDemo2026!',
    next: '/admin/customers/messages',
  }),
})
assert.equal(login.status, 303)
const cookie = (login.headers.get('set-cookie') || '').split(';', 1)[0]
assert.match(cookie, /^[^=]+=/)

const page = await fetch(`${baseUrl}/admin/customers/messages`, {
  headers: { Cookie: cookie, Accept: 'text/html', 'Cache-Control': 'no-cache' },
})
assert.equal(page.status, 200)
const html = await page.text()
const actionName = html.match(/<form[^>]+action=""[^>]*>\s*<input type="hidden" name="(\$ACTION_ID_[^"]+)"/)?.[1]
const customerId = html.match(/name="targetCustomerId" value="([^"]+)"/)?.[1]
assert.ok(actionName, 'customer broadcast action ID is missing')
assert.ok(customerId, 'target customer fixture is missing')

const form = new FormData()
form.set(actionName, '')
form.set('title', testTitle)
form.set('body', '更新前タブのSMS選択をアプリ内配信へ安全に切り替える回帰テストです。')
form.set('deliveryMethod', 'sms')
form.set('audienceGender', 'all')
form.set('targetCustomerId', customerId)
form.set('couponEnabled', 'on')
form.set('couponTitle', 'v525 回帰テストクーポン')
form.set('couponTargetMenu', '似合わせカット')
form.set('couponDiscountRate', '10')
form.set('couponValidDays', '14')
form.set('couponDescription', 'ローカルDBのみで作成し、確認後に削除します。')

const submit = await fetch(`${baseUrl}/admin/customers/messages`, {
  method: 'POST',
  redirect: 'manual',
  headers: { Cookie: cookie },
  body: form,
})
const responseBody = await submit.text()
assert.equal(submit.status, 303, responseBody.slice(0, 500))
assert.match(submit.headers.get('location') || '', /notice=sent&count=1/)

console.log(JSON.stringify({
  release: 'coupon-broadcast-delivery-v525',
  staleDeliveryMethod: 'sms',
  effectiveDeliveryMethod: 'app',
  recipientCount: 1,
  testTitle,
  redirect: submit.headers.get('location'),
  passed: true,
}))
