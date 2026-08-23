import fs from 'node:fs'

const servicePath = '/app/customer-store-staff-v276.js'
const adminClientPath = '/app/commercial-admin-v101.js'

let service = fs.readFileSync(servicePath, 'utf8')
let adminClient = fs.readFileSync(adminClientPath, 'utf8')

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

const oldStoreIcon = `  async function storeIcon(req, res, url) {
    await ensureSchema()
    const { session, audience } = await audienceSession(req)
    const organizationId = String(url.searchParams.get('organizationId') || session.organizationId)
    if (audience === 'staff' && organizationId !== session.organizationId) throw new CustomerStoreStaffError('別店舗の画像は表示できません。', 403)
    if (audience === 'customer' && organizationId !== session.organizationId) {
      const allowed = await prisma.$queryRawUnsafe('SELECT 1 FROM "CustomerStoreLink" WHERE "appUserId"=$1 AND "organizationId"=$2 LIMIT 1', session.userId, organizationId)
      if (!allowed[0]) throw new CustomerStoreStaffError('登録済みの店舗ではありません。', 403)
    }
    const row = (await prisma.$queryRawUnsafe('SELECT "iconImageUrl" FROM "Organization" WHERE "id"=$1 LIMIT 1', organizationId))[0]
    const value = String(row?.iconImageUrl || '')
    if (!value) {
      res.statusCode = 302; res.setHeader('Location', '/brand/salon-customer-service-mark.svg'); res.setHeader('Cache-Control', 'private, no-store'); return res.end()
    }
    if (value.startsWith('private/')) {
      if (!bucket) throw new CustomerStoreStaffError('画像ストレージが設定されていません。', 503)
      const signed = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: value }), { expiresIn: 300 })
      res.statusCode = 302; res.setHeader('Location', signed); res.setHeader('Cache-Control', 'private, no-store'); return res.end()
    }
    const iconTarget = value.startsWith('/') && value !== '/brand/yohaku-mark.svg' ? value : '/brand/salon-customer-service-mark.svg'
    res.statusCode = 302; res.setHeader('Location', iconTarget); res.setHeader('Cache-Control', 'private, no-store'); res.end()
  }
`

const newStoreIcon = `  async function sendStoreIcon(res, organizationId) {
    const row = (await prisma.$queryRawUnsafe('SELECT "iconImageUrl" FROM "Organization" WHERE "id"=$1 LIMIT 1', organizationId))[0]
    const value = String(row?.iconImageUrl || '')
    if (!value) {
      res.statusCode = 302; res.setHeader('Location', '/brand/salon-customer-service-mark.svg'); res.setHeader('Cache-Control', 'private, no-store, max-age=0'); return res.end()
    }
    if (value.startsWith('private/')) {
      if (!bucket) throw new CustomerStoreStaffError('画像ストレージが設定されていません。', 503)
      const signed = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: value }), { expiresIn: 300 })
      res.statusCode = 302; res.setHeader('Location', signed); res.setHeader('Cache-Control', 'private, no-store, max-age=0'); return res.end()
    }
    const iconTarget = value.startsWith('/') && value !== '/brand/yohaku-mark.svg' ? value : '/brand/salon-customer-service-mark.svg'
    res.statusCode = 302; res.setHeader('Location', iconTarget); res.setHeader('Cache-Control', 'private, no-store, max-age=0'); res.end()
  }

  async function storeIcon(req, res, url) {
    await ensureSchema()
    const { session, audience } = await audienceSession(req)
    const organizationId = String(url.searchParams.get('organizationId') || session.organizationId)
    if (audience === 'staff' && organizationId !== session.organizationId) throw new CustomerStoreStaffError('別店舗の画像は表示できません。', 403)
    if (audience === 'customer' && organizationId !== session.organizationId) {
      const allowed = await prisma.$queryRawUnsafe('SELECT 1 FROM "CustomerStoreLink" WHERE "appUserId"=$1 AND "organizationId"=$2 LIMIT 1', session.userId, organizationId)
      if (!allowed[0]) throw new CustomerStoreStaffError('登録済みの店舗ではありません。', 403)
    }
    await sendStoreIcon(res, organizationId)
  }

  async function adminStoreIcon(req, res) {
    await ensureSchema()
    const session = await currentStaff(req)
    await sendStoreIcon(res, session.organizationId)
  }
`

service = replaceOnce(service, oldStoreIcon, newStoreIcon, 'split customer and admin icon readers')
service = replaceOnce(
  service,
  'return json(res, 200, { ok: true, iconUrl: `/api/lien-store-icon?v=${Date.now()}` })',
  'return json(res, 200, { ok: true, iconUrl: `/api/admin/store-icon?v=${Date.now()}` })',
  'admin upload response URL',
)
service = replaceOnce(
  service,
  "else if (url.pathname === '/api/admin/store-icon' && req.method === 'POST') await updateStoreIcon(req, res)",
  "else if (url.pathname === '/api/admin/store-icon' && req.method === 'GET') await adminStoreIcon(req, res)\n      else if (url.pathname === '/api/admin/store-icon' && req.method === 'POST') await updateStoreIcon(req, res)",
  'admin icon GET handler',
)

adminClient = replaceOnce(
  adminClient,
  '<img src="/api/lien-store-icon?v=${Date.now()}"',
  '<img src="/api/admin/store-icon?v=${Date.now()}"',
  'settings preview uses staff-scoped icon endpoint',
)

fs.writeFileSync(servicePath, service)
fs.writeFileSync(adminClientPath, adminClient)
