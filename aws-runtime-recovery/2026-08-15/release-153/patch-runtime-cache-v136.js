'use strict'

const fs = require('fs')
const path = require('path')
const appRoot = process.env.APP_ROOT || '/app'
const nextRoot = path.join(appRoot, '.next')
const oldMarker = 'commercial-sidebar-v135'
const marker = 'admin-theme-and-modal-v153'
const themeBootstrap = 'try{document.documentElement.dataset.caTheme=localStorage.getItem("salon-lien:admin-theme")==="dark"?"dark":"pink"}catch{};'

function walk(root) {
  if (!fs.existsSync(root)) return []
  return fs.readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(root, entry.name)
    return entry.isDirectory() ? walk(target) : [target]
  })
}

function updateHelperUrls(source) {
  return source
    .replaceAll('/commercial-admin-v130.js?v=20260815-130', '/commercial-admin-v136.js?v=20260815-153')
    .replaceAll('/tenant-setup-client.js?v=20260815-135', '/tenant-setup-client.js?v=20260815-153')
    .replace("const schedule=()=>window.setTimeout(loadAdminRuntime,1800)\n  if(document.readyState==='complete')schedule()\n  else window.addEventListener('load',schedule,{once:true})", "const schedule=()=>window.requestAnimationFrame(loadAdminRuntime)\n  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true})\n  else schedule()")
}

function addThemeBootstrap(source) {
  return source.includes(themeBootstrap) ? source : `${themeBootstrap}\n${source}`
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
  if (layouts.length !== 1) throw new Error(`expected one active v135 admin layout, found ${layouts.length}`)
  const oldFile = layouts[0]
  const oldName = path.basename(oldFile)
  let layoutSource = addThemeBootstrap(updateHelperUrls(fs.readFileSync(oldFile, 'utf8')))
  if (!layoutSource.includes('/commercial-admin-v136.js?v=20260815-153') || !layoutSource.includes('/tenant-setup-client.js?v=20260815-153')) throw new Error('v153 helper URLs missing')
  if (!layoutSource.includes(themeBootstrap)) throw new Error('v153 pre-paint theme bootstrap missing')
  if (!layoutSource.includes("document.addEventListener('DOMContentLoaded',schedule") || layoutSource.includes('setTimeout(loadAdminRuntime,1800)')) throw new Error('v153 immediate runtime loader missing')
  if (!layoutSource.includes(marker)) layoutSource += `\n/* ${marker} */\n`
  new Function(layoutSource)
  const newName = oldName.replace(/\.tenant-runtime-v135\.js$/, '.tenant-runtime-v153.js')
  if (newName === oldName) throw new Error(`unexpected v135 layout name: ${oldName}`)
  const newFile = path.join(path.dirname(oldFile), newName)
  fs.writeFileSync(newFile, layoutSource)
  fs.unlinkSync(oldFile)
  const referencesPatched = replaceReferences(nextRoot, oldName, newName, newFile)
  if (referencesPatched < 1) throw new Error('admin layout references were not cache-busted')
  const serverTargets = walk(path.join(nextRoot, 'server')).filter(file => file.endsWith('.js') && fs.readFileSync(file, 'utf8').includes(oldMarker))
  if (serverTargets.length !== 1) throw new Error(`expected one v135 server shell, found ${serverTargets.length}`)
  let serverSource = updateHelperUrls(fs.readFileSync(serverTargets[0], 'utf8'))
  if (!serverSource.includes(marker)) serverSource += `\n/* ${marker} */\n`
  new Function(serverSource)
  fs.writeFileSync(serverTargets[0], serverSource)
  return { marker, oldName, newName, referencesPatched, serverFile: path.relative(appRoot, serverTargets[0]) }
}

if (require.main === module) console.log(JSON.stringify(patchRuntimeCache()))
module.exports = { updateHelperUrls, addThemeBootstrap, themeBootstrap, patchRuntimeCache }
