import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
const client = fs.readFileSync(path.join(root, 'customer-experience-v507.js'), 'utf8')
const css = fs.readFileSync(path.join(root, 'customer-experience-v507.css'), 'utf8')
const diagnosticChunkPath = path.join(root, '.next', 'static', 'chunks', 'fd9d1056-1a7295bc74a0a1bb.orimia-v507.js')
const diagnosticChunk = fs.readFileSync(diagnosticChunkPath, 'utf8')

const checks = [
  [server.includes("X-Lien-Customer-Experience', 'v507"), 'readiness header'],
  [server.includes("url.pathname === '/customer-experience-v507.js'"), 'client route'],
  [server.includes("url.pathname === '/customer-experience-v507.css'"), 'stylesheet route'],
  [server.includes('customer-experience-style-v507'), 'stylesheet injection'],
  [server.includes('customer-experience-script-v507'), 'client injection'],
  [server.includes('__orimiaCustomerLoaderV507'), 'hydration-safe asset loader'],
  [server.includes('CUSTOMER_REACT_DIAGNOSTIC_CHUNK_V507'), 'diagnostic chunk rewrite'],
  [!server.includes('<link id="customer-experience-style-v507"'), 'no injected stylesheet node'],
  [!server.includes('<script id="customer-experience-script-v507"'), 'no injected script node'],
  [server.includes("transformOrimiaHtmlV500(Buffer.concat(chunks).toString('utf8'), req.url)"), 'customer route scoping'],
  [client.includes('cx-menu-picker-v507'), 'searchable menu picker'],
  [client.includes('HTMLFormElement.prototype.submit.call(form)'), 'profile native submission'],
  [client.includes('cx-slot-confirmed-v507'), 'booking confirmation mark'],
  [client.includes('cx-login-shell-v507'), 'login layout enhancer'],
  [client.includes("window.addEventListener('load', start"), 'post-load startup'],
  [client.includes("'requestIdleCallback' in window"), 'idle hydration guard'],
  [css.includes('.cx-menu-dialog-v507'), 'menu dialog styles'],
  [css.includes('button.cx-slot-selected-v507'), 'selected slot styles'],
  [css.includes('.cx-login-main-v507'), 'login styles'],
  [diagnosticChunk.includes('[ORIMIA_HYDRATION_DIFF]'), 'React hydration text diagnostic'],
]

for (const [passed, label] of checks) {
  if (!passed) throw new Error(`customer experience verification failed: ${label}`)
}

for (const marker of ['customer-experience-style-v507', 'customer-experience-script-v507']) {
  const count = server.split(marker).length - 1
  if (count < 2) throw new Error(`${marker}: expected definition and injection references`)
}

console.log('[customer-experience-v507] runtime verified')
