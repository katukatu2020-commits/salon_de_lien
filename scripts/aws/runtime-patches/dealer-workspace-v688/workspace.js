(() => {
  'use strict'
  if (!document.body.classList.contains('dw-body')) return
  const dialog=document.querySelector('#dw-menu'), search=dialog.querySelector('[data-dw-search]')
  const openers=[...document.querySelectorAll('[data-dw-open]')]
  let opener, scroll=0
  function filter() {
    const query=search.value.normalize('NFKC').toLocaleLowerCase('ja').trim()
    let count=0
    dialog.querySelectorAll('[data-dw-group]').forEach(group=>{
      let visible=0
      group.querySelectorAll('[data-dw-link]').forEach(link=>{
        link.hidden=!link.textContent.normalize('NFKC').toLocaleLowerCase('ja').includes(query)
        if(!link.hidden) visible++
      })
      group.hidden=!visible;count+=visible
    })
    dialog.querySelector('[data-dw-empty]').hidden=Boolean(count)
  }
  openers.forEach(button=>button.addEventListener('click',()=>{
    opener=button;scroll=window.scrollY;search.value='';filter()
    dialog.showModal();document.documentElement.classList.add('dw-menu-open')
    openers.forEach(item=>item.setAttribute('aria-expanded','true'))
    search.focus({preventScroll:true})
  }))
  dialog.querySelector('[data-dw-close]').addEventListener('click',()=>dialog.close())
  dialog.addEventListener('keydown',event=>{if(event.key==='Escape'&&!event.isComposing){event.preventDefault();dialog.close()}})
  dialog.addEventListener('click',event=>{
    if(event.target.closest('[data-dw-link]')){dialog.close();return}
    if(event.target!==dialog)return
    const rect=dialog.getBoundingClientRect()
    if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close()
  })
  dialog.addEventListener('close',()=>{
    document.documentElement.classList.remove('dw-menu-open')
    openers.forEach(item=>item.setAttribute('aria-expanded','false'))
    opener?.focus({preventScroll:true});window.scrollTo({top:scroll,behavior:'instant'})
  })
  search.addEventListener('input',event=>{if(!event.isComposing)filter()})
  search.addEventListener('compositionend',filter)
  let pending=false,timer
  async function unread() {
    if(pending||document.visibilityState!=='visible'||location.pathname.includes('password'))return
    pending=true
    try {
      const response=await fetch('/api/dealer/erp/unread',{credentials:'same-origin',signal:AbortSignal.timeout(10000)})
      if(!response.ok)return
      const result=await response.json(),count=Math.max(0,Number(result.unread)||0)
      document.querySelectorAll('[data-dw-unread]').forEach(badge=>{
        const value=count>99?'99+':String(count)
        if(badge.textContent!==value)badge.textContent=value
        badge.hidden=!count;badge.setAttribute('aria-label',`チャット未読 ${count}件`)
      })
    } catch {} finally {pending=false}
  }
  function start(){clearInterval(timer);unread();timer=setInterval(unread,30000)}
  window.addEventListener('orimia:partner-chat-read',unread)
  document.addEventListener('visibilitychange',unread)
  window.addEventListener('pagehide',()=>clearInterval(timer))
  window.addEventListener('pageshow',start)
  start()
})()
