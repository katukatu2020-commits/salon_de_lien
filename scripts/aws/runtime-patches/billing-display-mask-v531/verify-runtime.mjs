import assert from 'node:assert/strict'
import fs from 'node:fs'

const billing = fs.readFileSync('/app/billing.js', 'utf8')
const server = fs.readFileSync('/app/server.js', 'utf8')
const analyticsPage = fs.readFileSync('/app/.next/server/app/admin/owner-analytics/page.js', 'utf8')
const marker = 'billing-display-mask-v531'
const helperStart = billing.indexOf('function maskSystemBillingAmounts(html)')
const pageStart = billing.indexOf('async function billingPage(req, res)', helperStart)

assert.ok(helperStart >= 0 && pageStart > helperStart)
const helperSource = billing.slice(helperStart, pageStart)
assert.match(helperSource, new RegExp(marker))
const maskSystemBillingAmounts = Function(`${helperSource}; return maskSystemBillingAmounts`)()
const sample = '基本 12,345円 / 月、SMS 7件 × 15円、請求 0円、日付 2026年9月2日、カード •••• 1234'
assert.equal(
  maskSystemBillingAmounts(sample),
  '基本 *****円 / 月、SMS 7件 × *****円、請求 *****円、日付 2026年9月2日、カード •••• 1234',
)

const maskedSend = `sendHtml(res, 200, pageShell('システム利用料', maskSystemBillingAmounts(content), session, { billing: true }))`
const unmaskedSend = `sendHtml(res, 200, pageShell('システム利用料', content, session, { billing: true }))`
assert.equal(billing.split(maskedSend).length - 1, 2)
assert.equal(billing.split(unmaskedSend).length - 1, 0)

const billingPage = billing.slice(pageStart, billing.indexOf('\n\n  function allowedBillingPath', pageStart))
assert.match(billingPage, /const smsEstimate = smsCount \* 15/)
assert.match(billingPage, /centsToYen\(billing\.monthlyAmount\)/)
assert.match(billingPage, /centsToYen\(smsEstimate\)/)
assert.match(billingPage, /planCards\(plans, legacyKey, 'legacyPlan'\)/)

const componentStart = analyticsPage.indexOf('function S({ smsCount: e, emailCount: t, billing: r, plans: a }) {')
const componentEnd = analyticsPage.indexOf('\n        async function w(', componentStart)
assert.ok(componentStart >= 0 && componentEnd > componentStart)
const billingComponent = analyticsPage.slice(componentStart, componentEnd)
assert.match(billingComponent, new RegExp(marker))
assert.ok((billingComponent.match(/\*{5}/g) || []).length >= 11)
for (const exposed of [
  '${d.toLocaleString("ja-JP")}円',
  'children: "0円"',
  'children: [d.toLocaleString("ja-JP"), "円"',
  'label: "基本利用料", value: d.toLocaleString("ja-JP"), unit: "円／月"',
  'label: "今回の請求", value: j.toLocaleString("ja-JP"), unit: "円"',
  '${u.toLocaleString("ja-JP")}円',
  '${m.toLocaleString("ja-JP")}円',
  '${Number(e[2]).toLocaleString("ja-JP")}円',
  'children: [Number(e.monthlyAmount).toLocaleString("ja-JP")',
]) assert.equal(billingComponent.includes(exposed), false, `unmasked commercial amount remains: ${exposed}`)
assert.match(billingComponent, /const smsEstimate|u = Number\(e \|\| 0\) \* c/)
assert.match(billingComponent, /d = Number\(o\?\.monthlyAmount \|\| 9800\)/)

assert.match(server, /X-Lien-Billing-Display-Mask', 'v531'/)
assert.match(server, /X-Lien-Customer-Home-Menu-Order', 'v530'/)
assert.match(server, /X-Lien-Customer-Desktop-Frontend', 'v529'/)
assert.match(server, /X-Lien-Customer-Home-Branding', 'v528'/)
assert.match(server, /X-Lien-Line-Booking-UI-Parity', 'v527'/)

console.log(JSON.stringify({ release: marker, runtimeVerified: true, renderPaths: 2 }))
