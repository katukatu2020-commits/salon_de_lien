const fs = require('fs')
const path = require('path')

const appRoot = process.env.APP_ROOT || '/app'

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

function walk(dir, visit) {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(file, visit)
    else if (entry.isFile()) visit(file)
  }
}

function replaceReferences(dir, oldName, newName) {
  walk(dir, file => {
    if (!/\.(?:js|json|html)$/.test(file)) return
    const source = fs.readFileSync(file, 'utf8')
    if (source.includes(oldName)) fs.writeFileSync(file, source.split(oldName).join(newName))
  })
}

function patchMenuSeed(file) {
  let source = fs.readFileSync(file, 'utf8')
  if (source.includes('SalonMenu seed skipped; catalog already initialized')) return
  const pattern = /async function G\(e\)\{\s*await O\(\);\s*for\(let t=0;t<W\.length;t\+\+\)\{([\s\S]*?)\}\s*return u\._\.\$queryRawUnsafe\(`SELECT \* FROM "SalonMenu" WHERE "organizationId"=\$1 ORDER BY "active" DESC,"sortOrder","name"`,e\);\s*\}/
  const match = source.match(pattern)
  if (!match) throw new Error(`SalonMenu list function not found: ${file}`)
  const replacement = `async function G(e){
        await O();
        let seeded=await u._.$queryRawUnsafe(\`SELECT COUNT(*)::int AS "count" FROM "SalonMenu" WHERE "organizationId"=$1 AND "source"='kanzashi'\`,e);
        if(Number(seeded[0]?.count??0)<W.length){
          for(let t=0;t<W.length;t++){${match[1]}}
        }else{
          console.debug("SalonMenu seed skipped; catalog already initialized");
        }
        return u._.$queryRawUnsafe(\`SELECT * FROM "SalonMenu" WHERE "organizationId"=$1 ORDER BY "active" DESC,"sortOrder","name"\`,e);
      }`
  source = source.replace(pattern, () => replacement)
  fs.writeFileSync(file, source)
}

function findCallEnd(source, openParen) {
  let depth = 0
  let quote = ''
  let escaped = false
  for (let i = openParen; i < source.length; i += 1) {
    const char = source[i]
    if (quote) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === quote) quote = ''
      continue
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char
      continue
    }
    if (char === '(') depth += 1
    if (char === ')' && --depth === 0) return i
  }
  return -1
}

function patchProductAggregates(file) {
  let source = fs.readFileSync(file, 'utf8')
  if (source.includes('product sales aggregate unavailable')) return
  const needle = 'w._.productSaleLine.groupBy('
  const ends = []
  let cursor = 0
  while (true) {
    const start = source.indexOf(needle, cursor)
    if (start < 0) break
    const open = start + needle.length - 1
    const end = findCallEnd(source, open)
    if (end < 0) throw new Error(`unterminated product aggregate call: ${file}`)
    ends.push(end + 1)
    cursor = end + 1
  }
  if (ends.length !== 2) throw new Error(`expected two product aggregate calls, found ${ends.length}: ${file}`)
  for (const end of ends.reverse()) {
    source = `${source.slice(0, end)}.catch((error)=>{console.error("product sales aggregate unavailable",error);return []})${source.slice(end)}`
  }
  fs.writeFileSync(file, source)
}

function patchServer(file) {
  let source = fs.readFileSync(file, 'utf8')
  if (!source.includes('async function staffProfilesApi(')) {
    const marker = 'async function staffIntroductionForm(req, res) {'
    if (!source.includes(marker)) throw new Error(`staff introduction marker not found: ${file}`)
    const implementation = `function staffProfileKey(row) {
  const loginId = String(row.loginId || '').trim().toLowerCase()
  const byLogin = { tanizaki: 'tanizaki', watanabe: 'watanabe', asano: 'asano', kobayashi: 'kobayashi', kaori: 'kaori', lien: 'tanizaki' }
  if (byLogin[loginId]) return byLogin[loginId]
  const name = String(row.displayName || '').replace(/[\\s　]/g, '')
  if (/谷崎/.test(name)) return 'tanizaki'
  if (/渡邉|渡辺|渡邊/.test(name)) return 'watanabe'
  if (/浅野/.test(name)) return 'asano'
  if (/小林/.test(name)) return 'kobayashi'
  if (/kaori/i.test(name)) return 'kaori'
  return ''
}

async function staffProfilesApi(req, res) {
  const session = await chatSession(req, 'customer')
  if (!session) return json(res, 401, { error: 'ログインが必要です。' })
  await ensureLienEnhancementTables()
  const rows = await prisma.$queryRawUnsafe('SELECT u."loginId",u."displayName",p."introduction",p."updatedAt" FROM "AppUser" u JOIN "StaffProfileSetting" p ON p."userId"=u."id" AND p."organizationId"=u."organizationId" WHERE u."organizationId"=$1 AND u."role" IN (\\'ADMIN\\',\\'STAFF\\') AND u."active"=true AND BTRIM(p."introduction")<>\\'\\' ORDER BY p."updatedAt" ASC', session.organizationId)
  const profiles = {}, priorities = {}
  for (const row of rows) {
    const key = staffProfileKey(row)
    if (!key) continue
    const priority = String(row.loginId || '').toLowerCase() === 'lien' ? 1 : 2
    if ((priorities[key] || 0) > priority) continue
    profiles[key] = String(row.introduction || '').trim().slice(0, 160)
    priorities[key] = priority
  }
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  return json(res, 200, { profiles })
}

`
    source = source.replace(marker, implementation + marker)
  }
  if (!source.includes("url.pathname === '/api/lien-staff-profiles'")) {
    source = replaceOnce(
      source,
      "if (url.pathname === '/api/lien-staff-introduction' && req.method === 'POST') return await staffIntroductionForm(req, res)",
      "if (url.pathname === '/api/lien-staff-profiles' && req.method === 'GET') return await staffProfilesApi(req, res)\n      if (url.pathname === '/api/lien-staff-introduction' && req.method === 'POST') return await staffIntroductionForm(req, res)",
      'staff profile API route',
    )
  }

  const desktopCss = `
@media(min-width:1024px){
  body{padding:0}.app{max-width:1440px;min-height:100dvh;padding-left:238px;border-radius:0;overflow:visible;box-shadow:0 0 54px #55423916}.topbar{height:78px;border-radius:0;padding:0 28px}.brand-script{font-size:27px}.content{padding:0 32px 54px}.bottom-nav{top:0;right:auto;bottom:0;left:max(0px,calc(50% - 720px));width:238px;max-width:238px;height:100dvh;grid-template-columns:1fr;align-content:start;gap:8px;padding:104px 18px 24px;border-top:0;border-right:1px solid var(--line);border-radius:0;background:#fffaf7f5;box-shadow:none}.bottom-link{min-height:52px;flex-direction:row;justify-content:flex-start;gap:13px;border-radius:12px;padding:0 16px;font-size:12px}.bottom-link .icon{width:21px;height:21px}.bottom-link.active{background:var(--rose-soft);color:var(--rose-dark)}.welcome,.section,.page-title,.ranking-intro,.product-list,.coupon-list,.stamp-card,.menu-list,.detail-card{max-width:1120px;margin-right:auto;margin-left:auto}.welcome{padding:28px 28px 20px}.welcome strong{font-size:22px}.welcome span{font-size:12px}.hero{height:350px;max-width:1120px;margin:0 auto;border-radius:20px}.hero-copy{left:44px;bottom:42px;font-size:34px}.quick-grid{max-width:1120px;margin:0 auto;gap:14px;padding:22px 0}.quick-card{min-height:150px}.quick-card strong{font-size:13px}.quick-card small{font-size:8px}.section{padding:30px 24px}.section-head h1,.section-head h2{font-size:25px}.metrics{gap:16px}.metric{padding:22px}.page-title{padding:30px 20px}.page-title h1{font-size:24px}.product-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:28px;padding:0 22px 32px}.product-row{min-height:128px}.coupon-list{grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;padding:24px}.menu-list{padding:18px 28px 36px}.menu-row{min-height:72px}.detail-card{padding:18px 44px 48px}.detail-visual{padding-top:42px}}
`
  if (!source.includes('body{padding:0}.app{max-width:1440px')) {
    const match = source.match(/function customerAppCss\(\) \{\s*return `([\s\S]*?)`\s*\}/)
    if (!match) throw new Error(`customerAppCss function not found: ${file}`)
    source = source.replace(match[0], `function customerAppCss() {\n  return \`${match[1]}${desktopCss}\`\n}`)
  }
  fs.writeFileSync(file, source)
}

function patchAppointmentsServer(file) {
  let source = fs.readFileSync(file, 'utf8')
  if (source.includes('/api/lien-staff-profiles')) return
  source = replaceOnce(
    source,
    '[J,G]=(0,m.useState)(null),L=(0,m.useMemo)(()=>Array.from({length:7},(e,t)=>g(v,t)),[v]);(0,m.useMemo)(()=>[...new Set(L.map(e=>e.slice(0,7)))],[L]);let B=',
    '[J,G]=(0,m.useState)(null),[ee,et]=(0,m.useState)({}),L=(0,m.useMemo)(()=>Array.from({length:7},(e,t)=>g(v,t)),[v]);(0,m.useMemo)(()=>[...new Set(L.map(e=>e.slice(0,7)))],[L]);(0,m.useEffect)(()=>{let e=!1;fetch("/api/lien-staff-profiles",{cache:"no-store"}).then(e=>e.ok?e.json():null).then(t=>{!e&&t?.profiles&&et(t.profiles)}).catch(()=>{});return()=>{e=!0}},[]);let B=',
    'server appointment staff profile state',
  )
  source = replaceOnce(
    source,
    'X=x[K.key]??x.free,Y=',
    'X={...(x[K.key]??x.free),message:ee[K.key]||(x[K.key]??x.free).message},Y=',
    'server appointment live introduction',
  )
  fs.writeFileSync(file, source)
}

function patchAppointmentsStatic(file) {
  let source = fs.readFileSync(file, 'utf8')
  if (source.includes('/api/lien-staff-profiles')) return file
  source = replaceOnce(
    source,
    '[$,Y]=(0,u.useState)(null),G=(0,u.useMemo)(()=>Array.from({length:7},(e,t)=>b(C,t)),[C]),H=(0,u.useMemo)(()=>[...new Set(G.map(e=>e.slice(0,7)))],[G]),K=',
    '[$,Y]=(0,u.useState)(null),[eP,tP]=(0,u.useState)({}),G=(0,u.useMemo)(()=>Array.from({length:7},(e,t)=>b(C,t)),[C]),H=(0,u.useMemo)(()=>[...new Set(G.map(e=>e.slice(0,7)))],[G]);(0,u.useEffect)(()=>{let e=!1;fetch("/api/lien-staff-profiles",{cache:"no-store"}).then(e=>e.ok?e.json():null).then(t=>{!e&&t&&t.profiles&&tP(t.profiles)}).catch(()=>{});return()=>{e=!0}},[]);let K=',
    'static appointment staff profile state',
  )
  source = replaceOnce(
    source,
    'V=null!==(s=h[Q.key])&&void 0!==s?s:h.free,X=',
    'V={...(null!==(s=h[Q.key])&&void 0!==s?s:h.free),message:eP[Q.key]||(null!==(j=h[Q.key])&&void 0!==j?j:h.free).message},X=',
    'static appointment live introduction',
  )
  fs.writeFileSync(file, source)
  return file
}

const nextDesktopCss = `
@media(min-width:1024px){
body:has(>div:first-child>div>div.mx-auto.min-h-screen.w-full){padding:0!important;background:#f3ede8!important}
body:has(>div:first-child>div>div.mx-auto.min-h-screen.w-full)>div:first-child{width:100%!important;max-width:none!important;min-height:100dvh!important;margin:0!important;border-radius:0!important;overflow:visible!important;background:#fffdfb!important;box-shadow:none!important}
body>div:first-child>div>header:first-child{display:none!important}
body>div:first-child>div>div.mx-auto.min-h-screen.w-full{display:grid!important;width:100%!important;max-width:1600px!important;min-height:100dvh!important;margin:0 auto!important;grid-template-columns:250px minmax(0,1fr)!important;gap:32px!important;padding:0 28px!important;background:#fbf7f0!important}
body>div:first-child>div>div.mx-auto.min-h-screen.w-full>aside{display:flex!important;position:sticky!important;top:0!important;height:100dvh!important;padding-top:30px!important;border-color:var(--customer-line)!important}
body>div:first-child>div>div.mx-auto.min-h-screen.w-full>.min-w-0>header{display:flex!important;height:80px!important;border-color:var(--customer-line)!important;background:#fbf7f0e8!important;backdrop-filter:blur(12px)}
body>div:first-child main{width:100%!important;max-width:1180px!important;margin:0 auto!important;padding:30px 0 52px!important}
body>div:first-child main>.grid.gap-5{gap:20px!important}
body>div:first-child main>.grid.gap-5>*+*{margin-top:0!important}
body>div:first-child main>.grid.gap-5>nav:first-child{margin:0!important;border:1px solid var(--customer-line)!important;border-radius:18px!important;padding:4px!important;background:#fff!important;box-shadow:0 4px 18px rgba(88,62,51,.045)!important}
body>div:first-child main>.grid.gap-5>nav:first-child a{min-height:46px!important;border-radius:14px!important}
body>div:first-child main>.grid.gap-5>nav:first-child a[class~="bg-[#8f4f42]"]{border-bottom:0!important;background:linear-gradient(135deg,var(--customer-rose),var(--customer-rose-dark))!important;color:#fff!important}
body>div:first-child main>.grid.gap-5>header[class*="rounded-[24px]"],body>div:first-child main>.grid.gap-5>header.grid.gap-3{margin:0!important;border:1px solid var(--customer-line)!important;border-radius:24px!important;padding:26px 30px!important;background:linear-gradient(135deg,#fffdfb,#faf1ed)!important;box-shadow:0 5px 22px rgba(88,62,51,.05)!important}
body>div:first-child main>.grid.gap-5>header.grid.gap-3>figure{height:260px!important;border:1px solid var(--customer-line)!important;border-radius:20px!important}
body>div:first-child main>.grid.gap-5>header.grid.gap-3>p{padding:0!important}
body>div:first-child main>.grid.gap-5>header+section,body>div:first-child main>.grid.gap-5>header+div,body>div:first-child main>.grid.gap-5>header+p,body>div:first-child main>.grid.gap-5>section,body>div:first-child main>.grid.gap-5>form{margin-right:0!important;margin-left:0!important}
body>div:first-child main>.grid.gap-5>div.grid.gap-6{margin:0!important;padding:0!important;gap:24px!important}
body>div:first-child main h1{font-size:30px!important}body>div:first-child main h2{font-size:22px!important}
body>div:first-child main [class~="rounded-[24px]"],body>div:first-child main [class~="rounded-[22px]"],body>div:first-child main [class~="rounded-[20px]"]{border-radius:22px!important;box-shadow:0 5px 20px rgba(88,62,51,.05)!important}
body>div:first-child main [class*="md:grid-cols-[180px_minmax(0,1fr)]"]{grid-template-columns:180px minmax(0,1fr)!important}
body>div:first-child main [class*="md:grid-cols-[16rem_minmax(0,1fr)]"]{grid-template-columns:16rem minmax(0,1fr)!important}
body>div:first-child main [class*="md:grid-cols-[minmax(0,1fr)_auto]"]{grid-template-columns:minmax(0,1fr) auto!important}
body>div:first-child main [class~="md:grid-cols-2"],body>div:first-child main [class*="lg:grid-cols-2"]{grid-template-columns:repeat(2,minmax(0,1fr))!important}
body>div:first-child main [class*="lg:grid-cols-5"]{grid-template-columns:repeat(5,minmax(0,1fr))!important}
body>div:first-child main [class*="lg:grid-cols-4"]{grid-template-columns:repeat(4,minmax(0,1fr))!important}
body>div:first-child main [class*="xl:grid-cols-5"]{grid-template-columns:repeat(5,minmax(0,1fr))!important}
body>div:first-child main [class*="2xl:grid-cols-6"]{grid-template-columns:repeat(6,minmax(0,1fr))!important}
body>div:first-child main [class*="lg:w-auto"]{width:auto!important}
body>div:first-child main [class*="lg:before:hidden"]:before{display:none!important}
body>div:first-child>div>nav:last-child{display:none!important}
}
`

function patchCss() {
  const cssRoot = path.join(appRoot, '.next', 'static', 'css')
  if (!fs.existsSync(cssRoot)) throw new Error(`CSS root not found: ${cssRoot}`)
  const cssFiles = fs.readdirSync(cssRoot).filter(name => name.endsWith('.css'))
  if (!cssFiles.length) throw new Error('application stylesheet not found')
  const renamed = []
  for (const cssFile of cssFiles) {
    const cssPath = path.join(cssRoot, cssFile)
    let css = fs.readFileSync(cssPath, 'utf8')
    if (!css.includes('body:has(>div:first-child>div>div.mx-auto.min-h-screen.w-full)')) css += nextDesktopCss
    fs.writeFileSync(cssPath, css)
    const nextName = cssFile.replace(/(?:\.responsive-desktop-v\d+)?\.css$/, '.responsive-desktop-v32.css')
    const nextPath = path.join(cssRoot, nextName)
    if (nextPath !== cssPath) {
      fs.renameSync(cssPath, nextPath)
      replaceReferences(path.join(appRoot, '.next'), cssFile, nextName)
    }
    renamed.push(nextName)
  }
  return renamed
}

const menuChunk = path.join(appRoot, '.next', 'server', 'chunks', '9845.js')
const productsPage = path.join(appRoot, '.next', 'server', 'app', 'admin', 'products', 'page.js')
const appointmentsServer = path.join(appRoot, '.next', 'server', 'app', 'u', '(account)', 'appointments', 'page.js')
const appointmentsStaticRoot = path.join(appRoot, '.next', 'static', 'chunks', 'app', 'u', '(account)', 'appointments')

patchMenuSeed(menuChunk)
patchProductAggregates(productsPage)
patchServer(path.join(appRoot, 'server.js'))
patchAppointmentsServer(appointmentsServer)

const staticPage = fs.readdirSync(appointmentsStaticRoot).find(name => /^page-.*\.js$/.test(name))
if (!staticPage) throw new Error('customer appointments static chunk not found')
const staticPagePath = patchAppointmentsStatic(path.join(appointmentsStaticRoot, staticPage))
const staticVersioned = staticPage.replace(/(?:\.staff-live-v\d+)?\.js$/, '.staff-live-v32.js')
if (staticVersioned !== staticPage) {
  fs.renameSync(staticPagePath, path.join(appointmentsStaticRoot, staticVersioned))
  replaceReferences(path.join(appRoot, '.next'), staticPage, staticVersioned)
}

const cssFiles = patchCss()

console.log(JSON.stringify({
  patched: [
    'idempotent SalonMenu seeding',
    'resilient product sales aggregates',
    'live staff introductions in customer booking',
    'responsive desktop customer portal',
    staticVersioned,
    ...cssFiles,
  ],
}))
