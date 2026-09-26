import fs from 'node:fs'
import path from 'node:path'
const root=process.env.LIEN_RUNTIME_ROOT||'/app'
const read=name=>fs.readFileSync(path.join(root,name),'utf8')
const write=(name,source)=>fs.writeFileSync(path.join(root,name),source)
function replace(source,before,after,count=1){
  if(source.split(before).length-1!==count)throw Error('Unexpected parent: '+before)
  return source.replaceAll(before,after)
}
let client=read('dealer-erp-v678-client.js')
client=replace(client,"required = false) => `<label class=\"erp-wide\">","required = false, maxlength = 4000) => `<label class=\"erp-wide\">")
client=replace(client,'rows="3" maxlength="4000" ${required','rows="3" maxlength="${maxlength}" ${required')
client=replace(client,"+area('reason','理由','',true),(p,k) => command('stock',p,k)","+area('reason','備考（任意）','',false,1000),(p,k) => command('stock',p,k)")
client=replace(client,"['日時','商品 / 保管場所','区分','増減','引当増減','更新後','理由']","['日時','商品 / 保管場所','区分','増減','引当増減','更新後','備考']")
write('dealer-erp-v678-client.stock-note-v681.js',client)
let server=read('dealer-erp-v678.js')
server=replace(server,"const reason = text(p.reason, '理由', 1000), st = await stock", "const reason = text(p.reason, '備考', 1000, true), st = await stock")
server=replace(server,'/dealer-erp-v678-client.js?v=1','/dealer-erp-v678-client.stock-note-v681.js?v=681-1',2)
server=replace(server,"const assets = { '/dealer-erp-v678-client.js':", "const assets = { '/dealer-erp-v678-client.stock-note-v681.js': 'application/javascript', '/dealer-erp-v678-client.js':")
write('dealer-erp-v678.js',server)
const marker="      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Three-App-QA', 'v680') /* three-app-qa-v680 */"
write('server.js',replace(read('server.js'),marker,marker+"\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Dealer-Stock-Note', 'v681') /* dealer-stock-note-v681 */"))
console.log('v681: optional stock notes, history label and immutable client asset')
