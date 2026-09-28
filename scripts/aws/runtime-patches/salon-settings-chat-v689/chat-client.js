(() => {
  'use strict'
  if (window.__salonChatV689) return
  window.__salonChatV689 = true
  const selector = 'form[action="/api/lien-chat-form"]'
  const route = () => location.pathname === '/admin/customers/messages/chat' || (location.pathname === '/admin/customers/messages' && new URLSearchParams(location.search).get('chat') === '1')
  function context(form) {
    const params = new URLSearchParams(location.search)
    // Keep the displayed conversation identity even during a route transition.
    if (form.dataset.chatThread) return {threadId:form.dataset.chatThread, customerId:''}
    if (form.dataset.chatCustomer) return {customerId:form.dataset.chatCustomer, threadId:''}
    const threadId = params.get('threadId') || ''
    const customerId = threadId ? '' : params.get('customerId') || ''
    return {threadId,customerId}
  }
  document.addEventListener('submit', async event => {
    if (!route() || !(event.target instanceof HTMLFormElement) || !event.target.matches(selector)) return
    event.preventDefault()
    event.stopImmediatePropagation()
    const form = event.target
    if (form.dataset.sending === '1') return
    let error = form.querySelector('[data-chat-error-v689]')
    if (!error) { error = document.createElement('p'); error.dataset.chatErrorV689 = ''; error.setAttribute('role','alert'); form.append(error) }
    error.hidden = true
    const ids = context(form)
    if (!ids.threadId && !ids.customerId) { error.textContent = '送信先を選択してください。'; error.hidden = false; return }
    const params = new URLSearchParams(location.search)
    if ((ids.threadId && params.get('threadId') !== ids.threadId) || (!ids.threadId && (params.get('threadId') || params.get('customerId') !== ids.customerId))) {
      error.textContent = '会話を切り替えています。表示が完了してから送信してください。'; error.hidden = false; return
    }
    const data = new URLSearchParams()
    for (const [key,value] of new FormData(form)) if (typeof value === 'string') data.set(key,value)
    data.set('threadId',ids.threadId); data.set('customerId',ids.customerId)
    const buttons = [...form.querySelectorAll('button[type="submit"]')]
    form.dataset.sending = '1'; buttons.forEach(button => button.disabled = true)
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 15000)
    try {
      const response = await fetch(form.action, {method:'POST',credentials:'same-origin',headers:{Accept:'application/json'},body:data,signal:controller.signal})
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || '送信できませんでした。')
      const destination = new URL(result.redirect, location.origin)
      if (destination.origin !== location.origin || destination.pathname !== '/admin/customers/messages/chat') throw new Error('送信結果を確認できませんでした。')
      // A slow send must not navigate the user away from a different conversation.
      if (form.isConnected && context(form).threadId === ids.threadId && context(form).customerId === ids.customerId) location.assign(destination.href)
    } catch (failure) {
      error.textContent = failure.name === 'AbortError' ? '送信結果を確認できませんでした。会話履歴を確認してから再送してください。' : failure.message
      error.hidden = false
    } finally { clearTimeout(timeout); delete form.dataset.sending; buttons.forEach(button => button.disabled = false) }
  }, true)
})()
