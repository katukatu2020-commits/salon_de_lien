;(() => {
  'use strict'
  if (window.__lienCustomerChartPhotosV561) return
  window.__lienCustomerChartPhotosV561 = true

  const RELEASE = 'salon-records-controls-v561'
  const HISTORY_PARAM = 'chart'
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, character => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[character])
  const icon = name => {
    const paths = {
      image: '<rect x="3" y="4" width="18" height="16" rx="2"></rect><circle cx="9" cy="10" r="2"></circle><path d="m4 18 5-5 4 4 2-2 5 4"></path>',
      upload: '<path d="M12 16V4"></path><path d="m7 9 5-5 5 5"></path><path d="M5 20h14"></path>',
      history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"></path><path d="M3 3v5h5"></path><path d="M12 7v5l3 2"></path>',
      arrow: '<path d="m15 18-6-6 6-6"></path>',
      shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"></path><path d="m9 12 2 2 4-4"></path>',
      close: '<path d="m6 6 12 12M18 6 6 18"></path>',
    }
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.image}</svg>`
  }

  function installStyles() {
    if (document.querySelector('style[data-customer-chart-v561]')) return
    const style = document.createElement('style')
    style.dataset.customerChartV561 = '1'
    style.textContent = `
      .lien-chart-card,.lien-chart-history{box-sizing:border-box;width:100%;border:1px solid #e8d9d2;border-radius:8px;background:#fff;box-shadow:0 8px 24px rgba(65,42,34,.045);color:#302824;letter-spacing:0}
      .lien-chart-card *,.lien-chart-history *,.lien-chart-preview-dialog *{box-sizing:border-box;letter-spacing:0}
      .lien-chart-card{display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,460px);gap:24px;padding:24px 28px}
      .lien-chart-heading{display:flex;align-items:flex-start;gap:13px;min-width:0}.lien-chart-heading>span{display:grid;width:44px;height:44px;flex:0 0 auto;place-items:center;border-radius:8px;background:#f9e7ec;color:#b54865}.lien-chart-heading svg{width:22px;height:22px}.lien-chart-heading h2{margin:0;font-family:"Yu Mincho","Hiragino Mincho ProN",serif;font-size:21px}.lien-chart-heading p{margin:6px 0 0;color:#84756e;font-size:12px;line-height:1.7}
      .lien-chart-private{display:inline-flex;align-items:center;gap:6px;margin-top:13px;color:#47745e;font-size:11px;font-weight:800}.lien-chart-private svg{width:16px;height:16px}
      .lien-chart-actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:18px}.lien-chart-button{display:inline-flex;min-height:42px;align-items:center;justify-content:center;gap:8px;border:1px solid #dec9c0;border-radius:7px;background:#fff;padding:0 15px;color:#6f554c;font-size:12px;font-weight:900;cursor:pointer;text-decoration:none}.lien-chart-button:hover{background:#fff8f5}.lien-chart-button.primary{border-color:#b84d67;background:#b84d67;color:#fff}.lien-chart-button:disabled{opacity:.55;cursor:wait}.lien-chart-button svg{width:17px;height:17px}.lien-chart-file{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}
      .lien-chart-status{min-height:20px;margin-top:10px;color:#9d4659;font-size:11px;font-weight:800}.lien-chart-status.ok{color:#397253}
      .lien-chart-latest{display:grid;min-height:230px;place-items:center;overflow:hidden;border:1px solid #eaded8;border-radius:8px;background:#faf7f5}.lien-chart-latest img{display:block;width:100%;max-height:430px;object-fit:contain;cursor:zoom-in}.lien-chart-empty{display:grid;justify-items:center;gap:10px;padding:30px;color:#988981;text-align:center;font-size:12px}.lien-chart-empty svg{width:32px;height:32px;color:#c6aaa0}.lien-chart-meta{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;border-top:1px solid #eadfd9;background:#fff;padding:10px 12px;color:#81726b;font-size:10px}.lien-chart-image-shell{width:100%}
      .lien-chart-history{padding:0;overflow:hidden}.lien-chart-history-head{display:flex;align-items:center;justify-content:space-between;gap:20px;border-bottom:1px solid #e9ddd7;background:#fffaf7;padding:22px 26px}.lien-chart-history-title{display:flex;align-items:center;gap:13px}.lien-chart-history-title>span{display:grid;width:44px;height:44px;place-items:center;border-radius:8px;background:#f9e7ec;color:#b54865}.lien-chart-history-title svg{width:22px;height:22px}.lien-chart-history h1{margin:0;font-family:"Yu Mincho","Hiragino Mincho ProN",serif;font-size:25px}.lien-chart-history-head p{margin:5px 0 0;color:#84756e;font-size:11px}.lien-chart-history-toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:1px solid #eee3de;padding:14px 26px}.lien-chart-history-count{font-size:12px;font-weight:900;color:#6f5e57}.lien-chart-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;padding:22px 26px 28px}.lien-chart-item{overflow:hidden;border:1px solid #e7dad4;border-radius:8px;background:#fff}.lien-chart-item button{display:block;width:100%;border:0;background:#f8f5f3;padding:0;cursor:zoom-in}.lien-chart-item img{display:block;width:100%;aspect-ratio:3/4;object-fit:contain}.lien-chart-item-copy{display:grid;gap:5px;padding:12px 13px}.lien-chart-item-title{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px;font-weight:900}.lien-chart-badge{display:inline-flex;min-height:23px;align-items:center;border-radius:999px;background:#e8f4ec;padding:0 8px;color:#397053;font-size:9px;font-weight:900}.lien-chart-item-copy p{margin:0;color:#86766e;font-size:10px}.lien-chart-history-empty{grid-column:1/-1;display:grid;min-height:280px;place-items:center;color:#93847d;text-align:center;font-size:12px}
      .lien-chart-preview-dialog{width:min(920px,calc(100vw - 32px));max-height:calc(100dvh - 32px);overflow:auto;border:1px solid #dfcec6;border-radius:8px;background:#fff;padding:0;box-shadow:0 24px 80px rgba(42,28,23,.28)}.lien-chart-preview-dialog::backdrop{background:rgba(37,28,25,.62)}.lien-chart-preview-head{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e6d9d3;background:#fff;padding:12px 15px}.lien-chart-preview-head strong{font-size:13px}.lien-chart-preview-close{display:grid;width:40px;height:40px;place-items:center;border:1px solid #dfcec6;border-radius:7px;background:#fff;cursor:pointer}.lien-chart-preview-close svg{width:18px;height:18px}.lien-chart-preview-dialog img{display:block;width:100%;height:auto;background:#f8f5f3;object-fit:contain}
      @media(max-width:980px){.lien-chart-card{grid-template-columns:1fr}.lien-chart-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:640px){.lien-chart-card{gap:18px;padding:18px 16px}.lien-chart-heading h2{font-size:18px}.lien-chart-actions{display:grid;grid-template-columns:1fr}.lien-chart-button{width:100%}.lien-chart-latest{min-height:190px}.lien-chart-history-head{align-items:flex-start;flex-direction:column;padding:18px 16px}.lien-chart-history-toolbar{align-items:stretch;flex-direction:column;padding:13px 16px}.lien-chart-grid{grid-template-columns:1fr;padding:16px}.lien-chart-history h1{font-size:21px}}
    `
    document.head.appendChild(style)
  }

  function route() {
    const match = /^\/admin\/customers\/([^/]+)\/?$/.exec(location.pathname)
    if (!match) return null
    try {
      return { customerId: decodeURIComponent(match[1]), history: new URLSearchParams(location.search).get(HISTORY_PARAM) === 'history' }
    } catch {
      return null
    }
  }

  function api(customerId, limit = 1, offset = 0) {
    return `/api/admin/customers/${encodeURIComponent(customerId)}/chart-photos?limit=${limit}&offset=${offset}`
  }

  async function payload(response, fallback) {
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || fallback)
    return data
  }

  const formatDate = value => value ? new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value)) : '-'

  function openPreview(item) {
    let dialog = document.querySelector('[data-chart-preview-v561]')
    if (!dialog) {
      dialog = document.createElement('dialog')
      dialog.className = 'lien-chart-preview-dialog'
      dialog.dataset.chartPreviewV561 = '1'
      document.body.appendChild(dialog)
      dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close() })
    }
    dialog.innerHTML = `<div class="lien-chart-preview-head"><strong>${esc(formatDate(item.createdAt))}のカルテ</strong><button type="button" class="lien-chart-preview-close" aria-label="閉じる">${icon('close')}</button></div><img src="${esc(item.url)}" alt="${esc(formatDate(item.createdAt))}のカルテ写真">`
    dialog.querySelector('button').addEventListener('click', () => dialog.close())
    dialog.showModal()
  }

  async function upload(customerId, file, statusNode, button) {
    if (!file) return null
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('JPG・PNG・WebPの画像を選択してください。')
    if (file.size > 12 * 1024 * 1024) throw new Error('画像は12MB以下にしてください。')
    if (button) button.disabled = true
    if (statusNode) { statusNode.className = 'lien-chart-status'; statusNode.textContent = 'カルテ写真を保存しています…' }
    try {
      const response = await fetch(api(customerId), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': file.type, 'X-File-Name': encodeURIComponent(file.name || 'chart-photo') },
        body: file,
      })
      const data = await payload(response, 'カルテ写真を保存できませんでした。')
      if (statusNode) { statusNode.className = 'lien-chart-status ok'; statusNode.textContent = 'カルテ写真を保存しました。' }
      return data.item
    } finally {
      if (button) button.disabled = false
    }
  }

  function imageMarkup(item) {
    if (!item) return `<div class="lien-chart-empty">${icon('image')}<span>カルテ写真はまだ登録されていません。</span></div>`
    return `<div class="lien-chart-image-shell"><img src="${esc(item.url)}" alt="最新のカルテ写真" data-chart-preview-image><div class="lien-chart-meta"><span>${esc(formatDate(item.createdAt))}</span><span>${esc(item.uploadedByName || '店舗スタッフ')}</span></div></div>`
  }

  function bindUpload(root, customerId, refresh) {
    const input = root.querySelector('[data-chart-file]')
    const button = root.querySelector('[data-chart-upload]')
    const status = root.querySelector('[data-chart-status]')
    if (!input || !button) return
    button.addEventListener('click', () => input.click())
    input.addEventListener('change', async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        await upload(customerId, file, status, button)
        input.value = ''
        await refresh()
      } catch (error) {
        if (status) { status.className = 'lien-chart-status'; status.textContent = error.message }
      }
    })
  }

  async function refreshLatest(card, customerId) {
    const data = await payload(await fetch(api(customerId, 1), { credentials:'same-origin', cache:'no-store' }), 'カルテ写真を取得できませんでした。')
    const preview = card.querySelector('[data-chart-latest]')
    preview.innerHTML = imageMarkup(data.items?.[0])
    preview.querySelector('[data-chart-preview-image]')?.addEventListener('click', () => openPreview(data.items[0]))
    const history = card.querySelector('[data-chart-history]')
    if (history) history.querySelector('span').textContent = `過去のカルテを見る（${Number(data.count || 0)}件）`
  }

  async function renderLatest(current, main) {
    restoreMain()
    if (main.querySelector('[data-chart-latest-card-v561]')) return
    const card = document.createElement('section')
    card.className = 'lien-chart-card'
    card.dataset.chartLatestCardV561 = '1'
    card.innerHTML = `<div><div class="lien-chart-heading"><span>${icon('image')}</span><div><h2>カルテ写真</h2><p>紙のカルテや手書き記録を、店舗内の顧客カルテとして保存します。</p></div></div><div class="lien-chart-private">${icon('shield')}店舗アカウントだけが閲覧できます</div><div class="lien-chart-actions"><button type="button" class="lien-chart-button primary" data-chart-upload>${icon('upload')}カルテ写真を追加</button><button type="button" class="lien-chart-button" data-chart-history>${icon('history')}<span>過去のカルテを見る</span></button></div><input class="lien-chart-file" type="file" accept="image/jpeg,image/png,image/webp" data-chart-file><div class="lien-chart-status" data-chart-status role="status" aria-live="polite"></div></div><div class="lien-chart-latest" data-chart-latest><div class="lien-chart-empty">カルテ写真を読み込んでいます…</div></div>`
    const headings = [...main.querySelectorAll('h2,h3')]
    const nameSection = headings.find(node => node.textContent?.includes('実際のお名前'))?.closest('section')
    const profileSection = headings.find(node => node.textContent?.includes('髪・接客情報'))?.closest('section')
    if (nameSection?.parentElement) nameSection.after(card)
    else if (profileSection?.parentElement) profileSection.before(card)
    else main.appendChild(card)
    bindUpload(card, current.customerId, () => refreshLatest(card, current.customerId))
    try { await refreshLatest(card, current.customerId) }
    catch (error) {
      card.querySelector('[data-chart-latest]').innerHTML = `<div class="lien-chart-empty"><span>${esc(error.message)}</span></div>`
    }
    card.querySelector('[data-chart-history]').addEventListener('click', () => {
      const url = new URL(location.href)
      url.searchParams.set(HISTORY_PARAM, 'history')
      history.pushState({ ...(history.state || {}), lienChartHistoryV561:true }, '', url)
      void renderHistory({ ...current, history:true }, main)
      scheduleSync()
    })
  }

  function restoreMain() {
    document.querySelectorAll('[data-chart-hidden-v561]').forEach(node => {
      node.hidden = false
      node.style.removeProperty('display')
      delete node.dataset.chartHiddenV561
    })
    document.querySelectorAll('[data-chart-history-page-v561]').forEach(node => node.remove())
  }

  async function refreshHistory(root, customerId) {
    const data = await payload(await fetch(api(customerId, 100, 0), { credentials:'same-origin', cache:'no-store' }), '過去のカルテを取得できませんでした。')
    const items = [...(data.items || [])]
    while (items.length < Number(data.count || 0)) {
      const page = await payload(await fetch(api(customerId, 100, items.length), { credentials:'same-origin', cache:'no-store' }), '過去のカルテを取得できませんでした。')
      if (!page.items?.length) break
      items.push(...page.items)
    }
    data.items = items
    root.querySelector('[data-chart-history-count]').textContent = `${Number(data.count || 0).toLocaleString('ja-JP')}件`
    const grid = root.querySelector('[data-chart-grid]')
    if (!data.items?.length) {
      grid.innerHTML = `<div class="lien-chart-history-empty">カルテ写真はまだ登録されていません。</div>`
      return
    }
    grid.innerHTML = data.items.map((item, index) => `<article class="lien-chart-item"><button type="button" data-chart-item="${esc(item.id)}" aria-label="${esc(formatDate(item.createdAt))}のカルテ写真を拡大"><img src="${esc(item.url)}" alt="${esc(formatDate(item.createdAt))}のカルテ写真"></button><div class="lien-chart-item-copy"><div class="lien-chart-item-title"><span>${esc(formatDate(item.createdAt))}</span>${index === 0 ? '<span class="lien-chart-badge">最新</span>' : ''}</div><p>登録: ${esc(item.uploadedByName || '店舗スタッフ')}</p></div></article>`).join('')
    grid.querySelectorAll('[data-chart-item]').forEach(button => button.addEventListener('click', () => {
      const item = data.items.find(value => value.id === button.dataset.chartItem)
      if (item) openPreview(item)
    }))
  }

  async function renderHistory(current, main) {
    main.querySelectorAll('[data-chart-latest-card-v561]').forEach(node => node.remove())
    let root = main.querySelector('[data-chart-history-page-v561]')
    if (!root) {
      Array.from(main.children).forEach(child => {
        child.hidden = true
        child.style.display = 'none'
        child.dataset.chartHiddenV561 = '1'
      })
      root = document.createElement('section')
      root.className = 'lien-chart-history'
      root.dataset.chartHistoryPageV561 = '1'
      root.innerHTML = `<header class="lien-chart-history-head"><div class="lien-chart-history-title"><span>${icon('history')}</span><div><h1>過去のカルテ</h1><p>最新を含むカルテ写真を新しい順に表示しています。</p></div></div><button type="button" class="lien-chart-button" data-chart-back disabled>${icon('arrow')}顧客カルテへ戻る</button></header><div class="lien-chart-history-toolbar"><span class="lien-chart-history-count" data-chart-history-count>読み込み中…</span><div><button type="button" class="lien-chart-button primary" data-chart-upload>${icon('upload')}カルテ写真を追加</button><input class="lien-chart-file" type="file" accept="image/jpeg,image/png,image/webp" data-chart-file><div class="lien-chart-status" data-chart-status role="status" aria-live="polite"></div></div></div><div class="lien-chart-grid" data-chart-grid><div class="lien-chart-history-empty">カルテ写真を読み込んでいます…</div></div>`
      main.appendChild(root)
      root.querySelector('[data-chart-back]').addEventListener('click', () => {
        const finish = () => {
          const next = route()
          const liveMain = document.querySelector('main')
          if (next && !next.history && liveMain) void renderLatest(next, liveMain)
          scheduleSync()
        }
        if (history.state?.lienChartHistoryV561) {
          const onPop = () => setTimeout(finish, 0)
          addEventListener('popstate', onPop, { once:true })
          history.back()
          setTimeout(() => {
            if (route()?.history) {
              removeEventListener('popstate', onPop)
              const url = new URL(location.href)
              url.searchParams.delete(HISTORY_PARAM)
              history.replaceState({}, '', url)
            }
            finish()
          }, 400)
        } else {
          const url = new URL(location.href)
          url.searchParams.delete(HISTORY_PARAM)
          history.replaceState({}, '', url)
          finish()
        }
      })
      bindUpload(root, current.customerId, () => refreshHistory(root, current.customerId))
    }
    try { await refreshHistory(root, current.customerId) }
    catch (error) { root.querySelector('[data-chart-grid]').innerHTML = `<div class="lien-chart-history-empty">${esc(error.message)}</div>` }
    finally { root.querySelector('[data-chart-back]').disabled = false }
  }

  let syncTimer = 0
  let rendering = false
  function scheduleSync() {
    clearTimeout(syncTimer)
    syncTimer = setTimeout(sync, 40)
  }

  async function sync() {
    if (rendering) return scheduleSync()
    const current = route()
    const main = document.querySelector('main')
    if (!current || !main) {
      restoreMain()
      document.querySelectorAll('[data-chart-latest-card-v561]').forEach(node => node.remove())
      return
    }
    rendering = true
    try {
      installStyles()
      if (current.history) await renderHistory(current, main)
      else await renderLatest(current, main)
    } finally {
      rendering = false
    }
  }

  addEventListener('popstate', scheduleSync)
  addEventListener('pageshow', scheduleSync)
  new MutationObserver(scheduleSync).observe(document.documentElement, { childList:true, subtree:true })
  scheduleSync()
  console.info(`[${RELEASE}] customer chart photos ready`)
})()
