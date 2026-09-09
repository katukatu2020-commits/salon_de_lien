import fs from 'node:fs'
import path from 'node:path'
const root = process.env.LIEN_RUNTIME_ROOT || '/app'
function once(source, before, after, name) {
  if (source.split(before).length !== 2) throw new Error('v592 unexpected parent: ' + name)
  return source.replace(before, after)
}
const billingFile = path.join(root, 'billing.js')
let billing = fs.readFileSync(billingFile, 'utf8').replace(/\r\n/g, '\n')
const start = billing.indexOf('      const actionCard = sent\n', billing.indexOf('  async function registrationPage('))
const end = billing.indexOf('\n      return\n', start)
if (start < 0 || end < start || end - start > 5000) throw new Error('v592 entry rendering anchors missing')
billing = billing.slice(0, start) + `      const document = require('./store-registration-v592.js').renderEntry({ icon: uiIcon, ready: config.ready, errorText, sent, registered, tokenMinutes: registrationTokenMinutes() })
      sendHtml(res, config.ready ? 200 : 503, document)` + billing.slice(end)
const prefix = `const content = '<div class="registrationWrap">' + onboardingSteps(1) + registrationIntro(config) + readiness + (errorText ? '<div class="notice danger" role="alert">' + htmlEscape(errorText) + '</div>' : '') +`
billing = once(billing, prefix, `const content = '<div class="store-register-setup-content">' + readiness + (errorText ? '<div class="notice danger" role="alert">' + htmlEscape(errorText) + '</div>' : '') +`, 'verified setup wrapper')
billing = once(billing, "sendHtml(res, 200, pageShell('新規店舗登録', content, null, { wide: true }))", "sendHtml(res, 200, require('./store-registration-v592.js').renderPage({ icon: uiIcon, content, setup: true }))", 'verified setup page')
fs.writeFileSync(billingFile, billing)

const serverFile = path.join(root, 'server.js')
let server = fs.readFileSync(serverFile, 'utf8').replace(/\r\n/g, '\n')
const route = "  const adminRoute = pathname === '/admin' || pathname.startsWith('/admin/')"
server = once(server, route, route + "\n  if (pathname === '/admin/register') return output /* store-registration-layout-v592: standalone shared auth layout */", 'exclude workspace-only decorators')
const ready = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Store-Session', 'v591')"
server = once(server, ready, ready + "\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Store-Registration-Layout', 'v592')", 'readiness')
fs.writeFileSync(serverFile, server)
console.log(JSON.stringify({ release: 'store-registration-layout-v592', sharedDealerStyles: true, registrationHandlerUnchanged: true }))
