import fs from 'node:fs'

const replaceExact = (source, search, replacement, label, expected = 1) => {
  const count = source.split(search).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  return source.replaceAll(search, replacement)
}

const replaceRegex = (source, expression, replacement, label) => {
  const matches = source.match(new RegExp(expression.source, expression.flags.includes('g') ? expression.flags : expression.flags + 'g')) || []
  if (matches.length !== 1) throw new Error(`${label}: expected 1 match, found ${matches.length}`)
  return source.replace(expression, replacement)
}

const replaceSection = (source, start, end, replacement, label) => {
  const startIndex = source.indexOf(start)
  if (startIndex < 0 || source.indexOf(start, startIndex + 1) >= 0) throw new Error(`${label}: start marker is not unique`)
  const endIndex = source.indexOf(end, startIndex + start.length)
  if (endIndex < 0) throw new Error(`${label}: end marker was not found`)
  return source.slice(0, startIndex) + replacement + source.slice(endIndex)
}

const shiftFile = '/app/.next/static/chunks/app/admin/appointments/page-shift-layout-20260812-02.capacity-persist-v44.business-schedule-v294.js'
let shift = fs.readFileSync(shiftFile, 'utf8')

// A transient buttons=0 or a lost pointer capture is a cancellation, never a
// successful drop.  Only the explicit pointerup handler may commit a move.
shift = replaceExact(
  shift,
  `          if ("touch" !== n.pointerType && (1 & e.buttons) == 0) {
            J(e);
            return;
          }`,
  `          if ("touch" !== n.pointerType && (1 & e.buttons) == 0) {
            J(e, !0);
            return;
          }`,
  'cancel when the primary pointer button is no longer pressed',
)
shift = replaceExact(
  shift,
  `onLostPointerCapture: (e) => J(e),`,
  `onLostPointerCapture: (e) => J(e, !0),`,
  'lost pointer capture cancellation',
  2,
)

// Keep the appointment data immutable while the pointer moves.  This avoids a
// React rerender on every 15-minute/staff preview change, which previously
// dropped pointer capture and made the drag jump.
shift = replaceExact(
  shift,
  `          _.current = Date.now();
          let a = A.current.find((e) => e.id === r.appointmentId);
          a && Y(a);`,
  `          _.current = Date.now();
          let a = A.current.find((e) => e.id === r.appointmentId);
          if (a) {
            let i = r.previewAppointment || a;
            X(i.id, i);
            Y(i);
          }`,
  'commit only the final preview on pointerup',
)

shift = replaceSection(
  shift,
  `                originDurationMinutes: t.durationMinutes,`,
  `          }
        }
        function B(e) {`,
  `                originDurationMinutes: t.durationMinutes,
                originStaffName: t.staffName,
                previewAppointment: null,
                moved: !1,
              }));
`,
  'defer drag UI until movement threshold is crossed',
)

shift = replaceExact(
  shift,
  `          if ("touch" !== n.pointerType || n.moved) {
            if (!n.moved && 3 >= Math.abs(r)) return;
          } else {`,
  `          if ("touch" !== n.pointerType || n.moved) {
            if (!n.moved && Math.hypot(r, a) <= 5) return;
          } else {`,
  'two-dimensional drag threshold',
)

shift = replaceExact(
  shift,
  `          (n.moved || (n.moved = !0), e.preventDefault());
          let i = (function (e) {`,
  `          e.preventDefault();
          let i = (function (e) {`,
  'drag threshold state is activated after the appointment is resolved',
)

shift = replaceExact(
  shift,
  `          if (!l) return;
          if ("resize" === n.mode) {`,
  `          if (!l) return;
          if (!n.moved) {
            n.moved = !0;
            window.dispatchEvent(new CustomEvent("lien:shift-drag-start", { detail: { appointmentId: l.id, mode: n.mode, customerName: l.customerName || l.customerRealName || "予約", staffName: l.staffName, startMinutes: g(l.scheduledAt), durationMinutes: l.durationMinutes, clientX: e.clientX, clientY: e.clientY, sourceElement: e.currentTarget } }));
          }
          window.dispatchEvent(new CustomEvent("lien:shift-drag-pointer", { detail: { appointmentId: l.id, clientX: e.clientX, clientY: e.clientY } }));
          if ("resize" === n.mode) {`,
  'start the commercial drag UI after the threshold',
)

shift = replaceSection(
  shift,
  `          let o = v(n.originStartMinutes + i, __businessOpen, __businessClose - l.durationMinutes),`,
  `        }
        function G(e) {`,
  `          let o = v(n.originStartMinutes + i, __businessOpen, __businessClose - l.durationMinutes),
            s = Array.from(document.querySelectorAll(".shift-lane[data-staff-name]"))
              .map((t) => ({ element: t, rect: t.getBoundingClientRect() }))
              .filter((e) => e.rect.width > 0 && e.rect.height > 0)
              .sort((t, n) => Math.abs((t.rect.top + t.rect.bottom) / 2 - e.clientY) - Math.abs((n.rect.top + n.rect.bottom) / 2 - e.clientY))[0],
            c = (null == s ? void 0 : s.element.dataset.staffName) || n.originStaffName,
            d = {
              ...l,
              scheduledAt: ""
                .concat(t, "T")
                .concat(String(Math.floor(o / 60)).padStart(2, "0"), ":")
                .concat(String(o % 60).padStart(2, "0"), ":00+09:00"),
              staffName: c,
            };
          n.previewAppointment = d;
          window.dispatchEvent(new CustomEvent("lien:shift-drag-move", { detail: { appointmentId: l.id, customerName: l.customerName || l.customerRealName || "予約", staffName: c, startMinutes: o, durationMinutes: l.durationMinutes, clientX: e.clientX, clientY: e.clientY } }));
`,
  'preview all staff rows without rerendering the reservation list',
)

fs.writeFileSync(shiftFile, shift)

const commercialFile = '/app/commercial-admin-v101.js'
let commercial = fs.readFileSync(commercialFile, 'utf8')

// Disable the previous visual-only drag enhancer.  Its listeners cannot be
// removed after registration, so it must return before registering them.
commercial = replaceExact(
  commercial,
  `  if (window.__lienShiftDragUxV319) return
  window.__lienShiftDragUxV319 = true`,
  `  if (true) return
  window.__lienShiftDragUxV319 = true`,
  'disable legacy v319 drag enhancer',
)

commercial += String.raw`

;(() => {
  if (window.__lienShiftDragUxV325) return
  window.__lienShiftDragUxV325 = true

  const style = document.createElement('style')
  style.dataset.lienShiftDragV325 = '1'
  style.textContent = [
    '.lien-shift-drag-active .ts-shift-hover-slot{display:none!important}',
    '.ca-shift-drag-source{opacity:0!important;visibility:hidden!important}',
    '.shift-lane.ca-shift-drop-target{background:linear-gradient(90deg,rgba(255,245,241,.95),rgba(255,252,250,.76))!important;box-shadow:inset 0 0 0 2px rgba(181,91,87,.26)}',
    '.ca-shift-drop-guide{position:absolute;inset-block:0;z-index:29;width:2px;background:#c8485d;box-shadow:0 0 0 1px rgba(255,255,255,.94);pointer-events:none;transform:translateX(-1px)}',
    '.ca-shift-drop-guide::before{content:"";position:absolute;left:50%;top:5px;width:9px;height:9px;border:2px solid #fff;border-radius:50%;background:#c8485d;box-shadow:0 2px 7px rgba(91,45,35,.24);transform:translateX(-50%)}',
    '.ca-shift-drop-guide::after{content:attr(data-time);position:absolute;left:8px;top:4px;border:1px solid rgba(200,72,93,.28);border-radius:999px;background:#fff;padding:3px 7px;color:#9e3446;box-shadow:0 4px 13px rgba(76,35,29,.12);font:800 10px/1 -apple-system,BlinkMacSystemFont,"Segoe UI","Yu Gothic",sans-serif;white-space:nowrap}',
    '.ca-shift-drag-ghost{position:fixed;z-index:2147483000;left:0;top:0;display:grid;min-width:162px;max-width:250px;gap:2px;border:1px solid rgba(152,86,69,.28);border-radius:12px;background:rgba(255,253,250,.97);padding:9px 12px;color:#352621;box-shadow:0 16px 36px rgba(72,38,29,.24);font:700 12px/1.35 -apple-system,BlinkMacSystemFont,"Segoe UI","Yu Gothic",sans-serif;pointer-events:none;will-change:transform;backdrop-filter:blur(9px)}',
    '.ca-shift-drag-ghost strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}',
    '.ca-shift-drag-ghost span{color:#79534b;font-size:10px;font-weight:700}',
    '.ca-shift-drag-ghost em{color:#c8485d;font-size:10px;font-style:normal;font-weight:800}'
  ].join('')
  document.head.appendChild(style)

  let ghost = null
  let source = null
  let targetLane = null
  let guide = null
  let drag = null
  let pendingPoint = null
  let frame = 0

  const formatTime = minutes => String(Math.floor(Number(minutes) / 60)).padStart(2, '0') + ':' + String(Number(minutes) % 60).padStart(2, '0')
  const clearTarget = () => {
    targetLane?.classList.remove('ca-shift-drop-target')
    guide?.remove()
    targetLane = null
    guide = null
  }
  const clearDrag = () => {
    document.documentElement.classList.remove('lien-shift-drag-active')
    document.querySelectorAll('.ts-shift-hover-slot').forEach(node => node.remove())
    source?.classList.remove('ca-shift-drag-source')
    source = null
    clearTarget()
    ghost?.remove()
    ghost = null
    drag = null
    pendingPoint = null
    if (frame) cancelAnimationFrame(frame)
    frame = 0
  }
  const renderPointer = () => {
    frame = 0
    if (!ghost || !pendingPoint) return
    let x = pendingPoint.x + 18
    let y = pendingPoint.y + 18
    const rect = ghost.getBoundingClientRect()
    if (x + rect.width > innerWidth - 10) x = pendingPoint.x - rect.width - 18
    if (y + rect.height > innerHeight - 10) y = pendingPoint.y - rect.height - 18
    ghost.style.transform = 'translate3d(' + Math.max(8, x) + 'px,' + Math.max(8, y) + 'px,0)'
  }
  const queuePointer = detail => {
    if (!ghost) return
    pendingPoint = { x: Number(detail.clientX), y: Number(detail.clientY) }
    if (!frame) frame = requestAnimationFrame(renderPointer)
  }
  const setTarget = detail => {
    const lanes = Array.from(document.querySelectorAll('.shift-lane[data-staff-name]'))
    const lane = lanes.find(node => node.dataset.staffName === detail.staffName) || null
    if (lane !== targetLane) {
      clearTarget()
      targetLane = lane
      targetLane?.classList.add('ca-shift-drop-target')
    }
    if (!targetLane) return
    if (!guide) {
      guide = document.createElement('span')
      guide.className = 'ca-shift-drop-guide'
      guide.setAttribute('aria-hidden', 'true')
      targetLane.appendChild(guide)
    }
    const canvas = targetLane.closest('.shift-canvas')
    const open = Number(canvas?.dataset.tsBusinessOpen || 600)
    const close = Number(canvas?.dataset.tsBusinessClose || 1140)
    guide.style.left = Math.max(0, Math.min(100, (Number(detail.startMinutes) - open) / Math.max(1, close - open) * 100)) + '%'
    guide.dataset.time = formatTime(detail.startMinutes)
  }

  window.addEventListener('lien:shift-drag-start', event => {
    clearDrag()
    const detail = event.detail || {}
    if (detail.mode !== 'move') return
    drag = detail
    source = detail.sourceElement instanceof HTMLElement ? detail.sourceElement : null
    source?.classList.add('ca-shift-drag-source')
    document.documentElement.classList.add('lien-shift-drag-active')
    document.querySelectorAll('.ts-shift-hover-slot').forEach(node => node.remove())
    ghost = document.createElement('div')
    ghost.className = 'ca-shift-drag-ghost'
    ghost.setAttribute('role', 'status')
    ghost.innerHTML = '<strong></strong><span></span><em></em>'
    ghost.querySelector('strong').textContent = detail.customerName || '予約'
    ghost.querySelector('span').textContent = (detail.staffName || '担当者') + 'へ移動'
    ghost.querySelector('em').textContent = formatTime(detail.startMinutes)
    document.body.appendChild(ghost)
    setTarget(detail)
    queuePointer(detail)
  })
  window.addEventListener('lien:shift-drag-pointer', event => queuePointer(event.detail || {}))
  window.addEventListener('lien:shift-drag-move', event => {
    if (!drag || !ghost) return
    const detail = event.detail || {}
    drag = { ...drag, ...detail }
    ghost.querySelector('span').textContent = (detail.staffName || '担当者') + 'へ移動'
    ghost.querySelector('em').textContent = formatTime(detail.startMinutes)
    setTarget(detail)
    queuePointer(detail)
  })
  window.addEventListener('lien:shift-drag-end', clearDrag)
  window.addEventListener('blur', clearDrag)
  document.addEventListener('pointercancel', clearDrag, true)
})()
`

fs.writeFileSync(commercialFile, commercial)
