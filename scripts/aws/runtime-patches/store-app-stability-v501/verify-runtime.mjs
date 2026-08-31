import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const server = fs.readFileSync(`${root}/server.js`, 'utf8')
const commercial = fs.readFileSync(`${root}/commercial-admin-v101.js`, 'utf8')
const layoutRuntime = fs.readFileSync(`${root}/.next/static/chunks/app/layout-runtime-v450.js`, 'utf8')
const brand = fs.readFileSync(`${root}/public/orimia-brand-v501.js`, 'utf8')
const client = fs.readFileSync(`${root}/public/store-app-stability-v501.js`, 'utf8')

for (const marker of [
  "X-Orimia-Branding', 'v500'",
  "X-Lien-Store-App-Stability', 'v501'",
  '/orimia-brand-v501.js?v=501',
  '/store-app-stability-v501.js?v=501',
]) assert.ok(server.includes(marker), `${marker} missing from server`)

assert.ok(!server.includes(".replaceAll('/brand/salon-customer-service-mark.svg', '/brand/orimia-icon-192.png?v=500')"))
assert.ok(!server.includes(".replaceAll('<span class=\"mark\">L</span>'"))
assert.ok(!server.includes(".replace(/Salon\\s+de\\s+Lien/gi, 'ORIMIA')"))
assert.ok(!server.includes(".replace(/Salon\\s+CRM/gi, 'ORIMIA CRM')"))
assert.ok(!server.includes(".replace(/サロン・ド・リアン/g, 'ORIMIA')"))
assert.equal((server.match(/X-Lien-Store-App-Stability/g) || []).length, 1)
assert.match(server, /function transformOrimiaHtmlV500\(html\)[\s\S]*?return String\(html \|\| ''\)/)
assert.doesNotMatch(server, /output\.replace\(\/<\\\/head>/)

for (const marker of [
  'store-app-stability-v501-loader',
  '/orimia-brand-v501.js?v=501',
  '/store-app-stability-v501.js?v=501',
  "window.addEventListener('load', start, { once: true })",
]) assert.ok(layoutRuntime.includes(marker), `${marker} missing from layout runtime`)

for (const marker of [
  'store-app-stability-v501',
  "window.matchMedia('(max-width: 767px)').matches",
  "window.addEventListener('load', start, { once: true })",
  "if (typeof value === 'string') data.append(key, value)",
  "window.addEventListener('resize', schedule, { passive: true })",
]) assert.ok(commercial.includes(marker), `${marker} missing from commercial runtime`)

assert.ok(!commercial.includes("if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', start, { once: true })"))
assert.match(brand, /startAfterHydration/)
assert.doesNotMatch(brand, /span\.textContent\?\.trim\(\) !== 'L'/)

for (const marker of [
  'data-store-back-v501',
  'lien-route-line-v461',
  'data-store-duplicate-v501',
  'store-chat-toggle-v501',
  "params.get('chat') === '1'",
  'store-broadcast-flow-v501',
  'couponEnabled',
  'storeProductUploadV501',
  "reader.readAsDataURL(file)",
  "hidden.dispatchEvent(new Event('change'",
]) assert.ok(client.includes(marker), `${marker} missing from client runtime`)

console.log('store app stability v501 runtime verification passed')
