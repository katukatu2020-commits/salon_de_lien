(() => {
  'use strict'
  if (window.__lienCustomerMergeV385) return
  window.__lienCustomerMergeV385 = true

  const pathMatch = () => location.pathname.match(/^\/admin\/customers\/([^/]+)$/)
  const customerId = () => pathMatch() ? decodeURIComponent(pathMatch()[1]) : ''
  const escapeHtml = value => String(value == null ? '' : value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]))
  const yen = value => `${Number(value || 0).toLocaleString('ja-JP')}円`
  const date = value => value ? new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'Asia/Tokyo' }).format(new Date(value)) : '未登録'
  const icon = name => {
    const paths = {
      merge: '<path d="M8 7h3a4 4 0 0 1 4 4v6"/><path d="m12 14 3 3 3-3"/><path d="M16 7h-3a4 4 0 0 0-4 4v6"/><path d="m6 14 3 3 3-3"/>',
      search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
      close: '<path d="m6 6 12 12M18 6 6 18"/>',
      user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
      check: '<path d="m5 12 4 4L19 6"/>',
      alert: '<path d="M10.3 3.7 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
    }
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.user}</svg>`
  }

  function styles() {
    if (document.getElementById('lien-customer-merge-v385-style')) return
    const style = document.createElement('style')
    style.id = 'lien-customer-merge-v385-style'
    style.textContent = `
      .lcm-card{display:flex;align-items:center;justify-content:space-between;gap:18px;margin:22px 0;border:1px solid #ead8cf;border-radius:22px;background:linear-gradient(145deg,#fffdfb,#fff8f5);padding:22px 24px;box-shadow:0 10px 28px rgba(70,39,31,.06)}.lcm-card-copy{display:flex;min-width:0;align-items:flex-start;gap:13px}.lcm-symbol{display:grid;width:43px;height:43px;flex:0 0 43px;place-items:center;border-radius:14px;background:#fae8ed;color:#b74462}.lcm-symbol svg{width:22px;height:22px}.lcm-card h3{margin:1px 0 5px;color:#30231e;font-family:"Yu Mincho","Hiragino Mincho ProN",serif;font-size:18px}.lcm-card p{margin:0;color:#7b6b64;font-size:11px;line-height:1.7}.lcm-open,.lcm-primary,.lcm-secondary{display:inline-flex;min-height:42px;align-items:center;justify-content:center;gap:7px;border-radius:999px;padding:0 17px;font-size:12px;font-weight:800;cursor:pointer;transition:.16s}.lcm-open,.lcm-primary{border:0;background:linear-gradient(135deg,#a75547,#c16b59);color:#fff;box-shadow:0 8px 20px #78403526}.lcm-open svg,.lcm-primary svg,.lcm-secondary svg{width:17px;height:17px}.lcm-open:hover,.lcm-primary:hover{transform:translateY(-1px);box-shadow:0 11px 24px #78403533}.lcm-primary:disabled{cursor:not-allowed;opacity:.45;transform:none}.lcm-secondary{border:1px solid #e3d1c9;background:#fff;color:#5a4540;box-shadow:none}.lcm-overlay{position:fixed;z-index:100000;inset:0;display:grid;place-items:center;padding:18px;background:rgba(39,25,20,.58);backdrop-filter:blur(8px)}.lcm-dialog{width:min(820px,100%);max-height:min(850px,calc(100dvh - 30px));overflow:auto;border:1px solid #ead5cc;border-radius:28px;background:#fffdfb;box-shadow:0 34px 100px rgba(32,20,16,.36)}.lcm-head{position:sticky;z-index:3;top:0;display:flex;align-items:flex-start;justify-content:space-between;gap:18px;border-bottom:1px solid #eadbd4;background:rgba(255,253,251,.96);padding:24px 26px 18px;backdrop-filter:blur(12px)}.lcm-head h2{margin:0;font-family:"Yu Mincho","Hiragino Mincho ProN",serif;font-size:25px}.lcm-head p{margin:7px 0 0;color:#806f68;font-size:12px;line-height:1.7}.lcm-close{display:grid;width:42px;height:42px;flex:0 0 42px;place-items:center;border:1px solid #e5d5ce;border-radius:50%;background:#fff;color:#725e56;cursor:pointer}.lcm-close svg{width:19px;height:19px}.lcm-body{padding:22px 26px 28px}.lcm-keep{display:grid;grid-template-columns:auto 1fr;gap:12px;border:1px solid #bcd9c9;border-radius:18px;background:#f2faf5;padding:16px}.lcm-keep .lcm-symbol{background:#dff1e6;color:#3f765a}.lcm-keep small{display:block;color:#4d7a62;font-size:9px;font-weight:900;letter-spacing:.1em}.lcm-keep strong{display:block;margin-top:4px;font-size:15px}.lcm-search{position:relative;margin-top:20px}.lcm-search svg{position:absolute;top:50%;left:15px;width:19px;height:19px;color:#9a8880;transform:translateY(-50%)}.lcm-search input{width:100%;height:50px;border:1px solid #e2d0c8;border-radius:14px;background:#fff;padding:0 16px 0 44px;color:#30231e;font-size:13px;outline:none}.lcm-search input:focus{border-color:#bd796a;box-shadow:0 0 0 4px rgba(196,112,92,.14)}.lcm-results{display:grid;gap:9px;margin-top:13px}.lcm-result{display:grid;grid-template-columns:42px minmax(0,1fr) auto;align-items:center;gap:12px;width:100%;border:1px solid #eadbd4;border-radius:16px;background:#fff;padding:13px 14px;color:#342721;text-align:left;cursor:pointer}.lcm-result:hover{border-color:#d9a99d;background:#fff9f7}.lcm-result.is-selected{border-color:#b55e4e;background:#fff5f2;box-shadow:inset 0 0 0 1px #b55e4e}.lcm-avatar{display:grid;width:42px;height:42px;place-items:center;border-radius:50%;background:#f3e7e1;color:#8a4d40;font-weight:900}.lcm-result strong{display:block;font-size:13px}.lcm-result span{display:block;margin-top:4px;color:#81716a;font-size:10px;line-height:1.55}.lcm-stats{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:5px}.lcm-stats em{border-radius:999px;background:#f4eee9;padding:4px 7px;color:#65554e;font-size:9px;font-style:normal;font-weight:800}.lcm-empty{border:1px dashed #e1d0c9;border-radius:16px;padding:28px;color:#8c7a72;font-size:12px;text-align:center}.lcm-confirm{margin-top:18px;border:1px solid #efc8c1;border-radius:18px;background:#fff7f5;padding:17px}.lcm-confirm[hidden]{display:none}.lcm-warning{display:flex;align-items:flex-start;gap:9px;color:#893b35;font-size:11px;line-height:1.75}.lcm-warning svg{width:19px;height:19px;flex:0 0 19px;margin-top:1px}.lcm-field{display:grid;gap:6px;margin-top:14px}.lcm-field label{color:#3f302a;font-size:11px;font-weight:800}.lcm-field input[type=text]{width:100%;height:46px;border:1px solid #e1c7bf;border-radius:12px;background:#fff;padding:0 13px;outline:none}.lcm-check{display:flex;align-items:flex-start;gap:9px;margin-top:13px;color:#4d3c35;font-size:11px;font-weight:700;line-height:1.55}.lcm-check input{width:18px;height:18px;flex:0 0 18px;accent-color:#a75547}.lcm-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:20px}.lcm-error{display:none;margin-top:13px;border-radius:12px;background:#fff0ef;padding:11px 13px;color:#a33434;font-size:11px;font-weight:800}.lcm-error.show{display:block}.lcm-success{display:grid;min-height:260px;place-items:center;text-align:center}.lcm-success .lcm-symbol{width:62px;height:62px;border-radius:50%;background:#e1f3e8;color:#3f765a}.lcm-success .lcm-symbol svg{width:30px;height:30px}.lcm-success h3{margin:15px 0 5px;font-family:"Yu Mincho",serif;font-size:22px}.lcm-success p{margin:0;color:#75655e;font-size:12px}
      @media(max-width:700px){.lcm-card{align-items:stretch;flex-direction:column;padding:18px}.lcm-open{width:100%}.lcm-overlay{align-items:end;padding:0}.lcm-dialog{width:100%;max-height:94dvh;border-radius:26px 26px 0 0}.lcm-head{padding:19px 16px 15px}.lcm-head h2{font-size:21px}.lcm-body{padding:17px 16px calc(22px + env(safe-area-inset-bottom))}.lcm-result{grid-template-columns:38px minmax(0,1fr)}.lcm-stats{grid-column:1/-1;justify-content:flex-start;padding-left:50px}.lcm-actions{display:grid}.lcm-actions button{width:100%}}
    `
    document.head.appendChild(style)
  }

  function close(overlay) {
    overlay.remove()
    document.body.style.overflow = ''
  }

  function resultMarkup(item) {
    const contact = [item.phone, item.email].filter(Boolean).join(' / ') || '連絡先未登録'
    return `<button type="button" class="lcm-result" data-lcm-id="${escapeHtml(item.id)}"><span class="lcm-avatar">${escapeHtml((item.displayName || item.name || '顧').slice(0, 1))}</span><span><strong>${escapeHtml(item.displayName || item.name)}</strong><span>${escapeHtml(contact)}${item.hasLogin ? '・顧客アカウントあり' : ''}</span></span><span class="lcm-stats"><em>予約 ${item.appointmentCount}件</em><em>会計 ${item.saleCount}件</em><em>${yen(item.salesTotal)}</em><em>${item.availablePoints}pt</em></span></button>`
  }

  async function openDialog() {
    const id = customerId()
    if (!id) return
    const overlay = document.createElement('div')
    overlay.className = 'lcm-overlay'
    overlay.innerHTML = `<section class="lcm-dialog" role="dialog" aria-modal="true" aria-labelledby="lcm-title"><header class="lcm-head"><div><h2 id="lcm-title">顧客カルテを統合</h2><p>現在のカルテを残し、選択した重複カルテの履歴をまとめます。</p></div><button type="button" class="lcm-close" aria-label="閉じる">${icon('close')}</button></header><div class="lcm-body"><div class="lcm-empty">顧客情報を確認しています…</div></div></section>`
    document.body.appendChild(overlay)
    document.body.style.overflow = 'hidden'
    overlay.querySelector('.lcm-close').addEventListener('click', () => close(overlay))
    overlay.addEventListener('click', event => { if (event.target === overlay) close(overlay) })
    const body = overlay.querySelector('.lcm-body')
    let data
    try {
      const response = await fetch(`/api/admin/customers/${encodeURIComponent(id)}/merge-candidates`, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      data = await response.json()
      if (!response.ok) throw new Error(data.error || '顧客情報を取得できませんでした。')
    } catch (error) {
      body.innerHTML = `<p class="lcm-empty">${escapeHtml(error.message)}</p>`
      return
    }
    let candidates = data.candidates || []
    let selected = null
    let timer = 0
    body.innerHTML = `<section class="lcm-keep"><span class="lcm-symbol">${icon('check')}</span><div><small>残すカルテ</small><strong>${escapeHtml(data.target.displayName || data.target.name)}</strong><span>${escapeHtml(data.target.phone || data.target.email || '連絡先未登録')}・予約 ${data.target.appointmentCount}件・会計 ${data.target.saleCount}件・${data.target.availablePoints}pt</span></div></section><div class="lcm-search">${icon('search')}<input type="search" placeholder="統合する顧客を氏名・電話・メールで検索" aria-label="統合する顧客を検索"></div><div class="lcm-results"></div><section class="lcm-confirm" hidden><div class="lcm-warning">${icon('alert')}<div><strong>この操作は取り消せません。</strong><br>選択したカルテの予約・会計・ポイント・施術履歴・チャットなどを現在のカルテへ移し、選択したカルテは店舗画面から非表示になります。</div></div><div class="lcm-field"><label>確認のため、統合する顧客名を入力</label><input type="text" data-lcm-confirm-name autocomplete="off"></div><label class="lcm-check"><input type="checkbox" data-lcm-confirm-check>統合先と統合対象を確認し、顧客データをまとめることに同意します。</label><p class="lcm-error" role="alert"></p><div class="lcm-actions"><button type="button" class="lcm-secondary" data-lcm-cancel>選択を解除</button><button type="button" class="lcm-primary" data-lcm-submit disabled>${icon('merge')}このカルテへ統合</button></div></section>`
    const results = body.querySelector('.lcm-results')
    const confirm = body.querySelector('.lcm-confirm')
    const nameInput = body.querySelector('[data-lcm-confirm-name]')
    const check = body.querySelector('[data-lcm-confirm-check]')
    const submit = body.querySelector('[data-lcm-submit]')
    const error = body.querySelector('.lcm-error')
    const render = () => {
      results.innerHTML = candidates.length ? candidates.map(resultMarkup).join('') : '<p class="lcm-empty">該当する顧客が見つかりません。</p>'
      results.querySelectorAll('[data-lcm-id]').forEach(button => button.addEventListener('click', () => {
        selected = candidates.find(item => item.id === button.dataset.lcmId) || null
        results.querySelectorAll('.lcm-result').forEach(item => item.classList.toggle('is-selected', item === button))
        confirm.hidden = !selected
        nameInput.value = ''
        nameInput.placeholder = selected ? `「${selected.name}」と入力` : ''
        check.checked = false
        submit.disabled = true
        error.classList.remove('show')
        confirm.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }))
    }
    render()
    body.querySelector('.lcm-search input').addEventListener('input', event => {
      clearTimeout(timer)
      timer = setTimeout(async () => {
        try {
          const response = await fetch(`/api/admin/customers/${encodeURIComponent(id)}/merge-candidates?q=${encodeURIComponent(event.target.value)}`, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
          const next = await response.json()
          if (!response.ok) throw new Error(next.error)
          candidates = next.candidates || []
          selected = null
          confirm.hidden = true
          render()
        } catch {}
      }, 260)
    })
    const validate = () => { submit.disabled = !selected || nameInput.value.trim() !== selected.name.trim() || !check.checked }
    nameInput.addEventListener('input', validate)
    check.addEventListener('change', validate)
    body.querySelector('[data-lcm-cancel]').addEventListener('click', () => { selected = null; confirm.hidden = true; render() })
    submit.addEventListener('click', async () => {
      if (submit.disabled || !selected) return
      submit.disabled = true
      submit.textContent = '統合しています…'
      error.classList.remove('show')
      try {
        const response = await fetch(`/api/admin/customers/${encodeURIComponent(id)}/merge`, {
          method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ sourceCustomerId: selected.id, confirmationName: nameInput.value.trim(), confirmed: true }),
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || '統合できませんでした。')
        body.innerHTML = `<section class="lcm-success"><div><span class="lcm-symbol">${icon('check')}</span><h3>顧客カルテを統合しました</h3><p>${escapeHtml(selected.displayName || selected.name)}様の履歴を、${escapeHtml(data.target.displayName || data.target.name)}様のカルテへまとめました。</p></div></section>`
        setTimeout(() => { location.href = `/admin/customers/${encodeURIComponent(id)}?merged=1` }, 900)
      } catch (failure) {
        error.textContent = failure.message
        error.classList.add('show')
        submit.innerHTML = `${icon('merge')}このカルテへ統合`
        validate()
      }
    })
  }

  function mount() {
    if (!pathMatch()) {
      document.getElementById('lien-customer-merge-v385-card')?.remove()
      document.querySelectorAll('.lcm-overlay').forEach(overlay => overlay.remove())
      document.body.style.overflow = ''
      return
    }
    if (document.getElementById('lien-customer-merge-v385-card')) return
    const main = document.querySelector('main')
    if (!main) return
    const card = document.createElement('section')
    card.id = 'lien-customer-merge-v385-card'
    card.className = 'lcm-card'
    card.innerHTML = `<div class="lcm-card-copy"><span class="lcm-symbol">${icon('merge')}</span><div><h3>重複した顧客カルテを統合</h3><p>同じお客様のカルテが複数ある場合、予約・会計・ポイント・施術履歴を現在のカルテへまとめます。</p></div></div><button type="button" class="lcm-open">${icon('merge')}統合する顧客を選択</button>`
    const dangerForm = [...main.querySelectorAll('form')].find(form => form.textContent.includes('顧客一覧から非表示'))
    const anchor = dangerForm ? dangerForm.parentElement : null
    if (anchor && anchor.parentElement) anchor.parentElement.insertBefore(card, anchor)
    else main.appendChild(card)
    card.querySelector('.lcm-open').addEventListener('click', openDialog)
  }

  styles()
  mount()
  const observer = new MutationObserver(() => mount())
  observer.observe(document.documentElement, { childList: true, subtree: true })
  addEventListener('popstate', () => setTimeout(mount, 0))
})()
