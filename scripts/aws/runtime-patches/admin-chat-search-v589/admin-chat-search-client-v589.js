(() => {
  'use strict'
  if (window.__orimiaChatInboxV589) return
  window.__orimiaChatInboxV589 = true
  let active = null
  const isChatRoute = () => location.pathname === '/admin/customers/messages/chat' || (location.pathname === '/admin/customers/messages' && new URLSearchParams(location.search).get('chat') === '1')

  function attach(root) {
    const form = root.querySelector('.inbox-search-form')
    const results = root.querySelector('[data-inbox-results]')
    const query = form?.querySelector('[name="q"]')
    const error = root.querySelector('.inbox-error')
    if (!form || !results || !query) return null
    const clear = form.querySelector('[data-inbox-clear]')
    let timer, controller, generation = 0, composing = false, disposed = false
    let page = Number(new URLSearchParams(location.search).get('page')) || 1

    function currentParams(targetPage = 1) {
      const params = new URLSearchParams(new FormData(form))
      if (!params.get('q')?.trim()) params.delete('q')
      if (params.get('unread') !== '1') params.delete('unread')
      if (!params.get('staff')) params.delete('staff')
      if (targetPage > 1) params.set('page',String(targetPage))
      else params.delete('page')
      return params
    }

    function saveUrl(params) {
      if (!isChatRoute()) return
      const next = new URL(location.href)
      for (const key of ['q','unread','staff','page']) {
        if (params.has(key)) next.searchParams.set(key,params.get(key))
        else next.searchParams.delete(key)
      }
      history.replaceState(history.state,'',next.pathname + next.search + next.hash)
      const back = root.closest('.admin-chat-workspace-v589')?.querySelector('.admin-chat-mobile-back')
      if (back) {
        const backParams = new URLSearchParams(params)
        backParams.delete('threadId')
        backParams.delete('customerId')
        back.href = '/admin/customers/messages/chat' + (backParams.size ? '?' + backParams : '')
      }
    }

    async function search(targetPage = 1) {
      clearTimeout(timer)
      controller?.abort()
      const requestId = ++generation
      controller = new AbortController()
      results.setAttribute('aria-busy','true')
      error.hidden = true
      const params = currentParams(targetPage)
      try {
        const response = await fetch('/api/admin/chat/inbox?' + params, {credentials:'same-origin',cache:'no-store',signal:controller.signal,headers:{Accept:'application/json'}})
        const data = await response.json()
        if (!response.ok) {
          const failure = new Error('Inbox request failed')
          failure.displayMessage = data.error || '検索できませんでした。'
          throw failure
        }
        if (disposed || requestId !== generation || !root.isConnected || !isChatRoute()) return
        results.innerHTML = data.html
        root.querySelector('[data-inbox-all-count]').textContent = String(data.stats.allCount)
        root.querySelector('[data-inbox-unread-count]').textContent = String(data.stats.unreadCount)
        page = data.params.page
        if (page > 1) params.set('page',String(page))
        else params.delete('page')
        saveUrl(params)
      } catch (failure) {
        if (failure.name === 'AbortError' || disposed || requestId !== generation) return
        error.replaceChildren(document.createTextNode((failure.displayMessage || '検索できませんでした。通信状況を確認して、もう一度お試しください。') + ' '))
        const retry = document.createElement('button')
        retry.type = 'button'
        retry.textContent = '再試行'
        retry.addEventListener('click',()=>search(targetPage),{once:true})
        error.append(retry)
        error.hidden = false
      } finally {
        if (requestId === generation && !disposed) results.removeAttribute('aria-busy')
      }
    }

    function schedule() {
      clear.hidden = !query.value
      clearTimeout(timer)
      controller?.abort()
      generation += 1
      results.removeAttribute('aria-busy')
      if (!composing) timer = setTimeout(()=>search(1),300)
    }
    query.addEventListener('compositionstart',()=>{composing=true;schedule()})
    query.addEventListener('compositionend',()=>{composing=false;schedule()})
    query.addEventListener('input',schedule)
    query.addEventListener('keydown',event=>{if (event.key === 'Enter' && (composing || event.isComposing)) event.preventDefault()})
    form.addEventListener('submit',event=>{event.preventDefault();if (!composing) search(1)})
    form.addEventListener('change',event=>{if (event.target.matches('select,input[type="radio"]')) search(1)})
    clear.addEventListener('click',()=>{query.value='';clear.hidden=true;query.focus();search(1)})
    root.addEventListener('click',event=>{
      const pagination = event.target.closest('[data-inbox-page]')
      if (pagination && !event.ctrlKey && !event.metaKey && !event.shiftKey && event.button === 0) {
        event.preventDefault()
        search(Number(pagination.dataset.inboxPage))
      }
      if (event.target.closest('[data-inbox-reset]')) {
        query.value = ''
        clear.hidden = true
        form.querySelector('[name="unread"][value="0"]').checked = true
        form.querySelector('[name="staff"]').value = ''
        query.focus()
        search(1)
      }
      const thread = event.target.closest('[data-inbox-thread]')
      if (thread) {
        const params = currentParams(page)
        params.delete('customerId')
        params.set('threadId',thread.dataset.inboxThread)
        thread.href = '/admin/customers/messages/chat?' + params
      }
    })
    root.dataset.inboxEnhanced = 'true'
    return { root, dispose() {disposed=true;clearTimeout(timer);controller?.abort()} }
  }

  function mount() {
    const root = isChatRoute() ? document.querySelector('[data-inbox-v589]') : null
    if (active?.root === root) return
    active?.dispose()
    active = root ? attach(root) : null
  }
  let pending = false
  const observer = new MutationObserver(()=>{
    if (pending) return
    pending = true
    requestAnimationFrame(()=>{pending=false;mount()})
  })
  function start() { mount();observer.observe(document.body,{childList:true,subtree:true}) }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true})
  else start()
  window.addEventListener('popstate',()=>setTimeout(mount,0))
})()
