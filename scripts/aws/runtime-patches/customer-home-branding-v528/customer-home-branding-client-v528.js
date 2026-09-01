(() => {
  'use strict'

  if (window.__orimiaCustomerHomeBrandingV528) return
  window.__orimiaCustomerHomeBrandingV528 = true

  const RELEASE = 'customer-home-branding-v528'
  const API = '/api/lien-customer-home-branding'
  const IMAGE_API = `${API}/image`
  const DEFAULT_PHRASE = 'あたらしい、\n美しさを大切に。'
  const DEFAULT_IMAGE = '/brand/salon-interior-illustrated.png'
  let scheduled = false
  let generation = 0
  let activeModal = null

  const icon = (name) => {
    const paths = {
      image: '<rect x="3" y="3" width="18" height="18" rx="3"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"></path>',
      sparkle: '<path d="m12 3-1.2 3.3a2 2 0 0 1-1.2 1.2L6.3 8.7l3.3 1.2a2 2 0 0 1 1.2 1.2l1.2 3.3 1.2-3.3a2 2 0 0 1 1.2-1.2l3.3-1.2-3.3-1.2a2 2 0 0 1-1.2-1.2Z"></path><path d="m19 15-.6 1.6a1 1 0 0 1-.6.6l-1.6.6 1.6.6a1 1 0 0 1 .6.6l.6 1.6.6-1.6a1 1 0 0 1 .6-.6l1.6-.6-1.6-.6a1 1 0 0 1-.6-.6Z"></path>',
      upload: '<path d="M12 16V4"></path><path d="m7 9 5-5 5 5"></path><path d="M5 20h14"></path>',
      reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"></path><path d="M3 3v5h5"></path>',
      check: '<path d="m5 12 4 4L19 6"></path>',
      close: '<path d="m6 6 12 12M18 6 6 18"></path>',
    }
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.image}</svg>`
  }

  function isSettingsRoute() {
    return location.pathname === '/admin/settings' && new URLSearchParams(location.search).get('embedded') !== '1'
  }

  function addStyles() {
    if (document.getElementById('customer-home-branding-v528-styles')) return
    const style = document.createElement('style')
    style.id = 'customer-home-branding-v528-styles'
    style.textContent = `
      [data-ohb-panel]{grid-column:1/-1;width:100%;min-width:0;margin-top:20px;border:1px solid #ead9d0;border-radius:20px;background:#fffdfb;box-shadow:0 10px 30px rgba(71,45,36,.06);padding:22px;color:#342923}
      .ohb-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding-bottom:18px;border-bottom:1px solid #eee1da}.ohb-title{display:flex;align-items:flex-start;gap:13px;min-width:0}.ohb-symbol{display:grid;width:46px;height:46px;flex:0 0 46px;place-items:center;border-radius:14px;background:#fbeaf0;color:#bc4966}.ohb-symbol svg{width:22px;height:22px}.ohb-head h2{margin:0;color:#302621;font-size:18px;font-weight:800;letter-spacing:0}.ohb-head p{max-width:700px;margin:6px 0 0;color:#806f68;font-size:11px;line-height:1.75}.ohb-release{border-radius:999px;background:#f4f7f3;padding:6px 9px;color:#5e765f;font-size:9px;font-weight:800;white-space:nowrap}
      .ohb-grid{display:grid;grid-template-columns:minmax(300px,1.05fr) minmax(300px,.95fr);gap:24px;align-items:start;margin-top:22px}.ohb-preview-wrap{min-width:0}.ohb-label{display:block;margin-bottom:9px;color:#42352f;font-size:12px;font-weight:800}.ohb-preview{position:relative;overflow:hidden;width:100%;aspect-ratio:16/9;border:1px solid #e6d7cf;border-radius:16px;background:#e7dfda;box-shadow:0 12px 28px rgba(58,39,31,.11)}.ohb-preview img{display:block;width:100%;height:100%;object-fit:cover;filter:saturate(.86) contrast(.96)}.ohb-preview::after{position:absolute;inset:0;content:"";background:linear-gradient(90deg,rgba(51,33,25,.66),rgba(64,40,33,.17) 64%,transparent)}.ohb-preview-copy{position:absolute;z-index:1;left:7%;bottom:10%;max-width:72%;color:#fff;font-family:"Yu Mincho","Hiragino Mincho ProN",serif;font-size:clamp(18px,2.2vw,29px);line-height:1.55;letter-spacing:.08em;white-space:pre-line;text-shadow:0 2px 12px rgba(38,24,18,.82)}.ohb-preview-caption{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:9px;color:#8a7971;font-size:9px}.ohb-preview-caption strong{color:#6d5b54;font-weight:800}
      .ohb-fields{display:grid;gap:17px}.ohb-field{display:grid;gap:8px}.ohb-field label{color:#42352f;font-size:12px;font-weight:800}.ohb-field textarea{width:100%;min-height:112px;resize:vertical;border:1px solid #dfd0c9;border-radius:13px;background:#fff;padding:13px 14px;color:#322722;font:inherit;font-size:13px;line-height:1.75;outline:none}.ohb-field textarea:focus{border-color:#b87263;box-shadow:0 0 0 4px rgba(222,182,172,.28)}.ohb-help{display:flex;justify-content:space-between;gap:10px;color:#8b7a73;font-size:9px;line-height:1.6}.ohb-image-actions,.ohb-actions{display:flex;flex-wrap:wrap;gap:9px}.ohb-file{position:absolute;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none}.ohb-button{display:inline-flex;min-height:42px;align-items:center;justify-content:center;gap:8px;border:1px solid #dfcec6;border-radius:10px;background:#fff;padding:0 15px;color:#4d3c35;font:inherit;font-size:11px;font-weight:800;cursor:pointer;transition:border-color .16s,background .16s,transform .16s}.ohb-button svg{width:16px;height:16px}.ohb-button:hover{border-color:#bd8b7d;background:#fff9f6;transform:translateY(-1px)}.ohb-button.primary{border-color:#a85a4b;background:#a85a4b;color:#fff;box-shadow:0 8px 18px rgba(112,57,45,.16)}.ohb-button.primary:hover{background:#934b3e}.ohb-button.subtle{border-color:transparent;background:#f8f2ee;color:#765e55}.ohb-button:disabled{cursor:wait;opacity:.58;transform:none}.ohb-actions{align-items:center;padding-top:3px}.ohb-status{min-height:20px;flex:1;color:#806f68;font-size:10px;line-height:1.6}.ohb-status.ok{color:#357052}.ohb-status.error{color:#a13d3d}
      .ohb-modal{position:fixed;inset:0;z-index:2147483400;display:grid;place-items:center;overflow:auto;background:rgba(35,29,26,.58);padding:18px;backdrop-filter:blur(6px)}.ohb-dialog{width:min(760px,100%);max-height:min(94vh,860px);overflow:auto;border:1px solid #e8d8d0;border-radius:22px;background:#fffdfb;box-shadow:0 30px 90px rgba(35,24,20,.28)}.ohb-dialog-head{position:sticky;top:0;z-index:2;display:flex;align-items:flex-start;justify-content:space-between;gap:16px;border-bottom:1px solid #ecdfd8;background:rgba(255,253,251,.97);padding:18px 20px}.ohb-dialog-head h2{margin:0;color:#302621;font-size:18px}.ohb-dialog-head p{margin:5px 0 0;color:#806f68;font-size:10px;line-height:1.65}.ohb-close{display:grid;width:40px;height:40px;flex:0 0 40px;place-items:center;border:1px solid #e2d3cb;border-radius:50%;background:#fff;color:#66534b;cursor:pointer}.ohb-close svg{width:18px;height:18px}.ohb-dialog-body{padding:18px 20px 22px}.ohb-crop-stage{display:grid;place-items:center;overflow:hidden;border-radius:14px;background:#24201e;padding:10px}.ohb-crop-stage canvas{display:block;width:100%;height:auto;aspect-ratio:16/9;border-radius:8px;background:#171412;touch-action:none;cursor:grab}.ohb-crop-stage canvas:active{cursor:grabbing}.ohb-zoom{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:12px;margin-top:15px;color:#77665e;font-size:10px}.ohb-zoom input{width:100%;accent-color:#a85a4b}.ohb-crop-hint{margin:9px 0 0;color:#8a7972;font-size:9px;text-align:center}.ohb-modal-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:18px}
      html[data-ca-theme="dark"] [data-ohb-panel],html[data-ca-theme="dark"] .ohb-dialog{border-color:#4a3b35;background:#211b18;color:#f4ece7}html[data-ca-theme="dark"] .ohb-head,html[data-ca-theme="dark"] .ohb-dialog-head{border-color:#4a3b35;background:#211b18}html[data-ca-theme="dark"] .ohb-head h2,html[data-ca-theme="dark"] .ohb-dialog-head h2,html[data-ca-theme="dark"] .ohb-label,html[data-ca-theme="dark"] .ohb-field label{color:#f4ece7}html[data-ca-theme="dark"] .ohb-field textarea{border-color:#55443d;background:#191513;color:#f4ece7}
      @media(max-width:900px){.ohb-grid{grid-template-columns:1fr}.ohb-preview-copy{font-size:clamp(18px,4.5vw,25px)}}
      @media(max-width:640px){[data-ohb-panel]{margin-top:14px;border-radius:16px;padding:16px}.ohb-head{gap:11px}.ohb-symbol{width:42px;height:42px;flex-basis:42px}.ohb-release{display:none}.ohb-grid{gap:19px;margin-top:18px}.ohb-preview{border-radius:12px}.ohb-image-actions,.ohb-actions,.ohb-modal-actions{display:grid;grid-template-columns:1fr}.ohb-status{grid-column:1/-1}.ohb-button{width:100%}.ohb-dialog{border-radius:18px}.ohb-dialog-head,.ohb-dialog-body{padding-inline:15px}}
    `
    document.head.appendChild(style)
  }

  function setStatus(panel, message, type = '') {
    const status = panel.querySelector('[data-ohb-status]')
    if (!status) return
    status.className = `ohb-status${type ? ` ${type}` : ''}`
    status.textContent = message || ''
  }

  function setBusy(panel, busy) {
    panel.querySelectorAll('button').forEach(button => { button.disabled = busy })
    panel.setAttribute('aria-busy', busy ? 'true' : 'false')
  }

  function setPreview(panel, imageUrl, phrase) {
    const image = panel.querySelector('[data-ohb-preview-image]')
    const copy = panel.querySelector('[data-ohb-preview-copy]')
    if (image && imageUrl) image.src = imageUrl
    if (copy) copy.textContent = phrase || DEFAULT_PHRASE
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file)
      const image = new Image()
      image.decoding = 'async'
      image.onload = () => resolve({ image, objectUrl })
      image.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('画像を読み込めませんでした。')) }
      image.src = objectUrl
    })
  }

  async function cropImage(file) {
    const loaded = await loadImage(file)
    const image = loaded.image
    const overlay = document.createElement('div')
    overlay.className = 'ohb-modal'
    overlay.setAttribute('role', 'dialog')
    overlay.setAttribute('aria-modal', 'true')
    overlay.setAttribute('aria-labelledby', 'ohb-crop-title')
    overlay.innerHTML = `<section class="ohb-dialog"><header class="ohb-dialog-head"><div><h2 id="ohb-crop-title">ホーム画面の画像を調整</h2><p>ドラッグで位置、スライダーで拡大率を調整できます。</p></div><button class="ohb-close" type="button" aria-label="閉じる">${icon('close')}</button></header><div class="ohb-dialog-body"><div class="ohb-crop-stage"><canvas width="1280" height="720"></canvas></div><div class="ohb-zoom"><span>小</span><input type="range" min="1" max="3" step="0.01" value="1" aria-label="拡大率"><span>大</span></div><p class="ohb-crop-hint">枠内が実際に顧客アプリで表示される範囲です。</p><div class="ohb-modal-actions"><button class="ohb-button" type="button" data-ohb-cancel>キャンセル</button><button class="ohb-button primary" type="button" data-ohb-confirm>${icon('check')}この範囲で決定</button></div></div></section>`
    document.body.appendChild(overlay)
    activeModal = overlay
    const canvas = overlay.querySelector('canvas')
    const context = canvas.getContext('2d')
    const slider = overlay.querySelector('input[type="range"]')
    let zoom = 1
    let offsetX = 0
    let offsetY = 0
    let dragging = false
    let pointerX = 0
    let pointerY = 0

    const geometry = () => {
      const base = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight)
      const scale = base * zoom
      const width = image.naturalWidth * scale
      const height = image.naturalHeight * scale
      return { width, height, maxX: Math.max(0, (width - canvas.width) / 2), maxY: Math.max(0, (height - canvas.height) / 2) }
    }
    const clamp = () => {
      const value = geometry()
      offsetX = Math.max(-value.maxX, Math.min(value.maxX, offsetX))
      offsetY = Math.max(-value.maxY, Math.min(value.maxY, offsetY))
      return value
    }
    const draw = () => {
      const value = clamp()
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image, (canvas.width - value.width) / 2 + offsetX, (canvas.height - value.height) / 2 + offsetY, value.width, value.height)
    }
    slider.addEventListener('input', () => { zoom = Number(slider.value); draw() })
    canvas.addEventListener('pointerdown', event => {
      dragging = true
      pointerX = event.clientX
      pointerY = event.clientY
      canvas.setPointerCapture(event.pointerId)
    })
    canvas.addEventListener('pointermove', event => {
      if (!dragging) return
      const rect = canvas.getBoundingClientRect()
      offsetX += (event.clientX - pointerX) * (canvas.width / rect.width)
      offsetY += (event.clientY - pointerY) * (canvas.height / rect.height)
      pointerX = event.clientX
      pointerY = event.clientY
      draw()
    })
    const stopDragging = () => { dragging = false }
    canvas.addEventListener('pointerup', stopDragging)
    canvas.addEventListener('pointercancel', stopDragging)
    draw()

    return new Promise(resolve => {
      let settled = false
      let escape = null
      const finish = value => {
        if (settled) return
        settled = true
        if (escape) document.removeEventListener('keydown', escape)
        URL.revokeObjectURL(loaded.objectUrl)
        overlay.remove()
        if (activeModal === overlay) activeModal = null
        resolve(value)
      }
      overlay.querySelector('.ohb-close').addEventListener('click', () => finish(null))
      overlay.querySelector('[data-ohb-cancel]').addEventListener('click', () => finish(null))
      overlay.addEventListener('click', event => { if (event.target === overlay) finish(null) })
      escape = event => {
        if (event.key !== 'Escape') return
        finish(null)
      }
      document.addEventListener('keydown', escape)
      overlay.querySelector('[data-ohb-confirm]').addEventListener('click', () => {
        canvas.toBlob(blob => {
          if (!blob) finish(null)
          else finish(new File([blob], 'customer-home.jpg', { type: 'image/jpeg', lastModified: Date.now() }))
        }, 'image/jpeg', 0.9)
      })
    })
  }

  function panelMarkup() {
    return `<header class="ohb-head"><div class="ohb-title"><span class="ohb-symbol">${icon('sparkle')}</span><div><h2>顧客アプリのホーム表示</h2><p>ホーム上部のメイン画像とフレーズを、この店舗らしい内容に変更できます。変更はこの店舗を登録しているお客様のみに表示されます。</p></div></div><span class="ohb-release">HOME DISPLAY</span></header><div class="ohb-grid"><div class="ohb-preview-wrap"><span class="ohb-label">顧客アプリでの表示</span><div class="ohb-preview"><img data-ohb-preview-image src="${DEFAULT_IMAGE}" alt="顧客アプリのホーム画像プレビュー"><span class="ohb-preview-copy" data-ohb-preview-copy>${DEFAULT_PHRASE}</span></div><div class="ohb-preview-caption"><span>16:9 ワイド</span><strong>保存後すぐに反映</strong></div></div><div class="ohb-fields"><div class="ohb-field"><label for="ohb-phrase">ホームのフレーズ</label><textarea id="ohb-phrase" maxlength="70" rows="3" placeholder="例：あたらしい、\n美しさを大切に。" data-ohb-phrase></textarea><span class="ohb-help"><span>3行・70文字まで</span><span data-ohb-count>0 / 70</span></span></div><div class="ohb-field"><label>メイン画像</label><div class="ohb-image-actions"><button class="ohb-button" type="button" data-ohb-select>${icon('image')}画像を選択・調整</button><button class="ohb-button subtle" type="button" data-ohb-default-image>${icon('reset')}画像だけ初期値へ</button></div><input class="ohb-file" type="file" accept="image/jpeg,image/png,image/webp" data-ohb-file><span class="ohb-help"><span>JPG・PNG・WebP / 5MBまで</span><span>選択後に16:9で調整できます</span></span></div><div class="ohb-actions"><button class="ohb-button primary" type="submit">${icon('check')}ホーム表示を保存</button><button class="ohb-button" type="button" data-ohb-reset>${icon('reset')}すべて初期設定に戻す</button><span class="ohb-status" data-ohb-status role="status" aria-live="polite"></span></div></div></div>`
  }

  async function readPayload(response, fallback) {
    let payload = {}
    try { payload = await response.json() } catch {}
    if (!response.ok) throw new Error(payload.error || fallback)
    return payload
  }

  async function mount() {
    if (!isSettingsRoute()) {
      generation += 1
      document.querySelector('[data-ohb-panel]')?.remove()
      activeModal?.remove()
      activeModal = null
      return
    }
    const section = document.querySelector('#store-profile[data-ca-store-settings], [data-ca-store-settings]#store-profile')
    if (!section || section.querySelector('[data-ohb-panel]')) return
    addStyles()
    const currentGeneration = ++generation
    const panel = document.createElement('form')
    panel.dataset.ohbPanel = RELEASE
    panel.noValidate = true
    panel.innerHTML = panelMarkup()
    section.appendChild(panel)

    const phraseInput = panel.querySelector('[data-ohb-phrase]')
    const count = panel.querySelector('[data-ohb-count]')
    const fileInput = panel.querySelector('[data-ohb-file]')
    let currentImageKey = null
    let pendingImage = null
    let previewObjectUrl = ''
    let currentImageUrl = DEFAULT_IMAGE

    const updatePhrase = () => {
      count.textContent = `${phraseInput.value.length} / 70`
      panel.querySelector('[data-ohb-preview-copy]').textContent = phraseInput.value || DEFAULT_PHRASE
    }
    const showImage = url => {
      currentImageUrl = url || DEFAULT_IMAGE
      panel.querySelector('[data-ohb-preview-image]').src = currentImageUrl
    }
    phraseInput.addEventListener('input', updatePhrase)
    panel.querySelector('[data-ohb-select]').addEventListener('click', () => fileInput.click())
    fileInput.addEventListener('change', async event => {
      event.stopPropagation()
      const file = fileInput.files?.[0]
      fileInput.value = ''
      if (!file) return
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return setStatus(panel, '画像は JPG / PNG / WebP を選択してください。', 'error')
      if (file.size > 5 * 1024 * 1024) return setStatus(panel, '画像は5MB以下にしてください。', 'error')
      try {
        const cropped = await cropImage(file)
        if (!cropped) return
        pendingImage = cropped
        if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl)
        previewObjectUrl = URL.createObjectURL(cropped)
        showImage(previewObjectUrl)
        setStatus(panel, '画像の表示範囲を調整しました。保存すると顧客アプリに反映されます。', 'ok')
      } catch (error) {
        setStatus(panel, error.message || '画像を調整できませんでした。', 'error')
      }
    })
    panel.querySelector('[data-ohb-default-image]').addEventListener('click', () => {
      pendingImage = null
      currentImageKey = null
      if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl)
      previewObjectUrl = ''
      showImage(DEFAULT_IMAGE)
      setStatus(panel, '画像を初期値に戻しました。保存すると確定します。')
    })

    panel.addEventListener('submit', async event => {
      event.preventDefault()
      const phrase = phraseInput.value.replace(/\r\n?/g, '\n').trim()
      if (!phrase) return setStatus(panel, 'ホーム画面のフレーズを入力してください。', 'error')
      if (phrase.split('\n').length > 3) return setStatus(panel, 'フレーズは3行以内で入力してください。', 'error')
      setBusy(panel, true)
      setStatus(panel, pendingImage ? '画像を保存しています…' : 'ホーム表示を保存しています…')
      try {
        let imageKey = currentImageKey
        if (pendingImage) {
          const upload = await fetch(IMAGE_API, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': pendingImage.type }, body: pendingImage })
          const uploaded = await readPayload(upload, '画像を保存できませんでした。')
          imageKey = uploaded.imageKey
        }
        const response = await fetch(API, { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phrase, imageKey }) })
        const result = await readPayload(response, 'ホーム表示を保存できませんでした。')
        currentImageKey = result.branding.imageKey || null
        pendingImage = null
        phraseInput.value = result.branding.phrase
        if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl)
        previewObjectUrl = ''
        setPreview(panel, result.branding.imageUrl || DEFAULT_IMAGE, result.branding.phrase)
        updatePhrase()
        setStatus(panel, '顧客アプリのホーム表示を保存しました。', 'ok')
      } catch (error) {
        setStatus(panel, error.message || 'ホーム表示を保存できませんでした。', 'error')
      } finally {
        setBusy(panel, false)
      }
    })

    panel.querySelector('[data-ohb-reset]').addEventListener('click', async () => {
      if (!window.confirm('ホーム画面の画像とフレーズを初期設定に戻しますか？')) return
      setBusy(panel, true)
      setStatus(panel, '初期設定に戻しています…')
      try {
        const response = await fetch(API, { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reset: true }) })
        const result = await readPayload(response, '初期設定に戻せませんでした。')
        currentImageKey = null
        pendingImage = null
        phraseInput.value = result.branding.phrase || DEFAULT_PHRASE
        if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl)
        previewObjectUrl = ''
        setPreview(panel, result.branding.imageUrl || DEFAULT_IMAGE, phraseInput.value)
        updatePhrase()
        setStatus(panel, '初期設定に戻しました。', 'ok')
      } catch (error) {
        setStatus(panel, error.message || '初期設定に戻せませんでした。', 'error')
      } finally {
        setBusy(panel, false)
      }
    })

    setBusy(panel, true)
    setStatus(panel, '現在の設定を読み込んでいます…')
    try {
      const response = await fetch(`${API}?audience=staff`, { credentials: 'same-origin', cache: 'no-store' })
      const result = await readPayload(response, 'ホーム表示を読み込めませんでした。')
      if (currentGeneration !== generation || !panel.isConnected || !isSettingsRoute()) return
      phraseInput.value = result.branding.phrase || DEFAULT_PHRASE
      currentImageKey = result.branding.imageKey || null
      setPreview(panel, result.branding.imageUrl || DEFAULT_IMAGE, phraseInput.value)
      updatePhrase()
      setStatus(panel, result.branding.isDefault ? '現在は初期設定です。' : '現在の店舗設定を表示しています。')
    } catch (error) {
      if (currentGeneration === generation && panel.isConnected) setStatus(panel, error.message || 'ホーム表示を読み込めませんでした。', 'error')
    } finally {
      if (currentGeneration === generation && panel.isConnected) setBusy(panel, false)
    }
  }

  function schedule() {
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(() => {
      scheduled = false
      mount().catch(error => console.error(`[${RELEASE}] mount failed`, error))
    })
  }

  const observer = new MutationObserver(schedule)
  const start = () => {
    observer.observe(document.body, { childList: true, subtree: true })
    for (const method of ['pushState', 'replaceState']) {
      const original = history[method]
      if (original.__ohbV528) continue
      const wrapped = function (...args) {
        const result = original.apply(this, args)
        setTimeout(schedule, 0)
        return result
      }
      wrapped.__ohbV528 = true
      history[method] = wrapped
    }
    window.addEventListener('popstate', schedule)
    window.addEventListener('pageshow', schedule)
    document.addEventListener('click', event => {
      if (event.target.closest('a[href]')) setTimeout(schedule, 0)
    }, true)
    schedule()
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true })
  else start()
})()
