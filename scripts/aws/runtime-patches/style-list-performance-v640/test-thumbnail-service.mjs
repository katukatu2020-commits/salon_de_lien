import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import path from 'node:path'

const runtimeRoot = process.env.LIEN_RUNTIME_ROOT || process.cwd()
const require = createRequire(path.join(runtimeRoot, 'server.js'))
const sharp = require('sharp')
const {
  createStyleListThumbnailService,
  createStyleListThumbnailUrl,
  transformImage,
} = require('./style-list-thumbnail-v640.js')

const secret = 'v640-thumbnail-test-secret-with-sufficient-entropy'
const privateReference = 's3-private://private/style-posts/test/source.png'
const source = await sharp({
  create: {
    width: 900,
    height: 1200,
    channels: 3,
    background: { r: 121, g: 83, b: 72 },
  },
}).png().toBuffer()

function responseCapture() {
  return {
    statusCode: 0,
    headers: {},
    body: undefined,
    setHeader(name, value) {
      this.headers[String(name).toLowerCase()] = String(value)
    },
    end(body) {
      this.body = body
    },
  }
}

let published = true
let sourceLoads = 0
const prisma = {
  async $queryRawUnsafe(_query, postId, organizationId) {
    assert.equal(postId, 'post-v640')
    assert.equal(organizationId, 'org-v640')
    return [{ published, coverReference: privateReference }]
  },
}
const service = createStyleListThumbnailService({
  prisma,
  authSecret: secret,
  sourceLoader: async reference => {
    sourceLoads += 1
    assert.equal(reference, privateReference)
    return source
  },
  transformer: transformImage,
})

const imagePath = createStyleListThumbnailUrl({
  organizationId: 'org-v640',
  postId: 'post-v640',
  audience: 'customer',
  version: '1',
  reference: privateReference,
  secret,
})
assert.match(imagePath, /^\/api\/lien-style-thumbnail-v640\?/)

const first = responseCapture()
assert.equal(await service.handle({ method: 'GET', headers: {} }, first, new URL(imagePath, 'http://local.test')), true)
assert.equal(first.statusCode, 200)
assert.equal(first.headers['content-type'], 'image/webp')
assert.equal(first.headers['x-lien-style-thumbnail'], 'v640')
assert.ok(Buffer.isBuffer(first.body))
assert.ok(first.body.length < 100_000)
assert.deepEqual(
  await sharp(first.body).metadata().then(value => ({ width: value.width, height: value.height, format: value.format })),
  { width: 560, height: 700, format: 'webp' },
)

const second = responseCapture()
await service.handle({ method: 'GET', headers: {} }, second, new URL(imagePath, 'http://local.test'))
assert.equal(second.statusCode, 200)
assert.equal(sourceLoads, 1, 'The transformed thumbnail was not reused from memory')
assert.equal(service.cacheSize(), 1)

const notModified = responseCapture()
await service.handle({ method: 'GET', headers: { 'if-none-match': first.headers.etag } }, notModified, new URL(imagePath, 'http://local.test'))
assert.equal(notModified.statusCode, 304)
assert.equal(notModified.body, undefined)

const tamperedUrl = new URL(imagePath, 'http://local.test')
tamperedUrl.searchParams.set('postId', 'tampered')
const tampered = responseCapture()
await service.handle({ method: 'GET', headers: {} }, tampered, tamperedUrl)
assert.equal(tampered.statusCode, 403)

published = false
const privatePost = responseCapture()
const anotherVersion = createStyleListThumbnailUrl({
  organizationId: 'org-v640',
  postId: 'post-v640',
  audience: 'customer',
  version: '2',
  reference: privateReference,
  secret,
})
await service.handle({ method: 'GET', headers: {} }, privatePost, new URL(anotherVersion, 'http://local.test'))
assert.equal(privatePost.statusCode, 404)

const local = createStyleListThumbnailUrl({
  organizationId: 'org-v640',
  postId: 'post-v640',
  audience: 'customer',
  version: '1',
  reference: '/uploads/example style.png',
  secret,
})
assert.equal(local, '/_next/image?url=%2Fuploads%2Fexample%20style.png&w=640&q=72')

console.log(JSON.stringify({
  release: 'style-list-performance-v640',
  thumbnailBytes: first.body.length,
  dimensions: [560, 700],
  cacheReused: sourceLoads === 1,
  signatureProtected: true,
  unpublishedCustomerImageBlocked: true,
}))
