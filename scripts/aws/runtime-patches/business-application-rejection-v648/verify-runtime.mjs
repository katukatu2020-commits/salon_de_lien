import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const mode = process.argv[2] || 'verify'

function read(file) { return fs.readFileSync(path.join(root, file), 'utf8') }
function requireText(file, text) {
  if (!read(file).includes(text)) throw new Error(`Missing runtime marker in ${file}: ${text}`)
}
function rejectText(file, text) {
  if (read(file).includes(text)) throw new Error(`Unexpected runtime marker in ${file}: ${text}`)
}

if (mode === 'snapshot') {
  requireText('server.js', "X-Lien-Style-Admin-Pagination', 'v647'")
  requireText('server.js', "X-Lien-Business-Account-Approvals', 'v643'")
  requireText('business-account-approvals-v643.js', 'APPROVE_AND_ISSUE')
  rejectText('server.js', 'X-Lien-Business-Application-Rejection')
  rejectText('business-account-approvals-v643.js', 'BusinessInquiryRejection')
  console.log(JSON.stringify({ release: 'business-application-rejection-v648', mode, parent: 'v647', ok: true }))
  process.exit(0)
}

for (const file of ['server.js', 'business-account-approvals-v643.js']) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing runtime file: ${file}`)
}

requireText('server.js', "X-Lien-Business-Application-Rejection', 'v648'")
requireText('server.js', "X-Lien-Style-Admin-Pagination', 'v647'")
requireText('business-account-approvals-v643.js', "APPLICATION_REJECTION_RELEASE = 'business-application-rejection-v648'")
requireText('business-account-approvals-v643.js', 'CREATE TABLE IF NOT EXISTS "BusinessInquiryRejection"')
requireText('business-account-approvals-v643.js', 'REJECT_APPLICATION')
requireText('business-account-approvals-v643.js', 'REJECTION_MAIL_RESENT')
requireText('business-account-approvals-v643.js', '(approve|resend|reject|reject-resend)')
requireText('business-account-approvals-v643.js', '却下してメール送信')
requireText('business-account-approvals-v643.js', '却下メールを再送')
requireText('business-account-approvals-v643.js', '今回はご利用アカウントの発行を見送らせていただくこととなりました。')
requireText('business-account-approvals-v643.js', "throw new BusinessAccessError('rejected', 409)")

console.log(JSON.stringify({ release: 'business-application-rejection-v648', mode, schema: true, routes: true, mail: true, ui: true, concurrencyGuard: true }))
