import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const server = fs.readFileSync(`${root}/server.js`, 'utf8')
const campaign = fs.readFileSync(`${root}/customer-campaigns-v427.js`, 'utf8')

const required = [
  [server, "X-Lien-Storewide-Campaigns', 'v498'", 'v498 readiness header'],
  [server, "X-Lien-Campaign-Tablet-Layout', 'v499'", 'v499 readiness header'],
  [campaign, 'storewide-campaigns-v498', 'v498 campaign runtime'],
  [campaign, 'campaign-tablet-layout-v499', 'v499 campaign runtime'],
  [campaign, '@media(min-width:768px) and (max-width:1099px)', 'tablet breakpoint'],
  [campaign, 'html.ca-admin-pc-shell:has([data-campaign-admin]),html.ca-admin-pc-shell:has([data-campaign-admin]) body{min-width:0!important', 'campaign-scoped legacy shell width reset'],
  [campaign, '.admin-app-shell.admin-staff-unified-v48>[data-campaign-stage]{width:100%!important', 'campaign stage width reset'],
  [campaign, '@media(max-width:767px)', 'existing mobile breakpoint'],
  [campaign, 'Advertising campaigns are store-wide', 'store-wide campaign invariant'],
]
for (const [source, marker, label] of required) {
  if (!source.includes(marker)) throw new Error(`${label} missing`)
}

for (const [source, marker, label] of [
  [server, 'X-Lien-Campaign-Tablet-Layout', 'v499 readiness marker'],
  [campaign, 'campaign-tablet-layout-v499', 'v499 runtime marker'],
  [campaign, '@media(min-width:768px) and (max-width:1099px)', 'tablet breakpoint'],
]) {
  if ((source.match(new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length !== 1) {
    throw new Error(`${label} was duplicated`)
  }
}

console.log('campaign-tablet-layout-v499 runtime verification passed')
