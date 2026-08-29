import fs from 'node:fs'
import { spawnSync } from 'node:child_process'

const campaignPath = '/app/customer-campaigns-v427.js'
const source = fs.readFileSync(campaignPath, 'utf8')

const assertions = [
  [source.includes('campaign-admin-layout-v457'), 'the reviewed layout marker exists'],
  [source.includes('max-width:1152px'), 'the campaign content width matches the shared admin workspace'],
  [source.includes('.hero h1{margin:12px 0 0;font-family:inherit'), 'the campaign title uses the shared sans-serif typography'],
  [source.includes('.workspace-tabs a.active{background:var(--primary);color:#fff'), 'the active workspace tab matches the shared selected state'],
  [source.includes("adminIconV429('message')"), 'the chat tab uses the message icon'],
  [source.includes("adminIconV429('megaphone')"), 'the delivery tab uses the megaphone icon'],
  [source.includes('data-layout="campaign-admin-layout-v457"'), 'the rendered campaign workspace exposes its release marker'],
  [source.includes("method:editingId?'PATCH':'POST'"), 'campaign create and edit behavior remains available'],
  [source.includes("method:'DELETE'"), 'campaign delete behavior remains available'],
  [source.includes('/api/lien-campaign-image'), 'campaign image upload remains available'],
  [source.includes("pathname === '/admin/customers/messages/campaigns'"), 'the campaign admin route remains registered'],
]

for (const [condition, label] of assertions) {
  if (!condition) throw new Error(`runtime verification failed: ${label}`)
}

const syntax = spawnSync(process.execPath, ['--check', campaignPath], { encoding: 'utf8' })
if (syntax.status !== 0) throw new Error(`${campaignPath}: ${syntax.stderr || syntax.stdout}`)

console.log(`campaign admin layout v457 verified (${assertions.length} assertions)`)
