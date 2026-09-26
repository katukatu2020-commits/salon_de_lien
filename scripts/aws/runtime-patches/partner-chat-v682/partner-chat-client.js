(() => {
  'use strict'
  const root = document.getElementById('wholesale-app')
  if (!root || window.__partnerChatV682) return
  window.__partnerChatV682 = true
  document.body.classList.add('pc-page')
  const salon = !!document.body.dataset.erpSalon
  const initial = salon ? document.body.dataset.erpSalon : new URLSearchParams(location.search).get('salon') || ''
  const icons = window.PartnerChatIcons || {}
  const icon = name => icons[name] || ''
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch])
  const label = salon ? 'ディーラー' : 'サロン'
  const drafts = new Map(), retries = new Map(), readCursors = new Map()
  let selected = '', generation = 0, rows = [], older = false, page = 1, total = 0
  let unread = false, search = '', member = '', composing = false, stopped = false, syncing = false
  let listVersion = 0, listSignature = '', pendingSend = '', reading = false, loadingOlder = false, timer
  const date = value => new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric' }).format(new Date(value))
  const time = value => new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
  const day = value => new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(value))
  root.innerHTML = `<div class="pc-shell">
    <aside class="pc-sidebar" aria-label="${label}一覧">
      <div class="pc-list-head"><div class="pc-heading"><h2>チャット</h2><button class="pc-icon" id="pc-refresh" type="button" aria-label="会話を更新" title="会話を更新">${icon('RefreshCw')}</button></div>
        <label class="pc-search">${icon('Search')}<input id="pc-search" type="search" maxlength="100" placeholder="${label}名・コードで検索" aria-label="${label}名・コードで検索" autocomplete="off"></label>
        <div class="pc-tabs" aria-label="会話の絞り込み"><button type="button" id="pc-all" aria-pressed="true">すべて <span>0</span></button><button type="button" id="pc-unread" aria-pressed="false">未読 <span>0</span></button></div>
        ${salon ? '' : '<label class="pc-member">担当者<select id="pc-member"><option value="">すべての担当者</option></select></label>'}
      </div><p class="pc-error" id="pc-list-error" role="alert" hidden></p>
      <div class="pc-list-caption"><span id="pc-list-count">読み込み中</span><span>更新順</span></div>
      <div class="pc-partners" id="pc-partners"><p class="pc-empty">読み込み中...</p></div>
      <footer class="pc-pager"><span id="pc-range"></span><div><button class="pc-icon" type="button" id="pc-prev" aria-label="前のページ" title="前のページ">${icon('ChevronLeft')}</button><span id="pc-page">1 / 1</span><button class="pc-icon" type="button" id="pc-next" aria-label="次のページ" title="次のページ">${icon('ChevronRight')}</button></div></footer>
    </aside>
    <section class="pc-conversation" aria-label="会話">
      <div class="pc-welcome" id="pc-welcome">${icon('MessageSquare')}<h2>会話を選択してください</h2></div>
      <div class="pc-thread" id="pc-thread" hidden>
        <header class="pc-thread-head"><button class="pc-icon pc-back" id="pc-back" type="button" aria-label="${label}一覧に戻る">${icon('ArrowLeft')}</button><div><h2 id="pc-name"></h2><p id="pc-contact"></p></div><span class="pc-connected">契約中</span><button class="pc-icon" id="pc-thread-refresh" type="button" aria-label="会話を再読み込み" title="会話を再読み込み">${icon('RefreshCw')}</button></header>
        <div class="pc-error" id="pc-thread-error" role="alert" hidden></div>
        <div class="pc-log" id="pc-log" role="log" aria-label="メッセージ履歴" aria-live="off" tabindex="0"><button class="pc-older" id="pc-older" type="button" hidden>以前のメッセージ</button><div id="pc-messages"></div><p class="pc-empty" id="pc-empty"></p></div>
        <button class="pc-new" id="pc-new" type="button" hidden>新着メッセージ ${icon('ChevronDown')}</button>
        <form class="pc-composer" id="pc-form"><label class="pc-sr" for="pc-body">メッセージ</label><textarea id="pc-body" maxlength="4000" rows="2" placeholder="メッセージを入力" aria-label="メッセージ"></textarea><button class="pc-send" id="pc-send" type="submit" disabled>${icon('Send')}<span>送信</span></button></form>
      </div>
    </section>
  </div><span class="pc-sr" id="pc-status" role="status" aria-live="polite"></span>`
  const $ = id => document.getElementById('pc-' + id)
  const body = $('body'), log = $('log')
  async function api(name, { target = selected || initial, data, query = {} } = {}) {
    const params = new URLSearchParams(query)
    if (salon) params.set('dealer', target)
    const response = await fetch((salon ? '/api/admin/wholesale/erp/' : '/api/dealer/erp/') + name + '?' + params, {
      credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(15000),
      ...(data ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) } : {})
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok || !result.ok) throw Object.assign(new Error(result.error || '通信できませんでした。更新して再試行してください。'), { status: response.status })
    return result
  }
  function error(where, err) {
    const node = $(where + '-error')
    node.replaceChildren(document.createTextNode(err.message || '通信できませんでした。再試行してください。'))
    if (err.status === 401 || err.status === 428) {
      const a = document.createElement('a')
      a.href = err.status === 428 ? '/dealer/password-change' : salon ? '/admin/login?next=' + encodeURIComponent(location.pathname + location.search) : '/dealer/login'
      a.textContent = err.status === 428 ? 'パスワード変更へ' : 'ログインへ'
      node.append(' ', a)
    }
    node.hidden = false
  }
  function clearError(where) { $(where + '-error').hidden = true }
  function updateSend() { $('send').disabled = !selected || body.disabled || !body.value.trim() || !!pendingSend }
  async function loadPartners() {
    const version = ++listVersion
    try {
      const result = await api('chat-partners', { query: { page, search, member, unread: unread ? '1' : '0' } })
      if (version !== listVersion || stopped) return
      clearError('list')
      page = result.page; total = result.total
      $('all').querySelector('span').textContent = result.counts.total
      $('unread').querySelector('span').textContent = result.counts.unreadCount
      $('list-count').textContent = `${unread ? '未読の会話' : '契約中の' + label} ${total}件`
      if (!salon) {
        const markup = '<option value="">すべての担当者</option>' + result.members.map(m => `<option value="${esc(m.id)}">${esc(m.name)}</option>`).join('')
        if ($('member').innerHTML !== markup && document.activeElement !== $('member')) { $('member').innerHTML = markup; $('member').value = member }
      }
      const signature = JSON.stringify([result.rows, selected])
      if (signature !== listSignature) {
        listSignature = signature
        const scroll = $('partners').scrollTop
        const focused = document.activeElement?.closest('[data-partner]')?.dataset.partner
        $('partners').innerHTML = result.rows.length ? result.rows.map(p => `<button type="button" class="pc-partner" data-partner="${esc(p.id)}" aria-current="${p.id === selected ? 'true' : 'false'}"><span class="pc-partner-top"><strong>${esc(p.name)}</strong><time>${p.updated ? esc(date(p.updated)) : ''}</time></span><small>${esc(p.code || '')}${p.memberName ? ' / 担当 ' + esc(p.memberName) : ''}</small><span class="pc-preview"><span>${esc(p.preview || 'メッセージはありません')}</span>${p.unread ? `<b class="pc-badge" aria-label="未読 ${p.unread}件">${p.unread > 99 ? '99+' : p.unread}</b>` : ''}</span></button>`).join('') : `<p class="pc-empty">${unread ? '未読の会話はありません' : search || member ? '該当する' + label + 'がありません' : '契約中の' + label + 'はありません'}</p>`
        if (focused) [...$('partners').querySelectorAll('[data-partner]')].find(n => n.dataset.partner === focused)?.focus({ preventScroll: true })
        $('partners').scrollTop = scroll
      }
      const pages = Math.max(1, Math.ceil(total / 30))
      $('range').textContent = total ? `${(page - 1) * 30 + 1}–${Math.min(page * 30, total)} / ${total}件` : '0件'
      $('page').textContent = `${page} / ${pages}`; $('prev').disabled = page <= 1; $('next').disabled = page >= pages
    } catch (err) { if (version === listVersion) error('list', err) }
  }
  const nearBottom = () => log.scrollHeight - log.scrollTop - log.clientHeight < 70
  function scrollEnd() { log.scrollTop = log.scrollHeight; $('new').hidden = true }
  function messageNode(m, previous) {
    const fragment = document.createDocumentFragment()
    if (!previous || day(previous.createdAt) !== day(m.createdAt)) {
      const d = document.createElement('p'); d.className = 'pc-day'; d.textContent = day(m.createdAt); fragment.append(d)
    }
    const article = document.createElement('article')
    article.className = 'pc-message' + (m.senderType === (salon ? 'SALON' : 'DEALER') ? ' pc-outgoing' : '')
    article.dataset.messageId = m.id
    article.innerHTML = `<header><span>${esc(m.senderName)}</span><time datetime="${esc(m.createdAt)}">${esc(time(m.createdAt))}</time></header>${m.orderNo ? `<small>受注 ${esc(m.orderNo)}</small>` : m.subject !== 'サロン・ディーラーチャット' ? `<small>${esc(m.subject)}</small>` : ''}<p>${esc(m.body)}</p>`
    fragment.append(article); return fragment
  }
  function appendMessages(incoming) {
    const fresh = incoming.filter(m => !rows.some(r => r.id === m.id))
    for (const m of fresh) { $('messages').append(messageNode(m, rows[rows.length - 1])); rows.push(m) }
    $('empty').hidden = rows.length > 0
    return fresh.length
  }
  async function markRead() {
    if (reading || !selected || !rows.length || !nearBottom() || document.visibilityState !== 'visible') return
    const target = selected, cursor = rows[rows.length - 1].id
    if (readCursors.get(target) === cursor) return
    reading = true
    try {
      await api('chat-read', { target, data: { partner: target, messageId: cursor, key: crypto.randomUUID() } })
      readCursors.set(target, cursor)
      window.dispatchEvent(new Event('orimia:partner-chat-read'))
      await loadPartners()
    } catch (err) { if (target === selected) error('thread', err) } finally { reading = false }
  }
  async function open(target) {
    if (selected) drafts.set(selected, body.value)
    const token = ++generation
    selected = target; rows = []; older = false; loadingOlder = false
    root.querySelector('.pc-shell').classList.add('pc-open')
    $('welcome').hidden = true; $('thread').hidden = false; $('messages').replaceChildren()
    $('empty').hidden = false; $('empty').textContent = '読み込み中...'; $('older').hidden = true; $('older').disabled = false; $('new').hidden = true
    $('name').textContent = [...$('partners').querySelectorAll('[data-partner]')].find(n => n.dataset.partner === target)?.querySelector('strong').textContent || label
    $('contact').textContent = ''; clearError('thread'); body.value = drafts.get(target) || ''; body.disabled = true; updateSend()
    for (const n of $('partners').querySelectorAll('[data-partner]')) n.setAttribute('aria-current', String(n.dataset.partner === target))
    listSignature = ''
    const url = new URL(location.href); url.searchParams.set(salon ? 'dealer' : 'salon', target); history.replaceState(null, '', url)
    try {
      const data = await api('chat-messages', { target, query: { partner: target } })
      if (token !== generation || stopped) return
      $('name').textContent = data.partner.name
      $('contact').textContent = [data.partner.code, data.partner.memberName && '担当 ' + data.partner.memberName].filter(Boolean).join(' / ')
      body.disabled = false; appendMessages(data.rows); older = data.more; $('older').hidden = !older
      $('empty').textContent = 'メッセージはありません'; scrollEnd(); updateSend(); await markRead()
    } catch (err) { if (token === generation) { $('empty').textContent = '会話を読み込めませんでした'; error('thread', err) } }
  }
  async function pollMessages() {
    if (!selected) return
    if (body.disabled) { await open(selected); return }
    const token = generation, target = selected
    const data = await api('chat-messages', { target, query: { partner: target, after: rows.length ? rows[rows.length - 1].id : 0 } })
    if (token !== generation || stopped) return
    const bottom = nearBottom(), count = appendMessages(data.rows)
    $('name').textContent = data.partner.name
    if (count) { if (bottom) scrollEnd(); else $('new').hidden = false; $('status').textContent = `${count}件の新しいメッセージ` }
    await markRead()
  }
  async function sync() {
    if (syncing || stopped || document.visibilityState !== 'visible' || composing) return
    syncing = true
    try { await loadPartners(); await pollMessages() } catch (err) { error('thread', err) } finally { syncing = false }
  }
  $('partners').addEventListener('click', event => { const p = event.target.closest('[data-partner]'); if (p) void open(p.dataset.partner) })
  $('refresh').addEventListener('click', () => { clearError('thread'); void sync() })
  $('thread-refresh').addEventListener('click', () => { clearError('thread'); void sync() })
  $('back').addEventListener('click', () => {
    drafts.set(selected, body.value); selected = ''; generation++; root.querySelector('.pc-shell').classList.remove('pc-open'); $('thread').hidden = true; $('welcome').hidden = false
    const url = new URL(location.href); if (!salon) url.searchParams.delete('salon'); history.replaceState(null, '', url); void loadPartners()
  })
  let searchTimer
  const searchChanged = () => { if (composing) return; clearTimeout(searchTimer); searchTimer = setTimeout(() => { search = $('search').value; page = 1; void loadPartners() }, 250) }
  $('search').addEventListener('input', searchChanged)
  $('search').addEventListener('compositionstart', () => { composing = true; clearTimeout(searchTimer) })
  $('search').addEventListener('compositionend', () => { composing = false; searchChanged() })
  $('member')?.addEventListener('change', () => { member = $('member').value; page = 1; void loadPartners() })
  for (const [id, flag] of [['all', false], ['unread', true]]) $(id).addEventListener('click', () => { unread = flag; page = 1; $('all').setAttribute('aria-pressed', String(!flag)); $('unread').setAttribute('aria-pressed', String(flag)); void loadPartners() })
  $('prev').addEventListener('click', () => { page--; $('partners').scrollTop = 0; void loadPartners() })
  $('next').addEventListener('click', () => { page++; $('partners').scrollTop = 0; void loadPartners() })
  body.addEventListener('input', () => { drafts.set(selected, body.value); updateSend() })
  body.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); $('form').requestSubmit() } })
  $('form').addEventListener('submit', async event => {
    event.preventDefault()
    const target = selected, message = body.value
    if (!target || body.disabled || !message.trim() || pendingSend) return
    pendingSend = target; updateSend(); clearError('thread')
    const retry = retries.get(target), key = retry?.body === message ? retry.key : crypto.randomUUID()
    retries.set(target, { body: message, key })
    try {
      await api('chat-send', { target, data: { partner: target, body: message, key } })
      retries.delete(target)
      if (drafts.get(target) === message) drafts.delete(target)
      if (selected === target && body.value === message) body.value = ''
      if (selected === target) { await pollMessages(); scrollEnd(); await markRead(); body.focus({ preventScroll: true }) }
      $('status').textContent = '送信しました'; await loadPartners()
    } catch (err) { if (selected === target) error('thread', err); else error('list', err) } finally { pendingSend = ''; updateSend() }
  })
  $('older').addEventListener('click', async () => {
    if (!selected || !older || loadingOlder || !rows.length) return
    const token = generation, target = selected
    loadingOlder = true; $('older').disabled = true
    try {
      const data = await api('chat-messages', { target, query: { partner: target, before: rows[0].id } })
      if (token !== generation) return
      const height = log.scrollHeight, top = log.scrollTop
      rows = [...data.rows, ...rows]; $('messages').replaceChildren()
      rows.forEach((m, index) => $('messages').append(messageNode(m, rows[index - 1])))
      older = data.more; $('older').hidden = !older; log.scrollTop = top + log.scrollHeight - height
    } catch (err) { if (token === generation) error('thread', err) } finally { if (token === generation) { loadingOlder = false; $('older').disabled = false } }
  })
  $('new').addEventListener('click', () => { scrollEnd(); void markRead() })
  log.addEventListener('scroll', () => { if (nearBottom()) { $('new').hidden = true; void markRead() } }, { passive: true })
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void sync() })
  window.addEventListener('pagehide', () => { stopped = true; clearInterval(timer) })
  window.addEventListener('pageshow', e => { if (e.persisted) { stopped = false; timer = setInterval(sync, 8000); void sync() } })
  void loadPartners().then(() => { if (initial) void open(initial) })
  timer = setInterval(sync, 8000)
})()
