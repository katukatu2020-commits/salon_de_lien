const fs = require('fs')
const path = require('path')

const appRoot = process.env.APP_ROOT || '/app'
const marker = 'Admin mobile workspace v38'

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

function addToken(source, before, token, label) {
  if (source.includes(token)) return source
  if (!source.includes(before)) throw new Error(`${label} not found`)
  return source.split(before).join(`${token} ${before}`)
}

function patchAdminLayout(file) {
  let source = fs.readFileSync(file, 'utf8')
  if (source.includes('admin-mobile-workspace-v38')) return false
  source = addToken(
    source,
    'min-h-screen overflow-x-hidden bg-lien text-lien-ink',
    'admin-app-shell admin-mobile-workspace-v38',
    `admin root in ${file}`,
  )
  source = addToken(
    source,
    'fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-lien bg-white/90 shadow-lien-sm transition-transform duration-200 md:block',
    'admin-desktop-sidebar',
    `admin desktop sidebar in ${file}`,
  )
  source = addToken(
    source,
    'sticky top-0 z-40 border-b border-lien bg-[#fffdf9]/92 backdrop-blur-xl',
    'admin-shell-header',
    `admin shell header in ${file}`,
  )
  source = addToken(
    source,
    'flex h-14 items-center justify-between px-4 md:hidden',
    'admin-mobile-header',
    `admin mobile header in ${file}`,
  )
  source = addToken(
    source,
    'hidden min-h-16 min-w-0 items-center gap-3 px-5 py-3 md:flex lg:px-8',
    'admin-desktop-header',
    `admin desktop header in ${file}`,
  )
  source = addToken(
    source,
    'min-w-0 overflow-x-hidden px-4 py-5 sm:px-6 lg:px-8',
    'admin-main-content',
    `admin main content in ${file}`,
  )
  fs.writeFileSync(file, source)
  return true
}

function patchAdminChat(file) {
  let source = fs.readFileSync(file, 'utf8')
  if (!source.includes('grid min-h-[620px] gap-4 lg:grid-cols-[19rem_minmax(0,1fr)]')) {
    throw new Error(`admin chat layout not found: ${file}`)
  }
  source = source.replace(
    'grid min-h-[620px] gap-4 lg:grid-cols-[19rem_minmax(0,1fr)]',
    'admin-chat-layout grid min-h-[620px] gap-4 lg:grid-cols-[19rem_minmax(0,1fr)]',
  )
  source = source.replace(
    'className: "p-3 sm:p-3"',
    'className: "admin-chat-thread-list p-3 sm:p-3"',
  )
  source = source.replace(
    'className:"p-3 sm:p-3"',
    'className:"admin-chat-thread-list p-3 sm:p-3"',
  )
  source = source.replace(
    'flex min-h-[620px] flex-col',
    'admin-chat-conversation flex min-h-[620px] flex-col',
  )

  if (!source.includes('admin-chat-explicit-selection-v38')) {
    const queryAnchor = source.indexOf('SELECT t.*, c.')
    const layoutAnchor = source.indexOf('grid min-h-[620px]', queryAnchor)
    if (queryAnchor < 0 || layoutAnchor < 0) {
      throw new Error(`admin chat query block not found: ${file}`)
    }
    const head = source.slice(0, queryAnchor)
    let queryBlock = source.slice(queryAnchor, layoutAnchor)
    const defaultThread = /:\s*([A-Za-z_$][\w$]*)\[0\](?:\s*\?\?\s*null)?(?=\s*,)/
    if (!defaultThread.test(queryBlock)) {
      throw new Error(`admin chat default thread selection not found: ${file}`)
    }
    queryBlock = queryBlock.replace(defaultThread, ': null /* admin-chat-explicit-selection-v38 */')
    source = head + queryBlock + source.slice(layoutAnchor)
  }

  if (!source.includes('admin-chat-mobile-back')) {
    const conversationIndex = source.indexOf('admin-chat-conversation')
    const head = source.slice(0, conversationIndex)
    let tail = source.slice(conversationIndex)
    const fragment = /children:\s*([A-Za-z_$][\w$]*)\s*\?\s*\(0,\s*([A-Za-z_$][\w$]*)\.jsxs\)\(\2\.Fragment,\s*\{\s*children:\s*\[/
    const match = tail.match(fragment)
    if (!match) throw new Error(`admin chat conversation fragment not found: ${file}`)
    const jsx = match[2]
    tail = tail.replace(
      fragment,
      `${match[0]}${jsx}.jsx("a",{href:"/admin/customers/messages/chat",className:"admin-chat-mobile-back",children:"← トーク一覧"}),`,
    )
    source = head + tail
  }
  fs.writeFileSync(file, source)
}

const mobileCss = `
/* ${marker}: isolate admin routes from the customer phone frame and make every workspace touch friendly. */
html:has(.admin-app-shell),body:has(.admin-app-shell){margin:0!important;padding:0!important;background:#faf6ef!important}
body:has(.admin-app-shell)>div:first-child,.admin-app-shell{position:relative!important;width:100%!important;max-width:none!important;min-height:100dvh!important;margin:0!important;overflow-x:hidden!important;border-radius:0!important;background:var(--lien-bg,#faf6ef)!important;box-shadow:none!important;color:var(--lien-ink,#2f2a25)!important;font-family:"Noto Sans JP","Hiragino Sans","Yu Gothic UI",system-ui,sans-serif!important}
.admin-app-shell .admin-shell-header{display:block!important;width:auto!important;height:auto!important;border-radius:0!important;background:rgba(255,253,249,.94)!important}
.admin-app-shell .admin-main-content{width:auto!important;max-width:none!important;margin:0!important;padding:1.25rem 1rem!important;overflow-x:hidden!important}
.admin-app-shell .admin-main-content h1,.admin-app-shell .admin-main-content h2{font-family:inherit!important;letter-spacing:normal!important}
.admin-app-shell .admin-main-content h1{font-size:1.875rem!important;line-height:1.25!important}
.admin-app-shell .admin-main-content h2{line-height:1.35!important}
.admin-app-shell .admin-main-content button,.admin-app-shell .admin-main-content a,.admin-app-shell .admin-shell-header button,.admin-app-shell .admin-shell-header a{touch-action:manipulation}

@media(max-width:767px){
  .admin-app-shell{padding-bottom:calc(70px + env(safe-area-inset-bottom))!important}
  .admin-app-shell .admin-mobile-header{display:flex!important;height:58px!important;min-height:58px!important;padding:0 10px!important;gap:8px!important}
  .admin-app-shell .admin-mobile-header>a:first-child{max-width:132px!important;font-size:13px!important}
  .admin-app-shell .admin-mobile-header>div{gap:5px!important}
  .admin-app-shell .admin-mobile-header .lien-icon-button{width:40px!important;min-width:40px!important;height:40px!important;min-height:40px!important}
  .admin-app-shell .admin-mobile-header a[aria-label*="アカウント"]{max-width:72px!important}
  .admin-app-shell .admin-mobile-header a[aria-label*="アカウント"] span:last-child{display:none!important}
  .admin-app-shell .admin-desktop-header{display:none!important}
  .admin-app-shell .admin-main-content{padding:12px 12px 24px!important}
  .admin-app-shell .admin-main-content>div{width:100%!important;max-width:100%!important;gap:14px!important}
  .admin-app-shell .admin-main-content header[class*="rounded-"]{padding:16px!important;border-radius:18px!important}
  .admin-app-shell .admin-main-content header figure{display:none!important}
  .admin-app-shell .admin-main-content h1{font-size:23px!important;line-height:1.35!important;overflow-wrap:anywhere}
  .admin-app-shell .admin-main-content h2{font-size:18px!important;overflow-wrap:anywhere}
  .admin-app-shell .admin-main-content p{overflow-wrap:anywhere}
  .admin-app-shell .admin-main-content section[class*="rounded-"]{border-radius:18px!important;padding:16px!important}
  .admin-app-shell .admin-main-content nav[class*="grid-cols-"]{width:100%!important;max-width:100%!important;overflow:hidden!important;border-radius:15px!important;padding:4px!important}
  .admin-app-shell .admin-main-content nav[class*="grid-cols-"] a{min-width:0!important;min-height:44px!important;padding-right:6px!important;padding-left:6px!important;white-space:normal!important;text-align:center!important;font-size:11px!important;line-height:1.25!important}
  .admin-app-shell .admin-main-content [class*="md:grid-cols-2"],
  .admin-app-shell .admin-main-content [class*="md:grid-cols-3"],
  .admin-app-shell .admin-main-content [class*="md:grid-cols-["],
  .admin-app-shell .admin-main-content [class*="lg:grid-cols-2"],
  .admin-app-shell .admin-main-content [class*="lg:grid-cols-3"],
  .admin-app-shell .admin-main-content [class*="lg:grid-cols-["],
  .admin-app-shell .admin-main-content [class*="xl:grid-cols-"]{grid-template-columns:minmax(0,1fr)!important}
  .admin-app-shell .admin-main-content input:not([type="checkbox"]):not([type="radio"]),
  .admin-app-shell .admin-main-content select,
  .admin-app-shell .admin-main-content textarea{max-width:100%!important;min-height:46px!important;font-size:16px!important}
  .admin-app-shell .admin-main-content button,.admin-app-shell .admin-main-content a[class*="button"]{min-height:44px}
  .admin-app-shell .admin-main-content form[class*="sm:flex-row"]{display:grid!important;grid-template-columns:minmax(0,1fr)!important}
  .admin-app-shell .admin-main-content div:has(>table){position:relative!important;display:block!important;max-width:100%!important;overflow-x:auto!important;overscroll-behavior-x:contain!important;-webkit-overflow-scrolling:touch!important;scrollbar-width:thin}
  .admin-app-shell .admin-main-content table{width:max-content!important;min-width:680px!important;font-size:12px!important}
  .admin-app-shell .admin-main-content table th,.admin-app-shell .admin-main-content table td{padding:11px 12px!important;vertical-align:top!important}
  .admin-app-shell .admin-main-content table th:first-child,.admin-app-shell .admin-main-content table td:first-child{position:sticky!important;left:0!important;z-index:2!important;background:#fffdf9!important;box-shadow:1px 0 0 var(--lien-border,#eadfd4)}

  /* The desktop sidebar becomes a five-item thumb navigation. The hamburger still opens the full menu. */
  .admin-app-shell>.admin-desktop-sidebar{display:block!important;position:fixed!important;inset:auto 0 0!important;z-index:45!important;width:100%!important;height:calc(66px + env(safe-area-inset-bottom))!important;transform:none!important;border:0!important;border-top:1px solid var(--lien-border,#eadfd4)!important;background:rgba(255,253,249,.97)!important;box-shadow:0 -7px 24px rgba(72,48,38,.09)!important;backdrop-filter:blur(14px)}
  .admin-app-shell>.admin-desktop-sidebar>div{display:block!important;width:100%!important;height:100%!important;min-height:0!important;background:transparent!important}
  .admin-app-shell>.admin-desktop-sidebar>div>div{display:none!important}
  .admin-app-shell>.admin-desktop-sidebar nav{display:grid!important;width:100%!important;height:66px!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:1px!important;padding:4px 3px!important;overflow:visible!important}
  .admin-app-shell>.admin-desktop-sidebar nav form{display:none!important}
  .admin-app-shell>.admin-desktop-sidebar nav a{display:flex!important;min-width:0!important;min-height:58px!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:3px!important;border-radius:12px!important;padding:3px 2px!important;background:transparent!important;color:#8d7e75!important;box-shadow:none!important;font-size:9px!important;line-height:1.12!important;text-align:center!important}
  .admin-app-shell>.admin-desktop-sidebar nav a svg{width:20px!important;height:20px!important;flex:0 0 20px!important}
  .admin-app-shell>.admin-desktop-sidebar nav a span{display:-webkit-box!important;overflow:hidden!important;white-space:normal!important;-webkit-box-orient:vertical!important;-webkit-line-clamp:2!important}
  .admin-app-shell>.admin-desktop-sidebar nav a[aria-current="page"]{background:#f3e5df!important;color:var(--lien-primary,#8f4f42)!important;box-shadow:inset 0 0 0 1px #ead0c7!important}

  /* Calendar has its own compact month grid; the shift board remains readable and swipes horizontally. */
  .admin-app-shell .admin-main-content .isolate:has([data-staff-name]){display:block!important;width:100%!important;max-width:100%!important;overflow-x:auto!important;overscroll-behavior-x:contain!important;-webkit-overflow-scrolling:touch!important;touch-action:pan-x pan-y!important}
  .admin-app-shell .admin-main-content .isolate:has([data-staff-name])>.w-full{width:1080px!important;min-width:1080px!important}
  .admin-app-shell .admin-main-content .isolate:has([data-staff-name])>.w-full>.grid>:first-child{position:sticky!important;left:0!important;z-index:25!important;background:#fffdf9!important;box-shadow:1px 0 0 var(--lien-border,#eadfd4)}
  .admin-app-shell .admin-main-content .isolate:has([data-staff-name])>.w-full>.grid:first-child>:nth-child(3){position:sticky!important;left:0!important;z-index:25!important;background:#fbf8f3!important;box-shadow:1px 0 0 var(--lien-border,#eadfd4)}

  /* Chat opens as a true two-screen mobile flow: thread list, then one full-width conversation. */
  .admin-app-shell .admin-chat-layout{display:block!important;min-height:0!important;grid-template-columns:minmax(0,1fr)!important}
  .admin-app-shell .admin-chat-layout:not(:has(.admin-chat-conversation h2)) .admin-chat-conversation{display:none!important}
  .admin-app-shell .admin-chat-layout:has(.admin-chat-conversation h2) .admin-chat-thread-list{display:none!important}
  .admin-app-shell .admin-chat-thread-list{min-height:0!important;padding:10px!important}
  .admin-app-shell .admin-chat-conversation{display:flex!important;min-height:calc(100dvh - 160px)!important;max-height:calc(100dvh - 138px)!important;border-radius:16px!important;padding:12px!important}
  .admin-app-shell .admin-chat-conversation>div:nth-of-type(2){overscroll-behavior-y:contain!important}
  .admin-app-shell .admin-chat-conversation form{position:sticky!important;bottom:0!important;z-index:3!important;display:grid!important;grid-template-columns:minmax(0,1fr) 54px!important;align-items:end!important;gap:7px!important;background:#fff!important;padding-top:10px!important}
  .admin-app-shell .admin-chat-conversation form textarea{min-height:48px!important;max-height:120px!important;padding:11px!important}
  .admin-app-shell .admin-chat-conversation form button{min-height:48px!important;padding:0 10px!important}
  .admin-app-shell .admin-chat-mobile-back{display:inline-flex!important;min-height:40px!important;align-items:center!important;align-self:flex-start!important;margin:0 0 10px!important;border-radius:999px!important;background:var(--lien-soft,#f6efe6)!important;padding:0 14px!important;color:var(--lien-primary-dark,#754136)!important;font-size:12px!important;font-weight:700!important}

  /* Full-height dialogs avoid clipped controls and unusable off-screen footers. */
  .admin-app-shell [role="dialog"]{width:100%!important;max-width:none!important;max-height:100dvh!important;border-radius:0!important}
  .admin-app-shell>.fixed.inset-0.z-50{align-items:stretch!important;padding:0!important}
  .admin-app-shell>.fixed.inset-0.z-50>div.relative{width:100%!important;max-width:none!important;max-height:100dvh!important;border-radius:0!important}
}

@media(min-width:768px){
  .admin-app-shell .admin-main-content{padding:1.25rem 1.5rem!important}
  .admin-chat-mobile-back{display:none!important}
}
@media(min-width:1024px){.admin-app-shell .admin-main-content{padding:1.25rem 2rem!important}}
`

function patchCss() {
  const cssRoot = path.join(appRoot, '.next/static/css')
  const cssFiles = fs.readdirSync(cssRoot).filter(name => name.endsWith('.css'))
  if (!cssFiles.length) throw new Error('application stylesheet not found')
  const renamed = []
  for (const cssFile of cssFiles) {
    const cssPath = path.join(cssRoot, cssFile)
    let css = fs.readFileSync(cssPath, 'utf8')
    if (!css.includes(marker)) css += mobileCss
    fs.writeFileSync(cssPath, css)
    const nextName = cssFile.replace(/(?:\.admin-mobile-v\d+)?\.css$/, '.admin-mobile-v38.css')
    if (nextName !== cssFile) {
      fs.renameSync(cssPath, path.join(cssRoot, nextName))
      replaceReferences(path.join(appRoot, '.next'), cssFile, nextName)
    }
    renamed.push(nextName)
  }
  return renamed
}

const patchedLayouts = []
const serverChunks = path.join(appRoot, '.next/server/chunks')
walk(serverChunks, file => {
  if (!file.endsWith('.js')) return
  const source = fs.readFileSync(file, 'utf8')
  if (source.includes('fixed inset-y-0 left-0 z-30 hidden w-64') && source.includes('管理画面ナビゲーション')) {
    if (patchAdminLayout(file)) patchedLayouts.push(file)
  }
})
if (!patchedLayouts.length) throw new Error('admin server layout chunk not found')

const staticAppRoot = path.join(appRoot, '.next/static/chunks/app')
const staticLayout = fs.readdirSync(staticAppRoot).find(name => /^layout-sidebar-boundary-.*\.js$/.test(name))
if (!staticLayout) throw new Error('admin static layout chunk not found')
const staticLayoutPath = path.join(staticAppRoot, staticLayout)
patchAdminLayout(staticLayoutPath)
const nextLayout = staticLayout.replace(/(?:\.admin-mobile-v\d+)?\.js$/, '.admin-mobile-v38.js')
if (nextLayout !== staticLayout) {
  fs.renameSync(staticLayoutPath, path.join(staticAppRoot, nextLayout))
  replaceReferences(path.join(appRoot, '.next'), staticLayout, nextLayout)
}

patchAdminChat(path.join(appRoot, '.next/server/app/admin/customers/messages/page.js'))
const css = patchCss()

console.log(JSON.stringify({ patchedLayouts, staticLayout: nextLayout, css }))
