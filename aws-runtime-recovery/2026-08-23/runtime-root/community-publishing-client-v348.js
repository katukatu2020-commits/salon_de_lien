;(() => {
  if (window.__lienCommunityPublishingV348) return
  window.__lienCommunityPublishingV348 = true

  const icon = name => ({
    image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>',
  }[name] || '')

  const css = document.createElement('style')
  css.id = 'ca-community-publishing-v348-style'
  css.textContent = `
    .ca-community-actions{display:flex;width:100%;flex-wrap:wrap;gap:8px;flex-shrink:0}.ca-community-publish-open{display:inline-flex;min-height:44px;align-items:center;justify-content:center;gap:8px;border:0;border-radius:999px;background:linear-gradient(135deg,#c94f70,#ad3f60);padding:0 20px;color:#fff;font-size:13px;font-weight:800;box-shadow:0 12px 26px rgba(157,55,83,.22);transition:.18s ease}.ca-community-publish-open:hover{transform:translateY(-1px);box-shadow:0 15px 30px rgba(157,55,83,.27)}.ca-community-publish-open svg{width:18px;height:18px}
    .ca-cp-backdrop{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;background:rgba(54,39,34,.46);padding:18px;backdrop-filter:blur(8px)}.ca-cp-dialog{display:flex;width:min(720px,100%);max-height:calc(100dvh - 36px);flex-direction:column;overflow:hidden;border:1px solid #ead8d1;border-radius:26px;background:#fffdfb;box-shadow:0 30px 90px rgba(58,38,31,.24)}.ca-cp-head{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;padding:22px 24px 18px;border-bottom:1px solid #eee0da}.ca-cp-head small{display:block;color:#b84767;font-size:10px;font-weight:900;letter-spacing:.13em}.ca-cp-head h2{margin:5px 0 0;font-family:"Yu Mincho","Hiragino Mincho ProN",serif;font-size:24px}.ca-cp-head p{margin:7px 0 0;color:#81736d;font-size:12px}.ca-cp-close{display:grid;width:40px;height:40px;flex:0 0 auto;place-items:center;border:1px solid #ead8d1;border-radius:50%;background:#fff;color:#755f57}.ca-cp-close svg{width:18px;height:18px}.ca-cp-body{display:grid;gap:20px;overflow:auto;padding:22px 24px 26px}.ca-cp-label,.ca-cp-field>label{display:block;margin-bottom:8px;color:#352d29;font-size:12px;font-weight:800}
    .ca-cp-drop{display:grid;min-height:150px;place-items:center;border:1px dashed #d9b5bf;border-radius:18px;background:linear-gradient(145deg,#fff8fa,#fff);padding:22px;text-align:center;cursor:pointer}.ca-cp-drop:hover{border-color:#c65372;background:#fff5f8}.ca-cp-drop svg{width:29px;height:29px;color:#bd4968}.ca-cp-drop strong{display:block;margin-top:9px;font-size:13px}.ca-cp-drop span{display:block;margin-top:4px;color:#8c7b74;font-size:10px}.ca-cp-preview{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:10px}.ca-cp-preview figure{position:relative;aspect-ratio:1;overflow:hidden;margin:0;border-radius:13px;background:#f3ece8}.ca-cp-preview img{width:100%;height:100%;object-fit:cover}.ca-cp-field textarea{width:100%;border:1px solid #e8d8d1;border-radius:14px;background:#fff;padding:13px 14px;color:#342e2b;font-size:13px;outline:none}.ca-cp-field textarea:focus{border-color:#c65372;box-shadow:0 0 0 3px #f7dfe6}.ca-cp-rights{display:flex;align-items:flex-start;gap:10px;border:1px solid #ecd5dc;border-radius:14px;background:#fff7f9;padding:13px}.ca-cp-rights input{width:17px;height:17px;margin-top:1px;accent-color:#c94f70}.ca-cp-rights span{font-size:11px;font-weight:700;line-height:1.7}.ca-cp-actions{display:flex;align-items:center;justify-content:flex-end;gap:12px}.ca-cp-feedback{min-width:0;flex:1;color:#8e4356;font-size:11px}.ca-cp-submit{display:inline-flex;min-height:46px;align-items:center;justify-content:center;gap:8px;border:0;border-radius:999px;background:#bd4968;padding:0 22px;color:#fff;font-size:13px;font-weight:900;box-shadow:0 10px 24px rgba(157,55,83,.2)}.ca-cp-submit:disabled{cursor:not-allowed;opacity:.48}.ca-cp-submit svg{width:17px;height:17px}
    @media(min-width:1280px){.ca-community-actions{width:auto;justify-content:flex-end}}@media(max-width:639px){.ca-cp-backdrop{align-items:end;padding:0}.ca-cp-dialog{max-height:92dvh;border-radius:24px 24px 0 0}.ca-cp-head,.ca-cp-body{padding-left:18px;padding-right:18px}.ca-cp-preview{grid-template-columns:repeat(2,minmax(0,1fr))}.ca-cp-actions{align-items:stretch;flex-direction:column}.ca-cp-submit{width:100%}}
  `
  document.head.appendChild(css)

  let files = []
  let modal = null
  const fileToDataUrl = file => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || '')); reader.onerror = () => reject(new Error('写真を読み込めませんでした。')); reader.readAsDataURL(file) })

  const syncSubmit = () => {
    if (!modal) return
    modal.querySelector('[data-ca-cp-submit]').disabled = !files.length || !modal.querySelector('[data-ca-cp-rights]').checked
  }
  const renderPreviews = () => {
    if (!modal) return
    modal.querySelector('[data-ca-cp-preview]').innerHTML = files.map(file => `<figure><img alt="投稿写真プレビュー" src="${URL.createObjectURL(file)}"></figure>`).join('')
    syncSubmit()
  }
  const closeModal = () => { if (!modal) return; modal.remove(); modal = null; files = []; document.documentElement.style.overflow = '' }

  const openModal = () => {
    if (modal) return
    modal = document.createElement('div')
    modal.className = 'ca-cp-backdrop'
    modal.innerHTML = `<section class="ca-cp-dialog" role="dialog" aria-modal="true" aria-labelledby="ca-cp-title"><header class="ca-cp-head"><div><small>NEW STYLE POST</small><h2 id="ca-cp-title">新しいスタイルを投稿</h2><p>写真と説明を入力し、お店のスタイルとして公開します。</p></div><button type="button" class="ca-cp-close" data-ca-cp-close aria-label="閉じる">${icon('close')}</button></header><div class="ca-cp-body"><section><span class="ca-cp-label">写真を追加</span><label class="ca-cp-drop">${icon('image')}<strong>写真を選択</strong><span>JPG・PNG・WebP／最大4枚・1枚5MBまで</span><input type="file" data-ca-cp-files accept="image/jpeg,image/png,image/webp" multiple hidden></label><div class="ca-cp-preview" data-ca-cp-preview></div></section><div class="ca-cp-field"><label for="ca-cp-caption">写真の説明（任意）</label><textarea id="ca-cp-caption" data-ca-cp-caption rows="3" maxlength="120" placeholder="スタイルのポイントや施術内容を入力"></textarea></div><label class="ca-cp-rights"><input type="checkbox" data-ca-cp-rights><span>投稿する写真について、店舗が掲載できる権限と必要な同意を確認済みです。</span></label><div class="ca-cp-actions"><p class="ca-cp-feedback" data-ca-cp-feedback role="status" aria-live="polite"></p><button type="button" class="ca-cp-submit" data-ca-cp-submit disabled>${icon('check')}スタイルを公開</button></div></div></section>`
    document.body.appendChild(modal)
    document.documentElement.style.overflow = 'hidden'
    modal.addEventListener('click', event => { if (event.target === modal) closeModal() })
    modal.querySelector('[data-ca-cp-close]').addEventListener('click', closeModal)
    modal.querySelector('[data-ca-cp-rights]').addEventListener('change', syncSubmit)
    modal.querySelector('[data-ca-cp-files]').addEventListener('change', event => {
      const selectedFiles = [...event.currentTarget.files].slice(0, 4)
      const invalid = selectedFiles.find(file => !['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)
      const feedback = modal.querySelector('[data-ca-cp-feedback]')
      if (invalid) { files = []; feedback.textContent = '写真はJPG・PNG・WebP、1枚5MB以下で選択してください。' } else { files = selectedFiles; feedback.textContent = '' }
      renderPreviews()
    })
    modal.querySelector('[data-ca-cp-submit]').addEventListener('click', async event => {
      const button = event.currentTarget
      const feedback = modal.querySelector('[data-ca-cp-feedback]')
      button.disabled = true
      feedback.textContent = '写真を保存しています…'
      try {
        const photos = await Promise.all(files.map(fileToDataUrl))
        const response = await fetch('/api/lien-community-publish', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ caption: modal.querySelector('[data-ca-cp-caption]').value, rightsConfirmed: true, photos }) })
        const result = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(result.error || '投稿を保存できませんでした。')
        feedback.textContent = 'スタイルを公開しました。'
        setTimeout(() => location.assign(`/admin/community/${encodeURIComponent(result.postId)}`), 350)
      } catch (error) { feedback.textContent = error instanceof Error ? error.message : '投稿を保存できませんでした。'; syncSubmit() }
    })
  }

  const mount = () => {
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
  let scheduled = false
  const observer = new MutationObserver(() => { if (scheduled) return; scheduled = true; requestAnimationFrame(() => { scheduled = false; mount() }) })
  observer.observe(document.documentElement, { childList: true, subtree: true })
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && modal) closeModal() })
  mount()
})()
