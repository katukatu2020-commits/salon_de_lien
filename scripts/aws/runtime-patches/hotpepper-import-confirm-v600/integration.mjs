import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import crypto from 'node:crypto'
import { Readable } from 'node:stream'
const require = createRequire('/app/package.json')
const { PrismaClient } = require('@prisma/client')
const sharp = require('sharp')
const parser = require('/app/hotpepper-parser-v596')
const { createHotpepperImportService } = require('/app/hotpepper-import-v600')
const { createCommunityPublishingService } = require('/app/community-publishing-v566')
if (!process.env.TEST_DATABASE_URL) throw new Error('TEST_DATABASE_URL required')
const schema = 'style_confirm_' + crypto.randomBytes(6).toString('hex')
const bootstrap = new PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL } } })
await bootstrap.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`)
const url = new URL(process.env.TEST_DATABASE_URL); url.searchParams.set('schema', schema); url.searchParams.set('connection_limit', '2')
const db = new PrismaClient({ datasources: { db: { url: url.href } } })
const source = 'https://beauty.hotpepper.jp/slnH000307612/style/'
const image = 'https://imgbp.hotp.jp/CSP/IMG_SRC/00/01/B123456789/B123456789.jpg'
const session = { organizationId: 'tenant-a', userId: 'staff-a', role: 'ADMIN', displayName: 'Importer' }
const objects = new Map(), calls = []
let failUploads = false, transient = true
const s3Client = { async send(command) { const input = command.input; if (command.constructor.name === 'DeleteObjectCommand') { objects.delete(input.Key); return {} } if (failUploads) throw new Error('storage failure'); objects.set(input.Key, input.Body); return {} } }
process.env.S3_PRIVATE_ASSETS_BUCKET = 'test-only'
try {
  await db.$executeRawUnsafe(`CREATE TABLE "VisitCommunityPost" ("id" TEXT PRIMARY KEY,"organizationId" TEXT NOT NULL,"customerId" TEXT,"visitId" TEXT,"published" BOOLEAN NOT NULL,"publishedAt" TIMESTAMP,"createdAt" TIMESTAMP,"updatedAt" TIMESTAMP,"aiCommentDueAt" TIMESTAMP,"aiCommentedAt" TIMESTAMP,"deletedAt" TIMESTAMP)`)
  const publishing = createCommunityPublishingService({ prisma: db, crypto, sessionProvider: async () => session, s3Client })
  await publishing.ensureSchema()
  const png = await sharp({ create: { width: 16, height: 20, channels: 3, background: '#548779' } }).png().toBuffer()
  const list = (ids, next) => `<div class="detailTitle">Test salon</div><div id="mainContents">${ids.map(id => `<a href="${source}L${id}.html">Style</a>`).join('')}${next ? `<a href="${source + next}">next</a>` : ''}</div>`
  const fetchRemote = async (href, kind) => {
    calls.push({ href, kind })
    if (kind === 'image') return { buffer: png, type: 'image/png' }
    if (href === source) return list([1, 2], 'PN2.html')
    if (href === source + 'PN2.html') return list([2, 3])
    if (href === source + 'L3.html' && transient) throw parser.failure('temporary failure', 422)
    return `<div class="detailTitle">Test salon</div><div id="jsiHoverAlphaLayerScope"><div class="stylePageTileOuter"><h2>Style ${href.split('/').pop()}</h2></div><ul><li><span id="scc1"><img src="${image}"></span><div class="SV01"></div></li><li><span id="scc2"><img src="${image.replaceAll('B123456789', 'B123456790')}"></span><div class="SV03"></div></li></ul><div class="styleDtlRightColumn"><div class="titleStyle">スタイリストコメント</div><p>Comment</p><div class="dtlStylistInfo"><img src="${image}"></div><div class="dtlStylistName">Stylist</div><div class="titleStyle">メニュー内容</div><dl><dd>Cut + Color</dd></dl></div></div>`
  }
  const makeService = () => createHotpepperImportService({ prisma: db, publishing, sessionProvider: async () => session, fetchRemote })
  let service = makeService()
  await service.ensureSchema()
  await assert.rejects(service.operate({ action: 'start', url: source }, session), /許可/)
  let job = await service.operate({ action: 'start', url: source, rightsConfirmed: true }, session)
  const tick = async () => { await db.$executeRawUnsafe(`UPDATE "StyleImportJobV596" SET "data"="data" || '{"nextAt":0}'::jsonb WHERE "organizationId"=$1`, session.organizationId); job = await service.operate({ action: 'step', jobId: job.id }, session); return job }
  await tick(); await tick()
  assert.equal(job.status, 'CONFIRMATION'); assert.equal(job.total, 3); assert.equal(job.loaded, 0)
  assert.equal(calls.length, 2); assert.equal(objects.size, 0)
  assert.equal((await db.$queryRawUnsafe('SELECT "id" FROM "VisitCommunityPost"')).length, 0)
  await assert.rejects(service.operate({ action: 'confirm', jobId: job.id, total: 9, rightsConfirmed: true }, session), /件数/)
  await assert.rejects(service.operate({ action: 'confirm', jobId: job.id, total: 3 }, session), /権限/)
  await assert.rejects(service.operate({ action: 'confirm', jobId: job.id, total: 3, rightsConfirmed: true }, { ...session, organizationId: 'tenant-b' }), /更新/)
  job = await service.operate({ action: 'confirm', jobId: job.id, total: 3, rightsConfirmed: true }, session)
  assert.equal(job.status, 'IMPORTING'); assert.ok(job.confirmedAt)
  await tick(); assert.equal(job.published, 1); assert.equal(job.processed, 1)
  failUploads = true; await tick(); failUploads = false
  await tick(); assert.equal(job.status, 'DONE'); assert.equal(job.failed, 2); assert.equal(job.published, 1)
  assert.equal(objects.size, 3, 'Failed uploads leave no additional objects')
  service = makeService(); transient = false
  job = await service.operate({ action: 'retry', jobId: job.id }, session)
  while (job.status === 'IMPORTING') await tick()
  assert.equal(job.published, 3); assert.equal(job.failed, 0); assert.equal(job.processed, 3)
  const posts = await db.$queryRawUnsafe('SELECT * FROM "VisitCommunityPost" ORDER BY "sourceUrl"')
  assert.equal(posts.length, 3); assert.equal(objects.size, 9)
  assert.deepEqual(posts[0].photoDirections, ['FRONT', 'BACK'])
  assert.equal(posts[0].styleMetadata.stylistComment, 'Comment'); assert.equal(posts[0].styleMetadata.menuDescription, 'Cut + Color')
  for (const post of posts) for (const ref of [...post.photoReferences, post.styleMetadata.stylistPhotoReference]) {
    assert.ok(ref.startsWith('s3-private://'))
    const body = objects.get(ref.replace('s3-private://', ''))
    assert.equal((await sharp(body).metadata()).format, 'jpeg')
  }
  await db.$executeRawUnsafe(`UPDATE "StyleImportJobV596" SET "data"="data" || '{"startedAt":0}'::jsonb WHERE "organizationId"=$1`, session.organizationId)
  job = await service.operate({ action: 'start', url: source, rightsConfirmed: true }, session)
  await tick(); await tick(); assert.equal(job.duplicate, 3)
  job = await service.operate({ action: 'confirm', jobId: job.id, total: 3, rightsConfirmed: true }, session)
  assert.equal(job.status, 'DONE'); assert.equal(objects.size, 9)
  const request = headers => Object.assign(Readable.from([Buffer.from(JSON.stringify({ action: 'cancel', jobId: job.id }))]), { method: 'POST', headers })
  const response = () => ({ statusCode: 0, setHeader() {}, end(value) { this.body = JSON.parse(value) } })
  const denied = response()
  await service.handle(request({ host: 'internal', 'x-forwarded-proto': 'http', origin: 'https://evil.test' }), denied, new URL('https://salon-de-lien.com/api/lien-hotpepper-styles'))
  assert.equal(denied.statusCode, 403)
  const allowed = response()
  await service.handle(request({ host: 'internal', 'x-forwarded-proto': 'http', 'cloudfront-forwarded-proto': 'https', origin: 'https://salon-de-lien.com' }), allowed, new URL('https://salon-de-lien.com/api/lien-hotpepper-styles'))
  assert.equal(allowed.statusCode, 200)
  assert.equal(allowed.body.job.status, 'CANCELLED')
  console.log(JSON.stringify({ preflightWithoutImages: true, confirmationRequired: true, countValidation: true, autoSave: true, progress: true, durableResume: true, retry: true, storageVerified: true, deduplication: true, tenantIsolation: true, csrf: true, cloudFront: true }))
} finally {
  await db.$disconnect()
  await bootstrap.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`)
  await bootstrap.$disconnect()
}
