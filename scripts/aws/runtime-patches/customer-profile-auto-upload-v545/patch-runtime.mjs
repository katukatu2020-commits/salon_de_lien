import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const patchRoot = path.dirname(fileURLToPath(import.meta.url))
const serverPath = path.join(root, 'server.js')
const experiencePath = path.join(root, 'customer-experience-v503.js')
const cropperPath = path.join(root, 'customer-link-ui-v424.js')
const sharedCropperPath = path.join(root, 'customer-link-ui-v293.js')
const customerRuntimePath = path.join(root, 'customer-runtime-v267.js')
const profileCropperPath = path.join(root, 'public', 'customer-profile-image-v401.js')
const customerChunkRoot = path.join(root, '.next', 'static', 'chunks', 'app', 'u', '(account)')
const marker = 'customer-profile-auto-upload-v545'

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

function replaceNextReferences(nextRoot, before, after) {
  let references = 0
  for (const file of collectFiles(nextRoot)) {
    const source = fs.readFileSync(file, 'utf8')
    const count = source.split(before).length - 1
    if (!count) continue
    fs.writeFileSync(file, source.split(before).join(after))
    references += count
  }
  if (!references) throw new Error('profile page chunk cache revision: no references were updated')
  return references
}

let experience = fs.readFileSync(experiencePath, 'utf8')
if (experience.includes(marker)) throw new Error(`${marker}: patch already applied`)
experience = replaceExact(
  experience,
  '/customer-link-ui-v424.js?v=424-1',
  '/customer-link-ui-v424.js?v=545-auto-profile1',
  1,
  'injected cropper cache revision',
)
experience = replaceExact(
  experience,
  "      if (location.pathname.includes('/community')) return",
  "      if (location.pathname === '/u/profile' && input.name === 'profileImage') { input.setCustomValidity(''); return }\n      if (location.pathname.includes('/community')) return",
  1,
  'profile cropper square-validation ownership',
)
const addition = fs.readFileSync(path.join(patchRoot, `${marker}.js`), 'utf8')
experience += `\n\n${addition.trim()}\n`

let cropper = fs.readFileSync(cropperPath, 'utf8')
cropper = replaceExact(
  cropper,
  "    return location.pathname === '/u/profile' || location.pathname === '/admin/settings' || location.pathname === '/admin/account' || location.pathname.includes('staffManagement') || /icon|avatar|profile/i.test(`${input.name} ${input.id} ${input.getAttribute('aria-label') || ''}`)",
  "    if (location.pathname === '/u/profile') return false\n    return location.pathname === '/admin/settings' || location.pathname === '/admin/account' || location.pathname.includes('staffManagement') || /icon|avatar|profile/i.test(`${input.name} ${input.id} ${input.getAttribute('aria-label') || ''}`)",
  1,
  'dedicated customer profile cropper ownership',
)
cropper = replaceExact(
  cropper,
  "        toast('正方形にトリミングしました。保存ボタンで確定してください。')",
  "        if (!(location.pathname === '/u/profile' && input.name === 'profileImage')) {\n          toast('正方形にトリミングしました。保存ボタンで確定してください。')\n        }",
  1,
  'profile crop completion message',
)

let sharedCropper = fs.readFileSync(sharedCropperPath, 'utf8')
sharedCropper = replaceExact(
  sharedCropper,
  "    return location.pathname === '/u/profile' || location.pathname === '/admin/settings' || location.pathname === '/admin/account' || location.pathname.includes('staffManagement') || /icon|avatar|profile/i.test(`${input.name} ${input.id} ${input.getAttribute('aria-label') || ''}`)",
  "    if (location.pathname === '/u/profile') return false\n    return location.pathname === '/admin/settings' || location.pathname === '/admin/account' || location.pathname.includes('staffManagement') || /icon|avatar|profile/i.test(`${input.name} ${input.id} ${input.getAttribute('aria-label') || ''}`)",
  1,
  'active shared cropper profile exclusion',
)

let customerRuntime = fs.readFileSync(customerRuntimePath, 'utf8')
customerRuntime = replaceExact(
  customerRuntime,
  '/customer-link-ui-v293.js?v=293-4',
  '/customer-link-ui-v293.js?v=545-auto-profile1',
  1,
  'active shared cropper cache revision',
)
customerRuntime += `\n/* ${marker} */\n`

let profileCropper = fs.readFileSync(profileCropperPath, 'utf8')
profileCropper = replaceExact(
  profileCropper,
  "    input.addEventListener('change', () => {\n      if (input.dataset.lienCroppedV401 === '1') {",
  "    input.addEventListener('change', (event) => {\n      event.stopPropagation()\n      if (input.dataset.lienCroppedV401 === '1') {",
  1,
  'profile cropper owns the file change lifecycle',
)
profileCropper = replaceExact(
  profileCropper,
  "        input.dispatchEvent(new Event('change', { bubbles: true }))",
  "        input.dispatchEvent(new CustomEvent('orimia:customer-profile-crop-ready-v545', { detail: { file: cropped } }))\n        input.dispatchEvent(new Event('change', { bubbles: true }))",
  1,
  'profile crop auto-upload event',
)
profileCropper += `\n/* ${marker} */\n`
fs.writeFileSync(profileCropperPath, profileCropper)

const oldProfileChunk = 'page-profile-code-v267.js'
const newProfileChunk = 'page-profile-code-v267.auto-upload-v545.js'
const profileChunkRoot = path.join(customerChunkRoot, 'profile')
const oldProfileChunkPath = path.join(profileChunkRoot, oldProfileChunk)
const newProfileChunkPath = path.join(profileChunkRoot, newProfileChunk)
let profileChunk = fs.readFileSync(oldProfileChunkPath, 'utf8')
profileChunk = replaceExact(
  profileChunk,
  '/customer-runtime-v267.js?v=20260817-267',
  '/customer-runtime-v267.js?v=545-auto-profile1',
  1,
  'customer profile runtime cache revision',
)
profileChunk = replaceExact(
  profileChunk,
  '/customer-profile-image-v401.js?v=20260823-401',
  '/customer-profile-image-v401.js?v=545-auto-profile1',
  1,
  'dedicated profile cropper cache revision',
)
fs.writeFileSync(oldProfileChunkPath, profileChunk)
fs.writeFileSync(newProfileChunkPath, `${profileChunk}\n/* ${marker} */\n`)
const profileChunkReferences = replaceNextReferences(path.join(root, '.next'), oldProfileChunk, newProfileChunk)

const existingCustomerChunks = [
  'layout-customer-mobile-nav-v425.js',
  'layout-customer-mobile-nav-v425.orimia-v508.js',
  'layout-customer-mobile-nav-v425.orimia-v518.js',
]
for (const name of existingCustomerChunks) {
  const chunkPath = path.join(customerChunkRoot, name)
  let chunk = fs.readFileSync(chunkPath, 'utf8')
  chunk = replaceExact(
    chunk,
    '/customer-experience-v503.js?v=503',
    '/customer-experience-v503.js?v=545-auto-profile1',
    1,
    `${name} customer experience cache revision`,
  )
  fs.writeFileSync(chunkPath, chunk)
}
const refreshedCustomerChunk = 'layout-customer-mobile-nav-v425.profile-v545.js'
const refreshedCustomerChunkPath = path.join(customerChunkRoot, refreshedCustomerChunk)
const refreshedCustomerSource = `${fs.readFileSync(path.join(customerChunkRoot, existingCustomerChunks[2]), 'utf8')}\n/* ${marker} */\n`
fs.writeFileSync(refreshedCustomerChunkPath, refreshedCustomerSource)

let server = fs.readFileSync(serverPath, 'utf8')
server = replaceExact(
  server,
  '/customer-experience-v503.js?v=529-release1',
  '/customer-experience-v503.js?v=545-auto-profile1',
  2,
  'customer experience cache revision',
)
server = replaceExact(
  server,
  '/customer-link-ui-v424.js?v=424-1',
  '/customer-link-ui-v424.js?v=545-auto-profile1',
  2,
  'customer cropper cache revision',
)
server = replaceExact(
  server,
  `const CUSTOMER_LAYOUT_REFRESHED_CHUNK_V508 = 'static/chunks/app/u/(account)/layout-customer-mobile-nav-v425.orimia-v518.js'`,
  `const CUSTOMER_LAYOUT_REFRESHED_CHUNK_V508 = 'static/chunks/app/u/(account)/${refreshedCustomerChunk}'`,
  1,
  'customer account layout cache revision',
)
const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Registration-Single-Loader', 'v544') /* customer-registration-single-loader-v544 */`
server = replaceExact(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Profile-Auto-Upload', 'v545') /* ${marker} */`,
  1,
  'profile auto-upload readiness marker',
)
server += `\n/* ${marker} */\n`

fs.writeFileSync(experiencePath, experience)
fs.writeFileSync(cropperPath, cropper)
fs.writeFileSync(sharedCropperPath, sharedCropper)
fs.writeFileSync(customerRuntimePath, customerRuntime)
fs.writeFileSync(serverPath, server)

console.log(JSON.stringify({ release: marker, profileChunkReferences, patched: true }))
