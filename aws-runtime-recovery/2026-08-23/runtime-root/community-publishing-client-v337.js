;(() => {
  if (window.__lienCommunityPublishingV337) return
  window.__lienCommunityPublishingV337 = true

  const icon = name => ({
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>',
  }[name] || '')

  const pageHref = () => {
    const path = location.pathname
    const roots = ['/admin/appointments', '/admin/customers', '/admin/products', '/admin/community', '/admin/owner-analytics', '/admin/settings', '/admin/account']
    return roots.find(root => path === root || path.startsWith(root + '/')) || '/admin/customers'
  }

  const decoratePageLabel = () => {
    const block = document.querySelector('.admin-desktop-header > .min-w-0')
    if (!block || block.dataset.caPageLink === pageHref()) return
    block.dataset.caPageLink = pageHref()
    block.setAttribute('role', 'link')
    block.setAttribute('tabindex', '0')
    block.setAttribute('aria-label', `${block.lastElementChild?.textContent?.trim() || '現在のページ'}を開く`)
    block.title = 'このページの先頭を開く'
    block.onclick = () => location.assign(pageHref())
    block.onkeydown = event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        location.assign(pageHref())
      }
    }
  }

  const css = document.createElement('style')
  css.id = 'ca-community-publishing-v337-style'
  css.textContent = `
    .admin-desktop-header>.min-w-0[role="link"]{position:relative;min-width:116px;padding:5px 30px 5px 8px;border-radius:12px;cursor:pointer;transition:.18s ease}
    .admin-desktop-header>.min-w-0[role="link"]:after{content:"›";position:absolute;right:10px;top:50%;font-size:20px;color:var(--lien-primary);transform:translateY(-50%)}
    .admin-desktop-header>.min-w-0[role="link"]:hover,.admin-desktop-header>.min-w-0[role="link"]:focus-visible{background:var(--lien-surface-soft);outline:none;box-shadow:0 0 0 2px var(--lien-primary-soft)}
    .ca-community-actions{display:flex;width:100%;flex-wrap:wrap;gap:8px;flex-shrink:0}.ca-community-publish-open{display:inline-flex;min-height:44px;align-items:center;justify-content:center;gap:8px;border:0;border-radius:999px;background:linear-gradient(135deg,#c94f70,#ad3f60);padding:0 20px;color:#fff;font-size:13px;font-weight:800;box-shadow:0 12px 26px rgba(157,55,83,.22);transition:.18s ease}.ca-community-publish-open:hover{transform:translateY(-1px);box-shadow:0 15px 30px rgba(157,55,83,.27)}.ca-community-publish-open svg{width:18px;height:18px}
    .ca-cp-backdrop{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;background:rgba(54,39,34,.46);padding:18px;backdrop-filter:blur(8px)}.ca-cp-dialog{display:flex;width:min(760px,100%);max-height:calc(100dvh - 36px);flex-direction:column;overflow:hidden;border:1px solid #ead8d1;border-radius:26px;background:#fffdfb;box-shadow:0 30px 90px rgba(58,38,31,.24)}.ca-cp-head{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;padding:22px 24px 18px;border-bottom:1px solid #eee0da}.ca-cp-head small{display:block;color:#b84767;font-size:10px;font-weight:900;letter-spacing:.13em}.ca-cp-head h2{margin:5px 0 0;font-family:"Yu Mincho","Hiragino Mincho ProN",serif;font-size:24px}.ca-cp-head p{margin:7px 0 0;color:#81736d;font-size:12px}.ca-cp-close{display:grid;width:40px;height:40px;flex:0 0 auto;place-items:center;border:1px solid #ead8d1;border-radius:50%;background:#fff;color:#755f57}.ca-cp-close svg{width:18px;height:18px}.ca-cp-body{display:grid;gap:20px;overflow:auto;padding:22px 24px 26px}.ca-cp-field>label,.ca-cp-label{display:block;margin-bottom:8px;color:#352d29;font-size:12px;font-weight:800}.ca-cp-search{position:relative}.ca-cp-search svg{position:absolute;left:14px;top:50%;width:17px;height:17px;color:#aa948c;transform:translateY(-50%)}.ca-cp-search input,.ca-cp-field textarea{width:100%;border:1px solid #e8d8d1;border-radius:14px;background:#fff;padding:13px 14px;color:#342e2b;font-size:13px;outline:none}.ca-cp-search input{padding-left:42px}.ca-cp-search input:focus,.ca-cp-field textarea:focus{border-color:#c65372;box-shadow:0 0 0 3px #f7dfe6}.ca-cp-visits{display:grid;max-height:210px;gap:7px;overflow:auto;margin-top:10px;padding-right:3px}.ca-cp-visit{display:grid;grid-template-columns:92px minmax(0,1fr) auto;align-items:center;gap:12px;width:100%;border:1px solid #eaded8;border-radius:14px;background:#fff;padding:11px 12px;text-align:left}.ca-cp-visit:hover{border-color:#d8a6b4;background:#fff8fa}.ca-cp-visit.is-selected{border-color:#c94f70;background:#fff2f6;box-shadow:0 0 0 2px #f4d7df}.ca-cp-visit time{font-size:11px;color:#8d7d76}.ca-cp-visit strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}.ca-cp-visit span{display:block;overflow:hidden;margin-top:3px;color:#81736d;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.ca-cp-visit em{border-radius:999px;background:#f5eee9;padding:4px 8px;color:#806e66;font-size:9px;font-style:normal}.ca-cp-empty{padding:24px;text-align:center;color:#8d7d76;font-size:12px}
    .ca-cp-drop{display:grid;min-height:116px;place-items:center;border:1px dashed #d9b5bf;border-radius:18px;background:linear-gradient(145deg,#fff8fa,#fff);padding:18px;text-align:center;cursor:pointer}.ca-cp-drop svg{width:27px;height:27px;color:#bd4968}.ca-cp-drop strong{display:block;margin-top:8px;font-size:13px}.ca-cp-drop span{display:block;margin-top:4px;color:#8c7b74;font-size:10px}.ca-cp-preview{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:10px}.ca-cp-preview figure{position:relative;aspect-ratio:1;overflow:hidden;margin:0;border-radius:13px;background:#f3ece8}.ca-cp-preview img{width:100%;height:100%;object-fit:cover}.ca-cp-consent{display:flex;align-items:flex-start;gap:10px;border:1px solid #ecd5dc;border-radius:14px;background:#fff7f9;padding:13px}.ca-cp-consent input{width:17px;height:17px;margin-top:1px;accent-color:#c94f70}.ca-cp-consent span{font-size:11px;font-weight:700;line-height:1.7}.ca-cp-actions{display:flex;align-items:center;justify-content:flex-end;gap:12px}.ca-cp-feedback{min-width:0;flex:1;color:#8e4356;font-size:11px}.ca-cp-submit{display:inline-flex;min-height:46px;align-items:center;justify-content:center;gap:8px;border:0;border-radius:999px;background:#bd4968;padding:0 22px;color:#fff;font-size:13px;font-weight:900;box-shadow:0 10px 24px rgba(157,55,83,.2)}.ca-cp-submit:disabled{cursor:not-allowed;opacity:.48}.ca-cp-submit svg{width:17px;height:17px}
    @media(min-width:1280px){.ca-community-actions{width:auto;justify-content:flex-end}}
    @media(max-width:639px){.ca-cp-backdrop{align-items:end;padding:0}.ca-cp-dialog{max-height:92dvh;border-radius:24px 24px 0 0}.ca-cp-head,.ca-cp-body{padding-left:18px;padding-right:18px}.ca-cp-visit{grid-template-columns:78px minmax(0,1fr)}.ca-cp-visit em{display:none}.ca-cp-preview{grid-template-columns:repeat(2,minmax(0,1fr))}.ca-cp-actions{align-items:stretch;flex-direction:column}.ca-cp-submit{width:100%}}
  `
  document.head.appendChild(css)

  let visits = []
  let selected = null
  let files = []
  let modal = null

  const formatDate = value => new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'numeric', day: 'numeric' }).format(new Date(value))
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[character])

  const renderVisits = query => {
    if (!modal) return
    const list = modal.querySelector('[data-ca-cp-visits]')
    const normalized = String(query || '').trim().toLowerCase()
    const visible = visits.filter(item => `${item.customerName} ${item.stylistName || ''} ${item.menu || ''}`.toLowerCase().includes(normalized)).slice(0, 60)
    list.innerHTML = visible.length ? visible.map(item => `<button type="button" class="ca-cp-visit${selected?.visitId === item.visitId ? ' is-selected' : ''}" data-visit-id="${escapeHtml(item.visitId)}"><time>${escapeHtml(formatDate(item.visitedAt))}</time><div><strong>${escapeHtml(item.customerName)}</strong><span>${escapeHtml(item.menu || '施術記録')}・${escapeHtml(item.stylistName || '担当未登録')}</span></div><em>${item.published ? '公開中' : item.photoCount ? `写真${item.photoCount}枚` : '未投稿'}</em></button>`).join('') : '<div class="ca-cp-empty">該当する来店履歴がありません。</div>'
    list.querySelectorAll('[data-visit-id]').forEach(button => button.addEventListener('click', () => {
      selected = visits.find(item => item.visitId === button.dataset.visitId) || null
      renderVisits(modal.querySelector('[data-ca-cp-search]').value)
      syncSubmit()
    }))
  }

  const syncSubmit = () => {
    if (!modal) return
    const submit = modal.querySelector('[data-ca-cp-submit]')
    const consent = modal.querySelector('[data-ca-cp-consent]').checked
    submit.disabled = !selected || !files.length || !consent
  }

  const renderPreviews = () => {
    if (!modal) return
    const preview = modal.querySelector('[data-ca-cp-preview]')
    preview.innerHTML = files.map(file => `<figure><img alt="投稿写真プレビュー" src="${URL.createObjectURL(file)}"></figure>`).join('')
    syncSubmit()
  }

  const closeModal = () => {
    if (!modal) return
    modal.remove()
    modal = null
    visits = []
    selected = null
    files = []
    document.documentElement.style.overflow = ''
  }

  const fileToDataUrl = file => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('写真を読み込めませんでした。'))
    reader.readAsDataURL(file)
  })

  const openModal = async () => {
    if (modal) return
    modal = document.createElement('div')
    modal.className = 'ca-cp-backdrop'
    modal.innerHTML = `<section class="ca-cp-dialog" role="dialog" aria-modal="true" aria-labelledby="ca-cp-title"><header class="ca-cp-head"><div><small>NEW STYLE POST</small><h2 id="ca-cp-title">新しいスタイルを投稿</h2><p>来店履歴と写真を選び、お店からスタイル共有へ公開します。</p></div><button type="button" class="ca-cp-close" data-ca-cp-close aria-label="閉じる">${icon('close')}</button></header><div class="ca-cp-body"><section><span class="ca-cp-label">1. 顧客・来店履歴を選択</span><div class="ca-cp-search">${icon('search')}<input type="search" data-ca-cp-search placeholder="顧客名・担当・メニューで検索" autocomplete="off"></div><div class="ca-cp-visits"><div class="ca-cp-empty">来店履歴を読み込んでいます…</div></div></section><section><span class="ca-cp-label">2. 写真を追加</span><label class="ca-cp-drop">${icon('image')}<strong>写真を選択</strong><span>JPG・PNG・WebP／最大4枚・1枚5MBまで</span><input type="file" data-ca-cp-files accept="image/jpeg,image/png,image/webp" multiple hidden></label><div class="ca-cp-preview" data-ca-cp-preview></div></section><div class="ca-cp-field"><label for="ca-cp-caption">写真の説明（任意）</label><textarea id="ca-cp-caption" data-ca-cp-caption rows="3" maxlength="120" placeholder="スタイルのポイントや施術内容を入力"></textarea></div><label class="ca-cp-consent"><input type="checkbox" data-ca-cp-consent><span>お客様から、写真をスタイル共有へ掲載する明示的な同意を得ています。</span></label><div class="ca-cp-actions"><p class="ca-cp-feedback" data-ca-cp-feedback role="status" aria-live="polite"></p><button type="button" class="ca-cp-submit" data-ca-cp-submit disabled>${icon('check')}スタイルを公開</button></div></div></section>`
    modal.querySelector('.ca-cp-visits')?.setAttribute('data-ca-cp-visits', '')
    document.body.appendChild(modal)
    document.documentElement.style.overflow = 'hidden'
    modal.addEventListener('click', event => { if (event.target === modal) closeModal() })
    modal.querySelector('[data-ca-cp-close]').addEventListener('click', closeModal)
    modal.querySelector('[data-ca-cp-search]').addEventListener('input', event => renderVisits(event.currentTarget.value))
    modal.querySelector('[data-ca-cp-consent]').addEventListener('change', syncSubmit)
    modal.querySelector('[data-ca-cp-files]').addEventListener('change', event => {
      const selectedFiles = [...event.currentTarget.files].slice(0, 4)
      const invalid = selectedFiles.find(file => !['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)
      const feedback = modal.querySelector('[data-ca-cp-feedback]')
      if (invalid) { files = []; feedback.textContent = '写真はJPG・PNG・WebP、1枚5MB以下で選択してください。' }
      else { files = selectedFiles; feedback.textContent = '' }
      renderPreviews()
    })
    modal.querySelector('[data-ca-cp-submit]').addEventListener('click', async event => {
      const button = event.currentTarget
      const feedback = modal.querySelector('[data-ca-cp-feedback]')
      button.disabled = true
      feedback.textContent = '写真を保存しています…'
      try {
        const photos = await Promise.all(files.map(fileToDataUrl))
        const response = await fetch('/api/lien-community-publish', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customerId: selected.customerId, visitId: selected.visitId, caption: modal.querySelector('[data-ca-cp-caption]').value, consentConfirmed: true, photos }) })
        const result = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(result.error || '投稿を保存できませんでした。')
        feedback.textContent = 'スタイルを公開しました。'
        setTimeout(() => location.assign(`/admin/community/${encodeURIComponent(result.postId)}`), 450)
      } catch (error) {
        feedback.textContent = error instanceof Error ? error.message : '投稿を保存できませんでした。'
        syncSubmit()
      }
    })
    try {
      const response = await fetch('/api/lien-community-publish-options', { credentials: 'same-origin' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || '来店履歴を読み込めませんでした。')
      visits = Array.isArray(result.visits) ? result.visits : []
      renderVisits('')
    } catch (error) {
      modal.querySelector('[data-ca-cp-visits]').innerHTML = `<div class="ca-cp-empty">${escapeHtml(error instanceof Error ? error.message : '来店履歴を読み込めませんでした。')}</div>`
    }
  }

  const mountCommunityAction = () => {
    if (location.pathname !== '/admin/community') return
    const title = [...document.querySelectorAll('h1')].find(node => node.textContent.trim() === 'スタイル共有')
    const hero = title?.closest('header')
    const host = hero?.querySelector(':scope > div > div')
    if (!host || host.querySelector('[data-ca-community-publish]')) return
    const actions = document.createElement('div')
    actions.className = 'ca-community-actions'
    actions.innerHTML = `<button type="button" class="ca-community-publish-open" data-ca-community-publish>${icon('image')}<span>新しいスタイルを投稿</span></button>`
    actions.querySelector('button').addEventListener('click', openModal)
    host.appendChild(actions)
  }

  const apply = () => { decoratePageLabel(); mountCommunityAction() }
  let scheduled = false
  const observer = new MutationObserver(() => {
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(() => { scheduled = false; apply() })
  })
  observer.observe(document.documentElement, { childList: true, subtree: true })
  window.addEventListener('popstate', apply)
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && modal) closeModal() })
  apply()
})()
