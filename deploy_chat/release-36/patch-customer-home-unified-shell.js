const fs = require('fs')
const path = require('path')

const appRoot = process.env.APP_ROOT || '/app'

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

function findCallEnd(source, openParen) {
  let depth = 0
  let quote = ''
  let escaped = false
  for (let index = openParen; index < source.length; index += 1) {
    const char = source[index]
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
    else if (char === ')' && --depth === 0) return index
  }
  return -1
}

function patchLayout(file) {
  let source = fs.readFileSync(file, 'utf8')
  if (source.includes('className:"customer-premium-topbar"')) return

  const marker = /\(0,([A-Za-z_$][\w$]*)\.jsxs\)\("header",\{className:"hidden h-20 items-center justify-between border-b border-\[#eadfd4\] md:flex"/
  const match = source.match(marker)
  if (!match || match.index === undefined) throw new Error(`desktop customer header not found: ${file}`)
  const jsx = match[1]
  const callOpen = source.indexOf('("header"', match.index)
  const callEnd = findCallEnd(source, callOpen)
  if (callOpen < 0 || callEnd < 0) throw new Error(`desktop customer header is not balanced: ${file}`)
  const oldHeader = source.slice(match.index, callEnd + 1)
  const linkMatch = oldHeader.match(/([A-Za-z_$][\w$]*)\.default,\{href:"\/u\/news"/)
  if (!linkMatch) throw new Error(`customer link component not found: ${file}`)
  const link = linkMatch[1]
  const nextHeader = `(0,${jsx}.jsxs)("header",{className:"customer-premium-topbar",children:[(0,${jsx}.jsx)(${link}.default,{href:"/u/menu",className:"customer-premium-icon-button",\"aria-label\":\"メニューを開く\",children:(0,${jsx}.jsx)("span",{className:"customer-premium-menu-lines",\"aria-hidden\":true})}),(0,${jsx}.jsxs)(${link}.default,{href:"/u/home",className:"customer-premium-brand",children:[(0,${jsx}.jsx)("span",{className:"customer-premium-brand-script",children:"Salon de Lien"}),(0,${jsx}.jsx)("span",{className:"customer-premium-brand-sub",children:"BEAUTY MEMBERSHIP"})]}),(0,${jsx}.jsx)(${link}.default,{href:"/u/news",className:"customer-premium-icon-button",\"aria-label\":\"お知らせ\",children:(0,${jsx}.jsx)("span",{className:"customer-premium-bell-icon",\"aria-hidden\":true})})]})`
  source = `${source.slice(0, match.index)}${nextHeader}${source.slice(callEnd + 1)}`
  fs.writeFileSync(file, source)
}

const unifiedCss = `
/* Customer routes use the exact visual frame and tokens of the premium /u/home app. */
:root{--customer-rose:#d85d79;--customer-rose-dark:#bc4966;--customer-rose-soft:#fceaf0;--customer-ink:#332d2a;--customer-muted:#81756f;--customer-line:#eaded9;--customer-paper:#fffdfb;--customer-cream:#faf6f2}
.customer-premium-topbar{display:none}
.customer-premium-brand{display:flex;min-width:0;flex-direction:column;align-items:center;justify-content:center;text-align:center;line-height:1}
.customer-premium-brand-script{color:#715f58;font:italic 23px Georgia,"Times New Roman",serif;letter-spacing:.02em}
.customer-premium-brand-sub{margin-top:5px;color:#b7a39b;font:8px Georgia,"Times New Roman",serif;letter-spacing:.22em}
.customer-premium-icon-button{display:grid;width:42px;height:42px;place-items:center;border-radius:50%;color:#75655e}
.customer-premium-menu-lines{display:block;width:18px;height:12px;border-top:1.7px solid currentColor;border-bottom:1.7px solid currentColor;background:linear-gradient(currentColor,currentColor) center/18px 1.7px no-repeat}
.customer-premium-bell-icon{display:block;width:22px;height:22px;background:currentColor;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='none' stroke='black' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.7' d='M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4'/%3E%3C/svg%3E") center/contain no-repeat}

@media(min-width:1024px){
html{background:#efe9e5!important}
body:has(.customer-premium-topbar){margin:0!important;padding:0!important;background:#efe9e5!important;color:var(--customer-ink)!important;font-family:-apple-system,BlinkMacSystemFont,"Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif!important;-webkit-font-smoothing:antialiased}
body:has(.customer-premium-topbar)>div:first-child{position:relative!important;width:100%!important;max-width:1440px!important;min-height:100dvh!important;margin:0 auto!important;overflow:visible!important;border-radius:0!important;background:var(--customer-paper)!important;box-shadow:0 0 54px rgba(85,66,57,.085)!important}
body:has(.customer-premium-topbar)>div:first-child>div{min-height:100dvh!important;background:var(--customer-paper)!important;color:var(--customer-ink)!important}
body:has(.customer-premium-topbar)>div:first-child>div>header:first-child{display:none!important}
body:has(.customer-premium-topbar)>div:first-child>div>div.mx-auto.min-h-screen.w-full{display:grid!important;width:100%!important;max-width:1440px!important;min-height:100dvh!important;margin:0!important;grid-template-columns:238px minmax(0,1fr)!important;gap:0!important;padding:0!important;background:var(--customer-paper)!important}
body:has(.customer-premium-topbar) aside{display:flex!important;position:sticky!important;top:0!important;width:238px!important;height:100dvh!important;flex-direction:column!important;padding:104px 18px 24px!important;border:0!important;border-right:1px solid var(--customer-line)!important;background:rgba(255,250,247,.96)!important}
body:has(.customer-premium-topbar) aside>a:first-child,body:has(.customer-premium-topbar) aside>div:last-child{display:none!important}
body:has(.customer-premium-topbar) aside nav{display:grid!important;margin:0!important;gap:8px!important}
body:has(.customer-premium-topbar) aside nav a{min-height:52px!important;justify-content:flex-start!important;gap:13px!important;border-radius:12px!important;padding:0 16px!important;background:transparent!important;color:#a3948d!important;font-size:12px!important;font-weight:700!important;box-shadow:none!important}
body:has(.customer-premium-topbar) aside nav a svg{width:21px!important;height:21px!important;stroke-width:1.7!important}
body:has(.customer-premium-topbar) aside nav a[aria-current="page"]{background:var(--customer-rose-soft)!important;color:var(--customer-rose-dark)!important}
body:has(.customer-premium-topbar) aside nav a:not([aria-current="page"]):hover{background:#fff4f7!important;color:var(--customer-rose-dark)!important;transform:none!important}
body:has(.customer-premium-topbar) div.mx-auto.min-h-screen.w-full>.min-w-0{min-width:0!important;background:var(--customer-paper)!important}
body:has(.customer-premium-topbar) .customer-premium-topbar{position:sticky!important;top:0!important;z-index:40!important;display:grid!important;width:100%!important;height:78px!important;grid-template-columns:48px minmax(0,1fr) 48px!important;align-items:center!important;padding:0 28px!important;border-bottom:1px solid var(--customer-line)!important;background:rgba(255,253,251,.95)!important;backdrop-filter:blur(12px)}
body:has(.customer-premium-topbar) .customer-premium-brand-script{font-size:27px!important}
body:has(.customer-premium-topbar) .customer-premium-icon-button:hover{background:#fff4f7!important;color:var(--customer-rose-dark)!important}
body:has(.customer-premium-topbar) main{width:100%!important;max-width:1120px!important;margin:0 auto!important;padding:22px 0 54px!important}
body:has(.customer-premium-topbar) main>.grid.gap-5{gap:20px!important}
body:has(.customer-premium-topbar) main>.grid.gap-5>*+*{margin-top:0!important}
body:has(.customer-premium-topbar) main>.grid.gap-5>nav:first-child{margin:0!important;border:0!important;border-bottom:1px solid var(--customer-line)!important;border-radius:0!important;padding:0!important;background:#fff!important;box-shadow:none!important}
body:has(.customer-premium-topbar) main>.grid.gap-5>nav:first-child a{min-height:48px!important;border-radius:0!important;background:transparent!important;color:var(--customer-muted)!important;font-size:11px!important;box-shadow:none!important}
body:has(.customer-premium-topbar) main>.grid.gap-5>nav:first-child a[class~="bg-[#8f4f42]"]{border-bottom:3px solid var(--customer-rose)!important;color:var(--customer-rose-dark)!important}
body:has(.customer-premium-topbar) main>.grid.gap-5>header[class*="rounded-[24px]"],body:has(.customer-premium-topbar) main>.grid.gap-5>header.grid.gap-3{margin:0!important;border-width:0 0 1px!important;border-color:var(--customer-line)!important;border-radius:0!important;padding:30px 20px!important;background:var(--customer-paper)!important;box-shadow:none!important}
body:has(.customer-premium-topbar) main>.grid.gap-5>header.grid.gap-3>figure{height:300px!important;border:0!important;border-radius:20px!important;box-shadow:none!important;filter:saturate(.84) contrast(.96)}
body:has(.customer-premium-topbar) main>.grid.gap-5>header.grid.gap-3>p{padding:0!important;color:var(--customer-muted)!important}
body:has(.customer-premium-topbar) main h1,body:has(.customer-premium-topbar) main h2{font-family:"Yu Mincho","Hiragino Mincho ProN",serif!important;letter-spacing:.035em!important}
body:has(.customer-premium-topbar) main h1{font-size:25px!important;line-height:1.5!important}
body:has(.customer-premium-topbar) main h2{font-size:20px!important;line-height:1.55!important}
body:has(.customer-premium-topbar) main [class~="text-[#8f4f42]"]{color:var(--customer-rose-dark)!important}
body:has(.customer-premium-topbar) main [class~="bg-[#8f4f42]"]{background-color:var(--customer-rose)!important}
body:has(.customer-premium-topbar) main [class~="bg-[#5b332c]"]{background:linear-gradient(135deg,var(--customer-rose),var(--customer-rose-dark))!important}
body:has(.customer-premium-topbar) main [class~="border-[#e8ded2]"],body:has(.customer-premium-topbar) main [class~="border-[#e4d1c7]"]{border-color:var(--customer-line)!important}
body:has(.customer-premium-topbar) main [class~="rounded-[24px]"],body:has(.customer-premium-topbar) main [class~="rounded-[22px]"],body:has(.customer-premium-topbar) main [class~="rounded-[20px]"]{border-radius:14px!important;box-shadow:0 3px 12px rgba(88,62,51,.045)!important}
body:has(.customer-premium-topbar) main input,body:has(.customer-premium-topbar) main select,body:has(.customer-premium-topbar) main textarea{border-color:var(--customer-line)!important;border-radius:8px!important;background:#fff!important;color:var(--customer-ink)!important;box-shadow:none!important}
body:has(.customer-premium-topbar)>div:first-child>div>nav:last-child{display:none!important}
}
`
const prioritizedUnifiedCss = unifiedCss.replaceAll(
  'body:has(.customer-premium-topbar)',
  'body:has(.customer-premium-topbar):not(#customer-premium-shell)',
)

const serverLayout = path.join(appRoot, '.next/server/chunks/1597.js')
patchLayout(serverLayout)

const staticLayoutRoot = path.join(appRoot, '.next/static/chunks/app/u/(account)')
const layoutFile = fs.readdirSync(staticLayoutRoot).find(name => /^layout-.*\.js$/.test(name))
if (!layoutFile) throw new Error('customer static layout chunk not found')
const layoutPath = path.join(staticLayoutRoot, layoutFile)
patchLayout(layoutPath)
const nextLayoutFile = layoutFile.replace(/(?:\.customer-home-unified-v\d+)?\.js$/, '.customer-home-unified-v35.js')
if (nextLayoutFile !== layoutFile) {
  fs.renameSync(layoutPath, path.join(staticLayoutRoot, nextLayoutFile))
  replaceReferences(path.join(appRoot, '.next'), layoutFile, nextLayoutFile)
}

const cssRoot = path.join(appRoot, '.next/static/css')
const cssFiles = fs.readdirSync(cssRoot).filter(name => name.endsWith('.css'))
if (!cssFiles.length) throw new Error('application stylesheet not found')
const nextCssFiles = []
for (const cssFile of cssFiles) {
  const cssPath = path.join(cssRoot, cssFile)
  let css = fs.readFileSync(cssPath, 'utf8')
  if (!css.includes('Customer routes use the exact visual frame')) css += prioritizedUnifiedCss
  fs.writeFileSync(cssPath, css)
  const nextCssFile = cssFile.replace(/(?:\.customer-home-unified-v\d+)?\.css$/, '.customer-home-unified-v35.css')
  if (nextCssFile !== cssFile) {
    fs.renameSync(cssPath, path.join(cssRoot, nextCssFile))
    replaceReferences(path.join(appRoot, '.next'), cssFile, nextCssFile)
  }
  nextCssFiles.push(nextCssFile)
}

console.log(JSON.stringify({ patched: [serverLayout, nextLayoutFile, ...nextCssFiles] }))
