'use strict'
const fs=require('node:fs'),path=require('node:path')
const root=process.env.LIEN_RUNTIME_ROOT||'/app'
const read=f=>fs.readFileSync(path.join(root,f),'utf8')
const write=(f,s)=>fs.writeFileSync(path.join(root,f),s)
function replace(s,from,to,count=1){
  if(s.split(from).length!==count+1)throw Error('Unexpected anchor: '+from.slice(0,180))
  return s.split(from).join(to)
}
let erp=read('public/dealer-erp-v713-client.js')
const iconSource=erp.match(/^window.DealerErpIcons=(\{[^\n]+\})/)
if(!iconSource)throw Error('Existing Lucide icons missing')
const icons=JSON.parse(iconSource[1]),pickerIcons={}
for(const name of ['Search','X','Check','ChevronLeft','ChevronRight']){
  if(!icons[name])throw Error('Missing Lucide icon '+name)
  pickerIcons[name]=icons[name]
}
write('public/dealer-salon-picker-v714.js',replace(fs.readFileSync(path.join(__dirname,'picker.js'),'utf8'),'/* ICONS */ {}',JSON.stringify(pickerIcons)))
write('public/dealer-salon-picker-v714.css',fs.readFileSync(path.join(__dirname,'picker.css'),'utf8'))
// Explicit markers only: manufacturer, supplier, staff and salon-app dealer dropdowns stay unchanged.
erp=replace(erp,'<select name="${name}">','<select name="${name}"${label === \'サロン\' ? \' data-dealer-salon-picker="サロン"\' : \'\'}>')
erp=replace(erp,'<option value="${esc(r.id)}" ${String(current)', '<option value="${esc(r.id)}"${label === \'サロン\' ? ` data-salon-name="${esc(r.name)}" data-salon-code="${esc(r.code || \'\')}"` : \'\'} ${String(current)')
erp=replace(erp,"name:s.name + ' / ' + (s.publicCode || '')", "name:s.name, code:s.publicCode || s.customerCode || ''")
write('public/dealer-erp-v714-client.js',erp)
let catalog=read('public/dealer-catalog-v713.js')
catalog=replace(catalog,'<select id="dealer-pricing-salon">','<select id="dealer-pricing-salon" data-dealer-salon-picker="設定する美容室">')
catalog=replace(catalog,"esc(item.id) + '\" ' + (item.id === contract.id", "esc(item.id) + '\" data-salon-code=\"' + esc(item.publicCode || item.customerCode || '') + '\" ' + (item.id === contract.id")
write('public/dealer-catalog-v714.js',catalog)
let sales=read('public/dealer-sales-team-v694-client.js')
sales=replace(sales,'<select name="${name}">','<select name="${name}"${name === \'salon\' ? \' data-dealer-salon-picker="請求先（サロン）"\' : \'\'}>')
sales=replace(sales,'items.map(i => option(i.id,i.name,current))',`items.map(i => name === 'salon' ? option(i.id,i.name,current).replace('<option ', '<option data-salon-code="'+esc(i.code || '')+'" ') : option(i.id,i.name,current))`)
sales=replace(sales,'id:s.organizationId,name:s.name','id:s.organizationId,name:s.name,code:s.publicCode || s.customerCode || \'\'')
write('public/dealer-sales-team-v714-client.js',sales)
let shell=read('dealer-workspace-v713.js')
shell=replace(shell,'<script src="/dealer-readonly-v713.js" defer></script>', '<script src="/dealer-readonly-v713.js" defer></script><link rel="stylesheet" href="/dealer-salon-picker-v714.css"><script src="/dealer-salon-picker-v714.js" defer></script>')
shell=replace(shell,"'/dealer-catalog-v713.js'","'/dealer-catalog-v714.js'")
write('dealer-workspace-v714.js',shell)
let service=read('wholesale-ordering-v543.js')
service=replace(service,"require('./dealer-workspace-v713.js').render","require('./dealer-workspace-v714.js').render")
write('wholesale-ordering-v543.js',service)
let erpServer=read('dealer-erp-v678.js')
erpServer=replace(erpServer,"'/dealer-erp-v713-client.js')","'/dealer-erp-v714-client.js')")
write('dealer-erp-v678.js',erpServer)
let team=read('dealer-sales-team-v671.js')
team=replace(team,"'/dealer-sales-team-v694-client.js?v=694-1')","'/dealer-sales-team-v714-client.js')")
team=replace(team,'SELECT c."id",c."organizationId",o."name",c."status"','SELECT c."id",c."organizationId",o."name",o."publicCode",c."customerCode",c."status"')
write('dealer-sales-team-v671.js',team)
// Advance the legacy asset assertion to the versioned replacement; retain all behavior checks.
const legacyTest='/tmp/lien-v694/verify-runtime.mjs'
fs.writeFileSync(legacyTest,replace(fs.readFileSync(legacyTest,'utf8'),'/dealer-sales-team-v694-client.js?v=694-1','/dealer-sales-team-v714-client.js'))
let server=read('server.js')
const ready="      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Dealer-Simple', 'v713')"
server=replace(server,ready,"      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Dealer-Salon-Picker', 'v714')\n"+ready)
write('server.js',server)
console.log('v714 applied: scoped searchable dealer salon pickers, existing values/events preserved')
