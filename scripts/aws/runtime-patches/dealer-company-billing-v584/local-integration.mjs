import assert from 'node:assert/strict'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3153').replace(/\/$/, '')
const runId = Date.now().toString(36)

async function readJson(response) {
  const text = await response.text()
  let payload = {}
  try { payload = text ? JSON.parse(text) : {} } catch {}
  return { response, text, payload }
}

async function form(path, values, cookie = '', origin = baseUrl) {
  return fetch(`${baseUrl}${path}`, {
    method:'POST',
    redirect:'manual',
    headers:{ Origin:origin, 'Content-Type':'application/x-www-form-urlencoded', ...(cookie ? { Cookie:cookie } : {}) },
    body:new URLSearchParams(values),
  })
}

async function post(path, cookie, body, origin = baseUrl) {
  return readJson(await fetch(`${baseUrl}${path}`, {
    method:'POST',
    redirect:'manual',
    headers:{ Origin:origin, Cookie:cookie, Accept:'application/json', 'Content-Type':'application/json' },
    body:JSON.stringify(body),
  }))
}

async function get(path, cookie = '') {
  return readJson(await fetch(`${baseUrl}${path}`, {
    redirect:'manual',
    headers:{ ...(cookie ? { Cookie:cookie } : {}), Accept:'application/json' },
  }))
}

const ready = await fetch(`${baseUrl}/api/health/ready?verify=v584`, { cache:'no-store' })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-dealer-company-billing'), 'v584')
assert.equal(ready.headers.get('x-lien-receipt-height-calibrated'), 'v583')

const unauthorizedProfile = await get('/api/dealer/profile')
assert.equal(unauthorizedProfile.response.status, 401)

const adminLogin = await form('/api/auth/login', {
  email:'demo.owner',
  password:'LienDemo2026!',
  next:'/admin/products/orders',
})
assert.ok([302, 303].includes(adminLogin.status), `admin login failed with ${adminLogin.status}`)
const adminCookie = (adminLogin.headers.get('set-cookie') || '').split(';')[0]
assert.match(adminCookie, /^[^=]+=/)

const loginId = `dealer.v584.${runId}`
const password = `Dealer-V584-${runId}!`
const email = `${loginId}@example.test`
const inviteResult = await post('/api/admin/wholesale/invites', adminCookie, {
  dealerName:`V584 Dealer ${runId}`,
  loginId,
  email,
  phone:'086-555-0584',
})
assert.ok(inviteResult.response.ok, `dealer invite failed with ${inviteResult.response.status}: ${inviteResult.text.slice(0, 500)}`)
const invite = inviteResult.payload

const setupUrl = new URL(invite.setupUrl)
const setup = await form('/api/dealer/auth/setup', {
  token:setupUrl.searchParams.get('token'),
  password,
  passwordConfirm:password,
})
assert.equal(setup.status, 303, 'dealer setup failed')

const login = await form('/api/dealer/auth/login', { loginId, password, next:'/dealer/products' })
assert.equal(login.status, 303, 'dealer login failed')
assert.equal(new URL(login.headers.get('location'), baseUrl).pathname, '/dealer/billing')
const dealerCookie = (login.headers.get('set-cookie') || '').split(';')[0]
assert.match(dealerCookie, /^orimia_dealer_session=/)

const billingPage = await get('/dealer/billing', dealerCookie)
assert.equal(billingPage.response.status, 200)
assert.match(billingPage.text, /data-dealer-view="billing"/)

const companyPage = await get('/dealer/company', dealerCookie)
assert.equal(companyPage.response.status, 200)
assert.match(companyPage.text, /data-dealer-view="company"/)

const operationalPage = await get('/dealer/products', dealerCookie)
assert.equal(operationalPage.response.status, 302)
const operationalLocation = new URL(operationalPage.response.headers.get('location'), baseUrl)
assert.equal(operationalLocation.pathname, '/dealer/billing')
assert.equal(operationalLocation.searchParams.get('required'), '1')
assert.equal(operationalLocation.searchParams.get('next'), '/dealer/products')

const billingStatus = await get('/api/dealer/billing/status', dealerCookie)
assert.equal(billingStatus.response.status, 200)
assert.equal(billingStatus.payload.ok, true)
assert.equal(billingStatus.payload.billing.subscriptionStatus, 'none')
assert.equal(billingStatus.payload.billing.accessAllowed, false)
assert.equal(billingStatus.payload.billing.planKey, 'dealer')

const blockedApi = await get('/api/dealer/bootstrap', dealerCookie)
assert.equal(blockedApi.response.status, 402)
assert.equal(blockedApi.payload.billingUrl, '/dealer/billing')

const profile = await get('/api/dealer/profile', dealerCookie)
assert.equal(profile.response.status, 200)
assert.equal(profile.payload.profile.companyName, `V584 Dealer ${runId}`)
assert.match(profile.payload.profile.dealerCode, /^DLR-[A-F0-9]{10}$/)
const dealerCode = profile.payload.profile.dealerCode

const profileUpdate = await post('/api/dealer/profile', dealerCookie, {
  companyName:`ORIMIA Partner Test ${runId}`,
  storeName:'岡山営業所',
  representativeName:'山田 花子',
  invoiceRegistrationNumber:'T1234567890123',
  email,
  phone:'086-555-1584',
  postalCode:'700-0904',
  prefecture:'岡山県',
  city:'岡山市北区',
  addressLine1:'柳町1-5-25',
  addressLine2:'ORIMIAビル 2F',
  websiteUrl:'https://example.test/dealer',
  businessHours:'平日 9:00〜18:00',
})
assert.equal(profileUpdate.response.status, 200, profileUpdate.text)
assert.equal(profileUpdate.payload.profile.storeName, '岡山営業所')
assert.equal(profileUpdate.payload.profile.representativeName, '山田 花子')
assert.equal(profileUpdate.payload.profile.invoiceRegistrationNumber, 'T1234567890123')
assert.equal(profileUpdate.payload.profile.prefecture, '岡山県')

const persistedProfile = await get('/api/dealer/profile', dealerCookie)
assert.equal(persistedProfile.payload.profile.addressLine1, '柳町1-5-25')
assert.equal(persistedProfile.payload.profile.businessHours, '平日 9:00〜18:00')
assert.equal(persistedProfile.payload.profile.dealerCode, dealerCode)

const wrongOrigin = await post('/api/dealer/profile', dealerCookie, {
  companyName:'Rejected update',
  email,
}, 'https://evil.example')
assert.equal(wrongOrigin.response.status, 403)

console.log(JSON.stringify({
  release:'dealer-company-billing-v584',
  companyProfileSaved:true,
  dealerCodePreserved:true,
  unpaidPageRedirect:true,
  unpaidApiBlocked:true,
  billingStatusAvailable:true,
  sameOriginProtected:true,
}))
