(() => {
 'use strict'
 if(document.getElementById('flow-app'))return
 const root=document.querySelector('#dw-main'),view=document.body.dataset.dealerView
 if(root&&['orders','fulfillment','inventory','products','pricing','salons','team','operations','sales'].includes(view)){
  const bar=document.createElement('nav');bar.className='flow-addon';bar.setAttribute('aria-label','受発注業務')
  bar.innerHTML='<a href="/dealer/fulfillment">受注・出荷・納品</a><a href="/dealer/procurement">メーカー・仕入発注</a><a href="/dealer/salons">サロン別取引</a>'
  if(view==='salons')bar.innerHTML+='<a href="/dealer/procurement?tab=accounts">発注専用サロンID発行</a>'
  if(view==='inventory')bar.innerHTML+='<a href="/dealer/manufacturer-report">メーカー別在庫・月次報告</a>'
  if(view==='sales'||view==='operations')bar.innerHTML+='<a href="/dealer/period-sales">月・四半期・年間売上</a>'
  root.querySelector('.dw-page-head')?.after(bar)
 }
 if(view==='salons'){
  fetch('/api/dealer/erp/options',{cache:'no-store'}).then(r=>r.json()).then(data=>{
   if(!data.ok)return
   const bar=document.createElement('section');bar.className='flow-addon'
   const label=document.createElement('label');label.textContent='サロン別の注文・納品・請求 '
   const select=document.createElement('select');select.className='wo-input';select.setAttribute('aria-label','サロン詳細を選択')
   select.add(new Option('選択してください',''))
   for(const s of data.salons)select.add(new Option(s.name,s.organizationId))
   select.onchange=()=>{if(select.value)location.href='/dealer/salons/'+encodeURIComponent(select.value)}
   label.append(select);bar.append(label);root?.querySelector('.dw-page-head')?.after(bar)
  }).catch(()=>{})
 }
 fetch('/api/dealer/erp/options',{cache:'no-store'}).then(r=>r.json()).then(data=>{
  if(!data.ok)return
  if(!data.viewer.canProcure)document.querySelectorAll('.flow-addon a[href="/dealer/procurement"]').forEach(a=>a.remove())
  if(data.viewer.role==='ADMIN')return
  document.querySelectorAll('.flow-addon a[href*="tab=accounts"]').forEach(a=>a.remove())
  if(!['products','pricing'].includes(view))return
  const readOnly=()=>{
   document.querySelectorAll('.dw-product-create,[data-action="edit-product"],[data-action="remove-product"],.wo-pricing-bulk,.wo-pricing-save').forEach(el=>{el.hidden=true})
   document.querySelectorAll('#dealer-pricing-form input').forEach(el=>{el.disabled=true})
  }
  readOnly()
  new MutationObserver(readOnly).observe(document.getElementById('wholesale-app'),{childList:true,subtree:true})
 }).catch(()=>{})
})()
