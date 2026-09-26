(() => {
 'use strict'
 if(window.OrimiaOrderAmendmentsV687)return
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
 const yen=v=>Number(v).toLocaleString('ja-JP')+'円'
 const stamp=v=>new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(v))
 const normalize=v=>String(v||'').normalize('NFKC').toLowerCase().replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60))
 const salon=location.pathname.startsWith('/admin/')
 const endpoint=(name,dealer,query={})=>{
  const q=new URLSearchParams(query);if(salon)q.set('dealer',dealer)
  return (salon?'/api/admin/wholesale/erp/':'/api/dealer/erp/')+name+'?'+q
 }
 async function request(name,dealer,body,query){
  const response=await fetch(endpoint(name,dealer,query),{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(20000),...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})})
  let result;try{result=await response.json()}catch{throw Error('通信を確認し、もう一度お試しください。')}
  if(!response.ok||!result.ok)throw Error(result.error||'処理できませんでした。再度お試しください。')
  return result
 }
 const errorText=e=>e.name==='TimeoutError'?'通信がタイムアウトしました。入力内容を保持しています。再度保存してください。':e.message
 let currentDialog,policyCache
 function newDialog(){
  if(currentDialog?.open){currentDialog.focus();return null}
  const el=document.createElement('dialog');el.className='oa-dialog';el.setAttribute('aria-labelledby','oa-title-v687')
  el.innerHTML='<header><h2 id="oa-title-v687">発注の編集・詳細</h2><button type="button" class="oa-close" aria-label="閉じる" title="閉じる">×</button></header><div class="oa-content" role="status">読み込み中</div>'
  document.body.append(el);el.showModal();currentDialog=el
  el.querySelector('.oa-close').onclick=()=>el.close()
  el.addEventListener('close',()=>{el.remove();if(currentDialog===el)currentDialog=null},{once:true})
  return el
 }
 async function open(orderId,dealerId){
  const el=newDialog();if(!el)return
  const content=el.querySelector('.oa-content')
  let detail
  try{detail=await request('order-amendment',dealerId,null,{id:orderId})}catch(e){if(el.open){content.textContent=errorText(e);content.setAttribute('role','alert')}return}
  if(!el.open)return
  content.removeAttribute('role')
  const o=detail.order,rows=detail.lines.filter(l=>l.editableQuantity>0).map(l=>({lineId:l.id,dealerProductId:l.dealerProductId,name:l.productName,code:l.productCode,quantity:l.editableQuantity,unitPrice:l.unitPrice,orderUnit:detail.products.find(p=>p.id===l.dealerProductId)?.orderUnit||1}))
  let busy=false,expired=false,search='',productPage=1,retryPayload='',retryKey='',deadlineOffset=new Date(detail.serverNow).getTime()-Date.now()
  content.innerHTML=`<div class="oa-summary"><strong>${esc(o.orderNo)}</strong><span>${detail.cutoffAt?'変更締切 '+stamp(detail.cutoffAt)+'（日本時間）':'締切時刻：未設定'}</span><span class="oa-lock" role="status">${esc(detail.reason)}</span></div><form class="oa-form"><div class="oa-lines"></div>${detail.canEdit?'<details class="oa-catalog"><summary>商品を追加</summary><label>商品検索<input type="search" class="oa-search" placeholder="商品名・メーカー・商品コード" autocomplete="off"></label><div class="oa-products"></div></details>':''}<div class="oa-fields"><label>希望納品日<input name="requestedDeliveryDate" type="date" value="${esc(o.requestedDeliveryDate?.slice(0,10)||'')}" ${detail.canEdit?'':'disabled'}></label><label>発注メモ（任意）<textarea name="salonNote" maxlength="1200" rows="3" ${detail.canEdit?'':'disabled'}>${esc(o.salonNote)}</textarea></label></div><div class="oa-totals"></div><p class="oa-error" role="alert"></p><footer>${detail.canCancel?'<button type="button" class="oa-danger" data-cancel>発注をキャンセル</button>':''}${detail.canEdit?'<button type="submit" class="oa-primary">変更を保存</button>':''}</footer></form>`
  const form=content.querySelector('form'),list=content.querySelector('.oa-lines'),products=content.querySelector('.oa-products'),error=content.querySelector('.oa-error')
  function total(){const subtotal=rows.reduce((sum,r)=>sum+Number(r.quantity||0)*r.unitPrice,0),tax=Math.round(subtotal*Number(o.taxRate)/100);content.querySelector('.oa-totals').innerHTML=`<span>商品合計（税抜） <strong>${yen(subtotal)}</strong></span><span>消費税 <strong>${yen(tax)}</strong></span><span>合計（税込） <strong>${yen(subtotal+tax)}</strong></span>`}
  function renderLines(){
   list.innerHTML=rows.map((r,i)=>`<div class="oa-line"><div><strong>${esc(r.name)}</strong><small>${esc(r.code)} / 単価（税抜） ${yen(r.unitPrice)}</small></div><label>数量<input aria-label="${esc(r.name)}の数量" data-row="${i}" type="number" min="0" max="999" step="${r.orderUnit}" value="${esc(r.quantity)}" ${detail.canEdit?'':'disabled'}></label>${detail.canEdit?`<button type="button" data-remove="${i}" title="この商品を削除" aria-label="${esc(r.name)}を削除">削除</button>`:''}</div>`).join('')||'<p>明細はありません。</p>'
   total();lock()
  }
  function renderProducts(){
   if(!products)return
   const matches=detail.products.filter(p=>!rows.some(r=>r.dealerProductId===p.id)&&normalize([p.name,p.manufacturerName,p.productCode,p.janCode].join(' ')).includes(normalize(search)))
   const pages=Math.max(1,Math.ceil(matches.length/10));productPage=Math.min(productPage,pages)
   products.innerHTML=matches.slice((productPage-1)*10,productPage*10).map(p=>`<div class="oa-product"><span><strong>${esc(p.name)}</strong><small>${esc(p.manufacturerName)} / ${esc(p.productCode)} / ${yen(p.unitPrice)}</small></span><button type="button" data-add="${esc(p.id)}">追加</button></div>`).join('')||'<p>該当する商品はありません。</p>'
   products.insertAdjacentHTML('beforeend',`<nav aria-label="追加商品のページ"><button type="button" data-page="-1" ${productPage===1?'disabled':''} aria-label="前の商品ページ">前へ</button><span>${productPage} / ${pages}（${matches.length}件）</span><button type="button" data-page="1" ${productPage===pages?'disabled':''} aria-label="次の商品ページ">次へ</button></nav>`);lock()
  }
  function lock(){
   if(!expired&&detail.cutoffAt&&Date.now()+deadlineOffset>=new Date(detail.cutoffAt).getTime())expired=true
   if(expired)content.querySelector('.oa-lock').textContent='締切済み：編集・キャンセルはできません。'
   for(const control of form.querySelectorAll('input,textarea,button')){
    if(control.matches('[data-page]'))continue
    control.disabled=busy||expired||!detail.canEdit
   }
   el.querySelector('.oa-close').disabled=busy
  }
  const timer=setInterval(lock,1000);el.addEventListener('close',()=>clearInterval(timer),{once:true})
  el.addEventListener('cancel',event=>{if(busy)event.preventDefault()})
  form.addEventListener('input',event=>{
   if(event.target.matches('[data-row]')){rows[Number(event.target.dataset.row)].quantity=event.target.value;total()}
   else if(event.target.matches('.oa-search')){search=event.target.value;productPage=1;if(!event.isComposing)renderProducts()}
  })
  form.addEventListener('compositionend',event=>{if(event.target.matches('.oa-search')){search=event.target.value;productPage=1;renderProducts()}})
  form.addEventListener('click',event=>{
   const button=event.target.closest('button');if(!button||busy||expired)return
   if(button.hasAttribute('data-remove')){rows.splice(Number(button.dataset.remove),1);renderLines();renderProducts()}
   if(button.hasAttribute('data-add')){const p=detail.products.find(p=>p.id===button.dataset.add);if(!p||rows.some(r=>r.dealerProductId===p.id))return;rows.push({dealerProductId:p.id,name:p.name,code:p.productCode,quantity:p.orderUnit||1,orderUnit:p.orderUnit||1,unitPrice:p.unitPrice});renderLines();renderProducts()}
   if(button.hasAttribute('data-page')){productPage+=Number(button.dataset.page);renderProducts()}
   if(button.hasAttribute('data-cancel')&&confirm('この発注をすべてキャンセルしますか？'))void save(true)
  })
  async function save(cancel){
   lock();if(busy||expired)return
   if(!cancel&&!form.reportValidity())return
   const payload={orderId,version:detail.version,...(!cancel?{lines:rows.map(r=>({...(r.lineId?{lineId:r.lineId}:{dealerProductId:r.dealerProductId}),quantity:Number(r.quantity)})),requestedDeliveryDate:form.elements.requestedDeliveryDate.value,salonNote:form.elements.salonNote.value}:{})}
   const action=cancel?'order-cancel':'order-amend',serialized=JSON.stringify({action,payload})
   if(serialized!==retryPayload){retryPayload=serialized;retryKey=crypto.randomUUID()}
   busy=true;lock();error.textContent=''
   try{await request(action,dealerId,{...payload,key:retryKey});el.close();window.dispatchEvent(new CustomEvent('orimia:order-amended-v687',{detail:{orderId,cancelled:cancel}}))}
   catch(e){error.textContent=errorText(e)}finally{busy=false;lock()}
  }
  form.addEventListener('submit',event=>{event.preventDefault();void save(false)})
  renderLines();renderProducts();lock()
 }
 async function mountSettings(root){
  const el=root.querySelector('[data-order-cutoff-v687]');if(!el||salon||el.dataset.mounted)return
  el.dataset.mounted='true';el.innerHTML='<p role="status">発注の締切設定を読み込み中</p>'
  try{
   const p=policyCache||await request('order-cutoff');policyCache=p;if(!el.isConnected)return
   el.innerHTML=`<form class="oa-settings"><div><strong>発注の変更・キャンセル締切</strong><p>毎日・日本時間${p.configured?'':' / 未設定'}</p></div><label>締切時刻<input type="time" name="cutoffTime" value="${esc(p.cutoffTime||'11:00')}" required ${p.canManage?'':'disabled'}></label>${p.canManage?'<button type="submit" class="oa-primary">締切を保存</button>':''}<p class="oa-settings-note">初回設定は既存の発注にも適用されます。時刻変更後は新規発注に適用されます。</p><p role="status" class="oa-settings-status"></p></form>`
   const form=el.querySelector('form');let busy=false,retryValue='',key=''
   form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy||!p.canManage||!form.reportValidity())return
    const value=form.elements.cutoffTime.value;if(value!==retryValue){retryValue=value;key=crypto.randomUUID()}
    busy=true;form.querySelector('button').disabled=true;const status=form.querySelector('[role="status"]');status.textContent='保存中'
    try{policyCache=await request('order-cutoff',null,{key,cutoffTime:value,expectedUpdatedAt:p.updatedAt});p.updatedAt=policyCache.updatedAt;retryValue='';status.textContent='保存しました';window.dispatchEvent(new CustomEvent('orimia:order-amended-v687'))}
    catch(e){status.textContent=errorText(e);policyCache=null}finally{busy=false;form.querySelector('button').disabled=false}
   })
  }catch(e){el.innerHTML='<p role="alert">'+esc(errorText(e))+'</p><button type="button">再読み込み</button>';el.querySelector('button').onclick=()=>{delete el.dataset.mounted;void mountSettings(root)}}
 }
 document.addEventListener('click',event=>{const button=event.target.closest('[data-order-edit-v687]');if(button){event.preventDefault();void open(button.dataset.orderEditV687,button.dataset.dealer)}})
 window.OrimiaOrderAmendmentsV687={open,mountSettings}
})()
