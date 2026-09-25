import fs from 'node:fs'
import path from 'node:path'
import { patchServerRuntime, patchStyleAdminClient, RELEASE_MARKER } from './runtime-transform.mjs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const serverPath = path.join(root, 'server.js')
const styleClientPath = path.join(root, 'public', 'style-admin-controls-v618.js')

fs.writeFileSync(serverPath, patchServerRuntime(fs.readFileSync(serverPath, 'utf8')))
fs.writeFileSync(styleClientPath, patchStyleAdminClient(fs.readFileSync(styleClientPath, 'utf8')))

console.log(JSON.stringify({ release: RELEASE_MARKER, patched: [serverPath, styleClientPath] }))
