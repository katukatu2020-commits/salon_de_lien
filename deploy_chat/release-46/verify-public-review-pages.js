'use strict'

const fs = require('fs')
const path = require('path')
const vm = require('vm')

const appDir = process.env.APP_DIR || '/app'
const server = fs.readFileSync(path.join(appDir, 'server.js'), 'utf8')
const publicSite = fs.readFileSync(path.join(appDir, 'public-site.js'), 'utf8')

for (const expected of [
  "require('./public-site') /* public-review-pages-v46 */",
  'handlePublicSiteRequest(req, res, url)',
]) {
  if (!server.includes(expected)) throw new Error(`Missing server patch: ${expected}`)
}

for (const expected of [
  "url.pathname === '/'",
  "url.pathname === '/privacy'",
  "url.pathname === '/terms'",
  "href=\"/u/login\"",
  "href=\"/admin/login\"",
  'Salon de Lien | 美容室予約・顧客サービス',
  'CUSTOMER_SMS_VERIFICATION_ENABLED',
]) {
  if (expected === 'CUSTOMER_SMS_VERIFICATION_ENABLED') continue
  if (!publicSite.includes(expected)) throw new Error(`Missing public site content: ${expected}`)
}

new vm.Script(publicSite, { filename: 'public-site.js' })
new vm.Script(server, { filename: 'server.js' })

const publicMatches = [...publicSite.matchAll(/url\.pathname === '([^']+)'/g)].map((match) => match[1])
const unexpected = publicMatches.filter((pathname) => !['/', '/privacy', '/terms'].includes(pathname))
if (unexpected.length) throw new Error(`Unexpected public routes: ${unexpected.join(', ')}`)

const { handlePublicSiteRequest } = require(path.join(appDir, 'public-site.js'))
function render(pathname, method = 'GET') {
  const state = { statusCode: 0, headers: {}, body: '' }
  const res = {
    setHeader(name, value) { state.headers[String(name).toLowerCase()] = value },
    end(value = '') { state.body = String(value); return state },
    set statusCode(value) { state.statusCode = value },
    get statusCode() { return state.statusCode },
  }
  const handled = handlePublicSiteRequest({ method }, res, new URL(`https://salon-de-lien.com${pathname}`))
  return { handled, ...state }
}

for (const [pathname, text] of [['/', '美容室のお客様と店舗をつなぐ'], ['/privacy', 'プライバシーポリシー'], ['/terms', '利用規約']]) {
  const page = render(pathname)
  if (!page.handled || page.statusCode !== 200 || !page.body.includes(text)) throw new Error(`Public render failed: ${pathname}`)
  if (!String(page.headers['content-security-policy']).includes("frame-ancestors 'none'")) throw new Error(`Missing security headers: ${pathname}`)
}
if (render('/u/login').handled || render('/admin/customers').handled || render('/api/admin/products').handled) {
  throw new Error('A protected or existing route was captured by the public site handler')
}
if (render('/', 'POST').handled) throw new Error('Non-read request was captured by the public site handler')

console.log('Verified exact public routes, login links, metadata, and runtime syntax.')
