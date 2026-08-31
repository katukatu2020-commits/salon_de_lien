import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const patchRoot = path.dirname(fileURLToPath(import.meta.url))
const serverPath = path.join(root, 'server.js')
const layoutChunkName = 'layout-customer-mobile-nav-v425.js'
const refreshedLayoutChunkName = 'layout-customer-mobile-nav-v425.orimia-v508.js'
const layoutChunkDir = path.join(root, '.next', 'static', 'chunks', 'app', 'u', '(account)')

function replaceExact(source, before, after, expected, label) {
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  return source.split(before).join(after)
}

for (const fileName of ['customer-experience-v508.js', 'customer-experience-v508.css']) {
  fs.copyFileSync(path.join(patchRoot, fileName), path.join(root, fileName))
}

fs.copyFileSync(
  path.join(layoutChunkDir, layoutChunkName),
  path.join(layoutChunkDir, refreshedLayoutChunkName),
)

let server = fs.readFileSync(serverPath, 'utf8')

server = replaceExact(
  server,
  "X-Lien-Customer-Experience', 'v507",
  "X-Lien-Customer-Experience', 'v508",
  1,
  'customer experience readiness header',
)

const oldTransform = `const CUSTOMER_EXPERIENCE_BOOTSTRAP_V507 = '<script>(self.__next_f=self.__next_f||[]).push([0]);self.__next_f.push([2,null])'
const CUSTOMER_EXPERIENCE_LOADER_V507 = ';(()=>{if(window.__orimiaCustomerLoaderV507)return;window.__orimiaCustomerLoaderV507=true;const load=()=>{if(!document.getElementById("customer-experience-style-v507")){const link=document.createElement("link");link.id="customer-experience-style-v507";link.rel="stylesheet";link.href="/customer-experience-v507.css?v=507";document.head.append(link)}if(!document.getElementById("customer-experience-script-v507")){const script=document.createElement("script");script.id="customer-experience-script-v507";script.src="/customer-experience-v507.js?v=507";script.async=true;document.body.append(script)}};if(document.readyState==="complete")window.setTimeout(load,0);else window.addEventListener("load",load,{once:true})})()'
const CUSTOMER_REACT_CHUNK_V507 = '/_next/static/chunks/fd9d1056-1a7295bc74a0a1bb.js'
const CUSTOMER_REACT_DIAGNOSTIC_CHUNK_V507 = '/_next/static/chunks/fd9d1056-1a7295bc74a0a1bb.orimia-v507.js'

function transformOrimiaHtmlV500(html, requestUrl) { /* customer-experience-v507 */
  let output = String(html || '')
  const pathname = String(requestUrl || '').split('?')[0]
  if (!pathname.startsWith('/u/')) return output
  if (!output.includes('__orimiaCustomerLoaderV507') && output.includes(CUSTOMER_EXPERIENCE_BOOTSTRAP_V507)) {
    output = output.replace(CUSTOMER_EXPERIENCE_BOOTSTRAP_V507, CUSTOMER_EXPERIENCE_BOOTSTRAP_V507 + CUSTOMER_EXPERIENCE_LOADER_V507)
  }
  if (pathname === '/u/appointments') {
    output = output.split(CUSTOMER_REACT_CHUNK_V507).join(CUSTOMER_REACT_DIAGNOSTIC_CHUNK_V507)
  }
  return output
}`

const newTransform = `const CUSTOMER_EXPERIENCE_BOOTSTRAP_V508 = '<script>(self.__next_f=self.__next_f||[]).push([0]);self.__next_f.push([2,null])'
const CUSTOMER_EXPERIENCE_LOADER_V508 = ';(()=>{if(window.__orimiaCustomerLoaderV508)return;window.__orimiaCustomerLoaderV508=true;const load=()=>{if(!document.getElementById("customer-experience-style-v508")){const link=document.createElement("link");link.id="customer-experience-style-v508";link.rel="stylesheet";link.href="/customer-experience-v508.css?v=508";document.head.append(link)}if(!document.getElementById("customer-experience-script-v508")){const script=document.createElement("script");script.id="customer-experience-script-v508";script.src="/customer-experience-v508.js?v=508";script.async=true;document.body.append(script)}};if(document.readyState==="complete")window.setTimeout(load,0);else window.addEventListener("load",load,{once:true})})()'
const CUSTOMER_LAYOUT_CHUNK_V508 = 'static/chunks/app/u/(account)/${layoutChunkName}'
const CUSTOMER_LAYOUT_REFRESHED_CHUNK_V508 = 'static/chunks/app/u/(account)/${refreshedLayoutChunkName}'

function transformOrimiaHtmlV500(html, requestUrl) { /* customer-experience-v508 */
  let output = String(html || '')
  const pathname = String(requestUrl || '').split('?')[0]
  if (!pathname.startsWith('/u/')) return output
  if (!output.includes('__orimiaCustomerLoaderV508') && output.includes(CUSTOMER_EXPERIENCE_BOOTSTRAP_V508)) {
    output = output.replace(CUSTOMER_EXPERIENCE_BOOTSTRAP_V508, CUSTOMER_EXPERIENCE_BOOTSTRAP_V508 + CUSTOMER_EXPERIENCE_LOADER_V508)
  }
  output = output.split(CUSTOMER_LAYOUT_CHUNK_V508).join(CUSTOMER_LAYOUT_REFRESHED_CHUNK_V508)
  return output
}`

server = replaceExact(server, oldTransform, newTransform, 1, 'cache-safe customer asset loader')
server = replaceExact(
  server,
  'customer-experience-v507',
  'customer-experience-v508',
  4,
  'customer experience asset routes',
)

fs.writeFileSync(serverPath, server)
console.log('[customer-experience-v508] runtime patched')
