import assert from 'node:assert/strict'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const headers = {
  Accept: 'text/html',
  'Cache-Control': 'no-cache',
  'User-Agent': 'ORIMIA-customer-profile-auto-upload-v545-smoke/1.0',
}

async function get(pathname) {
  const response = await fetch(`${baseUrl}${pathname}`, { headers, cache: 'no-store' })
  assert.equal(response.status, 200, `${pathname}: expected 200, received ${response.status}`)
  return response
}

const ready = await get('/api/health/ready?smoke=v545')
assert.equal(ready.headers.get('x-lien-customer-profile-auto-upload'), 'v545')
assert.equal(ready.headers.get('x-lien-customer-registration-single-loader'), 'v544')
assert.equal(ready.headers.get('x-lien-wholesale-ordering'), 'v543')
assert.equal(ready.headers.get('x-lien-sales-ledger-staff-multiselect'), 'v542')

const experience = await (await get('/customer-experience-v503.js?v=545-auto-profile1&smoke=v545')).text()
assert.match(experience, /customer-profile-auto-upload-v545/)
assert.match(experience, /\[data-profile-upload-button-v424\].*display:none!important/)
assert.match(experience, /orimia:customer-profile-crop-ready-v545/)
assert.match(experience, /location\.pathname === '\/u\/profile' && input\.name === 'profileImage'/)

const cropper = await (await get('/customer-link-ui-v424.js?v=545-auto-profile1&smoke=v545')).text()
assert.match(cropper, /location\.pathname === '\/u\/profile' && input\.name === 'profileImage'/)
assert.match(cropper, /if \(location\.pathname === '\/u\/profile'\) return false/)

const profileCropper = await (await get('/customer-profile-image-v401.js?v=545-auto-profile1&smoke=v545')).text()
assert.match(profileCropper, /orimia:customer-profile-crop-ready-v545/)
assert.match(profileCropper, /event\.stopPropagation\(\)/)

const customerRuntime = await (await get('/customer-runtime-v267.js?v=545-auto-profile1&smoke=v545')).text()
assert.match(customerRuntime, /customer-link-ui-v293\.js\?v=545-auto-profile1/)

const sharedCropper = await (await get('/customer-link-ui-v293.js?v=545-auto-profile1&smoke=v545')).text()
assert.match(sharedCropper, /if \(location\.pathname === '\/u\/profile'\) return false/)

const login = await fetch(`${baseUrl}/api/customer-auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': headers['User-Agent'] },
  body: new URLSearchParams({ loginId: 'demo.hana', password: 'Mypage2026!', next: '/u/profile' }),
})
assert.ok([302, 303].includes(login.status), `unexpected login redirect: ${login.status}`)
const cookie = login.headers.get('set-cookie')?.split(';')[0]
assert.ok(cookie)
const emptyUpload = await fetch(`${baseUrl}/api/customer/profile-image`, {
  method: 'POST',
  headers: { Cookie: cookie, Origin: baseUrl, 'User-Agent': headers['User-Agent'] },
  body: new FormData(),
})
assert.equal(emptyUpload.status, 400)
assert.match(JSON.stringify(await emptyUpload.json()), /プロフィール画像を選択してください/)

console.log(JSON.stringify({
  release: 'customer-profile-auto-upload-v545',
  productionVerified: true,
  automaticUploadRuntime: true,
  uploadEndpointProtected: true,
}))
