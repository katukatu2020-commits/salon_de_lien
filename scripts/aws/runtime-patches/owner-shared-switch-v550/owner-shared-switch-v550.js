'use strict'

const RELEASE = 'owner-shared-switch-v550'
const COOKIE_NAME = 'lien_admin_session'
const MAX_SESSION_SECONDS = 12 * 60 * 60

function json(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Vary', 'Cookie')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.end(JSON.stringify(body))
}

function requestOrigin(req) {
  const protocol = String(req.headers['x-forwarded-proto'] || (req.socket && req.socket.encrypted ? 'https' : 'http')).split(',')[0].trim()
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim()
  return host ? `${protocol}://${host}` : ''
}

function sameOrigin(req) {
  const supplied = String(req.headers.origin || '').trim()
  if (!supplied) return true
  try {
    const allowed = new Set(['https://salon-de-lien.com'])
    const current = requestOrigin(req)
    if (current) allowed.add(new URL(current).origin)
    for (const key of ['APP_URL', 'APP_BASE_URL', 'AUTH_BASE_URL', 'NEXTAUTH_URL', 'NEXT_PUBLIC_APP_URL']) {
      const configured = String(process.env[key] || '').trim()
      if (!configured) continue
      try { allowed.add(new URL(configured).origin) } catch {}
    }
    return allowed.has(new URL(supplied).origin)
  } catch {
    return false
  }
}

function signSharedSession({ crypto, secret, ownerSession, account, now = Date.now() }) {
  if (!secret || secret.length < 32) {
    throw Object.assign(new Error('管理画面認証が未設定です。'), {
      statusCode: 503,
      code: 'ADMIN_AUTH_SECRET_INVALID',
    })
  }
  const issuedAt = Math.floor(now / 1000)
  const ownerExpiresAt = Number(ownerSession && ownerSession.expiresAt)
  const expiresAt = Math.min(
    Number.isFinite(ownerExpiresAt) ? ownerExpiresAt : issuedAt + MAX_SESSION_SECONDS,
    issuedAt + MAX_SESSION_SECONDS,
  )
  if (expiresAt <= issuedAt) {
    throw Object.assign(new Error('セッションの有効期限が切れました。再ログインしてください。'), {
      statusCode: 401,
      code: 'OWNER_SESSION_EXPIRED',
    })
  }
  const payload = {
    version: 2,
    subject: String(account.email || account.loginId || '').trim().toLowerCase(),
    role: 'STAFF',
    organizationId: ownerSession.organizationId,
    manufacturerName: null,
    userId: account.id,
    issuedAt,
    expiresAt,
    sessionId: crypto.randomUUID(),
  }
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const signature = crypto.createHmac('sha256', secret).update(body).digest('base64url')
  return { token: `${body}.${signature}`, payload }
}

function sessionCookie(req, signed) {
  const maxAge = Math.max(1, signed.payload.expiresAt - signed.payload.issuedAt)
  const secure = requestOrigin(req).startsWith('https://') ? '; Secure' : ''
  return `${COOKIE_NAME}=${encodeURIComponent(signed.token)}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax; Priority=High${secure}`
}

function createOwnerSharedSwitchService({ prisma, crypto, staffSession }) {
  async function sharedAccount(organizationId) {
    const rows = await prisma.$queryRawUnsafe(
      'SELECT "id","email","loginId","displayName","role","active" FROM "AppUser" WHERE "organizationId"=$1 AND "isSharedStoreAccount"=TRUE AND "active"=TRUE AND "role"=\'STAFF\' LIMIT 1',
      organizationId,
    )
    return rows[0] || null
  }

  async function handle(req, res, url) {
    if (url.pathname !== '/api/admin/shared-account-switch') return false
    if (!['GET', 'POST'].includes(req.method)) {
      res.statusCode = 405
      res.setHeader('Allow', 'GET, POST')
      res.setHeader('Cache-Control', 'private, no-store, max-age=0')
      res.end()
      return true
    }

    try {
      const session = await staffSession(req)
      if (!session || !session.organizationId) {
        json(res, 401, { error: 'ログインし直してください。' })
        return true
      }

      if (req.method === 'GET') {
        if (session.role !== 'ADMIN') {
          json(res, 200, { canSwitch: false, role: session.role })
          return true
        }
        const account = await sharedAccount(session.organizationId)
        json(res, 200, {
          canSwitch: Boolean(account),
          role: session.role,
          account: account ? {
            displayName: account.displayName || account.loginId || '店舗共通アカウント',
            loginId: account.loginId || '',
          } : null,
        })
        return true
      }

      if (session.role !== 'ADMIN') {
        json(res, 403, { error: 'オーナーアカウントからのみ切り替えられます。' })
        return true
      }
      if (!sameOrigin(req)) {
        json(res, 403, { error: '安全のため操作を完了できませんでした。' })
        return true
      }

      const account = await sharedAccount(session.organizationId)
      if (!account) {
        json(res, 409, { error: '利用可能な店舗共通アカウントがありません。アカウント設定をご確認ください。' })
        return true
      }
      const signed = signSharedSession({
        crypto,
        secret: process.env.ADMIN_AUTH_SECRET,
        ownerSession: session,
        account,
      })
      res.setHeader('Set-Cookie', sessionCookie(req, signed))
      json(res, 200, {
        ok: true,
        role: 'STAFF',
        displayName: account.displayName || account.loginId || '店舗共通アカウント',
      })
      return true
    } catch (error) {
      console.error('[owner-shared-switch-v550] request failed', {
        code: String(error && error.code || 'unknown').slice(0, 80),
      })
      const status = Number(error && error.statusCode) || 500
      json(res, status, { error: status < 500 ? error.message : '共通アカウントへ切り替えられませんでした。' })
      return true
    }
  }

  return { handle }
}

module.exports = {
  COOKIE_NAME,
  RELEASE,
  createOwnerSharedSwitchService,
  sameOrigin,
  signSharedSession,
}
