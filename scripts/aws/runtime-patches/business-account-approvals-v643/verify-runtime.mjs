import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const mode = process.argv[2] || 'verify'

function read(file) { return fs.readFileSync(path.join(root, file), 'utf8') }
function requireText(file, text) {
  if (!read(file).includes(text)) throw new Error(`Missing runtime marker in ${file}: ${text}`)
}
function rejectText(file, text) {
  if (read(file).includes(text)) throw new Error(`Unexpected legacy marker in ${file}: ${text}`)
}

if (mode === 'snapshot') {
  requireText('server.js', "X-Lien-Customer-Store-Limit', 'v642'")
  requireText('server.js', 'managedAccountAccessV629.handle(req, res, url)')
  requireText('platform-operator.js', 'href="/platform/accounts">アカウント発行')
  requireText('wholesale-ordering-v543.js', "['company', '/dealer/company', 'building', '会社・店舗情報']")
  rejectText('server.js', 'businessAccountApprovalsV643')
  console.log(JSON.stringify({ release: 'business-account-approvals-v643', mode, parent: 'v642', ok: true }))
  process.exit(0)
}

for (const file of ['server.js', 'platform-operator.js', 'wholesale-ordering-v543.js', 'managed-account-access-v629.js', 'business-account-approvals-v643.js']) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing runtime file: ${file}`)
}
requireText('server.js', "require('./business-account-approvals-v643')")
requireText('server.js', 'businessAccountApprovalsV643.ensureSchema()')
requireText('server.js', 'businessAccountApprovalsV643.handle(req, res, url)')
requireText('server.js', "X-Lien-Business-Account-Approvals', 'v643'")
requireText('business-account-approvals-v643.js', 'APPROVE_AND_ISSUE')
requireText('business-account-approvals-v643.js', 'mustChangePassword')
requireText('business-account-approvals-v643.js', '認証情報を再発行してメール送信')
requireText('business-account-approvals-v643.js', '利用停止')
requireText('platform-operator.js', 'href="/platform/inquiries">申請・発行')
requireText('platform-operator.js', "paused: '利用停止'")
requireText('wholesale-ordering-v543.js', "['password', '/dealer/password-change', 'key', 'パスワード変更']")
requireText('wholesale-ordering-v543.js', 'preserve operator suspension')
requireText('managed-account-access-v629.js', 'preserve operator suspension')
rejectText('platform-operator.js', 'href="/platform/accounts">アカウント発行')
console.log(JSON.stringify({ release: 'business-account-approvals-v643', mode, ok: true }))
