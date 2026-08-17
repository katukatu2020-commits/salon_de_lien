(() => {
  if (window.__lienCustomerLinkV293_4) return
  window.__lienCustomerLinkV293_4 = true

  const escapeHtml = value => String(value || '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]))

  function addStyles() {
    if (document.querySelector('#lien-customer-link-v293-style')) return
    const style = document.createElement('style')
    style.id = 'lien-customer-link-v293-style'
    style.textContent = `
      .lien-v293-button{display:inline-flex;min-height:44px;align-items:center;justify-content:center;gap:8px;border:0;border-radius:999px;background:#8f4f42;padding:0 20px;color:#fff;font:inherit;font-size:13px;font-weight:800;box-shadow:0 8px 22px rgba(86,50,42,.14);cursor:pointer}.lien-v293-button:hover{background:#7c4338}.lien-v293-button:disabled{cursor:not-allowed;opacity:.55}.lien-v293-button.secondary{border:1px solid #dfcec5;background:#fff;color:#5f453d;box-shadow:none}.lien-v293-button.secondary:hover{background:#fbf3ef}.lien-v293-button svg{width:18px;height:18px}
      .lien-v293-toolbar{display:flex;align-items:center;justify-content:flex-end;margin:0 0 14px}.lien-v293-modal{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;background:rgba(35,29,26,.48);padding:18px;backdrop-filter:blur(5px)}.lien-v293-dialog{width:min(620px,100%);max-height:min(88vh,760px);overflow:auto;border:1px solid #eadbd3;border-radius:24px;background:#fffdfb;box-shadow:0 30px 80px rgba(38,28,24,.22)}.lien-v293-dialog-head{position:sticky;top:0;z-index:2;display:flex;align-items:flex-start;justify-content:space-between;gap:16px;border-bottom:1px solid #eadfd7;background:rgba(255,253,251,.96);padding:20px 22px}.lien-v293-dialog-head h2{margin:0;color:#302824;font-size:20px}.lien-v293-dialog-head p{margin:6px 0 0;color:#7c7168;font-size:11px;line-height:1.7}.lien-v293-close{display:grid;width:42px;height:42px;flex:0 0 42px;place-items:center;border:1px solid #e4d6cf;border-radius:999px;background:#fff;color:#4d403a;font-size:24px;cursor:pointer}.lien-v293-dialog-body{padding:20px 22px 24px}.lien-v293-tabs{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:18px;border:1px solid #eadbd3;border-radius:15px;background:#f8f1ed;padding:4px}.lien-v293-tabs button{min-height:42px;border:0;border-radius:11px;background:transparent;color:#776860;font:inherit;font-size:12px;font-weight:800;cursor:pointer}.lien-v293-tabs button.active{background:#fff;color:#81483d;box-shadow:0 4px 12px rgba(70,45,35,.08)}.lien-v293-field{display:grid;gap:7px;margin-top:14px}.lien-v293-field label{color:#403530;font-size:12px;font-weight:800}.lien-v293-field input,.lien-v293-field select{width:100%;min-height:48px;border:1px solid #ddcfc8;border-radius:13px;background:#fff;padding:0 14px;color:#2f2a25;font:inherit;font-size:13px;outline:none}.lien-v293-field input:focus,.lien-v293-field select:focus{border-color:#9f5c4f;box-shadow:0 0 0 4px rgba(224,190,180,.35)}.lien-v293-field small{color:#8c7d76;font-size:10px;line-height:1.6}.lien-v293-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}.lien-v293-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:20px}.lien-v293-status{min-height:20px;margin:10px 0 0;color:#a13e35;font-size:11px}.lien-v293-preview{margin-top:16px;border:1px solid #cdddc9;border-radius:18px;background:#f4f9f3;padding:16px}.lien-v293-preview-head{display:flex;align-items:center;gap:12px}.lien-v293-avatar{display:grid;width:52px;height:52px;flex:0 0 52px;place-items:center;overflow:hidden;border-radius:50%;background:#f0ded7;color:#884a3f;font-weight:900}.lien-v293-preview strong{display:block;font-size:15px}.lien-v293-preview p{margin:4px 0 0;color:#6f625c;font-size:10px}.lien-v293-preview .lien-v293-button{width:100%;margin-top:14px}
      .lien-v293-toast{position:fixed;right:20px;bottom:20px;z-index:12000;max-width:min(360px,calc(100vw - 32px));border:1px solid #cdddc9;border-radius:15px;background:#f2f8f1;padding:13px 16px;color:#315c3d;font-size:12px;font-weight:800;box-shadow:0 18px 44px rgba(43,61,46,.18);animation:lienV293In .18s ease-out}.lien-v293-toast.error{border-color:#e7c4bd;background:#fff3f0;color:#923c34}@keyframes lienV293In{from{transform:translateY(8px);opacity:0}to{transform:none;opacity:1}}
      .lien-crop-stage{display:grid;place-items:center;overflow:hidden;border-radius:18px;background:#211e1c;padding:10px}.lien-crop-stage canvas{display:block;width:min(72vw,360px);height:min(72vw,360px);max-width:360px;max-height:360px;border-radius:10px;touch-action:none;cursor:grab}.lien-crop-stage canvas:active{cursor:grabbing}.lien-crop-zoom{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:12px;margin-top:16px}.lien-crop-zoom input{width:100%;accent-color:#8f4f42}.lien-crop-hint{margin:10px 0 0;color:#7c7168;font-size:10px;text-align:center}
      .lien-store-preview{margin-top:14px;border:1px solid #cbdcca;border-radius:18px;background:#f3f8f2;padding:15px}.lien-store-preview-head{display:flex;align-items:center;gap:12px}.lien-store-preview img{width:52px;height:52px;border-radius:15px;object-fit:cover}.lien-store-preview strong{font-size:14px}.lien-store-preview p{margin:4px 0 0;color:#74665f;font-size:10px}.lien-store-preview button{width:100%;margin-top:14px}.lien-store-qr-card{display:grid;grid-template-columns:160px minmax(0,1fr);align-items:center;gap:18px;margin:18px 24px 22px;border:1px solid #ead9d1;border-radius:20px;background:linear-gradient(145deg,#fff,#fff8f5);padding:18px;box-shadow:0 10px 25px rgba(69,43,34,.06)}.lien-store-qr-card svg{width:154px;height:154px;border-radius:13px;background:#fff}.lien-store-qr-card h3{margin:0;color:#342821;font-size:14px}.lien-store-qr-card p{margin:6px 0 0;color:#806f68;font-size:10px;line-height:1.7}.lien-store-qr-card code{display:inline-block;margin-top:10px;border:1px solid #dfcec6;border-radius:10px;background:#fff;padding:8px 11px;color:#6f3d34;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:12px;font-weight:800;letter-spacing:.06em}
      .lien-scanner-video{display:block;width:100%;max-height:55vh;border-radius:16px;background:#171513;object-fit:cover}.lien-scanner-status{margin:10px 0 0;color:#796a63;font-size:11px;text-align:center}
      @media(max-width:640px){.lien-v293-dialog{border-radius:20px}.lien-v293-dialog-head,.lien-v293-dialog-body{padding-inline:16px}.lien-v293-row{grid-template-columns:1fr}.lien-v293-actions{display:grid}.lien-v293-toolbar{justify-content:stretch}.lien-v293-toolbar .lien-v293-button{width:100%}.lien-store-qr-card{grid-template-columns:1fr;margin:15px 0;padding:16px;text-align:center}.lien-store-qr-card svg{margin:auto}.lien-v293-toast{right:16px;bottom:84px}}
    `
    style.textContent += '.lien-store-qr-card img{display:block;width:154px;height:154px;margin:auto;border-radius:13px;background:#fff;object-fit:contain}'
    document.head.appendChild(style)
  }

  function toast(message, error = false) {
    document.querySelector('.lien-v293-toast')?.remove()
    const node = document.createElement('div')
    node.className = `lien-v293-toast${error ? ' error' : ''}`
    node.setAttribute('role', 'status')
    node.textContent = message
    document.body.appendChild(node)
    setTimeout(() => node.remove(), 3600)
  }

  function modal(title, description) {
    const overlay = document.createElement('div')
    overlay.className = 'lien-v293-modal'
    overlay.innerHTML = `<section class="lien-v293-dialog" role="dialog" aria-modal="true"><header class="lien-v293-dialog-head"><div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p></div><button class="lien-v293-close" type="button" aria-label="閉じる">×</button></header><div class="lien-v293-dialog-body"></div></section>`
    const close = () => { overlay.dispatchEvent(new CustomEvent('lien:close')); overlay.remove() }
    overlay.querySelector('.lien-v293-close').addEventListener('click', close)
    overlay.addEventListener('click', event => { if (event.target === overlay) close() })
    document.body.appendChild(overlay)
    return { overlay, body: overlay.querySelector('.lien-v293-dialog-body'), close }
  }

  function eligibleCropInput(input) {
    if (!(input instanceof HTMLInputElement) || input.type !== 'file') return false
    if (!String(input.accept || '').includes('image')) return false
    if (/\/community(?:\/|$)/.test(location.pathname)) return false
    return location.pathname === '/u/profile' || location.pathname === '/admin/settings' || location.pathname === '/admin/account' || location.pathname.includes('staffManagement') || /icon|avatar|profile/i.test(`${input.name} ${input.id} ${input.getAttribute('aria-label') || ''}`)
  }

  async function cropImage(file) {
    const source = URL.createObjectURL(file)
    const image = new Image()
    image.decoding = 'async'
    image.src = source
    await image.decode()
    const dialog = modal('画像を正方形に調整', 'ドラッグで位置、スライダーで拡大率を調整してください。')
    dialog.body.innerHTML = `<div class="lien-crop-stage"><canvas width="512" height="512"></canvas></div><div class="lien-crop-zoom"><span>小</span><input type="range" min="1" max="3" step="0.01" value="1" aria-label="拡大率"><span>大</span></div><p class="lien-crop-hint">枠内が実際に保存される範囲です。</p><div class="lien-v293-actions"><button class="lien-v293-button secondary" type="button" data-cancel>キャンセル</button><button class="lien-v293-button" type="button" data-confirm>この範囲で決定</button></div>`
    const canvas = dialog.body.querySelector('canvas')
    const context = canvas.getContext('2d')
    const slider = dialog.body.querySelector('input[type=range]')
    let offsetX = 0
    let offsetY = 0
    let dragging = false
    let pointerX = 0
    let pointerY = 0
    const draw = () => {
      const base = Math.max(512 / image.naturalWidth, 512 / image.naturalHeight)
      const scale = base * Number(slider.value)
      const width = image.naturalWidth * scale
      const height = image.naturalHeight * scale
      const limitX = Math.max(0, (width - 512) / 2)
      const limitY = Math.max(0, (height - 512) / 2)
      offsetX = Math.max(-limitX, Math.min(limitX, offsetX))
      offsetY = Math.max(-limitY, Math.min(limitY, offsetY))
      context.clearRect(0, 0, 512, 512)
      context.drawImage(image, (512 - width) / 2 + offsetX, (512 - height) / 2 + offsetY, width, height)
      context.strokeStyle = 'rgba(255,255,255,.9)'
      context.lineWidth = 2
      context.strokeRect(1, 1, 510, 510)
    }
    draw()
    slider.addEventListener('input', draw)
    canvas.addEventListener('pointerdown', event => { dragging = true; pointerX = event.clientX; pointerY = event.clientY; canvas.setPointerCapture(event.pointerId) })
    canvas.addEventListener('pointermove', event => {
      if (!dragging) return
      const rect = canvas.getBoundingClientRect()
      offsetX += (event.clientX - pointerX) * (512 / rect.width)
      offsetY += (event.clientY - pointerY) * (512 / rect.height)
      pointerX = event.clientX
      pointerY = event.clientY
      draw()
    })
    canvas.addEventListener('pointerup', () => { dragging = false })
    canvas.addEventListener('pointercancel', () => { dragging = false })
    return new Promise(resolve => {
      const finish = value => { URL.revokeObjectURL(source); dialog.close(); resolve(value) }
      dialog.body.querySelector('[data-cancel]').addEventListener('click', () => finish(null))
      dialog.overlay.addEventListener('lien:close', () => { URL.revokeObjectURL(source); resolve(null) }, { once: true })
      dialog.body.querySelector('[data-confirm]').addEventListener('click', () => {
        canvas.toBlob(blob => {
          if (!blob) return finish(null)
          finish(new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'image'}-square.jpg`, { type: 'image/jpeg', lastModified: Date.now() }))
        }, 'image/jpeg', 0.9)
      })
    })
  }

  function initCropper() {
    if (document.documentElement.dataset.lienCropperV293) return
    document.documentElement.dataset.lienCropperV293 = '1'
    document.addEventListener('change', async event => {
      const input = event.target
      if (!eligibleCropInput(input)) return
      if (input.dataset.lienCropped === '1') { delete input.dataset.lienCropped; return }
      const file = input.files?.[0]
      if (!file) return
      event.preventDefault()
      event.stopImmediatePropagation()
      try {
        const cropped = await cropImage(file)
        if (!cropped) { input.value = ''; return }
        const transfer = new DataTransfer()
        transfer.items.add(cropped)
        input.files = transfer.files
        input.dataset.lienCropped = '1'
        input.dispatchEvent(new Event('change', { bubbles: true }))
        toast('正方形にトリミングしました。保存ボタンで確定してください。')
      } catch (error) {
        input.value = ''
        toast(error?.message || '画像を調整できませんでした。', true)
      }
    }, true)
  }

  function removeOldCustomerCode() {
    if (location.pathname !== '/u/profile') return
    const explicit = document.querySelector('[data-lien-public-code], .lien-public-code')
    if (explicit) {
      explicit.remove()
      return
    }
    const strong = [...document.querySelectorAll('main strong')].find(node => /^C-R-\d{3,}$/.test(node.textContent.trim()))
    if (!strong) return
    let node = strong.parentElement
    let candidate = null
    while (node && node !== document.querySelector('main')) {
      const content = node.textContent || ''
      if (content.includes('店舗登録用') && content.includes('お客様コード') && node.querySelector('button')) candidate = node
      if (content.length > 500 || node.querySelector('form')) break
      node = node.parentElement
    }
    candidate?.remove()
  }

  async function requestJson(url, options) {
    const response = await fetch(url, { credentials: 'same-origin', ...options })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.error || '処理を完了できませんでした。')
    return result
  }

  function initAdminCustomerDialog() {
    if (location.pathname !== '/admin/customers' || document.querySelector('[data-customer-add-v293]')) return
    const heading = [...document.querySelectorAll('main h2')].find(node => node.textContent.trim() === '顧客リスト')
    if (!heading) return
    const toolbar = document.createElement('div')
    toolbar.className = 'lien-v293-toolbar'
    toolbar.dataset.customerAddV293 = '1'
    toolbar.innerHTML = `<button class="lien-v293-button" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 5v14M5 12h14"/><path d="M19 21a7 7 0 0 0-14 0"/><circle cx="12" cy="7" r="4"/></svg>新しい顧客を追加</button>`
    const section = heading.closest('section,article,div')
    ;(section || heading).insertAdjacentElement('beforebegin', toolbar)
    toolbar.querySelector('button').addEventListener('click', openAdminCustomerDialog)
  }

  function openAdminCustomerDialog() {
    const dialog = modal('新しい顧客を追加', '会員バーコードを読み取るか、店頭で顧客情報を入力します。')
    dialog.body.innerHTML = `<div class="lien-v293-tabs"><button class="active" type="button" data-mode="member">会員バーコード</button><button type="button" data-mode="manual">手動入力</button></div><section data-panel="member"><form id="member-lookup"><div class="lien-v293-field"><label for="member-code-v293">会員コード</label><input id="member-code-v293" autocomplete="off" inputmode="text" placeholder="バーコードを読み取る / C-R-036"><small>バーコードリーダーで読み取ると自動で確認します。</small></div><div class="lien-v293-actions"><button class="lien-v293-button" type="submit">会員情報を確認</button></div></form><p class="lien-v293-status" data-member-status></p><div data-member-preview></div></section><section data-panel="manual" hidden><form id="manual-customer"><div class="lien-v293-field"><label>お名前</label><input name="name" maxlength="80" required></div><div class="lien-v293-field"><label>電話番号</label><input name="phone" inputmode="tel" maxlength="32"></div><div class="lien-v293-row"><div class="lien-v293-field"><label>性別</label><select name="gender"><option value="">未選択</option><option>女性</option><option>男性</option><option>その他</option><option>未回答</option></select></div><div class="lien-v293-field"><label>生年月日</label><input name="birthDate" type="date"></div></div><div class="lien-v293-actions"><button class="lien-v293-button" type="submit">顧客を追加</button></div></form><p class="lien-v293-status" data-manual-status></p></section>`
    dialog.body.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
      dialog.body.querySelectorAll('[data-mode]').forEach(item => item.classList.toggle('active', item === button))
      dialog.body.querySelectorAll('[data-panel]').forEach(panel => { panel.hidden = panel.dataset.panel !== button.dataset.mode })
    }))
    const lookupForm = dialog.body.querySelector('#member-lookup')
    const codeInput = dialog.body.querySelector('#member-code-v293')
    const status = dialog.body.querySelector('[data-member-status]')
    const preview = dialog.body.querySelector('[data-member-preview]')
    let member = null
    lookupForm.addEventListener('submit', async event => {
      event.preventDefault()
      const code = codeInput.value.trim().toUpperCase()
      codeInput.value = code
      status.textContent = '会員情報を確認しています…'
      preview.innerHTML = ''
      try {
        member = await requestJson(`/api/admin/customer-directory?code=${encodeURIComponent(code)}`)
        status.textContent = ''
        preview.innerHTML = `<article class="lien-v293-preview"><div class="lien-v293-preview-head"><span class="lien-v293-avatar">${escapeHtml(member.name.slice(0, 1))}</span><div><strong>${escapeHtml(member.name)}</strong><p>${escapeHtml(member.phone || '電話番号未登録')} / ${escapeHtml(member.publicCode)}</p></div></div><button class="lien-v293-button" type="button">${member.linkedCustomerId ? '顧客カルテを開く' : 'このお客様を店舗へ追加'}</button></article>`
        preview.querySelector('button').addEventListener('click', async () => {
          if (member.linkedCustomerId) return location.assign(`/admin/customers/${encodeURIComponent(member.linkedCustomerId)}`)
          const button = preview.querySelector('button')
          button.disabled = true
          try {
            const result = await requestJson('/api/admin/customer-directory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'member', publicCode: member.publicCode }) })
            toast(result.alreadyLinked ? '登録済みの顧客カルテを開きます。' : '店舗の顧客として追加しました。')
            location.assign(result.redirect)
          } catch (error) { button.disabled = false; status.textContent = error.message }
        })
      } catch (error) { member = null; status.textContent = error.message }
    })
    dialog.body.querySelector('#manual-customer').addEventListener('submit', async event => {
      event.preventDefault()
      const form = new FormData(event.currentTarget)
      const manualStatus = dialog.body.querySelector('[data-manual-status]')
      const button = event.currentTarget.querySelector('button[type=submit]')
      button.disabled = true
      manualStatus.textContent = '登録しています…'
      try {
        const result = await requestJson('/api/admin/customer-directory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'manual', name: form.get('name'), phone: form.get('phone'), gender: form.get('gender'), birthDate: form.get('birthDate') }) })
        toast('新しい顧客を登録しました。')
        location.assign(result.redirect)
      } catch (error) { button.disabled = false; manualStatus.textContent = error.message }
    })
    setTimeout(() => codeInput.focus(), 50)
  }

  async function loadJsQr() {
    if (window.jsQR) return
    await new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = '/vendor/jsQR-v293.js'
      script.onload = resolve
      script.onerror = () => reject(new Error('QR読み取り機能を読み込めませんでした。'))
      document.head.appendChild(script)
    })
  }

  function parsedStoreCode(value) {
    const raw = String(value || '').trim()
    try {
      const url = new URL(raw, location.origin)
      const code = url.searchParams.get('store')
      if (code) return code.trim().toUpperCase()
    } catch {}
    return raw.toUpperCase()
  }

  async function openQrScanner(onCode) {
    const dialog = modal('店舗QRを読み取る', 'QRコードをカメラの中央に合わせてください。')
    dialog.body.innerHTML = `<video class="lien-scanner-video" playsinline muted></video><canvas hidden></canvas><p class="lien-scanner-status">カメラを起動しています…</p><div class="lien-v293-actions"><label class="lien-v293-button secondary">写真から読み取る<input type="file" accept="image/*" capture="environment" hidden></label><button class="lien-v293-button secondary" type="button" data-stop>閉じる</button></div>`
    const video = dialog.body.querySelector('video')
    const canvas = dialog.body.querySelector('canvas')
    const status = dialog.body.querySelector('.lien-scanner-status')
    let stream = null
    let stopped = false
    const stop = () => { stopped = true; stream?.getTracks().forEach(track => track.stop()) }
    dialog.overlay.addEventListener('lien:close', stop, { once: true })
    dialog.body.querySelector('[data-stop]').addEventListener('click', () => { stop(); dialog.close() })
    const decodeCanvas = async () => {
      await loadJsQr()
      const context = canvas.getContext('2d', { willReadFrequently: true })
      const image = context.getImageData(0, 0, canvas.width, canvas.height)
      return window.jsQR(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' })?.data || null
    }
    const accept = value => {
      const code = parsedStoreCode(value)
      if (!/^[A-Z0-9-]{5,32}$/.test(code)) { status.textContent = '店舗QRを確認できませんでした。'; return false }
      stop(); dialog.close(); onCode(code); return true
    }
    dialog.body.querySelector('input[type=file]').addEventListener('change', async event => {
      const file = event.target.files?.[0]
      if (!file) return
      try {
        const bitmap = await createImageBitmap(file)
        canvas.width = bitmap.width; canvas.height = bitmap.height
        canvas.getContext('2d').drawImage(bitmap, 0, 0)
        const value = await decodeCanvas()
        if (!value || !accept(value)) status.textContent = 'QRコードを読み取れませんでした。もう一度お試しください。'
      } catch (error) { status.textContent = error.message || '画像を読み取れませんでした。' }
    })
    try {
      await loadJsQr()
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      video.srcObject = stream
      await video.play()
      status.textContent = 'QRコードをカメラの中央に合わせてください。'
      const tick = async () => {
        if (stopped) return
        if (video.readyState >= 2) {
          const maxWidth = 720
          const ratio = Math.min(1, maxWidth / video.videoWidth)
          canvas.width = Math.max(1, Math.round(video.videoWidth * ratio))
          canvas.height = Math.max(1, Math.round(video.videoHeight * ratio))
          canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
          const value = await decodeCanvas()
          if (value && accept(value)) return
        }
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    } catch {
      status.textContent = 'カメラを起動できません。カメラを許可するか、写真から読み取ってください。'
    }
  }

  function initStorePage() {
    if (location.pathname !== '/u/stores' || document.documentElement.dataset.lienStoresV293) return
    const form = document.querySelector('#register-store-form')
    const input = document.querySelector('#store-code')
    const output = document.querySelector('#store-result')
    const preview = document.querySelector('#store-preview')
    if (!form || !input || !output || !preview) return
    document.documentElement.dataset.lienStoresV293 = '1'
    const lookup = async codeValue => {
      const code = parsedStoreCode(codeValue)
      input.value = code
      output.textContent = '店舗情報を確認しています…'
      preview.innerHTML = ''
      try {
        const result = await requestJson(`/api/lien-customer-stores?lookup=${encodeURIComponent(code)}`)
        const store = result.store
        output.textContent = ''
        preview.innerHTML = `<article class="lien-store-preview"><div class="lien-store-preview-head"><img src="${escapeHtml(store.iconUrl)}" alt=""><div><strong>${escapeHtml(store.name)}</strong><p>${escapeHtml(store.publicCode)}</p></div></div><button class="lien-v293-button" type="button" ${store.alreadyLinked ? 'disabled' : ''}>${store.alreadyLinked ? '登録済みです' : 'この店舗を追加する'}</button></article>`
        preview.querySelector('button').addEventListener('click', async () => {
          const button = preview.querySelector('button')
          button.disabled = true
          output.textContent = '店舗を追加しています…'
          try {
            const saved = await requestJson('/api/lien-customer-stores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'link', storeCode: store.publicCode, confirmed: true }) })
            toast(saved.alreadyLinked ? 'この店舗は登録済みです。' : '店舗を登録しました。')
            location.reload()
          } catch (error) { button.disabled = false; output.textContent = error.message }
        })
      } catch (error) { output.textContent = error.message }
    }
    form.addEventListener('submit', event => { event.preventDefault(); lookup(input.value) })
    document.querySelector('#scan-store-qr')?.addEventListener('click', () => openQrScanner(code => lookup(code)))
    document.querySelectorAll('[data-switch-store]').forEach(button => button.addEventListener('click', async () => {
      button.disabled = true
      try {
        const result = await requestJson('/api/lien-customer-stores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'switch', organizationId: button.dataset.switchStore }) })
        location.assign(result.redirect || '/u/home')
      } catch (error) { button.disabled = false; output.textContent = error.message }
    }))
    if (input.value) lookup(input.value)
  }

  function initStoreSettingsQr() {
    if (location.pathname !== '/admin/settings' || document.querySelector('.lien-store-qr-card')) return
    const codeNode = [...document.querySelectorAll('main code')].find(node => /^(LIEN|STORE)-[A-Z0-9-]+$/.test(node.textContent.trim()))
    if (!codeNode) return
    const publicCode = codeNode.textContent.trim()
    const card = document.createElement('section')
    card.className = 'lien-store-qr-card'
    card.innerHTML = `<div><img src="/api/admin/store-qr.svg" alt="店舗登録用QRコード"></div><div><h3>店舗登録用QRコード</h3><p>お客様が「登録済みの店舗」から読み取ると、この店舗を確認して登録できます。店舗ごとに固有で、ほかの店舗には影響しません。</p><code>${escapeHtml(publicCode)}</code></div>`
    let container = codeNode.parentElement
    while (container?.parentElement && container.textContent.length < 420 && !/^SECTION|ARTICLE$/i.test(container.tagName)) container = container.parentElement
    ;(container || codeNode.parentElement).insertAdjacentElement('afterend', card)
  }

  function run() {
    addStyles()
    initCropper()
    removeOldCustomerCode()
    initAdminCustomerDialog()
    initStorePage()
    initStoreSettingsQr()
  }

  let timer = null
  const schedule = () => {
    if (timer) return
    timer = setTimeout(() => {
      timer = null
      run()
    }, 60)
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true })
  else run()
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true })
  window.addEventListener('popstate', schedule)
})()
