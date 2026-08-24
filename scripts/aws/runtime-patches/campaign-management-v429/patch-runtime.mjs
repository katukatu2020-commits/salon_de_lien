import fs from 'node:fs'

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

function patchFile(file, patcher) {
  const source = fs.readFileSync(file, 'utf8')
  const patched = patcher(source)
  if (patched === source) throw new Error(`${file}: patch produced no change`)
  fs.writeFileSync(file, patched)
}

const sharedTabsChunk = '/app/.next/server/chunks/3491.js'
const serverPath = '/app/server.js'

patchFile(sharedTabsChunk, source => {
  const oldItems = 'let t=[{key:"customers",href:"/admin/customers",label:"顧客管理",icon:n.Z},{key:"points",href:"/admin/customers/messages/chat",label:"チャット",icon:r.Z},{key:"messages",href:"/admin/customers/messages",label:"配信",icon:d.Z}]'
  const newItems = 'let t=[{key:"customers",href:"/admin/customers",label:"顧客管理",icon:n.Z},{key:"points",href:"/admin/customers/messages/chat",label:"チャット",icon:r.Z},{key:"messages",href:"/admin/customers/messages",label:"配信",icon:d.Z},{key:"campaigns",href:"/admin/customers/messages/campaigns",label:"キャンペーン",icon:d.Z}]'
  source = replaceOnce(source, oldItems, newItems, 'shared customer workspace campaign tab')
  source = replaceOnce(
    source,
    'inline-grid w-full grid-cols-3 gap-1 rounded-[18px] border border-lien bg-white p-1 shadow-lien-sm sm:w-auto',
    'inline-grid w-full grid-cols-4 gap-1 rounded-[18px] border border-lien bg-white p-1 shadow-lien-sm',
    'shared customer workspace four-column layout',
  )
  return source
})

patchFile(serverPath, source => {
  source = replaceOnce(
    source,
    '.customer-tabs{max-width:1216px;margin:20px auto 0;display:grid;grid-template-columns:repeat(3,1fr);',
    '.customer-tabs{max-width:1216px;margin:20px auto 0;display:grid;grid-template-columns:repeat(4,1fr);',
    'chat workspace four-column layout',
  )
  source = replaceOnce(
    source,
    '<a href="/admin/customers/messages">${icons.megaphone}<span>配信</span></a></nav>`',
    '<a href="/admin/customers/messages">${icons.megaphone}<span>配信</span></a><a href="/admin/customers/messages/campaigns">${icons.megaphone}<span>キャンペーン</span></a></nav>`',
    'chat workspace campaign tab',
  )
  return source
})

console.log('Campaign management v429 runtime patched.')
