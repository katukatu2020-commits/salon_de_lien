'use strict'
const fs = require('node:fs'), path = require('node:path')
const root = process.env.LIEN_RUNTIME_ROOT || '/app'
function replace(file, before, after, count = 1) {
  const target = path.join(root, file), source = fs.readFileSync(target, 'utf8')
  const found = source.split(before).length - 1
  if (found !== count) throw Error(`${file}: expected ${count}, found ${found}: ${before.slice(0,100)}`)
  fs.writeFileSync(target, source.split(before).join(after))
}
fs.copyFileSync(path.join(__dirname, 'customer-kana.cjs'), path.join(root, 'customer-kana-v707.cjs'))
const file = '.next/server/chunks/3491.js'
replace(file, 'let q=await(async()=>{let customerRowsV476=', 'const kanaHelperV707=require("/app/customer-kana-v707.cjs"),kanaRowsV707=await kanaHelperV707.loadCustomerKanaRows(w._,t.organizationId),kanaByIdV707=new Map(kanaRowsV707.map(row=>[row.id,kanaHelperV707.customerKana(row)]));let q=await(async()=>{let customerRowsV476=')
replace(file, 'organizationId:t.organizationId??void 0,OR:[{name:{contains:s,mode:"insensitive"}}', 'organizationId:t.organizationId??void 0,OR:[{id:{in:kanaHelperV707.matchingCustomerKanaIds(kanaRowsV707,s)}},{name:{contains:s,mode:"insensitive"}}')
replace(file, 'className:"truncate text-base font-semibold text-[color:var(--lien-ink)]",children:e.customer.name', 'className:"text-base font-semibold text-[color:var(--lien-ink)]",style:{whiteSpace:"normal",overflowWrap:"anywhere"},"data-customer-name-v707":"",children:kanaHelperV707.formatCustomerNameWithKana(e.customer.name,kanaByIdV707.get(e.customer.id)??"")')
replace(file, 'className:"inline-flex min-h-9 items-center rounded-full px-3 font-semibold text-stone-950 transition hover:bg-[color:var(--lien-surface-soft)] hover:text-[color:var(--lien-primary-dark)]",children:e.customer.name', 'className:"inline-flex min-h-9 items-center rounded-full px-3 font-semibold text-stone-950 transition hover:bg-[color:var(--lien-surface-soft)] hover:text-[color:var(--lien-primary-dark)]",style:{maxWidth:"24rem",whiteSpace:"normal",overflowWrap:"anywhere"},"data-customer-name-v707":"",children:kanaHelperV707.formatCustomerNameWithKana(e.customer.name,kanaByIdV707.get(e.customer.id)??"")')
// Update the shared search prompt in both SSR and hydration bundles.
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(target)
    else if (entry.name.endsWith('.js')) {
      const source = fs.readFileSync(target, 'utf8')
      if (source.includes('顧客名・電話・メモで検索')) fs.writeFileSync(target, source.replaceAll('顧客名・電話・メモで検索', '顧客名・フリガナ・電話・メモで検索'))
    }
  }
}
walk(path.join(root, '.next/server')); walk(path.join(root, '.next/static'))
const ready = "if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Campaign-Coupon-Confirm', 'v706')"
replace('server.js', ready, ready + "\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Kana-Search', 'v707')")
console.log('customer-kana-search-v707 patched')
