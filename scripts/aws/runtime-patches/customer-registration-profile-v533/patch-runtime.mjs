import fs from 'node:fs'

const actionPath = '/app/.next/server/chunks/2241.js'
const pagePath = '/app/.next/server/app/u/register/[token]/page.js'
const requestPath = '/app/.next/server/app/api/customer-auth/phone-verification/request/route.js'
const verifyPath = '/app/.next/server/app/api/customer-auth/phone-verification/verify/route.js'
const serverPath = '/app/server.js'
const marker = 'customer-registration-profile-v533'

let action = fs.readFileSync(actionPath, 'utf8')
let page = fs.readFileSync(pagePath, 'utf8')
let phoneRequest = fs.readFileSync(requestPath, 'utf8')
let phoneVerify = fs.readFileSync(verifyPath, 'utf8')
let server = fs.readFileSync(serverPath, 'utf8')

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before)
  if (first < 0) throw new Error(`${label}: target was not found`)
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`${label}: target was not unique`)
  return source.slice(0, first) + after + source.slice(first + before.length)
}

const oldPhoneNormalizer = `e.trim().replace(/[\\s()-]/g,"").replace(/\\D/g,"")`
const newPhoneNormalizer = `e.normalize("NFKC").trim().replace(/[\\s()-]/g,"").replace(/\\D/g,"")`

for (const target of [
  { name: 'registration action phone normalization', get: () => action, set: value => { action = value } },
  { name: 'SMS request phone normalization', get: () => phoneRequest, set: value => { phoneRequest = value } },
  { name: 'SMS verification phone normalization', get: () => phoneVerify, set: value => { phoneVerify = value } },
]) {
  target.set(replaceOnce(target.get(), oldPhoneNormalizer, newPhoneNormalizer, target.name))
}

action = replaceOnce(
  action,
  `y||(0,l.redirect)(i("profile"))`,
  `y||(0,l.redirect)(i("phoneFormat"))`,
  'specific invalid-phone registration error',
)

const strictProfileValidation = `(0,N.oQ)(N.nO,B)&&D&&(0,N.oQ)(N.An,M)&&(0,N.oQ)(N.io,W)&&(0,N.oQ)(N.lw,Z)&&(0,N.oQ)(N.G3,Q)&&(0,N.oQ)(N.rT,X)||(0,l.redirect)(i("profile"));`
const normalizedProfileValidation = `D||(0,l.redirect)(i("birthDate"));let registrationProfileV533=require("/app/customer-registration-profile-v533.js").normalizeProfile({gender:B,servicePreference:M,hairTexture:W,hairThickness:Z,hairVolume:Q,hairCurl:X});B=registrationProfileV533.gender,M=registrationProfileV533.servicePreference,W=registrationProfileV533.hairTexture,Z=registrationProfileV533.hairThickness,Q=registrationProfileV533.hairVolume,X=registrationProfileV533.hairCurl;/* ${marker} */`
action = replaceOnce(action, strictProfileValidation, normalizedProfileValidation, 'profile normalization')

const profileAlert = `a?.error==="profile"?s.jsx("p",{role:"alert",className:"rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800",children:"入力内容を確認してください。プロフィールの各項目を選択してから登録してください。"}):null,`
const specificAlerts = `${profileAlert}a?.error==="phoneFormat"?s.jsx("p",{role:"alert",className:"rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800",children:"携帯電話番号を確認してください。全角数字にも対応しています。070・080・090から始まる11桁の番号を入力してください。"}):null,a?.error==="birthDate"?s.jsx("p",{role:"alert",className:"rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800",children:"生年月日を確認してください。1900年以降の実在する日付を入力してください。"}):null,`
page = replaceOnce(page, profileAlert, specificAlerts, 'specific registration alerts')

const lifecycleReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Account-Lifecycle', 'v532') /* customer-account-lifecycle-v532 */`
server = replaceOnce(
  server,
  lifecycleReady,
  `${lifecycleReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Registration-Profile', 'v533') /* ${marker} */`,
  'customer registration readiness marker',
)

fs.writeFileSync(actionPath, action)
fs.writeFileSync(pagePath, page)
fs.writeFileSync(requestPath, phoneRequest)
fs.writeFileSync(verifyPath, phoneVerify)
fs.writeFileSync(serverPath, server)
console.log(JSON.stringify({ release: marker, patched: true }))
