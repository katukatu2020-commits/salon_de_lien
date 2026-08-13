const fs = require('fs')
const path = require('path')

const appRoot = process.env.APP_ROOT || '/app'
const marker = 'temporary-coupon-code-entry-off-v41'

const read = relative => fs.readFileSync(path.join(appRoot, relative), 'utf8')
const write = (relative, source) => fs.writeFileSync(path.join(appRoot, relative), source, 'utf8')

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

function patchPointsPage() {
  const relative = '.next/server/app/u/(account)/points/page.js'
  let source = read(relative)
  if (source.includes(marker)) return

  source = replaceOnce(
    source,
    'children:[s.jsx(l,{referralsEnabled:"false"!==process.env.CUSTOMER_REFERRAL_REWARDS_ENABLED}),"false"!==process.env.CUSTOMER_REFERRAL_REWARDS_ENABLED?s.jsx(u,{discountRates:y,initialReferral:d?{code:d.code,referralUrl:`/referral/${encodeURIComponent(d.code)}`}:null}):null/* temporary-sms-referral-off-v39 */]',
    `children:["false"!==process.env.CUSTOMER_COUPON_CODE_ENTRY_ENABLED?s.jsx(l,{referralsEnabled:"false"!==process.env.CUSTOMER_REFERRAL_REWARDS_ENABLED}):null,"false"!==process.env.CUSTOMER_REFERRAL_REWARDS_ENABLED?s.jsx(u,{discountRates:y,initialReferral:d?{code:d.code,referralUrl:\`/referral/\${encodeURIComponent(d.code)}\`}:null}):null/* ${marker} */]`,
    'customer points coupon entry gate',
  )

  write(relative, source)
}

function patchCouponUseApi() {
  const relative = '.next/server/app/api/customer/coupons/use/route.js'
  let source = read(relative)
  if (source.includes(marker)) return

  source = replaceOnce(
    source,
    'async function y(e){let t=await (0,l.j)();',
    `async function y(e){if("false"===process.env.CUSTOMER_COUPON_CODE_ENTRY_ENABLED)return i.NextResponse.json({error:"クーポンコード入力は現在一時停止中です。",feature:"${marker}"},{status:410,headers:{"Cache-Control":"no-store"}});let t=await (0,l.j)();`,
    'customer coupon use API gate',
  )

  write(relative, source)
}

patchPointsPage()
patchCouponUseApi()

console.log('temporarily disabled customer coupon-code entry UI and API')
