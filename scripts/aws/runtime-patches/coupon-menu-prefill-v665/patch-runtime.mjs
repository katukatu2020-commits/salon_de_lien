import fs from 'node:fs'
import path from 'node:path'
import { patchServerRuntime, RELEASE_MARKER } from './runtime-transform.mjs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const serverPath = path.join(root, 'server.js')

fs.writeFileSync(serverPath, patchServerRuntime(fs.readFileSync(serverPath, 'utf8')))

console.log(JSON.stringify({ release: RELEASE_MARKER, patched: [serverPath] }))
