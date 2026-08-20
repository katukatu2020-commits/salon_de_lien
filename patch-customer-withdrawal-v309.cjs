const crypto = require('node:crypto')
const fs = require('node:fs')

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

const serverFile = '/app/server.js'
const expectedServerHash = '8dba0cabe718a9b0cc3b44528f6174b6b625458c634c4d51fc56338cca62a203'
let server = fs.readFileSync(serverFile, 'utf8')
if (sha256(server) !== expectedServerHash) throw new Error(`Customer withdrawal server parent mismatch: ${sha256(server)}`)

function replaceOnce(source, before, after, label) {
  const matches = source.split(before).length - 1
  if (matches !== 1) throw new Error(`${label}: expected one match, found ${matches}`)
  return source.replace(before, after)
}

server = replaceOnce(
  server,
  "const { createCustomerLinkService } = require('./customer-links-v293')",
  "const { createCustomerLinkService } = require('./customer-links-v293')\nconst { createCustomerWithdrawalService } = require('./customer-withdrawal-v309') /* verified-customer-withdrawal-v309 */",
  'service import'
)
server = replaceOnce(
  server,
  "const users = await prisma.$queryRawUnsafe('SELECT \"id\" FROM \"AppUser\" WHERE \"id\"=$1 AND \"customerId\"=$2 AND \"organizationId\"=$3 AND \"role\"=\\'CUSTOMER\\' AND \"active\"=true LIMIT 1', value.userId, value.customerId, value.organizationId)",
  "const users = await prisma.$queryRawUnsafe('SELECT u.\"id\" FROM \"AppUser\" u JOIN \"Customer\" c ON c.\"id\"=u.\"customerId\" WHERE u.\"id\"=$1 AND u.\"customerId\"=$2 AND u.\"organizationId\"=$3 AND u.\"role\"=\\'CUSTOMER\\' AND u.\"active\"=true AND c.\"deletedAt\" IS NULL LIMIT 1', value.userId, value.customerId, value.organizationId)",
  'deleted customer session rejection'
)
server = replaceOnce(
  server,
  "const appointmentOperations = createAppointmentOperationsService({",
  "const customerWithdrawal = createCustomerWithdrawalService({\n  prisma,\n  crypto,\n  sessionProvider: req => chatSession(req, 'customer'),\n}) /* verified-customer-withdrawal-v309-service */\nconst appointmentOperations = createAppointmentOperationsService({",
  'service initialization'
)
server = replaceOnce(
  server,
  "  await customerLinks.ensureSchema()\n  await ensureSmsComplianceSchema()",
  "  await customerLinks.ensureSchema()\n  await customerWithdrawal.ensureSchema() /* verified-customer-withdrawal-v309-schema */\n  await ensureSmsComplianceSchema()",
  'schema initialization'
)
server = replaceOnce(
  server,
  "      if (await platformOperator.handle(req, res, url)) return /* platform-readonly-operations-v95-route */",
  "      if (await platformOperator.handle(req, res, url)) return /* platform-readonly-operations-v95-route */\n      if (await customerWithdrawal.handle(req, res, url)) return /* verified-customer-withdrawal-v309-route */",
  'request routing'
)
fs.writeFileSync(serverFile, server, 'utf8')

const profileFile = '/app/.next/server/app/u/(account)/profile/page.js'
const expectedProfileHash = '2cd2522badac304aeafdeb187cd61ffbdae84219bf8ddfa02101ff08f5c21203'
let profile = fs.readFileSync(profileFile, 'utf8')
if (sha256(profile) !== expectedProfileHash) throw new Error(`Customer profile parent mismatch: ${sha256(profile)}`)

const profileBefore = 'a.jsx("button",{type:"submit",className:"h-12 rounded-full bg-[#8f4f42] px-5 text-sm font-semibold text-white",children:"保存する"})]})]})]})}'
const withdrawalSection = '(0,a.jsxs)("section",{className:"rounded-[20px] border border-[#efced0] bg-[#fffafa] p-5 shadow-sm",children:[a.jsx("h2",{className:"text-base font-semibold text-[#71383c]",children:"退会手続き"}),a.jsx("p",{className:"mt-2 text-sm leading-6 text-[#7c6566]",children:"登録済みのメールアドレスへ確認リンクを送ります。リンク先で退会を確定するまで、アカウントは停止されません。"}),e?.withdrawal==="sent"?a.jsx("p",{className:"mt-3 rounded-xl bg-[#edf7ef] px-4 py-3 text-sm text-[#315c3c]",children:"退会確認メールを送信しました。30分以内にメール内のリンクを開いてください。"}):null,e?.withdrawal==="email-required"?a.jsx("p",{className:"mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800",children:"先に、このページの「ログイン情報の復旧」で受信可能なメールアドレスを登録してください。"}):null,e?.withdrawal==="limited"?a.jsx("p",{className:"mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800",children:"送信回数の上限に達しました。1時間ほど待ってからお試しください。"}):null,e?.withdrawal==="mail-failed"?a.jsx("p",{className:"mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800",children:"確認メールを送信できませんでした。時間をおいてもう一度お試しください。"}):null,a.jsx("form",{action:"/api/customer-auth/withdrawal/request",method:"post",className:"mt-4",children:a.jsx("button",{type:"submit",className:"inline-flex min-h-12 items-center justify-center rounded-full border border-[#b94c53] bg-white px-6 text-sm font-semibold text-[#9f3f44] transition hover:bg-[#fff0f1]",children:"退会確認メールを送信する"})})]})'
const profileAfter = 'a.jsx("button",{type:"submit",className:"h-12 rounded-full bg-[#8f4f42] px-5 text-sm font-semibold text-white",children:"保存する"})]})]}),' + withdrawalSection + ']})}'
profile = replaceOnce(profile, profileBefore, profileAfter, 'profile withdrawal section')
fs.writeFileSync(profileFile, profile, 'utf8')

const verifiedServer = fs.readFileSync(serverFile, 'utf8')
const verifiedProfile = fs.readFileSync(profileFile, 'utf8')
for (const marker of ['verified-customer-withdrawal-v309-service', 'verified-customer-withdrawal-v309-schema', 'verified-customer-withdrawal-v309-route', 'c."deletedAt" IS NULL']) {
  if (!verifiedServer.includes(marker)) throw new Error(`Missing server marker: ${marker}`)
}
for (const marker of ['退会手続き', '/api/customer-auth/withdrawal/request', '退会確認メールを送信する']) {
  if (!verifiedProfile.includes(marker)) throw new Error(`Missing profile marker: ${marker}`)
}
console.log('Customer email-confirmed withdrawal and session revocation were installed.')
