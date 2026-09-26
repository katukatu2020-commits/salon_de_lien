import fs from 'node:fs'
import path from 'node:path'
import { patchLegacyClient, patchServer, marker } from './runtime-transform.mjs'
const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const edit = (file, transform) => {
  const target = path.join(root, file)
  fs.writeFileSync(target, transform(fs.readFileSync(target, 'utf8')))
}
edit('public/content-edit-delete-client-v615.js', patchLegacyClient)
edit('server.js', patchServer)
edit('public/style-admin-controls-v618.css', source => source + '\n' + fs.readFileSync(new URL('./style-mobile-stability-v676.css', import.meta.url), 'utf8'))
// Refresh the legacy asset URL in server-rendered markup and the shared loader.
let refreshed = 0
function refresh(directory) {
  for (const entry of fs.readdirSync(path.join(root, directory), { withFileTypes: true })) {
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) refresh(file)
    else if (entry.name.endsWith('.js')) edit(file, source => {
      const before = '/content-edit-delete-client-v615.js?v=596'
      refreshed += source.split(before).length - 1
      return source.split(before).join('/content-edit-delete-client-v615.js?v=676-owner1')
    })
  }
}
refresh('.next/server')
if (!refreshed) throw new Error('No legacy asset references refreshed')
console.log(JSON.stringify({ release: marker, refreshed }))
