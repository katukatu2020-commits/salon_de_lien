const fs = require('fs')
const path = require('path')

const appRoot = process.env.APP_ROOT || '/app'
const read = relative => fs.readFileSync(path.join(appRoot, relative), 'utf8')

const points = read('.next/server/app/u/(account)/points/page.js')
const couponUseApi = read('.next/server/app/api/customer/coupons/use/route.js')

const checks = [
  [
    'customer points page hides coupon-code entry while disabled',
    points.includes('CUSTOMER_COUPON_CODE_ENTRY_ENABLED?s.jsx(l') &&
      points.includes('temporary-coupon-code-entry-off-v41'),
  ],
  [
    'customer coupon-code API returns 410 before authentication and lookup',
    couponUseApi.includes('CUSTOMER_COUPON_CODE_ENTRY_ENABLED') &&
      couponUseApi.includes('status:410') &&
      couponUseApi.indexOf('CUSTOMER_COUPON_CODE_ENTRY_ENABLED') < couponUseApi.indexOf('await (0,l.j)()'),
  ],
  [
    'coupon history and issued-coupon data paths remain intact',
    points.includes('pointTransaction.findMany') && couponUseApi.includes('coupon.findFirst'),
  ],
]

const failed = checks.filter(([, ok]) => !ok)
if (failed.length) {
  for (const [name] of failed) console.error(`FAILED: ${name}`)
  process.exit(1)
}

console.log(JSON.stringify({ verified: checks.map(([name]) => name) }))
