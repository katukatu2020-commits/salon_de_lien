import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(process.argv[2] || '/app')
const files = {
  messagePage: '.next/static/chunks/app/u/(account)/messages/page-02f2b7a47700a9dc.js',
  customerLayout: '.next/static/chunks/app/u/(account)/layout-1c1963f4f2eb1b14.unified-reservation-chat.premium-mobile-v29.customer-home-unified-v35.customer-shell-chat-v36.notification-badge-v44.navigation-v45.customer-native-v82.customer-shell-v91.navigation-v86.customer-experience-v278.js',
  chatHelper: 'ui-workflows-v294.js',
  appBuildManifest: '.next/app-build-manifest.json',
  messageClientManifest: '.next/server/app/u/(account)/messages/page_client-reference-manifest.js',
}

const expectedHashes = {
  [files.messagePage]: '1f3947c0734033723e1ec2ba371091553bb506932621ade8830d7f2f7f664b35',
  [files.customerLayout]: '5cd2d2697fd582e62c50eeb9af3a090d40fef85b080bc1e8a40948d270b6ae37',
  [files.chatHelper]: '51b4bbaf282d9c876cd47b743d167f792e51117b77435313604d0eb9cdddc921',
  [files.appBuildManifest]: '330d64f219fdf66048f4e69fe3d5be69648601c8f79cec30c4b0ab07dcf568d6',
  [files.messageClientManifest]: 'c9072310418ea82b2ba8962635de595acc42d602ebe8bc402b4ec1d73b499180',
}

function digest(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function readChecked(name) {
  const target = path.join(root, name)
  const source = fs.readFileSync(target, 'utf8')
  const actual = digest(source)
  if (actual !== expectedHashes[name]) {
    throw new Error(`Release 295 parent mismatch: ${name} expected ${expectedHashes[name]}, received ${actual}`)
  }
  return source
}

function replaceExpected(source, before, after, expectedCount, label) {
  const actualCount = source.split(before).length - 1
  if (actualCount !== expectedCount) {
    throw new Error(`Release 295 marker count mismatch: ${label} expected ${expectedCount}, received ${actualCount}`)
  }
  return source.split(before).join(after)
}

const oldBasename = path.basename(files.messagePage)
const newBasename = oldBasename.replace('.js', '.staff-directory-v295.js')
const newPath = path.join(path.dirname(files.messagePage), newBasename)
let messagePage = readChecked(files.messagePage)
messagePage += `\n;(()=>{if(document.querySelector('script[data-lien-ui-workflows-v294]'))return;const script=document.createElement('script');script.src='/ui-workflows-v294.js?v=295-2';script.defer=true;script.dataset.lienUiWorkflowsV294='1';document.head.appendChild(script)})()\n`
fs.writeFileSync(path.join(root, newPath), messagePage, 'utf8')

let chatHelper = readChecked(files.chatHelper)
chatHelper = replaceExpected(
  chatHelper,
  '.lien-chat-v294__sidebar{border-right:',
  '.lien-chat-v294 .lien-chat-v294__sidebar{display:block!important;border-right:',
  2,
  'customer chat sidebar visibility',
)
chatHelper = replaceExpected(
  chatHelper,
  '<aside class="lien-chat-v294__sidebar">',
  '<section class="lien-chat-v294__sidebar" aria-label="相談するスタッフ">',
  1,
  'customer chat staff directory element',
)
chatHelper = replaceExpected(
  chatHelper,
  '</aside><section class="lien-chat-v294__conversation">',
  '</section><section class="lien-chat-v294__conversation">',
  1,
  'customer chat staff directory closing element',
)
fs.writeFileSync(path.join(root, files.chatHelper), chatHelper, 'utf8')

const oldLayoutBasename = path.basename(files.customerLayout)
const newLayoutBasename = 'layout-chat-v295-4.js'
const newLayoutPath = path.join(path.dirname(files.customerLayout), newLayoutBasename)
let customerLayout = readChecked(files.customerLayout)
customerLayout += `\n;(()=>{if(location.pathname!=='/u/chat'||document.querySelector('script[data-lien-ui-workflows-v294]'))return;const script=document.createElement('script');script.src='/ui-workflows-v294.js?v=295-2';script.defer=true;script.dataset.lienUiWorkflowsV294='1';document.head.appendChild(script)})()\n`
fs.writeFileSync(path.join(root, newLayoutPath), customerLayout, 'utf8')

function collectFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name)
    return entry.isDirectory() ? collectFiles(target) : [target]
  })
}

const expectedLayoutManifests = [
  '.next/app-build-manifest.json',
  '.next/server/app/u/(account)/appointments/page_client-reference-manifest.js',
  '.next/server/app/u/(account)/community/[postId]/page_client-reference-manifest.js',
  '.next/server/app/u/(account)/community/page_client-reference-manifest.js',
  '.next/server/app/u/(account)/history/page_client-reference-manifest.js',
  '.next/server/app/u/(account)/home/page_client-reference-manifest.js',
  '.next/server/app/u/(account)/messages/page_client-reference-manifest.js',
  '.next/server/app/u/(account)/points/page_client-reference-manifest.js',
  '.next/server/app/u/(account)/profile/page_client-reference-manifest.js',
  '.next/server/app/u/(account)/reviews/[reviewRequestId]/page_client-reference-manifest.js',
  '.next/server/app/u/(account)/reviews/page_client-reference-manifest.js',
  '.next/server/app/u/[token]/appointments/confirm/[appointmentId]/page_client-reference-manifest.js',
  '.next/server/app/u/[token]/care/page_client-reference-manifest.js',
  '.next/server/app/u/[token]/feedback/page_client-reference-manifest.js',
  '.next/server/app/u/[token]/intake/page_client-reference-manifest.js',
  '.next/server/app/u/[token]/page_client-reference-manifest.js',
  '.next/server/app/u/[token]/proposals/[proposalId]/page_client-reference-manifest.js',
  '.next/server/app/u/[token]/review/product/[reviewToken]/page_client-reference-manifest.js',
  '.next/server/app/u/login/page_client-reference-manifest.js',
  '.next/server/app/u/password-reset/[token]/page_client-reference-manifest.js',
  '.next/server/app/u/password-reset/page_client-reference-manifest.js',
  '.next/server/app/u/register/[token]/page_client-reference-manifest.js',
  '.next/server/app/u/register/page_client-reference-manifest.js',
  '.next/server/app/u/register/thanks/page_client-reference-manifest.js',
].sort()

const layoutManifests = collectFiles(path.join(root, '.next'))
  .filter((target) => {
    if (target.endsWith(oldLayoutBasename) || target.endsWith(newLayoutBasename)) return false
    if (!target.endsWith('.json') && !target.endsWith('.js')) return false
    return fs.readFileSync(target, 'utf8').includes(oldLayoutBasename)
  })
  .map((target) => path.relative(root, target).split(path.sep).join('/'))
  .sort()

if (JSON.stringify(layoutManifests) !== JSON.stringify(expectedLayoutManifests)) {
  throw new Error(`Release 295 layout manifest set mismatch:\n${layoutManifests.join('\n')}`)
}

for (const manifestName of layoutManifests) {
  let source = fs.readFileSync(path.join(root, manifestName), 'utf8')
  source = replaceExpected(source, oldLayoutBasename, newLayoutBasename, 1, `${manifestName} layout cache bust`)
  if (manifestName === files.appBuildManifest || manifestName === files.messageClientManifest) {
    source = replaceExpected(source, oldBasename, newBasename, 1, `${manifestName} chat cache bust`)
  }
  fs.writeFileSync(path.join(root, manifestName), source, 'utf8')
}

console.log('Release 295 customer chat loader applied.')
