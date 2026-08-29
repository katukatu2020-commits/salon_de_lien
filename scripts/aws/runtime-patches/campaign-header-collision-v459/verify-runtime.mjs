import fs from 'node:fs'
import { spawnSync } from 'node:child_process'

const campaignPath = '/app/customer-campaigns-v427.js'
const source = fs.readFileSync(campaignPath, 'utf8')

const assertions = [
  [source.includes('campaign-admin-shell-v458'), 'the rebuilt shell marker exists'],
  [source.includes('campaign-header-collision-v459'), 'the collision fix marker exists'],
  [source.includes('class="admin-app-shell admin-mobile-workspace-v38 admin-staff-unified-v48'), 'the shared AppShell root is used'],
  [source.includes('class="admin-desktop-sidebar fixed inset-y-0 left-0'), 'the shared desktop sidebar is used'],
  [source.includes('class="admin-shell-header sticky top-0'), 'the shared admin header is used'],
  [source.includes('class="admin-main-content min-w-0 overflow-x-hidden'), 'the shared main content wrapper is used'],
  [source.includes('class="mx-auto grid w-full max-w-7xl gap-6"'), 'the shared content width is used'],
  [source.includes('/_next/static/css/51ded9af5ca8c344'), 'the same Next.js stylesheet as customer management is loaded'],
  [source.includes('/tenant-setup-client.js?v=20260829-450'), 'the shared sidebar lifecycle is loaded'],
  [source.includes('/commercial-admin-v136.js?v=20260829-449'), 'the shared header runtime is loaded'],
  [source.includes('campaign-workspace-tabs inline-grid w-full grid-cols-4'), 'the shared four-tab workspace is used'],
  [source.includes('data-campaign-admin'), 'campaign-only styling is scoped to campaign content'],
  [source.includes('<section class="campaign-page-header">'), 'the campaign header uses its collision-free page-header class'],
  [!source.includes('const content = `<section class="hero">'), 'the generic hero class cannot be restyled by shared runtime CSS'],
  [!source.includes('<div class="shell"><aside class="side">'), 'the legacy custom shell is gone'],
  [!source.includes('<header class="top">'), 'the legacy custom header is gone'],
  [source.includes('function adminShell(session, content) { return adminShellV429'), 'the legacy shell entry delegates to the rebuilt shared shell'],
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

console.log(`campaign header collision v459 verified (${assertions.length} assertions)`)
