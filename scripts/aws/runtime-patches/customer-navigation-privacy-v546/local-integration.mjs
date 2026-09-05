import assert from 'node:assert/strict'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3123').replace(/\/$/, '')
const headers = { Accept: 'text/html', 'Cache-Control': 'no-cache' }

const ready = await fetch(`${baseUrl}/api/health/ready?verify=v546`, { headers })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-customer-navigation-privacy'), 'v546')
assert.equal(ready.headers.get('x-lien-customer-profile-auto-upload'), 'v545')
assert.equal(ready.headers.get('x-lien-customer-registration-single-loader'), 'v544')

const login = await fetch(`${baseUrl}/api/customer-auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ loginId: 'demo.hana', password: 'Mypage2026!', next: '/u/community' }),
})
assert.ok([302, 303].includes(login.status), `unexpected login redirect: ${login.status}`)
const cookie = login.headers.get('set-cookie')?.split(';')[0]
assert.ok(cookie, 'customer login cookie was not returned')

const community = await fetch(`${baseUrl}/u/community?verify=v546`, { headers: { ...headers, Cookie: cookie } })
assert.equal(community.status, 200)
const communityHtml = await community.text()

const detailHref = communityHtml.match(/href="(\/u\/community\/[^"?#]+)"/)?.[1]
if (detailHref) {
  const detail = await fetch(`${baseUrl}${detailHref}?verify=v546`, { headers: { ...headers, Cookie: cookie } })
  assert.equal(detail.status, 200)
  const detailHtml = await detail.text()
  assert.match(detailHtml, /6012-community-customer-privacy-v546\.js/)
  assert.doesNotMatch(detailHtml, /公開中/)
}

const shellResponse = await fetch(`${baseUrl}/shell-consistency-v518.js?v=546-navigation-privacy1`, { headers })
assert.equal(shellResponse.status, 200)
const shell = await shellResponse.text()
assert.match(shell, /window\.__orimiaCustomerNavigateBackV546/)
assert.match(shell, /function samePage\(left, right\)/)

const experienceResponse = await fetch(`${baseUrl}/customer-experience-v503.js?v=546-navigation-privacy1`, { headers })
assert.equal(experienceResponse.status, 200)
const experience = await experienceResponse.text()
assert.match(experience, /window\.__orimiaCustomerNavigateBackV546\(fallback\)/)
assert.doesNotMatch(experience, /if \(history\.length > 1\) history\.back\(\)/)

const clientChunk = await fetch(`${baseUrl}/_next/static/chunks/6012-community-customer-privacy-v546.js`, { headers })
assert.equal(clientChunk.status, 200)
assert.match(await clientChunk.text(), /"staff"===s[^]*?公開中[^]*?:null/)

console.log(JSON.stringify({
  release: 'customer-navigation-privacy-v546',
  ready: ready.status,
  customerCommunityDetailChecked: Boolean(detailHref),
  pageAwareNavigation: true,
}))
