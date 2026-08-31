import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
const client = fs.readFileSync(path.join(root, 'customer-experience-v506.js'), 'utf8')
const css = fs.readFileSync(path.join(root, 'customer-experience-v506.css'), 'utf8')

const checks = [
  [server.includes("X-Lien-Customer-Experience', 'v506"), 'readiness header'],
  [server.includes("url.pathname === '/customer-experience-v506.js'"), 'client route'],
  [server.includes("url.pathname === '/customer-experience-v506.css'"), 'stylesheet route'],
  [server.includes('customer-experience-style-v506'), 'stylesheet injection'],
  [server.includes('customer-experience-script-v506'), 'client injection'],
  [server.includes('__orimiaCustomerLoaderV506'), 'hydration-safe asset loader'],
  [!server.includes('<link id="customer-experience-style-v506"'), 'no injected stylesheet node'],
  [!server.includes('<script id="customer-experience-script-v506"'), 'no injected script node'],
  [server.includes("transformOrimiaHtmlV500(Buffer.concat(chunks).toString('utf8'), req.url)"), 'customer route scoping'],
  [client.includes('cx-menu-picker-v506'), 'searchable menu picker'],
  [client.includes('HTMLFormElement.prototype.submit.call(form)'), 'profile native submission'],
  [client.includes('cx-slot-confirmed-v506'), 'booking confirmation mark'],
  [client.includes('cx-login-shell-v506'), 'login layout enhancer'],
  [client.includes("window.addEventListener('load', start"), 'post-load startup'],
  [client.includes("'requestIdleCallback' in window"), 'idle hydration guard'],
  [css.includes('.cx-menu-dialog-v506'), 'menu dialog styles'],
  [css.includes('button.cx-slot-selected-v506'), 'selected slot styles'],
  [css.includes('.cx-login-main-v506'), 'login styles'],
]

for (const [passed, label] of checks) {
  if (!passed) throw new Error(`customer experience verification failed: ${label}`)
}

for (const marker of ['customer-experience-style-v506', 'customer-experience-script-v506']) {
  const count = server.split(marker).length - 1
  if (count < 2) throw new Error(`${marker}: expected definition and injection references`)
}

console.log('[customer-experience-v506] runtime verified')
