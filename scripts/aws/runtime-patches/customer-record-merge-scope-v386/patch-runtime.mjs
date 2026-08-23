import fs from 'node:fs'

const clientPath = '/app/customer-merge-client-v385.js'
let client = fs.readFileSync(clientPath, 'utf8')
const tenantClientPath = '/app/tenant-setup-client.js'
let tenantClient = fs.readFileSync(tenantClientPath, 'utf8')

const before = `  function mount() {
    if (!pathMatch() || document.getElementById('lien-customer-merge-v385-card')) return
    const main = document.querySelector('main')`

const after = `  function mount() {
    if (!pathMatch()) {
      document.getElementById('lien-customer-merge-v385-card')?.remove()
      document.querySelectorAll('.lcm-overlay').forEach(overlay => overlay.remove())
      document.body.style.overflow = ''
      return
    }
    if (document.getElementById('lien-customer-merge-v385-card')) return
    const main = document.querySelector('main')`

const matches = client.split(before).length - 1
if (matches !== 1) throw new Error(`customer merge mount marker: expected one match, found ${matches}`)
client = client.replace(before, after)
fs.writeFileSync(clientPath, client)

const oldScriptUrl = '/customer-merge-v385.js?v=385'
const newScriptUrl = '/customer-merge-v385.js?v=386'
const scriptUrlMatches = tenantClient.split(oldScriptUrl).length - 1
if (scriptUrlMatches !== 1) throw new Error(`customer merge script URL: expected one match, found ${scriptUrlMatches}`)
tenantClient = tenantClient.replace(oldScriptUrl, newScriptUrl)
fs.writeFileSync(tenantClientPath, tenantClient)
