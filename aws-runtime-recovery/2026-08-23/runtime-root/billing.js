'use strict'

const fs = require('fs')
const path = require('path')

const PLAN_KEYS = Object.freeze(['ume', 'take', 'matsu'])
const ALLOWED_STATUSES = new Set(['trialing', 'active', 'past_due'])
const STAFF_BILLING_APIS = new Set([
  '/api/lien-admin-sms-status',
  '/api/lien-chat-form',
  '/api/lien-staff-introduction',
  '/api/lien-appointment-cancel',
  '/api/lien-staff-notifications',
  '/api/lien-capacity',
  '/api/lien-customer-real-name',
])
const registrationAttempts = new Map()

function registrationTokenMinutes(env = process.env) {
  return parsePositiveInteger(env.STORE_REGISTRATION_TOKEN_MINUTES, 60, 10, 1440)
}

function parsePositiveInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value || ''), 10)
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : fallback
}

function trialDaysFromEnv(env = process.env) {
  return parsePositiveInteger(env.SUBSCRIPTION_TRIAL_DAYS, 30, 1, 365)
}

function stripeConfig(env = process.env) {
  const secretKey = String(env.STRIPE_SECRET_KEY || '').trim()
  const webhookSecret = String(env.STRIPE_WEBHOOK_SECRET || '').trim()
  const prices = {
    ume: String(env.STRIPE_PRICE_UME || '').trim(),
    take: String(env.STRIPE_PRICE_TAKE || '').trim(),
    matsu: String(env.STRIPE_PRICE_MATSU || '').trim(),
  }
  const isLive = secretKey.startsWith('sk_live_')
  const allowLive = env.STRIPE_ALLOW_LIVE_BILLING === 'true'
  const enabled = env.BILLING_ONBOARDING_ENABLED === 'true'
  const appUrl = String(env.APP_URL || '').replace(/\/+$/, '')
  const errors = []
  if (!enabled) errors.push('billing onboarding is disabled')
  if (!secretKey.startsWith('sk_test_') && !(isLive && allowLive)) errors.push('a permitted Stripe key is not configured')
  if (!webhookSecret.startsWith('whsec_')) errors.push('Stripe webhook secret is not configured')
  for (const key of PLAN_KEYS) {
    if (!prices[key].startsWith('price_')) errors.push('Stripe Price is missing for ' + key)
  }
  if (!/^https:\/\//i.test(appUrl) && env.NODE_ENV === 'production') errors.push('APP_URL must use HTTPS')
  return {
    enabled,
    ready: errors.length === 0,
    errors,
    secretKey,
    webhookSecret,
    prices,
    appUrl,
    trialDays: trialDaysFromEnv(env),
    portalConfiguration: String(env.STRIPE_PORTAL_CONFIGURATION_ID || '').trim() || null,
    mode: isLive ? 'live' : 'test',
  }
}

function centsToYen(value) {
  return new Intl.NumberFormat('ja-JP').format(Number(value || 0))
}

function dateFromUnix(value) {
  return value ? new Date(Number(value) * 1000) : null
}

function formatJapaneseDate(value) {
  if (!value) return '未定'
  const date = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(date.getTime())) return '未定'
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

function firstChargeDate(days, now = new Date()) {
  const date = new Date(now)
  date.setUTCDate(date.getUTCDate() + days)
  return date
}

function buildCheckoutParams(input) {
  const successUrl = input.appUrl + '/admin/owner-analytics?section=billing&checkout=success&session_id={CHECKOUT_SESSION_ID}'
  const cancelUrl = input.appUrl + '/admin/owner-analytics?section=billing&checkout=cancelled'
  return {
    mode: 'subscription',
    customer: input.customerId,
    client_reference_id: input.organizationId,
    payment_method_types: ['card'],
    payment_method_collection: 'always',
    line_items: [{ price: input.priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: input.trialDays,
      metadata: {
        organizationId: input.organizationId,
        planKey: input.planKey,
      },
      trial_settings: {
        end_behavior: { missing_payment_method: 'cancel' },
      },
    },
    metadata: {
      organizationId: input.organizationId,
      planKey: input.planKey,
    },
    locale: 'ja',
    success_url: successUrl,
    cancel_url: cancelUrl,
  }
}

function safeStatusLabel(status) {
  return {
    none: 'お支払い方法の登録待ち',
    incomplete: '設定未完了',
    incomplete_expired: '設定期限切れ',
    trialing: '無料トライアル中',
    active: '利用中',
    past_due: 'お支払いの確認が必要',
    unpaid: '利用停止',
    canceled: '解約済み',
    paused: '一時停止',
  }[status] || '確認中'
}

function htmlEscape(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]
  })
}

function readRequestBody(req, limit = 32768) {
  return new Promise(function (resolve, reject) {
    const chunks = []
    let size = 0
    req.on('data', function (chunk) {
      size += chunk.length
      if (size > limit) {
        reject(Object.assign(new Error('Request body too large'), { statusCode: 413 }))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', function () { resolve(Buffer.concat(chunks)) })
    req.on('error', reject)
  })
}

function parseFormBody(buffer, contentType) {
  const text = buffer.toString('utf8')
  if (String(contentType || '').includes('application/json')) {
    try { return JSON.parse(text || '{}') } catch { return {} }
  }
  return Object.fromEntries(new URLSearchParams(text))
}

function requestOrigin(req) {
  const proto = String(req.headers['x-forwarded-proto'] || (req.socket.encrypted ? 'https' : 'http')).split(',')[0].trim()
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim()
  return host ? proto + '://' + host : ''
}

function validSameOrigin(req, configuredAppUrl) {
  const origin = String(req.headers.origin || '')
  if (!origin) return false
  const accepted = new Set()
  try { accepted.add(new URL(configuredAppUrl).origin) } catch {}
  try { accepted.add(new URL(requestOrigin(req)).origin) } catch {}
  return accepted.has(origin)
}

function isOwner(session) {
  return session && session.role === 'ADMIN' && session.organizationId
}

function createSessionCookie(crypto, user, req) {
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    version: 2,
    subject: String(user.email).trim().toLowerCase(),
    role: 'ADMIN',
    organizationId: user.organizationId,
    manufacturerName: null,
    userId: user.id,
    issuedAt: now,
    expiresAt: now + 12 * 3600,
    sessionId: crypto.randomUUID(),
  }
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const signature = crypto.createHmac('sha256', process.env.ADMIN_AUTH_SECRET).update(body).digest('base64url')
  const secure = requestOrigin(req).startsWith('https://') ? '; Secure' : ''
  return 'lien_admin_session=' + encodeURIComponent(body + '.' + signature) + '; Path=/; Max-Age=43200; HttpOnly; SameSite=Lax; Priority=High' + secure
}

function passwordHash(crypto, password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const digest = crypto.scryptSync(password, salt, 64).toString('hex')
  return 'scrypt$' + salt + '$' + digest
}

function registrationTokenHash(crypto, token) {
  return crypto.createHash('sha256').update(String(token), 'utf8').digest('hex')
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase()
}

function postmarkMailConfig() {
  const token = String(process.env.POSTMARK_SERVER_TOKEN || '').trim()
  const from = String(process.env.POSTMARK_FROM_EMAIL || '').trim()
  const fromName = String(process.env.POSTMARK_FROM_NAME || 'Salon de Lien').trim()
  const replyTo = String(process.env.POSTMARK_REPLY_TO || '').trim()
  const transactionalStream = String(process.env.POSTMARK_TRANSACTIONAL_STREAM || 'outbound').trim()
  if (!token || !from) {
    throw Object.assign(new Error('Postmark mail sender is not configured'), { code: 'POSTMARK_NOT_CONFIGURED' })
  }
  return { token, from, fromName, replyTo, transactionalStream }
}

async function sendPostmarkTextMail(input) {
  const config = postmarkMailConfig()
  const payload = {
    From: config.fromName + ' <' + config.from + '>',
    To: String(input.to || '').trim(),
    Subject: String(input.subject || ''),
    TextBody: String(input.body || ''),
    MessageStream: String(input.messageStream || config.transactionalStream),
    TrackOpens: false,
    TrackLinks: 'None',
  }
  if (config.replyTo) payload.ReplyTo = config.replyTo
  if (input.tag) payload.Tag = String(input.tag).slice(0, 1000)
  if (input.metadata && typeof input.metadata === 'object') payload.Metadata = input.metadata
  const response = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': config.token,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20000),
  })
  const result = await response.json().catch(function () { return {} })
  if (!response.ok || Number(result.ErrorCode || 0) !== 0) {
    throw Object.assign(new Error('Postmark mail delivery failed'), {
      code: 'POSTMARK_SEND_FAILED',
      statusCode: response.status,
      postmarkErrorCode: Number(result.ErrorCode || 0),
    })
  }
  return { messageId: result.MessageID || null, submittedAt: result.SubmittedAt || null }
}

async function sendRegistrationVerificationMail(input) {
  const subject = 'Salon de Lien 店舗登録用メールアドレス確認'
  const body = [
    'Salon de Lienの店舗登録を開始するには、以下のリンクを開いてください。',
    '',
    input.verificationUrl,
    '',
    'このリンクの有効期限は' + input.expiresMinutes + '分で、一度だけ使用できます。',
    'このメールに心当たりがない場合は、リンクを開かず削除してください。',
  ].join('\n')
  return sendPostmarkTextMail({
    to: input.to,
    subject,
    body,
    tag: 'store-registration',
    metadata: { mailType: 'STORE_REGISTRATION_VERIFICATION' },
  })
}

function safeJson(res, status, value) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('Vary', 'Cookie')
  res.end(JSON.stringify(value))
}

function redirect(res, location, status = 303) {
  res.statusCode = status
  res.setHeader('Location', location)
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('Vary', 'Cookie')
  res.end()
}

function randomId(crypto, prefix) {
  return prefix + '_' + crypto.randomUUID().replace(/-/g, '')
}

function normalizeSlug(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

function stripeObjectId(value) {
  if (!value) return null
  return typeof value === 'string' ? value : value.id || null
}

function invoiceSubscriptionId(invoice) {
  return stripeObjectId(invoice && invoice.subscription) ||
    stripeObjectId(invoice && invoice.parent && invoice.parent.subscription_details && invoice.parent.subscription_details.subscription)
}

function pricePlanKey(priceId, config, metadataPlanKey) {
  const mapped = PLAN_KEYS.find(function (key) { return config.prices[key] === priceId })
  if (mapped) return mapped
  return PLAN_KEYS.includes(metadataPlanKey) ? metadataPlanKey : null
}

function subscriptionPeriod(subscription) {
  const item = subscription && subscription.items && subscription.items.data && subscription.items.data[0]
  return {
    start: dateFromUnix((item && item.current_period_start) || subscription.current_period_start),
    end: dateFromUnix((item && item.current_period_end) || subscription.current_period_end),
  }
}

function billingOnboardingStatus(subscriptionStatus) {
  if (subscriptionStatus === 'trialing') return 'TRIALING'
  if (subscriptionStatus === 'active') return 'ACTIVE'
  if (subscriptionStatus === 'past_due') return 'PAYMENT_ATTENTION'
  if (['unpaid', 'canceled', 'paused', 'incomplete_expired'].includes(subscriptionStatus)) return 'BLOCKED'
  return 'PAYMENT_REQUIRED'
}

function compactStripeError(error) {
  return {
    type: String(error && error.type || 'StripeError').slice(0, 80),
    code: String(error && error.code || '').slice(0, 80),
    statusCode: Number(error && error.statusCode || 0) || undefined,
  }
}

function uiIcon(name) {
  const paths = {
    store: '<path d="M3 10h18M5 10V21h14V10M4 3h16l2 7H2l2-7Zm5 18v-6h6v6"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h3"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    sparkle: '<path d="m12 3 1.3 3.7L17 8l-3.7 1.3L12 13l-1.3-3.7L7 8l3.7-1.3L12 3ZM5 14l.9 2.1L8 17l-2.1.9L5 20l-.9-2.1L2 17l2.1-.9L5 14ZM19 13l.9 2.1L22 16l-2.1.9L19 19l-.9-2.1L16 16l2.1-.9L19 13Z"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  }
  return '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (paths[name] || paths.sparkle) + '</svg>'
}

function onboardingSteps(activeStep) {
  const steps = ['店舗情報', 'プラン選択', 'カード登録', '利用開始']
  return '<ol class="steps" aria-label="セットアップ進捗">' + steps.map(function (label, index) {
    const number = index + 1
    const state = number < activeStep ? 'done' : number === activeStep ? 'active' : ''
    return '<li class="' + state + '"><span class="stepNumber">' + (number < activeStep ? uiIcon('check') : number) + '</span><span><small>STEP ' + number + '</small><strong>' + label + '</strong></span></li>'
  }).join('') + '</ol>'
}

function pageShell(title, content, session, options = {}) {
  const account = session ? htmlEscape(session.displayName || session.subject || '管理者') : ''
  const organization = htmlEscape(options.organizationName || 'Salon de Lien')
  const setup = Boolean(options.setup)
  const navigation = session
    ? '<aside class="side"><div class="brand"><span class="brandMark">S</span><div><strong>Salon de Lien</strong><small>店舗管理</small></div></div>' +
      '<div class="tenantCard"><span>' + uiIcon('store') + '</span><div><small>ログイン中の店舗</small><strong>' + organization + '</strong></div></div>' +
      (setup
        ? '<div class="sideProgress"><small>ACCOUNT SETUP</small><strong>初期設定を完了してください</strong><span>店舗ごとの専用環境を準備しています。</span></div>'
        : '<nav><a href="/admin/appointments">予約カレンダー</a><a href="/admin/customers">顧客・チャット・配信</a><a href="/admin/products">メニュー・商品棚・集計</a><a href="/admin/owner-analytics?section=billing" class="' + (options.billing ? 'current' : '') + '">経営分析・システム利用料</a></nav>') +
      '<div class="sessionNote">' + uiIcon('shield') + '<div><strong>店舗データは分離されています</strong><small>別の端末で他店舗がログインしても、この端末の店舗には影響しません。</small></div></div>' +
      '<form method="post" action="/api/auth/admin/logout"><button class="plain" type="submit">ログアウト</button></form></aside>'
    : ''
  return '<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="robots" content="noindex,nofollow"><meta name="color-scheme" content="light"><title>' + htmlEscape(title) + ' | Salon de Lien</title>' +
    '<style>:root{--ink:#30221e;--muted:#786964;--line:#e9d9d1;--paper:#fffdfa;--wash:#faf6f1;--brand:#9f5547;--brand-dark:#783d34;--rose:#d85a7b;--rose-soft:#fff3f6;--gold:#b88a4a;--ok:#3f7653;--warn:#9a5c20;--danger:#a43d3d;--shadow:0 22px 60px rgba(82,54,42,.08)}*{box-sizing:border-box}html{background:var(--wash)}body{margin:0;background:radial-gradient(circle at 88% 6%,rgba(218,187,168,.2),transparent 28rem),var(--wash);color:var(--ink);font-family:"Yu Gothic","Hiragino Kaku Gothic ProN",sans-serif;-webkit-font-smoothing:antialiased}.icon{width:20px;height:20px;display:block}.layout{min-height:100vh;display:grid;grid-template-columns:' + (session ? '272px minmax(0,1fr)' : '1fr') + '}.side{background:rgba(255,251,247,.97);border-right:1px solid var(--line);padding:26px 18px 22px;display:flex;flex-direction:column;gap:24px;position:sticky;top:0;height:100vh}.brand{display:flex;align-items:center;gap:12px;padding:0 8px}.brandMark{display:grid;place-items:center;width:44px;height:44px;border-radius:50%;background:linear-gradient(145deg,#b56856,#8d493d);color:#fff;font:italic 25px Georgia;box-shadow:0 10px 24px rgba(159,85,71,.2)}.brand small{display:block;color:var(--muted);margin-top:3px;font-size:11px}.tenantCard{display:flex;align-items:center;gap:11px;border:1px solid var(--line);background:#fff;border-radius:17px;padding:13px}.tenantCard>span{display:grid;place-items:center;width:36px;height:36px;border-radius:11px;background:#f7e9e3;color:var(--brand)}.tenantCard small,.tenantCard strong{display:block}.tenantCard small{color:var(--muted);font-size:10px;margin-bottom:3px}.tenantCard strong{font-size:13px;line-height:1.35}.side nav{display:grid;gap:6px}.side nav a{color:var(--ink);text-decoration:none;padding:13px 14px;border-radius:14px;font-weight:700;font-size:14px}.side nav a.current,.side nav a:hover{background:#f1dfd8;color:#76392e}.sideProgress{border-radius:18px;padding:18px;background:linear-gradient(145deg,#4b302b,#7d4439);color:#fff}.sideProgress small,.sideProgress strong,.sideProgress span{display:block}.sideProgress small{letter-spacing:.12em;opacity:.68;font-size:9px}.sideProgress strong{margin:8px 0;font-size:14px}.sideProgress span{opacity:.76;font-size:11px;line-height:1.6}.sessionNote{margin-top:auto;display:flex;gap:10px;border-radius:16px;padding:13px;background:#f3ebe5;color:var(--brand-dark)}.sessionNote .icon{flex:0 0 18px}.sessionNote strong,.sessionNote small{display:block}.sessionNote strong{font-size:11px;margin-bottom:4px}.sessionNote small{color:var(--muted);font-size:9px;line-height:1.55}.side form{margin-top:0}.plain{border:0;background:none;color:var(--ink);font-weight:700;cursor:pointer;padding:8px}.main{min-width:0}.top{height:72px;border-bottom:1px solid var(--line);background:rgba(255,253,250,.88);backdrop-filter:blur(18px);display:flex;align-items:center;justify-content:space-between;padding:0 34px;position:sticky;top:0;z-index:5}.topBrand{display:flex;align-items:baseline;gap:12px}.topBrand strong{font:700 18px Georgia,"Yu Mincho",serif}.topBrand small{color:var(--muted);font-size:11px}.account{border:1px solid var(--line);background:#fff;border-radius:99px;padding:10px 16px;font-weight:700;font-size:13px;box-shadow:0 6px 20px rgba(69,42,31,.05)}.content{max-width:' + (options.wide ? '1320px' : '1180px') + ';margin:0 auto;padding:36px 32px 76px}.hero,.card{background:rgba(255,253,250,.96);border:1px solid var(--line);border-radius:26px;box-shadow:var(--shadow)}.hero{padding:38px 40px;margin-bottom:22px;position:relative;overflow:hidden}.hero:after{content:"";position:absolute;width:260px;height:260px;border-radius:50%;right:-110px;top:-140px;background:radial-gradient(circle,rgba(224,177,160,.25),rgba(224,177,160,0) 70%)}.eyebrow{color:var(--brand);font-size:11px;font-weight:800;letter-spacing:.14em}.hero h1{font:700 clamp(30px,3vw,46px)/1.28 Georgia,"Yu Mincho",serif;letter-spacing:.04em;margin:11px 0 10px}.hero p{color:var(--muted);line-height:1.85;margin:0;max-width:720px}.card{padding:30px;margin-bottom:20px}.sectionHeading{display:flex;align-items:flex-start;gap:13px;margin-bottom:22px}.sectionHeading .sectionIcon{display:grid;place-items:center;width:42px;height:42px;border-radius:14px;background:#f7e9e3;color:var(--brand);flex:0 0 auto}.sectionHeading h2{font:700 24px Georgia,"Yu Mincho",serif;margin:0 0 5px}.sectionHeading p{margin:0;color:var(--muted);font-size:12px}.steps{list-style:none;margin:0 0 22px;padding:0;display:grid;grid-template-columns:repeat(4,1fr);border:1px solid var(--line);background:rgba(255,255,255,.82);border-radius:20px}.steps li{position:relative;display:flex;align-items:center;gap:10px;padding:15px 16px;color:#9d908a}.steps li:not(:last-child):after{content:"";position:absolute;right:0;width:1px;height:28px;background:var(--line)}.stepNumber{display:grid;place-items:center;width:29px;height:29px;border:1px solid #d9c9c1;border-radius:50%;font-size:11px;font-weight:800}.stepNumber .icon{width:14px}.steps small,.steps strong{display:block}.steps small{font-size:8px;letter-spacing:.08em}.steps strong{font-size:11px;margin-top:3px}.steps li.done{color:var(--ok)}.steps li.active{color:var(--brand-dark);background:#fff6f3}.steps li.active .stepNumber{background:var(--brand);border-color:var(--brand);color:#fff}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.plan{position:relative;border:1px solid var(--line);border-radius:20px;padding:22px;background:#fff;cursor:pointer;transition:.2s ease;min-height:205px;display:flex;flex-direction:column}.plan:hover{transform:translateY(-2px);box-shadow:0 14px 32px rgba(74,47,36,.08)}.plan.selected{border:2px solid var(--rose);background:linear-gradient(150deg,#fff,#fff5f8);box-shadow:0 14px 32px rgba(216,90,123,.1)}.plan input{position:absolute;opacity:0;pointer-events:none}.planHead{display:flex;justify-content:space-between;align-items:flex-start}.plan h3{font:700 23px Georgia,"Yu Mincho",serif;margin:0 0 8px}.planCheck{display:grid;place-items:center;width:24px;height:24px;border:1px solid #d8c7bf;border-radius:50%;color:transparent}.plan.selected .planCheck{background:var(--rose);border-color:var(--rose);color:#fff}.planCheck .icon{width:14px}.recommend{display:inline-flex;width:max-content;border-radius:99px;background:#f2e4d1;color:#7a5421;padding:5px 9px;font-size:9px;font-weight:800;margin-bottom:13px}.price{font:700 30px Georgia,"Yu Mincho",serif;letter-spacing:.02em}.price small{font:600 11px sans-serif;color:var(--muted)}.planFeatures{display:grid;gap:6px;margin-top:auto;padding-top:18px;color:var(--muted);font-size:11px}.planFeatures span{display:flex;align-items:center;gap:6px}.planFeatures .icon{width:13px;color:var(--ok)}.label{font-size:11px;color:var(--muted);margin-bottom:6px}.value{font-weight:800;font-size:18px}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.metric{border:1px solid var(--line);border-radius:17px;padding:18px;background:#fff}.actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:20px}.btn{appearance:none;border:0;border-radius:999px;min-height:46px;padding:13px 24px;font-weight:800;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:8px;transition:.18s ease}.btn:hover:not(:disabled){transform:translateY(-1px)}.btn.primary{background:linear-gradient(135deg,#a95b4c,#8f493e);color:#fff;box-shadow:0 10px 24px rgba(159,85,71,.24)}.btn.secondary{background:#fff;color:var(--ink);border:1px solid #d9bfb4}.btn:disabled{opacity:.5;cursor:not-allowed}.notice{border-radius:17px;padding:16px 18px;line-height:1.7;margin:16px 0;border:1px solid transparent}.notice.info{background:#f5eee9;border-color:#eadbd2}.notice.warn{background:#fff6e8;border-color:#efd9b8;color:#74400d}.notice.danger{background:#fff0ef;border-color:#efcac7;color:#842e2e}.notice.ok{background:#eef8f0;border-color:#cce3d2;color:#315f40}.summary{border:1px solid var(--line);border-radius:19px;padding:21px;background:#fff}.summary dl{display:grid;grid-template-columns:1fr auto;gap:13px 22px;margin:0}.summary dt{color:var(--muted);font-size:13px}.summary dd{margin:0;font-weight:800;text-align:right}.field{display:grid;gap:7px;margin:0}.field label{font-weight:800;font-size:13px}.fieldHint{color:var(--muted);font-size:10px}.field input,.field select{width:100%;border:1px solid #dccbc3;border-radius:14px;padding:14px 15px;background:#fff;font:inherit;min-height:49px}.field input:focus,.field select:focus{outline:3px solid rgba(216,90,123,.12);border-color:var(--rose)}.formGrid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.check{display:flex;gap:10px;align-items:flex-start;font-size:12px;line-height:1.65;margin:20px 0}.check input{margin-top:3px;accent-color:var(--brand)}.muted{color:var(--muted);line-height:1.7}.small{font-size:11px}.status{display:inline-flex;border-radius:99px;padding:7px 12px;background:#f4ece7;font-weight:800}.status.trialing,.status.active{background:#eaf6ed;color:#315e40}.status.past_due,.status.unpaid{background:#fff0ef;color:#8d2e2e}.spinner{width:26px;height:26px;border:3px solid #ead9d1;border-top-color:var(--brand);border-radius:50%;animation:spin .8s linear infinite}.testChip{display:inline-flex;align-items:center;gap:7px;border:1px solid #d6c2b7;background:#fff;border-radius:99px;padding:8px 12px;font-size:10px;font-weight:800}.onboardingLayout{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(300px,.7fr);gap:20px;align-items:start}.billingAside{position:sticky;top:94px}.trustRow{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:18px}.trustItem{display:flex;gap:9px;padding:13px;border-radius:15px;background:#f7f1ec;color:var(--muted);font-size:10px;line-height:1.5}.trustItem .icon{color:var(--brand);flex:0 0 17px}.registrationWrap{max-width:1120px;margin:0 auto}.registrationIntro{display:grid;grid-template-columns:1.25fr .75fr;gap:20px;align-items:stretch}.benefitCard{border-radius:26px;padding:28px;background:linear-gradient(145deg,#402b27,#6e3d35);color:#fff;box-shadow:var(--shadow)}.benefitCard h2{font:700 24px Georgia,"Yu Mincho",serif;margin:8px 0 14px}.benefitList{display:grid;gap:12px;margin:22px 0 0}.benefitList div{display:flex;gap:9px;font-size:12px;line-height:1.6}.benefitList .icon{color:#f3c3ae;flex:0 0 17px}.submitBar{display:flex;justify-content:space-between;align-items:center;gap:20px;padding-top:22px;border-top:1px solid var(--line)}.emailVerificationCard{max-width:720px;margin:22px auto}.emailVerificationCard>h2,.emailVerificationCard>p{text-align:center}.verificationMark{display:grid;width:64px;height:64px;place-items:center;margin:0 auto 16px;border-radius:50%;background:#edf7f1;color:var(--ok)}.verificationMark .icon{width:30px;height:30px}.emailField{max-width:580px;margin:0 auto 24px}.verifiedEmail{display:flex;align-items:center;gap:11px;margin:-4px 0 22px;border:1px solid #c9e0d2;border-radius:15px;background:#f0f8f3;padding:13px 15px;color:var(--ok)}.verifiedEmail .icon{flex:0 0 20px}.verifiedEmail small,.verifiedEmail strong{display:block}.verifiedEmail small{font-size:9px;margin-bottom:2px}.verifiedEmail strong{font-size:13px}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:980px){.onboardingLayout,.registrationIntro{grid-template-columns:1fr}.billingAside{position:static}.trustRow{grid-template-columns:1fr}.layout{grid-template-columns:' + (session ? '230px minmax(0,1fr)' : '1fr') + '}.side{padding-inline:12px}}@media(max-width:760px){.layout{display:block}.side{display:none}.top{height:62px;padding:0 16px}.topBrand small{display:none}.content{padding:18px 13px 80px}.grid,.metrics,.formGrid{grid-template-columns:1fr}.hero,.card{border-radius:20px;padding:21px}.hero h1{font-size:30px}.actions .btn,.submitBar .btn{width:100%}.submitBar{align-items:stretch;flex-direction:column}.steps{overflow-x:auto}.steps li{min-width:126px;padding:12px}.plan{min-height:0}.onboardingLayout{display:block}.billingAside{margin-top:16px}}</style></head>' +
    '<body><div class="layout">' + navigation + '<main class="main"><header class="top"><div class="topBrand"><strong>Salon de Lien</strong><small>' + (session ? organization : '店舗運営を、もっと美しく。') + '</small></div>' + (account ? '<span class="account">' + account + '</span>' : '<a class="btn secondary" href="/admin/login">店舗ログイン</a>') + '</header><div class="content">' + content + '</div></main></div></body></html>'
}

function sendHtml(res, status, value) {
  res.statusCode = status
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('Vary', 'Cookie')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'same-origin')
  res.end(value)
}

function createBillingService(dependencies) {
  const prisma = dependencies.prisma
  const sessionProvider = dependencies.sessionProvider
  const crypto = dependencies.crypto
  const registrationMailSender = dependencies.registrationMailSender || sendRegistrationVerificationMail
  let stripeClient = null

  function getStripe(config) {
    if (!config.ready) throw Object.assign(new Error('Stripe billing is not configured'), { code: 'BILLING_NOT_CONFIGURED' })
    if (!stripeClient) {
      const Stripe = require('stripe')
      stripeClient = new Stripe(config.secretKey, {
        appInfo: { name: 'Salon de Lien Billing', version: '1.0.0' },
        maxNetworkRetries: 2,
        timeout: 20000,
      })
    }
    return stripeClient
  }

  async function ensureSchema() {
    const sql = fs.readFileSync(path.join(__dirname, 'billing-migration.sql'), 'utf8')
    const statements = sql.split(';').map(function (entry) { return entry.trim() }).filter(Boolean)
    await prisma.$transaction(async function (tx) {
      await tx.$queryRawUnsafe("SELECT 1::int AS locked FROM (SELECT pg_advisory_xact_lock(hashtext('salon_de_lien_billing_v1'))) AS guard")
      for (const statement of statements) await tx.$executeRawUnsafe(statement)
    })
  }

  async function getPlans(activeOnly = true) {
    return prisma.$queryRawUnsafe(
      'SELECT * FROM "BillingPlan"' + (activeOnly ? ' WHERE "active"=true' : '') + ' ORDER BY "sortOrder" ASC'
    )
  }

  async function getBilling(organizationId) {
    const rows = await prisma.$queryRawUnsafe(
      'SELECT b.*, p."displayName", p."monthlyAmount", p."currency", p."staffLimit", p."customerLimit", p."emailLimit", p."smsLimit", o."name" AS "organizationName" FROM "OrganizationBilling" b JOIN "BillingPlan" p ON p."planKey"=b."planKey" JOIN "Organization" o ON o."id"=b."organizationId" WHERE b."organizationId"=$1 LIMIT 1',
      organizationId
    )
    return rows[0] || null
  }

  async function requireOwner(req, res) {
    const session = await sessionProvider(req)
    if (!session) {
      safeJson(res, 401, { error: '認証が必要です。' })
      return null
    }
    if (!isOwner(session)) {
      safeJson(res, 403, { error: '契約を変更できるのはオーナーのみです。' })
      return null
    }
    return session
  }

  async function verifiedPrice(stripe, billing, config) {
    const priceId = config.prices[billing.planKey]
    const price = await stripe.prices.retrieve(priceId)
    const correct = price.active &&
      price.currency === String(billing.currency).toLowerCase() &&
      Number(price.unit_amount) === Number(billing.monthlyAmount) &&
      price.recurring && price.recurring.interval === 'month'
    if (!correct) {
      const error = new Error('Stripe Price does not match the Salon de Lien plan')
      error.code = 'PRICE_CONFIGURATION_MISMATCH'
      throw error
    }
    return price
  }

  async function ensureStripeCustomer(stripe, billing) {
    if (billing.stripeCustomerId) {
      const customer = await stripe.customers.retrieve(billing.stripeCustomerId)
      if (!customer.deleted) return customer
      throw Object.assign(new Error('The configured Stripe customer was deleted'), { code: 'STRIPE_CUSTOMER_DELETED' })
    }
    const customer = await stripe.customers.create({
      name: billing.organizationName,
      metadata: {
        organizationId: billing.organizationId,
        organizationName: billing.organizationName,
      },
    }, { idempotencyKey: 'salon-lien-customer-' + billing.organizationId })
    await prisma.$executeRawUnsafe(
      'UPDATE "OrganizationBilling" SET "stripeCustomerId"=$2, "updatedAt"=NOW() WHERE "organizationId"=$1 AND "stripeCustomerId" IS NULL',
      billing.organizationId,
      customer.id
    )
    return customer
  }

  async function paymentMethodSummary(stripe, subscription) {
    let paymentMethod = subscription.default_payment_method
    if (typeof paymentMethod === 'string') paymentMethod = await stripe.paymentMethods.retrieve(paymentMethod)
    if (!paymentMethod) {
      const customerId = stripeObjectId(subscription.customer)
      if (customerId) {
        const customer = await stripe.customers.retrieve(customerId, { expand: ['invoice_settings.default_payment_method'] })
        if (!customer.deleted) paymentMethod = customer.invoice_settings && customer.invoice_settings.default_payment_method
      }
    }
    if (!paymentMethod || typeof paymentMethod === 'string' || paymentMethod.type !== 'card' || !paymentMethod.card) return null
    return {
      brand: String(paymentMethod.card.brand || '').slice(0, 30) || null,
      last4: String(paymentMethod.card.last4 || '').slice(-4) || null,
      expMonth: Number(paymentMethod.card.exp_month) || null,
      expYear: Number(paymentMethod.card.exp_year) || null,
    }
  }

  async function locateBillingForSubscription(subscription) {
    const customerId = stripeObjectId(subscription.customer)
    const metadataOrganizationId = subscription.metadata && subscription.metadata.organizationId
    if (metadataOrganizationId) {
      const billing = await getBilling(metadataOrganizationId)
      if (billing && (!billing.stripeCustomerId || billing.stripeCustomerId === customerId)) return billing
    }
    const rows = await prisma.$queryRawUnsafe(
      'SELECT b.*, p."displayName", p."monthlyAmount", p."currency", p."staffLimit", p."customerLimit", p."emailLimit", p."smsLimit", o."name" AS "organizationName" FROM "OrganizationBilling" b JOIN "BillingPlan" p ON p."planKey"=b."planKey" JOIN "Organization" o ON o."id"=b."organizationId" WHERE b."stripeSubscriptionId"=$1 OR b."stripeCustomerId"=$2 LIMIT 1',
      subscription.id,
      customerId || ''
    )
    return rows[0] || null
  }

  async function syncSubscription(stripe, subscription, config, eventCreatedAt) {
    const billing = await locateBillingForSubscription(subscription)
    if (!billing) throw Object.assign(new Error('No billing organization matches the Stripe subscription'), { code: 'ORGANIZATION_NOT_FOUND' })
    const item = subscription.items && subscription.items.data && subscription.items.data[0]
    const priceId = item && stripeObjectId(item.price)
    const planKey = pricePlanKey(priceId, config, subscription.metadata && subscription.metadata.planKey)
    if (!planKey) throw Object.assign(new Error('Stripe subscription contains an unrecognized price'), { code: 'UNKNOWN_PRICE' })
    const period = subscriptionPeriod(subscription)
    const payment = await paymentMethodSummary(stripe, subscription)
    const status = String(subscription.status || 'none')
    const trialStartedAt = dateFromUnix(subscription.trial_start)
    const trialEndsAt = dateFromUnix(subscription.trial_end)
    const canceledAt = dateFromUnix(subscription.canceled_at || subscription.ended_at)
    const stripeCustomerId = stripeObjectId(subscription.customer)
    const lastEventAt = eventCreatedAt ? dateFromUnix(eventCreatedAt) : new Date()
    await prisma.$executeRawUnsafe(
      'UPDATE "OrganizationBilling" SET "planKey"=$2, "onboardingStatus"=$3, "subscriptionStatus"=$4, "stripeCustomerId"=COALESCE("stripeCustomerId",$5), "stripeSubscriptionId"=$6, "trialStartedAt"=$7, "trialEndsAt"=$8, "trialUsedAt"=CASE WHEN $7::timestamptz IS NOT NULL THEN COALESCE("trialUsedAt",$7) ELSE "trialUsedAt" END, "currentPeriodStart"=$9, "currentPeriodEnd"=$10, "cancelAtPeriodEnd"=$11, "canceledAt"=$12, "paymentMethodBrand"=COALESCE($13,"paymentMethodBrand"), "paymentMethodLast4"=COALESCE($14,"paymentMethodLast4"), "paymentMethodExpMonth"=COALESCE($15,"paymentMethodExpMonth"), "paymentMethodExpYear"=COALESCE($16,"paymentMethodExpYear"), "paymentMethodRegisteredAt"=CASE WHEN $14::text IS NOT NULL THEN COALESCE("paymentMethodRegisteredAt",NOW()) ELSE "paymentMethodRegisteredAt" END, "lastStripeEventAt"=$17, "updatedAt"=NOW() WHERE "organizationId"=$1',
      billing.organizationId,
      planKey,
      billingOnboardingStatus(status),
      status,
      stripeCustomerId,
      subscription.id,
      trialStartedAt,
      trialEndsAt,
      period.start,
      period.end,
      Boolean(subscription.cancel_at_period_end),
      canceledAt,
      payment && payment.brand,
      payment && payment.last4,
      payment && payment.expMonth,
      payment && payment.expYear,
      lastEventAt
    )
    return billing.organizationId
  }

  async function syncSubscriptionById(stripe, subscriptionId, config, eventCreatedAt) {
    if (!subscriptionId) return null
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['default_payment_method', 'items.data.price'],
    })
    return syncSubscription(stripe, subscription, config, eventCreatedAt)
  }

  async function claimWebhookEvent(event) {
    const inserted = await prisma.$queryRawUnsafe(
      'INSERT INTO "StripeWebhookEvent" ("stripeEventId","eventType","status","attemptCount","processingStartedAt","createdAt","updatedAt") VALUES ($1,$2,\'processing\',1,NOW(),NOW(),NOW()) ON CONFLICT ("stripeEventId") DO NOTHING RETURNING "stripeEventId"',
      event.id,
      event.type
    )
    if (inserted[0]) return true
    const claimed = await prisma.$queryRawUnsafe(
      'UPDATE "StripeWebhookEvent" SET "status"=\'processing\', "attemptCount"="attemptCount"+1, "processingStartedAt"=NOW(), "errorMessage"=NULL, "updatedAt"=NOW() WHERE "stripeEventId"=$1 AND ("status"=\'failed\' OR ("status"=\'processing\' AND "processingStartedAt" < NOW() - INTERVAL \'5 minutes\')) RETURNING "stripeEventId"',
      event.id
    )
    return Boolean(claimed[0])
  }

  async function markWebhookEvent(eventId, status, errorMessage) {
    await prisma.$executeRawUnsafe(
      'UPDATE "StripeWebhookEvent" SET "status"=$2, "processedAt"=CASE WHEN $2=\'processed\' THEN NOW() ELSE "processedAt" END, "errorMessage"=$3, "updatedAt"=NOW() WHERE "stripeEventId"=$1',
      eventId,
      status,
      errorMessage ? String(errorMessage).slice(0, 500) : null
    )
  }

  async function processWebhookEvent(stripe, event, config) {
    const object = event.data.object
    if (event.type === 'checkout.session.completed') {
      if (object.mode !== 'subscription') return
      const organizationId = object.metadata && object.metadata.organizationId
      if (!organizationId) throw Object.assign(new Error('Checkout metadata is missing organizationId'), { code: 'CHECKOUT_METADATA_MISSING' })
      const billing = await getBilling(organizationId)
      if (!billing) throw Object.assign(new Error('Checkout organization is not billing enabled'), { code: 'BILLING_NOT_FOUND' })
      if (billing.stripeCustomerId && billing.stripeCustomerId !== stripeObjectId(object.customer)) throw Object.assign(new Error('Checkout customer does not match organization'), { code: 'CUSTOMER_MISMATCH' })
      if (!object.metadata.planKey || billing.planKey !== object.metadata.planKey) throw Object.assign(new Error('Checkout plan does not match the selected organization plan'), { code: 'CHECKOUT_PLAN_MISMATCH' })
      await prisma.$executeRawUnsafe(
        'UPDATE "OrganizationBilling" SET "stripeCustomerId"=COALESCE("stripeCustomerId",$2), "stripeCheckoutSessionId"=$3, "updatedAt"=NOW() WHERE "organizationId"=$1',
        organizationId,
        stripeObjectId(object.customer),
        object.id
      )
      await syncSubscriptionById(stripe, stripeObjectId(object.subscription), config, event.created)
      return
    }
    if (['customer.subscription.created', 'customer.subscription.updated'].includes(event.type)) {
      await syncSubscriptionById(stripe, object.id, config, event.created)
      return
    }
    if (event.type === 'customer.subscription.deleted') {
      await syncSubscription(stripe, object, config, event.created)
      return
    }
    if (['invoice.payment_succeeded', 'invoice.payment_failed'].includes(event.type)) {
      await syncSubscriptionById(stripe, invoiceSubscriptionId(object), config, event.created)
      return
    }
    if (event.type === 'customer.subscription.trial_will_end') {
      const organizationId = await syncSubscriptionById(stripe, object.id, config, event.created)
      if (organizationId) {
        await prisma.$executeRawUnsafe(
          'UPDATE "OrganizationBilling" SET "trialEndingNoticeAt"=COALESCE("trialEndingNoticeAt",NOW()), "updatedAt"=NOW() WHERE "organizationId"=$1',
          organizationId
        )
      }
    }
  }

  async function handleWebhook(req, res) {
    const config = stripeConfig()
    if (!config.webhookSecret || !config.secretKey) {
      safeJson(res, 503, { error: 'Webhook is not configured.' })
      return
    }
    let stripe
    try { stripe = getStripe(config) } catch {
      safeJson(res, 503, { error: 'Webhook is not configured.' })
      return
    }
    const rawBody = await readRequestBody(req, 1024 * 1024)
    const signature = String(req.headers['stripe-signature'] || '')
    let event
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, config.webhookSecret)
    } catch {
      safeJson(res, 400, { error: 'Invalid Stripe signature.' })
      return
    }
    const claimed = await claimWebhookEvent(event)
    if (!claimed) {
      safeJson(res, 200, { received: true, duplicate: true })
      return
    }
    try {
      await processWebhookEvent(stripe, event, config)
      await markWebhookEvent(event.id, 'processed', null)
      safeJson(res, 200, { received: true })
    } catch (error) {
      await markWebhookEvent(event.id, 'failed', String(error && (error.code || error.message) || 'processing failed'))
      console.error('Stripe webhook processing failed', {
        eventId: event.id,
        eventType: event.type,
        error: compactStripeError(error),
      })
      safeJson(res, 500, { error: 'Webhook processing failed.' })
    }
  }

  async function handleCheckout(req, res) {
    const session = await requireOwner(req, res)
    if (!session) return
    const config = stripeConfig()
    if (!config.ready) {
      safeJson(res, 503, { error: '現在、お支払い情報を取得できません。しばらくしてから再度お試しください。' })
      return
    }
    if (!validSameOrigin(req, config.appUrl)) {
      safeJson(res, 403, { error: 'Invalid origin.' })
      return
    }
    const billing = await getBilling(session.organizationId)
    if (!billing) {
      safeJson(res, 409, { error: '既存店舗は自動課金の対象ではありません。移行手続きが必要です。' })
      return
    }
    if (billing.trialUsedAt) {
      safeJson(res, 409, { error: 'この店舗では無料トライアルをすでに利用しています。再度開始することはできません。' })
      return
    }
    const stripe = getStripe(config)
    try {
      await verifiedPrice(stripe, billing, config)
      const customer = await ensureStripeCustomer(stripe, billing)
      if (billing.stripeSubscriptionId) {
        const existing = await stripe.subscriptions.retrieve(billing.stripeSubscriptionId, {
          expand: ['default_payment_method', 'items.data.price'],
        })
        if (!['canceled', 'incomplete_expired'].includes(existing.status)) {
          await syncSubscription(stripe, existing, config)
          safeJson(res, 409, { error: 'この店舗にはすでに進行中の契約があります。' })
          return
        }
      }
      const subscriptions = await stripe.subscriptions.list({ customer: customer.id, status: 'all', limit: 10 })
      const openSubscription = subscriptions.data.find(function (entry) {
        return !['canceled', 'incomplete_expired'].includes(entry.status)
      })
      if (openSubscription) {
        await syncSubscription(stripe, await stripe.subscriptions.retrieve(openSubscription.id, {
          expand: ['default_payment_method', 'items.data.price'],
        }), config)
        safeJson(res, 409, { error: 'この店舗にはすでに進行中の契約があります。' })
        return
      }
      if (billing.stripeCheckoutSessionId) {
        try {
          const existingSession = await stripe.checkout.sessions.retrieve(billing.stripeCheckoutSessionId)
          if (existingSession.status === 'open' && existingSession.url) {
            const browserNavigation = String(req.headers['sec-fetch-mode'] || '') === 'navigate' || String(req.headers.accept || '').includes('text/html')
            if (browserNavigation) redirect(res, existingSession.url, 303)
            else safeJson(res, 200, { url: existingSession.url })
            return
          }
        } catch {}
      }
      const checkoutParameters = buildCheckoutParams({
        appUrl: config.appUrl,
        customerId: customer.id,
        organizationId: billing.organizationId,
        planKey: billing.planKey,
        priceId: config.prices[billing.planKey],
        trialDays: config.trialDays,
      })
      const idempotencyKey = 'salon-lien-checkout-' + billing.organizationId + '-' + billing.planKey + '-' + new Date(billing.updatedAt).getTime()
      const checkout = await stripe.checkout.sessions.create(checkoutParameters, { idempotencyKey })
      await prisma.$executeRawUnsafe(
        'UPDATE "OrganizationBilling" SET "stripeCustomerId"=$2, "stripeCheckoutSessionId"=$3, "onboardingStatus"=\'CHECKOUT_OPEN\', "updatedAt"=NOW() WHERE "organizationId"=$1 AND "trialUsedAt" IS NULL',
        billing.organizationId,
        customer.id,
        checkout.id
      )
      const browserNavigation = String(req.headers['sec-fetch-mode'] || '') === 'navigate' || String(req.headers.accept || '').includes('text/html')
      if (browserNavigation) redirect(res, checkout.url, 303)
      else safeJson(res, 200, { url: checkout.url })
    } catch (error) {
      console.error('Stripe Checkout creation failed', {
        organizationId: session.organizationId,
        error: compactStripeError(error),
      })
      safeJson(res, 503, { error: error && error.code === 'PRICE_CONFIGURATION_MISMATCH' ? '料金プランの設定を確認しています。店舗サポートへご連絡ください。' : '現在、カード登録画面を開けません。しばらくしてから再度お試しください。' })
    }
  }

  async function handlePortal(req, res) {
    const session = await requireOwner(req, res)
    if (!session) return
    const config = stripeConfig()
    if (!config.ready || !validSameOrigin(req, config.appUrl)) {
      safeJson(res, config.ready ? 403 : 503, { error: config.ready ? 'Invalid origin.' : '現在、お支払い情報を取得できません。' })
      return
    }
    const billing = await getBilling(session.organizationId)
    if (!billing || !billing.stripeCustomerId) {
      safeJson(res, 409, { error: '登録済みのお支払い情報がありません。' })
      return
    }
    try {
      const parameters = {
        customer: billing.stripeCustomerId,
        return_url: config.appUrl + '/admin/owner-analytics?section=billing',
      }
      if (config.portalConfiguration) parameters.configuration = config.portalConfiguration
      const portal = await getStripe(config).billingPortal.sessions.create(parameters)
      const browserNavigation = String(req.headers['sec-fetch-mode'] || '') === 'navigate' || String(req.headers.accept || '').includes('text/html')
      if (browserNavigation) redirect(res, portal.url, 303)
      else safeJson(res, 200, { url: portal.url })
    } catch (error) {
      console.error('Stripe portal creation failed', {
        organizationId: session.organizationId,
        error: compactStripeError(error),
      })
      safeJson(res, 503, { error: '現在、お支払い情報を取得できません。しばらくしてから再度お試しください。' })
    }
  }

  function billingPayload(billing, config) {
    if (!billing) return { legacyExempt: true }
    const trialEnd = billing.trialEndsAt ? new Date(billing.trialEndsAt) : null
    const remainingTrialDays = trialEnd
      ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86400000))
      : null
    return {
      legacyExempt: false,
      planKey: billing.planKey,
      planName: billing.displayName,
      monthlyAmount: Number(billing.monthlyAmount),
      currency: billing.currency,
      onboardingStatus: billing.onboardingStatus,
      subscriptionStatus: billing.subscriptionStatus,
      subscriptionStatusLabel: safeStatusLabel(billing.subscriptionStatus),
      trialStartedAt: billing.trialStartedAt,
      trialEndsAt: billing.trialEndsAt,
      trialUsedAt: billing.trialUsedAt,
      remainingTrialDays,
      currentPeriodStart: billing.currentPeriodStart,
      currentPeriodEnd: billing.currentPeriodEnd,
      cancelAtPeriodEnd: Boolean(billing.cancelAtPeriodEnd),
      card: billing.paymentMethodLast4 ? {
        brand: billing.paymentMethodBrand,
        last4: billing.paymentMethodLast4,
        expMonth: billing.paymentMethodExpMonth,
        expYear: billing.paymentMethodExpYear,
      } : null,
      configured: config.ready,
      trialDays: config.trialDays,
      mode: config.mode,
    }
  }

  async function handleStatus(req, res) {
    const session = await sessionProvider(req)
    if (!session || !session.organizationId) {
      safeJson(res, 401, { error: '認証が必要です。' })
      return
    }
    const config = stripeConfig()
    let billing = await getBilling(session.organizationId)
    const refresh = req.url && new URL(req.url, 'http://local').searchParams.get('refresh') === '1'
    if (refresh && billing && billing.stripeSubscriptionId && config.ready && isOwner(session)) {
      try {
        await syncSubscriptionById(getStripe(config), billing.stripeSubscriptionId, config)
        billing = await getBilling(session.organizationId)
      } catch (error) {
        console.warn('Stripe status refresh unavailable', {
          organizationId: session.organizationId,
          error: compactStripeError(error),
        })
      }
    }
    safeJson(res, 200, billingPayload(billing, config))
  }

  async function handlePlanChange(req, res) {
    const session = await requireOwner(req, res)
    if (!session) return
    const config = stripeConfig()
    if (!config.ready || !validSameOrigin(req, config.appUrl)) {
      safeJson(res, config.ready ? 403 : 503, { error: config.ready ? 'Invalid origin.' : '課金設定が完了していません。' })
      return
    }
    const body = parseFormBody(await readRequestBody(req), req.headers['content-type'])
    const planKey = String(body.planKey || '')
    if (!PLAN_KEYS.includes(planKey)) {
      safeJson(res, 400, { error: '料金プランを選択してください。' })
      return
    }
    const billing = await getBilling(session.organizationId)
    if (!billing || billing.stripeSubscriptionId || billing.trialUsedAt) {
      safeJson(res, 409, { error: '契約開始後のプラン変更はお支払い管理から行ってください。' })
      return
    }
    const plans = await getPlans()
    if (!plans.some(function (plan) { return plan.planKey === planKey })) {
      safeJson(res, 400, { error: '選択できないプランです。' })
      return
    }
    if (billing.planKey === planKey) {
      safeJson(res, 200, { ok: true })
      return
    }
    if (billing.stripeCheckoutSessionId) {
      try {
        const stripe = getStripe(config)
        const session = await stripe.checkout.sessions.retrieve(billing.stripeCheckoutSessionId)
        if (session.status === 'open') await stripe.checkout.sessions.expire(session.id)
      } catch (error) {
        console.warn('Previous Stripe Checkout session could not be expired', {
          organizationId: billing.organizationId,
          error: compactStripeError(error),
        })
        safeJson(res, 503, { error: '前回のカード登録画面を安全に終了できませんでした。しばらくしてから再度お試しください。' })
        return
      }
    }
    await prisma.$executeRawUnsafe(
      'UPDATE "OrganizationBilling" SET "planKey"=$2, "stripeCheckoutSessionId"=NULL, "onboardingStatus"=\'PAYMENT_REQUIRED\', "updatedAt"=NOW() WHERE "organizationId"=$1 AND "stripeSubscriptionId" IS NULL AND "trialUsedAt" IS NULL',
      session.organizationId,
      planKey
    )
    safeJson(res, 200, { ok: true })
  }

  function planCards(plans, selected, radioName) {
    return '<div class="grid">' + plans.map(function (plan) {
      const checked = plan.planKey === selected ? ' checked' : ''
      const staff = plan.staffLimit == null ? 'スタッフ数 無制限' : 'スタッフ ' + plan.staffLimit + '名まで'
      const customers = plan.customerLimit == null ? '顧客数 無制限' : '顧客 ' + Number(plan.customerLimit).toLocaleString('ja-JP') + '名まで'
      const sms = 'SMS ' + Number(plan.smsLimit || 0).toLocaleString('ja-JP') + '件目安'
      return '<label class="plan ' + (checked ? 'selected' : '') + '"><input type="radio" name="' + radioName + '" value="' + htmlEscape(plan.planKey) + '" data-amount="' + Number(plan.monthlyAmount) + '"' + checked + ' required>' +
        '<div class="planHead"><h3>' + htmlEscape(plan.displayName) + 'プラン</h3><span class="planCheck">' + uiIcon('check') + '</span></div>' +
        (plan.planKey === 'take' ? '<span class="recommend">おすすめ</span>' : '<span style="height:23px"></span>') +
        '<div class="price">' + centsToYen(plan.monthlyAmount) + '円 <small>/ 月（税込）</small></div>' +
        '<div class="planFeatures"><span>' + uiIcon('check') + htmlEscape(staff) + '</span><span>' + uiIcon('check') + htmlEscape(customers) + '</span><span>' + uiIcon('check') + htmlEscape(sms) + '</span></div></label>'
    }).join('') + '</div>'
  }

  async function findRegistrationVerification(token) {
    if (!/^[A-Za-z0-9_-]{40,100}$/.test(String(token || ''))) return null
    const rows = await prisma.$queryRawUnsafe(
      'SELECT "id","email","expiresAt" FROM "StoreRegistrationVerification" WHERE "tokenHash"=$1 AND "consumedAt" IS NULL AND "expiresAt">NOW() LIMIT 1',
      registrationTokenHash(crypto, token)
    )
    return rows[0] || null
  }

  function registrationIntro(config) {
    return '<div class="registrationIntro"><section class="hero"><span class="eyebrow">SALON BUSINESS PLATFORM</span><h1>サロン運営を、<br>もっと美しく。</h1><p>予約・顧客・会計・商品をひとつの場所へ。店舗ごとに独立した専用環境を、カード登録後' + config.trialDays + '日間無料でお試しいただけます。</p><div class="trustRow"><div class="trustItem">' + uiIcon('card') + '<span><strong>本日の請求 0円</strong><br>無料期間終了まで請求なし</span></div><div class="trustItem">' + uiIcon('shield') + '<span><strong>店舗単位で安全に分離</strong><br>他店舗のログインやデータは影響なし</span></div><div class="trustItem">' + uiIcon('lock') + '<span><strong>メール所有確認</strong><br>確認済みのアドレスだけで登録</span></div></div></section>' +
      '<aside class="benefitCard"><span class="eyebrow" style="color:#efc5b5">' + config.trialDays + ' DAYS FREE</span><h2>はじめる前に、<br>十分にお試しください。</h2><p style="opacity:.72;font-size:12px;line-height:1.8">無料期間中は選択したプランの機能をご利用いただけます。</p><div class="benefitList"><div>' + uiIcon('check') + '<span>本日のお支払いは0円</span></div><div>' + uiIcon('check') + '<span>無料期間中の解約は料金なし</span></div><div>' + uiIcon('check') + '<span>別端末・別店舗から独立した環境</span></div></div></aside></div>'
  }

  async function registrationPage(req, res, url) {
    const config = stripeConfig()
    const token = String(url.searchParams.get('token') || '')
    const verification = token ? await findRegistrationVerification(token) : null
    const error = String(url.searchParams.get('error') || '')
    let errorText = ''
    if (error === 'input') errorText = '入力内容を確認してください。'
    if (error === 'duplicate') errorText = '同じメールアドレスまたは店舗IDが登録されています。'
    if (error === 'registered') errorText = 'このメールアドレスは登録済みです。'
    if (error === 'locked') errorText = '操作回数が多すぎます。しばらくしてから再度お試しください。'
    if (error === 'mail') errorText = '確認メールを送信できませんでした。しばらくしてから再度お試しください。'
    if (error === 'expired' || (token && !verification)) errorText = '確認リンクが無効か、有効期限が切れています。メールアドレスからやり直してください。'
    if (error === 'server') errorText = '登録を完了できませんでした。しばらくしてから再度お試しください。'
    const readiness = config.ready ? '' : '<div class="notice warn">新規店舗の課金受付は現在準備中です。既存店舗の管理画面には影響ありません。</div>'
    if (!verification) {
      const sent = url.searchParams.get('sent') === '1'
      const registered = url.searchParams.get('registered') === '1'
      const actionCard = sent
        ? '<section class="card emailVerificationCard"><span class="verificationMark">' + uiIcon('mail') + '</span><h2>確認メールを送信しました</h2><p>メール内の「店舗登録を続ける」リンクを開いてください。リンクを開くまでは、店舗アカウントは作成されません。</p><div class="notice info">メールが届かない場合は、迷惑メールフォルダと入力したアドレスをご確認ください。</div><a class="btn secondary" href="/admin/register">別のメールアドレスでやり直す</a></section>'
        : (registered
          ? '<section class="card emailVerificationCard"><span class="verificationMark">' + uiIcon('store') + '</span><h2>このメールアドレスは登録済みです。</h2><p>店舗管理画面へログインするか、ログイン情報の再設定をご利用ください。</p><div class="actions"><a class="btn primary" href="/admin/login">店舗ログインへ</a><a class="btn secondary" href="/admin/password-reset">ログイン情報を再設定</a></div></section>'
          : '<form method="post" action="/admin/register"><section class="card emailVerificationCard"><div class="sectionHeading"><span class="sectionIcon">' + uiIcon('mail') + '</span><div><h2>メールアドレスを確認</h2><p>ご本人が受信できるアドレスだけで店舗登録を開始できます。</p></div></div><div class="field emailField"><label for="email">ログイン用メールアドレス</label><input id="email" type="email" name="email" maxlength="254" autocomplete="email" inputmode="email" placeholder="owner@example.com" required><span class="fieldHint">確認リンクの有効期限は' + registrationTokenMinutes() + '分です。アカウントはリンクを開いた後に作成します。</span></div><div class="submitBar"><p class="muted small">入力しただけでは登録されません。確認メールを受信し、リンクを開いてください。</p><button class="btn primary" type="submit"' + (!config.ready ? ' disabled' : '') + '>' + uiIcon('mail') + '確認メールを送信</button></div></section></form>')
      const content = '<div class="registrationWrap">' + onboardingSteps(1) + registrationIntro(config) + readiness + (errorText ? '<div class="notice danger" role="alert">' + htmlEscape(errorText) + '</div>' : '') + actionCard + '</div>'
      sendHtml(res, config.ready ? 200 : 503, pageShell('新規店舗登録', content, null, { wide: true }))
      return
    }
    const plans = await getPlans()
    const content = '<div class="registrationWrap">' + onboardingSteps(1) + registrationIntro(config) + readiness + (errorText ? '<div class="notice danger" role="alert">' + htmlEscape(errorText) + '</div>' : '') +
      '<form method="post" action="/admin/register"><input type="hidden" name="verificationToken" value="' + htmlEscape(token) + '"><section class="card" style="margin-top:20px"><div class="sectionHeading"><span class="sectionIcon">' + uiIcon('store') + '</span><div><h2>店舗・オーナー情報</h2><p>メール確認済みのアドレスで、店舗専用の管理環境を作成します。</p></div></div><div class="verifiedEmail">' + uiIcon('check') + '<span><small>確認済みメールアドレス</small><strong>' + htmlEscape(verification.email) + '</strong></span></div><div class="formGrid"><div class="field"><label for="organizationName">店舗名</label><input id="organizationName" name="organizationName" maxlength="100" autocomplete="organization" placeholder="例：Salon de Lien 青山店" required></div><div class="field"><label for="slug">店舗ID</label><input id="slug" name="slug" pattern="[a-z0-9-]{3,48}" maxlength="48" placeholder="例：salon-aoyama" aria-describedby="slugHint" required><span id="slugHint" class="fieldHint">英小文字・数字・ハイフンで3〜48文字</span></div><div class="field"><label for="displayName">オーナー名</label><input id="displayName" name="displayName" maxlength="80" autocomplete="name" placeholder="例：山田 花子" required></div><div class="field"><label for="password">オーナー用パスワード</label><input id="password" type="password" name="password" minlength="10" maxlength="128" autocomplete="new-password" placeholder="10文字以上" aria-describedby="passwordHint" required><span id="passwordHint" class="fieldHint">オーナー権限の個人アカウント専用です</span></div><div class="field"><label for="storeLoginId">店舗共通ログインID</label><input id="storeLoginId" name="storeLoginId" pattern="[a-z0-9._-]{3,80}" maxlength="80" placeholder="例：salon-aoyama-store" required><span class="fieldHint">スタッフ共通で利用する、オーナーとは別のアカウントです</span></div><div class="field"><label for="storePassword">店舗共通パスワード</label><input id="storePassword" type="password" name="storePassword" minlength="10" maxlength="128" autocomplete="new-password" placeholder="10文字以上" required><span class="fieldHint">オーナー用とは別のパスワードを推奨します</span></div></div></section>' +
      '<section class="card"><div class="sectionHeading"><span class="sectionIcon">' + uiIcon('sparkle') + '</span><div><h2>料金プランを選択</h2><p>無料期間中も、選択したプランの範囲でご利用いただけます。</p></div></div>' + planCards(plans, 'take', 'planKey') + '</section>' +
      '<section class="card"><div class="onboardingLayout"><div><div class="sectionHeading"><span class="sectionIcon">' + uiIcon('shield') + '</span><div><h2>お申し込み内容の確認</h2><p>カード登録前に、料金と自動更新についてご確認ください。</p></div></div><label class="check"><input type="checkbox" name="termsAccepted" value="yes" required><span><a href="/terms" target="_blank" rel="noopener">利用規約</a>と<a href="/privacy" target="_blank" rel="noopener">プライバシーポリシー</a>、無料期間終了後の自動更新に同意します。</span></label></div><div class="summary"><dl><dt>無料トライアル</dt><dd>' + config.trialDays + '日間</dd><dt>本日の請求</dt><dd>0円</dd><dt>初回請求</dt><dd>カード登録から' + config.trialDays + '日後</dd></dl></div></div><div class="submitBar"><p class="muted small">次の画面でStripeへ移動します。カード番号やCVCをSalon de Lienが保存することはありません。</p><button class="btn primary" type="submit">' + uiIcon('card') + 'アカウントを作成して次へ</button></div></section></form>' +
      '<script>(function(){function syncPlans(){document.querySelectorAll(".plan").forEach(function(card){var input=card.querySelector("input[type=radio]");card.classList.toggle("selected",Boolean(input&&input.checked))})}document.querySelectorAll(".plan input").forEach(function(input){input.addEventListener("change",syncPlans)});syncPlans()})()</script></div>'
    sendHtml(res, 200, pageShell('新規店舗登録', content, null, { wide: true }))
  }

  function registrationRateLimited(req) {
    const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim()
    const now = Date.now()
    const current = registrationAttempts.get(ip)
    if (!current || current.resetAt <= now) {
      registrationAttempts.set(ip, { count: 1, resetAt: now + 3600000 })
      return false
    }
    current.count += 1
    registrationAttempts.set(ip, current)
    return current.count > 5
  }

  async function registerOrganization(req, res) {
    const config = stripeConfig()
    if (!config.ready) return redirect(res, '/admin/register?error=server')
    if (!validSameOrigin(req, config.appUrl)) {
      safeJson(res, 403, { error: 'Invalid origin.' })
      return
    }
    if (registrationRateLimited(req)) return redirect(res, '/admin/register?error=locked')
    if (!process.env.ADMIN_AUTH_SECRET || process.env.ADMIN_AUTH_SECRET.length < 32) return redirect(res, '/admin/register?error=server')
    const body = parseFormBody(await readRequestBody(req), req.headers['content-type'])
    const verificationToken = String(body.verificationToken || '')
    if (!verificationToken) {
      const requestedEmail = normalizeEmail(body.email)
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requestedEmail) || requestedEmail.length > 254) return redirect(res, '/admin/register?error=input')
      const existing = await prisma.$queryRawUnsafe('SELECT "id" FROM "AppUser" WHERE "role" IN (\'ADMIN\',\'STAFF\',\'MANUFACTURER\') AND (lower("email")=$1 OR lower("loginId")=$1) LIMIT 1', requestedEmail)
      if (existing[0]) return redirect(res, '/admin/register?registered=1')
      {
        const rawToken = crypto.randomBytes(32).toString('base64url')
        const tokenHash = registrationTokenHash(crypto, rawToken)
        const verificationId = randomId(crypto, 'storeverify')
        const expiresMinutes = registrationTokenMinutes()
        await prisma.$transaction(async function (tx) {
          await tx.$executeRawUnsafe('UPDATE "StoreRegistrationVerification" SET "consumedAt"=COALESCE("consumedAt",NOW()),"updatedAt"=NOW() WHERE "email"=$1 AND "consumedAt" IS NULL', requestedEmail)
          await tx.$executeRawUnsafe('INSERT INTO "StoreRegistrationVerification" ("id","email","tokenHash","expiresAt","createdAt","updatedAt") VALUES ($1,$2,$3,NOW()+($4::int*INTERVAL \'1 minute\'),NOW(),NOW())', verificationId, requestedEmail, tokenHash, expiresMinutes)
        })
        try {
          await registrationMailSender({
            to: requestedEmail,
            verificationUrl: config.appUrl + '/admin/register?token=' + encodeURIComponent(rawToken),
            expiresMinutes,
          })
        } catch (error) {
          await prisma.$executeRawUnsafe('UPDATE "StoreRegistrationVerification" SET "consumedAt"=NOW(),"updatedAt"=NOW() WHERE "id"=$1', verificationId).catch(function () {})
          console.error('Store registration verification mail failed', { code: String(error && error.code || 'unknown').slice(0, 80) })
          return redirect(res, '/admin/register?error=mail')
        }
      }
      return redirect(res, '/admin/register?sent=1')
    }
    const verification = await findRegistrationVerification(verificationToken)
    if (!verification) return redirect(res, '/admin/register?error=expired')
    const registrationRetryUrl = '/admin/register?token=' + encodeURIComponent(verificationToken) + '&error='
    const organizationName = String(body.organizationName || '').trim()
    const slug = normalizeSlug(body.slug)
    const displayName = String(body.displayName || '').trim()
    const email = normalizeEmail(verification.email)
    const password = String(body.password || '')
    const storeLoginId = String(body.storeLoginId || '').trim().toLowerCase()
    const storePassword = String(body.storePassword || '')
    const planKey = String(body.planKey || '')
    const valid = organizationName.length >= 2 && organizationName.length <= 100 &&
      slug.length >= 3 && slug.length <= 48 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) &&
      displayName.length >= 1 && displayName.length <= 80 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254 &&
      password.length >= 10 && password.length <= 128 &&
      /^[a-z0-9._-]{3,80}$/.test(storeLoginId) &&
      storePassword.length >= 10 && storePassword.length <= 128 &&
      PLAN_KEYS.includes(planKey) && body.termsAccepted === 'yes'
    if (!valid) return redirect(res, registrationRetryUrl + 'input')
    const plans = await getPlans()
    if (!plans.some(function (plan) { return plan.planKey === planKey })) return redirect(res, registrationRetryUrl + 'input')
    const organizationId = randomId(crypto, 'org')
    const userId = randomId(crypto, 'usr')
    const sharedUserId = randomId(crypto, 'usr')
    const sharedEmail = 'store-' + crypto.createHash('sha256').update(organizationId).digest('hex').slice(0, 16) + '@accounts.invalid'
    const hash = passwordHash(crypto, password)
    const sharedHash = passwordHash(crypto, storePassword)
    const verificationHash = registrationTokenHash(crypto, verificationToken)
    try {
      await prisma.$transaction(async function (tx) {
        const locked = await tx.$queryRawUnsafe('SELECT "id","email" FROM "StoreRegistrationVerification" WHERE "tokenHash"=$1 AND "consumedAt" IS NULL AND "expiresAt">NOW() FOR UPDATE', verificationHash)
        if (!locked[0] || normalizeEmail(locked[0].email) !== email) throw Object.assign(new Error('Registration verification expired'), { code: 'REGISTRATION_VERIFICATION_EXPIRED' })
        await tx.$executeRawUnsafe(
          'INSERT INTO "Organization" ("id","slug","name","createdAt","updatedAt") VALUES ($1,$2,$3,NOW(),NOW())',
          organizationId,
          slug,
          organizationName
        )
        await tx.$executeRawUnsafe(
          'INSERT INTO "AppUser" ("id","organizationId","email","loginId","displayName","passwordHash","role","active","createdAt","updatedAt") VALUES ($1,$2,$3,$3,$4,$5,\'ADMIN\',true,NOW(),NOW())',
          userId,
          organizationId,
          email,
          displayName,
          hash
        )
        await tx.$executeRawUnsafe(
          'INSERT INTO "AppUser" ("id","organizationId","email","loginId","displayName","passwordHash","role","active","createdAt","updatedAt","isSharedStoreAccount") VALUES ($1,$2,$3,$4,$5,$6,\'STAFF\',true,NOW(),NOW(),true)',
          sharedUserId,
          organizationId,
          sharedEmail,
          storeLoginId,
          organizationName + ' Store Shared',
          sharedHash
        )
        await tx.$executeRawUnsafe(
          'INSERT INTO "OrganizationBilling" ("organizationId","planKey","onboardingStatus","subscriptionStatus","billingRequiredAt","createdAt","updatedAt") VALUES ($1,$2,\'PAYMENT_REQUIRED\',\'none\',NOW(),NOW(),NOW())',
          organizationId,
          planKey
        )
        await tx.$executeRawUnsafe('UPDATE "StoreRegistrationVerification" SET "consumedAt"=NOW(),"updatedAt"=NOW() WHERE "id"=$1', locked[0].id)
      })
    } catch (error) {
      if (String(error && error.code || '') === 'REGISTRATION_VERIFICATION_EXPIRED') return redirect(res, '/admin/register?error=expired')
      const duplicate = String(error && error.message || '').toLowerCase().includes('duplicate') ||
        String(error && error.message || '').includes('Unique constraint') ||
        String(error && error.code || '') === 'P2002' ||
        String(error && error.meta && error.meta.code || '') === '23505'
      if (duplicate) {
        return redirect(res, registrationRetryUrl + 'duplicate')
      }
      console.error('Organization registration failed', { code: String(error && error.code || 'unknown').slice(0, 80) })
      return redirect(res, registrationRetryUrl + 'server')
    }
    res.setHeader('Set-Cookie', createSessionCookie(crypto, {
      id: userId,
      email,
      organizationId,
    }, req))
    redirect(res, '/admin/owner-analytics?section=billing')
  }

  async function onboardingPage(req, res, url) {
    const session = await sessionProvider(req)
    if (!session) return redirect(res, '/admin/login?next=%2Fadmin%2Fonboarding', 307)
    if (!isOwner(session)) {
      sendHtml(res, 403, pageShell('セットアップ', '<div class="notice danger">契約設定を変更できるのはオーナーのみです。</div>', session))
      return
    }
    const config = stripeConfig()
    const billing = await getBilling(session.organizationId)
    if (!billing) {
      const content = '<section class="hero"><span class="eyebrow">LEGACY ORGANIZATION</span><h1>追加の設定は不要です</h1><p>この店舗は今回の新規課金オンボーディング対象外です。カード登録や無料トライアルが自動的に開始されることはありません。</p><div class="actions"><a class="btn primary" href="/admin/appointments">管理画面へ</a></div></section>'
      sendHtml(res, 200, pageShell('セットアップ', content, session))
      return
    }
    const plans = await getPlans()
    const checkoutState = String(url.searchParams.get('checkout') || '')
    const status = billing.subscriptionStatus
    const started = ['trialing', 'active'].includes(status)
    const blockedUsedTrial = billing.trialUsedAt && !started && status !== 'past_due'
    const projectedFirstCharge = firstChargeDate(config.trialDays)
    const checkoutNotice = checkoutState === 'cancelled'
      ? '<div class="notice warn">カード登録をキャンセルしました。無料トライアルは開始されておらず、請求も発生していません。</div>'
      : checkoutState === 'success' && !started
        ? '<div id="syncNotice" class="notice info"><span class="spinner" style="display:inline-block;vertical-align:middle;margin-right:10px"></span>お支払い情報を確認しています。Stripeからの安全な通知を待っています…</div>'
        : ''
    let statePanel = ''
    if (started) {
      statePanel = '<section class="card"><div class="sectionHeading"><span class="sectionIcon">' + uiIcon('check') + '</span><div><h2>' + (status === 'trialing' ? '無料トライアルを開始しました' : 'ご契約は利用中です') + '</h2><p>' + htmlEscape(billing.organizationName) + ' の専用環境をご利用いただけます。</p></div></div><div class="notice ok">' +
        (status === 'trialing' ? '<strong>無料期間</strong><br>' + formatJapaneseDate(billing.trialStartedAt) + ' ～ ' + formatJapaneseDate(billing.trialEndsAt) + '<br><br><strong>初回請求</strong><br>' + formatJapaneseDate(billing.trialEndsAt) + '　' + centsToYen(billing.monthlyAmount) + '円' : '<strong>次回請求予定</strong><br>' + formatJapaneseDate(billing.currentPeriodEnd)) +
        '</div><div class="actions"><a class="btn primary" href="/admin/appointments">管理画面を開く</a><button class="btn secondary portalButton" type="button">支払い・解約を管理</button></div></section>'
    } else if (status === 'past_due') {
      statePanel = '<section class="card"><div class="sectionHeading"><span class="sectionIcon">' + uiIcon('card') + '</span><div><h2>お支払い方法をご確認ください</h2><p>' + htmlEscape(billing.organizationName) + ' の契約情報です。</p></div></div><div class="notice danger"><strong>お支払いを確認できませんでした。</strong><br>Stripeの再試行中です。サービス継続のため、支払い方法をご確認ください。</div><div class="actions"><button class="btn primary portalButton" type="button">支払い情報を確認</button></div></section>'
    } else if (blockedUsedTrial) {
      statePanel = '<section class="card"><div class="sectionHeading"><span class="sectionIcon">' + uiIcon('store') + '</span><div><h2>' + htmlEscape(billing.organizationName) + '</h2><p>この端末でログイン中の店舗</p></div></div><div class="notice danger">この店舗では無料トライアルをすでに利用しています。再度無料期間を開始することはできません。契約再開については店舗サポートへお問い合わせください。</div><div class="actions"><form method="post" action="/api/auth/admin/logout"><button class="btn secondary" type="submit">別の店舗でログインする</button></form></div></section>'
    } else {
      statePanel = '<form id="checkoutForm" class="onboardingLayout"><section class="card"><div class="sectionHeading"><span class="sectionIcon">' + uiIcon('sparkle') + '</span><div><h2>ご利用プラン</h2><p>店舗規模に合わせて選択できます。後から変更も可能です。</p></div></div>' + planCards(plans, billing.planKey, 'planKey') + '</section>' +
        '<aside class="billingAside"><section class="card"><div class="sectionHeading"><span class="sectionIcon">' + uiIcon('card') + '</span><div><h2>お申し込み内容</h2><p>Stripeへ移動する前の最終確認</p></div></div><div class="summary"><dl><dt>選択中のプラン</dt><dd id="selectedPlan">' + htmlEscape(billing.displayName) + 'プラン</dd><dt>月額料金</dt><dd id="monthlyAmount">' + centsToYen(billing.monthlyAmount) + '円</dd><dt>無料トライアル</dt><dd>' + config.trialDays + '日間</dd><dt>本日の請求</dt><dd style="color:var(--ok)">0円</dd><dt>初回請求予定日</dt><dd>' + formatJapaneseDate(projectedFirstCharge) + '</dd><dt>初回請求予定額</dt><dd id="firstAmount">' + centsToYen(billing.monthlyAmount) + '円</dd></dl></div><div class="notice info"><strong>無料期間中の解約は0円</strong><br>無料期間終了後は、解約されるまで毎月自動更新されます。</div><button id="checkoutButton" class="btn primary" style="width:100%" type="submit"' + (!config.ready ? ' disabled' : '') + '>' + uiIcon('card') + 'カードを登録して' + config.trialDays + '日間無料で始める</button><p id="checkoutError" class="muted small" role="alert"></p><div class="trustRow" style="grid-template-columns:1fr"><div class="trustItem">' + uiIcon('lock') + '<span>カード番号・CVCはStripeが安全に管理し、Salon de Lienでは保持しません。</span></div></div></section></aside></form>'
    }
    const configurationNotice = config.ready
      ? (config.mode === 'test' ? '<span class="testChip">' + uiIcon('shield') + 'Stripe Test Mode・本番カードへの課金なし</span>' : '')
      : '<div class="notice warn">課金受付の安全な接続設定が完了していないため、現在カード登録を開始できません。既存機能には影響ありません。</div>'
    const currentStep = started ? 4 : 3
    const content = onboardingSteps(currentStep) + '<section class="hero"><span class="eyebrow">WELCOME TO SALON DE LIEN</span><h1>' + (started ? 'セットアップが完了しました' : '最後に、お支払い方法を登録') + '</h1><p><strong>' + htmlEscape(billing.organizationName) + '</strong> の店舗専用環境です。別の端末や別店舗のログインで、この店舗の契約・データが切り替わることはありません。</p><div style="margin-top:18px">' + configurationNotice + '</div></section>' +
      checkoutNotice + statePanel +
      '<script>(function(){function money(value){return new Intl.NumberFormat("ja-JP").format(Number(value||0))+"円"}function syncPlans(){document.querySelectorAll(".plan").forEach(function(card){var input=card.querySelector("input[type=radio]");card.classList.toggle("selected",Boolean(input&&input.checked));if(input&&input.checked){var name=card.querySelector("h3");var amount=input.getAttribute("data-amount");var selected=document.getElementById("selectedPlan");var monthly=document.getElementById("monthlyAmount");var first=document.getElementById("firstAmount");if(selected&&name)selected.textContent=name.textContent;if(monthly)monthly.textContent=money(amount);if(first)first.textContent=money(amount)}})}document.querySelectorAll(".plan input").forEach(function(input){input.addEventListener("change",syncPlans)});syncPlans();var form=document.getElementById("checkoutForm");var error=document.getElementById("checkoutError");if(form){form.addEventListener("submit",async function(event){event.preventDefault();var button=document.getElementById("checkoutButton");button.disabled=true;error.textContent="";try{var planKey=new FormData(form).get("planKey");var plan=await fetch("/api/admin/billing/plan",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({planKey:planKey})});var planData=await plan.json();if(!plan.ok)throw new Error(planData.error||"プランを保存できません。");var response=await fetch("/api/admin/billing/checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});var data=await response.json();if(!response.ok||!data.url)throw new Error(data.error||"カード登録画面を開けません。");location.assign(data.url)}catch(e){error.textContent=e.message;button.disabled=false}})}document.querySelectorAll(".portalButton").forEach(function(button){button.addEventListener("click",async function(){button.disabled=true;try{var response=await fetch("/api/admin/billing/portal",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});var data=await response.json();if(!response.ok||!data.url)throw new Error(data.error||"お支払い管理を開けません。");location.assign(data.url)}catch(e){alert(e.message);button.disabled=false}})});var notice=document.getElementById("syncNotice");if(notice){var attempts=0;var timer=setInterval(async function(){attempts++;try{var response=await fetch("/api/admin/billing/status?refresh=1",{cache:"no-store"});var data=await response.json();if(data.subscriptionStatus==="trialing"||data.subscriptionStatus==="active"){clearInterval(timer);location.replace("/admin/onboarding?checkout=confirmed")}}catch(e){}if(attempts>=30){clearInterval(timer);notice.textContent="確認に時間がかかっています。ページを再読み込みして状態をご確認ください。"}},2000)}})()</script>'
    sendHtml(res, 200, pageShell('無料トライアル設定', content, session, { setup: !started, wide: true, organizationName: billing.organizationName }))
  }

  async function monthlySmsCount(organizationId) {
    try {
      const rows = await prisma.$queryRawUnsafe(
        'SELECT COUNT(*)::int AS count FROM "SmsSendLog" WHERE "organizationId"=$1 AND "success"=true AND "sentAt" >= date_trunc(\'month\', NOW())',
        organizationId
      )
      return Number(rows[0] && rows[0].count || 0)
    } catch {
      return 0
    }
  }

  function portalScript() {
    return '<script>document.querySelectorAll(".portalButton").forEach(function(button){button.addEventListener("click",async function(){button.disabled=true;try{var response=await fetch("/api/admin/billing/portal",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});var data=await response.json();if(!response.ok||!data.url)throw new Error(data.error||"お支払い管理を開けません。");location.assign(data.url)}catch(e){alert(e.message);button.disabled=false}})})</script>'
  }

  async function billingPage(req, res) {
    const session = await sessionProvider(req)
    if (!session) return redirect(res, '/admin/login?next=%2Fadmin%2Fowner-analytics%3Fsection%3Dbilling', 307)
    if (!isOwner(session)) {
      sendHtml(res, 403, pageShell('システム利用料', '<div class="notice danger">システム利用料を確認できるのはオーナーのみです。</div>', session, { billing: true }))
      return
    }
    const config = stripeConfig()
    const plans = await getPlans()
    const billing = await getBilling(session.organizationId)
    const smsCount = await monthlySmsCount(session.organizationId)
    const smsEstimate = smsCount * 15
    if (!billing) {
      const legacyKey = PLAN_KEYS.includes(process.env.SALON_PLAN_TIER) ? process.env.SALON_PLAN_TIER : 'take'
      const legacyPlan = plans.find(function (plan) { return plan.planKey === legacyKey }) || plans[1]
      const content = '<section class="hero"><span class="eyebrow">SYSTEM BILLING</span><h1>システム利用料</h1><p>基本プランとSMS利用状況を確認します。</p></section>' +
        '<div class="notice info"><strong>既存契約（Stripe未接続）</strong><br>この店舗は新規課金オンボーディング対象外です。今回の更新だけでStripe Customer、Subscription、無料トライアル、請求が作成されることはありません。</div>' +
        '<section class="metrics"><div class="metric"><div class="label">現在のプラン</div><div class="value">' + htmlEscape(legacyPlan.displayName) + '</div></div><div class="metric"><div class="label">基本利用料</div><div class="value">' + centsToYen(legacyPlan.monthlyAmount) + '円 / 月</div></div><div class="metric"><div class="label">SMS利用料（概算）</div><div class="value">' + centsToYen(smsEstimate) + '円</div></div><div class="metric"><div class="label">今月の請求見込み</div><div class="value">' + centsToYen(Number(legacyPlan.monthlyAmount) + smsEstimate) + '円</div></div></section>' +
        '<section class="card" style="margin-top:20px"><h2>当月の利用明細</h2><div class="summary"><dl><dt>基本利用料</dt><dd>' + centsToYen(legacyPlan.monthlyAmount) + '円</dd><dt>SMS ' + smsCount + '件 × 15円</dt><dd>' + centsToYen(smsEstimate) + '円（概算）</dd></dl></div><p class="muted small">SMS利用料は既存の見込み計算です。今回のStripe Subscription実課金には含めていません。</p></section>' +
        '<section class="card"><h2>料金プラン</h2>' + planCards(plans, legacyKey, 'legacyPlan') + '</section>'
      sendHtml(res, 200, pageShell('システム利用料', content, session, { billing: true }))
      return
    }
    const payload = billingPayload(billing, config)
    const totalEstimate = Number(billing.monthlyAmount) + smsEstimate
    const nextDate = billing.subscriptionStatus === 'trialing' ? billing.trialEndsAt : billing.currentPeriodEnd
    const card = payload.card
      ? String(payload.card.brand || 'CARD').toUpperCase() + ' •••• ' + htmlEscape(payload.card.last4) + '<br><small>有効期限 ' + String(payload.card.expMonth).padStart(2, '0') + '/' + String(payload.card.expYear).slice(-2) + '</small>'
      : '未登録'
    let alert = ''
    if (billing.subscriptionStatus === 'past_due') alert = '<div class="notice danger"><strong>お支払いを確認できませんでした。</strong><br>サービス継続のため、支払い方法をご確認ください。Stripeの支払い再試行中は猶予状態として利用できます。<div class="actions"><button class="btn primary portalButton">支払い情報を確認</button></div></div>'
    if (billing.subscriptionStatus === 'trialing') alert = '<div class="notice ok"><strong>無料トライアル中</strong><br>無料期間終了まであと ' + payload.remainingTrialDays + '日です。' + formatJapaneseDate(billing.trialEndsAt) + 'から' + centsToYen(billing.monthlyAmount) + '円 / 月の請求が開始されます。</div>'
    if (billing.cancelAtPeriodEnd) alert += '<div class="notice warn">期間終了時に解約される設定です。' + formatJapaneseDate(nextDate) + '以降の自動更新はありません。</div>'
    if (!config.ready) alert += '<div class="notice warn">現在、Stripeのお支払い情報を取得できません。予約・顧客管理全体は停止せず、課金操作だけを一時停止しています。</div>'
    const content = '<section class="hero"><span class="eyebrow">SYSTEM BILLING</span><h1>システム利用料</h1><p>契約状況、次回請求、カード情報、SMS利用見込みを確認します。</p></section>' + alert +
      '<section class="metrics"><div class="metric"><div class="label">現在のプラン</div><div class="value">' + htmlEscape(billing.displayName) + '</div></div><div class="metric"><div class="label">ステータス</div><div class="value"><span class="status ' + htmlEscape(billing.subscriptionStatus) + '">' + htmlEscape(safeStatusLabel(billing.subscriptionStatus)) + '</span></div></div><div class="metric"><div class="label">基本利用料</div><div class="value">' + centsToYen(billing.monthlyAmount) + '円 / 月</div></div><div class="metric"><div class="label">今回の請求</div><div class="value">' + (billing.subscriptionStatus === 'trialing' ? '0円' : centsToYen(billing.monthlyAmount) + '円') + '</div></div></section>' +
      '<section class="card" style="margin-top:20px"><div class="formGrid"><div><h2>次回請求</h2><div class="summary"><dl><dt>請求予定日</dt><dd>' + formatJapaneseDate(nextDate) + '</dd><dt>次回基本料金</dt><dd>' + centsToYen(billing.monthlyAmount) + '円</dd><dt>SMS利用料（概算）</dt><dd>' + centsToYen(smsEstimate) + '円</dd><dt>今月の合計見込み</dt><dd>' + centsToYen(totalEstimate) + '円</dd></dl></div></div><div><h2>登録カード</h2><div class="summary"><strong>' + card + '</strong></div><div class="actions"><button class="btn secondary portalButton"' + (!billing.stripeCustomerId || !config.ready ? ' disabled' : '') + '>支払い・解約を管理</button></div></div></div><p class="muted small">Stripeで実課金するのは基本月額プランのみです。SMSは現在の利用件数に基づく概算表示で、今回のStripe Subscriptionには含めていません。</p></section>' +
      '<section class="card"><h2>Customer Portalでできること</h2><p class="muted">クレジットカード変更、契約確認、解約、請求履歴・請求書確認をStripeの安全な画面で行えます。</p>' +
      (billing.subscriptionStatus === 'trialing' ? '<div class="notice info">無料トライアル中に解約した場合、料金は請求されません。</div>' : '') + '</section>' + portalScript()
    sendHtml(res, 200, pageShell('システム利用料', content, session, { billing: true }))
  }

  function allowedBillingPath(url) {
    if (url.pathname === '/admin/onboarding') return true
    if (url.pathname === '/admin/account' || url.pathname.startsWith('/admin/settings')) return true
    if (url.pathname === '/admin/owner-analytics' && url.searchParams.get('section') === 'billing') return true
    if (url.pathname.startsWith('/api/admin/billing/')) return true
    if (url.pathname.startsWith('/api/auth/admin/')) return true
    return false
  }

  function protectedStaffRequest(url) {
    if (url.pathname.startsWith('/admin/') && !url.pathname.startsWith('/admin/login') && !url.pathname.startsWith('/admin/register')) return true
    if (url.pathname.startsWith('/api/admin/')) return true
    if (STAFF_BILLING_APIS.has(url.pathname)) return true
    if (url.pathname === '/api/lien-chat') return true
    return false
  }

  async function enforceAccess(req, res, url) {
    if (!protectedStaffRequest(url) || allowedBillingPath(url)) return false
    const session = await sessionProvider(req)
    if (!session || !session.organizationId) return false
    const billing = await getBilling(session.organizationId)
    if (!billing) return false
    if (ALLOWED_STATUSES.has(billing.subscriptionStatus)) return false
    if (req.method === 'GET' || req.method === 'HEAD') {
      redirect(res, '/admin/owner-analytics?section=billing', 307)
    } else {
      safeJson(res, 402, {
        error: 'カード登録と無料トライアル開始を完了してください。',
        onboardingUrl: '/admin/owner-analytics?section=billing',
      })
    }
    return true
  }

  async function handle(req, res, url) {
    if (url.pathname === '/api/stripe/webhook') {
      if (req.method !== 'POST') {
        res.statusCode = 405
        res.setHeader('Allow', 'POST')
        return res.end()
      }
      await handleWebhook(req, res)
      return true
    }
    if (url.pathname === '/admin/register') {
      if (req.method === 'GET') await registrationPage(req, res, url)
      else if (req.method === 'POST') await registerOrganization(req, res)
      else {
        res.statusCode = 405
        res.setHeader('Allow', 'GET, POST')
        res.end()
      }
      return true
    }
    if (url.pathname === '/admin/onboarding' && req.method === 'GET') {
      const checkout = url.searchParams.get('checkout')
      redirect(res, '/admin/owner-analytics?section=billing' + (checkout ? '&checkout=' + encodeURIComponent(checkout) : ''), 307)
      return true
    }
    // The billing screen is rendered by the existing Next.js owner-analytics page.
    // Keeping this route on the normal Next.js path guarantees that it uses the
    // same AdminShell, navigation, typography and responsive layout as analytics.
    if (url.pathname === '/api/admin/billing/status' && req.method === 'GET') {
      await handleStatus(req, res)
      return true
    }
    if (url.pathname === '/api/admin/billing/checkout' && req.method === 'POST') {
      await handleCheckout(req, res)
      return true
    }
    if (url.pathname === '/api/admin/billing/portal' && req.method === 'POST') {
      await handlePortal(req, res)
      return true
    }
    if (url.pathname === '/api/admin/billing/plan' && req.method === 'POST') {
      await handlePlanChange(req, res)
      return true
    }
    return false
  }

  return {
    ensureSchema,
    enforceAccess,
    handle,
    getBilling,
  }
}

module.exports = {
  PLAN_KEYS,
  buildCheckoutParams,
  createSessionCookie,
  createBillingService,
  firstChargeDate,
  invoiceSubscriptionId,
  stripeConfig,
  subscriptionPeriod,
  trialDaysFromEnv,
}
