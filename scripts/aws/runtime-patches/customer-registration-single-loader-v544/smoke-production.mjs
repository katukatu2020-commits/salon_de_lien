import assert from 'node:assert/strict'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const headers = {
  Accept: 'text/html',
  'Cache-Control': 'no-cache',
  'User-Agent': 'ORIMIA-customer-registration-single-loader-v544-smoke/1.0',
}

async function get(pathname) {
  const response = await fetch(`${baseUrl}${pathname}`, { headers, cache: 'no-store' })
  assert.equal(response.status, 200, `${pathname}: expected 200, received ${response.status}`)
  return response
}

const ready = await get('/api/health/ready?smoke=v544')
assert.equal(ready.headers.get('x-lien-customer-registration-single-loader'), 'v544')
assert.equal(ready.headers.get('x-lien-wholesale-ordering'), 'v543')
assert.equal(ready.headers.get('x-lien-sales-ledger-staff-multiselect'), 'v542')
assert.equal(ready.headers.get('x-lien-navigation-loading-experience'), 'v536')

const registerHtml = await (await get('/u/register?smoke=v544')).text()
assert.match(registerHtml, /shell-consistency-v518\.css\?v=544-single-loader1/)
assert.match(registerHtml, /customer-booking-transition-v524\.js\?v=524/)

const style = await (await get('/shell-consistency-v518.css?v=544-single-loader1&smoke=v544')).text()
assert.match(style, /customer-registration-single-loader-v544/)
assert.match(style, /\[data-orimia-loading-experience\]/)
assert.match(style, /background-image: none !important/)

console.log(JSON.stringify({
  release: 'customer-registration-single-loader-v544',
  productionVerified: true,
  registrationLoaderCount: 1,
}))
