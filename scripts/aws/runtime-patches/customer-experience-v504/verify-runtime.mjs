import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
const client = fs.readFileSync(path.join(root, 'customer-experience-v504.js'), 'utf8')
const css = fs.readFileSync(path.join(root, 'customer-experience-v504.css'), 'utf8')

const checks = [
  [server.includes("X-Lien-Customer-Experience', 'v504"), 'readiness header'],
  [server.includes("url.pathname === '/customer-experience-v504.js'"), 'client route'],
  [server.includes("url.pathname === '/customer-experience-v504.css'"), 'stylesheet route'],
  [server.includes('customer-experience-style-v504'), 'stylesheet injection'],
  [server.includes('customer-experience-script-v504'), 'client injection'],
  [server.includes("transformOrimiaHtmlV500(Buffer.concat(chunks).toString('utf8'), req.url)"), 'customer route scoping'],
  [client.includes('cx-menu-picker-v504'), 'searchable menu picker'],
  [client.includes('HTMLFormElement.prototype.submit.call(form)'), 'profile native submission'],
  [client.includes('cx-slot-confirmed-v504'), 'booking confirmation mark'],
  [client.includes('cx-login-shell-v504'), 'login layout enhancer'],
  [css.includes('.cx-menu-dialog-v504'), 'menu dialog styles'],
  [css.includes('button.cx-slot-selected-v504'), 'selected slot styles'],
  [css.includes('.cx-login-main-v504'), 'login styles'],
]

for (const [passed, label] of checks) {
  if (!passed) throw new Error(`customer experience verification failed: ${label}`)
}

for (const marker of ['customer-experience-style-v504', 'customer-experience-script-v504']) {
  const count = server.split(marker).length - 1
  if (count < 2) throw new Error(`${marker}: expected definition and injection references`)
}

console.log('[customer-experience-v504] runtime verified')
