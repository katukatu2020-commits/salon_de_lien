import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import crypto from 'node:crypto'
import { Readable } from 'node:stream'
const require = createRequire('/app/package.json')
const { PrismaClient } = require('@prisma/client')
const sharp = require('sharp')
const parser = require('/app/hotpepper-parser-v596')
const { createHotpepperImportService } = require('/app/hotpepper-import-v596')
const { createCommunityPublishingService } = require('/app/community-publishing-v566')
const root = process.env.TEST_DATABASE_URL
if (!root) throw new Error('TEST_DATABASE_URL required')
const schema = 'style_import_' + crypto.randomBytes(6).toString('hex')
const bootstrap = new PrismaClient({ datasources:{ db:{ url:root } } })
await bootstrap.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`)
const url = new URL(root); url.searchParams.set('schema', schema); url.searchParams.set('connection_limit','2')
const db = new PrismaClient({ datasources:{ db:{ url:url.href } } })
const source = 'https://beauty.hotpepper.jp/slnH000307612/style/'
const image = 'https://imgbp.hotp.jp/CSP/IMG_SRC/00/01/B123456789/B123456789.jpg'
const detail = (title = 'Test style') => `<div class="detailTitle">Test salon</div><div id="jsiHoverAlphaLayerScope"><div class="stylePageTileOuter"><h2>${title}</h2></div><ul><li><span id="scc1"><img src="${image}"></span><div class="SV01"></div></li><li><span id="scc2"><img src="${image.replaceAll('B123456789','B123456790')}"></span><div class="SV03"></div></li></ul><div class="styleDtlRightColumn"><div class="titleStyle">スタイリストコメント</div><p>Comment &amp; description</p><div class="dtlStylistName"><a href="/slnH000307612/stylist/T123/">Stylist</a></div><div class="dtlStylistSalon"><p>Area</p></div><div class="titleStyle">メニュー内容</div><dl><dd>Cut + Color</dd></dl><dl><dd>DO NOT IMPORT COUPON</dd></dl></div><div class="rsvStaffWrap"><span class="fgPink">Director</span><div class="wbba"><span class="fgLGray">Kana</span></div></div><div id="jsiCarousel"><img src="${image}"></div></div>`
const list = (ids, next = '') => `<div class="detailTitle">Test salon</div><div id="mainContents">${ids.map(id => `<a href="${source}L${id}.html">Style</a>`).join('')}${next ? `<a href="${next}">next</a>` : ''}</div>`
const session = { organizationId:'tenant-a', userId:'staff-a', role:'ADMIN', displayName:'Importer' }
const objects = new Map()
let failUploads = false
const s3Client = { async send(command) { const input = command.input; if (command.constructor.name === 'DeleteObjectCommand') { objects.delete(input.Key); return {} } if (failUploads) throw new Error('test storage failure'); objects.set(input.Key, input.Body); return {} } }
process.env.S3_PRIVATE_ASSETS_BUCKET = 'test-only'
try {
  await db.$executeRawUnsafe(`CREATE TABLE "VisitCommunityPost" ("id" TEXT PRIMARY KEY,"organizationId" TEXT NOT NULL,"customerId" TEXT,"visitId" TEXT,"published" BOOLEAN NOT NULL,"publishedAt" TIMESTAMP,"createdAt" TIMESTAMP,"updatedAt" TIMESTAMP,"aiCommentDueAt" TIMESTAMP,"aiCommentedAt" TIMESTAMP,"deletedAt" TIMESTAMP)`)
  const publishing = createCommunityPublishingService({ prisma:db, crypto, sessionProvider:async()=>session, s3Client })
  await publishing.ensureSchema()
  const png = await sharp({ create:{ width:16,height:20,channels:3,background:'#548779' } }).png().toBuffer()
  const calls = []
  let transient = true
  const fetchRemote = async (href, kind) => {
    calls.push(href)
    if (kind === 'image') return { buffer:png, type:'image/png' }
    if (href === source) return list([1,2], source+'PN2.html')
    if (href === source+'PN2.html') return list([2,3], source)
    if (href === source+'L3.html' && transient) throw parser.failure('temporary failure',422)
    return detail('Style '+href.split('/').pop()).replace('<div class="dtlStylistName">',`<div class="dtlStylistInfo"><img src="${image}"></div><div class="dtlStylistName">`)
  }
  const service = createHotpepperImportService({ prisma:db, publishing, sessionProvider:async()=>session, fetchRemote })
  await service.ensureSchema()
  for (const bad of ['http://beauty.hotpepper.jp/slnH000307612/style/', 'https://localhost/slnH000307612/style/', 'https://beauty.hotpepper.jp.evil.test/slnH000307612/style/', 'https://user@beauty.hotpepper.jp/slnH000307612/style/', 'https://beauty.hotpepper.jp:444/slnH000307612/style/', 'https://beauty.hotpepper.jp/CSP/my/myPage/']) assert.throws(()=>parser.pageUrl(bad))
  assert.throws(()=>parser.pageUrl(source,'H000000001'))
  assert.throws(()=>parser.imageUrl('https://imgbp.hotp.jp/redirect?url=http://127.0.0.1'))
  assert.throws(()=>parser.imageUrl('http://imgbp.hotp.jp/CSP/IMG_SRC/00/01/B123/B123.jpg'))
  for(const ip of ['127.0.0.1','169.254.169.254','10.0.0.1','172.16.0.1','192.168.0.1','::1','100.64.0.1']) assert.equal(parser.publicIpv4(ip),false)
  assert.equal(parser.publicIpv4('8.8.8.8'),true)
  const parsed = parser.parseDetail(detail(),source+'L1.html')
  assert.deepEqual(parsed.photos.map(p=>p.direction),['FRONT','BACK'])
  assert.equal(parsed.menuDescription,'Cut + Color')
  assert.equal(parsed.stylistRole,'Director')
  assert.equal(parsed.stylistKana,'Kana')
  assert.equal(parsed.stylistComment,'Comment & description')
  assert.throws(()=>parser.parseDetail('<html>Blocked</html>',source+'L1.html'))
  await assert.rejects(service.operate({action:'start',url:source,rightsConfirmed:true},session),/許諾/)
  let job = await service.operate({action:'start',url:source,rightsConfirmed:true,permissionConfirmed:true},session)
  await assert.rejects(service.operate({action:'start',url:source,rightsConfirmed:true,permissionConfirmed:true},session),/前回/)
  const tick = async () => { await db.$executeRawUnsafe(`UPDATE "StyleImportJobV596" SET "data"="data" || '{"nextAt":0}'::jsonb WHERE "organizationId"=$1`, session.organizationId); job = await service.operate({action:'step',jobId:job.id},session); return job }
  for(let n=0;n<8 && job.status==='SCANNING';n++) await tick()
  assert.equal(job.status,'READY'); assert.equal(job.total,3); assert.equal(job.failed,1); assert.equal(job.discoveredPages,2)
  assert.equal(calls.filter(href=>href===source).length,1)
  await assert.rejects(service.operate({action:'publish',jobId:job.id,allReady:true},session),/権限/)
  job = await service.operate({action:'edit',jobId:job.id,index:0,metadata:{...job.items[0].data,title:'Edited style'}},session)
  assert.equal(job.items[0].data.title,'Edited style')
  job = await service.operate({action:'publish',jobId:job.id,rightsConfirmed:true,allReady:true,excluded:[1]},session)
  await tick(); assert.equal(job.status,'DONE'); assert.equal(job.published,1); assert.equal(job.ready,1)
  let posts = await db.$queryRawUnsafe('SELECT * FROM "VisitCommunityPost"')
  assert.equal(posts.length,1); assert.deepEqual(posts[0].photoDirections,['FRONT','BACK']); assert.equal(posts[0].styleMetadata.title,'Edited style'); assert.equal(posts[0].publishedByName,'Importer')
  assert.equal(objects.size,3)
  assert(posts[0].styleMetadata.stylistPhotoReference.startsWith('s3-private://'))
  assert.equal(posts[0].photoReferences.length,2,'portrait must not occupy a style direction')
  await assert.rejects(service.operate({action:'step',jobId:job.id},{...session,organizationId:'tenant-b'}),/更新/)
  transient = false
  job = await service.operate({action:'retry',jobId:job.id},session)
  while(job.status==='SCANNING') await tick()
  assert.equal(job.ready,2)
  job = await service.operate({action:'publish',jobId:job.id,rightsConfirmed:true,allReady:true},session)
  while(job.status==='PUBLISHING') await tick()
  assert.equal(job.published,3); assert.equal(objects.size,9)
  // Recreate the service to exercise a resumed, persisted import, then scan all pages again.
  await db.$executeRawUnsafe(`UPDATE "StyleImportJobV596" SET "data"="data" || '{"startedAt":0}'::jsonb`)
  job = await service.operate({action:'start',url:source,rightsConfirmed:true,permissionConfirmed:true},session)
  while(job.status==='SCANNING') await tick()
  assert.equal(job.duplicate,3); assert.equal(job.ready,0)
  assert.equal((await db.$queryRawUnsafe('SELECT * FROM "VisitCommunityPost"')).length,3)
  const photo = direction => ({ direction, dataUrl:'data:image/png;base64,'+png.toString('base64') })
  await assert.rejects(publishing.savePost({photos:[photo('FRONT')],rightsConfirmed:true},session),/1枚ずつ/)
  const manual = await publishing.savePost({photos:['FRONT','SIDE','BACK'].map(photo),rightsConfirmed:true,metadata:{title:'Manual'}},session)
  assert.equal(manual.photoCount,3)
  const beforeObjects = objects.size; failUploads = true
  await assert.rejects(publishing.savePost({photos:['FRONT','SIDE','BACK'].map(photo),rightsConfirmed:true},session))
  assert.equal(objects.size,beforeObjects); failUploads = false
  const request = (method,body,origin='https://salon-de-lien.com') => Object.assign(Readable.from([Buffer.from(JSON.stringify(body))]),{method,headers:{host:'salon-de-lien.com','x-forwarded-proto':'https',origin}})
  const response = () => ({statusCode:0,setHeader(){},end(value){this.body=JSON.parse(value)}})
  const denied = response(); await service.handle(request('POST',{action:'cancel',jobId:job.id},'https://evil.test'),denied,new URL(endpoint(),source)); assert.equal(denied.statusCode,403)
  const unauthorized = createHotpepperImportService({prisma:db,publishing,sessionProvider:async()=>null,fetchRemote})
  const auth = response(); await unauthorized.handle(request('GET',{}),auth,new URL(endpoint(),source)); assert.equal(auth.statusCode,401)
  const restricted = createHotpepperImportService({prisma:db,publishing,sessionProvider:async()=>session,fetchRemote:async()=>{throw parser.failure('rate limited',429)}})
  job = await service.operate({action:'cancel',jobId:job.id},session)
  await db.$executeRawUnsafe(`UPDATE "StyleImportJobV596" SET "data"="data" || '{"startedAt":0}'::jsonb`)
  job = await restricted.operate({action:'start',url:source,rightsConfirmed:true,permissionConfirmed:true},session)
  job = await restricted.operate({action:'step',jobId:job.id},session)
  assert.equal(job.status,'PAUSED'); assert.match(job.error,/rate limited/)
  console.log(JSON.stringify({parser:true,pagination:true,resume:true,deduplication:true,metadata:true,twoDirections:true,manualThreeDirections:true,tenantIsolation:true,csrf:true,permissionRequired:true,storageRollback:true,rateLimitPause:true}))
} finally {
  await db.$disconnect()
  await bootstrap.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`)
  await bootstrap.$disconnect()
}
function endpoint() { return '/api/lien-hotpepper-styles' }
