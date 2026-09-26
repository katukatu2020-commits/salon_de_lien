;(()=>{
  if(window.OrimiaCampaignBookingV685)return
  const baseFetch=window.fetch.bind(window)
  let state=null,request=null
  const campaignId=()=>location.pathname==='/u/appointments'?new URLSearchParams(location.search).get('campaign')||'':''
  const notify=()=>window.dispatchEvent(new Event('orimia:campaign-booking-v685'))
  function read(){
    const id=campaignId()
    if(!id){request?.abort();request=null;state=null;return null}
    if(state?.id!==id){request?.abort();state={id,status:'loading',menuIds:[],campaign:null,initialized:false,error:''};void load(state)}
    return state
  }
  async function load(current){
    current.status='loading';current.error='';notify()
    const controller=new AbortController();request=controller
    const timeout=setTimeout(()=>controller.abort(),15000)
    try{
      const response=await baseFetch('/api/customer/campaign-booking?campaign='+encodeURIComponent(current.id),{credentials:'same-origin',cache:'no-store',signal:controller.signal})
      const result=await response.json().catch(()=>({}))
      if(!response.ok)throw Error(result.error||'キャンペーンを確認できませんでした。')
      if(result.campaign?.id!==current.id||!Array.isArray(result.menuIds)||!result.menuIds.length)throw Error('対象メニューを確認できませんでした。')
      current.status='ready';current.campaign=result.campaign;current.menuIds=result.menuIds
    }catch(error){current.status='error';current.error=controller.signal.aborted?'通信に時間がかかっています。再度お試しください。':error.message}
    finally{clearTimeout(timeout);if(state===current&&campaignId()===current.id)notify()}
  }
  function permits(value){const current=read();return !current||(current.status==='ready'&&current.menuIds.includes(value))}
  function initializeMenu(select){
    const current=read()
    if(!current||current.status!=='ready'||current.initialized)return false
    const eligible=[...select.options].filter(option=>!option.disabled&&current.menuIds.includes(option.value))
    if(!eligible.length)return false
    current.initialized=true
    const single=Boolean(current.campaign.targetMenu)&&eligible.length===1
    if(single||!permits(select.value)){
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,eligible[0].value)
      select.dispatchEvent(new Event('change',{bubbles:true}))
    }
    return single
  }
  function render(shell){
    const current=read()
    let panel=shell.querySelector('[data-campaign-booking-v685]')
    if(!current){if(panel)panel.hidden=true;return}
    if(!panel){
      panel=document.createElement('section');panel.className='campaign-booking-v685';panel.dataset.campaignBookingV685='';panel.setAttribute('aria-label','選択中のキャンペーン')
      const heading=document.createElement('strong'),text=document.createElement('p'),retry=document.createElement('button'),back=document.createElement('a')
      heading.dataset.campaignTitle='';text.dataset.campaignMessage='';text.setAttribute('aria-live','polite')
      retry.type='button';retry.textContent='再読み込み';retry.dataset.campaignRetry='';retry.onclick=()=>{const value=read();if(value&&value.status!=='loading')void load(value)}
      back.href='/u/campaigns';back.textContent='キャンペーン一覧へ'
      panel.append(heading,text,retry,back);shell.querySelector('h1').after(panel)
    }
    panel.hidden=false;panel.dataset.state=current.status
    const title=current.campaign?.title||'キャンペーン予約'
    const message=current.status==='ready'?'対象：'+(current.campaign.targetMenu||'全メニュー'):current.status==='error'?current.error:'キャンペーンを確認しています...'
    const heading=panel.querySelector('[data-campaign-title]'),text=panel.querySelector('[data-campaign-message]')
    if(heading.textContent!==title)heading.textContent=title
    if(text.textContent!==message)text.textContent=message
    panel.querySelector('[data-campaign-retry]').hidden=current.status!=='error'
  }
  window.OrimiaCampaignBookingV685={read,permits,initializeMenu,render}
  // Preserve the existing coupon/point fetch wrappers and carry the campaign into
  // the normal booking transaction; no second booking endpoint is introduced.
  window.fetch=async(input,init={})=>{
    const url=new URL(typeof input==='string'||input instanceof URL?input:input.url,location.href)
    const method=String(init.method||(input instanceof Request?input.method:'GET')).toUpperCase()
    if(url.origin!==location.origin||url.pathname!=='/api/customer/appointments'||method!=='POST'||!campaignId())return baseFetch(input,init)
    let body
    try{body=JSON.parse(typeof init.body==='string'?init.body:input instanceof Request?await input.clone().text():'{}')}catch{return new Response(JSON.stringify({error:'予約内容を確認してください。'}),{status:400,headers:{'Content-Type':'application/json'}})}
    const current=read()
    if(!current||!permits(body.menuKey))return new Response(JSON.stringify({error:current?.error||'キャンペーンの対象メニューを選択してください。'}),{status:409,headers:{'Content-Type':'application/json'}})
    return baseFetch(input,{...init,body:JSON.stringify({...body,campaignId:current.id})})
  }
  read()
  window.addEventListener('popstate',()=>{read();notify()})
  window.addEventListener('pageshow',event=>{if(event.persisted&&state)void load(state)})
})()
