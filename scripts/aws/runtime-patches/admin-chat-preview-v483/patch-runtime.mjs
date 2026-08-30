import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const pagePath = `${root}/.next/server/app/admin/customers/messages/page.js`
const marker = 'admin-chat-preview-v483'

const oldPreview = `className: "mt-1 flex items-center justify-between gap-2 text-xs opacity-80", children: [r.jsx("span", { children: e.latestBody || e.staffName }), e.latestAt ? r.jsx("time", { children:`
const newPreview = `className: "admin-chat-preview-v483 mt-1 flex min-w-0 items-center gap-2 text-xs opacity-80", style: { minWidth: 0 }, children: [r.jsx("span", { className: "block min-w-0 flex-1 truncate", style: { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, "data-lien-chat-thread-preview": "v483", title: e.latestBody || e.staffName, children: e.latestBody || e.staffName }), e.latestAt ? r.jsx("time", { className: "shrink-0 whitespace-nowrap", style: { flexShrink: 0, whiteSpace: "nowrap" }, children:`

let source = fs.readFileSync(pagePath, 'utf8')
if (source.includes(marker)) throw new Error(`${marker}: runtime patch already applied`)

const previewMatches = source.split(oldPreview).length - 1
if (previewMatches !== 1) {
  throw new Error(`${marker}: expected one conversation preview row, found ${previewMatches}`)
}

source = source.replace(oldPreview, newPreview)
fs.writeFileSync(pagePath, source)

console.log(`${marker} runtime patched`)
