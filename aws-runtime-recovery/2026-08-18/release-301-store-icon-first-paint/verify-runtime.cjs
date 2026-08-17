const fs = require('fs')
const path = require('path')

const root = path.resolve(process.argv[2] || '/app')
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
const storeStaff = fs.readFileSync(path.join(root, 'customer-store-staff-v276.js'), 'utf8')
const assert = (condition, message) => { if (!condition) throw new Error(message) }

assert(server.includes('width="34" height="34" decoding="async" fetchpriority="high"'), 'header store icon intrinsic dimensions are missing')
assert(server.includes('style="display:block;width:34px;height:34px;max-width:34px;max-height:34px;object-fit:cover"'), 'header store icon inline dimensions are missing')
assert(storeStaff.includes('width="52" height="52" loading="lazy" decoding="async"'), 'registered store icon intrinsic dimensions are missing')
assert(storeStaff.includes('style="display:block;width:52px;height:52px;max-width:52px;max-height:52px;object-fit:cover"'), 'registered store icon inline dimensions are missing')
assert(!server.includes('<img src="/api/lien-store-icon" alt="" onerror='), 'unsized header store icon remains')
assert(!storeStaff.includes('の店舗アイコン" onerror='), 'unsized registered store icon remains')

console.log('Release 301 store icon first-paint verification passed.')
