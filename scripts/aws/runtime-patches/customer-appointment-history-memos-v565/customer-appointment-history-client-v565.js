;(() => {
  'use strict'
  if (window.__lienCustomerAppointmentHistoryV565) return
  window.__lienCustomerAppointmentHistoryV565 = true

  const RELEASE = 'customer-appointment-history-memos-v565'
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, character => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[character])
  const icon = name => {
    const paths = {
      calendar:'<path d="M8 2v4M16 2v4"></path><rect width="18" height="18" x="3" y="4" rx="2"></rect><path d="M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"></path>',
      clock:'<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>',
      memo:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"></path><path d="M14 2v6h6M8 13h8M8 17h6"></path>',
      save:'<path d="M15.2 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.8Z"></path><path d="M17 21v-8H7v8M7 3v5h8"></path>',
      check:'<path d="m5 12 4 4L19 6"></path>',
      warning:'<path d="M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0Z"></path><path d="M12 9v4M12 17h.01"></path>',
    }
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.memo}</svg>`
  }

  function installStyles() {
    if (document.querySelector('style[data-customer-appointment-history-v565]')) return
    const style = document.createElement('style')
    style.dataset.customerAppointmentHistoryV565 = '1'
    style.textContent = `
      [data-customer-history-v565] *{box-sizing:border-box;letter-spacing:0}
      .lien-history-group-label{display:flex;min-height:34px;align-items:center;justify-content:space-between;gap:12px;margin-top:2px;padding:0 3px;color:#5f514b;font-size:11px;font-weight:900}
      .lien-history-group-label>span:first-child{display:inline-flex;align-items:center;gap:7px}.lien-history-group-label svg{width:16px;height:16px;color:#b84865}.lien-history-group-label strong{display:inline-flex;min-height:23px;align-items:center;border:1px solid #eadad3;border-radius:999px;background:#fff;padding:0 8px;color:#877770;font-size:9px}
      .lien-upcoming-history-card{overflow:hidden;border:1px solid #d8e4db!important;border-left:4px solid #4f846b!important;border-radius:8px!important;background:#f7fbf8!important;padding:0!important;box-shadow:0 7px 20px rgba(54,91,70,.055)}
      .lien-upcoming-history-head{display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:1px solid #dbe7de;padding:15px 17px;background:#f1f8f3}.lien-upcoming-history-date{display:flex;min-width:0;align-items:center;flex-wrap:wrap;gap:9px}.lien-upcoming-history-date>span:first-child{font-size:15px;font-weight:900;color:#302824}.lien-upcoming-history-time{display:inline-flex;align-items:center;gap:5px;color:#50665a;font-size:11px;font-weight:800}.lien-upcoming-history-time svg{width:14px;height:14px}.lien-upcoming-history-badge{display:inline-flex;min-height:25px;align-items:center;border:1px solid #bcd7c5;border-radius:999px;background:#fff;padding:0 9px;color:#397057;font-size:10px;font-weight:900}.lien-upcoming-history-badge.past{border-color:#e3cba5;color:#8b642b}.lien-upcoming-history-price{flex:0 0 auto;color:#9d405a;font-size:13px;font-weight:900}.lien-upcoming-history-price small{margin-right:4px;color:#907f77;font-size:9px}
      .lien-upcoming-history-body{padding:15px 17px 17px}.lien-upcoming-history-grid{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(150px,.8fr) minmax(160px,.85fr);gap:18px;margin:0}.lien-upcoming-history-grid div{min-width:0}.lien-upcoming-history-grid dt{color:#8c7d76;font-size:10px;font-weight:800}.lien-upcoming-history-grid dd{margin:5px 0 0;color:#332a26;font-size:12px;font-weight:900;line-height:1.55}.lien-upcoming-history-grid small{display:block;margin-top:3px;color:#8c7d76;font-size:9px;font-weight:700}.lien-booking-note{display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;margin-top:14px;border-top:1px solid #dfe8e1;padding-top:12px;color:#655851;font-size:11px;line-height:1.7}.lien-booking-note strong{color:#50665a;font-size:10px;white-space:nowrap}.lien-booking-note p{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}
      .lien-treatment-memo{display:grid;gap:10px;margin-top:14px;border-top:1px solid #e5d8d2;padding-top:14px}.lien-treatment-memo-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}.lien-treatment-memo-title{display:flex;min-width:0;align-items:center;gap:9px}.lien-treatment-memo-title>span{display:grid;width:34px;height:34px;flex:0 0 auto;place-items:center;border:1px solid #eed9df;border-radius:7px;background:#fbedf1;color:#b54865}.lien-treatment-memo-title svg{width:17px;height:17px}.lien-treatment-memo-title strong{display:block;color:#3a302c;font-size:12px}.lien-treatment-memo-title small{display:block;margin-top:2px;color:#91827b;font-size:9px}.lien-treatment-memo-private{display:inline-flex;min-height:24px;align-items:center;border:1px solid #d5e7dc;border-radius:999px;background:#f1f8f3;padding:0 8px;color:#47745e;font-size:9px;font-weight:900;white-space:nowrap}
      .lien-treatment-memo-controls{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:10px}.lien-treatment-memo textarea{display:block;width:100%;min-height:82px;max-height:180px;resize:vertical;border:1px solid #ddcec7;border-radius:7px;background:#fff;padding:11px 12px;color:#332a26;font:inherit;font-size:12px;line-height:1.65;outline:none}.lien-treatment-memo textarea::placeholder{color:#aa9c95}.lien-treatment-memo textarea:focus{border-color:#bd6a7e;box-shadow:0 0 0 3px rgba(185,72,101,.1)}.lien-treatment-memo-save{display:inline-flex;min-width:104px;min-height:42px;align-items:center;justify-content:center;gap:7px;border:1px solid #b84865;border-radius:7px;background:#b84865;padding:0 14px;color:#fff;font-size:11px;font-weight:900;cursor:pointer;box-shadow:0 6px 16px rgba(184,72,101,.14)}.lien-treatment-memo-save:hover{background:#a73d58}.lien-treatment-memo-save:disabled{border-color:#dfd3ce;background:#e9e2de;color:#9d9089;box-shadow:none;cursor:default}.lien-treatment-memo-save svg{width:16px;height:16px}.lien-treatment-memo-footer{display:flex;min-height:17px;align-items:center;justify-content:space-between;gap:12px;color:#91827b;font-size:9px}.lien-treatment-memo-meta{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.lien-treatment-memo-status{display:inline-flex;align-items:center;gap:4px;color:#397057;font-weight:900}.lien-treatment-memo-status.error{color:#a83c45}.lien-treatment-memo-status:empty{display:none}.lien-treatment-memo-status svg{width:13px;height:13px}
      @media(max-width:760px){.lien-upcoming-history-head{align-items:flex-start;flex-direction:column;gap:8px}.lien-upcoming-history-grid{grid-template-columns:1fr 1fr}.lien-upcoming-history-grid>div:first-child{grid-column:1/-1}.lien-treatment-memo-controls{grid-template-columns:1fr}.lien-treatment-memo-save{width:100%}.lien-treatment-memo-footer{align-items:flex-start;flex-direction:column}.lien-treatment-memo-private{display:none}}
      @media(max-width:430px){.lien-upcoming-history-grid{grid-template-columns:1fr}.lien-upcoming-history-grid>div:first-child{grid-column:auto}.lien-treatment-memo-heading{align-items:flex-start}.lien-treatment-memo-title small{line-height:1.45}}
    `
    document.head.appendChild(style)
  }

  function route() {
    const match = /^\/admin\/customers\/([^/]+)\/?$/.exec(location.pathname)
    if (!match) return null
    try { return { customerId:decodeURIComponent(match[1]) } } catch { return null }
  }

  function historyApi(customerId) {
    return `/api/admin/customers/${encodeURIComponent(customerId)}/visit-history`
  }

  async function payload(response, fallback) {
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || fallback)
    return data
  }

  function historySection() {
    const heading = [...document.querySelectorAll('main h2')].find(node => node.textContent?.trim() === '来店・会計履歴')
    return heading?.closest('section') || null
  }

  function historyGrid(section) {
    return [...section.children].find(node => node instanceof HTMLElement && node.tagName === 'DIV' && node.classList.contains('grid') && node.classList.contains('mt-4')) || null
  }

  function formatMoney(value) {
    const amount = Number(value)
    return Number.isFinite(amount) ? `${amount.toLocaleString('ja-JP')}円` : '会計前'
  }

  function formatTime(value) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '-'
    return new Intl.DateTimeFormat('ja-JP', { timeZone:'Asia/Tokyo', hour:'2-digit', minute:'2-digit', hour12:false }).format(date)
  }

  function formatMemoDate(value) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return new Intl.DateTimeFormat('ja-JP', {
      timeZone:'Asia/Tokyo', month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit', hour12:false,
    }).format(date)
  }

  function sourceLabel(value) {
    const source = String(value || '').toLowerCase()
    if (!source) return ''
    if (source === 'phone') return '電話予約'
    if (source === 'salon-register') return '店頭予約'
    if (source.includes('hotpepper')) return 'Hot Pepper'
    if (source.includes('kanzashi')) return 'かんざし'
    if (source.includes('お客様アプリ') || source.includes('customer')) return 'お客様アプリ'
    if (source.startsWith('gmail:')) return '外部予約'
    return String(value).slice(0, 40)
  }

  function memoMeta(memo) {
    if (!memo?.updatedAt) return '未保存'
    const date = formatMemoDate(memo.updatedAt)
    return `最終更新 ${date}${memo.updatedByName ? ` ・ ${memo.updatedByName}` : ''}`
  }

  function memoMarkup(item) {
    return `<section class="lien-treatment-memo" data-treatment-memo-v565 data-memo-subject="${esc(item.subjectKey)}"><div class="lien-treatment-memo-heading"><div class="lien-treatment-memo-title"><span>${icon('memo')}</span><div><strong>施術メモ</strong><small>施術内容・使用薬剤・次回への申し送り</small></div></div><span class="lien-treatment-memo-private">店舗内のみ</span></div><div class="lien-treatment-memo-controls"><label><span class="sr-only">施術メモ</span><textarea maxlength="4000" placeholder="施術内容や次回への申し送りを入力" data-treatment-memo-input>${esc(item.memo?.body || '')}</textarea></label><button type="button" class="lien-treatment-memo-save" data-treatment-memo-save disabled>${icon('save')}保存</button></div><div class="lien-treatment-memo-footer"><span class="lien-treatment-memo-meta" data-treatment-memo-meta>${esc(memoMeta(item.memo))}</span><span class="lien-treatment-memo-status" data-treatment-memo-status role="status" aria-live="polite"></span></div></section>`
  }

  function setStatus(node, message, error = false) {
    if (!node) return
    node.className = `lien-treatment-memo-status${error ? ' error' : ''}`
    node.innerHTML = message ? `${icon(error ? 'warning' : 'check')}${esc(message)}` : ''
  }

  function bindMemo(root, item, customerId) {
    if (!root || root.dataset.memoBoundV565 === '1') return
    root.dataset.memoBoundV565 = '1'
    const textarea = root.querySelector('[data-treatment-memo-input]')
    const button = root.querySelector('[data-treatment-memo-save]')
    const status = root.querySelector('[data-treatment-memo-status]')
    const meta = root.querySelector('[data-treatment-memo-meta]')
    if (!textarea || !button) return
    let savedValue = String(item.memo?.body || '').trim()

    const updateButton = () => {
      button.disabled = textarea.value.trim() === savedValue
      if (!button.disabled) setStatus(status, '')
    }
    textarea.addEventListener('input', updateButton)
    textarea.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !button.disabled) {
        event.preventDefault()
        button.click()
      }
    })
    button.addEventListener('click', async () => {
      if (button.disabled) return
      button.disabled = true
      textarea.disabled = true
      setStatus(status, '保存中')
      try {
        const response = await fetch(`${historyApi(customerId)}/memo`, {
          method:'PUT',
          credentials:'same-origin',
          cache:'no-store',
          headers:{ 'Content-Type':'application/json' },
          body:JSON.stringify({ subjectKey:item.subjectKey, body:textarea.value }),
        })
        const data = await payload(response, '施術メモを保存できませんでした。')
        item.memo = data.memo || null
        savedValue = String(data.memo?.body || '')
        textarea.value = savedValue
        if (meta) meta.textContent = memoMeta(data.memo)
        setStatus(status, data.memo ? '保存しました' : '削除しました')
      } catch (error) {
        setStatus(status, error.message || '保存できませんでした', true)
      } finally {
        textarea.disabled = false
        button.disabled = textarea.value.trim() === savedValue
      }
    })
  }

  function appointmentMarkup(item) {
    const duration = Number(item.durationMinutes || 0)
    const source = sourceLabel(item.source)
    const status = String(item.status || '予約中')
    return `<article class="lien-upcoming-history-card" data-current-appointment-v565 data-history-subject="${esc(item.subjectKey)}"><header class="lien-upcoming-history-head"><div class="lien-upcoming-history-date"><span>${esc(item.displayDate)}</span><span class="lien-upcoming-history-time">${icon('clock')}${esc(formatTime(item.scheduledAt))}</span><span class="lien-upcoming-history-badge${item.isPast ? ' past' : ''}">${esc(item.isPast ? '予約時刻経過' : '予約中')}</span></div><span class="lien-upcoming-history-price">${item.estimatedPrice == null ? '会計前' : `<small>見込み</small>${esc(formatMoney(item.estimatedPrice))}`}</span></header><div class="lien-upcoming-history-body"><dl class="lien-upcoming-history-grid"><div><dt>施術メニュー</dt><dd>${esc(item.menu || '当日相談')}${duration > 0 ? `<small>所要時間 ${duration.toLocaleString('ja-JP')}分</small>` : ''}</dd></div><div><dt>担当者</dt><dd>${esc(item.staffName || '指名なし')}</dd></div><div><dt>予約状況</dt><dd>${esc(status)}${source ? `<small>${esc(source)}</small>` : ''}</dd></div></dl>${item.bookingNote ? `<div class="lien-booking-note"><strong>予約メモ</strong><p>${esc(item.bookingNote)}</p></div>` : ''}${memoMarkup(item)}</div></article>`
  }

  function cardDate(card) {
    const value = card.querySelector(':scope > div:first-child > p')?.textContent?.trim() || ''
    const match = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(value)
    return match ? `${match[1]}/${match[2].padStart(2, '0')}/${match[3].padStart(2, '0')}` : value
  }

  function attachCompletedMemos(grid, completed, customerId) {
    const queues = new Map()
    for (const item of completed) queues.set(item.displayDate, [...(queues.get(item.displayDate) || []), item])
    const cards = [...grid.querySelectorAll(':scope > article:not([data-current-appointment-v565])')]
    for (const card of cards) {
      const queue = queues.get(cardDate(card)) || []
      const item = queue.shift()
      queues.set(cardDate(card), queue)
      if (!item) continue
      card.dataset.historySubject = item.subjectKey
      let editor = card.querySelector(':scope > [data-treatment-memo-v565]')
      if (editor?.dataset.memoSubject !== item.subjectKey) {
        editor?.remove()
        const shell = document.createElement('div')
        shell.innerHTML = memoMarkup(item)
        editor = shell.firstElementChild
        const photoSection = [...card.children].find(node => node instanceof HTMLElement && node.tagName === 'SECTION' && node.getAttribute('aria-label') === '施術後写真')
        if (photoSection) card.insertBefore(editor, photoSection)
        else card.appendChild(editor)
      }
      bindMemo(editor, item, customerId)
    }
  }

  function groupLabel(label, count, kind) {
    const node = document.createElement('div')
    node.className = 'lien-history-group-label'
    node.dataset.historyGroupV565 = kind
    node.innerHTML = `<span>${icon(kind === 'current' ? 'calendar' : 'check')}${esc(label)}</span><strong>${Number(count || 0).toLocaleString('ja-JP')}件</strong>`
    return node
  }

  function applyHistory(data, customerId) {
    const section = historySection()
    if (!section) return false
    const grid = historyGrid(section)
    if (!grid) return false
    const renderKey = [
      customerId,
      ...(data.appointments || []).map(item => item.subjectKey),
      '|',
      ...(data.completed || []).map(item => item.subjectKey),
    ].join('~')
    const currentSubjects = [...grid.querySelectorAll(':scope > [data-current-appointment-v565]')]
      .map(node => node.dataset.historySubject)
    const expectedSubjects = (data.appointments || []).map(item => item.subjectKey)
    const renderedCompletedCards = [...grid.querySelectorAll(':scope > article:not([data-current-appointment-v565])')]
    const completedCardsReady = renderedCompletedCards.length === (data.completed || []).length &&
      renderedCompletedCards.every(card => card.querySelector(':scope > [data-treatment-memo-v565]'))
    if (
      section.dataset.customerHistoryRenderKeyV565 === renderKey &&
      currentSubjects.length === expectedSubjects.length &&
      currentSubjects.every((subject, index) => subject === expectedSubjects[index]) &&
      completedCardsReady
    ) return true
    section.dataset.customerHistoryV565 = '1'
    grid.querySelectorAll(':scope > [data-current-appointment-v565],:scope > [data-history-group-v565]').forEach(node => node.remove())

    const completedCards = [...grid.querySelectorAll(':scope > article')]
    const emptyState = [...grid.children].find(node => node instanceof HTMLElement && node.tagName === 'P')
    if (emptyState) {
      emptyState.hidden = data.appointments.length > 0
      emptyState.style.display = data.appointments.length > 0 ? 'none' : ''
    }

    if (data.appointments.length > 0) {
      const fragment = document.createDocumentFragment()
      fragment.appendChild(groupLabel('現在の予約', data.appointments.length, 'current'))
      for (const appointment of data.appointments) {
        const shell = document.createElement('div')
        shell.innerHTML = appointmentMarkup(appointment)
        const card = shell.firstElementChild
        fragment.appendChild(card)
        bindMemo(card.querySelector('[data-treatment-memo-v565]'), appointment, customerId)
      }
      if (completedCards.length > 0) fragment.appendChild(groupLabel('来店・会計済み', data.completed.length, 'completed'))
      grid.insertBefore(fragment, grid.firstChild)
    }

    attachCompletedMemos(grid, data.completed || [], customerId)
    const top = section.firstElementChild
    const count = top ? [...top.children].find(node => node instanceof HTMLElement && node.tagName === 'SPAN') : null
    if (count) count.textContent = `${Number(data.totalCount || 0).toLocaleString('ja-JP')}件`
    const description = section.querySelector('h2')?.parentElement?.querySelector('p')
    if (description) description.textContent = '現在の予約と、施術・会計済みの履歴をまとめています。'
    section.dataset.customerHistoryRenderKeyV565 = renderKey
    return true
  }

  let cachedCustomerId = ''
  let cachedData = null
  let loading = false
  let syncTimer = 0
  let requestSerial = 0

  function scheduleSync() {
    clearTimeout(syncTimer)
    syncTimer = setTimeout(sync, 60)
  }

  async function sync() {
    const current = route()
    if (!current) {
      cachedCustomerId = ''
      cachedData = null
      return
    }
    installStyles()
    if (cachedCustomerId === current.customerId && cachedData) {
      applyHistory(cachedData, current.customerId)
      return
    }
    if (loading) return
    loading = true
    const serial = ++requestSerial
    try {
      const data = await payload(await fetch(historyApi(current.customerId), {
        credentials:'same-origin', cache:'no-store', headers:{ Accept:'application/json' },
      }), '予約・来店履歴を取得できませんでした。')
      if (serial !== requestSerial || route()?.customerId !== current.customerId) return
      cachedCustomerId = current.customerId
      cachedData = data
      if (!applyHistory(data, current.customerId)) scheduleSync()
    } catch (error) {
      console.error(`[${RELEASE}]`, error)
    } finally {
      loading = false
    }
  }

  addEventListener('popstate', () => { cachedCustomerId = ''; cachedData = null; scheduleSync() })
  addEventListener('pageshow', () => { cachedCustomerId = ''; cachedData = null; scheduleSync() })
  new MutationObserver(scheduleSync).observe(document.documentElement, { childList:true, subtree:true })
  scheduleSync()
  console.info(`[${RELEASE}] customer appointment history ready`)
})()
