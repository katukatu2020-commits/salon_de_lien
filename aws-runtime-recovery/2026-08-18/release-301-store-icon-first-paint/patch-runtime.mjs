import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(process.argv[2] || '/app')
const files = {
  server: 'server.js',
  storeStaff: 'customer-store-staff-v276.js',
}
const expectedHashes = {
  [files.server]: '5d4ce4a424cf41b28ad5124e507ab2c12369d0582ab394d05f23dde08d21091e',
  [files.storeStaff]: '72210bd0fd01fa11bc170682d54e2bc30896d50da653c006b4f80acde3e8ac85',
}

function readChecked(name) {
  const target = path.join(root, name)
  const source = fs.readFileSync(target, 'utf8')
  const actual = crypto.createHash('sha256').update(source).digest('hex')
  if (actual !== expectedHashes[name]) {
    throw new Error(`Release 301 parent mismatch: ${name} expected ${expectedHashes[name]}, received ${actual}`)
  }
  return source
}

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`Release 301 expected one ${label}, found ${count}`)
  return source.replace(before, after)
}

let server = readChecked(files.server)
server = replaceOnce(
  server,
  '<img src="/api/lien-store-icon" alt="" onerror="this.onerror=null;this.src=\'/brand/salon-customer-service-mark.svg\'">',
  '<img src="/api/lien-store-icon" alt="" width="34" height="34" decoding="async" fetchpriority="high" style="display:block;width:34px;height:34px;max-width:34px;max-height:34px;object-fit:cover" onerror="this.onerror=null;this.src=\'/brand/salon-customer-service-mark.svg\'">',
  'customer header store icon',
)
fs.writeFileSync(path.join(root, files.server), server, 'utf8')

let storeStaff = readChecked(files.storeStaff)
storeStaff = replaceOnce(
  storeStaff,
  '<img src="/api/lien-store-icon?organizationId=${encodeURIComponent(store.organizationId)}" alt="${escapeHtml(store.name)}の店舗アイコン" onerror="this.style.display=\'none\';this.parentElement.textContent=\'${String(store.name || \'店\').trim().slice(0, 1)}\'">',
  '<img src="/api/lien-store-icon?organizationId=${encodeURIComponent(store.organizationId)}" alt="${escapeHtml(store.name)}の店舗アイコン" width="52" height="52" loading="lazy" decoding="async" style="display:block;width:52px;height:52px;max-width:52px;max-height:52px;object-fit:cover" onerror="this.style.display=\'none\';this.parentElement.textContent=\'${String(store.name || \'店\').trim().slice(0, 1)}\'">',
  'registered store icon',
)
fs.writeFileSync(path.join(root, files.storeStaff), storeStaff, 'utf8')

console.log('Release 301 store icon first-paint patch applied.')
