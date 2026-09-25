import fs from 'node:fs'
import path from 'node:path'
import { patchCampaignRuntime, patchServerRuntime, RELEASE_MARKER } from './runtime-transform.mjs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const serverPath = path.join(root, 'server.js')
const campaignPath = path.join(root, 'customer-campaigns-v427.js')

fs.writeFileSync(serverPath, patchServerRuntime(fs.readFileSync(serverPath, 'utf8')))
fs.writeFileSync(campaignPath, patchCampaignRuntime(fs.readFileSync(campaignPath, 'utf8')))

console.log(JSON.stringify({ release: RELEASE_MARKER, patched: [serverPath, campaignPath] }))
