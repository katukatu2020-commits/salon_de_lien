'use strict'

const ACCOUNT_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{2,79}$/
const PLAN_KEYS = new Set(['ume', 'take', 'matsu'])

class ManagedAccountError extends Error {
  constructor(code, status = 400) {
    super(code)
    this.code = code
    this.status = status
  }
}

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]
  })
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase()
}

function normalizeLoginId(value) {
  return String(value || '').trim().toLowerCase()
}

function passwordHash(crypto, password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const digest = crypto.scryptSync(password, salt, 64).toString('hex')
  return 'scrypt$' + salt + '$' + digest
}

function requestOrigin(req) {
  const protocol = String(req.headers['x-forwarded-proto'] || (req.socket && req.socket.encrypted ? 'https' : 'http')).split(',')[0].trim()
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim()
  return host ? protocol + '://' + host : ''
}

function validSameOrigin(req) {
  const supplied = String(req.headers.origin || '')
  if (!supplied) return false
  const accepted = new Set()
  try { accepted.add(new URL(String(process.env.APP_URL || '')).origin) } catch {}
  try { accepted.add(new URL(requestOrigin(req)).origin) } catch {}
  return accepted.has(supplied)
}

function readBody(req, limit = 16384) {
  return new Promise(function (resolve, reject) {
    const chunks = []
    let size = 0
    req.on('data', function (chunk) {
      size += chunk.length
      if (size > limit) {
        reject(new ManagedAccountError('input', 413))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', function () { resolve(Buffer.concat(chunks).toString('utf8')) })
    req.on('error', reject)
  })
}

function setSecurityHeaders(res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'same-origin')
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive')
}

function redirect(res, location, status = 303) {
  res.statusCode = status
  setSecurityHeaders(res)
  res.setHeader('Location', location)
  res.end()
}

function sendHtml(res, status, content, headOnly) {
  res.statusCode = status
  setSecurityHeaders(res)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.end(headOnly ? undefined : content)
}

function field(name, label, type, options = {}) {
  const required = options.required === false ? '' : ' required'
  const autocomplete = options.autocomplete ? ' autocomplete="' + escapeHtml(options.autocomplete) + '"' : ' autocomplete="off"'
  const pattern = options.pattern ? ' pattern="' + escapeHtml(options.pattern) + '"' : ''
  const placeholder = options.placeholder ? ' placeholder="' + escapeHtml(options.placeholder) + '"' : ''
  const max = options.maxlength ? ' maxlength="' + Number(options.maxlength) + '"' : ''
  const min = options.minlength ? ' minlength="' + Number(options.minlength) + '"' : ''
  return '<label class="accountField"><span>' + escapeHtml(label) + '</span><input name="' + escapeHtml(name) + '" type="' + escapeHtml(type) + '"' + required + autocomplete + pattern + placeholder + max + min + '></label>'
}

function formatDate(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value))
}

function accountsPage(renderPage, rows, url) {
  const created = String(url.searchParams.get('created') || '')
  const issuedId = String(url.searchParams.get('loginId') || '')
  const error = String(url.searchParams.get('error') || '')
  const errorMessages = {
    input: '入力内容を確認してください。IDは半角英数字・ピリオド・ハイフン・アンダースコアで3〜80文字です。',
    duplicate: '同じ運営発行IDまたはメールアドレスがすでに使われています。',
    plan: '選択した利用プランを確認してください。',
    server: 'アカウントを発行できませんでした。時間をおいて再度お試しください。',
  }
  const notice = created && issuedId
    ? '<div class="accountNotice success" role="status"><strong>発行が完了しました</strong><span>' + (created === 'dealer' ? 'ディーラー' : '美容室') + 'の運営発行ID: <code>' + escapeHtml(issuedId) + '</code></span><small>初期パスワードと一緒に、対象事業者へ安全な方法でお伝えください。</small></div>'
    : errorMessages[error]
      ? '<div class="accountNotice error" role="alert">' + escapeHtml(errorMessages[error]) + '</div>'
      : ''
  const history = rows.length
    ? '<div class="accountTableWrap"><table class="accountTable"><thead><tr><th>種別</th><th>事業者</th><th>運営発行ID</th><th>連絡先</th><th>発行日時</th><th>発行者</th></tr></thead><tbody>' + rows.map(function (row) {
        return '<tr><td><span class="accountType ' + (row.accountType === 'DEALER' ? 'dealer' : 'salon') + '">' + (row.accountType === 'DEALER' ? 'ディーラー' : '美容室') + '</span></td><td><strong>' + escapeHtml(row.accountName) + '</strong></td><td><code>' + escapeHtml(row.loginId) + '</code></td><td>' + escapeHtml(row.contactEmail) + '</td><td>' + escapeHtml(formatDate(row.createdAt)) + '</td><td>' + escapeHtml(row.operatorEmail) + '</td></tr>'
      }).join('') + '</tbody></table></div>'
    : '<p class="accountEmpty">この画面から発行したアカウントはまだありません。</p>'

  const salonForm = '<form class="accountForm" method="post" action="/api/platform/accounts/salon"><header><span>美容室</span><h2>店舗アカウントを発行</h2><p>店舗とオーナーアカウントを同時に作成します。</p></header><div class="accountGrid">' +
    field('organizationName', '店舗名', 'text', { maxlength: 100, placeholder: '例: ORIMIA 青山店', autocomplete: 'organization' }) +
    field('displayName', 'オーナー名', 'text', { maxlength: 80, placeholder: '例: 山田 花子', autocomplete: 'name' }) +
    field('loginId', '運営発行ID', 'text', { maxlength: 80, minlength: 3, pattern: '[a-zA-Z0-9][a-zA-Z0-9._-]{2,79}', placeholder: '例: salon-aoyama-01', autocomplete: 'username' }) +
    field('email', '連絡用メールアドレス', 'email', { maxlength: 254, placeholder: 'owner@example.jp', autocomplete: 'email' }) +
    field('password', '初期パスワード', 'password', { maxlength: 128, minlength: 10, placeholder: '10文字以上', autocomplete: 'new-password' }) +
    '<label class="accountField"><span>利用プラン</span><select name="planKey" required><option value="take">竹プラン</option><option value="ume">梅プラン</option><option value="matsu">松プラン</option></select></label></div><div class="bankNote"><strong>支払方法</strong><span>銀行口座振替（運営管理）</span></div><button class="primary accountSubmit" type="submit">美容室アカウントを発行</button></form>'

  const dealerForm = '<form class="accountForm" method="post" action="/api/platform/accounts/dealer"><header><span>ディーラー</span><h2>ディーラーアカウントを発行</h2><p>固有コード付きの取引アカウントを作成します。</p></header><div class="accountGrid">' +
    field('dealerName', '会社名・ディーラー名', 'text', { maxlength: 140, placeholder: '例: ORIMIAビューティー株式会社', autocomplete: 'organization' }) +
    field('representativeName', '担当者名', 'text', { maxlength: 120, placeholder: '例: 山田 花子', autocomplete: 'name' }) +
    field('loginId', '運営発行ID', 'text', { maxlength: 80, minlength: 3, pattern: '[a-zA-Z0-9][a-zA-Z0-9._-]{2,79}', placeholder: '例: dealer-tokyo-01', autocomplete: 'username' }) +
    field('email', '連絡用メールアドレス', 'email', { maxlength: 254, placeholder: 'dealer@example.jp', autocomplete: 'email' }) +
    field('password', '初期パスワード', 'password', { maxlength: 128, minlength: 10, placeholder: '10文字以上', autocomplete: 'new-password' }) +
    '</div><div class="bankNote"><strong>支払方法</strong><span>銀行口座振替（運営管理）</span></div><button class="primary accountSubmit" type="submit">ディーラーアカウントを発行</button></form>'

  const styles = '<style>.accountHero{margin-bottom:20px}.accountHero h1{margin:0;font:700 36px Georgia,"Yu Mincho",serif}.accountHero p{margin:9px 0 0;color:var(--muted);line-height:1.7}.accountForms{display:grid;grid-template-columns:1fr 1fr;gap:20px}.accountForm{border:1px solid var(--line);border-radius:20px;background:var(--paper);padding:24px;box-shadow:0 12px 34px rgba(71,48,40,.055)}.accountForm header>span{display:inline-flex;border-radius:99px;background:var(--rose);color:var(--brand);padding:6px 10px;font-size:11px;font-weight:800}.accountForm h2{margin:13px 0 4px;font:700 22px Georgia,"Yu Mincho",serif}.accountForm header p{margin:0 0 18px;color:var(--muted);font-size:12px}.accountGrid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.accountField{display:grid;gap:7px}.accountField span{font-size:12px;font-weight:800}.accountField input,.accountField select{width:100%;height:48px;border:1px solid #dccac0;border-radius:12px;background:#fff;padding:0 13px;font:inherit;color:var(--ink)}.accountField input:focus,.accountField select:focus{outline:3px solid rgba(143,79,66,.14);border-color:var(--brand)}.bankNote{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:17px;border-radius:12px;background:var(--greenBg);padding:12px 14px;color:var(--green);font-size:12px}.accountSubmit{margin-top:14px}.accountNotice{display:grid;gap:6px;margin-bottom:20px;border:1px solid;padding:15px 17px;border-radius:14px}.accountNotice.success{border-color:#bad8c4;background:var(--greenBg);color:var(--green)}.accountNotice.error{border-color:#e8cbc7;background:var(--redBg);color:var(--red)}.accountNotice code{font-size:14px}.accountHistory{margin-top:20px}.accountHistory h2{margin:0 0 14px;font:700 22px Georgia,"Yu Mincho",serif}.accountTableWrap{overflow:auto;border:1px solid var(--line);border-radius:16px;background:var(--paper)}.accountTable{width:100%;min-width:900px;border-collapse:collapse}.accountTable th,.accountTable td{padding:13px 15px;border-bottom:1px solid var(--line);text-align:left;font-size:12px}.accountTable th{background:#faf5f0;color:var(--muted);font-size:10px}.accountTable tr:last-child td{border-bottom:0}.accountType{display:inline-flex;border-radius:99px;padding:5px 8px;background:var(--rose);color:var(--brand);font-size:10px;font-weight:800}.accountType.dealer{background:#e8eef9;color:#405f91}.accountEmpty{border:1px dashed var(--line);border-radius:14px;background:var(--paper);padding:28px;text-align:center;color:var(--muted)}@media(max-width:900px){.accountForms{grid-template-columns:1fr}}@media(max-width:620px){.accountGrid{grid-template-columns:1fr}.accountHero h1{font-size:29px}.accountForm{padding:18px}}</style>'
  const body = styles + '<main class="main"><section class="accountHero"><p class="eyebrow">MANAGED ACCOUNT ISSUANCE</p><h1>アカウント発行</h1><p>運営が審査・契約を確認した事業者だけにログインIDを発行します。クレジットカード登録は行わず、利用料は銀行口座振替として管理します。</p></section>' + notice + '<section class="accountForms">' + salonForm + dealerForm + '</section><section class="card accountHistory"><h2>直近の発行履歴</h2>' + history + '</section></main>'
  return renderPage('アカウント発行', body, true)
}

function validateCommon(payload) {
  const loginId = normalizeLoginId(payload.loginId)
  const email = normalizeEmail(payload.email)
  const password = String(payload.password || '')
  if (!ACCOUNT_ID_PATTERN.test(loginId) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || password.length < 10 || password.length > 128) {
    throw new ManagedAccountError('input')
  }
  return { loginId, email, password }
}

function createManagedAccountAccessService({ prisma, crypto, operatorSession, renderPage }) {
  let schemaPromise = null

  async function ensureSchema() {
    if (schemaPromise) return schemaPromise
    schemaPromise = (async function () {
      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "ManagedAccountIssue" (
        "id" TEXT PRIMARY KEY,
        "accountType" TEXT NOT NULL,
        "targetId" TEXT NOT NULL,
        "accountName" TEXT NOT NULL,
        "loginId" TEXT NOT NULL,
        "contactEmail" TEXT NOT NULL,
        "operatorEmail" TEXT NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CHECK ("accountType" IN ('SALON','DEALER'))
      )`)
      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "ManagedAccountIssue_created_idx" ON "ManagedAccountIssue"("createdAt" DESC)')
      await prisma.$executeRawUnsafe(`UPDATE "OrganizationBilling" SET "onboardingStatus"='BANK_DEBIT_MANAGED',"subscriptionStatus"='active',"stripeCheckoutSessionId"=NULL,"updatedAt"=NOW() WHERE "onboardingStatus"<>'BANK_DEBIT_MANAGED' OR "subscriptionStatus"<>'active' OR "stripeCheckoutSessionId" IS NOT NULL`)
      await prisma.$executeRawUnsafe(`UPDATE "WholesaleDealerBilling" SET "onboardingStatus"='BANK_DEBIT_MANAGED',"subscriptionStatus"='active',"stripeCheckoutSessionId"=NULL,"updatedAt"=NOW() WHERE "onboardingStatus"<>'BANK_DEBIT_MANAGED' OR "subscriptionStatus"<>'active' OR "stripeCheckoutSessionId" IS NOT NULL`)
    })().catch(function (error) {
      schemaPromise = null
      throw error
    })
    return schemaPromise
  }

  async function ensureBusinessIdentityAvailable(tx, loginId, email) {
    const appUsers = await tx.$queryRawUnsafe(`SELECT "id" FROM "AppUser" WHERE "active"=TRUE AND "role"::text IN ('ADMIN','STAFF','MANUFACTURER') AND (LOWER(COALESCE("loginId",''))=LOWER($1) OR LOWER("email")=LOWER($2)) LIMIT 1`, loginId, email)
    const dealers = await tx.$queryRawUnsafe(`SELECT "id" FROM "WholesaleDealer" WHERE "active"=TRUE AND (LOWER("loginId")=LOWER($1) OR LOWER(COALESCE("email",''))=LOWER($2)) LIMIT 1`, loginId, email)
    if (appUsers[0] || dealers[0]) throw new ManagedAccountError('duplicate', 409)
  }

  async function issueSalon(payload, operator) {
    const common = validateCommon(payload)
    const organizationName = String(payload.organizationName || '').trim()
    const displayName = String(payload.displayName || '').trim()
    const planKey = String(payload.planKey || 'take')
    if (organizationName.length < 2 || organizationName.length > 100 || !displayName || displayName.length > 80) throw new ManagedAccountError('input')
    if (!PLAN_KEYS.has(planKey)) throw new ManagedAccountError('plan')
    const organizationId = 'org_' + crypto.randomUUID()
    const userId = 'usr_' + crypto.randomUUID()
    const issueId = 'issue_' + crypto.randomUUID()
    const slug = 'managed-' + crypto.randomBytes(8).toString('hex')
    const publicCode = 'STORE-' + crypto.randomBytes(5).toString('hex').toUpperCase()
    const hash = passwordHash(crypto, common.password)
    await prisma.$transaction(async function (tx) {
      await tx.$queryRawUnsafe("SELECT 1::int AS locked FROM (SELECT pg_advisory_xact_lock(hashtext('managed_account_issue_v629'))) AS guard")
      await ensureBusinessIdentityAvailable(tx, common.loginId, common.email)
      const plans = await tx.$queryRawUnsafe('SELECT "planKey" FROM "BillingPlan" WHERE "planKey"=$1 AND "active"=TRUE LIMIT 1', planKey)
      if (!plans[0]) throw new ManagedAccountError('plan')
      await tx.$executeRawUnsafe('INSERT INTO "Organization" ("id","slug","name","publicCode","createdAt","updatedAt") VALUES ($1,$2,$3,$4,NOW(),NOW())', organizationId, slug, organizationName, publicCode)
      await tx.$executeRawUnsafe('INSERT INTO "AppUser" ("id","organizationId","email","loginId","displayName","passwordHash","role","active","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,\'ADMIN\',TRUE,NOW(),NOW())', userId, organizationId, common.email, common.loginId, displayName, hash)
      await tx.$executeRawUnsafe('INSERT INTO "OrganizationBilling" ("organizationId","planKey","onboardingStatus","subscriptionStatus","billingRequiredAt","createdAt","updatedAt") VALUES ($1,$2,\'BANK_DEBIT_MANAGED\',\'active\',NOW(),NOW(),NOW())', organizationId, planKey)
      await tx.$executeRawUnsafe('INSERT INTO "ManagedAccountIssue" ("id","accountType","targetId","accountName","loginId","contactEmail","operatorEmail","createdAt") VALUES ($1,\'SALON\',$2,$3,$4,$5,$6,NOW())', issueId, organizationId, organizationName, common.loginId, common.email, operator.subject)
    })
    return { type: 'salon', loginId: common.loginId }
  }

  async function issueDealer(payload, operator) {
    const common = validateCommon(payload)
    const dealerName = String(payload.dealerName || '').trim()
    const representativeName = String(payload.representativeName || '').trim()
    if (dealerName.length < 2 || dealerName.length > 140 || representativeName.length > 120) throw new ManagedAccountError('input')
    const dealerId = 'dealer_' + crypto.randomUUID()
    const issueId = 'issue_' + crypto.randomUUID()
    const dealerCode = 'DLR-' + crypto.randomBytes(6).toString('hex').toUpperCase()
    const hash = passwordHash(crypto, common.password)
    await prisma.$transaction(async function (tx) {
      await tx.$queryRawUnsafe("SELECT 1::int AS locked FROM (SELECT pg_advisory_xact_lock(hashtext('managed_account_issue_v629'))) AS guard")
      await ensureBusinessIdentityAvailable(tx, common.loginId, common.email)
      await tx.$executeRawUnsafe('INSERT INTO "WholesaleDealer" ("id","name","representativeName","loginId","email","passwordHash","dealerCode","active","authVersion","createdAt","updatedAt") VALUES ($1,$2,NULLIF($3,\'\'),$4,$5,$6,$7,TRUE,1,NOW(),NOW())', dealerId, dealerName, representativeName, common.loginId, common.email, hash, dealerCode)
      await tx.$executeRawUnsafe('INSERT INTO "WholesaleDealerBilling" ("dealerId","planKey","displayName","monthlyAmount","currency","onboardingStatus","subscriptionStatus","billingRequiredAt","createdAt","updatedAt") VALUES ($1,\'dealer\',\'ディーラープラン\',9800,\'jpy\',\'BANK_DEBIT_MANAGED\',\'active\',NOW(),NOW(),NOW())', dealerId)
      await tx.$executeRawUnsafe('INSERT INTO "ManagedAccountIssue" ("id","accountType","targetId","accountName","loginId","contactEmail","operatorEmail","createdAt") VALUES ($1,\'DEALER\',$2,$3,$4,$5,$6,NOW())', issueId, dealerId, dealerName, common.loginId, common.email, operator.subject)
    })
    return { type: 'dealer', loginId: common.loginId }
  }

  async function loadRecentIssues() {
    return prisma.$queryRawUnsafe('SELECT "accountType","accountName","loginId","contactEmail","operatorEmail","createdAt" FROM "ManagedAccountIssue" ORDER BY "createdAt" DESC LIMIT 50')
  }

  async function handle(req, res, url) {
    const accountApi = url.pathname === '/api/platform/accounts/salon' || url.pathname === '/api/platform/accounts/dealer'
    if (url.pathname !== '/platform/accounts' && !accountApi) return false
    const operator = operatorSession(req)
    if (!operator) {
      redirect(res, '/platform/login', 302)
      return true
    }
    await ensureSchema()
    if (url.pathname === '/platform/accounts') {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.statusCode = 405
        res.setHeader('Allow', 'GET, HEAD')
        res.end()
        return true
      }
      const content = accountsPage(renderPage, await loadRecentIssues(), url)
      sendHtml(res, 200, content, req.method === 'HEAD')
      return true
    }
    if (req.method !== 'POST') {
      res.statusCode = 405
      res.setHeader('Allow', 'POST')
      res.end()
      return true
    }
    if (!validSameOrigin(req)) {
      redirect(res, '/platform/accounts?error=input')
      return true
    }
    try {
      const payload = Object.fromEntries(new URLSearchParams(await readBody(req)))
      const result = url.pathname.endsWith('/salon') ? await issueSalon(payload, operator) : await issueDealer(payload, operator)
      redirect(res, '/platform/accounts?created=' + encodeURIComponent(result.type) + '&loginId=' + encodeURIComponent(result.loginId))
    } catch (error) {
      const duplicate = error && (error.code === '23505' || error.code === 'P2002')
      const code = error instanceof ManagedAccountError ? error.code : duplicate ? 'duplicate' : 'server'
      if (code === 'server') console.error('[managed-account-access-v629] issue failed', { code: String(error && error.code || 'unknown').slice(0, 80) })
      redirect(res, '/platform/accounts?error=' + encodeURIComponent(code))
    }
    return true
  }

  return { ensureSchema, handle, issueSalon, issueDealer, loadRecentIssues }
}

module.exports = {
  ACCOUNT_ID_PATTERN,
  ManagedAccountError,
  accountsPage,
  createManagedAccountAccessService,
  normalizeEmail,
  normalizeLoginId,
  passwordHash,
}
