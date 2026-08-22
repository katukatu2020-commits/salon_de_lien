import fs from 'node:fs'

const messagesPagePath = '/app/.next/server/app/admin/customers/messages/page.js'
const actionsChunkPath = '/app/.next/server/chunks/9845.js'
const settingsPagePath = '/app/.next/server/app/admin/settings/page.js'
const cancellationPath = '/app/customer-appointment-cancellation-v362.js'
const serverPath = '/app/server.js'

function read(file) {
  if (!fs.existsSync(file)) throw new Error(`required runtime file is missing: ${file}`)
  return fs.readFileSync(file, 'utf8')
}

function replaceExact(source, before, after, label, expected = 1) {
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} match(es), found ${count}`)
  return source.split(before).join(after)
}

let messagesPage = read(messagesPagePath)
messagesPage = replaceExact(
  messagesPage,
  '(["ADMIN"])',
  '(["ADMIN","STAFF"])',
  'customer workspace role gate',
  2,
)
fs.writeFileSync(messagesPagePath, messagesPage)

let actionsChunk = read(actionsChunkPath)
actionsChunk = replaceExact(
  actionsChunk,
  'async function m(e) {\n        let t = await (0, i.Os)(["ADMIN"]);',
  'async function m(e) {\n        let t = await (0, i.Os)(["ADMIN","STAFF"]);',
  'customer broadcast action role gate',
)
fs.writeFileSync(actionsChunkPath, actionsChunk)

let cancellation = read(cancellationPath)
cancellation = replaceExact(
  cancellation,
  '`INSERT INTO "StaffSystemNotification" ("id","organizationId","type","title","body","href","entityType","entityId","source","createdAt","updatedAt")\n         VALUES ($1,$2,\'customer_cancellation\',\'お客様が予約をキャンセルしました\',$3,$4,\'appointment\',$5,\'customer_app\',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)',
  '`INSERT INTO "StaffSystemNotification" ("id","organizationId","type","title","body","href","entityType","entityId","source","createdAt")\n         VALUES ($1,$2,\'customer_cancellation\',\'お客様が予約をキャンセルしました\',$3,$4,\'appointment\',$5,\'customer_app\',CURRENT_TIMESTAMP)',
  'customer cancellation notification insert',
)
fs.writeFileSync(cancellationPath, cancellation)

let server = read(serverPath)
const settingsGuard = `
      if (url.pathname === '/admin/settings' && req.method === 'GET') {
        const settingsActor = await chatSession(req, 'staff')
        if (settingsActor && settingsActor.role !== 'ADMIN') {
          res.statusCode = 303
          res.setHeader('Location', '/admin/account?notice=owner-required')
          res.setHeader('Cache-Control', 'private, no-store')
          res.end()
          return
        }
      } /* backoffice-access-consistency-v379-owner-guard */`
server = replaceExact(
  server,
  "      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)",
  "      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)" + settingsGuard,
  'owner settings graceful redirect',
)
fs.writeFileSync(serverPath, server)

// Keep an explicit check that the owner-only page itself was not relaxed.
const settingsPage = read(settingsPagePath)
if (!settingsPage.includes('(["ADMIN"])')) {
  throw new Error('owner settings role gate unexpectedly changed')
}

console.log('backoffice-access-consistency-v379 runtime patch applied')
