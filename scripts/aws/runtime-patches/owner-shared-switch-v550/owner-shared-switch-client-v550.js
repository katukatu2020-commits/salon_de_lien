;(() => {
  'use strict'

  if (window.__orimiaOwnerSharedSwitchV550) return
  window.__orimiaOwnerSharedSwitchV550 = true

  const ENDPOINT = '/api/admin/shared-account-switch'
  const SWITCHED_KEY = 'orimia:shared-account-session:v550'
  const icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><path d="m10 17 5-5-5-5"></path><path d="M15 12H3"></path></svg>'
  let capabilityPromise = null
  let scheduled = false

  function capability(force = false) {
    if (force) capabilityPromise = null
    if (!capabilityPromise) {
      capabilityPromise = fetch(ENDPOINT, {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      }).then(async response => {
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload.error || 'アカウント情報を確認できませんでした。')
        return payload
      }).catch(error => {
        capabilityPromise = null
        throw error
      })
    }
    return capabilityPromise
  }

  function removeButtons() {
    document.querySelectorAll('[data-owner-shared-switch-v550]').forEach(node => node.remove())
  }

  function showError(message) {
    let status = document.querySelector('[data-owner-shared-switch-status-v550]')
    if (!status) {
      status = document.createElement('div')
      status.className = 'owner-shared-switch-status-v550'
      status.dataset.ownerSharedSwitchStatusV550 = '1'
      status.setAttribute('role', 'status')
      status.setAttribute('aria-live', 'polite')
      document.body.appendChild(status)
    }
    status.textContent = message
    status.classList.add('is-visible')
    window.setTimeout(() => status.classList.remove('is-visible'), 4200)
  }

  async function switchToShared(button) {
    if (button.disabled) return
    const label = button.querySelector('span')
    button.disabled = true
    button.setAttribute('aria-busy', 'true')
    if (label) label.textContent = '切替中'
    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload.ok) throw new Error(payload.error || '共通アカウントへ切り替えられませんでした。')
      try { sessionStorage.setItem(SWITCHED_KEY, '1') } catch {}
      document.documentElement.classList.add('owner-shared-switching-v550')
      window.location.replace(window.location.href)
    } catch (error) {
      button.disabled = false
      button.removeAttribute('aria-busy')
      if (label) label.textContent = '共通へ切替'
      showError(error && error.message ? error.message : '共通アカウントへ切り替えられませんでした。')
    }
  }

  function addButton(currentUser) {
    const actions = currentUser.parentElement
    if (!actions || actions.querySelector('[data-owner-shared-switch-v550]')) return
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'owner-shared-switch-v550'
    button.dataset.ownerSharedSwitchV550 = '1'
    button.title = '店舗共通アカウントへ切り替え'
    button.setAttribute('aria-label', '店舗共通アカウントへ切り替え')
    button.innerHTML = `${icon}<span>共通へ切替</span>`
    button.addEventListener('click', () => switchToShared(button))
    currentUser.insertAdjacentElement('afterend', button)
  }

  async function enhance() {
    if (!(location.pathname === '/admin' || location.pathname.startsWith('/admin/')) || location.pathname === '/admin/login') {
      removeButtons()
      return
    }
    const users = [...document.querySelectorAll('[data-ca-current-user]')]
    if (!users.length) return
    try {
      const state = await capability()
      if (!state.canSwitch || state.role !== 'ADMIN') {
        removeButtons()
        return
      }
      try { sessionStorage.removeItem(SWITCHED_KEY) } catch {}
      users.forEach(addButton)
      document.documentElement.dataset.ownerSharedSwitchReady = 'v550'
    } catch {
      removeButtons()
    }
  }

  function schedule() {
    if (scheduled) return
    scheduled = true
    window.requestAnimationFrame(() => {
      scheduled = false
      enhance()
    })
  }

  window.addEventListener('pageshow', event => {
    let switched = false
    try { switched = sessionStorage.getItem(SWITCHED_KEY) === '1' } catch {}
    if (event.persisted && switched) {
      window.location.reload()
      return
    }
    capability(true).catch(() => {}).finally(schedule)
  })
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true })
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule, { once: true })
  else schedule()
})()
