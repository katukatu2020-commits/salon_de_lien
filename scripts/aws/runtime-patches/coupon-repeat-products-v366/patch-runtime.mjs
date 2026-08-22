import fs from 'node:fs'
import path from 'node:path'

function replaceOnce(source, label, before, after) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected exactly one match, found ${count}`)
  return source.replace(before, after)
}

const serverPath = '/app/server.js'
let server = fs.readFileSync(serverPath, 'utf8')
server = replaceOnce(
  server,
  'booking coupon service require',
  "const { createCustomerAppointmentCancellationService } = require('./customer-appointment-cancellation-v362') /* customer-appointment-cancellation-v362-require */",
  "const { createCustomerAppointmentCancellationService } = require('./customer-appointment-cancellation-v362') /* customer-appointment-cancellation-v362-require */\nconst { createCustomerBookingCouponService } = require('./customer-booking-coupon-v366') /* customer-booking-coupon-v366-require */",
)
server = replaceOnce(
  server,
  'booking coupon service initialization',
  "const customerAppointmentCancellation = createCustomerAppointmentCancellationService({ prisma, crypto, sessionProvider: req => chatSession(req, 'customer') }) /* customer-appointment-cancellation-v362-service */",
  "const customerAppointmentCancellation = createCustomerAppointmentCancellationService({ prisma, crypto, sessionProvider: req => chatSession(req, 'customer') }) /* customer-appointment-cancellation-v362-service */\nconst customerBookingCoupon = createCustomerBookingCouponService({ prisma, sessionProvider: req => chatSession(req, 'customer') }) /* customer-booking-coupon-v366-service */",
)
server = replaceOnce(
  server,
  'booking coupon schema',
  '  await customerWithdrawal.ensureSchema() /* verified-customer-withdrawal-v309-schema */',
  '  await customerWithdrawal.ensureSchema() /* verified-customer-withdrawal-v309-schema */\n  await customerBookingCoupon.ensureSchema() /* customer-booking-coupon-v366-schema */',
)
server = replaceOnce(
  server,
  'booking coupon route',
  '      if (await customerAppointmentCancellation.handle(req, res, url)) return /* customer-appointment-cancellation-v362-route */',
  "      if (await customerAppointmentCancellation.handle(req, res, url)) return /* customer-appointment-cancellation-v362-route */\n      if (await customerBookingCoupon.handle(req, res, url, request => chatSession(request, 'staff'))) return /* customer-booking-coupon-v366-route */",
)
server = replaceOnce(
  server,
  'catalog image column',
  'SELECT p."id",p."manufacturerName",p."name",p."category",p."retailPrice",p."concernTags",p."description",p."alternativeRecommendation",COALESCE(SUM(sl."quantity"),0)::int AS "soldCount"',
  'SELECT p."id",p."manufacturerName",p."name",p."category",p."retailPrice",p."concernTags",p."description",p."alternativeRecommendation",p."imageUrl",COALESCE(SUM(sl."quantity"),0)::int AS "soldCount"',
)
server = replaceOnce(
  server,
  'catalog generated image fallback',
  "function customerProductImagePath(product) {\n  const label = [product?.manufacturerName, product?.name].filter(Boolean).join(' ')\n  return customerProductImageRules.find(([pattern]) => pattern.test(label))?.[1] || ''\n}",
  "function customerProductImagePath(product) {\n  if (product?.imageUrl) return product.imageUrl\n  const label = [product?.manufacturerName, product?.name].filter(Boolean).join(' ')\n  const official = customerProductImageRules.find(([pattern]) => pattern.test(label))?.[1]\n  if (official) return official\n  const category = String(product?.category || '')\n  if (/シャンプー/.test(category)) return '/images/products/yohaku/shampoo.png'\n  if (/トリートメント/.test(category)) return '/images/products/yohaku/treatment.png'\n  if (/スタイリング/.test(category)) return '/images/products/yohaku/styling.png'\n  if (/アウトバス|洗い流さない/.test(category)) return '/images/products/yohaku/leave-in.png'\n  return '/images/products/yohaku/scalp.png'\n}",
)

const couponStart = server.indexOf('async function customerCouponsPage')
const couponEnd = server.indexOf('async function customerStampsPage', couponStart)
if (couponStart < 0 || couponEnd < 0) throw new Error('coupon page boundaries missing')
let couponPage = server.slice(couponStart, couponEnd)
couponPage = replaceOnce(
  couponPage,
  'coupon issue type marker',
  '...issues.map(c => ({...c, benefit:',
  '...issues.map(c => ({...c, issueType: true, benefit:',
)
couponPage = replaceOnce(
  couponPage,
  'coupon booking link',
  '<a href="/u/appointments">',
  '<a href="${c.issueType ? `/u/appointments?coupon=${encodeURIComponent(c.id)}` : \'/u/appointments\'}">',
)
server = server.slice(0, couponStart) + couponPage + server.slice(couponEnd)
fs.writeFileSync(serverPath, server)

const cancellationPath = '/app/customer-appointment-cancellation-v362.js'
let cancellation = fs.readFileSync(cancellationPath, 'utf8')
cancellation = replaceOnce(
  cancellation,
  'release coupon on customer cancellation',
  'UPDATE "Appointment" SET "status"=\'キャンセル\',"note"=$2,"updatedAt"=CURRENT_TIMESTAMP',
  'UPDATE "Appointment" SET "status"=\'キャンセル\',"couponIssueId"=NULL,"note"=$2,"updatedAt"=CURRENT_TIMESTAMP',
)
fs.writeFileSync(cancellationPath, cancellation)

const workflowPath = '/app/ui-workflows-v294.js'
let workflow = fs.readFileSync(workflowPath, 'utf8')
if (workflow.includes('__lienCustomerBookingCouponV366')) throw new Error('booking coupon client already present')
workflow += `\n${fs.readFileSync('/tmp/customer-booking-coupon-client-v366.js', 'utf8')}\n`
fs.writeFileSync(workflowPath, workflow)

const customerLayoutDirectory = '/app/.next/static/chunks/app/u/(account)'
const layoutNames = fs.readdirSync(customerLayoutDirectory).filter(name => /^layout-customer-stability-v\d+\.js$/.test(name))
if (!layoutNames.length) throw new Error('customer layout is missing')
const previousLayoutName = layoutNames.sort((a, b) => Number(b.match(/v(\d+)/)?.[1] || 0) - Number(a.match(/v(\d+)/)?.[1] || 0))[0]
const nextLayoutName = 'layout-customer-stability-v366.js'
let customerLayout = fs.readFileSync(path.join(customerLayoutDirectory, previousLayoutName), 'utf8')
customerLayout = customerLayout.replace(/ui-workflows-v294\.js\?v=[^"']+/, 'ui-workflows-v294.js?v=366')
if (!customerLayout.includes('ui-workflows-v294.js?v=366')) throw new Error('customer workflow cache key was not updated')
fs.writeFileSync(path.join(customerLayoutDirectory, nextLayoutName), customerLayout)

function replaceManifestReference(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) { replaceManifestReference(target); continue }
    if (!entry.isFile() || !/\.(?:json|js)$/.test(entry.name)) continue
    let source = fs.readFileSync(target, 'utf8')
    if (!source.includes(previousLayoutName)) continue
    source = source.split(previousLayoutName).join(nextLayoutName)
    fs.writeFileSync(target, source)
  }
}
replaceManifestReference('/app/.next')
