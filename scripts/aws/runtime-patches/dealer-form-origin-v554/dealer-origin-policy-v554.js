'use strict'

const RELEASE = 'dealer-form-origin-v554'
const PRODUCTION_ORIGINS = ['https://salon-de-lien.com', 'https://www.salon-de-lien.com']
const ENVIRONMENT_URL_KEYS = ['APP_URL', 'NEXT_PUBLIC_APP_URL', 'APP_BASE_URL', 'AUTH_BASE_URL', 'NEXTAUTH_URL']

function allowedOrigins(environment) {
  const allowed = new Set(PRODUCTION_ORIGINS)
  for (const key of ENVIRONMENT_URL_KEYS) {
    try {
      if (environment[key]) allowed.add(new URL(environment[key]).origin)
    } catch {}
  }
  return allowed
}

function validDealerRequestOrigin(req, environment = process.env) {
  const source = String(req.headers.origin || req.headers.referer || '').trim()
  if (source && source.toLowerCase() !== 'null') {
    try {
      return allowedOrigins(environment).has(new URL(source).origin)
    } catch {
      return false
    }
  }

  // Safari can omit Origin on a same-origin form POST. Sec-Fetch-Site is a
  // browser-controlled header, so it preserves CSRF protection for that case.
  return String(req.headers['sec-fetch-site'] || '').trim().toLowerCase() === 'same-origin'
}

module.exports = { RELEASE, validDealerRequestOrigin }
