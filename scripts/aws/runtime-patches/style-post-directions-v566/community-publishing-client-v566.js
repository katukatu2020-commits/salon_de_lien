;(() => {
  'use strict'
  if (window.__lienStylePostDirectionsV566) return
  window.__lienStylePostDirectionsV566 = true

  const RELEASE = 'style-post-directions-v566'
  const SLOTS = [
    { direction:'FRONT', label:'正面', hint:'全体のフォルムと顔まわり' },
    { direction:'SIDE', label:'横', hint:'シルエットとレイヤー' },
    { direction:'BACK', label:'後ろ', hint:'後頭部と毛先の仕上がり' },
  ]
  const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
  const MAX_FILE_BYTES = 5 * 1024 * 1024
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, character => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[character])
  const icon = name => {
    const paths = {
      image:'<rect x="3" y="3" width="18" height="18" rx="3"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><path d="m21 15-5-5L5 21"></path>',
      close:'<path d="m6 6 12 12M18 6 6 18"></path>',
      check:'<path d="m5 12 4 4L19 6"></path>',
      camera:'<path d="M14.5 4 16 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l1.5-3z"></path><circle cx="12" cy="13" r="3"></circle>',
      trash:'<path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v5M14 11v5"></path>',
      shield:'<path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3z"></path><path d="m9 12 2 2 4-4"></path>',
    }
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.image}</svg>`
  }

  function installStyles() {
    if (document.querySelector('style[data-style-post-directions-v566]')) return
    const style = document.createElement('style')
    style.dataset.stylePostDirectionsV566 = '1'
    style.textContent = `
      .ca-community-actions{display:flex;width:100%;flex-wrap:wrap;gap:8px;flex-shrink:0}.ca-community-publish-open{display:inline-flex;min-height:44px;align-items:center;justify-content:center;gap:8px;border:1px solid #b84865;border-radius:7px;background:#b84865;padding:0 18px;color:#fff;font-size:13px;font-weight:800;box-shadow:0 8px 20px rgba(157,55,83,.16);transition:background .16s ease,transform .16s ease,box-shadow .16s ease}.ca-community-publish-open:hover{transform:translateY(-1px);background:#a93e5a;box-shadow:0 11px 24px rgba(157,55,83,.2)}.ca-community-publish-open svg{width:18px;height:18px}
      .ca-cp-backdrop{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;background:rgba(45,36,32,.5);padding:18px;backdrop-filter:blur(7px)}.ca-cp-dialog{display:flex;width:min(940px,100%);max-height:calc(100dvh - 36px);flex-direction:column;overflow:hidden;border:1px solid #dfd1ca;border-radius:8px;background:#fffdfb;box-shadow:0 30px 90px rgba(43,31,26,.26)}.ca-cp-dialog *{box-sizing:border-box;letter-spacing:0}.ca-cp-head{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;border-bottom:1px solid #eaded8;padding:20px 22px 17px}.ca-cp-head small{display:block;color:#b84865;font-size:10px;font-weight:900}.ca-cp-head h2{margin:5px 0 0;font-family:"Yu Mincho","Hiragino Mincho ProN",serif;font-size:23px;letter-spacing:0}.ca-cp-head p{margin:6px 0 0;color:#81736d;font-size:12px}.ca-cp-close{display:grid;width:40px;height:40px;flex:0 0 auto;place-items:center;border:1px solid #ded0ca;border-radius:50%;background:#fff;color:#6d5e57}.ca-cp-close:hover{background:#f7f1ee}.ca-cp-close:disabled{opacity:.45}.ca-cp-close svg{width:18px;height:18px}.ca-cp-body{display:grid;gap:18px;overflow:auto;padding:20px 22px 22px}.ca-cp-photo-head{display:flex;align-items:end;justify-content:space-between;gap:16px;margin-bottom:10px}.ca-cp-photo-head>div{min-width:0}.ca-cp-label,.ca-cp-field>label{display:block;color:#352d29;font-size:12px;font-weight:900}.ca-cp-photo-head p{margin:3px 0 0;color:#8c7c74;font-size:10px}.ca-cp-progress{display:inline-flex;min-height:27px;flex:0 0 auto;align-items:center;border:1px solid #dfd2cc;border-radius:999px;background:#fff;padding:0 9px;color:#7e6e67;font-size:10px;font-weight:900}.ca-cp-progress.is-complete{border-color:#b9d6c5;background:#f1f8f3;color:#397057}
      .ca-cp-slots{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.ca-cp-slot{min-width:0;border:1px solid #e4d7d1;border-radius:8px;background:#fff;padding:10px}.ca-cp-slot-head{display:flex;min-height:30px;align-items:center;gap:7px}.ca-cp-slot-code{color:#b84865;font-size:10px;font-weight:900}.ca-cp-slot-head strong{color:#332a26;font-size:12px}.ca-cp-required{margin-left:auto;color:#9c8e87;font-size:9px;font-weight:800}.ca-cp-slot-media{position:relative;aspect-ratio:4/5;overflow:hidden;border:1px dashed #d8b9c1;border-radius:7px;background:#fbf7f5}.ca-cp-slot-select{display:grid;width:100%;height:100%;place-items:center;border:0;background:transparent;padding:0;color:#765f58;cursor:pointer}.ca-cp-slot-select:hover{background:#fff5f8}.ca-cp-slot-empty{display:grid;place-items:center}.ca-cp-slot-empty>span{display:grid;width:42px;height:42px;place-items:center;border:1px solid #ead9de;border-radius:50%;background:#fff;color:#b84865}.ca-cp-slot-empty svg{width:20px;height:20px}.ca-cp-slot-empty strong{margin-top:8px;font-size:11px}.ca-cp-slot-preview{position:relative;width:100%;height:100%}.ca-cp-slot-preview img{display:block;width:100%;height:100%;object-fit:cover}.ca-cp-slot-replace{position:absolute;right:8px;bottom:8px;left:8px;min-height:30px;border:1px solid rgba(255,255,255,.82);border-radius:6px;background:rgba(48,38,34,.76);color:#fff;font-size:10px;font-weight:900;backdrop-filter:blur(5px)}.ca-cp-slot-remove{position:absolute;top:8px;right:8px;z-index:2;display:grid;width:32px;height:32px;place-items:center;border:1px solid rgba(255,255,255,.9);border-radius:50%;background:rgba(255,255,255,.94);color:#aa3f58;box-shadow:0 4px 12px rgba(44,32,28,.16)}.ca-cp-slot-remove[hidden]{display:none}.ca-cp-slot-remove:hover{background:#fff1f4}.ca-cp-slot-remove svg{width:15px;height:15px}.ca-cp-slot-hint{min-height:16px;margin:7px 1px 0;overflow:hidden;color:#8c7c74;font-size:9px;line-height:1.5;text-overflow:ellipsis;white-space:nowrap}.ca-cp-slot.is-filled{border-color:#c8dccc}.ca-cp-slot.is-filled .ca-cp-slot-code{color:#397057}
      .ca-cp-field textarea{display:block;width:100%;resize:vertical;border:1px solid #e1d4ce;border-radius:7px;background:#fff;padding:11px 12px;color:#342e2b;font:inherit;font-size:12px;line-height:1.65;outline:none}.ca-cp-field textarea:focus{border-color:#b95d75;box-shadow:0 0 0 3px rgba(185,72,101,.1)}.ca-cp-field>label{margin-bottom:7px}.ca-cp-rights{display:flex;align-items:flex-start;gap:10px;border:1px solid #d5e5db;border-radius:7px;background:#f5faf7;padding:12px}.ca-cp-rights>span:first-of-type{display:grid;width:28px;height:28px;flex:0 0 auto;place-items:center;color:#47745e}.ca-cp-rights svg{width:18px;height:18px}.ca-cp-rights input{width:17px;height:17px;flex:0 0 auto;margin-top:5px;accent-color:#b84865}.ca-cp-rights-text{font-size:11px;font-weight:700;line-height:1.65}.ca-cp-actions{display:flex;min-height:46px;align-items:center;justify-content:flex-end;gap:12px}.ca-cp-feedback{min-width:0;flex:1;margin:0;color:#8e4356;font-size:11px;line-height:1.5}.ca-cp-feedback.is-success{color:#397057}.ca-cp-submit{display:inline-flex;min-width:180px;min-height:44px;align-items:center;justify-content:center;gap:8px;border:1px solid #b84865;border-radius:7px;background:#b84865;padding:0 18px;color:#fff;font-size:12px;font-weight:900;box-shadow:0 8px 20px rgba(157,55,83,.16)}.ca-cp-submit:hover{background:#a93e5a}.ca-cp-submit:disabled{border-color:#dfd3ce;background:#e9e2de;color:#9d9089;box-shadow:none;cursor:not-allowed}.ca-cp-submit svg{width:17px;height:17px}
      @media(min-width:1280px){.ca-community-actions{width:auto;justify-content:flex-end}}
      @media(max-width:639px){.ca-cp-backdrop{align-items:end;padding:0}.ca-cp-dialog{max-height:94dvh;border-radius:8px 8px 0 0}.ca-cp-head,.ca-cp-body{padding-right:16px;padding-left:16px}.ca-cp-head{padding-top:17px}.ca-cp-head h2{font-size:21px}.ca-cp-slots{grid-template-columns:1fr;gap:8px}.ca-cp-slot{display:grid;grid-template-columns:82px minmax(0,1fr);grid-template-rows:auto auto;column-gap:11px;align-items:center;padding:8px}.ca-cp-slot-head{grid-column:2;grid-row:1}.ca-cp-slot-media{grid-column:1;grid-row:1/3;width:82px;aspect-ratio:4/5}.ca-cp-slot-hint{grid-column:2;grid-row:2;margin-top:0}.ca-cp-slot-empty>span{width:36px;height:36px}.ca-cp-slot-empty strong{margin-top:5px;font-size:10px}.ca-cp-slot-remove{top:5px;right:5px;width:28px;height:28px}.ca-cp-slot-replace{right:5px;bottom:5px;left:5px;min-height:26px}.ca-cp-actions{align-items:stretch;flex-direction:column}.ca-cp-submit{width:100%}}
    `
    document.head.appendChild(style)
  }

  let modal = null
  const files = new Map()
  const previewUrls = new Map()

  const fileToDataUrl = file => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('写真を読み込めませんでした。'))
    reader.readAsDataURL(file)
  })

  function releasePreview(direction) {
    const url = previewUrls.get(direction)
    if (url) URL.revokeObjectURL(url)
    previewUrls.delete(direction)
  }

  function clearFiles() {
    for (const slot of SLOTS) releasePreview(slot.direction)
    files.clear()
  }

  function feedback(message, success = false) {
    const node = modal?.querySelector('[data-ca-cp-feedback]')
    if (!node) return
    node.textContent = message || ''
    node.classList.toggle('is-success', success)
  }

  function syncSubmit() {
    if (!modal) return
    const selectedCount = SLOTS.filter(slot => files.has(slot.direction)).length
    const progress = modal.querySelector('[data-ca-cp-progress]')
    if (progress) {
      progress.textContent = `${selectedCount} / ${SLOTS.length}`
      progress.classList.toggle('is-complete', selectedCount === SLOTS.length)
    }
    const busy = modal.dataset.busy === '1'
    const rights = modal.querySelector('[data-ca-cp-rights]')?.checked === true
    const submit = modal.querySelector('[data-ca-cp-submit]')
    if (submit) submit.disabled = busy || selectedCount !== SLOTS.length || !rights
    modal.querySelectorAll('[data-ca-cp-file],[data-ca-cp-select],[data-ca-cp-remove]').forEach(control => { control.disabled = busy })
    const close = modal.querySelector('[data-ca-cp-close]')
    if (close) close.disabled = busy
  }

  function renderSlot(direction) {
    if (!modal) return
    const slot = SLOTS.find(item => item.direction === direction)
    const root = modal.querySelector(`[data-ca-cp-slot="${direction}"]`)
    const select = root?.querySelector('[data-ca-cp-select]')
    const remove = root?.querySelector('[data-ca-cp-remove]')
    const hint = root?.querySelector('[data-ca-cp-slot-hint]')
    const file = files.get(direction)
    if (!root || !select || !remove || !hint || !slot) return
    root.classList.toggle('is-filled', Boolean(file))
    remove.hidden = !file
    hint.textContent = file ? file.name : slot.hint
    if (!file) {
      select.innerHTML = `<span class="ca-cp-slot-empty"><span>${icon('camera')}</span><strong>写真を選択</strong></span>`
      return
    }
    let url = previewUrls.get(direction)
    if (!url) {
      url = URL.createObjectURL(file)
      previewUrls.set(direction, url)
    }
    select.innerHTML = `<span class="ca-cp-slot-preview"><img src="${esc(url)}" alt="${esc(slot.label)}のプレビュー"><span class="ca-cp-slot-replace">差し替え</span></span>`
  }

  function setFile(direction, file) {
    if (!file) return
    if (!ALLOWED_TYPES.has(file.type) || file.size <= 0 || file.size > MAX_FILE_BYTES) {
      feedback('写真はJPG・PNG・WebP、1枚5MB以下で選択してください。')
      return
    }
    releasePreview(direction)
    files.set(direction, file)
    feedback('')
    renderSlot(direction)
    syncSubmit()
  }

  function removeFile(direction) {
    releasePreview(direction)
    files.delete(direction)
    renderSlot(direction)
    feedback('')
    syncSubmit()
  }

  function slotMarkup(slot) {
    return `<article class="ca-cp-slot" data-ca-cp-slot="${slot.direction}"><header class="ca-cp-slot-head"><span class="ca-cp-slot-code">${slot.direction}</span><strong>${slot.label}</strong><span class="ca-cp-required">必須</span></header><div class="ca-cp-slot-media"><button type="button" class="ca-cp-slot-select" data-ca-cp-select aria-label="${slot.label}の写真を選択"><span class="ca-cp-slot-empty"><span>${icon('camera')}</span><strong>写真を選択</strong></span></button><button type="button" class="ca-cp-slot-remove" data-ca-cp-remove aria-label="${slot.label}の写真を削除" title="${slot.label}の写真を削除" hidden>${icon('trash')}</button><input type="file" data-ca-cp-file accept="image/jpeg,image/png,image/webp" hidden></div><p class="ca-cp-slot-hint" data-ca-cp-slot-hint>${slot.hint}</p></article>`
  }

  function closeModal() {
    if (!modal || modal.dataset.busy === '1') return
    modal.remove()
    modal = null
    clearFiles()
    document.documentElement.style.overflow = ''
  }

  function openModal() {
    if (modal) return
    clearFiles()
    modal = document.createElement('div')
    modal.className = 'ca-cp-backdrop'
    modal.dataset.busy = '0'
    modal.innerHTML = `<section class="ca-cp-dialog" role="dialog" aria-modal="true" aria-labelledby="ca-cp-title"><header class="ca-cp-head"><div><small>NEW STYLE POST</small><h2 id="ca-cp-title">新しいスタイルを投稿</h2><p>施術後の仕上がりを3方向で登録します。</p></div><button type="button" class="ca-cp-close" data-ca-cp-close aria-label="閉じる">${icon('close')}</button></header><div class="ca-cp-body"><section><div class="ca-cp-photo-head"><div><span class="ca-cp-label">施術後写真</span><p>JPG・PNG・WebP／各5MBまで</p></div><span class="ca-cp-progress" data-ca-cp-progress>0 / 3</span></div><div class="ca-cp-slots">${SLOTS.map(slotMarkup).join('')}</div></section><div class="ca-cp-field"><label for="ca-cp-caption">写真の説明（任意）</label><textarea id="ca-cp-caption" data-ca-cp-caption rows="3" maxlength="120" placeholder="スタイルのポイントや施術内容を入力"></textarea></div><label class="ca-cp-rights"><span>${icon('shield')}</span><input type="checkbox" data-ca-cp-rights><span class="ca-cp-rights-text">写真の掲載権限と、お客様から必要な同意を確認済みです。</span></label><div class="ca-cp-actions"><p class="ca-cp-feedback" data-ca-cp-feedback role="status" aria-live="polite"></p><button type="button" class="ca-cp-submit" data-ca-cp-submit disabled>${icon('check')}3方向を公開</button></div></div></section>`
    document.body.appendChild(modal)
    document.documentElement.style.overflow = 'hidden'

    modal.addEventListener('click', event => { if (event.target === modal) closeModal() })
    modal.querySelector('[data-ca-cp-close]').addEventListener('click', closeModal)
    modal.querySelector('[data-ca-cp-rights]').addEventListener('change', syncSubmit)
    for (const slot of SLOTS) {
      const root = modal.querySelector(`[data-ca-cp-slot="${slot.direction}"]`)
      const input = root.querySelector('[data-ca-cp-file]')
      const select = root.querySelector('[data-ca-cp-select]')
      const media = root.querySelector('.ca-cp-slot-media')
      select.addEventListener('click', () => input.click())
      root.querySelector('[data-ca-cp-remove]').addEventListener('click', () => removeFile(slot.direction))
      input.addEventListener('change', event => {
        setFile(slot.direction, event.currentTarget.files?.[0])
        event.currentTarget.value = ''
      })
      media.addEventListener('dragover', event => { event.preventDefault(); media.style.borderColor = '#b84865' })
      media.addEventListener('dragleave', () => { media.style.borderColor = '' })
      media.addEventListener('drop', event => {
        event.preventDefault()
        media.style.borderColor = ''
        setFile(slot.direction, event.dataTransfer?.files?.[0])
      })
    }

    modal.querySelector('[data-ca-cp-submit]').addEventListener('click', async () => {
      if (SLOTS.some(slot => !files.has(slot.direction))) return
      modal.dataset.busy = '1'
      syncSubmit()
      feedback('3方向の写真を保存しています…')
      try {
        const photos = await Promise.all(SLOTS.map(async slot => ({
          direction:slot.direction,
          dataUrl:await fileToDataUrl(files.get(slot.direction)),
        })))
        const response = await fetch('/api/lien-community-publish', {
          method:'POST',
          credentials:'same-origin',
          headers:{ 'Content-Type':'application/json' },
          body:JSON.stringify({
            caption:modal.querySelector('[data-ca-cp-caption]').value,
            rightsConfirmed:true,
            photos,
          }),
        })
        const result = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(result.error || '投稿を保存できませんでした。')
        feedback('3方向のスタイル写真を公開しました。', true)
        setTimeout(() => location.assign(`/admin/community/${encodeURIComponent(result.postId)}`), 350)
      } catch (error) {
        modal.dataset.busy = '0'
        feedback(error instanceof Error ? error.message : '投稿を保存できませんでした。')
        syncSubmit()
      }
    })
    syncSubmit()
  }

  function mount() {
    if (location.pathname !== '/admin/community') return
    installStyles()
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
  const observer = new MutationObserver(() => {
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(() => { scheduled = false; mount() })
  })
  observer.observe(document.documentElement, { childList:true, subtree:true })
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && modal) closeModal() })
  mount()
  console.info(`[${RELEASE}] directional publisher ready`)
})()
