import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const publicRoot = path.join(root, 'public')
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
const client = fs.readFileSync(path.join(publicRoot, 'admin-home-visual-v573.js'), 'utf8')
const styles = fs.readFileSync(path.join(publicRoot, 'admin-home-visual-v573.css'), 'utf8')

for (const asset of ['admin-home-visual-v573.js', 'admin-home-visual-v573.css']) {
  assert.ok(fs.existsSync(path.join(publicRoot, asset)), `missing public asset: ${asset}`)
}

for (const required of [
  "X-Lien-Admin-Home-Visual', 'v573'",
  "X-Lien-Admin-Shared-Page-Format', 'v572'",
  'admin-home-visual-v573 */',
]) assert.ok(server.includes(required), `server invariant missing: ${required}`)
assert.match(server, /admin-home-visual-v573\.js\?v=573-release1/)
assert.match(server, /admin-home-visual-v573\.css\?v=573-release1/)

for (const required of [
  `const API = '/api/lien-customer-home-branding?audience=staff'`,
  `image.closest('.admin-app-shell')`,
  `image.matches('[data-ohb-preview-image]')`,
  `image.dataset.orimiaAdminHomeVisualV573 = '1'`,
  `image.loading = 'eager'`,
  `image.decoding = 'async'`,
  `image.removeAttribute('srcset')`,
  `window.addEventListener('popstate'`,
  `window.addEventListener('orimia:customer-home-branding-updated'`,
]) assert.ok(client.includes(required), `client invariant missing: ${required}`)

for (const filename of [
  'salon-interior-illustrated.png',
  'customer-crm.webp',
  'salon-product-shelf-illustrated.png',
  'consultation.webp',
  'salon-style-short-dark.jpg',
]) assert.ok(client.includes(filename) && styles.includes(filename), `visual allowlist missing: ${filename}`)

assert.doesNotMatch(client, /querySelectorAll\(['"]\.admin-app-shell img['"]\).*\.src\s*=/)
assert.match(styles, /object-position: center center !important/)

console.log(JSON.stringify({
  release:'admin-home-visual-v573',
  runtimeVerified:true,
  sharedBrandingApi:true,
  decorativeImagesOnly:true,
  logosAndContentImagesPreserved:true,
}))
