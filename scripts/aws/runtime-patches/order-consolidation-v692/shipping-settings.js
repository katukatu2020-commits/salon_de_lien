 async function mountShippingSettingsV692(root){
  const cutoff=root.querySelector('[data-order-cutoff-v687]')
  if(!cutoff||salon||root.querySelector('[data-shipping-v692]'))return
  const el=document.createElement('section');el.className='oa-cutoff';el.dataset.shippingV692='true';cutoff.after(el)
  el.innerHTML='<p role="status">送料設定を読み込み中</p>'
  try{
   const p=await request('shipping-policy');if(!el.isConnected)return
   el.innerHTML=`<form class="oa-settings"><div><strong>送料・送料無料条件</strong><p>割引後の商品合計・税抜で判定</p></div><label>送料無料の基準額（円・税抜）<input type="number" name="freeThresholdYen" min="0" max="100000000" step="1" required value="${p.freeThresholdYen}" ${p.canManage?'':'disabled'}></label><label>基準額未満の送料（円・税抜）<input type="number" name="feeYen" min="0" max="1000000" step="1" required value="${p.feeYen}" ${p.canManage?'':'disabled'}></label>${p.canManage?'<button type="submit" class="oa-primary">送料を保存</button>':''}<p class="oa-settings-note">基準額以上は送料無料。送料0円は常に無料です。合算した注文ごとに一度だけ適用し、変更は次の新規注文から適用します。</p><p role="status" class="oa-settings-status"></p></form>`
   const form=el.querySelector('form');let busy=false,intent='',key=''
   form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy||!p.canManage||!form.reportValidity())return
    const body={feeYen:Number(form.elements.feeYen.value),freeThresholdYen:Number(form.elements.freeThresholdYen.value),expectedUpdatedAt:p.updatedAt}
    const value=JSON.stringify(body);if(value!==intent){intent=value;key=crypto.randomUUID()}
    busy=true;form.querySelector('button').disabled=true;const status=form.querySelector('[role="status"]');status.textContent='保存中'
    try{const saved=await request('shipping-policy',null,{...body,key});p.updatedAt=saved.updatedAt;intent='';status.textContent='保存しました'}
    catch(e){status.textContent=errorText(e)}finally{busy=false;form.querySelector('button').disabled=false}
   })
  }catch(e){el.innerHTML='<p role="alert">'+esc(errorText(e))+'</p><button type="button">再読み込み</button>';el.querySelector('button').onclick=()=>{el.remove();void mountShippingSettingsV692(root)}}
 }
