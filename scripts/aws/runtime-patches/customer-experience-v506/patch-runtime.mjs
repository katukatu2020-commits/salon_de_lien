import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const patchRoot = path.dirname(fileURLToPath(import.meta.url))
const serverPath = path.join(root, 'server.js')

function replaceExact(source, before, after, expected, label) {
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  return source.split(before).join(after)
}

for (const fileName of ['customer-experience-v506.js', 'customer-experience-v506.css']) {
  fs.copyFileSync(path.join(patchRoot, fileName), path.join(root, fileName))
}

let server = fs.readFileSync(serverPath, 'utf8')

server = replaceExact(
  server,
  "X-Lien-Customer-Experience', 'v505",
  "X-Lien-Customer-Experience', 'v506",
  1,
  'customer experience readiness header',
)

const oldTransform = `const CUSTOMER_EXPERIENCE_HEAD_V504 = '<link id="customer-experience-style-v505" rel="stylesheet" href="/customer-experience-v505.css?v=505">'
const CUSTOMER_EXPERIENCE_BODY_V504 = '<script id="customer-experience-script-v505" src="/customer-experience-v505.js?v=505" defer></script>'

function transformOrimiaHtmlV500(html, requestUrl) { /* customer-experience-v505 */
  let output = String(html || '')
  const pathname = String(requestUrl || '').split('?')[0]
  if (!pathname.startsWith('/u/')) return output
  if (!output.includes('customer-experience-style-v505')) output = output.replace('</head>', CUSTOMER_EXPERIENCE_HEAD_V504 + '</head>')
  if (!output.includes('customer-experience-script-v505')) output = output.replace('</body>', CUSTOMER_EXPERIENCE_BODY_V504 + '</body>')
  return output
}`

const newTransform = `const CUSTOMER_EXPERIENCE_BOOTSTRAP_V506 = '<script>(self.__next_f=self.__next_f||[]).push([0]);self.__next_f.push([2,null])'
const CUSTOMER_EXPERIENCE_LOADER_V506 = ';(()=>{if(window.__orimiaCustomerLoaderV506)return;window.__orimiaCustomerLoaderV506=true;const load=()=>{if(!document.getElementById("customer-experience-style-v506")){const link=document.createElement("link");link.id="customer-experience-style-v506";link.rel="stylesheet";link.href="/customer-experience-v506.css?v=506";document.head.append(link)}if(!document.getElementById("customer-experience-script-v506")){const script=document.createElement("script");script.id="customer-experience-script-v506";script.src="/customer-experience-v506.js?v=506";script.async=true;document.body.append(script)}};if(document.readyState==="complete")window.setTimeout(load,0);else window.addEventListener("load",load,{once:true})})()'

function transformOrimiaHtmlV500(html, requestUrl) { /* customer-experience-v506 */
  const output = String(html || '')
  const pathname = String(requestUrl || '').split('?')[0]
  if (!pathname.startsWith('/u/') || output.includes('__orimiaCustomerLoaderV506')) return output
  if (!output.includes(CUSTOMER_EXPERIENCE_BOOTSTRAP_V506)) return output
  return output.replace(CUSTOMER_EXPERIENCE_BOOTSTRAP_V506, CUSTOMER_EXPERIENCE_BOOTSTRAP_V506 + CUSTOMER_EXPERIENCE_LOADER_V506)
}`

server = replaceExact(server, oldTransform, newTransform, 1, 'hydration-safe customer asset loader')
server = replaceExact(
  server,
  'customer-experience-v505',
  'customer-experience-v506',
  4,
  'customer experience asset routes',
)

fs.writeFileSync(serverPath, server)
console.log('[customer-experience-v506] runtime patched')
