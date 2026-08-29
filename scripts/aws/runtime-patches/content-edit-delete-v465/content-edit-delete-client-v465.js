(() => {
  'use strict'

  if (window.__lienContentEditDeleteV465) return
  window.__lienContentEditDeleteV465 = true

  const audience = location.pathname.startsWith('/admin/') ? 'staff' : 'customer'
  const pencilIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>'
  const trashIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>'

  function addStyles() {
    if (document.getElementById('lien-content-edit-delete-v465-style')) return
    const style = document.createElement('style')
    style.id = 'lien-content-edit-delete-v465-style'
    style.textContent = `
      .lien-owner-panel{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-top:12px;padding:12px 14px;border:1px solid #e8ded2;border-radius:16px;background:#fffdfb}
      .lien-owner-caption{min-width:0;flex:1;margin:0;white-space:pre-wrap;overflow-wrap:anywhere;color:#5b5149;font-size:14px;line-height:1.75}
      .lien-owner-caption.is-empty{color:#978b82}
      .lien-owner-actions,.lien-comment-actions,.lien-chat-message-actions{display:flex;flex:0 0 auto;align-items:center;gap:4px}
      .lien-owner-icon-button{display:inline-flex;width:42px;height:42px;align-items:center;justify-content:center;border:0;border-radius:999px;background:transparent;color:#6f6259;cursor:pointer;transition:background .16s ease,color .16s ease}
      .lien-owner-icon-button:hover,.lien-owner-icon-button:focus-visible{background:#f6efe6;color:#2f2a25;outline:none}
      .lien-owner-icon-button.is-delete{color:#9d443c}.lien-owner-icon-button.is-delete:hover,.lien-owner-icon-button.is-delete:focus-visible{background:#fff0ee;color:#842f29}
      .lien-owner-icon-button svg{width:17px;height:17px}
      .lien-comment-actions{margin-left:auto}.lien-comment-actions .lien-owner-icon-button{width:40px;height:40px}
      .lien-content-dialog{width:min(92vw,560px);max-height:min(82vh,680px);margin:auto;padding:0;border:1px solid #e4d7cb;border-radius:22px;background:#fffdfb;color:#2f2a25;box-shadow:0 24px 80px rgba(47,42,37,.24)}
      .lien-content-dialog::backdrop{background:rgba(47,42,37,.42);backdrop-filter:blur(2px)}
      .lien-content-dialog__body{padding:22px}.lien-content-dialog h2{margin:0;font-size:19px;line-height:1.5}.lien-content-dialog p{margin:8px 0 0;color:#786c63;font-size:13px;line-height:1.7}
      .lien-content-dialog textarea{display:block;width:100%;min-height:130px;margin-top:16px;padding:13px 14px;border:1px solid #d9cbbf;border-radius:14px;background:#fff;color:#2f2a25;font:inherit;font-size:16px;line-height:1.65;resize:vertical;outline:none;box-sizing:border-box}
      .lien-content-dialog textarea:focus{border-color:#8f4f42;box-shadow:0 0 0 4px rgba(233,201,190,.46)}
      .lien-content-dialog__error{min-height:20px!important;margin-top:8px!important;color:#9d342d!important}
      .lien-content-dialog__actions{display:flex;justify-content:flex-end;gap:9px;margin-top:18px}
      .lien-content-dialog__button{min-height:44px;padding:0 18px;border:1px solid #e2d5c9;border-radius:999px;background:#fff;color:#3f3833;font:inherit;font-size:14px;font-weight:700;cursor:pointer}
      .lien-content-dialog__button.is-primary{border-color:#8f4f42;background:#8f4f42;color:#fff}.lien-content-dialog__button.is-danger{border-color:#9d443c;background:#9d443c;color:#fff}
      .lien-content-dialog__button:disabled{cursor:wait;opacity:.55}
      .lien-toast-v465{position:fixed;right:20px;bottom:24px;z-index:2147483647;max-width:min(88vw,360px);padding:13px 17px;border:1px solid #cbdcc9;border-radius:14px;background:#f3f8f2;color:#36563a;font-size:14px;font-weight:700;box-shadow:0 12px 36px rgba(47,42,37,.16)}
      [data-lien-chat-body]{position:relative}.lien-chat-message-actions{justify-content:flex-end;margin-top:7px;padding-top:5px;border-top:1px solid rgba(127,105,94,.18)}
      .lien-chat-message-actions .lien-owner-icon-button{width:36px;height:36px;color:inherit;opacity:.78}.lien-chat-message-actions .lien-owner-icon-button:hover{background:rgba(255,255,255,.2);color:inherit;opacity:1}
      @media(max-width:639px){.lien-owner-panel{padding:11px 12px}.lien-content-dialog__body{padding:18px}.lien-toast-v465{right:14px;bottom:96px}.lien-owner-icon-button{width:44px;height:44px}}
      @media(prefers-reduced-motion:reduce){.lien-owner-icon-button{transition:none}}
    `
    document.head.appendChild(style)
  }

  function showToast(message) {
    document.querySelector('.lien-toast-v465')?.remove()
    const toast = document.createElement('div')
    toast.className = 'lien-toast-v465'
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
    const response = await fetch(url, { credentials: 'same-origin', ...options, headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) } })
    const result = await response.json().catch(() => null)
    if (!response.ok) throw new Error(result?.error || '操作を完了できませんでした。')
    return result
  }

  function actionButton(label, icon, className = '') {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = `lien-owner-icon-button ${className}`.trim()
    button.setAttribute('aria-label', label)
    button.title = label
    button.innerHTML = icon
    return button
  }

  async function enhanceCommunity() {
    const match = location.pathname.match(/^\/(admin|u)\/community\/([^/?#]+)/)
    if (!match || document.body.dataset.lienCommunityOwnerEnhanced === match[2]) return
    const article = document.querySelector('.community-detail-page article, main article')
    if (!article) return
    const postId = decodeURIComponent(match[2])
    let payload
    try {
      payload = await requestJson(`/api/lien-content-management?audience=${audience}&postId=${encodeURIComponent(postId)}`)
    } catch { return }
    const content = article.querySelector(':scope > div:last-of-type')
    const meta = content?.querySelector(':scope > div:first-child')
    if (!content || !meta) return
    document.body.dataset.lienCommunityOwnerEnhanced = postId

    const panel = document.createElement('section')
    panel.className = 'lien-owner-panel'
    panel.setAttribute('aria-label', '投稿内容')
    const caption = document.createElement('p')
    caption.className = `lien-owner-caption${payload.post.caption ? '' : ' is-empty'}`
    caption.textContent = payload.post.caption || '投稿文はありません。'
    panel.appendChild(caption)
    if (payload.post.canEdit || payload.post.canDelete) {
      const actions = document.createElement('div')
      actions.className = 'lien-owner-actions'
      if (payload.post.canEdit) {
        const edit = actionButton('投稿を編集', pencilIcon)
        edit.addEventListener('click', () => openDialog({
          title: '投稿文を編集', description: '写真や施術情報はそのままに、投稿文を更新します。', value: payload.post.caption || '', maxLength: 300,
          onConfirm: async body => {
            const result = await requestJson(`/api/lien-content-management?audience=${audience}`, { method: 'PATCH', body: JSON.stringify({ target: 'post', postId, body }) })
            caption.textContent = result.body || '投稿文はありません。'
            caption.classList.toggle('is-empty', !result.body)
            payload.post.caption = result.body || ''
            showToast('投稿を更新しました。')
          }
        }))
        actions.appendChild(edit)
      }
      if (payload.post.canDelete) {
        const remove = actionButton('投稿を削除', trashIcon, 'is-delete')
        remove.addEventListener('click', () => openDialog({
          title: '投稿を削除しますか？', description: 'スタイル共有から非表示になります。施術履歴と写真の原本は削除されません。', confirmLabel: '削除する', danger: true, input: false,
          onConfirm: async () => {
            await requestJson(`/api/lien-content-management?audience=${audience}`, { method: 'DELETE', body: JSON.stringify({ target: 'post', postId }) })
            location.assign(audience === 'staff' ? '/admin/community' : '/u/community')
          }
        }))
        actions.appendChild(remove)
      }
      panel.appendChild(actions)
    }
    meta.insertAdjacentElement('afterend', panel)

    const cards = Array.from(content.querySelectorAll(':scope > div.mt-4.grid > div'))
    payload.comments.forEach((comment, index) => {
      const card = cards[index]
      if (!card) return
      card.dataset.lienCommentId = comment.id
      if (!comment.canEdit && !comment.canDelete) return
      const heading = card.querySelector(':scope > div:first-child')
      const bodyElement = card.querySelector(':scope > p')
      if (!heading || !bodyElement) return
      heading.style.display = 'flex'
      heading.style.alignItems = 'center'
      const actions = document.createElement('div')
      actions.className = 'lien-comment-actions'
      if (comment.canEdit) {
        const edit = actionButton('コメントを編集', pencilIcon)
        edit.addEventListener('click', () => openDialog({
          title: 'コメントを編集', description: '自分が投稿したコメントだけを更新できます。', value: comment.body, maxLength: 300,
          onConfirm: async body => {
            const result = await requestJson(`/api/lien-content-management?audience=${audience}`, { method: 'PATCH', body: JSON.stringify({ target: 'comment', postId, id: comment.id, body }) })
            bodyElement.textContent = result.body
            comment.body = result.body
            showToast('コメントを更新しました。')
          }
        }))
        actions.appendChild(edit)
      }
      if (comment.canDelete) {
        const remove = actionButton('コメントを削除', trashIcon, 'is-delete')
        remove.addEventListener('click', () => openDialog({
          title: 'コメントを削除しますか？', description: '削除したコメントは一覧に表示されなくなります。', confirmLabel: '削除する', danger: true, input: false,
          onConfirm: async () => {
            await requestJson(`/api/lien-content-management?audience=${audience}`, { method: 'DELETE', body: JSON.stringify({ target: 'comment', postId, id: comment.id }) })
            card.remove()
            showToast('コメントを削除しました。')
          }
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
      const edit = actionButton('メッセージを編集', pencilIcon)
      const remove = actionButton('メッセージを削除', trashIcon, 'is-delete')
      const messageId = row.getAttribute('data-lien-chat-message')
      edit.addEventListener('click', () => openDialog({
        title: 'メッセージを編集', description: '自分が送信したメッセージだけを更新できます。', value: bodyText.textContent || '', maxLength: 2000,
        onConfirm: async body => {
          const result = await requestJson(`/api/lien-chat-message?audience=${audience}`, { method: 'PATCH', body: JSON.stringify({ messageId, body }) })
          bodyText.textContent = result.body
          showToast('メッセージを更新しました。')
        }
      }))
      remove.addEventListener('click', () => openDialog({
        title: 'メッセージを削除しますか？', description: 'この操作は取り消せません。', confirmLabel: '削除する', danger: true, input: false,
        onConfirm: async () => {
          await requestJson(`/api/lien-chat-message?audience=${audience}`, { method: 'DELETE', body: JSON.stringify({ messageId }) })
          row.remove()
          showToast('メッセージを削除しました。')
        }
      }))
      actions.append(edit, remove)
      bubble.appendChild(actions)
    })
  }

  addStyles()
  const schedule = () => {
    window.clearTimeout(window.__lienContentEditDeleteTimer)
    window.__lienContentEditDeleteTimer = window.setTimeout(() => {
      void enhanceCommunity()
      enhanceChatMessages()
    }, 40)
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule, { once: true })
  else schedule()
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true })
  window.addEventListener('pageshow', schedule)
})()
