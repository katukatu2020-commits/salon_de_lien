;(() => {
  'use strict'
  if (window.__lienCustomerChartPhotosV561) return
  window.__lienCustomerChartPhotosV561 = true
  window.__lienCustomerChartUiV562 = true
  window.__lienCustomerChartAttachmentsV564 = true

  const RELEASE = 'customer-chart-attachments-v564'
  const HISTORY_PARAM = 'chart'
  const MAX_BYTES = 20 * 1024 * 1024
  const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
  const ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf'
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, character => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[character])
  const icon = name => {
    const paths = {
      image: '<rect x="3" y="4" width="18" height="16" rx="2"></rect><circle cx="9" cy="10" r="2"></circle><path d="m4 18 5-5 4 4 2-2 5 4"></path>',
      upload: '<path d="M12 16V4"></path><path d="m7 9 5-5 5 5"></path><path d="M5 20h14"></path>',
      history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"></path><path d="M3 3v5h5"></path><path d="M12 7v5l3 2"></path>',
      arrow: '<path d="m15 18-6-6 6-6"></path>',
      shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"></path><path d="m9 12 2 2 4-4"></path>',
      close: '<path d="m6 6 12 12M18 6 6 18"></path>',
      zoom: '<circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4M11 8v6M8 11h6"></path>',
      file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"></path><path d="M14 2v6h6"></path><path d="M8 13h8M8 17h6"></path>',
      paperclip: '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>',
      external: '<path d="M15 3h6v6M10 14 21 3"></path><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>',
      download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="m7 10 5 5 5-5M12 15V3"></path>',
    }
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.file}</svg>`
  }

  function installStyles() {
    if (document.querySelector('style[data-customer-chart-v564]')) return
    const style = document.createElement('style')
    style.dataset.customerChartV564 = '1'
    style.textContent = `
      .lien-chart-card,.lien-chart-history{box-sizing:border-box;width:100%;overflow:hidden;border:1px solid #e5d6cf;border-radius:8px;background:#fff;box-shadow:0 10px 30px rgba(63,43,35,.055);color:#302824;letter-spacing:0}
      .lien-chart-card *,.lien-chart-history *,.lien-chart-preview-dialog *{box-sizing:border-box;letter-spacing:0}
      .lien-chart-card-header{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:22px 26px;border-bottom:1px solid #eadfd9;background:#fff}
      .lien-chart-heading{display:flex;align-items:center;gap:14px;min-width:0}.lien-chart-heading>span{display:grid;width:46px;height:46px;flex:0 0 auto;place-items:center;border:1px solid #f2d9e0;border-radius:8px;background:#fbedf1;color:#b54663}.lien-chart-heading svg{width:22px;height:22px}.lien-chart-heading-copy{display:grid;min-width:0}.lien-chart-heading-line{display:flex;align-items:center;flex-wrap:wrap;gap:10px}.lien-chart-heading h2{margin:0;font-family:"Yu Mincho","Hiragino Mincho ProN",serif;font-size:22px;line-height:1.25}.lien-chart-heading p{margin:5px 0 0;color:#8b7b74;font-size:11px;line-height:1.7}
      .lien-chart-private{display:inline-flex;min-height:28px;align-items:center;gap:6px;border:1px solid #cee4d7;border-radius:999px;background:#eff8f2;padding:0 10px;color:#397057;font-size:10px;font-weight:800;white-space:nowrap}.lien-chart-private svg{width:14px;height:14px}
      .lien-chart-actions{display:flex;flex:0 0 auto;flex-wrap:wrap;align-items:center;gap:9px}.lien-chart-button,.lien-chart-file-action{display:inline-flex;min-height:44px;align-items:center;justify-content:center;gap:8px;border:1px solid #ddcbc3;border-radius:7px;background:#fff;padding:0 17px;color:#6f554c;font-size:12px;font-weight:900;cursor:pointer;text-decoration:none;transition:background-color .16s,border-color .16s,color .16s,box-shadow .16s}.lien-chart-button:hover,.lien-chart-file-action:hover{border-color:#cfaea2;background:#fff8f5}.lien-chart-button.primary{border-color:#b94662;background:#b94662;color:#fff;box-shadow:0 7px 18px rgba(185,70,98,.16)}.lien-chart-button.primary:hover{border-color:#a83d57;background:#a83d57}.lien-chart-button:disabled{cursor:wait;opacity:.55}.lien-chart-button svg,.lien-chart-file-action svg{width:17px;height:17px}.lien-chart-file{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}
      .lien-chart-status{min-height:0;margin:0;border-bottom:1px solid #eadfd9;background:#fff8f6;padding:10px 26px;color:#9d4659;font-size:11px;font-weight:800}.lien-chart-status:empty{display:none}.lien-chart-status.ok{background:#f2f8f4;color:#397253}
      .lien-chart-latest{display:block;min-height:390px;background:#f7f3f1}.lien-chart-image-shell{display:grid;grid-template-columns:minmax(0,1fr) 330px;width:100%;min-height:430px}
      .lien-chart-media{position:relative;display:grid;min-width:0;min-height:430px;place-items:center;overflow:hidden;border:0;border-right:1px solid #e7dcd6;background:#f3efed;padding:22px;color:#604e46;cursor:pointer}.lien-chart-media:hover{background:#eee9e6}.lien-chart-media img{display:block;width:100%;height:100%;max-height:500px;border:1px solid rgba(91,67,58,.12);border-radius:4px;background:#fff;box-shadow:0 12px 28px rgba(53,39,34,.12);object-fit:contain}.lien-chart-zoom{position:absolute;right:34px;bottom:34px;display:grid;width:42px;height:42px;place-items:center;border:1px solid rgba(104,79,70,.18);border-radius:7px;background:rgba(255,255,255,.94);color:#634f47;box-shadow:0 6px 18px rgba(48,34,29,.14)}.lien-chart-zoom svg{width:19px;height:19px}
      .lien-chart-pdf{display:grid;width:min(360px,82%);min-height:300px;place-items:center;align-content:center;gap:14px;border:1px solid #e1d4ce;border-radius:6px;background:#fff;padding:32px;box-shadow:0 12px 28px rgba(53,39,34,.1);text-align:center}.lien-chart-pdf>span:first-child{display:grid;width:70px;height:70px;place-items:center;border-radius:8px;background:#f8e8ec;color:#b54663}.lien-chart-pdf svg{width:34px;height:34px}.lien-chart-pdf strong{max-width:100%;overflow:hidden;color:#3e332e;font-size:14px;text-overflow:ellipsis;white-space:nowrap}.lien-chart-pdf small{color:#8b7b74;font-size:10px}
      .lien-chart-meta{display:flex;align-items:stretch;flex-direction:column;background:#fff;padding:30px 26px;color:#342b27;font-size:11px}.lien-chart-meta-kicker{color:#b54663;font-size:9px;font-weight:900}.lien-chart-meta h3{margin:9px 0 5px;font-family:"Yu Mincho","Hiragino Mincho ProN",serif;font-size:23px;line-height:1.35}.lien-chart-meta-sub{margin:0 0 20px;color:#8a7b74;font-size:10px}.lien-chart-meta-list{display:grid;margin:0}.lien-chart-meta-row{display:grid;gap:5px;border-top:1px solid #eee4df;padding:12px 0}.lien-chart-meta-row dt{color:#94857e;font-size:9px;font-weight:800}.lien-chart-meta-row dd{min-width:0;margin:0;overflow-wrap:anywhere;color:#3d322e;font-size:11px;font-weight:900;line-height:1.55}.lien-chart-file-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:18px}.lien-chart-file-action{min-width:0;padding:0 10px}.lien-chart-file-action.download{border-color:#ead4da;color:#a93f5d}.lien-chart-archive-summary{display:flex;align-items:center;gap:11px;margin-top:auto;border-top:1px solid #eee4df;padding-top:18px;color:#6e5b53}.lien-chart-archive-summary>span{display:grid;width:34px;height:34px;place-items:center;border-radius:7px;background:#f9edf0;color:#b54663}.lien-chart-archive-summary svg{width:17px;height:17px}.lien-chart-archive-summary div{display:grid}.lien-chart-archive-summary strong{font-size:15px}.lien-chart-archive-summary small{color:#91817a;font-size:9px}
      .lien-chart-empty{display:grid;min-height:390px;align-content:center;justify-items:center;gap:8px;background:#faf7f5;padding:30px;color:#95867f;text-align:center;font-size:12px}.lien-chart-empty>span:first-child{display:grid;width:52px;height:52px;place-items:center;border:1px solid #edddd6;border-radius:8px;background:#fff;color:#b78e80}.lien-chart-empty svg{width:24px;height:24px}.lien-chart-empty strong{margin-top:4px;color:#4e3f39;font-size:13px}.lien-chart-empty small{color:#95867f;font-size:10px}
      .lien-chart-history-head{display:flex;align-items:center;justify-content:space-between;gap:20px;border-bottom:1px solid #e9ddd7;background:#fff;padding:22px 26px}.lien-chart-history-title{display:flex;align-items:center;gap:13px}.lien-chart-history-title>span{display:grid;width:44px;height:44px;place-items:center;border-radius:8px;background:#f9e7ec;color:#b54865}.lien-chart-history-title svg{width:22px;height:22px}.lien-chart-history h1{margin:0;font-family:"Yu Mincho","Hiragino Mincho ProN",serif;font-size:25px}.lien-chart-history-head p{margin:5px 0 0;color:#84756e;font-size:11px}.lien-chart-history-toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:1px solid #eee3de;background:#fffaf8;padding:14px 26px}.lien-chart-history-toolbar>div{display:flex;align-items:center;gap:10px}.lien-chart-history-count{font-size:12px;font-weight:900;color:#6f5e57}.lien-chart-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px;background:#fbf8f6;padding:22px 26px 28px}.lien-chart-item{display:flex;min-width:0;overflow:hidden;flex-direction:column;border:1px solid #e5d8d2;border-radius:8px;background:#fff;box-shadow:0 4px 14px rgba(58,41,35,.045)}.lien-chart-item-media{display:grid;width:100%;min-height:220px;place-items:center;border:0;background:#f3efed;padding:10px;color:#604e46;cursor:pointer}.lien-chart-item-media:hover{background:#eee9e6}.lien-chart-item-media img{display:block;width:100%;height:220px;border-radius:4px;background:#fff;object-fit:contain}.lien-chart-item-media .lien-chart-pdf{width:100%;min-height:200px;padding:20px;box-shadow:none}.lien-chart-item-media .lien-chart-pdf>span:first-child{width:52px;height:52px}.lien-chart-item-media .lien-chart-pdf svg{width:27px;height:27px}.lien-chart-item-copy{display:grid;gap:7px;flex:1;border-top:1px solid #eadfd9;background:#fff;padding:13px 14px}.lien-chart-item-title{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px;font-weight:900}.lien-chart-badge{display:inline-flex;min-height:23px;align-items:center;border:1px solid #cde3d6;border-radius:999px;background:#eef7f1;padding:0 8px;color:#397053;font-size:9px;font-weight:900}.lien-chart-item-copy p{margin:0;color:#86766e;font-size:10px;line-height:1.55}.lien-chart-item-name{overflow:hidden;color:#4a3d37!important;font-weight:800;text-overflow:ellipsis;white-space:nowrap}.lien-chart-item-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:auto;padding:0 14px 14px}.lien-chart-item-actions .lien-chart-file-action{min-height:38px;font-size:10px}.lien-chart-history-empty{grid-column:1/-1;display:grid;min-height:280px;place-items:center;color:#93847d;text-align:center;font-size:12px}
      .lien-chart-preview-dialog{width:min(920px,calc(100vw - 32px));max-height:calc(100dvh - 32px);overflow:auto;border:1px solid #dfcec6;border-radius:8px;background:#fff;padding:0;box-shadow:0 24px 80px rgba(42,28,23,.28)}.lien-chart-preview-dialog::backdrop{background:rgba(37,28,25,.62)}.lien-chart-preview-head{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid #e6d9d3;background:#fff;padding:12px 15px}.lien-chart-preview-head>div{display:flex;align-items:center;gap:8px}.lien-chart-preview-head strong{font-size:13px}.lien-chart-preview-close{display:grid;width:40px;height:40px;place-items:center;border:1px solid #dfcec6;border-radius:7px;background:#fff;cursor:pointer}.lien-chart-preview-close svg{width:18px;height:18px}.lien-chart-preview-dialog>img{display:block;width:100%;height:auto;background:#f8f5f3;object-fit:contain}
      @media(max-width:900px){.lien-chart-card-header{align-items:flex-start;flex-direction:column}.lien-chart-actions{width:100%}.lien-chart-image-shell{grid-template-columns:1fr}.lien-chart-media{min-height:320px;border-right:0;border-bottom:1px solid #e7dcd6}.lien-chart-meta{min-height:270px}.lien-chart-archive-summary{margin-top:18px}}
      @media(max-width:640px){.lien-chart-card-header{gap:17px;padding:18px 16px}.lien-chart-heading{align-items:flex-start}.lien-chart-heading>span{width:42px;height:42px}.lien-chart-heading-line{align-items:flex-start;flex-direction:column;gap:7px}.lien-chart-heading h2{font-size:19px}.lien-chart-heading p{font-size:10px}.lien-chart-private{min-height:25px}.lien-chart-actions{display:grid;grid-template-columns:1fr;gap:8px}.lien-chart-button{width:100%}.lien-chart-status{padding:9px 16px}.lien-chart-latest{min-height:280px}.lien-chart-image-shell{min-height:0}.lien-chart-media{min-height:250px;padding:12px}.lien-chart-media img{max-height:360px}.lien-chart-pdf{min-height:220px}.lien-chart-zoom{right:22px;bottom:22px;width:39px;height:39px}.lien-chart-meta{min-height:0;padding:20px 18px}.lien-chart-meta h3{font-size:21px}.lien-chart-meta-sub{margin-bottom:14px}.lien-chart-empty{min-height:280px}.lien-chart-history-head{align-items:flex-start;flex-direction:column;padding:18px 16px}.lien-chart-history-toolbar{align-items:stretch;flex-direction:column;padding:13px 16px}.lien-chart-history-toolbar>div{align-items:stretch;flex-direction:column}.lien-chart-grid{grid-template-columns:1fr;padding:14px}.lien-chart-history h1{font-size:21px}}
    `
    document.head.appendChild(style)
  }

  function route() {
    const match = /^\/admin\/customers\/([^/]+)\/?$/.exec(location.pathname)
    if (!match) return null
    try {
      return { customerId:decodeURIComponent(match[1]), history:new URLSearchParams(location.search).get(HISTORY_PARAM) === 'history' }
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
    timeZone:'Asia/Tokyo', year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit',
  }).format(new Date(value)) : '-'

  const formatSize = value => {
    const bytes = Math.max(0, Number(value || 0))
    if (!bytes) return '-'
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString('ja-JP')} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  const itemKind = item => item?.kind === 'pdf' || item?.contentType === 'application/pdf' || /\.pdf$/i.test(item?.originalFileName || '') ? 'pdf' : 'image'
  const itemName = item => String(item?.originalFileName || (itemKind(item) === 'pdf' ? 'カルテ.pdf' : 'カルテ画像')).trim()
  const typeLabel = item => itemKind(item) === 'pdf' ? 'PDF' : ({ 'image/png':'PNG', 'image/webp':'WebP', 'image/jpeg':'JPG' }[item?.contentType] || '画像')
  const pdfMarkup = item => `<span class="lien-chart-pdf"><span>${icon('file')}</span><strong>${esc(itemName(item))}</strong><small>PDFドキュメント</small></span>`

  function openExternal(url) {
    const link = document.createElement('a')
    link.href = url
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  function openItem(item) {
    if (!item?.url) return
    if (itemKind(item) === 'pdf') return openExternal(item.url)
    let dialog = document.querySelector('[data-chart-preview-v561]')
    if (!dialog) {
      dialog = document.createElement('dialog')
      dialog.className = 'lien-chart-preview-dialog'
      dialog.dataset.chartPreviewV561 = '1'
      document.body.appendChild(dialog)
      dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close() })
    }
    dialog.innerHTML = `<div class="lien-chart-preview-head"><strong>${esc(itemName(item))}</strong><div><a class="lien-chart-file-action download" href="${esc(item.downloadUrl || item.url)}">${icon('download')}ダウンロード</a><button type="button" class="lien-chart-preview-close" aria-label="閉じる">${icon('close')}</button></div></div><img src="${esc(item.url)}" alt="${esc(itemName(item))}">`
    dialog.querySelector('button').addEventListener('click', () => dialog.close())
    dialog.showModal()
  }

  function normalizedContentType(file) {
    if (ACCEPTED_TYPES.has(file.type)) return file.type
    const extension = String(file.name || '').split('.').pop().toLowerCase()
    return ({ jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', webp:'image/webp', pdf:'application/pdf' })[extension] || ''
  }

  async function upload(customerId, file, statusNode, button) {
    if (!file) return null
    const contentType = normalizedContentType(file)
    if (!contentType) throw new Error('JPG・PNG・WebP・PDFのファイルを選択してください。')
    if (file.size > MAX_BYTES) throw new Error('ファイルは20MB以下にしてください。')
    if (button) button.disabled = true
    if (statusNode) { statusNode.className = 'lien-chart-status'; statusNode.textContent = 'カルテファイルを保存しています…' }
    try {
      const response = await fetch(api(customerId), {
        method:'POST',
        credentials:'same-origin',
        headers:{ 'Content-Type':contentType, 'X-File-Name':encodeURIComponent(file.name || 'chart-file') },
        body:file,
      })
      const data = await payload(response, 'カルテファイルを保存できませんでした。')
      if (statusNode) { statusNode.className = 'lien-chart-status ok'; statusNode.textContent = 'カルテファイルを保存しました。' }
      return data.item
    } finally {
      if (button) button.disabled = false
    }
  }

  function mediaMarkup(item, latest = false) {
    if (itemKind(item) === 'pdf') return pdfMarkup(item)
    return `<img src="${esc(item.url)}" alt="${esc(itemName(item))}">${latest ? `<span class="lien-chart-zoom">${icon('zoom')}</span>` : ''}`
  }

  function latestMarkup(item, count) {
    if (!item) return `<div class="lien-chart-empty"><span>${icon('paperclip')}</span><strong>カルテファイルは未登録です</strong><small>画像またはPDFを添付できます</small></div>`
    return `<div class="lien-chart-image-shell"><button type="button" class="lien-chart-media" data-chart-open aria-label="${esc(itemName(item))}を開く">${mediaMarkup(item, true)}</button><aside class="lien-chart-meta"><span class="lien-chart-meta-kicker">LATEST CHART</span><h3>最新のカルテ</h3><p class="lien-chart-meta-sub">店舗内限定ファイル</p><dl class="lien-chart-meta-list"><div class="lien-chart-meta-row"><dt>ファイル名</dt><dd>${esc(itemName(item))}</dd></div><div class="lien-chart-meta-row"><dt>形式・容量</dt><dd>${esc(typeLabel(item))} / ${esc(formatSize(item.byteSize))}</dd></div><div class="lien-chart-meta-row"><dt>登録日時</dt><dd>${esc(formatDate(item.createdAt))}</dd></div><div class="lien-chart-meta-row"><dt>登録者</dt><dd>${esc(item.uploadedByName || '店舗スタッフ')}</dd></div></dl><div class="lien-chart-file-actions"><a class="lien-chart-file-action" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">${icon('external')}開く</a><a class="lien-chart-file-action download" href="${esc(item.downloadUrl || item.url)}">${icon('download')}保存</a></div><div class="lien-chart-archive-summary"><span>${icon('history')}</span><div><strong>${Number(count || 0).toLocaleString('ja-JP')}件</strong><small>保存済みカルテ</small></div></div></aside></div>`
  }

  function bindUpload(root, customerId, refresh) {
    const input = root.querySelector('[data-chart-file]')
    const button = root.querySelector('[data-chart-upload]')
    const status = root.querySelector('[data-chart-status]')
    if (!input || !button) return
    input.setAttribute('accept', ACCEPT)
    input.dataset.chartAttachment = '1'
    button.addEventListener('click', () => input.click())
    input.addEventListener('change', async () => {
      input.setCustomValidity('')
      const file = input.files?.[0]
      if (!file) return
      try {
        await upload(customerId, file, status, button)
        await refresh()
      } catch (error) {
        if (status) { status.className = 'lien-chart-status'; status.textContent = error.message }
      } finally {
        input.value = ''
        input.setCustomValidity('')
      }
    })
  }

  async function refreshLatest(card, customerId) {
    const data = await payload(await fetch(api(customerId, 1), { credentials:'same-origin', cache:'no-store' }), 'カルテファイルを取得できませんでした。')
    const preview = card.querySelector('[data-chart-latest]')
    preview.innerHTML = latestMarkup(data.items?.[0], data.count)
    preview.querySelector('[data-chart-open]')?.addEventListener('click', () => openItem(data.items[0]))
    const historyButton = card.querySelector('[data-chart-history]')
    if (historyButton) historyButton.querySelector('span').textContent = `履歴を見る（${Number(data.count || 0)}件）`
  }

  async function renderLatest(current, main) {
    restoreMain()
    if (main.querySelector('[data-chart-latest-card-v561]')) return
    const card = document.createElement('section')
    card.className = 'lien-chart-card'
    card.dataset.chartLatestCardV561 = '1'
    card.innerHTML = `<header class="lien-chart-card-header"><div class="lien-chart-heading"><span>${icon('paperclip')}</span><div class="lien-chart-heading-copy"><div class="lien-chart-heading-line"><h2>カルテファイル</h2><span class="lien-chart-private">${icon('shield')}店舗内限定</span></div><p>JPG・PNG・WebP・PDF、20MBまで</p></div></div><div class="lien-chart-actions"><button type="button" class="lien-chart-button" data-chart-history>${icon('history')}<span>履歴を見る</span></button><button type="button" class="lien-chart-button primary" data-chart-upload>${icon('upload')}ファイルを添付</button></div><input class="lien-chart-file" type="file" accept="${ACCEPT}" data-chart-file data-chart-attachment></header><div class="lien-chart-status" data-chart-status role="status" aria-live="polite"></div><div class="lien-chart-latest" data-chart-latest><div class="lien-chart-empty">カルテファイルを読み込んでいます…</div></div>`
    const headings = [...main.querySelectorAll('h2,h3')]
    const nameSection = headings.find(node => node.textContent?.includes('実際のお名前'))?.closest('section')
    const profileSection = headings.find(node => node.textContent?.includes('髪・接客情報'))?.closest('section')
    if (nameSection?.parentElement) nameSection.after(card)
    else if (profileSection?.parentElement) profileSection.before(card)
    else main.appendChild(card)
    bindUpload(card, current.customerId, () => refreshLatest(card, current.customerId))
    try { await refreshLatest(card, current.customerId) }
    catch (error) { card.querySelector('[data-chart-latest]').innerHTML = `<div class="lien-chart-empty"><span>${esc(error.message)}</span></div>` }
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

  function historyItemMarkup(item, index) {
    return `<article class="lien-chart-item"><button type="button" class="lien-chart-item-media" data-chart-item="${esc(item.id)}" aria-label="${esc(itemName(item))}を開く">${mediaMarkup(item)}</button><div class="lien-chart-item-copy"><div class="lien-chart-item-title"><span>${esc(formatDate(item.createdAt))}</span>${index === 0 ? '<span class="lien-chart-badge">最新</span>' : ''}</div><p class="lien-chart-item-name" title="${esc(itemName(item))}">${esc(itemName(item))}</p><p>${esc(typeLabel(item))} / ${esc(formatSize(item.byteSize))} ・ 登録: ${esc(item.uploadedByName || '店舗スタッフ')}</p></div><div class="lien-chart-item-actions"><a class="lien-chart-file-action" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">${icon('external')}開く</a><a class="lien-chart-file-action download" href="${esc(item.downloadUrl || item.url)}">${icon('download')}保存</a></div></article>`
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
    if (!data.items.length) {
      grid.innerHTML = '<div class="lien-chart-history-empty">カルテファイルはまだ登録されていません。</div>'
      return
    }
    grid.innerHTML = data.items.map(historyItemMarkup).join('')
    grid.querySelectorAll('[data-chart-item]').forEach(button => button.addEventListener('click', () => {
      const item = data.items.find(value => value.id === button.dataset.chartItem)
      if (item) openItem(item)
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
      root.innerHTML = `<header class="lien-chart-history-head"><div class="lien-chart-history-title"><span>${icon('history')}</span><div><h1>カルテファイル履歴</h1><p>新しい記録から順に表示しています。</p></div></div><button type="button" class="lien-chart-button" data-chart-back disabled>${icon('arrow')}顧客カルテへ戻る</button></header><div class="lien-chart-history-toolbar"><span class="lien-chart-history-count" data-chart-history-count>読み込み中…</span><div><button type="button" class="lien-chart-button primary" data-chart-upload>${icon('upload')}ファイルを添付</button><input class="lien-chart-file" type="file" accept="${ACCEPT}" data-chart-file data-chart-attachment><div class="lien-chart-status" data-chart-status role="status" aria-live="polite"></div></div></div><div class="lien-chart-grid" data-chart-grid><div class="lien-chart-history-empty">カルテファイルを読み込んでいます…</div></div>`
      main.appendChild(root)
      requestAnimationFrame(() => window.scrollTo({ top:0, behavior:'auto' }))
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
  console.info(`[${RELEASE}] customer chart attachments ready`)
})()
