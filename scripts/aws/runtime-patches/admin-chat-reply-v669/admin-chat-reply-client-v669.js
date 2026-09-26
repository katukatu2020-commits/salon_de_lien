(() => {
  'use strict'

  if (window.__orimiaAdminChatReplyV669) return
  window.__orimiaAdminChatReplyV669 = true

  const FORM_SELECTOR = 'form[action="/api/lien-chat-form"]'
  const isChatRoute = () => location.pathname === '/admin/customers/messages/chat'
    || (location.pathname === '/admin/customers/messages' && new URLSearchParams(location.search).get('chat') === '1')

  function selectedIds() {
    const params = new URLSearchParams(location.search)
    return {
      threadId: String(params.get('threadId') || '').trim().slice(0, 200),
      customerId: String(params.get('customerId') || '').trim().slice(0, 200),
    }
  }

  function syncField(form, name, value) {
    if (!value) return
    let input = form.elements.namedItem(name)
    if (!(input instanceof HTMLInputElement)) {
      input = document.createElement('input')
      input.type = 'hidden'
      input.name = name
      form.prepend(input)
    }
    if (input.value === value && input.getAttribute('value') === value) return
    input.value = value
    input.defaultValue = value
    input.setAttribute('value', value)
  }

  function syncForm(form) {
    if (!(form instanceof HTMLFormElement) || !isChatRoute()) return
    const ids = selectedIds()
    syncField(form, 'threadId', ids.threadId)
    if (!ids.threadId) syncField(form, 'customerId', ids.customerId)
    form.dataset.chatReplyContext = 'v669'
  }

  function syncAll() {
    if (!isChatRoute()) return
    document.querySelectorAll(FORM_SELECTOR).forEach(syncForm)
  }

  document.addEventListener('submit', event => {
    const form = event.target instanceof Element ? event.target.closest(FORM_SELECTOR) : null
    if (form) syncForm(form)
  }, true)

  let pending = false
  const observer = new MutationObserver(() => {
    if (pending) return
    pending = true
    queueMicrotask(() => {
      pending = false
      syncAll()
    })
  })

  function start() {
    syncAll()
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['value'] })
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true })
  else start()
  window.addEventListener('popstate', syncAll)
})()
