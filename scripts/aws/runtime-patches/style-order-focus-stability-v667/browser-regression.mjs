import { runBrowserCheck } from './browser-check.mjs'
import { patchStyleAdminClient } from './runtime-transform.mjs'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const response = await fetch(baseUrl + '/style-admin-controls-v618.js?v=661-order-recovery1', { cache: 'no-store' })
if (!response.ok) throw new Error(`Reviewed style client returned ${response.status}`)
const styleClientOverride = patchStyleAdminClient(await response.text())

console.log(JSON.stringify(await runBrowserCheck({
  injectClient: true,
  mode: 'reviewed-parent',
  styleClientOverride,
})))
