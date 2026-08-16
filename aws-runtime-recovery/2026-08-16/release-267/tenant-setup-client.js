(() => {
  'use strict'

  const state = {
    setup: null,
    enhancementFrame: 0,
    routeTimers: [],
    shiftLayoutObserver: null,
    shiftLayoutTarget: null,
    shiftLayoutWidth: 0,
    businessSchedule: { openMinutes: 600, closeMinutes: 1140, closedWeekdays: [1] },
  }

  function currentPage() {
    if (location.pathname === '/admin/appointments') return 'appointments'
    if (location.pathname === '/admin/products' && new URLSearchParams(location.search).get('section') === 'menus') return 'menus'
    return ''
  }

  function isShiftRoute() {
    if (currentPage() !== 'appointments') return false
    const query = new URLSearchParams(location.search)
    return query.get('view') !== 'calendar' && query.get('tab') !== 'history'
  }

  const icon = (name, className = '') => {
    const paths = {
      plus: '<path d="M12 5v14M5 12h14"/>',
      user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
      scissors: '<circle cx="6" cy="7" r="3"/><circle cx="6" cy="17" r="3"/><path d="m8.5 9.2 11 9M8.5 14.8 20 5"/>',
      mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
      copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3"/>',
      check: '<path d="m5 12 4 4L19 6"/>',
      close: '<path d="m6 6 12 12M18 6 6 18"/>',
      arrow: '<path d="m9 18 6-6-6-6"/>',
      chevronLeft: '<path d="m15 18-6-6 6-6"/>',
      chevronRight: '<path d="m9 18 6-6-6-6"/>',
      spark: '<path d="m12 3 1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4z"/><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7z"/>',
    }
    return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.spark}</svg>`
  }

  function addStyles() {
    if (document.getElementById('lien-tenant-setup-styles')) return
    const style = document.createElement('style')
    style.id = 'lien-tenant-setup-styles'
    style.textContent = `
      :root{--ts-primary:#9c5344;--ts-primary-dark:#783c31;--ts-rose:#d44e71;--ts-ink:#2d211d;--ts-muted:#806f68;--ts-line:#ead7ce;--ts-paper:#fffdfb;--ts-soft:#faf3ed;--ts-success:#4d7964}
      .ts-button{display:inline-flex;min-height:44px;align-items:center;justify-content:center;gap:8px;border:0;border-radius:999px;background:linear-gradient(135deg,var(--ts-primary),#b96856);padding:0 20px;color:white;font-size:13px;font-weight:800;box-shadow:0 8px 20px #743b3026;cursor:pointer;transition:.18s}.ts-button:hover{transform:translateY(-1px);box-shadow:0 12px 25px #743b3033}.ts-button:disabled{cursor:not-allowed;opacity:.55;transform:none}.ts-button svg{width:18px;height:18px}.ts-button.secondary{border:1px solid var(--ts-line);background:white;color:var(--ts-ink);box-shadow:none}.ts-button.compact{min-height:38px;padding:0 14px;font-size:12px}
      .ts-shift-action{display:flex;justify-content:flex-end;margin:0 0 12px}.ts-shift-action.inline{display:flex;margin:0;vertical-align:middle}
      .shift-canvas{font-variant-numeric:tabular-nums;--ts-shift-hours:9;--ts-shift-slots:18}.shift-top{grid-template-rows:48px 72px!important}.shift-top>div:first-child{min-height:48px!important;flex-direction:column!important;align-items:flex-start!important;justify-content:center!important;gap:7px!important;padding:8px 14px!important;line-height:1.25!important}.shift-top>div:nth-child(2){height:48px!important;background-color:#fbf7f4!important;background-image:linear-gradient(to right,transparent calc(100% - 1px),#eaded7 calc(100% - 1px))!important;background-size:calc(100% / var(--ts-shift-slots)) 100%!important;background-position:left top!important}.shift-top>div:nth-child(2)>span{top:50%!important;right:auto!important;transform:translate(-50%,-50%)!important;color:#493a34!important;font-size:12px!important;font-weight:800!important;letter-spacing:.015em!important}.shift-top>div:nth-child(3)>span,.shift-top>div:nth-child(4)>div{height:36px!important;min-height:36px!important}.shift-top>div:nth-child(3)>span{padding:0 14px!important;color:#6e5c54!important;font-size:11px!important;font-weight:700!important}.shift-top>div:nth-child(4)>div{align-items:stretch!important}.shift-top .shift-summary-input{height:36px!important;min-height:36px!important;border-radius:0!important;background:#fffdfb!important;font-weight:700!important;transition:background-color .15s,border-color .15s,box-shadow .15s!important}.shift-top .shift-summary-input:hover{background:#fff8f5!important}.shift-top .shift-summary-input:focus{position:relative;z-index:2;background:#fff!important;outline:0!important;box-shadow:inset 0 0 0 2px #a75b4c!important}.ts-shift-action.inline [data-ts-add-staff]{width:auto!important;min-width:0!important;height:30px!important;min-height:30px!important;padding:0 10px!important;border:1px solid #d9b7ad!important;border-radius:9px!important;background:#fff!important;color:var(--ts-primary-dark)!important;font-size:10px!important;font-weight:800!important;line-height:1!important;letter-spacing:.01em!important;white-space:nowrap!important;box-shadow:0 2px 7px #6f3f3412!important}.ts-shift-action.inline [data-ts-add-staff]:hover{transform:none!important;border-color:#b86a59!important;background:#fff8f5!important;box-shadow:0 3px 10px #6f3f341c!important}.ts-shift-action.inline [data-ts-add-staff] svg{width:13px!important;height:13px!important;flex:0 0 13px!important}.shift-staff-cell{min-height:84px!important}.shift-lane{min-height:84px!important;background-color:#fff!important;background-image:linear-gradient(to right,transparent calc(100% - 1px),#eaded7 calc(100% - 1px))!important;background-size:calc(100% / var(--ts-shift-slots)) 100%!important;background-position:left top!important}.shift-lane>span.pointer-events-none.absolute.inset-y-0.border-l{display:none!important}
      @media(min-width:1024px){button.ts-sidebar-toggle{position:fixed!important;z-index:90!important;top:18px!important;right:auto!important;display:grid!important;width:38px!important;height:38px!important;min-width:38px!important;min-height:38px!important;place-items:center!important;overflow:hidden!important;border:1px solid #dfcec6!important;border-radius:13px!important;background:linear-gradient(145deg,#fff,#fff8f5)!important;padding:0!important;color:#865044!important;font-size:0!important;box-shadow:0 8px 22px rgba(77,42,33,.13),inset 0 1px 0 #fff!important;backdrop-filter:blur(12px)!important;transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease!important}button.ts-sidebar-toggle::before,button.ts-sidebar-toggle::after{display:none!important;width:0!important;height:0!important;border:0!important;content:none!important}button.ts-sidebar-toggle:hover{border-color:#bd8071!important;color:#743e34!important;transform:translateY(-1px)!important;box-shadow:0 11px 26px rgba(77,42,33,.18),inset 0 1px 0 #fff!important}button.ts-sidebar-toggle:active{transform:scale(.96)!important}button.ts-sidebar-toggle:focus-visible{outline:3px solid #cf4f7230!important;outline-offset:2px!important}button.ts-sidebar-toggle>svg.ts-sidebar-chevron{display:block!important;width:18px!important;height:18px!important;flex:0 0 18px!important;stroke-width:2!important;filter:none!important;pointer-events:none!important}}
      .ts-overlay{position:fixed;z-index:99999;inset:0;display:grid;place-items:center;padding:18px;background:#2f211b70;backdrop-filter:blur(7px);animation:ts-fade .16s ease-out}.ts-dialog{position:relative;width:min(640px,100%);max-height:min(760px,calc(100dvh - 28px));overflow:auto;border:1px solid #edd8ce;border-radius:26px;background:linear-gradient(155deg,#fffdfb,#fff8f4);box-shadow:0 30px 90px #2f1d1742;animation:ts-rise .22s ease-out}.ts-dialog.small{width:min(500px,100%)}.ts-dialog-head{display:grid;grid-template-columns:74px 1fr auto;gap:16px;align-items:center;padding:24px 24px 18px;border-bottom:1px solid var(--ts-line)}.ts-dialog-head h2{margin:0;color:var(--ts-ink);font-family:"Yu Mincho","Hiragino Mincho ProN",serif;font-size:23px;letter-spacing:.03em}.ts-dialog-head p{margin:6px 0 0;color:var(--ts-muted);font-size:12px;line-height:1.75}.ts-close{display:grid;width:40px;height:40px;place-items:center;border:1px solid var(--ts-line);border-radius:50%;background:white;color:#806e66;cursor:pointer}.ts-close svg{width:19px;height:19px}
      .ts-mascot{position:relative;display:grid;width:68px;height:68px;place-items:center;border-radius:22px;background:linear-gradient(145deg,#f9d8df,#f4b9c8);box-shadow:inset 0 0 0 6px #fff8,0 8px 18px #8b4e5922}.ts-mascot svg{width:52px;height:52px}.ts-mascot .spark{position:absolute;top:-7px;right:-8px;width:23px;height:23px;color:#cf6a84}.ts-dialog-body{padding:22px 24px 26px}.ts-field{display:grid;gap:7px;margin-top:16px}.ts-field:first-child{margin-top:0}.ts-field label{font-size:12px;font-weight:800;color:var(--ts-ink)}.ts-field input,.ts-field select{width:100%;min-height:48px;border:1px solid var(--ts-line);border-radius:13px;background:white;padding:0 14px;color:var(--ts-ink);font-size:14px;outline:none}.ts-field input:focus,.ts-field select:focus{border-color:#bd796a;box-shadow:0 0 0 4px #c77d6b1f}.ts-help{color:var(--ts-muted);font-size:11px;line-height:1.65}.ts-error{display:none;margin-top:13px;border-radius:12px;background:#fff0f0;padding:11px 13px;color:#b3333b;font-size:12px;font-weight:700}.ts-error.show{display:block}.ts-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:10px;margin-top:22px}
      .ts-progress{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:20px}.ts-progress-item{position:relative;border:1px solid var(--ts-line);border-radius:15px;background:white;padding:12px 10px;color:var(--ts-muted);font-size:11px;text-align:center}.ts-progress-item svg{display:block;width:21px;height:21px;margin:0 auto 7px}.ts-progress-item.done{border-color:#bcd8ca;background:#f1faf5;color:var(--ts-success)}.ts-progress-item.current{border-color:#d79b8e;background:#fff7f3;color:var(--ts-primary-dark);box-shadow:0 0 0 3px #c9786814}.ts-guide-card{border:1px solid var(--ts-line);border-radius:18px;background:white;padding:18px}.ts-guide-card h3{margin:0;font-size:17px;color:var(--ts-ink)}.ts-guide-card p{margin:8px 0 0;color:var(--ts-muted);font-size:12px;line-height:1.8}.ts-guide-card .ts-button{margin-top:16px}.ts-complete{display:grid;place-items:center;min-height:150px;text-align:center}.ts-complete .mark{display:grid;width:62px;height:62px;place-items:center;border-radius:50%;background:#e8f6ed;color:var(--ts-success)}.ts-complete .mark svg{width:31px;height:31px}.ts-complete h3{margin:15px 0 4px;font-family:"Yu Mincho",serif;font-size:20px}.ts-complete p{margin:0;color:var(--ts-muted);font-size:12px}.ts-inbound{margin-top:16px;border:1px solid #e7cfc4;border-radius:16px;background:#fffaf7;padding:14px;text-align:left}.ts-inbound-label{color:var(--ts-muted);font-size:10px;font-weight:800;letter-spacing:.08em}.ts-inbound-address{display:flex;align-items:center;gap:10px;margin-top:7px}.ts-inbound-address code{min-width:0;flex:1;overflow-wrap:anywhere;color:#63372f;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:13px;font-weight:800}.ts-inbound-address .ts-button{flex:0 0 auto;margin:0}.ts-inbound ol{margin:13px 0 0;padding-left:20px;color:var(--ts-muted);font-size:11px;line-height:1.8}.ts-inbound-status{display:flex;align-items:center;gap:7px;margin-top:12px;color:var(--ts-success);font-size:11px;font-weight:800}.ts-inbound-status::before{width:7px;height:7px;border-radius:50%;background:#65a383;content:""}.ts-copy-feedback{margin-top:8px;color:var(--ts-success);font-size:11px;font-weight:800}
      .ts-launcher{position:fixed;z-index:9980;right:22px;bottom:22px;display:flex;align-items:center;gap:10px;border:1px solid #ead3ca;border-radius:999px;background:#fffdfbf2;padding:8px 14px 8px 8px;color:var(--ts-primary-dark);font-size:12px;font-weight:800;box-shadow:0 14px 38px #4d2e242b;backdrop-filter:blur(12px);cursor:pointer}.ts-launcher .face{display:grid;width:38px;height:38px;place-items:center;border-radius:50%;background:#f6cad4}.ts-launcher svg{width:24px;height:24px}.ts-menu-empty{display:grid;place-items:center;min-height:250px;padding:34px;text-align:center;background:linear-gradient(145deg,#fffaf8,#fff4f7)}.ts-menu-empty .symbol{display:grid;width:62px;height:62px;place-items:center;border-radius:50%;background:white;color:var(--ts-rose);box-shadow:0 8px 24px #9155681a}.ts-menu-empty svg{width:28px;height:28px}.ts-menu-empty h3{margin:16px 0 5px;font-size:15px}.ts-menu-empty p{margin:0 0 18px;color:var(--ts-muted);font-size:12px}.ts-menu-modal-form{display:grid!important;margin:0!important;background:transparent!important;padding:0!important}
      .ts-manual-customer-mode{display:grid;gap:9px}.ts-manual-customer-mode-title{color:var(--ts-ink);font-size:12px;font-weight:800}.ts-manual-customer-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.ts-manual-customer-option{display:flex;min-height:48px;align-items:center;gap:9px;border:1px solid var(--ts-line);border-radius:13px;background:#fff;padding:10px 12px;color:#59463f;font-size:11px;font-weight:800;cursor:pointer}.ts-manual-customer-option:has(input:checked){border-color:#bd796a;background:#fff6f3;box-shadow:inset 0 0 0 1px #bd796a}.ts-manual-customer-option input{width:18px;height:18px;flex:0 0 18px;accent-color:var(--ts-primary)}.ts-manual-customer-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;border:1px solid #ead8cf;border-radius:15px;background:#fbf7f4;padding:13px}.ts-manual-customer-fields[hidden]{display:none}.ts-manual-customer-fields label{color:var(--ts-ink);font-size:11px;font-weight:800}.ts-manual-customer-fields input{width:100%;height:44px;margin-top:6px;border:1px solid var(--ts-line);border-radius:12px;background:#fff;padding:0 12px;color:var(--ts-ink);font-size:13px;outline:none}.ts-manual-customer-fields input:focus{border-color:#bd796a;box-shadow:0 0 0 4px #c77d6b1f}.ts-manual-customer-fields p{grid-column:1/-1;margin:0;color:var(--ts-muted);font-size:10px;line-height:1.65}.ts-manual-submit-error{margin:0;border:1px solid #efc2bd;border-radius:12px;background:#fff3f1;padding:10px 12px;color:#a33e39;font-size:11px;font-weight:800}.ts-manual-submit-error[hidden]{display:none}
      @keyframes ts-fade{from{opacity:0}to{opacity:1}}@keyframes ts-rise{from{opacity:0;transform:translateY(10px) scale(.985)}to{opacity:1;transform:none}}
      @media(max-width:640px){.ts-overlay{align-items:end;padding:0}.ts-dialog,.ts-dialog.small{width:100%;max-height:92dvh;border-radius:25px 25px 0 0}.ts-dialog-head{grid-template-columns:58px 1fr auto;padding:18px 16px 14px}.ts-mascot{width:56px;height:56px;border-radius:18px}.ts-mascot svg{width:43px;height:43px}.ts-dialog-head h2{font-size:20px}.ts-dialog-body{padding:17px 16px calc(22px + env(safe-area-inset-bottom))}.ts-progress{gap:5px}.ts-progress-item{padding:9px 4px;font-size:9px}.ts-launcher{right:12px;bottom:76px}.ts-actions{display:grid}.ts-actions .ts-button{width:100%}.shift-top{grid-template-rows:48px 72px!important}.ts-manual-customer-options,.ts-manual-customer-fields{grid-template-columns:1fr}}
    `
    document.head.appendChild(style)
  }

  function mascot() {
    return `<div class="ts-mascot" aria-hidden="true"><svg viewBox="0 0 64 64"><path d="M17 30c0-15 8-23 19-23s18 9 18 22c0 8-2 13-5 17-4 5-10 9-17 9-9 0-15-5-17-13-1-4 0-8 2-12Z" fill="#fff7f3" stroke="#8e4c41" stroke-width="2"/><path d="M17 30C18 14 25 8 36 8c8 0 14 5 17 13-8 1-16-2-21-7-2 7-8 12-15 16Z" fill="#7c493f"/><circle cx="27" cy="33" r="2" fill="#4b302b"/><circle cx="43" cy="33" r="2" fill="#4b302b"/><path d="M29 42c4 3 8 3 12 0" fill="none" stroke="#b55e6e" stroke-width="2" stroke-linecap="round"/><path d="M12 26c-3 3-3 10 2 12M54 27c4 3 3 9-1 12" fill="none" stroke="#8e4c41" stroke-width="2" stroke-linecap="round"/><path d="m9 51 13-7M7 44l16 9" fill="none" stroke="#92625a" stroke-width="2"/><circle cx="8" cy="43" r="4" fill="#fff" stroke="#92625a" stroke-width="2"/><circle cx="8" cy="52" r="4" fill="#fff" stroke="#92625a" stroke-width="2"/></svg>${icon('spark','spark')}</div>`
  }

  function closeOverlay(overlay) {
    overlay.remove()
    document.body.style.overflow = ''
  }

  function overlay({ title, description, body, small = false, onReady }) {
    const root = document.createElement('div')
    root.className = 'ts-overlay'
    root.innerHTML = `<section class="ts-dialog${small ? ' small' : ''}" role="dialog" aria-modal="true" aria-label="${title}"><header class="ts-dialog-head">${mascot()}<div><h2>${title}</h2><p>${description}</p></div><button class="ts-close" type="button" aria-label="閉じる">${icon('close')}</button></header><div class="ts-dialog-body">${body}</div></section>`
    root.querySelector('.ts-close').addEventListener('click', () => closeOverlay(root))
    root.addEventListener('click', event => { if (event.target === root) closeOverlay(root) })
    document.body.appendChild(root)
    document.body.style.overflow = 'hidden'
    onReady?.(root)
    return root
  }

  function showStaffDialog(afterSave) {
    overlay({
      title: 'スタッフを追加',
      description: 'シフト表に表示するスタッフ名と、同じ時間に受け付けられる予約数を登録します。',
      small: true,
      body: `<form id="ts-staff-form"><div class="ts-field"><label for="ts-staff-name">スタッフ名</label><input id="ts-staff-name" name="name" maxlength="80" autocomplete="name" placeholder="例：山田 花子" required></div><div class="ts-field"><label for="ts-staff-capacity">同時受付数</label><select id="ts-staff-capacity" name="capacity"><option value="1">1件</option><option value="2">2件</option><option value="3">3件</option><option value="4">4件</option></select><span class="ts-help">通常は1件です。同時間帯に複数のお客様を担当する場合のみ変更してください。</span></div><p class="ts-error" role="alert"></p><div class="ts-actions"><button class="ts-button" type="submit">${icon('plus')}シフト表へ追加</button></div></form>`,
      onReady(root) {
        const form = root.querySelector('form')
        form.addEventListener('submit', async event => {
          event.preventDefault()
          const button = form.querySelector('button[type=submit]')
          const error = form.querySelector('.ts-error')
          button.disabled = true; button.textContent = '追加しています…'; error.classList.remove('show')
          try {
            const response = await fetch('/api/lien-tenant-setup/staff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.name.value, capacity: Number(form.capacity.value) }) })
            const result = await response.json()
            if (!response.ok) throw new Error(result.error || 'スタッフを追加できませんでした。')
            closeOverlay(root)
            if (afterSave) afterSave(result)
            else location.reload()
          } catch (reason) {
            error.textContent = reason.message || String(reason); error.classList.add('show')
            button.disabled = false; button.innerHTML = `${icon('plus')}シフト表へ追加`
          }
        })
        root.querySelector('input').focus()
      },
    })
  }

  function addShiftStaffButton() {
    document.querySelectorAll('[data-ts-add-staff], .ts-shift-action').forEach(node => node.remove())
    return
    if (!isShiftRoute()) return
    if (document.querySelector('[data-ts-add-staff]')) return
    const button = document.createElement('button')
    button.type = 'button'; button.dataset.tsAddStaff = '1'; button.className = 'ts-button compact'; button.innerHTML = `${icon('plus')}スタッフを追加`
    button.addEventListener('click', () => showStaffDialog())
    const exact = Array.from(document.querySelectorAll('th,td,div,p,span')).find(element => element.children.length === 0 && element.textContent.trim() === 'スタッフ / 受付可能数')
    if (exact) {
      const holder = document.createElement('span'); holder.className = 'ts-shift-action inline'; holder.appendChild(button); exact.appendChild(holder)
    } else {
      const holder = document.createElement('div'); holder.className = 'ts-shift-action'; holder.appendChild(button)
      const main = document.querySelector('main') || document.querySelector('[class*="max-w-7xl"]') || document.body
      main.prepend(holder)
    }
  }

  function alignShiftTimeHeader() {
    if (!isShiftRoute()) return
    const header = document.querySelector('.shift-top')
    const timeline = header?.children?.[1]
    const reservationRow = header?.children?.[3]?.firstElementChild
    if (!timeline || !reservationRow) return
    const slots = Array.from(reservationRow.children)
    const labels = Array.from(timeline.children).filter(node => /^\d{1,2}:00$/.test(node.textContent.trim()))
    if (!slots.length || !labels.length) return
    const expectedHourLabels = Math.floor(slots.length / 2)
    while (labels.length > expectedHourLabels) labels.pop().remove()
    Array.from(timeline.children).filter(node => /^\d{1,2}:00$/.test(node.textContent.trim())).forEach((label, index) => {
      label.style.left = `${((index * 2 + 1) / slots.length) * 100}%`
      label.style.right = 'auto'
      label.style.top = '50%'
      label.style.transform = 'translate(-50%, -50%)'
    })
    timeline.dataset.tsHourLabelsCentered = '1'
  }

  function shiftTimeRange(node) {
    const source = `${node.getAttribute('aria-label') || ''} ${node.getAttribute('title') || ''}`
    const match = source.match(/(\d{1,2}):(\d{2})\s*[〜～~-]\s*(\d{1,2}):(\d{2})/)
    if (!match) return null
    const start = Number(match[1]) * 60 + Number(match[2])
    const end = Number(match[3]) * 60 + Number(match[4])
    if (![start, end].every(Number.isFinite) || end <= start) return null
    return { start, end }
  }

  function alignShiftAppointments() {
    if (!isShiftRoute()) return
    const canvas = document.querySelector('.shift-canvas')
    if (!canvas) return
    const openMinutes = Number(canvas.dataset.tsBusinessOpen || state.businessSchedule?.openMinutes || 600)
    const closeMinutes = Number(canvas.dataset.tsBusinessClose || state.businessSchedule?.closeMinutes || 1140)
    const duration = closeMinutes - openMinutes
    if (!Number.isFinite(duration) || duration <= 0) return
    canvas.querySelectorAll('.shift-lane > button[aria-label]').forEach(node => {
      const range = shiftTimeRange(node)
      if (!range) return
      const visibleStart = Math.max(openMinutes, range.start)
      const visibleEnd = Math.min(closeMinutes, range.end)
      if (visibleEnd <= visibleStart) return
      const leftPercent = ((visibleStart - openMinutes) / duration) * 100
      const widthPercent = ((visibleEnd - visibleStart) / duration) * 100
      node.style.setProperty('left', `${leftPercent.toFixed(6)}%`)
      node.style.setProperty('width', `calc(${widthPercent.toFixed(6)}% - 2px)`)
      node.dataset.tsShiftPositionAligned = `${range.start}-${range.end}`
    })
    canvas.dataset.tsAppointmentGeometry = `${openMinutes}-${closeMinutes}`
  }

  function alignShiftLaneGrid() {
    if (!isShiftRoute()) return
    const canvas = document.querySelector('.shift-canvas')
    if (!canvas) return
    const slots = Number(canvas.style.getPropertyValue('--ts-shift-slots') || getComputedStyle(canvas).getPropertyValue('--ts-shift-slots'))
    if (!Number.isFinite(slots) || slots < 1) return
    canvas.querySelectorAll('.shift-lane').forEach(lane => {
      lane.dataset.tsShiftSlots = String(slots)
      lane.querySelectorAll(':scope > span.pointer-events-none.absolute.inset-y-0.border-l').forEach(line => {
        line.dataset.tsLegacyGridline = '1'
        line.setAttribute('aria-hidden', 'true')
      })
    })
    canvas.dataset.tsLaneGrid = `${slots}-slots`
  }

  function syncShiftLayout() {
    window.requestAnimationFrame(() => {
      alignShiftTimeHeader()
      alignShiftLaneGrid()
      alignShiftAppointments()
      normalizeShiftNowMarker()
    })
  }

  function observeShiftLayout() {
    const target = isShiftRoute() ? document.querySelector('.shift-top')?.children?.[1] : null
    if (!window.ResizeObserver) return
    if (!state.shiftLayoutObserver) {
      state.shiftLayoutObserver = new ResizeObserver(entries => {
        const width = entries[0]?.contentRect?.width || 0
        if (!width || Math.abs(width - state.shiftLayoutWidth) < 0.5) return
        state.shiftLayoutWidth = width
        syncShiftLayout()
      })
    }
    if (state.shiftLayoutTarget === target) return
    if (state.shiftLayoutTarget) state.shiftLayoutObserver.unobserve(state.shiftLayoutTarget)
    state.shiftLayoutTarget = target
    state.shiftLayoutWidth = target?.getBoundingClientRect().width || 0
    if (target) state.shiftLayoutObserver.observe(target)
  }

  function syncShiftLayoutDuringSidebarTransition() {
    ;[0, 60, 160, 280, 420].forEach(delay => window.setTimeout(syncShiftLayout, delay))
  }

  function normalizeShiftNowMarker() {
    if (!isShiftRoute()) {
      document.querySelectorAll('.ts-shift-now-global').forEach(node => node.remove())
      return
    }
    const canvas = document.querySelector('.shift-canvas')
    const markers = Array.from(document.querySelectorAll('.shift-lane .shift-now'))
    let line = canvas?.querySelector(':scope > .ts-shift-now-global')
    if (!canvas || !markers.length) {
      line?.remove()
      return
    }

    const firstLane = markers[0].closest('.shift-lane')
    const lastLane = markers[markers.length - 1].closest('.shift-lane')
    if (!firstLane || !lastLane) return
    const canvasRect = canvas.getBoundingClientRect()
    const firstRect = firstLane.getBoundingClientRect()
    const lastRect = lastLane.getBoundingClientRect()
    const openMinutes = Number(canvas.dataset.tsBusinessOpen || state.businessSchedule?.openMinutes || 600)
    const closeMinutes = Number(canvas.dataset.tsBusinessClose || state.businessSchedule?.closeMinutes || 1140)
    const duration = closeMinutes - openMinutes
    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60
    if (!canvasRect.width || !firstRect.width || !Number.isFinite(duration) || duration <= 0 || lastRect.bottom <= firstRect.top) return
    if (currentMinutes < openMinutes || currentMinutes > closeMinutes) {
      line?.remove()
      return
    }
    const currentLeft = firstRect.left - canvasRect.left + ((currentMinutes - openMinutes) / duration) * firstRect.width

    canvas.style.position = 'relative'
    markers.forEach(marker => {
      marker.style.opacity = '0'
      marker.setAttribute('aria-hidden', 'true')
    })
    if (!line) {
      line = document.createElement('span')
      line.className = 'ts-shift-now-global'
      line.setAttribute('aria-label', '現在時刻')
      line.innerHTML = '<span aria-hidden="true"></span>'
      canvas.appendChild(line)
    }
    Object.assign(line.style, {
      position: 'absolute',
      left: `${currentLeft}px`,
      top: `${firstRect.top - canvasRect.top}px`,
      width: '2px',
      height: `${lastRect.bottom - firstRect.top}px`,
      background: '#c24842',
      borderRadius: '999px',
      boxShadow: '0 0 0 1px rgba(255,255,255,.55)',
      pointerEvents: 'none',
      zIndex: '24',
    })
    Object.assign(line.firstElementChild.style, {
      position: 'absolute',
      left: '-5px',
      top: '-5px',
      width: '12px',
      height: '12px',
      borderRadius: '50%',
      background: '#c24842',
      border: '2px solid #fffdfb',
      boxShadow: '0 1px 4px rgba(125,45,40,.25)',
    })
    canvas.dataset.tsNowMarkerUnified = '1'
  }

  function applyBusinessSchedule() {
    if (!isShiftRoute()) return
    const canvas = document.querySelector('.shift-canvas')
    if (!canvas) return
    const openMinutes = Number(state.businessSchedule?.openMinutes ?? 600)
    const closeMinutes = Number(state.businessSchedule?.closeMinutes ?? 1140)
    const duration = Math.max(60, closeMinutes - openMinutes)
    canvas.style.setProperty('--ts-shift-hours', String(duration / 60))
    canvas.style.setProperty('--ts-shift-slots', String(duration / 30))
    canvas.dataset.tsBusinessOpen = String(openMinutes)
    canvas.dataset.tsBusinessClose = String(closeMinutes)
  }

  function polishSidebarControl() {
    document.querySelectorAll('button[aria-label*="サイドバー"]').forEach(button => {
      const currentLabel = button.getAttribute('aria-label') || ''
      const closesSidebar = currentLabel.includes('閉じる')
      const nextLabel = closesSidebar ? 'サイドバーを閉じる' : 'サイドバーを開く'
      button.classList.add('ts-sidebar-toggle')
      button.setAttribute('aria-label', nextLabel)
      button.title = nextLabel
      const expectedIcon = closesSidebar ? 'chevronLeft' : 'chevronRight'
      const chevrons = button.querySelectorAll(':scope > svg.ts-sidebar-chevron')
      if (button.dataset.tsSidebarIcon !== expectedIcon || chevrons.length !== 1 || button.children.length !== 1) {
        button.dataset.tsSidebarIcon = expectedIcon
        button.innerHTML = icon(expectedIcon, 'ts-sidebar-chevron')
      }
      const commercialStyle = {
        border: '1px solid #dfcec6',
        'border-radius': '13px',
        background: 'linear-gradient(145deg,#ffffff,#fff7f3)',
        color: '#865044',
        'box-shadow': '0 10px 26px rgba(77,42,33,.16),inset 0 1px 0 #fff',
      }
      Object.entries(commercialStyle).forEach(([property, value]) => button.style.setProperty(property, value, 'important'))
      if (button.dataset.tsSidebarPreferenceBound !== '1') {
        button.dataset.tsSidebarPreferenceBound = '1'
        button.addEventListener('click', () => {
          if (button.dataset.tsSidebarRestoring === '1') return
          const willCollapse = (button.getAttribute('aria-label') || '').includes('閉じる')
          try { window.localStorage.setItem('salon-admin-sidebar-collapsed', willCollapse ? '1' : '0') } catch {}
        }, { capture: true })
      }
      let shouldRestore = false
      try { shouldRestore = window.localStorage.getItem('salon-admin-sidebar-collapsed') === '1' } catch {}
      const restoredAt = Number(button.dataset.tsSidebarRestoredAt || 0)
      const restoreRecentlyRequested = Date.now() - restoredAt < 1600
      if (shouldRestore && closesSidebar && button.dataset.tsSidebarRestoring !== '1' && !restoreRecentlyRequested) {
        button.dataset.tsSidebarRestoring = '1'
        button.dataset.tsSidebarRestoredAt = String(Date.now())
        window.requestAnimationFrame(() => {
          if ((button.getAttribute('aria-label') || '').includes('閉じる')) button.click()
          window.setTimeout(() => { delete button.dataset.tsSidebarRestoring }, 1200)
        })
      }
    })
  }

  function enhanceMenuPage() {
    // The React page owns this form and already renders the product-style
    // modal. Moving the live form into a second overlay breaks its controls.
    return
  }

  function timeValue(minutes) {
    const value = Math.max(0, Math.min(1439, Number(minutes) || 0))
    return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
  }

  function todayInJapan() {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
  }

  function manualReservationDate() {
    const value = new URLSearchParams(location.search).get('date') || todayInJapan()
    return /^20\d{2}-\d{2}-\d{2}$/.test(value) ? value : todayInJapan()
  }

  function manualReservationMode(form) {
    if (form.querySelector('[data-ts-customer-code]')?.checked) return 'code'
    if (form.querySelector('[data-ts-customer-new]')?.checked) return 'new'
    return 'existing'
  }

  function updateManualCustomerFields(form) {
    const mode = manualReservationMode(form)
    const existingLabel = form.querySelector('[data-ts-existing-customer]')
    const customerSelect = form.querySelector('select[name="customerId"]')
    const newFields = form.querySelector('[data-ts-new-customer-fields]')
    const codeFields = form.querySelector('[data-ts-code-customer-fields]')
    if (existingLabel) existingLabel.hidden = mode !== 'existing'
    if (customerSelect) {
      customerSelect.disabled = mode !== 'existing'
      customerSelect.required = mode === 'existing'
    }
    if (newFields) newFields.hidden = mode !== 'new'
    if (codeFields) codeFields.hidden = mode !== 'code'
    const nameInput = form.querySelector('input[name="newCustomerName"]')
    const codeInput = form.querySelector('input[name="customerPublicCode"]')
    if (nameInput) nameInput.required = mode === 'new'
    if (codeInput) codeInput.required = mode === 'code'
  }

  function showManualReservationToast(message) {
    const toast = document.createElement('div')
    toast.setAttribute('role', 'status')
    toast.textContent = message
    Object.assign(toast.style, {
      position: 'fixed', zIndex: '100100', top: '82px', right: '18px',
      maxWidth: 'calc(100vw - 36px)', border: '1px solid #b8d9c5', borderRadius: '16px',
      background: '#f1faf4', padding: '13px 16px', color: '#356349', fontSize: '12px',
      fontWeight: '800', boxShadow: '0 18px 55px rgba(52,34,29,.16)',
    })
    document.body.appendChild(toast)
    window.setTimeout(() => toast.remove(), 1800)
  }

  function enhanceManualReservationDialog() {
    if (currentPage() !== 'appointments') return
    const customerSelect = document.querySelector('[role="dialog"] select[name="customerId"]')
    const form = customerSelect?.closest('form')
    if (!form || form.dataset.tsManualEnhanced === '1') return
    const startInput = form.querySelector('input[name="startTime"]')
    if (!customerSelect || !startInput) return
    form.dataset.tsManualEnhanced = '1'

    const existingLabel = customerSelect.closest('label')
    existingLabel.dataset.tsExistingCustomer = '1'
    const modeFields = document.createElement('div')
    modeFields.className = 'ts-manual-customer-mode'
    modeFields.innerHTML = `
      <span class="ts-manual-customer-mode-title">お客様の登録方法</span>
      <div class="ts-manual-customer-options">
        <label class="ts-manual-customer-option"><input type="checkbox" data-ts-customer-new>初めてのお客様</label>
        <label class="ts-manual-customer-option"><input type="checkbox" data-ts-customer-code>お客様コードで追加</label>
      </div>
      <div class="ts-manual-customer-fields" data-ts-new-customer-fields hidden>
        <label>お名前<input name="newCustomerName" maxlength="80" autocomplete="name" placeholder="例：山田 花子"></label>
        <label>電話番号（任意）<input name="newCustomerPhone" maxlength="32" inputmode="tel" autocomplete="tel" placeholder="例：09012345678"></label>
        <p>初回来店のお客様として顧客台帳へ追加し、この予約と紐づけます。</p>
      </div>
      <div class="ts-manual-customer-fields" data-ts-code-customer-fields hidden>
        <label style="grid-column:1/-1">お客様コード<input name="customerPublicCode" maxlength="24" autocomplete="off" autocapitalize="characters" placeholder="例：C-R-036" pattern="C-R-[0-9]{3,}"></label>
        <p>お客様アプリのプロフィールに表示される変更不可のコードです。確認できた顧客情報をこの店舗へ追加します。</p>
      </div>`
    existingLabel.insertAdjacentElement('beforebegin', modeFields)

    const newCheck = modeFields.querySelector('[data-ts-customer-new]')
    const codeCheck = modeFields.querySelector('[data-ts-customer-code]')
    newCheck.addEventListener('change', () => {
      if (newCheck.checked) codeCheck.checked = false
      updateManualCustomerFields(form)
      if (newCheck.checked) form.querySelector('input[name="newCustomerName"]')?.focus()
    })
    codeCheck.addEventListener('change', () => {
      if (codeCheck.checked) newCheck.checked = false
      updateManualCustomerFields(form)
      if (codeCheck.checked) form.querySelector('input[name="customerPublicCode"]')?.focus()
    })

    const openMinutes = Number(state.businessSchedule?.openMinutes ?? 600)
    const closeMinutes = Number(state.businessSchedule?.closeMinutes ?? 1140)
    startInput.min = timeValue(openMinutes)
    startInput.max = timeValue(Math.max(openMinutes, closeMinutes - 15))
    const currentMinutes = Number(startInput.value.slice(0, 2)) * 60 + Number(startInput.value.slice(3, 5))
    if (!Number.isFinite(currentMinutes) || currentMinutes < openMinutes || currentMinutes >= closeMinutes) startInput.value = timeValue(openMinutes)

    const error = document.createElement('p')
    error.className = 'ts-manual-submit-error'
    error.hidden = true
    error.setAttribute('role', 'alert')
    form.querySelector('div.flex.flex-col-reverse')?.insertAdjacentElement('beforebegin', error)
    updateManualCustomerFields(form)

    form.addEventListener('submit', async event => {
      const mode = manualReservationMode(form)
      if (mode === 'existing') return
      event.preventDefault()
      event.stopImmediatePropagation()
      error.hidden = true
      if (!form.reportValidity()) return
      const submit = form.querySelector('button[type="submit"]')
      const original = submit?.innerHTML || ''
      if (submit) { submit.disabled = true; submit.textContent = '予約を登録しています…' }
      try {
        const [hour, minute] = String(startInput.value || '').split(':').map(Number)
        const body = {
          customerMode: mode,
          customerId: customerSelect.value,
          newCustomerName: form.querySelector('input[name="newCustomerName"]')?.value || '',
          newCustomerPhone: form.querySelector('input[name="newCustomerPhone"]')?.value || '',
          customerPublicCode: form.querySelector('input[name="customerPublicCode"]')?.value || '',
          date: manualReservationDate(),
          startMinutes: hour * 60 + minute,
          durationMinutes: Number(form.querySelector('input[name="durationMinutes"]')?.value),
          staffName: form.querySelector('select[name="staffName"]')?.value,
          bookingProvider: form.querySelector('select[name="bookingProvider"]')?.value,
          menu: form.querySelector('input[name="menu"]')?.value,
          estimatedPrice: form.querySelector('input[name="estimatedPrice"]')?.value,
          note: form.querySelector('input[name="note"]')?.value,
        }
        const response = await fetch('/api/admin/appointments/manual', {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(body),
        })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok || !payload.success) throw new Error(payload.error || '予約を登録できませんでした。')
        form.closest('[role="dialog"]')?.querySelector('button[aria-label="閉じる"]')?.click()
        showManualReservationToast(mode === 'code' ? 'お客様コードを確認し、予約を登録しました。' : '新しいお客様と予約を登録しました。')
        window.setTimeout(() => location.reload(), 500)
      } catch (reason) {
        error.textContent = reason.message || String(reason)
        error.hidden = false
        if (submit) { submit.disabled = false; submit.innerHTML = original }
      }
    }, true)
  }

  function setupStepMarkup(status) {
    const steps = [
      { key: 'staff', label: 'スタッフ', icon: 'user', done: status.staffCount > 0 },
      { key: 'menu', label: 'メニュー', icon: 'scissors', done: status.menuCount > 0 },
      { key: 'inbound', label: '予約メール', icon: 'mail', done: Boolean(status.inbound?.address) },
    ]
    const current = steps.find(step => !step.done)?.key || 'complete'
    const progress = steps.map(step => `<div class="ts-progress-item ${step.done ? 'done' : step.key === current ? 'current' : ''}">${icon(step.done ? 'check' : step.icon)}${step.label}</div>`).join('')
    let card = ''
    if (current === 'staff') card = `<div class="ts-guide-card"><h3>まず、スタッフを登録しましょう</h3><p>店舗ごとのスタッフ名をシフト表に登録します。Salon de Lienの固定名は新しい店舗へ引き継がれません。</p><button type="button" class="ts-button" data-action="staff">${icon('plus')}スタッフを追加</button></div>`
    else if (current === 'menu') card = `<div class="ts-guide-card"><h3>次に、施術メニューを登録します</h3><p>メニュー名・カテゴリ・所要時間・税込価格を登録します。登録内容は予約と会計に使われます。</p><a class="ts-button" href="/admin/products?section=menus&setup=1">${icon('scissors')}メニュー登録画面へ</a></div>`
    else if (current === 'inbound') card = `<div class="ts-guide-card"><h3>店舗専用の予約メールを準備します</h3><p>ホットペッパー・かんざしから届く予約を、店舗ごとに安全に振り分ける専用アドレスです。</p><button type="button" class="ts-button" data-action="issue-inbound">${icon('mail')}専用アドレスを発行</button></div>`
    else card = `<div class="ts-complete"><span class="mark">${icon('check')}</span><h3>初期設定が完了しました</h3><p>スタッフ・メニュー・予約メールの準備ができています。</p></div>${inboundMarkup(status)}`
    return `<div class="ts-progress">${progress}</div>${card}`
  }

  function inboundMarkup(status) {
    const address = status.inbound?.address || ''
    if (!address) return ''
    const received = status.inbound.lastReceivedAt
      ? `最終受信：${new Date(status.inbound.lastReceivedAt).toLocaleString('ja-JP')}`
      : '受信待機中（設定後のテストメールで確認できます）'
    return `<div class="ts-inbound"><div class="ts-inbound-label">店舗専用・予約メール受信アドレス</div><div class="ts-inbound-address"><code>${address}</code><button type="button" class="ts-button secondary compact" data-copy-inbound="${address}">${icon('copy')}コピー</button></div><ol><li>ホットペッパーと、かんざしの通知先へこのアドレスを追加します。</li><li>通知先を変更できない場合は、Gmailで予約メールだけをこのアドレスへ自動転送します。</li><li>受信後は予約番号とMessage-IDを確認し、重複せず予約カレンダーへ登録します。</li></ol><div class="ts-inbound-status">${received}</div><div class="ts-copy-feedback" hidden>コピーしました</div></div>`
  }

  async function issueInboundAddress() {
    const response = await fetch('/api/lien-tenant-setup/inbound/address', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: '{}' })
    const result = await response.json().catch(() => ({}))
    if (!response.ok || !result.inbound?.address) throw new Error(result.error || '専用受信アドレスを発行できませんでした。')
    state.setup.inbound = result.inbound
    return result.inbound
  }

  function bindInboundActions(root) {
    root.querySelector('[data-action="issue-inbound"]')?.addEventListener('click', async event => {
      const button = event.currentTarget
      button.disabled = true
      button.textContent = '発行しています…'
      try { await issueInboundAddress(); closeOverlay(root); showSetupWizard(state.setup) }
      catch (error) { button.disabled = false; button.textContent = error.message || 'もう一度試す' }
    })
    root.querySelectorAll('[data-copy-inbound]').forEach(button => button.addEventListener('click', async () => {
      const value = button.dataset.copyInbound
      try { await navigator.clipboard.writeText(value) }
      catch {
        const input = document.createElement('textarea')
        input.value = value
        document.body.appendChild(input)
        input.select()
        document.execCommand('copy')
        input.remove()
      }
      const feedback = root.querySelector('.ts-copy-feedback')
      if (feedback) { feedback.hidden = false; window.setTimeout(() => { feedback.hidden = true }, 2200) }
    }))
  }

  function showSetupWizard(status) {
    const complete = status.staffCount > 0 && status.menuCount > 0 && Boolean(status.inbound?.address)
    const root = overlay({
      title: complete ? 'セットアップ完了' : '店舗の初期設定',
      description: complete ? 'いつでもこの案内から設定状況を確認できます。' : '私と一緒に、予約受付を始めるための3つの準備を進めましょう。',
      body: setupStepMarkup(status),
      onReady(dialog) {
        dialog.querySelector('[data-action="staff"]')?.addEventListener('click', () => {
          closeOverlay(dialog)
          showStaffDialog(() => location.reload())
        })
        bindInboundActions(dialog)
      },
    })
    if (!complete) localStorage.setItem(`lien-setup-seen:${status.organizationId}`, String(Date.now()))
    return root
  }

  function addLauncher(status) {
    const complete = status.staffCount > 0 && status.menuCount > 0 && Boolean(status.inbound?.address)
    if (complete) { document.querySelectorAll('.ts-launcher').forEach(node => node.remove()); return }
    if (status.role !== 'ADMIN' || document.querySelector('.ts-launcher')) return
    const button = document.createElement('button')
    button.type = 'button'; button.className = 'ts-launcher'; button.innerHTML = `<span class="face">${icon(complete ? 'check' : 'spark')}</span>${complete ? '初期設定' : '初期設定を続ける'}`
    button.addEventListener('click', () => showSetupWizard(state.setup))
    document.body.appendChild(button)
  }

  function polishDemoExperience() {
    document.querySelectorAll('[data-ts-add-staff], .ts-shift-action').forEach(node => node.remove())

    if (/^\/admin\/(?:reports\/manufacturer-products|products)(?:\/|$)/.test(location.pathname)) {
      const manufacturer = document.querySelector('select[name="manufacturer"]')
      const allOption = manufacturer?.querySelector('option[value=""]')
      if (allOption && allOption.textContent !== 'すべてのメーカー') allOption.textContent = 'すべてのメーカー'
    }

    if (/^\/admin\/community\/[^/]+\/?$/.test(location.pathname)) {
      const root = document.querySelector('main .mx-auto.grid.w-full.max-w-3xl')
      if (root) root.classList.add('ts-community-detail')
      if (!document.getElementById('lien-community-detail-polish')) {
        const style = document.createElement('style')
        style.id = 'lien-community-detail-polish'
        style.textContent = `
          .ts-community-detail{max-width:1180px!important}
          .ts-community-detail>div.grid.gap-5{grid-template-columns:minmax(0,1fr)!important}
          @media(min-width:1440px){
            .ts-community-detail article{display:grid!important;grid-template-columns:minmax(0,1.16fr) minmax(360px,.84fr)!important;align-items:stretch!important;overflow:hidden!important}
            .ts-community-detail article>header{grid-column:1/-1!important}
            .ts-community-detail article>header+div{grid-column:1!important;grid-row:2!important;min-height:560px!important}
            .ts-community-detail article>header+div>a{display:block!important;height:100%!important;min-height:560px!important;aspect-ratio:auto!important}
            .ts-community-detail article>header+div>a img{height:100%!important;min-height:560px!important;object-fit:cover!important}
            .ts-community-detail article>header+div+div{grid-column:2!important;grid-row:2!important;align-self:stretch!important;border-left:1px solid var(--lien-border,#eaded7)!important}
          }
        `
        document.head.appendChild(style)
      }
    }
  }

  function enhanceCurrentRoute() {
    addStyles()
    polishDemoExperience()
    polishSidebarControl()
    if (currentPage() === 'appointments') {
      Array.from(document.querySelectorAll('p')).forEach(node => {
        if (node.textContent.includes('Gmailへ届いた新着予約メールを自動で予約台帳へ反映')) {
          node.textContent = '店舗専用の予約メール受信アドレスへ届いた新着予約を自動で予約台帳へ反映し、当日の来店予定と月間の予約状況を確認します。'
        }
      })
    }
    observeShiftLayout()
    applyBusinessSchedule()
    alignShiftTimeHeader()
    alignShiftLaneGrid()
    alignShiftAppointments()
    normalizeShiftNowMarker()
    enhanceManualReservationDialog()
    if (state.setup && !state.setup.legacy) {
      addShiftStaffButton()
      enhanceMenuPage()
    }
    if (state.setup) addLauncher(state.setup)
  }

  function scheduleRouteEnhancement() {
    if (!state.enhancementFrame) {
      state.enhancementFrame = window.requestAnimationFrame(() => {
        state.enhancementFrame = 0
        enhanceCurrentRoute()
      })
    }
    state.routeTimers.forEach(timer => window.clearTimeout(timer))
    state.routeTimers = [80, 300].map(delay => window.setTimeout(enhanceCurrentRoute, delay))
  }

  async function loadStatus() {
    try {
      const response = await fetch('/api/lien-tenant-setup/status', { headers: { Accept: 'application/json' } })
      if (!response.ok) return
      state.setup = await response.json()
      state.businessSchedule = state.setup.businessSchedule || state.businessSchedule
      if (state.setup.businessSchedule) {
        const announceSchedule = () => {
          if (typeof window.__lienSetBusinessSchedule === 'function') {
            window.__lienSetBusinessSchedule(state.setup.businessSchedule)
          }
          window.dispatchEvent(new CustomEvent('lien:business-schedule-updated', {
            detail: state.setup.businessSchedule,
          }))
        }
        announceSchedule()
        window.setTimeout(announceSchedule, 250)
        window.setTimeout(announceSchedule, 1000)
      }
      if (!state.setup.inbound?.address && state.setup.role === 'ADMIN') {
        try { await issueInboundAddress() }
        catch (error) { console.warn('Inbound reservation address could not be issued', error) }
      }
      scheduleRouteEnhancement()
      const query = new URLSearchParams(location.search)
      const incomplete = state.setup.staffCount === 0 || state.setup.menuCount === 0 || !state.setup.inbound?.address
      const lastSeen = Number(localStorage.getItem(`lien-setup-seen:${state.setup.organizationId}`) || 0)
      const shouldOpen = !state.setup.legacy && (query.has('setup') || (incomplete && Date.now() - lastSeen > 12 * 60 * 60 * 1000))
      if (shouldOpen && !document.querySelector('.ts-overlay')) showSetupWizard(state.setup)
    } catch (error) { console.warn('Tenant setup status could not be loaded', error) }
  }

  function bootAfterHydration() {
    if (state.booted) return
    state.booted = true
    addStyles()
    scheduleRouteEnhancement()
    const routeObserver = new MutationObserver(scheduleRouteEnhancement)
    routeObserver.observe(document.body, { childList: true, subtree: true })
    window.addEventListener('popstate', scheduleRouteEnhancement)
    window.addEventListener('pageshow', scheduleRouteEnhancement)
    window.addEventListener('lien:business-schedule-updated', event => {
      if (event.detail && Number.isFinite(Number(event.detail.openMinutes)) && Number.isFinite(Number(event.detail.closeMinutes))) {
        state.businessSchedule = event.detail
        if (state.setup) state.setup.businessSchedule = event.detail
        scheduleRouteEnhancement()
      }
    })
    document.addEventListener('click', event => {
      const sidebarControl = event.target.closest?.('button[aria-label*="サイドバー"]')
      if (sidebarControl) syncShiftLayoutDuringSidebarTransition()
      const anchor = event.target.closest?.('a[href]')
      if (!anchor) return
      try {
        const target = new URL(anchor.href, location.href)
        if (target.origin === location.origin && target.pathname.startsWith('/admin/')) scheduleRouteEnhancement()
      } catch {}
    }, true)
    document.addEventListener('pointerup', event => {
      if (event.target.closest?.('.shift-lane > button[aria-label]')) syncShiftLayoutDuringSidebarTransition()
    }, true)
    document.addEventListener('keyup', event => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return
      if (document.activeElement?.closest?.('.shift-lane > button[aria-label]')) syncShiftLayoutDuringSidebarTransition()
    }, true)
    if (!window.__lienShiftNowMarkerTimer) {
      window.addEventListener('resize', scheduleRouteEnhancement, { passive: true })
      window.__lienShiftNowMarkerTimer = window.setInterval(scheduleRouteEnhancement, 30000)
    }
    loadStatus()
  }

  const startAfterHydration = () => window.requestAnimationFrame(bootAfterHydration)
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', startAfterHydration, { once: true })
  else startAfterHydration()
})()
