import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'
import { Readable } from 'node:stream'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const require = createRequire(import.meta.url)
const { createCommunityPublishingService, __test } = require(path.join(root, 'community-publishing-v566.js'))

const photoDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

assert.deepEqual(
  __test.normalizePhotos([
    { direction:'BACK', dataUrl:'back' },
    { direction:'FRONT', dataUrl:'front' },
    { direction:'SIDE', dataUrl:'side' },
  ]),
  [
    { direction:'FRONT', dataUrl:'front' },
    { direction:'SIDE', dataUrl:'side' },
    { direction:'BACK', dataUrl:'back' },
  ],
)
assert.deepEqual(
  __test.normalizePhotos(['one', 'two', 'three', 'four']).map(photo => photo.direction),
  ['FRONT', 'SIDE', 'BACK', 'OTHER'],
)
assert.throws(
  () => __test.normalizePhotos([{ direction:'FRONT', dataUrl:'front' }]),
  /正面・横・後ろ/,
)
assert.throws(
  () => __test.normalizePhotos([
    { direction:'FRONT', dataUrl:'front' },
    { direction:'FRONT', dataUrl:'duplicate' },
    { direction:'BACK', dataUrl:'back' },
  ]),
  /正面・横・後ろ/,
)
assert.equal(__test.sameOrigin({ headers:{ origin:'https://salon-de-lien.com', host:'salon-de-lien.com', 'x-forwarded-proto':'https' } }), true)
assert.equal(__test.sameOrigin({ headers:{ origin:'https://example.com', host:'salon-de-lien.com', 'x-forwarded-proto':'https' } }), false)

function request(body, origin = 'https://salon-de-lien.com') {
  const req = Readable.from([Buffer.from(JSON.stringify(body))])
  req.method = 'POST'
  req.headers = { origin, host:'salon-de-lien.com', 'x-forwarded-proto':'https' }
  return req
}

function response() {
  return {
    statusCode:0,
    headers:{},
    body:'',
    setHeader(name, value) { this.headers[String(name).toLowerCase()] = value },
    end(value = '') { this.body += String(value) },
  }
}

const queries = []
const commands = []
const prisma = {
  async $executeRawUnsafe(sql, ...args) {
    queries.push({ sql, args })
    return 1
  },
}
const service = createCommunityPublishingService({
  prisma,
  crypto,
  sessionProvider:async () => ({
    organizationId:'org-test',
    userId:'user-test',
    role:'ADMIN',
    displayName:'店舗オーナー',
  }),
  s3Client:{ async send(command) { commands.push(command); return {} } },
})

process.env.S3_PRIVATE_ASSETS_BUCKET = 'test-private-assets'
await service.ensureSchema()
assert.match(queries[0].sql, /photoDirections/)

const publishResponse = response()
assert.equal(await service.handle(
  request({
    caption:'3方向スタイル',
    rightsConfirmed:true,
    photos:[
      { direction:'SIDE', dataUrl:photoDataUrl },
      { direction:'BACK', dataUrl:photoDataUrl },
      { direction:'FRONT', dataUrl:photoDataUrl },
    ],
  }),
  publishResponse,
  new URL('https://salon-de-lien.com/api/lien-community-publish'),
), true)
assert.equal(publishResponse.statusCode, 201)
const published = JSON.parse(publishResponse.body)
assert.equal(published.photoCount, 3)
assert.deepEqual(published.directions, ['FRONT', 'SIDE', 'BACK'])
assert.equal(commands.length, 3)
assert.deepEqual(
  commands.map(command => command.input.Metadata.direction),
  ['front', 'side', 'back'],
)
assert.match(commands[0].input.Key, /\/front-/)
assert.match(commands[1].input.Key, /\/side-/)
assert.match(commands[2].input.Key, /\/back-/)
const insert = queries.find(query => /INSERT INTO "VisitCommunityPost"/.test(query.sql))
assert.ok(insert)
assert.deepEqual(JSON.parse(insert.args[4]), ['FRONT', 'SIDE', 'BACK'])

const incompleteResponse = response()
await service.handle(
  request({ rightsConfirmed:true, photos:[{ direction:'FRONT', dataUrl:photoDataUrl }] }),
  incompleteResponse,
  new URL('https://salon-de-lien.com/api/lien-community-publish'),
)
assert.equal(incompleteResponse.statusCode, 400)
assert.match(JSON.parse(incompleteResponse.body).error, /正面・横・後ろ/)

const crossOriginResponse = response()
await service.handle(
  request({ rightsConfirmed:true, photos:[] }, 'https://example.com'),
  crossOriginResponse,
  new URL('https://salon-de-lien.com/api/lien-community-publish'),
)
assert.equal(crossOriginResponse.statusCode, 403)

const unauthorizedService = createCommunityPublishingService({
  prisma,
  crypto,
  sessionProvider:async () => null,
  s3Client:{ async send() { throw new Error('must not upload') } },
})
const unauthorizedResponse = response()
await unauthorizedService.handle(
  request({}),
  unauthorizedResponse,
  new URL('https://salon-de-lien.com/api/lien-community-publish'),
)
assert.equal(unauthorizedResponse.statusCode, 401)

console.log(JSON.stringify({
  release:'style-post-directions-v566',
  directionalValidation:true,
  orderedPersistence:true,
  legacyCompatibility:true,
  originProtection:true,
  authorization:true,
}))
