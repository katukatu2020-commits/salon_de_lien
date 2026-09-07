import assert from 'node:assert/strict'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3153').replace(/\/$/, '')
const runId = Date.now().toString(36)

async function readJson(response) {
  const text = await response.text()
  let payload = {}
  try { payload = text ? JSON.parse(text) : {} } catch {}
  return { response, text, payload }
}

async function expectJson(response, label) {
  const result = await readJson(response)
  assert.ok(response.ok, `${label} failed with ${response.status}: ${result.text.slice(0, 500)}`)
  return result.payload
}

async function form(path, values, cookie = '') {
  return fetch(`${baseUrl}${path}`, {
    method:'POST',
    redirect:'manual',
    headers:{ Origin:baseUrl, 'Content-Type':'application/x-www-form-urlencoded', ...(cookie ? { Cookie:cookie } : {}) },
    body:new URLSearchParams(values),
  })
}

async function post(path, cookie, body, label) {
  return expectJson(await fetch(`${baseUrl}${path}`, {
    method:'POST',
    headers:{ Origin:baseUrl, Cookie:cookie, Accept:'application/json', 'Content-Type':'application/json' },
    body:JSON.stringify(body),
  }), label)
}

async function postRaw(path, cookie, body) {
  return readJson(await fetch(`${baseUrl}${path}`, {
    method:'POST',
    headers:{ Origin:baseUrl, Cookie:cookie, Accept:'application/json', 'Content-Type':'application/json' },
    body:JSON.stringify(body),
  }))
}

async function get(path, cookie, label) {
  return expectJson(await fetch(`${baseUrl}${path}`, { headers:{ Cookie:cookie, Accept:'application/json' } }), label)
}

async function createDealer(adminCookie, salon, suffix) {
  const loginId = `dealer.v581.${suffix}.${runId}`
  const password = `Dealer-V581-${suffix}-${runId}!`
  const invite = await post('/api/admin/wholesale/invites', adminCookie, {
    dealerName:`V581 検証ディーラー ${suffix} ${runId}`,
    loginId,
    email:`${loginId}@example.test`,
    phone:`03-5555-581${suffix}`,
  }, `dealer ${suffix} invite`)
  const setupUrl = new URL(invite.setupUrl)
  const setup = await form('/api/dealer/auth/setup', {
    token:setupUrl.searchParams.get('token'),
    password,
    passwordConfirm:password,
  })
  assert.equal(setup.status, 303, `dealer ${suffix} setup failed`)
  const login = await form('/api/dealer/auth/login', { loginId, password, next:'/dealer/pricing' })
  assert.equal(login.status, 303, `dealer ${suffix} login failed`)
  const cookie = (login.headers.get('set-cookie') || '').split(';')[0]
  assert.match(cookie, /^orimia_dealer_session=/)
  const data = await get('/api/dealer/bootstrap', cookie, `dealer ${suffix} bootstrap`)
  const contract = data.contracts.find(item => item.organizationId === salon.organization.id && item.status === 'ACTIVE')
  assert.ok(contract, `dealer ${suffix} does not have an active salon contract`)
  return { cookie, data, contract, dealer:invite.dealer }
}

async function safePost(path, cookie, body) {
  if (!path || !cookie) return
  try { await postRaw(path, cookie, body) } catch {}
}

const ready = await fetch(`${baseUrl}/api/health/ready?verify=v581`, { cache:'no-store' })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-dealer-contract-pricing'), 'v581')
assert.equal(ready.headers.get('x-lien-admin-chat-read-position'), 'v580')

const unauthorized = await fetch(`${baseUrl}/api/dealer/bootstrap`)
assert.equal(unauthorized.status, 401)

const adminLogin = await form('/api/auth/login', { email:'demo.owner', password:'LienDemo2026!', next:'/admin/products/orders' })
assert.ok([302, 303].includes(adminLogin.status), `admin login failed with ${adminLogin.status}`)
const adminCookie = (adminLogin.headers.get('set-cookie') || '').split(';')[0]
assert.match(adminCookie, /^[^=]+=/)

const salon = await get('/api/admin/wholesale/bootstrap', adminCookie, 'salon bootstrap')
assert.ok(salon.organization?.id)

let dealerA
let dealerB
let productA
let productB
let order

try {
  dealerA = await createDealer(adminCookie, salon, 'A')
  dealerB = await createDealer(adminCookie, salon, 'B')

  productA = (await post('/api/dealer/products', dealerA.cookie, {
    manufacturerName:'ORIMIA PROFESSIONAL',
    name:`契約価格検証シャンプー A ${runId}`,
    category:'シャンプー',
    productCode:`V581-A-${runId}`.toUpperCase(),
    janCode:'4901234567894',
    suggestedRetailPrice:4000,
    orderUnit:2,
    description:'美容室別契約価格の検証商品',
  }, 'create dealer A product')).product

  productB = (await post('/api/dealer/products', dealerB.cookie, {
    manufacturerName:'ORIMIA PROFESSIONAL',
    name:`契約価格検証トリートメント B ${runId}`,
    category:'トリートメント',
    productCode:`V581-B-${runId}`.toUpperCase(),
    janCode:'4901234567895',
    suggestedRetailPrice:3600,
    orderUnit:1,
    description:'N対M連携の検証商品',
  }, 'create dealer B product')).product

  let salonA = await get(`/api/admin/wholesale/bootstrap?dealerId=${encodeURIComponent(dealerA.dealer.id)}`, adminCookie, 'salon A before pricing')
  assert.equal(salonA.catalogProducts.some(item => item.dealerProductId === productA.id), false, 'unconfigured product leaked into salon catalog')

  const prematureOrder = await postRaw('/api/admin/wholesale/orders', adminCookie, {
    dealerId:dealerA.dealer.id,
    lines:[{ dealerProductId:productA.id, quantity:2 }],
  })
  assert.equal(prematureOrder.response.status, 409)
  assert.match(String(prematureOrder.payload.error), /取扱設定した商品/)

  const crossDealerPricing = await postRaw(`/api/dealer/contracts/${encodeURIComponent(dealerA.contract.id)}/product-pricing`, dealerA.cookie, {
    items:[{ dealerProductId:productB.id, enabled:true, discountRate:25 }],
  })
  assert.equal(crossDealerPricing.response.status, 409)
  assert.match(String(crossDealerPricing.payload.error), /設定対象の商品/)

  const configuredA = await post(`/api/dealer/contracts/${encodeURIComponent(dealerA.contract.id)}/product-pricing`, dealerA.cookie, {
    items:[{ dealerProductId:productA.id, enabled:true, discountRate:25 }],
  }, 'configure dealer A pricing')
  assert.equal(configuredA.configuredCount, 1)

  const configuredB = await post(`/api/dealer/contracts/${encodeURIComponent(dealerB.contract.id)}/product-pricing`, dealerB.cookie, {
    items:[{ dealerProductId:productB.id, enabled:true, discountRate:10 }],
  }, 'configure dealer B pricing')
  assert.equal(configuredB.configuredCount, 1)

  salonA = await get(`/api/admin/wholesale/bootstrap?dealerId=${encodeURIComponent(dealerA.dealer.id)}`, adminCookie, 'salon A catalog')
  const catalogA = salonA.catalogProducts.find(item => item.dealerProductId === productA.id)
  assert.ok(catalogA)
  assert.equal(catalogA.dealerName, dealerA.data.dealer.name)
  assert.equal(catalogA.listPrice, 4000)
  assert.equal(catalogA.discountRate, 25)
  assert.equal(catalogA.unitPrice, 3000)
  assert.equal(salonA.catalogProducts.some(item => item.dealerProductId === productB.id), false)

  const salonB = await get(`/api/admin/wholesale/bootstrap?dealerId=${encodeURIComponent(dealerB.dealer.id)}`, adminCookie, 'salon B catalog')
  const catalogB = salonB.catalogProducts.find(item => item.dealerProductId === productB.id)
  assert.ok(catalogB)
  assert.equal(catalogB.listPrice, 3600)
  assert.equal(catalogB.discountRate, 10)
  assert.equal(catalogB.unitPrice, 3240)
  assert.equal(salonB.catalogProducts.some(item => item.dealerProductId === productA.id), false)

  order = (await post('/api/admin/wholesale/orders', adminCookie, {
    dealerId:dealerA.dealer.id,
    salonNote:'契約価格スナップショット検証',
    lines:[{ dealerProductId:productA.id, quantity:2 }],
  }, 'create contracted order')).order
  assert.equal(order.status, 'ORDERED')

  let detail = await get(`/api/dealer/orders/${encodeURIComponent(order.id)}`, dealerA.cookie, 'order snapshot')
  assert.equal(detail.lines.length, 1)
  assert.equal(detail.lines[0].listPrice, 4000)
  assert.equal(detail.lines[0].discountRate, 25)
  assert.equal(detail.lines[0].unitPrice, 3000)
  assert.equal(detail.lines[0].lineTotal, 6000)
  assert.equal(detail.order.totalYen, 6600)

  await post(`/api/dealer/contracts/${encodeURIComponent(dealerA.contract.id)}/product-pricing`, dealerA.cookie, {
    items:[{ dealerProductId:productA.id, enabled:true, discountRate:40 }],
  }, 'update dealer A pricing')
  salonA = await get(`/api/admin/wholesale/bootstrap?dealerId=${encodeURIComponent(dealerA.dealer.id)}`, adminCookie, 'salon A updated catalog')
  assert.equal(salonA.catalogProducts.find(item => item.dealerProductId === productA.id)?.unitPrice, 2400)
  detail = await get(`/api/dealer/orders/${encodeURIComponent(order.id)}`, dealerA.cookie, 'historical order snapshot')
  assert.equal(detail.lines[0].discountRate, 25)
  assert.equal(detail.lines[0].unitPrice, 3000)

  await post(`/api/dealer/contracts/${encodeURIComponent(dealerA.contract.id)}/product-pricing`, dealerA.cookie, {
    items:[{ dealerProductId:productA.id, enabled:false, discountRate:0 }],
  }, 'disable dealer A product')
  salonA = await get(`/api/admin/wholesale/bootstrap?dealerId=${encodeURIComponent(dealerA.dealer.id)}`, adminCookie, 'salon A after disable')
  assert.equal(salonA.catalogProducts.some(item => item.dealerProductId === productA.id), false)
  const staleOrder = await postRaw('/api/admin/wholesale/orders', adminCookie, {
    dealerId:dealerA.dealer.id,
    lines:[{ dealerProductId:productA.id, quantity:2 }],
  })
  assert.equal(staleOrder.response.status, 409)

  console.log(JSON.stringify({
    release:'dealer-contract-pricing-v581',
    manyToManyDealerLinks:true,
    dealerScopedProductOwnership:true,
    configuredProductsOnly:true,
    salonPricingColumns:true,
    serverCalculatedUnitPrice:true,
    historicalPriceSnapshot:true,
    staleOrderRejected:true,
  }))
} finally {
  await safePost(productA ? `/api/dealer/products/${encodeURIComponent(productA.id)}/remove` : '', dealerA?.cookie, { confirmed:true })
  await safePost(productB ? `/api/dealer/products/${encodeURIComponent(productB.id)}/remove` : '', dealerB?.cookie, { confirmed:true })
  await safePost(dealerA ? `/api/dealer/contracts/${encodeURIComponent(dealerA.contract.id)}/remove` : '', dealerA?.cookie, { confirmed:true })
  await safePost(dealerB ? `/api/dealer/contracts/${encodeURIComponent(dealerB.contract.id)}/remove` : '', dealerB?.cookie, { confirmed:true })
}
