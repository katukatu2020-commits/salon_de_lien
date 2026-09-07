import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const marker = 'admin-chat-read-position-v580'
const pagePath = `${root}/.next/server/app/admin/customers/messages/page.js`
const serverPath = `${root}/server.js`

function replaceExactly(source, before, after, label) {
  const matches = source.split(before).length - 1
  if (matches !== 1) {
    throw new Error(`${marker}: expected one ${label}, found ${matches}`)
  }
  return source.replace(before, after)
}

let page = fs.readFileSync(pagePath, 'utf8')
if (page.includes(marker)) throw new Error(`${marker}: page patch already applied`)

page = replaceExactly(
  page,
  `className: "flex max-w-[78%] items-end gap-2 " + (e.senderType === "staff" ? "ml-auto flex-row-reverse" : ""), "data-lien-chat-message": e.id,`,
  `className: "flex max-w-[78%] items-end gap-2 " + (e.senderType === "staff" ? "ml-auto" : ""), style: { flexDirection: e.senderType === "staff" ? "row-reverse" : "row" }, "data-lien-admin-chat-direction": e.senderType === "staff" ? "outgoing" : "incoming", "data-lien-chat-message": e.id, /* ${marker} */`,
  'message row direction',
)

page = replaceExactly(
  page,
  `(0, r.jsxs)("span", { className: "whitespace-nowrap text-[10px] text-lien-muted", children: [e.senderType === "staff" && m.customerLastReadAt && new Date(e.createdAt) <= new Date(m.customerLastReadAt) ? r.jsx("span", { className: "block text-right", children: "\u65e2\u8aad" }) : null,`,
  `(0, r.jsxs)("span", { className: "whitespace-nowrap text-[10px] text-lien-muted", style: { flex: "0 0 auto", textAlign: e.senderType === "staff" ? "right" : "left" }, "data-lien-admin-chat-meta": "v580", children: [e.senderType === "staff" && m.customerLastReadAt && new Date(e.createdAt) <= new Date(m.customerLastReadAt) ? r.jsx("span", { className: "block text-right", "data-lien-admin-chat-read": "v580", children: "\u65e2\u8aad" }) : null,`,
  'message metadata',
)

fs.writeFileSync(pagePath, page)

let server = fs.readFileSync(serverPath, 'utf8')
if (server.includes("X-Lien-Admin-Chat-Read-Position', 'v580'")) {
  throw new Error(`${marker}: server patch already applied`)
}
server = replaceExactly(
  server,
  `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Receipt-Physical-Roll', 'v579')`,
  `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Receipt-Physical-Roll', 'v579')\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Admin-Chat-Read-Position', 'v580')`,
  'readiness marker',
)
fs.writeFileSync(serverPath, server)

console.log(`${marker} runtime patched`)
