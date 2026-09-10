import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { request } = require('playwright-core')
const baseUrl = String(process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3622').replace(/\/$/, '')
const marker = String(process.env.SMOKE_ORDER_MARKER || 'v622-local-regression')
if (!/^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/i.test(baseUrl)) {
  throw new Error('The order persistence regression is restricted to localhost.')
}

const context = await request.newContext()
try {
  const login = await context.post(`${baseUrl}/api/auth/login`, {
    headers: { Origin: baseUrl },
    form: { email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/products/orders' },
  })
  assert.ok(login.ok(), `admin login failed with ${login.status()}`)
  const bootstrap = await context.get(`${baseUrl}/api/admin/wholesale/bootstrap?dealerId=all`)
  assert.ok(bootstrap.ok(), `bootstrap failed with ${bootstrap.status()}`)
  const data = await bootstrap.json()
  const byDealer = new Map()
  for (const product of data.catalogProducts || []) {
    if (!byDealer.has(product.dealerId)) byDealer.set(product.dealerId, product)
  }
  const dealerIds = Array.from(byDealer.keys()).sort()
  assert.ok(dealerIds.length >= 2, 'products from at least two dealers are required')
  const first = byDealer.get(dealerIds[0])
  const second = byDealer.get(dealerIds[1])
  const line = product => ({ dealerProductId: product.dealerProductId, quantity: Number(product.orderUnit || 1) })

  const invalid = await context.post(`${baseUrl}/api/admin/wholesale/orders`, {
    headers: { Origin: baseUrl },
    data: {
      salonNote: `${marker}-rollback`,
      orders: [
        { dealerId: first.dealerId, lines: [line(first)] },
        { dealerId: second.dealerId, lines: [line(first)] },
      ],
    },
  })
  assert.equal(invalid.status(), 409)

  const valid = await context.post(`${baseUrl}/api/admin/wholesale/orders`, {
    headers: { Origin: baseUrl },
    data: {
      salonNote: `${marker}-success`,
      orders: [
        { dealerId: first.dealerId, lines: [line(first)] },
        { dealerId: second.dealerId, lines: [line(second)] },
      ],
    },
  })
  assert.equal(valid.status(), 201)
  const result = await valid.json()
  assert.equal(result.orders.length, 2)
  assert.equal(new Set(result.orders.map(order => order.dealerId)).size, 2)
  assert.ok(result.orders.every(order => order.id && order.orderNo && order.status === 'ORDERED'))
  console.log(JSON.stringify({
    release: 'auto-split-orders-v622',
    marker,
    rollbackResponse: invalid.status(),
    createdOrders: result.orders.map(order => ({ id: order.id, orderNo: order.orderNo, dealerId: order.dealerId })),
  }))
} finally {
  await context.dispose()
}
