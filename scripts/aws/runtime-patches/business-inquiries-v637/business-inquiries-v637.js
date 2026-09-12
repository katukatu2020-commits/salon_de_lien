'use strict'

const ALLOWED_AUDIENCES = new Set(['salon', 'dealer', 'other'])
const ALLOWED_STATUSES = new Set(['new', 'in_progress', 'closed'])
const ALLOWED_CONTACT_METHODS = new Set(['email', 'phone', 'either'])
const RETURN_PATHS = new Set(['/business', '/business/salon', '/business/dealer'])
const inquiryAttempts = new Map()

function trim(value, maxLength) {
  return String(value == null ? '' : value).trim().slice(0, maxLength)
}

function normalizeEmail(value) {
  return trim(value, 254).toLowerCase()
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function validPhone(value) {
  return !value || /^[0-9+()\-\s]{8,30}$/.test(value)
}

function requestOrigin(req) {
  const protocol = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim()
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim()
  return protocol + '://' + host
}

function validSameOrigin(req) {
  const origin = String(req.headers.origin || '')
  if (!origin) return !['cross-site'].includes(String(req.headers['sec-fetch-site'] || ''))
  const allowed = new Set()
  try { allowed.add(new URL(String(process.env.APP_URL || '')).origin) } catch {}
  try { allowed.add(new URL(requestOrigin(req)).origin) } catch {}
  return allowed.has(origin)
}

function readBody(req, limit = 24 * 1024) {
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
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    })
    req.on('end', function () { resolve(Buffer.concat(chunks).toString('utf8')) })
    req.on('error', reject)
  })
}

function safeReturnPath(value, audience) {
  const requested = trim(value, 120)
  if (RETURN_PATHS.has(requested)) return requested
  if (audience === 'salon') return '/business/salon'
  if (audience === 'dealer') return '/business/dealer'
  return '/business'
}

function parsePublicInquiry(body) {
  const params = body instanceof URLSearchParams ? body : new URLSearchParams(String(body || ''))
  const audience = trim(params.get('audience'), 20)
  const organizationName = trim(params.get('organizationName'), 120)
  const contactName = trim(params.get('contactName'), 80)
  const email = normalizeEmail(params.get('email'))
  const phone = trim(params.get('phone'), 30)
  const preferredContact = trim(params.get('preferredContact'), 20)
  const message = trim(params.get('message'), 3000)
  const privacyAccepted = params.get('privacyAccepted') === '1'
  const website = trim(params.get('website'), 200)
  const sourcePath = safeReturnPath(params.get('sourcePath'), audience)
  const valid = ALLOWED_AUDIENCES.has(audience) && organizationName.length >= 2 && contactName.length >= 1 &&
    validEmail(email) && validPhone(phone) && ALLOWED_CONTACT_METHODS.has(preferredContact) &&
    message.length >= 10 && privacyAccepted
  return { valid, honeypot: Boolean(website), sourcePath, audience, organizationName, contactName, email, phone: phone || null, preferredContact, message }
}

function clientKey(req) {
  return String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim().slice(0, 100)
}

function rateLimited(req, now = Date.now()) {
  const key = clientKey(req)
  const current = inquiryAttempts.get(key)
  if (!current || current.resetAt <= now) {
    inquiryAttempts.set(key, { count: 1, resetAt: now + 60 * 60 * 1000 })
    return false
  }
  current.count += 1
  inquiryAttempts.set(key, current)
  if (inquiryAttempts.size > 2000) {
    for (const [storedKey, value] of inquiryAttempts) if (value.resetAt <= now) inquiryAttempts.delete(storedKey)
  }
  return current.count > 8
}

function redirect(res, location) {
  res.statusCode = 303
  res.setHeader('Location', location)
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.end()
}

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]
  })
}

function formatDate(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(date.getTime())) return '-'
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(date)
}

function audienceLabel(value) {
  return { salon: '美容室', dealer: 'ディーラー', other: 'その他の法人' }[value] || '未設定'
}

function statusLabel(value) {
  return { new: '未対応', in_progress: '対応中', closed: '完了' }[value] || '未対応'
}

function contactMethodLabel(value) {
  return { email: 'メール', phone: '電話', either: 'どちらでも可' }[value] || 'どちらでも可'
}

function option(value, current, label) {
  return '<option value="' + value + '"' + (value === current ? ' selected' : '') + '>' + label + '</option>'
}

function renderPlatformInbox(data, pageShell) {
  const stats = data.stats || {}
  const queryString = function (page) {
    const params = new URLSearchParams()
    if (data.query) params.set('q', data.query)
    if (data.status !== 'all') params.set('status', data.status)
    if (data.audience !== 'all') params.set('audience', data.audience)
    if (page > 1) params.set('page', String(page))
    const value = params.toString()
    return '/platform/inquiries' + (value ? '?' + value : '')
  }
  const pageCount = Math.max(1, Math.ceil(Number(data.total || 0) / data.pageSize))
  const pager = pageCount > 1
    ? '<nav class="biPager" aria-label="ページ送り">' + (data.page > 1 ? '<a href="' + queryString(data.page - 1) + '">前へ</a>' : '<span>前へ</span>') + '<strong>' + data.page + ' / ' + pageCount + '</strong>' + (data.page < pageCount ? '<a href="' + queryString(data.page + 1) + '">次へ</a>' : '<span>次へ</span>') + '</nav>'
    : ''
  const items = (data.rows || []).map(function (row) {
    const phoneLink = row.phone ? '<a href="tel:' + escapeHtml(String(row.phone).replace(/[^0-9+]/g, '')) + '">' + escapeHtml(row.phone) + '</a>' : '<span>-</span>'
    return '<article class="biInquiry">' +
      '<header class="biInquiryHead"><div><div class="biMeta"><span class="badge ' + (row.status === 'new' ? 'danger' : row.status === 'in_progress' ? 'pending' : 'good') + '">' + statusLabel(row.status) + '</span><span>' + audienceLabel(row.audience) + '</span><time>' + escapeHtml(formatDate(row.createdAt)) + '</time></div><h2>' + escapeHtml(row.organizationName) + '</h2><p>' + escapeHtml(row.contactName) + ' 様</p></div><span class="biId">' + escapeHtml(row.id) + '</span></header>' +
      '<div class="biContact"><div><span>メール</span><a href="mailto:' + escapeHtml(row.email) + '">' + escapeHtml(row.email) + '</a></div><div><span>電話</span>' + phoneLink + '</div><div><span>希望連絡方法</span><strong>' + contactMethodLabel(row.preferredContact) + '</strong></div></div>' +
      '<div class="biMessage"><span>ご相談内容</span><p>' + escapeHtml(row.message) + '</p></div>' +
      '<form class="biResponse" method="post" action="/api/platform/inquiries/' + encodeURIComponent(row.id) + '"><label><span>対応状況</span><select name="status">' + option('new', row.status, '未対応') + option('in_progress', row.status, '対応中') + option('closed', row.status, '完了') + '</select></label><label class="biNote"><span>運営メモ</span><textarea name="operatorNote" maxlength="1000" rows="2" placeholder="折り返し内容や担当者を記録">' + escapeHtml(row.operatorNote || '') + '</textarea></label><button type="submit">保存</button></form>' +
      '</article>'
  }).join('')
  const updated = data.updated ? '<div class="biSuccess" role="status">対応状況を保存しました。</div>' : ''
  const body = '<style>.biToolbar{display:grid;grid-template-columns:minmax(240px,1fr) 190px 190px auto;gap:12px;align-items:end;margin-top:20px;padding:20px;border:1px solid var(--line);border-radius:8px;background:var(--paper)}.biToolbar label,.biResponse label{display:grid;gap:7px;color:var(--muted);font-size:11px;font-weight:800}.biToolbar input,.biToolbar select,.biResponse select,.biResponse textarea{width:100%;min-height:46px;border:1px solid #d8c4b9;border-radius:6px;background:#fff;padding:10px 12px;color:var(--ink);font:inherit}.biToolbar button,.biResponse button{min-height:46px;border:0;border-radius:6px;background:var(--brand);color:#fff;padding:0 22px;font-weight:800;cursor:pointer}.biMetrics{grid-template-columns:repeat(3,minmax(0,1fr))}.biList{display:grid;gap:14px;margin-top:20px}.biInquiry{border:1px solid var(--line);border-radius:8px;background:var(--paper);padding:22px;box-shadow:0 10px 26px rgba(71,48,40,.045)}.biInquiryHead{display:flex;justify-content:space-between;gap:20px;border-bottom:1px solid var(--line);padding-bottom:16px}.biInquiryHead h2{margin:9px 0 3px;font-size:20px}.biInquiryHead p{margin:0;color:var(--muted);font-size:12px}.biMeta{display:flex;flex-wrap:wrap;align-items:center;gap:9px;color:var(--muted);font-size:10px}.biId{color:var(--muted);font-size:9px}.biContact{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;padding:16px 0}.biContact>div{display:grid;gap:5px;min-width:0}.biContact span,.biMessage>span{color:var(--muted);font-size:10px;font-weight:800}.biContact a,.biContact strong{font-size:12px;overflow-wrap:anywhere}.biMessage{border-block:1px solid var(--line);padding:15px 0}.biMessage p{margin:6px 0 0;white-space:pre-wrap;line-height:1.75;font-size:13px}.biResponse{display:grid;grid-template-columns:180px minmax(260px,1fr) auto;gap:12px;align-items:end;padding-top:16px}.biResponse textarea{resize:vertical}.biSuccess{margin-top:20px;border:1px solid #acd1b8;border-radius:6px;background:var(--greenBg);color:var(--green);padding:13px 16px;font-size:12px;font-weight:700}.biEmpty{padding:54px 20px;text-align:center;color:var(--muted)}.biPager{display:flex;justify-content:center;align-items:center;gap:20px;margin-top:22px}.biPager a,.biPager span{border:1px solid var(--line);border-radius:6px;padding:9px 16px;background:#fff;color:var(--muted);font-size:11px}.biPager span{opacity:.5}@media(max-width:900px){.biToolbar{grid-template-columns:1fr 1fr}.biResponse{grid-template-columns:1fr}.biContact{grid-template-columns:1fr 1fr}}@media(max-width:600px){.biToolbar,.biContact{grid-template-columns:1fr}.biInquiryHead{display:grid}.biId{overflow-wrap:anywhere}}</style>' +
    '<main class="main"><section class="hero"><div><p class="eyebrow">BUSINESS INQUIRIES</p><h1>導入相談</h1><p>ビジネスページから届いたご相談を確認し、対応状況を共有します。</p></div><div class="updated">全 ' + Number(stats.total || 0) + ' 件</div></section>' +
    '<section class="metrics biMetrics">' +
      '<article class="metric"><div class="label">未対応</div><div class="value">' + Number(stats.newCount || 0) + '<small>件</small></div><div class="sub">折り返し前</div></article>' +
      '<article class="metric"><div class="label">対応中</div><div class="value">' + Number(stats.inProgressCount || 0) + '<small>件</small></div><div class="sub">連絡・確認中</div></article>' +
      '<article class="metric"><div class="label">完了</div><div class="value">' + Number(stats.closedCount || 0) + '<small>件</small></div><div class="sub">対応済み</div></article></section>' + updated +
    '<form class="biToolbar" method="get" action="/platform/inquiries"><label><span>検索</span><input name="q" value="' + escapeHtml(data.query) + '" placeholder="店舗名・担当者・メール・内容"></label><label><span>対応状況</span><select name="status">' + option('all', data.status, 'すべて') + option('new', data.status, '未対応') + option('in_progress', data.status, '対応中') + option('closed', data.status, '完了') + '</select></label><label><span>ご相談種別</span><select name="audience">' + option('all', data.audience, 'すべて') + option('salon', data.audience, '美容室') + option('dealer', data.audience, 'ディーラー') + option('other', data.audience, 'その他の法人') + '</select></label><button type="submit">絞り込む</button></form>' +
    '<section class="biList" aria-label="導入相談一覧">' + (items || '<div class="biInquiry biEmpty">該当する導入相談はありません。</div>') + '</section>' + pager + '</main>'
  return pageShell('導入相談', body, true)
}

function renderBusinessContactForm({ audience = 'other', status = '' } = {}) {
  const safeAudience = ALLOWED_AUDIENCES.has(audience) ? audience : 'other'
  const sourcePath = safeReturnPath('', safeAudience)
  const statusMessages = {
    sent: ['success', 'お問い合わせを受け付けました。担当者からご連絡します。'],
    invalid: ['error', '入力内容を確認して、もう一度送信してください。'],
    limited: ['error', '短時間に複数回送信されています。時間をおいてお試しください。'],
    failed: ['error', '送信できませんでした。メールまたはお電話でお問い合わせください。'],
  }
  const feedback = statusMessages[status]
    ? '<p class="inquiry-feedback ' + statusMessages[status][0] + '" role="' + (statusMessages[status][0] === 'success' ? 'status' : 'alert') + '">' + statusMessages[status][1] + '</p>'
    : ''
  const audienceField = safeAudience === 'salon' || safeAudience === 'dealer'
    ? '<input type="hidden" name="audience" value="' + safeAudience + '">'
    : '<label class="inquiry-field"><span>ご相談区分 <b>必須</b></span><select name="audience" required><option value="salon">美容室として相談</option><option value="dealer">ディーラーとして相談</option><option value="other" selected>その他の法人として相談</option></select></label>'
  return '<section id="contact" class="contact-section business-contact-section"><div class="wrap contact-layout"><div class="contact-copy"><p class="eyebrow">CONTACT</p><h2>導入・サービスに関するご相談</h2><p>ご利用方法や契約について、ORIMIAの担当者がご案内します。</p><address><a href="mailto:support@salon-de-lien.com">support@salon-de-lien.com</a><a href="tel:+817094446007">070-9444-6007</a></address></div><div class="inquiry-panel"><div class="inquiry-heading"><p class="eyebrow">INQUIRY FORM</p><h3>ご相談はこちらから</h3></div>' + feedback + '<form class="business-inquiry-form" action="/api/public/business-inquiries" method="post"><input type="hidden" name="sourcePath" value="' + sourcePath + '">' + audienceField + '<div class="inquiry-fields"><label class="inquiry-field"><span>会社・店舗名 <b>必須</b></span><input name="organizationName" maxlength="120" autocomplete="organization" required></label><label class="inquiry-field"><span>ご担当者名 <b>必須</b></span><input name="contactName" maxlength="80" autocomplete="name" required></label><label class="inquiry-field"><span>メールアドレス <b>必須</b></span><input type="email" name="email" maxlength="254" autocomplete="email" inputmode="email" required></label><label class="inquiry-field"><span>電話番号</span><input type="tel" name="phone" maxlength="30" autocomplete="tel" inputmode="tel"></label><label class="inquiry-field inquiry-field-wide"><span>希望する連絡方法 <b>必須</b></span><select name="preferredContact" required><option value="email">メール</option><option value="phone">電話</option><option value="either" selected>どちらでも可</option></select></label><label class="inquiry-field inquiry-field-wide"><span>ご相談内容 <b>必須</b></span><textarea name="message" minlength="10" maxlength="3000" rows="5" placeholder="導入予定の事業形態や、ご相談内容をご記入ください。" required></textarea></label></div><label class="inquiry-consent"><input type="checkbox" name="privacyAccepted" value="1" required><span><a href="/privacy" target="_blank" rel="noopener">プライバシーポリシー</a>に同意する</span></label><label class="inquiry-honeypot" aria-hidden="true">Webサイト<input name="website" tabindex="-1" autocomplete="off"></label><button class="inquiry-submit" type="submit">相談内容を送信</button></form></div></div></section>'
}

function createBusinessInquiryService({ prisma, crypto }) {
  let schemaPromise

  async function ensureSchema() {
    if (!schemaPromise) {
      schemaPromise = (async function () {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "BusinessInquiry" (
            "id" TEXT PRIMARY KEY,
            "requestKey" TEXT NOT NULL,
            "audience" TEXT NOT NULL,
            "organizationName" TEXT NOT NULL,
            "contactName" TEXT NOT NULL,
            "email" TEXT NOT NULL,
            "phone" TEXT,
            "preferredContact" TEXT NOT NULL,
            "message" TEXT NOT NULL,
            "sourcePath" TEXT NOT NULL,
            "status" TEXT NOT NULL DEFAULT 'new',
            "operatorNote" TEXT,
            "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
            "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
            CONSTRAINT "BusinessInquiry_audience_check" CHECK ("audience" IN ('salon','dealer','other')),
            CONSTRAINT "BusinessInquiry_status_check" CHECK ("status" IN ('new','in_progress','closed')),
            CONSTRAINT "BusinessInquiry_preferredContact_check" CHECK ("preferredContact" IN ('email','phone','either'))
          )
        `)
        await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "BusinessInquiry_requestKey_key" ON "BusinessInquiry" ("requestKey")')
        await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "BusinessInquiry_status_createdAt_idx" ON "BusinessInquiry" ("status", "createdAt" DESC)')
        await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "BusinessInquiry_audience_createdAt_idx" ON "BusinessInquiry" ("audience", "createdAt" DESC)')
      })().catch(function (error) {
        schemaPromise = null
        throw error
      })
    }
    return schemaPromise
  }

  function requestKey(inquiry, now = Date.now()) {
    const bucket = Math.floor(now / (10 * 60 * 1000))
    return crypto.createHash('sha256').update([
      inquiry.audience,
      inquiry.organizationName.toLowerCase(),
      inquiry.email,
      inquiry.message,
      bucket,
    ].join('\n')).digest('hex')
  }

  async function createInquiry(inquiry) {
    await ensureSchema()
    const id = 'binq_' + crypto.randomUUID()
    const key = requestKey(inquiry)
    const inserted = await prisma.$executeRawUnsafe(
      'INSERT INTO "BusinessInquiry" ("id","requestKey","audience","organizationName","contactName","email","phone","preferredContact","message","sourcePath","status","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,\'new\',NOW(),NOW()) ON CONFLICT ("requestKey") DO NOTHING',
      id, key, inquiry.audience, inquiry.organizationName, inquiry.contactName, inquiry.email, inquiry.phone,
      inquiry.preferredContact, inquiry.message, inquiry.sourcePath,
    )
    return { id, inserted: Number(inserted || 0) > 0 }
  }

  async function listInquiries({ status = 'all', audience = 'all', query = '', page = 1, pageSize = 30 } = {}) {
    await ensureSchema()
    const safeStatus = ALLOWED_STATUSES.has(status) ? status : 'all'
    const safeAudience = ALLOWED_AUDIENCES.has(audience) ? audience : 'all'
    const safeQuery = trim(query, 100)
    const safePage = Math.max(1, Math.min(10000, Number.parseInt(page, 10) || 1))
    const safePageSize = Math.max(1, Math.min(100, Number.parseInt(pageSize, 10) || 30))
    const clauses = []
    const params = []
    if (safeStatus !== 'all') {
      params.push(safeStatus)
      clauses.push('"status"=$' + params.length)
    }
    if (safeAudience !== 'all') {
      params.push(safeAudience)
      clauses.push('"audience"=$' + params.length)
    }
    if (safeQuery) {
      params.push('%' + safeQuery + '%')
      clauses.push('("organizationName" ILIKE $' + params.length + ' OR "contactName" ILIKE $' + params.length + ' OR "email" ILIKE $' + params.length + ' OR "message" ILIKE $' + params.length + ')')
    }
    const where = clauses.length ? ' WHERE ' + clauses.join(' AND ') : ''
    const countRows = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int AS "count" FROM "BusinessInquiry"' + where, ...params)
    const limitPosition = params.length + 1
    const offsetPosition = params.length + 2
    const rows = await prisma.$queryRawUnsafe(
      'SELECT * FROM "BusinessInquiry"' + where + ' ORDER BY CASE "status" WHEN \'new\' THEN 0 WHEN \'in_progress\' THEN 1 ELSE 2 END,"createdAt" DESC LIMIT $' + limitPosition + ' OFFSET $' + offsetPosition,
      ...params, safePageSize, (safePage - 1) * safePageSize,
    )
    const statsRows = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int AS "total",COUNT(*) FILTER (WHERE "status"=\'new\')::int AS "newCount",COUNT(*) FILTER (WHERE "status"=\'in_progress\')::int AS "inProgressCount",COUNT(*) FILTER (WHERE "status"=\'closed\')::int AS "closedCount" FROM "BusinessInquiry"')
    return { rows, total: Number(countRows[0]?.count || 0), stats: statsRows[0] || {}, status: safeStatus, audience: safeAudience, query: safeQuery, page: safePage, pageSize: safePageSize }
  }

  async function updateInquiry({ id, status, operatorNote }) {
    await ensureSchema()
    const safeId = trim(id, 160)
    if (!safeId || !ALLOWED_STATUSES.has(status)) return false
    const note = trim(operatorNote, 1000) || null
    const count = await prisma.$executeRawUnsafe('UPDATE "BusinessInquiry" SET "status"=$2,"operatorNote"=$3,"updatedAt"=NOW() WHERE "id"=$1', safeId, status, note)
    return Number(count || 0) > 0
  }

  async function handlePublic(req, res, url) {
    if (url.pathname !== '/api/public/business-inquiries') return false
    if (req.method !== 'POST') {
      res.statusCode = 405
      res.setHeader('Allow', 'POST')
      res.setHeader('Cache-Control', 'no-store')
      res.end()
      return true
    }
    let inquiry = { sourcePath: '/business', audience: 'other' }
    try {
      const body = await readBody(req)
      inquiry = parsePublicInquiry(body)
      if (!validSameOrigin(req)) {
        redirect(res, inquiry.sourcePath + '?inquiry=invalid#contact')
        return true
      }
      if (inquiry.honeypot) {
        redirect(res, inquiry.sourcePath + '?inquiry=sent#contact')
        return true
      }
      if (!inquiry.valid) {
        redirect(res, inquiry.sourcePath + '?inquiry=invalid#contact')
        return true
      }
      if (rateLimited(req)) {
        redirect(res, inquiry.sourcePath + '?inquiry=limited#contact')
        return true
      }
      const result = await createInquiry(inquiry)
      console.info('[business-inquiry] received', { id: result.id, audience: inquiry.audience, duplicate: !result.inserted })
      redirect(res, inquiry.sourcePath + '?inquiry=sent#contact')
    } catch (error) {
      console.error('[business-inquiry] submission failed', { code: String(error?.code || error?.message || 'unknown').slice(0, 100) })
      redirect(res, safeReturnPath(inquiry.sourcePath, inquiry.audience) + '?inquiry=failed#contact')
    }
    return true
  }

  return { ensureSchema, createInquiry, listInquiries, updateInquiry, handlePublic }
}

module.exports = {
  ALLOWED_AUDIENCES,
  ALLOWED_STATUSES,
  parsePublicInquiry,
  safeReturnPath,
  renderBusinessContactForm,
  renderPlatformInbox,
  createBusinessInquiryService,
}
