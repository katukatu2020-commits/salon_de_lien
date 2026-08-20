const crypto = require('node:crypto')
const fs = require('node:fs')

const file = '/app/server.js'
const expectedHash = 'a455cecbdeb9a246fc2a76bb380537a97162c88d418c7daa961f3028335de5ca'
let source = fs.readFileSync(file, 'utf8')
const actualHash = crypto.createHash('sha256').update(source).digest('hex')

if (actualHash !== expectedHash) {
  throw new Error(`Customer header parent mismatch: expected ${expectedHash}, received ${actualHash}`)
}

const before = '  const left = `<a class="icon-button customer-store-icon" href="/u/home" aria-label="ホーム"><img src="/api/lien-store-icon" alt="" width="34" height="34" decoding="async" fetchpriority="high" style="display:block;width:34px;height:34px;max-width:34px;max-height:34px;object-fit:cover" onerror="this.onerror=null;this.src=\'/brand/salon-customer-service-mark.svg\'"></a>`'
const after = '  const left = `<a class="icon-button customer-menu-button" href="/u/menu" aria-label="メニューを開く">${customerIcon(\'menu\')}</a>`'

const matches = source.split(before).length - 1
if (matches !== 1) {
  throw new Error(`Expected one customer header store icon, found ${matches}`)
}

source = source.replace(before, after)
fs.writeFileSync(file, source, 'utf8')

const verified = fs.readFileSync(file, 'utf8')
if (!verified.includes(after)) throw new Error('Customer menu button was not written')
if (verified.includes('const left = `<a class="icon-button customer-store-icon"')) {
  throw new Error('Legacy customer header store icon remains')
}

console.log('Customer header now uses the shared menu button.')
