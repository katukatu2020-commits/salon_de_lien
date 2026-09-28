'use strict'
const fs=require('node:fs'),path=require('node:path'),base='/app'
const read=f=>fs.readFileSync(path.join(base,f),'utf8'),write=(f,s)=>fs.writeFileSync(path.join(base,f),s),local=f=>fs.readFileSync(path.join(__dirname,f),'utf8')
function replace(s,a,b){if(s.split(a).length!==2)throw Error('Patch anchor: '+a.slice(0,120));return s.replace(a,()=>b)}
let erp=read('dealer-erp-v678.js')
erp=replace(erp,'  let schemaPromise',"  const flamV694=require('./flam-export-v694/export.cjs').createFlamExport({db,crypto,monthRange,scope,reportSnapshot,fail})\n  let schemaPromise")
erp=replace(erp,"        if (name === 'report.csv') {",`        if(name==='flam-preview'){h.json(res,200,{ok:true,...await flamV694.preview(s,q)});return true}
        if(name==='flam-export.xlsx'){
          const result=await flamV694.download(s,q)
          res.setHeader('Cache-Control','private,no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');res.setHeader('Content-Disposition','attachment; filename="'+result.filename+'"');res.end(result.buffer);return true
        }
        if (name === 'report.csv') {`)
erp=replace(erp,'      const result = await command(s, name, await h.readPayload(req))',`      if(name==='flam-customer-codes'){h.json(res,200,{ok:true,...await flamV694.saveCodes(s,await h.readPayload(req))});return true}
      const result = await command(s, name, await h.readPayload(req))`)
write('dealer-erp-v678.js',erp)
write('dealer-erp-v678.sql',read('dealer-erp-v678.sql')+'\n'+local('schema.sql'))
let team=read('dealer-sales-team-v671.js')
team=replace(team,'/dealer-sales-team-v693-client.js?v=693-1','/dealer-sales-team-v694-client.js?v=694-1')
team=replace(team,"    const asset = { '/dealer-sales-team-v693-client.js':", "    const asset = { '/dealer-sales-team-v694-client.js': ['public/dealer-sales-team-v694-client.js','application/javascript'], '/dealer-sales-team-v693-client.js':")
team=replace(team,'<link rel="stylesheet" href="/password-visibility-v627.css?v=627-release1"></head>','<link rel="stylesheet" href="/password-visibility-v627.css?v=627-release1"><link rel="stylesheet" href="/flam-sales-export-v694.css?v=694-1"></head>')
write('dealer-sales-team-v671.js',team)
const React=require('/app/node_modules/react'),{renderToStaticMarkup}=require('/app/node_modules/react-dom/server'),icons=require('/app/node_modules/lucide-react')
const iconNames={download:'Download',save:'Save',refresh:'RefreshCw',close:'X'},svg={}
for(const [k,name] of Object.entries(iconNames))svg[k]=renderToStaticMarkup(React.createElement(icons[name],{'aria-hidden':'true',width:18,height:18}))
let client=read('public/dealer-sales-team-v693-client.js')
client=replace(client,'  function render() {','  const flamIconsV694='+JSON.stringify(svg)+'\n'+local('client-fragment.js')+'\n  function render() {')
client=replace(client,'filters()+`<div id="dst-report">','filters()+(view===\'sales\'?\'<div class="flam-toolbar-v694"><button type="button" class="wo-button" data-flam-open>\'+flamIconsV694.download+\'<span>flam形式で出力</span></button></div>\':\'\')+`<div id="dst-report">')
client=replace(client,"      if (b.hasAttribute('data-page'))", "      if (b.hasAttribute('data-flam-open')) await openFlamExportV694(b)\n      if (b.hasAttribute('data-page'))")
write('public/dealer-sales-team-v694-client.js',client);write('public/flam-sales-export-v694.css',local('style.css'))
let server=read('server.js')
server=replace(server,"res.setHeader('X-Lien-Dealer-Contact','v693')","res.setHeader('X-Lien-Dealer-Contact','v693')\n   if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Flam-Sales-Export','v694')")
write('server.js',server)
console.log('flam-sales-export-v694 applied')
