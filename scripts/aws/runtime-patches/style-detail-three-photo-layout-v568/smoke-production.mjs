import assert from 'node:assert/strict'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

async function waitForReady() {
  let lastStatus = 0
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    const response = await fetch(`${baseUrl}/api/health/ready?verify=v568-${Date.now()}-${attempt}`, { cache:'no-store' })
    lastStatus = response.status
    if (
      response.status === 200
      && response.headers.get('x-lien-style-detail-three-photo-layout') === 'v568'
      && response.headers.get('x-lien-customer-chart-delete') === 'v567'
      && response.headers.get('x-lien-style-post-directions') === 'v566'
      && response.headers.get('x-lien-customer-appointment-history') === 'v565'
      && response.headers.get('x-lien-customer-chart-attachments') === 'v564'
      && response.headers.get('x-lien-daily-sales-print-fit') === 'v563'
      && response.headers.get('x-lien-salon-records-controls') === 'v561'
    ) return
    await sleep(1500)
  }
  assert.fail(`production readiness did not reach v568; last status ${lastStatus}`)
}

async function waitForAsset() {
  let lastSource = ''
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    const response = await fetch(`${baseUrl}/commercial-admin-v101.js?verify=v568-${Date.now()}-${attempt}`, { cache:'no-store' })
    if (response.status === 200) {
      lastSource = await response.text()
      if (
        lastSource.includes('__lienStyleDetailThreePhotoLayoutV568')
        && lastSource.includes('data-style-detail-photo-layout-v568')
        && lastSource.includes("'triptych' : 'stack'")
      ) return lastSource
    }
    await sleep(1500)
  }
  assert.match(lastSource, /__lienStyleDetailThreePhotoLayoutV568/)
}

await waitForReady()
await waitForAsset()

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method:'POST',
  redirect:'manual',
  headers:{ Origin:baseUrl, 'Content-Type':'application/x-www-form-urlencoded' },
  body:new URLSearchParams({ email:'demo.owner', password:'LienDemo2026!', next:'/admin/community' }),
})
assert.ok([302, 303].includes(login.status), `owner login failed: ${login.status}`)
const cookie = (login.headers.get('set-cookie') || '').split(';')[0]
assert.match(cookie, /^lien_admin_session=/)

const detail = await fetch(`${baseUrl}/admin/community/showcase-yohaku-community-post-001?verify=v568-${Date.now()}`, {
  headers:{ Cookie:cookie, Accept:'text/html', 'Cache-Control':'no-cache' },
  redirect:'manual',
})
assert.equal(detail.status, 200)

console.log(JSON.stringify({ release:'style-detail-three-photo-layout-v568', production:true, readOnly:true }))
