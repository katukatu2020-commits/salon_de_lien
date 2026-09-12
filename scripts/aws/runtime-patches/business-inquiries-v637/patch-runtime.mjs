import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const marker = 'business-inquiries-v637'
const changes = []

function replaceExact(file, before, after, expected, label) {
  const target = path.join(root, file)
  const source = fs.readFileSync(target, 'utf8')
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  fs.writeFileSync(target, source.split(before).join(after))
  changes.push({ file, label, count })
}

function replaceBetween(file, start, end, replacement, label) {
  const target = path.join(root, file)
  const source = fs.readFileSync(target, 'utf8')
  const startIndex = source.indexOf(start)
  const endIndex = source.indexOf(end, startIndex + start.length)
  if (startIndex < 0 || endIndex < 0) throw new Error(`${label}: function boundaries were not found`)
  fs.writeFileSync(target, source.slice(0, startIndex) + replacement + '\n\n' + source.slice(endIndex))
  changes.push({ file, label, count: 1 })
}

function replaceFirst(file, before, after, label) {
  const target = path.join(root, file)
  const source = fs.readFileSync(target, 'utf8')
  const index = source.indexOf(before)
  if (index < 0) throw new Error(`${label}: expected text was not found`)
  fs.writeFileSync(target, source.slice(0, index) + after + source.slice(index + before.length))
  changes.push({ file, label, count: 1 })
}

replaceExact(
  'audience-sites.js',
  "'use strict'\n\nconst icons = require('./audience-icons')",
  "'use strict'\n\nconst { renderBusinessContactForm } = require('./business-inquiries-v637') /* business-inquiries-v637-renderer */\nconst icons = require('./audience-icons')",
  1,
  'load the business inquiry renderer',
)

replaceBetween(
  'audience-sites.js',
  'function contact(',
  'function customerPage()',
  `function contact(business = false, audience = 'other', inquiryStatus = '') {
  if (business) return renderBusinessContactForm({ audience, status: inquiryStatus })
  return \`<section id="contact" class="contact-section"><div class="wrap contact-layout"><div><p class="eyebrow">CONTACT</p><h2>お困りのときは</h2><p>予約やアカウントについて、サポート窓口へお問い合わせください。</p></div><address><a href="mailto:\${EMAIL}">\${EMAIL}</a><a href="tel:+817094446007">\${PHONE}</a></address></div></section>\`
}`,
  'render the business inquiry form in the contact section',
)

replaceExact('audience-sites.js', 'function businessPage() {', 'function businessPage(inquiryStatus) {', 1, 'pass inquiry status into the business page')
replaceExact('audience-sites.js', 'function salonPage(onboarding) {', 'function salonPage(onboarding, inquiryStatus) {', 1, 'pass inquiry status into the salon page')
replaceExact('audience-sites.js', 'function dealerPage() {', 'function dealerPage(inquiryStatus) {', 1, 'pass inquiry status into the dealer page')
replaceExact('audience-sites.js', "const register = 'mailto:support@salon-de-lien.com?subject=ORIMIA%20for%20Salon%20導入相談'", "const register = '#contact'", 1, 'make salon consultation CTA an in-page link')
replaceExact('audience-sites.js', "link('mailto:support@salon-de-lien.com?subject=ORIMIA%20Partner%20導入相談', '導入について相談する', 'primary')", "link('#contact', '導入について相談する', 'primary')", 2, 'make dealer consultation CTAs in-page links')
replaceFirst('audience-sites.js', 'contact(true)', "contact(true, 'other', inquiryStatus)", 'render the business root inquiry form')
replaceFirst('audience-sites.js', 'contact(true)', "contact(true, 'salon', inquiryStatus)", 'render the salon inquiry form')
replaceFirst('audience-sites.js', 'contact(true)', "contact(true, 'dealer', inquiryStatus)", 'render the dealer inquiry form')
replaceExact(
  'audience-sites.js',
  "const page = route === '/' ? customerPage() : route === '/business' ? businessPage() : route === '/business/salon' ? salonPage(options.onboardingEnabled) : dealerPage()",
  "const page = route === '/' ? customerPage() : route === '/business' ? businessPage(options.inquiryStatus) : route === '/business/salon' ? salonPage(options.onboardingEnabled, options.inquiryStatus) : dealerPage(options.inquiryStatus)",
  1,
  'render inquiry feedback on the selected audience page',
)
replaceExact('audience-sites.js', 'href="/orimia-public-v588.css"', 'href="/orimia-public-v637.css"', 1, 'use the immutable inquiry form stylesheet')

const inquiryCss = `
.business-contact-section .contact-layout { grid-template-columns: .8fr 1.2fr; align-items: start; gap: 64px; }
.contact-copy address { margin-top: 34px; }
.inquiry-panel { border: 1px solid #668077; border-radius: 8px; background: #fff; color: var(--ink); padding: 28px; }
.inquiry-heading { border-bottom: 1px solid var(--line); padding-bottom: 18px; margin-bottom: 22px; }
.inquiry-heading .eyebrow { color: var(--accent); }
.inquiry-heading h3 { margin: 3px 0 0; font-size: 22px; font-weight: 600; }
.inquiry-feedback { margin: 0 0 18px !important; border: 1px solid; border-radius: 6px; padding: 12px 14px; font-size: 12px !important; font-weight: 700; }
.inquiry-feedback.success { border-color: #a9cabb; background: #edf6f1; color: #255e48 !important; }
.inquiry-feedback.error { border-color: #c88; background: #fff1f1; color: #8d3333 !important; }
.business-inquiry-form { display: grid; gap: 18px; }
.inquiry-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 17px 14px; }
.inquiry-field { display: grid; gap: 7px; min-width: 0; color: var(--ink); font-size: 12px; font-weight: 700; }
.inquiry-field-wide { grid-column: 1 / -1; }
.inquiry-field b { color: var(--accent); font-size: 9px; }
.inquiry-field input,.inquiry-field select,.inquiry-field textarea { width: 100%; border: 1px solid #cfc4bc; border-radius: 5px; background: #fff; padding: 11px 12px; color: var(--ink); font: inherit; font-weight: 400; }
.inquiry-field input,.inquiry-field select { min-height: 46px; }
.inquiry-field textarea { resize: vertical; line-height: 1.7; }
.inquiry-field input:focus,.inquiry-field select:focus,.inquiry-field textarea:focus { outline: 3px solid rgba(196,67,105,.15); border-color: var(--accent); }
.inquiry-consent { display: flex; align-items: flex-start; gap: 9px; color: var(--muted); font-size: 11px; line-height: 1.6; }
.inquiry-consent input { width: 16px; height: 16px; flex: none; margin-top: 1px; accent-color: var(--accent); }
.inquiry-consent a { color: var(--accent); text-decoration: underline; text-underline-offset: 3px; }
.inquiry-submit { min-height: 50px; border: 0; border-radius: 5px; background: var(--accent); color: #fff; padding: 11px 20px; font: inherit; font-weight: 700; cursor: pointer; }
.inquiry-submit:hover { background: var(--accent-hover); }
.inquiry-honeypot { position: absolute !important; width: 1px !important; height: 1px !important; overflow: hidden !important; clip: rect(0,0,0,0) !important; white-space: nowrap !important; }
`
replaceExact('orimia-public-v637.css', '.contact-section address a:hover { color: #c6e8d8; }', '.contact-section address a:hover { color: #c6e8d8; }' + inquiryCss, 1, 'style the business inquiry form')
replaceExact('orimia-public-v637.css', '  .contact-layout { grid-template-columns: 1fr; gap: 30px; }', '  .contact-layout { grid-template-columns: 1fr; gap: 30px; }\n  .business-contact-section .contact-layout { grid-template-columns: 1fr; gap: 34px; }', 1, 'stack the contact form on tablet')
replaceExact('orimia-public-v637.css', '  .contact-section address a { font-size: 20px; }', '  .contact-section address a { font-size: 20px; }\n  .inquiry-panel { padding: 22px 18px; }\n  .inquiry-fields { grid-template-columns: 1fr; }\n  .inquiry-field-wide { grid-column: auto; }\n  .inquiry-heading h3 { font-size: 20px; }', 1, 'stack form fields on mobile')

replaceExact(
  'public-site.js',
  "  if (url.pathname === '/orimia-public-v588.css') {",
  `  if (url.pathname === '/orimia-public-v637.css') {
    res.statusCode = 200
    res.setHeader('Content-Type', 'text/css; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.end(req.method === 'HEAD' ? undefined : fs.readFileSync(path.join(__dirname, 'orimia-public-v637.css')))
    return true
  }
  if (url.pathname === '/orimia-public-v588.css') {`,
  1,
  'serve the immutable inquiry stylesheet',
)
replaceExact(
  'public-site.js',
  "sendHtml(req, res, renderAudiencePage(url.pathname, { onboardingEnabled: process.env.BILLING_ONBOARDING_ENABLED === 'true' }))",
  "sendHtml(req, res, renderAudiencePage(url.pathname, { onboardingEnabled: process.env.BILLING_ONBOARDING_ENABLED === 'true', inquiryStatus: url.searchParams.get('inquiry') || '' }))",
  1,
  'pass inquiry submission feedback to public pages',
)
replaceExact('public-site.js', "res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate')", "res.setHeader('Cache-Control', String(req.url || '').includes('inquiry=') ? 'private, no-store' : 'public, max-age=0, must-revalidate')", 1, 'prevent inquiry feedback pages from being cached')

replaceExact('server.js', "const { createPlatformOperatorService, pageShell: renderPlatformPage } = require('./platform-operator') /* platform-readonly-operations-v95 */", "const { createPlatformOperatorService, pageShell: renderPlatformPage } = require('./platform-operator') /* platform-readonly-operations-v95 */\nconst { createBusinessInquiryService } = require('./business-inquiries-v637') /* business-inquiries-v637 */", 1, 'load the business inquiry service')
replaceExact('server.js', 'const platformOperator = createPlatformOperatorService({ prisma, crypto }) /* platform-readonly-operations-v95-service */', 'const businessInquiriesV637 = createBusinessInquiryService({ prisma, crypto }) /* business-inquiries-v637-service */\nconst platformOperator = createPlatformOperatorService({ prisma, crypto, businessInquiries: businessInquiriesV637 }) /* platform-readonly-operations-v95-service */', 1, 'initialize the business inquiry service')
replaceExact('server.js', "      if (handlePublicSiteRequest(req, res, url)) return /* public-review-pages-v46-route */", "      if (await businessInquiriesV637.handlePublic(req, res, url)) return /* business-inquiries-v637-public-route */\n      if (handlePublicSiteRequest(req, res, url)) return /* public-review-pages-v46-route */", 1, 'handle public inquiry submissions before public pages')
replaceExact('server.js', "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Profile-Name-Fields', 'v636') /* customer-profile-name-fields-v636-ready */", "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Profile-Name-Fields', 'v636') /* customer-profile-name-fields-v636-ready */\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Business-Inquiries', 'v637') /* business-inquiries-v637-ready */", 1, 'business inquiry readiness marker')

replaceExact('platform-operator.js', "'use strict'\n\nconst COOKIE_NAME", "'use strict'\n\nconst { renderPlatformInbox } = require('./business-inquiries-v637') /* business-inquiries-v637-platform */\n\nconst COOKIE_NAME", 1, 'load the platform inquiry inbox renderer')
replaceExact('platform-operator.js', '<a class="readonly" href="/platform/accounts">アカウント発行</a><a class="readonly" href="/platform/customers">顧客台帳</a>', '<a class="readonly" href="/platform/accounts">アカウント発行</a><a class="readonly" href="/platform/inquiries">導入相談</a><a class="readonly" href="/platform/customers">顧客台帳</a>', 1, 'add the inquiry inbox to platform navigation')
replaceExact('platform-operator.js', '@media(max-width:680px){.top{height:64px;padding:0 15px}', '@media(max-width:680px){.top{height:auto;min-height:64px;padding:8px 15px;flex-wrap:wrap;gap:8px}.topRight{width:100%;overflow-x:auto;justify-content:flex-start;padding-bottom:2px}.topRight>*{flex:none}', 1, 'keep the expanded platform navigation usable on mobile')
replaceExact('platform-operator.js', 'function createPlatformOperatorService({ prisma, crypto }) {', 'function createPlatformOperatorService({ prisma, crypto, businessInquiries }) {', 1, 'accept the business inquiry service')

const platformRoutes = `    if (/^\\/api\\/platform\\/inquiries\\/[^/]+$/.test(url.pathname)) {
      if (req.method !== 'POST') { res.statusCode = 405; res.setHeader('Allow', 'POST'); res.end(); return true }
      if (!session(req)) { redirect(res, '/platform/login', 302); return true }
      if (!validSameOrigin(req)) { res.statusCode = 403; res.end(); return true }
      const inquiryId = decodeURIComponent(url.pathname.slice('/api/platform/inquiries/'.length)).slice(0, 160)
      const body = new URLSearchParams(await readBody(req))
      await businessInquiries.updateInquiry({ id: inquiryId, status: String(body.get('status') || ''), operatorNote: body.get('operatorNote') })
      redirect(res, '/platform/inquiries?updated=1', 303)
      return true
    }
    if (url.pathname === '/platform/inquiries') {
      if (req.method !== 'GET' && req.method !== 'HEAD') { res.statusCode = 405; res.setHeader('Allow', 'GET, HEAD'); res.end(); return true }
      if (!session(req)) { redirect(res, '/platform/login', 302); return true }
      try {
        const data = await businessInquiries.listInquiries({ status: url.searchParams.get('status') || 'all', audience: url.searchParams.get('audience') || 'all', query: url.searchParams.get('q') || '', page: url.searchParams.get('page') || '1', pageSize: 30 })
        data.updated = url.searchParams.get('updated') === '1'
        const content = renderPlatformInbox(data, pageShell)
        if (req.method === 'HEAD') { res.statusCode = 200; setSecurityHeaders(res); res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(); return true }
        html(res, 200, content)
      } catch (error) {
        console.error('Platform business inquiry inbox failed', { code: String(error && (error.code || error.message) || 'unknown').slice(0, 100) })
        html(res, 500, pageShell('導入相談', '<main class="loginMain"><section class="loginCard"><h1>導入相談を取得できません</h1><p>時間をおいて再度お試しください。</p></section></main>', true))
      }
      return true
    }

`
replaceExact('platform-operator.js', "    if (url.pathname === '/platform/customers') {", platformRoutes + "    if (url.pathname === '/platform/customers') {", 1, 'add platform inquiry inbox routes')

fs.writeFileSync('/tmp/business-inquiries-v637-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({ release: marker, modified: [...new Set(changes.map(change => change.file))] }))
