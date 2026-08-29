import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const workflowPath = `${root}/ui-workflows-v294.js`
const marker = 'asset-persistence-banner-v462'
const startMarker = `\n;(() => {\n  const styleId = 'lien-campaign-entry-style-v427'`
const endMarker = `\n;(() => {\n  if (window.__lienLineSettingsLoaderV436) return`

const source = fs.readFileSync(workflowPath, 'utf8')
if (source.includes(marker)) throw new Error(`${marker}: runtime patch already applied`)

const start = source.indexOf(startMarker)
const end = source.indexOf(endMarker, start + startMarker.length)
if (start < 0 || end < 0 || end <= start) {
  throw new Error(`${marker}: obsolete campaign banner injector was not found exactly once`)
}
if (source.indexOf(startMarker, start + startMarker.length) >= 0) {
  throw new Error(`${marker}: multiple obsolete campaign banner injectors were found`)
}

const cleanup = `
;(() => {
  /* ${marker}: remove the obsolete cross-page campaign banner without reinserting it. */
  const removeObsoleteCampaignEntry = () => {
    document.getElementById('lien-campaign-entry-v427')?.remove()
    document.getElementById('lien-campaign-entry-style-v427')?.remove()
    document.querySelectorAll('.lien-campaign-entry-v427').forEach(element => element.remove())
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', removeObsoleteCampaignEntry, { once: true })
  else removeObsoleteCampaignEntry()
  window.addEventListener('popstate', removeObsoleteCampaignEntry)
})()
`

fs.writeFileSync(workflowPath, source.slice(0, start) + cleanup + source.slice(end))
console.log(`${marker} runtime patched`)
