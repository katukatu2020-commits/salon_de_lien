import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const pagePath = `${root}/.next/server/app/admin/customers/messages/page.js`
const marker = 'admin-chat-preview-v484'

const oldCard = `className: "rounded-[16px] border px-4 py-3 transition " + (m?.id === e.id ? "border-[color:var(--lien-primary)] bg-[color:var(--lien-primary)] text-white shadow-sm" : "border-[color:var(--lien-border)] bg-white text-lien-ink hover:bg-lien-soft"),\n                      children:`
const newCard = `className: "min-w-0 overflow-hidden rounded-[16px] border px-4 py-3 transition " + (m?.id === e.id ? "border-[color:var(--lien-primary)] bg-[color:var(--lien-primary)] text-white shadow-sm" : "border-[color:var(--lien-border)] bg-white text-lien-ink hover:bg-lien-soft"),\n                      style: { minWidth: 0, maxWidth: "100%", overflow: "hidden" },\n                      children:`

const oldPreview = `className: "admin-chat-preview-v483 mt-1 flex min-w-0 items-center gap-2 text-xs opacity-80", style: { minWidth: 0 }, children: [r.jsx("span", { className: "block min-w-0 flex-1 truncate", style: { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, "data-lien-chat-thread-preview": "v483", title: e.latestBody || e.staffName, children: e.latestBody || e.staffName }), e.latestAt ? r.jsx("time", { className: "shrink-0 whitespace-nowrap", style: { flexShrink: 0, whiteSpace: "nowrap" }, children:`
const newPreview = `className: "admin-chat-preview-v484 mt-1 flex min-w-0 items-center gap-2 text-xs opacity-80", style: { minWidth: 0, width: "100%", maxWidth: "100%" }, children: [r.jsx("span", { className: "block min-w-0 flex-1 truncate", style: { flex: "1 1 0%", width: 0, minWidth: 0, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, "data-lien-chat-thread-preview": "v484", title: e.latestBody || e.staffName, children: e.latestBody || e.staffName }), e.latestAt ? r.jsx("time", { className: "shrink-0 whitespace-nowrap", style: { flexShrink: 0, whiteSpace: "nowrap" }, children:`

let source = fs.readFileSync(pagePath, 'utf8')
if (source.includes(marker)) throw new Error(`${marker}: runtime patch already applied`)

for (const [before, after, label] of [
  [oldCard, newCard, 'conversation card'],
  [oldPreview, newPreview, 'conversation preview row'],
]) {
  const matches = source.split(before).length - 1
  if (matches !== 1) throw new Error(`${marker}: expected one ${label}, found ${matches}`)
  source = source.replace(before, after)
}

fs.writeFileSync(pagePath, source)
console.log(`${marker} runtime patched`)
