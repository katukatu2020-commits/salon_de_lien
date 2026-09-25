;(function initializeStyleOrderInputStability(root) {
  'use strict'

  const RELEASE = 'style-order-input-stability-v666'
  const LIST_PATH = '/admin/community'
  const INPUT_SELECTOR = '.orimia-admin-style-managed-card-v625 input[name="displayOrder"]'
  if (!root?.document || root.__orimiaStyleOrderInputStabilityV666) return
  root.__orimiaStyleOrderInputStabilityV666 = true

  const drafts = new Map()
  let focusedPostId = ''
  let restoreQueued = false

  function normalizedPath() {
    return root.location.pathname.replace(/\/+$/, '') || '/'
  }

  function isOrderInput(element) {
    return element instanceof root.HTMLInputElement && element.matches(INPUT_SELECTOR)
  }

  function postIdFor(element) {
    return String(element.closest('.orimia-admin-style-managed-card-v625')?.dataset.orimiaStylePostIdV625 || '').trim()
  }

  function restoreDrafts() {
    restoreQueued = false
    if (normalizedPath() !== LIST_PATH) return

    let focusTarget = null
    root.document.querySelectorAll(INPUT_SELECTOR).forEach(input => {
      const postId = postIdFor(input)
      if (!postId) return
      if (drafts.has(postId)) {
        const draft = drafts.get(postId)
        if (input.value !== draft) input.value = draft
      }
      if (postId === focusedPostId && drafts.has(postId)) focusTarget = input
    })

    if (focusTarget && root.document.activeElement !== focusTarget) {
      root.requestAnimationFrame(() => {
        if (!focusTarget.isConnected || focusedPostId !== postIdFor(focusTarget) || !drafts.has(focusedPostId)) return
        focusTarget.focus({ preventScroll: true })
      })
    }
  }

  function queueRestore() {
    if (restoreQueued) return
    restoreQueued = true
    root.requestAnimationFrame(restoreDrafts)
  }

  function rememberDraft(event) {
    if (!isOrderInput(event.target)) return
    const postId = postIdFor(event.target)
    if (!postId) return
    drafts.set(postId, event.target.value)
    focusedPostId = postId
  }

  root.document.addEventListener('input', rememberDraft, true)
  root.document.addEventListener('change', rememberDraft, true)
  root.document.addEventListener('focusin', event => {
    if (isOrderInput(event.target)) {
      focusedPostId = postIdFor(event.target)
      return
    }
    if (focusedPostId) focusedPostId = ''
  }, true)
  root.document.addEventListener('focusout', event => {
    if (!isOrderInput(event.target)) return
    const input = event.target
    const postId = postIdFor(input)
    queueMicrotask(() => {
      if (input.isConnected && root.document.activeElement !== input && focusedPostId === postId) focusedPostId = ''
    })
  }, true)

  root.addEventListener('orimia:style-order-saved-v666', event => {
    const postId = String(event.detail?.postId || '').trim()
    if (!postId) return
    drafts.delete(postId)
    if (focusedPostId === postId) focusedPostId = ''
  })

  const style = root.document.createElement('style')
  style.id = 'orimia-style-order-input-stability-v666-style'
  style.textContent = `
    .orimia-admin-style-managed-card-v625,
    .orimia-admin-style-card-v618 {
      transition-property: border-color, box-shadow, background-color, color, opacity !important;
    }
    .orimia-admin-style-managed-card-v625:hover,
    .orimia-admin-style-card-v618:hover,
    .orimia-admin-style-managed-card-v625:hover .orimia-admin-style-card-v618 {
      transform: none !important;
    }
    .orimia-admin-style-managed-card-v625:hover img,
    .orimia-admin-style-card-v618:hover img {
      transform: none !important;
    }
  `
  root.document.head.append(style)

  new MutationObserver(queueRestore).observe(root.document.documentElement, { childList: true, subtree: true })
  root.addEventListener('pageshow', queueRestore)
  root.addEventListener('popstate', queueRestore)
  root.document.documentElement.dataset.orimiaStyleOrderInputStabilityV666 = 'ready'
  root.__orimiaStyleOrderInputStabilityStateV666 = { drafts, get focusedPostId() { return focusedPostId } }
  queueRestore()
})(typeof window === 'undefined' ? null : window)
