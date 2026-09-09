(() => {
  'use strict'
  if (window.__customerJourneyV601) return
  window.__customerJourneyV601 = true
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
  const icon = name => `<svg class="cj-icon" aria-hidden="true"><use href="/customer-icons-v601.svg#${name}"></use></svg>`
  const setHTML = (node, html) => {
    if (node.__html === html) return
    const focused = node.contains(document.activeElement) ? document.activeElement : null
    const selector = focused?.matches('[data-cj-menu]') ? `[data-cj-menu][value="${CSS.escape(focused.value)}"]` : focused?.matches('[data-cj-date]') ? `[data-cj-date="${focused.dataset.cjDate}"]` : null
    node.innerHTML = html; node.__html = html
    if (selector) node.querySelector(selector)?.focus({preventScroll:true})
  }
  const date = (value, time = false) => value ? new Intl.DateTimeFormat('ja-JP',{year:'numeric',month:'2-digit',day:'2-digit',...(time ? {weekday:'short',hour:'2-digit',minute:'2-digit'} : {}),timeZone:'Asia/Tokyo'}).format(new Date(value)) : '来店前'
  let controller = null, queued = false
  const queue = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; refresh() }) }
  const currentRoute = () => location.pathname === '/u/appointments' ? 'booking' : location.pathname === '/u/profile' ? 'profile' : location.pathname.startsWith('/u/catalog') ? 'catalog' : ''
  function createBooking(main, select) {
    const choices = select.closest('section'), root = choices.parentElement
    const calendar = [...root.children].find(el => el.tagName === 'SECTION' && el !== choices && el.querySelector('button[aria-label*="予約可能"],button[aria-label*="受付不可"]'))
    if (!calendar) return null
    const shell = document.createElement('section')
    shell.className = 'cj-booking-top'
    shell.innerHTML = `<h1>予約する</h1><nav class="cj-steps" aria-label="予約の手順">${['メニュー','担当者','日時','内容確認'].map((label,i)=>`<button type="button" data-cj-step="${i+1}"><span>${i+1}</span><small>${label}</small></button>`).join('')}</nav><h2 tabindex="-1" data-cj-heading>メニューを選択してください</h2><div class="cj-menu-panel"><label class="cj-search">${icon('Search')}<input type="search" placeholder="メニューを検索" aria-label="メニューを検索"></label><div class="cj-menu-categories" role="group" aria-label="メニューの種類"></div><div class="cj-menu-list" role="radiogroup" aria-label="メニュー"></div></div>`
    const footer = document.createElement('div')
    footer.className = 'cj-booking-footer'
    footer.innerHTML = `<button type="button" class="cj-back" data-cj-prev>${icon('ChevronLeft')}戻る</button><button type="button" class="cj-primary" data-cj-next>担当者を選ぶ${icon('ChevronRight')}</button>`
    main.prepend(shell); root.insertAdjacentElement('afterend',footer)
    const placeFooter = () => {
      const rect = main.getBoundingClientRect()
      footer.style.setProperty('--cj-footer-left',`${Math.round(rect.left)}px`)
      footer.style.setProperty('--cj-footer-width',`${Math.round(rect.width)}px`)
    }
    window.addEventListener('resize',placeFooter)
    root.classList.add('cj-booking-native'); choices.classList.add('cj-choices'); calendar.classList.add('cj-calendar')
    const heading = root.parentElement.querySelector(':scope > header')
    heading?.classList.add('cj-old-heading')
    const staff = choices.querySelector('button[aria-pressed]')?.parentElement
    staff?.classList.add('cj-staff-list')
    const staffDetail = staff?.nextElementSibling
    staffDetail?.classList.add('cj-staff-detail')
    const week = [...calendar.children].find(el=>el.querySelector('button') && /週間/.test(el.textContent))
    week?.classList.add('cj-week')
    week?.querySelectorAll('button').forEach((button,i)=>{button.setAttribute('aria-label',i?'次の1週間':'前の1週間');button.title=i?'次の1週間':'前の1週間'})
    const dates = document.createElement('div'); dates.className = 'cj-dates'; dates.setAttribute('role','group'); dates.setAttribute('aria-label','日付を選択')
    week?.after(dates)
    shell.querySelector('.cj-menu-categories').remove()
    let step = 1, selectedDay = 1, weekKey = ''
    const normalize = value => value.normalize('NFKC').toLowerCase().replace(/\s/g,'')
    const menuInfo = option => {
      const text = option.textContent.trim(), match = text.match(/^(.*)（(\d+)分・目安\s*([\d,]+)円）$/)
      return {value:option.value,name:match?match[1]:text,meta:match?`${match[2]}分 / ${match[3]}円`:'',disabled:option.disabled}
    }
    function go(next) {
      if (next === 4 && !selectedSlot()) return
      step = Math.min(4,Math.max(1,next)); sync()
      shell.querySelector('[data-cj-heading]').focus({preventScroll:true})
      main.scrollIntoView({block:'start',behavior:'instant'})
    }
    const selectedSlot = () => [...calendar.querySelectorAll('button[aria-label]')].find(button=>button.dataset.cjDay===String(selectedDay) && !button.disabled && button.querySelector('svg.lucide-check'))
    shell.addEventListener('click',event=>{
      const stage=event.target.closest('[data-cj-step]')
      if (stage) { const next=Number(stage.dataset.cjStep); if (next<=step) go(next) }
    })
    shell.querySelector('input[type=search]').addEventListener('input',sync)
    shell.querySelector('.cj-menu-list').addEventListener('change',event=>{
      if (!event.target.matches('input[data-cj-menu]')) return
      // The original controlled select remains the single source of booking state.
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,event.target.value)
      select.dispatchEvent(new Event('change',{bubbles:true})); queue()
    })
    dates.addEventListener('click',event=>{const button=event.target.closest('[data-cj-date]');if(button){selectedDay=Number(button.dataset.cjDate);sync()}})
    footer.querySelector('[data-cj-next]').addEventListener('click',()=>go(step+1))
    footer.querySelector('[data-cj-prev]').addEventListener('click',()=>go(step-1))
    function sync() {
      main.dataset.cjStep=String(step); main.dataset.cjDay=String(selectedDay)
      shell.querySelector('.cj-menu-panel').hidden=step!==1
      shell.querySelectorAll('[data-cj-step]').forEach(button=>{const n=Number(button.dataset.cjStep);button.disabled=n>step;button.setAttribute('aria-current',n===step?'step':'false');button.dataset.complete=String(n<step)})
      const success=calendar.querySelector('.cx-booking-success-v508')
      const headings=['メニューを選択してください','担当者を選択してください','日時を選択してください','予約内容をご確認ください']
      const headingText=success?'ご予約が完了しました':headings[step-1]
      const h=shell.querySelector('[data-cj-heading]');if(h.textContent!==headingText)h.textContent=headingText
      const menus=[...select.options].map(menuInfo)
      const query=normalize(shell.querySelector('input').value)
      const visible=menus.filter(item=>normalize(item.name).includes(query))
      setHTML(shell.querySelector('.cj-menu-list'),visible.map(item=>`<label class="cj-menu-row"><input type="radio" name="cj-menu" data-cj-menu value="${escape(item.value)}" ${select.value===item.value?'checked':''} ${item.disabled?'disabled':''}><span><strong>${escape(item.name)}</strong><small>${escape(item.meta)}</small></span></label>`).join('')||'<p class="cj-empty" role="status">該当するメニューがありません</p>')
      const grid=calendar.querySelector('[class*="min-w-[620px]"]')
      if(grid){
        grid.classList.add('cj-slot-grid');grid.parentElement.classList.add('cj-slot-scroller')
        const rows=[...grid.children],heads=[...rows[0].children].slice(1)
        rows[0].classList.add('cj-date-original')
        rows.slice(1).forEach(row=>{row.classList.add('cj-slot-row');[...row.children].forEach((cell,i)=>{cell.dataset.cjDay=String(i)})})
        const key=heads.map(el=>el.textContent).join('|')
        if(key!==weekKey){weekKey=key;selectedDay=1;main.dataset.cjDay='1'}
        setHTML(dates,heads.map((el,i)=>`<button type="button" data-cj-date="${i+1}" aria-current="${i+1===selectedDay?'date':'false'}"><strong>${escape(el.children[0]?.textContent)}</strong><small>${escape(el.children[1]?.textContent)}</small></button>`).join(''))
      }
      [...calendar.children].forEach(el=>{
        if(el.querySelector('button')&&/選択した予約内容/.test(el.textContent))el.classList.add('cj-confirmation')
      })
      footer.querySelector('[data-cj-prev]').hidden=step===1
      const next=footer.querySelector('[data-cj-next]');next.hidden=step===4
      next.disabled=(step===1&&!select.value)||(step===3&&!selectedSlot())
      setHTML(next,(['','担当者を選ぶ','日時を選ぶ','予約内容を確認する'][step]||'')+icon('ChevronRight'))
      footer.hidden=Boolean(success)||step===4
      placeFooter()
    }
    sync()
    return {main,anchor:select,route:'booking',sync,destroy(){window.removeEventListener('resize',placeFooter);shell.remove();footer.remove();dates.remove();heading?.classList.remove('cj-old-heading')}}
  }
  function createProfile(main, form) {
    const native=form.parentElement
    native.classList.add('cj-profile-native')
    const overview=document.createElement('section');overview.className='cj-profile-overview'
    const toolbar=document.createElement('div');toolbar.className='cj-profile-toolbar';toolbar.innerHTML=`<button class="cj-back" type="button">${icon('ChevronLeft')}マイページへ戻る</button><h1>登録情報の確認・変更</h1>`
    main.prepend(overview,toolbar)
    let loaded=false,loading=false
    const details=()=>location.hash==='#details'||location.hash==='#login-settings'||[...new URLSearchParams(location.search).keys()].some(key=>['profile','account','email','withdrawal'].includes(key))
    const openDetails=()=>{history.pushState(null,'','#details');sync();toolbar.querySelector('h1').focus?.();main.scrollIntoView({block:'start'})}
    toolbar.querySelector('button').onclick=()=>{const url=new URL(location.href);url.hash='';for(const key of ['profile','account','email','withdrawal'])url.searchParams.delete(key);history.pushState(null,'',url);sync();load()}
    overview.addEventListener('click',event=>{if(event.target.closest('[data-cj-edit]')){event.preventDefault();openDetails()}if(event.target.closest('[data-cj-reload]'))load()})
    async function load() {
      if(loading)return;loading=true
      if(!loaded)setHTML(overview,'<h1>マイページ</h1><p class="cj-empty" role="status">会員情報を読み込んでいます</p>')
      try{
        const response=await fetch('/api/customer/mypage-summary',{credentials:'same-origin',cache:'no-store'})
        const data=await response.json();if(!response.ok)throw Error(data.error||'会員情報を読み込めませんでした。')
        if(!overview.isConnected)return
        const photo=native.querySelector('input[name=profileImage]')?.closest('section')?.querySelector('img')?.src
        const a=data.appointment
        setHTML(overview,`<h1>マイページ</h1><div class="cj-member"><button type="button" class="cj-avatar" data-cj-edit aria-label="プロフィール画像を変更">${photo?`<img src="${escape(photo)}" alt="${escape(data.name)}のプロフィール画像">`:icon('UserRound')}</button><div><h2>${escape(data.name)}<small> 様</small></h2><p>会員番号 <span>${escape(data.membershipCode)}</span></p></div></div><dl class="cj-member-stats"><div><dt>来店回数</dt><dd>${data.visitCount}<small> 回</small></dd></div><div><dt>最終来店日</dt><dd>${date(data.lastVisit)}</dd></div><div><dt>ポイント</dt><dd>${Number(data.points).toLocaleString('ja-JP')}<small> pt</small></dd></div></dl><section class="cj-next-appointment"><h2>次回のご予約</h2>${a?`<strong>${date(a.scheduledAt,true)}</strong><p>${escape(a.menu||'メニュー相談')}</p><p>担当：${escape(a.staffName||'指名なし')}</p><a class="cj-outline" href="/u/appointments?detail=${encodeURIComponent(a.id)}#current-reservations">予約内容の確認・キャンセル${icon('ChevronRight')}</a>`:'<p>次回のご予約はありません</p><a class="cj-primary" href="/u/appointments">予約する</a>'}</section><nav class="cj-account-links" aria-label="マイページメニュー">${[['/u/history','来店履歴'],['/u/reviews','購入商品・アンケート'],['/u/catalog?category=favorites','お気に入りアイテム'],['#details','登録情報の確認・変更'],['/u/stores','登録済みの店舗'],['/u/sms-settings','通知設定']].map(([href,label])=>`<a href="${href}" ${href==='#details'?'data-cj-edit':''}>${label}${icon('ChevronRight')}</a>`).join('')}<form action="/api/customer-auth/logout" method="post"><button type="submit">ログアウト${icon('ChevronRight')}</button></form></nav>`)
        loaded=true
      }catch(error){if(overview.isConnected)setHTML(overview,`<h1>マイページ</h1><p role="alert">${escape(error.message)}</p><button class="cj-outline" type="button" data-cj-reload>再読み込み</button><button class="cj-outline" type="button" data-cj-edit>登録情報の確認・変更</button>`)}
      finally{loading=false}
    }
    function sync(){const edit=details();native.hidden=!edit;overview.hidden=edit;toolbar.hidden=!edit;main.dataset.cjEdit=String(edit)}
    sync();load()
    return {main,anchor:form,route:'profile',sync,destroy(){native.hidden=false;overview.remove();toolbar.remove()}}
  }
  function bindFavorites() {
    for(const button of document.querySelectorAll('[data-cj-favorite]:not([data-cj-bound])')){
      button.dataset.cjBound='1'
      button.addEventListener('click',async()=>{
        if(button.disabled)return
        const status=button.parentElement.querySelector('[data-cj-favorite-status]')
        const favorite=button.getAttribute('aria-pressed')!=='true'
        button.disabled=true;button.setAttribute('aria-busy','true');status.textContent='保存しています'
        try{
          const response=await fetch('/api/customer/product-favorites',{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({productId:button.dataset.cjFavorite,favorite})})
          const data=await response.json();if(!response.ok)throw Error(data.error||'保存できませんでした。')
          button.setAttribute('aria-pressed',String(data.favorite));button.querySelector('span').textContent=data.favorite?'お気に入りに追加済み':'お気に入りに追加'
          status.textContent=data.favorite?'お気に入りに追加しました':'お気に入りから削除しました'
        }catch(error){status.textContent=error.message}
        finally{button.disabled=false;button.removeAttribute('aria-busy')}
      })
    }
  }
  function refresh() {
    const route=currentRoute(),main=document.querySelector('main.customer-native-main,main.content')
    document.documentElement.dataset.customerJourney=route
    if(controller&&(controller.main!==main||controller.route!==route||!controller.main.isConnected||!controller.anchor.isConnected)){controller.destroy();controller=null}
    if(!main)return
    main.classList.toggle('cj-main',route==='booking'||route==='profile')
    if(route==='booking'&&!controller){const select=main.querySelector('select.cx-menu-native-select-v508');if(select)controller=createBooking(main,select)}
    if(route==='profile'&&!controller){const form=main.querySelector('form[action="/api/customer/profile"]');if(form)controller=createProfile(main,form)}
    controller?.sync()
    if(route==='catalog')bindFavorites()
  }
  const start=()=>{new MutationObserver(queue).observe(document.body,{childList:true,subtree:true});window.addEventListener('popstate',queue);window.addEventListener('hashchange',queue);window.addEventListener('pageshow',event=>{if(event.persisted&&currentRoute()==='catalog')location.reload();else queue()});queue()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start()
})()
