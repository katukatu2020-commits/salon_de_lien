(() => {
  'use strict'

  if (window.__orimiaStyleAdminPostControlsV625) return
  window.__orimiaStyleAdminPostControlsV625 = true

  const LIST_PATH = '/admin/community'
  const API = '/api/lien-content-management?audience=staff'
  let scanQueued = false
  let detailLoading = ''

  const icons = {
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.1 12a10.8 10.8 0 0 1 19.8 0 10.8 10.8 0 0 1-19.8 0Z"></path><circle cx="12" cy="12" r="3"></circle></svg>',
    eyeOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m2 2 20 20"></path><path d="M6.7 6.7A10.8 10.8 0 0 0 2.1 12a10.8 10.8 0 0 0 15.2 5.3"></path><path d="M10.7 5.2A10.8 10.8 0 0 1 21.9 12a10.8 10.8 0 0 1-2.1 3.3"></path><path d="M14.1 14.1A3 3 0 0 1 9.9 9.9"></path></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="m19 6-1 14H6L5 6"></path><path d="M10 11v5M14 11v5"></path></svg>',
  }

  function normalizedPath() {
    return location.pathname.replace(/\/+$/, '') || '/'
  }

  async function requestJson(url, options) {
    const response = await fetch(url, {
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...((options && options.body) ? { 'Content-Type': 'application/json' } : {}),
        ...((options && options.headers) || {}),
      },
      ...(options || {}),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.error || '操作を完了できませんでした。')
    return payload
  }

  function showToast(message) {
    document.querySelector('[data-orimia-style-toast-v625]')?.remove()
    const toast = document.createElement('div')
    toast.className = 'orimia-style-toast-v625'
    toast.dataset.orimiaStyleToastV625 = 'true'
    toast.setAttribute('role', 'status')
    toast.textContent = message
    document.body.append(toast)
    requestAnimationFrame(() => toast.classList.add('is-visible-v625'))
    window.setTimeout(() => {
      toast.classList.remove('is-visible-v625')
      window.setTimeout(() => toast.remove(), 180)
    }, 2400)
  }

  function publishedFromCard(card) {
    return card.dataset.orimiaStylePublishedV625 === 'true'
  }

  function applyListCardState(wrapper, published) {
    const card = wrapper.querySelector(':scope > .orimia-admin-style-card-v618')
    const button = wrapper.querySelector('[data-orimia-style-visibility-v625]')
    const badge = wrapper.querySelector('[data-orimia-style-private-badge-v625]')
    if (!card || !button || !badge) return

    card.dataset.orimiaStylePublishedV625 = published ? 'true' : 'false'
    wrapper.dataset.orimiaStylePublishedV625 = published ? 'true' : 'false'
    wrapper.classList.toggle('is-private-v625', !published)
    badge.hidden = published
    button.classList.toggle('is-publish-v625', !published)
    button.innerHTML = (published ? icons.eyeOff : icons.eye) +
      '<span>' + (published ? '非公開にする' : '公開する') + '</span>'
    button.setAttribute('aria-label', published ? 'この投稿を非公開にする' : 'この投稿を公開する')
    card.setAttribute('aria-disabled', published ? 'false' : 'true')
    if (published) {
      card.removeAttribute('tabindex')
      card.setAttribute('aria-label', card.dataset.orimiaStyleOriginalLabelV625 || 'スタイル詳細を開く')
    } else {
      card.setAttribute('tabindex', '-1')
      if (!String(card.getAttribute('aria-label') || '').startsWith('非公開の投稿。')) {
        card.setAttribute('aria-label', '非公開の投稿。一覧から公開すると詳細を開けます')
      }
    }
  }

  function openDeleteDialog(postId, onDeleted) {
    if (document.querySelector('.orimia-style-delete-dialog-v625')) return
    const dialog = document.createElement('dialog')
    dialog.className = 'orimia-style-delete-dialog-v625'
    dialog.setAttribute('aria-labelledby', 'orimia-style-delete-title-v625')
    dialog.innerHTML = '<form method="dialog">' +
      '<header><h2 id="orimia-style-delete-title-v625">スタイル投稿を削除しますか？</h2>' +
        '<p>スタイル共有から非表示になります。来店履歴と施術写真の原本は残ります。</p></header>' +
      '<label class="orimia-style-delete-check-v625"><input type="checkbox" name="confirmed">' +
        '<span>この投稿を削除することを確認しました</span></label>' +
      '<p class="orimia-style-delete-feedback-v625" role="status" aria-live="polite"></p>' +
      '<footer><button type="button" data-cancel-v625>キャンセル</button>' +
        '<button type="submit" class="is-danger-v625" disabled>' + icons.trash + '<span>削除する</span></button></footer>' +
      '</form>'
    document.body.append(dialog)

    const form = dialog.querySelector('form')
    const checkbox = form.elements.confirmed
    const submit = form.querySelector('button[type="submit"]')
    const feedback = form.querySelector('[role="status"]')
    const close = () => dialog.close()
    checkbox.addEventListener('change', () => { submit.disabled = !checkbox.checked })
    dialog.querySelector('[data-cancel-v625]').addEventListener('click', close)
    dialog.addEventListener('click', event => { if (event.target === dialog) close() })
    dialog.addEventListener('close', () => dialog.remove(), { once: true })
    form.addEventListener('submit', async event => {
      event.preventDefault()
      if (!checkbox.checked) return
      submit.disabled = true
      checkbox.disabled = true
      feedback.textContent = '削除しています。'
      try {
        await requestJson(API, {
          method: 'DELETE',
          body: JSON.stringify({ target: 'post', postId }),
        })
        dialog.close()
        onDeleted?.()
        showToast('スタイル投稿を削除しました。')
      } catch (error) {
        feedback.textContent = error instanceof Error ? error.message : '削除できませんでした。'
        submit.disabled = false
        checkbox.disabled = false
      }
    })
    dialog.showModal()
    checkbox.focus()
  }

  function enhanceListCard(card) {
    if (card.closest('.orimia-admin-style-managed-card-v625')) return
    const postId = String(card.dataset.orimiaStylePostIdV625 || '').trim()
    if (!postId) return
    card.dataset.orimiaStyleOriginalLabelV625 = card.getAttribute('aria-label') || 'スタイル詳細を開く'

    const wrapper = document.createElement('article')
    wrapper.className = 'orimia-admin-style-managed-card-v625'
    wrapper.dataset.orimiaStylePostIdV625 = postId
    card.before(wrapper)
    wrapper.append(card)

    const image = card.querySelector('.orimia-admin-style-image-v618')
    const badge = document.createElement('span')
    badge.className = 'orimia-admin-style-private-badge-v625'
    badge.dataset.orimiaStylePrivateBadgeV625 = 'true'
    badge.innerHTML = icons.eyeOff + '<span>非公開</span>'
    image?.append(badge)

    const actions = document.createElement('div')
    actions.className = 'orimia-admin-style-actions-v625'
    const visibility = document.createElement('button')
    visibility.type = 'button'
    visibility.dataset.orimiaStyleVisibilityV625 = 'true'
    visibility.className = 'orimia-admin-style-visibility-v625'
    const remove = document.createElement('button')
    remove.type = 'button'
    remove.dataset.orimiaStyleDeleteV625 = 'true'
    remove.className = 'orimia-admin-style-delete-v625'
    remove.setAttribute('aria-label', 'スタイル投稿を削除')
    remove.title = '削除'
    remove.innerHTML = icons.trash
    actions.append(visibility, remove)
    wrapper.append(actions)

    card.addEventListener('click', event => {
      if (publishedFromCard(card)) return
      event.preventDefault()
      event.stopPropagation()
      showToast('非公開中の投稿です。公開すると詳細を開けます。')
    })
    visibility.addEventListener('click', async () => {
      const nextPublished = !publishedFromCard(card)
      visibility.disabled = true
      remove.disabled = true
      try {
        await requestJson(API, {
          method: 'PATCH',
          body: JSON.stringify({ target: 'post', action: 'visibility', postId, published: nextPublished }),
        })
        applyListCardState(wrapper, nextPublished)
        showToast(nextPublished ? 'スタイル投稿を公開しました。' : 'スタイル投稿を非公開にしました。')
      } catch (error) {
        showToast(error instanceof Error ? error.message : '公開状態を変更できませんでした。')
      } finally {
        visibility.disabled = false
        remove.disabled = false
      }
    })
    remove.addEventListener('click', () => openDeleteDialog(postId, () => {
      wrapper.remove()
      if (typeof window.__orimiaReloadStyleAdminV625 === 'function') window.__orimiaReloadStyleAdminV625()
    }))

    applyListCardState(wrapper, publishedFromCard(card))
  }

  function enhanceList() {
    if (normalizedPath() !== LIST_PATH) return
    const root = document.querySelector('.orimia-style-admin-v618')
    if (!root) return
    root.querySelectorAll('.orimia-admin-style-card-v618[data-orimia-style-post-id-v625]').forEach(enhanceListCard)
  }

  function buildDetailPanel(postId, post) {
    const panel = document.createElement('section')
    panel.className = 'orimia-style-detail-controls-v625'
    panel.dataset.orimiaStyleDetailControlsV625 = postId
    panel.setAttribute('aria-label', '投稿の公開管理')

    const state = document.createElement('span')
    state.className = 'orimia-style-detail-status-v625'
    const actions = document.createElement('div')
    actions.className = 'orimia-style-detail-actions-v625'
    const visibility = document.createElement('button')
    visibility.type = 'button'
    visibility.className = 'orimia-style-detail-visibility-v625'
    const remove = document.createElement('button')
    remove.type = 'button'
    remove.className = 'orimia-style-detail-delete-v625'
    remove.innerHTML = icons.trash + '<span>投稿を削除</span>'
    actions.append(visibility, remove)
    panel.append(state, actions)

    const renderState = () => {
      state.classList.toggle('is-private-v625', !post.published)
      state.textContent = post.published ? '公開中' : '非公開'
      visibility.classList.toggle('is-publish-v625', !post.published)
      visibility.innerHTML = (post.published ? icons.eyeOff : icons.eye) +
        '<span>' + (post.published ? '非公開にする' : '公開する') + '</span>'
    }
    visibility.addEventListener('click', async () => {
      const nextPublished = !post.published
      visibility.disabled = true
      remove.disabled = true
      try {
        await requestJson(API, {
          method: 'PATCH',
          body: JSON.stringify({ target: 'post', action: 'visibility', postId, published: nextPublished }),
        })
        post.published = nextPublished
        renderState()
        showToast(nextPublished ? 'スタイル投稿を公開しました。' : 'スタイル投稿を非公開にしました。')
        if (!nextPublished) window.setTimeout(() => location.assign(LIST_PATH), 220)
        else {
          visibility.disabled = false
          remove.disabled = false
        }
      } catch (error) {
        showToast(error instanceof Error ? error.message : '公開状態を変更できませんでした。')
        visibility.disabled = false
        remove.disabled = false
      }
    })
    remove.addEventListener('click', () => openDeleteDialog(postId, () => {
      window.setTimeout(() => location.assign(LIST_PATH), 220)
    }))
    renderState()
    return panel
  }

  async function enhanceDetail() {
    const match = normalizedPath().match(/^\/admin\/community\/([^/]+)$/)
    if (!match) return
    let postId = ''
    try { postId = decodeURIComponent(match[1]) } catch { return }
    if (!postId || detailLoading === postId) return
    const details = document.querySelector('.orimia-style-detail-staff-v602 .orimia-style-details-v602, main .orimia-style-details-v602')
    if (!details || document.querySelector('[data-orimia-style-detail-controls-v625="' + CSS.escape(postId) + '"]')) return

    detailLoading = postId
    try {
      const payload = await requestJson(API + '&postId=' + encodeURIComponent(postId))
      if (normalizedPath() !== '/admin/community/' + encodeURIComponent(postId)) return
      const currentDetails = document.querySelector('.orimia-style-detail-staff-v602 .orimia-style-details-v602, main .orimia-style-details-v602')
      if (!currentDetails || document.querySelector('[data-orimia-style-detail-controls-v625]')) return
      currentDetails.insertAdjacentElement('afterend', buildDetailPanel(postId, payload.post))
    } catch {
      // The surrounding page owns its not-found and authentication states.
    } finally {
      if (detailLoading === postId) detailLoading = ''
    }
  }

  function scan() {
    scanQueued = false
    enhanceList()
    void enhanceDetail()
  }

  function scheduleScan() {
    if (scanQueued) return
    scanQueued = true
    requestAnimationFrame(scan)
  }

  new MutationObserver(scheduleScan).observe(document.documentElement, { childList: true, subtree: true })
  addEventListener('popstate', scheduleScan)
  addEventListener('pageshow', scheduleScan)
  scheduleScan()
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleScan, { once: true })
})()
