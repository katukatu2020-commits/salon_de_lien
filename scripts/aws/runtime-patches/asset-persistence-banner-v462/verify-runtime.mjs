import fs from 'node:fs'
import { spawnSync } from 'node:child_process'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const marker = 'asset-persistence-banner-v462'
const staffPath = `${root}/customer-store-staff-v276.js`
const campaignPath = `${root}/customer-campaigns-v427.js`
const workflowPath = `${root}/ui-workflows-v294.js`

function check(condition, label) {
  if (!condition) throw new Error(`runtime verification failed: ${label}`)
}

const staff = fs.readFileSync(staffPath, 'utf8')
const campaign = fs.readFileSync(campaignPath, 'utf8')
const workflow = fs.readFileSync(workflowPath, 'utf8')

const assertions = [
  [staff.includes('function requestedAudience(req, url)'), 'staff images resolve the intended application audience'],
  [staff.includes("source.pathname.startsWith('/admin/')"), 'admin referers select the staff session'],
  [staff.includes("source.pathname.startsWith('/u/')"), 'customer referers select the customer session'],
  [staff.includes('async function streamPrivateObject'), 'staff and store images use the private S3 proxy'],
  [staff.includes('object.Body.transformToByteArray'), 'private S3 streams support the AWS response body'],
  [!staff.includes('getSignedUrl'), 'staff images no longer redirect browsers to expiring S3 URLs'],
  [campaign.includes('globalThis.__lienCampaignS3'), 'campaign S3 access is dependency-testable'],
  [campaign.includes('function requestedAudience(req, url)'), 'campaign images resolve the intended application audience'],
  [campaign.includes('&audience=staff'), 'admin campaign images request the staff audience explicitly'],
  [campaign.includes('&audience=customer'), 'customer campaign images request the customer audience explicitly'],
  [campaign.includes('JOIN "CustomerCampaignRecipient"'), 'customer campaign image access remains recipient-scoped'],
  [campaign.includes('function privateObjectKey'), 'legacy and current private S3 keys are normalized'],
  [workflow.includes(marker), 'obsolete banner cleanup is installed'],
  [!workflow.includes('広告付きキャンペーンは専用ページから配信'), 'obsolete campaign banner copy is absent'],
  [!workflow.includes("const styleId = 'lien-campaign-entry-style-v427'"), 'obsolete banner MutationObserver is absent'],
]

for (const [condition, label] of assertions) check(condition, label)

for (const file of [staffPath, campaignPath, workflowPath]) {
  const syntax = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' })
  if (syntax.status !== 0) throw new Error(`${file}: ${syntax.stderr || syntax.stdout}`)
}

console.log(`${marker} verified (${assertions.length} assertions)`)
