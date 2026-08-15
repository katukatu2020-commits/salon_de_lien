'use strict'

const fs = require('fs')
const path = require('path')
const appRoot = process.env.APP_ROOT || '/app'
const nextRoot = path.join(appRoot, '.next')
const oldMarker = 'admin-header-settings-v129'
const marker = 'admin-header-settings-v130'

function walk(root) {
  if (!fs.existsSync(root)) return []
  return fs.readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(root, entry.name)
    return entry.isDirectory() ? walk(target) : [target]
  })
}

function updateHelperUrls(source) {
  return source
    .replaceAll('/commercial-admin-v129.js?v=20260815-129', '/commercial-admin-v130.js?v=20260815-130')
    .replaceAll('/tenant-setup-client.js?v=20260815-129', '/tenant-setup-client.js?v=20260815-130')
}

function replaceReferences(root, oldName, newName, excludedFile) {
  let count = 0
  for (const file of walk(root)) {
    if (file === excludedFile || !/\.(?:js|json|html)$/.test(file)) continue
    const source = fs.readFileSync(file, 'utf8')
    if (!source.includes(oldName)) continue
    fs.writeFileSync(file, source.replaceAll(oldName, newName))
    count += 1
  }
  return count
}

function patchRuntimeCache() {
  const layoutRoot = path.join(nextRoot, 'static', 'chunks', 'app')
  const layouts = walk(layoutRoot).filter(file => file.endsWith('.js') && fs.readFileSync(file, 'utf8').includes(oldMarker))
  if (layouts.length !== 1) throw new Error(`expected one active v129 admin layout, found ${layouts.length}`)
  const oldFile = layouts[0]
  const oldName = path.basename(oldFile)
  let layoutSource = updateHelperUrls(fs.readFileSync(oldFile, 'utf8'))
  if (!layoutSource.includes('/commercial-admin-v130.js?v=20260815-130') || !layoutSource.includes('/tenant-setup-client.js?v=20260815-130')) throw new Error('v130 helper URLs missing')
  if (!layoutSource.includes(marker)) layoutSource += `\n/* ${marker} */\n`
  new Function(layoutSource)
  const newName = oldName.replace(/\.tenant-runtime-v129\.js$/, '.tenant-runtime-v130.js')
  if (newName === oldName) throw new Error(`unexpected v129 layout name: ${oldName}`)
  const newFile = path.join(path.dirname(oldFile), newName)
  fs.writeFileSync(newFile, layoutSource)
  fs.unlinkSync(oldFile)
  const referencesPatched = replaceReferences(nextRoot, oldName, newName, newFile)
  if (referencesPatched < 1) throw new Error('admin layout references were not cache-busted')
  const serverTargets = walk(path.join(nextRoot, 'server')).filter(file => file.endsWith('.js') && fs.readFileSync(file, 'utf8').includes(oldMarker))
  if (serverTargets.length !== 1) throw new Error(`expected one v129 server shell, found ${serverTargets.length}`)
  let serverSource = updateHelperUrls(fs.readFileSync(serverTargets[0], 'utf8'))
  if (!serverSource.includes(marker)) serverSource += `\n/* ${marker} */\n`
  new Function(serverSource)
  fs.writeFileSync(serverTargets[0], serverSource)
  return { marker, oldName, newName, referencesPatched, serverFile: path.relative(appRoot, serverTargets[0]) }
}

if (require.main === module) console.log(JSON.stringify(patchRuntimeCache()))
module.exports = { updateHelperUrls, patchRuntimeCache }
