import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const changes = []

function target(file) { return path.join(root, file) }
function read(file) { return fs.readFileSync(target(file), 'utf8') }

function replaceExact(file, before, after) {
  const source = read(file)
  if (source.split(before).length !== 2) throw new Error(`Unexpected v642 parent anchor: ${file} / ${before.slice(0, 120)}`)
  fs.writeFileSync(target(file), source.replace(before, after))
  changes.push({ file, before, after })
}

replaceExact(
  'server.js',
  "const { createPlatformOperatorService, pageShell: renderPlatformPage } = require('./platform-operator') /* platform-readonly-operations-v95 */",
  "const { createPlatformOperatorService, pageShell: renderPlatformPage, dashboardPage: renderPlatformDashboard } = require('./platform-operator') /* platform-readonly-operations-v95 */\nconst { createBusinessAccountApprovalService } = require('./business-account-approvals-v643') /* business-account-approvals-v643 */\nconst { sendDealerAuthPostmark: sendBusinessAccountMailV643 } = require('./dealer-auth-postmark-v555') /* business-account-approvals-v643-mail */",
)

replaceExact(
  'server.js',
  "const managedAccountAccessV629 = createManagedAccountAccessService({ prisma, crypto, operatorSession: req => platformOperator.session(req), renderPage: renderPlatformPage }) /* managed-bank-debit-accounts-v629-service */",
  "const managedAccountAccessV629 = createManagedAccountAccessService({ prisma, crypto, operatorSession: req => platformOperator.session(req), renderPage: renderPlatformPage }) /* managed-bank-debit-accounts-v629-service */\nconst businessAccountApprovalsV643 = createBusinessAccountApprovalService({\n  prisma, crypto,\n  operatorSession: req => platformOperator.session(req),\n  adminSessionProvider: req => chatSession(req, 'staff'),\n  dealerSessionProvider: req => wholesaleOrdering.dealerSession(req),\n  renderPlatformPage,\n  baseDashboardProvider: () => platformOperator.loadDashboard(),\n  renderBaseDashboard: renderPlatformDashboard,\n  mailSender: sendBusinessAccountMailV643,\n}) /* business-account-approvals-v643-service */",
)

replaceExact(
  'server.js',
  "  await managedAccountAccessV629.ensureSchema() /* managed-bank-debit-accounts-v629-schema */",
  "  await managedAccountAccessV629.ensureSchema() /* managed-bank-debit-accounts-v629-schema */\n  await businessInquiriesV637.ensureSchema() /* business-account-approvals-v643-inquiry-schema */\n  await businessAccountApprovalsV643.ensureSchema() /* business-account-approvals-v643-schema */",
)

replaceExact(
  'server.js',
  "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Managed-Bank-Accounts', 'v629') /* managed-bank-debit-accounts-v629-ready */",
  "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Managed-Bank-Accounts', 'v629') /* managed-bank-debit-accounts-v629-ready */\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Business-Account-Approvals', 'v643') /* business-account-approvals-v643-ready */",
)

replaceExact(
  'server.js',
  "      if (await stampProgramV603.handle(req,res,url)) return /* stamp-program-v603-route */",
  "      if (await businessAccountApprovalsV643.handle(req, res, url)) return /* business-account-approvals-v643-route */\n      if (await stampProgramV603.handle(req,res,url)) return /* stamp-program-v603-route */",
)

replaceExact(
  'platform-operator.js',
  "active: '利用中', trialing: '無料トライアル', past_due: '支払い確認中', unpaid: '未払い',\n    canceled: '解約済み', incomplete: '契約未完了', incomplete_expired: '契約期限切れ', none: '未契約',",
  "active: '利用中', trialing: '無料トライアル', past_due: '支払い確認中', unpaid: '未払い', paused: '利用停止',\n    canceled: '解約済み', incomplete: '契約未完了', incomplete_expired: '契約期限切れ', none: '未契約',",
)

replaceExact(
  'platform-operator.js',
  "if (value === 'past_due' || value === 'unpaid') return 'danger'",
  "if (value === 'past_due' || value === 'unpaid' || value === 'paused') return 'danger'",
)

replaceExact(
  'platform-operator.js',
  '<a class="readonly" href="/platform">店舗一覧</a><a class="readonly" href="/platform/accounts">アカウント発行</a><a class="readonly" href="/platform/inquiries">導入相談</a><a class="readonly" href="/platform/customers">顧客台帳</a>',
  '<a class="readonly" href="/platform">ダッシュボード</a><a class="readonly" href="/platform/inquiries">申請・発行</a><a class="readonly" href="/platform/customers">顧客台帳</a>',
)

replaceExact(
  'wholesale-ordering-v543.js',
  "    ['company', '/dealer/company', 'building', '会社・店舗情報'],",
  "    ['company', '/dealer/company', 'building', '会社・店舗情報'],\n    ['password', '/dealer/password-change', 'key', 'パスワード変更'],",
)

const dealerBillingActivation = `      await prisma.$executeRawUnsafe(\`UPDATE "WholesaleDealerBilling" SET "onboardingStatus"='BANK_DEBIT_MANAGED',"subscriptionStatus"='active',"stripeCheckoutSessionId"=NULL,"updatedAt"=NOW() WHERE "onboardingStatus"<>'BANK_DEBIT_MANAGED' OR "subscriptionStatus"<>'active' OR "stripeCheckoutSessionId" IS NOT NULL\`)`
replaceExact(
  'wholesale-ordering-v543.js',
  dealerBillingActivation,
  `      await prisma.$executeRawUnsafe(\`UPDATE "WholesaleDealerBilling" SET "onboardingStatus"='BANK_DEBIT_MANAGED',"subscriptionStatus"=CASE WHEN "subscriptionStatus"='paused' THEN 'paused' ELSE 'active' END,"stripeCheckoutSessionId"=NULL,"updatedAt"=NOW() WHERE "onboardingStatus"<>'BANK_DEBIT_MANAGED' OR "subscriptionStatus" NOT IN ('active','paused') OR "stripeCheckoutSessionId" IS NOT NULL\`) /* business-account-approvals-v643: preserve operator suspension */`,
)

replaceExact(
  'managed-account-access-v629.js',
  `      await prisma.$executeRawUnsafe(\`UPDATE "OrganizationBilling" SET "onboardingStatus"='BANK_DEBIT_MANAGED',"subscriptionStatus"='active',"stripeCheckoutSessionId"=NULL,"updatedAt"=NOW() WHERE "onboardingStatus"<>'BANK_DEBIT_MANAGED' OR "subscriptionStatus"<>'active' OR "stripeCheckoutSessionId" IS NOT NULL\`)`,
  `      await prisma.$executeRawUnsafe(\`UPDATE "OrganizationBilling" SET "onboardingStatus"='BANK_DEBIT_MANAGED',"subscriptionStatus"=CASE WHEN "subscriptionStatus"='paused' THEN 'paused' ELSE 'active' END,"stripeCheckoutSessionId"=NULL,"updatedAt"=NOW() WHERE "onboardingStatus"<>'BANK_DEBIT_MANAGED' OR "subscriptionStatus" NOT IN ('active','paused') OR "stripeCheckoutSessionId" IS NOT NULL\`) /* business-account-approvals-v643: preserve operator suspension */`,
)

replaceExact(
  'managed-account-access-v629.js',
  `      await prisma.$executeRawUnsafe(\`UPDATE "WholesaleDealerBilling" SET "onboardingStatus"='BANK_DEBIT_MANAGED',"subscriptionStatus"='active',"stripeCheckoutSessionId"=NULL,"updatedAt"=NOW() WHERE "onboardingStatus"<>'BANK_DEBIT_MANAGED' OR "subscriptionStatus"<>'active' OR "stripeCheckoutSessionId" IS NOT NULL\`)`,
  `      await prisma.$executeRawUnsafe(\`UPDATE "WholesaleDealerBilling" SET "onboardingStatus"='BANK_DEBIT_MANAGED',"subscriptionStatus"=CASE WHEN "subscriptionStatus"='paused' THEN 'paused' ELSE 'active' END,"stripeCheckoutSessionId"=NULL,"updatedAt"=NOW() WHERE "onboardingStatus"<>'BANK_DEBIT_MANAGED' OR "subscriptionStatus" NOT IN ('active','paused') OR "stripeCheckoutSessionId" IS NOT NULL\`) /* business-account-approvals-v643: preserve operator suspension */`,
)

fs.writeFileSync('/tmp/business-account-approvals-v643-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({ release: 'business-account-approvals-v643', changedFiles: [...new Set(changes.map(change => change.file))], changes: changes.length }))
