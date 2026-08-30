import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const chunkDirectory = `${root}/.next/server/chunks`
const serverPath = `${root}/server.js`
const marker = 'customer-registration-filter-v496'

function replaceExact(source, before, after, expected, label) {
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  return source.split(before).join(after)
}

function replaceBetween(source, start, end, replacement, label) {
  const startIndex = source.indexOf(start)
  if (startIndex < 0) throw new Error(`${label}: start marker was not found`)
  const endIndex = source.indexOf(end, startIndex + start.length)
  if (endIndex < 0) throw new Error(`${label}: end marker was not found`)
  if (source.indexOf(start, startIndex + start.length) >= 0) throw new Error(`${label}: start marker was not unique`)
  return source.slice(0, startIndex) + replacement + source.slice(endIndex)
}

let patchedCount = 0

for (const entry of fs.readdirSync(chunkDirectory, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.js')) continue
  const file = `${chunkDirectory}/${entry.name}`
  let source = fs.readFileSync(file, 'utf8')
  if (!source.includes('customer-public-code-parity-v476-list')) continue

  source = replaceExact(
    source,
    'COALESCE(directUser."customerPublicCode",linkedUser."customerPublicCode") AS "customerPublicCode" FROM "Customer" c',
    'COALESCE(directUser."customerPublicCode",linkedUser."customerPublicCode") AS "customerPublicCode",(directUser."id" IS NOT NULL OR linkedUser."id" IS NOT NULL) AS "appRegistered" FROM "Customer" c',
    1,
    'registration state query',
  )

  source = replaceExact(
    source,
    'let customerCodeByIdV476=new Map(customerCodeRowsV476.map(e=>[e.id,e.customerPublicCode]));return customerRowsV476.map(e=>({...e,customerPublicCode:customerCodeByIdV476.get(e.id)??null}))',
    'let customerAccountByIdV496=new Map(customerCodeRowsV476.map(e=>[e.id,e]));return customerRowsV476.map(e=>({...e,customerPublicCode:customerAccountByIdV496.get(e.id)?.customerPublicCode??null,appRegistered:!!customerAccountByIdV496.get(e.id)?.appRegistered}))',
    1,
    'attach registration state',
  )

  source = replaceExact(
    source,
    '/* customer-summary-metrics-v103 */se=Math.max(1,Math.ceil(eN.length/50)),st=Number.parseInt(e.page??"1",10),ss=Math.min(se,Number.isFinite(st)&&st>0?st:1),sl=(ss-1)*50,sa=eN.slice(sl,sl+50);function sn(e){let t=new URLSearchParams;s&&t.set("q",s),l&&t.set("view",l),e>1&&t.set("page",String(e));let a=t.toString();return`/admin/customers${a?`?${a}`:""}#customer-list`}',
    '/* customer-summary-metrics-v103 */customerRegistrationFilterV496=["registered","provisional"].includes(e.registration??"")?e.registration:"all",customerRegisteredCountV496=eN.filter(e=>e.customer.appRegistered).length,customerProvisionalCountV496=eN.length-customerRegisteredCountV496,customerListRowsV496="registered"===customerRegistrationFilterV496?eN.filter(e=>e.customer.appRegistered):"provisional"===customerRegistrationFilterV496?eN.filter(e=>!e.customer.appRegistered):eN,se=Math.max(1,Math.ceil(customerListRowsV496.length/50)),st=Number.parseInt(e.page??"1",10),ss=Math.min(se,Number.isFinite(st)&&st>0?st:1),sl=(ss-1)*50,sa=customerListRowsV496.slice(sl,sl+50);function sn(e){let t=new URLSearchParams;s&&t.set("q",s),l&&t.set("view",l),"all"!==customerRegistrationFilterV496&&t.set("registration",customerRegistrationFilterV496),e>1&&t.set("page",String(e));let a=t.toString();return`/admin/customers${a?`?${a}`:""}#customer-list`}function customerRegistrationHrefV496(e){let t=new URLSearchParams;s&&t.set("q",s),l&&t.set("view",l),"all"!==e&&t.set("registration",e);let a=t.toString();return`/admin/customers${a?`?${a}`:""}#customer-list`}',
    1,
    'registration filter and pagination',
  )

  source = replaceExact(
    source,
    'a.jsx(f.IP,{className:"p-4",children:(0,a.jsxs)("form",{className:"flex flex-col gap-3 sm:flex-row",children:[(0,a.jsxs)("label"',
    'a.jsx(f.IP,{className:"p-4",children:(0,a.jsxs)("form",{className:"flex flex-col gap-3 sm:flex-row",children:["all"!==customerRegistrationFilterV496?a.jsx("input",{type:"hidden",name:"registration",value:customerRegistrationFilterV496}):null,(0,a.jsxs)("label"',
    1,
    'search form keeps registration filter',
  )

  const headerStart = '(0,a.jsxs)("div",{className:"flex items-center justify-between border-b border-stone-100 px-5 py-4",children:['
  const headerEnd = ',(0,a.jsxs)("div",{className:"grid gap-3 p-4 md:hidden"'
  const header = `(0,a.jsxs)("div",{className:"border-b border-stone-100 px-5 py-4",children:[(0,a.jsxs)("div",{className:"flex flex-wrap items-center justify-between gap-3",children:[(0,a.jsxs)("div",{className:"flex items-center gap-2",children:[a.jsx(d.Z,{className:"h-5 w-5 text-teal-800"}),a.jsx("h2",{className:"font-semibold text-stone-950",children:"顧客リスト"})]}),(0,a.jsxs)("span",{className:"text-sm text-stone-500",children:[customerListRowsV496.length,"件中 ",0===customerListRowsV496.length?0:sl+1,"〜",Math.min(sl+50,customerListRowsV496.length),"件"]})]}),a.jsx("nav",{className:"mt-4 grid grid-cols-3 gap-1 rounded-lg border border-[color:var(--lien-border)] bg-[color:var(--lien-surface-soft)] p-1 sm:inline-grid","aria-label":"顧客登録状態で絞り込み",children:[["all","すべて",eN.length],["registered","アプリ登録済み",customerRegisteredCountV496],["provisional","仮カルテ",customerProvisionalCountV496]].map(e=>a.jsx(n.default,{href:customerRegistrationHrefV496(e[0]),"aria-current":customerRegistrationFilterV496===e[0]?"page":void 0,"data-customer-registration-filter":e[0],className:\`inline-flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-semibold transition sm:min-w-36 sm:text-sm \${customerRegistrationFilterV496===e[0]?"bg-white text-[color:var(--lien-primary-dark)] shadow-sm":"text-[color:var(--lien-muted)] hover:bg-white/70 hover:text-[color:var(--lien-ink)]"}\`,children:[a.jsx("span",{className:"truncate",children:e[1]}),a.jsx("span",{className:"shrink-0 rounded-full bg-[color:var(--lien-surface-soft)] px-1.5 py-0.5 text-[10px] tabular-nums",children:e[2]})]},e[0]))})]})`
  source = replaceBetween(source, headerStart, headerEnd, header, 'customer list filter header')

  source = replaceExact(
    source,
    'href:e.href,className:"lien-action-card block rounded-[22px] border bg-white p-4 pr-12"',
    'href:e.href,"data-customer-registration":e.customer.appRegistered?"registered":"provisional",className:"lien-action-card block rounded-[22px] border bg-white p-4 pr-12"',
    1,
    'mobile row registration attribute',
  )
  source = replaceExact(
    source,
    'sa.map(e=>(0,a.jsxs)("tr",{className:"hover:bg-[#fbf8f3]",children:',
    'sa.map(e=>(0,a.jsxs)("tr",{"data-customer-registration":e.customer.appRegistered?"registered":"provisional",className:"hover:bg-[#fbf8f3]",children:',
    1,
    'desktop row registration attribute',
  )

  source = replaceExact(
    source,
    'a.jsx("p",{className:"mt-1 text-xs font-semibold text-[color:var(--lien-primary)]",children:e.customer.customerPublicCode??R(e.customer.id)}),(0,a.jsxs)("p",{className:"mt-2 flex items-center gap-1.5 text-xs text-[color:var(--lien-muted)]"',
    'a.jsx("p",{className:"mt-1 text-xs font-semibold text-[color:var(--lien-primary)]",children:e.customer.customerPublicCode??R(e.customer.id)}),a.jsx("span",{className:\`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold \${e.customer.appRegistered?"border-emerald-200 bg-emerald-50 text-emerald-800":"border-amber-200 bg-amber-50 text-amber-800"}\`,children:e.customer.appRegistered?"アプリ登録済み":"仮カルテ"}),(0,a.jsxs)("p",{className:"mt-2 flex items-center gap-1.5 text-xs text-[color:var(--lien-muted)]"',
    1,
    'mobile registration badge',
  )
  source = replaceExact(
    source,
    'a.jsx("div",{className:"mt-1 text-xs font-medium text-teal-800",children:e.customer.customerPublicCode??R(e.customer.id)}),(0,a.jsxs)("div",{className:"mt-2 flex items-center gap-1.5 text-xs text-stone-500"',
    'a.jsx("div",{className:"mt-1 text-xs font-medium text-teal-800",children:e.customer.customerPublicCode??R(e.customer.id)}),a.jsx("span",{className:\`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold \${e.customer.appRegistered?"border-emerald-200 bg-emerald-50 text-emerald-800":"border-amber-200 bg-amber-50 text-amber-800"}\`,children:e.customer.appRegistered?"アプリ登録済み":"仮カルテ"}),(0,a.jsxs)("div",{className:"mt-2 flex items-center gap-1.5 text-xs text-stone-500"',
    1,
    'desktop registration badge',
  )

  source = replaceExact(source, '0===q.length', '0===customerListRowsV496.length', 2, 'filtered empty state')
  source = replaceExact(
    source,
    '顧客が見つかりません。検索条件を変えてください。',
    '該当する顧客がいません。絞り込み条件を変更してください。',
    2,
    'filtered empty message',
  )

  source += `\n/* ${marker} */\n`
  fs.writeFileSync(file, source)
  patchedCount += 1
}

if (patchedCount !== 1) throw new Error(`${marker}: expected one customer list chunk, patched ${patchedCount}`)

let server = fs.readFileSync(serverPath, 'utf8')
server = replaceExact(
  server,
  "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Product-Catalog-Stability', 'v495')",
  "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Product-Catalog-Stability', 'v495')\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Registration-Filter', 'v496')",
  1,
  'readiness marker',
)
fs.writeFileSync(serverPath, server)

console.log(`${marker} patched`)
