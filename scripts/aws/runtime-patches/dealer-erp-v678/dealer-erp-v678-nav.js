(() => {
  'use strict'
  // Navigation only. Do not observe or replace business forms during typing.
  if (!location.pathname.startsWith('/dealer/')) return
  for (const nav of document.querySelectorAll('.wo-dealer-sidebar nav,.wo-dealer-mobile-nav')) {
    for (const [path,label] of [['operations','業務ダッシュボード'],['fulfillment','出荷・納品'],['inventory','倉庫・在庫'],['receivables','請求・入金'],['activities','営業予定・活動'],['messages','連絡']]) {
      if (nav.querySelector(`a[href="/dealer/${path}"]`)) continue
      const link=document.createElement('a'); link.href='/dealer/'+path; link.textContent=label; nav.append(link)
    }
  }
  if (location.pathname==='/dealer/orders') {
    const header=document.querySelector('.wo-page-head')
    if (header) { const link=document.createElement('a'); link.className='wo-button'; link.href='/dealer/fulfillment'; link.textContent='引当・出荷・納品へ'; header.append(link) }
  }
  let pending=false
  async function unread() {
    if (pending || document.visibilityState!=='visible' || location.pathname.includes('password') || location.pathname==='/dealer/login') return
    pending=true
    try {
      const response=await fetch('/api/dealer/erp/unread',{ credentials:'same-origin',signal:AbortSignal.timeout(10000) })
      if (!response.ok) return
      const { unread:count }=await response.json()
      for (const link of document.querySelectorAll('a[href="/dealer/messages"]')) {
        let badge=link.querySelector('.erp-unread')
        if (!badge) { badge=document.createElement('span');badge.className='erp-unread';link.append(badge) }
        const value=count ? String(count):''
        if (badge.textContent!==value) badge.textContent=value
        badge.hidden=!count
        badge.setAttribute('aria-label',`未読 ${count}件`)
      }
    } catch {} finally { pending=false }
  }
  unread()
  const timer=setInterval(unread,30000)
  window.addEventListener('pagehide',() => clearInterval(timer),{ once:true })
})()
