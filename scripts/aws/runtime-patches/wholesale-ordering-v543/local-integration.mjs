import assert from 'node:assert/strict'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3119').replace(/\/$/, '')
const runId = Date.now().toString(36)

async function responseJson(response, label) {
  const text = await response.text()
  let payload = {}
  try { payload = text ? JSON.parse(text) : {} } catch {}
  assert.ok(response.ok, `${label} failed with ${response.status}: ${text.slice(0, 500)}`)
  return payload
}

const ready = await fetch(`${baseUrl}/api/health/ready?verify=v543`, { headers: { 'Cache-Control': 'no-cache' } })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-wholesale-ordering'), 'v543')
assert.equal(ready.headers.get('x-lien-sales-ledger-staff-multiselect'), 'v542')

const unauthorized = await fetch(`${baseUrl}/api/admin/wholesale/bootstrap`)
assert.equal(unauthorized.status, 401)

const adminLogin = await fetch(`${baseUrl}/api/auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: { Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/products/orders' }),
})
assert.ok([302, 303].includes(adminLogin.status), `admin login failed with ${adminLogin.status}`)
const adminCookie = (adminLogin.headers.get('set-cookie') || '').split(';')[0]
assert.match(adminCookie, /^[^=]+=/)
const adminHeaders = { Cookie: adminCookie, Origin: baseUrl, Accept: 'application/json' }

const adminPage = await fetch(`${baseUrl}/admin/products/orders`, { headers: adminHeaders })
assert.equal(adminPage.status, 200)
const adminHtml = await adminPage.text()
assert.match(adminHtml, /在庫管理・発注/)
assert.match(adminHtml, /wholesale-ordering-client-v543\.js/)

const client = await fetch(`${baseUrl}/wholesale-ordering-client-v543.js?v=543`)
assert.equal(client.status, 200)
assert.match(client.headers.get('content-type') || '', /javascript/)
assert.match(await client.text(), /発注内容を確認/)
const css = await fetch(`${baseUrl}/wholesale-ordering-v543.css?v=543`)
assert.equal(css.status, 200)
assert.match(css.headers.get('content-type') || '', /text\/css/)

let bootstrap = await responseJson(await fetch(`${baseUrl}/api/admin/wholesale/bootstrap`, { headers: adminHeaders }), 'salon bootstrap')
assert.equal(bootstrap.ok, true)
assert.ok(bootstrap.organization?.id)
assert.ok(bootstrap.products.length > 0, 'product fixture is empty')
const product = bootstrap.products[0]

const inventoryNext = Number(product.stockQuantity) + 1
let inventory = await responseJson(await fetch(`${baseUrl}/api/admin/wholesale/inventory`, {
  method: 'POST', headers: { ...adminHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: `v543 integration ${runId}`, items: [{ productId: product.id, quantity: inventoryNext }] }),
}), 'inventory update')
assert.equal(inventory.changed, 1)
inventory = await responseJson(await fetch(`${baseUrl}/api/admin/wholesale/inventory`, {
  method: 'POST', headers: { ...adminHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: `v543 integration restore ${runId}`, items: [{ productId: product.id, quantity: Number(product.stockQuantity) }] }),
}), 'inventory restore')
assert.equal(inventory.changed, 1)

const loginId = `dealer.v543.${runId}`
const invite = await responseJson(await fetch(`${baseUrl}/api/admin/wholesale/invites`, {
  method: 'POST',
  headers: { ...adminHeaders, 'Content-Type': 'application/json' },
  body: JSON.stringify({ dealerName: `V543検証ディーラー ${runId}`, loginId, email: `${loginId}@example.test`, phone: '03-5555-0543' }),
}), 'dealer invite')
assert.equal(invite.ok, true)
assert.match(invite.setupUrl, /\/dealer\/setup\?token=/)

const setupUrl = new URL(invite.setupUrl)
const setupPage = await fetch(`${baseUrl}${setupUrl.pathname}${setupUrl.search}`)
assert.equal(setupPage.status, 200)
assert.match(await setupPage.text(), /ディーラー初期設定/)

const password = `V543-Dealer-${runId}!`
const setup = await fetch(`${baseUrl}/api/dealer/auth/setup`, {
  method: 'POST', redirect: 'manual', headers: { Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ token: setupUrl.searchParams.get('token'), password, passwordConfirm: password }),
})
assert.equal(setup.status, 303)
assert.match(setup.headers.get('location') || '', /setup=complete/)

const dealerLogin = await fetch(`${baseUrl}/api/dealer/auth/login`, {
  method: 'POST', redirect: 'manual', headers: { Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ loginId, password, next: '/dealer/orders' }),
})
assert.equal(dealerLogin.status, 303)
const dealerCookie = (dealerLogin.headers.get('set-cookie') || '').split(';')[0]
assert.match(dealerCookie, /^orimia_dealer_session=/)
const dealerHeaders = { Cookie: dealerCookie, Origin: baseUrl, Accept: 'application/json' }

let dealerBootstrap = await responseJson(await fetch(`${baseUrl}/api/dealer/bootstrap`, { headers: dealerHeaders }), 'dealer bootstrap')
assert.ok(dealerBootstrap.contracts.some(contract => contract.organizationId === bootstrap.organization.id && contract.status === 'ACTIVE'))

bootstrap = await responseJson(await fetch(`${baseUrl}/api/admin/wholesale/bootstrap?dealerId=${encodeURIComponent(invite.dealer.id)}`, { headers: adminHeaders }), 'linked salon bootstrap')
assert.equal(bootstrap.selectedDealerId, invite.dealer.id)

const created = await responseJson(await fetch(`${baseUrl}/api/admin/wholesale/orders`, {
  method: 'POST', headers: { ...adminHeaders, 'Content-Type': 'application/json' },
  body: JSON.stringify({ dealerId: invite.dealer.id, requestedDeliveryDate: '2026-09-12', salonNote: '統合テスト注文', lines: [{ productId: product.id, quantity: 2 }] }),
}), 'create order')
assert.equal(created.order.status, 'ORDERED')

dealerBootstrap = await responseJson(await fetch(`${baseUrl}/api/dealer/bootstrap`, { headers: dealerHeaders }), 'dealer order refresh')
assert.ok(dealerBootstrap.orders.some(order => order.id === created.order.id && order.status === 'ORDERED'))

let detail = await responseJson(await fetch(`${baseUrl}/api/dealer/orders/${encodeURIComponent(created.order.id)}`, { headers: dealerHeaders }), 'order detail')
assert.equal(detail.lines.length, 1)
assert.equal(Number(detail.lines[0].quantity), 2)

const line = detail.lines[0]
const linePayload = [{ id: line.id, productCode: `P-${runId}`, janCode: '4901234567894', unitPrice: 1800, deliveredQuantity: 2 }]
let updated = await responseJson(await fetch(`${baseUrl}/api/dealer/orders/${encodeURIComponent(created.order.id)}/status`, {
  method: 'POST', headers: { ...dealerHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'ACCEPTED', dealerNote: '受注確認済み', lines: linePayload }),
}), 'accept order')
assert.equal(updated.order.status, 'ACCEPTED')
assert.equal(updated.order.totalYen, 3960)

updated = await responseJson(await fetch(`${baseUrl}/api/dealer/orders/${encodeURIComponent(created.order.id)}/status`, {
  method: 'POST', headers: { ...dealerHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'SHIPPED', dealerNote: '出荷済み' }),
}), 'ship order')
assert.equal(updated.order.status, 'SHIPPED')
assert.match(updated.order.deliveryNo, /^DN-/)

const note = await fetch(`${baseUrl}/dealer/orders/${encodeURIComponent(created.order.id)}/delivery-note`, { headers: dealerHeaders })
assert.equal(note.status, 200)
const noteHtml = await note.text()
assert.match(noteHtml, /納品書/)
assert.match(noteHtml, new RegExp(product.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
assert.match(noteHtml, /3,960円/)

updated = await responseJson(await fetch(`${baseUrl}/api/dealer/orders/${encodeURIComponent(created.order.id)}/status`, {
  method: 'POST', headers: { ...dealerHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'DELIVERED', dealerNote: '納品完了' }),
}), 'deliver order')
assert.equal(updated.order.status, 'DELIVERED')

const finalSalon = await responseJson(await fetch(`${baseUrl}/api/admin/wholesale/bootstrap?dealerId=${encodeURIComponent(invite.dealer.id)}`, { headers: adminHeaders }), 'salon history refresh')
assert.ok(finalSalon.orders.some(order => order.id === created.order.id && order.status === 'DELIVERED'))

console.log(JSON.stringify({
  release: 'wholesale-ordering-v543',
  organization: bootstrap.organization.name,
  product: product.name,
  orderNo: created.order.orderNo,
  deliveryNo: updated.order.deliveryNo,
  salonToDealerFlow: true,
  deliveryNote: true,
  inventoryRestore: true,
}))
