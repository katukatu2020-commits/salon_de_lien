import fs from 'node:fs'
import path from 'node:path'
const root=process.env.LIEN_RUNTIME_ROOT||'/app'
const changes=[]
function replace(file,before,after) {
  const target=path.join(root,file)
  const source=fs.readFileSync(target,'utf8')
  if(source.split(before).length!==2) throw new Error('Unexpected v594 parent anchor: '+file+' / '+before.slice(0,90))
  fs.writeFileSync(target,source.replace(before,after))
  changes.push({file,before,after})
}
const file='customer-links-v293.js'
const source=fs.readFileSync(path.join(root,file),'utf8')
const start=source.indexOf('  async function availableStores(session) {')
const end=source.indexOf('  async function stores(req, res, url) {',start)
if(start<0||end<start||end-start>4500) throw new Error('Store list boundary changed')
replace(file,source.slice(start,end),`  async function availableStores(session) {
    await ensureSchema()
    return require('./customer-store-list-v595.js').availableStores(prisma, session)
  }

`)
replace(file,"${store.linked ? (store.current ? '現在利用中の店舗' : '登録済み') : '利用可能な店舗（未選択）'}", "${store.available === false ? '登録済み（店舗に確認してください）' : (store.current ? '現在利用中の店舗' : '登録済み')}")
replace(file,"${store.linked ? (store.current ? '<span class=\"registered-store-current\">利用中</span>'", "${store.available === false ? '<span class=\"registered-store-current registered-store-unavailable\">現在利用できません</span>' : store.linked ? (store.current ? '<span class=\"registered-store-current\">利用中</span>'")
replace(file,'.registered-store-form{margin-top:18px', '.registered-store-unavailable{background:#f3f4f5;color:#5c6266}.registered-store-form{margin-top:18px')
replace('customer-merge-v385.js',
  'if (!targetLink && transferredUserId && sourceLink.appUserId === transferredUserId) {',
  'if (!targetLink && (sourceLink.appUserId === transferredUserId || (!sourceUser && (!targetUser || targetUser.id === sourceLink.appUserId)))) {')
replace('customer-merge-v385.js',
  '    if (sourceLink) {\n      if (!targetLink',
  `    if (sourceLink && !sourceUser && (targetLink || targetUser) && (targetLink?.appUserId || targetUser?.id) !== sourceLink.appUserId) {
      throw Object.assign(new Error('別の会員アカウントと紐づくカルテのため統合できません。店舗への登録状態を確認してください。'), { statusCode: 409 })
    }
    if (sourceLink) {
      counts.storeMembership = { appUserId: sourceLink.appUserId, sourceCustomerId: source.id, targetCustomerId: target.id };
      if (!targetLink`)
const ready="      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Login-Visual', 'v593')"
replace('server.js',ready,ready+"\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Store-List', 'v595')")
fs.writeFileSync('/tmp/store-list-v595-changes.json',JSON.stringify(changes))
console.log('Customer store list v595: preserve merged memberships and surface unavailable registrations.')
