'use strict'

/* dealer-auth-self-service-v548 */

const fs = require('node:fs')
const path = require('node:path')

const SESSION_COOKIE = 'orimia_dealer_session'
const SESSION_VERSION = 1
const SESSION_SECONDS = 12 * 60 * 60
const AUTH_TOKEN_SECONDS = 30 * 60
const AUTH_ATTEMPT_WINDOW_MS = 15 * 60 * 1000
const AUTH_ATTEMPT_LIMIT = 5
const ORDER_STATUSES = ['ORDERED', 'ACCEPTED', 'SHIPPED', 'DELIVERED', 'CANCELLED']
const CONTRACT_STATUSES = ['PENDING', 'ACTIVE', 'SUSPENDED']
const CLIENT_SCRIPT = fs.readFileSync(path.join(__dirname, 'wholesale-ordering-client-v543.js'))
const STYLESHEET = fs.readFileSync(path.join(__dirname, 'wholesale-ordering-v543.css'))

class WholesaleError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.name = 'WholesaleError'
    this.status = status
  }
}

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character])
}

function parseCookies(req) {
  return String(req.headers.cookie || '').split(';').map(value => value.trim()).filter(Boolean).reduce((result, value) => {
    const index = value.indexOf('=')
    if (index < 1) return result
    const key = value.slice(0, index).trim()
    const raw = value.slice(index + 1).trim()
    try { result[key] = decodeURIComponent(raw) } catch { result[key] = raw }
    return result
  }, {})
}

function timingSafeEqual(crypto, left, right) {
  const leftBuffer = Buffer.from(String(left || ''))
  const rightBuffer = Buffer.from(String(right || ''))
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer)
}

function json(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.end(JSON.stringify(payload))
}

function html(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('X-Frame-Options', 'DENY')
  res.end(body)
}

function redirect(res, location, status = 303) {
  res.statusCode = status
  res.setHeader('Location', location)
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.end()
}

function validSameOrigin(req) {
  const source = String(req.headers.origin || req.headers.referer || '').trim()
  if (!source) return false
  const allowed = new Set(['https://salon-de-lien.com', 'https://www.salon-de-lien.com'])
  for (const key of ['APP_URL', 'NEXT_PUBLIC_APP_URL', 'APP_BASE_URL', 'AUTH_BASE_URL', 'NEXTAUTH_URL']) {
    try { if (process.env[key]) allowed.add(new URL(process.env[key]).origin) } catch {}
  }
  try { return allowed.has(new URL(source).origin) } catch { return false }
}

async function readBody(req, maxBytes = 512 * 1024) {
  const chunks = []
  let total = 0
  for await (const chunk of req) {
    total += chunk.length
    if (total > maxBytes) throw new WholesaleError('入力内容が大きすぎます。', 413)
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}

async function readPayload(req) {
  const contentType = String(req.headers['content-type'] || '').toLowerCase()
  const raw = await readBody(req)
  if (contentType.includes('application/json')) {
    try { return raw ? JSON.parse(raw) : {} } catch { throw new WholesaleError('入力内容を確認してください。') }
  }
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(raw).entries())
  }
  throw new WholesaleError('送信形式を確認してください。', 415)
}

function cleanText(value, label, maxLength, required = false) {
  const normalized = String(value == null ? '' : value).replace(/\s+/g, ' ').trim()
  if (required && !normalized) throw new WholesaleError(label + 'を入力してください。')
  if (normalized.length > maxLength) throw new WholesaleError(label + 'は' + maxLength + '文字以内で入力してください。')
  return normalized
}

function integer(value, label, minimum, maximum) {
  const number = Number(value)
  if (!Number.isSafeInteger(number) || number < minimum || number > maximum) {
    throw new WholesaleError(label + 'を正しく入力してください。')
  }
  return number
}

function optionalDate(value, label) {
  const normalized = String(value || '').trim()
  if (!normalized) return null
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(normalized)) throw new WholesaleError(label + 'を確認してください。')
  const parsed = new Date(normalized + 'T00:00:00.000Z')
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== normalized) {
    throw new WholesaleError(label + 'を確認してください。')
  }
  return normalized
}

function dealerPasswordHash(crypto, password) {
  const salt = crypto.randomBytes(16).toString('hex')
  return `scrypt$${salt}$${crypto.scryptSync(password, salt, 64).toString('hex')}`
}

function verifyDealerPassword(crypto, password, encoded) {
  const parts = String(encoded || '').split('$')
  if (parts.length !== 3 || parts[0] !== 'scrypt' || !parts[1] || !parts[2]) return false
  try {
    const actual = crypto.scryptSync(String(password || ''), parts[1], 64)
    const expected = Buffer.from(parts[2], 'hex')
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected)
  } catch { return false }
}

function dealerSecret() {
  return String(process.env.DEALER_AUTH_SECRET || process.env.ADMIN_AUTH_SECRET || '')
}

function signedDealerSession(crypto, dealer) {
  const secret = dealerSecret()
  if (secret.length < 32) throw new WholesaleError('ディーラー認証を初期化できませんでした。', 503)
  const issuedAt = Math.floor(Date.now() / 1000)
  const payload = Buffer.from(JSON.stringify({
    version: SESSION_VERSION,
    dealerId: dealer.id,
    loginId: dealer.loginId,
    authVersion: Number(dealer.authVersion || 1),
    issuedAt,
    expiresAt: issuedAt + SESSION_SECONDS,
    sessionId: crypto.randomUUID(),
  })).toString('base64url')
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url')
  return payload + '.' + signature
}

function verifyDealerSessionToken(crypto, token) {
  const secret = dealerSecret()
  if (!token || secret.length < 32) return null
  const parts = String(token).split('.')
  if (parts.length !== 2) return null
  const expected = crypto.createHmac('sha256', secret).update(parts[0]).digest('base64url')
  if (!timingSafeEqual(crypto, parts[1], expected)) return null
  try {
    const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'))
    if (payload.version !== SESSION_VERSION || !payload.dealerId || Number(payload.expiresAt) <= Math.floor(Date.now() / 1000)) return null
    return payload
  } catch { return null }
}

function sessionCookie(req, token) {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim()
  const secure = forwardedProto === 'https' || (!String(req.headers.host || '').includes('localhost') && !String(req.headers.host || '').startsWith('127.0.0.1'))
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_SECONDS}${secure ? '; Secure' : ''}`
}

function expiredSessionCookie(req) {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim()
  const secure = forwardedProto === 'https' || (!String(req.headers.host || '').includes('localhost') && !String(req.headers.host || '').startsWith('127.0.0.1'))
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`
}

function publicOrigin(req) {
  for (const key of ['APP_URL', 'NEXT_PUBLIC_APP_URL', 'APP_BASE_URL', 'AUTH_BASE_URL', 'NEXTAUTH_URL']) {
    try { if (process.env[key]) return new URL(process.env[key]).origin } catch {}
  }
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim()
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim()
  const protocol = forwardedProto || (host.includes('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https')
  return host ? protocol + '://' + host : 'https://salon-de-lien.com'
}

function authToken(crypto) {
  return crypto.randomBytes(32).toString('base64url')
}

function authTokenHash(crypto, token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex')
}

function validAuthToken(token) {
  return /^[A-Za-z0-9_-]{40,100}$/.test(String(token || ''))
}

function normalizeEmail(value) {
  return String(value == null ? '' : value).trim().toLowerCase()
}

function validEmail(value) {
  const email = normalizeEmail(value)
  return email.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function clientAddress(req) {
  return String(req.headers['x-forwarded-for'] || req.socket && req.socket.remoteAddress || 'unknown').split(',')[0].trim()
}

function base64Url(value) {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function encodedMailSubject(value) {
  return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`
}

function dealerAuthMailHtml(input) {
  const detail = input.loginId ? `<tr><td style="padding:8px 0;color:#7c7168;font-size:12px">ログインID</td><td style="padding:8px 0;text-align:right;font-size:13px;font-weight:700">${escapeHtml(input.loginId)}</td></tr>` : ''
  const securityNote = input.oneTime === false
    ? 'このメールに心当たりがない場合は、何もせず削除してください。'
    : `このURLは送信から${Math.round(AUTH_TOKEN_SECONDS / 60)}分間、一度だけ有効です。心当たりがない場合は、このメールを削除してください。`
  return `<!doctype html><html lang="ja"><body style="margin:0;background:#f8f4ef;color:#2f2926;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans JP',sans-serif"><div style="display:none;max-height:0;overflow:hidden">${escapeHtml(input.preheader)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 12px;background:#f8f4ef"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;border:1px solid #eaded8;background:#fff"><tr><td style="padding:30px 32px"><img src="${escapeHtml(input.origin)}/brand/orimia-icon-192.png" width="52" height="52" alt="ORIMIA" style="display:block;border:0"><p style="margin:22px 0 6px;color:#b83d5e;font-size:12px;font-weight:700;letter-spacing:.08em">ORIMIA PARTNER NETWORK</p><h1 style="margin:0;font-family:Georgia,'Yu Mincho',serif;font-size:27px;font-weight:500;line-height:1.5">${escapeHtml(input.title)}</h1><p style="margin:16px 0 20px;color:#746864;font-size:14px;line-height:1.8">${escapeHtml(input.lead)}</p>${detail ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:22px;border-top:1px solid #eee4df;border-bottom:1px solid #eee4df">${detail}</table>` : ''}<a href="${escapeHtml(input.actionUrl)}" style="display:block;padding:14px 18px;background:#b83d5e;color:#fff;font-size:14px;font-weight:700;text-align:center;text-decoration:none">${escapeHtml(input.actionLabel)}</a><p style="margin:18px 0 0;color:#8a7e79;font-size:12px;line-height:1.8">${escapeHtml(securityNote)}</p></td></tr></table></td></tr></table></body></html>`
}

async function gmailAccessToken() {
  const clientId = String(process.env.GMAIL_OAUTH_CLIENT_ID || '').trim()
  const clientSecret = String(process.env.GMAIL_OAUTH_CLIENT_SECRET || '').trim()
  const refreshToken = String(process.env.GMAIL_OAUTH_REFRESH_TOKEN || '').trim()
  if (!clientId || !clientSecret || !refreshToken) throw new Error('Gmail OAuth settings are unavailable')
  const endpoint = String(process.env.DEALER_GMAIL_OAUTH_TOKEN_URL || 'https://oauth2.googleapis.com/token').trim()
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
    cache: 'no-store',
  })
  let payload = {}
  try { payload = await response.json() } catch {}
  if (!response.ok || !payload.access_token) throw new Error(`Gmail OAuth token error (${response.status})`)
  return payload.access_token
}

async function sendDealerAuthMail(input) {
  const from = String(process.env.GMAIL_RESERVATION_EMAIL || '').trim()
  if (!from) throw new Error('GMAIL_RESERVATION_EMAIL is unavailable')
  const senderName = String(process.env.PASSWORD_RESET_MAIL_FROM_NAME || 'ORIMIA').trim()
  const accessToken = await gmailAccessToken()
  const boundary = `orimia-dealer-${Date.now().toString(36)}`
  const body = [
    'ORIMIA PARTNER NETWORK',
    '',
    input.title,
    '',
    input.lead,
    ...(input.loginId ? ['', `ログインID: ${input.loginId}`] : []),
    '',
    input.actionUrl,
    '',
    input.oneTime === false ? 'このメールに心当たりがない場合は、何もせず削除してください。' : `このURLは送信から${Math.round(AUTH_TOKEN_SECONDS / 60)}分間、一度だけ有効です。`,
    '心当たりがない場合は、このメールを削除してください。',
  ].join('\r\n')
  const headers = [
    `From: ${encodedMailSubject(senderName)} <${from}>`,
    `To: ${input.to}`,
    `Subject: ${encodedMailSubject(input.subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ]
  const raw = [
    ...headers, '', `--${boundary}`, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: 8bit', '', body,
    `--${boundary}`, 'Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: 8bit', '', dealerAuthMailHtml(input),
    `--${boundary}--`, '',
  ].join('\r\n')
  const endpoint = String(process.env.DEALER_GMAIL_SEND_URL || 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send').trim()
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: base64Url(raw) }),
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`Gmail send error (${response.status})`)
}

function icon(name, className = '') {
  const paths = {
    arrowLeft: '<path d="m15 18-6-6 6-6"/>',
    boxes: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12M7.5 4.3l9 5.1"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    package: '<path d="m7.5 4.3 9 5.1M21 8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>',
    images: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
    chart: '<path d="M3 3v18h18"/><path d="m7 16 4-5 4 3 5-8"/>',
    settings: '<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/>',
    logout: '<path d="M10 17l5-5-5-5M15 12H3"/><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>',
    truck: '<path d="M10 17h4V5H2v12h3"/><path d="M14 8h4l4 4v5h-3M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM15 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/>',
    clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 9h6M9 13h6M9 17h4"/>',
    printer: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15 8l3 3M18 5l3 3"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.9 5.7a2 2 0 0 1-2.2 0L2 7"/>',
    userPlus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3Z"/><path d="m9 12 2 2 4-4"/>',
    check: '<path d="m20 6-11 11-5-5"/>',
  }
  return `<svg class="${escapeHtml(className)}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.package}</svg>`
}

function sharedHead(title) {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="light"><title>${escapeHtml(title)} | ORIMIA</title><link rel="icon" href="/brand/orimia-icon-32.png"><link rel="stylesheet" href="/wholesale-ordering-v543.css?v=548"></head>`
}

function adminOrderingPage(actor) {
  const actorName = escapeHtml(actor.displayName || actor.subject || '店舗スタッフ')
  return `${sharedHead('在庫管理・発注')}<body class="wo-body wo-admin-body" data-wholesale-page="salon">
  <div class="wo-admin-layout">
    <aside class="wo-admin-sidebar">
      <a class="wo-brand" href="/admin/products"><img src="/brand/orimia-icon-192.png" alt=""><span><strong>ORIMIA for Salon</strong><small>Salon management service</small></span></a>
      <nav aria-label="管理画面ナビゲーション">
        <a href="/admin/appointments">${icon('calendar')}<span>予約カレンダー</span></a>
        <a href="/admin/customers">${icon('users')}<span>顧客・チャット・配信</span></a>
        <a class="active" href="/admin/products">${icon('package')}<span>メニュー・商品棚・集計</span></a>
        <a href="/admin/community">${icon('images')}<span>スタイル共有</span></a>
        <a href="/admin/owner-analytics">${icon('chart')}<span>経営分析</span></a>
      </nav>
      <div class="wo-sidebar-foot"><a href="/admin/settings">${icon('settings')}<span>店舗運用設定</span></a><a href="/api/auth/logout">${icon('logout')}<span>ログアウト</span></a></div>
    </aside>
    <div class="wo-admin-stage">
      <header class="wo-admin-topbar"><a class="wo-icon-button" href="/admin/products" aria-label="商品棚へ戻る">${icon('arrowLeft')}</a><div><small>ORIMIA for Salon</small><strong>在庫管理・発注</strong></div><span class="wo-topbar-user">${actorName}</span></header>
      <main class="wo-main">
        <section class="wo-page-head"><div><p class="wo-eyebrow">INVENTORY &amp; ORDERS</p><h1>在庫管理・発注</h1><p>現在庫の棚卸し、ディーラーへの発注、納品状況の確認をこの画面で管理します。</p></div><a class="wo-button wo-button-secondary" href="/admin/products">${icon('arrowLeft')}商品棚へ戻る</a></section>
        <div id="wholesale-app" class="wo-app-root" aria-live="polite"><div class="wo-loading"><span></span><p>在庫と発注情報を読み込んでいます</p></div></div>
      </main>
    </div>
  </div>
  <nav class="wo-mobile-nav" aria-label="モバイルナビゲーション"><a href="/admin/appointments">${icon('calendar')}<span>予約</span></a><a href="/admin/customers">${icon('users')}<span>顧客</span></a><a class="active" href="/admin/products">${icon('package')}<span>商品</span></a><a href="/admin/community">${icon('images')}<span>スタイル</span></a><a href="/admin/owner-analytics">${icon('chart')}<span>集計</span></a></nav>
  <script src="/wholesale-ordering-client-v543.js?v=548" defer></script></body></html>`
}

function dealerLoginPage({ error = '', setup = '', registered = '', reset = '' } = {}) {
  const message = setup === 'complete'
    ? '<div class="wo-auth-notice success">初期設定が完了しました。ログインしてください。</div>'
    : registered === 'complete'
      ? '<div class="wo-auth-notice success">新規設定が完了しました。設定したログインIDまたはメールアドレスでログインできます。</div>'
      : reset === 'complete'
        ? '<div class="wo-auth-notice success">パスワードを変更しました。新しいパスワードでログインしてください。</div>'
        : error
          ? '<div class="wo-auth-notice error">ログインID、メールアドレスまたはパスワードを確認してください。</div>'
          : ''
  return `${sharedHead('ディーラーログイン')}<body class="wo-auth-body"><main class="wo-auth-layout"><section class="wo-auth-visual"><img src="/brand/orimia-icon-192.png" alt=""><p>ORIMIA PARTNER NETWORK</p><h1>美容室からの注文を、<br>確実に納品へ。</h1><span>受注、出荷、納品書を一つの業務画面で管理します。</span></section><section class="wo-auth-panel"><div class="wo-auth-card"><p class="wo-eyebrow">DEALER PORTAL</p><h2>ディーラーログイン</h2><p>契約ディーラー専用の受注管理画面です。</p>${message}<form method="post" action="/api/dealer/auth/login"><input type="hidden" name="next" value="/dealer/orders"><label><span>ログインIDまたはメールアドレス</span><input name="loginId" autocomplete="username" required maxlength="200" placeholder="dealer@example.jp"></label><label><span>パスワード</span><input name="password" type="password" autocomplete="current-password" required maxlength="200" placeholder="パスワード"></label><button class="wo-button wo-button-primary wo-auth-submit" type="submit">ログイン${icon('arrowLeft', 'wo-login-arrow')}</button></form><a class="wo-auth-secondary-link" href="/dealer/password-reset">${icon('key')}<span>ID・パスワードを忘れた方</span></a><div class="wo-auth-register"><strong>初めてご利用の方</strong><p>登録メールアドレスを確認して、ディーラーアカウントを新規設定します。</p><a class="wo-button wo-button-secondary" href="/dealer/register">${icon('userPlus')}新規アカウントを設定</a></div><a class="wo-auth-back" href="/">ORIMIAトップへ戻る</a></div></section></main></body></html>`
}

function dealerRegistrationRequestPage({ sent = false, error = '' } = {}) {
  const message = sent
    ? '<div class="wo-auth-notice success" role="status">確認メールを送信しました。受信箱と迷惑メールをご確認ください。</div>'
    : error
      ? `<div class="wo-auth-notice error" role="alert">${escapeHtml(error)}</div>`
      : ''
  return `${sharedHead('ディーラー新規設定')}<body class="wo-auth-body"><main class="wo-auth-layout"><section class="wo-auth-visual"><img src="/brand/orimia-icon-192.png" alt=""><p>DEALER ONBOARDING</p><h1>取引の入口を、<br>ひとつの仕組みに。</h1><span>メール確認後、会社情報とログイン情報を設定します。</span></section><section class="wo-auth-panel"><div class="wo-auth-card"><span class="wo-auth-symbol">${icon('userPlus')}</span><p class="wo-eyebrow">NEW DEALER ACCOUNT</p><h2>ディーラー新規設定</h2><p>登録するメールアドレスへ、初期設定用URLを送信します。</p>${message}<form method="post" action="/api/dealer/auth/register/request"><label><span>登録メールアドレス</span><span class="wo-auth-input-icon">${icon('mail')}<input name="email" type="email" autocomplete="email" required maxlength="200" placeholder="example@dealer.jp"></span></label><button class="wo-button wo-button-primary wo-auth-submit" type="submit">確認メールを送る${icon('arrowLeft', 'wo-login-arrow')}</button></form><div class="wo-auth-security">${icon('shield')}<span>初期設定URLは30分間、一度だけ有効です。登録済みの場合はログイン画面から再設定できます。</span></div><a class="wo-auth-back" href="/dealer/login">ログイン画面に戻る</a></div></section></main></body></html>`
}

function dealerRegistrationPage(registration, token, options = {}) {
  const values = options.values || {}
  const message = options.error ? `<div class="wo-auth-notice error" role="alert">${escapeHtml(options.error)}</div>` : ''
  return `${sharedHead('ディーラー初期設定')}<body class="wo-auth-body"><main class="wo-auth-layout"><section class="wo-auth-visual"><img src="/brand/orimia-icon-192.png" alt=""><p>ACCOUNT SETUP</p><h1>受注を始める準備を<br>完了しましょう。</h1><span>設定後は、契約美容室からの連携依頼と注文を確認できます。</span></section><section class="wo-auth-panel"><div class="wo-auth-card wo-auth-card-wide"><span class="wo-auth-symbol">${icon('check')}</span><p class="wo-eyebrow">ACCOUNT SETUP</p><h2>ディーラー初期設定</h2><p>会社情報とログイン情報を入力してください。</p>${message}<dl class="wo-setup-meta"><div><dt>登録メールアドレス</dt><dd>${escapeHtml(registration.email)}</dd></div></dl><form method="post" action="/api/dealer/auth/register/confirm"><input type="hidden" name="token" value="${escapeHtml(token)}"><label><span>会社名・ディーラー名</span><input name="dealerName" autocomplete="organization" required maxlength="140" value="${escapeHtml(values.dealerName || '')}" placeholder="例：ORIMIAビューティー株式会社"></label><label><span>ログインID</span><input name="loginId" autocomplete="username" autocapitalize="none" required minlength="4" maxlength="100" pattern="[a-zA-Z0-9._@+\\-]{4,100}" value="${escapeHtml(values.loginId || '')}" placeholder="dealer.orimia"></label><div class="wo-setup-contact"><label><span>電話番号（任意）</span><input name="phone" autocomplete="tel" maxlength="40" value="${escapeHtml(values.phone || '')}"></label><label><span>郵便番号（任意）</span><input name="postalCode" autocomplete="postal-code" maxlength="12" value="${escapeHtml(values.postalCode || '')}"></label><label class="wide"><span>会社住所（任意）</span><input name="address" autocomplete="street-address" maxlength="300" value="${escapeHtml(values.address || '')}"></label></div><label><span>パスワード</span><input name="password" type="password" autocomplete="new-password" minlength="10" maxlength="72" required placeholder="10文字以上"></label><label><span>パスワード（確認）</span><input name="passwordConfirm" type="password" autocomplete="new-password" minlength="10" maxlength="72" required></label><button class="wo-button wo-button-primary wo-auth-submit" type="submit">新規設定を完了${icon('check')}</button></form><a class="wo-auth-back" href="/dealer/login">ログイン画面に戻る</a></div></section></main></body></html>`
}

function dealerPasswordResetRequestPage({ sent = false, error = '' } = {}) {
  const message = sent
    ? '<div class="wo-auth-notice success" role="status">該当するアカウントがある場合、再設定メールを送信しました。受信箱と迷惑メールをご確認ください。</div>'
    : error
      ? `<div class="wo-auth-notice error" role="alert">${escapeHtml(error)}</div>`
      : ''
  return `${sharedHead('ログイン情報を再設定')}<body class="wo-auth-body"><main class="wo-auth-layout"><section class="wo-auth-visual"><img src="/brand/orimia-icon-192.png" alt=""><p>ACCOUNT RECOVERY</p><h1>安全に確認して、<br>業務へ戻る。</h1><span>登録メールアドレスへ、ログインIDと再設定URLをお送りします。</span></section><section class="wo-auth-panel"><div class="wo-auth-card"><span class="wo-auth-symbol">${icon('key')}</span><p class="wo-eyebrow">DEALER ACCOUNT</p><h2>ログイン情報を再設定</h2><p>登録済みのメールアドレスを入力してください。</p>${message}<form method="post" action="/api/dealer/auth/password-reset/request"><label><span>登録メールアドレス</span><span class="wo-auth-input-icon">${icon('mail')}<input name="email" type="email" autocomplete="email" required maxlength="200" placeholder="example@dealer.jp"></span></label><button class="wo-button wo-button-primary wo-auth-submit" type="submit">再設定メールを送る${icon('arrowLeft', 'wo-login-arrow')}</button></form><div class="wo-auth-security">${icon('shield')}<span>アカウントの有無は画面上に表示しません。再設定URLは30分間、一度だけ有効です。</span></div><a class="wo-auth-back" href="/dealer/login">ログイン画面に戻る</a></div></section></main></body></html>`
}

function dealerPasswordResetConfirmPage(reset, token, error = '') {
  const errors = {
    invalid: 'この再設定URLは無効か、有効期限が切れています。もう一度メールを送信してください。',
    password: 'パスワードは10〜72文字で入力してください。',
    mismatch: '確認用パスワードが一致しません。',
  }
  const message = error ? `<div class="wo-auth-notice error" role="alert">${escapeHtml(errors[error] || errors.invalid)}</div>` : ''
  return `${sharedHead('新しいパスワードを設定')}<body class="wo-auth-body"><main class="wo-auth-layout"><section class="wo-auth-visual"><img src="/brand/orimia-icon-192.png" alt=""><p>SECURE RESET</p><h1>新しいパスワードで、<br>安全に再開。</h1><span>設定完了後は、以前のログイン状態もすべて無効になります。</span></section><section class="wo-auth-panel"><div class="wo-auth-card"><span class="wo-auth-symbol">${icon('key')}</span><p class="wo-eyebrow">PASSWORD RESET</p><h2>新しいパスワードを設定</h2><p>10文字以上の新しいパスワードを入力してください。</p>${message}<dl class="wo-setup-meta"><div><dt>ログインID</dt><dd>${escapeHtml(reset.loginId)}</dd></div></dl><form method="post" action="/api/dealer/auth/password-reset/confirm"><input type="hidden" name="token" value="${escapeHtml(token)}"><label><span>新しいパスワード</span><input name="password" type="password" autocomplete="new-password" minlength="10" maxlength="72" required></label><label><span>新しいパスワード（確認）</span><input name="passwordConfirm" type="password" autocomplete="new-password" minlength="10" maxlength="72" required></label><button class="wo-button wo-button-primary wo-auth-submit" type="submit">パスワードを変更${icon('check')}</button></form><a class="wo-auth-secondary-link" href="/dealer/password-reset">${icon('mail')}<span>再設定メールを送り直す</span></a></div></section></main></body></html>`
}

function dealerAuthInvalidPage(kind) {
  const registration = kind === 'registration'
  return `${sharedHead(registration ? '初期設定URLを確認' : '再設定URLを確認')}<body class="wo-auth-body"><main class="wo-auth-single"><section class="wo-auth-card"><span class="wo-auth-symbol">${icon('key')}</span><p class="wo-eyebrow">LINK EXPIRED</p><h1>${registration ? '初期設定URL' : '再設定URL'}を確認してください</h1><p>URLが無効か、有効期限が切れている、またはすでに使用されています。</p><a class="wo-button wo-button-primary" href="${registration ? '/dealer/register' : '/dealer/password-reset'}">${icon('mail')}${registration ? '確認メールを送り直す' : '再設定メールを送り直す'}</a><a class="wo-auth-back" href="/dealer/login">ログイン画面に戻る</a></section></main></body></html>`
}

function dealerSetupPage(invite, token, error = '') {
  const message = error ? `<div class="wo-auth-notice error">${escapeHtml(error)}</div>` : ''
  return `${sharedHead('ディーラー初期設定')}<body class="wo-auth-body"><main class="wo-auth-layout"><section class="wo-auth-visual"><img src="/brand/orimia-icon-192.png" alt=""><p>DEALER ONBOARDING</p><h1>取引を始める準備を<br>完了しましょう。</h1><span>${escapeHtml(invite.organizationName)}から連携依頼が届いています。</span></section><section class="wo-auth-panel"><div class="wo-auth-card"><p class="wo-eyebrow">ACCOUNT SETUP</p><h2>${escapeHtml(invite.dealerName)}</h2><p>会社情報とログイン用パスワードを設定すると、契約美容室からの注文を受け取れます。</p>${message}<dl class="wo-setup-meta"><div><dt>ログインID</dt><dd>${escapeHtml(invite.loginId)}</dd></div><div><dt>契約美容室</dt><dd>${escapeHtml(invite.organizationName)}</dd></div></dl><form method="post" action="/api/dealer/auth/setup"><input type="hidden" name="token" value="${escapeHtml(token)}"><label><span>登録メールアドレス</span><input name="email" type="email" autocomplete="email" required maxlength="200" value="${escapeHtml(invite.email || '')}" placeholder="example@dealer.jp"></label><div class="wo-setup-contact"><label><span>電話番号（任意）</span><input name="phone" autocomplete="tel" maxlength="40" value="${escapeHtml(invite.phone || '')}"></label><label><span>郵便番号（任意）</span><input name="postalCode" autocomplete="postal-code" maxlength="12" value="${escapeHtml(invite.postalCode || '')}"></label><label class="wide"><span>会社住所（任意）</span><input name="address" autocomplete="street-address" maxlength="300" value="${escapeHtml(invite.address || '')}"></label></div><label><span>新しいパスワード</span><input name="password" type="password" autocomplete="new-password" minlength="10" maxlength="200" required></label><label><span>パスワード（確認）</span><input name="passwordConfirm" type="password" autocomplete="new-password" minlength="10" maxlength="200" required></label><button class="wo-button wo-button-primary wo-auth-submit" type="submit">初期設定を完了</button></form></div></section></main></body></html>`
}

function dealerPortalPage(dealer) {
  return `${sharedHead('ディーラー受注管理')}<body class="wo-body wo-dealer-body" data-wholesale-page="dealer"><div class="wo-dealer-layout"><aside class="wo-dealer-sidebar"><a class="wo-brand" href="/dealer/orders"><img src="/brand/orimia-icon-192.png" alt=""><span><strong>ORIMIA Partner</strong><small>Dealer order management</small></span></a><nav><a class="active" href="/dealer/orders">${icon('clipboard')}<span>受注管理</span></a></nav><form method="post" action="/api/dealer/auth/logout"><button type="submit">${icon('logout')}<span>ログアウト</span></button></form></aside><div class="wo-dealer-stage"><header class="wo-dealer-topbar"><div><small>DEALER PORTAL</small><strong>受注管理</strong></div><span>${escapeHtml(dealer.name)}</span></header><main class="wo-main"><section class="wo-page-head"><div><p class="wo-eyebrow">ORDER OPERATIONS</p><h1>受注管理</h1><p>契約美容室から届いた注文を確認し、受注・出荷・納品まで更新します。</p></div></section><div id="wholesale-app" class="wo-app-root"><div class="wo-loading"><span></span><p>受注情報を読み込んでいます</p></div></div></main></div></div><script src="/wholesale-ordering-client-v543.js?v=548" defer></script></body></html>`
}

function dateJa(value, withTime = false) {
  if (!value) return '未設定'
  const options = { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }
  if (withTime) Object.assign(options, { hour: '2-digit', minute: '2-digit' })
  return new Intl.DateTimeFormat('ja-JP', options).format(new Date(value))
}

function yen(value) {
  return Number(value || 0).toLocaleString('ja-JP') + '円'
}

function deliveryNotePage(order, lines, actorType) {
  const dealerAddress = [order.dealerPostalCode ? '〒' + order.dealerPostalCode : '', order.dealerAddress || ''].filter(Boolean).join(' ')
  const salonAddress = [order.salonPostalCode ? '〒' + order.salonPostalCode : '', order.salonPrefecture, order.salonCity, order.salonAddressLine1, order.salonAddressLine2].filter(Boolean).join(' ')
  const rows = lines.map(line => `<tr><td><strong>${escapeHtml(line.productName)}</strong><small>${escapeHtml([line.manufacturerName, line.productCode, line.janCode].filter(Boolean).join(' / '))}</small></td><td>${Number(line.quantity).toLocaleString('ja-JP')}</td><td>${Number(line.deliveredQuantity).toLocaleString('ja-JP')}</td><td>${yen(line.unitPrice)}</td><td>${yen(line.lineTotal)}</td></tr>`).join('')
  const draft = order.status === 'ORDERED' || order.status === 'CANCELLED'
  return `${sharedHead('納品書 ' + order.deliveryNo)}<body class="wo-note-body"><div class="wo-note-actions"><a class="wo-button wo-button-secondary" href="${actorType === 'dealer' ? '/dealer/orders' : '/admin/products/orders?view=history'}">${icon('arrowLeft')}一覧へ戻る</a><button class="wo-button wo-button-primary" type="button" onclick="window.print()">${icon('printer')}印刷</button></div><main class="wo-delivery-note"><header><div><p>DELIVERY NOTE</p><h1>納品書</h1><span>${draft ? 'プレビュー' : '1 / 1'}</span></div><div class="wo-note-dealer"><img src="/brand/orimia-icon-192.png" alt=""><strong>${escapeHtml(order.dealerName)}</strong><small>${escapeHtml(dealerAddress)}</small><small>${escapeHtml(order.dealerPhone || '')}</small></div></header><section class="wo-note-meta"><div class="wo-note-customer"><small>納品先</small><h2>${escapeHtml(order.organizationName)} 御中</h2><p>${escapeHtml(salonAddress)}</p><p>${escapeHtml(order.salonPhone || '')}</p></div><dl><div><dt>発注No.</dt><dd>${escapeHtml(order.orderNo)}</dd></div><div><dt>納品No.</dt><dd>${escapeHtml(order.deliveryNo || '未発行')}</dd></div><div><dt>受注日</dt><dd>${escapeHtml(dateJa(order.orderedAt))}</dd></div><div><dt>出荷日</dt><dd>${escapeHtml(dateJa(order.shippedAt))}</dd></div></dl></section><table><thead><tr><th>商品名称 / 商品コード</th><th>受注数量</th><th>納品数量</th><th>単価</th><th>金額</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><th colspan="4">税抜合計</th><td>${yen(order.subtotalYen)}</td></tr><tr><th colspan="4">消費税（${Number(order.taxRate || 0)}%）</th><td>${yen(order.taxYen)}</td></tr><tr class="wo-note-total"><th colspan="4">合計金額</th><td>${yen(order.totalYen)}</td></tr></tfoot></table><section class="wo-note-bottom"><div><strong>備考</strong><p>${escapeHtml(order.dealerNote || order.salonNote || ' ')}</p></div><p>本書はORIMIA for Salonの受発注記録をもとに発行しています。</p></section></main></body></html>`
}

function createWholesaleOrderingService({ prisma, crypto, adminSessionProvider, dealerAuthMailSender = sendDealerAuthMail }) {
  let schemaPromise = null
  const authAttempts = new Map()

  async function ensureSchema() {
    if (schemaPromise) return schemaPromise
    schemaPromise = (async () => {
      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "WholesaleDealer" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "loginId" TEXT NOT NULL,
        "email" TEXT,
        "passwordHash" TEXT,
        "phone" TEXT,
        "postalCode" TEXT,
        "address" TEXT,
        "active" BOOLEAN NOT NULL DEFAULT TRUE,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`)
      await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "WholesaleDealer_login_lower_key" ON "WholesaleDealer"(LOWER("loginId"))')
      await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "WholesaleDealer_email_lower_key" ON "WholesaleDealer"(LOWER("email")) WHERE "email" IS NOT NULL')
      await prisma.$executeRawUnsafe('ALTER TABLE "WholesaleDealer" ADD COLUMN IF NOT EXISTS "authVersion" INTEGER NOT NULL DEFAULT 1')
      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "WholesaleDealerRegistration" (
        "id" TEXT PRIMARY KEY,
        "email" TEXT NOT NULL,
        "tokenHash" TEXT NOT NULL UNIQUE,
        "expiresAt" TIMESTAMPTZ NOT NULL,
        "usedAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`)
      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "WholesaleDealerRegistration_email_created_idx" ON "WholesaleDealerRegistration"(LOWER("email"),"createdAt" DESC)')
      await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "WholesaleDealerRegistration_email_active_key" ON "WholesaleDealerRegistration"(LOWER("email")) WHERE "usedAt" IS NULL')
      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "WholesaleDealerRegistration_expiry_idx" ON "WholesaleDealerRegistration"("expiresAt","usedAt")')
      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "WholesaleDealerPasswordReset" (
        "id" TEXT PRIMARY KEY,
        "dealerId" TEXT NOT NULL REFERENCES "WholesaleDealer"("id") ON DELETE CASCADE,
        "tokenHash" TEXT NOT NULL UNIQUE,
        "expiresAt" TIMESTAMPTZ NOT NULL,
        "usedAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`)
      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "WholesaleDealerPasswordReset_dealer_created_idx" ON "WholesaleDealerPasswordReset"("dealerId","createdAt" DESC)')
      await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "WholesaleDealerPasswordReset_dealer_active_key" ON "WholesaleDealerPasswordReset"("dealerId") WHERE "usedAt" IS NULL')
      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "WholesaleDealerPasswordReset_expiry_idx" ON "WholesaleDealerPasswordReset"("expiresAt","usedAt")')
      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "WholesaleDealerContract" (
        "id" TEXT PRIMARY KEY,
        "dealerId" TEXT NOT NULL REFERENCES "WholesaleDealer"("id") ON DELETE CASCADE,
        "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "customerCode" TEXT NOT NULL,
        "createdByUserId" TEXT,
        "approvedAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE("dealerId", "organizationId"),
        CHECK ("status" IN ('PENDING','ACTIVE','SUSPENDED'))
      )`)
      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "WholesaleDealerContract_org_status_idx" ON "WholesaleDealerContract"("organizationId","status","updatedAt")')
      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "WholesaleDealerInvite" (
        "id" TEXT PRIMARY KEY,
        "dealerId" TEXT NOT NULL REFERENCES "WholesaleDealer"("id") ON DELETE CASCADE,
        "contractId" TEXT NOT NULL REFERENCES "WholesaleDealerContract"("id") ON DELETE CASCADE,
        "tokenHash" TEXT NOT NULL UNIQUE,
        "expiresAt" TIMESTAMPTZ NOT NULL,
        "usedAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`)
      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "WholesaleDealerInvite_expiry_idx" ON "WholesaleDealerInvite"("expiresAt","usedAt")')
      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "WholesaleProductBinding" (
        "id" TEXT PRIMARY KEY,
        "dealerId" TEXT NOT NULL REFERENCES "WholesaleDealer"("id") ON DELETE CASCADE,
        "productId" TEXT NOT NULL REFERENCES "Product"("id") ON DELETE CASCADE,
        "productCode" TEXT,
        "janCode" TEXT,
        "wholesalePrice" INTEGER,
        "orderUnit" INTEGER NOT NULL DEFAULT 1,
        "active" BOOLEAN NOT NULL DEFAULT TRUE,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE("dealerId", "productId"),
        CHECK ("wholesalePrice" IS NULL OR "wholesalePrice" BETWEEN 0 AND 10000000),
        CHECK ("orderUnit" BETWEEN 1 AND 999)
      )`)
      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "WholesaleOrder" (
        "id" TEXT PRIMARY KEY,
        "orderNo" TEXT NOT NULL UNIQUE,
        "dealerId" TEXT NOT NULL REFERENCES "WholesaleDealer"("id") ON DELETE RESTRICT,
        "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE RESTRICT,
        "status" TEXT NOT NULL DEFAULT 'ORDERED',
        "requestedDeliveryDate" DATE,
        "salonNote" TEXT,
        "dealerNote" TEXT,
        "orderedByUserId" TEXT,
        "orderedByName" TEXT NOT NULL,
        "acceptedByName" TEXT,
        "deliveryNo" TEXT UNIQUE,
        "taxRate" INTEGER NOT NULL DEFAULT 10,
        "subtotalYen" INTEGER NOT NULL DEFAULT 0,
        "taxYen" INTEGER NOT NULL DEFAULT 0,
        "totalYen" INTEGER NOT NULL DEFAULT 0,
        "orderedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "acceptedAt" TIMESTAMPTZ,
        "shippedAt" TIMESTAMPTZ,
        "deliveredAt" TIMESTAMPTZ,
        "cancelledAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CHECK ("status" IN ('ORDERED','ACCEPTED','SHIPPED','DELIVERED','CANCELLED')),
        CHECK ("taxRate" BETWEEN 0 AND 100)
      )`)
      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "WholesaleOrder_org_ordered_idx" ON "WholesaleOrder"("organizationId","orderedAt" DESC)')
      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "WholesaleOrder_dealer_status_idx" ON "WholesaleOrder"("dealerId","status","orderedAt" DESC)')
      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "WholesaleOrderLine" (
        "id" TEXT PRIMARY KEY,
        "orderId" TEXT NOT NULL REFERENCES "WholesaleOrder"("id") ON DELETE CASCADE,
        "productId" TEXT REFERENCES "Product"("id") ON DELETE SET NULL,
        "manufacturerName" TEXT NOT NULL,
        "productName" TEXT NOT NULL,
        "category" TEXT,
        "productCode" TEXT,
        "janCode" TEXT,
        "unitPrice" INTEGER NOT NULL DEFAULT 0,
        "quantity" INTEGER NOT NULL,
        "deliveredQuantity" INTEGER NOT NULL,
        "lineTotal" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CHECK ("unitPrice" BETWEEN 0 AND 10000000),
        CHECK ("quantity" BETWEEN 1 AND 999),
        CHECK ("deliveredQuantity" BETWEEN 0 AND 999)
      )`)
      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "WholesaleOrderLine_order_idx" ON "WholesaleOrderLine"("orderId","createdAt")')
      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "WholesaleOrderEvent" (
        "id" TEXT PRIMARY KEY,
        "orderId" TEXT NOT NULL REFERENCES "WholesaleOrder"("id") ON DELETE CASCADE,
        "eventType" TEXT NOT NULL,
        "actorType" TEXT NOT NULL,
        "actorId" TEXT,
        "actorName" TEXT NOT NULL,
        "detailJson" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`)
      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "WholesaleOrderEvent_order_idx" ON "WholesaleOrderEvent"("orderId","createdAt")')
      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "WholesaleInventoryAdjustment" (
        "id" TEXT PRIMARY KEY,
        "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
        "productId" TEXT NOT NULL REFERENCES "Product"("id") ON DELETE CASCADE,
        "previousQuantity" INTEGER NOT NULL,
        "nextQuantity" INTEGER NOT NULL,
        "reason" TEXT,
        "actorUserId" TEXT,
        "actorName" TEXT NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`)
      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "WholesaleInventoryAdjustment_org_created_idx" ON "WholesaleInventoryAdjustment"("organizationId","createdAt" DESC)')
    })().catch(error => {
      schemaPromise = null
      throw error
    })
    return schemaPromise
  }

  async function adminSession(req) {
    const session = await adminSessionProvider(req)
    if (!session || !session.organizationId) return null
    const rows = session.userId
      ? await prisma.$queryRawUnsafe('SELECT "id","displayName","loginId","email","role"::text AS "role" FROM "AppUser" WHERE "id"=$1 AND "organizationId"=$2 AND "active"=TRUE AND "role"::text IN (\'ADMIN\',\'STAFF\') LIMIT 1', session.userId, session.organizationId)
      : await prisma.$queryRawUnsafe('SELECT "id","displayName","loginId","email","role"::text AS "role" FROM "AppUser" WHERE "organizationId"=$1 AND "active"=TRUE AND "role"::text IN (\'ADMIN\',\'STAFF\') AND (LOWER("loginId")=LOWER($2) OR LOWER("email")=LOWER($2)) LIMIT 1', session.organizationId, session.subject)
    if (!rows[0]) return null
    return { ...session, userId: rows[0].id, displayName: rows[0].displayName || rows[0].loginId || rows[0].email, role: rows[0].role }
  }

  async function dealerSession(req) {
    const payload = verifyDealerSessionToken(crypto, parseCookies(req)[SESSION_COOKIE])
    if (!payload) return null
    const rows = await prisma.$queryRawUnsafe('SELECT "id","name","loginId","email","phone","postalCode","address","authVersion" FROM "WholesaleDealer" WHERE "id"=$1 AND "active"=TRUE LIMIT 1', payload.dealerId)
    if (!rows[0] || Number(payload.authVersion || 1) !== Number(rows[0].authVersion || 1)) return null
    return { ...payload, ...rows[0] }
  }

  function allowAuthAttempt(req, purpose, identity) {
    const now = Date.now()
    if (authAttempts.size > 2000) {
      for (const [key, attempt] of authAttempts) if (attempt.resetAt <= now) authAttempts.delete(key)
    }
    const key = `${clientAddress(req)}:${purpose}:${String(identity || '').toLowerCase()}`
    const previous = authAttempts.get(key)
    if (previous && previous.resetAt > now && previous.count >= AUTH_ATTEMPT_LIMIT) return false
    authAttempts.set(key, {
      count: previous && previous.resetAt > now ? previous.count + 1 : 1,
      resetAt: previous && previous.resetAt > now ? previous.resetAt : now + AUTH_ATTEMPT_WINDOW_MS,
    })
    return true
  }

  async function registrationInfo(token, tx = prisma) {
    if (!validAuthToken(token)) return null
    const rows = await tx.$queryRawUnsafe('SELECT "id","email","expiresAt","usedAt" FROM "WholesaleDealerRegistration" WHERE "tokenHash"=$1 AND "usedAt" IS NULL AND "expiresAt">NOW() LIMIT 1', authTokenHash(crypto, token))
    return rows[0] || null
  }

  async function passwordResetInfo(token, tx = prisma) {
    if (!validAuthToken(token)) return null
    const rows = await tx.$queryRawUnsafe(`SELECT r."id",r."dealerId",r."expiresAt",r."usedAt",d."loginId",d."email"
      FROM "WholesaleDealerPasswordReset" r JOIN "WholesaleDealer" d ON d."id"=r."dealerId"
      WHERE r."tokenHash"=$1 AND r."usedAt" IS NULL AND r."expiresAt">NOW() AND d."active"=TRUE LIMIT 1`, authTokenHash(crypto, token))
    return rows[0] || null
  }

  async function inviteInfo(token) {
    const tokenHash = crypto.createHash('sha256').update(String(token || '')).digest('hex')
    const rows = await prisma.$queryRawUnsafe(`SELECT i."id" AS "inviteId",i."contractId",d."id" AS "dealerId",d."name" AS "dealerName",d."loginId",d."email",d."phone",d."postalCode",d."address",o."name" AS "organizationName"
      FROM "WholesaleDealerInvite" i JOIN "WholesaleDealer" d ON d."id"=i."dealerId" JOIN "WholesaleDealerContract" c ON c."id"=i."contractId" JOIN "Organization" o ON o."id"=c."organizationId"
      WHERE i."tokenHash"=$1 AND i."usedAt" IS NULL AND i."expiresAt">NOW() AND d."active"=TRUE LIMIT 1`, tokenHash)
    return rows[0] || null
  }

  async function listSalonContracts(organizationId) {
    return prisma.$queryRawUnsafe(`SELECT c."id",c."status",c."customerCode",c."approvedAt",c."createdAt",d."id" AS "dealerId",d."name" AS "dealerName",d."loginId",d."email",d."phone"
      FROM "WholesaleDealerContract" c JOIN "WholesaleDealer" d ON d."id"=c."dealerId" AND d."active"=TRUE
      WHERE c."organizationId"=$1 ORDER BY CASE c."status" WHEN 'ACTIVE' THEN 0 WHEN 'PENDING' THEN 1 ELSE 2 END,c."updatedAt" DESC`, organizationId)
  }

  async function salonBootstrap(session, requestedDealerId) {
    const [organizationRows, contracts] = await Promise.all([
      prisma.$queryRawUnsafe('SELECT o."id",o."name",o."taxRate",p."phone",p."postalCode",p."prefecture",p."city",p."addressLine1",p."addressLine2" FROM "Organization" o LEFT JOIN "OrganizationStoreProfile" p ON p."organizationId"=o."id" WHERE o."id"=$1 LIMIT 1', session.organizationId),
      listSalonContracts(session.organizationId),
    ])
    if (!organizationRows[0]) throw new WholesaleError('店舗情報を確認できませんでした。', 404)
    const activeContracts = contracts.filter(contract => contract.status === 'ACTIVE')
    const selectedContract = activeContracts.find(contract => contract.dealerId === requestedDealerId) || activeContracts[0] || null
    const dealerId = selectedContract ? selectedContract.dealerId : null
    const products = await prisma.$queryRawUnsafe(`SELECT p."id",p."manufacturerName",p."name",p."category",p."retailPrice",p."stockQuantity",p."imageUrl",b."productCode",b."janCode",b."wholesalePrice",COALESCE(b."orderUnit",1)::int AS "orderUnit",
      last_order."quantity" AS "lastOrderQuantity",last_order."orderedAt" AS "lastOrderedAt"
      FROM "Product" p
      LEFT JOIN "WholesaleProductBinding" b ON b."productId"=p."id" AND b."dealerId"=$2 AND b."active"=TRUE
      LEFT JOIN LATERAL (SELECT l."quantity",o."orderedAt" FROM "WholesaleOrderLine" l JOIN "WholesaleOrder" o ON o."id"=l."orderId" WHERE l."productId"=p."id" AND o."organizationId"=$1 AND ($2::text IS NULL OR o."dealerId"=$2) AND o."status"<>'CANCELLED' ORDER BY o."orderedAt" DESC LIMIT 1) last_order ON TRUE
      WHERE p."organizationId"=$1 AND p."active"=TRUE ORDER BY p."manufacturerName",p."name"`, session.organizationId, dealerId)
    const orders = await prisma.$queryRawUnsafe(`SELECT o."id",o."orderNo",o."status",o."requestedDeliveryDate",o."orderedAt",o."acceptedAt",o."shippedAt",o."deliveredAt",o."deliveryNo",o."totalYen",d."name" AS "dealerName",COUNT(l."id")::int AS "lineCount",COALESCE(SUM(l."quantity"),0)::int AS "totalQuantity"
      FROM "WholesaleOrder" o JOIN "WholesaleDealer" d ON d."id"=o."dealerId" LEFT JOIN "WholesaleOrderLine" l ON l."orderId"=o."id"
      WHERE o."organizationId"=$1 GROUP BY o."id",d."name" ORDER BY o."orderedAt" DESC LIMIT 80`, session.organizationId)
    return {
      organization: organizationRows[0],
      actor: { name: session.displayName, role: session.role },
      contracts,
      selectedDealerId: dealerId,
      products: products.map(product => ({ ...product, retailPrice: Number(product.retailPrice), stockQuantity: Number(product.stockQuantity), wholesalePrice: product.wholesalePrice == null ? null : Number(product.wholesalePrice), orderUnit: Number(product.orderUnit), lastOrderQuantity: product.lastOrderQuantity == null ? null : Number(product.lastOrderQuantity), imageUrl: String(product.imageUrl || '').startsWith('data:') ? `/api/admin/wholesale/products/${encodeURIComponent(product.id)}/image` : product.imageUrl || '' })),
      orders: orders.map(order => ({ ...order, totalYen: Number(order.totalYen), lineCount: Number(order.lineCount), totalQuantity: Number(order.totalQuantity) })),
    }
  }

  async function createDealerInvite(req, session, payload) {
    if (session.role !== 'ADMIN') throw new WholesaleError('ディーラー連携はオーナーのみ設定できます。', 403)
    const dealerName = cleanText(payload.dealerName, 'ディーラー名', 140, true)
    const loginId = cleanText(payload.loginId, 'ログインID', 100, true).toLowerCase()
    const email = cleanText(payload.email, 'メールアドレス', 200, true).toLowerCase()
    const phone = cleanText(payload.phone, '電話番号', 40, false)
    if (!/^[a-z0-9][a-z0-9._@+\-]{3,99}$/.test(loginId)) throw new WholesaleError('ログインIDは半角英数字・記号で4文字以上にしてください。')
    if (!validEmail(email)) throw new WholesaleError('メールアドレスを確認してください。')
    const result = await prisma.$transaction(async tx => {
      const existingRows = await tx.$queryRawUnsafe('SELECT "id","name","loginId","email","passwordHash" FROM "WholesaleDealer" WHERE LOWER("loginId")=LOWER($1) OR LOWER(COALESCE("email",\'\'))=LOWER($2) FOR UPDATE', loginId, email)
      if (existingRows.length > 1) throw new WholesaleError('ログインIDとメールアドレスが別々のアカウントに登録されています。入力内容を確認してください。', 409)
      let dealer = existingRows[0]
      if (dealer && validEmail(dealer.email) && normalizeEmail(dealer.email) !== email) throw new WholesaleError('登録済みアカウントのメールアドレスと一致しません。入力内容を確認してください。', 409)
      if (dealer && !validEmail(dealer.email)) {
        const updatedRows = await tx.$queryRawUnsafe('UPDATE "WholesaleDealer" SET "email"=$2,"updatedAt"=NOW() WHERE "id"=$1 RETURNING "id","name","loginId","email","passwordHash"', dealer.id, email)
        dealer = updatedRows[0]
      }
      if (!dealer) {
        const dealerId = 'dealer_' + crypto.randomUUID()
        const rows = await tx.$queryRawUnsafe('INSERT INTO "WholesaleDealer" ("id","name","loginId","email","phone","active","createdAt","updatedAt") VALUES ($1,$2,$3,NULLIF($4,\'\'),NULLIF($5,\'\'),TRUE,NOW(),NOW()) RETURNING "id","name","loginId","email","passwordHash"', dealerId, dealerName, loginId, email, phone)
        dealer = rows[0]
      }
      const organizationRows = await tx.$queryRawUnsafe('SELECT "publicCode" FROM "Organization" WHERE "id"=$1 LIMIT 1', session.organizationId)
      const customerCode = String(organizationRows[0] && organizationRows[0].publicCode || session.organizationId).slice(0, 80)
      const contractId = 'contract_' + crypto.randomUUID()
      const contractRows = await tx.$queryRawUnsafe(`INSERT INTO "WholesaleDealerContract" ("id","dealerId","organizationId","status","customerCode","createdByUserId","createdAt","updatedAt") VALUES ($1,$2,$3,'PENDING',$4,$5,NOW(),NOW())
        ON CONFLICT ("dealerId","organizationId") DO UPDATE SET "status"=CASE WHEN "WholesaleDealerContract"."status"='ACTIVE' THEN 'ACTIVE' ELSE 'PENDING' END,"customerCode"=EXCLUDED."customerCode","updatedAt"=NOW()
        RETURNING "id","status","customerCode"`, contractId, dealer.id, session.organizationId, customerCode, session.userId)
      const contract = contractRows[0]
      let token = null
      if (!dealer.passwordHash) {
        token = crypto.randomBytes(32).toString('base64url')
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
        await tx.$executeRawUnsafe('UPDATE "WholesaleDealerInvite" SET "usedAt"=COALESCE("usedAt",NOW()) WHERE "contractId"=$1 AND "usedAt" IS NULL', contract.id)
        await tx.$executeRawUnsafe('INSERT INTO "WholesaleDealerInvite" ("id","dealerId","contractId","tokenHash","expiresAt","createdAt") VALUES ($1,$2,$3,$4,NOW()+INTERVAL \'72 hours\',NOW())', 'invite_' + crypto.randomUUID(), dealer.id, contract.id, tokenHash)
      }
      return { dealer, contract, token }
    })
    return {
      dealer: { id: result.dealer.id, name: result.dealer.name, loginId: result.dealer.loginId, email: result.dealer.email || '' },
      contract: result.contract,
      setupUrl: result.token ? publicOrigin(req) + '/dealer/setup?token=' + encodeURIComponent(result.token) : null,
      existingAccount: Boolean(result.dealer.passwordHash),
    }
  }

  async function requestDealerRegistration(req, payload) {
    const email = normalizeEmail(payload.email)
    if (!validEmail(email)) throw new WholesaleError('有効なメールアドレスを入力してください。')
    if (!allowAuthAttempt(req, 'register', email)) return { sent: true }
    const existing = await prisma.$queryRawUnsafe('SELECT "id","loginId","email" FROM "WholesaleDealer" WHERE "active"=TRUE AND LOWER(COALESCE("email",\'\'))=LOWER($1) LIMIT 1', email)
    if (existing[0]) {
      const origin = publicOrigin(req)
      try {
        await dealerAuthMailSender({
          to: existing[0].email,
          subject: '【ORIMIA】ディーラーアカウントは設定済みです',
          preheader: '登録済みのディーラーアカウントをご確認ください。',
          title: 'アカウントは設定済みです',
          lead: 'このメールアドレスにはディーラーアカウントが登録されています。下のボタンからログインしてください。パスワードを忘れた場合は、ログイン画面の再設定リンクをご利用ください。',
          loginId: existing[0].loginId,
          actionLabel: 'ディーラーログインを開く',
          actionUrl: origin + '/dealer/login',
          origin,
          oneTime: false,
        })
      } catch (error) {
        console.error('[dealer-auth] existing account mail delivery failed', { dealerId: existing[0].id, provider: 'gmail', error: error && error.message || error })
        throw new WholesaleError('確認メールを送信できませんでした。時間をおいて再度お試しください。', 503)
      }
      return { sent: true }
    }

    const token = authToken(crypto)
    const tokenHash = authTokenHash(crypto, token)
    const registrationId = 'dealer_registration_' + crypto.randomUUID()
    await prisma.$transaction(async tx => {
      await tx.$executeRawUnsafe('LOCK TABLE "WholesaleDealerRegistration" IN SHARE ROW EXCLUSIVE MODE')
      await tx.$executeRawUnsafe('UPDATE "WholesaleDealerRegistration" SET "usedAt"=COALESCE("usedAt",NOW()) WHERE LOWER("email")=LOWER($1) AND "usedAt" IS NULL', email)
      await tx.$executeRawUnsafe('INSERT INTO "WholesaleDealerRegistration" ("id","email","tokenHash","expiresAt","createdAt") VALUES ($1,$2,$3,NOW()+INTERVAL \'30 minutes\',NOW())', registrationId, email, tokenHash)
    })
    const origin = publicOrigin(req)
    try {
      await dealerAuthMailSender({
        to: email,
        subject: '【ORIMIA】ディーラーアカウントの新規設定',
        preheader: 'ディーラーアカウントの初期設定を完了してください。',
        title: 'ディーラーアカウントを設定してください',
        lead: '登録メールアドレスの確認が完了しました。下のボタンから会社情報とログイン情報を設定してください。',
        actionLabel: 'ディーラー初期設定を開く',
        actionUrl: origin + '/dealer/register/' + encodeURIComponent(token),
        origin,
      })
    } catch (error) {
      await prisma.$executeRawUnsafe('DELETE FROM "WholesaleDealerRegistration" WHERE "id"=$1', registrationId)
      console.error('[dealer-auth] registration mail delivery failed', { provider: 'gmail', error: error && error.message || error })
      throw new WholesaleError('確認メールを送信できませんでした。時間をおいて再度お試しください。', 503)
    }
    return { sent: true }
  }

  async function completeDealerRegistration(payload) {
    const token = String(payload.token || '')
    const registration = await registrationInfo(token)
    if (!registration) throw new WholesaleError('初期設定URLが無効か、有効期限が切れています。', 410)
    const dealerName = cleanText(payload.dealerName, '会社名・ディーラー名', 140, true)
    const loginId = cleanText(payload.loginId, 'ログインID', 100, true).toLowerCase()
    if (!/^[a-z0-9][a-z0-9._@+\-]{3,99}$/.test(loginId)) throw new WholesaleError('ログインIDは半角英数字と . _ @ + - を使い、4文字以上で入力してください。')
    const phone = cleanText(payload.phone, '電話番号', 40, false)
    const postalCode = cleanText(payload.postalCode, '郵便番号', 12, false)
    const address = cleanText(payload.address, '会社住所', 300, false)
    const password = String(payload.password || '')
    if (password.length < 10 || password.length > 72) throw new WholesaleError('パスワードは10〜72文字で入力してください。')
    if (password !== String(payload.passwordConfirm || '')) throw new WholesaleError('確認用パスワードが一致しません。')
    const tokenHash = authTokenHash(crypto, token)
    const dealerId = 'dealer_' + crypto.randomUUID()
    await prisma.$transaction(async tx => {
      const tokenRows = await tx.$queryRawUnsafe('SELECT "id","email" FROM "WholesaleDealerRegistration" WHERE "tokenHash"=$1 AND "usedAt" IS NULL AND "expiresAt">NOW() LIMIT 1 FOR UPDATE', tokenHash)
      if (!tokenRows[0]) throw new WholesaleError('初期設定URLが無効か、有効期限が切れています。', 410)
      const conflicts = await tx.$queryRawUnsafe('SELECT "id","loginId","email" FROM "WholesaleDealer" WHERE LOWER("loginId")=LOWER($1) OR LOWER(COALESCE("email",\'\'))=LOWER($2) LIMIT 1', loginId, tokenRows[0].email)
      if (conflicts[0]) throw new WholesaleError('このログインIDまたはメールアドレスは登録済みです。ログイン画面から再設定してください。', 409)
      await tx.$executeRawUnsafe('INSERT INTO "WholesaleDealer" ("id","name","loginId","email","passwordHash","phone","postalCode","address","active","authVersion","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,NULLIF($6,\'\'),NULLIF($7,\'\'),NULLIF($8,\'\'),TRUE,1,NOW(),NOW())', dealerId, dealerName, loginId, tokenRows[0].email, dealerPasswordHash(crypto, password), phone, postalCode, address)
      const claimed = await tx.$executeRawUnsafe('UPDATE "WholesaleDealerRegistration" SET "usedAt"=NOW() WHERE "id"=$1 AND "usedAt" IS NULL', tokenRows[0].id)
      if (Number(claimed) !== 1) throw new WholesaleError('初期設定URLが無効か、有効期限が切れています。', 410)
    })
    return { dealerId, loginId }
  }

  async function requestDealerPasswordReset(req, payload) {
    const email = normalizeEmail(payload.email)
    if (!validEmail(email) || !allowAuthAttempt(req, 'password-reset', email)) return { sent: true }
    const rows = await prisma.$queryRawUnsafe('SELECT "id","loginId","email" FROM "WholesaleDealer" WHERE "active"=TRUE AND "passwordHash" IS NOT NULL AND LOWER(COALESCE("email",\'\'))=LOWER($1) LIMIT 1', email)
    const dealer = rows[0]
    if (!dealer || !validEmail(dealer.email)) return { sent: true }

    const token = authToken(crypto)
    const resetId = 'dealer_reset_' + crypto.randomUUID()
    await prisma.$transaction(async tx => {
      await tx.$executeRawUnsafe('LOCK TABLE "WholesaleDealerPasswordReset" IN SHARE ROW EXCLUSIVE MODE')
      await tx.$executeRawUnsafe('UPDATE "WholesaleDealerPasswordReset" SET "usedAt"=COALESCE("usedAt",NOW()) WHERE "dealerId"=$1 AND "usedAt" IS NULL', dealer.id)
      await tx.$executeRawUnsafe('INSERT INTO "WholesaleDealerPasswordReset" ("id","dealerId","tokenHash","expiresAt","createdAt") VALUES ($1,$2,$3,NOW()+INTERVAL \'30 minutes\',NOW())', resetId, dealer.id, authTokenHash(crypto, token))
    })
    const origin = publicOrigin(req)
    try {
      await dealerAuthMailSender({
        to: dealer.email,
        subject: '【ORIMIA】ディーラーログイン情報の再設定',
        preheader: 'ディーラーログイン情報を30分以内に再設定してください。',
        title: 'ログイン情報を再設定してください',
        lead: 'ログイン情報の再設定を受け付けました。下のボタンから、新しいパスワードを設定してください。',
        loginId: dealer.loginId,
        actionLabel: 'パスワードを再設定する',
        actionUrl: origin + '/dealer/password-reset/' + encodeURIComponent(token),
        origin,
      })
    } catch (error) {
      await prisma.$executeRawUnsafe('DELETE FROM "WholesaleDealerPasswordReset" WHERE "id"=$1', resetId)
      console.error('[dealer-auth] password reset mail delivery failed', { dealerId: dealer.id, provider: 'gmail', error: error && error.message || error })
    }
    return { sent: true }
  }

  async function completeDealerPasswordReset(payload) {
    const token = String(payload.token || '')
    const reset = await passwordResetInfo(token)
    if (!reset) throw new WholesaleError('再設定URLが無効か、有効期限が切れています。', 410)
    const password = String(payload.password || '')
    if (password.length < 10 || password.length > 72) throw new WholesaleError('password', 400)
    if (password !== String(payload.passwordConfirm || '')) throw new WholesaleError('mismatch', 400)
    const tokenHash = authTokenHash(crypto, token)
    await prisma.$transaction(async tx => {
      const rows = await tx.$queryRawUnsafe(`SELECT r."id",r."dealerId",d."loginId" FROM "WholesaleDealerPasswordReset" r JOIN "WholesaleDealer" d ON d."id"=r."dealerId"
        WHERE r."tokenHash"=$1 AND r."usedAt" IS NULL AND r."expiresAt">NOW() AND d."active"=TRUE LIMIT 1 FOR UPDATE OF r,d`, tokenHash)
      if (!rows[0]) throw new WholesaleError('invalid', 410)
      await tx.$executeRawUnsafe('UPDATE "WholesaleDealer" SET "passwordHash"=$2,"authVersion"="authVersion"+1,"updatedAt"=NOW() WHERE "id"=$1 AND "active"=TRUE', rows[0].dealerId, dealerPasswordHash(crypto, password))
      const claimed = await tx.$executeRawUnsafe('UPDATE "WholesaleDealerPasswordReset" SET "usedAt"=NOW() WHERE "id"=$1 AND "usedAt" IS NULL', rows[0].id)
      if (Number(claimed) !== 1) throw new WholesaleError('invalid', 410)
      await tx.$executeRawUnsafe('UPDATE "WholesaleDealerPasswordReset" SET "usedAt"=COALESCE("usedAt",NOW()) WHERE "dealerId"=$1 AND "usedAt" IS NULL', rows[0].dealerId)
    })
    return { loginId: reset.loginId }
  }

  async function updateInventory(session, payload) {
    const rows = Array.isArray(payload.items) ? payload.items.slice(0, 500) : []
    if (!rows.length) throw new WholesaleError('更新する商品を選択してください。')
    const normalized = rows.map(item => ({
      productId: cleanText(item.productId, '商品', 180, true),
      quantity: integer(item.quantity, '在庫数', 0, 100000),
    }))
    const unique = new Map(normalized.map(item => [item.productId, item]))
    if (unique.size !== normalized.length) throw new WholesaleError('同じ商品が重複しています。')
    const reason = cleanText(payload.reason, '棚卸しメモ', 500, false)
    const result = await prisma.$transaction(async tx => {
      const locked = await tx.$queryRawUnsafe('SELECT "id","stockQuantity" FROM "Product" WHERE "organizationId"=$1 AND "active"=TRUE AND "id" IN (SELECT jsonb_array_elements_text($2::jsonb)) FOR UPDATE', session.organizationId, JSON.stringify([...unique.keys()]))
      if (locked.length !== unique.size) throw new WholesaleError('更新対象の商品を確認してください。', 409)
      let changed = 0
      for (const product of locked) {
        const next = unique.get(product.id).quantity
        const previous = Number(product.stockQuantity)
        if (previous === next) continue
        await tx.$executeRawUnsafe('UPDATE "Product" SET "stockQuantity"=$2,"updatedAt"=NOW() WHERE "id"=$1 AND "organizationId"=$3', product.id, next, session.organizationId)
        await tx.$executeRawUnsafe('INSERT INTO "WholesaleInventoryAdjustment" ("id","organizationId","productId","previousQuantity","nextQuantity","reason","actorUserId","actorName","createdAt") VALUES ($1,$2,$3,$4,$5,NULLIF($6,\'\'),$7,$8,NOW())', 'stock_' + crypto.randomUUID(), session.organizationId, product.id, previous, next, reason, session.userId, session.displayName)
        changed += 1
      }
      return changed
    })
    return { changed: result }
  }

  async function createOrder(session, payload) {
    const dealerId = cleanText(payload.dealerId, 'ディーラー', 180, true)
    const rawLines = Array.isArray(payload.lines) ? payload.lines.slice(0, 300) : []
    if (!rawLines.length) throw new WholesaleError('発注する商品と数量を入力してください。')
    const lines = rawLines.map(line => ({ productId: cleanText(line.productId, '商品', 180, true), quantity: integer(line.quantity, '発注数', 1, 999) }))
    const unique = new Map()
    for (const line of lines) unique.set(line.productId, { productId: line.productId, quantity: (unique.get(line.productId)?.quantity || 0) + line.quantity })
    for (const line of unique.values()) if (line.quantity > 999) throw new WholesaleError('1商品の発注数は999個以下にしてください。')
    const requestedDeliveryDate = optionalDate(payload.requestedDeliveryDate, '希望納品日')
    const salonNote = cleanText(payload.salonNote, '発注メモ', 1200, false)
    const contractRows = await prisma.$queryRawUnsafe(`SELECT c."id",d."id" AS "dealerId",d."name" AS "dealerName" FROM "WholesaleDealerContract" c JOIN "WholesaleDealer" d ON d."id"=c."dealerId" AND d."active"=TRUE WHERE c."organizationId"=$1 AND c."dealerId"=$2 AND c."status"='ACTIVE' LIMIT 1`, session.organizationId, dealerId)
    if (!contractRows[0]) throw new WholesaleError('有効なディーラー契約を確認できませんでした。', 409)
    const products = await prisma.$queryRawUnsafe(`SELECT p."id",p."manufacturerName",p."name",p."category",b."productCode",b."janCode",b."wholesalePrice",COALESCE(b."orderUnit",1)::int AS "orderUnit" FROM "Product" p LEFT JOIN "WholesaleProductBinding" b ON b."productId"=p."id" AND b."dealerId"=$2 AND b."active"=TRUE WHERE p."organizationId"=$1 AND p."active"=TRUE AND p."id" IN (SELECT jsonb_array_elements_text($3::jsonb))`, session.organizationId, dealerId, JSON.stringify([...unique.keys()]))
    if (products.length !== unique.size) throw new WholesaleError('発注対象の商品を確認してください。', 409)
    const orderLines = products.map(product => {
      const quantity = unique.get(product.id).quantity
      const orderUnit = Number(product.orderUnit || 1)
      if (quantity % orderUnit !== 0) throw new WholesaleError(`${product.name}は${orderUnit}個単位で入力してください。`)
      const unitPrice = product.wholesalePrice == null ? 0 : Number(product.wholesalePrice)
      return { ...product, quantity, deliveredQuantity: quantity, unitPrice, lineTotal: unitPrice * quantity }
    })
    const organizationRows = await prisma.$queryRawUnsafe('SELECT "taxRate" FROM "Organization" WHERE "id"=$1 LIMIT 1', session.organizationId)
    const taxRate = Number(organizationRows[0] && organizationRows[0].taxRate || 10)
    const subtotalYen = orderLines.reduce((sum, line) => sum + line.lineTotal, 0)
    const taxYen = Math.round(subtotalYen * taxRate / 100)
    const totalYen = subtotalYen + taxYen
    const now = new Date()
    const orderNo = 'PO-' + now.toISOString().slice(0, 10).replaceAll('-', '') + '-' + crypto.randomBytes(3).toString('hex').toUpperCase()
    const orderId = 'order_' + crypto.randomUUID()
    await prisma.$transaction(async tx => {
      await tx.$executeRawUnsafe(`INSERT INTO "WholesaleOrder" ("id","orderNo","dealerId","organizationId","status","requestedDeliveryDate","salonNote","orderedByUserId","orderedByName","taxRate","subtotalYen","taxYen","totalYen","orderedAt","createdAt","updatedAt") VALUES ($1,$2,$3,$4,'ORDERED',$5::date,NULLIF($6,''),$7,$8,$9,$10,$11,$12,NOW(),NOW(),NOW())`, orderId, orderNo, dealerId, session.organizationId, requestedDeliveryDate, salonNote, session.userId, session.displayName, taxRate, subtotalYen, taxYen, totalYen)
      for (const line of orderLines) {
        await tx.$executeRawUnsafe(`INSERT INTO "WholesaleOrderLine" ("id","orderId","productId","manufacturerName","productName","category","productCode","janCode","unitPrice","quantity","deliveredQuantity","lineTotal","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW())`, 'line_' + crypto.randomUUID(), orderId, line.id, line.manufacturerName, line.name, line.category, line.productCode, line.janCode, line.unitPrice, line.quantity, line.deliveredQuantity, line.lineTotal)
      }
      await tx.$executeRawUnsafe('INSERT INTO "WholesaleOrderEvent" ("id","orderId","eventType","actorType","actorId","actorName","detailJson","createdAt") VALUES ($1,$2,\'ORDERED\',\'SALON\',$3,$4,$5::jsonb,NOW())', 'event_' + crypto.randomUUID(), orderId, session.userId, session.displayName, JSON.stringify({ lineCount: orderLines.length, totalQuantity: orderLines.reduce((sum, line) => sum + line.quantity, 0) }))
    })
    return { id: orderId, orderNo, status: 'ORDERED', dealerName: contractRows[0].dealerName }
  }

  async function dealerBootstrap(session) {
    const [contracts, orders] = await Promise.all([
      prisma.$queryRawUnsafe(`SELECT c."id",c."status",c."customerCode",c."createdAt",c."approvedAt",o."id" AS "organizationId",o."name" AS "organizationName",p."phone",p."prefecture",p."city" FROM "WholesaleDealerContract" c JOIN "Organization" o ON o."id"=c."organizationId" LEFT JOIN "OrganizationStoreProfile" p ON p."organizationId"=o."id" WHERE c."dealerId"=$1 ORDER BY CASE c."status" WHEN 'PENDING' THEN 0 WHEN 'ACTIVE' THEN 1 ELSE 2 END,c."createdAt" DESC`, session.id),
      prisma.$queryRawUnsafe(`SELECT o."id",o."orderNo",o."status",o."requestedDeliveryDate",o."orderedAt",o."acceptedAt",o."shippedAt",o."deliveredAt",o."deliveryNo",o."totalYen",org."name" AS "organizationName",COUNT(l."id")::int AS "lineCount",COALESCE(SUM(l."quantity"),0)::int AS "totalQuantity" FROM "WholesaleOrder" o JOIN "Organization" org ON org."id"=o."organizationId" LEFT JOIN "WholesaleOrderLine" l ON l."orderId"=o."id" WHERE o."dealerId"=$1 GROUP BY o."id",org."name" ORDER BY CASE o."status" WHEN 'ORDERED' THEN 0 WHEN 'ACCEPTED' THEN 1 WHEN 'SHIPPED' THEN 2 WHEN 'DELIVERED' THEN 3 ELSE 4 END,o."orderedAt" DESC LIMIT 200`, session.id),
    ])
    return { dealer: { id: session.id, name: session.name, loginId: session.loginId }, contracts, orders: orders.map(order => ({ ...order, totalYen: Number(order.totalYen), lineCount: Number(order.lineCount), totalQuantity: Number(order.totalQuantity) })) }
  }

  async function approveContract(session, contractId) {
    const result = await prisma.$executeRawUnsafe('UPDATE "WholesaleDealerContract" SET "status"=\'ACTIVE\',"approvedAt"=COALESCE("approvedAt",NOW()),"updatedAt"=NOW() WHERE "id"=$1 AND "dealerId"=$2 AND "status"=\'PENDING\'', contractId, session.id)
    if (Number(result) !== 1) throw new WholesaleError('承認対象の契約を確認してください。', 404)
    return { approved: true }
  }

  async function orderDetailForDealer(session, orderId) {
    const orders = await prisma.$queryRawUnsafe(`SELECT o.*,org."name" AS "organizationName",p."phone" AS "salonPhone",p."postalCode" AS "salonPostalCode",p."prefecture" AS "salonPrefecture",p."city" AS "salonCity",p."addressLine1" AS "salonAddressLine1",p."addressLine2" AS "salonAddressLine2",d."name" AS "dealerName",d."phone" AS "dealerPhone",d."postalCode" AS "dealerPostalCode",d."address" AS "dealerAddress" FROM "WholesaleOrder" o JOIN "Organization" org ON org."id"=o."organizationId" JOIN "WholesaleDealer" d ON d."id"=o."dealerId" LEFT JOIN "OrganizationStoreProfile" p ON p."organizationId"=o."organizationId" WHERE o."id"=$1 AND o."dealerId"=$2 LIMIT 1`, orderId, session.id)
    if (!orders[0]) throw new WholesaleError('注文が見つかりません。', 404)
    const lines = await prisma.$queryRawUnsafe('SELECT "id","productId","manufacturerName","productName","category","productCode","janCode","unitPrice","quantity","deliveredQuantity","lineTotal" FROM "WholesaleOrderLine" WHERE "orderId"=$1 ORDER BY "createdAt","id"', orderId)
    return { order: { ...orders[0], taxRate: Number(orders[0].taxRate), subtotalYen: Number(orders[0].subtotalYen), taxYen: Number(orders[0].taxYen), totalYen: Number(orders[0].totalYen) }, lines: lines.map(line => ({ ...line, unitPrice: Number(line.unitPrice), quantity: Number(line.quantity), deliveredQuantity: Number(line.deliveredQuantity), lineTotal: Number(line.lineTotal) })) }
  }

  async function updateOrderStatus(session, orderId, payload) {
    const target = cleanText(payload.status, '受注状態', 30, true).toUpperCase()
    if (!ORDER_STATUSES.includes(target)) throw new WholesaleError('受注状態を確認してください。')
    const dealerNote = cleanText(payload.dealerNote, 'ディーラーメモ', 1200, false)
    const submittedLines = Array.isArray(payload.lines) ? payload.lines.slice(0, 300) : []
    const result = await prisma.$transaction(async tx => {
      const orders = await tx.$queryRawUnsafe('SELECT * FROM "WholesaleOrder" WHERE "id"=$1 AND "dealerId"=$2 FOR UPDATE', orderId, session.id)
      const order = orders[0]
      if (!order) throw new WholesaleError('注文が見つかりません。', 404)
      const allowed = { ORDERED: ['ORDERED', 'ACCEPTED', 'CANCELLED'], ACCEPTED: ['ACCEPTED', 'SHIPPED', 'CANCELLED'], SHIPPED: ['SHIPPED', 'DELIVERED'], DELIVERED: ['DELIVERED'], CANCELLED: [] }
      if (!allowed[order.status].includes(target)) throw new WholesaleError('現在の状態からその操作は行えません。', 409)
      const currentLines = await tx.$queryRawUnsafe('SELECT * FROM "WholesaleOrderLine" WHERE "orderId"=$1 ORDER BY "createdAt" FOR UPDATE', orderId)
      const byId = new Map(currentLines.map(line => [line.id, line]))
      if (submittedLines.length && !['ORDERED', 'ACCEPTED'].includes(order.status)) throw new WholesaleError('出荷後の明細は変更できません。', 409)
      for (const submitted of submittedLines) {
        const lineId = cleanText(submitted.id, '注文明細', 180, true)
        const current = byId.get(lineId)
        if (!current) throw new WholesaleError('注文明細を確認してください。', 409)
        const unitPrice = integer(submitted.unitPrice, '単価', 0, 10000000)
        const deliveredQuantity = integer(submitted.deliveredQuantity, '納品数量', 0, Number(current.quantity))
        const productCode = cleanText(submitted.productCode, '商品コード', 100, false)
        const janCode = cleanText(submitted.janCode, 'JANコード', 32, false)
        const lineTotal = unitPrice * deliveredQuantity
        await tx.$executeRawUnsafe('UPDATE "WholesaleOrderLine" SET "unitPrice"=$2,"deliveredQuantity"=$3,"productCode"=NULLIF($4,\'\'),"janCode"=NULLIF($5,\'\'),"lineTotal"=$6,"updatedAt"=NOW() WHERE "id"=$1 AND "orderId"=$7', lineId, unitPrice, deliveredQuantity, productCode, janCode, lineTotal, orderId)
        if (current.productId) {
          await tx.$executeRawUnsafe(`INSERT INTO "WholesaleProductBinding" ("id","dealerId","productId","productCode","janCode","wholesalePrice","orderUnit","active","createdAt","updatedAt") VALUES ($1,$2,$3,NULLIF($4,''),NULLIF($5,''),$6,1,TRUE,NOW(),NOW()) ON CONFLICT ("dealerId","productId") DO UPDATE SET "productCode"=EXCLUDED."productCode","janCode"=EXCLUDED."janCode","wholesalePrice"=EXCLUDED."wholesalePrice","active"=TRUE,"updatedAt"=NOW()`, 'binding_' + crypto.randomUUID(), session.id, current.productId, productCode, janCode, unitPrice)
        }
      }
      const totals = await tx.$queryRawUnsafe('SELECT COALESCE(SUM("lineTotal"),0)::int AS subtotal FROM "WholesaleOrderLine" WHERE "orderId"=$1', orderId)
      const subtotalYen = Number(totals[0] && totals[0].subtotal || 0)
      const taxRate = Number(order.taxRate || 10)
      const taxYen = Math.round(subtotalYen * taxRate / 100)
      const totalYen = subtotalYen + taxYen
      const deliveryNo = order.deliveryNo || (['SHIPPED', 'DELIVERED'].includes(target) ? 'DN-' + new Date().toISOString().slice(0, 10).replaceAll('-', '') + '-' + crypto.randomBytes(3).toString('hex').toUpperCase() : null)
      const timestamp = target === 'ACCEPTED' ? ',"acceptedAt"=COALESCE("acceptedAt",NOW()),"acceptedByName"=$8' : target === 'SHIPPED' ? ',"acceptedAt"=COALESCE("acceptedAt",NOW()),"acceptedByName"=COALESCE("acceptedByName",$8),"shippedAt"=COALESCE("shippedAt",NOW())' : target === 'DELIVERED' ? ',"deliveredAt"=COALESCE("deliveredAt",NOW())' : target === 'CANCELLED' ? ',"cancelledAt"=COALESCE("cancelledAt",NOW())' : ''
      const updateParams = [orderId, target, dealerNote, subtotalYen, taxYen, totalYen, deliveryNo]
      if (timestamp.includes('$8')) updateParams.push(session.name)
      await tx.$executeRawUnsafe(`UPDATE "WholesaleOrder" SET "status"=$2,"dealerNote"=NULLIF($3,''),"subtotalYen"=$4,"taxYen"=$5,"totalYen"=$6,"deliveryNo"=$7,"updatedAt"=NOW()${timestamp} WHERE "id"=$1`, ...updateParams)
      await tx.$executeRawUnsafe('INSERT INTO "WholesaleOrderEvent" ("id","orderId","eventType","actorType","actorId","actorName","detailJson","createdAt") VALUES ($1,$2,$3,\'DEALER\',$4,$5,$6::jsonb,NOW())', 'event_' + crypto.randomUUID(), orderId, target, session.id, session.name, JSON.stringify({ previousStatus: order.status, subtotalYen, totalYen }))
      return { status: target, deliveryNo, subtotalYen, taxYen, totalYen }
    })
    return result
  }

  async function renderDeliveryNote(req, res, orderId) {
    const dealer = await dealerSession(req)
    const admin = dealer ? null : await adminSession(req)
    if (!dealer && !admin) return redirect(res, '/dealer/login?next=' + encodeURIComponent('/dealer/orders/' + orderId + '/delivery-note'), 302)
    const where = dealer ? 'o."dealerId"=$2' : 'o."organizationId"=$2'
    const actorId = dealer ? dealer.id : admin.organizationId
    const orders = await prisma.$queryRawUnsafe(`SELECT o.*,org."name" AS "organizationName",p."phone" AS "salonPhone",p."postalCode" AS "salonPostalCode",p."prefecture" AS "salonPrefecture",p."city" AS "salonCity",p."addressLine1" AS "salonAddressLine1",p."addressLine2" AS "salonAddressLine2",d."name" AS "dealerName",d."phone" AS "dealerPhone",d."postalCode" AS "dealerPostalCode",d."address" AS "dealerAddress" FROM "WholesaleOrder" o JOIN "Organization" org ON org."id"=o."organizationId" JOIN "WholesaleDealer" d ON d."id"=o."dealerId" LEFT JOIN "OrganizationStoreProfile" p ON p."organizationId"=o."organizationId" WHERE o."id"=$1 AND ${where} LIMIT 1`, orderId, actorId)
    if (!orders[0]) return html(res, 404, sharedHead('納品書') + '<body class="wo-auth-body"><main class="wo-auth-card"><h1>納品書が見つかりません</h1></main></body></html>')
    const lines = await prisma.$queryRawUnsafe('SELECT * FROM "WholesaleOrderLine" WHERE "orderId"=$1 ORDER BY "createdAt","id"', orderId)
    return html(res, 200, deliveryNotePage(orders[0], lines, dealer ? 'dealer' : 'admin'))
  }

  async function handle(req, res, url) {
    const pathname = url.pathname.length > 1 ? url.pathname.replace(/\/$/, '') : url.pathname
    if (req.method === 'GET' && pathname === '/wholesale-ordering-client-v543.js') {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.end(CLIENT_SCRIPT)
      return true
    }
    if (req.method === 'GET' && pathname === '/wholesale-ordering-v543.css') {
      res.statusCode = 200
      res.setHeader('Content-Type', 'text/css; charset=utf-8')
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.end(STYLESHEET)
      return true
    }
    const isWholesaleRoute = pathname.startsWith('/api/admin/wholesale') || pathname.startsWith('/api/dealer/') || pathname.startsWith('/admin/products/orders') || pathname.startsWith('/dealer')
    if (!isWholesaleRoute) return false
    await ensureSchema()

    if (pathname === '/admin/products/orders' && req.method === 'GET') {
      const session = await adminSession(req)
      if (!session) { redirect(res, '/admin/login?next=' + encodeURIComponent('/admin/products/orders'), 302); return true }
      html(res, 200, adminOrderingPage(session)); return true
    }

    if (pathname === '/dealer' && req.method === 'GET') {
      const session = await dealerSession(req)
      redirect(res, session ? '/dealer/orders' : '/dealer/login', 302); return true
    }
    if (pathname === '/dealer/login' && req.method === 'GET') {
      const session = await dealerSession(req)
      if (session) { redirect(res, '/dealer/orders', 302); return true }
      html(res, 200, dealerLoginPage({ error: url.searchParams.get('error'), setup: url.searchParams.get('setup'), registered: url.searchParams.get('registered'), reset: url.searchParams.get('reset') })); return true
    }
    if (pathname === '/dealer/register' && req.method === 'GET') {
      const session = await dealerSession(req)
      if (session) { redirect(res, '/dealer/orders', 302); return true }
      html(res, 200, dealerRegistrationRequestPage({ sent: url.searchParams.get('sent') === '1' })); return true
    }
    const registrationMatch = pathname.match(/^\/dealer\/register\/([^/]+)$/)
    if (registrationMatch && req.method === 'GET') {
      const token = decodeURIComponent(registrationMatch[1])
      const registration = await registrationInfo(token)
      if (!registration) { html(res, 410, dealerAuthInvalidPage('registration')); return true }
      html(res, 200, dealerRegistrationPage(registration, token)); return true
    }
    if (pathname === '/dealer/password-reset' && req.method === 'GET') {
      const session = await dealerSession(req)
      if (session) { redirect(res, '/dealer/orders', 302); return true }
      html(res, 200, dealerPasswordResetRequestPage({ sent: url.searchParams.get('sent') === '1' })); return true
    }
    const passwordResetMatch = pathname.match(/^\/dealer\/password-reset\/([^/]+)$/)
    if (passwordResetMatch && req.method === 'GET') {
      const token = decodeURIComponent(passwordResetMatch[1])
      const reset = await passwordResetInfo(token)
      if (!reset) { html(res, 410, dealerAuthInvalidPage('password-reset')); return true }
      html(res, 200, dealerPasswordResetConfirmPage(reset, token, url.searchParams.get('error') || '')); return true
    }
    if (pathname === '/dealer/setup' && req.method === 'GET') {
      const token = String(url.searchParams.get('token') || '')
      const invite = token ? await inviteInfo(token) : null
      if (!invite) { html(res, 410, sharedHead('招待リンク無効') + '<body class="wo-auth-body"><main class="wo-auth-card"><h1>招待リンクを確認してください</h1><p>有効期限が切れているか、すでに使用されています。美容室へ再発行をご依頼ください。</p><a class="wo-button wo-button-secondary" href="/dealer/login">ログインへ</a></main></body></html>'); return true }
      html(res, 200, dealerSetupPage(invite, token)); return true
    }
    if (pathname === '/dealer/orders' && req.method === 'GET') {
      const session = await dealerSession(req)
      if (!session) { redirect(res, '/dealer/login?next=' + encodeURIComponent('/dealer/orders'), 302); return true }
      html(res, 200, dealerPortalPage(session)); return true
    }
    const deliveryMatch = pathname.match(/^\/dealer\/orders\/([^/]+)\/delivery-note$/)
    if (deliveryMatch && req.method === 'GET') { await renderDeliveryNote(req, res, decodeURIComponent(deliveryMatch[1])); return true }

    if (pathname === '/api/dealer/auth/login' && req.method === 'POST') {
      if (!validSameOrigin(req)) { html(res, 403, dealerLoginPage({ error: 'origin' })); return true }
      try {
        const payload = await readPayload(req)
        const loginId = cleanText(payload.loginId, 'ログインID', 200, true).toLowerCase()
        const password = String(payload.password || '')
        const rows = await prisma.$queryRawUnsafe('SELECT "id","name","loginId","email","passwordHash","authVersion" FROM "WholesaleDealer" WHERE "active"=TRUE AND (LOWER("loginId")=LOWER($1) OR LOWER(COALESCE("email",\'\'))=LOWER($1)) LIMIT 1', loginId)
        if (!rows[0] || !verifyDealerPassword(crypto, password, rows[0].passwordHash)) { redirect(res, '/dealer/login?error=invalid'); return true }
        res.setHeader('Set-Cookie', sessionCookie(req, signedDealerSession(crypto, rows[0])))
        redirect(res, '/dealer/orders'); return true
      } catch { redirect(res, '/dealer/login?error=invalid'); return true }
    }
    if (pathname === '/api/dealer/auth/logout' && req.method === 'POST') {
      if (!validSameOrigin(req)) { res.statusCode = 403; res.end(); return true }
      res.setHeader('Set-Cookie', expiredSessionCookie(req)); redirect(res, '/dealer/login'); return true
    }
    if (pathname === '/api/dealer/auth/setup' && req.method === 'POST') {
      if (!validSameOrigin(req)) { res.statusCode = 403; res.end(); return true }
      const payload = await readPayload(req)
      const token = String(payload.token || '')
      const invite = await inviteInfo(token)
      if (!invite) { redirect(res, '/dealer/login?error=invite'); return true }
      const password = String(payload.password || '')
      if (password.length < 10 || password.length > 200 || password !== String(payload.passwordConfirm || '')) {
        html(res, 400, dealerSetupPage(invite, token, 'パスワードは10文字以上で、確認欄と同じ内容を入力してください。')); return true
      }
      const email = normalizeEmail(payload.email || invite.email)
      if (!validEmail(email)) {
        html(res, 400, dealerSetupPage(invite, token, '有効な登録メールアドレスを入力してください。')); return true
      }
      const emailConflicts = await prisma.$queryRawUnsafe('SELECT "id" FROM "WholesaleDealer" WHERE "id"<>$1 AND LOWER(COALESCE("email",\'\'))=LOWER($2) LIMIT 1', invite.dealerId, email)
      if (emailConflicts[0]) {
        html(res, 409, dealerSetupPage(invite, token, 'このメールアドレスは別のディーラーアカウントで使用されています。')); return true
      }
      const phone = cleanText(payload.phone, '電話番号', 40, false)
      const postalCode = cleanText(payload.postalCode, '郵便番号', 12, false)
      const address = cleanText(payload.address, '会社住所', 300, false)
      const hash = dealerPasswordHash(crypto, password)
      await prisma.$transaction(async tx => {
        await tx.$executeRawUnsafe('UPDATE "WholesaleDealer" SET "passwordHash"=$2,"phone"=NULLIF($3,\'\'),"postalCode"=NULLIF($4,\'\'),"address"=NULLIF($5,\'\'),"email"=$6,"active"=TRUE,"authVersion"="authVersion"+1,"updatedAt"=NOW() WHERE "id"=$1', invite.dealerId, hash, phone, postalCode, address, email)
        await tx.$executeRawUnsafe('UPDATE "WholesaleDealerContract" SET "status"=\'ACTIVE\',"approvedAt"=COALESCE("approvedAt",NOW()),"updatedAt"=NOW() WHERE "id"=$1 AND "dealerId"=$2', invite.contractId, invite.dealerId)
        await tx.$executeRawUnsafe('UPDATE "WholesaleDealerInvite" SET "usedAt"=NOW() WHERE "id"=$1 AND "usedAt" IS NULL', invite.inviteId)
      })
      redirect(res, '/dealer/login?setup=complete'); return true
    }
    if (pathname === '/api/dealer/auth/register/request' && req.method === 'POST') {
      if (!validSameOrigin(req)) { html(res, 403, dealerRegistrationRequestPage({ error: '安全性を確認できないため送信できませんでした。' })); return true }
      try {
        await requestDealerRegistration(req, await readPayload(req))
        redirect(res, '/dealer/register?sent=1'); return true
      } catch (error) {
        const status = error instanceof WholesaleError ? error.status : 500
        if (status === 500) console.error('[dealer-auth] registration request failed', { error: error && error.stack || error })
        html(res, status, dealerRegistrationRequestPage({ error: status === 500 ? '確認メールを送信できませんでした。時間をおいて再度お試しください。' : error.message })); return true
      }
    }
    if (pathname === '/api/dealer/auth/register/confirm' && req.method === 'POST') {
      if (!validSameOrigin(req)) { res.statusCode = 403; res.end(); return true }
      let payload = {}
      try { payload = await readPayload(req) } catch { html(res, 400, dealerAuthInvalidPage('registration')); return true }
      const token = String(payload.token || '')
      const registration = await registrationInfo(token)
      if (!registration) { html(res, 410, dealerAuthInvalidPage('registration')); return true }
      try {
        await completeDealerRegistration(payload)
        redirect(res, '/dealer/login?registered=complete'); return true
      } catch (error) {
        if (error instanceof WholesaleError && error.status === 410) { html(res, 410, dealerAuthInvalidPage('registration')); return true }
        const status = error instanceof WholesaleError ? error.status : 500
        if (status === 500) console.error('[dealer-auth] registration confirmation failed', { error: error && error.stack || error })
        html(res, status, dealerRegistrationPage(registration, token, { error: status === 500 ? '初期設定を完了できませんでした。時間をおいて再度お試しください。' : error.message, values: payload })); return true
      }
    }
    if (pathname === '/api/dealer/auth/password-reset/request' && req.method === 'POST') {
      if (!validSameOrigin(req)) { html(res, 403, dealerPasswordResetRequestPage({ error: '安全性を確認できないため送信できませんでした。' })); return true }
      try { await requestDealerPasswordReset(req, await readPayload(req)) } catch (error) {
        console.error('[dealer-auth] password reset request failed', { error: error && error.stack || error })
      }
      redirect(res, '/dealer/password-reset?sent=1'); return true
    }
    if (pathname === '/api/dealer/auth/password-reset/confirm' && req.method === 'POST') {
      if (!validSameOrigin(req)) { res.statusCode = 403; res.end(); return true }
      let payload = {}
      try { payload = await readPayload(req) } catch { html(res, 410, dealerAuthInvalidPage('password-reset')); return true }
      const token = String(payload.token || '')
      const reset = await passwordResetInfo(token)
      if (!reset) { html(res, 410, dealerAuthInvalidPage('password-reset')); return true }
      try {
        await completeDealerPasswordReset(payload)
        res.setHeader('Set-Cookie', expiredSessionCookie(req))
        redirect(res, '/dealer/login?reset=complete'); return true
      } catch (error) {
        if (error instanceof WholesaleError && (error.status === 410 || error.message === 'invalid')) { html(res, 410, dealerAuthInvalidPage('password-reset')); return true }
        const status = error instanceof WholesaleError ? error.status : 500
        if (status === 500) console.error('[dealer-auth] password reset confirmation failed', { error: error && error.stack || error })
        html(res, status, dealerPasswordResetConfirmPage(reset, token, error instanceof WholesaleError ? error.message : 'invalid')); return true
      }
    }

    const adminApi = pathname.startsWith('/api/admin/wholesale')
    if (adminApi) {
      const session = await adminSession(req)
      if (!session) { json(res, 401, { ok: false, error: 'ログインし直してください。' }); return true }
      try {
        if (pathname === '/api/admin/wholesale/bootstrap' && req.method === 'GET') {
          json(res, 200, { ok: true, ...(await salonBootstrap(session, url.searchParams.get('dealerId'))) }); return true
        }
        const imageMatch = pathname.match(/^\/api\/admin\/wholesale\/products\/([^/]+)\/image$/)
        if (imageMatch && req.method === 'GET') {
          const products = await prisma.$queryRawUnsafe('SELECT "imageUrl" FROM "Product" WHERE "id"=$1 AND "organizationId"=$2 AND "active"=TRUE LIMIT 1', decodeURIComponent(imageMatch[1]), session.organizationId)
          const imageUrl = String(products[0] && products[0].imageUrl || '')
          const match = imageUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/)
          if (!match) { res.statusCode = 404; res.end(); return true }
          res.statusCode = 200; res.setHeader('Content-Type', match[1]); res.setHeader('Cache-Control', 'private, max-age=300'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.end(Buffer.from(match[2], 'base64')); return true
        }
        if (req.method !== 'POST') { res.statusCode = 405; res.setHeader('Allow', 'GET, POST'); res.end(); return true }
        if (!validSameOrigin(req)) throw new WholesaleError('安全性を確認できないため処理できませんでした。', 403)
        const payload = await readPayload(req)
        if (pathname === '/api/admin/wholesale/invites') { json(res, 200, { ok: true, ...(await createDealerInvite(req, session, payload)) }); return true }
        if (pathname === '/api/admin/wholesale/inventory') { json(res, 200, { ok: true, ...(await updateInventory(session, payload)) }); return true }
        if (pathname === '/api/admin/wholesale/orders') { json(res, 201, { ok: true, order: await createOrder(session, payload) }); return true }
        json(res, 404, { ok: false, error: 'APIが見つかりません。' }); return true
      } catch (error) {
        const status = error instanceof WholesaleError ? error.status : 500
        if (status === 500) console.error('[wholesale-admin] failed', { path: pathname, organizationId: session.organizationId, error: error && error.stack || error })
        json(res, status, { ok: false, error: status === 500 ? '処理を完了できませんでした。時間をおいて再度お試しください。' : error.message }); return true
      }
    }

    const dealerApi = pathname.startsWith('/api/dealer/')
    if (dealerApi) {
      const session = await dealerSession(req)
      if (!session) { json(res, 401, { ok: false, error: 'ログインし直してください。' }); return true }
      try {
        if (pathname === '/api/dealer/bootstrap' && req.method === 'GET') { json(res, 200, { ok: true, ...(await dealerBootstrap(session)) }); return true }
        const detailMatch = pathname.match(/^\/api\/dealer\/orders\/([^/]+)$/)
        if (detailMatch && req.method === 'GET') { json(res, 200, { ok: true, ...(await orderDetailForDealer(session, decodeURIComponent(detailMatch[1]))) }); return true }
        if (req.method !== 'POST') { res.statusCode = 405; res.setHeader('Allow', 'GET, POST'); res.end(); return true }
        if (!validSameOrigin(req)) throw new WholesaleError('安全性を確認できないため処理できませんでした。', 403)
        const payload = await readPayload(req)
        const contractMatch = pathname.match(/^\/api\/dealer\/contracts\/([^/]+)\/approve$/)
        if (contractMatch) { json(res, 200, { ok: true, ...(await approveContract(session, decodeURIComponent(contractMatch[1]))) }); return true }
        const statusMatch = pathname.match(/^\/api\/dealer\/orders\/([^/]+)\/status$/)
        if (statusMatch) { json(res, 200, { ok: true, order: await updateOrderStatus(session, decodeURIComponent(statusMatch[1]), payload) }); return true }
        json(res, 404, { ok: false, error: 'APIが見つかりません。' }); return true
      } catch (error) {
        const status = error instanceof WholesaleError ? error.status : 500
        if (status === 500) console.error('[wholesale-dealer] failed', { path: pathname, dealerId: session.id, error: error && error.stack || error })
        json(res, status, { ok: false, error: status === 500 ? '処理を完了できませんでした。時間をおいて再度お試しください。' : error.message }); return true
      }
    }
    return false
  }

  return { ensureSchema, handle, adminSession, dealerSession, salonBootstrap, dealerBootstrap }
}

module.exports = { createWholesaleOrderingService, WholesaleError, SESSION_COOKIE, ORDER_STATUSES, CONTRACT_STATUSES }
