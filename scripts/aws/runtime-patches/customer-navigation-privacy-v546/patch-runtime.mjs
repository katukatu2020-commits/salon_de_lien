import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const marker = 'customer-navigation-privacy-v546'
const shellPath = path.join(root, 'public', 'shell-consistency-v518.js')
const experiencePath = path.join(root, 'customer-experience-v503.js')
const serverPath = path.join(root, 'server.js')
const serverCommunityChunkPath = path.join(root, '.next', 'server', 'chunks', '2616.js')
const nextRoot = path.join(root, '.next')
const customerChunkRoot = path.join(nextRoot, 'static', 'chunks', 'app', 'u', '(account)')

function replaceExact(source, before, after, expected, label) {
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  return source.split(before).join(after)
}

function collectFiles(directory, output = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) collectFiles(fullPath, output)
    else if (entry.name.endsWith('.js') || entry.name.endsWith('.json')) output.push(fullPath)
  }
  return output
}

function replaceNextReferences(before, after) {
  let references = 0
  for (const file of collectFiles(nextRoot)) {
    const source = fs.readFileSync(file, 'utf8')
    const count = source.split(before).length - 1
    if (!count) continue
    fs.writeFileSync(file, source.split(before).join(after))
    references += count
  }
  if (!references) throw new Error(`Next asset revision: no references found for ${before}`)
  return references
}

let shell = fs.readFileSync(shellPath, 'utf8')
if (shell.includes(marker)) throw new Error(`${marker}: patch already applied`)
shell = replaceExact(
  shell,
  `  function currentRoute() {\n    return location.pathname + location.search + location.hash\n  }`,
  `  function currentRoute() {\n    return location.pathname + location.search + location.hash\n  }\n\n  function routePath(route) {\n    try {\n      return new URL(route, location.origin).pathname\n    } catch {\n      return String(route || '').split(/[?#]/, 1)[0] || '/'\n    }\n  }\n\n  function samePage(left, right) {\n    return routePath(left) === routePath(right)\n  }`,
  1,
  'page-aware customer route helper',
)
shell = replaceExact(
  shell,
  `  function recordRoute(key) {\n    const route = currentRoute()\n    const routes = readStack(key)\n    if (routes.at(-1) !== route) {\n      routes.push(route)\n      writeStack(key, routes)\n    }\n  }`,
  `  function recordRoute(key) {\n    const route = currentRoute()\n    const routes = readStack(key)\n    if (key === CUSTOMER_STACK_KEY) {\n      while (routes.length && samePage(routes.at(-1), route)) routes.pop()\n    }\n    if (routes.at(-1) !== route) {\n      routes.push(route)\n      writeStack(key, routes)\n    }\n  }`,
  1,
  'same-page route stack compaction',
)
shell = replaceExact(
  shell,
  `  function navigateBack(key, fallback) {\n    const current = currentRoute()\n    const routes = readStack(key)\n    while (routes.at(-1) === current) routes.pop()\n    const target = routes.pop() || fallback\n    writeStack(key, [...routes, target])\n    location.assign(target)\n  }`,
  `  function navigateBack(key, fallback) {\n    const current = currentRoute()\n    const routes = readStack(key)\n    while (routes.length && (\n      routes.at(-1) === current\n      || (key === CUSTOMER_STACK_KEY && samePage(routes.at(-1), current))\n    )) routes.pop()\n    const target = routes.pop() || fallback\n    writeStack(key, [...routes, target])\n    location.assign(target)\n  }\n\n  window.__orimiaCustomerNavigateBackV546 = fallback => {\n    navigateBack(CUSTOMER_STACK_KEY, fallback || '/u/home')\n  }`,
  1,
  'page-aware customer back navigation',
)
shell += `\n/* ${marker} */\n`
fs.writeFileSync(shellPath, shell)

let experience = fs.readFileSync(experiencePath, 'utf8')
experience = replaceExact(
  experience,
  `      header.querySelector('[data-ocd-back]').addEventListener('click', () => {\n        const fallback = header.dataset.back || '/u/home'\n        if (history.length > 1) history.back()\n        else location.assign(fallback)\n      })`,
  `      header.querySelector('[data-ocd-back]').addEventListener('click', () => {\n        const fallback = header.dataset.back || '/u/home'\n        if (typeof window.__orimiaCustomerNavigateBackV546 === 'function') {\n          window.__orimiaCustomerNavigateBackV546(fallback)\n        } else {\n          location.assign(fallback)\n        }\n      })`,
  1,
  'desktop customer back navigation',
)
experience += `\n/* ${marker} */\n`
fs.writeFileSync(experiencePath, experience)

const customerStatusClass = 'rounded-full bg-[#eef5ee] px-3 py-1 text-[11px] font-semibold text-[#567157]'
let serverCommunityChunk = fs.readFileSync(serverCommunityChunkPath, 'utf8')
serverCommunityChunk = replaceExact(
  serverCommunityChunk,
  `s.jsx("span",{className:"${customerStatusClass}",children:"公開中"})`,
  `"staff"===t?s.jsx("span",{className:"${customerStatusClass}",children:"公開中"}):null`,
  1,
  'server-rendered customer publication badge',
)
serverCommunityChunk += `\n/* ${marker} */\n`
fs.writeFileSync(serverCommunityChunkPath, serverCommunityChunk)

const oldCommunityChunk = '6012-community-timezone-v420.js'
const newCommunityChunk = '6012-community-customer-privacy-v546.js'
const oldCommunityChunkPath = path.join(nextRoot, 'static', 'chunks', oldCommunityChunk)
const newCommunityChunkPath = path.join(nextRoot, 'static', 'chunks', newCommunityChunk)
let communityChunk = fs.readFileSync(oldCommunityChunkPath, 'utf8')
communityChunk = replaceExact(
  communityChunk,
  `(0,a.jsx)("span",{className:"${customerStatusClass}",children:"公開中"})`,
  `"staff"===s?(0,a.jsx)("span",{className:"${customerStatusClass}",children:"公開中"}):null`,
  1,
  'client-rendered customer publication badge',
)
communityChunk += `\n/* ${marker} */\n`
fs.writeFileSync(oldCommunityChunkPath, communityChunk)
fs.writeFileSync(newCommunityChunkPath, communityChunk)
const communityChunkReferences = replaceNextReferences(oldCommunityChunk, newCommunityChunk)

const oldExperienceRevision = '/customer-experience-v503.js?v=545-auto-profile1'
const newExperienceRevision = '/customer-experience-v503.js?v=546-navigation-privacy1'
const customerLayoutChunks = [
  'layout-customer-mobile-nav-v425.js',
  'layout-customer-mobile-nav-v425.orimia-v508.js',
  'layout-customer-mobile-nav-v425.orimia-v518.js',
  'layout-customer-mobile-nav-v425.profile-v545.js',
]
for (const name of customerLayoutChunks) {
  const file = path.join(customerChunkRoot, name)
  let source = fs.readFileSync(file, 'utf8')
  source = replaceExact(source, oldExperienceRevision, newExperienceRevision, 1, `${name} customer experience revision`)
  fs.writeFileSync(file, source)
}
const refreshedCustomerChunk = 'layout-customer-mobile-nav-v425.navigation-privacy-v546.js'
const refreshedCustomerChunkPath = path.join(customerChunkRoot, refreshedCustomerChunk)
fs.writeFileSync(
  refreshedCustomerChunkPath,
  `${fs.readFileSync(path.join(customerChunkRoot, customerLayoutChunks.at(-1)), 'utf8')}\n/* ${marker} */\n`,
)

let server = fs.readFileSync(serverPath, 'utf8')
server = replaceExact(server, oldExperienceRevision, newExperienceRevision, 2, 'customer experience cache revision')
server = replaceExact(
  server,
  '/shell-consistency-v518.js?v=518-release1',
  '/shell-consistency-v518.js?v=546-navigation-privacy1',
  1,
  'customer shell cache revision',
)
server = replaceExact(
  server,
  `const CUSTOMER_LAYOUT_REFRESHED_CHUNK_V508 = 'static/chunks/app/u/(account)/layout-customer-mobile-nav-v425.profile-v545.js'`,
  `const CUSTOMER_LAYOUT_REFRESHED_CHUNK_V508 = 'static/chunks/app/u/(account)/${refreshedCustomerChunk}'`,
  1,
  'customer account layout cache revision',
)
const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Profile-Auto-Upload', 'v545') /* customer-profile-auto-upload-v545 */`
server = replaceExact(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Navigation-Privacy', 'v546') /* ${marker} */`,
  1,
  'customer navigation readiness marker',
)
server += `\n/* ${marker} */\n`
fs.writeFileSync(serverPath, server)

console.log(JSON.stringify({ release: marker, communityChunkReferences, patched: true }))
