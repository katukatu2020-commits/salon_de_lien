'use strict'

function createCustomerWithdrawalService({ prisma, crypto, sessionProvider }) {
  const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/
  const TOKEN_MINUTES = (() => {
    const value = Number(process.env.CUSTOMER_WITHDRAWAL_TOKEN_MINUTES)
    return Number.isFinite(value) ? Math.min(120, Math.max(10, Math.floor(value))) : 30
  })()

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character])
  }
  function hashToken(token) {
    return crypto.createHash('sha256').update(token, 'utf8').digest('hex')
  }
  function externalOrigin(req) {
    const first = value => String(value || '').split(',')[0].trim()
    const host = first(req.headers['x-forwarded-host']) || first(req.headers.host) || 'salon-de-lien.com'
    const protocol = first(req.headers['cloudfront-forwarded-proto']) || first(req.headers['x-forwarded-proto']) || 'https'
    return `${protocol}://${host}`
  }
  function validOrigin(req) {
    const origin = String(req.headers.origin || '')
    return !origin || origin === externalOrigin(req)
  }
  function redirect(res, location) {
    res.statusCode = 303
    res.setHeader('Location', location)
    res.setHeader('Cache-Control', 'no-store')
    res.end()
  }
  function render(res, title, body, status = 200) {
    res.statusCode = status
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'private, no-store, max-age=0')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Referrer-Policy', 'no-referrer')
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'")
    res.end(`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} | ORIMIA</title><style>*{box-sizing:border-box}body{margin:0;background:#fbf7f2;color:#2f2a25;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.wrap{min-height:100vh;padding:48px 20px}.card{max-width:600px;margin:0 auto;background:#fff;border:1px solid #eadfd5;border-radius:28px;padding:40px;box-shadow:0 20px 60px rgba(96,67,54,.1)}.brand{margin:0 0 10px;color:#a35a4a;font-size:12px;font-weight:700;letter-spacing:.18em}.title{margin:0;font-family:Georgia,"Yu Mincho",serif;font-size:32px;line-height:1.35}.lead{margin:22px 0 0;color:#655b54;line-height:1.9}.notice{margin-top:24px;border:1px solid #f3d2d5;border-radius:18px;background:#fff5f5;padding:16px;color:#7b353a;font-size:14px;line-height:1.8}.button{display:flex;min-height:50px;width:100%;margin-top:28px;align-items:center;justify-content:center;border:0;border-radius:999px;background:#9f3f44;color:#fff;text-decoration:none;font-size:15px;font-weight:700;cursor:pointer}.secondary{border:1px solid #dfd1c5;background:#fff;color:#3f3731;margin-top:12px}@media(max-width:520px){.wrap{padding:24px 14px}.card{padding:28px 22px;border-radius:24px}.title{font-size:27px}}</style></head><body><main class="wrap"><section class="card"><p class="brand">ORIMIA</p>${body}</section></main></body></html>`)
  }
  async function readForm(req) {
    let body = ''
    for await (const chunk of req) {
      body += chunk
      if (body.length > 16 * 1024) throw new Error('Request body too large')
    }
    return new URLSearchParams(body)
  }
  function profileUrl(req, status) {
    return `${externalOrigin(req)}/u/profile?withdrawal=${encodeURIComponent(status)}`
  }
  async function sendMail({ email, customerName, confirmationUrl, customerId }) {
    const token = String(process.env.POSTMARK_SERVER_TOKEN || '').trim()
    const from = String(process.env.POSTMARK_FROM_EMAIL || '').trim()
    if (!token || !from) throw new Error('Postmark is not configured')
    const subject = '【ORIMIA】退会手続きの確認'
    const safeName = escapeHtml(customerName)
    const safeUrl = escapeHtml(confirmationUrl)
    const response = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Postmark-Server-Token': token },
      body: JSON.stringify({
        From: `${String(process.env.POSTMARK_FROM_NAME || 'ORIMIA').trim()} <${from}>`,
        To: email,
        ReplyTo: String(process.env.POSTMARK_REPLY_TO || '').trim() || undefined,
        Subject: subject,
        TextBody: `${customerName} 様\n\nORIMIAの退会申請を受け付けました。\n以下のリンクを開き、表示された「退会を確定する」を押してください。\n\n${confirmationUrl}\n\nこのリンクは${TOKEN_MINUTES}分間有効です。心当たりがない場合は、このメールを破棄してください。`,
        HtmlBody: `<!doctype html><html lang="ja"><body style="margin:0;background:#fbf7f2;color:#2f2a25;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"><div style="max-width:600px;margin:0 auto;padding:36px 20px"><div style="background:#fff;border:1px solid #eadfd5;border-radius:24px;padding:32px"><p style="margin:0 0 8px;color:#a35a4a;font-size:12px;letter-spacing:.12em">ORIMIA</p><h1 style="margin:0 0 20px;font-family:serif;font-size:26px">退会手続きの確認</h1><p>${safeName} 様</p><p style="line-height:1.8">退会申請を受け付けました。下のボタンから確認画面を開き、表示された「退会を確定する」を押してください。</p><p style="margin:28px 0"><a href="${safeUrl}" style="display:inline-block;border-radius:999px;background:#8f4f42;color:#fff;text-decoration:none;padding:14px 24px;font-weight:700">退会手続きを確認する</a></p><p style="color:#766b63;font-size:13px;line-height:1.7">リンクは${TOKEN_MINUTES}分間有効です。心当たりがない場合は、このメールを破棄してください。</p></div></div></body></html>`,
        MessageStream: String(process.env.POSTMARK_TRANSACTIONAL_STREAM || 'outbound').trim(),
        Tag: 'customer-withdrawal',
        Metadata: { customerId }
      })
    })
    const result = await response.json().catch(() => null)
    if (!response.ok || result?.ErrorCode) throw new Error(`Postmark rejected the message (${response.status}): ${result?.Message || 'unknown error'}`)
    return result?.MessageID || null
  }

  async function ensureSchema() {
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "CustomerWithdrawalRequest" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "customerId" TEXT NOT NULL REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "appUserId" TEXT NOT NULL REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "email" TEXT NOT NULL,
      "tokenHash" TEXT NOT NULL UNIQUE,
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "usedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`)
    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "CustomerWithdrawalRequest_appUserId_createdAt_idx" ON "CustomerWithdrawalRequest"("appUserId", "createdAt")')
    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "CustomerWithdrawalRequest_customerId_createdAt_idx" ON "CustomerWithdrawalRequest"("customerId", "createdAt")')
    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "CustomerWithdrawalRequest_expiresAt_usedAt_idx" ON "CustomerWithdrawalRequest"("expiresAt", "usedAt")')
  }

  async function requestWithdrawal(req, res) {
    if (!validOrigin(req)) return render(res, '不正なリクエスト', '<h1 class="title">操作を確認できません</h1><p class="lead">マイページからもう一度お試しください。</p>', 403)
    const session = await sessionProvider(req)
    if (!session) return redirect(res, `${externalOrigin(req)}/u/login`)
    const rows = await prisma.$queryRawUnsafe(`SELECT u."id" AS "appUserId", u."email", c."id" AS "customerId", c."name"
      FROM "AppUser" u JOIN "Customer" c ON c."id"=u."customerId"
      WHERE u."id"=$1 AND u."customerId"=$2 AND u."organizationId"=$3 AND u."role"='CUSTOMER'
        AND u."active"=TRUE AND c."deletedAt" IS NULL LIMIT 1`, session.userId, session.customerId, session.organizationId)
    const user = rows[0]
    const email = String(user?.email || '').trim().toLowerCase()
    if (!user || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.endsWith('.local') || email.endsWith('@customer.salon-de-lien.local')) {
      return redirect(res, profileUrl(req, 'email-required'))
    }
    const rateRows = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM "CustomerWithdrawalRequest" WHERE "appUserId"=$1 AND "createdAt">NOW()-INTERVAL \'1 hour\'', user.appUserId)
    if (Number(rateRows[0]?.count || 0) >= 3) return redirect(res, profileUrl(req, 'limited'))

    const rawToken = crypto.randomBytes(32).toString('base64url')
    const id = crypto.randomUUID()
    const tokenHash = hashToken(rawToken)
    const expiresAt = new Date(Date.now() + TOKEN_MINUTES * 60_000)
    await prisma.$transaction(async tx => {
      await tx.$executeRawUnsafe('UPDATE "CustomerWithdrawalRequest" SET "usedAt"=NOW() WHERE "appUserId"=$1 AND "usedAt" IS NULL', user.appUserId)
      await tx.$executeRawUnsafe('INSERT INTO "CustomerWithdrawalRequest" ("id","customerId","appUserId","email","tokenHash","expiresAt") VALUES ($1,$2,$3,$4,$5,$6)', id, user.customerId, user.appUserId, email, tokenHash, expiresAt)
    })
    const confirmationUrl = `${externalOrigin(req)}/u/withdrawal/${rawToken}`
    try {
      await sendMail({ email, customerName: user.name, confirmationUrl, customerId: user.customerId })
    } catch (error) {
      console.error('customer withdrawal mail failed', { customerId: user.customerId, error: String(error?.message || error) })
      await prisma.$executeRawUnsafe('DELETE FROM "CustomerWithdrawalRequest" WHERE "id"=$1', id).catch(() => undefined)
      return redirect(res, profileUrl(req, 'mail-failed'))
    }
    return redirect(res, profileUrl(req, 'sent'))
  }

  async function confirmationPage(req, res, token) {
    const validShape = TOKEN_PATTERN.test(token)
    const rows = validShape ? await prisma.$queryRawUnsafe(`SELECT wr."id", wr."expiresAt", wr."usedAt", c."name", c."deletedAt", u."active"
      FROM "CustomerWithdrawalRequest" wr JOIN "Customer" c ON c."id"=wr."customerId" JOIN "AppUser" u ON u."id"=wr."appUserId"
      WHERE wr."tokenHash"=$1 LIMIT 1`, hashToken(token)) : []
    const row = rows[0]
    const valid = Boolean(row && !row.usedAt && new Date(row.expiresAt) > new Date() && !row.deletedAt && row.active)
    if (!valid) return render(res, 'リンクを確認できません', '<h1 class="title">リンクを確認できません</h1><p class="lead">このリンクは無効、使用済み、または有効期限切れです。必要な場合はマイページからもう一度申請してください。</p><a class="button" href="/u/login">ログイン画面へ</a>', 400)
    return render(res, '退会手続きの確認', `<h1 class="title">退会手続きの確認</h1><p class="lead">${escapeHtml(row.name)} 様のアカウントを退会します。退会後はログインできず、SMS等の通知も停止します。</p><div class="notice">この操作は取り消せません。予約・会計など法令・店舗運営上必要な履歴は、退会済みとして保護された状態で保持されます。</div><form action="/api/customer-auth/withdrawal/confirm" method="post"><input type="hidden" name="token" value="${escapeHtml(token)}"><button class="button" type="submit">退会を確定する</button></form><a class="button secondary" href="/u/profile">退会せず戻る</a>`)
  }

  async function confirmWithdrawal(req, res) {
    // This endpoint is authenticated by the 256-bit, single-use token sent to
    // the customer's registered email address. Mail-app privacy browsers can
    // legitimately submit an absent, null, or mail-app Origin, so Origin must
    // not be used as an additional gate here. The session-protected request
    // endpoint above continues to enforce the same-origin check.
    const form = await readForm(req)
    const token = String(form.get('token') || '')
    if (!TOKEN_PATTERN.test(token)) return redirect(res, `${externalOrigin(req)}/u/withdrawal/invalid`)
    const rows = await prisma.$queryRawUnsafe(`SELECT wr."id", wr."customerId", wr."appUserId", wr."expiresAt", wr."usedAt", c."deletedAt", u."active"
      FROM "CustomerWithdrawalRequest" wr JOIN "Customer" c ON c."id"=wr."customerId" JOIN "AppUser" u ON u."id"=wr."appUserId"
      WHERE wr."tokenHash"=$1 LIMIT 1`, hashToken(token))
    const row = rows[0]
    if (!row || row.usedAt || new Date(row.expiresAt) <= new Date() || row.deletedAt || !row.active) return redirect(res, `${externalOrigin(req)}/u/withdrawal/invalid`)
    await prisma.$transaction(async tx => {
      const consumed = await tx.$executeRawUnsafe('UPDATE "CustomerWithdrawalRequest" SET "usedAt"=NOW() WHERE "id"=$1 AND "usedAt" IS NULL AND "expiresAt">NOW()', row.id)
      if (Number(consumed) !== 1) throw new Error('Withdrawal token was already consumed')
      await tx.$executeRawUnsafe('UPDATE "Customer" SET "deletedAt"=NOW(), "smsTransactionalOptIn"=FALSE, "smsTransactionalOptOutAt"=NOW(), "updatedAt"=NOW() WHERE "id"=$1 AND "deletedAt" IS NULL', row.customerId)
      await tx.$executeRawUnsafe('UPDATE "AppUser" SET "active"=FALSE, "updatedAt"=NOW() WHERE "id"=$1', row.appUserId)
      await tx.$executeRawUnsafe('UPDATE "CustomerPortalAccess" SET "revokedAt"=NOW(), "updatedAt"=NOW() WHERE "customerId"=$1 AND "revokedAt" IS NULL', row.customerId)
      await tx.$executeRawUnsafe('UPDATE "PasswordResetToken" SET "usedAt"=NOW() WHERE "appUserId"=$1 AND "usedAt" IS NULL', row.appUserId)
      await tx.$executeRawUnsafe('UPDATE "CustomerWithdrawalRequest" SET "usedAt"=NOW() WHERE "appUserId"=$1 AND "usedAt" IS NULL', row.appUserId)
    })
    res.setHeader('Set-Cookie', 'lien_customer_session=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0')
    return redirect(res, `${externalOrigin(req)}/u/withdrawal/completed`)
  }

  async function handle(req, res, url) {
    if (url.pathname === '/api/customer-auth/withdrawal/request' && req.method === 'POST') {
      await readForm(req).catch(() => new URLSearchParams())
      await requestWithdrawal(req, res)
      return true
    }
    if (url.pathname === '/api/customer-auth/withdrawal/confirm' && req.method === 'POST') {
      await confirmWithdrawal(req, res)
      return true
    }
    if (url.pathname === '/u/withdrawal/completed' && req.method === 'GET') {
      render(res, '退会完了', '<h1 class="title">退会が完了しました</h1><p class="lead">これまでORIMIAをご利用いただき、ありがとうございました。</p><a class="button" href="/">トップページへ</a>')
      return true
    }
    if (url.pathname.startsWith('/u/withdrawal/') && req.method === 'GET') {
      await confirmationPage(req, res, decodeURIComponent(url.pathname.slice('/u/withdrawal/'.length)))
      return true
    }
    return false
  }

  return { ensureSchema, handle }
}

module.exports = { createCustomerWithdrawalService }
