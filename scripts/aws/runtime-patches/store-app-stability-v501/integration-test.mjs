import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3106').replace(/\/$/, '')
const imagePath = process.env.TEST_IMAGE_PATH
assert.ok(imagePath, 'TEST_IMAGE_PATH is required')

const image = fs.readFileSync(imagePath)
const imageDataUrl = `data:image/png;base64,${image.toString('base64')}`
const suffix = crypto.randomUUID().replaceAll('-', '').slice(0, 10)
const productName = `V501 image upload ${suffix}`

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: { Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/products' }),
})
assert.equal(login.status, 303)
const cookie = (login.headers.get('set-cookie') || '').split(';')[0]
assert.match(cookie, /^[^=]+=/)

const headers = {
  Origin: baseUrl,
  cookie,
  Accept: 'application/json',
  'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
}

let productId = ''
try {
  const create = await fetch(`${baseUrl}/api/admin/catalog`, {
    method: 'POST',
    headers,
    body: new URLSearchParams({
      kind: 'product',
      action: 'create',
      manufacturerName: 'ORIMIA QA',
      name: productName,
      category: 'その他',
      retailPrice: '1234',
      stockQuantity: '1',
      imageDataUrl,
      concernTags: 'QA',
      description: 'V501 image upload verification',
      alternativeRecommendation: '',
    }),
  })
  const createPayload = await create.json()
  assert.ok(create.ok, createPayload.error || `create failed: ${create.status}`)
  assert.equal(createPayload.ok, true)
  productId = String(createPayload.result?.id || '')
  assert.ok(productId)

  const images = await fetch(`${baseUrl}/api/admin/catalog/product-images`, {
    headers: { cookie, Accept: 'application/json', 'Cache-Control': 'no-cache' },
  })
  assert.equal(images.status, 200)
  const imagePayload = await images.json()
  const stored = imagePayload.images?.find(item => item.id === productId)
  assert.ok(stored, 'created product image is absent from the image catalog')
  const storedImageUrl = String(stored.imageUrl || '')
  let storedBytes
  let storageMode
  if (storedImageUrl.startsWith('data:image/')) {
    const match = storedImageUrl.match(/^data:image\/[a-z0-9.+-]+;base64,(.+)$/i)
    assert.ok(match, 'stored product image data URL is malformed')
    storedBytes = Buffer.from(match[1], 'base64')
    storageMode = 'data-url'
  } else {
    assert.ok(
      /^\/api\/admin\/catalog\/product-image\//.test(storedImageUrl),
      `unexpected product image URL: ${storedImageUrl.slice(0, 100)}`,
    )
    const storedImage = await fetch(`${baseUrl}${storedImageUrl}`, {
      headers: { cookie, Accept: 'image/*', 'Cache-Control': 'no-cache' },
    })
    assert.equal(storedImage.status, 200)
    assert.match(storedImage.headers.get('content-type') || '', /^image\//)
    storedBytes = Buffer.from(await storedImage.arrayBuffer())
    storageMode = 'endpoint'
  }
  assert.ok(storedBytes.length > 100)
  assert.deepEqual(storedBytes, image)

  console.log(JSON.stringify({ created: true, imageCatalog: true, imageBytes: storedBytes.length, storageMode }))
} finally {
  if (productId) {
    const remove = await fetch(`${baseUrl}/api/admin/catalog`, {
      method: 'POST',
      headers,
      body: new URLSearchParams({ kind: 'product', action: 'delete', productId }),
    })
    const removePayload = await remove.json().catch(() => ({}))
    assert.ok(remove.ok && removePayload.ok, removePayload.error || `cleanup failed: ${remove.status}`)
  }
}
