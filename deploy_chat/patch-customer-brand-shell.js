const fs = require('fs')
const path = require('path')

const appRoot = process.env.APP_ROOT || '/app'

function patchLayout(file) {
  let source = fs.readFileSync(file, 'utf8')
  const match = source.match(/let p=\[(\{href:"\/u\/home"[\s\S]*?)\];function b/)
  if (!match) throw new Error(`customer navigation not found: ${file}`)
  const entries = [...match[1].matchAll(/\{href:"([^"]+)",label:"([^"]+)",icon:([^}]+)\}/g)]
  const byHref = new Map(entries.map(m => [m[1], m[3]]))
  const legacyIcons = ['/u/home','/u/appointments','/u/reviews','/u/history','/u/community']
  const premiumLinks = ['/u/home','/u/appointments','/u/history','/u/news','/u/menu']
  if (legacyIcons.every(href => byHref.has(href))) {
    const navigation = `let p=[{href:"/u/home",label:"ホーム",icon:${byHref.get('/u/home')}},{href:"/u/appointments",label:"予約",icon:${byHref.get('/u/appointments')}},{href:"/u/history",label:"履歴",icon:${byHref.get('/u/history')}},{href:"/u/news",label:"メッセージ",icon:${byHref.get('/u/reviews')}},{href:"/u/menu",label:"メニュー",icon:${byHref.get('/u/community')}}];function b`
    source = source.replace(match[0], navigation)
  } else if (!premiumLinks.every(href => byHref.has(href))) {
    throw new Error(`customer navigation is neither legacy nor premium: ${file}`)
  }
  source = source.replaceAll('grid-cols-6', 'grid-cols-5')
  source = source.replaceAll('href:"/u/messages"', 'href:"/u/news"')
  if (!/href:"\/u\/profile",className:"flex min-w-0 items-center gap-3"/.test(source)) throw new Error(`customer mobile header not found: ${file}`)
  source = source.replace(/href:"\/u\/profile",className:"flex min-w-0 items-center gap-3"/, 'href:"/u/menu",className:"flex min-w-0 items-center gap-3"')
  source = source.replaceAll('aria-label:"プロフィールとアカウント設定を開く"', 'aria-label:"メニューを開く"')
  source = source.replaceAll('"aria-label":"プロフィールとアカウント設定を開く"', '"aria-label":"メニューを開く"')
  source = source.replaceAll('children:"お知らせ"', 'children:"メッセージ"')
  source = source.replaceAll('className:"block text-sm font-semibold",children:"Salon de Lien"', 'className:"block text-sm font-semibold",style:{fontFamily:"Georgia, serif",fontStyle:"italic",fontSize:"18px",fontWeight:500},children:"Salon de Lien"')
  fs.writeFileSync(file, source)
}

function replaceReferences(dir, oldName, newName) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) replaceReferences(file, oldName, newName)
    else if (entry.isFile() && /\.(js|json|html)$/.test(file)) {
      const source = fs.readFileSync(file, 'utf8')
      if (source.includes(oldName)) fs.writeFileSync(file, source.split(oldName).join(newName))
    }
  }
}

patchLayout(path.join(appRoot, '.next/server/chunks/1597.js'))

const staticRoot = path.join(appRoot, '.next/static/chunks/app/u/(account)')
const layoutFile = fs.readdirSync(staticRoot).find(name => /^layout-.*\.js$/.test(name))
if (!layoutFile) throw new Error('customer static layout chunk not found')
const layoutPath = path.join(staticRoot, layoutFile)
patchLayout(layoutPath)
const versionedLayoutFile = layoutFile.replace(/(?:\.premium-mobile-v\d+)?\.js$/, '.premium-mobile-v29.js')
fs.renameSync(layoutPath, path.join(staticRoot, versionedLayoutFile))
replaceReferences(path.join(appRoot, '.next'), layoutFile, versionedLayoutFile)

const cssRoot = path.join(appRoot, '.next/static/css')
const cssFiles = fs.readdirSync(cssRoot).filter(name => name.endsWith('.css'))
if (!cssFiles.length) throw new Error('application stylesheet not found')
const premiumCss = `
@media(max-width:767px){
nav[aria-label="お客様アプリメニュー"]{background:rgba(255,253,251,.97)!important;border-color:#eaded9!important;box-shadow:0 -8px 22px rgba(109,73,60,.06)!important}
nav[aria-label="お客様アプリメニュー"] a{border-radius:12px!important;color:#a3948d!important;font-size:10px!important}
nav[aria-label="お客様アプリメニュー"] a[aria-current="page"]{background:#fceaf0!important;color:#d85d79!important;box-shadow:inset 0 0 0 1px #f2cad5!important}
header:has(a[aria-label="プロフィールとアカウント設定を開く"]){background:rgba(255,253,251,.96)!important;border-color:#eaded9!important}
}

/* Keep every authenticated customer route in the same premium, mobile-first
   visual frame as /u/home, even when opened from a desktop browser. */
:root{--customer-rose:#d85d79;--customer-rose-dark:#bc4966;--customer-rose-soft:#fceaf0;--customer-ink:#332d2a;--customer-muted:#81756f;--customer-line:#eaded9;--customer-paper:#fffdfb;--customer-cream:#faf6f2}
html{background:#efe9e5!important}
body{margin:0!important;background:#efe9e5!important;color:var(--customer-ink)!important;font-family:-apple-system,BlinkMacSystemFont,"Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif!important;-webkit-font-smoothing:antialiased}
body>div:first-child{position:relative;width:100%;max-width:480px;min-height:100dvh;margin:0 auto;background:var(--customer-paper);box-shadow:0 0 42px rgba(85,66,57,.09)}
body>div:first-child>div{min-height:100dvh!important;background:var(--customer-paper)!important;color:var(--customer-ink)!important}

/* The old desktop portal must never reappear on customer routes. */
body>div:first-child>div>header:first-child{display:block!important;position:sticky!important;top:0!important;z-index:40!important;height:68px!important;border-color:var(--customer-line)!important;background:rgba(255,253,251,.96)!important;backdrop-filter:blur(12px)}
body>div:first-child>div>header:first-child>div{position:relative;display:grid!important;width:100%!important;max-width:none!important;height:68px!important;grid-template-columns:48px minmax(0,1fr) 48px!important;align-items:center!important;gap:0!important;padding:0 12px!important}
body>div:first-child>div>header:first-child>div>a:first-child{display:contents!important}
body>div:first-child>div>header:first-child>div>a:first-child>span:first-child{grid-column:1;display:grid!important;width:42px!important;height:42px!important;place-items:center!important;border-radius:50%!important;background:transparent!important;color:#75655e!important;box-shadow:none!important}
body>div:first-child>div>header:first-child>div>a:first-child>span:first-child svg{display:none!important}
body>div:first-child>div>header:first-child>div>a:first-child>span:first-child:before{content:"";display:block;width:18px;height:12px;border-top:1.7px solid currentColor;border-bottom:1.7px solid currentColor;background:linear-gradient(currentColor,currentColor) center/18px 1.7px no-repeat}
body>div:first-child>div>header:first-child>div>a:first-child>span:nth-child(2){grid-column:2;min-width:0!important;text-align:center;line-height:1!important}
body>div:first-child>div>header:first-child>div>a:first-child>span:nth-child(2)>span:first-child{display:block!important;color:#715f58!important;font:italic 23px Georgia,"Times New Roman",serif!important;letter-spacing:.02em!important}
body>div:first-child>div>header:first-child>div>a:first-child>span:nth-child(2)>span:last-child{display:block!important;margin-top:5px!important;color:#b7a39b!important;font-size:0!important;letter-spacing:.22em!important;text-transform:uppercase}
body>div:first-child>div>header:first-child>div>a:first-child>span:nth-child(2)>span:last-child:after{content:"BEAUTY MEMBERSHIP";font:8px Georgia,"Times New Roman",serif}
body>div:first-child>div>header:first-child>div>div:last-child{grid-column:3;display:flex!important;justify-content:flex-end!important;gap:0!important}
body>div:first-child>div>header:first-child>div>div:last-child form{display:none!important}
body>div:first-child>div>header:first-child .lien-icon-button{display:grid!important;width:42px!important;height:42px!important;place-items:center!important;border:0!important;border-radius:50%!important;background:transparent!important;color:#75655e!important;box-shadow:none!important}
body>div:first-child>div>header:first-child .lien-icon-button svg{width:21px!important;height:21px!important;stroke-width:1.7!important}
body>div:first-child>div>div.mx-auto.min-h-screen.w-full{display:block!important;width:100%!important;max-width:none!important;min-height:0!important;padding:0!important}
body>div:first-child>div>div.mx-auto.min-h-screen.w-full>aside{display:none!important}
body>div:first-child>div>div.mx-auto.min-h-screen.w-full>.min-w-0>header{display:none!important}
body>div:first-child main{width:100%!important;max-width:none!important;padding:0 0 92px!important}
body>div:first-child main>.grid.gap-5{gap:0!important}
body>div:first-child main>.grid.gap-5>*+*{margin-top:12px}

/* Page titles, tabs and cards share the same restrained salon language. */
body>div:first-child main>.grid.gap-5>nav:first-child{margin:0!important;border:0!important;border-bottom:1px solid var(--customer-line)!important;border-radius:0!important;background:#fff!important;padding:0!important;box-shadow:none!important}
body>div:first-child main>.grid.gap-5>nav:first-child a{min-height:47px!important;border-radius:0!important;background:transparent!important;color:var(--customer-muted)!important;font-size:11px!important;box-shadow:none!important}
body>div:first-child main>.grid.gap-5>nav:first-child a[class~="bg-[#8f4f42]"]{border-bottom:3px solid var(--customer-rose)!important;color:var(--customer-rose-dark)!important}
body>div:first-child main>.grid.gap-5>nav:first-child+header{margin-top:0!important}
body>div:first-child main>.grid.gap-5>header[class*="rounded-[24px]"]{margin:0!important;border-width:0 0 1px!important;border-color:var(--customer-line)!important;border-radius:0!important;background:#fff!important;padding:22px 18px!important;box-shadow:none!important}
body>div:first-child main>.grid.gap-5>header.grid.gap-3{margin:0!important;background:#fff!important}
body>div:first-child main>.grid.gap-5>header.grid.gap-3>figure{height:192px!important;border-width:0 0 1px!important;border-radius:0!important;border-color:var(--customer-line)!important;box-shadow:none!important;filter:saturate(.86) contrast(.97)}
body>div:first-child main>.grid.gap-5>header.grid.gap-3>p{margin:0!important;padding:3px 18px 14px!important;color:var(--customer-muted)!important;font-size:11px!important;line-height:1.8!important}
body>div:first-child main>.grid.gap-5>header+section,
body>div:first-child main>.grid.gap-5>header+div,
body>div:first-child main>.grid.gap-5>header+p,
body>div:first-child main>.grid.gap-5>section,
body>div:first-child main>.grid.gap-5>form{margin-right:12px!important;margin-left:12px!important}
body>div:first-child main>.grid.gap-5>div.grid.gap-6{margin:0!important;padding:0 12px 12px!important;gap:12px!important}
body>div:first-child main h1,body>div:first-child main h2{font-family:"Yu Mincho","Hiragino Mincho ProN",serif!important;letter-spacing:.035em!important}
body>div:first-child main h1{font-size:22px!important;line-height:1.45!important}
body>div:first-child main h2{font-size:18px!important;line-height:1.55!important}
body>div:first-child main [class~="text-[#8f4f42]"]{color:var(--customer-rose-dark)!important}
body>div:first-child main [class~="bg-[#8f4f42]"]{background-color:var(--customer-rose)!important}
body>div:first-child main [class~="bg-[#5b332c]"]{background:linear-gradient(135deg,#d85d79,#bc4966)!important}
body>div:first-child main [class~="border-[#e8ded2]"],body>div:first-child main [class~="border-[#e4d1c7]"]{border-color:var(--customer-line)!important}
body>div:first-child main [class~="rounded-[24px]"],body>div:first-child main [class~="rounded-[22px]"],body>div:first-child main [class~="rounded-[20px]"]{border-radius:14px!important;box-shadow:0 3px 12px rgba(88,62,51,.045)!important}
body>div:first-child main input,body>div:first-child main select,body>div:first-child main textarea{border-color:var(--customer-line)!important;border-radius:8px!important;background:#fff!important;color:var(--customer-ink)!important;font-size:13px!important;box-shadow:none!important}
body>div:first-child main button,body>div:first-child main a[class*="button"]{font-size:12px!important}
body>div:first-child main button[class*="rounded-full"]{border-radius:8px!important}

/* Desktop breakpoints from the old portal are neutralised inside the phone. */
body>div:first-child main [class*="sm:grid-cols-["]{grid-template-columns:minmax(0,1fr)!important}
body>div:first-child main [class*="lg:grid-cols-2"]{grid-template-columns:minmax(0,1fr)!important}
body>div:first-child main [class*="lg:grid-cols-5"]{grid-template-columns:repeat(2,minmax(0,1fr))!important}
body>div:first-child main [class*="lg:grid-cols-4"],body>div:first-child main [class*="xl:grid-cols-5"],body>div:first-child main [class*="2xl:grid-cols-6"]{grid-template-columns:repeat(2,minmax(0,1fr))!important}
body>div:first-child main [class*="lg:w-auto"]{width:100%!important}
body>div:first-child main [class*="lg:before:hidden"]:before{display:block!important}
body>div:first-child main [class~="md:grid-cols-[16rem_minmax(0,1fr)]"],
body>div:first-child main [class~="md:grid-cols-[180px_minmax(0,1fr)]"],
body>div:first-child main [class~="md:grid-cols-[minmax(0,1fr)_auto]"],
body>div:first-child main [class~="md:grid-cols-2"]{grid-template-columns:minmax(0,1fr)!important}

/* Five-item bottom navigation shared by every route and every width. */
body>div:first-child>div>nav:last-child{display:block!important;position:fixed!important;z-index:50!important;right:0!important;bottom:0!important;left:0!important;width:100%!important;max-width:480px!important;margin:auto!important;border-color:#e6d9d4!important;background:rgba(255,253,251,.97)!important;box-shadow:0 -8px 22px rgba(109,73,60,.055)!important;backdrop-filter:blur(14px)}
body>div:first-child>div>nav:last-child>div{display:grid!important;height:66px!important;max-width:none!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;padding:4px!important}
body>div:first-child>div>nav:last-child a{gap:3px!important;border-radius:12px!important;background:transparent!important;color:#a3948d!important;font-size:9px!important;box-shadow:none!important}
body>div:first-child>div>nav:last-child a svg{width:20px!important;height:20px!important;stroke-width:1.7!important}
body>div:first-child>div>nav:last-child a[aria-current="page"]{color:var(--customer-rose)!important}

@media(min-width:700px){
  body{padding:24px 0!important}
  body>div:first-child{min-height:calc(100dvh - 48px);overflow:hidden;border-radius:24px}
  body>div:first-child>div>header:first-child{border-radius:24px 24px 0 0}
  body>div:first-child>div>nav:last-child{bottom:24px;border-radius:0 0 24px 24px}
}
`
const versionedCssFiles = []
for (const cssFile of cssFiles) {
  const cssPath = path.join(cssRoot, cssFile)
  fs.appendFileSync(cssPath, premiumCss)
  const versionedCssFile = cssFile.replace(/(?:\.premium-mobile-v\d+)?\.css$/, '.premium-mobile-v29.css')
  fs.renameSync(cssPath, path.join(cssRoot, versionedCssFile))
  replaceReferences(path.join(appRoot, '.next'), cssFile, versionedCssFile)
  versionedCssFiles.push(versionedCssFile)
}

console.log(JSON.stringify({ patched: ['server customer layout', versionedLayoutFile, ...versionedCssFiles] }))
