  function configureHotpepper(modal) {
    const body = modal.querySelector('.ca-cp-body')
    const manual = document.createElement('div')
    manual.className = 'hp-manual'
    manual.append(...body.childNodes)
    body.append(manual)
    const labels = { title:'スタイル名', stylistName:'担当スタイリスト', stylistKana:'ふりがな', stylistRole:'役職', stylistComment:'スタイリストコメント', menuDescription:'メニュー内容' }
    const limits = { title:160, stylistName:100, stylistKana:100, stylistRole:160, stylistComment:4000, menuDescription:2000 }
    const fieldsMarkup = (prefix, data = {}) => `<div class="hp-fields">${Object.entries(labels).map(([key, label]) => `<div class="ca-cp-field ${['stylistComment','menuDescription'].includes(key) ? 'hp-wide' : ''}"><label for="${prefix}-${key}">${label}</label>${['stylistComment','menuDescription'].includes(key) ? `<textarea id="${prefix}-${key}" data-hp-field="${key}" rows="3" maxlength="${limits[key]}">${esc(data[key] || '')}</textarea>` : `<input id="${prefix}-${key}" data-hp-field="${key}" maxlength="${limits[key]}" value="${esc(data[key] || '')}">`}</div>`).join('')}</div>`
    const fields = document.createElement('div')
    fields.innerHTML = fieldsMarkup('hp-manual')
    manual.querySelector('.ca-cp-field').before(fields)
    const chooser = document.createElement('label')
    chooser.className = 'hp-mode'
    chooser.innerHTML = '<input type="checkbox" data-hp-mode>ホットペッパーから一括取り込み'
    body.prepend(chooser)
    const panel = document.createElement('section')
    panel.className = 'hp-panel'; panel.hidden = true
    panel.innerHTML = `<div class="hp-start"><label for="hp-url">スタイル一覧URL</label><div class="hp-url-row"><input id="hp-url" type="url" placeholder="https://beauty.hotpepper.jp/slnH000000000/style/"><button type="button" class="ca-cp-submit" data-hp-start>取り込み件数を確認</button></div><label class="hp-consent"><input type="checkbox" data-hp-rights>店舗オーナーの許可と、写真・文章の転載に必要な権利・お客様・スタッフの同意を確認済みです。</label></div><p class="hp-feedback" role="status" aria-live="polite"></p><div data-hp-results></div>`
    body.append(panel)
    const reconnect = document.createElement('button')
    reconnect.type = 'button'; reconnect.className = 'hp-row-action'; reconnect.textContent = '通信を再開'; reconnect.hidden = true
    panel.querySelector('.hp-feedback').after(reconnect)
    reconnect.addEventListener('click', () => loadJob())
    const style = document.createElement('style')
    style.textContent = `.ca-cp-dialog [hidden]{display:none!important}.hp-manual,.hp-panel{display:grid;gap:18px}.hp-mode,.hp-consent{display:flex;align-items:flex-start;gap:10px;font-size:12px;line-height:1.65;color:#403b39}.hp-mode{padding:12px 0;border-bottom:1px solid #e3dcd8;font-weight:800}.hp-mode input,.hp-consent input,.hp-tools input,.hp-table input[type=checkbox]{width:18px;height:18px;flex:none;margin:1px 0;accent-color:#b84865}.hp-fields{display:grid;grid-template-columns:1fr 1fr;gap:14px}.hp-wide{grid-column:1/-1}.hp-fields input,.hp-url-row input{width:100%;min-width:0;border:1px solid #dfd4ce;border-radius:6px;padding:11px;font:inherit;font-size:13px;background:#fff;color:#322e2b}.hp-fields input:focus,.hp-url-row input:focus{outline:2px solid #b84865;outline-offset:2px}.hp-start>label:first-child{font-size:12px;font-weight:800}.hp-url-row{display:flex;gap:10px;margin:8px 0 16px}.hp-url-row .ca-cp-submit{min-width:120px;flex:none}.hp-consent+.hp-consent{margin-top:10px}.hp-feedback{margin:0;color:#97405a;font-size:12px;overflow-wrap:anywhere}.hp-status{display:flex;gap:12px;justify-content:space-between;align-items:center;flex-wrap:wrap}.hp-status h3{font-size:16px;margin:0}.hp-status p{font-size:12px;color:#6d6260;margin:6px 0}.hp-tools{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:12px 0}.hp-tools label{display:flex;gap:8px;align-items:center;font-size:12px}.hp-tools button,.hp-row-action,.hp-page button{min-height:36px;padding:6px 12px;border:1px solid #dacec8;border-radius:6px;background:#fff;color:#61524c;font:inherit;font-size:12px}.hp-table-wrap{overflow:auto}.hp-table{width:100%;border-collapse:collapse;text-align:left;table-layout:fixed;font-size:12px}.hp-table th{color:#766960;background:#f5f5f3;font-weight:700}.hp-table th,.hp-table td{padding:10px 8px;border-bottom:1px solid #e3ddd9;vertical-align:middle;overflow-wrap:anywhere}.hp-table th:first-child{width:34px}.hp-table th:nth-child(2){width:62px}.hp-table th:last-child{width:110px}.hp-table img{display:block;width:44px;height:58px;object-fit:cover;border-radius:4px}.hp-table strong{display:block;font-size:12px}.hp-table small{display:block;color:#756b65;line-height:1.6}.hp-table a{color:#9f3e59}.hp-page{display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:12px;margin-top:12px}.hp-review{margin-top:16px;border-top:1px solid #dfd4ce;padding-top:16px}.hp-review summary{font-weight:700;font-size:13px;cursor:pointer;margin-bottom:14px}.hp-review-images{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px}.hp-review-images figure{margin:0;max-width:140px}.hp-review-images img{display:block;width:100%;height:170px;object-fit:contain;background:#f4f4f2}.hp-review-images figcaption{font-size:10px;margin-top:4px;color:#62534d}.hp-publish-row{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:18px}.hp-progress{width:100%;height:6px;accent-color:#4e8476}.ca-cp-dialog button:disabled{opacity:.55;cursor:not-allowed}.ca-cp-dialog:focus{outline:none}@media(max-width:639px){.hp-fields{grid-template-columns:1fr}.hp-wide{grid-column:auto}.hp-url-row,.hp-publish-row{flex-direction:column;align-items:stretch}.hp-table th:nth-child(2){width:52px}.hp-table th:last-child{width:94px}.hp-table th,.hp-table td{padding:8px 4px}.hp-review-images figure{max-width:90px}.hp-review-images img{height:120px}}`
    modal.append(style)
    const confirmStyle = document.createElement('style')
    confirmStyle.textContent = '.hp-confirm{box-sizing:border-box;width:min(460px,calc(100vw - 32px));max-height:calc(100dvh - 32px);overflow:auto;padding:24px;border:1px solid #ded9d5;border-radius:8px;color:#322e2b;background:#fff;box-shadow:0 12px 48px #0003;font:14px/1.65 sans-serif}.hp-confirm::backdrop{background:#0006}.hp-confirm h3{margin:0 0 12px;font-size:20px}.hp-confirm p{overflow-wrap:anywhere}.hp-confirm dl{display:grid;grid-template-columns:1fr auto;gap:10px;margin:18px 0;padding:16px 0;border-block:1px solid #e3ddd9}.hp-confirm dd{margin:0;font-weight:700;font-variant-numeric:tabular-nums}.hp-confirm-actions{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;margin-top:20px}.hp-progress-row{display:flex;justify-content:space-between;gap:12px;margin:16px 0 8px;font-size:13px;font-weight:700}.hp-panel .hp-progress{display:block;width:100%;height:12px;accent-color:#397a65}.hp-progress::-webkit-progress-bar{background:#e7ece9;border-radius:6px}.hp-progress::-webkit-progress-value{background:#397a65;border-radius:6px}.hp-progress::-moz-progress-bar{background:#397a65;border-radius:6px}'
    modal.append(confirmStyle)
    let job = null, busy = false, timer = null, offset = 0, stopped = false, allReady = false
    let confirmation = null, offeredJob = null
    const selected = new Set(), excluded = new Set()
    const feedback = message => { panel.querySelector('.hp-feedback').textContent = message || '' }
    const check = panel.querySelector('[data-hp-results]')
    const mode = chooser.querySelector('input')
    const statusNames = { DISCOVERING:'件数を確認中', CONFIRMATION:'取り込みの確認待ち', IMPORTING:'ORIMIAに保存中', SCANNING:'掲載スタイルを読み込み中', READY:'内容確認', PUBLISHING:'公開処理中', DONE:'取り込み結果', PAUSED:'一時停止', CANCELLED:'中止しました' }
    function showConfirmation() {
      if (confirmation || job?.status !== 'CONFIRMATION') return
      if (!panel.querySelector('[data-hp-rights]').checked) { feedback('店舗オーナーの許可と掲載権限の確認にチェックしてください。'); return }
      offeredJob = job.id
      const snapshot = { id: job.id, total: job.total }
      confirmation = document.createElement('dialog')
      confirmation.className = 'hp-confirm'
      confirmation.setAttribute('aria-labelledby', 'hp-confirm-title')
      confirmation.innerHTML = `<h3 id="hp-confirm-title">スタイルの一括取り込み</h3><p><strong>${esc(job.salonName)}</strong></p><dl><dt>掲載スタイル</dt><dd>${job.total}件</dd><dt>取り込み済み</dt><dd>${job.duplicate}件</dd><dt>今回取り込むスタイル</dt><dd>${job.total - job.duplicate}件</dd></dl><p>写真・スタイル名・担当者・コメント・メニューをORIMIAに保存し、スタイル共有へ掲載します。</p><p class="hp-feedback" data-hp-confirm-feedback role="status"></p><div class="hp-confirm-actions"><button type="button" class="hp-row-action" data-hp-confirm-back>戻る</button><button type="button" class="ca-cp-submit" data-hp-confirm>${job.total - job.duplicate}件を取り込む</button></div>`
      document.body.append(confirmation)
      confirmation.addEventListener('close', () => { confirmation?.remove(); confirmation = null; check.querySelector('[data-hp-show-confirm]')?.focus() })
      confirmation.addEventListener('keydown', event => { if (event.key === 'Escape') event.stopPropagation() })
      confirmation.querySelector('[data-hp-confirm-back]').addEventListener('click', () => confirmation.close())
      confirmation.querySelector('[data-hp-confirm]').addEventListener('click', async () => {
        const dialog = confirmation
        dialog.querySelectorAll('button').forEach(button => { button.disabled = true })
        const success = await command('confirm', { jobId: snapshot.id, total: snapshot.total, rightsConfirmed: panel.querySelector('[data-hp-rights]').checked })
        if (success) { if (dialog.open) dialog.close(); schedule() }
        else if (dialog.isConnected) { dialog.querySelectorAll('button').forEach(button => { button.disabled = false }); dialog.querySelector('[data-hp-confirm-feedback]').textContent = panel.querySelector('.hp-feedback').textContent }
      })
      confirmation.showModal()
      confirmation.querySelector('[data-hp-confirm-back]').focus()
    }
    function selectedCount() { return allReady ? Math.max(0, (job?.ready || 0) - excluded.size) : selected.size }
    function render() {
      if (!modal.isConnected) return
      const focusedSelection = document.activeElement?.getAttribute('data-hp-select')
      const focusedAll = document.activeElement?.hasAttribute('data-hp-all')
      panel.querySelector('[data-hp-start]').disabled = busy || Boolean(job && !['DONE','CANCELLED'].includes(job.status)) || !panel.querySelector('[data-hp-rights]').checked
      if (!job || job.status === 'CANCELLED') { check.innerHTML = ''; return }
      if (job.automatic) {
        const discovering = job.status === 'DISCOVERING' || job.status === 'PAUSED' && !job.confirmedAt
        const processed = job.processed || 0
        const percentage = job.total ? Math.floor(processed / job.total * 100) : job.status === 'DONE' ? 100 : 0
        check.innerHTML = `<div class="hp-status"><div><h3>${esc(job.salonName || 'ホットペッパー')}</h3><p>${statusNames[job.status]}</p></div></div><div class="hp-progress-row"><span>${discovering ? `${job.discoveredPages}ページ確認 · ${job.total}件見つかりました` : `${processed} / ${job.total}件`}</span><span>${discovering ? '件数確認中' : `${percentage}%`}</span></div><progress aria-label="${discovering ? '取り込み件数の確認' : 'スタイルの取り込み進捗'}" class="hp-progress" max="${Math.max(1, job.total)}" ${discovering ? '' : `value="${job.total ? processed : job.status === 'DONE' ? 1 : 0}"`}></progress><div class="hp-tools"><span>${job.published}件保存 · ${job.duplicate}件取り込み済み · ${job.failed}件失敗</span>${job.status === 'CONFIRMATION' ? '<button type="button" class="ca-cp-submit" data-hp-show-confirm>件数を確認して取り込む</button>' : ''}${job.failed || job.status === 'PAUSED' ? '<button type="button" data-hp-retry>失敗分を再試行</button>' : ''}${job.status !== 'DONE' ? '<button type="button" data-hp-cancel>取り込みを中止</button>' : '<a href="/admin/community">スタイル共有を見る</a>'}</div>${job.error ? `<p class="hp-feedback">${esc(job.error)}</p>` : ''}<div class="hp-table-wrap"><table class="hp-table"><thead><tr><th></th><th>写真</th><th>スタイル / 担当者</th><th>状態</th></tr></thead><tbody>${job.items.map(item => `<tr><td></td><td>${item.data?.photos?.[0] ? `<img loading="lazy" referrerpolicy="no-referrer" src="${esc(item.data.photos[0].url)}" alt="">` : ''}</td><td><strong>${esc(item.data?.title || item.url.split('/').pop())}</strong><small>${esc(item.data?.stylistName || '')}</small></td><td>${item.status === 'PUBLISHED' ? `<a href="/admin/community/${encodeURIComponent(item.postId)}">保存済み</a>` : ({ DUPLICATE:'取り込み済み', PENDING:'待機中', READY:'保存待ち', QUEUED:'保存待ち', ERROR:'失敗' })[item.status]}${item.error ? `<small>${esc(item.error)}</small>` : ''}</td></tr>`).join('')}</tbody></table></div><div class="hp-page"><button type="button" data-hp-prev ${offset === 0 ? 'disabled' : ''}>前へ</button><span>${job.total ? offset + 1 : 0}–${Math.min(offset + 25, job.total)} / ${job.total}件</span><button type="button" data-hp-next ${offset + 25 >= job.total ? 'disabled' : ''}>次へ</button></div>`
        check.querySelector('[data-hp-show-confirm]')?.addEventListener('click', showConfirmation)
        check.querySelector('[data-hp-cancel]')?.addEventListener('click', () => { if (confirm('取り込みを中止しますか？ 保存済みのスタイルは残ります。')) command('cancel') })
        check.querySelector('[data-hp-retry]')?.addEventListener('click', async () => { await command('retry'); schedule() })
        check.querySelector('[data-hp-prev]')?.addEventListener('click', () => { offset = Math.max(0, offset - 25); loadJob() })
        check.querySelector('[data-hp-next]')?.addEventListener('click', () => { offset += 25; loadJob() })
        if (busy) check.querySelectorAll('button').forEach(button => { button.disabled = true })
        if (job.status === 'CONFIRMATION' && !busy && offeredJob !== job.id) showConfirmation()
        return
      }
      const canSelect = ['READY','DONE'].includes(job.status)
      check.innerHTML = `<div class="hp-status"><div><h3>${esc(job.salonName || 'ホットペッパー')}</h3><p>${statusNames[job.status]} · ${job.loaded + job.duplicate} / ${job.total}件 · ${job.discoveredPages}ページ取得</p></div></div><progress class="hp-progress" max="${Math.max(1, job.total)}" value="${job.status === 'PUBLISHING' ? job.published + job.duplicate : job.loaded + job.duplicate}"></progress><div class="hp-tools">${canSelect ? `<label><input type="checkbox" data-hp-all ${allReady && excluded.size === 0 ? 'checked' : ''}>未公開をすべて選択（${job.ready}件）</label>` : ''}${job.failed || job.status === 'PAUSED' ? '<button type="button" data-hp-retry>失敗分を再試行</button>' : ''}<button type="button" data-hp-cancel>取り込みを中止</button><span>${job.published}件公開 · ${job.duplicate}件重複 · ${job.failed}件失敗</span></div>${job.error ? `<p class="hp-feedback">${esc(job.error)}</p>` : ''}<div class="hp-table-wrap"><table class="hp-table"><thead><tr><th><span class="sr-only">選択</span></th><th>写真</th><th>スタイル / 担当者</th><th>状態</th></tr></thead><tbody>${job.items.map(item => `<tr><td>${item.status === 'READY' ? `<input type="checkbox" data-hp-select="${item.index}" aria-label="${esc(item.data.title)}を選択" ${allReady ? !excluded.has(item.index) ? 'checked' : '' : selected.has(item.index) ? 'checked' : ''} ${!canSelect ? 'disabled' : ''}>` : ''}</td><td>${item.data?.photos?.[0] ? `<img loading="lazy" referrerpolicy="no-referrer" src="${esc(item.data.photos[0].url)}" alt="">` : ''}</td><td><strong>${esc(item.data?.title || item.url.split('/').pop())}</strong><small>${esc(item.data?.stylistName || '')}</small><small>${item.data?.photos?.map(p => p.direction).join(' · ') || ''}</small></td><td>${item.status === 'READY' ? `<button type="button" class="hp-row-action" data-hp-review="${item.index}">確認・編集</button>` : item.status === 'PUBLISHED' ? `<a href="/admin/community/${encodeURIComponent(item.postId)}">公開済み</a>` : ({ DUPLICATE:'取込済み', PENDING:'待機中', QUEUED:'公開待ち', ERROR:'失敗' })[item.status]}${item.error ? `<small>${esc(item.error)}</small>` : ''}</td></tr>`).join('')}</tbody></table></div><div class="hp-page"><button type="button" data-hp-prev ${offset === 0 ? 'disabled' : ''}>前へ</button><span>${job.total ? offset + 1 : 0}–${Math.min(offset + 25, job.total)} / ${job.total}件</span><button type="button" data-hp-next ${offset + 25 >= job.total ? 'disabled' : ''}>次へ</button></div><div data-hp-editor></div>${canSelect ? `<div class="hp-publish-row"><span data-hp-count>${selectedCount()}件選択中</span><button type="button" class="ca-cp-submit" data-hp-publish ${selectedCount() && !busy ? '' : 'disabled'}>選択したスタイルを公開</button></div>` : ''}`
      check.querySelector('[data-hp-all]')?.addEventListener('change', e => { allReady = e.target.checked; selected.clear(); excluded.clear(); render() })
      check.querySelectorAll('[data-hp-select]').forEach(input => input.addEventListener('change', () => { const index = Number(input.dataset.hpSelect); if (allReady) input.checked ? excluded.delete(index) : excluded.add(index); else input.checked ? selected.add(index) : selected.delete(index); render() }))
      check.querySelectorAll('[data-hp-review]').forEach(button => button.addEventListener('click', () => edit(Number(button.dataset.hpReview))))
      check.querySelector('[data-hp-publish]')?.addEventListener('click', async () => { if (await command('publish', { allReady, excluded:[...excluded], indices:[...selected], rightsConfirmed:panel.querySelector('[data-hp-rights]').checked })) { selected.clear(); excluded.clear(); allReady = false; render(); schedule() } })
      check.querySelector('[data-hp-cancel]')?.addEventListener('click', () => { if (confirm('取り込みを中止しますか？ 公開済みのスタイルは残ります。')) command('cancel') })
      check.querySelector('[data-hp-retry]')?.addEventListener('click', async () => { await command('retry'); schedule() })
      check.querySelector('[data-hp-prev]')?.addEventListener('click', () => { offset = Math.max(0, offset - 25); loadJob() })
      check.querySelector('[data-hp-next]')?.addEventListener('click', () => { offset += 25; loadJob() })
      check.querySelectorAll('button').forEach(button => { if (busy) button.disabled = true })
      if (focusedSelection !== null && focusedSelection !== undefined) check.querySelector(`[data-hp-select="${focusedSelection}"]`)?.focus({preventScroll:true})
      else if (focusedAll) check.querySelector('[data-hp-all]')?.focus({preventScroll:true})
    }
    function edit(index) {
      const item = job.items.find(i => i.index === index)
      if (!item?.data) return
      const editor = check.querySelector('[data-hp-editor]')
      editor.innerHTML = `<details class="hp-review" open><summary>${esc(item.data.title)}</summary><div class="hp-review-images">${item.data.photos.map(photo => `<figure><img src="${esc(photo.url)}" referrerpolicy="no-referrer" alt="${photo.direction}"><figcaption>${photo.direction}</figcaption></figure>`).join('')}</div>${fieldsMarkup('hp-review', item.data)}<div class="hp-tools"><button type="button" data-hp-save>変更を保存</button><a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">掲載元</a></div></details>`
      editor.querySelector('[data-hp-save]').addEventListener('click', async () => { const metadata = Object.fromEntries([...editor.querySelectorAll('[data-hp-field]')].map(input => [input.dataset.hpField, input.value])); await command('edit', { index, metadata }) })
      editor.scrollIntoView({ block:'nearest' })
    }
    async function command(action, data = {}) {
      if (busy || stopped) return false
      busy = true; render(); feedback('')
      try {
        const response = await fetch('/api/lien-hotpepper-styles', { method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ action, jobId:job?.id, offset, ...data }) })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || '処理を完了できませんでした。')
        job = payload.job
        reconnect.hidden = true
        return true
      } catch (error) { feedback(error.message); reconnect.hidden = false; clearTimeout(timer); return false }
      finally { busy = false; render() }
    }
    async function loadJob() {
      if (busy || stopped) return
      busy = true
      try { const response = await fetch(`/api/lien-hotpepper-styles?offset=${offset}`, { credentials:'same-origin', cache:'no-store' }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error); job = payload.job; feedback(''); reconnect.hidden = true }
      catch (error) { feedback(error.message || '前回の取り込みを確認できませんでした。'); reconnect.hidden = false }
      finally { busy = false; render(); schedule() }
    }
    function schedule() {
      clearTimeout(timer)
      if (stopped || !modal.isConnected || !mode.checked || !job || !['SCANNING','PUBLISHING','DISCOVERING','IMPORTING'].includes(job.status)) return
      timer = setTimeout(async () => { if (await command('step')) schedule(); else if (modal.isConnected && mode.checked) feedback('通信が中断しました。取得済みの内容は保存されています。') }, 3200)
    }
    mode.addEventListener('change', () => { manual.hidden = mode.checked; panel.hidden = !mode.checked; if (mode.checked) loadJob(); else clearTimeout(timer) })
    panel.querySelectorAll('.hp-consent input').forEach(input => input.addEventListener('change', render))
    panel.querySelector('[data-hp-start]').addEventListener('click', async () => { offset = 0; selected.clear(); excluded.clear(); allReady = false; offeredJob = null; if (await command('start', { url:panel.querySelector('#hp-url').value, rightsConfirmed:panel.querySelector('[data-hp-rights]').checked })) schedule() })
    modal.__hotpepperDispose = () => { stopped = true; clearTimeout(timer); confirmation?.remove(); confirmation = null }
    modal.__styleMetadata = () => Object.fromEntries([...fields.querySelectorAll('[data-hp-field]')].map(input => [input.dataset.hpField, input.value]))
    modal.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return
      const focusable = [...modal.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),a[href],summary')].filter(el => el.getClientRects().length && !el.closest('[hidden]'))
      const first = focusable[0], last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    })
    modal.querySelector('[data-ca-cp-close]').focus()
    render()
  }
