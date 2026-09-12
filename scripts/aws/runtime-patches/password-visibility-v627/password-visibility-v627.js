(() => {
  'use strict'

  if (window.__orimiaPasswordVisibilityV627) return
  window.__orimiaPasswordVisibilityV627 = true

  const release = 'v627'
  const allowedPaths = new Set(['/u/login', '/admin/login', '/dealer/login'])
  const normalizePath = value => String(value || '/').replace(/\/+$/, '') || '/'
  let sequence = 0
  let scanQueued = false

  const icons = {
    hidden: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"></path><circle cx="12" cy="12" r="3"></circle></svg>',
    visible: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"></path><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"></path><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"></path><path d="m2 2 20 20"></path></svg>',
  }

  function setButtonState(button, visible) {
    const label = visible ? 'パスワードを隠す' : 'パスワードを表示'
    button.dataset.orimiaPasswordVisibleV627 = visible ? 'true' : 'false'
    button.setAttribute('aria-label', label)
    button.setAttribute('title', label)
    button.setAttribute('aria-pressed', visible ? 'true' : 'false')
    button.innerHTML = visible ? icons.visible : icons.hidden
  }

  function selectionOf(input) {
    try {
      return { start: input.selectionStart, end: input.selectionEnd, direction: input.selectionDirection }
    } catch {
      return null
    }
  }

  function restoreSelection(input, selection) {
    if (!selection || selection.start === null || selection.end === null) return
    try {
      input.setSelectionRange(selection.start, selection.end, selection.direction || 'none')
    } catch {
      // Selection APIs can be unavailable for password inputs in older browsers.
    }
  }

  function enhance(input) {
    if (!(input instanceof HTMLInputElement) || input.dataset.orimiaPasswordVisibilityV627 === release) return
    if (input.name !== 'password' || input.autocomplete !== 'current-password') return

    const parent = input.parentNode
    if (!parent) return

    input.dataset.orimiaPasswordVisibilityV627 = release
    input.classList.add('orimia-password-input-v627')
    if (!input.id) input.id = `orimia-password-input-v627-${++sequence}`

    const field = document.createElement('span')
    field.className = 'orimia-password-field-v627'
    field.dataset.orimiaPasswordFieldV627 = release
    parent.insertBefore(field, input)
    field.appendChild(input)

    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'orimia-password-toggle-v627'
    button.dataset.orimiaPasswordToggleV627 = release
    button.setAttribute('aria-controls', input.id)
    setButtonState(button, false)

    let pointerActivation = false
    let pointerSelection = null
    button.addEventListener('pointerdown', event => {
      if (event.button !== 0) return
      pointerActivation = true
      pointerSelection = selectionOf(input)
      event.preventDefault()
    })
    button.addEventListener('mousedown', event => {
      if (event.button !== 0) return
      pointerActivation = true
      if (!pointerSelection) pointerSelection = selectionOf(input)
      event.preventDefault()
    })
    button.addEventListener('keydown', () => {
      pointerActivation = false
      pointerSelection = null
    })
    button.addEventListener('click', () => {
      const selection = pointerActivation ? pointerSelection : selectionOf(input)
      const visible = input.type !== 'text'
      input.type = visible ? 'text' : 'password'
      setButtonState(button, visible)

      if (pointerActivation) {
        const restorePointerState = () => {
          input.focus({ preventScroll: true })
          restoreSelection(input, selection)
        }
        restorePointerState()
        requestAnimationFrame(restorePointerState)
      }
      pointerActivation = false
      pointerSelection = null
    })

    field.appendChild(button)
  }

  function scan(root = document) {
    if (!allowedPaths.has(normalizePath(location.pathname))) return
    if (root instanceof HTMLInputElement) enhance(root)
    if (!(root instanceof Element || root instanceof Document)) return
    root.querySelectorAll('input[name="password"][autocomplete="current-password"]').forEach(enhance)
  }

  function scheduleScan(root = document) {
    if (scanQueued) return
    scanQueued = true
    requestAnimationFrame(() => {
      scanQueued = false
      scan(root)
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => scheduleScan(), { once: true })
  } else {
    scheduleScan()
  }

  new MutationObserver(records => {
    if (!allowedPaths.has(normalizePath(location.pathname))) return
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node instanceof Element) scan(node)
      }
    }
  }).observe(document.documentElement, { childList: true, subtree: true })
})()
