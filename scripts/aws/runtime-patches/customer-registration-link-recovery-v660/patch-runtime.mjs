import fs from 'node:fs'
import path from 'node:path'
import { customerRegistrationLinkRecoveryScriptV660 } from './recovery-source.mjs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const serverPath = path.join(root, 'server.js')
const layoutChunkPath = path.join(root, '.next', 'server', 'chunks', '1425.js')
const marker = 'customer-registration-link-recovery-v660'

function replaceExact(source, before, after, expected, label) {
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  return source.split(before).join(after)
}

let layoutChunk = fs.readFileSync(layoutChunkPath, 'utf8')
if (layoutChunk.includes(marker)) throw new Error(`${marker}: layout patch already applied`)

const bodyBefore = `              children: a.jsx("body", {
                children: a.jsx(s.V, {
                  storeIconUrl: t,
                  backofficeRole: n,
                  backofficeDisplayName: r,
                  children: e,
                }),
              }),`

const bodyAfter = `              children: a.jsx("body", {
                children: [
                  a.jsx("script", {
                    id: "orimia-customer-registration-link-recovery-v660",
                    dangerouslySetInnerHTML: { __html: ${JSON.stringify(customerRegistrationLinkRecoveryScriptV660)} },
                  }, "customer-registration-link-recovery-v660"),
                  a.jsx(s.V, {
                    storeIconUrl: t,
                    backofficeRole: n,
                    backofficeDisplayName: r,
                    children: e,
                  }, "orimia-app-shell"),
                ],
              }),`

layoutChunk = replaceExact(
  layoutChunk,
  bodyBefore,
  bodyAfter,
  1,
  'root layout registration recovery bootstrap',
)
layoutChunk += `\n/* ${marker} */\n`
fs.writeFileSync(layoutChunkPath, layoutChunk)

let server = fs.readFileSync(serverPath, 'utf8')
const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Dealer-Product-Search-Filters', 'v659') /* dealer-product-search-filters-v659-ready */`
server = replaceExact(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Registration-Link-Recovery', 'v660') /* ${marker}-ready */`,
  1,
  'registration recovery readiness marker',
)
server += `\n/* ${marker} */\n`
fs.writeFileSync(serverPath, server)

console.log(JSON.stringify({ release: marker, patched: true }))
