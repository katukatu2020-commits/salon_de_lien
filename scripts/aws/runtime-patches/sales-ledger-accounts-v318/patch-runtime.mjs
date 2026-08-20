import fs from 'node:fs'

const replaceOnce = (source, search, replacement, label) => {
  const count = source.split(search).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(search, replacement)
}

const serverFile = '/app/server.js'
let server = fs.readFileSync(serverFile, 'utf8')
server = replaceOnce(server,
  `const { createCustomerWithdrawalService } = require('./customer-withdrawal-v309') /* verified-customer-withdrawal-v309 */`,
  `const { createCustomerWithdrawalService } = require('./customer-withdrawal-v309') /* verified-customer-withdrawal-v309 */
const { createSalesLedgerAccountsService } = require('./sales-ledger-accounts-v318') /* sales-ledger-accounts-v318 */`,
  'server sales service import')
server = replaceOnce(server,
  `const appointmentOperations = createAppointmentOperationsService({`,
  `const salesLedgerAccounts = createSalesLedgerAccountsService({
  prisma,
  crypto,
  sessionProvider: req => chatSession(req, 'staff'),
}) /* sales-ledger-accounts-v318-service */
const appointmentOperations = createAppointmentOperationsService({`,
  'server sales service instance')
server = replaceOnce(server,
  `  await customerWithdrawal.ensureSchema() /* verified-customer-withdrawal-v309-schema */`,
  `  await customerWithdrawal.ensureSchema() /* verified-customer-withdrawal-v309-schema */
  await salesLedgerAccounts.ensureSchema() /* sales-ledger-accounts-v318-schema */`,
  'server sales schema')
server = replaceOnce(server,
  `      if (await customerWithdrawal.handle(req, res, url)) return /* verified-customer-withdrawal-v309-route */`,
  `      if (await customerWithdrawal.handle(req, res, url)) return /* verified-customer-withdrawal-v309-route */
      if (await salesLedgerAccounts.handle(req, res, url)) return /* sales-ledger-accounts-v318-route */`,
  'server sales route')
fs.writeFileSync(serverFile, server)

const tenantClientFile = '/app/tenant-setup-client.js'
let tenantClient = fs.readFileSync(tenantClientFile, 'utf8')
tenantClient += `\n;(() => { if (document.querySelector('script[data-sales-ledger-v318]')) return; const script=document.createElement('script'); script.src='/sales-ledger-v318.js?v=318'; script.dataset.salesLedgerV318='1'; script.defer=true; document.head.appendChild(script) })();\n`
fs.writeFileSync(tenantClientFile, tenantClient)

const billingFile = '/app/billing.js'
let billing = fs.readFileSync(billingFile, 'utf8')
billing = replaceOnce(billing,
  `<div class="field"><label for="displayName">オーナー名</label><input id="displayName" name="displayName" maxlength="80" autocomplete="name" placeholder="例：山田 花子" required></div><div class="field"><label for="password">パスワード</label><input id="password" type="password" name="password" minlength="10" maxlength="128" autocomplete="new-password" placeholder="10文字以上" aria-describedby="passwordHint" required><span id="passwordHint" class="fieldHint">この店舗のオーナーアカウント専用です</span></div></div></section>`,
  `<div class="field"><label for="displayName">オーナー名</label><input id="displayName" name="displayName" maxlength="80" autocomplete="name" placeholder="例：山田 花子" required></div><div class="field"><label for="password">オーナー用パスワード</label><input id="password" type="password" name="password" minlength="10" maxlength="128" autocomplete="new-password" placeholder="10文字以上" aria-describedby="passwordHint" required><span id="passwordHint" class="fieldHint">オーナー権限の個人アカウント専用です</span></div><div class="field"><label for="storeLoginId">店舗共通ログインID</label><input id="storeLoginId" name="storeLoginId" pattern="[a-z0-9._-]{3,80}" maxlength="80" placeholder="例：salon-aoyama-store" required><span class="fieldHint">スタッフ共通で利用する、オーナーとは別のアカウントです</span></div><div class="field"><label for="storePassword">店舗共通パスワード</label><input id="storePassword" type="password" name="storePassword" minlength="10" maxlength="128" autocomplete="new-password" placeholder="10文字以上" required><span class="fieldHint">オーナー用とは別のパスワードを推奨します</span></div></div></section>`,
  'registration shared account fields')
billing = replaceOnce(billing,
  `    const password = String(body.password || '')
    const planKey = String(body.planKey || '')`,
  `    const password = String(body.password || '')
    const storeLoginId = String(body.storeLoginId || '').trim().toLowerCase()
    const storePassword = String(body.storePassword || '')
    const planKey = String(body.planKey || '')`,
  'registration shared values')
billing = replaceOnce(billing,
  `      password.length >= 10 && password.length <= 128 &&
      PLAN_KEYS.includes(planKey) && body.termsAccepted === 'yes'`,
  `      password.length >= 10 && password.length <= 128 &&
      /^[a-z0-9._-]{3,80}$/.test(storeLoginId) &&
      storePassword.length >= 10 && storePassword.length <= 128 &&
      PLAN_KEYS.includes(planKey) && body.termsAccepted === 'yes'`,
  'registration shared validation')
billing = replaceOnce(billing,
  `    const userId = randomId(crypto, 'usr')
    const hash = passwordHash(crypto, password)`,
  `    const userId = randomId(crypto, 'usr')
    const sharedUserId = randomId(crypto, 'usr')
    const sharedEmail = 'store-' + crypto.createHash('sha256').update(organizationId).digest('hex').slice(0, 16) + '@accounts.invalid'
    const hash = passwordHash(crypto, password)
    const sharedHash = passwordHash(crypto, storePassword)`,
  'registration shared identity')
billing = replaceOnce(billing,
  String.raw`        await tx.$executeRawUnsafe(
          'INSERT INTO "OrganizationBilling" ("organizationId","planKey","onboardingStatus","subscriptionStatus","billingRequiredAt","createdAt","updatedAt") VALUES ($1,$2,\'PAYMENT_REQUIRED\',\'none\',NOW(),NOW(),NOW())',`,
  String.raw`        await tx.$executeRawUnsafe(
          'INSERT INTO "AppUser" ("id","organizationId","email","loginId","displayName","passwordHash","role","active","createdAt","updatedAt","isSharedStoreAccount") VALUES ($1,$2,$3,$4,$5,$6,\'STAFF\',true,NOW(),NOW(),true)',
          sharedUserId,
          organizationId,
          sharedEmail,
          storeLoginId,
          organizationName + ' Store Shared',
          sharedHash
        )
        await tx.$executeRawUnsafe(
          'INSERT INTO "OrganizationBilling" ("organizationId","planKey","onboardingStatus","subscriptionStatus","billingRequiredAt","createdAt","updatedAt") VALUES ($1,$2,\'PAYMENT_REQUIRED\',\'none\',NOW(),NOW(),NOW())',`,
  'registration shared account insert')
fs.writeFileSync(billingFile, billing)

const platformFile = '/app/platform-operator.js'
let platform = fs.readFileSync(platformFile, 'utf8')
platform = replaceOnce(platform,
  `function setSecurityHeaders(res) {`,
  `function adminBridgeCookie(crypto, config, owner, organizationId, req) {
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    version: 2,
    subject: String(owner.email || '').trim().toLowerCase(),
    role: 'ADMIN', organizationId, manufacturerName: null, userId: owner.id,
    operatorSubject: config.email, issuedAt: now, expiresAt: now + SESSION_SECONDS,
    sessionId: crypto.randomUUID(),
  }
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const signature = crypto.createHmac('sha256', process.env.ADMIN_AUTH_SECRET).update(body).digest('base64url')
  const secure = requestOrigin(req).startsWith('https://') ? '; Secure' : ''
  return COOKIE_NAME.replace('platform_operator','admin') + '=' + encodeURIComponent(body + '.' + signature) + '; Path=/; Max-Age=' + SESSION_SECONDS + '; HttpOnly; SameSite=Lax; Priority=High' + secure
}

function setSecurityHeaders(res) {`,
  'platform admin bridge cookie')
platform = platform.replaceAll('閲覧専用', '運営者権限')
platform = replaceOnce(platform,
  `'<tr><td><div class="storeName">' + escapeHtml(row.organizationName) + '</div><div class="slug">' + escapeHtml(row.slug) + '</div></td><td><div class="owner">' + escapeHtml(row.ownerName || '未登録') + '</div><div class="ownerMail">' + escapeHtml(row.ownerEmail || '—') + '</div></td><td>' + formatDate(row.createdAt) + '</td><td><strong>' + escapeHtml(planName(row)) + '</strong><div class="slug">' + escapeHtml(row.onboardingStatus || '—') + '</div></td><td><span class="badge ' + statusTone(row.subscriptionStatus) + '">' + escapeHtml(statusLabel(row.subscriptionStatus)) + '</span></td><td class="num">' + formatNumber(row.customerCount) + '</td><td class="num">' + formatNumber(row.staffCount) + '</td><td class="num">' + formatNumber(row.appointmentCount) + '</td><td class="num">' + formatYen(row.monthRevenue) + '</td><td class="num">' + formatYen(row.totalRevenue) + '</td><td>' + formatDate(row.trialEndsAt) + '</td></tr>'`,
  `'<tr><td><div class="storeName">' + escapeHtml(row.organizationName) + '</div><div class="slug">' + escapeHtml(row.slug) + '</div></td><td><div class="owner">' + escapeHtml(row.ownerName || '未登録') + '</div><div class="ownerMail">' + escapeHtml(row.ownerEmail || '—') + '</div></td><td>' + formatDate(row.createdAt) + '</td><td><strong>' + escapeHtml(planName(row)) + '</strong><div class="slug">' + escapeHtml(row.onboardingStatus || '—') + '</div></td><td><span class="badge ' + statusTone(row.subscriptionStatus) + '">' + escapeHtml(statusLabel(row.subscriptionStatus)) + '</span></td><td class="num">' + formatNumber(row.customerCount) + '</td><td class="num">' + formatNumber(row.staffCount) + '</td><td class="num">' + formatNumber(row.appointmentCount) + '</td><td class="num">' + formatYen(row.monthRevenue) + '</td><td class="num">' + formatYen(row.totalRevenue) + '</td><td>' + formatDate(row.trialEndsAt) + '</td><td><form action="/api/platform/enter-store" method="post"><input type="hidden" name="organizationId" value="' + escapeHtml(row.id) + '"><button class="readonly" type="submit">管理画面を開く</button></form></td></tr>'`,
  'platform store management action')
platform = platform.replaceAll('<tr><td colspan="11" class="empty">', '<tr><td colspan="12" class="empty">')
platform = platform.replaceAll('<th>トライアル終了</th></tr>', '<th>トライアル終了</th><th>運営者操作</th></tr>')
platform = platform.replaceAll('データの変更機能を持たない閲覧専用画面です。', '運営者本人だけが利用できます。店舗を明示的に選択した場合、その店舗の管理ページへ移動できます。')
platform = replaceOnce(platform,
  `    if (url.pathname === '/api/platform/logout') {`,
  `    if (url.pathname === '/api/platform/enter-store') {
      if (req.method !== 'POST') { res.statusCode = 405; res.setHeader('Allow', 'POST'); res.end(); return true }
      const operator = session(req)
      if (!operator) { redirect(res, '/platform/login', 302); return true }
      if (!validSameOrigin(req) || !process.env.ADMIN_AUTH_SECRET || process.env.ADMIN_AUTH_SECRET.length < 32) { res.statusCode = 403; res.end(); return true }
      const body = new URLSearchParams(await readBody(req))
      const organizationId = String(body.get('organizationId') || '').slice(0, 120)
      const owners = await prisma.$queryRawUnsafe(\`SELECT "id","email" FROM "AppUser" WHERE "organizationId"=$1 AND "role"='ADMIN' AND "active"=TRUE ORDER BY "createdAt" LIMIT 1\`, organizationId)
      if (!owners[0]) { redirect(res, '/platform?error=owner', 303); return true }
      res.setHeader('Set-Cookie', adminBridgeCookie(crypto, operatorConfig(), owners[0], organizationId, req))
      redirect(res, '/admin/appointments', 303)
      return true
    }
    if (url.pathname === '/api/platform/logout') {`,
  'platform enter store route')
fs.writeFileSync(platformFile, platform)
