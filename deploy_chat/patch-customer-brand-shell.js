const fs = require('fs')
const path = require('path')

const appRoot = process.env.APP_ROOT || '/app'

function patchLayout(file) {
  let source = fs.readFileSync(file, 'utf8')
  const match = source.match(/let p=\[(\{href:"\/u\/home"[\s\S]*?)\];function b/)
  if (!match) throw new Error(`customer navigation not found: ${file}`)
  const entries = [...match[1].matchAll(/\{href:"([^"]+)",label:"([^"]+)",icon:([^}]+)\}/g)]
  const byHref = new Map(entries.map(m => [m[1], m[3]]))
  for (const required of ['/u/home','/u/appointments','/u/reviews','/u/history','/u/community']) if (!byHref.has(required)) throw new Error(`customer icon not found for ${required}: ${file}`)
  const navigation = `let p=[{href:"/u/home",label:"ホーム",icon:${byHref.get('/u/home')}},{href:"/u/appointments",label:"予約",icon:${byHref.get('/u/appointments')}},{href:"/u/history",label:"履歴",icon:${byHref.get('/u/history')}},{href:"/u/news",label:"メッセージ",icon:${byHref.get('/u/reviews')}},{href:"/u/menu",label:"メニュー",icon:${byHref.get('/u/community')}}];function b`
  source = source.replace(match[0], navigation)
  source = source.replaceAll('grid-cols-6', 'grid-cols-5')
  source = source.replaceAll('href:"/u/messages"', 'href:"/u/news"')
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
const versionedLayoutFile = layoutFile.replace(/\.js$/, '.premium-mobile-v23.js')
fs.renameSync(layoutPath, path.join(staticRoot, versionedLayoutFile))
replaceReferences(path.join(appRoot, '.next'), layoutFile, versionedLayoutFile)

const cssRoot = path.join(appRoot, '.next/static/css')
const cssFile = fs.readdirSync(cssRoot).find(name => name.endsWith('.css'))
if (!cssFile) throw new Error('application stylesheet not found')
fs.appendFileSync(path.join(cssRoot, cssFile), `
@media(max-width:767px){
nav[aria-label="お客様アプリメニュー"]{background:rgba(255,253,251,.97)!important;border-color:#eaded9!important;box-shadow:0 -8px 22px rgba(109,73,60,.06)!important}
nav[aria-label="お客様アプリメニュー"] a{border-radius:12px!important;color:#a3948d!important;font-size:10px!important}
nav[aria-label="お客様アプリメニュー"] a[aria-current="page"]{background:#fceaf0!important;color:#d85d79!important;box-shadow:inset 0 0 0 1px #f2cad5!important}
header:has(a[aria-label="プロフィールとアカウント設定を開く"]){background:rgba(255,253,251,.96)!important;border-color:#eaded9!important}
}
`)

console.log(JSON.stringify({ patched: ['server customer layout', versionedLayoutFile, cssFile] }))
