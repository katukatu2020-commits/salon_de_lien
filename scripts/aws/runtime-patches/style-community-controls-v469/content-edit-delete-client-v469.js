(() => {
  'use strict'

  if (window.__lienStyleCommunityControlsV469) return
  window.__lienStyleCommunityControlsV469 = true

  const audience = location.pathname.startsWith('/admin/') ? 'staff' : 'customer'
  const pencilIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>'
  const trashIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>'
  const eyeIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>'
  const eyeOffIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m2 2 20 20"/><path d="M6.71 6.71C4.94 7.94 3.65 9.64 3 12c1.73 5.35 5.67 8 9 8 1.5 0 3.06-.53 4.46-1.58"/><path d="M10.73 5.08A8.4 8.4 0 0 1 12 5c3.33 0 7.27 2.65 9 7a10.7 10.7 0 0 1-1.18 2.42"/><path d="M14.12 14.12A3 3 0 0 1 9.88 9.88"/></svg>'

  function addStyles() {
    if (document.getElementById('lien-style-community-controls-v469-style')) return
    const style = document.createElement('style')
    style.id = 'lien-style-community-controls-v469-style'
    style.textContent = `
      .lien-owner-panel{display:grid;gap:12px;margin-top:12px;padding:14px;border:1px solid #e8ded2;border-radius:18px;background:#fffdfb}
      .lien-owner-panel__top{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}
      .lien-owner-caption{min-width:0;flex:1;margin:0;white-space:pre-wrap;overflow-wrap:anywhere;color:#5b5149;font-size:14px;line-height:1.75}
      .lien-owner-caption.is-empty{color:#978b82}
      .lien-owner-actions,.lien-comment-actions,.lien-chat-message-actions{display:flex;flex:0 0 auto;align-items:center;gap:7px;flex-wrap:wrap}
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
      .lien-content-dialog__error{min-height:20px!important;margin-top:8px!important;color:#9d342d!important}
      .lien-content-dialog__actions{display:flex;justify-content:flex-end;gap:9px;margin-top:18px}.lien-content-dialog__button{min-height:44px;padding:0 18px;border:1px solid #e2d5c9;border-radius:999px;background:#fff;color:#3f3833;font:inherit;font-size:14px;font-weight:700;cursor:pointer}.lien-content-dialog__button.is-primary{border-color:#8f4f42;background:#8f4f42;color:#fff}.lien-content-dialog__button.is-danger{border-color:#9d443c;background:#9d443c;color:#fff}.lien-content-dialog__button:disabled{cursor:wait;opacity:.55}
      .lien-toast-v469{position:fixed;right:20px;bottom:24px;z-index:2147483647;max-width:min(88vw,360px);padding:13px 17px;border:1px solid #cbdcc9;border-radius:14px;background:#f3f8f2;color:#36563a;font-size:14px;font-weight:700;box-shadow:0 12px 36px rgba(47,42,37,.16)}
      .lien-post-manager{margin:0;border:1px solid #e8ded2;border-radius:20px;background:#fff;box-shadow:0 12px 34px rgba(47,42,37,.06);overflow:hidden}[data-lien-post-manager]~[data-lien-post-manager]{display:none!important}.lien-post-manager>summary{display:flex;min-height:64px;align-items:center;justify-content:space-between;gap:16px;padding:12px 18px;cursor:pointer;list-style:none}.lien-post-manager>summary::-webkit-details-marker{display:none}.lien-post-manager__title{display:block;color:#2f2a25;font-size:15px;font-weight:700}.lien-post-manager__counts{display:block;margin-top:3px;color:#81756c;font-size:12px}.lien-post-manager__chevron{color:#8f4f42;font-size:13px;font-weight:700}.lien-post-manager__body{border-top:1px solid #eee4da;padding:10px 14px 14px}.lien-post-manager__row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;padding:11px 4px;border-bottom:1px solid #f0e8e0}.lien-post-manager__row:last-child{border-bottom:0}.lien-post-manager__name{min-width:0;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#403832;font-size:13px;font-weight:700}.lien-post-manager__meta{margin:4px 0 0;color:#8b8178;font-size:11px}.lien-post-manager__actions{display:flex;align-items:center;justify-content:flex-end;gap:7px;flex-wrap:wrap}.lien-post-manager__empty{margin:0;padding:16px 4px 6px;color:#81756c;font-size:13px}
      [data-lien-chat-body]{position:relative}.lien-chat-message-actions{justify-content:flex-end;margin-top:7px;padding-top:5px;border-top:1px solid rgba(127,105,94,.18)}.lien-chat-message-actions .lien-action-button{min-height:34px;padding:0 10px;color:inherit;background:transparent;opacity:.8}.lien-chat-message-actions .lien-action-button:hover{background:rgba(255,255,255,.2);color:inherit;opacity:1}
      @media(max-width:639px){.lien-owner-panel{padding:12px}.lien-owner-panel__top{display:grid}.lien-owner-actions{width:100%}.lien-owner-actions .lien-action-button{flex:1}.lien-content-dialog__body{padding:18px}.lien-toast-v469{right:14px;bottom:96px}.lien-post-manager__row{grid-template-columns:1fr}.lien-post-manager__actions{justify-content:flex-start}.lien-comment-actions .lien-action-button span{display:none}.lien-comment-actions .lien-action-button{width:40px;padding:0}}
      @media(prefers-reduced-motion:reduce){.lien-action-button{transition:none}}
    `
    document.head.appendChild(style)
  }

  function showToast(message) {
    document.querySelector('.lien-toast-v469')?.remove()
    const toast = document.createElement('div')
    toast.className = 'lien-toast-v469'
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
    dialog.innerHTML = '<div class="lien-content-dialog__body"><h2 data-dialog-title></h2><p data-dialog-description></p><textarea data-dialog-input maxlength="2000"></textarea><p class="lien-content-dialog__error" data-dialog-error role="alert"></p><div class="lien-content-dialog__actions"><button type="button" class="lien-content-dialog__button" data-dialog-cancel>戻る</button><button type="button" class="lien-content-dialog__button is-primary" data-dialog-confirm>保存</button></div></div>'
    document.body.appendChild(dialog)
    dialog.querySelector('[data-dialog-cancel]').addEventListener('click', () => dialog.close())
    dialog.addEventListener('cancel', () => { dialog.querySelector('[data-dialog-error]').textContent = '' })
    return dialog
  }

  function openDialog({ title, description, value = '', maxLength = 300, confirmLabel = '保存', danger = false, input = true, onConfirm }) {
    const dialog = ensureDialog()
    const textarea = dialog.querySelector('[data-dialog-input]')
    const confirm = dialog.querySelector('[data-dialog-confirm]')
    dialog.querySelector('[data-dialog-title]').textContent = title
    dialog.querySelector('[data-dialog-description]').textContent = description
    dialog.querySelector('[data-dialog-error]').textContent = ''
    textarea.hidden = !input
    textarea.maxLength = maxLength
    textarea.value = value
    confirm.textContent = confirmLabel
    confirm.classList.toggle('is-danger', danger)
    confirm.classList.toggle('is-primary', !danger)
    confirm.onclick = async () => {
      const nextValue = textarea.value.trim()
      if (input && !nextValue && maxLength > 300) {
        dialog.querySelector('[data-dialog-error]').textContent = '内容を入力してください。'
        return
      }
      confirm.disabled = true
      try {
        await onConfirm(nextValue)
        dialog.close()
      } catch (error) {
        dialog.querySelector('[data-dialog-error]').textContent = error instanceof Error ? error.message : '操作を完了できませんでした。'
      } finally {
        confirm.disabled = false
      }
    }
    dialog.showModal()
    if (input) window.setTimeout(() => textarea.focus(), 30)
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

  function formatDate(value) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'numeric', day: 'numeric' }).format(date)
  }

  function dedupePostManagers() {
    document.querySelectorAll('[data-lien-post-manager]').forEach((manager, index) => {
      if (index > 0) manager.remove()
    })
  }

  async function updateVisibility(postId, published) {
    return requestJson(`/api/lien-content-management?audience=staff`, {
      method: 'PATCH',
      body: JSON.stringify({ target: 'post', action: 'visibility', postId, published }),
    })
  }

  function confirmDeletePost(postId, nextPath) {
    openDialog({
      title: 'スタイル投稿を削除しますか？',
      description: '共有投稿と、その投稿に付いたコメント・いいねを削除します。来店履歴と施術写真の原本は残ります。この操作は取り消せません。',
      confirmLabel: '投稿を削除',
      danger: true,
      input: false,
      onConfirm: async () => {
        await requestJson(`/api/lien-content-management?audience=${audience}`, {
          method: 'DELETE',
          body: JSON.stringify({ target: 'post', postId }),
        })
        showToast('スタイル投稿を削除しました。')
        window.setTimeout(() => location.assign(nextPath), 220)
      },
    })
  }

  async function enhanceCommunityList() {
    if (audience !== 'staff' || !/^\/admin\/community\/?$/.test(location.pathname)) return
    const existingManagers = document.querySelectorAll('[data-lien-post-manager]')
    if (existingManagers.length) {
      dedupePostManagers()
      return
    }
    if (window.__lienPostManagerLoadingV469) return
    const main = document.querySelector('main')
    const heading = main?.querySelector('h1')
    if (!main || !heading) return

    let payload
    window.__lienPostManagerLoadingV469 = true
    try {
      payload = await requestJson('/api/lien-content-management?audience=staff&scope=posts')
    } catch {
      return
    } finally {
      window.__lienPostManagerLoadingV469 = false
    }
    if (!/^\/admin\/community\/?$/.test(location.pathname) || document.querySelector('[data-lien-post-manager]')) return

    const posts = Array.isArray(payload.posts) ? payload.posts : []
    const publishedCount = posts.filter(post => post.published).length
    const hiddenCount = posts.length - publishedCount
    const details = document.createElement('details')
    details.className = 'lien-post-manager'
    details.dataset.lienPostManager = '1'
    details.open = hiddenCount > 0
    details.innerHTML = `<summary><span><span class="lien-post-manager__title">投稿の公開管理</span><span class="lien-post-manager__counts">公開中 ${publishedCount}件 ・ 非公開 ${hiddenCount}件</span></span><span class="lien-post-manager__chevron">一覧を開く</span></summary><div class="lien-post-manager__body"></div>`
    details.addEventListener('toggle', () => {
      const label = details.querySelector('.lien-post-manager__chevron')
      if (label) label.textContent = details.open ? '一覧を閉じる' : '一覧を開く'
    })
    const body = details.querySelector('.lien-post-manager__body')
    if (!posts.length) {
      body.innerHTML = '<p class="lien-post-manager__empty">管理できるスタイル投稿はまだありません。</p>'
    } else {
      posts.forEach(post => {
        const row = document.createElement('div')
        row.className = 'lien-post-manager__row'
        const identity = post.caption || post.publishedByName || (post.postKind === 'STORE' ? '店舗スタイル投稿' : '来店スタイル投稿')
        row.innerHTML = `<div><p class="lien-post-manager__name"></p><p class="lien-post-manager__meta">${formatDate(post.publishedAt)} ・ ${post.published ? '公開中' : '非公開'}</p></div><div class="lien-post-manager__actions"></div>`
        row.querySelector('.lien-post-manager__name').textContent = identity
        const actions = row.querySelector('.lien-post-manager__actions')
        if (post.published) {
          const detail = document.createElement('a')
          detail.href = `/admin/community/${encodeURIComponent(post.id)}`
          detail.className = 'lien-action-button'
          detail.textContent = '詳細'
          actions.appendChild(detail)
        }
        const visibility = actionButton(post.published ? '非公開にする' : '公開する', post.published ? eyeOffIcon : eyeIcon, post.published ? '' : 'is-primary')
        visibility.addEventListener('click', async () => {
          visibility.disabled = true
          try {
            await updateVisibility(post.id, !post.published)
            showToast(post.published ? '投稿を非公開にしました。' : '投稿を公開しました。')
            window.setTimeout(() => location.reload(), 220)
          } catch (error) {
            visibility.disabled = false
            showToast(error instanceof Error ? error.message : '公開状態を変更できませんでした。')
          }
        })
        const remove = actionButton('削除', trashIcon, 'is-danger')
        remove.addEventListener('click', () => confirmDeletePost(post.id, '/admin/community'))
        actions.append(visibility, remove)
        body.appendChild(row)
      })
    }

    const headerSection = heading.closest('section') || heading.parentElement
    if (headerSection?.parentElement === main) headerSection.insertAdjacentElement('afterend', details)
    else main.insertBefore(details, main.firstChild)
    dedupePostManagers()
    window.setTimeout(dedupePostManagers, 120)
    window.setTimeout(dedupePostManagers, 420)
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
    if (!match || document.body.dataset.lienCommunityOwnerEnhancedV469 === match[2]) return
    if (window.__lienCommunityDetailLoadingV469 === match[2]) return
    const article = document.querySelector('.community-detail-page article, main article')
    if (!article) return
    const postId = decodeURIComponent(match[2])
    let payload
    window.__lienCommunityDetailLoadingV469 = match[2]
    try {
      payload = await requestJson(`/api/lien-content-management?audience=${audience}&postId=${encodeURIComponent(postId)}`)
    } catch {
      return
    } finally {
      if (window.__lienCommunityDetailLoadingV469 === match[2]) window.__lienCommunityDetailLoadingV469 = ''
    }
    if (!location.pathname.includes(`/community/${match[2]}`) || document.body.dataset.lienCommunityOwnerEnhancedV469 === match[2]) return

    const content = article.querySelector('.community-feed-content') || article.querySelector(':scope > div:last-of-type')
    const meta = content?.querySelector('.community-feed-meta') || content?.querySelector(':scope > div:first-child')
    if (!content || !meta) return
    document.body.dataset.lienCommunityOwnerEnhancedV469 = postId
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
    document.querySelectorAll('[data-lien-chat-message][data-lien-chat-can-edit="true"]:not([data-lien-chat-enhanced])').forEach(row => {
      row.dataset.lienChatEnhanced = '1'
      const bubble = row.querySelector('[data-lien-chat-body], .lien-chat-v294__message')
      if (!bubble) return
      bubble.setAttribute('data-lien-chat-body', '1')
      const currentBody = bubble.textContent || ''
      bubble.textContent = ''
      const bodyText = document.createElement('span')
      bodyText.setAttribute('data-lien-chat-body-text', '1')
      bodyText.style.whiteSpace = 'pre-wrap'
      bodyText.textContent = currentBody
      bubble.appendChild(bodyText)
      const actions = document.createElement('div')
      actions.className = 'lien-chat-message-actions'
      const edit = actionButton('編集', pencilIcon)
      const remove = actionButton('削除', trashIcon, 'is-danger')
      const messageId = row.getAttribute('data-lien-chat-message')
      edit.addEventListener('click', () => openDialog({
        title: 'メッセージを編集',
        description: '自分が送信したメッセージだけを更新できます。',
        value: bodyText.textContent || '',
        maxLength: 2000,
        onConfirm: async body => {
          const result = await requestJson(`/api/lien-chat-message?audience=${audience}`, {
            method: 'PATCH',
            body: JSON.stringify({ messageId, body }),
          })
          bodyText.textContent = result.body
          showToast('メッセージを更新しました。')
        },
      }))
      remove.addEventListener('click', () => openDialog({
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
      }))
      actions.append(edit, remove)
      bubble.appendChild(actions)
    })
  }

  addStyles()
  const schedule = () => {
    window.clearTimeout(window.__lienStyleCommunityControlsTimerV469)
    window.__lienStyleCommunityControlsTimerV469 = window.setTimeout(() => {
      void enhanceCommunityList()
      void enhanceCommunityDetail()
      enhanceChatMessages()
    }, 40)
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule, { once: true })
  else schedule()
  const scheduleAfterRouteChange = () => {
    schedule()
    window.setTimeout(schedule, 220)
  }
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
  window.addEventListener('pageshow', schedule)
})()
