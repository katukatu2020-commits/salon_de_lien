import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const server = fs.readFileSync(`${root}/server.js`, 'utf8')
const runtime = fs.readFileSync(`${root}/public/orimia-brand-v500.js`, 'utf8')
const manifest = JSON.parse(fs.readFileSync(`${root}/public/orimia.webmanifest`, 'utf8'))

for (const marker of [
  "X-Lien-Campaign-Tablet-Layout', 'v499'",
  "X-Orimia-Branding', 'v500'",
  'installOrimiaHtmlBrandingV500(req, res)',
  'transformOrimiaHtmlV500',
  "orimiaEnvNameV500 of ['POSTMARK_FROM_NAME', 'PASSWORD_RESET_MAIL_FROM_NAME']",
  '/orimia-brand-v500.js?v=500',
  "path.join(dir, 'public', 'brand', 'orimia-icon-32.png')",
]) assert.ok(server.includes(marker), `${marker} missing from server`)

assert.equal((server.match(/X-Orimia-Branding/g) || []).length, 1)
assert.match(runtime, /const BRAND = 'ORIMIA'/)
assert.match(runtime, /https:\/\/salon-de-lien\.com\//)
assert.match(runtime, /apple-mobile-web-app-title/)
assert.match(runtime, /orimia-icon-180\.png/)
assert.equal(manifest.name, 'ORIMIA')
assert.equal(manifest.short_name, 'ORIMIA')
assert.equal(manifest.start_url, '/')
assert.ok(manifest.icons.some(icon => icon.purpose === 'maskable'))

for (const name of ['orimia-icon-32.png', 'orimia-icon-48.png', 'orimia-icon-180.png', 'orimia-icon-192.png', 'orimia-icon-512.png', 'orimia-icon-maskable-512.png']) {
  const file = path.join(root, 'public', 'brand', name)
  assert.ok(fs.existsSync(file), `${name} missing`)
  const signature = fs.readFileSync(file).subarray(0, 8).toString('hex')
  assert.equal(signature, '89504e470d0a1a0a', `${name} is not a PNG`)
}

console.log('ORIMIA branding v500 runtime verification passed')
