const fs = require('fs')
const path = require('path')

const appRoot = process.env.APP_ROOT || '/app'
const roots = [`${appRoot}/.next/server`, `${appRoot}/.next/static`]
let tabCount = 0
let titleCount = 0
let panelCount = 0
const changedStaticFiles = []

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(file)
    else if (entry.isFile() && file.endsWith('.js')) patch(file)
  }
}

function patch(file) {
  let source = fs.readFileSync(file, 'utf8')
  const before = source
  source = source.replace(/key:\s*["']points["'],\s*href:\s*["']\/admin\/customers\?section=points["'],\s*label:\s*["']ポイント["']/g, () => {
    tabCount += 1
    return 'key:"points",href:"/admin/customers/messages/chat",label:"チャット"'
  })
  source = source.replaceAll('顧客・ポイント・配信', '顧客・チャット・配信')
  source = source.replaceAll('顧客・ポイント / 配信', '顧客・チャット・配信 / 配信')
  if (source !== before) titleCount += 1

  if (file.endsWith('/app/admin/customers/messages/page.js') || file.endsWith('\\app\\admin\\customers\\messages\\page.js')) {
    const anchor = 'r.jsx(u.Z, { active: "messages" }),' 
    if (source.includes(anchor) && !source.includes('配信ページ内ポイント管理')) {
      const panel = `(0,r.jsxs)("details",{className:"rounded-[18px] border border-lien bg-white shadow-lien-sm",children:[r.jsx("summary",{className:"cursor-pointer list-none px-5 py-4 font-semibold text-lien-ink",children:"ポイント管理"}),r.jsx("div",{className:"border-t border-lien px-5 py-4",children:(0,r.jsxs)("div",{className:"flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",children:[r.jsx("p",{className:"text-sm text-lien-muted",children:"保有ポイント、付与・利用履歴、ポイント設定を確認します。"}),r.jsx(n.default,{href:"/admin/customers?section=points",className:"inline-flex min-h-10 items-center justify-center rounded-[12px] bg-[color:var(--lien-primary)] px-4 text-sm font-semibold text-white",children:"ポイント管理を開く"})]})})]}),`
      source = source.replace(anchor, `${anchor}${panel}`)
      source = source.replace('title: "顧客へのお知らせ・クーポン配信",', 'title: "顧客へのお知らせ・クーポン配信",')
      source = source.replace('children: "顧客・チャット・配信 / 配信",', 'children: "顧客・チャット・配信 / 配信",')
      source += '\n/* 配信ページ内ポイント管理 */\n'
      panelCount += 1
    }
  }
  if (source !== before) {
    fs.writeFileSync(file, source)
    if (file.startsWith(`${appRoot}/.next/static/`)) changedStaticFiles.push(file)
  }
}

for (const root of roots) walk(root)
for (const file of changedStaticFiles) {
  const renamed = file.replace(/\.js$/, '.customertabs.js')
  fs.renameSync(file, renamed)
  replaceReferences(`${appRoot}/.next`, path.basename(file), path.basename(renamed))
}
console.log(JSON.stringify({ tabCount, titleCount, panelCount }))
if (!tabCount || !panelCount) process.exit(1)

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
