const fs = require('fs')
const path = require('path')

const appRoot = process.env.APP_ROOT || '/app'
const read = relative => fs.readFileSync(path.join(appRoot, relative), 'utf8')

const otpRequest = read('.next/server/app/api/customer-auth/phone-verification/request/route.js')
const otpVerify = read('.next/server/app/api/customer-auth/phone-verification/verify/route.js')
const registration = read('.next/server/app/u/register/[token]/page.js')
const landing = read('.next/server/app/u/register/page.js')
const activeActions = read('.next/server/chunks/2241.js')
const alternateActions = read('.next/server/chunks/1608.js')
const referrals = read('.next/server/chunks/7295.js')
const checkoutReferrals = read('.next/server/chunks/805.js')
const points = read('.next/server/app/u/(account)/points/page.js')
const staticPoints = read('.next/static/chunks/app/u/(account)/points/page-d5be485caa1e3acb.js')
const couponApi = read('.next/server/app/api/customer/coupons/use/route.js')
const referralLanding = read('.next/server/app/referral/[code]/page.js')
const compatibility = read('server.js')

const apiFiles = [
  '.next/server/app/api/customer/referrals/route.js',
  '.next/server/app/api/customers/[customerId]/referrals/route.js',
  '.next/server/app/api/referrals/[code]/complete-first-visit/route.js',
  '.next/server/app/api/referrals/[code]/register/route.js',
].map(read)

const checks = [
  ['OTP request is disabled by the reversible flag', otpRequest.includes('CUSTOMER_SMS_VERIFICATION_ENABLED') && otpRequest.includes('status:503')],
  ['OTP verification is disabled by the reversible flag', otpVerify.includes('CUSTOMER_SMS_VERIFICATION_ENABLED') && otpVerify.includes('status:503')],
  ['registration landing explains temporary SMS suspension', landing.includes('SMS認証は現在一時停止中です')],
  ['registration form uses a plain phone field while SMS is off', registration.includes('temporary-sms-referral-off-v39') && registration.includes('電話番号は、お客様アプリの重複登録防止に使用します')],
  ['active registration does not require or consume OTP while disabled', activeActions.includes('smsEnabled&&(!I||!b)') && activeActions.includes('smsEnabled&&i&&await t.smsVerificationChallenge.update')],
  ['active registration serializes normalized phone claims', activeActions.includes('pg_advisory_xact_lock') && activeActions.includes('CUSTOMER_PHONE_ALREADY_USED') && activeActions.includes('(0,$.ni)(e.customer.phone)===y')],
  ['active registration does not create a verified identity while disabled', activeActions.includes('...smsEnabled?{phoneIdentity:')],
  ['active registration ignores referral input while disabled', activeActions.includes('ei=referralsEnabled?') && activeActions.includes('referredByCustomerId:referralsEnabled?')],
  ['alternate registration has the same fraud controls', alternateActions.includes('pg_advisory_xact_lock') && alternateActions.includes('CUSTOMER_PHONE_ALREADY_USED') && alternateActions.includes('...(smsEnabled')],
  ['referral generation, registration, checkout, and reward services are gated', ['async function $(e,t){if("false"===process.env.CUSTOMER_REFERRAL_REWARDS_ENABLED)', 'async function k({code:e,customerId:t,organizationId:r}){if("false"===process.env.CUSTOMER_REFERRAL_REWARDS_ENABLED)', 'async function z(e,t){if("false"===process.env.CUSTOMER_REFERRAL_REWARDS_ENABLED)return null', 'async function B(e,t,r,i=new Date){if("false"===process.env.CUSTOMER_REFERRAL_REWARDS_ENABLED)return{discount:null,amount:0}', 'async function O(e,t,r=new Date){if("false"===process.env.CUSTOMER_REFERRAL_REWARDS_ENABLED)return'].every(value => referrals.includes(value))],
  ['checkout copy of referral services is gated', ['async function x(e,t){if("false"===process.env.CUSTOMER_REFERRAL_REWARDS_ENABLED)return null', 'async function D(e,t,r,a=new Date){if("false"===process.env.CUSTOMER_REFERRAL_REWARDS_ENABLED)return{discount:null,amount:0}', 'async function T(e,t,r=new Date){if("false"===process.env.CUSTOMER_REFERRAL_REWARDS_ENABLED)return'].every(value => checkoutReferrals.includes(value))],
  ['all referral mutation APIs return 410 while disabled', apiFiles.every(value => value.includes('CUSTOMER_REFERRAL_REWARDS_ENABLED') && value.includes('status:410'))],
  ['referral codes cannot be applied through coupon input', couponApi.includes('"false"!==process.env.CUSTOMER_REFERRAL_REWARDS_ENABLED&&await d._.referral.findUnique')],
  ['referral landing shows a suspension notice', referralLanding.includes('紹介クーポンは一時停止中です')],
  ['points page hides referral UI and keeps normal coupon entry', points.includes('referralsEnabled:"false"!==process.env.CUSTOMER_REFERRAL_REWARDS_ENABLED') && points.includes('CUSTOMER_REFERRAL_REWARDS_ENABLED?s.jsx(u')],
  ['coupon entry copy is referral-aware on server and client', points.includes('children:R?"限定クーポンまたは友達紹介コード') && staticPoints.includes('children:R?"限定クーポンまたは友達紹介コード')],
  ['compatibility coupon UI filters referral rewards', compatibility.includes('temporary-sms-referral-off-v39') && compatibility.includes('allRows.filter') && compatibility.includes('const filters = referralEnabled ?')],
]

const failed = checks.filter(([, ok]) => !ok)
if (failed.length) {
  for (const [name] of failed) console.error(`FAILED: ${name}`)
  process.exit(1)
}

console.log(JSON.stringify({ verified: checks.map(([name]) => name) }))
