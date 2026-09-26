;(() => {
  if (window.__orimiaAppointmentDatetimeV684) return
  window.__orimiaAppointmentDatetimeV684 = true
  const LOCKED = new Set(['会計済み', '会計完了', '来店済み', '来店完了', 'キャンセル', '無断キャンセル'])
  const selector = '[data-appointment-datetime-v684]'
  let timer = 0, currentPath = '', dialog = null, refreshCalendar = false
  const text = value => String(value || '').replace(/\s+/g, ' ').trim()
  const id = () => {
    const match = location.pathname.match(/^\/admin\/appointments\/([^/]+)\/?$/)
    try { return match ? decodeURIComponent(match[1]) : '' } catch { return '' }
  }
  function cardParts() {
    const label = [...document.querySelectorAll('main p')].find(el => text(el.textContent) === '予約日時')
    const card = label?.closest('section,article')
    const value = label?.parentElement?.querySelector('.tabular-nums')
    if (!card || !value || !card.contains(value)) return null
    const status = [...card.querySelectorAll('p')].find(el => el !== label && LOCKED.has(text(el.textContent)))
    return {card,label,value,locked:Boolean(status)}
  }
  function jst(value) {
    const date = new Date(value)
    if (!Number.isFinite(date.getTime())) throw Error('予約日時を取得できませんでした。')
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).map(p=>[p.type,p.value]))
    return {date:parts.year+'-'+parts.month+'-'+parts.day,time:parts.hour+':'+parts.minute}
  }
  function formatted(value) {
    const v=jst(value), [year,month,day]=v.date.split('-').map(Number)
    const weekday=['日','月','火','水','木','金','土'][new Date(v.date+'T00:00:00Z').getUTCDay()]
    return `${year}年${month}月${day}日(${weekday}) ${v.time}`
  }
  function calendarUrl(href,month) {
    const url=new URL(href,location.href)
    url.searchParams.set('month',month);url.searchParams.set('view','calendar');url.searchParams.set('scheduleUpdated',String(Date.now()))
    url.searchParams.delete('date');url.searchParams.delete('tab')
    return url
  }
  async function request(url, options, signal) {
    const controller = new AbortController()
    const abort = () => controller.abort()
    signal?.addEventListener('abort',abort,{once:true})
    const timeout = setTimeout(abort,15000)
    try {
      const response = await fetch(url,{...options,credentials:'same-origin',cache:'no-store',signal:controller.signal})
      const data = await response.json().catch(()=>({}))
      if (!response.ok || !data.appointment) throw Error(data.error || (response.status===401?'ログインし直してください。':'予約を取得・更新できませんでした。'))
      return data
    } catch(error) {
      if (controller.signal.aborted && !signal?.aborted) throw Error('通信に時間がかかっています。時間をおいて再度お試しください。')
      throw error
    } finally {
      clearTimeout(timeout)
      signal?.removeEventListener('abort',abort)
    }
  }
  function showSaved(appointment) {
    const value = formatted(appointment.scheduledAt), parts=cardParts()
    if (parts) parts.value.textContent=value
    for (const dt of document.querySelectorAll('main dt')) if(text(dt.textContent)==='予約日時'&&dt.nextElementSibling)dt.nextElementSibling.textContent=value
    document.querySelector('.ad684-toast')?.remove()
    const toast=document.createElement('div')
    toast.className='ad684-toast';toast.setAttribute('role','status');toast.textContent='予約日時を変更しました。'
    document.body.appendChild(toast);setTimeout(()=>toast.remove(),4500)
    refreshCalendar=jst(appointment.scheduledAt).date.slice(0,7)
    // A fresh calendar URL avoids a prefetched view of the old schedule.
    for(const a of document.querySelectorAll('a[href]')) {
      const url=new URL(a.href,location.href)
      if(url.origin===location.origin&&url.pathname==='/admin/appointments') {
        a.href=calendarUrl(a.href,refreshCalendar).href
      }
    }
    window.dispatchEvent(new CustomEvent('orimia:appointment-schedule-updated',{detail:appointment}))
  }
  function closeDialog() { if(dialog?.open) dialog.close() }
  async function openEditor(trigger) {
    const appointmentId=id(), parts=cardParts()
    if (!appointmentId || !parts || parts.locked || dialog?.open) return
    const endpoint='/api/admin/appointments/'+encodeURIComponent(appointmentId)+'/schedule'
    const controller=new AbortController(), path=location.pathname
    dialog=document.createElement('dialog')
    const modal=dialog
    modal.className='ad684-dialog'
    modal.setAttribute('aria-labelledby','ad684-title')
    modal.innerHTML=`<header><h2 id="ad684-title">予約日時を変更</h2><button type="button" class="ad684-close" aria-label="閉じる" title="閉じる">${window.AppointmentDatetimeIconsV684.X}</button></header><form><p class="ad684-summary" aria-live="polite">予約情報を取得中...</p><div class="ad684-fields"><label>予約日<input name="date" type="date" required disabled></label><label>開始時刻<input name="time" type="time" step="900" required disabled></label></div><p class="ad684-error" role="alert" tabindex="-1" hidden></p><button type="button" class="ad684-retry" hidden>再読み込み</button><footer><button type="button" class="ad684-cancel">キャンセル</button><button type="submit" class="ad684-save" disabled>${window.AppointmentDatetimeIconsV684.Check}変更を保存</button></footer></form>`
    document.body.appendChild(modal)
    const form=modal.querySelector('form'), dateInput=form.elements.date, timeInput=form.elements.time
    const summary=modal.querySelector('.ad684-summary'),error=modal.querySelector('.ad684-error'),save=modal.querySelector('.ad684-save'),retry=modal.querySelector('.ad684-retry')
    let appointment=null, saving=false
    const controls=[dateInput,timeInput,save]
    const setError=message=>{error.textContent=message;error.hidden=false;error.focus()}
    const dismiss=()=>{if(!saving)modal.close()}
    modal.querySelector('.ad684-close').onclick=dismiss
    modal.querySelector('.ad684-cancel').onclick=dismiss
    modal.addEventListener('cancel',event=>{if(saving)event.preventDefault()})
    modal.addEventListener('click',event=>{if(event.target===modal){const box=modal.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dismiss()}})
    modal.addEventListener('close',()=>{
      controller.abort();modal.remove();document.body.classList.remove('ad684-open')
      if(dialog===modal)dialog=null
      if(location.pathname===path&&trigger.isConnected)trigger.focus({preventScroll:true})
    },{once:true})
    async function load() {
      error.hidden=true;retry.hidden=true;appointment=null
      controls.forEach(el=>el.disabled=true)
      summary.textContent='予約情報を取得中...'
      try {
        const result=await request(endpoint,{method:'GET'},controller.signal)
        if(controller.signal.aborted||location.pathname!==path)return
        appointment=result.appointment
        const value=jst(appointment.scheduledAt)
        dateInput.value=value.date;timeInput.value=value.time
        summary.textContent=[appointment.menu,appointment.durationMinutes?`${appointment.durationMinutes}分`:null,`担当 ${appointment.staffName||'フリー'}`].filter(Boolean).join(' / ')
        if(result.editable===false||LOCKED.has(appointment.status)){setError('完了・キャンセル済みの予約は変更できません。');return}
        controls.forEach(el=>el.disabled=false)
        dateInput.focus()
      } catch(e) {
        if(!controller.signal.aborted){summary.textContent='予約情報を取得できませんでした。';setError(e.message);retry.hidden=false}
      }
    }
    retry.onclick=load
    form.addEventListener('submit',async event=>{
      event.preventDefault()
      if(saving||!appointment||save.disabled)return
      error.hidden=true
      const [hour,minute]=timeInput.value.split(':').map(Number)
      if(!dateInput.value||!Number.isInteger(hour)||!Number.isInteger(minute)||minute%15){setError('予約日と開始時刻を確認してください。開始時刻は15分単位です。');return}
      saving=true;controls.forEach(el=>el.disabled=true);save.textContent='保存中...'
      try {
        const result=await request(endpoint,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:dateInput.value,startMinutes:hour*60+minute,dateTimeOnly:true,updatedAt:appointment.updatedAt})},controller.signal)
        if(location.pathname!==path)return
        showSaved(result.appointment)
        saving=false;modal.close()
      } catch(e) {
        if(!controller.signal.aborted){setError(e.message);retry.hidden=false}
      } finally {
        saving=false;controls.forEach(el=>el.disabled=false);save.innerHTML=window.AppointmentDatetimeIconsV684.Check+'変更を保存'
      }
    })
    document.body.classList.add('ad684-open');modal.showModal()
    await load()
  }
  function enhance() {
    timer=0
    if(currentPath!==location.pathname){closeDialog();currentPath=location.pathname}
    if(!id()) {
      if(refreshCalendar&&location.pathname==='/admin/appointments'){
        const url=calendarUrl(location.href,refreshCalendar);refreshCalendar=false;location.replace(url.href)
      }
      return
    }
    const parts=cardParts()
    if(!parts)return
    const {card,value,locked}=parts
    if(locked){card.querySelector(selector)?.remove();value.removeAttribute('data-appointment-datetime-value-v684');value.removeAttribute('role');value.removeAttribute('tabindex');return}
    if(!value.hasAttribute('data-appointment-datetime-value-v684')){
      value.setAttribute('data-appointment-datetime-value-v684','')
      value.setAttribute('role','button');value.tabIndex=0;value.setAttribute('aria-label','予約日時を変更');value.setAttribute('aria-haspopup','dialog')
    }
    if(card.querySelector(selector))return
    const button=document.createElement('button')
    button.type='button';button.className='ad684-trigger';button.setAttribute('data-appointment-datetime-v684','');button.setAttribute('aria-haspopup','dialog')
    button.innerHTML=window.AppointmentDatetimeIconsV684.CalendarClock+'日時を変更'
    card.appendChild(button)
  }
  function schedule() {if(!timer)timer=setTimeout(enhance,60)}
  function start() {
    enhance()
    new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true})
    window.addEventListener('popstate',schedule)
    window.addEventListener('pageshow',schedule)
    document.addEventListener('click',event=>{
      const anchor=event.target instanceof Element?event.target.closest('a[href]'):null
      if(refreshCalendar&&anchor&&event.button===0&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey){
        const url=new URL(anchor.href,location.href)
        if(url.origin===location.origin&&url.pathname==='/admin/appointments'){
          const destination=calendarUrl(anchor.href,refreshCalendar)
          event.preventDefault();event.stopImmediatePropagation();refreshCalendar=false;location.assign(destination.href);return
        }
      }
      const trigger=event.target instanceof Element?event.target.closest(selector+', [data-appointment-datetime-value-v684]'):null
      if(!trigger)return
      event.preventDefault();openEditor(trigger)
    },true)
    document.addEventListener('keydown',event=>{
      if((event.key==='Enter'||event.key===' ')&&event.target instanceof Element&&event.target.matches('[data-appointment-datetime-value-v684]')){event.preventDefault();openEditor(event.target)}
    })
  }
  // Wait for React, not for unrelated image/network requests to complete.
  const begin=()=>{if(document.querySelector('script[src*="/_next/static/chunks/main-app-"]')&&!window.__orimiaHydratedV680)window.addEventListener('orimia:hydrated-v680',start,{once:true});else start()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',begin,{once:true});else begin()
})()
