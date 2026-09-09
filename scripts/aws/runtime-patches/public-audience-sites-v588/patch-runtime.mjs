import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const marker = 'public-audience-sites-v588'
function once(source, before, after) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${marker}: expected exactly one match, found ${count}: ${before.slice(0,100)}`)
  return source.replace(before, after)
}
function replaceFunction(source, name, nextName, body) {
  const start = `function ${name}(`
  const end = `\nfunction ${nextName}(`
  if (source.split(start).length !== 2 || source.split(end).length !== 2) throw new Error(`Function boundary mismatch: ${name}`)
  const from = source.indexOf(start)
  const to = source.indexOf(end, from)
  if (to < from) throw new Error(`Invalid function order: ${name}`)
  return source.slice(0, from) + body + '\n' + source.slice(to)
}
let publicSite = fs.readFileSync(path.join(root, 'public-site.js'), 'utf8').replace(/\r\n/g, '\n')
if (publicSite.includes(marker)) throw new Error('Public audience routes already patched')
publicSite = once(publicSite, "'use strict'", `'use strict'\nconst fs = require('fs')\nconst path = require('path')\nconst { renderAudiencePage, renderAudienceHeader, renderAudienceFooter, ROUTES } = require('./audience-sites')\n/* ${marker} */`)
publicSite = replaceFunction(publicSite, 'homePage', 'contactBox', "function homePage() {\n  return renderAudiencePage('/', { onboardingEnabled: process.env.BILLING_ONBOARDING_ENABLED === 'true' })\n}")
publicSite = replaceFunction(publicSite, 'header', 'footer', "function header() {\n  return renderAudienceHeader('/').replaceAll('href=\"#', 'href=\"/#').replace('href=\"/#main\"', 'href=\"#main\"')\n}")
publicSite = replaceFunction(publicSite, 'footer', 'document', "function footer() {\n  return renderAudienceFooter('/').replaceAll('href=\"#', 'href=\"/#')\n}")
publicSite = once(publicSite, '<style>${publicCss()}</style>', '<style>${publicCss()}</style><link rel="stylesheet" href="/orimia-public-v588.css">')
publicSite = once(publicSite, '${header()}<main>${body}</main>${footer()}', '${header()}<main id="main">${body}</main>${footer()}')
publicSite = once(publicSite, "style-src 'unsafe-inline'; script-src 'none'", "style-src 'self' 'unsafe-inline'; script-src 'none'")
publicSite = once(publicSite, "'public, max-age=300, s-maxage=600'", "'public, max-age=0, must-revalidate'")
const oldHomeRoute = `  if (url.pathname === '/') {
    sendHtml(req, res, homePage())
    return true
  }`
const newPublicRoutes = `  if (url.pathname === '/orimia-public-v588.css') {
    res.statusCode = 200
    res.setHeader('Content-Type', 'text/css; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.end(req.method === 'HEAD' ? undefined : fs.readFileSync(path.join(__dirname, 'orimia-public-v588.css')))
    return true
  }
  if (url.pathname !== '/' && url.pathname.endsWith('/') && ROUTES.includes(url.pathname.slice(0, -1))) {
    res.statusCode = 308
    res.setHeader('Location', url.pathname.slice(0, -1) + url.search)
    res.end()
    return true
  }
  if (ROUTES.includes(url.pathname)) {
    res.setHeader('X-Lien-Public-Audience-Sites', 'v588')
    sendHtml(req, res, renderAudiencePage(url.pathname, { onboardingEnabled: process.env.BILLING_ONBOARDING_ENABLED === 'true' }))
    return true
  }
  if (url.pathname === '/sitemap.xml' || url.pathname === '/robots.txt') {
    const sitemap = url.pathname === '/sitemap.xml'
    res.statusCode = 200
    res.setHeader('Content-Type', sitemap ? 'application/xml; charset=utf-8' : 'text/plain; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=300')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    const body = sitemap
      ? '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + [...ROUTES, '/privacy', '/terms'].map(route => '<url><loc>' + SITE_URL + route + '</loc></url>').join('') + '</urlset>'
      : 'User-agent: *\\nAllow: /\\nDisallow: /admin\\nDisallow: /dealer\\nDisallow: /u/\\nDisallow: /api/\\nSitemap: ' + SITE_URL + '/sitemap.xml\\n'
    res.end(req.method === 'HEAD' ? undefined : body)
    return true
  }`
publicSite = once(publicSite, oldHomeRoute, newPublicRoutes)
fs.writeFileSync(path.join(root, 'public-site.js'), publicSite)
let server = fs.readFileSync(path.join(root, 'server.js'), 'utf8').replace(/\r\n/g, '\n')
const previous = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Store-Inbound-Auto', 'v587') /* store-inbound-auto-v587 */"
server = once(server, previous, `${previous}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Public-Audience-Sites', 'v588') /* ${marker} */`)
fs.writeFileSync(path.join(root, 'server.js'), server)
console.log(JSON.stringify({ release:marker, customerOnlyHome:true, businessRoutes:['/business','/business/salon','/business/dealer'] }))
