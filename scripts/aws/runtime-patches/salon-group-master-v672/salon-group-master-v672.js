'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { passwordHash, verifyPassword } = require('./business-account-approvals-v643')
const { renderMaster } = require('./salon-group-master-v672-page')
const RELEASE = 'salon-group-master-v672'
const PREFIX = '/api/admin/salon-master'
const PREFECTURES = '北海道 青森県 岩手県 宮城県 秋田県 山形県 福島県 茨城県 栃木県 群馬県 埼玉県 千葉県 東京都 神奈川県 新潟県 富山県 石川県 福井県 山梨県 長野県 岐阜県 静岡県 愛知県 三重県 滋賀県 京都府 大阪府 兵庫県 奈良県 和歌山県 鳥取県 島根県 岡山県 広島県 山口県 徳島県 香川県 愛媛県 高知県 福岡県 佐賀県 長崎県 熊本県 大分県 宮崎県 鹿児島県 沖縄県'.split(' ')
const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode })
const clean = (value, max, required = true) => {
  const result = String(value || '').trim()
  if ((required && !result) || result.length > max || /[\u0000-\u001f]/.test(result)) throw fail('入力内容を確認してください。')
  return result
}
function monthRange(value) {
  const month = value || new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit' }).format(new Date())
  if (!/^(20\d{2})-(0[1-9]|1[0-2])$/.test(month)) throw fail('集計月を確認してください。')
  const [y, m] = month.split('-').map(Number)
  const date = delta => new Date(Date.UTC(y, m - 1 + delta, 1, -9))
  return { month, start: date(0), end: date(1), previous: date(-1), trendStart: date(-11) }
}
function json(res, code, data) {
  res.statusCode = code
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(data, (_, value) => typeof value === 'bigint' ? Number(value) : value))
}
async function readBody(req) {
  let body = ''
  for await (const chunk of req) {
    body += chunk
    if (Buffer.byteLength(body) > 16384) throw fail('入力内容が長すぎます。', 413)
  }
  try { const value = JSON.parse(body); if (!value || Array.isArray(value) || typeof value !== 'object') throw Error(); return value } catch { throw fail('入力内容を確認してください。') }
}
function sameOrigin(req) {
  try {
    const host = String(req.headers['x-forwarded-host'] || req.headers.host).split(',')[0].trim()
    const protocol = String(req.headers['x-forwarded-proto'] || (req.socket?.encrypted ? 'https' : 'http')).split(',')[0].trim()
    const expected = process.env.APP_URL ? new URL(process.env.APP_URL).origin : protocol + '://' + host
    return req.headers.origin === expected && req.headers['sec-fetch-site'] !== 'cross-site'
  } catch { return false }
}

function createSalonGroupMaster({ prisma, crypto, sessionProvider, mailSender }) {
  let schemaPromise
  const attempts = new Map()
  async function ensureSchema() {
    if (!schemaPromise) schemaPromise = prisma.$transaction(async tx => {
      await tx.$queryRawUnsafe("SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext('salon_group_schema_v672'))) guard")
      for (const sql of fs.readFileSync(path.join(__dirname, 'salon-group-master-v672.sql'), 'utf8').split(';').map(x => x.trim()).filter(Boolean)) await tx.$executeRawUnsafe(sql)
    }).catch(error => { schemaPromise = null; throw error })
    return schemaPromise
  }
  async function context(session, db = prisma) {
    if (!session?.userId || session.role !== 'ADMIN' || session.isSharedStoreAccount) throw fail('サロン管理者でログインしてください。', 403)
    const rows = await db.$queryRawUnsafe(`SELECT u."id",u."email",u."displayName",u."organizationId",o."name",b."planKey",p."displayName" AS "planName",p."monthlyAmount",
      g."id" AS "groupId",g."name" AS "groupName",g."ownerUserId"
      FROM "AppUser" u JOIN "Organization" o ON o."id"=u."organizationId"
      LEFT JOIN "OrganizationBilling" b ON b."organizationId"=o."id"
      LEFT JOIN "BillingPlan" p ON p."planKey"=b."planKey"
      LEFT JOIN "SalonGroupStore" s ON s."organizationId"=o."id"
      LEFT JOIN "SalonGroup" g ON g."id"=s."groupId"
      WHERE u."id"=$1 AND u."organizationId"=$2 AND u."role"::text='ADMIN' AND u."active"=TRUE
      AND COALESCE(b."subscriptionStatus",'active')<>'paused'
      AND NOT EXISTS (SELECT 1 FROM "BusinessAccountControl" c WHERE c."accountType"='SALON' AND c."targetId"=o."id" AND c."status"='SUSPENDED')
      AND NOT EXISTS (SELECT 1 FROM "ManagedBusinessAccess" a WHERE a."accountType"='SALON' AND a."principalId"=u."id" AND (a."accessStatus"='SUSPENDED' OR a."mustChangePassword"=TRUE))`, session.userId, session.organizationId)
    const row = rows[0]
    if (!row) throw fail('このアカウントでは操作できません。', 403)
    if (row.groupId && row.ownerUserId !== row.id) throw fail('系列店マスタの管理者アカウントでログインしてください。', 403)
    return row
  }
  async function ensureGroup(tx, session) {
    await tx.$queryRawUnsafe("SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext('salon_group_membership_v672'))) guard")
    const viewer = await context(session, tx)
    if (viewer.groupId) return viewer
    const id = 'sg_' + crypto.randomUUID()
    await tx.$executeRawUnsafe('INSERT INTO "SalonGroup" ("id","name","ownerUserId","homeOrganizationId") VALUES ($1,$2,$3,$4)', id, viewer.name, viewer.id, viewer.organizationId)
    await tx.$executeRawUnsafe('INSERT INTO "SalonGroupStore" ("organizationId","groupId","createdBy") VALUES ($1,$2,$3)', viewer.organizationId, id, viewer.id)
    return { ...viewer, groupId: id, groupName: viewer.name }
  }
  async function dashboard(session, params) {
    const viewer = await context(session)
    const range = monthRange(params.get('month'))
    const stores = await prisma.$queryRawUnsafe(`SELECT o."id",o."name",o."publicCode",sp."prefecture",sp."city",sp."phone",
      COALESCE(sp."orimiaPublished",TRUE) AS "published",
      CASE WHEN c."status"='SUSPENDED' OR b."subscriptionStatus"='paused' THEN 'SUSPENDED' ELSE 'ACTIVE' END AS "status",
      p."displayName" AS "planName",u."loginId"
      FROM "Organization" o
      LEFT JOIN "OrganizationStoreProfile" sp ON sp."organizationId"=o."id"
      LEFT JOIN "OrganizationBilling" b ON b."organizationId"=o."id"
      LEFT JOIN "BillingPlan" p ON p."planKey"=b."planKey"
      LEFT JOIN "BusinessAccountControl" c ON c."accountType"='SALON' AND c."targetId"=o."id"
      LEFT JOIN LATERAL (SELECT "loginId" FROM "AppUser" WHERE "organizationId"=o."id" AND "role"::text='ADMIN' ORDER BY "createdAt","id" LIMIT 1) u ON TRUE
      WHERE ($1::text IS NULL AND o."id"=$2) OR EXISTS (SELECT 1 FROM "SalonGroupStore" gs WHERE gs."groupId"=$1 AND gs."organizationId"=o."id")
      ORDER BY o."createdAt",o."id"`, viewer.groupId, viewer.organizationId)
    const selected = params.get('store') || ''
    if (selected && !stores.some(s => s.id === selected)) throw fail('店舗が見つかりません。', 404)
    const ids = JSON.stringify(stores.filter(s => !selected || s.id === selected).map(s => s.id))
    // Prisma timestamps are UTC without time zone. Bounds are explicit UTC instants; bucket in JST once.
    const sales = await prisma.$queryRawUnsafe(`SELECT c."organizationId",to_char(s."paidAt" + interval '9 hours','YYYY-MM') AS "month",SUM(s."amount")::bigint AS "amount",COUNT(*)::int AS "count"
      FROM "ServiceSale" s JOIN "Customer" c ON c."id"=s."customerId"
      WHERE c."organizationId" IN (SELECT jsonb_array_elements_text($1::jsonb)) AND c."deletedAt" IS NULL
      AND s."paidAt">=$2::timestamptz AT TIME ZONE 'UTC' AND s."paidAt"<$3::timestamptz AT TIME ZONE 'UTC'
      GROUP BY c."organizationId",to_char(s."paidAt" + interval '9 hours','YYYY-MM')`, ids, range.trendStart, range.end)
    const operations = await prisma.$queryRawUnsafe(`SELECT o."id",
      (SELECT COUNT(*)::int FROM "Customer" c WHERE c."organizationId"=o."id" AND c."deletedAt" IS NULL AND c."storeHiddenAt" IS NULL) AS "customers",
      (SELECT COUNT(*)::int FROM "StaffBookingSetting" s WHERE s."organizationId"=o."id" AND s."active"=TRUE) AS "staff",
      (SELECT COUNT(*)::int FROM "Appointment" a JOIN "Customer" c ON c."id"=a."customerId" WHERE c."organizationId"=o."id" AND c."deletedAt" IS NULL AND a."scheduledAt">=$2::timestamptz AT TIME ZONE 'UTC' AND a."scheduledAt"<$3::timestamptz AT TIME ZONE 'UTC' AND COALESCE(a."status",'') NOT IN ('キャンセル','キャンセル済み','取消','cancelled','canceled','CANCELLED','CANCELED')) AS "bookings"
      FROM "Organization" o WHERE o."id" IN (SELECT jsonb_array_elements_text($1::jsonb))`, ids, range.start, range.end)
    const previousMonth = new Date(range.previous.getTime() + 9 * 3600000).toISOString().slice(0, 7)
    const trend = Array.from({ length: 12 }, (_, i) => {
      const date = new Date(range.trendStart.getTime() + 9 * 3600000)
      date.setUTCMonth(date.getUTCMonth() + i)
      const month = date.toISOString().slice(0, 7)
      return { month, amount: sales.filter(s => s.month === month).reduce((n, s) => n + Number(s.amount), 0) }
    })
    const rows = stores.filter(s => !selected || s.id === selected).map(store => {
      const current = sales.find(s => s.organizationId === store.id && s.month === range.month)
      const previous = sales.find(s => s.organizationId === store.id && s.month === previousMonth)
      return { ...store, ...operations.find(o => o.id === store.id), revenue: Number(current?.amount || 0), previousRevenue: Number(previous?.amount || 0), saleCount: current?.count || 0 }
    })
    const sum = field => rows.reduce((n, s) => n + Number(s[field] || 0), 0)
    return { groupName: viewer.groupName || viewer.name, currentOrganizationId: viewer.organizationId, month: range.month, selectedStore: selected, stores, rows, trend,
      plan: { key: viewer.planKey, name: viewer.planName, monthlyAmount: Number(viewer.monthlyAmount || 0) },
      summary: { storeCount: rows.length, activeStores: rows.filter(s => s.status === 'ACTIVE').length, publishedStores: rows.filter(s => s.published).length, revenue: sum('revenue'), previousRevenue: sum('previousRevenue'), saleCount: sum('saleCount'), customers: sum('customers'), staff: sum('staff'), bookings: sum('bookings') } }
  }
  async function record(tx, viewer, orgId, action, key) {
    await tx.$executeRawUnsafe('INSERT INTO "SalonGroupAction" ("id","groupId","actorId","organizationId","action","requestKey") VALUES ($1,$2,$3,$4,$5,$6)', crypto.randomUUID(), viewer.groupId, viewer.id, orgId, action, key)
  }
  async function createStore(session, input) {
    const name = clean(input.name, 100), ownerName = clean(input.ownerName, 80), email = clean(input.email, 254).toLowerCase()
    const phone = clean(input.phone, 24), prefecture = clean(input.prefecture, 10), city = clean(input.city, 80), address = clean(input.address, 200)
    const requestKey = clean(input.requestKey, 80)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^[0-9+() -]{10,24}$/.test(phone) || !PREFECTURES.includes(prefecture) || input.confirmed !== true || !/^[a-zA-Z0-9-]{16,80}$/.test(requestKey)) throw fail('所在地・連絡先・登録の確認を確認してください。')
    const password = 'A!' + crypto.randomBytes(15).toString('base64url')
    const hash = passwordHash(crypto, password)
    const result = await prisma.$transaction(async tx => {
      const viewer = await ensureGroup(tx, session)
      const replay = await tx.$queryRawUnsafe(`SELECT a."organizationId",u."loginId" FROM "SalonGroupAction" a JOIN "AppUser" u ON u."organizationId"=a."organizationId" AND u."role"::text='ADMIN' WHERE a."actorId"=$1 AND a."requestKey"=$2 AND a."action"='CREATE' LIMIT 1`, viewer.id, requestKey)
      if (replay[0]) return { ...replay[0], alreadyCreated: true }
      await tx.$queryRawUnsafe("SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext('business_account_approval_v643'))) guard")
      const existing = await tx.$queryRawUnsafe('SELECT "id" FROM "AppUser" WHERE LOWER("email")=$1 LIMIT 1', email)
      if (existing.length) throw fail('このメールアドレスは登録済みです。新店舗用の別のメールアドレスを入力してください。', 409)
      const plans = await tx.$queryRawUnsafe('SELECT "planKey","monthlyAmount" FROM "BillingPlan" WHERE "planKey"=$1 AND "active"=TRUE', viewer.planKey)
      if (!plans[0]) throw fail('契約プランを確認できません。運営にお問い合わせください。', 409)
      if (input.planKey !== plans[0].planKey || Number(input.monthlyAmount) !== Number(plans[0].monthlyAmount)) throw fail('契約プランが更新されています。画面を再読み込みしてください。', 409)
      const orgId = 'org_' + crypto.randomUUID(), userId = 'usr_' + crypto.randomUUID(), inquiryId = 'group_' + crypto.randomUUID()
      const loginId = 'salon-' + crypto.randomBytes(8).toString('hex')
      const publicCode = 'STORE-' + crypto.randomBytes(5).toString('hex').toUpperCase()
      await tx.$executeRawUnsafe('INSERT INTO "Organization" ("id","slug","name","publicCode","createdAt","updatedAt") VALUES ($1,$2,$3,$4,NOW(),NOW())', orgId, 'branch-' + crypto.randomBytes(10).toString('hex'), name, publicCode)
      await tx.$executeRawUnsafe(`INSERT INTO "AppUser" ("id","organizationId","email","loginId","displayName","passwordHash","role","active","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,'ADMIN',TRUE,NOW(),NOW())`, userId, orgId, email, loginId, ownerName, hash)
      await tx.$executeRawUnsafe(`INSERT INTO "OrganizationBilling" ("organizationId","planKey","onboardingStatus","subscriptionStatus","billingRequiredAt","createdAt","updatedAt") VALUES ($1,$2,'BANK_DEBIT_MANAGED','active',NOW(),NOW(),NOW())`, orgId, viewer.planKey)
      await tx.$executeRawUnsafe(`INSERT INTO "OrganizationStoreProfile" ("organizationId","ownerName","phone","prefecture","city","addressLine1","orimiaPublished") VALUES ($1,$2,$3,$4,$5,$6,FALSE)`, orgId, ownerName, phone, prefecture, city, address)
      await tx.$executeRawUnsafe('INSERT INTO "SalonGroupStore" ("organizationId","groupId","createdBy") VALUES ($1,$2,$3)', orgId, viewer.groupId, viewer.id)
      await tx.$executeRawUnsafe(`INSERT INTO "BusinessInquiry" ("id","requestKey","audience","organizationName","contactName","email","phone","preferredContact","message","sourcePath","status","operatorNote") VALUES ($1,$1,'salon',$2,$3,$4,$5,'email',$6,'/admin/salon-master','closed',$7)`, inquiryId, name, ownerName, email, phone, '系列店マスタからの新店舗登録', '系列店管理者による登録: ' + viewer.id)
      await tx.$executeRawUnsafe(`INSERT INTO "ManagedBusinessAccess" ("id","inquiryId","accountType","targetId","principalId","accountName","loginId","contactEmail","approvedBy") VALUES ($1,$2,'SALON',$3,$4,$5,$6,$7,$8)`, 'mba_' + crypto.randomUUID(), inquiryId, orgId, userId, name, loginId, email, viewer.email)
      await tx.$executeRawUnsafe(`INSERT INTO "ManagedAccountIssue" ("id","accountType","targetId","accountName","loginId","contactEmail","operatorEmail") VALUES ($1,'SALON',$2,$3,$4,$5,$6)`, crypto.randomUUID(), orgId, name, loginId, email, viewer.email)
      await record(tx, viewer, orgId, 'CREATE', requestKey)
      return { organizationId: orgId, loginId, name, email, publicCode }
    }, { timeout: 20000 })
    if (result.alreadyCreated) return result
    let emailSent = false
    try {
      if (!mailSender) throw Error('Mailer unavailable')
      const loginUrl = new URL('/admin/login', process.env.APP_URL || 'https://salon-de-lien.com').href
      const textBody = `${result.name} の店舗アカウントを系列店マスタから登録しました。\n\nログインID: ${result.loginId}\n初期パスワード: ${password}\nログイン: ${loginUrl}\n\n初回ログイン時にパスワードを変更してください。ORIMIA店舗一覧への掲載は非公開で開始します。系列店全体のマスタは登録元の管理者アカウントからご利用ください。`
      await mailSender({ to: email, subject: '【ORIMIA】新店舗アカウントのご案内', textBody, htmlBody: '<p>' + textBody.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])).replace(/\n/g, '<br>') + '</p>' }, { fetchImpl: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(15000) }) })
      emailSent = true
    } catch { console.error('[salon-group-master-v672] branch credential mail failed') }
    await prisma.$executeRawUnsafe(`UPDATE "ManagedBusinessAccess" SET "approvalMailStatus"=$2,"approvalMailSentAt"=CASE WHEN $2='SENT' THEN NOW() ELSE NULL END,"approvalMailError"=CASE WHEN $2='FAILED' THEN '初期情報メールの送信に失敗しました。' ELSE NULL END WHERE "accountType"='SALON' AND "targetId"=$1`, result.organizationId, emailSent ? 'SENT' : 'FAILED')
      .catch(() => console.error('[salon-group-master-v672] credential mail status update failed'))
    return { ...result, initialPassword: password, emailSent }
  }
  async function linkStore(session, input) {
    const loginId = clean(input.loginId, 160).toLowerCase(), password = String(input.password || '')
    if (password.length > 128) throw fail('認証情報を確認してください。')
    const now = Date.now(), key = session.userId
    for (const [id, item] of attempts) if (item.until < now) attempts.delete(id)
    const attempt = attempts.get(key) || { count: 0, until: now + 15 * 60000 }
    if (++attempt.count > 5) throw fail('認証を繰り返しています。15分後にお試しください。', 429)
    attempts.set(key, attempt)
    return prisma.$transaction(async tx => {
      const viewer = await ensureGroup(tx, session)
      const rows = await tx.$queryRawUnsafe(`SELECT u."id",u."organizationId",u."passwordHash",o."name" FROM "AppUser" u JOIN "Organization" o ON o."id"=u."organizationId" WHERE LOWER(u."loginId")=$1 AND u."active"=TRUE AND u."role"::text='ADMIN' FOR UPDATE OF u`, loginId)
      const target = rows[0]
      if (rows.length !== 1 || !verifyPassword(crypto, password, target.passwordHash)) throw fail('店舗管理者のIDとパスワードを確認してください。', 400)
      const blocked = await tx.$queryRawUnsafe(`SELECT 1 FROM "BusinessAccountControl" WHERE "accountType"='SALON' AND "targetId"=$1 AND "status"='SUSPENDED' UNION ALL SELECT 1 FROM "ManagedBusinessAccess" WHERE "principalId"=$2 AND ("accessStatus"='SUSPENDED' OR "mustChangePassword"=TRUE) UNION ALL SELECT 1 FROM "OrganizationBilling" WHERE "organizationId"=$1 AND "subscriptionStatus"='paused'`, target.organizationId, target.id)
      if (blocked.length) throw fail('対象店舗の利用状況・初回パスワード変更を確認してください。', 409)
      const memberships = await tx.$queryRawUnsafe('SELECT "groupId" FROM "SalonGroupStore" WHERE "organizationId"=$1', target.organizationId)
      if (memberships[0]?.groupId === viewer.groupId) return { alreadyLinked: true, name: target.name }
      if (memberships.length) throw fail('この店舗は別の系列店マスタに所属しています。運営にお問い合わせください。', 409)
      await tx.$executeRawUnsafe('INSERT INTO "SalonGroupStore" ("organizationId","groupId","createdBy") VALUES ($1,$2,$3)', target.organizationId, viewer.groupId, viewer.id)
      await record(tx, viewer, target.organizationId, 'LINK', crypto.randomUUID())
      attempts.delete(key)
      return { name: target.name }
    }, { timeout: 20000 })
  }
  async function handle(req, res, url) {
    const assets = { '/salon-group-master-v672.css': ['salon-group-master-v672.css', 'text/css'], '/salon-group-master-v672-client.js': ['salon-group-master-v672-client.js', 'application/javascript'] }
    if (assets[url.pathname] && ['GET', 'HEAD'].includes(req.method)) {
      const [file, mime] = assets[url.pathname]
      res.setHeader('Content-Type', mime + '; charset=utf-8'); res.setHeader('Cache-Control', 'public, max-age=3600')
      res.end(req.method === 'HEAD' ? '' : fs.readFileSync(path.join(__dirname, file))); return true
    }
    const page = url.pathname === '/admin/salon-master'
    if (!page && !url.pathname.startsWith(PREFIX)) return false
    res.setHeader('Cache-Control', 'private, no-store, max-age=0')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Referrer-Policy', 'same-origin')
    res.setHeader('X-Robots-Tag', 'noindex, nofollow')
    try {
      const session = await sessionProvider(req)
      if (!session) {
        if (page) { res.statusCode = 302; res.setHeader('Location', '/admin/login'); res.end() }
        else json(res, 401, { error: 'ログインしてください。' })
        return true
      }
      if (!['GET', 'HEAD', 'POST'].includes(req.method) || page && req.method === 'POST') { res.setHeader('Allow', 'GET, HEAD'); throw fail('この操作は利用できません。', 405) }
      await ensureSchema()
      await context(session)
      if (req.method === 'POST') {
        if (!sameOrigin(req)) throw fail('画面を再読み込みしてお試しください。', 403)
        const input = await readBody(req)
        if (url.pathname === PREFIX + '/stores') json(res, 201, await createStore(session, input))
        else if (url.pathname === PREFIX + '/link') json(res, 200, await linkStore(session, input))
        else throw fail('ページが見つかりません。', 404)
      } else if (url.pathname === PREFIX + '/access') json(res, 200, { canAccess: true })
      else if (page) {
        const data = await dashboard(session, url.searchParams)
        res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'self'")
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.end(req.method === 'HEAD' ? '' : renderMaster(data, PREFECTURES))
      } else if (url.pathname === PREFIX + '/data') json(res, 200, await dashboard(session, url.searchParams))
      else throw fail('ページが見つかりません。', 404)
    } catch (error) {
      if (!error.statusCode) console.error('[salon-group-master-v672] request failed', error.code || error.name)
      const message = error.statusCode ? error.message : '読み込みに失敗しました。時間をおいて再度お試しください。'
      if (page) { res.statusCode = error.statusCode || 500; res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(renderMaster(null, [], message)) }
      else json(res, error.statusCode || 500, { error: message })
    }
    return true
  }
  return { ensureSchema, handle, dashboard }
}
module.exports = { createSalonGroupMaster, monthRange, RELEASE }
