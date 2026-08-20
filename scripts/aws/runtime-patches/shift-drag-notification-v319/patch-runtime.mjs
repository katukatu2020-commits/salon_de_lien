import fs from 'node:fs'
import path from 'node:path'

const replaceOnce = (source, search, replacement, label) => {
  const count = source.split(search).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(search, replacement)
}

const shiftFile = '/app/.next/static/chunks/app/admin/appointments/page-shift-layout-20260812-02.capacity-persist-v44.business-schedule-v294.js'
let shift = fs.readFileSync(shiftFile, 'utf8')

shift = replaceOnce(shift,
`            r = D.current;
          if (!r || r.pointerId !== e.pointerId) return;
          if (`,
`            r = D.current;
          if (!r || r.pointerId !== e.pointerId) return;
          window.dispatchEvent(new CustomEvent("lien:shift-drag-end", { detail: { appointmentId: r.appointmentId, cancelled: n } }));
          if (`,
  'drag end event')

shift = replaceOnce(shift,
`                originDurationMinutes: t.durationMinutes,
                originStaffName: t.staffName,
                moved: !1,
              }));`,
`                originDurationMinutes: t.durationMinutes,
                originStaffName: t.staffName,
                moved: !1,
              }),
              window.dispatchEvent(new CustomEvent("lien:shift-drag-start", { detail: { appointmentId: t.id, mode: n, customerName: t.customerName || t.customerRealName || "予約", staffName: t.staffName, startMinutes: g(t.scheduledAt), durationMinutes: t.durationMinutes, clientX: e.clientX, clientY: e.clientY } })));`,
  'drag start event')

shift = replaceOnce(shift,
`          let o = v(n.originStartMinutes + i, __businessOpen, __businessClose - l.durationMinutes),
            s = document
              .elementsFromPoint(e.clientX, e.clientY)
              .find((e) => e instanceof HTMLElement && e.dataset.staffName),
            c = (null == s ? void 0 : s.dataset.staffName) || n.originStaffName;
          X(l.id, {`,
`          let o = v(n.originStartMinutes + i, __businessOpen, __businessClose - l.durationMinutes),
            s = Array.from(document.querySelectorAll(".shift-lane[data-staff-name]"))
              .map((t) => ({ element: t, rect: t.getBoundingClientRect() }))
              .filter((e) => e.rect.width > 0 && e.rect.height > 0)
              .sort((t, n) => Math.abs((t.rect.top + t.rect.bottom) / 2 - e.clientY) - Math.abs((n.rect.top + n.rect.bottom) / 2 - e.clientY))[0],
            c = s && e.clientY >= s.rect.top - 18 && e.clientY <= s.rect.bottom + 18 ? s.element.dataset.staffName : n.originStaffName;
          window.dispatchEvent(new CustomEvent("lien:shift-drag-move", { detail: { appointmentId: l.id, customerName: l.customerName || l.customerRealName || "予約", staffName: c, startMinutes: o, durationMinutes: l.durationMinutes, clientX: e.clientX, clientY: e.clientY } }));
          X(l.id, {`,
  'all staff drag target')

shift = shift.replaceAll('border-[#ddd4ca]', 'border-[#c7b6aa]')
fs.writeFileSync(shiftFile, shift)

const commercialFile = '/app/commercial-admin-v101.js'
let commercial = fs.readFileSync(commercialFile, 'utf8')
commercial = replaceOnce(commercial,
  `fetch('/api/lien-staff-notifications', { credentials: 'same-origin', cache: 'no-store' })`,
  `fetch('/api/lien-staff-notifications?history=1', { credentials: 'same-origin', cache: 'no-store' })`,
  'canonical notification fetch')
commercial = replaceOnce(commercial,
`    const seen = systemNotificationSeenIds()
    const items = notificationItems(payload)
    const systemUnread = items.filter(item => item.system && !seen.has(item.id)).length
    const count = Math.max(0, Number(payload?.staff?.count || 0) + systemUnread)`,
`    const count = Math.max(0, Number(payload?.staff?.count || 0))`,
  'canonical notification badge count')
commercial = replaceOnce(commercial,
  `      count.textContent = visible.length + '件'`,
  `      const unreadTotal = items.filter(item => item.isUnread).length
      count.textContent = filter === 'all' ? '未読 ' + unreadTotal + '件 / 全' + visible.length + '件' : visible.length + '件'`,
  'notification history count label')

commercial += String.raw`

;(() => {
  if (window.__lienShiftDragUxV319) return
  window.__lienShiftDragUxV319 = true

  const style = document.createElement('style')
  style.dataset.lienShiftDragV319 = '1'
  style.textContent = [
    '.shift-canvas{--lien-shift-grid:#c7b6aa}',
    '.shift-canvas [class*="border-r"],.shift-canvas [class*="border-l"],.shift-canvas [class*="border-t"],.shift-canvas [class*="border-b"]{border-color:var(--lien-shift-grid)!important}',
    '.shift-canvas,.shift-top,.shift-lane{border-color:var(--lien-shift-grid)!important}',
    '.lien-shift-drag-active .ts-shift-hover-slot{display:none!important}',
    '.shift-lane.ca-shift-drop-target{background-color:#fff8f3!important;box-shadow:inset 0 0 0 2px rgba(160,91,72,.30)}',
    '.ca-shift-drop-guide{position:absolute;inset-block:0;z-index:29;width:2px;background:#a85b4a;box-shadow:0 0 0 1px rgba(255,255,255,.88);pointer-events:none;transform:translateX(-1px)}',
    '.ca-shift-drop-guide::before{content:"";position:absolute;left:50%;top:5px;width:8px;height:8px;border:2px solid #fff;border-radius:50%;background:#a85b4a;box-shadow:0 2px 7px rgba(91,45,35,.24);transform:translateX(-50%)}',
    '.ca-shift-drag-ghost{position:fixed;z-index:2147483000;left:0;top:0;display:grid;min-width:156px;max-width:240px;gap:2px;border:1px solid rgba(152,86,69,.32);border-radius:12px;background:rgba(255,253,250,.96);padding:9px 12px;color:#352621;box-shadow:0 13px 34px rgba(72,38,29,.22);font:700 12px/1.35 -apple-system,BlinkMacSystemFont,"Segoe UI","Yu Gothic",sans-serif;pointer-events:none;will-change:transform;backdrop-filter:blur(8px)}',
    '.ca-shift-drag-ghost strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}',
    '.ca-shift-drag-ghost span{color:#8d5a4e;font-size:10px;font-weight:700}',
    '.ca-shift-drag-ghost em{color:#ad4962;font-size:10px;font-style:normal;font-weight:800}'
  ].join('')
  document.head.appendChild(style)

  let ghost = null
  let targetLane = null
  let guide = null
  let pendingPoint = null
  let frame = 0
  let drag = null

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
    clearTarget()
    ghost?.remove()
    ghost = null
    drag = null
    pendingPoint = null
    if (frame) cancelAnimationFrame(frame)
    frame = 0
  }
  const positionGhost = () => {
    frame = 0
    if (!ghost || !pendingPoint) return
    let x = pendingPoint.x + 18
    let y = pendingPoint.y + 18
    const rect = ghost.getBoundingClientRect()
    if (x + rect.width > innerWidth - 10) x = pendingPoint.x - rect.width - 18
    if (y + rect.height > innerHeight - 10) y = pendingPoint.y - rect.height - 18
    ghost.style.transform = 'translate3d(' + Math.max(8, x) + 'px,' + Math.max(8, y) + 'px,0)'
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
  }

  window.addEventListener('lien:shift-drag-start', event => {
    clearDrag()
    const detail = event.detail || {}
    if (detail.mode !== 'move') return
    drag = detail
    document.documentElement.classList.add('lien-shift-drag-active')
    document.querySelectorAll('.ts-shift-hover-slot').forEach(node => node.remove())
    ghost = document.createElement('div')
    ghost.className = 'ca-shift-drag-ghost'
    ghost.setAttribute('role', 'status')
    ghost.setAttribute('aria-live', 'polite')
    document.body.appendChild(ghost)
    pendingPoint = { x: Number(detail.clientX), y: Number(detail.clientY) }
    ghost.innerHTML = '<strong></strong><span></span><em></em>'
    ghost.querySelector('strong').textContent = detail.customerName || '予約'
    ghost.querySelector('span').textContent = (detail.staffName || '担当未定') + 'へ移動'
    ghost.querySelector('em').textContent = formatTime(detail.startMinutes)
    setTarget(detail)
    frame = requestAnimationFrame(positionGhost)
  })
  window.addEventListener('lien:shift-drag-move', event => {
    if (!drag || !ghost) return
    const detail = event.detail || {}
    drag = { ...drag, ...detail }
    pendingPoint = { x: Number(detail.clientX), y: Number(detail.clientY) }
    ghost.querySelector('span').textContent = (detail.staffName || '担当未定') + 'へ移動'
    ghost.querySelector('em').textContent = formatTime(detail.startMinutes)
    setTarget(detail)
    if (!frame) frame = requestAnimationFrame(positionGhost)
  })
  window.addEventListener('lien:shift-drag-end', clearDrag)
  window.addEventListener('blur', clearDrag)
  document.addEventListener('pointercancel', clearDrag, true)
})()
`

fs.writeFileSync(commercialFile, commercial)

let nextNotificationFetches = 0
const walk = directory => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name)
    if (entry.isDirectory()) walk(filename)
    else if (entry.isFile() && filename.endsWith('.js')) {
      let source = fs.readFileSync(filename, 'utf8')
      const search = 'fetch("/api/lien-staff-notifications",{cache:"no-store"})'
      if (!source.includes(search)) continue
      const count = source.split(search).length - 1
      source = source.replaceAll(search, 'fetch("/api/lien-staff-notifications?history=1",{cache:"no-store"})')
      nextNotificationFetches += count
      fs.writeFileSync(filename, source)
    }
  }
}
walk('/app/.next')
if (nextNotificationFetches < 1) throw new Error(`Next notification fetch patch: expected at least 1 match, found ${nextNotificationFetches}`)
