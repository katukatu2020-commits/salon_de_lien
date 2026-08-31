(() => {
  'use strict'

  if (window.__lienStyleCommunityControlsV509) return
  window.__lienStyleCommunityControlsV509 = true

  const audience = location.pathname.startsWith('/admin/') ? 'staff' : 'customer'
  const pencilIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>'
  const trashIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>'
  const eyeIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>'
  const eyeOffIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m2 2 20 20"/><path d="M6.71 6.71C4.94 7.94 3.65 9.64 3 12c1.73 5.35 5.67 8 9 8 1.5 0 3.06-.53 4.46-1.58"/><path d="M10.73 5.08A8.4 8.4 0 0 1 12 5c3.33 0 7.27 2.65 9 7a10.7 10.7 0 0 1-1.18 2.42"/><path d="M14.12 14.12A3 3 0 0 1 9.88 9.88"/></svg>'

  function addStyles() {
    if (document.getElementById('lien-style-community-controls-v509-style')) return
    const style = document.createElement('style')
    style.id = 'lien-style-community-controls-v509-style'
    style.textContent = `
      .lien-owner-panel{display:grid;gap:12px;margin-top:12px;padding:14px;border:1px solid #e8ded2;border-radius:18px;background:#fffdfb}
      .lien-owner-panel__top{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}
      .lien-owner-caption{min-width:0;flex:1;margin:0;white-space:pre-wrap;overflow-wrap:anywhere;color:#5b5149;font-size:14px;line-height:1.75}
      .lien-owner-caption.is-empty{color:#978b82}
      .lien-owner-actions,.lien-comment-actions{display:flex;flex:0 0 auto;align-items:center;gap:7px;flex-wrap:wrap}
      .lien-owner-status{display:inline-flex;min-height:32px;align-items:center;border-radius:999px;padding:0 11px;font-size:12px;font-weight:700}
      .lien-owner-status.is-public{background:#edf5ec;color:#49694c}.lien-owner-status.is-private{background:#f2eee9;color:#74675e}
      .lien-action-button{display:inline-flex;min-height:42px;align-items:center;justify-content:center;gap:7px;padding:0 14px;border:1px solid #e3d7cc;border-radius:999px;background:#fff;color:#5b5149;font:inherit;font-size:13px;font-weight:700;cursor:pointer;transition:background .16s ease,color .16s ease,border-color .16s ease}
      .lien-action-button:hover,.lien-action-button:focus-visible{border-color:#cfbdb0;background:#f6efe6;color:#2f2a25;outline:none}.lien-action-button.is-danger{border-color:#efd2cd;color:#943b34}.lien-action-button.is-danger:hover{background:#fff0ee;color:#7f2d27}.lien-action-button.is-primary{border-color:#8f4f42;background:#8f4f42;color:#fff}.lien-action-button.is-primary:hover{background:#7d453a;color:#fff}.lien-action-button:disabled{cursor:wait;opacity:.55}
      .lien-action-button svg{width:16px;height:16px;flex:none}
      .lien-comment-actions{margin-left:auto}.lien-comment-actions .lien-action-button{min-height:36px;padding:0 11px;font-size:12px}
      .lien-content-dialog{width:min(92vw,560px);max-height:min(82vh,680px);margin:auto;padding:0;border:1px solid #e4d7cb;border-radius:22px;background:#fffdfb;color:#2f2a25;box-shadow:0 24px 80px rgba(47,42,37,.24)}
      .lien-content-dialog::backdrop{background:rgba(47,42,37,.42);backdrop-filter:blur(2px)}
      .lien-content-dialog__body{padding:22px}.lien-content-dialog h2{margin:0;font-size:19px;line-height:1.5}.lien-content-dialog p{margin:8px 0 0;color:#786c63;font-size:13px;line-height:1.7}
      .lien-content-dialog textarea{display:block;width:100%;min-height:130px;margin-top:16px;padding:13px 14px;border:1px solid #d9cbbf;border-radius:14px;background:#fff;color:#2f2a25;font:inherit;font-size:16px;line-height:1.65;resize:vertical;outline:none;box-sizing:border-box}
      .lien-content-dialog textarea:focus{border-color:#8f4f42;box-shadow:0 0 0 4px rgba(233,201,190,.46)}
      .lien-content-dialog textarea[hidden],.lien-content-dialog [data-dialog-confirmation][hidden]{display:none!important}
      .lien-content-dialog__confirmation{margin-top:18px}.lien-content-dialog__confirmation label{display:block;margin-bottom:8px;color:#4b423c;font-size:13px;font-weight:700}.lien-content-dialog__confirmation input{display:block;width:100%;height:50px;padding:0 14px;border:1px solid #d9cbbf;border-radius:14px;background:#fff;color:#2f2a25;font:inherit;font-size:16px;line-height:50px;outline:none;box-sizing:border-box}.lien-content-dialog__confirmation input::placeholder{color:#a89b91}.lien-content-dialog__confirmation input:focus{border-color:#8f4f42;box-shadow:0 0 0 4px rgba(233,201,190,.46)}
      .lien-content-dialog__error{min-height:20px!important;margin-top:8px!important;color:#9d342d!important}
      .lien-content-dialog__actions{display:flex;justify-content:flex-end;gap:9px;margin-top:18px}.lien-content-dialog__button{min-height:44px;padding:0 18px;border:1px solid #e2d5c9;border-radius:999px;background:#fff;color:#3f3833;font:inherit;font-size:14px;font-weight:700;cursor:pointer}.lien-content-dialog__button.is-primary{border-color:#8f4f42;background:#8f4f42;color:#fff}.lien-content-dialog__button.is-danger{border-color:#9d443c;background:#9d443c;color:#fff}.lien-content-dialog__button:disabled{cursor:wait;opacity:.55}
      .lien-toast-v471{position:fixed;right:20px;bottom:24px;z-index:2147483647;max-width:min(88vw,360px);padding:13px 17px;border:1px solid #cbdcc9;border-radius:14px;background:#f3f8f2;color:#36563a;font-size:14px;font-weight:700;box-shadow:0 12px 36px rgba(47,42,37,.16)}
      .lien-style-card{min-width:0;overflow:hidden;border:1px solid #e8ded2;border-radius:12px;background:#fff;box-shadow:0 10px 28px rgba(47,42,37,.07);transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease}.lien-style-card:hover{border-color:#ddcec1;box-shadow:0 14px 34px rgba(47,42,37,.1);transform:translateY(-1px)}
      .lien-style-card__media{position:relative;display:block;width:100%;overflow:hidden;border:0!important;border-radius:0!important;background:#f4eee8}.lien-style-card__media[aria-disabled="true"]{cursor:default}.lien-style-card__media.is-private{filter:saturate(.72)}.lien-style-card__image{position:absolute;inset:0;display:block;background-position:center;background-size:cover;transition:transform .22s ease}.lien-style-card:hover .lien-style-card__image{transform:scale(1.018)}
      .lien-style-card__placeholder{position:absolute;inset:0;display:grid;place-items:center;background:linear-gradient(145deg,#f6efe6,#fff8f5);color:#9d8f85}.lien-style-card__placeholder svg{width:30px;height:30px}.lien-style-card__shade{position:absolute;inset:0;background:linear-gradient(180deg,transparent 66%,rgba(47,42,37,.24))}.lien-style-card__private-label{position:absolute;top:10px;left:10px;display:none;min-height:28px;align-items:center;gap:5px;padding:0 9px;border:1px solid rgba(255,255,255,.78);border-radius:999px;background:rgba(47,42,37,.72);color:#fff;font-size:11px;font-weight:700;backdrop-filter:blur(6px)}.lien-style-card.is-private .lien-style-card__private-label{display:inline-flex}.lien-style-card__private-label svg{width:13px;height:13px}
      .lien-style-card__footer{display:flex;min-height:58px;align-items:center;gap:8px;padding:9px;background:#fff}.lien-style-visibility{display:inline-flex;min-width:0;min-height:40px;flex:1;align-items:center;justify-content:center;gap:7px;padding:0 11px;border:1px solid #dfd3c8;border-radius:10px;background:#f8f3ee;color:#655950;font:inherit;font-size:12px;font-weight:700;cursor:pointer;transition:background .16s ease,border-color .16s ease,color .16s ease}.lien-style-visibility svg{width:15px;height:15px;flex:none}.lien-style-visibility.is-public{border-color:#c8dac6;background:#edf5ec;color:#49694c}.lien-style-visibility:hover,.lien-style-visibility:focus-visible{border-color:#8f4f42;outline:none;box-shadow:0 0 0 3px rgba(233,201,190,.38)}.lien-style-visibility:disabled{cursor:wait;opacity:.56}.lien-style-delete{display:inline-grid;width:40px;height:40px;flex:0 0 40px;place-items:center;border:1px solid #ecd4cf;border-radius:10px;background:#fff;color:#9a463e;cursor:pointer;transition:background .16s ease,border-color .16s ease,color .16s ease}.lien-style-delete svg{width:16px;height:16px}.lien-style-delete:hover,.lien-style-delete:focus-visible{border-color:#dca9a2;background:#fff1ef;color:#7f2d27;outline:none;box-shadow:0 0 0 3px rgba(233,201,190,.32)}
      .admin-chat-conversation,.lien-chat-v294__conversation,.lien-chat-v294__messages{min-width:0;overflow-x:hidden}
      [data-lien-chat-message-list="v509"]{min-width:0;overflow-x:hidden!important}
      [data-lien-chat-message]{box-sizing:border-box;min-width:0;width:fit-content;max-width:66.666667%!important}
      [data-lien-chat-body]{position:relative;box-sizing:border-box;min-width:0;max-width:100%;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word}
      [data-lien-chat-body-text]{display:block;min-width:0;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word}
      [data-lien-chat-delete-on-dblclick="v509"]{cursor:default}
      @media(max-width:639px){.lien-owner-panel{padding:12px}.lien-owner-panel__top{display:grid}.lien-owner-actions{width:100%}.lien-owner-actions .lien-action-button{flex:1}.lien-content-dialog__body{padding:18px}.lien-toast-v471{right:14px;bottom:96px}.lien-style-card__footer{gap:6px;padding:7px}.lien-style-visibility{min-height:42px;padding:0 8px}.lien-style-delete{width:42px;height:42px;flex-basis:42px}.lien-comment-actions .lien-action-button span{display:none}.lien-comment-actions .lien-action-button{width:40px;padding:0}}
      @media(prefers-reduced-motion:reduce){.lien-action-button,.lien-style-card,.lien-style-card__image,.lien-style-visibility,.lien-style-delete{transition:none}.lien-style-card:hover{transform:none}.lien-style-card:hover .lien-style-card__image{transform:none}}
    `
    document.head.appendChild(style)
  }

  function showToast(message) {
    document.querySelector('.lien-toast-v471')?.remove()
    const toast = document.createElement('div')
    toast.className = 'lien-toast-v471'
    toast.setAttribute('role', 'status')
    toast.textContent = message
    document.body.appendChild(toast)
    window.setTimeout(() => toast.remove(), 2800)
  }

  function ensureDialog() {
    let dialog = document.querySelector('[data-lien-content-dialog]')
    if (dialog) return dialog
    dialog = document.createElement('dialog')
    dialog.className = 'lien-content-dialog'
    dialog.setAttribute('data-lien-content-dialog', '1')
    dialog.innerHTML = '<div class="lien-content-dialog__body"><h2 data-dialog-title></h2><p data-dialog-description></p><textarea data-dialog-input maxlength="2000"></textarea><div class="lien-content-dialog__confirmation" data-dialog-confirmation hidden><label for="lien-delete-confirmation">確認のため「削除する」と入力してください</label><input id="lien-delete-confirmation" type="text" data-dialog-confirmation-input autocomplete="off" spellcheck="false" placeholder="削除する" maxlength="20"></div><p class="lien-content-dialog__error" data-dialog-error role="alert"></p><div class="lien-content-dialog__actions"><button type="button" class="lien-content-dialog__button" data-dialog-cancel>戻る</button><button type="button" class="lien-content-dialog__button is-primary" data-dialog-confirm>保存</button></div></div>'
    document.body.appendChild(dialog)
    dialog.querySelector('[data-dialog-cancel]').addEventListener('click', () => dialog.close())
    dialog.addEventListener('cancel', () => { dialog.querySelector('[data-dialog-error]').textContent = '' })
    return dialog
  }

  function openDialog({ title, description, value = '', maxLength = 300, confirmLabel = '保存', danger = false, input = true, confirmationText = '', onConfirm }) {
    const dialog = ensureDialog()
    const textarea = dialog.querySelector('[data-dialog-input]')
    const confirmation = dialog.querySelector('[data-dialog-confirmation]')
    const confirmationInput = dialog.querySelector('[data-dialog-confirmation-input]')
    const confirm = dialog.querySelector('[data-dialog-confirm]')
    dialog.querySelector('[data-dialog-title]').textContent = title
    dialog.querySelector('[data-dialog-description]').textContent = description
    dialog.querySelector('[data-dialog-error]').textContent = ''
    textarea.hidden = !input
    textarea.maxLength = maxLength
    textarea.value = value
    confirmation.hidden = !confirmationText
    confirmationInput.value = ''
    confirm.textContent = confirmLabel
    confirm.classList.toggle('is-danger', danger)
    confirm.classList.toggle('is-primary', !danger)
    confirm.disabled = Boolean(confirmationText)
    confirmationInput.oninput = () => {
      dialog.querySelector('[data-dialog-error]').textContent = ''
      confirm.disabled = confirmationInput.value.trim() !== confirmationText
    }
    confirmationInput.onkeydown = event => {
      if (event.key === 'Enter' && !confirm.disabled) confirm.click()
    }
    confirm.onclick = async () => {
      const nextValue = textarea.value.trim()
      if (input && !nextValue && maxLength > 300) {
        dialog.querySelector('[data-dialog-error]').textContent = '内容を入力してください。'
        return
      }
      if (confirmationText && confirmationInput.value.trim() !== confirmationText) {
        dialog.querySelector('[data-dialog-error]').textContent = `「${confirmationText}」と入力してください。`
        return
      }
      confirm.disabled = true
      try {
        await onConfirm(nextValue)
        dialog.close()
      } catch (error) {
        dialog.querySelector('[data-dialog-error]').textContent = error instanceof Error ? error.message : '操作を完了できませんでした。'
      } finally {
        confirm.disabled = confirmationText ? confirmationInput.value.trim() !== confirmationText : false
      }
    }
    dialog.showModal()
    if (input) window.setTimeout(() => textarea.focus(), 30)
    else if (confirmationText) window.setTimeout(() => confirmationInput.focus(), 30)
  }

  async function requestJson(url, options) {
    const response = await fetch(url, {
      credentials: 'same-origin',
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
    })
    const result = await response.json().catch(() => null)
    if (!response.ok) throw new Error(result?.error || '操作を完了できませんでした。')
    return result
  }

  function actionButton(label, icon, className = '') {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = `lien-action-button ${className}`.trim()
    button.setAttribute('aria-label', label)
    button.innerHTML = `${icon}<span>${label}</span>`
    return button
  }

  async function updateVisibility(postId, published) {
    return requestJson(`/api/lien-content-management?audience=staff`, {
      method: 'PATCH',
      body: JSON.stringify({ target: 'post', action: 'visibility', postId, published }),
    })
  }

  function confirmDeletePost(postId, nextPath, onDeleted) {
    openDialog({
      title: 'スタイル投稿を削除しますか？',
      description: '共有投稿と、その投稿に付いたコメント・いいねを削除します。来店履歴と施術写真の原本は残ります。この操作は取り消せません。',
      confirmLabel: '投稿を削除',
      danger: true,
      input: false,
      confirmationText: '削除する',
      onConfirm: async () => {
        await requestJson(`/api/lien-content-management?audience=${audience}`, {
          method: 'DELETE',
          body: JSON.stringify({ target: 'post', postId }),
        })
        showToast('スタイル投稿を削除しました。')
        if (typeof onDeleted === 'function') onDeleted()
        else window.setTimeout(() => location.assign(nextPath), 220)
      },
    })
  }

  function postIdFromHref(href) {
    try {
      const path = new URL(href, location.origin).pathname
      const match = path.match(/^\/admin\/community\/([^/]+)\/?$/)
      return match ? decodeURIComponent(match[1]) : ''
    } catch {
      return ''
    }
  }

  function hiddenMedia(post) {
    const link = document.createElement('a')
    link.href = `/admin/community/${encodeURIComponent(post.id)}`
    link.className = 'group relative aspect-[4/5] min-w-0 overflow-hidden bg-[#f4eee8] lien-style-card__media'
    link.setAttribute('aria-label', post.published ? 'スタイル詳細を開く' : '非公開のスタイル投稿')
    if (post.coverPhotoUrl) {
      const photo = document.createElement('span')
      photo.className = 'lien-style-card__image'
      photo.style.backgroundImage = `url(${JSON.stringify(String(post.coverPhotoUrl)).slice(1, -1)})`
      link.appendChild(photo)
    } else {
      const placeholder = document.createElement('span')
      placeholder.className = 'lien-style-card__placeholder'
      placeholder.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></svg>'
      link.appendChild(placeholder)
    }
    const shade = document.createElement('span')
    shade.className = 'lien-style-card__shade'
    link.appendChild(shade)
    return link
  }

  function applyCardState(card, post) {
    const media = card.querySelector('.lien-style-card__media')
    const visibility = card.querySelector('.lien-style-visibility')
    const label = visibility?.querySelector('span')
    card.classList.toggle('is-private', !post.published)
    media?.classList.toggle('is-private', !post.published)
    if (media) {
      media.setAttribute('aria-label', post.published ? 'スタイル詳細を開く' : '非公開のスタイル投稿')
      media.setAttribute('aria-disabled', post.published ? 'false' : 'true')
      media.tabIndex = post.published ? 0 : -1
    }
    if (visibility) {
      visibility.classList.toggle('is-public', post.published)
      visibility.setAttribute('aria-pressed', post.published ? 'true' : 'false')
      visibility.setAttribute('aria-label', post.published ? '公開中。押すと非公開に変更' : '非公開。押すと公開に変更')
      visibility.querySelector('svg')?.remove()
      visibility.insertAdjacentHTML('afterbegin', post.published ? eyeIcon : eyeOffIcon)
    }
    if (label) label.textContent = post.published ? '公開' : '非公開'
  }

  function buildManagedCard(post, media) {
    const card = document.createElement('article')
    card.className = 'lien-style-card'
    card.dataset.lienStylePostId = post.id
    media.classList.add('lien-style-card__media')
    media.addEventListener('click', event => {
      if (!post.published) event.preventDefault()
    })
    card.appendChild(media)

    const privateLabel = document.createElement('span')
    privateLabel.className = 'lien-style-card__private-label'
    privateLabel.innerHTML = `${eyeOffIcon}<span>非公開</span>`
    media.appendChild(privateLabel)

    const footer = document.createElement('div')
    footer.className = 'lien-style-card__footer'
    const visibility = document.createElement('button')
    visibility.type = 'button'
    visibility.className = 'lien-style-visibility'
    visibility.innerHTML = '<span></span>'
    visibility.addEventListener('click', async () => {
      visibility.disabled = true
      const nextPublished = !post.published
      try {
        await updateVisibility(post.id, nextPublished)
        post.published = nextPublished
        applyCardState(card, post)
        showToast(nextPublished ? '投稿を公開しました。' : '投稿を非公開にしました。')
      } catch (error) {
        showToast(error instanceof Error ? error.message : '公開状態を変更できませんでした。')
      } finally {
        visibility.disabled = false
      }
    })
    const remove = document.createElement('button')
    remove.type = 'button'
    remove.className = 'lien-style-delete'
    remove.setAttribute('aria-label', 'スタイル投稿を削除')
    remove.title = '削除'
    remove.innerHTML = trashIcon
    remove.addEventListener('click', () => confirmDeletePost(post.id, '/admin/community', () => card.remove()))
    footer.append(visibility, remove)
    card.appendChild(footer)
    applyCardState(card, post)
    return card
  }

  function managedGridIsComplete(grid) {
    if (!grid) return false
    const cards = Array.from(grid.querySelectorAll(':scope > .lien-style-card'))
    const expectedCount = Number(grid.dataset.lienStyleExpectedCountV509)
    return Number.isInteger(expectedCount) && expectedCount === cards.length && cards.every(card => {
      return card.querySelectorAll(':scope > .lien-style-card__footer').length === 1
        && card.querySelectorAll('.lien-style-visibility').length === 1
        && card.querySelectorAll('.lien-style-delete').length === 1
    })
  }

  async function enhanceCommunityList() {
    if (audience !== 'staff' || !/^\/admin\/community\/?$/.test(location.pathname)) return
    delete document.body.dataset.lienCommunityOwnerEnhancedV471
    document.querySelectorAll('[data-lien-post-manager]').forEach(manager => manager.remove())
    const currentGrid = document.querySelector('[data-lien-style-grid-managed-v509]')
    if (managedGridIsComplete(currentGrid)) return
    currentGrid?.remove()
    if (window.__lienStyleGridLoadingV509) return
    const main = document.querySelector('main')
    if (!main) return

    let payload
    window.__lienStyleGridLoadingV509 = true
    try {
      payload = await requestJson('/api/lien-content-management?audience=staff&scope=posts')
    } catch {
      return
    } finally {
      window.__lienStyleGridLoadingV509 = false
    }
    if (!/^\/admin\/community\/?$/.test(location.pathname)) return
    const restoredGrid = document.querySelector('[data-lien-style-grid-managed-v509]')
    if (managedGridIsComplete(restoredGrid)) return
    restoredGrid?.remove()

    const posts = Array.isArray(payload.posts) ? payload.posts : []
    const postById = new Map(posts.map(post => [String(post.id), post]))
    const publicLinks = Array.from(main.querySelectorAll('a[href^="/admin/community/"]')).filter(link => {
      return postIdFromHref(link.href) && (link.classList.contains('aspect-[4/5]') || Boolean(link.querySelector('[style*="background-image"]')))
    })
    const publicGrid = publicLinks[0]?.closest('.lien-style-card')?.parentElement || publicLinks[0]?.parentElement
    const emptyMessage = Array.from(main.querySelectorAll('p')).find(node => node.textContent?.includes('条件に合うスタイルはありません'))
    const emptyState = emptyMessage?.parentElement
    const resultSection = publicGrid?.parentElement
      || Array.from(main.querySelectorAll('section')).find(section => section.textContent?.includes('件を表示'))
      || document.createElement('section')

    if (!resultSection.isConnected) {
      resultSection.className = 'grid gap-4'
      if (emptyState?.isConnected) emptyState.before(resultSection)
      else main.appendChild(resultSection)
    }
    if (emptyState?.isConnected && !resultSection.contains(emptyState)) emptyState.remove()

    const summary = document.createElement('div')
    summary.className = 'flex items-center justify-between gap-3 text-xs text-[#7c7168]'
    summary.innerHTML = `<span class="inline-flex items-center gap-1.5"><span aria-hidden="true">▧</span>${posts.length}件</span><span>${posts.length ? `1〜${posts.length}件を表示` : '0件'}</span>`

    const grid = document.createElement('div')
    grid.className = 'grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'
    grid.dataset.lienStyleGridManagedV509 = '1'
    const renderedIds = new Set()
    const publicCards = []
    publicLinks.forEach(link => {
      const postId = postIdFromHref(link.href)
      if (!postId || renderedIds.has(postId)) return
      renderedIds.add(postId)
      const post = postById.get(postId) || { id: postId, published: true }
      const existingCard = link.closest('.lien-style-card')
      publicCards.push(existingCard || buildManagedCard(post, link))
    })

    const ignoredQueryKeys = new Set(['verify', 'audit', 'smoke'])
    const hasActiveFilter = Array.from(new URLSearchParams(location.search).keys()).some(key => !ignoredQueryKeys.has(key))
    const supplementalPosts = posts.filter(post => {
      if (renderedIds.has(String(post.id))) return false
      return !hasActiveFilter || !post.published
    })
    supplementalPosts.forEach(post => renderedIds.add(String(post.id)))
    const supplementalCards = supplementalPosts.map(post => buildManagedCard(post, hiddenMedia(post)))
    const renderedCount = publicCards.length + supplementalCards.length
    grid.replaceChildren(...publicCards, ...supplementalCards)
    grid.dataset.lienStyleExpectedCountV509 = String(renderedCount)
    summary.innerHTML = `<span class="inline-flex items-center gap-1.5"><span aria-hidden="true">&#9635;</span>${renderedCount}\u4ef6</span><span>${renderedCount ? `1\u301c${renderedCount}\u4ef6\u3092\u8868\u793a` : `0\u4ef6`}</span>`

    const staleManagedGrid = resultSection.querySelector('[data-lien-style-grid-managed-v471]')
    if (staleManagedGrid) staleManagedGrid.remove()
    resultSection.replaceChildren(summary, grid)
  }

  function findCommentCard(content, comment) {
    const escapedId = window.CSS?.escape ? window.CSS.escape(comment.id) : comment.id.replace(/[^a-zA-Z0-9_-]/g, '')
    const byId = content.querySelector(`[data-lien-comment-id="${escapedId}"]`)
    if (byId) return byId
    return Array.from(content.querySelectorAll('.mt-4.grid > div')).find(card => {
      const text = (card.textContent || '').replace(/\s+/g, ' ').trim()
      return text.includes(comment.authorDisplayName) && text.includes(comment.body)
    }) || null
  }

  async function enhanceCommunityDetail() {
    const match = location.pathname.match(/^\/(admin|u)\/community\/([^/?#]+)/)
    if (!match || document.body.dataset.lienCommunityOwnerEnhancedV471 === match[2]) return
    if (window.__lienCommunityDetailLoadingV471 === match[2]) return
    const article = document.querySelector('.community-detail-page article, main article')
    if (!article) return
    const postId = decodeURIComponent(match[2])
    let payload
    window.__lienCommunityDetailLoadingV471 = match[2]
    try {
      payload = await requestJson(`/api/lien-content-management?audience=${audience}&postId=${encodeURIComponent(postId)}`)
    } catch {
      return
    } finally {
      if (window.__lienCommunityDetailLoadingV471 === match[2]) window.__lienCommunityDetailLoadingV471 = ''
    }
    if (!location.pathname.includes(`/community/${match[2]}`) || document.body.dataset.lienCommunityOwnerEnhancedV471 === match[2]) return

    const content = article.querySelector('.community-feed-content') || article.querySelector(':scope > div:last-of-type')
    const meta = content?.querySelector('.community-feed-meta') || content?.querySelector(':scope > div:first-child')
    if (!content || !meta) return
    document.body.dataset.lienCommunityOwnerEnhancedV471 = postId
    content.querySelector('.lien-owner-panel')?.remove()

    const panel = document.createElement('section')
    panel.className = 'lien-owner-panel'
    panel.setAttribute('aria-label', '投稿管理')
    const top = document.createElement('div')
    top.className = 'lien-owner-panel__top'
    const caption = document.createElement('p')
    caption.className = `lien-owner-caption${payload.post.caption ? '' : ' is-empty'}`
    caption.textContent = payload.post.caption || '投稿文はありません。'
    top.appendChild(caption)
    const status = document.createElement('span')
    status.className = `lien-owner-status ${payload.post.published ? 'is-public' : 'is-private'}`
    status.textContent = payload.post.published ? '公開中' : '非公開'
    top.appendChild(status)
    panel.appendChild(top)

    if (payload.post.canEdit || payload.post.canDelete || payload.post.canChangeVisibility) {
      const actions = document.createElement('div')
      actions.className = 'lien-owner-actions'
      if (payload.post.canEdit) {
        const edit = actionButton('投稿文を編集', pencilIcon)
        edit.addEventListener('click', () => openDialog({
          title: '投稿文を編集',
          description: '写真や施術情報はそのままに、投稿文だけを更新します。',
          value: payload.post.caption || '',
          maxLength: 300,
          onConfirm: async body => {
            const result = await requestJson(`/api/lien-content-management?audience=${audience}`, {
              method: 'PATCH',
              body: JSON.stringify({ target: 'post', postId, body }),
            })
            caption.textContent = result.body || '投稿文はありません。'
            caption.classList.toggle('is-empty', !result.body)
            payload.post.caption = result.body || ''
            showToast('投稿文を更新しました。')
          },
        }))
        actions.appendChild(edit)
      }
      if (payload.post.canChangeVisibility) {
        const visibility = actionButton(payload.post.published ? '非公開にする' : '公開する', payload.post.published ? eyeOffIcon : eyeIcon, payload.post.published ? '' : 'is-primary')
        visibility.addEventListener('click', async () => {
          visibility.disabled = true
          try {
            const nextPublished = !payload.post.published
            await updateVisibility(postId, nextPublished)
            showToast(nextPublished ? '投稿を公開しました。' : '投稿を非公開にしました。')
            window.setTimeout(() => location.assign('/admin/community'), 220)
          } catch (error) {
            visibility.disabled = false
            showToast(error instanceof Error ? error.message : '公開状態を変更できませんでした。')
          }
        })
        actions.appendChild(visibility)
      }
      if (payload.post.canDelete) {
        const remove = actionButton('投稿を削除', trashIcon, 'is-danger')
        remove.addEventListener('click', () => confirmDeletePost(postId, audience === 'staff' ? '/admin/community' : '/u/community'))
        actions.appendChild(remove)
      }
      panel.appendChild(actions)
    }
    meta.insertAdjacentElement('afterend', panel)

    payload.comments.forEach(comment => {
      const card = findCommentCard(content, comment)
      if (!card || (!comment.canEdit && !comment.canDelete)) return
      card.dataset.lienCommentId = comment.id
      card.querySelector('.lien-comment-actions')?.remove()
      const heading = card.querySelector(':scope > div:first-child')
      const bodyElement = card.querySelector(':scope > p')
      if (!heading || !bodyElement) return
      heading.style.display = 'flex'
      heading.style.alignItems = 'center'
      const actions = document.createElement('div')
      actions.className = 'lien-comment-actions'
      if (comment.canEdit) {
        const edit = actionButton('編集', pencilIcon)
        edit.addEventListener('click', () => openDialog({
          title: 'コメントを編集',
          description: '自分が投稿したコメントだけを更新できます。',
          value: comment.body,
          maxLength: 300,
          onConfirm: async body => {
            const result = await requestJson(`/api/lien-content-management?audience=${audience}`, {
              method: 'PATCH',
              body: JSON.stringify({ target: 'comment', postId, id: comment.id, body }),
            })
            bodyElement.textContent = result.body
            comment.body = result.body
            showToast('コメントを更新しました。')
          },
        }))
        actions.appendChild(edit)
      }
      if (comment.canDelete) {
        const remove = actionButton('削除', trashIcon, 'is-danger')
        remove.addEventListener('click', () => openDialog({
          title: 'コメントを削除しますか？',
          description: '削除したコメントはスタイル詳細に表示されなくなります。',
          confirmLabel: 'コメントを削除',
          danger: true,
          input: false,
          onConfirm: async () => {
            await requestJson(`/api/lien-content-management?audience=${audience}`, {
              method: 'DELETE',
              body: JSON.stringify({ target: 'comment', postId, id: comment.id }),
            })
            card.remove()
            showToast('コメントを削除しました。')
          },
        }))
        actions.appendChild(remove)
      }
      heading.appendChild(actions)
    })
  }

  function enhanceChatMessages() {
    document.querySelectorAll('[data-lien-chat-message]:not([data-lien-chat-layout-v509])').forEach(row => {
      row.dataset.lienChatLayoutV509 = '1'
      const bubble = row.querySelector('[data-lien-chat-body], .lien-chat-v294__message')
      if (!bubble) return
      row.parentElement?.setAttribute('data-lien-chat-message-list', 'v509')
      bubble.setAttribute('data-lien-chat-body', '1')
      bubble.querySelector('.lien-chat-message-actions')?.remove()
      let bodyText = bubble.querySelector('[data-lien-chat-body-text]')
      if (!bodyText) {
        const currentBody = bubble.textContent || ''
        bubble.textContent = ''
        bodyText = document.createElement('span')
        bodyText.setAttribute('data-lien-chat-body-text', '1')
        bodyText.textContent = currentBody
        bubble.appendChild(bodyText)
      }
      if (row.getAttribute('data-lien-chat-can-edit') !== 'true') return
      const messageId = row.getAttribute('data-lien-chat-message')
      if (!messageId) return
      bubble.setAttribute('data-lien-chat-delete-on-dblclick', 'v509')
      bubble.addEventListener('dblclick', event => {
        event.preventDefault()
        window.getSelection()?.removeAllRanges()
        if (document.querySelector('[data-lien-content-dialog]')?.open) return
        openDialog({
          title: 'メッセージを削除しますか？',
          description: 'この操作は取り消せません。',
          confirmLabel: '削除する',
          danger: true,
          input: false,
          onConfirm: async () => {
            await requestJson(`/api/lien-chat-message?audience=${audience}`, {
              method: 'DELETE',
              body: JSON.stringify({ messageId }),
            })
            row.remove()
            showToast('メッセージを削除しました。')
          },
        })
      })
    })
  }

  function useStableCommunityNavigation(event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null
    if (!link || link.target || link.hasAttribute('download')) return
    const url = new URL(link.href, location.origin)
    if (url.origin !== location.origin || !/^\/admin\/community\/?$/.test(url.pathname)) return
    if (/^\/admin\/community\/?$/.test(location.pathname)) return
    event.preventDefault()
    event.stopImmediatePropagation()
    location.assign(url.href)
  }

  document.addEventListener('click', useStableCommunityNavigation, true)
  addStyles()
  let controlsReady = false
  let scheduleTimer = 0
  const schedule = () => {
    if (!controlsReady || scheduleTimer) return
    scheduleTimer = window.setTimeout(() => {
      scheduleTimer = 0
      void enhanceCommunityList()
      void enhanceCommunityDetail()
      enhanceChatMessages()
    }, 40)
  }
  const scheduleAfterRouteChange = () => {
    schedule()
    for (const delay of [100, 260, 620]) window.setTimeout(schedule, delay)
  }
  let activationQueued = false
  const activateControls = () => {
    if (controlsReady || activationQueued) return
    activationQueued = true
    const afterLoad = () => window.setTimeout(() => {
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
        controlsReady = true
        scheduleAfterRouteChange()
      }))
    }, 80)
    if (document.readyState === 'complete') afterLoad()
    else window.addEventListener('load', afterLoad, { once: true })
  }
  window.__lienStyleCommunityRepairV509 = () => {
    activateControls()
    scheduleAfterRouteChange()
  }
  activateControls()
  document.addEventListener('lien:chat-rendered', schedule)
  for (const method of ['pushState', 'replaceState']) {
    const original = history[method]
    history[method] = function (...args) {
      const result = original.apply(this, args)
      scheduleAfterRouteChange()
      return result
    }
  }
  window.addEventListener('popstate', scheduleAfterRouteChange)
  window.addEventListener('pageshow', scheduleAfterRouteChange)
  const communityRouteObserver = new MutationObserver(mutations => {
    if (!/^\/(?:admin|u)\/community(?:\/|$)/.test(location.pathname)) return
    if (!mutations.some(mutation => mutation.addedNodes.length || mutation.removedNodes.length)) return
    schedule()
  })
  communityRouteObserver.observe(document.documentElement, { childList: true, subtree: true })
})()
