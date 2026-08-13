const fs = require('fs')
const path = require('path')

const appRoot = process.env.APP_ROOT || '/app'
const read = file => fs.readFileSync(path.join(appRoot, file), 'utf8')
const assert = (condition, message) => { if (!condition) throw new Error(message) }

const server = read('server.js')
const otp = read('.next/server/chunks/2241.js')
const broadcast = read('.next/server/chunks/9845.js')
const registration = read('.next/server/app/u/register/[token]/page.js')
const migration = read('sms-compliance-migration.sql')
const adminStaticDir = path.join(appRoot, '.next', 'static', 'chunks', 'app')
const adminLayoutFile = fs.readdirSync(adminStaticDir).find(name => /^layout-sidebar-boundary-.*\.sms-compliance-v1\.js$/.test(name))
assert(adminLayoutFile, 'versioned admin SMS client chunk missing')
const adminClient = fs.readFileSync(path.join(adminStaticDir, adminLayoutFile), 'utf8')

assert(server.includes("customer.smsTransactionalOptIn !== true"), 'reservation SMS opt-in gate missing')
assert(server.includes("customer.smsTransactionalOptOutAt"), 'reservation SMS opt-out gate missing')
assert(server.includes("!customer.phoneVerifiedAt || !customer.identityVerifiedAt"), 'verified-phone gate missing')
assert(server.indexOf("customer.smsTransactionalOptIn !== true") < server.indexOf('const messageId = await smsPublish'), 'consent gate must precede SNS publish')
assert(server.includes("RESERVATION_CONFIRMATION") && server.includes("RESERVATION_REMINDER") && server.includes("RESERVATION_CHANGED") && server.includes("RESERVATION_CANCELLED"), 'reservation SMS types incomplete')
assert(server.includes("process.env.SMS_SENDER_ID || 'SalonLien'"), 'SalonLien Sender ID fallback missing')
assert(server.includes("url.pathname === '/api/lien-admin-sms-status'") && server.includes('async function adminSmsStatusApi'), 'authenticated admin SMS status API missing')
assert(adminClient.includes('SMS認証・同意状況') && adminClient.includes('閲覧専用です。管理者が顧客の同意なしにONへ変更する操作はありません。'), 'read-only admin consent status client missing')
assert(!server.includes('injectAdminHtml'), 'unsafe admin status HTML response interception remains')

assert(otp.includes('ACCOUNT_VERIFICATION_OTP'), 'OTP audit type missing')
assert(otp.includes('userInitiated'), 'OTP explicit-request audit flag missing')
assert(otp.includes('resend_too_soon'), 'OTP resend interval missing')
assert(!/INSERT INTO \"SmsSendLog\"[^;]{0,1200}codeHash/.test(otp), 'OTP hash/code must not be inserted into send log')
assert(registration.includes('ページ表示や電話番号入力だけでは送信されません'), 'explicit OTP disclosure missing')
assert((registration.match(/phone-verification\/request/g) || []).length === 1, 'unexpected OTP request call count')

const blockedAt = broadcast.indexOf('SMS一斉配信は利用できません')
const bulkSendAt = broadcast.indexOf('phoneIdentity.phoneE164')
assert(blockedAt >= 0, 'bulk SMS server block missing')
assert(bulkSendAt < 0 || blockedAt < bulkSendAt, 'bulk SMS block must precede bulk provider path')

assert(migration.includes('"smsTransactionalOptIn" BOOLEAN NOT NULL DEFAULT false'), 'opt-in must default false')
assert(migration.includes('CustomerPhoneIdentity_org_phone_compliance_key'), 'phone uniqueness index missing')
assert(migration.includes('"awsMessageId" TEXT'), 'AWS message ID log column missing')
assert(migration.includes('"phoneVerifiedAt" TIMESTAMP(3)'), 'phone verification timestamp missing')

console.log(JSON.stringify({ verified: 16, result: 'sms compliance assertions passed' }))
