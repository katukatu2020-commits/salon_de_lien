import assert from 'node:assert/strict'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3122').replace(/\/$/, '')
const headers = { Accept: 'text/html', 'Cache-Control': 'no-cache' }

const ready = await fetch(`${baseUrl}/api/health/ready?verify=v545`, { headers })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-customer-profile-auto-upload'), 'v545')
assert.equal(ready.headers.get('x-lien-customer-registration-single-loader'), 'v544')
assert.equal(ready.headers.get('x-lien-wholesale-ordering'), 'v543')

const login = await fetch(`${baseUrl}/api/customer-auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ loginId: 'demo.hana', password: 'Mypage2026!', next: '/u/profile' }),
})
assert.ok([302, 303].includes(login.status), `unexpected login redirect: ${login.status}`)
const cookie = login.headers.get('set-cookie')?.split(';')[0]
assert.ok(cookie, 'customer login cookie was not returned')

const profile = await fetch(`${baseUrl}/u/profile?verify=v545`, { headers: { ...headers, Cookie: cookie } })
assert.equal(profile.status, 200)
const html = await profile.text()
assert.match(html, /layout-customer-mobile-nav-v425\.profile-v545\.js/)
assert.match(html, /page-profile-code-v267\.auto-upload-v545\.js/)
assert.match(html, /name="profileImage"/)

const experienceResponse = await fetch(`${baseUrl}/customer-experience-v503.js?v=545-auto-profile1`, { headers })
assert.equal(experienceResponse.status, 200)
const experience = await experienceResponse.text()
assert.match(experience, /customer-profile-auto-upload-v545/)
assert.match(experience, /\[data-profile-upload-button-v424\].*display:none!important/)
assert.match(experience, /fetch\('\/api\/customer\/profile-image'/)
assert.match(experience, /orimia:customer-profile-crop-ready-v545/)
assert.match(experience, /location\.pathname === '\/u\/profile' && input\.name === 'profileImage'/)

const cropperResponse = await fetch(`${baseUrl}/customer-link-ui-v424.js?v=545-auto-profile1`, { headers })
assert.equal(cropperResponse.status, 200)
const cropper = await cropperResponse.text()
assert.match(cropper, /location\.pathname === '\/u\/profile' && input\.name === 'profileImage'/)
assert.match(cropper, /if \(location\.pathname === '\/u\/profile'\) return false/)

const profileCropperResponse = await fetch(`${baseUrl}/customer-profile-image-v401.js?v=545-auto-profile1`, { headers })
assert.equal(profileCropperResponse.status, 200)
const profileCropper = await profileCropperResponse.text()
assert.match(profileCropper, /orimia:customer-profile-crop-ready-v545/)
assert.match(profileCropper, /event\.stopPropagation\(\)/)

const customerRuntimeResponse = await fetch(`${baseUrl}/customer-runtime-v267.js?v=545-auto-profile1`, { headers })
assert.equal(customerRuntimeResponse.status, 200)
assert.match(await customerRuntimeResponse.text(), /customer-link-ui-v293\.js\?v=545-auto-profile1/)

const sharedCropperResponse = await fetch(`${baseUrl}/customer-link-ui-v293.js?v=545-auto-profile1`, { headers })
assert.equal(sharedCropperResponse.status, 200)
assert.match(await sharedCropperResponse.text(), /if \(location\.pathname === '\/u\/profile'\) return false/)

console.log(JSON.stringify({
  release: 'customer-profile-auto-upload-v545',
  ready: ready.status,
  profilePage: true,
  automaticUploadRuntime: true,
}))
