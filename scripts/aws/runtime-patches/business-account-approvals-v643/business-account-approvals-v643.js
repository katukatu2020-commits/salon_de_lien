'use strict'

const RELEASE = 'business-account-approvals-v643'
const ACCOUNT_TYPES = new Set(['SALON', 'DEALER'])
const PLANS = new Set(['ume', 'take', 'matsu'])
const ADMIN_COOKIE = 'lien_admin_session'
const DEALER_COOKIE = 'orimia_dealer_session'

class BusinessAccessError extends Error {
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

function cleanText(value, maximum, required = false) {
  const text = String(value == null ? '' : value).replace(/\s+/g, ' ').trim()
  if ((required && !text) || text.length > maximum) throw new BusinessAccessError('input')
  return text
}

function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase()
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BusinessAccessError('email')
  return email
}

function passwordHash(crypto, password) {
  const salt = crypto.randomBytes(16).toString('hex')
  return 'scrypt$' + salt + '$' + crypto.scryptSync(String(password), salt, 64).toString('hex')
}

function verifyPassword(crypto, password, encoded) {
  const parts = String(encoded || '').split('$')
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false
  try {
    const actual = crypto.scryptSync(String(password || ''), parts[1], 64)
    const expected = Buffer.from(parts[2], 'hex')
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected)
  } catch { return false }
}

function temporaryPassword(crypto) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@$%'
  const bytes = crypto.randomBytes(18)
  let value = 'A7!'
  for (let index = 0; index < bytes.length; index += 1) value += alphabet[bytes[index] % alphabet.length]
  return value
}

function generatedLoginId(crypto, type) {
  return (type === 'SALON' ? 'salon-' : 'dealer-') + crypto.randomBytes(6).toString('hex')
}

function requestOrigin(req) {
  for (const key of ['APP_URL', 'NEXT_PUBLIC_APP_URL', 'APP_BASE_URL', 'AUTH_BASE_URL', 'NEXTAUTH_URL']) {
    try { if (process.env[key]) return new URL(process.env[key]).origin } catch {}
  }
  const protocol = String(req.headers['x-forwarded-proto'] || (req.socket && req.socket.encrypted ? 'https' : 'http')).split(',')[0].trim()
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim()
  return host ? protocol + '://' + host : 'https://salon-de-lien.com'
}

function parseCookies(req) {
  return String(req.headers.cookie || '').split(';').reduce(function (result, item) {
    const index = item.indexOf('=')
    if (index < 0) return result
    const key = item.slice(0, index).trim()
    try { result[key] = decodeURIComponent(item.slice(index + 1).trim()) } catch {}
    return result
  }, {})
}

function verifySignedPayload(crypto, token, secret) {
  if (!token || !secret || secret.length < 32) return null
  const parts = String(token).split('.')
  if (parts.length !== 2) return null
  const signature = crypto.createHmac('sha256', secret).update(parts[0]).digest('base64url')
  const actual = Buffer.from(parts[1])
  const expected = Buffer.from(signature)
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null
  try {
    const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'))
    if (!payload.expiresAt || Number(payload.expiresAt) <= Math.floor(Date.now() / 1000)) return null
    return payload
  } catch { return null }
}

function rawAdminSession(crypto, req) {
  const payload = verifySignedPayload(crypto, parseCookies(req)[ADMIN_COOKIE], String(process.env.ADMIN_AUTH_SECRET || ''))
  if (!payload || payload.version !== 2 || !['ADMIN', 'STAFF', 'MANUFACTURER'].includes(payload.role) || !payload.userId) return null
  return payload
}

function rawDealerSession(crypto, req) {
  const secret = String(process.env.DEALER_AUTH_SECRET || process.env.ADMIN_AUTH_SECRET || '')
  const payload = verifySignedPayload(crypto, parseCookies(req)[DEALER_COOKIE], secret)
  if (!payload || payload.version !== 1 || !payload.dealerId) return null
  return { ...payload, id: payload.dealerId }
}

function validSameOrigin(req) {
  const supplied = String(req.headers.origin || '')
  if (!supplied) return false
  try { return new URL(supplied).origin === new URL(requestOrigin(req)).origin } catch { return false }
}

async function readForm(req, limit = 32768) {
  const contentType = String(req.headers['content-type'] || '').toLowerCase()
  if (!contentType.includes('application/x-www-form-urlencoded')) throw new BusinessAccessError('input', 415)
  const chunks = []
  let total = 0
  for await (const chunk of req) {
    total += chunk.length
    if (total > limit) throw new BusinessAccessError('input', 413)
    chunks.push(chunk)
  }
  return new URLSearchParams(Buffer.concat(chunks).toString('utf8'))
}

function setSecurityHeaders(res, allowInlineScript = false) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'same-origin')
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive')
  res.setHeader('Content-Security-Policy', allowInlineScript
    ? "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"
    : "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; form-action 'self'; base-uri 'none'; frame-ancestors 'none'")
}

function redirect(res, location, status = 303) {
  res.statusCode = status
  setSecurityHeaders(res)
  res.setHeader('Location', location)
  res.end()
}

function sendHtml(res, status, content, headOnly = false, inlineScript = false) {
  res.statusCode = status
  setSecurityHeaders(res, inlineScript)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.end(headOnly ? undefined : content)
}

function sendJson(res, status, value) {
  res.statusCode = status
  setSecurityHeaders(res)
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(value))
}

function expiredCookie(req, name) {
  const secure = requestOrigin(req).startsWith('https://') ? '; Secure' : ''
  return name + '=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax' + secure
}

function formatDate(value, includeTime = false) {
  if (!value) return '-'
  const date = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(date.getTime())) return '-'
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date)
}

function accountTypeLabel(type) {
  return type === 'DEALER' ? 'ディーラー' : '美容室'
}

function mailStatusLabel(status) {
  return { SENT: '承認メール送信済み', FAILED: 'メール送信失敗', PENDING: 'メール送信中' }[status] || '未送信'
}

function passwordPage(access, kind, options = {}) {
  const initial = Boolean(access.mustChangePassword)
  const error = String(options.error || '')
  const errors = {
    current: '現在のパスワードが正しくありません。',
    password: '新しいパスワードは10〜72文字で入力してください。',
    mismatch: '確認用パスワードが一致しません。',
    unchanged: '現在とは異なるパスワードを設定してください。',
    failed: '変更できませんでした。時間をおいて再度お試しください。',
  }
  const action = kind === 'dealer' ? '/api/dealer/managed-password-change' : '/api/auth/managed-password-change'
  const home = kind === 'dealer' ? '/dealer/orders' : '/admin/customers'
  const brand = kind === 'dealer' ? 'ORIMIA Partner' : 'ORIMIA for Salon'
  const note = initial
    ? '<div class="notice" role="status"><strong>初回パスワード変更が必要です</strong><span>運営から届いた初期パスワードを、本人だけが分かるパスワードへ変更してください。</span></div>'
    : '<p class="intro">ログインIDは運営発行のため変更できません。パスワードのみ変更できます。</p>'
  const errorHtml = errors[error] ? '<div class="error" role="alert">' + escapeHtml(errors[error]) + '</div>' : ''
  return '<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>パスワード変更 | ORIMIA</title><style>' +
    ':root{--ink:#2e2825;--muted:#84776f;--line:#e8d9d0;--paper:#fffdfb;--canvas:#f8f3ee;--brand:#aa4c68;--green:#236b56}*{box-sizing:border-box}body{margin:0;background:var(--canvas);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Yu Gothic",Meiryo,sans-serif}.top{height:68px;display:flex;align-items:center;justify-content:space-between;padding:0 max(20px,calc((100% - 1080px)/2));border-bottom:1px solid var(--line);background:rgba(255,253,251,.96)}.top strong{font-family:Georgia,"Yu Mincho",serif;font-size:20px}.top a{color:var(--muted);text-decoration:none;font-size:13px}.stage{min-height:calc(100vh - 68px);display:grid;place-items:center;padding:28px 16px}.card{width:min(560px,100%);border:1px solid var(--line);border-radius:24px;background:var(--paper);padding:32px;box-shadow:0 18px 48px rgba(72,49,40,.08)}.eyebrow{margin:0;color:var(--brand);font-size:11px;font-weight:800}.card h1{margin:10px 0 8px;font:700 32px Georgia,"Yu Mincho",serif}.intro{color:var(--muted);font-size:13px;line-height:1.8}.notice,.error{display:grid;gap:5px;margin:18px 0;border-radius:12px;padding:14px 16px;font-size:12px;line-height:1.6}.notice{background:#eaf4ee;color:var(--green)}.error{background:#fff0f0;color:#943838}.identity{margin:18px 0;border:1px solid var(--line);border-radius:14px;background:#faf6f2;padding:14px}.identity span{display:block;color:var(--muted);font-size:10px}.identity code{display:block;margin-top:5px;font-size:16px}.field{display:grid;gap:7px;margin-top:16px}.field>span{font-size:12px;font-weight:800}.password{display:grid;grid-template-columns:1fr auto;border:1px solid #dcc9bf;border-radius:12px;background:#fff;overflow:hidden}.password input{min-width:0;height:50px;border:0;padding:0 14px;font:inherit}.password input:focus{outline:0}.password:focus-within{outline:3px solid rgba(170,76,104,.12);border-color:var(--brand)}.password button{border:0;border-left:1px solid var(--line);background:#fff;padding:0 14px;color:var(--muted);font-weight:700;cursor:pointer}.submit{width:100%;height:52px;margin-top:22px;border:0;border-radius:12px;background:var(--brand);color:#fff;font-size:15px;font-weight:800;cursor:pointer}.foot{margin-top:18px;color:var(--muted);font-size:11px;line-height:1.7}@media(max-width:600px){.card{padding:24px 19px}.card h1{font-size:27px}.top{height:60px;padding:0 16px}}</style></head><body><header class="top"><strong>' + escapeHtml(brand) + '</strong>' + (!initial ? '<a href="' + home + '">管理画面へ戻る</a>' : '<span></span>') + '</header><main class="stage"><section class="card"><p class="eyebrow">SECURE ACCOUNT</p><h1>パスワード変更</h1>' + note + errorHtml + '<div class="identity"><span>運営発行ID</span><code>' + escapeHtml(access.loginId) + '</code></div><form method="post" action="' + action + '"><label class="field"><span>現在のパスワード</span><span class="password"><input name="currentPassword" type="password" autocomplete="current-password" required maxlength="128"><button type="button" data-password-toggle>表示</button></span></label><label class="field"><span>新しいパスワード</span><span class="password"><input name="newPassword" type="password" autocomplete="new-password" required minlength="10" maxlength="72"><button type="button" data-password-toggle>表示</button></span></label><label class="field"><span>新しいパスワード（確認）</span><span class="password"><input name="newPasswordConfirm" type="password" autocomplete="new-password" required minlength="10" maxlength="72"><button type="button" data-password-toggle>表示</button></span></label><button class="submit" type="submit">パスワードを変更</button></form><p class="foot">変更後はすべての端末からログアウトします。新しいパスワードで再度ログインしてください。</p></section></main><script>document.querySelectorAll("[data-password-toggle]").forEach(function(button){button.addEventListener("click",function(){var input=button.parentElement.querySelector("input");var show=input.type==="password";input.type=show?"text":"password";button.textContent=show?"隠す":"表示"})})</script></body></html>'
}

function approvalEmail(access, password, origin, reissued = false) {
  const loginPath = access.accountType === 'DEALER' ? '/dealer/login' : '/admin/login'
  const loginUrl = origin + loginPath
  const label = accountTypeLabel(access.accountType)
  const title = reissued ? 'ORIMIA ログイン情報を再発行しました' : 'ORIMIA ご利用申請が承認されました'
  const preface = reissued ? '運営により初期ログイン情報が再発行されました。' : 'お申し込み内容の確認が完了し、ORIMIAの利用が承認されました。'
  const textBody = [
    access.accountName + ' ご担当者様', '', preface, '', 'アカウント種別: ' + label,
    '運営発行ID: ' + access.loginId, '初期パスワード: ' + password, 'ログインURL: ' + loginUrl, '',
    '初回ログイン後、画面の案内に従ってパスワードを変更してください。ログインIDは変更できません。',
    'このメールに心当たりがない場合は、ORIMIA運営へお問い合わせください。', '', 'ORIMIA運営',
  ].join('\n')
  const htmlBody = '<!doctype html><html lang="ja"><body style="margin:0;background:#f7f2ed;color:#2d2723;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Yu Gothic,Meiryo,sans-serif"><div style="max-width:620px;margin:0 auto;padding:32px 16px"><div style="background:#fff;border:1px solid #eadbd2;border-radius:16px;padding:30px"><p style="margin:0;color:#a14c65;font-size:12px;font-weight:700">ORIMIA BUSINESS ACCOUNT</p><h1 style="margin:10px 0 20px;font-size:25px">' + escapeHtml(reissued ? 'ログイン情報を再発行しました' : 'ご利用申請を承認しました') + '</h1><p style="line-height:1.8">' + escapeHtml(access.accountName) + ' ご担当者様<br>' + escapeHtml(preface) + '</p><table style="width:100%;border-collapse:collapse;margin:22px 0;background:#faf6f2"><tr><th style="padding:11px;text-align:left;border-bottom:1px solid #eadbd2">アカウント種別</th><td style="padding:11px;border-bottom:1px solid #eadbd2">' + escapeHtml(label) + '</td></tr><tr><th style="padding:11px;text-align:left;border-bottom:1px solid #eadbd2">運営発行ID</th><td style="padding:11px;border-bottom:1px solid #eadbd2"><code>' + escapeHtml(access.loginId) + '</code></td></tr><tr><th style="padding:11px;text-align:left">初期パスワード</th><td style="padding:11px"><code>' + escapeHtml(password) + '</code></td></tr></table><p style="text-align:center"><a href="' + escapeHtml(loginUrl) + '" style="display:inline-block;background:#9f4e64;color:#fff;text-decoration:none;padding:14px 26px;border-radius:9px;font-weight:700">ORIMIAへログイン</a></p><p style="margin:22px 0 0;color:#756a63;font-size:13px;line-height:1.8">初回ログイン後、必ずパスワードを変更してください。ログインIDは運営発行のため変更できません。</p></div></div></body></html>'
  return { to: access.contactEmail, subject: title, textBody, htmlBody }
}

function noticeFromQuery(url) {
  const approved = url.searchParams.get('approved')
  const mail = url.searchParams.get('mail')
  const error = url.searchParams.get('error')
  if (approved === '1' && mail === 'sent') return '<div class="baaNotice good"><strong>承認とアカウント発行が完了しました。</strong><span>申請者へ初期ID・初期パスワードをメール送信しました。</span></div>'
  if (approved === '1' && mail === 'failed') return '<div class="baaNotice bad"><strong>アカウントは発行済みですが、メールを送信できませんでした。</strong><span>対象申請の「認証情報を再発行して送信」を実行してください。</span></div>'
  if (url.searchParams.get('resent') === '1' && mail === 'sent') return '<div class="baaNotice good">新しい初期パスワードを発行し、メールを再送しました。</div>'
  if (error) {
    const message = { already: 'この申請はすでに承認されています。', input: '発行内容を確認してください。', email: 'メールアドレスを確認してください。', duplicate: '同じIDまたはメールアドレスの事業者アカウントが存在します。', plan: '利用プランを確認してください。', suspended: '利用停止中のアカウントには認証情報を再送できません。', server: '処理を完了できませんでした。時間をおいて再度お試しください。' }[error] || '処理を完了できませんでした。'
    return '<div class="baaNotice bad">' + escapeHtml(message) + '</div>'
  }
  return ''
}

const PLATFORM_STYLE = '<style>.baaNotice{display:grid;gap:5px;margin:20px 0;border:1px solid var(--line);border-radius:14px;padding:14px 16px;font-size:12px}.baaNotice.good{background:var(--greenBg);color:var(--green);border-color:#bed8c7}.baaNotice.bad{background:var(--redBg);color:var(--red);border-color:#ecc8c5}.baaToolbar{display:grid;grid-template-columns:minmax(220px,1fr) 170px 170px auto;gap:11px;align-items:end}.baaToolbar .field{margin:0}.baaToolbar select,.baaField input,.baaField select,.baaField textarea{width:100%;border:1px solid #dccac0;border-radius:12px;background:#fff;padding:11px 12px;font:inherit;color:var(--ink)}.baaToolbar select{height:50px}.baaCards{display:grid;gap:14px;margin-top:18px}.baaInquiry{min-width:0;border:1px solid var(--line);border-radius:18px;background:var(--paper);padding:20px}.baaInquiryHead{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}.baaInquiry h2{margin:5px 0;font:700 21px Georgia,"Yu Mincho",serif}.baaMeta{display:flex;flex-wrap:wrap;gap:8px 16px;color:var(--muted);font-size:11px;overflow-wrap:anywhere}.baaMessage{margin:16px 0;border-left:3px solid #dcb7ad;padding:9px 13px;white-space:pre-wrap;font-size:12px;line-height:1.75;overflow-wrap:anywhere}.baaActions{display:grid;grid-template-columns:minmax(0,1fr) minmax(320px,.9fr);gap:16px;margin-top:15px}.baaStatusForm,.baaApprove{min-width:0;border-top:1px solid var(--line);padding-top:14px}.baaApprove summary{cursor:pointer;color:var(--brand);font-weight:800}.baaApproveGrid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px;margin-top:13px}.baaField{display:grid;min-width:0;gap:6px}.baaField span{font-size:11px;font-weight:800}.baaField.wide{grid-column:1/-1}.baaField textarea{min-height:82px;resize:vertical}.baaButton{display:inline-flex;align-items:center;justify-content:center;min-height:42px;border:1px solid #d9c5ba;border-radius:10px;background:#fff;padding:0 16px;color:var(--ink);font:inherit;font-size:12px;font-weight:800;cursor:pointer;text-decoration:none}.baaButton.primary{border-color:var(--brand);background:var(--brand);color:#fff}.baaButton.danger{border-color:#dcaaa6;color:#973d3d}.baaInline{display:flex;flex-wrap:wrap;gap:9px;align-items:center;margin-top:11px}.baaIssued{min-width:0;border-radius:12px;background:#f6f1ec;padding:13px;font-size:12px;overflow-wrap:anywhere}.baaIssued code{font-size:14px}.baaTables{display:grid;min-width:0;gap:20px;margin-top:20px}.baaTables>section{min-width:0}.baaTableHead{display:flex;justify-content:space-between;gap:12px;align-items:end;margin-bottom:12px}.baaTableHead h2{margin:0;font:700 22px Georgia,"Yu Mincho",serif}.baaTableHead p{margin:5px 0 0;color:var(--muted);font-size:11px}.baaTableWrap{width:100%;max-width:100%;overflow:auto;border:1px solid var(--line);border-radius:16px}.baaTable{width:100%;min-width:980px;border-collapse:collapse;background:var(--paper)}.baaTable th,.baaTable td{padding:13px 14px;border-bottom:1px solid var(--line);text-align:left;font-size:12px}.baaTable th{background:#faf5f0;color:var(--muted);font-size:10px}.baaTable tr:last-child td{border-bottom:0}.baaState{display:inline-flex;border-radius:99px;padding:6px 9px;font-size:10px;font-weight:800}.baaState.active{background:var(--greenBg);color:var(--green)}.baaState.suspended{background:var(--redBg);color:var(--red)}.baaPager{display:flex;justify-content:flex-end;gap:9px;margin-top:16px}@media(max-width:850px){.baaToolbar{grid-template-columns:1fr 1fr}.baaToolbar .wideSearch{grid-column:1/-1}.baaActions{grid-template-columns:1fr}.baaApproveGrid{grid-template-columns:1fr}.baaField.wide{grid-column:auto}}@media(max-width:560px){.baaToolbar{grid-template-columns:1fr}.baaToolbar .wideSearch{grid-column:auto}.baaInquiryHead{display:grid}.baaInquiry{padding:16px}}</style>'

function createBusinessAccountApprovalService(options) {
  const { prisma, crypto, operatorSession, adminSessionProvider, dealerSessionProvider, renderPlatformPage, baseDashboardProvider, renderBaseDashboard, mailSender } = options
  let schemaPromise = null

  async function ensureSchema() {
    if (schemaPromise) return schemaPromise
    schemaPromise = (async function () {
      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "ManagedBusinessAccess" (
        "id" TEXT PRIMARY KEY,
        "inquiryId" TEXT NOT NULL UNIQUE,
        "accountType" TEXT NOT NULL,
        "targetId" TEXT NOT NULL,
        "principalId" TEXT NOT NULL,
        "accountName" TEXT NOT NULL,
        "loginId" TEXT NOT NULL,
        "contactEmail" TEXT NOT NULL,
        "accessStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
        "mustChangePassword" BOOLEAN NOT NULL DEFAULT TRUE,
        "approvalMailStatus" TEXT NOT NULL DEFAULT 'PENDING',
        "approvalMailSentAt" TIMESTAMPTZ,
        "approvalMailError" TEXT,
        "approvedBy" TEXT NOT NULL,
        "approvedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "ManagedBusinessAccess_type_check" CHECK ("accountType" IN ('SALON','DEALER')),
        CONSTRAINT "ManagedBusinessAccess_status_check" CHECK ("accessStatus" IN ('ACTIVE','SUSPENDED')),
        CONSTRAINT "ManagedBusinessAccess_mail_check" CHECK ("approvalMailStatus" IN ('PENDING','SENT','FAILED'))
      )`)
      await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "ManagedBusinessAccess_target_key" ON "ManagedBusinessAccess"("accountType","targetId")')
      await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "ManagedBusinessAccess_principal_key" ON "ManagedBusinessAccess"("accountType","principalId")')
      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "ManagedBusinessAccess_created_idx" ON "ManagedBusinessAccess"("createdAt" DESC)')
      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "BusinessAccountControl" (
        "accountType" TEXT NOT NULL,
        "targetId" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "previousActivePrincipalIdsJson" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "previousBillingStatus" TEXT,
        "suspendedAt" TIMESTAMPTZ,
        "suspendedBy" TEXT,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY ("accountType","targetId"),
        CONSTRAINT "BusinessAccountControl_type_check" CHECK ("accountType" IN ('SALON','DEALER')),
        CONSTRAINT "BusinessAccountControl_status_check" CHECK ("status" IN ('ACTIVE','SUSPENDED'))
      )`)
      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "BusinessAccountAction" (
        "id" TEXT PRIMARY KEY,
        "accountType" TEXT NOT NULL,
        "targetId" TEXT NOT NULL,
        "action" TEXT NOT NULL,
        "operatorEmail" TEXT NOT NULL,
        "detailJson" JSONB,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`)
      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "BusinessAccountAction_target_created_idx" ON "BusinessAccountAction"("accountType","targetId","createdAt" DESC)')
    })().catch(function (error) { schemaPromise = null; throw error })
    return schemaPromise
  }

  async function audit(tx, type, targetId, action, operatorEmail, detail) {
    await tx.$executeRawUnsafe('INSERT INTO "BusinessAccountAction" ("id","accountType","targetId","action","operatorEmail","detailJson","createdAt") VALUES ($1,$2,$3,$4,$5,$6::jsonb,NOW())', 'baa_' + crypto.randomUUID(), type, targetId, action, operatorEmail, JSON.stringify(detail || {}))
  }

  async function ensureIdentityAvailable(tx, loginId, email) {
    const users = await tx.$queryRawUnsafe(`SELECT "id" FROM "AppUser" WHERE "role"::text IN ('ADMIN','STAFF','MANUFACTURER') AND (LOWER(COALESCE("loginId",''))=LOWER($1) OR LOWER("email")=LOWER($2)) LIMIT 1`, loginId, email)
    const dealers = await tx.$queryRawUnsafe('SELECT "id" FROM "WholesaleDealer" WHERE LOWER("loginId")=LOWER($1) OR LOWER(COALESCE("email",\'\'))=LOWER($2) LIMIT 1', loginId, email)
    if (users[0] || dealers[0]) throw new BusinessAccessError('duplicate', 409)
  }

  async function sendCredentials(access, password, req, reissued) {
    try {
      const messageId = await mailSender(approvalEmail(access, password, requestOrigin(req), reissued))
      await prisma.$executeRawUnsafe('UPDATE "ManagedBusinessAccess" SET "approvalMailStatus"=\'SENT\',"approvalMailSentAt"=NOW(),"approvalMailError"=NULL,"updatedAt"=NOW() WHERE "id"=$1', access.id)
      return { sent: true, messageId }
    } catch (error) {
      const detail = String(error && (error.message || error.code) || 'mail_failed').replace(/[\r\n]+/g, ' ').slice(0, 500)
      await prisma.$executeRawUnsafe('UPDATE "ManagedBusinessAccess" SET "approvalMailStatus"=\'FAILED\',"approvalMailError"=$2,"updatedAt"=NOW() WHERE "id"=$1', access.id, detail)
      console.error('[business-account-approvals-v643] approval mail failed', { accessId: access.id, accountType: access.accountType, detail })
      return { sent: false }
    }
  }

  async function approveInquiry(inquiryId, params, operator, req) {
    const accountName = cleanText(params.get('accountName'), 140, true)
    const contactName = cleanText(params.get('contactName'), 120, true)
    const contactEmail = normalizeEmail(params.get('contactEmail'))
    const planKey = String(params.get('planKey') || 'take')
    const password = temporaryPassword(crypto)
    const access = await prisma.$transaction(async function (tx) {
      await tx.$queryRawUnsafe("SELECT 1::int FROM (SELECT pg_advisory_xact_lock(hashtext('business_account_approval_v643'))) guard")
      const inquiries = await tx.$queryRawUnsafe('SELECT * FROM "BusinessInquiry" WHERE "id"=$1 FOR UPDATE', inquiryId)
      const inquiry = inquiries[0]
      if (!inquiry || !['salon', 'dealer'].includes(inquiry.audience)) throw new BusinessAccessError('input', 404)
      const existing = await tx.$queryRawUnsafe('SELECT "id" FROM "ManagedBusinessAccess" WHERE "inquiryId"=$1 LIMIT 1', inquiryId)
      if (existing[0]) throw new BusinessAccessError('already', 409)
      const type = inquiry.audience === 'dealer' ? 'DEALER' : 'SALON'
      if (type === 'SALON' && !PLANS.has(planKey)) throw new BusinessAccessError('plan')
      const loginId = generatedLoginId(crypto, type)
      await ensureIdentityAvailable(tx, loginId, contactEmail)
      const targetId = type === 'SALON' ? 'org_' + crypto.randomUUID() : 'dealer_' + crypto.randomUUID()
      const principalId = type === 'SALON' ? 'usr_' + crypto.randomUUID() : targetId
      const accessId = 'mba_' + crypto.randomUUID()
      const issueId = 'issue_' + crypto.randomUUID()
      const hash = passwordHash(crypto, password)
      if (type === 'SALON') {
        const plans = await tx.$queryRawUnsafe('SELECT "planKey" FROM "BillingPlan" WHERE "planKey"=$1 AND "active"=TRUE LIMIT 1', planKey)
        if (!plans[0]) throw new BusinessAccessError('plan')
        const slug = 'managed-' + crypto.randomBytes(8).toString('hex')
        const publicCode = 'STORE-' + crypto.randomBytes(5).toString('hex').toUpperCase()
        await tx.$executeRawUnsafe('INSERT INTO "Organization" ("id","slug","name","publicCode","createdAt","updatedAt") VALUES ($1,$2,$3,$4,NOW(),NOW())', targetId, slug, accountName, publicCode)
        await tx.$executeRawUnsafe('INSERT INTO "AppUser" ("id","organizationId","email","loginId","displayName","passwordHash","role","active","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,\'ADMIN\',TRUE,NOW(),NOW())', principalId, targetId, contactEmail, loginId, contactName, hash)
        await tx.$executeRawUnsafe('INSERT INTO "OrganizationBilling" ("organizationId","planKey","onboardingStatus","subscriptionStatus","billingRequiredAt","createdAt","updatedAt") VALUES ($1,$2,\'BANK_DEBIT_MANAGED\',\'active\',NOW(),NOW(),NOW())', targetId, planKey)
      } else {
        const dealerCode = 'DLR-' + crypto.randomBytes(6).toString('hex').toUpperCase()
        await tx.$executeRawUnsafe('INSERT INTO "WholesaleDealer" ("id","name","representativeName","loginId","email","passwordHash","dealerCode","active","authVersion","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE,1,NOW(),NOW())', targetId, accountName, contactName, loginId, contactEmail, hash, dealerCode)
        await tx.$executeRawUnsafe('INSERT INTO "WholesaleDealerBilling" ("dealerId","planKey","displayName","monthlyAmount","currency","onboardingStatus","subscriptionStatus","billingRequiredAt","createdAt","updatedAt") VALUES ($1,\'dealer\',\'ディーラープラン\',9800,\'jpy\',\'BANK_DEBIT_MANAGED\',\'active\',NOW(),NOW(),NOW())', targetId)
      }
      await tx.$executeRawUnsafe('INSERT INTO "ManagedAccountIssue" ("id","accountType","targetId","accountName","loginId","contactEmail","operatorEmail","createdAt") VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())', issueId, type, targetId, accountName, loginId, contactEmail, operator.subject)
      await tx.$executeRawUnsafe('INSERT INTO "ManagedBusinessAccess" ("id","inquiryId","accountType","targetId","principalId","accountName","loginId","contactEmail","accessStatus","mustChangePassword","approvalMailStatus","approvedBy","approvedAt","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,\'ACTIVE\',TRUE,\'PENDING\',$9,NOW(),NOW(),NOW())', accessId, inquiryId, type, targetId, principalId, accountName, loginId, contactEmail, operator.subject)
      await tx.$executeRawUnsafe('UPDATE "BusinessInquiry" SET "status"=\'closed\',"operatorNote"=COALESCE(NULLIF("operatorNote",\'\'),$2),"updatedAt"=NOW() WHERE "id"=$1', inquiryId, 'アカウント承認・発行済み')
      await audit(tx, type, targetId, 'APPROVE_AND_ISSUE', operator.subject, { inquiryId, loginId, contactEmail })
      return { id: accessId, inquiryId, accountType: type, targetId, principalId, accountName, loginId, contactEmail, accessStatus: 'ACTIVE', mustChangePassword: true }
    })
    const mail = await sendCredentials(access, password, req, false)
    return { access, mail }
  }

  async function reissueCredentials(inquiryId, operator, req) {
    const password = temporaryPassword(crypto)
    const access = await prisma.$transaction(async function (tx) {
      const rows = await tx.$queryRawUnsafe('SELECT * FROM "ManagedBusinessAccess" WHERE "inquiryId"=$1 FOR UPDATE', inquiryId)
      const row = rows[0]
      if (!row) throw new BusinessAccessError('input', 404)
      if (row.accessStatus === 'SUSPENDED') throw new BusinessAccessError('suspended', 409)
      const hash = passwordHash(crypto, password)
      if (row.accountType === 'SALON') {
        await tx.$executeRawUnsafe('UPDATE "AppUser" SET "passwordHash"=$2,"updatedAt"=NOW() WHERE "id"=$1 AND "organizationId"=$3', row.principalId, hash, row.targetId)
      } else {
        await tx.$executeRawUnsafe('UPDATE "WholesaleDealer" SET "passwordHash"=$2,"authVersion"="authVersion"+1,"updatedAt"=NOW() WHERE "id"=$1', row.targetId, hash)
      }
      await tx.$executeRawUnsafe('UPDATE "ManagedBusinessAccess" SET "mustChangePassword"=TRUE,"approvalMailStatus"=\'PENDING\',"approvalMailSentAt"=NULL,"approvalMailError"=NULL,"updatedAt"=NOW() WHERE "id"=$1', row.id)
      await audit(tx, row.accountType, row.targetId, 'CREDENTIALS_REISSUED', operator.subject, { inquiryId })
      return { ...row, mustChangePassword: true, approvalMailStatus: 'PENDING' }
    })
    const mail = await sendCredentials(access, password, req, true)
    return { access, mail }
  }

  async function managedAccessForPrincipal(type, principalId) {
    if (!principalId) return null
    const rows = await prisma.$queryRawUnsafe('SELECT * FROM "ManagedBusinessAccess" WHERE "accountType"=$1 AND "principalId"=$2 LIMIT 1', type, principalId)
    return rows[0] || null
  }

  async function accountControl(type, targetId) {
    if (!targetId) return null
    const rows = await prisma.$queryRawUnsafe('SELECT "status" FROM "BusinessAccountControl" WHERE "accountType"=$1 AND "targetId"=$2 LIMIT 1', type, targetId)
    return rows[0] || null
  }

  async function changePassword(type, session, params, operatorEmail) {
    const access = await managedAccessForPrincipal(type, type === 'SALON' ? session.userId : session.id)
    if (!access) throw new BusinessAccessError('input', 404)
    const currentPassword = String(params.get('currentPassword') || '')
    const next = String(params.get('newPassword') || '')
    const confirmation = String(params.get('newPasswordConfirm') || '')
    if (next.length < 10 || next.length > 72) throw new BusinessAccessError('password')
    if (next !== confirmation) throw new BusinessAccessError('mismatch')
    const rows = type === 'SALON'
      ? await prisma.$queryRawUnsafe('SELECT "passwordHash" FROM "AppUser" WHERE "id"=$1 AND "active"=TRUE LIMIT 1', session.userId)
      : await prisma.$queryRawUnsafe('SELECT "passwordHash" FROM "WholesaleDealer" WHERE "id"=$1 AND "active"=TRUE LIMIT 1', session.id)
    if (!rows[0] || !verifyPassword(crypto, currentPassword, rows[0].passwordHash)) throw new BusinessAccessError('current')
    if (verifyPassword(crypto, next, rows[0].passwordHash)) throw new BusinessAccessError('unchanged')
    const hash = passwordHash(crypto, next)
    await prisma.$transaction(async function (tx) {
      if (type === 'SALON') await tx.$executeRawUnsafe('UPDATE "AppUser" SET "passwordHash"=$2,"updatedAt"=NOW() WHERE "id"=$1', session.userId, hash)
      else await tx.$executeRawUnsafe('UPDATE "WholesaleDealer" SET "passwordHash"=$2,"authVersion"="authVersion"+1,"updatedAt"=NOW() WHERE "id"=$1', session.id, hash)
      await tx.$executeRawUnsafe('UPDATE "ManagedBusinessAccess" SET "mustChangePassword"=FALSE,"updatedAt"=NOW() WHERE "id"=$1', access.id)
      await audit(tx, type, access.targetId, 'PASSWORD_CHANGED', operatorEmail, { initialChange: Boolean(access.mustChangePassword) })
    })
    return access
  }

  function parseJsonArray(value) {
    if (Array.isArray(value)) return value.map(String)
    try { const parsed = JSON.parse(String(value || '[]')); return Array.isArray(parsed) ? parsed.map(String) : [] } catch { return [] }
  }

  async function setAccountStatus(type, targetId, nextStatus, operator) {
    if (!ACCOUNT_TYPES.has(type) || !['ACTIVE', 'SUSPENDED'].includes(nextStatus) || !targetId) throw new BusinessAccessError('input')
    await prisma.$transaction(async function (tx) {
      const controls = await tx.$queryRawUnsafe('SELECT * FROM "BusinessAccountControl" WHERE "accountType"=$1 AND "targetId"=$2 FOR UPDATE', type, targetId)
      const control = controls[0]
      if (type === 'SALON') {
        const organizations = await tx.$queryRawUnsafe('SELECT "id" FROM "Organization" WHERE "id"=$1 FOR UPDATE', targetId)
        if (!organizations[0]) throw new BusinessAccessError('input', 404)
        const billingRows = await tx.$queryRawUnsafe('SELECT "subscriptionStatus" FROM "OrganizationBilling" WHERE "organizationId"=$1 LIMIT 1', targetId)
        if (nextStatus === 'SUSPENDED') {
          const activeRows = await tx.$queryRawUnsafe(`SELECT "id" FROM "AppUser" WHERE "organizationId"=$1 AND "active"=TRUE AND "role"::text IN ('ADMIN','STAFF','MANUFACTURER') ORDER BY "createdAt"`, targetId)
          const snapshot = control && control.status === 'SUSPENDED' ? parseJsonArray(control.previousActivePrincipalIdsJson) : activeRows.map(function (row) { return row.id })
          const previousBilling = control && control.status === 'SUSPENDED' ? control.previousBillingStatus : (billingRows[0] && billingRows[0].subscriptionStatus || null)
          await tx.$executeRawUnsafe(`UPDATE "AppUser" SET "active"=FALSE,"updatedAt"=NOW() WHERE "organizationId"=$1 AND "role"::text IN ('ADMIN','STAFF','MANUFACTURER')`, targetId)
          await tx.$executeRawUnsafe('UPDATE "OrganizationBilling" SET "subscriptionStatus"=\'paused\',"updatedAt"=NOW() WHERE "organizationId"=$1', targetId)
          await tx.$executeRawUnsafe(`INSERT INTO "BusinessAccountControl" ("accountType","targetId","status","previousActivePrincipalIdsJson","previousBillingStatus","suspendedAt","suspendedBy","updatedAt") VALUES ('SALON',$1,'SUSPENDED',$2::jsonb,$3,NOW(),$4,NOW()) ON CONFLICT ("accountType","targetId") DO UPDATE SET "status"='SUSPENDED',"previousActivePrincipalIdsJson"=EXCLUDED."previousActivePrincipalIdsJson","previousBillingStatus"=EXCLUDED."previousBillingStatus","suspendedAt"=NOW(),"suspendedBy"=EXCLUDED."suspendedBy","updatedAt"=NOW()`, targetId, JSON.stringify(snapshot), previousBilling, operator.subject)
        } else {
          let ids = parseJsonArray(control && control.previousActivePrincipalIdsJson)
          if (!ids.length) {
            const principals = await tx.$queryRawUnsafe(`SELECT COALESCE((SELECT "principalId" FROM "ManagedBusinessAccess" WHERE "accountType"='SALON' AND "targetId"=$1 LIMIT 1),(SELECT "id" FROM "AppUser" WHERE "organizationId"=$1 AND "role"::text='ADMIN' ORDER BY "createdAt" LIMIT 1)) AS "id"`, targetId)
            if (principals[0] && principals[0].id) ids = [principals[0].id]
          }
          for (const id of ids) await tx.$executeRawUnsafe(`UPDATE "AppUser" SET "active"=TRUE,"updatedAt"=NOW() WHERE "id"=$1 AND "organizationId"=$2 AND "role"::text IN ('ADMIN','STAFF','MANUFACTURER')`, id, targetId)
          await tx.$executeRawUnsafe('UPDATE "OrganizationBilling" SET "subscriptionStatus"=$2,"updatedAt"=NOW() WHERE "organizationId"=$1', targetId, control && control.previousBillingStatus || 'active')
          await tx.$executeRawUnsafe(`INSERT INTO "BusinessAccountControl" ("accountType","targetId","status","previousActivePrincipalIdsJson","updatedAt") VALUES ('SALON',$1,'ACTIVE','[]'::jsonb,NOW()) ON CONFLICT ("accountType","targetId") DO UPDATE SET "status"='ACTIVE',"suspendedAt"=NULL,"suspendedBy"=NULL,"updatedAt"=NOW()`, targetId)
        }
      } else {
        const dealers = await tx.$queryRawUnsafe('SELECT "id","active" FROM "WholesaleDealer" WHERE "id"=$1 FOR UPDATE', targetId)
        if (!dealers[0]) throw new BusinessAccessError('input', 404)
        const billingRows = await tx.$queryRawUnsafe('SELECT "subscriptionStatus" FROM "WholesaleDealerBilling" WHERE "dealerId"=$1 LIMIT 1', targetId)
        if (nextStatus === 'SUSPENDED') {
          const previousBilling = control && control.status === 'SUSPENDED' ? control.previousBillingStatus : (billingRows[0] && billingRows[0].subscriptionStatus || null)
          await tx.$executeRawUnsafe('UPDATE "WholesaleDealer" SET "active"=FALSE,"authVersion"="authVersion"+1,"updatedAt"=NOW() WHERE "id"=$1', targetId)
          await tx.$executeRawUnsafe('UPDATE "WholesaleDealerBilling" SET "subscriptionStatus"=\'paused\',"updatedAt"=NOW() WHERE "dealerId"=$1', targetId)
          await tx.$executeRawUnsafe(`INSERT INTO "BusinessAccountControl" ("accountType","targetId","status","previousActivePrincipalIdsJson","previousBillingStatus","suspendedAt","suspendedBy","updatedAt") VALUES ('DEALER',$1,'SUSPENDED','[]'::jsonb,$2,NOW(),$3,NOW()) ON CONFLICT ("accountType","targetId") DO UPDATE SET "status"='SUSPENDED',"previousBillingStatus"=EXCLUDED."previousBillingStatus","suspendedAt"=NOW(),"suspendedBy"=EXCLUDED."suspendedBy","updatedAt"=NOW()`, targetId, previousBilling, operator.subject)
        } else {
          await tx.$executeRawUnsafe('UPDATE "WholesaleDealer" SET "active"=TRUE,"authVersion"="authVersion"+1,"updatedAt"=NOW() WHERE "id"=$1', targetId)
          await tx.$executeRawUnsafe('UPDATE "WholesaleDealerBilling" SET "subscriptionStatus"=$2,"updatedAt"=NOW() WHERE "dealerId"=$1', targetId, control && control.previousBillingStatus || 'active')
          await tx.$executeRawUnsafe(`INSERT INTO "BusinessAccountControl" ("accountType","targetId","status","previousActivePrincipalIdsJson","updatedAt") VALUES ('DEALER',$1,'ACTIVE','[]'::jsonb,NOW()) ON CONFLICT ("accountType","targetId") DO UPDATE SET "status"='ACTIVE',"suspendedAt"=NULL,"suspendedBy"=NULL,"updatedAt"=NOW()`, targetId)
        }
      }
      await tx.$executeRawUnsafe('UPDATE "ManagedBusinessAccess" SET "accessStatus"=$3,"updatedAt"=NOW() WHERE "accountType"=$1 AND "targetId"=$2', type, targetId, nextStatus)
      await audit(tx, type, targetId, nextStatus === 'SUSPENDED' ? 'SUSPEND' : 'RESUME', operator.subject, {})
    })
  }

  async function loadDashboardAccounts() {
    const [salons, dealers] = await Promise.all([
      prisma.$queryRawUnsafe(`SELECT o."id",o."name",o."createdAt",COALESCE(owner."displayName",owner."loginId",owner."email",'未登録') AS "contactName",COALESCE(m."contactEmail",owner."email",'') AS "email",COALESCE(m."loginId",owner."loginId",'') AS "loginId",m."approvedAt",m."mustChangePassword",m."approvalMailStatus",c."status" AS "controlStatus",COALESCE(state."active",FALSE) AS "active"
        FROM "Organization" o
        LEFT JOIN LATERAL (SELECT u."displayName",u."loginId",u."email" FROM "AppUser" u WHERE u."organizationId"=o."id" AND u."role"::text='ADMIN' ORDER BY u."active" DESC,u."createdAt" LIMIT 1) owner ON TRUE
        LEFT JOIN LATERAL (SELECT BOOL_OR(u."active") AS "active" FROM "AppUser" u WHERE u."organizationId"=o."id" AND u."role"::text IN ('ADMIN','STAFF','MANUFACTURER')) state ON TRUE
        LEFT JOIN "ManagedBusinessAccess" m ON m."accountType"='SALON' AND m."targetId"=o."id"
        LEFT JOIN "BusinessAccountControl" c ON c."accountType"='SALON' AND c."targetId"=o."id"
        ORDER BY CASE WHEN c."status"='SUSPENDED' OR COALESCE(state."active",FALSE)=FALSE THEN 1 ELSE 0 END,o."createdAt" DESC LIMIT 200`),
      prisma.$queryRawUnsafe(`SELECT d."id",d."name",d."representativeName" AS "contactName",COALESCE(m."contactEmail",d."email",'') AS "email",COALESCE(m."loginId",d."loginId",'') AS "loginId",d."createdAt",d."active",m."approvedAt",m."mustChangePassword",m."approvalMailStatus",c."status" AS "controlStatus"
        FROM "WholesaleDealer" d
        LEFT JOIN "ManagedBusinessAccess" m ON m."accountType"='DEALER' AND m."targetId"=d."id"
        LEFT JOIN "BusinessAccountControl" c ON c."accountType"='DEALER' AND c."targetId"=d."id"
        ORDER BY CASE WHEN c."status"='SUSPENDED' OR d."active"=FALSE THEN 1 ELSE 0 END,d."createdAt" DESC LIMIT 200`),
    ])
    function normalized(row) {
      return { ...row, status: row.controlStatus === 'SUSPENDED' || !row.active ? 'SUSPENDED' : 'ACTIVE' }
    }
    return { salons: salons.map(normalized), dealers: dealers.map(normalized) }
  }

  function accountRows(rows, type) {
    if (!rows.length) return '<tr><td colspan="7" class="empty">登録がありません。</td></tr>'
    return rows.map(function (row) {
      const active = row.status === 'ACTIVE'
      const managed = Boolean(row.approvedAt)
      return '<tr><td><strong>' + escapeHtml(row.name) + '</strong><div class="slug">' + escapeHtml(row.id) + '</div></td><td>' + escapeHtml(row.contactName || '未登録') + '<div class="slug">' + escapeHtml(row.email || '-') + '</div></td><td><code>' + escapeHtml(row.loginId || '未発行') + '</code></td><td>' + escapeHtml(formatDate(row.createdAt, true)) + '</td><td>' + (managed ? '<span class="baaState active">運営発行</span><div class="slug">' + escapeHtml(mailStatusLabel(row.approvalMailStatus)) + (row.mustChangePassword ? ' / 初回変更待ち' : '') + '</div>' : '<span class="baaState">既存</span>') + '</td><td><span class="baaState ' + (active ? 'active' : 'suspended') + '">' + (active ? '利用中' : '利用停止') + '</span></td><td><div class="baaInline" style="margin:0">' + (type === 'SALON' && active ? '<form method="post" action="/api/platform/enter-store"><input type="hidden" name="organizationId" value="' + escapeHtml(row.id) + '"><button class="baaButton" type="submit">管理画面</button></form>' : '') + '<form method="post" action="/api/platform/business-accounts/' + type.toLowerCase() + '/' + encodeURIComponent(row.id) + '/' + (active ? 'suspend' : 'resume') + '"><button class="baaButton ' + (active ? 'danger' : 'primary') + '" type="submit">' + (active ? '利用停止' : '利用再開') + '</button></form></div></td></tr>'
    }).join('')
  }

  function dashboardSection(data) {
    const activeSalons = data.salons.filter(function (row) { return row.status === 'ACTIVE' }).length
    const activeDealers = data.dealers.filter(function (row) { return row.status === 'ACTIVE' }).length
    return PLATFORM_STYLE + '<section class="card" style="margin-top:20px"><div class="baaTableHead"><div><p class="eyebrow">BUSINESS ACCOUNT ACCESS</p><h2>利用中の事業者</h2><p>サロンとディーラーのログイン状態を確認し、必要に応じて利用停止・再開できます。</p></div><div class="baaInline"><span class="baaState active">サロン ' + activeSalons + ' / ' + data.salons.length + '</span><span class="baaState active">ディーラー ' + activeDealers + ' / ' + data.dealers.length + '</span></div></div><div class="baaTables"><section><div class="baaTableHead"><div><h2>サロン一覧</h2><p>運営発行アカウントと既存店舗を表示</p></div></div><div class="baaTableWrap"><table class="baaTable"><thead><tr><th>店舗</th><th>責任者・連絡先</th><th>ログインID</th><th>登録日時</th><th>発行区分</th><th>状態</th><th>操作</th></tr></thead><tbody>' + accountRows(data.salons, 'SALON') + '</tbody></table></div></section><section><div class="baaTableHead"><div><h2>ディーラー一覧</h2><p>契約ディーラーの利用状態</p></div></div><div class="baaTableWrap"><table class="baaTable"><thead><tr><th>事業者</th><th>担当者・連絡先</th><th>ログインID</th><th>登録日時</th><th>発行区分</th><th>状態</th><th>操作</th></tr></thead><tbody>' + accountRows(data.dealers, 'DEALER') + '</tbody></table></div></section></div></section>'
  }

  async function loadInquiries(url) {
    const status = ['all', 'new', 'in_progress', 'closed'].includes(url.searchParams.get('status')) ? url.searchParams.get('status') : 'all'
    const audience = ['all', 'salon', 'dealer', 'other'].includes(url.searchParams.get('audience')) ? url.searchParams.get('audience') : 'all'
    const query = String(url.searchParams.get('q') || '').trim().slice(0, 100)
    const page = Math.max(1, Math.min(10000, Number.parseInt(url.searchParams.get('page') || '1', 10) || 1))
    const pageSize = 20
    const clauses = []
    const params = []
    if (status !== 'all') { params.push(status); clauses.push('i."status"=$' + params.length) }
    if (audience !== 'all') { params.push(audience); clauses.push('i."audience"=$' + params.length) }
    if (query) { params.push('%' + query + '%'); clauses.push('(i."organizationName" ILIKE $' + params.length + ' OR i."contactName" ILIKE $' + params.length + ' OR i."email" ILIKE $' + params.length + ')') }
    const where = clauses.length ? ' WHERE ' + clauses.join(' AND ') : ''
    const countRows = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int AS "count" FROM "BusinessInquiry" i' + where, ...params)
    const rows = await prisma.$queryRawUnsafe('SELECT i.*,m."id" AS "accessId",m."accountType",m."targetId",m."accountName",m."loginId",m."contactEmail" AS "issuedEmail",m."accessStatus",m."mustChangePassword",m."approvalMailStatus",m."approvalMailSentAt",m."approvalMailError",m."approvedAt",m."approvedBy" FROM "BusinessInquiry" i LEFT JOIN "ManagedBusinessAccess" m ON m."inquiryId"=i."id"' + where + ' ORDER BY CASE i."status" WHEN \'new\' THEN 0 WHEN \'in_progress\' THEN 1 ELSE 2 END,i."createdAt" DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2), ...params, pageSize, (page - 1) * pageSize)
    const stats = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int AS "total",COUNT(*) FILTER (WHERE "status"=\'new\')::int AS "newCount",COUNT(*) FILTER (WHERE "status"=\'in_progress\')::int AS "inProgressCount",COUNT(*) FILTER (WHERE "status"=\'closed\')::int AS "closedCount" FROM "BusinessInquiry"')
    return { rows, total: Number(countRows[0] && countRows[0].count || 0), stats: stats[0] || {}, status, audience, query, page, pageSize }
  }

  function inquiryCard(row) {
    const audience = { salon: '美容室', dealer: 'ディーラー', other: 'その他の法人' }[row.audience] || '未設定'
    const status = { new: '未対応', in_progress: '対応中', closed: '完了' }[row.status] || '未対応'
    let issuance = ''
    if (row.accessId) {
      issuance = '<div class="baaIssued"><strong>' + escapeHtml(accountTypeLabel(row.accountType)) + 'アカウント発行済み</strong><div class="baaMeta" style="margin-top:7px"><span>ID <code>' + escapeHtml(row.loginId) + '</code></span><span>' + escapeHtml(row.issuedEmail) + '</span><span>' + escapeHtml(formatDate(row.approvedAt, true)) + '</span><span class="baaState ' + (row.approvalMailStatus === 'SENT' ? 'active' : 'suspended') + '">' + escapeHtml(mailStatusLabel(row.approvalMailStatus)) + '</span></div>' + (row.approvalMailStatus !== 'SENT' ? '<form class="baaInline" method="post" action="/api/platform/inquiries/' + encodeURIComponent(row.id) + '/resend"><button class="baaButton primary" type="submit">認証情報を再発行してメール送信</button></form>' : '') + '</div>'
    } else if (row.audience === 'salon' || row.audience === 'dealer') {
      issuance = '<details class="baaApprove"><summary>申請を承認してアカウントを発行</summary><form method="post" action="/api/platform/inquiries/' + encodeURIComponent(row.id) + '/approve"><div class="baaApproveGrid"><label class="baaField wide"><span>事業者・店舗名</span><input name="accountName" value="' + escapeHtml(row.organizationName) + '" required maxlength="140"></label><label class="baaField"><span>責任者・担当者名</span><input name="contactName" value="' + escapeHtml(row.contactName) + '" required maxlength="120"></label><label class="baaField"><span>承認メール送信先</span><input name="contactEmail" type="email" value="' + escapeHtml(row.email) + '" required maxlength="254"></label>' + (row.audience === 'salon' ? '<label class="baaField"><span>利用プラン</span><select name="planKey"><option value="take">竹プラン</option><option value="ume">梅プラン</option><option value="matsu">松プラン</option></select></label>' : '') + '<div class="baaField"><span>発行方法</span><div class="baaMeta">初期ID・初期PASSを自動生成し、承認メールで通知します。</div></div></div><button class="baaButton primary" style="margin-top:12px" type="submit">承認・発行する</button></form></details>'
    } else {
      issuance = '<div class="baaIssued">この申請種別はアカウント自動発行の対象外です。対応状況と運営メモで管理してください。</div>'
    }
    return '<article class="baaInquiry"><div class="baaInquiryHead"><div><div class="baaMeta"><span class="baaState">' + escapeHtml(audience) + '</span><span>' + escapeHtml(formatDate(row.createdAt, true)) + '</span></div><h2>' + escapeHtml(row.organizationName) + '</h2><div class="baaMeta"><span>' + escapeHtml(row.contactName) + '</span><a href="mailto:' + escapeHtml(row.email) + '">' + escapeHtml(row.email) + '</a><span>' + escapeHtml(row.phone || '電話未登録') + '</span><span>希望: ' + escapeHtml(row.preferredContact === 'phone' ? '電話' : row.preferredContact === 'email' ? 'メール' : 'どちらでも可') + '</span></div></div><span class="baaState ' + (row.status === 'closed' ? 'active' : '') + '">' + escapeHtml(status) + '</span></div><div class="baaMessage">' + escapeHtml(row.message) + '</div>' + issuance + '<div class="baaActions"><form class="baaStatusForm" method="post" action="/api/platform/inquiries/' + encodeURIComponent(row.id) + '"><div class="baaApproveGrid"><label class="baaField"><span>対応状況</span><select name="status"><option value="new"' + (row.status === 'new' ? ' selected' : '') + '>未対応</option><option value="in_progress"' + (row.status === 'in_progress' ? ' selected' : '') + '>対応中</option><option value="closed"' + (row.status === 'closed' ? ' selected' : '') + '>完了</option></select></label><label class="baaField"><span>運営メモ</span><input name="operatorNote" value="' + escapeHtml(row.operatorNote || '') + '" maxlength="1000"></label></div><button class="baaButton" style="margin-top:10px" type="submit">対応状況を保存</button></form><div></div></div></article>'
  }

  function inquiriesPage(data, url) {
    const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize))
    function pageLink(page) {
      const query = new URLSearchParams()
      if (data.query) query.set('q', data.query)
      if (data.status !== 'all') query.set('status', data.status)
      if (data.audience !== 'all') query.set('audience', data.audience)
      query.set('page', String(page))
      return '/platform/inquiries?' + query.toString()
    }
    const cards = data.rows.length ? data.rows.map(inquiryCard).join('') : '<div class="empty">条件に合う申請はありません。</div>'
    const pager = '<div class="baaPager">' + (data.page > 1 ? '<a class="baaButton" href="' + pageLink(data.page - 1) + '">前へ</a>' : '') + '<span class="baaButton">' + data.page + ' / ' + totalPages + 'ページ</span>' + (data.page < totalPages ? '<a class="baaButton" href="' + pageLink(data.page + 1) + '">次へ</a>' : '') + '</div>'
    const body = PLATFORM_STYLE + '<main class="main"><section class="hero"><div><p class="eyebrow">BUSINESS APPLICATIONS</p><h1>導入申請・アカウント発行</h1><p>問い合わせ内容を確認し、承認した事業者へ運営発行IDと初期パスワードを通知します。</p></div><div class="updated">未対応 ' + Number(data.stats.newCount || 0) + '件<br><strong>全 ' + Number(data.stats.total || 0) + '件</strong></div></section>' + noticeFromQuery(url) + '<section class="card" style="margin-top:20px"><form class="baaToolbar" method="get" action="/platform/inquiries"><label class="field wideSearch"><label for="baa-q">事業者・担当者・メールで検索</label><input id="baa-q" name="q" value="' + escapeHtml(data.query) + '"></label><label class="baaField"><span>申請種別</span><select name="audience"><option value="all">すべて</option><option value="salon"' + (data.audience === 'salon' ? ' selected' : '') + '>美容室</option><option value="dealer"' + (data.audience === 'dealer' ? ' selected' : '') + '>ディーラー</option><option value="other"' + (data.audience === 'other' ? ' selected' : '') + '>その他</option></select></label><label class="baaField"><span>対応状況</span><select name="status"><option value="all">すべて</option><option value="new"' + (data.status === 'new' ? ' selected' : '') + '>未対応</option><option value="in_progress"' + (data.status === 'in_progress' ? ' selected' : '') + '>対応中</option><option value="closed"' + (data.status === 'closed' ? ' selected' : '') + '>完了</option></select></label><button class="baaButton primary" type="submit">絞り込む</button></form></section><section class="baaCards">' + cards + '</section>' + pager + '</main>'
    return renderPlatformPage('導入申請・アカウント発行', body, true)
  }

  async function platformDashboard(req, res, headOnly) {
    const baseData = await baseDashboardProvider()
    const accounts = await loadDashboardAccounts()
    const content = renderBaseDashboard(baseData).replace('</main>', dashboardSection(accounts) + '</main>')
    sendHtml(res, 200, content, headOnly)
  }

  async function handlePlatform(req, res, url) {
    const pathname = url.pathname
    const relevant = pathname === '/platform' || pathname === '/platform/inquiries' || pathname === '/platform/accounts' || pathname.startsWith('/api/platform/inquiries/') || pathname.startsWith('/api/platform/business-accounts/') || pathname === '/api/platform/accounts/salon' || pathname === '/api/platform/accounts/dealer'
    if (!relevant) return false
    const operator = operatorSession(req)
    if (!operator) { redirect(res, '/platform/login', 302); return true }
    await ensureSchema()
    if (pathname === '/platform/accounts') { redirect(res, '/platform/inquiries', 302); return true }
    if (pathname === '/api/platform/accounts/salon' || pathname === '/api/platform/accounts/dealer') { redirect(res, '/platform/inquiries?error=approval-required'); return true }
    if (pathname === '/platform') {
      if (!['GET', 'HEAD'].includes(req.method)) { res.statusCode = 405; res.end(); return true }
      await platformDashboard(req, res, req.method === 'HEAD')
      return true
    }
    if (pathname === '/platform/inquiries') {
      if (!['GET', 'HEAD'].includes(req.method)) { res.statusCode = 405; res.end(); return true }
      const content = inquiriesPage(await loadInquiries(url), url)
      sendHtml(res, 200, content, req.method === 'HEAD')
      return true
    }
    const approvalMatch = pathname.match(/^\/api\/platform\/inquiries\/([^/]+)\/(approve|resend)$/)
    if (approvalMatch) {
      if (req.method !== 'POST') { res.statusCode = 405; res.end(); return true }
      if (!validSameOrigin(req)) { res.statusCode = 403; res.end(); return true }
      const inquiryId = decodeURIComponent(approvalMatch[1]).slice(0, 160)
      try {
        const result = approvalMatch[2] === 'approve' ? await approveInquiry(inquiryId, await readForm(req), operator, req) : await reissueCredentials(inquiryId, operator, req)
        redirect(res, '/platform/inquiries?' + (approvalMatch[2] === 'approve' ? 'approved=1' : 'resent=1') + '&mail=' + (result.mail.sent ? 'sent' : 'failed'))
      } catch (error) {
        const duplicate = error && (error.code === '23505' || error.code === 'P2002')
        const code = error instanceof BusinessAccessError ? error.code : duplicate ? 'duplicate' : 'server'
        if (code === 'server') console.error('[business-account-approvals-v643] approval failed', { error: error && error.stack || error })
        redirect(res, '/platform/inquiries?error=' + encodeURIComponent(code))
      }
      return true
    }
    const statusMatch = pathname.match(/^\/api\/platform\/business-accounts\/(salon|dealer)\/([^/]+)\/(suspend|resume)$/)
    if (statusMatch) {
      if (req.method !== 'POST') { res.statusCode = 405; res.end(); return true }
      if (!validSameOrigin(req)) { res.statusCode = 403; res.end(); return true }
      try {
        await setAccountStatus(statusMatch[1] === 'dealer' ? 'DEALER' : 'SALON', decodeURIComponent(statusMatch[2]).slice(0, 180), statusMatch[3] === 'suspend' ? 'SUSPENDED' : 'ACTIVE', operator)
        redirect(res, '/platform?account=' + (statusMatch[3] === 'suspend' ? 'suspended' : 'resumed'))
      } catch (error) {
        console.error('[business-account-approvals-v643] account status failed', { error: error && error.stack || error })
        redirect(res, '/platform?account=failed')
      }
      return true
    }
    return false
  }

  async function handleAdmin(req, res, url) {
    const pathname = url.pathname
    const relevant = pathname.startsWith('/admin/') || pathname.startsWith('/api/admin/') || pathname === '/api/auth/account' || pathname === '/api/auth/managed-password-change'
    if (!relevant || pathname === '/admin/login' || pathname.startsWith('/api/auth/login') || pathname.startsWith('/api/auth/logout')) return false
    const liveSession = await adminSessionProvider(req)
    const session = liveSession || rawAdminSession(crypto, req)
    if (!session || session.operatorSubject) return false
    await ensureSchema()
    const access = await managedAccessForPrincipal('SALON', session.userId)
    const control = await accountControl('SALON', session.organizationId || access && access.targetId)
    if ((access && access.accessStatus === 'SUSPENDED') || (control && control.status === 'SUSPENDED')) {
      res.setHeader('Set-Cookie', expiredCookie(req, ADMIN_COOKIE))
      if (pathname.startsWith('/api/')) sendJson(res, 403, { error: 'このアカウントは利用停止中です。' })
      else redirect(res, '/admin/login?error=suspended', 302)
      return true
    }
    if (!liveSession || !access) return false
    if (pathname === '/admin/password-change' && ['GET', 'HEAD'].includes(req.method)) {
      sendHtml(res, 200, passwordPage(access, 'salon', { error: url.searchParams.get('error') }), req.method === 'HEAD', true)
      return true
    }
    if ((pathname === '/api/auth/managed-password-change' || pathname === '/api/auth/account') && req.method === 'POST') {
      if (!validSameOrigin(req)) { res.statusCode = 403; res.end(); return true }
      try {
        await changePassword('SALON', session, await readForm(req), session.subject)
        res.setHeader('Set-Cookie', expiredCookie(req, ADMIN_COOKIE))
        redirect(res, '/admin/login?account=updated')
      } catch (error) {
        const code = error instanceof BusinessAccessError ? error.code : 'failed'
        redirect(res, '/admin/password-change?error=' + encodeURIComponent(code))
      }
      return true
    }
    if (access.mustChangePassword) {
      if (pathname.startsWith('/api/')) sendJson(res, 428, { error: '初回パスワード変更が必要です。', redirect: '/admin/password-change' })
      else redirect(res, '/admin/password-change', 302)
      return true
    }
    if (pathname === '/admin/account' && !url.searchParams.has('panel') && ['GET', 'HEAD'].includes(req.method)) {
      sendHtml(res, 200, passwordPage(access, 'salon', { error: url.searchParams.get('error') }), req.method === 'HEAD', true)
      return true
    }
    return false
  }

  async function handleDealer(req, res, url) {
    const pathname = url.pathname.length > 1 ? url.pathname.replace(/\/$/, '') : url.pathname
    const relevant = pathname.startsWith('/dealer') || pathname.startsWith('/api/dealer/')
    if (!relevant || pathname === '/dealer/login' || pathname.startsWith('/dealer/password-reset') || pathname === '/api/dealer/auth/login' || pathname === '/api/dealer/auth/logout' || pathname.startsWith('/api/dealer/auth/password-reset')) return false
    const liveSession = await dealerSessionProvider(req)
    const session = liveSession || rawDealerSession(crypto, req)
    if (!session) return false
    await ensureSchema()
    const access = await managedAccessForPrincipal('DEALER', session.id)
    const control = await accountControl('DEALER', session.id)
    if ((access && access.accessStatus === 'SUSPENDED') || (control && control.status === 'SUSPENDED')) {
      res.setHeader('Set-Cookie', expiredCookie(req, DEALER_COOKIE))
      if (pathname.startsWith('/api/')) sendJson(res, 403, { error: 'このアカウントは利用停止中です。' })
      else redirect(res, '/dealer/login?error=suspended', 302)
      return true
    }
    if (!liveSession || !access) return false
    if (pathname === '/dealer/password-change' && ['GET', 'HEAD'].includes(req.method)) {
      sendHtml(res, 200, passwordPage(access, 'dealer', { error: url.searchParams.get('error') }), req.method === 'HEAD', true)
      return true
    }
    if (pathname === '/api/dealer/managed-password-change' && req.method === 'POST') {
      if (!validSameOrigin(req)) { res.statusCode = 403; res.end(); return true }
      try {
        await changePassword('DEALER', session, await readForm(req), session.loginId)
        res.setHeader('Set-Cookie', expiredCookie(req, DEALER_COOKIE))
        redirect(res, '/dealer/login?reset=complete')
      } catch (error) {
        const code = error instanceof BusinessAccessError ? error.code : 'failed'
        redirect(res, '/dealer/password-change?error=' + encodeURIComponent(code))
      }
      return true
    }
    if (access.mustChangePassword) {
      if (pathname.startsWith('/api/')) sendJson(res, 428, { error: '初回パスワード変更が必要です。', redirect: '/dealer/password-change' })
      else redirect(res, '/dealer/password-change', 302)
      return true
    }
    return false
  }

  async function handle(req, res, url) {
    if (await handlePlatform(req, res, url)) return true
    if (await handleAdmin(req, res, url)) return true
    if (await handleDealer(req, res, url)) return true
    return false
  }

  return {
    ensureSchema,
    handle,
    approveInquiry,
    reissueCredentials,
    changePassword,
    setAccountStatus,
    loadDashboardAccounts,
    loadInquiries,
    managedAccessForPrincipal,
  }
}

module.exports = {
  RELEASE,
  BusinessAccessError,
  approvalEmail,
  createBusinessAccountApprovalService,
  passwordPage,
  passwordHash,
  verifyPassword,
}
