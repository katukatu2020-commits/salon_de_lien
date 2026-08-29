import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const marker = 'content-edit-delete-v465'
const paths = {
  server: `${root}/server.js`,
  customerChat: `${root}/ui-workflows-v294.js`,
  customerCommunity: `${root}/.next/server/app/u/(account)/community/[postId]/page.js`,
  adminCommunity: `${root}/.next/server/app/admin/community/[postId]/page.js`,
  adminChat: `${root}/.next/server/app/admin/customers/messages/page.js`,
}

function replaceExactly(source, oldValue, newValue, label) {
  const first = source.indexOf(oldValue)
  if (first < 0 || source.indexOf(oldValue, first + oldValue.length) >= 0) {
    throw new Error(`${marker}: expected exactly one ${label}`)
  }
  return source.replace(oldValue, newValue)
}

let server = fs.readFileSync(paths.server, 'utf8')
if (server.includes(marker)) throw new Error(`${marker}: server patch already applied`)

server = replaceExactly(
  server,
  `const { createCommunityPublishingService } = require('./community-publishing-v348') /* community-publishing-v337 */`,
  `const { createCommunityPublishingService } = require('./community-publishing-v348') /* community-publishing-v337 */\nconst { createContentManagementService } = require('./content-management-v465') /* ${marker}-require */`,
  'content management require',
)
server = replaceExactly(
  server,
  `}) /* community-publishing-v348-service */\nconst appointmentOperations = createAppointmentOperationsService({`,
  `}) /* community-publishing-v348-service */\nconst contentManagement = createContentManagementService({\n  prisma,\n  staffSessionProvider: req => chatSession(req, 'staff'),\n  customerSessionProvider: req => chatSession(req, 'customer'),\n  canAccessThread,\n}) /* ${marker}-service */\nconst appointmentOperations = createAppointmentOperationsService({`,
  'content management service',
)
server = replaceExactly(
  server,
  `    const messages = thread ? await prisma.$queryRawUnsafe('SELECT * FROM "ChatMessage" WHERE "threadId"=$1 ORDER BY "createdAt" ASC LIMIT 300', thread.id) : []`,
  `    const rawMessages = thread ? await prisma.$queryRawUnsafe('SELECT * FROM "ChatMessage" WHERE "threadId"=$1 ORDER BY "createdAt" ASC LIMIT 300', thread.id) : []\n    const messages = rawMessages.map(message => ({ ...message, canEdit: message.senderType === audience && String(message.senderUserId || '') === String(session.userId || ''), canDelete: message.senderType === audience && String(message.senderUserId || '') === String(session.userId || '') })) /* ${marker}-ownership */`,
  'chat message ownership response',
)
server = replaceExactly(
  server,
  `      if (await storeProfile.handle(req, res, url)) return /* commercial-admin-v101-route */\n      if (await billing.enforceAccess(req, res, url)) return`,
  `      if (await storeProfile.handle(req, res, url)) return /* commercial-admin-v101-route */\n      if (await contentManagement.handle(req, res, url)) return /* ${marker}-route */\n      if (await billing.enforceAccess(req, res, url)) return`,
  'content management route',
)
fs.writeFileSync(paths.server, server)

let customerChat = fs.readFileSync(paths.customerChat, 'utf8')
if (customerChat.includes(marker)) throw new Error(`${marker}: customer chat patch already applied`)
customerChat = replaceExactly(
  customerChat,
  `  function initCustomerChat() {\n    if (location.pathname !== '/u/chat') return`,
  `  function initCustomerChat() {\n    if (location.pathname !== '/u/chat') return\n    if (!document.querySelector('script[data-${marker}]')) { const script = document.createElement('script'); script.src = '/content-edit-delete-client-v465.js'; script.defer = true; script.dataset.${marker.replaceAll('-', '')} = '1'; document.head.appendChild(script) } /* ${marker} */`,
  'customer chat script loader',
)
customerChat = replaceExactly(
  customerChat,
  `      return \`${'${dateSeparator}'}<div class="lien-chat-v294__message-row ${'${mine ? \'mine\' : \'\'}'}" data-sender="${'${mine ? \'customer\' : \'staff\'}'}"><div class="lien-chat-v294__message">${'${esc(message.body)}'}</div><time class="lien-chat-v294__message-meta" datetime="${'${esc(message.createdAt || \'\')}'}">${'${readLabel}'}<span>${'${esc(chatTimeLabel(message.createdAt))}'}</span></time></div>\``,
  `      return \`${'${dateSeparator}'}<div class="lien-chat-v294__message-row ${'${mine ? \'mine\' : \'\'}'}" data-sender="${'${mine ? \'customer\' : \'staff\'}'}" data-lien-chat-message="${'${esc(message.id || \'\')}'}" data-lien-chat-can-edit="${'${String(Boolean(message.canEdit))}'}"><div class="lien-chat-v294__message" data-lien-chat-body="1">${'${esc(message.body)}'}</div><time class="lien-chat-v294__message-meta" datetime="${'${esc(message.createdAt || \'\')}'}">${'${readLabel}'}<span>${'${esc(chatTimeLabel(message.createdAt))}'}</span></time></div>\``,
  'customer chat message ownership attributes',
)
fs.writeFileSync(paths.customerChat, customerChat)

let customerCommunity = fs.readFileSync(paths.customerCommunity, 'utf8')
if (customerCommunity.includes(marker)) throw new Error(`${marker}: customer community patch already applied`)
customerCommunity = replaceExactly(
  customerCommunity,
  `(0,s.jsx)("script",{src:"/customer-community-mobile-v383.js",defer:!0}),(0,s.jsx)("style",{id:`,
  `(0,s.jsx)("script",{src:"/customer-community-mobile-v383.js",defer:!0}),(0,s.jsx)("script",{src:"/content-edit-delete-client-v465.js",defer:!0,"data-${marker}":"1"}),(0,s.jsx)("style",{id:`,
  'customer community script',
)
fs.writeFileSync(paths.customerCommunity, customerCommunity)

let adminCommunity = fs.readFileSync(paths.adminCommunity, 'utf8')
if (adminCommunity.includes(marker)) throw new Error(`${marker}: admin community patch already applied`)
adminCommunity = replaceExactly(
  adminCommunity,
  `className:"mx-auto grid w-full max-w-3xl gap-4",children:[(0,s.jsxs)(i.default`,
  `className:"mx-auto grid w-full max-w-3xl gap-4",children:[(0,s.jsx)("script",{src:"/content-edit-delete-client-v465.js",defer:!0,"data-${marker}":"1"}),(0,s.jsxs)(i.default`,
  'admin community script',
)
fs.writeFileSync(paths.adminCommunity, adminCommunity)

let adminChat = fs.readFileSync(paths.adminChat, 'utf8')
if (adminChat.includes(marker)) throw new Error(`${marker}: admin chat patch already applied`)
adminChat = replaceExactly(
  adminChat,
  `children: [\n              r.jsx(a.Z, { active: "points" }),`,
  `children: [\n              r.jsx("script", { src: "/content-edit-delete-client-v465.js", defer: true, "data-${marker}": "1" }),\n              r.jsx(a.Z, { active: "points" }),`,
  'admin chat script',
)
adminChat = replaceExactly(
  adminChat,
  `(0, r.jsxs)("div", { className: "flex max-w-[78%] items-end gap-2 " + (e.senderType === "staff" ? "ml-auto flex-row-reverse" : ""), children:`,
  `(0, r.jsxs)("div", { className: "flex max-w-[78%] items-end gap-2 " + (e.senderType === "staff" ? "ml-auto flex-row-reverse" : ""), "data-lien-chat-message": e.id, "data-lien-chat-can-edit": String(e.senderType === "staff" && e.senderUserId === s.userId), children:`,
  'admin chat message ownership attributes',
)
adminChat = replaceExactly(
  adminChat,
  `r.jsx("div", { className: "rounded-[16px] px-4 py-3 text-sm leading-6 " + (e.senderType === "staff" ? "bg-[#8f4f42] text-white" : "bg-white text-lien-ink shadow-sm"), children: e.body })`,
  `r.jsx("div", { className: "rounded-[16px] px-4 py-3 text-sm leading-6 " + (e.senderType === "staff" ? "bg-[#8f4f42] text-white" : "bg-white text-lien-ink shadow-sm"), "data-lien-chat-body": "1", children: e.body })`,
  'admin chat message body attribute',
)
fs.writeFileSync(paths.adminChat, adminChat)

console.log(`${marker} runtime patched`)
