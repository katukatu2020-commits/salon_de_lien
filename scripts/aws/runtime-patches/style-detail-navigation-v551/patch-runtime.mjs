import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const marker = 'style-detail-navigation-v551'
const patchRoot = path.dirname(fileURLToPath(import.meta.url))
const serverPath = path.join(root, 'server.js')
const shellPath = path.join(root, 'public', 'shell-consistency-v518.js')
const customerDetailPath = path.join(root, '.next', 'server', 'app', 'u', '(account)', 'community', '[postId]', 'page.js')

function replaceExactly(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected 1 match, found ${count}`)
  return source.replace(before, after)
}

let shell = fs.readFileSync(shellPath, 'utf8')
const oldRecordRoute = `  function recordRoute(key) {
    const route = currentRoute()
    const routes = readStack(key)
    if (key === CUSTOMER_STACK_KEY) {
      while (routes.length && samePage(routes.at(-1), route)) routes.pop()
    }
    if (routes.at(-1) !== route) {
      routes.push(route)
      writeStack(key, routes)
    }
  }`
const newRecordRoute = `  function recordRoute(key) {
    const route = currentRoute()
    const routes = readStack(key)
    if (key === CUSTOMER_STACK_KEY) {
      let existingIndex = -1
      for (let index = routes.length - 1; index >= 0; index -= 1) {
        if (samePage(routes[index], route)) {
          existingIndex = index
          break
        }
      }
      if (existingIndex >= 0) {
        routes.splice(existingIndex + 1)
        routes[existingIndex] = route
      } else {
        routes.push(route)
      }
      writeStack(key, routes)
      return
    }
    if (routes.at(-1) !== route) {
      routes.push(route)
      writeStack(key, routes)
    }
  }`
shell = replaceExactly(shell, oldRecordRoute, newRecordRoute, 'customer history reconciliation')
shell += `\n/* ${marker} */\n`
fs.writeFileSync(shellPath, shell)

let customerDetail = fs.readFileSync(customerDetailPath, 'utf8')
const redundantBackLink = '(0,s.jsxs)(i.default,{href:"/u/community",className:"inline-flex min-h-11 w-fit items-center gap-2 rounded-full border border-[#e8ded2] bg-white px-4 text-sm font-semibold shadow-sm transition hover:bg-[#f6efe6]",children:[s.jsx(n.Z,{className:"h-4 w-4"}),"スタイル一覧へ"]}),'
customerDetail = replaceExactly(customerDetail, redundantBackLink, '', 'customer detail duplicate back link')
customerDetail += `\n/* ${marker} */\n`
fs.writeFileSync(customerDetailPath, customerDetail)

let server = fs.readFileSync(serverPath, 'utf8')
server = replaceExactly(
  server,
  '/shell-consistency-v518.js?v=546-navigation-privacy1',
  '/shell-consistency-v518.js?v=551-release1',
  'customer shell cache key',
)
const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Owner-Shared-Switch', 'v550') /* owner-shared-switch-v550 */`
server = replaceExactly(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Style-Detail-Navigation', 'v551') /* ${marker} */`,
  'style detail navigation readiness marker',
)
server += `\n/* ${marker} */\n`
fs.writeFileSync(serverPath, server)

console.log(JSON.stringify({
  release: marker,
  shell: path.relative(root, shellPath),
  detail: path.relative(root, customerDetailPath),
  patchRoot: path.basename(patchRoot),
}))
