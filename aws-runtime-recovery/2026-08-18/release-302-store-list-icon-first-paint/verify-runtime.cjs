const fs = require('fs')
const path = require('path')

const root = path.resolve(process.argv[2] || '/app')
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
const customerLinks = fs.readFileSync(path.join(root, 'customer-links-v293.js'), 'utf8')
const storeStaff = fs.readFileSync(path.join(root, 'customer-store-staff-v276.js'), 'utf8')
const assert = (condition, message) => { if (!condition) throw new Error(message) }

assert(server.includes('width="34" height="34" decoding="async" fetchpriority="high"'), 'header store icon intrinsic dimensions are missing')
assert(customerLinks.includes('width="52" height="52" loading="lazy" decoding="async"'), 'active registered-store icon intrinsic dimensions are missing')
assert(customerLinks.includes('style="display:block;width:52px;height:52px;max-width:52px;max-height:52px;object-fit:cover"'), 'active registered-store icon inline dimensions are missing')
assert(storeStaff.includes('width="52" height="52" loading="lazy" decoding="async"'), 'fallback registered-store icon intrinsic dimensions are missing')
assert(!customerLinks.includes('alt="${escapeHtml(store.name)}の店舗アイコン">'), 'unsized active registered-store icon remains')

console.log('Release 302 registered-store icon first-paint verification passed.')
