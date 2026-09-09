import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { createRequire } from 'node:module'
import { Readable } from 'node:stream'

const require = createRequire('/app/package.json')
const { PrismaClient } = require('@prisma/client')
const {
  createStyleSystemIntegrationService,
  deriveAutoLinks,
  identity,
  syncPostStyle,
} = require('/app/style-system-integration-v602')

if (!process.env.TEST_DATABASE_URL) throw new Error('TEST_DATABASE_URL required')
const schema = `style_system_${randomBytes(6).toString('hex')}`
const bootstrapUrl = new URL(process.env.TEST_DATABASE_URL)
bootstrapUrl.searchParams.set('connection_limit', '2')
const bootstrap = new PrismaClient({ datasources:{ db:{ url:bootstrapUrl.href } } })
await bootstrap.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`)
const testUrl = new URL(bootstrapUrl)
testUrl.searchParams.set('schema', schema)
const db = new PrismaClient({ datasources:{ db:{ url:testUrl.href } } })

let staffSession = { organizationId:'org-a', userId:'owner-a' }
let customerSession = { organizationId:'org-a', customerId:'customer-a' }
const service = createStyleSystemIntegrationService({
  prisma:db,
  staffSessionProvider:async () => staffSession,
  customerSessionProvider:async () => customerSession,
})

async function api({ method = 'GET', audience = 'staff', postId, scope, body, headers }) {
  const query = new URLSearchParams({ audience })
  if (postId !== undefined) query.set('postId', postId)
  if (scope) query.set('scope', scope)
  const chunks = body === undefined ? [] : [Buffer.from(typeof body === 'string' ? body : JSON.stringify(body))]
  const req = Object.assign(Readable.from(chunks), {
    method,
    headers:{ host:'style.test', origin:'http://style.test', ...headers },
    socket:{ encrypted:false },
  })
  const res = {
    statusCode:200,
    headers:{},
    setHeader(name, value) { this.headers[String(name).toLowerCase()] = value },
    end(value) { this.raw = String(value || ''); this.body = this.raw ? JSON.parse(this.raw) : null },
  }
  assert.equal(await service.handle(req, res, new URL(`http://style.test/api/lien-style-system?${query}`)), true)
  return res
}

async function insertPost({ id, organizationId = 'org-a', postKind = 'STORE', published = true, caption = '', metadata = {}, sourceUrl = null }) {
  await db.$executeRawUnsafe(
    `INSERT INTO "VisitCommunityPost"
      ("id","organizationId","postKind","published","caption","publishedByName","styleMetadata","sourceUrl","createdAt","updatedAt")
     VALUES ($1,$2,$3,$4,$5,'投稿担当', $6::jsonb,$7,NOW(),NOW())`,
    id,
    organizationId,
    postKind,
    published,
    caption,
    JSON.stringify(metadata),
    sourceUrl,
  )
}

try {
  for (const sql of [
    `CREATE TABLE "VisitCommunityPost" (
      "id" TEXT PRIMARY KEY,"organizationId" TEXT NOT NULL,"postKind" TEXT NOT NULL DEFAULT 'VISIT',
      "published" BOOLEAN NOT NULL DEFAULT TRUE,"caption" TEXT,"publishedByName" TEXT,
      "styleMetadata" JSONB NOT NULL DEFAULT '{}'::jsonb,"sourceUrl" TEXT,"deletedAt" TIMESTAMP,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),"updatedAt" TIMESTAMP NOT NULL DEFAULT NOW())`,
    `CREATE TABLE "AppUser" (
      "id" TEXT PRIMARY KEY,"organizationId" TEXT,"role" TEXT NOT NULL,"active" BOOLEAN NOT NULL DEFAULT TRUE,
      "email" TEXT NOT NULL,"createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),"updatedAt" TIMESTAMP NOT NULL DEFAULT NOW())`,
    `CREATE TABLE "StaffBookingSetting" (
      "id" TEXT PRIMARY KEY,"organizationId" TEXT NOT NULL,"staffKey" TEXT NOT NULL,"staffName" TEXT NOT NULL,
      "userId" TEXT,"active" BOOLEAN NOT NULL DEFAULT TRUE,"onLeave" BOOLEAN NOT NULL DEFAULT FALSE,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),"updatedAt" TIMESTAMP NOT NULL DEFAULT NOW())`,
    `CREATE TABLE "StaffProfileSetting" (
      "id" TEXT PRIMARY KEY,"organizationId" TEXT NOT NULL,"userId" TEXT NOT NULL,"roleLabel" TEXT,
      "specialties" TEXT,"introduction" TEXT,"profileImageKey" TEXT,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),"updatedAt" TIMESTAMP NOT NULL DEFAULT NOW())`,
    `CREATE TABLE "SalonMenu" (
      "id" TEXT PRIMARY KEY,"organizationId" TEXT NOT NULL,"name" TEXT NOT NULL,"category" TEXT NOT NULL,
      "description" TEXT,"durationMinutes" INTEGER NOT NULL,"priceYen" INTEGER NOT NULL,
      "active" BOOLEAN NOT NULL DEFAULT TRUE,"sortOrder" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),"updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  ]) await db.$executeRawUnsafe(sql)

  await db.$executeRawUnsafe(`INSERT INTO "AppUser" VALUES
    ('user-ame','org-a','ADMIN',TRUE,'ame@example.test',NOW(),NOW()),
    ('user-y1','org-a','STAFF',TRUE,'y1@example.test',NOW(),NOW()),
    ('user-y2','org-a','STAFF',TRUE,'y2@example.test',NOW(),NOW()),
    ('user-away','org-a','STAFF',TRUE,'away@example.test',NOW(),NOW()),
    ('user-secret','org-b','ADMIN',TRUE,'secret@example.test',NOW(),NOW())`)
  await db.$executeRawUnsafe(`INSERT INTO "StaffBookingSetting" VALUES
    ('staff-row-ame','org-a','amemiya','雨宮 透','user-ame',TRUE,FALSE,NOW(),NOW()),
    ('staff-row-y1','org-a','yamada-1','山田 花','user-y1',TRUE,FALSE,NOW(),NOW()),
    ('staff-row-y2','org-a','yamada-2','山田 花','user-y2',TRUE,FALSE,NOW(),NOW()),
    ('staff-row-away','org-a','away','休職 太郎','user-away',TRUE,TRUE,NOW(),NOW()),
    ('staff-row-secret','org-b','secret','秘密 担当','user-secret',TRUE,FALSE,NOW(),NOW())`)
  await db.$executeRawUnsafe(`INSERT INTO "StaffProfileSetting" VALUES
    ('profile-ame','org-a','user-ame','トップスタイリスト','ショート・ボブ','毎日の再現性を大切にしています。','staff/org-a/user-ame.jpg',NOW(),NOW()),
    ('profile-secret','org-b','user-secret','代表','秘密','非公開プロフィール','staff/org-b/secret.jpg',NOW(),NOW())`)
  await db.$executeRawUnsafe(`INSERT INTO "SalonMenu" VALUES
    ('menu-cut','org-a','似合わせカット','カット','骨格に合わせたカット',60,5500,TRUE,1,NOW(),NOW()),
    ('menu-color','org-a','艶カラー','カラー','透明感のあるカラー',90,8800,TRUE,2,NOW(),NOW()),
    ('menu-old','org-a','旧メニュー','その他','現在停止中',30,3000,FALSE,3,NOW(),NOW()),
    ('menu-secret','org-b','秘密メニュー','その他','別店舗限定',30,9999,TRUE,1,NOW(),NOW())`)

  await insertPost({
    id:'post-auto',
    caption:'投稿本文',
    metadata:{
      title:'まとまりショート',
      stylistName:'雨宮　透',
      stylistRole:'取込元の役職',
      stylistComment:'乾かすだけでまとまるように仕上げました。',
      menuDescription:'似合わせカット＋艶カラー',
      stylistPhotoReference:'https://images.example.test/imported.jpg',
      salonName:'掲載元サロン',
      salonArea:'岡山駅前',
    },
    sourceUrl:'https://beauty.hotpepper.jp/slnH000307612/style/L000000001.html',
  })
  await insertPost({ id:'post-ambiguous', metadata:{ title:'曖昧な投稿', stylistName:'山田 花', menuDescription:'秘密メニュー' } })
  await insertPost({ id:'post-private', published:false, metadata:{ title:'非公開スタイル', stylistName:'雨宮 透', menuDescription:'似合わせカット' } })
  await insertPost({ id:'post-foreign', organizationId:'org-b', metadata:{ title:'別店舗', stylistName:'秘密 担当', menuDescription:'秘密メニュー' } })
  await insertPost({ id:'post-visit', postKind:'VISIT', metadata:{ title:'来店投稿' } })

  await service.ensureSchema()
  await service.ensureSchema()
  const backfilled = await db.$queryRawUnsafe('SELECT "id","styleStaffKey","styleMenuIds","styleLinksVersion" FROM "VisitCommunityPost" ORDER BY "id"')
  const byId = Object.fromEntries(backfilled.map(row => [row.id, row]))
  assert.equal(byId['post-auto'].styleStaffKey, 'amemiya')
  assert.deepEqual(byId['post-auto'].styleMenuIds, ['menu-cut', 'menu-color'])
  assert.equal(byId['post-auto'].styleLinksVersion, 1)
  assert.equal(byId['post-ambiguous'].styleStaffKey, null)
  assert.deepEqual(byId['post-ambiguous'].styleMenuIds, [])
  assert.equal(byId['post-visit'].styleLinksVersion, 1)
  assert.deepEqual(deriveAutoLinks(
    { stylistName:'雨宮　透', menuDescription:'似合わせカット / 艶カラー' },
    { staff:[{ key:'amemiya', name:'雨宮 透' }], menus:[{ id:'menu-cut', name:'似合わせカット' }, { id:'menu-color', name:'艶カラー' }] },
  ), { staffKey:'amemiya', menuIds:['menu-cut', 'menu-color'] })
  assert.equal(identity(' 雨宮（透） '), identity('雨宮透'))

  const options = await api({ scope:'options' })
  assert.equal(options.statusCode, 200)
  assert.deepEqual(options.body.options.staff.map(staff => staff.key).sort(), ['amemiya', 'yamada-1', 'yamada-2'])
  assert.deepEqual(options.body.options.menus.map(menu => menu.id), ['menu-cut', 'menu-color'])
  assert.equal(JSON.stringify(options.body).includes('example.test'), false)
  assert.equal(JSON.stringify(options.body).includes('profileImageKey'), false)

  const customer = await api({ audience:'customer', postId:'post-auto' })
  assert.equal(customer.statusCode, 200)
  assert.equal(customer.body.post.style.title, 'まとまりショート')
  assert.equal(customer.body.post.style.stylist.name, '雨宮 透')
  assert.equal(customer.body.post.style.stylist.role, 'トップスタイリスト')
  assert.equal(customer.body.post.style.stylist.specialties, 'ショート・ボブ')
  assert.equal(customer.body.post.style.stylist.avatarUrl, '/api/lien-staff-avatar?staffKey=amemiya&audience=customer')
  assert.deepEqual(customer.body.post.style.menus.map(menu => menu.name), ['似合わせカット', '艶カラー'])
  assert.equal(customer.body.post.style.menus[0].priceYen, 5500)
  assert.equal(customer.body.post.style.comment, '乾かすだけでまとまるように仕上げました。')
  assert.equal(customer.body.options, undefined)
  const customerJson = JSON.stringify(customer.body)
  for (const secret of ['user-ame', 'ame@example.test', 'staff/org-a/user-ame.jpg']) assert.equal(customerJson.includes(secret), false)

  assert.equal((await api({ audience:'customer', postId:'post-private' })).statusCode, 404)
  assert.equal((await api({ audience:'customer', postId:'post-foreign' })).statusCode, 404)
  assert.equal((await api({ audience:'customer', postId:'post-visit' })).statusCode, 404)
  assert.equal((await api({ audience:'customer', scope:'options' })).statusCode, 403)
  assert.equal((await api({ method:'PATCH', audience:'customer', postId:'post-auto', body:{} })).statusCode, 403)

  const edited = await api({
    method:'PATCH',
    postId:'post-auto',
    body:{ styleName:'透明感ボブ', stylistComment:'新しいコメント', staffKey:'', menuIds:['menu-color'] },
  })
  assert.equal(edited.statusCode, 200)
  assert.equal(edited.body.style.title, '透明感ボブ')
  assert.equal(edited.body.style.stylist.linked, false)
  assert.equal(edited.body.style.stylist.name, '雨宮　透')
  assert.deepEqual(edited.body.style.menus.map(menu => menu.id), ['menu-color'])
  assert.equal(edited.body.style.comment, '新しいコメント')

  assert.equal((await api({ method:'PATCH', postId:'post-auto', body:{ styleName:'x', staffKey:'secret', menuIds:[] } })).statusCode, 409)
  assert.equal((await api({ method:'PATCH', postId:'post-auto', body:{ styleName:'x', staffKey:'amemiya', menuIds:['menu-secret'] } })).statusCode, 409)
  assert.equal((await api({ method:'PATCH', postId:'post-auto', body:{ styleName:'x', staffKey:'away', menuIds:[] } })).statusCode, 409)
  assert.equal((await api({ method:'PATCH', postId:'post-auto', body:{ styleName:'x', menuIds:Array.from({ length:13 }, (_, index) => `m${index}`) } })).statusCode, 400)
  assert.equal((await api({ method:'PATCH', postId:'post-auto', body:{ styleName:'x', menuIds:[] }, headers:{ origin:'https://evil.test' } })).statusCode, 403)
  assert.equal((await api({ method:'PATCH', postId:'post-auto', body:{ styleName:'x', menuIds:[] }, headers:{ origin:undefined } })).statusCode, 403)
  assert.equal((await api({ method:'PATCH', postId:'post-auto', body:'{invalid' })).statusCode, 400)
  assert.equal((await api({ method:'PATCH', postId:'post-auto', body:'x'.repeat(25 * 1024) })).statusCode, 413)
  assert.equal((await api({ method:'POST', postId:'post-auto', body:{} })).statusCode, 405)
  assert.equal((await api({ postId:'x'.repeat(221) })).statusCode, 400)

  await insertPost({ id:'post-new', metadata:{ title:'新規', stylistName:'雨宮 透', menuDescription:'似合わせカット' } })
  await syncPostStyle({
    prisma:db,
    organizationId:'org-a',
    postId:'post-new',
    metadata:{ stylistName:'雨宮 透', menuDescription:'似合わせカット' },
  })
  let linked = (await db.$queryRawUnsafe('SELECT "styleStaffKey","styleMenuIds" FROM "VisitCommunityPost" WHERE "id"=$1', 'post-new'))[0]
  assert.equal(linked.styleStaffKey, 'amemiya')
  assert.deepEqual(linked.styleMenuIds, ['menu-cut'])
  await syncPostStyle({ prisma:db, organizationId:'org-a', postId:'post-new', links:{ staffKey:'', menuIds:['menu-color'] } })
  linked = (await db.$queryRawUnsafe('SELECT "styleStaffKey","styleMenuIds" FROM "VisitCommunityPost" WHERE "id"=$1', 'post-new'))[0]
  assert.equal(linked.styleStaffKey, null)
  assert.deepEqual(linked.styleMenuIds, ['menu-color'])

  staffSession = null
  assert.equal((await api({ postId:'post-auto' })).statusCode, 401)
  staffSession = { organizationId:'org-b', userId:'owner-b' }
  assert.equal((await api({ postId:'post-auto' })).statusCode, 404)
  customerSession = null
  assert.equal((await api({ audience:'customer', postId:'post-auto' })).statusCode, 401)

  console.log(JSON.stringify({
    passed:true,
    schemaAndBackfill:true,
    structuredStaffAndMenus:true,
    customerProjection:true,
    tenantIsolation:true,
    safeAutoLinking:true,
    csrfAndValidation:true,
  }))
} finally {
  await db.$disconnect()
  await bootstrap.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`)
  await bootstrap.$disconnect()
}
