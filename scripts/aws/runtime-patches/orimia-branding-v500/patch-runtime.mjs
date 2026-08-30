import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const serverPath = `${root}/server.js`

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

function javascriptFiles(directory) {
  if (!fs.existsSync(directory)) return []
  const entries = fs.readdirSync(directory, { withFileTypes: true })
  return entries.flatMap(entry => {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) return javascriptFiles(target)
    return entry.isFile() && entry.name.endsWith('.js') ? [target] : []
  })
}

const standaloneFiles = fs.readdirSync(root, { withFileTypes: true })
  .filter(entry => entry.isFile() && entry.name.endsWith('.js'))
  .map(entry => path.join(root, entry.name))
const brandFiles = [
  ...standaloneFiles,
  ...javascriptFiles(`${root}/.next/server`),
  ...javascriptFiles(`${root}/.next/static`),
]

let replacementCount = 0
let modifiedFileCount = 0
for (const file of brandFiles) {
  const source = fs.readFileSync(file, 'utf8')
  let updated = source
  let fileReplacementCount = 0
  for (const [pattern, replacement] of [
    [/Salon de Lien/gi, 'ORIMIA'],
    [/Salon CRM/gi, 'ORIMIA CRM'],
    [/サロン・ド・リアン/g, 'ORIMIA'],
  ]) {
    const matches = updated.match(pattern) || []
    updated = updated.replace(pattern, replacement)
    fileReplacementCount += matches.length
  }
  if (!fileReplacementCount) continue
  fs.writeFileSync(file, updated)
  replacementCount += fileReplacementCount
  modifiedFileCount += 1
}
if (replacementCount < 20) throw new Error(`brand replacement coverage was unexpectedly low: ${replacementCount}`)

const htmlBrandingHelpers = `
for (const orimiaEnvNameV500 of ['POSTMARK_FROM_NAME', 'PASSWORD_RESET_MAIL_FROM_NAME']) {
  if (String(process.env[orimiaEnvNameV500] || '').trim().toLowerCase() === 'salon de lien') {
    process.env[orimiaEnvNameV500] = 'ORIMIA'
  }
}

const ORIMIA_HEAD_V500 = '<meta name="application-name" content="ORIMIA"><meta name="apple-mobile-web-app-title" content="ORIMIA"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="default"><meta name="theme-color" content="#ffffff"><link id="orimia-favicon-32" rel="icon" type="image/png" sizes="32x32" href="/brand/orimia-icon-32.png?v=500"><link id="orimia-favicon-192" rel="icon" type="image/png" sizes="192x192" href="/brand/orimia-icon-192.png?v=500"><link id="orimia-apple-touch-icon" rel="apple-touch-icon" sizes="180x180" href="/brand/orimia-icon-180.png?v=500"><link id="orimia-manifest" rel="manifest" href="/orimia.webmanifest?v=500"><style id="orimia-brand-style-v500">html body .orimia-brand-icon{background:#fff url("/brand/orimia-icon-192.png?v=500") center/cover no-repeat!important;color:transparent!important}.mark.orimia-brand-icon{overflow:hidden!important}</style><script src="/orimia-brand-v500.js?v=500" defer></script>'

function transformOrimiaHtmlV500(html) {
  let output = String(html || '')
    .replace(/Salon\\s+de\\s+Lien/gi, 'ORIMIA')
    .replace(/Salon\\s+CRM/gi, 'ORIMIA CRM')
    .replace(/サロン・ド・リアン/g, 'ORIMIA')
    .replaceAll('/brand/salon-customer-service-mark.svg', '/brand/orimia-icon-192.png?v=500')
    .replaceAll('<span class="mark">L</span>', '<span class="mark orimia-brand-icon" aria-hidden="true"></span>')
  if (!output.includes('/orimia-brand-v500.js')) {
    output = /<\\/head>/i.test(output)
      ? output.replace(/<\\/head>/i, ORIMIA_HEAD_V500 + '</head>')
      : ORIMIA_HEAD_V500 + output
  }
  return output
}

function installOrimiaHtmlBrandingV500(req, res) {
  if (req.method !== 'GET' || !String(req.headers.accept || '').includes('text/html')) return
  req.headers['accept-encoding'] = 'identity'
  const originalWrite = res.write.bind(res)
  const originalEnd = res.end.bind(res)
  const originalWriteHead = res.writeHead.bind(res)
  const chunks = []
  let ended = false

  res.writeHead = function (...args) {
    if (!res.headersSent) res.removeHeader('content-length')
    const candidate = args.length > 1 && typeof args[args.length - 1] === 'object' ? args[args.length - 1] : null
    if (candidate) {
      for (const key of Object.keys(candidate)) {
        if (key.toLowerCase() === 'content-length') delete candidate[key]
      }
    }
    return originalWriteHead(...args)
  }
  res.write = function (chunk, encoding, callback) {
    if (typeof encoding === 'function') { callback = encoding; encoding = undefined }
    if (chunk !== undefined && chunk !== null) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding))
    if (typeof callback === 'function') queueMicrotask(callback)
    return true
  }
  res.end = function (chunk, encoding, callback) {
    if (ended) return res
    ended = true
    if (typeof encoding === 'function') { callback = encoding; encoding = undefined }
    if (chunk !== undefined && chunk !== null) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding))
    const contentType = String(res.getHeader('content-type') || '')
    if (contentType.includes('text/html')) {
      const body = Buffer.from(transformOrimiaHtmlV500(Buffer.concat(chunks).toString('utf8')))
      if (!res.headersSent) {
        res.removeHeader('content-length')
        res.removeHeader('content-encoding')
      }
      return originalEnd(body, callback)
    }
    for (const part of chunks) originalWrite(part)
    return originalEnd(callback)
  }
}
`

let server = fs.readFileSync(serverPath, 'utf8')
server = replaceOnce(
  server,
  'const app = next({ dev: false, dir, conf: nextConfig })',
  `${htmlBrandingHelpers}\nconst app = next({ dev: false, dir, conf: nextConfig })`,
  'ORIMIA HTML branding helpers',
)
server = replaceOnce(
  server,
  "      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)",
  "      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)\n      installOrimiaHtmlBrandingV500(req, res)",
  'ORIMIA HTML response branding',
)
server = replaceOnce(
  server,
  "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Campaign-Tablet-Layout', 'v499')",
  "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Campaign-Tablet-Layout', 'v499')\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Orimia-Branding', 'v500')",
  'ORIMIA readiness marker',
)
server = replaceOnce(
  server,
  `      if (url.pathname === '/favicon.ico' && req.method === 'GET') {
        res.statusCode = 200
        res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8')
        res.setHeader('Cache-Control', 'public, max-age=86400')
        res.setHeader('X-Content-Type-Options', 'nosniff')
        res.end(fs.readFileSync(path.join(dir, 'public', 'brand', 'salon-customer-service-mark.svg')))
        return
      }`,
  `      if (url.pathname === '/favicon.ico' && req.method === 'GET') {
        res.statusCode = 200
        res.setHeader('Content-Type', 'image/png')
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        res.setHeader('X-Content-Type-Options', 'nosniff')
        res.end(fs.readFileSync(path.join(dir, 'public', 'brand', 'orimia-icon-32.png')))
        return
      }`,
  'ORIMIA favicon route',
)
fs.writeFileSync(serverPath, server)

console.log(JSON.stringify({ modifiedFileCount, replacementCount }))
