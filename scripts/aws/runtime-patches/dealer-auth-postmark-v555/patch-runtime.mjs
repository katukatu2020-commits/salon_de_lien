import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const patchRoot = path.dirname(fileURLToPath(import.meta.url))
const servicePath = path.join(root, 'wholesale-ordering-v543.js')
const serverPath = path.join(root, 'server.js')
const marker = 'dealer-auth-postmark-v555'

function replaceExactly(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected 1 match, found ${count}`)
  return source.replace(before, after)
}

let service = fs.readFileSync(servicePath, 'utf8')
let server = fs.readFileSync(serverPath, 'utf8')

if (service.includes(marker) || server.includes(marker)) {
  throw new Error(`${marker}: patch already applied`)
}

fs.copyFileSync(
  path.join(patchRoot, 'dealer-auth-postmark-v555.js'),
  path.join(root, 'dealer-auth-postmark-v555.js'),
)

const originPolicyImport = `const { validDealerRequestOrigin } = require('./dealer-origin-policy-v554') /* dealer-form-origin-v554 */`
service = replaceExactly(
  service,
  originPolicyImport,
  `${originPolicyImport}\nconst { sendDealerAuthPostmark } = require('./dealer-auth-postmark-v555') /* ${marker} */`,
  'Postmark sender import',
)

const mailBlockStart = service.indexOf('function base64Url(value) {')
const mailBlockEnd = service.indexOf('\nfunction icon(name, className = \'\') {', mailBlockStart)
if (mailBlockStart < 0 || mailBlockEnd < 0 || service.indexOf('function base64Url(value) {', mailBlockStart + 1) >= 0) {
  throw new Error('legacy Gmail mail block was not found exactly once')
}

const postmarkMailBlock = `async function sendDealerAuthMail(input) {
  const securityLines = input.oneTime === false
    ? ['このメールに心当たりがない場合は、何もせず削除してください。']
    : [\`このURLは送信から\${Math.round(AUTH_TOKEN_SECONDS / 60)}分間、一度だけ有効です。\`, '心当たりがない場合は、このメールを削除してください。']
  const textBody = [
    'ORIMIA PARTNER NETWORK',
    '',
    input.title,
    '',
    input.lead,
    ...(input.loginId ? ['', \`ログインID: \${input.loginId}\`] : []),
    '',
    input.actionUrl,
    '',
    ...securityLines,
  ].join('\\r\\n')
  return sendDealerAuthPostmark({
    to: input.to,
    subject: input.subject,
    textBody,
    htmlBody: dealerAuthMailHtml(input),
  })
}
`

service = service.slice(0, mailBlockStart) + postmarkMailBlock + service.slice(mailBlockEnd)
const gmailProviderCount = service.split(`provider: 'gmail'`).length - 1
if (gmailProviderCount !== 3) throw new Error(`Gmail provider logs: expected 3 matches, found ${gmailProviderCount}`)
service = service.replaceAll(`provider: 'gmail'`, `provider: 'postmark'`)
service += `\n/* ${marker} */\n`

const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Dealer-Form-Origin', 'v554') /* dealer-form-origin-v554 */`
server = replaceExactly(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Dealer-Auth-Mail', 'v555') /* ${marker} */`,
  'readiness marker',
)
server += `\n/* ${marker} */\n`

fs.writeFileSync(servicePath, service)
fs.writeFileSync(serverPath, server)

console.log(JSON.stringify({ release: marker, patched: true }))
