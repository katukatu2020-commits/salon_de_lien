import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const nextRoot = path.join(root, '.next')
const oldName = 'layout-runtime-v450.js'
const newName = 'layout-runtime-v502.js'
const chunk = fs.readFileSync(path.join(nextRoot, 'static', 'chunks', 'app', newName), 'utf8')
assert.match(chunk, /store-app-stability-v502-inline/)
assert.match(chunk, /window\.__storeAppStabilityV501/)
assert.match(chunk, /window\.__orimiaBrandV501/)
assert.match(chunk, /DOMContentLoaded/)
assert.doesNotMatch(chunk, /store-app-stability-v501-loader/)

for (const publicFile of ['orimia-brand-v501.js', 'store-app-stability-v501.js']) {
  const source = fs.readFileSync(path.join(root, 'public', publicFile), 'utf8')
  assert.match(source, /DOMContentLoaded/)
  assert.doesNotMatch(source, /window\.addEventListener\('load', startAfterHydration/)
}
const commercial = fs.readFileSync(path.join(root, 'commercial-admin-v101.js'), 'utf8')
assert.match(commercial, /store-app-stability-v502: hydrate without waiting for images/)
assert.match(commercial, /DOMContentLoaded/)

const appManifest = fs.readFileSync(path.join(nextRoot, 'app-build-manifest.json'), 'utf8')
assert.ok(appManifest.includes(newName))
assert.ok(!appManifest.includes(oldName))

let manifestCount = 0
function verifyManifests(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) verifyManifests(fullPath)
    else if (entry.name.endsWith('_client-reference-manifest.js')) {
      const source = fs.readFileSync(fullPath, 'utf8')
      if (!source.includes(newName)) continue
      assert.ok(!source.includes(oldName), `${fullPath} still references ${oldName}`)
      manifestCount += 1
    }
  }
}
verifyManifests(path.join(nextRoot, 'server', 'app'))
assert.ok(manifestCount >= 20, `only ${manifestCount} client manifests use the v502 chunk`)

const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
assert.ok(server.includes("X-Lien-Store-App-Stability', 'v501'"))
assert.ok(server.includes("X-Lien-Store-App-Cache-Activation', 'v502'"))
assert.equal((server.match(/X-Lien-Store-App-Cache-Activation/g) || []).length, 1)

console.log(`store app cache activation v502 verified across ${manifestCount} client manifests`)
