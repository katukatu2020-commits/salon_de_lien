(() => {
  'use strict'

  if (window.__orimiaHotpepperMenuImportV612) return
  window.__orimiaHotpepperMenuImportV612 = true

  const ENDPOINT = '/api/lien-hotpepper-menus-v612'
  const ACTIVE = new Set(['PREVIEW', 'IMPORTING'])

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[character])
  }

  function yen(value) {
    return `${Number(value || 0).toLocaleString('ja-JP')}円`
  }

  function isMenuPage() {
    return location.pathname === '/admin/products' && new URLSearchParams(location.search).get('section') === 'menus'
  }

  function isMenuDialog(dialog) {
    return Boolean(
      dialog.querySelector('input[name="menuName"]')
      && dialog.querySelector('input[name="menuDuration"]')
      && dialog.querySelector('input[name="menuPrice"]')
      && dialog.querySelector('h2')?.textContent.includes('新しい施術メニューを登録')
    )
  }

  function mount(dialog) {
    if (dialog.__orimiaMenuImportV612?.root?.isConnected) return
    if (dialog.__orimiaMenuImportV612) dialog.__orimiaMenuImportV612.dispose()

    const form = dialog.querySelector('form')
    const menuName = form?.querySelector('input[name="menuName"]')
    const manualFields = menuName?.parentElement?.parentElement
    const submit = form?.querySelector('button[type="submit"]')
    const footer = submit?.closest('footer')
    const intro = form?.firstElementChild
    if (!form || !manualFields || !submit || !footer || !intro) return

    const root = document.createElement('section')
    root.className = 'orimia-menu-import-v612'
    root.innerHTML = `
      <label class="orimia-menu-import-mode-v612">
        <input type="checkbox" data-menu-import-mode-v612>
        <span><strong>ホットペッパーから一括取り込み</strong><small>掲載中の通常メニューをまとめて確認し、ORIMIAへ登録します。</small></span>
      </label>
      <div class="orimia-menu-import-panel-v612" data-menu-import-panel-v612 hidden>
        <div class="orimia-menu-import-start-v612">
          <label for="orimia-menu-import-url-v612">メニュー表URL</label>
          <div class="orimia-menu-import-url-v612">
            <input id="orimia-menu-import-url-v612" type="url" inputmode="url" autocomplete="url" spellcheck="false" placeholder="https://beauty.hotpepper.jp/slnH000000000/coupon/CT00/" data-menu-import-url-v612>
            <button type="button" data-menu-import-start-v612>内容を確認</button>
          </div>
          <label class="orimia-menu-import-consent-v612">
            <input type="checkbox" data-menu-import-rights-v612>
            <span>自店舗の掲載内容をORIMIAへ取り込む権限を確認済みです。</span>
          </label>
        </div>
        <p class="orimia-menu-import-feedback-v612" data-menu-import-feedback-v612 role="status" aria-live="polite"></p>
        <div data-menu-import-status-v612></div>
      </div>`
    intro.insertAdjacentElement('afterend', root)

    const mode = root.querySelector('[data-menu-import-mode-v612]')
    const panel = root.querySelector('[data-menu-import-panel-v612]')
    const urlInput = root.querySelector('[data-menu-import-url-v612]')
    const rights = root.querySelector('[data-menu-import-rights-v612]')
    const startButton = root.querySelector('[data-menu-import-start-v612]')
    const feedbackNode = root.querySelector('[data-menu-import-feedback-v612]')
    const statusNode = root.querySelector('[data-menu-import-status-v612]')

    let job = null
    let busy = false
    let disposed = false
    let tickTimer = null
    let selected = new Set()
    let selectionJobId = ''
    let confirmation = null
    let editor = null

    function feedback(message = '') {
      feedbackNode.textContent = message
    }

    function applyMode() {
      const importing = mode.checked
      panel.hidden = !importing
      manualFields.hidden = importing
      submit.hidden = importing
      footer.hidden = importing
      intro.textContent = importing
        ? 'ホットペッパーの通常メニューを確認してから、選択した内容だけを登録できます。'
        : '名称・カテゴリ・施術時間・税込価格を入力してください。あとから一覧で内容を確認できます。'
    }

    function selectedIndices() {
      if (!job) return []
      return [...selected]
        .filter(index => job.items[index]?.status === 'READY')
        .sort((left, right) => left - right)
    }

    function statusLabel(item) {
      return ({
        READY: '取り込み対象',
        DUPLICATE: '登録済み',
        QUEUED: '保存待ち',
        IMPORTED: '保存完了',
        ERROR: '保存失敗',
        SKIPPED: '対象外',
      })[item.status] || item.status
    }

    function itemRows(editable) {
      return job.items.map(item => `
        <tr data-menu-import-row-v612="${item.index}" data-status="${escapeHtml(item.status)}">
          <td class="orimia-menu-import-select-v612">${editable && item.status === 'READY'
            ? `<input type="checkbox" data-menu-import-select-v612="${item.index}" aria-label="${escapeHtml(item.name)}を選択" ${selected.has(item.index) ? 'checked' : ''}>`
            : ''}</td>
          <td>
            <strong>${escapeHtml(item.name)}</strong>
            <small>${escapeHtml(item.category)}</small>
            ${item.priceIsMinimum ? '<small>掲載価格は最低価格</small>' : ''}
          </td>
          <td><span>${item.durationMinutes}分${item.durationEstimated ? '（推定）' : ''}</span><strong>${yen(item.priceYen)}</strong></td>
          <td><span class="orimia-menu-import-state-v612">${statusLabel(item)}</span>${item.error ? `<small>${escapeHtml(item.error)}</small>` : ''}${editable && item.status === 'READY' ? `<button type="button" data-menu-import-edit-v612="${item.index}">編集</button>` : ''}</td>
        </tr>`).join('')
    }

    function renderPreview() {
      const count = selectedIndices().length
      const warning = job.sourceWarnings?.length
        ? `<p class="orimia-menu-import-note-v612">${escapeHtml(job.sourceWarnings.join(' '))}</p>`
        : ''
      statusNode.innerHTML = `
        <div class="orimia-menu-import-summary-v612">
          <div><span>取得件数</span><strong>${job.total}件</strong></div>
          <div><span>登録済み</span><strong>${job.duplicate}件</strong></div>
          <div><span>今回の選択</span><strong data-menu-import-selection-count-v612>${count}件</strong></div>
        </div>
        <div class="orimia-menu-import-progress-label-v612"><span>${escapeHtml(job.salonName)}</span><span>確認完了</span></div>
        <progress class="orimia-menu-import-progress-v612" max="${Math.max(1, job.total)}" value="${job.total}"></progress>
        ${warning}
        <div class="orimia-menu-import-table-wrap-v612">
          <table class="orimia-menu-import-table-v612">
            <thead><tr><th><span class="orimia-sr-only-v612">選択</span></th><th>メニュー</th><th>時間・価格</th><th>状態</th></tr></thead>
            <tbody>${itemRows(true)}</tbody>
          </table>
        </div>
        <div class="orimia-menu-import-actions-v612">
          <button type="button" class="orimia-menu-import-secondary-v612" data-menu-import-cancel-v612>取り込みを中止</button>
          <button type="button" class="orimia-menu-import-primary-v612" data-menu-import-confirm-v612 ${count && !busy ? '' : 'disabled'}>${count}件を取り込む</button>
        </div>`

      statusNode.querySelectorAll('[data-menu-import-select-v612]').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
          const index = Number(checkbox.dataset.menuImportSelectV612)
          if (checkbox.checked) selected.add(index)
          else selected.delete(index)
          render()
        })
      })
      statusNode.querySelectorAll('[data-menu-import-edit-v612]').forEach(button => {
        button.addEventListener('click', () => openEditor(Number(button.dataset.menuImportEditV612)))
      })
      statusNode.querySelector('[data-menu-import-confirm-v612]')?.addEventListener('click', openConfirmation)
      statusNode.querySelector('[data-menu-import-cancel-v612]')?.addEventListener('click', () => {
        if (window.confirm('この取り込みを中止しますか？')) command('cancel')
      })
    }

    function renderProgress() {
      const maximum = Math.max(1, job.selected)
      const done = Math.min(maximum, job.processed)
      const percentage = Math.round(done / maximum * 100)
      const complete = job.status === 'DONE'
      const cancelled = job.status === 'CANCELLED'
      statusNode.innerHTML = `
        <div class="orimia-menu-import-progress-head-v612">
          <div><strong>${complete ? '取り込みが完了しました' : cancelled ? '取り込みを中止しました' : 'メニューを保存しています'}</strong><small>${escapeHtml(job.salonName)}</small></div>
          <strong>${complete ? '完了' : cancelled ? '中止' : `${percentage}%`}</strong>
        </div>
        <div class="orimia-menu-import-progress-label-v612"><span>${job.processed} / ${job.selected}件</span><span>${job.imported}件保存</span></div>
        <progress class="orimia-menu-import-progress-v612" max="${maximum}" value="${done}"></progress>
        <div class="orimia-menu-import-result-v612"><span>保存 ${job.imported}件</span><span>登録済み ${job.duplicate}件</span><span>失敗 ${job.failed}件</span></div>
        <div class="orimia-menu-import-table-wrap-v612">
          <table class="orimia-menu-import-table-v612">
            <thead><tr><th></th><th>メニュー</th><th>時間・価格</th><th>状態</th></tr></thead>
            <tbody>${itemRows(false)}</tbody>
          </table>
        </div>
        <div class="orimia-menu-import-actions-v612">
          ${job.status === 'IMPORTING' ? '<button type="button" class="orimia-menu-import-secondary-v612" data-menu-import-cancel-v612>取り込みを中止</button>' : ''}
          ${job.failed ? '<button type="button" class="orimia-menu-import-secondary-v612" data-menu-import-retry-v612>失敗分を再試行</button>' : ''}
          ${complete || cancelled ? '<button type="button" class="orimia-menu-import-primary-v612" data-menu-import-reload-v612>メニュー一覧へ反映</button>' : ''}
        </div>`
      statusNode.querySelector('[data-menu-import-cancel-v612]')?.addEventListener('click', () => {
        if (window.confirm('取り込みを中止しますか？ 保存済みのメニューは残ります。')) command('cancel')
      })
      statusNode.querySelector('[data-menu-import-retry-v612]')?.addEventListener('click', () => command('retry'))
      statusNode.querySelector('[data-menu-import-reload-v612]')?.addEventListener('click', () => location.reload())
    }

    function render() {
      applyMode()
      const active = Boolean(job && ACTIVE.has(job.status))
      mode.disabled = active
      startButton.disabled = busy || active || !rights.checked
      urlInput.disabled = busy || active
      rights.disabled = busy || active
      if (!job || (!mode.checked && !active)) {
        statusNode.innerHTML = busy && mode.checked
          ? '<div class="orimia-menu-import-loading-v612"><strong>メニュー表を読み込んでいます</strong><span>通常メニューの件数と登録済みデータを確認しています。</span><progress class="orimia-menu-import-progress-v612"></progress></div>'
          : ''
        return
      }
      if (job.status === 'PREVIEW') renderPreview()
      else renderProgress()
    }

    function closeAuxiliaryDialogs() {
      for (const auxiliary of [confirmation, editor]) {
        if (auxiliary?.isConnected) auxiliary.remove()
      }
      confirmation = null
      editor = null
    }

    async function request(action, data = {}, quiet = false) {
      if (!quiet) {
        busy = true
        feedback('')
        render()
      }
      try {
        const response = await fetch(ENDPOINT, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, jobId: job?.id, ...data }),
        })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload.error || '取り込み処理を完了できませんでした。')
        adopt(payload.job)
        return true
      } catch (error) {
        feedback(error.message || '取り込み処理を完了できませんでした。')
        return false
      } finally {
        if (!quiet) {
          busy = false
          render()
        }
      }
    }

    async function command(action, data = {}) {
      return request(action, data, false)
    }

    function scheduleTick() {
      clearTimeout(tickTimer)
      if (!dialog.isConnected) {
        dispose()
        return
      }
      if (disposed || job?.status !== 'IMPORTING') return
      tickTimer = window.setTimeout(async () => {
        if (disposed || job?.status !== 'IMPORTING') return
        await request('tick', {}, true)
        render()
        scheduleTick()
      }, 450)
    }

    function adopt(nextJob) {
      job = nextJob
      if (job?.id && job.id !== selectionJobId) {
        selectionJobId = job.id
        selected = new Set(job.items.filter(item => item.status === 'READY').map(item => item.index))
      } else if (job?.status === 'PREVIEW') {
        selected = new Set([...selected].filter(index => job.items[index]?.status === 'READY'))
      }
      if (job && ACTIVE.has(job.status)) {
        mode.checked = true
        rights.checked = true
        if (!urlInput.value) urlInput.value = job.sourceUrl || ''
      }
      render()
      scheduleTick()
    }

    function openConfirmation() {
      const indices = selectedIndices()
      if (!indices.length || confirmation) return
      confirmation = document.createElement('dialog')
      confirmation.className = 'orimia-menu-import-dialog-v612'
      confirmation.setAttribute('aria-labelledby', 'orimia-menu-import-confirm-title-v612')
      confirmation.innerHTML = `
        <h3 id="orimia-menu-import-confirm-title-v612">メニューの一括取り込み</h3>
        <p><strong>${escapeHtml(job.salonName)}</strong>から取得した内容を確認してください。</p>
        <dl><dt>取得した通常メニュー</dt><dd>${job.total}件</dd><dt>すでに登録済み</dt><dd>${job.duplicate}件</dd><dt>今回取り込むメニュー</dt><dd>${indices.length}件</dd></dl>
        <p>名称・カテゴリ・税込価格を保存します。施術時間の「推定」は取り込み後も編集できます。</p>
        <p class="orimia-menu-import-dialog-feedback-v612" role="status"></p>
        <div class="orimia-menu-import-dialog-actions-v612"><button type="button" data-menu-import-confirm-back-v612>一覧へ戻る</button><button type="button" class="orimia-menu-import-primary-v612" data-menu-import-confirm-run-v612>${indices.length}件を取り込む</button></div>`
      document.body.append(confirmation)
      const close = () => {
        confirmation?.remove()
        confirmation = null
        statusNode.querySelector('[data-menu-import-confirm-v612]')?.focus()
      }
      confirmation.addEventListener('cancel', event => {
        event.preventDefault()
        close()
      })
      confirmation.querySelector('[data-menu-import-confirm-back-v612]').addEventListener('click', close)
      confirmation.querySelector('[data-menu-import-confirm-run-v612]').addEventListener('click', async event => {
        confirmation.querySelectorAll('button').forEach(button => { button.disabled = true })
        const success = await command('confirm', { indices, total: job.total, rightsConfirmed: true })
        if (success) close()
        else {
          confirmation.querySelectorAll('button').forEach(button => { button.disabled = false })
          confirmation.querySelector('.orimia-menu-import-dialog-feedback-v612').textContent = feedbackNode.textContent
          event.currentTarget.focus()
        }
      })
      confirmation.showModal()
      confirmation.querySelector('[data-menu-import-confirm-back-v612]').focus()
    }

    function openEditor(index) {
      const item = job?.items[index]
      if (!item || item.status !== 'READY' || editor) return
      editor = document.createElement('dialog')
      editor.className = 'orimia-menu-import-dialog-v612 orimia-menu-import-editor-v612'
      editor.setAttribute('aria-labelledby', 'orimia-menu-import-editor-title-v612')
      editor.innerHTML = `
        <form method="dialog" data-menu-import-editor-form-v612>
          <h3 id="orimia-menu-import-editor-title-v612">メニュー内容を編集</h3>
          <label>メニュー名<input name="name" maxlength="140" required value="${escapeHtml(item.name)}"></label>
          <label>カテゴリ<input name="category" maxlength="80" required value="${escapeHtml(item.category)}"></label>
          <div class="orimia-menu-import-editor-columns-v612"><label>施術時間（分）<input name="durationMinutes" type="number" min="1" max="1440" required value="${item.durationMinutes}"></label><label>税込価格<input name="priceYen" type="number" min="0" max="10000000" required value="${item.priceYen}"></label></div>
          <label class="orimia-menu-import-consent-v612"><input name="priceIsMinimum" type="checkbox" ${item.priceIsMinimum ? 'checked' : ''}><span>掲載価格は最低価格（〜）</span></label>
          <label>説明<textarea name="description" maxlength="1200" rows="5">${escapeHtml(item.description)}</textarea></label>
          <p class="orimia-menu-import-dialog-feedback-v612" role="status"></p>
          <div class="orimia-menu-import-dialog-actions-v612"><button type="button" data-menu-import-editor-close-v612>キャンセル</button><button type="submit" class="orimia-menu-import-primary-v612">変更を保存</button></div>
        </form>`
      document.body.append(editor)
      const close = () => {
        editor?.remove()
        editor = null
        statusNode.querySelector(`[data-menu-import-edit-v612="${index}"]`)?.focus()
      }
      editor.addEventListener('cancel', event => {
        event.preventDefault()
        close()
      })
      editor.querySelector('[data-menu-import-editor-close-v612]').addEventListener('click', close)
      editor.querySelector('[data-menu-import-editor-form-v612]').addEventListener('submit', async event => {
        event.preventDefault()
        const formData = new FormData(event.currentTarget)
        editor.querySelectorAll('button').forEach(button => { button.disabled = true })
        const success = await command('edit', {
          index,
          menu: {
            name: formData.get('name'),
            category: formData.get('category'),
            durationMinutes: Number(formData.get('durationMinutes')),
            priceYen: Number(formData.get('priceYen')),
            priceIsMinimum: formData.get('priceIsMinimum') === 'on',
            description: formData.get('description'),
          },
        })
        if (success) close()
        else {
          editor.querySelectorAll('button').forEach(button => { button.disabled = false })
          editor.querySelector('.orimia-menu-import-dialog-feedback-v612').textContent = feedbackNode.textContent
        }
      })
      editor.showModal()
      editor.querySelector('input[name="name"]').focus()
    }

    async function loadCurrentJob() {
      try {
        const response = await fetch(ENDPOINT, { credentials: 'same-origin', cache: 'no-store' })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload.error || '前回の取り込み状況を確認できませんでした。')
        if (payload.job && ACTIVE.has(payload.job.status)) adopt(payload.job)
      } catch (error) {
        feedback(error.message || '前回の取り込み状況を確認できませんでした。')
      }
    }

    mode.addEventListener('change', () => {
      applyMode()
      if (mode.checked) {
        render()
        urlInput.focus()
        loadCurrentJob()
      } else {
        feedback('')
        statusNode.innerHTML = ''
        render()
      }
    })
    rights.addEventListener('change', render)
    startButton.addEventListener('click', async () => {
      const value = urlInput.value.trim()
      if (!value) {
        feedback('ホットペッパーのメニュー表URLを入力してください。')
        urlInput.focus()
        return
      }
      if (!rights.checked) {
        feedback('自店舗の掲載内容を取り込む権限を確認してください。')
        rights.focus()
        return
      }
      job = null
      selected.clear()
      selectionJobId = ''
      await command('start', { url: value, rightsConfirmed: true })
    })

    function dispose() {
      disposed = true
      clearTimeout(tickTimer)
      closeAuxiliaryDialogs()
      dialog.__orimiaMenuImportV612 = null
    }

    dialog.__orimiaMenuImportV612 = { root, dispose }
    applyMode()
    render()
  }

  function scan() {
    if (!isMenuPage()) return
    document.querySelectorAll('[role="dialog"]').forEach(dialog => {
      if (isMenuDialog(dialog)) mount(dialog)
    })
  }

  const observer = new MutationObserver(scan)
  observer.observe(document.documentElement, { childList: true, subtree: true })
  scan()
})()
