import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const patchRoot = path.dirname(fileURLToPath(import.meta.url))
const serverPath = path.join(root, 'server.js')
const reactChunkName = 'fd9d1056-1a7295bc74a0a1bb.js'
const diagnosticChunkName = 'fd9d1056-1a7295bc74a0a1bb.orimia-v507.js'
const reactChunkPath = path.join(root, '.next', 'static', 'chunks', reactChunkName)
const diagnosticChunkPath = path.join(root, '.next', 'static', 'chunks', diagnosticChunkName)

function replaceExact(source, before, after, expected, label) {
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  return source.split(before).join(after)
}

for (const fileName of ['customer-experience-v507.js', 'customer-experience-v507.css']) {
  fs.copyFileSync(path.join(patchRoot, fileName), path.join(root, fileName))
}

const hydrationCheck = 'function sq(e,t,n){if(t=sH(t),sH(e)!==t&&n)throw Error(i(425))}'
const diagnosticHydrationCheck = 'function sq(e,t,n){if(t=sH(t),sH(e)!==t&&n){console.error("[ORIMIA_HYDRATION_DIFF]",JSON.stringify({actual:e,expected:t}));throw Error(i(425))}}'
const reactChunk = replaceExact(
  fs.readFileSync(reactChunkPath, 'utf8'),
  hydrationCheck,
  diagnosticHydrationCheck,
  1,
  'React text hydration diagnostic',
)
fs.writeFileSync(diagnosticChunkPath, reactChunk)

let server = fs.readFileSync(serverPath, 'utf8')

server = replaceExact(
  server,
  "X-Lien-Customer-Experience', 'v506",
  "X-Lien-Customer-Experience', 'v507",
  1,
  'customer experience readiness header',
)

const oldTransform = `const CUSTOMER_EXPERIENCE_BOOTSTRAP_V506 = '<script>(self.__next_f=self.__next_f||[]).push([0]);self.__next_f.push([2,null])'
const CUSTOMER_EXPERIENCE_LOADER_V506 = ';(()=>{if(window.__orimiaCustomerLoaderV506)return;window.__orimiaCustomerLoaderV506=true;const load=()=>{if(!document.getElementById("customer-experience-style-v506")){const link=document.createElement("link");link.id="customer-experience-style-v506";link.rel="stylesheet";link.href="/customer-experience-v506.css?v=506";document.head.append(link)}if(!document.getElementById("customer-experience-script-v506")){const script=document.createElement("script");script.id="customer-experience-script-v506";script.src="/customer-experience-v506.js?v=506";script.async=true;document.body.append(script)}};if(document.readyState==="complete")window.setTimeout(load,0);else window.addEventListener("load",load,{once:true})})()'

function transformOrimiaHtmlV500(html, requestUrl) { /* customer-experience-v506 */
  const output = String(html || '')
  const pathname = String(requestUrl || '').split('?')[0]
  if (!pathname.startsWith('/u/') || output.includes('__orimiaCustomerLoaderV506')) return output
  if (!output.includes(CUSTOMER_EXPERIENCE_BOOTSTRAP_V506)) return output
  return output.replace(CUSTOMER_EXPERIENCE_BOOTSTRAP_V506, CUSTOMER_EXPERIENCE_BOOTSTRAP_V506 + CUSTOMER_EXPERIENCE_LOADER_V506)
}`

const newTransform = `const CUSTOMER_EXPERIENCE_BOOTSTRAP_V507 = '<script>(self.__next_f=self.__next_f||[]).push([0]);self.__next_f.push([2,null])'
const CUSTOMER_EXPERIENCE_LOADER_V507 = ';(()=>{if(window.__orimiaCustomerLoaderV507)return;window.__orimiaCustomerLoaderV507=true;const load=()=>{if(!document.getElementById("customer-experience-style-v507")){const link=document.createElement("link");link.id="customer-experience-style-v507";link.rel="stylesheet";link.href="/customer-experience-v507.css?v=507";document.head.append(link)}if(!document.getElementById("customer-experience-script-v507")){const script=document.createElement("script");script.id="customer-experience-script-v507";script.src="/customer-experience-v507.js?v=507";script.async=true;document.body.append(script)}};if(document.readyState==="complete")window.setTimeout(load,0);else window.addEventListener("load",load,{once:true})})()'
const CUSTOMER_REACT_CHUNK_V507 = '/_next/static/chunks/${reactChunkName}'
const CUSTOMER_REACT_DIAGNOSTIC_CHUNK_V507 = '/_next/static/chunks/${diagnosticChunkName}'

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

server = replaceExact(server, oldTransform, newTransform, 1, 'diagnostic customer asset loader')
server = replaceExact(
  server,
  'customer-experience-v506',
  'customer-experience-v507',
  4,
  'customer experience asset routes',
)

fs.writeFileSync(serverPath, server)
console.log('[customer-experience-v507] runtime patched')
