(() => {
  'use strict'

  if (window.__lienCustomerProfileImageV401) return
  window.__lienCustomerProfileImageV401 = true

  const MAX_BYTES = 5 * 1024 * 1024
  const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
  const OUTPUT_SIZE = 720
  const styleId = 'lien-profile-image-v401-style'
  let activeModal = null

  function ensureStyles() {
    if (document.getElementById(styleId)) return
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      .lien-profile-crop-backdrop{position:fixed;inset:0;z-index:2147483000;overflow:auto;background:rgba(35,29,25,.52);backdrop-filter:blur(7px);padding:16px;display:grid;place-items:center}
      .lien-profile-crop-dialog{width:min(100%,520px);max-height:calc(100dvh - 32px);overflow:auto;border:1px solid #e8ded2;border-radius:24px;background:#fff;box-shadow:0 24px 80px rgba(47,42,37,.25);color:#2f2a25}
      .lien-profile-crop-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:18px 20px;border-bottom:1px solid #eee5dc}
      .lien-profile-crop-kicker{margin:0;color:#8f4f42;font-size:12px;font-weight:700}.lien-profile-crop-head h2{margin:4px 0 0;font-size:20px}.lien-profile-crop-head p:last-child{margin:6px 0 0;color:#7c7168;font-size:12px;line-height:1.6}
      .lien-profile-crop-close{width:44px;height:44px;flex:none;border:1px solid #e8ded2;border-radius:999px;background:#fff;color:#5b5149;font-size:24px;line-height:1;cursor:pointer}
      .lien-profile-crop-body{display:grid;gap:18px;padding:20px}.lien-profile-crop-canvas-wrap{position:relative;width:min(100%,360px);aspect-ratio:1;margin:auto;overflow:hidden;border:1px solid #e8ded2;border-radius:20px;background:#f6efe6;box-shadow:inset 0 1px 8px rgba(47,42,37,.08)}
      .lien-profile-crop-canvas{display:block;width:100%;height:100%}.lien-profile-crop-loading{position:absolute;inset:0;display:grid;place-items:center;color:#7c7168;font-size:13px}
      .lien-profile-crop-controls{display:grid;gap:12px;padding:15px;border-radius:18px;background:#f8f3ed}.lien-profile-crop-controls label{display:grid;gap:6px;color:#4f463f;font-size:12px;font-weight:700}.lien-profile-crop-controls input{width:100%;height:32px;accent-color:#8f4f42}.lien-profile-crop-axis{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      .lien-profile-crop-error{display:none;margin:0;padding:12px 14px;border-radius:12px;background:#fff0ef;color:#8b342b;font-size:13px;font-weight:700}.lien-profile-crop-error.show{display:block}
      .lien-profile-crop-actions{display:flex;justify-content:space-between;gap:12px}.lien-profile-crop-button{min-height:44px;border-radius:999px;padding:0 20px;border:1px solid #e8ded2;background:#fff;color:#4f463f;font:inherit;font-size:14px;font-weight:700;cursor:pointer}.lien-profile-crop-button.primary{border-color:#8f4f42;background:#8f4f42;color:#fff}.lien-profile-crop-button:disabled{cursor:wait;opacity:.6}
      form[data-lien-profile-upload-v401] button[type="submit"]{min-height:44px;border:0;border-radius:999px!important;background:#8f4f42!important;padding:0 22px!important;color:#fff!important;font-size:14px!important}
      @media(max-width:520px){.lien-profile-crop-backdrop{display:block;padding:12px}.lien-profile-crop-dialog{max-height:calc(100dvh - 24px)}.lien-profile-crop-actions{flex-direction:column-reverse}.lien-profile-crop-button{width:100%}}
    `
    document.head.appendChild(style)
  }

  function cropRegion(image, zoom, positionX, positionY) {
    const safeZoom = Math.min(3, Math.max(1, Number(zoom) || 1))
    const sourceSize = Math.min(image.naturalWidth, image.naturalHeight) / safeZoom
    return {
      x: (image.naturalWidth - sourceSize) * (Math.min(100, Math.max(0, positionX)) / 100),
      y: (image.naturalHeight - sourceSize) * (Math.min(100, Math.max(0, positionY)) / 100),
      size: sourceSize,
    }
  }

  function draw(image, canvas, zoom, positionX, positionY) {
    const context = canvas.getContext('2d')
    if (!context) throw new Error('画像編集を開始できませんでした。')
    const region = cropRegion(image, zoom, positionX, positionY)
    canvas.width = OUTPUT_SIZE
    canvas.height = OUTPUT_SIZE
    context.fillStyle = '#f6efe6'
    context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
    context.drawImage(image, region.x, region.y, region.size, region.size, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
  }

  function closeModal({ clearInput = false } = {}) {
    if (!activeModal) return
    const { root, objectUrl, input, previousOverflow, keyHandler } = activeModal
    window.removeEventListener('keydown', keyHandler)
    document.body.style.overflow = previousOverflow
    URL.revokeObjectURL(objectUrl)
    root.remove()
    if (clearInput) {
      input.value = ''
      input.dispatchEvent(new Event('change', { bubbles: true }))
    }
    activeModal = null
  }

  function openCrop(input, file) {
    closeModal()
    ensureStyles()
    const objectUrl = URL.createObjectURL(file)
    const root = document.createElement('div')
    root.className = 'lien-profile-crop-backdrop'
    root.innerHTML = `
      <section class="lien-profile-crop-dialog" role="dialog" aria-modal="true" aria-labelledby="lien-profile-crop-title">
        <header class="lien-profile-crop-head"><div><p class="lien-profile-crop-kicker">プロフィールアイコン</p><h2 id="lien-profile-crop-title">正方形に切り抜く</h2><p>位置と拡大率を調整して、表示範囲を決めてください。</p></div><button type="button" class="lien-profile-crop-close" aria-label="画像編集を閉じる">×</button></header>
        <div class="lien-profile-crop-body">
          <div class="lien-profile-crop-canvas-wrap"><canvas class="lien-profile-crop-canvas" aria-label="プロフィール画像の切り抜きプレビュー"></canvas><div class="lien-profile-crop-loading">画像を読み込んでいます...</div></div>
          <div class="lien-profile-crop-controls"><label>拡大率<input data-control="zoom" type="range" min="1" max="3" step="0.05" value="1"></label><div class="lien-profile-crop-axis"><label>左右<input data-control="x" type="range" min="0" max="100" value="50"></label><label>上下<input data-control="y" type="range" min="0" max="100" value="50"></label></div></div>
          <p class="lien-profile-crop-error" role="alert"></p>
          <div class="lien-profile-crop-actions"><button type="button" class="lien-profile-crop-button" data-action="reset">中央に戻す</button><button type="button" class="lien-profile-crop-button primary" data-action="confirm" disabled>この範囲で決定</button></div>
        </div>
      </section>`
    document.body.appendChild(root)

    const canvas = root.querySelector('canvas')
    const loading = root.querySelector('.lien-profile-crop-loading')
    const error = root.querySelector('.lien-profile-crop-error')
    const confirm = root.querySelector('[data-action="confirm"]')
    const zoom = root.querySelector('[data-control="zoom"]')
    const positionX = root.querySelector('[data-control="x"]')
    const positionY = root.querySelector('[data-control="y"]')
    const image = new Image()

    const showError = (message) => {
      error.textContent = message
      error.classList.add('show')
    }
    const render = () => {
      if (!image.naturalWidth) return
      try {
        draw(image, canvas, zoom.value, positionX.value, positionY.value)
      } catch (renderError) {
        showError(renderError instanceof Error ? renderError.message : '画像を表示できませんでした。')
      }
    }
    image.onload = () => {
      loading.remove()
      confirm.disabled = false
      render()
    }
    image.onerror = () => {
      loading.remove()
      showError('この画像を読み込めませんでした。JPG、PNG、WebPを選択してください。')
    }
    image.src = objectUrl

    ;[zoom, positionX, positionY].forEach((control) => control.addEventListener('input', render))
    root.querySelector('[data-action="reset"]').addEventListener('click', () => {
      zoom.value = '1'; positionX.value = '50'; positionY.value = '50'; render()
    })
    root.querySelector('.lien-profile-crop-close').addEventListener('click', () => closeModal({ clearInput: true }))
    root.addEventListener('click', (event) => {
      if (event.target === root) closeModal({ clearInput: true })
    })
    confirm.addEventListener('click', () => {
      confirm.disabled = true
      confirm.textContent = '切り抜き中...'
      canvas.toBlob((blob) => {
        if (!blob) {
          confirm.disabled = false
          confirm.textContent = 'この範囲で決定'
          showError('画像を書き出せませんでした。')
          return
        }
        const transfer = new DataTransfer()
        const baseName = file.name.replace(/\.[^.]+$/, '') || 'profile'
        const cropped = new File([blob], `${baseName}-square.jpg`, { type: 'image/jpeg', lastModified: Date.now() })
        transfer.items.add(cropped)
        input.dataset.lienCroppedV401 = '1'
        input.files = transfer.files
        input.dispatchEvent(new Event('change', { bubbles: true }))

        const avatar = input.closest('form')?.parentElement?.querySelector('img[alt$="のプロフィール画像"]')
        if (avatar) avatar.src = URL.createObjectURL(blob)
        closeModal()
      }, 'image/jpeg', 0.9)
    })

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const keyHandler = (event) => {
      if (event.key === 'Escape') closeModal({ clearInput: true })
    }
    window.addEventListener('keydown', keyHandler)
    activeModal = { root, objectUrl, input, previousOverflow, keyHandler }
    root.querySelector('.lien-profile-crop-close').focus()
  }

  function bindProfileUploader() {
    if (location.pathname !== '/u/profile') return
    const input = document.querySelector('input[type="file"][name="profileImage"]')
    if (!input || input.dataset.lienProfileV401) return
    input.dataset.lienProfileV401 = '1'
    const form = input.closest('form')
    if (form) form.dataset.lienProfileUploadV401 = '1'

    input.addEventListener('change', () => {
      if (input.dataset.lienCroppedV401 === '1') {
        delete input.dataset.lienCroppedV401
        return
      }
      const file = input.files?.[0]
      if (!file) return
      if (!ALLOWED_TYPES.has(file.type)) {
        window.alert('JPG、PNG、WebPの画像を選択してください。')
        input.value = ''
        return
      }
      if (file.size > MAX_BYTES) {
        window.alert('プロフィール画像は5MB以下にしてください。')
        input.value = ''
        return
      }
      openCrop(input, file)
    })
  }

  bindProfileUploader()
  new MutationObserver(bindProfileUploader).observe(document.documentElement, { childList: true, subtree: true })
  window.addEventListener('popstate', () => setTimeout(bindProfileUploader, 0))
})()
