(() => {
 'use strict'
 const root=document.getElementById('flow-app');if(!root)return
 const mode=root.dataset.mode,qs=new URLSearchParams(location.search)
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
 const yen=v=>Number(v||0).toLocaleString('ja-JP')+'円'
 const stamp=v=>v?new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',dateStyle:'short',timeStyle:'short'}).format(new Date(v)):'未設定'
 const status=v=>({ORDERED:'注文確定・受注待ち',ACCEPTED:'ディーラー受注',SHIPPED:'出荷済み',DELIVERED:'納品済み',CANCELLED:'キャンセル',NOT_ORDERED:'メーカー未発注',PARTIAL:'一部メーカー発注済み',OPEN:'未入荷',CLOSED:'入荷済み'}[v]||v)
 const table=(heads,rows)=>'<div class="flow-table-wrap"><table class="flow-table"><thead><tr>'+heads.map(x=>'<th>'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+(rows.length?rows.map(row=>'<tr>'+row.map((x,i)=>'<td data-label="'+esc(heads[i])+'">'+x+'</td>').join('')+'</tr>').join(''):'<tr><td colspan="'+heads.length+'">該当するデータはありません。</td></tr>')+'</tbody></table></div>'
 const button=(label,action,id='',primary=false)=>'<button type="button" data-action="'+action+'" data-id="'+esc(id)+'" class="'+(primary?'primary':'')+'">'+label+'</button>'
 const input=(name,label,type='text',value='',required=true)=>'<label>'+label+'<input name="'+name+'" type="'+type+'" value="'+esc(value)+'" '+(required?'required':'')+'></label>'
 const select=(name,label,rows,value='',blank='選択してください')=>'<label>'+label+'<select name="'+name+'">'+(blank?'<option value="">'+blank+'</option>':'')+rows.map(r=>'<option value="'+esc(r.id)+'" '+(r.id===value?'selected':'')+'>'+esc(r.name)+'</option>').join('')+'</select></label>'
 const normalize=v=>String(v||'').normalize('NFKC').toLowerCase()
 const api=async(url,body)=>{
  const res=await fetch(url,{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(25000),...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})})
  let data;try{data=await res.json()}catch{throw Error('通信を確認して再試行してください。')}
  if(!res.ok||!data.ok)throw Error(data.error||'処理できませんでした。')
  return data
 }
 const get=(name,params={})=>api('/api/dealer/erp/'+name+'?'+new URLSearchParams(params))
 const command=(name,p,key=crypto.randomUUID())=>api('/api/dealer/erp/'+name,{...p,key})
 let options,suppliers,data,preview,cutoff,tab=qs.get('tab')||'pending',pageNo=1,query='',filterManufacturer='',catalog,cart=new Map(),busy=false
 function notify(message){const el=document.getElementById('flow-status');if(el)el.textContent=message}
 function heading(content){root.innerHTML='<p id="flow-status" class="flow-status" role="status"></p>'+content}
 function pages(total,pagesCount){return '<div class="flow-toolbar"><button data-action="prev" '+(pageNo<=1?'disabled':'')+'>前へ</button><span>'+pageNo+' / '+pagesCount+'（'+total+'件）</span><button data-action="next" '+(pageNo>=pagesCount?'disabled':'')+'>次へ</button></div>'}
 async function dialog(title,fields,save,after){
  const el=document.createElement('dialog');el.className='flow-dialog';el.setAttribute('aria-label',title)
  el.innerHTML='<header><h2>'+esc(title)+'</h2><button type="button" data-close aria-label="閉じる">閉じる</button></header><form><div class="flow-form-grid">'+fields+'</div><p role="status" class="flow-status"></p><footer><button type="submit" class="primary">保存</button></footer></form>'
  document.body.append(el);el.showModal();el.querySelector('[data-close]').onclick=()=>el.close();el.onclose=()=>el.remove()
  const form=el.querySelector('form');let pending=false,key=crypto.randomUUID(),last=''
  form.onsubmit=async e=>{
   e.preventDefault();if(pending||!form.reportValidity())return
   const p=Object.fromEntries(new FormData(form));for(const c of form.querySelectorAll('[type=checkbox]'))p[c.name]=c.checked
   const fingerprint=JSON.stringify(p);if(last&&last!==fingerprint)key=crypto.randomUUID();last=fingerprint
   pending=true;form.querySelector('button[type=submit]').disabled=true
   try{const result=await save(p,key);el.close();if(after)await after(result);else await load()}
   catch(error){form.querySelector('[role=status]').textContent=error.message}
   finally{pending=false;if(el.isConnected)form.querySelector('button[type=submit]').disabled=false}
  }
  return el
 }
 async function procurement(){
  if(!options){options=await get('options');suppliers=await get('suppliers');cutoff=await get('order-cutoff')}
  const tabs=[['pending','受注待ち'],['demand','未発注の集約'],['purchases','メーカー発注・入荷']]
  if(options.viewer.role==='ADMIN')tabs.push(['suppliers','仕入先・商品設定'],['accounts','発注専用サロン・権限'])
  if(!tabs.some(([key])=>key===tab))tab='pending'
  let content=''
  if(tab==='pending'){
   data=await get('orders',{status:'ORDERED',page:pageNo})
   content=table(['注文番号 / サロン','注文日時','金額（税込）','状態','操作'],data.rows.map(o=>[esc(o.orderNo)+'<small>'+esc(o.salon)+'</small>',stamp(o.orderedAt),yen(o.totalYen),status(o.status),button('受注する','accept',o.id,true)]))+pages(data.total,data.pages)
  }else if(tab==='demand'){
   preview=await get('procurement-preview')
   content='<div class="flow-toolbar">'+button('再集計','reload')+button('発注データを作成','generate','',true)+'</div>'
   if(preview.missing)content+='<p class="flow-status">仕入先未設定の商品が'+preview.missing+'件あります。</p>'
   content+=table(['仕入先 / メーカー','サロン / 注文','商品 / コード','数量','締切'],preview.rows.map(r=>[esc(r.supplier||'未設定')+'<small>'+esc(r.manufacturerName)+'</small>',esc(r.salon)+'<small>'+esc(r.orderNo)+'</small>',esc(r.productName)+'<small>'+esc(r.productCode)+'</small>',r.quantity,stamp(r.cutoffAt)]))
  }else if(tab==='purchases'){
   data=await get('purchases',{page:pageNo})
   content=table(['発注番号','仕入先 / メーカー','状態','数量 / 入荷','操作'],data.rows.map(p=>[esc(p.documentNo),esc(p.supplier)+'<small>'+esc(p.manufacturerName)+'</small>',p.status==='CANCELLED'?status(p.status):p.submittedAt?'メーカー発注済み / '+status(p.status):p.fromOrders?'メーカー未発注':status(p.status),p.lines.map(l=>esc(l.name)+' '+l.received+' / '+l.quantity+'点').join('<br>'),p.status==='CANCELLED'?'':(p.fromOrders?'<a class="wo-button" href="/api/dealer/flow/purchase.csv?id='+encodeURIComponent(p.id)+'">発注CSV</a>':'')+(!p.submittedAt&&p.fromOrders?button('送信済みにする','submit',p.id):'')+(p.status==='OPEN'&&(!p.fromOrders||p.submittedAt)?button('入荷を記録','receive',p.id):'')+(p.status==='OPEN'&&!p.submittedAt&&!p.lines.some(l=>l.received)?button('取消','cancel-purchase',p.id):'')]))+pages(data.total,data.pages)
  }else if(tab==='suppliers'){
   data=await get('product-suppliers',{page:pageNo,q:query})
   content='<div class="flow-toolbar">'+button('仕入先を追加','supplier-new')+'<form data-search><input name="q" type="search" aria-label="商品検索" value="'+esc(query)+'" placeholder="商品・メーカー・コード"><button>検索</button></form></div>'
   content+=table(['仕入先名','管理コード','備考','操作'],suppliers.rows.map(s=>[esc(s.name)+(s.active?'':'（無効）'),esc(s.code),esc(s.note),button('編集','supplier-edit',s.id)]))
   content+=table(['メーカー / 商品','商品コード','仕入先','仕入先商品コード','操作'],data.rows.map(p=>[esc(p.manufacturerName)+'<small>'+esc(p.name)+'</small>',esc(p.productCode),esc(p.supplier||'未設定'),esc(p.supplierProductCode),button('仕入先を設定','assign',p.id)]))+pages(data.total,data.pages)
  }else{
   content='<div class="flow-toolbar">'+button('発注専用サロンIDを発行','issue','',true)+'</div>'+table(['担当者','仕入発注権限'],options.members.map(m=>[esc(m.name),m.role==='ADMIN'?'管理者':(m.canProcure?'許可':'未許可')+' '+button('権限を設定','permission',m.id)]))
  }
  heading('<div class="flow-toolbar"><strong>発注締切 '+esc(cutoff.cutoffTime||'未設定')+'（日本時間）</strong>'+(cutoff.canManage?button('締切時刻を設定','cutoff'):'')+'</div><div class="flow-tabs" role="tablist">'+tabs.map(([id,label])=>'<button role="tab" aria-selected="'+(id===tab)+'" data-tab="'+id+'">'+label+'</button>').join('')+'</div>'+content)
  if(tab==='demand')root.querySelector('[data-action=generate]').disabled=!preview.rows.length||Boolean(preview.missing)
  root.querySelector('[data-search]')?.addEventListener('submit',e=>{e.preventDefault();query=e.target.elements.q.value;pageNo=1;void load()})
 }
 async function salon(){
  const id=decodeURIComponent(location.pathname.split('/').pop())
  data=await api('/api/dealer/flow/salon?id='+encodeURIComponent(id))
  if(!options)options=await get('options')
  const c=data.contract
  heading('<h2>'+esc(c.name)+'</h2><div class="flow-toolbar"><span class="flow-badge">'+(c.serviceMode==='ORDER_ONLY'?'発注専用サロン':'ORIMIA契約サロン')+'</span>'+(options.viewer.role==='ADMIN'?button(c.showDiscountRate?'割引率：公開中':'割引率：非公開','visibility',id):'')+'<a href="/dealer/pricing?contractId='+encodeURIComponent(c.id)+'">契約商品・価格</a></div><h2>注文</h2>'+table(['注文番号','注文日時','状態','メーカー発注','金額（税込）','操作'],data.orders.map(o=>[esc(o.orderNo),stamp(o.orderedAt),status(o.status),o.procurementStatus==='ORDERED'?'メーカー発注済み':status(o.procurementStatus),yen(o.totalYen),'<a href="/dealer/fulfillment?order='+encodeURIComponent(o.id)+'">受注・出荷・納品</a>']))+'<h2>納品</h2>'+table(['納品番号','出荷日時','状態','帳票'],data.shipments.map(sh=>[esc(sh.documentNo),stamp(sh.shippedAt),status(sh.status),'<a href="/dealer/flow/delivery/'+encodeURIComponent(sh.orderId)+'" target="_blank" rel="noopener">納品書</a>']))+'<h2>請求書</h2><div class="flow-toolbar"><a href="/dealer/receivables?salon='+encodeURIComponent(id)+'">請求作成・入金確認</a></div>'+table(['請求番号','支払期日','請求額（税込）','帳票'],data.invoices.map(i=>[esc(i.documentNo)+(i.voided?'（取消）':''),stamp(i.dueDate),yen(i.totalYen),'<a href="/dealer/flow/invoice/'+encodeURIComponent(i.id)+'" target="_blank" rel="noopener">請求書</a>'])))
 }
 async function documents(){
  data=await api('/api/admin/ordering/documents')
  heading('<h2>注文・納品書</h2>'+table(['注文番号 / ディーラー','注文日時','状態','金額（税込）','操作'],data.orders.map(o=>[esc(o.orderNo)+'<small>'+esc(o.dealer)+'</small>',stamp(o.orderedAt),status(o.status),yen(o.totalYen),'<button type="button" data-order-edit-v687="'+esc(o.id)+'" data-dealer="'+esc(o.dealerId)+'">詳細・変更</button> '+(['SHIPPED','DELIVERED'].includes(o.status)?'<a href="/admin/ordering/delivery/'+encodeURIComponent(o.id)+'" target="_blank" rel="noopener">納品書</a>':'')]))+'<h2>請求書</h2>'+table(['請求番号 / ディーラー','支払期日','請求額（税込）','帳票'],data.invoices.map(i=>[esc(i.documentNo)+'<small>'+esc(i.dealer)+'</small>',stamp(i.dueDate),yen(i.totalYen),'<a href="/admin/ordering/invoice/'+encodeURIComponent(i.id)+'" target="_blank" rel="noopener">請求書'+(i.voided?'（取消）':'')+'</a>'])))
 }
 async function loadCatalog(){
  if(!catalog)catalog=await api('/api/admin/wholesale/bootstrap?dealerId=all')
  const manufacturers=[...new Set(catalog.catalogProducts.map(p=>p.manufacturerName))].sort()
  const rows=catalog.catalogProducts.filter(p=>(!filterManufacturer||p.manufacturerName===filterManufacturer)&&normalize(p.name+' '+p.manufacturerName+' '+p.productCode).includes(normalize(query)))
  data={rows:rows.slice((pageNo-1)*20,pageNo*20),total:rows.length,pages:Math.max(1,Math.ceil(rows.length/20))}
  const count=[...cart.values()].reduce((a,b)=>a+b,0)
  heading('<form data-catalog-search class="flow-toolbar"><input name="q" type="search" placeholder="商品・メーカー・コード" aria-label="商品検索" value="'+esc(query)+'">'+select('manufacturer','メーカー',manufacturers.map(name=>({id:name,name})),filterManufacturer,'すべて')+'<button>検索</button></form>'+table(['メーカー / 商品','ディーラー','販売単価（税抜）','発注単位','数量'],data.rows.map(p=>[esc(p.manufacturerName)+'<small>'+esc(p.name)+' / '+esc(p.productCode)+'</small>',esc(p.dealerName),yen(p.unitPrice)+(p.showDiscountRate===false?'':'<small>'+Number(p.discountRate)+'% OFF</small>'),p.orderUnit+'点','<input type="number" min="0" max="999" step="'+p.orderUnit+'" data-cart="'+esc(p.id)+'" aria-label="'+esc(p.name)+'の数量" value="'+(cart.get(p.id)||0)+'">']))+pages(data.total,data.pages)+'<div class="flow-toolbar"><strong>カート '+count+'点</strong>'+button('発注内容を確認','checkout','',true)+'</div>')
  root.querySelector('[data-catalog-search]').onsubmit=e=>{e.preventDefault();query=e.target.elements.q.value;filterManufacturer=e.target.elements.manufacturer.value;pageNo=1;void load()}
  root.querySelectorAll('[data-cart]').forEach(el=>el.onchange=()=>{if(!el.reportValidity())return;const n=Number(el.value);if(n)cart.set(el.dataset.cart,n);else cart.delete(el.dataset.cart);void load()})
 }
 async function checkout(){
  const groups=new Map()
  for(const [id,quantity] of cart){const p=catalog.catalogProducts.find(p=>p.id===id);if(!p)continue;if(!groups.has(p.dealerId))groups.set(p.dealerId,[]);groups.get(p.dealerId).push({dealerProductId:p.dealerProductId,quantity})}
  if(!groups.size)throw Error('商品と数量を選択してください。')
  const payload={orders:[...groups].map(([dealerId,lines])=>({dealerId,lines}))}
  const quote=await api('/api/admin/wholesale/order-quote',payload)
  const fields='<div class="wide">'+table(['ディーラー','商品計（税抜）','送料（税抜）','税込合計'],quote.orders.map(o=>[esc(o.dealerName),yen(o.subtotalYen),yen(o.shippingFeeYen),yen(o.totalYen)]))+quote.orders.map(o=>'<p>'+esc(o.dealerName)+' 締切 '+stamp(o.closesAt)+' / 送料無料まで '+yen(o.remainingForFreeYen)+'</p>').join('')+'</div>'
  const el=await dialog('発注内容の確認',fields,(p,key)=>api('/api/admin/wholesale/orders',{...payload,quoteToken:quote.quoteToken,key}),async()=>{cart.clear();catalog=null;await load();notify('注文を確定しました。')})
  el.querySelector('[type=submit]').textContent='注文を確定'
 }
 async function password(){
  heading('<form id="flow-password"><div class="flow-form-grid">'+input('currentPassword','現在のパスワード','password')+input('password','新しいパスワード（12文字以上）','password')+'</div><div class="flow-toolbar"><button class="primary">パスワードを変更</button></div></form>')
  root.querySelector('form').onsubmit=async e=>{e.preventDefault();if(busy)return;busy=true;const b=e.target.querySelector('button');b.disabled=true;try{await api('/api/admin/ordering/password',Object.fromEntries(new FormData(e.target)));location.href='/admin/ordering'}catch(err){notify(err.message)}finally{busy=false;b.disabled=false}}
 }
 let reportMonth=qs.get('month')||new Date(Date.now()+9*3600000).toISOString().slice(0,7),reportPeriod='month',reportBranch='',reportMember=''
 const salesRows=rows=>table(['メーカー / 商品','サロン','販売数量','売上（税抜）'],rows.map(r=>[esc(r.manufacturer)+'<small>'+esc(r.productName)+' / '+esc(r.productCode)+'</small>',esc(r.salon),r.quantity,yen(r.amount)]))
 async function reports(){
  if(!options)options=await get('options')
  const params={month:reportMonth,period:reportPeriod,branch:reportBranch,member:reportMember,manufacturer:filterManufacturer,page:pageNo,q:query}
  let fields=input('month','対象月','month',reportMonth),content=''
  if(mode==='stock-report'){
   data=await get('manufacturer-stock',params)
   const report=await get('manufacturer-sales',params)
   fields+=select('manufacturer','メーカー',data.manufacturers.map(r=>({id:r.name,name:r.name})),filterManufacturer,'すべて')+input('q','商品検索','search',query,false)
   content='<h2>在庫</h2>'+table(['メーカー / 商品','倉庫 / 保管場所','現在庫','引当済','適正在庫','操作'],data.rows.map(r=>[esc(r.manufacturerName)+'<small>'+esc(r.name)+'</small>',esc(r.warehouse)+'<small>'+esc(r.location)+'</small>',r.onHand,r.reserved,r.minimum,button('サロン別販売','product-sales',r.productId)+(options.viewer.role==='ADMIN'?button('適正在庫を変更','minimum',r.id):'')]))+pages(data.total,data.pages)+'<h2>メーカー月次販売</h2><div class="flow-toolbar"><strong>'+report.totalQuantity+'点 / '+yen(report.totalYen)+'</strong><a href="/api/dealer/flow/manufacturer.csv?'+new URLSearchParams(params)+'">月次CSVを出力</a></div>'+salesRows(report.rows)
  }else{
   data=await get('period-sales',params)
   fields+=select('period','集計単位',[{id:'month',name:'月'},{id:'quarter',name:'四半期'},{id:'year',name:'年間'}],reportPeriod,'')+select('branch','営業所',options.branches,reportBranch,'全営業所')+select('member','担当者',options.members,reportMember,'すべて')
   const s=data.summary
   content='<h2>'+esc(data.period.label)+'</h2><div class="flow-totals"><div>売上（税抜）<strong>'+yen(s.actualYen)+'</strong></div><div>前期間の売上<strong>'+yen(s.previousYen)+'</strong></div><div>前期間比<strong>'+(s.changePercent===null?'比較対象なし':s.changePercent.toFixed(1)+'%')+'</strong></div></div><h2>月別</h2>'+table(['月','売上（税抜）'],data.months.map(r=>[esc(r.month),yen(r.amount)]))+'<h2>営業所別</h2>'+table(['営業所','売上（税抜）'],data.branches.map(r=>[esc(r.name),yen(r.amount)]))+'<h2>担当者別</h2>'+table(['担当者','売上（税抜）'],data.members.map(r=>[esc(r.name),yen(r.amount)]))
  }
  heading('<form data-report-filter class="flow-toolbar">'+fields+'<button>絞り込む</button></form>'+content)
  root.querySelector('[data-report-filter]').onsubmit=e=>{e.preventDefault();const p=Object.fromEntries(new FormData(e.target));reportMonth=p.month;reportPeriod=p.period||'month';reportBranch=p.branch||'';reportMember=p.member||'';filterManufacturer=p.manufacturer||'';query=p.q||'';pageNo=1;void load()}
 }
 async function load(){try{if(mode.endsWith('-report'))await reports();else if(mode==='procurement')await procurement();else if(mode==='salon')await salon();else if(mode==='documents')await documents();else if(mode==='catalog')await loadCatalog();else await password()}catch(e){if(!root.querySelector('#flow-status'))heading(button('再読み込み','reload'));notify(e.message)}}
 root.addEventListener('click',async e=>{
  const b=e.target.closest('button');if(!b||b.disabled||busy)return
  if(b.dataset.tab){tab=b.dataset.tab;pageNo=1;await load();return}
  const a=b.dataset.action,id=b.dataset.id;if(!a)return
  busy=true;b.disabled=true
  try{
   if(a==='reload'){options=null;await load()}
   if(a==='prev'||a==='next'){pageNo=Math.min(data.pages,Math.max(1,pageNo+(a==='next'?1:-1)));await load()}
   if(a==='accept'){await command('order-accept',{orderId:id});await load()}
   if(a==='generate'){await command('procurement-generate',{version:preview.version});tab='purchases';pageNo=1;await load()}
   if(a==='submit')await dialog('仕入先への送信確認','<label class="wide"><span><input name="confirmed" type="checkbox" required> CSVを仕入先へ送信しました</span></label>',(p,key)=>command('procurement-submit',{purchaseId:id,...p},key))
   if(a==='cancel-purchase')await dialog('未発注データの取消','<p class="wide">この発注データを取り消します。</p>',(p,key)=>command('receive',{purchaseId:id,cancel:true},key))
   if(a==='receive'){const po=data.rows.find(p=>p.id===id);await dialog('仕入商品の入荷',select('lineId','商品',po.lines.filter(l=>l.received<l.quantity).map(l=>({id:l.id,name:l.name+'（未入荷 '+(l.quantity-l.received)+'点）'})))+select('locationId','入庫先',options.locations.map(l=>({id:l.id,name:l.warehouse+' / '+l.name})))+input('quantity','入荷数','number',1),(p,key)=>command('receive',{purchaseId:id,...p},key))}
   if(a==='supplier-new'||a==='supplier-edit'){const s=suppliers.rows.find(s=>s.id===id)||{};await dialog('仕入先',input('name','仕入先名','text',s.name)+input('code','管理コード','text',s.code)+input('note','備考（任意）','text',s.note,false)+'<label><span><input name="active" type="checkbox" '+(s.active===false?'':'checked')+'> 有効</span></label>',async(p,key)=>{const r=await command('supplier-save',{...p,...(id?{id}: {})},key);suppliers=await get('suppliers');return r})}
   if(a==='assign'){const p=data.rows.find(p=>p.id===id);await dialog(p.name,select('supplierId','仕入先',suppliers.rows.filter(s=>s.active),p.supplierId)+input('manufacturerProductCode','メーカー商品コード（任意）','text',p.manufacturerProductCode,false)+input('supplierProductCode','仕入先商品コード（任意）','text',p.supplierProductCode,false)+input('unitCost','仕入単価（税抜）','number',p.unitCost||0),(v,key)=>command('supplier-assign',{...v,productId:id},key))}
   if(a==='issue')await dialog('発注専用サロンIDの発行',input('name','サロン名')+input('contact','担当者名')+input('email','連絡先メール','email')+input('phone','電話番号','tel')+input('loginId','ログインID')+input('password','初期パスワード（12文字以上）','password')+select('memberId','担当営業',options.members,options.viewer.memberId),(p,key)=>command('salon-issue',p,key),async r=>{await load();notify('ID '+r.loginId+' を発行しました。ログイン先 /admin/login。初回ログイン時にパスワード変更が必要です。')})
   if(a==='permission')await dialog('仕入発注権限','<label class="wide"><span><input type="checkbox" name="canProcure" '+(options.members.find(m=>m.id===id)?.canProcure?'checked':'')+'> 全サロンのメーカー発注・入荷処理を許可</span></label>',async(p,key)=>{const result=await command('procurement-permission',{memberId:id,...p},key);options=null;return result})
   if(a==='visibility')await dialog('割引率の公開設定','<label class="wide"><span><input name="showDiscountRate" type="checkbox" '+(data.contract.showDiscountRate?'checked':'')+'> サロンへ割引率を公開する</span></label>',(p,key)=>command('discount-visibility',{organizationId:id,...p},key))
   if(a==='checkout')await checkout()
   if(a==='cutoff')await dialog('発注締切時刻',input('cutoffTime','日本時間','time',cutoff.cutoffTime||'11:00'),async(p,key)=>{const r=await command('order-cutoff',{...p,expectedUpdatedAt:cutoff.updatedAt},key);options=null;return r})
   if(a==='minimum'){const row=data.rows.find(r=>r.id===id);await dialog('適正在庫を変更',input('minimum',row.name,'number',row.minimum),(p,key)=>command('stock-minimum',{...p,stockId:id,version:row.version},key))}
   if(a==='product-sales'){const report=await get('manufacturer-sales',{month:reportMonth,product:id});const el=await dialog('サロン別販売 / '+reportMonth,'<div class="wide"><strong>'+report.totalQuantity+'点 / '+yen(report.totalYen)+'</strong>'+salesRows(report.rows)+'</div>',async()=>{});el.querySelector('footer').remove()}
  }catch(error){notify(error.message)}finally{busy=false;if(b.isConnected)b.disabled=false}
 })
 window.addEventListener('orimia:order-amended-v687',()=>void load())
 void load()
})()
