  let dealerContactDialogV693
  async function showDealerContactV693(dealerId,trigger){
    if(dealerContactDialogV693?.open)dealerContactDialogV693.close()
    const dialog=document.createElement('dialog');dialog.className='dc-dialog-v693';dialog.setAttribute('aria-labelledby','dc-title-v693')
    dialog.innerHTML='<header><h2 id="dc-title-v693">担当者の連絡先</h2><button type="button" class="dc-close" aria-label="閉じる" title="閉じる">'+icon('close')+'</button></header><div class="dc-content" role="status">読み込み中</div>'
    document.body.append(dialog);dealerContactDialogV693=dialog
    let controller
    dialog.querySelector('.dc-close').onclick=()=>dialog.close()
    dialog.addEventListener('keydown',event=>{
      if(event.key!=='Tab')return
      const controls=[...dialog.querySelectorAll('button:not([disabled]),a[href]')].filter(e=>e.getClientRects().length)
      const first=controls[0],last=controls[controls.length-1]
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
    })
    dialog.addEventListener('close',()=>{controller?.abort();dialog.remove();if(dealerContactDialogV693===dialog)dealerContactDialogV693=null;if(trigger?.isConnected)trigger.focus({preventScroll:true})},{once:true})
    dialog.showModal()
    const content=dialog.querySelector('.dc-content')
    const telephone=value=>'<a class="dc-phone" href="tel:'+esc(value.replace(/[^+0-9]/g,''))+'">'+esc(value)+'</a>'
    async function load(){
      controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000)
      content.setAttribute('role','status');content.textContent='読み込み中'
      try{
        const result=await api('/api/admin/wholesale/dealer-contact?dealerId='+encodeURIComponent(dealerId),{cache:'no-store',signal:controller.signal})
        if(!dialog.open)return
        const c=result.contact
        dialog.querySelector('h2').textContent=c.dealerName
        content.removeAttribute('role')
        content.innerHTML='<dl><div><dt>担当者</dt><dd>'+esc(c.staffName||'担当者未設定')+'</dd></div><div><dt>担当者の電話番号</dt><dd>'+(c.staffPhone?telephone(c.staffPhone):'<span class="dc-empty">電話番号未登録</span>')+'</dd></div>'+(c.companyPhone?'<div><dt>会社の代表電話</dt><dd>'+telephone(c.companyPhone)+'</dd></div>':'')+'</dl><a class="dc-chat" href="/admin/dealer-messages?dealer='+encodeURIComponent(c.dealerId)+'">チャットを開く'+icon('chevron')+'</a>'
      }catch(error){
        if(!dialog.open)return
        content.setAttribute('role','alert')
        content.innerHTML='<p>'+esc(error.name==='AbortError'?'読み込みがタイムアウトしました。再度お試しください。':error.message)+'</p><button type="button" class="wo-button wo-button-secondary">再読み込み</button>'
        content.querySelector('button').onclick=load
      }finally{clearTimeout(timer)}
    }
    await load()
  }
