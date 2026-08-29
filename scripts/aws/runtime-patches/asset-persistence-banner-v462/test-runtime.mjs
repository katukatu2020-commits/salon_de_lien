import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
process.env.S3_PRIVATE_ASSETS_BUCKET = 'private-assets-test'

const staffBytes = Buffer.from('staff-image-v462')
const campaignBytes = Buffer.from('campaign-image-v462')
globalThis.__lienStaffAvatarS3 = {
  async send(command) {
    assert.equal(command.input.Bucket, 'private-assets-test')
    assert.equal(command.input.Key, 'private/staff-profile-icons/org-staff/user-1/avatar.webp')
    return { Body: staffBytes, ContentType: 'image/webp', ContentLength: staffBytes.length }
  },
}
globalThis.__lienCampaignS3 = {
  async send(command) {
    assert.equal(command.input.Bucket, 'private-assets-test')
    assert.equal(command.input.Key, 'private/campaign-images/org-staff/campaign.jpg')
    return { Body: campaignBytes, ContentType: 'image/jpeg', ContentLength: campaignBytes.length }
  },
}

const { createCustomerStoreStaffService } = require('/app/customer-store-staff-v276.js')
const { createCustomerCampaignService } = require('/app/customer-campaigns-v427.js')

function request(referer = '') {
  return {
    method: 'GET',
    headers: {
      host: 'salon-de-lien.com',
      ...(referer ? { referer } : {}),
    },
  }
}

function response() {
  return {
    statusCode: 0,
    headers: {},
    setHeader(name, value) { this.headers[name.toLowerCase()] = value },
    end(value) { this.body = value },
  }
}

function json(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(Buffer.from(JSON.stringify(payload)))
}

const sessionCalls = []
const staffSession = async () => {
  sessionCalls.push('staff')
  return { organizationId: 'org-staff', userId: 'staff-user', role: 'ADMIN' }
}
const customerSession = async () => {
  sessionCalls.push('customer')
  return { organizationId: 'org-customer', customerId: 'customer-1', userId: 'customer-user', role: 'CUSTOMER' }
}

{
  const queries = []
  const prisma = {
    async $queryRawUnsafe(sql, ...args) {
      queries.push({ sql, args })
      if (sql.includes('FROM "StaffBookingSetting"')) {
        return [{ profileImageKey: 'private/staff-profile-icons/org-staff/user-1/avatar.webp' }]
      }
      return []
    },
  }
  const service = createCustomerStoreStaffService({
    prisma,
    staffSessionProvider: staffSession,
    customerSessionProvider: customerSession,
    renderCustomerShell: () => '',
  })
  const res = response()
  const handled = await service.handle(
    request('https://salon-de-lien.com/admin/settings?staffManagement=1'),
    res,
    new URL('https://salon-de-lien.com/api/lien-staff-avatar?staffKey=staff-1'),
  )
  assert.equal(handled, true)
  assert.equal(res.statusCode, 200)
  assert.equal(res.headers.location, undefined)
  assert.equal(res.headers['content-type'], 'image/webp')
  assert.deepEqual(res.body, staffBytes)
  assert.equal(queries[0].args[0], 'org-staff')
  assert.deepEqual(sessionCalls.splice(0), ['staff'])
}

function campaignPrisma() {
  const queries = []
  return {
    queries,
    async $executeRawUnsafe() { return 0 },
    async $queryRawUnsafe(sql, ...args) {
      queries.push({ sql, args })
      if (sql.includes('SELECT "imageKey" FROM "CustomerCampaign"')) {
        return [{ imageKey: 's3-private://private/campaign-images/org-staff/campaign.jpg' }]
      }
      if (sql.includes('JOIN "CustomerCampaignRecipient"')) {
        return [{ imageKey: 'private/campaign-images/org-staff/campaign.jpg' }]
      }
      return []
    },
  }
}

function campaigns(prisma) {
  return createCustomerCampaignService({
    prisma,
    customerSession,
    staffSession,
    json,
    sendCustomerHtml() {},
    customerShell() { return '' },
    customerIcon() { return '' },
    htmlEscape(value) { return String(value) },
    jpDate(value) { return String(value) },
  })
}

{
  const prisma = campaignPrisma()
  const res = response()
  await campaigns(prisma).handle(
    request('https://salon-de-lien.com/admin/customers/messages/campaigns'),
    res,
    new URL('https://salon-de-lien.com/api/lien-campaign-image?id=campaign-1'),
  )
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body, campaignBytes)
  const imageQuery = prisma.queries.find(call => call.sql.includes('SELECT "imageKey" FROM "CustomerCampaign"'))
  assert.ok(imageQuery)
  assert.deepEqual(imageQuery.args, ['campaign-1', 'org-staff'])
  assert.equal(prisma.queries.some(call => call.sql.includes('JOIN "CustomerCampaignRecipient"')), false)
  assert.deepEqual(sessionCalls.splice(0), ['staff'])
}

{
  const prisma = campaignPrisma()
  const res = response()
  await campaigns(prisma).handle(
    request('https://salon-de-lien.com/u/campaigns'),
    res,
    new URL('https://salon-de-lien.com/api/lien-campaign-image?id=campaign-1'),
  )
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body, campaignBytes)
  const imageQuery = prisma.queries.find(call => call.sql.includes('JOIN "CustomerCampaignRecipient"'))
  assert.ok(imageQuery)
  assert.deepEqual(imageQuery.args, ['campaign-1', 'org-customer', 'customer-1'])
  assert.equal(prisma.queries.some(call => call.sql.includes('SELECT "imageKey" FROM "CustomerCampaign"')), false)
  assert.deepEqual(sessionCalls.splice(0), ['customer'])
}

console.log('asset persistence and audience isolation v462 tests passed (3 cases)')
