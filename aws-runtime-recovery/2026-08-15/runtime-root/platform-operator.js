'use strict'

const COOKIE_NAME = 'lien_platform_operator_session'
const SESSION_SECONDS = 4 * 60 * 60
const loginAttempts = new Map()

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]
  })
}

function parseCookies(header) {
  return String(header || '').split(';').reduce(function (cookies, item) {
    const index = item.indexOf('=')
    if (index < 0) return cookies
    cookies[item.slice(0, index).trim()] = decodeURIComponent(item.slice(index + 1).trim())
    return cookies
  }, {})
}

function requestOrigin(req) {
  const protocol = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim()
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim()
  return protocol + '://' + host
}

function validSameOrigin(req) {
  const origin = String(req.headers.origin || '')
  if (!origin) return false
  const allowed = new Set()
  try { allowed.add(new URL(String(process.env.APP_URL || '')).origin) } catch {}
  try { allowed.add(new URL(requestOrigin(req)).origin) } catch {}
  return allowed.has(origin)
}

function readBody(req, limit = 8192) {
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
    req.on('end', function () { resolve(Buffer.concat(chunks).toString('utf8')) })
    req.on('error', reject)
  })
}

function operatorConfig(env = process.env) {
  const email = String(env.PLATFORM_OPERATOR_EMAIL || '').trim().toLowerCase()
  const passwordHash = String(env.PLATFORM_OPERATOR_PASSWORD_HASH || '').trim()
  const authSecret = String(env.PLATFORM_OPERATOR_AUTH_SECRET || '').trim()
  return {
    email,
    passwordHash,
    authSecret,
    ready: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && /^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/i.test(passwordHash) && authSecret.length >= 32,
  }
}

function verifyPassword(crypto, password, encodedHash) {
  const parts = String(encodedHash || '').split('$')
  if (parts.length !== 3 || parts[0] !== 'scrypt' || !/^[0-9a-f]{32}$/i.test(parts[1]) || !/^[0-9a-f]{128}$/i.test(parts[2])) return false
  const actual = crypto.scryptSync(String(password || ''), parts[1], 64)
  const expected = Buffer.from(parts[2], 'hex')
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected)
}

function signSession(crypto, config, now = Date.now()) {
  const issuedAt = Math.floor(now / 1000)
  const payload = {
    version: 1,
    role: 'PLATFORM_OPERATOR',
    subject: config.email,
    issuedAt,
    expiresAt: issuedAt + SESSION_SECONDS,
    sessionId: crypto.randomUUID(),
  }
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const signature = crypto.createHmac('sha256', config.authSecret).update(body).digest('base64url')
  return body + '.' + signature
}

function safeEqual(crypto, left, right) {
  const a = Buffer.from(String(left || ''), 'utf8')
  const b = Buffer.from(String(right || ''), 'utf8')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

function verifySession(crypto, config, token, now = Date.now()) {
  if (!config.ready || !token) return null
  const parts = String(token).split('.')
  if (parts.length !== 2) return null
  const signature = crypto.createHmac('sha256', config.authSecret).update(parts[0]).digest('base64url')
  if (!safeEqual(crypto, parts[1], signature)) return null
  try {
    const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'))
    if (payload.version !== 1 || payload.role !== 'PLATFORM_OPERATOR' || payload.subject !== config.email) return null
    if (!payload.sessionId || Number(payload.expiresAt) <= Math.floor(now / 1000)) return null
    return payload
  } catch {
    return null
  }
}

function setSecurityHeaders(res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'same-origin')
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive')
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; img-src data:; form-action 'self'; base-uri 'none'; frame-ancestors 'none'")
}

function html(res, status, content) {
  res.statusCode = status
  setSecurityHeaders(res)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.end(content)
}

function redirect(res, location, status = 303) {
  res.statusCode = status
  setSecurityHeaders(res)
  res.setHeader('Location', location)
  res.end()
}

function formatYen(value) {
  return new Intl.NumberFormat('ja-JP').format(Number(value || 0)) + '円'
}

function formatNumber(value) {
  return new Intl.NumberFormat('ja-JP').format(Number(value || 0))
}

function formatDate(value, includeTime = false) {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(date.getTime())) return '—'
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date)
}

function statusLabel(value) {
  return {
    active: '利用中', trialing: '無料トライアル', past_due: '支払い確認中', unpaid: '未払い',
    canceled: '解約済み', incomplete: '契約未完了', incomplete_expired: '契約期限切れ', none: '未契約',
  }[String(value || '')] || '未設定'
}

function statusTone(value) {
  if (value === 'active') return 'good'
  if (value === 'trialing') return 'trial'
  if (value === 'past_due' || value === 'unpaid') return 'danger'
  if (value === 'canceled' || value === 'incomplete_expired') return 'mutedBadge'
  return 'pending'
}

function planName(row) {
  if (row.planName) return row.planName
  return { ume: '梅', take: '竹', matsu: '松' }[row.planKey] || '未設定'
}

function pageShell(title, body, authenticated) {
  return '<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>' + escapeHtml(title) + ' | Salon de Lien Operations</title><style>' +
    ':root{--ink:#28211d;--muted:#756a62;--line:#e9ddd4;--paper:#fffdf9;--canvas:#f6f0e9;--brand:#8f4f42;--brand2:#b76b5b;--rose:#f5e3df;--green:#2f6b50;--greenBg:#e8f4ec;--amber:#9a641f;--amberBg:#fff2dc;--red:#a33c3c;--redBg:#fdebea;--shadow:0 20px 55px rgba(71,48,40,.09)}*{box-sizing:border-box}body{margin:0;background:var(--canvas);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Hiragino Kaku Gothic ProN","Yu Gothic",Meiryo,sans-serif}.shell{min-height:100vh}.top{position:sticky;top:0;z-index:20;height:72px;border-bottom:1px solid var(--line);background:rgba(255,253,249,.96);backdrop-filter:blur(14px);display:flex;align-items:center;justify-content:space-between;padding:0 34px}.brand{display:flex;align-items:center;gap:13px}.brandMark{display:grid;width:42px;height:42px;place-items:center;border-radius:50%;background:linear-gradient(145deg,var(--brand),#6f382f);color:#fff;font:italic 22px Georgia,serif;box-shadow:0 8px 22px rgba(143,79,66,.22)}.brand strong{display:block;font:600 18px Georgia,"Yu Mincho",serif}.brand small{display:block;color:var(--muted);font-size:10px;letter-spacing:.12em;margin-top:3px}.topRight{display:flex;align-items:center;gap:10px}.readonly{display:inline-flex;align-items:center;gap:7px;border:1px solid #d8c4b9;border-radius:99px;background:#fff;padding:8px 12px;color:#6d4b42;font-size:11px;font-weight:800}.logout{border:0;background:transparent;color:var(--muted);font-weight:700;padding:10px;cursor:pointer}.main{width:min(1480px,calc(100% - 40px));margin:0 auto;padding:38px 0 70px}.hero{display:grid;grid-template-columns:1fr auto;align-items:end;gap:22px;border:1px solid var(--line);border-radius:28px;background:linear-gradient(135deg,#fffdf9,#fbf3ed);padding:34px 38px;box-shadow:var(--shadow)}.eyebrow{margin:0 0 8px;color:var(--brand2);font-size:11px;font-weight:900;letter-spacing:.15em}.hero h1{margin:0;font:700 clamp(28px,4vw,45px) Georgia,"Yu Mincho",serif}.hero p{margin:12px 0 0;color:var(--muted);line-height:1.8}.updated{color:var(--muted);font-size:11px;text-align:right}.metrics{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:14px;margin-top:20px}.metric{min-width:0;border:1px solid var(--line);border-radius:20px;background:var(--paper);padding:19px;box-shadow:0 10px 28px rgba(71,48,40,.05)}.metric .label{color:var(--muted);font-size:11px;font-weight:700}.metric .value{margin-top:8px;font:700 25px Georgia,"Yu Mincho",serif}.metric .sub{margin-top:6px;color:var(--muted);font-size:10px}.sectionGrid{display:grid;grid-template-columns:1.35fr .65fr;gap:20px;margin-top:20px}.card{border:1px solid var(--line);border-radius:24px;background:var(--paper);padding:24px;box-shadow:0 12px 34px rgba(71,48,40,.055)}.card h2{margin:0;font:700 21px Georgia,"Yu Mincho",serif}.cardIntro{display:flex;align-items:flex-end;justify-content:space-between;gap:15px;margin-bottom:20px}.cardIntro p{margin:5px 0 0;color:var(--muted);font-size:11px}.chart{height:210px;display:grid;grid-template-columns:repeat(12,minmax(24px,1fr));gap:9px;align-items:end;border-bottom:1px solid var(--line);padding:16px 4px 0}.barItem{height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:6px;min-width:0}.barValue{font-size:9px;color:var(--muted);white-space:nowrap}.bar{width:min(30px,74%);min-height:3px;border-radius:8px 8px 2px 2px;background:linear-gradient(180deg,#c97867,var(--brand));box-shadow:0 7px 16px rgba(143,79,66,.16)}.barLabel{height:22px;color:var(--muted);font-size:9px;white-space:nowrap}.list{display:grid;gap:10px;margin-top:18px}.listRow{display:grid;grid-template-columns:1fr auto;align-items:center;gap:14px;border-bottom:1px solid #f0e8e2;padding:0 0 11px}.listRow:last-child{border:0}.listRow span{color:var(--muted);font-size:12px}.listRow strong{font-size:14px}.tableCard{margin-top:20px;padding:0;overflow:hidden}.tableHead{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:24px 26px;border-bottom:1px solid var(--line)}.tableHead h2{margin:0;font:700 22px Georgia,"Yu Mincho",serif}.tableHead p{margin:5px 0 0;color:var(--muted);font-size:11px}.tableWrap{overflow:auto}.stores{width:100%;min-width:1320px;border-collapse:collapse}.stores th{position:sticky;top:0;background:#faf5f0;color:var(--muted);font-size:10px;letter-spacing:.04em;text-align:left;padding:13px 14px;border-bottom:1px solid var(--line);white-space:nowrap}.stores td{padding:15px 14px;border-bottom:1px solid #f0e8e2;vertical-align:top;font-size:12px}.stores tr:last-child td{border-bottom:0}.storeName{font-weight:800;font-size:13px}.slug{margin-top:4px;color:var(--muted);font-size:10px}.owner{font-weight:700}.ownerMail{margin-top:4px;color:var(--muted);font-size:10px}.num{text-align:right;font-variant-numeric:tabular-nums}.badge{display:inline-flex;border-radius:99px;padding:6px 9px;font-size:10px;font-weight:800;white-space:nowrap}.badge.good{background:var(--greenBg);color:var(--green)}.badge.trial{background:#e8eef9;color:#405f91}.badge.danger{background:var(--redBg);color:var(--red)}.badge.pending{background:var(--amberBg);color:var(--amber)}.badge.mutedBadge{background:#eeeae7;color:#766d67}.empty{padding:42px;text-align:center;color:var(--muted)}.loginMain{min-height:100vh;display:grid;place-items:center;padding:24px}.loginCard{width:min(460px,100%);border:1px solid var(--line);border-radius:28px;background:var(--paper);padding:34px;box-shadow:var(--shadow)}.loginBrand{display:grid;place-items:center;text-align:center}.loginBrand .brandMark{width:58px;height:58px;font-size:28px}.loginCard h1{margin:22px 0 8px;text-align:center;font:700 30px Georgia,"Yu Mincho",serif}.loginCard>p{text-align:center;color:var(--muted);line-height:1.7;font-size:12px}.field{display:grid;gap:7px;margin-top:17px}.field label{font-size:12px;font-weight:800}.field input{width:100%;min-height:50px;border:1px solid #dccaC0;border-radius:14px;background:#fff;padding:12px 14px;font:inherit}.field input:focus{outline:3px solid rgba(143,79,66,.14);border-color:var(--brand)}.primary{width:100%;min-height:50px;margin-top:22px;border:0;border-radius:99px;background:linear-gradient(135deg,var(--brand2),var(--brand));color:#fff;font-weight:800;cursor:pointer;box-shadow:0 11px 24px rgba(143,79,66,.22)}.notice{margin-top:16px;border:1px solid #e8cbc7;border-radius:14px;background:#fff0ef;color:#8b3434;padding:12px 14px;font-size:11px;line-height:1.6}.loginFoot{margin-top:20px;text-align:center}.loginFoot a{color:var(--muted);font-size:11px}.secureNote{margin-top:18px;border-radius:14px;background:#f6f0ea;padding:13px;color:var(--muted);font-size:10px;line-height:1.7}@media(max-width:1180px){.metrics{grid-template-columns:repeat(3,1fr)}.sectionGrid{grid-template-columns:1fr}}@media(max-width:680px){.top{height:64px;padding:0 15px}.brand small{display:none}.main{width:min(100% - 22px,1480px);padding-top:18px}.hero{grid-template-columns:1fr;padding:24px 20px}.updated{text-align:left}.metrics{grid-template-columns:repeat(2,1fr);gap:10px}.metric{padding:15px}.metric .value{font-size:20px}.card{padding:19px}.chart{gap:4px}.barLabel{font-size:8px}.readonly{padding:7px 9px}.readonly span{display:none}}</style></head><body><div class="shell">' +
    (authenticated ? '<header class="top"><div class="brand"><span class="brandMark">S</span><span><strong>Salon de Lien</strong><small>PLATFORM OPERATIONS</small></span></div><div class="topRight"><span class="readonly" aria-label="閲覧専用">◉ <span>閲覧専用</span></span><form action="/api/platform/logout" method="post"><button class="logout" type="submit">ログアウト</button></form></div></header>' : '') + body + '</div></body></html>'
}

function loginPage(error, ready) {
  const notice = !ready
    ? '<div class="notice" role="alert">運営者認証の設定が完了していません。</div>'
    : error ? '<div class="notice" role="alert">メールアドレスまたはパスワードが正しくありません。</div>' : ''
  return pageShell('運営者ログイン', '<main class="loginMain"><section class="loginCard"><div class="loginBrand"><span class="brandMark">S</span></div><p class="eyebrow" style="margin-top:18px">PLATFORM OPERATIONS</p><h1>運営者ログイン</h1><p>登録店舗とサービス全体の利用状況を確認する、Salon de Lien運営者専用画面です。</p>' + notice + '<form action="/platform/login" method="post"><div class="field"><label for="email">運営者メールアドレス</label><input id="email" name="email" type="email" autocomplete="username" required></div><div class="field"><label for="password">パスワード</label><input id="password" name="password" type="password" autocomplete="current-password" required></div><button class="primary" type="submit"' + (!ready ? ' disabled' : '') + '>安全にログイン</button></form><div class="secureNote">店舗管理者・一般スタッフ・顧客アカウントではアクセスできません。データの変更機能を持たない閲覧専用画面です。</div><div class="loginFoot"><a href="/">公開トップへ戻る</a></div></section></main>', false)
}

function metricCard(label, value, sub) {
  return '<article class="metric"><div class="label">' + escapeHtml(label) + '</div><div class="value">' + escapeHtml(value) + '</div><div class="sub">' + escapeHtml(sub) + '</div></article>'
}

function trendChart(rows) {
  const values = rows.map(function (row) { return Number(row.amount || 0) })
  const max = Math.max(1, ...values)
  return '<div class="chart" role="img" aria-label="直近12か月の店舗売上推移">' + rows.map(function (row) {
    const height = Number(row.amount || 0) > 0 ? Math.max(5, Math.round(Number(row.amount) / max * 145)) : 3
    const label = String(row.month || '').replace(/^\d{4}-/, '') + '月'
    return '<div class="barItem"><span class="barValue">' + escapeHtml(formatYen(row.amount)) + '</span><span class="bar" style="height:' + height + 'px"></span><span class="barLabel">' + escapeHtml(label) + '</span></div>'
  }).join('') + '</div>'
}

function dashboardPage(data) {
  const summary = data.summary || {}
  const activeStores = Number(summary.activeStores || 0)
  const storeCount = Number(summary.storeCount || 0)
  const planRows = data.planRows || []
  const statusRows = data.statusRows || []
  const storeRows = data.storeRows || []
  const trendRows = data.trendRows || []
  const plans = planRows.length ? planRows.map(function (row) {
    return '<div class="listRow"><span>' + escapeHtml(planName(row)) + 'プラン</span><strong>' + formatNumber(row.storeCount) + '店舗</strong></div>'
  }).join('') : '<div class="empty">プラン情報がありません。</div>'
  const statuses = statusRows.length ? statusRows.map(function (row) {
    return '<div class="listRow"><span><span class="badge ' + statusTone(row.subscriptionStatus) + '">' + escapeHtml(statusLabel(row.subscriptionStatus)) + '</span></span><strong>' + formatNumber(row.storeCount) + '店舗</strong></div>'
  }).join('') : '<div class="empty">契約情報がありません。</div>'
  const stores = storeRows.length ? storeRows.map(function (row) {
    return '<tr><td><div class="storeName">' + escapeHtml(row.organizationName) + '</div><div class="slug">' + escapeHtml(row.slug) + '</div></td><td><div class="owner">' + escapeHtml(row.ownerName || '未登録') + '</div><div class="ownerMail">' + escapeHtml(row.ownerEmail || '—') + '</div></td><td>' + formatDate(row.createdAt) + '</td><td><strong>' + escapeHtml(planName(row)) + '</strong><div class="slug">' + escapeHtml(row.onboardingStatus || '—') + '</div></td><td><span class="badge ' + statusTone(row.subscriptionStatus) + '">' + escapeHtml(statusLabel(row.subscriptionStatus)) + '</span></td><td class="num">' + formatNumber(row.customerCount) + '</td><td class="num">' + formatNumber(row.staffCount) + '</td><td class="num">' + formatNumber(row.appointmentCount) + '</td><td class="num">' + formatYen(row.monthRevenue) + '</td><td class="num">' + formatYen(row.totalRevenue) + '</td><td>' + formatDate(row.trialEndsAt) + '</td></tr>'
  }).join('') : '<tr><td colspan="11" class="empty">登録店舗がありません。</td></tr>'
  const body = '<main class="main"><section class="hero"><div><p class="eyebrow">SALON DE LIEN PLATFORM</p><h1>運営ダッシュボード</h1><p>登録店舗・顧客数・契約プラン・売上状況を、サービス全体で横断集計します。</p></div><div class="updated">最終表示更新<br><strong>' + escapeHtml(formatDate(new Date(), true)) + '</strong></div></section>' +
    '<section class="metrics">' +
      metricCard('登録店舗', formatNumber(storeCount) + '店舗', '全Organization') +
      metricCard('利用中店舗', formatNumber(activeStores) + '店舗', storeCount ? Math.round(activeStores / storeCount * 100) + '% 稼働' : '0% 稼働') +
      metricCard('登録顧客総数', formatNumber(summary.customerCount) + '名', '削除済み顧客を除外') +
      metricCard('今月の店舗売上', formatYen(summary.monthRevenue), '全店舗の会計確定分') +
      metricCard('月額利用料 MRR', formatYen(summary.activeMrr), 'active契約のみ') +
      metricCard('トライアル後見込', formatYen(summary.projectedMrr), 'active + trialing') +
    '</section><section class="sectionGrid"><article class="card"><div class="cardIntro"><div><h2>店舗売上の推移</h2><p>全店舗の会計確定売上・直近12か月</p></div><strong>' + formatYen(summary.totalRevenue) + '<small style="display:block;color:var(--muted);font-weight:500;text-align:right">累計</small></strong></div>' + trendChart(trendRows) + '</article><aside class="card"><h2>プラン・契約構成</h2><div class="list">' + plans + '</div><div style="height:1px;background:var(--line);margin:20px 0"></div><div class="list">' + statuses + '</div></aside></section>' +
    '<section class="card tableCard"><div class="tableHead"><div><h2>登録店舗一覧</h2><p>オーナー登録情報・利用規模・契約状況・売上を表示しています。</p></div><span class="readonly">◉ 閲覧専用</span></div><div class="tableWrap"><table class="stores"><thead><tr><th>店舗</th><th>登録者</th><th>登録日</th><th>プラン</th><th>契約状態</th><th class="num">顧客</th><th class="num">スタッフ</th><th class="num">予約</th><th class="num">今月売上</th><th class="num">累計売上</th><th>トライアル終了</th></tr></thead><tbody>' + stores + '</tbody></table></div></section></main>'
  return pageShell('運営ダッシュボード', body, true)
}

function createPlatformOperatorService({ prisma, crypto }) {
  function session(req) {
    const config = operatorConfig()
    return verifySession(crypto, config, parseCookies(req.headers.cookie)[COOKIE_NAME])
  }

  function rateLimited(req) {
    const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim()
    const now = Date.now()
    const state = loginAttempts.get(ip)
    if (!state || state.resetAt <= now) {
      loginAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 })
      return false
    }
    state.count += 1
    loginAttempts.set(ip, state)
    return state.count > 5
  }

  async function loadDashboard() {
    const [summaryRows, storeRows, trendRows, planRows, statusRows] = await Promise.all([
      prisma.$queryRawUnsafe(`
        SELECT
          (SELECT COUNT(*)::int FROM "Organization") AS "storeCount",
          (SELECT COUNT(*)::int FROM "OrganizationBilling" WHERE "subscriptionStatus" IN ('active','trialing')) AS "activeStores",
          (SELECT COUNT(*)::int FROM "Customer" WHERE "deletedAt" IS NULL) AS "customerCount",
          COALESCE((SELECT SUM(s."amount")::bigint FROM "ServiceSale" s),0)::bigint AS "totalRevenue",
          COALESCE((SELECT SUM(s."amount")::bigint FROM "ServiceSale" s WHERE (s."paidAt" AT TIME ZONE 'Asia/Tokyo') >= date_trunc('month', NOW() AT TIME ZONE 'Asia/Tokyo')),0)::bigint AS "monthRevenue",
          COALESCE((SELECT SUM(p."monthlyAmount")::bigint FROM "OrganizationBilling" b JOIN "BillingPlan" p ON p."planKey"=b."planKey" WHERE b."subscriptionStatus"='active'),0)::bigint AS "activeMrr",
          COALESCE((SELECT SUM(p."monthlyAmount")::bigint FROM "OrganizationBilling" b JOIN "BillingPlan" p ON p."planKey"=b."planKey" WHERE b."subscriptionStatus" IN ('active','trialing')),0)::bigint AS "projectedMrr"
      `),
      prisma.$queryRawUnsafe(`
        SELECT o."id",o."name" AS "organizationName",o."slug",o."createdAt",
          owner."displayName" AS "ownerName",owner."email" AS "ownerEmail",
          b."planKey",p."displayName" AS "planName",b."onboardingStatus",COALESCE(b."subscriptionStatus",'none') AS "subscriptionStatus",b."trialEndsAt",
          COALESCE(customers."count",0)::int AS "customerCount",COALESCE(staff."count",0)::int AS "staffCount",COALESCE(appointments."count",0)::int AS "appointmentCount",
          COALESCE(sales."total",0)::bigint AS "totalRevenue",COALESCE(sales."month",0)::bigint AS "monthRevenue"
        FROM "Organization" o
        LEFT JOIN "OrganizationBilling" b ON b."organizationId"=o."id"
        LEFT JOIN "BillingPlan" p ON p."planKey"=b."planKey"
        LEFT JOIN LATERAL (SELECT u."displayName",u."email" FROM "AppUser" u WHERE u."organizationId"=o."id" AND u."role"='ADMIN' AND u."active"=true ORDER BY u."createdAt" LIMIT 1) owner ON true
        LEFT JOIN LATERAL (SELECT COUNT(*)::int AS "count" FROM "Customer" c WHERE c."organizationId"=o."id" AND c."deletedAt" IS NULL) customers ON true
        LEFT JOIN LATERAL (SELECT COUNT(*)::int AS "count" FROM "StaffBookingSetting" s WHERE s."organizationId"=o."id") staff ON true
        LEFT JOIN LATERAL (SELECT COUNT(*)::int AS "count" FROM "Appointment" a JOIN "Customer" c ON c."id"=a."customerId" WHERE c."organizationId"=o."id") appointments ON true
        LEFT JOIN LATERAL (
          SELECT SUM(s."amount")::bigint AS "total",SUM(CASE WHEN (s."paidAt" AT TIME ZONE 'Asia/Tokyo') >= date_trunc('month', NOW() AT TIME ZONE 'Asia/Tokyo') THEN s."amount" ELSE 0 END)::bigint AS "month"
          FROM "ServiceSale" s JOIN "Customer" c ON c."id"=s."customerId" WHERE c."organizationId"=o."id"
        ) sales ON true
        ORDER BY o."createdAt" DESC,o."name"
      `),
      prisma.$queryRawUnsafe(`
        WITH months AS (SELECT generate_series(date_trunc('month',NOW() AT TIME ZONE 'Asia/Tokyo')-INTERVAL '11 months',date_trunc('month',NOW() AT TIME ZONE 'Asia/Tokyo'),INTERVAL '1 month') AS month)
        SELECT to_char(m.month,'YYYY-MM') AS "month",COALESCE(SUM(s."amount"),0)::bigint AS "amount"
        FROM months m LEFT JOIN "ServiceSale" s ON date_trunc('month',s."paidAt" AT TIME ZONE 'Asia/Tokyo')=m.month
        GROUP BY m.month ORDER BY m.month
      `),
      prisma.$queryRawUnsafe(`
        SELECT b."planKey",p."displayName" AS "planName",COUNT(*)::int AS "storeCount"
        FROM "OrganizationBilling" b LEFT JOIN "BillingPlan" p ON p."planKey"=b."planKey"
        GROUP BY b."planKey",p."displayName",p."sortOrder" ORDER BY p."sortOrder" NULLS LAST
      `),
      prisma.$queryRawUnsafe(`
        SELECT COALESCE("subscriptionStatus",'none') AS "subscriptionStatus",COUNT(*)::int AS "storeCount"
        FROM "OrganizationBilling" GROUP BY "subscriptionStatus" ORDER BY COUNT(*) DESC
      `),
    ])
    return { summary: summaryRows[0] || {}, storeRows, trendRows, planRows, statusRows }
  }

  async function handle(req, res, url) {
    if (url.pathname === '/platform/login') {
      const config = operatorConfig()
      if (req.method === 'GET') {
        if (session(req)) { redirect(res, '/platform', 302); return true }
        html(res, config.ready ? 200 : 503, loginPage(url.searchParams.get('error') === 'credentials', config.ready))
        return true
      }
      if (req.method !== 'POST') { res.statusCode = 405; res.setHeader('Allow', 'GET, POST'); res.end(); return true }
      if (!validSameOrigin(req)) { html(res, 403, pageShell('アクセス拒否', '<main class="loginMain"><section class="loginCard"><h1>アクセスできません</h1></section></main>', false)); return true }
      if (rateLimited(req)) { redirect(res, '/platform/login?error=credentials'); return true }
      const body = new URLSearchParams(await readBody(req))
      const email = String(body.get('email') || '').trim().toLowerCase()
      const password = String(body.get('password') || '')
      if (!config.ready || email !== config.email || !verifyPassword(crypto, password, config.passwordHash)) {
        redirect(res, '/platform/login?error=credentials')
        return true
      }
      const secure = requestOrigin(req).startsWith('https://') ? '; Secure' : ''
      res.setHeader('Set-Cookie', COOKIE_NAME + '=' + encodeURIComponent(signSession(crypto, config)) + '; Path=/; Max-Age=' + SESSION_SECONDS + '; HttpOnly; SameSite=Strict; Priority=High' + secure)
      redirect(res, '/platform')
      return true
    }
    if (url.pathname === '/api/platform/logout') {
      if (req.method !== 'POST') { res.statusCode = 405; res.setHeader('Allow', 'POST'); res.end(); return true }
      if (!validSameOrigin(req)) { res.statusCode = 403; res.end(); return true }
      res.setHeader('Set-Cookie', COOKIE_NAME + '=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict; Secure')
      redirect(res, '/')
      return true
    }
    if (url.pathname === '/platform') {
      if (req.method !== 'GET' && req.method !== 'HEAD') { res.statusCode = 405; res.setHeader('Allow', 'GET, HEAD'); res.end(); return true }
      if (!session(req)) { redirect(res, '/platform/login', 302); return true }
      try {
        const data = await loadDashboard()
        const content = dashboardPage(data)
        if (req.method === 'HEAD') { res.statusCode = 200; setSecurityHeaders(res); res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(); return true }
        html(res, 200, content)
      } catch (error) {
        console.error('Platform operator dashboard failed', { code: String(error && error.code || 'unknown').slice(0, 80) })
        html(res, 500, pageShell('運営ダッシュボード', '<main class="loginMain"><section class="loginCard"><h1>情報を取得できません</h1><p>時間をおいて再度お試しください。</p></section></main>', true))
      }
      return true
    }
    if (url.pathname.startsWith('/platform/')) {
      html(res, 404, pageShell('ページが見つかりません', '<main class="loginMain"><section class="loginCard"><h1>ページが見つかりません</h1></section></main>', Boolean(session(req))))
      return true
    }
    return false
  }

  return { handle, loadDashboard, session }
}

module.exports = {
  COOKIE_NAME,
  createPlatformOperatorService,
  operatorConfig,
  signSession,
  verifySession,
  verifyPassword,
  dashboardPage,
}
