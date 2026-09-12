import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const here = path.dirname(fileURLToPath(import.meta.url))
const marker = 'managed-bank-debit-accounts-v629'
const changes = []

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8')
}

function write(file, source, label, count = 1) {
  fs.writeFileSync(path.join(root, file), source)
  changes.push({ file, label, count })
}

function replaceExact(file, before, after, expected, label) {
  const source = read(file)
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  write(file, source.split(before).join(after), label, count)
}

function replaceBetween(file, start, end, replacement, label) {
  const source = read(file)
  const startCount = source.split(start).length - 1
  const endCount = source.split(end).length - 1
  if (startCount !== 1 || endCount !== 1) throw new Error(`${label}: expected unique boundaries, found ${startCount}/${endCount}`)
  const from = source.indexOf(start)
  const to = source.indexOf(end, from + start.length)
  if (to < 0) throw new Error(`${label}: end boundary precedes start boundary`)
  write(file, source.slice(0, from) + replacement + source.slice(to), label)
}

function copyRuntimeFile(sourceName, targetName = sourceName) {
  fs.copyFileSync(path.join(here, sourceName), path.join(root, targetName))
  changes.push({ file: targetName, label: `install ${sourceName}`, count: 1 })
}

copyRuntimeFile('managed-account-access-v629.js')

replaceExact(
  'server.js',
  "const { createPlatformOperatorService } = require('./platform-operator') /* platform-readonly-operations-v95 */",
  "const { createPlatformOperatorService, pageShell: renderPlatformPage } = require('./platform-operator') /* platform-readonly-operations-v95 */\nconst { createManagedAccountAccessService } = require('./managed-account-access-v629') /* managed-bank-debit-accounts-v629 */",
  1,
  'load managed account service',
)

const wholesaleServiceAnchor = "const wholesaleOrdering = createWholesaleOrderingService({ prisma, crypto, adminSessionProvider: req => chatSession(req, 'staff') }) /* wholesale-ordering-v543 */"
replaceExact(
  'server.js',
  wholesaleServiceAnchor,
  `${wholesaleServiceAnchor}\nconst managedAccountAccessV629 = createManagedAccountAccessService({ prisma, crypto, operatorSession: req => platformOperator.session(req), renderPage: renderPlatformPage }) /* ${marker}-service */`,
  1,
  'initialize managed account service',
)

const wholesaleSchemaAnchor = '  await wholesaleOrdering.ensureSchema() /* wholesale-ordering-v543 */'
replaceExact(
  'server.js',
  wholesaleSchemaAnchor,
  `${wholesaleSchemaAnchor}\n  await managedAccountAccessV629.ensureSchema() /* ${marker}-schema */`,
  1,
  'initialize managed account schema and bank debit state',
)

const platformRouteAnchor = '      if (await platformOperator.handle(req, res, url)) return /* platform-readonly-operations-v95-route */'
replaceExact(
  'server.js',
  platformRouteAnchor,
  `      if (await managedAccountAccessV629.handle(req, res, url)) return /* ${marker}-route */\n${platformRouteAnchor}`,
  1,
  'route managed account pages before platform catch-all',
)

const readinessAnchor = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-List-Pagination', 'v628') /* list-pagination-performance-v628-ready */"
replaceExact(
  'server.js',
  readinessAnchor,
  `${readinessAnchor}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Managed-Bank-Accounts', 'v629') /* ${marker}-ready */`,
  1,
  'managed account readiness marker',
)

replaceExact(
  'platform-operator.js',
  '<a class="readonly" href="/platform">店舗一覧</a><a class="readonly" href="/platform/customers">顧客台帳</a><span class="readonly" aria-label="運営者権限">',
  '<a class="readonly" href="/platform">店舗一覧</a><a class="readonly" href="/platform/accounts">アカウント発行</a><a class="readonly" href="/platform/customers">顧客台帳</a><span class="readonly" aria-label="運営者権限">',
  1,
  'add account issuance navigation',
)

replaceExact(
  'platform-operator.js',
  '店舗管理者・一般スタッフ・顧客アカウントではアクセスできません。データの変更機能を持たない運営者権限画面です。',
  '店舗管理者・一般スタッフ・顧客アカウントではアクセスできません。事業者アカウントの発行操作は監査履歴に記録されます。',
  1,
  'update platform operator capability notice',
)

replaceExact(
  'platform-operator.js',
  '  dashboardPage,\n}',
  '  dashboardPage,\n  pageShell,\n  escapeHtml,\n}',
  1,
  'export platform page renderer',
)

replaceExact(
  'billing.js',
  `    await prisma.$transaction(async function (tx) {
      await tx.$queryRawUnsafe("SELECT 1::int AS locked FROM (SELECT pg_advisory_xact_lock(hashtext('salon_de_lien_billing_v1'))) AS guard")
      for (const statement of statements) await tx.$executeRawUnsafe(statement)
    })
`,
  `    await prisma.$transaction(async function (tx) {
      await tx.$queryRawUnsafe("SELECT 1::int AS locked FROM (SELECT pg_advisory_xact_lock(hashtext('salon_de_lien_billing_v1'))) AS guard")
      for (const statement of statements) await tx.$executeRawUnsafe(statement)
      await tx.$executeRawUnsafe(\`UPDATE "OrganizationBilling" SET "onboardingStatus"='BANK_DEBIT_MANAGED',"subscriptionStatus"='active',"stripeCheckoutSessionId"=NULL,"updatedAt"=NOW() WHERE "onboardingStatus"<>'BANK_DEBIT_MANAGED' OR "subscriptionStatus"<>'active' OR "stripeCheckoutSessionId" IS NOT NULL\`)
    })
`,
  1,
  'migrate all salons to bank debit management',
)

replaceBetween(
  'billing.js',
  '  async function enforceAccess(req, res, url) {\n',
  '  async function handle(req, res, url) {\n',
  `  async function enforceAccess() {
    return false /* managed-bank-debit-accounts-v629: access is controlled by issued active accounts */
  }

`,
  'remove card-based salon access gate',
)

replaceBetween(
  'billing.js',
  '  async function handle(req, res, url) {\n',
  '  return {\n    ensureSchema,\n',
  `  async function handle(req, res, url) {
    if (url.pathname === '/api/stripe/webhook') {
      if (req.method !== 'POST') {
        res.statusCode = 405
        res.setHeader('Allow', 'POST')
        res.end()
        return true
      }
      safeJson(res, 200, { received: true, ignored: true, paymentMethod: 'bank_debit' })
      return true
    }
    if (url.pathname === '/admin/register') {
      redirect(res, '/admin/login?managed=1', req.method === 'GET' || req.method === 'HEAD' ? 302 : 303)
      return true
    }
    if (url.pathname === '/admin/onboarding') {
      redirect(res, '/admin/appointments', 307)
      return true
    }
    if (url.pathname === '/admin/owner-analytics' && url.searchParams.get('section') === 'billing') {
      redirect(res, '/admin/owner-analytics', 302)
      return true
    }
    if (url.pathname.startsWith('/api/admin/billing/')) {
      const session = await sessionProvider(req)
      if (!session || !session.organizationId) safeJson(res, 401, { error: '認証が必要です。' })
      else safeJson(res, 410, { error: 'システム利用料は銀行口座振替として運営が管理します。カード登録は必要ありません。', paymentMethod: 'bank_debit', managedByOperator: true })
      return true
    }
    return false
  }

`,
  'disable salon self-registration and card billing routes',
)

replaceExact(
  '.next/server/app/admin/login/page.js',
  'メールアドレスまたはID',
  '運営発行ID',
  2,
  'label salon login with operator-issued ID',
)

replaceExact(
  '.next/server/app/admin/login/page.js',
  's.jsx(n.default,{href:"/admin/register",className:"mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-full border border-[#d8b3aa] bg-[#fff8f5] px-5 text-sm font-semibold text-[#8f4f42] transition hover:border-[#8f4f42] hover:bg-[#f8e7e1] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e9c9be]",children:"新規店舗登録はこちら"})',
  's.jsx("div",{className:"mt-4 rounded-2xl border border-[#d8b3aa] bg-[#fff8f5] px-4 py-3 text-sm leading-6 text-[#6b5f56]",children:"美容室アカウントは、契約確認後にORIMIA運営が発行します。案内されたIDを入力してください。"})',
  1,
  'remove public salon registration link',
)

replaceExact(
  '.next/server/app/api/auth/login/route.js',
  'OR:[{email:{equals:f,mode:"insensitive"}},{loginId:{equals:f,mode:"insensitive"}}]',
  'loginId:{equals:f,mode:"insensitive"}',
  1,
  'authenticate salon users by issued ID',
)

replaceExact(
  '.next/server/app/admin/owner-analytics/page.js',
  `            {
              key: "billing",
              href: "/admin/owner-analytics?section=billing",
              label: "システム利用料",
            },
`,
  '',
  1,
  'remove salon billing tab',
)

replaceExact(
  '.next/server/app/admin/owner-analytics/page.js',
  'grid w-full grid-cols-3 gap-1',
  'grid w-full grid-cols-2 gap-1',
  1,
  'resize owner analytics tabs',
)

replaceExact(
  'audience-sites.js',
  "  const register = onboarding ? '/admin/register' : 'mailto:support@salon-de-lien.com'\n  const registerLabel = onboarding ? '店舗の新規登録' : '導入について相談する'",
  "  const register = 'mailto:support@salon-de-lien.com?subject=ORIMIA%20for%20Salon%20導入相談'\n  const registerLabel = '導入について相談する'",
  1,
  'remove salon public registration CTA',
)

replaceExact(
  'audience-sites.js',
  `    \`<section class="billing-note"><div class="wrap">\${heading('SUBSCRIPTION', '店舗に合わせて、利用をスタート。', '月額利用制です。登録画面で利用プランと料金をご確認のうえ、クレジットカード決済を設定してご利用いただきます。')}<p>お支払いはStripeを利用します。利用できる機能・条件は契約プランによって異なります。</p></div></section>\` +
    steps({ title:'導入までの流れ', introduction:'店舗情報と、お申し込みに使うメールアドレスをご用意ください。', items:[['店舗を登録','メールアドレスを確認し、店舗・オーナー・共通アカウントの情報を登録します。'],['利用プラン・決済を設定','契約内容を確認し、クレジットカード決済を設定します。'],['店舗の運用を設定','メニューやスタッフ、営業時間を設定し、お客様に登録方法をご案内します。']], action:link(register, registerLabel, 'primary') }) +`,
  `    \`<section class="billing-note"><div class="wrap">\${heading('MANAGED CONTRACT', '運営発行アカウントで、利用をスタート。', '契約内容を確認後、ORIMIA運営から店舗専用のログインIDを発行します。クレジットカード登録は必要ありません。')}<p>月額利用料は銀行口座振替でお支払いいただきます。利用できる機能・条件は契約プランによって異なります。</p></div></section>\` +
    steps({ title:'導入までの流れ', introduction:'導入をご希望の店舗は、ORIMIA運営へお問い合わせください。', items:[['導入内容を確認','店舗情報と契約内容、銀行口座振替のお手続きを確認します。'],['運営発行IDを受け取る','契約確認後、店舗専用のログインIDを運営から発行します。'],['店舗の運用を設定','発行されたIDでログインし、メニューやスタッフ、営業時間を設定します。']], action:link(register, registerLabel, 'primary') }) +`,
  1,
  'describe salon managed bank debit onboarding',
)

replaceExact(
  'audience-sites.js',
  "actions:link('/dealer/register', 'ディーラーの新規登録', 'primary') + link('/dealer/login', 'ログイン', 'secondary')",
  "actions:link('mailto:support@salon-de-lien.com?subject=ORIMIA%20Partner%20導入相談', '導入について相談する', 'primary') + link('/dealer/login', 'ログイン', 'secondary')",
  1,
  'remove dealer public registration hero CTA',
)

replaceExact(
  'audience-sites.js',
  `    \`<section class="billing-note"><div class="wrap">\${heading('SUBSCRIPTION', 'クレジットカードで、月額利用。', 'アカウント登録後、利用料金・契約内容を確認し、Stripeでクレジットカード決済を設定してご利用いただきます。')}<p>システムの利用料と、美容室との商品取引に関する代金は別です。</p></div></section>\` +
    steps({ title:'取引をつなぐ、3つのステップ。', introduction:'登録用メールアドレスと会社情報をご用意ください。', items:[['アカウント・会社情報を登録','確認メールから初期設定を行い、自社の情報と連絡先を登録します。'],['利用契約・決済を設定','利用料金を確認し、クレジットカード決済を設定します。'],['美容室と連携する','固有コードを案内し、取引先ごとの商品と割引率を設定します。']], action:link('/dealer/register', 'ディーラーの新規登録', 'primary') }) +`,
  `    \`<section class="billing-note"><div class="wrap">\${heading('MANAGED CONTRACT', '運営発行アカウントで、月額利用。', '契約確認後、ORIMIA運営からディーラー専用のログインIDと固有コードを発行します。カード登録は必要ありません。')}<p>月額利用料は銀行口座振替でお支払いいただきます。美容室との商品取引に関する代金とは別に管理します。</p></div></section>\` +
    steps({ title:'取引をつなぐ、3つのステップ。', introduction:'導入をご希望の事業者は、ORIMIA運営へお問い合わせください。', items:[['導入内容を確認','会社情報と契約内容、銀行口座振替のお手続きを確認します。'],['運営発行IDを受け取る','契約確認後、ログインIDとディーラー固有コードを運営から発行します。'],['美容室と連携する','発行された固有コードを案内し、取引先ごとの商品と割引率を設定します。']], action:link('mailto:support@salon-de-lien.com?subject=ORIMIA%20Partner%20導入相談', '導入について相談する', 'primary') }) +`,
  1,
  'describe dealer managed bank debit onboarding',
)

const dealerLogin = fs.readFileSync(path.join(here, 'dealer-login-v629.fragment.js'), 'utf8')
replaceBetween(
  'wholesale-ordering-v543.js',
  'function dealerLoginPage({ error = \'\', setup = \'\', registered = \'\', reset = \'\' } = {}) {\n',
  'function dealerRegistrationRequestPage({ sent = false, error = \'\' } = {}) {\n',
  dealerLogin,
  'replace dealer login with operator-issued ID flow',
)

replaceExact(
  'wholesale-ordering-v543.js',
  `    billing: { title: 'システム利用料', eyebrow: 'BILLING & PLAN', description: 'Stripeでカードを登録し、ORIMIA Partnerの契約状況を管理します。' },
`,
  '',
  1,
  'remove dealer billing page metadata',
)

replaceExact(
  'wholesale-ordering-v543.js',
  `    ['billing', '/dealer/billing', 'card', 'システム利用料'],
`,
  '',
  1,
  'remove dealer billing navigation',
)

replaceExact(
  'wholesale-ordering-v543.js',
  "'PAYMENT_REQUIRED','none'",
  "'BANK_DEBIT_MANAGED','active'",
  2,
  'create dealer billing records as bank debit managed',
)

replaceExact(
  'wholesale-ordering-v543.js',
  `        ON CONFLICT ("dealerId") DO UPDATE SET "monthlyAmount"=EXCLUDED."monthlyAmount","updatedAt"="WholesaleDealerBilling"."updatedAt"\`, DEALER_PLAN_KEY, billingConfig.monthlyAmount)
`,
  `        ON CONFLICT ("dealerId") DO UPDATE SET "monthlyAmount"=EXCLUDED."monthlyAmount","updatedAt"="WholesaleDealerBilling"."updatedAt"\`, DEALER_PLAN_KEY, billingConfig.monthlyAmount)
      await prisma.$executeRawUnsafe(\`UPDATE "WholesaleDealerBilling" SET "onboardingStatus"='BANK_DEBIT_MANAGED',"subscriptionStatus"='active',"stripeCheckoutSessionId"=NULL,"updatedAt"=NOW() WHERE "onboardingStatus"<>'BANK_DEBIT_MANAGED' OR "subscriptionStatus"<>'active' OR "stripeCheckoutSessionId" IS NOT NULL\`)
`,
  1,
  'migrate non-Stripe dealers to bank debit management',
)

replaceExact(
  'wholesale-ordering-v543.js',
  `  function dealerBillingAllowed(billing) {
    return Boolean(billing && DEALER_BILLING_ALLOWED_STATUSES.has(String(billing.subscriptionStatus || 'none')))
  }
`,
  `  function dealerBillingAllowed() {
    return true /* managed-bank-debit-accounts-v629 */
  }
`,
  1,
  'remove dealer card subscription access gate',
)

replaceExact(
  'wholesale-ordering-v543.js',
  "redirect(res, (await dealerAccessState(session.id)).allowed ? '/dealer/orders' : '/dealer/billing', 302); return true",
  "redirect(res, '/dealer/orders', 302); return true",
  4,
  'send authenticated dealer sessions to orders',
)

replaceBetween(
  'wholesale-ordering-v543.js',
  "    if (pathname === '/dealer/register' && req.method === 'GET') {\n",
  "    if (pathname === '/dealer/password-reset' && req.method === 'GET') {\n",
  `    if ((pathname === '/dealer/register' || pathname.startsWith('/dealer/register/')) && req.method === 'GET') {
      redirect(res, '/dealer/login?managed=1', 302); return true
    }
`,
  'disable dealer public registration pages',
)

replaceBetween(
  'wholesale-ordering-v543.js',
  "    if (pathname === '/dealer/setup' && req.method === 'GET') {\n",
  '    const dealerPageMatch = pathname.match(',
  `    if (pathname === '/dealer/setup' && req.method === 'GET') {
      redirect(res, '/dealer/login?managed=1', 302); return true
    }
    if (pathname === '/dealer/billing' && req.method === 'GET') {
      redirect(res, '/dealer/orders', 302); return true
    }
`,
  'disable invitation setup and dealer billing page',
)

replaceExact(
  'wholesale-ordering-v543.js',
  "    const dealerPageMatch = pathname.match(/^\\/dealer\\/(orders|salons|products|pricing|company|billing)$/)\n",
  "    const dealerPageMatch = pathname.match(/^\\/dealer\\/(orders|salons|products|pricing|company)$/)\n",
  1,
  'exclude billing from dealer page routes',
)

replaceExact(
  'wholesale-ordering-v543.js',
  `      if (!['company', 'billing'].includes(dealerPageMatch[1]) && !(await dealerAccessState(session.id)).allowed) {
        redirect(res, '/dealer/billing?required=1&next=' + encodeURIComponent(pathname), 302); return true
      }
`,
  '',
  1,
  'remove dealer page card gate',
)

replaceExact(
  'wholesale-ordering-v543.js',
  `AND (LOWER("loginId")=LOWER($1) OR LOWER(COALESCE("email",\\'\\'))=LOWER($1)) LIMIT 1`,
  `AND LOWER("loginId")=LOWER($1) LIMIT 1`,
  1,
  'authenticate dealers by issued ID',
)

replaceExact(
  'wholesale-ordering-v543.js',
  "        redirect(res, (await dealerAccessState(rows[0].id)).allowed ? '/dealer/orders' : '/dealer/billing'); return true",
  "        redirect(res, '/dealer/orders'); return true",
  1,
  'complete dealer login without billing detour',
)

replaceBetween(
  'wholesale-ordering-v543.js',
  "    if (pathname === '/api/dealer/auth/setup' && req.method === 'POST') {\n",
  "    if (pathname === '/api/dealer/auth/password-reset/request' && req.method === 'POST') {\n",
  `    if (req.method === 'POST' && ['/api/dealer/auth/setup', '/api/dealer/auth/register/request', '/api/dealer/auth/register/confirm'].includes(pathname)) {
      json(res, 410, { ok: false, error: 'ディーラーアカウントはORIMIA運営が発行します。運営から案内されたIDでログインしてください。' }); return true
    }
`,
  'disable dealer account creation APIs',
)

replaceExact(
  'wholesale-ordering-v543.js',
  "    if (!(await dealerAccessState(dealer.id)).allowed) return redirect(res, '/dealer/billing?required=1', 302)\n",
  '',
  1,
  'remove delivery note billing gate',
)

replaceBetween(
  'wholesale-ordering-v543.js',
  "        if (pathname === '/api/dealer/billing/status' && req.method === 'GET') {\n",
  "        if (pathname === '/api/dealer/bootstrap' && req.method === 'GET')",
  `        if (pathname.startsWith('/api/dealer/billing/')) {
          json(res, 410, { ok: false, error: '利用料は銀行口座振替としてORIMIA運営が管理します。カード登録は必要ありません。', paymentMethod: 'bank_debit' }); return true
        }
        if (pathname === '/api/dealer/profile' && req.method === 'POST') {
          if (!validSameOrigin(req)) throw new WholesaleError('安全性を確認できないため処理できませんでした。', 403)
          const payload = await readPayload(req)
          json(res, 200, { ok: true, profile: await updateDealerProfile(session, payload) }); return true
        }
`,
  'disable dealer billing APIs and retain profile updates',
)

replaceBetween(
  'wholesale-ordering-client-v543.js',
  '  function dealerBilling() {\n',
  '  function dealerCodePanel() {\n',
  '  /* managed-bank-debit-accounts-v629: card billing UI removed */\n\n',
  'remove dealer card billing renderer',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  `    if (response.status === 402 && page === 'dealer') {
      location.assign(payload.billingUrl || '/dealer/billing')
      throw new Error(payload.error || 'クレジットカードの登録が必要です。')
    }
`,
  `    if (response.status === 402 && page === 'dealer') {
      throw new Error(payload.error || 'アカウントの利用状態を確認してください。')
    }
`,
  1,
  'remove client billing redirect fallback',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  '    billing: null,\n',
  '',
  1,
  'remove dealer billing state',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  `    if (dealer.view === 'billing') {
      root.innerHTML = dealerBilling()
      return
    }
`,
  '',
  1,
  'remove dealer billing render branch',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  `    if (dealer.view === 'billing') {
      const params = new URLSearchParams()
      if (refreshBilling) params.set('refresh', '1')
      const sessionId = new URLSearchParams(location.search).get('session_id')
      if (sessionId) params.set('session_id', sessionId)
      const query = params.toString()
      const result = await api('/api/dealer/billing/status' + (query ? '?' + query : ''))
      dealer.billing = result.billing
      renderDealer()
      return
    }
`,
  '',
  1,
  'remove dealer billing reload branch',
)

replaceBetween(
  'wholesale-ordering-client-v543.js',
  "      else if (target.dataset.action === 'start-billing-checkout') {\n",
  "      else if (target.dataset.action === 'approve-contract') {\n",
  '',
  'remove dealer billing actions',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  `      if (event.target.id === 'dealer-billing-agreement') {
        const button = root.querySelector('[data-action="start-billing-checkout"]')
        if (button) button.disabled = !event.target.checked || !dealer.billing || !dealer.billing.configured
        return
      }
`,
  '',
  1,
  'remove dealer billing agreement handler',
)

replaceBetween(
  'wholesale-ordering-client-v543.js',
  '  async function pollDealerBilling() {\n',
  '  async function start() {\n',
  '',
  'remove dealer billing polling',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  '        pollDealerBilling()\n',
  '',
  1,
  'remove dealer billing poll invocation',
)

fs.writeFileSync('/tmp/managed-bank-debit-accounts-v629-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({ release: marker, modified: [...new Set(changes.map(change => change.file))] }))
