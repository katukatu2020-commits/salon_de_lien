(() => {
  'use strict'
  const root=document.querySelector('#dealer-product-master');if(!root)return
  const $=selector=>root.querySelector(selector),form=$('#dpm-search'),dialog=$('dialog'),selected=new Map()
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
  const yen=v=>v==null?'未登録':Number(v).toLocaleString('ja-JP')+'円'
  let data=null,page=1,pageSize=50,sequence=0,controller=null,loading=false,saving=false
  function status(text,error=false){$('[data-status]').textContent=text;$('[data-status]').classList.toggle('is-error',error)}
  function sync(){
    $('[data-selected-count]').textContent=selected.size+'件選択'
    $('[data-clear]').disabled=!selected.size||saving
    $('[data-review]').disabled=!selected.size||saving||loading
    const rows=(data?.products||[]).filter(p=>p.ownActive!==true)
    const chosen=rows.filter(p=>selected.has(p.id)).length
    $('[data-select-page]').disabled=loading||!rows.length
    $('[data-select-page]').checked=rows.length>0&&chosen===rows.length
    $('[data-select-page]').indeterminate=chosen>0&&chosen<rows.length
    $('[data-prev]').disabled=loading||page<=1
    $('[data-next]').disabled=loading||!data||page*pageSize>=data.total
  }
  async function api(url,options={}){
    const r=await fetch(url,{credentials:'same-origin',cache:'no-store',...options})
    const body=await r.json();if(!r.ok||!body.ok)throw Error(body.error||'読み込みに失敗しました。');return body
  }
  function options(select,values,label,value){select.innerHTML=`<option value="">${label}</option>`+values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');select.value=value}
  async function load(){
    const current=++sequence;controller?.abort();controller=new AbortController();loading=true;sync();status('読み込み中');$('[data-results]').setAttribute('aria-busy','true')
    const q=new URLSearchParams(new FormData(form));q.set('unregistered',form.elements.unregistered.checked?'1':'0');q.set('page',page);q.set('pageSize',pageSize)
    try{
      const result=await api('/api/dealer/product-master?'+q,{signal:controller.signal});if(current!==sequence)return
      data=result;page=result.filters.page
      options(form.elements.manufacturer,data.manufacturers,'すべてのメーカー',data.filters.manufacturer)
      options(form.elements.category,data.categories,'すべてのカテゴリ',data.filters.category)
      for(const p of data.products)if(p.ownActive===true)selected.delete(p.id)
      $('[data-master-total]').textContent=data.masterTotal.toLocaleString('ja-JP')
      $('[data-result-count]').textContent=data.total.toLocaleString('ja-JP')+'件'
      $('[data-page-label]').textContent=page+' / '+Math.max(1,Math.ceil(data.total/pageSize))
      $('[data-results]').innerHTML=data.products.length?`<div class="dpm-table-scroll"><table class="dpm-table"><thead><tr><th scope="col">選択</th><th scope="col">商品</th><th scope="col">定価（税抜）</th><th scope="col">発注単位</th><th scope="col">登録状況</th></tr></thead><tbody>${data.products.map(p=>`<tr><td><input type="checkbox" data-product="${esc(p.id)}" aria-label="${esc(p.name)}を選択" ${p.ownActive===true?'disabled':selected.has(p.id)?'checked':''}></td><td><small>${esc(p.manufacturerName)} / ${esc(p.category||'カテゴリ未設定')}</small><strong>${esc(p.name)}</strong><small>${esc(p.productCode)}${p.janCode?' / JAN '+esc(p.janCode):''}</small></td><td>${yen(p.suggestedRetailPrice)}</td><td>${p.orderUnit}点</td><td>${p.ownActive===true?'<span class="dpm-registered">登録済み</span>':p.ownProductId?'取扱停止中':'未登録'}</td></tr>`).join('')}</tbody></table></div>`:'<p class="dpm-empty">該当する商品がありません。</p>'
      status('')
    }catch(e){if(e.name!=='AbortError'&&current===sequence){data=null;$('[data-results]').innerHTML='<p class="dpm-empty">商品を読み込めませんでした。</p>';status(e.message,true)}}
    finally{if(current===sequence){loading=false;$('[data-results]').setAttribute('aria-busy','false');sync()}}
  }
  function select(p,on){
    if(p.ownActive===true)return
    if(on){if(selected.size>=500&&!selected.has(p.id)){status('1回に選択できるのは500商品までです。',true);return}selected.set(p.id,selected.get(p.id)||{...p,price:p.ownProductId?p.ownPrice:p.suggestedRetailPrice})}
    else selected.delete(p.id)
  }
  form.addEventListener('submit',e=>{e.preventDefault();page=1;load()})
  form.addEventListener('change',e=>{if(['manufacturer','category','unregistered'].includes(e.target.name)){if(e.target.name==='manufacturer')form.elements.category.value='';page=1;load()}})
  $('[data-page-size]').addEventListener('change',e=>{pageSize=Number(e.target.value);page=1;load()})
  $('[data-prev]').addEventListener('click',()=>{page--;load()})
  $('[data-next]').addEventListener('click',()=>{page++;load()})
  $('[data-select-page]').addEventListener('change',e=>{for(const p of data?.products||[])select(p,e.target.checked);for(const c of root.querySelectorAll('[data-product]'))c.checked=selected.has(c.dataset.product);sync()})
  $('[data-results]').addEventListener('change',e=>{const p=data?.products.find(p=>p.id===e.target.dataset.product);if(p){select(p,e.target.checked);e.target.checked=selected.has(p.id);sync()}})
  $('[data-clear]').addEventListener('click',()=>{selected.clear();for(const c of root.querySelectorAll('[data-product]'))c.checked=false;sync()})
  $('[data-review]').addEventListener('click',()=>{
    $('[data-review-error]').textContent=''
    $('[data-review-list]').innerHTML=[...selected.values()].map(p=>`<div class="dpm-review-row"><div><small>${esc(p.manufacturerName)}</small><strong>${esc(p.name)}</strong><small>定価 ${yen(p.suggestedRetailPrice)}${p.ownProductId?' / 再登録':''}</small></div><label>販売価格（税抜・円）<input type="number" min="1" max="10000000" step="1" required data-price="${esc(p.id)}" aria-label="${esc(p.name)}の販売価格" value="${p.price==null?'':p.price}"></label><button type="button" class="wo-button" data-remove="${esc(p.id)}" aria-label="${esc(p.name)}を選択から外す">除外</button></div>`).join('')
    dialog.showModal()
  })
  dialog.addEventListener('cancel',e=>{if(saving)e.preventDefault()})
  dialog.addEventListener('click',e=>{
    if(e.target.closest('[data-close]')&&!saving)dialog.close()
    const remove=e.target.closest('[data-remove]');if(remove&&!saving){selected.delete(remove.dataset.remove);remove.closest('.dpm-review-row').remove();const c=[...root.querySelectorAll('[data-product]')].find(c=>c.dataset.product===remove.dataset.remove);if(c)c.checked=false;sync();if(!selected.size)dialog.close()}
  })
  dialog.addEventListener('input',e=>{if(e.target.dataset.price){const p=selected.get(e.target.dataset.price);if(p)p.price=e.target.value===''?null:Number(e.target.value)}})
  $('#dpm-import').addEventListener('submit',async e=>{
    e.preventDefault();if(saving||!selected.size)return
    saving=true;sync();for(const b of dialog.querySelectorAll('button,input'))b.disabled=true
    $('[data-review-error]').textContent=''
    try{
      const result=await api('/api/dealer/product-master',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({products:[...selected.values()].map(p=>({id:p.id,price:p.price}))})})
      selected.clear();dialog.close();await load();status(`${result.registered}商品を登録しました。${result.skipped?' '+result.skipped+'商品は登録済みのため変更していません。':''}`)
    }catch(err){$('[data-review-error]').textContent=err.message}
    finally{saving=false;for(const b of dialog.querySelectorAll('button,input'))b.disabled=false;sync()}
  })
  load()
})()
