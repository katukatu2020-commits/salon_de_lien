import assert from 'node:assert/strict'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3120').replace(/\/$/, '')
const headers = { Accept: 'text/html', 'Cache-Control': 'no-cache' }

const ready = await fetch(`${baseUrl}/api/health/ready?verify=v544`, { headers })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-customer-registration-single-loader'), 'v544')
assert.equal(ready.headers.get('x-lien-wholesale-ordering'), 'v543')
assert.equal(ready.headers.get('x-lien-navigation-loading-experience'), 'v536')

const register = await fetch(`${baseUrl}/u/register?verify=v544`, { headers })
assert.equal(register.status, 200)
const html = await register.text()
assert.match(html, /customer-booking-transition-v524\.js\?v=524/)
assert.match(html, /shell-consistency-v518\.css\?v=544-single-loader1/)
assert.match(html, /navigation-loading-v536-release1\.css/)

const styleResponse = await fetch(`${baseUrl}/shell-consistency-v518.css?v=544-single-loader1`, { headers })
assert.equal(styleResponse.status, 200)
const style = await styleResponse.text()
assert.match(style, /customer-registration-single-loader-v544/)
assert.match(style, /\[data-orimia-loading-experience\]/)
assert.match(style, /background-image: none !important/)

console.log(JSON.stringify({
  release: 'customer-registration-single-loader-v544',
  ready: ready.status,
  registrationPage: true,
  cacheRevision: 'v544-single-loader1',
}))
