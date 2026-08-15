'use strict'

const fs = require('fs')
const path = require('path')

const marker = 'admin-theme-first-paint-v153'
const themeModalCssFile = path.join(__dirname, 'admin-theme-modal-v146.css')
const themeModalCss = fs.readFileSync(themeModalCssFile, 'utf8')
const legacyRule = 'body>div:first-child>div>header:first-child{display:none!important}'
const headerVisibilityOverride = 'body header.admin-shell-header,body .admin-app-shell .admin-shell-header.admin-shell-header{display:block!important;visibility:visible!important;opacity:1!important}@media(min-width:768px){body header.admin-shell-header>.admin-mobile-header{display:none!important}body header.admin-shell-header>.admin-desktop-header{display:flex!important}}@media(max-width:767.98px){body header.admin-shell-header>.admin-mobile-header{display:flex!important}body header.admin-shell-header>.admin-desktop-header{display:none!important}}'
const override = 'body .admin-app-shell .admin-shell-header.admin-shell-header{display:block!important}@media(min-width:768px){body .admin-app-shell .admin-shell-header.admin-shell-header>.admin-mobile-header{display:none!important}body .admin-app-shell .admin-shell-header.admin-shell-header>.admin-desktop-header{display:flex!important}}@media(max-width:767.98px){body .admin-app-shell .admin-shell-header.admin-shell-header>.admin-mobile-header{display:flex!important}body .admin-app-shell .admin-shell-header.admin-shell-header>.admin-desktop-header{display:none!important}}@media(min-width:1024px){body button[aria-label="サイドバーを閉じる"],body button[aria-label="サイドバーを開く"]{display:grid!important;width:38px!important;height:38px!important;min-width:38px!important;min-height:38px!important;place-items:center!important;overflow:hidden!important;border:1px solid #dfcec6!important;border-radius:13px!important;background:linear-gradient(145deg,#fff,#fff8f5)!important;padding:0!important;color:#865044!important;font-size:0!important;line-height:0!important;box-shadow:0 8px 22px rgba(77,42,33,.13),inset 0 1px 0 #fff!important}body button[aria-label="サイドバーを閉じる"]::before,body button[aria-label="サイドバーを開く"]::before{display:block!important;width:18px!important;height:18px!important;background:currentColor!important;content:""!important;mask-position:center!important;mask-repeat:no-repeat!important;mask-size:18px 18px!important}body button[aria-label="サイドバーを閉じる"]::before{mask-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\'%3E%3Cpath d=\'m15 18-6-6 6-6\' fill=\'none\' stroke=\'black\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")!important}body button[aria-label="サイドバーを開く"]::before{mask-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\'%3E%3Cpath d=\'m9 18 6-6-6-6\' fill=\'none\' stroke=\'black\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")!important}body button.ca-sidebar-control::before,body button.ca-sidebar-control::after,body button.ts-sidebar-toggle::before,body button.ts-sidebar-toggle::after{display:none!important;content:none!important}}'
const firstPaintChrome = '@media(min-width:1024px){body header.admin-shell-header>.admin-desktop-header{padding-left:52px!important}body header.admin-shell-header>.admin-desktop-header>div:first-child{display:grid!important;width:104px!important;min-width:104px!important;flex:0 0 104px!important;justify-items:center!important;text-align:center!important}body header.admin-shell-header>.admin-desktop-header>div:first-child>p{width:100%!important;text-align:center!important}body header.admin-shell-header a[href="/admin/account"],body header.admin-shell-header a[href="/admin/settings"],body header.admin-shell-header button[aria-label*="コマンド"]{display:none!important}body header.admin-shell-header .ca-header-store-mount{min-width:290px;justify-content:flex-end}body header.admin-shell-header .ca-header-store-mount:empty{display:flex!important;height:44px;align-items:center;gap:9px}body header.admin-shell-header .ca-header-store-mount:empty::before{display:block;width:42px;height:42px;flex:0 0 42px;border:1px solid #e8d8d0;border-radius:50%;background:#fffdfb url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2372584f\' stroke-width=\'1.8\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9\'/%3E%3Cpath d=\'M10 21h4\'/%3E%3C/svg%3E") center/18px 18px no-repeat;box-shadow:0 6px 18px #5b34250d;content:""}body header.admin-shell-header .ca-header-store-mount:empty::after{display:flex;height:42px;min-width:150px;align-items:center;border:1px solid #e8d8d0;border-radius:999px;background:#fffdfb;padding:0 14px;color:#4b3730;font-size:11px;font-weight:900;content:"Salon de Lien"}}@media(max-width:767.98px){body header.admin-shell-header .ca-header-store-mount{min-width:0}}'

const collisionProofHeader = '@media(min-width:1024px){body>div:first-child>div>header.admin-shell-header:first-child>div.admin-desktop-header{padding-left:52px!important}body>div:first-child>div>header.admin-shell-header:first-child>div.admin-desktop-header>div:first-child{display:grid!important;width:104px!important;min-width:104px!important;flex:0 0 104px!important;justify-items:center!important;text-align:center!important}body>div:first-child>div>header.admin-shell-header:first-child>div.admin-desktop-header>div:first-child>p{width:100%!important;text-align:center!important}}'
const firstPaintDark = 'html[data-ca-theme="dark"]{color-scheme:dark;--lien-bg:#151210;--lien-bg-strong:#211a17;--lien-surface:#211b18;--lien-surface-soft:#2a221e;--lien-surface-rose:#35242a;--lien-border:#483a34;--lien-border-strong:#655149;--lien-ink:#f4ece7;--lien-muted:#b9aaa2;--lien-muted-2:#94857e;--lien-primary:#e18aa3;--lien-primary-dark:#f2b0c3;--lien-primary-soft:#673747;--lien-shadow:0 18px 45px #0006;--lien-shadow-sm:0 8px 24px #0005}html[data-ca-theme="dark"],html[data-ca-theme="dark"] body,html[data-ca-theme="dark"] .admin-app-shell,html[data-ca-theme="dark"] .admin-main-content{background:#151210!important;color:#f4ece7!important}html[data-ca-theme="dark"] .admin-desktop-sidebar{border-color:#40342f!important;background:#191513f7!important}html[data-ca-theme="dark"] .admin-shell-header{border-color:#40342f!important;background:#1d1816f5!important}'

function walk(root) {
  if (!fs.existsSync(root)) return []
  return fs.readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(root, entry.name)
    return entry.isDirectory() ? walk(target) : [target]
  })
}

function replaceReferences(root, oldName, newName, excludedFile) {
  let count = 0
  for (const file of walk(root)) {
    if (file === excludedFile || !/\.(?:js|json|html)$/.test(file)) continue
    const source = fs.readFileSync(file, 'utf8')
    if (!source.includes(oldName)) continue
    fs.writeFileSync(file, source.replaceAll(oldName, newName))
    count += 1
  }
  return count
}

function patchAdminShellStability(appRoot = process.env.APP_ROOT || '/app') {
  const cssRoot = path.join(appRoot, '.next', 'static', 'css')
  const candidates = walk(cssRoot).filter(file => file.endsWith('.css'))
  const patched = []
  for (const file of candidates) {
    const source = fs.readFileSync(file, 'utf8')
    if (source.includes(marker)) { patched.push(file); continue }
    if (!source.includes(legacyRule)) continue
    const oldName = path.basename(file)
    const newName = oldName.replace(/\.css$/, `.${marker}.css`)
    const newFile = path.join(path.dirname(file), newName)
    fs.writeFileSync(newFile, `${source}\n/* ${marker} */${headerVisibilityOverride}${override}${firstPaintChrome}${collisionProofHeader}${firstPaintDark}\n${themeModalCss}\n`)
    fs.unlinkSync(file)
    replaceReferences(path.join(appRoot, '.next'), oldName, newName, newFile)
    patched.push(newFile)
  }
  if (!patched.length) throw new Error('admin shell CSS containing the legacy header rule was not found')
  return { marker, patched: patched.map(file => path.relative(appRoot, file)) }
}

if (require.main === module) console.log(JSON.stringify(patchAdminShellStability()))
module.exports = { marker, legacyRule, headerVisibilityOverride, override, firstPaintChrome, collisionProofHeader, firstPaintDark, themeModalCss, patchAdminShellStability }
