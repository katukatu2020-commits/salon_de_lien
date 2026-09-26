import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const root=process.env.LIEN_RUNTIME_ROOT||'/app',source=path.dirname(fileURLToPath(import.meta.url))
const read=file=>fs.readFileSync(path.join(root,file),'utf8'),write=(file,value)=>fs.writeFileSync(path.join(root,file),value),fragment=file=>fs.readFileSync(path.join(source,file),'utf8')
function replace(value,before,after){if(value.split(before).length!==2)throw Error('Unexpected parent anchor: '+before);return value.replace(before,after)}
function block(value,start,end,next){const a=value.indexOf(start),b=value.indexOf(end,a+start.length);if(a<0||b<0||value.indexOf(start,a+1)>=0)throw Error('Unexpected block: '+start);return value.slice(0,a)+next+'\n\n'+value.slice(b)}
let service=read('wholesale-ordering-v543.js')
const denied="    throw new WholesaleError('連携登録はディーラー側の「契約美容室」から行ってください。', 403)\n  }"
service=block(service,'  async function createDealerInvite(req, session, payload) {','  async function requestDealerRegistration(', '  async function createDealerInvite(req, session, payload) {\n'+denied)
service=block(service,'  async function requestDealerConnectionByCode(session, payload) {','  async function registerSalonContract(', '  async function requestDealerConnectionByCode(session, payload) {\n'+denied)
service=replace(service,'SELECT o."id",o."name",o."taxRate",p."phone",p."postalCode",p."prefecture",p."city",p."addressLine1",p."addressLine2"','SELECT o."id",o."name",o."publicCode",o."taxRate",p."phone",p."postalCode",p."prefecture",p."city",p."addressLine1",p."addressLine2"')
write('wholesale-ordering-v543.js',service)
let client=read('dealer-erp-v678-order-entry-v682.js')
client=replace(client,"    lowStock: false,","    lowStock: false,\n    orderPage: 1,\n    orderPageSize: 10,\n    orderDealer: 'all',\n    selectedOnly: false,")
client=block(client,'  function contractPanel() {','  function productFilters(',fragment('contract-panel.fragment.js'))
client=block(client,'  function orderView() {','  function inventoryView() {',fragment('order-view.fragment.js'))
client=replace(client,"    const needle = salon.query.trim().toLocaleLowerCase('ja')","    const normalize = value => String(value || '').normalize('NFKC').toLocaleLowerCase('ja').replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60))\n    const needle = normalize(salon.query.trim())")
client=replace(client,"[product.name, product.manufacturerName, product.category, product.productCode, product.janCode].join(' ').toLocaleLowerCase('ja')","normalize([product.name, product.manufacturerName, product.category, product.productCode, product.janCode].join(' '))")
client=replace(client,'(!salon.lowStock || product.stockQuantity != null','(sourceProducts || !salon.lowStock || product.stockQuantity != null')
client=replace(client,"salon.data = await api('/api/admin/wholesale/bootstrap' + (dealerId ? '?dealerId=' + encodeURIComponent(dealerId) : ''))","salon.data = await api('/api/admin/wholesale/bootstrap?dealerId=all')\n    const currentProducts = new Set(salonOrderProducts().map(product => product.id))\n    for (const id of salon.quantities.keys()) if (!currentProducts.has(id)) salon.quantities.delete(id)")
client=replace(client,"      if (action === 'salon-tab') {",`      if (action === 'copy-salon-code') {
        try { await copyText(salon.data.organization.publicCode); notify('店舗コードをコピーしました。') } catch { notify('コピーできませんでした。', 'error') }
      } else if (action === 'order-page') {
        salon.orderPage = Math.max(1, Number(target.dataset.page) || 1)
        renderSalonSearchResults()
        const pager = root.querySelector('.wo-order-pager-v686')
        if (pager) {
          const previous = pager.querySelector('[aria-label="前のページ"]'), next = pager.querySelector('[aria-label="次のページ"]')
          const focus = target.getAttribute('aria-label') === '次のページ' ? (next.disabled ? previous : next) : (previous.disabled ? next : previous)
          focus.focus({preventScroll:true})
          if (pager.getBoundingClientRect().top < 80) pager.scrollIntoView({block:'start',behavior:'instant'})
        }
      } else if (action === 'salon-tab') {`)
client=replace(client,"        salon.quantities.set(id, next)\n        renderSalon()","        stepper.querySelector('input').value = next\n        updateOrderQuantityV686(stepper, next)\n        if (salon.selectedOnly && next === 0) renderSalonSearchResults()")
client=replace(client,"      salon.quantities.clear()\n      salon.requestedDeliveryDate", "      salon.quantities.clear()\n      salon.selectedOnly = false\n      salon.orderPage = 1\n      salon.requestedDeliveryDate")
client=replace(client,"      salon.query = event.target.value\n      renderSalonSearchResults()","      salon.query = event.target.value\n      salon.orderPage = 1\n      renderSalonSearchResults()")
client=replace(client,"        if (!salon.searchComposing) renderSalonSearchResults()","        if (!salon.searchComposing) { salon.orderPage = 1; renderSalonSearchResults() }")
client=block(client,'        salon.quantities.set(stepper.dataset.productId, value)','      } else if (event.target.dataset.action === \'stock-input\') {','        updateOrderQuantityV686(stepper, value)')
client=replace(client,"      if (event.target.id === 'manufacturer-filter') { salon.manufacturer = event.target.value; renderSalon() }","      if (event.target.id === 'manufacturer-filter') { salon.manufacturer = event.target.value; salon.orderPage = 1; renderSalonSearchResults() }")
client=replace(client,"      else if (event.target.id === 'category-filter') { salon.category = event.target.value; renderSalon() }","      else if (event.target.id === 'category-filter') { salon.category = event.target.value; salon.orderPage = 1; renderSalonSearchResults() }")
client=replace(client,"      else if (event.target.id === 'low-stock-filter') { salon.lowStock = event.target.checked; renderSalon() }","      else if (event.target.id === 'low-stock-filter') { salon.lowStock = event.target.checked; renderSalonSearchResults() }")
client=replace(client,`      else if (event.target.id === 'dealer-select') {
        salon.quantities.clear()
        salon.data.selectedDealerId = event.target.value
        try { await reloadSalon(event.target.value) } catch (error) { notify(error.message, 'error') }
      }`,`      else if (event.target.id === 'dealer-select') { salon.orderDealer = event.target.value; salon.orderPage = 1; renderSalonSearchResults() }
      else if (event.target.id === 'selected-products-filter') { salon.selectedOnly = event.target.checked; salon.orderPage = 1; renderSalonSearchResults() }
      else if (event.target.id === 'order-page-size') { salon.orderPageSize = [10,20,50].includes(Number(event.target.value)) ? Number(event.target.value) : 10; salon.orderPage = 1; renderSalonSearchResults() }
      else if (event.target.dataset.action === 'quantity-input' && salon.selectedOnly) renderSalonSearchResults()`)
client=block(client,"    root.addEventListener('submit', async function (event) {\n      if (event.target.id !== 'dealer-code-form') return",'  const dealerProductLocationV628',"  }\n")
write('public/salon-order-entry-v686.js',client)
write('public/salon-order-entry-v686.css',fragment('order-entry.css'))
write('public/inventory-orders-common-layout-v572.salon-orders-v686.js',replace(read('public/inventory-orders-common-layout-v572.partner-chat-v682.js'),'/dealer-erp-v678-order-entry-v682.js?v=682-1','/salon-order-entry-v686.js?v=686-1'))
let server=read('server.js')
server=replace(server,'/inventory-orders-common-layout-v572.partner-chat-v682.js?v=682-1','/inventory-orders-common-layout-v572.salon-orders-v686.js?v=686-1')
const oldScript='<script id=\\"orimia-inventory-orders-common-script-v572\\"'
server=replace(server,oldScript,'<link rel=\\"stylesheet\\" href=\\"/salon-order-entry-v686.css?v=686-1\\">'+oldScript)
const marker="      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Campaign-Booking-Menu','v685')"
server=replace(server,marker,marker+"\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Salon-Order-Entry','v686')")
write('server.js',server)
console.log('v686 installed: dealer-only linking, bounded salon ordering and stable cart')
