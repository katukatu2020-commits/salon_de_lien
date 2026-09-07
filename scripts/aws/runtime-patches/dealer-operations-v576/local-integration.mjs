import assert from 'node:assert/strict'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3153').replace(/\/$/, '')
const runId = Date.now().toString(36)

async function responseJson(response, label) {
  const text = await response.text()
  let payload = {}
  try { payload = text ? JSON.parse(text) : {} } catch {}
  assert.ok(response.ok, `${label} failed with ${response.status}: ${text.slice(0, 500)}`)
  return payload
}

async function form(path, values, cookie = '') {
  return fetch(`${baseUrl}${path}`, {
    method:'POST',
    redirect:'manual',
    headers:{ Origin:baseUrl, 'Content-Type':'application/x-www-form-urlencoded', ...(cookie ? { Cookie:cookie } : {}) },
    body:new URLSearchParams(values),
  })
}

async function postJson(path, cookie, body, label) {
  return responseJson(await fetch(`${baseUrl}${path}`, {
    method:'POST',
    headers:{ Origin:baseUrl, Cookie:cookie, Accept:'application/json', 'Content-Type':'application/json' },
    body:JSON.stringify(body),
  }), label)
}

const ready = await fetch(`${baseUrl}/api/health/ready?verify=v576`, { cache:'no-store' })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-dealer-operations'), 'v576')
assert.equal(ready.headers.get('x-lien-customer-chart-header-actions'), 'v575')

const unauthorized = await fetch(`${baseUrl}/api/dealer/bootstrap`)
assert.equal(unauthorized.status, 401)

const adminLogin = await form('/api/auth/login', { email:'demo.owner', password:'LienDemo2026!', next:'/admin/products/orders' })
assert.ok([302, 303].includes(adminLogin.status), `admin login failed with ${adminLogin.status}`)
const adminCookie = (adminLogin.headers.get('set-cookie') || '').split(';')[0]
assert.match(adminCookie, /^[^=]+=/)

const adminHeaders = { Cookie:adminCookie, Origin:baseUrl, Accept:'application/json' }
let salon = await responseJson(await fetch(`${baseUrl}/api/admin/wholesale/bootstrap`, { headers:adminHeaders }), 'salon bootstrap')
assert.ok(salon.organization?.id)

const loginId = `dealer.v576.${runId}`
const password = `Dealer-V576-${runId}!`
const invite = await postJson('/api/admin/wholesale/invites', adminCookie, {
  dealerName:`V576検証ディーラー ${runId}`,
  loginId,
  email:`${loginId}@example.test`,
  phone:'03-5555-0576',
}, 'dealer invite')
assert.match(invite.setupUrl, /\/dealer\/setup\?token=/)

const setupUrl = new URL(invite.setupUrl)
const setup = await form('/api/dealer/auth/setup', {
  token:setupUrl.searchParams.get('token'),
  password,
  passwordConfirm:password,
})
assert.equal(setup.status, 303)

const dealerLogin = await form('/api/dealer/auth/login', { loginId, password, next:'/dealer/orders' })
assert.equal(dealerLogin.status, 303)
const dealerCookie = (dealerLogin.headers.get('set-cookie') || '').split(';')[0]
assert.match(dealerCookie, /^orimia_dealer_session=/)
const dealerHeaders = { Cookie:dealerCookie, Origin:baseUrl, Accept:'application/json' }

let dealer = await responseJson(await fetch(`${baseUrl}/api/dealer/bootstrap`, { headers:dealerHeaders }), 'dealer bootstrap')
assert.match(dealer.dealer.dealerCode, /^DLR-[A-F0-9]{10}$/)
let contract = dealer.contracts.find(item => item.organizationId === salon.organization.id)
assert.equal(contract?.status, 'ACTIVE')
const salonCode = contract.publicCode || contract.customerCode

await postJson(`/api/dealer/contracts/${encodeURIComponent(contract.id)}/remove`, dealerCookie, { confirmed:true }, 'remove initial contract')
salon = await responseJson(await fetch(`${baseUrl}/api/admin/wholesale/bootstrap?dealerId=${encodeURIComponent(invite.dealer.id)}`, { headers:adminHeaders }), 'salon after removal')
assert.equal(salon.contracts.find(item => item.dealerId === invite.dealer.id)?.status, 'SUSPENDED')

const connection = await postJson('/api/admin/wholesale/contracts/code', adminCookie, { dealerCode:dealer.dealer.dealerCode.toLowerCase() }, 'salon connection request')
assert.equal(connection.contract.status, 'PENDING')
dealer = await responseJson(await fetch(`${baseUrl}/api/dealer/bootstrap`, { headers:dealerHeaders }), 'dealer pending refresh')
contract = dealer.contracts.find(item => item.organizationId === salon.organization.id)
assert.equal(contract.status, 'PENDING')
await postJson(`/api/dealer/contracts/${encodeURIComponent(contract.id)}/approve`, dealerCookie, {}, 'approve salon')

const registeredSalon = await postJson('/api/dealer/contracts', dealerCookie, { salonCode }, 'dealer salon registration')
assert.equal(registeredSalon.contract.status, 'ACTIVE')

const productCode = `V576-${runId}`.toUpperCase()
let createdProduct = await postJson('/api/dealer/products', dealerCookie, {
  manufacturerName:'ORIMIA PROFESSIONAL',
  name:`V576 スカルプシャンプー ${runId}`,
  category:'シャンプー',
  productCode,
  janCode:'4901234567894',
  wholesalePrice:1800,
  suggestedRetailPrice:3300,
  orderUnit:2,
  description:'統合検証用の商品',
}, 'create dealer product')
assert.equal(createdProduct.product.productCode, productCode)

await postJson(`/api/dealer/products/${encodeURIComponent(createdProduct.product.id)}/update`, dealerCookie, {
  manufacturerName:'ORIMIA PROFESSIONAL',
  name:`V576 スカルプシャンプー ${runId}`,
  category:'ヘアケア',
  productCode,
  janCode:'4901234567894',
  wholesalePrice:1850,
  suggestedRetailPrice:3520,
  orderUnit:2,
  description:'更新済みの統合検証用商品',
}, 'update dealer product')

salon = await responseJson(await fetch(`${baseUrl}/api/admin/wholesale/bootstrap?dealerId=${encodeURIComponent(invite.dealer.id)}`, { headers:adminHeaders }), 'linked salon catalog')
assert.equal(salon.selectedDealerId, invite.dealer.id)
const catalogProduct = salon.catalogProducts.find(item => item.dealerProductId === createdProduct.product.id)
assert.ok(catalogProduct, 'dealer catalog product is not visible to the linked salon')
assert.equal(catalogProduct.wholesalePrice, 1850)

const order = await postJson('/api/admin/wholesale/orders', adminCookie, {
  dealerId:invite.dealer.id,
  requestedDeliveryDate:'2026-09-15',
  salonNote:'v576 カタログ発注検証',
  lines:[{ dealerProductId:catalogProduct.dealerProductId, quantity:2 }],
}, 'create catalog order')
assert.equal(order.order.status, 'ORDERED')

let detail = await responseJson(await fetch(`${baseUrl}/api/dealer/orders/${encodeURIComponent(order.order.id)}`, { headers:dealerHeaders }), 'dealer order detail')
assert.equal(detail.lines.length, 1)
assert.equal(detail.lines[0].dealerProductId, catalogProduct.dealerProductId)
assert.equal(Number(detail.lines[0].quantity), 2)

const line = detail.lines[0]
let updated = await postJson(`/api/dealer/orders/${encodeURIComponent(order.order.id)}/status`, dealerCookie, {
  status:'ACCEPTED',
  dealerNote:'受注内容を確認済み',
  lines:[{ id:line.id, productCode, janCode:'4901234567894', unitPrice:1850, deliveredQuantity:2 }],
}, 'accept catalog order')
assert.equal(updated.order.status, 'ACCEPTED')
assert.equal(updated.order.totalYen, 4070)

updated = await postJson(`/api/dealer/orders/${encodeURIComponent(order.order.id)}/status`, dealerCookie, { status:'SHIPPED', dealerNote:'出荷済み' }, 'ship catalog order')
assert.equal(updated.order.status, 'SHIPPED')
assert.match(updated.order.deliveryNo, /^DN-/)

const note = await fetch(`${baseUrl}/dealer/orders/${encodeURIComponent(order.order.id)}/delivery-note`, { headers:dealerHeaders })
assert.equal(note.status, 200)
const noteHtml = await note.text()
assert.match(noteHtml, /納品書/)
assert.match(noteHtml, new RegExp(createdProduct.product.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
assert.match(noteHtml, /4,070円/)

await postJson(`/api/dealer/products/${encodeURIComponent(createdProduct.product.id)}/remove`, dealerCookie, { confirmed:true }, 'remove dealer product')
dealer = await responseJson(await fetch(`${baseUrl}/api/dealer/bootstrap`, { headers:dealerHeaders }), 'dealer after product removal')
assert.equal(dealer.products.find(item => item.id === createdProduct.product.id)?.active, false)
salon = await responseJson(await fetch(`${baseUrl}/api/admin/wholesale/bootstrap?dealerId=${encodeURIComponent(invite.dealer.id)}`, { headers:adminHeaders }), 'salon after product removal')
assert.equal(salon.catalogProducts.some(item => item.dealerProductId === createdProduct.product.id), false)

createdProduct = await postJson('/api/dealer/products', dealerCookie, {
  manufacturerName:'ORIMIA PROFESSIONAL', name:`V576 再登録商品 ${runId}`, category:'ヘアケア', productCode,
  janCode:'4901234567894', wholesalePrice:1850, suggestedRetailPrice:3520, orderUnit:2, description:'再登録検証',
}, 'restore deleted product code')
assert.equal(createdProduct.product.active, true)
await postJson(`/api/dealer/products/${encodeURIComponent(createdProduct.product.id)}/remove`, dealerCookie, { confirmed:true }, 'cleanup dealer product')

dealer = await responseJson(await fetch(`${baseUrl}/api/dealer/bootstrap`, { headers:dealerHeaders }), 'dealer final refresh')
contract = dealer.contracts.find(item => item.organizationId === salon.organization.id)
await postJson(`/api/dealer/contracts/${encodeURIComponent(contract.id)}/remove`, dealerCookie, { confirmed:true }, 'cleanup salon contract')

const historicalNote = await fetch(`${baseUrl}/dealer/orders/${encodeURIComponent(order.order.id)}/delivery-note`, { headers:dealerHeaders })
assert.equal(historicalNote.status, 200)

console.log(JSON.stringify({
  release:'dealer-operations-v576',
  dealerCode:dealer.dealer.dealerCode,
  codeBasedLink:true,
  dealerManagedSalon:true,
  dealerCatalog:true,
  catalogOrdering:true,
  deliveryNo:updated.order.deliveryNo,
  deliveryNoteHistory:true,
  softDelete:true,
}))
