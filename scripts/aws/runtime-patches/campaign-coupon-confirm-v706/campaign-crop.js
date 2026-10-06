  async function cropCampaignImageV706(file) {
    const source = URL.createObjectURL(file), image = new Image()
    image.src = source
    try { await image.decode() } catch { URL.revokeObjectURL(source); throw new Error('画像を読み込めませんでした。JPG・PNG・WebPを選択してください。') }
    const previousFocus = document.activeElement
    const dialog = modal('画像を調整（横4：縦3）', '')
    dialog.overlay.classList.add('lien-v293-crop-modal', 'campaign-crop-v706')
    dialog.body.innerHTML = `<div class="campaign-crop-stage-v706"><canvas width="1200" height="900" aria-label="投稿画像の4対3プレビュー"></canvas></div><div class="campaign-crop-controls-v706"><label>拡大率 <output data-zoom-value>100%</output><input type="range" name="zoom" min="0.1" max="4" step="0.001" value="1"></label><label>横位置<input type="range" name="x" min="-100" max="100" step="1" value="0"></label><label>縦位置<input type="range" name="y" min="-100" max="100" step="1" value="0"></label></div><div class="campaign-crop-fit-v706"><button type="button" class="lien-v293-button secondary" data-fit>画像全体を収める</button><button type="button" class="lien-v293-button secondary" data-fill>枠に合わせる</button></div><div class="lien-v293-actions"><button class="lien-v293-button secondary" type="button" data-cancel>キャンセル</button><button class="lien-v293-button" type="button" data-confirm>この画像を使う</button></div>`
    const canvas = dialog.body.querySelector('canvas'), context = canvas.getContext('2d')
    const zoom = dialog.body.querySelector('[name="zoom"]'), x = dialog.body.querySelector('[name="x"]'), y = dialog.body.querySelector('[name="y"]')
    const cover = Math.max(1200 / image.naturalWidth, 900 / image.naturalHeight)
    const fit = Math.min(1200 / image.naturalWidth, 900 / image.naturalHeight) / cover
    zoom.min = String(Math.min(0.1, fit))
    let pointer = null
    const bounds = () => ({ width: image.naturalWidth * cover * Number(zoom.value), height: image.naturalHeight * cover * Number(zoom.value) })
    const draw = () => {
      const { width, height } = bounds(), dx = Math.abs(width - 1200) / 2, dy = Math.abs(height - 900) / 2
      context.fillStyle = '#ffffff'; context.fillRect(0, 0, 1200, 900)
      context.drawImage(image, (1200 - width) / 2 + dx * Number(x.value) / 100, (900 - height) / 2 + dy * Number(y.value) / 100, width, height)
      dialog.body.querySelector('[data-zoom-value]').value = Math.round(Number(zoom.value) * 100) + '%'
      x.disabled = dx < 0.5; y.disabled = dy < 0.5
    }
    for (const control of [zoom, x, y]) control.addEventListener('input', draw)
    const reset = value => { zoom.value = String(value); x.value = '0'; y.value = '0'; draw() }
    dialog.body.querySelector('[data-fit]').addEventListener('click', () => reset(fit))
    dialog.body.querySelector('[data-fill]').addEventListener('click', () => reset(1))
    canvas.addEventListener('pointerdown', event => { pointer = { id: event.pointerId, x: event.clientX, y: event.clientY }; canvas.setPointerCapture(event.pointerId) })
    canvas.addEventListener('pointermove', event => {
      if (!pointer || pointer.id !== event.pointerId) return
      const rect = canvas.getBoundingClientRect(), { width, height } = bounds(), dx = Math.abs(width - 1200) / 2, dy = Math.abs(height - 900) / 2
      if (dx > 0.5) x.value = String(Math.max(-100, Math.min(100, Number(x.value) + (event.clientX - pointer.x) * 1200 / rect.width / dx * 100)))
      if (dy > 0.5) y.value = String(Math.max(-100, Math.min(100, Number(y.value) + (event.clientY - pointer.y) * 900 / rect.height / dy * 100)))
      pointer = { id: event.pointerId, x: event.clientX, y: event.clientY }; draw()
    })
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(event, () => { pointer = null })
    draw()
    return new Promise(resolve => {
      let settled = false
      const finish = value => { if (settled) return; settled = true; URL.revokeObjectURL(source); document.removeEventListener('keydown', onKey); dialog.overlay.remove(); previousFocus?.focus(); resolve(value) }
      const onKey = event => {
        if (event.key === 'Escape') { event.preventDefault(); finish(null) }
        if (event.key === 'Tab') {
          const controls = [...dialog.overlay.querySelectorAll('button:not(:disabled),input:not(:disabled)')]
          const first = controls[0], last = controls.at(-1)
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
          if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
        }
      }
      document.addEventListener('keydown', onKey)
      zoom.focus()
      dialog.overlay.addEventListener('lien:close', () => finish(null), { once: true })
      dialog.body.querySelector('[data-cancel]').addEventListener('click', () => finish(null))
      dialog.body.querySelector('[data-confirm]').addEventListener('click', event => {
        event.currentTarget.disabled = true
        canvas.toBlob(blob => finish(blob ? new File([blob], (file.name.replace(/\.[^.]+$/, '') || 'campaign') + '-4x3.jpg', { type: 'image/jpeg', lastModified: Date.now() }) : null), 'image/jpeg', 0.94)
      })
    })
  }
