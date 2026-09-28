  async function openFlamExportV694(trigger){
    const dialog=document.createElement('dialog');dialog.className='dst-dialog flam-dialog-v694';dialog.setAttribute('aria-labelledby','flam-title-v694')
    dialog.innerHTML='<header><h2 id="flam-title-v694">flam形式で出力</h2><button type="button" data-flam-close aria-label="閉じる" title="閉じる">'+flamIconsV694.close+'</button></header><div class="flam-body"><div class="flam-result" role="status">読み込み中</div><p class="flam-error" role="alert" hidden></p></div><footer><button type="button" class="wo-button" data-flam-reload title="最新の出力内容を確認">'+flamIconsV694.refresh+'<span>再確認</span></button><button type="button" class="wo-button wo-button-primary" data-flam-download disabled>'+flamIconsV694.download+'<span>Excelを出力</span></button></footer>'
    document.body.append(dialog);dialog.showModal()
    const query=new URLSearchParams(state.filters),result=dialog.querySelector('.flam-result'),error=dialog.querySelector('.flam-error'),download=dialog.querySelector('[data-flam-download]')
    let preview,busy=false,dirty=false,controller,productCodes=false
    const changed=new Map()
    dialog.querySelector('[data-flam-close]').onclick=()=>dialog.close()
    dialog.addEventListener('close',()=>{controller?.abort();dialog.remove();if(trigger.isConnected)trigger.focus({preventScroll:true})},{once:true})
    dialog.addEventListener('keydown',e=>{
      if(e.key!=='Tab')return
      const controls=[...dialog.querySelectorAll('button:not([disabled]),input:not([disabled]),a[href]')].filter(e=>e.getClientRects().length)
      if(e.shiftKey&&document.activeElement===controls[0]){e.preventDefault();controls.at(-1).focus()}
      else if(!e.shiftKey&&document.activeElement===controls.at(-1)){e.preventDefault();controls[0].focus()}
    })
    function setBusy(value){busy=value;dialog.setAttribute('aria-busy',String(value));dialog.querySelector('[data-flam-reload]').disabled=value;download.disabled=value||dirty||!preview?.summary.lines||!!preview?.errors.length;dialog.querySelector('[data-flam-save]')?.toggleAttribute('disabled',value||!dirty);dialog.querySelectorAll('[data-flam-code]').forEach(e=>e.disabled=value||!isAdmin());dialog.querySelector('[data-flam-products]')?.toggleAttribute('disabled',value)}
    function showError(e){if(!dialog.open)return;error.textContent=e.message||'処理できませんでした。';error.hidden=false}
    async function request(path,body,blob=false){
      controller=new AbortController();const timer=setTimeout(()=>controller.abort(),60000)
      try{
        const response=await fetch(path,{credentials:'same-origin',cache:'no-store',signal:controller.signal,method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{})})
        if(!response.ok){const data=await response.json();if(data.redirect)location.assign(data.redirect);if(response.status===401)location.assign('/dealer/login');throw Error(data.error||'取得できませんでした。')}
        return blob?response.blob():response.json()
      }catch(e){if(e.name==='AbortError')throw Error('通信がタイムアウトしました。再確認してください。');throw e}
      finally{clearTimeout(timer)}
    }
    function draw(){
      const f=query,labels=[f.get('month'),state.options.salons.find(s=>s.organizationId===f.get('salon'))?.name,f.get('closing')?(f.get('closing')==='31'?'月末締め':f.get('closing')+'日締め'):null,f.get('member')?memberName(f.get('member')):null,f.get('branch')?branchName(f.get('branch')):null].filter(Boolean)
      result.removeAttribute('role')
      result.innerHTML='<p class="flam-scope">'+labels.map(esc).join(' / ')+'</p><dl class="flam-summary"><div><dt>納品売上（税抜・返品反映後）</dt><dd>'+yen(preview.summary.actualYen)+'</dd></div><div><dt>出力対象</dt><dd>'+preview.summary.documents+'伝票 / '+preview.summary.lines+'明細</dd></div></dl>'+(!preview.summary.lines?'<p class="flam-empty">対象期間に納品売上はありません。</p>':'<section class="flam-codes"><h3>flam得意先コード</h3><div class="flam-code-list">'+preview.customers.map(c=>'<label><span>'+esc(c.name)+'</span><input type="text" maxlength="15" autocomplete="off" spellcheck="false" data-flam-code="'+esc(c.id)+'" aria-label="'+esc(c.name)+'のflam得意先コード" value="'+esc(changed.has(c.id)?changed.get(c.id):c.code)+'" '+(isAdmin()?'':'disabled')+'></label>').join('')+'</div>'+(isAdmin()?'<button type="button" class="wo-button" data-flam-save disabled>'+flamIconsV694.save+'<span>コードを保存</span></button>':'<p>得意先コードの変更権限：管理者</p>')+'</section><label class="flam-option"><input type="checkbox" data-flam-products '+(productCodes?'checked':'')+'>flam登録済みの商品コードも出力</label>')+'<p class="flam-meta">税計算・請求条件：flam側の得意先設定</p>'+(preview.errors.length?'<ul class="flam-issues">'+preview.errors.slice(0,30).map(m=>'<li>'+esc(m)+'</li>').join('')+(preview.errors.length>30?'<li>ほか '+(preview.errors.length-30)+'件</li>':'')+'</ul>':'')
    }
    async function load(){
      if(busy)return
      setBusy(true);error.hidden=true;query.set('productCodes',productCodes?'1':'0')
      try{preview=await request('/api/dealer/erp/flam-preview?'+query);if(dialog.open)draw()}
      catch(e){preview=null;showError(e)}finally{setBusy(false)}
    }
    dialog.querySelector('[data-flam-reload]').onclick=load
    result.addEventListener('input',e=>{
      if(!e.target.hasAttribute('data-flam-code'))return
      changed.set(e.target.dataset.flamCode,e.target.value);dirty=true;setBusy(busy)
    })
    result.addEventListener('change',async e=>{
      if(!e.target.hasAttribute('data-flam-products'))return
      productCodes=e.target.checked;await load()
    })
    result.addEventListener('click',async e=>{
      if(!e.target.closest('[data-flam-save]')||busy)return
      setBusy(true);error.hidden=true
      try{await request('/api/dealer/erp/flam-customer-codes',{customers:[...changed].map(([id,code])=>({id,code}))});changed.clear();dirty=false;setBusy(false);await load()}
      catch(e){showError(e)}finally{setBusy(false)}
    })
    download.onclick=async()=>{
      if(busy||dirty||!preview?.summary.lines||preview.errors.length)return
      setBusy(true);error.hidden=true
      try{
        const q=new URLSearchParams(query);q.set('token',preview.token)
        const blob=await request('/api/dealer/erp/flam-export.xlsx?'+q,null,true)
        if(!dialog.open)return
        const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='ORIMIA_flam_sales_'+preview.month+'.xlsx';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)
      }catch(e){showError(e)}finally{setBusy(false)}
    }
    await load()
  }
