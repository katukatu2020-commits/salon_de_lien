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
      @keyframes ts-fade{from{opacity:0}to{opacity:1}}@keyframes ts-rise{from{opacity:0;transform:translateY(10px) scale(.985)}to{opacity:1;transform:none}}
      @media(max-width:640px){.ts-overlay{align-items:end;padding:0}.ts-dialog,.ts-dialog.small{width:100%;max-height:92dvh;border-radius:25px 25px 0 0}.ts-dialog-head{grid-template-columns:58px 1fr auto;padding:18px 16px 14px}.ts-mascot{width:56px;height:56px;border-radius:18px}.ts-mascot svg{width:43px;height:43px}.ts-dialog-head h2{font-size:20px}.ts-dialog-body{padding:17px 16px calc(22px + env(safe-area-inset-bottom))}.ts-progress{gap:5px}.ts-progress-item{padding:9px 4px;font-size:9px}.ts-launcher{right:12px;bottom:76px}.ts-actions{display:grid}.ts-actions .ts-button{width:100%}.shift-top{grid-template-rows:48px 72px!important}}
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
    if (currentPage() !== 'menus') return
    const form = document.querySelector('input[name="menuName"]')?.closest('form')
    if (!form || form.dataset.tsMenusEnhanced === '1') return
    form.dataset.tsMenusEnhanced = '1'
    form.style.display = 'none'
    const heading = Array.from(document.querySelectorAll('h1')).find(node => node.textContent.includes('現在の施術メニュー'))
    const openMenu = () => overlay({
      title: '新しいメニューを追加',
      description: 'お客様の予約画面と会計に使う、施術時間・価格を登録します。あとから追加できます。',
      body: '<div id="ts-menu-form-slot"></div>',
      onReady(root) {
        const slot = root.querySelector('#ts-menu-form-slot')
        form.classList.add('ts-menu-modal-form')
        form.style.display = 'grid'
        slot.appendChild(form)
        form.querySelector('input')?.focus()
      },
    })
    const topButton = document.createElement('button')
    topButton.type = 'button'; topButton.className = 'ts-button'; topButton.innerHTML = `${icon('plus')}新しいメニューを追加`; topButton.addEventListener('click', openMenu)
    if (heading) {
      const header = heading.closest('section')
      if (header) {
        header.style.position = 'relative'
        const actions = document.createElement('div'); actions.className = 'ts-shift-action'; actions.appendChild(topButton); heading.insertAdjacentElement('beforebegin', actions)
      }
    }
    const countLabel = Array.from(document.querySelectorAll('span')).find(node => /^0件$/.test(node.textContent.trim()))
    if (countLabel) {
      const section = countLabel.closest('section')
      const list = section?.querySelector('.grid.divide-y') || section?.lastElementChild
      if (list) {
        list.className = 'ts-menu-empty'
        list.innerHTML = `<div><span class="symbol">${icon('scissors')}</span><h3>メニューがまだ登録されていません</h3><p>最初の施術メニューを追加すると、予約画面から選べるようになります。</p><button type="button" class="ts-button">${icon('plus')}メニューを追加</button></div>`
        list.querySelector('button').addEventListener('click', openMenu)
      }
    }
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
    if (status.role !== 'ADMIN' || document.querySelector('.ts-launcher')) return
    const complete = status.staffCount > 0 && status.menuCount > 0 && Boolean(status.inbound?.address)
    const button = document.createElement('button')
    button.type = 'button'; button.className = 'ts-launcher'; button.innerHTML = `<span class="face">${icon(complete ? 'check' : 'spark')}</span>${complete ? '初期設定' : '初期設定を続ける'}`
    button.addEventListener('click', () => showSetupWizard(state.setup))
    document.body.appendChild(button)
  }

  function enhanceCurrentRoute() {
    addStyles()
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
