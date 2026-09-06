import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const headers = { 'Cache-Control':'no-cache', 'User-Agent':'ORIMIA-customer-chart-ui-v562-smoke/1.0' }

const ready = await fetch(`${baseUrl}/api/health/ready?smoke=v562`, { headers, cache:'no-store' })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-customer-chart-ui'), 'v562')
assert.equal(ready.headers.get('x-lien-salon-records-controls'), 'v561')
assert.equal(ready.headers.get('x-lien-customer-comment-layout'), 'v560')

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method:'POST',
  redirect:'manual',
  headers:{ ...headers, Origin:baseUrl, 'Content-Type':'application/x-www-form-urlencoded' },
  body:new URLSearchParams({ email:'demo.owner', password:'LienDemo2026!', next:'/admin/customers' }),
})
assert.ok([302, 303].includes(login.status), `owner login failed: ${login.status}`)
const ownerCookie = (login.headers.get('set-cookie') || '').split(';')[0]
assert.match(ownerCookie, /^lien_admin_session=/)

const asset = await fetch(`${baseUrl}/commercial-admin-v101.js?smoke=v562`, { headers:{ ...headers, Cookie:ownerCookie }, cache:'no-store' })
assert.equal(asset.status, 200)
const source = await asset.text()
assert.match(source, /customer-chart-ui-v562/)
assert.match(source, /__lienCustomerChartUiV562 = true/)
assert.match(source, /lien-chart-card-header/)
assert.match(source, /LATEST CHART/)

console.log(JSON.stringify({ release:'customer-chart-ui-v562', productionReady:true, commercialAsset:true }))
