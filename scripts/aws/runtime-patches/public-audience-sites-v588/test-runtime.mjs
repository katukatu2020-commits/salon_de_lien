import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import path from 'node:path'
import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const require = createRequire(path.join(root, 'package.json'))
const { handlePublicSiteRequest } = require(path.join(root, 'public-site.js'))
const { renderAudiencePage } = require(path.join(root, 'audience-sites.js'))

function request(pathname, method = 'GET') {
  const res = { headers:{}, body:undefined, setHeader(name, value) { this.headers[name.toLowerCase()] = value }, end(value) { this.body = value } }
  const handled = handlePublicSiteRequest({ method }, res, new URL(pathname, 'https://salon-de-lien.com'))
  return { handled, ...res }
}
for (const route of ['/', '/business', '/business/salon', '/business/dealer', '/privacy', '/terms']) {
  const get = request(route)
  assert.equal(get.handled, true)
  assert.equal(get.statusCode, 200)
  assert.ok(get.body.startsWith('<!doctype html>'))
  assert.ok(get.body.includes('/orimia-public-v588.css'))
  for (const [, asset] of get.body.matchAll(/src="(\/brand\/[^"?]+)(?:\?[^"\s]*)?"/g)) {
    assert.ok(fs.existsSync(path.join(process.env.PUBLIC_ASSET_ROOT || path.join(root, 'public'), asset)), `Missing public asset: ${asset}`)
  }
  assert.equal(get.headers['cache-control'], 'public, max-age=0, must-revalidate')
  assert.ok(get.headers['content-security-policy'].includes("script-src 'none'"))
  assert.ok(get.headers['content-security-policy'].includes("style-src 'self'"))
  const head = request(route, 'HEAD')
  assert.equal(head.handled, true)
  assert.equal(head.statusCode, 200)
  assert.equal(head.body, undefined)
  assert.equal(request(route, 'POST').handled, false)
}
for (const route of ['/admin', '/admin/login', '/admin/register', '/dealer/login', '/dealer/register', '/u/login', '/api/auth/login', '/business/private']) {
  assert.equal(request(route).handled, false, `unrelated route intercepted: ${route}`)
}
assert.equal(renderAudiencePage('/business/unknown'), null)
for (const route of ['/business', '/business/salon', '/business/dealer']) {
  const redirect = request(route + '/?source=test')
  assert.equal(redirect.statusCode, 308)
  assert.equal(redirect.headers.location, route + '?source=test')
}
assert.ok(!request('/').body.includes('/admin/'))
assert.ok(!request('/').body.includes('/dealer/'))
assert.ok(!request('/').body.includes('/business'))
assert.ok(!renderAudiencePage('/business/salon', { onboardingEnabled:false }).includes('href="/admin/register"'))
assert.ok(renderAudiencePage('/business/salon', { onboardingEnabled:true }).includes('href="/admin/register"'))
assert.ok(request('/business/dealer').body.includes('href="/dealer/register"'))
assert.ok(request('/privacy').body.includes('070-9444-6007'))
assert.ok(request('/privacy').body.includes('href="/#services"'))
for (const asset of ['/orimia-public-v588.css', '/sitemap.xml', '/robots.txt']) {
  assert.equal(request(asset).statusCode, 200)
  assert.equal(request(asset, 'HEAD').body, undefined)
}
assert.ok(request('/sitemap.xml').body.includes('<loc>https://salon-de-lien.com/business/dealer</loc>'))
assert.ok(request('/robots.txt').body.includes('Disallow: /admin\n'))
console.log(JSON.stringify({ release:'public-audience-sites-v588', publicRoutes:true, privateRoutesPreserved:true, customerOnlyHome:true, registrationFlag:true, legalRoutes:true, headAndMethodIsolation:true, sitemap:true }))
