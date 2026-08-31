import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
const client = fs.readFileSync(path.join(root, 'customer-experience-v508.js'), 'utf8')
const css = fs.readFileSync(path.join(root, 'customer-experience-v508.css'), 'utf8')
const refreshedLayoutPath = path.join(
  root,
  '.next',
  'static',
  'chunks',
  'app',
  'u',
  '(account)',
  'layout-customer-mobile-nav-v425.orimia-v508.js',
)
const refreshedLayout = fs.readFileSync(refreshedLayoutPath, 'utf8')
const reactRuntime = fs.readFileSync(
  path.join(root, '.next', 'static', 'chunks', 'fd9d1056-1a7295bc74a0a1bb.js'),
  'utf8',
)

const checks = [
  [server.includes("X-Lien-Customer-Experience', 'v508"), 'readiness header'],
  [server.includes("url.pathname === '/customer-experience-v508.js'"), 'client route'],
  [server.includes("url.pathname === '/customer-experience-v508.css'"), 'stylesheet route'],
  [server.includes('customer-experience-style-v508'), 'stylesheet injection'],
  [server.includes('customer-experience-script-v508'), 'client injection'],
  [server.includes('__orimiaCustomerLoaderV508'), 'hydration-safe asset loader'],
  [server.includes('CUSTOMER_LAYOUT_REFRESHED_CHUNK_V508'), 'cache-safe layout rewrite'],
  [!server.includes('CUSTOMER_REACT_DIAGNOSTIC_CHUNK_V507'), 'diagnostic chunk rewrite removed'],
  [!server.includes('<link id="customer-experience-style-v508"'), 'no injected stylesheet node'],
  [!server.includes('<script id="customer-experience-script-v508"'), 'no injected script node'],
  [server.includes("transformOrimiaHtmlV500(Buffer.concat(chunks).toString('utf8'), req.url)"), 'customer route scoping'],
  [refreshedLayout.includes('ORIMIA'), 'refreshed customer layout branding'],
  [!refreshedLayout.includes('Salon de Lien'), 'stale customer layout branding removed'],
  [!reactRuntime.includes('[ORIMIA_HYDRATION_DIFF]'), 'React diagnostic removed'],
  [client.includes('cx-menu-picker-v508'), 'searchable menu picker'],
  [client.includes('HTMLFormElement.prototype.submit.call(form)'), 'profile native submission'],
  [client.includes('cx-slot-confirmed-v508'), 'booking confirmation mark'],
  [client.includes('cx-login-shell-v508'), 'login layout enhancer'],
  [client.includes("window.addEventListener('load', start"), 'post-load startup'],
  [client.includes("'requestIdleCallback' in window"), 'idle hydration guard'],
  [css.includes('.cx-menu-dialog-v508'), 'menu dialog styles'],
  [css.includes('button.cx-slot-selected-v508'), 'selected slot styles'],
  [css.includes('.cx-login-main-v508'), 'login styles'],
]

for (const [passed, label] of checks) {
  if (!passed) throw new Error(`customer experience verification failed: ${label}`)
}

for (const marker of ['customer-experience-style-v508', 'customer-experience-script-v508']) {
  const count = server.split(marker).length - 1
  if (count < 2) throw new Error(`${marker}: expected definition and injection references`)
}

console.log('[customer-experience-v508] runtime verified')
