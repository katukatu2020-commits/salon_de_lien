const fs = require('fs')

const shift = fs.readFileSync('/app/.next/static/chunks/app/admin/appointments/page-shift-layout-20260812-02.capacity-persist-v44.business-schedule-v294.js', 'utf8')
const commercial = fs.readFileSync('/app/commercial-admin-v101.js', 'utf8')
const assertions = [
  [shift.includes('lien:shift-drag-start'), 'drag start event missing'],
  [shift.includes('lien:shift-drag-move'), 'drag move event missing'],
  [shift.includes('lien:shift-drag-end'), 'drag end event missing'],
  [shift.includes('querySelectorAll(".shift-lane[data-staff-name]")'), 'all staff target lookup missing'],
  [!shift.includes('.elementsFromPoint(e.clientX, e.clientY)'), 'legacy direct hit target remains'],
  [commercial.includes('window.__lienShiftDragUxV319'), 'drag UX initializer missing'],
  [commercial.includes('.lien-shift-drag-active .ts-shift-hover-slot{display:none!important}'), 'legacy range suppression missing'],
  [commercial.includes("fetch('/api/lien-staff-notifications?history=1'"), 'canonical notification fetch missing'],
  [commercial.includes("'未読 ' + unreadTotal + '件 / 全'"), 'notification history count label missing'],
  [!commercial.includes('const systemUnread = items.filter'), 'duplicate system unread badge calculation remains'],
]
for (const [condition, message] of assertions) if (!condition) throw new Error(message)
console.log('shift-drag-notification-v319 verified')
