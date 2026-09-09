'use strict'

function sameOrigin(req, env = process.env) {
  const first = value => String(value || '').split(',')[0].trim()
  const allowed = new Set(['https://salon-de-lien.com', 'https://www.salon-de-lien.com'])
  for (const key of ['APP_URL', 'NEXT_PUBLIC_APP_URL', 'APP_BASE_URL', 'AUTH_BASE_URL', 'NEXTAUTH_URL']) {
    try { if (env[key]) allowed.add(new URL(env[key]).origin) } catch {}
  }
  // CloudFront's viewer protocol takes precedence over the internal load-balancer hop.
  const host = first(req.headers['x-forwarded-host'] || req.headers.host)
  const protocol = first(req.headers['cloudfront-forwarded-proto'] || req.headers['x-forwarded-proto']) || (req.socket?.encrypted ? 'https' : 'http')
  if (host && ['http', 'https'].includes(protocol)) {
    try { allowed.add(new URL(`${protocol}://${host}`).origin) } catch {}
  }
  const origin = String(req.headers.origin || '')
  if (origin) return origin !== 'null' && allowed.has(origin)
  // Same-origin browser POSTs may omit Origin on Safari; never accept cross-site requests.
  if (String(req.headers['sec-fetch-site'] || '').toLowerCase() !== 'same-origin') return false
  try { return !req.headers.referer || allowed.has(new URL(req.headers.referer).origin) } catch { return false }
}

module.exports = { sameOrigin }
