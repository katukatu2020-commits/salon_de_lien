'use strict'
const fs=require('node:fs'),path=require('node:path'),base='/app'
const read=f=>fs.readFileSync(path.join(base,f),'utf8'),write=(f,s)=>fs.writeFileSync(path.join(base,f),s),local=f=>fs.readFileSync(path.join(__dirname,f),'utf8')
function replace(s,a,b){if(s.split(a).length!==2)throw Error('Patch anchor: '+a.slice(0,120));return s.replace(a,()=>b)}
let service=read('wholesale-ordering-v543.js')
service=replace(service,'  async function dealerBootstrap(session, url) {',local('categories.js')+'\n  async function dealerBootstrap(session, url) {')
for(const prefix of ['product','pricing'])service=replace(service,'    const '+prefix+'Category = dealerFilterValueV659','    let '+prefix+'Category = dealerFilterValueV659')
const from=service.indexOf('    const productFilterRowsPromise ='),to=service.indexOf('    const [orders, productResult, productFilterRows]',from)
if(from<0||to<0)throw Error('Filter query not found')
const query=service.slice(from,to).replace('const productFilterRowsPromise =','const productFilterRows =').replace('? prisma.$queryRawUnsafe(','? await prisma.$queryRawUnsafe(').replace(': Promise.resolve([])',': []')
service=service.slice(0,from)+service.slice(to)
service=replace(service,'    const productResultPromise = productPageMode',query+`    if (productPageMode && !dealerCategoriesV695(productFilterRows, productManufacturer).includes(productCategory)) productCategory = ''
    if (pricingPageMode && !dealerCategoriesV695(productFilterRows, pricingManufacturer).includes(pricingCategory)) pricingCategory = ''

    const productResultPromise = productPageMode`)
service=replace(service,'const [orders, productResult, productFilterRows] = await Promise.all([','const [orders, productResult] = await Promise.all([')
service=replace(service,'      productFilterRowsPromise,\n','')
service=replace(service,"        categories: [...new Set(productFilterRows.map(row => String(row.category || '')).filter(Boolean))].sort((left, right) => left.localeCompare(right, 'ja')),","        categories: dealerCategoriesV695(productFilterRows, productPageMode ? productManufacturer : pricingManufacturer),\n        categoryGroups: productFilterRows,")
write('wholesale-ordering-v543.js',service)
let client=read('public/dealer-catalog-v688.js')
client=replace(client,'  function dealerFilterOptionsV659(values, selected, emptyLabel) {',local('categories.js')+'\n'+local('client-filters.js')+'\n  function dealerFilterOptionsV659(values, selected, emptyLabel) {')
client=replace(client,"    const currentSection = root.querySelector('.wo-product-management')\n    if (!currentSection)","    syncDealerFiltersV695('products')\n    const currentSection = root.querySelector('.wo-product-management')\n    if (!currentSection)")
client=replace(client,"    const currentSection = root.querySelector('.wo-pricing-management')\n    if (!currentSection)","    syncDealerFiltersV695('pricing')\n    const currentSection = root.querySelector('.wo-pricing-management')\n    if (!currentSection)")
const start=client.indexOf('    async function reloadDealerFilterV659(kind) {'),end=client.indexOf("    root.addEventListener('change', async function (event) {",start)
if(start<0||end<0)throw Error('Client filter handler not found')
client=client.slice(0,start)+local('reload-filters.js')+'\n'+client.slice(end)
write('public/dealer-catalog-v695.js',client)
write('dealer-workspace-v688.js',replace(read('dealer-workspace-v688.js'),'/dealer-catalog-v688.js?v=688-1','/dealer-catalog-v695.js?v=695-1'))
write('server.js',replace(read('server.js'),"res.setHeader('X-Lien-Flam-Sales-Export','v694')","res.setHeader('X-Lien-Flam-Sales-Export','v694')\n   if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Dealer-Cascading-Filters','v695')"))
console.log('dealer-cascading-filters-v695 applied')
