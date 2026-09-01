import fs from 'node:fs'

const billingPath = '/app/billing.js'
const serverPath = '/app/server.js'
const analyticsPagePath = '/app/.next/server/app/admin/owner-analytics/page.js'
const marker = 'billing-display-mask-v531'
let billing = fs.readFileSync(billingPath, 'utf8')
let server = fs.readFileSync(serverPath, 'utf8')
let analyticsPage = fs.readFileSync(analyticsPagePath, 'utf8')

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before)
  if (first < 0) throw new Error(`${label}: target was not found`)
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`${label}: target was not unique`)
  return source.slice(0, first) + after + source.slice(first + before.length)
}

function replaceCount(source, before, after, expected, label) {
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} targets, found ${count}`)
  return source.split(before).join(after)
}

const billingPageStart = `  async function billingPage(req, res) {`
const maskHelper = `  function maskSystemBillingAmounts(html) { /* ${marker} */
    return String(html).replace(/-?\\d[\\d,]*円/g, '*****円')
  }

${billingPageStart}`
billing = replaceOnce(billing, billingPageStart, maskHelper, 'billing page display mask helper')

const unmaskedSend = `sendHtml(res, 200, pageShell('システム利用料', content, session, { billing: true }))`
const maskedSend = `sendHtml(res, 200, pageShell('システム利用料', maskSystemBillingAmounts(content), session, { billing: true }))`
billing = replaceCount(billing, unmaskedSend, maskedSend, 2, 'billing page render paths')

const componentStart = analyticsPage.indexOf('function S({ smsCount: e, emailCount: t, billing: r, plans: a }) {')
const componentEnd = analyticsPage.indexOf('\n        async function w(', componentStart)
if (componentStart < 0 || componentEnd <= componentStart) throw new Error('commercial billing component boundaries were not found')
let billingComponent = analyticsPage.slice(componentStart, componentEnd)
billingComponent = replaceOnce(
  billingComponent,
  'function S({ smsCount: e, emailCount: t, billing: r, plans: a }) {',
  `function S({ smsCount: e, emailCount: t, billing: r, plans: a }) { /* ${marker} */`,
  'commercial billing component marker',
)
billingComponent = replaceOnce(
  billingComponent,
  '${h(r.trialEndsAt)}から${d.toLocaleString("ja-JP")}円／月の請求が開始されます。`',
  '${h(r.trialEndsAt)}から*****円／月の請求が開始されます。`',
  'trial billing amount',
)
billingComponent = replaceOnce(billingComponent, 'children: "0円"', 'children: "*****円"', 'today billing amount')
billingComponent = replaceOnce(
  billingComponent,
  'children: [d.toLocaleString("ja-JP"), "円", s.jsx("span",',
  'children: ["*****", "円", s.jsx("span",',
  'first billing amount',
)
billingComponent = replaceOnce(
  billingComponent,
  'label: "基本利用料", value: d.toLocaleString("ja-JP"), unit: "円／月"',
  'label: "基本利用料", value: "*****", unit: "円／月"',
  'base fee metric',
)
billingComponent = replaceOnce(
  billingComponent,
  'label: "今回の請求", value: j.toLocaleString("ja-JP"), unit: "円", helper: "trialing" === x ? "無料期間中は0円" : "基本利用料"',
  'label: "今回の請求", value: "*****", unit: "円", helper: "trialing" === x ? "無料期間中は*****円" : "基本利用料"',
  'current billing metric',
)
billingComponent = replaceOnce(
  billingComponent,
  `["次回基本料金", \`${'${d.toLocaleString("ja-JP")}'}円\`],
                              ["SMS利用料（概算）", \`${'${u.toLocaleString("ja-JP")}'}円\`],
                              ["今月の合計見込み", \`${'${m.toLocaleString("ja-JP")}'}円\`],`,
  `["次回基本料金", "*****円"],
                              ["SMS利用料（概算）", "*****円"],
                              ["今月の合計見込み", "*****円"],`,
  'next billing amounts',
)
billingComponent = replaceOnce(
  billingComponent,
  '["SMS配信", `${Number(e || 0).toLocaleString("ja-JP")}通 × ${c}円`, u]',
  '["SMS配信", `${Number(e || 0).toLocaleString("ja-JP")}通 × *****円`, u]',
  'sms unit price',
)
billingComponent = replaceOnce(
  billingComponent,
  'children: `${Number(e[2]).toLocaleString("ja-JP")}円`',
  'children: "*****円"',
  'monthly detail amounts',
)
billingComponent = replaceOnce(
  billingComponent,
  'children: [Number(e.monthlyAmount).toLocaleString("ja-JP"), s.jsx("span",',
  'children: ["*****", s.jsx("span",',
  'plan card amounts',
)
analyticsPage = analyticsPage.slice(0, componentStart) + billingComponent + analyticsPage.slice(componentEnd)

const orderReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Home-Menu-Order', 'v530') /* customer-home-menu-order-v530 */`
server = replaceOnce(
  server,
  orderReady,
  `${orderReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Billing-Display-Mask', 'v531') /* ${marker} */`,
  'billing display mask readiness marker',
)

fs.writeFileSync(billingPath, billing)
fs.writeFileSync(serverPath, server)
fs.writeFileSync(analyticsPagePath, analyticsPage)
console.log(JSON.stringify({ release: marker, patched: true }))
