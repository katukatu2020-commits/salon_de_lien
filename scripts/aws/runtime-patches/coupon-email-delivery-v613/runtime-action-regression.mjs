import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { PrismaClient } = require('/app/node_modules/@prisma/client')
const prisma = new PrismaClient()
const base = String(process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')
const token = `v613-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
const startedAt = new Date()
const createdTitles = [`${token}-mixed`, `${token}-none`]

async function login() {
  const response = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      email: 'demo.owner',
      password: 'LienDemo2026!',
      next: '/admin/customers/messages',
    }),
  })
  assert.equal(response.status, 303)
  const cookie = (response.headers.get('set-cookie') || '').split(';', 1)[0]
  assert.match(cookie, /^[^=]+=/)
  return cookie
}

async function loadForm(cookie) {
  const response = await fetch(`${base}/admin/customers/messages`, {
    headers: { Cookie: cookie, Accept: 'text/html', 'Cache-Control': 'no-cache' },
  })
  assert.equal(response.status, 200)
  const html = await response.text()
  const actionName = html.match(/<form[^>]+action=""[^>]*>\s*<input type="hidden" name="(\$ACTION_ID_[^"]+)"/)?.[1]
  assert.ok(actionName, 'Customer broadcast action ID is missing')
  const recipients = [...html.matchAll(/data-recipient-email="([01])"[^>]*>[\s\S]*?<input[^>]*name="targetCustomerId" value="([^"]+)"/g)]
    .map(match => ({ eligible: match[1] === '1', id: match[2] }))
  assert.ok(recipients.some(recipient => recipient.eligible), 'Email-eligible customer is missing')
  assert.ok(recipients.some(recipient => !recipient.eligible), 'Email-unregistered customer is missing')
  return { actionName, recipients }
}

async function submit(cookie, actionName, title, customerIds, coupon) {
  const form = new FormData()
  form.set(actionName, '')
  form.set('title', title)
  form.set('body', `Coupon email regression ${token}`)
  form.set('deliveryMethod', 'email')
  form.set('audienceGender', 'all')
  for (const id of customerIds) form.append('targetCustomerId', id)
  if (coupon) {
    form.set('couponEnabled', 'on')
    form.set('couponTitle', `v613 coupon ${token}`.slice(0, 60))
    form.set('couponTargetMenu', 'Cut')
    form.set('couponDiscountRate', String(coupon.rate))
    form.set('couponValidDays', String(coupon.days))
    form.set('couponDescription', `Regression ${token}`)
  }
  return fetch(`${base}/admin/customers/messages`, {
    method: 'POST',
    redirect: 'manual',
    headers: { Cookie: cookie },
    body: form,
  })
}

async function cleanup() {
  const broadcasts = await prisma.customerBroadcast.findMany({
    where: { title: { in: createdTitles } },
    select: { id: true },
  })
  for (const broadcast of broadcasts) {
    const recipients = await prisma.customerBroadcastRecipient.findMany({
      where: { broadcastId: broadcast.id },
      select: { couponIssueId: true },
    })
    await prisma.customerBroadcastRecipient.deleteMany({ where: { broadcastId: broadcast.id } })
    const couponIds = recipients.map(recipient => recipient.couponIssueId).filter(Boolean)
    if (couponIds.length > 0) await prisma.couponIssue.deleteMany({ where: { id: { in: couponIds } } })
    await prisma.customerBroadcast.delete({ where: { id: broadcast.id } })
  }
  await prisma.contactLog.deleteMany({
    where: {
      purpose: '一斉配信',
      createdAt: { gte: startedAt },
      message: { contains: token },
    },
  })
}

try {
  const cookie = await login()
  const { actionName, recipients } = await loadForm(cookie)
  const eligible = recipients.find(recipient => recipient.eligible)
  const ineligible = recipients.find(recipient => !recipient.eligible)
  const owner = await prisma.appUser.findFirst({ where: { loginId: 'demo.owner' }, select: { organizationId: true } })
  assert.ok(owner?.organizationId)
  const organization = await prisma.organization.findUnique({
    where: { id: owner.organizationId },
    select: {
      defaultCouponDiscountRate: true,
      couponMinimumDiscountRate: true,
      couponMaximumDiscountRate: true,
      couponDefaultValidDays: true,
      couponMaxValidDays: true,
    },
  })
  assert.ok(organization)
  const rate = Math.min(
    organization.couponMaximumDiscountRate,
    Math.max(organization.couponMinimumDiscountRate, organization.defaultCouponDiscountRate),
  )
  const days = Math.min(organization.couponMaxValidDays, Math.max(1, organization.couponDefaultValidDays))

  const mixed = await submit(cookie, actionName, createdTitles[0], [eligible.id, ineligible.id], { rate, days })
  assert.equal(mixed.status, 303, `Mixed delivery returned ${mixed.status}: ${(await mixed.text()).slice(0, 500)}`)
  const mixedLocation = mixed.headers.get('location') || ''
  assert.match(mixedLocation, /notice=(?:sent|email-partial)/)
  assert.match(mixedLocation, /skipped=1/)

  const broadcast = await prisma.customerBroadcast.findFirst({
    where: { title: createdTitles[0] },
    select: { id: true, audienceMatchedCount: true, couponEnabled: true },
  })
  assert.ok(broadcast)
  assert.equal(broadcast.audienceMatchedCount, 1)
  assert.equal(broadcast.couponEnabled, true)
  const storedRecipients = await prisma.customerBroadcastRecipient.findMany({
    where: { broadcastId: broadcast.id },
    select: { customerId: true, couponIssueId: true },
  })
  assert.equal(storedRecipients.length, 1)
  assert.equal(storedRecipients[0].customerId, eligible.id)
  assert.ok(storedRecipients[0].couponIssueId)

  const none = await submit(cookie, actionName, createdTitles[1], [ineligible.id], null)
  assert.equal(none.status, 303, `No-email delivery returned ${none.status}: ${(await none.text()).slice(0, 500)}`)
  assert.match(none.headers.get('location') || '', /error=no-email-recipients&skipped=1/)
  assert.equal(await prisma.customerBroadcast.count({ where: { title: createdTitles[1] } }), 0)

  console.log(JSON.stringify({
    release: 'v613',
    mixedMatched: 2,
    appAndCouponDelivered: 1,
    automaticallyExcluded: 1,
    couponIssues: 1,
    zeroEligibleHandledInPage: true,
    mixedLocation,
  }, null, 2))
} finally {
  await cleanup().catch(error => console.error(`cleanup: ${error.message}`))
  await prisma.$disconnect()
}
