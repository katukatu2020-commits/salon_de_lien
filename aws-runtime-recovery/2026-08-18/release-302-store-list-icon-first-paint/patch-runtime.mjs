import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(process.argv[2] || '/app')
const targetName = 'customer-links-v293.js'
const expectedHash = 'c30cdcb8030c5b802453fc15f814bbecdc213ee7b79e93415c410e008c0f311f'
const target = path.join(root, targetName)
let source = fs.readFileSync(target, 'utf8')
const actualHash = crypto.createHash('sha256').update(source).digest('hex')

if (actualHash !== expectedHash) {
  throw new Error(`Release 302 parent mismatch: ${targetName} expected ${expectedHash}, received ${actualHash}`)
}

const before = '<img src="/api/lien-store-icon?organizationId=${encodeURIComponent(store.organizationId)}" alt="${escapeHtml(store.name)}の店舗アイコン">'
const after = '<img src="/api/lien-store-icon?organizationId=${encodeURIComponent(store.organizationId)}" alt="${escapeHtml(store.name)}の店舗アイコン" width="52" height="52" loading="lazy" decoding="async" style="display:block;width:52px;height:52px;max-width:52px;max-height:52px;object-fit:cover">'
const count = source.split(before).length - 1

if (count !== 1) {
  throw new Error(`Release 302 expected one registered-store icon, found ${count}`)
}

source = source.replace(before, after)
fs.writeFileSync(target, source, 'utf8')
console.log('Release 302 registered-store icon first-paint patch applied.')
