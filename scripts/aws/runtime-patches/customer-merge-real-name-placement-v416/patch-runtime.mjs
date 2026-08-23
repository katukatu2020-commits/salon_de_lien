import fs from 'node:fs'

const clientPath = '/app/customer-merge-client-v385.js'
const tenantClientPath = '/app/tenant-setup-client.js'

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

let client = fs.readFileSync(clientPath, 'utf8')
let tenantClient = fs.readFileSync(tenantClientPath, 'utf8')

const oldMobileStyles = `      @media(max-width:700px){.lcm-card{align-items:stretch;flex-direction:column;padding:18px}.lcm-card.lcm-card--embedded{gap:14px;padding:16px}.lcm-card--embedded .lcm-card-copy{align-items:flex-start}.lcm-open{width:100%}.lcm-overlay{align-items:end;padding:0}.lcm-dialog{width:100%;max-height:94dvh;border-radius:26px 26px 0 0}.lcm-head{padding:19px 16px 15px}.lcm-head h2{font-size:21px}.lcm-body{padding:17px 16px calc(22px + env(safe-area-inset-bottom))}.lcm-result{grid-template-columns:38px minmax(0,1fr)}.lcm-stats{grid-column:1/-1;justify-content:flex-start;padding-left:50px}.lcm-actions{display:grid}.lcm-actions button{width:100%}}`

const realNameStyles = `      .lcm-real-name-host{display:grid;grid-template-columns:minmax(0,1fr) minmax(300px,410px);column-gap:24px;align-items:start}.lcm-real-name-host>h2,.lcm-real-name-host>p,.lcm-real-name-host>form{grid-column:1}.lcm-card.lcm-card--real-name{grid-column:2;grid-row:1/span 3;align-self:stretch;display:flex;flex-direction:column;align-items:stretch;justify-content:space-between;gap:16px;width:auto;min-width:0;margin:0;border:0;border-left:1px solid var(--lien-border,#e8ded2);border-radius:0;background:transparent;padding:2px 0 2px 24px;box-shadow:none}.lcm-card--real-name .lcm-card-copy{align-items:flex-start}.lcm-card--real-name .lcm-open{width:100%}
      @media(max-width:980px){.lcm-real-name-host{grid-template-columns:minmax(0,1fr)}.lcm-real-name-host>h2,.lcm-real-name-host>p,.lcm-real-name-host>form,.lcm-card.lcm-card--real-name{grid-column:1}.lcm-card.lcm-card--real-name{grid-row:auto;margin-top:18px;border-top:1px solid var(--lien-border,#e8ded2);border-left:0;padding:18px 0 0}}
      @media(max-width:700px){.lcm-card{align-items:stretch;flex-direction:column;padding:18px}.lcm-card.lcm-card--embedded{gap:14px;padding:16px}.lcm-card.lcm-card--real-name{padding:18px 0 0}.lcm-card--embedded .lcm-card-copy{align-items:flex-start}.lcm-open{width:100%}.lcm-overlay{align-items:end;padding:0}.lcm-dialog{width:100%;max-height:94dvh;border-radius:26px 26px 0 0}.lcm-head{padding:19px 16px 15px}.lcm-head h2{font-size:21px}.lcm-body{padding:17px 16px calc(22px + env(safe-area-inset-bottom))}.lcm-result{grid-template-columns:38px minmax(0,1fr)}.lcm-stats{grid-column:1/-1;justify-content:flex-start;padding-left:50px}.lcm-actions{display:grid}.lcm-actions button{width:100%}}`

client = replaceOnce(client, oldMobileStyles, realNameStyles, 'real-name merge layout styles')

const oldMountStart = `    if (document.getElementById('lien-customer-merge-v385-card')) return\n    const main = document.querySelector('main')`
const oldMountEnd = `    card.querySelector('.lcm-open').addEventListener('click', openDialog)`
const mountStartIndex = client.indexOf(oldMountStart)
const mountEndIndex = client.indexOf(oldMountEnd, mountStartIndex)

if (mountStartIndex < 0 || mountEndIndex < 0) {
  throw new Error('merge mount block was not found')
}

const oldMount = client.slice(mountStartIndex, mountEndIndex + oldMountEnd.length)
const cardMarkupLine = oldMount.match(/^    card\.innerHTML = .*$/m)?.[0]
if (!cardMarkupLine) throw new Error('merge card markup was not found')

const newMount = `    const main = document.querySelector('main')
    if (!main) return
    const realNameForm = main.querySelector('form[action="/api/lien-customer-real-name"]')
    const realNameSection = realNameForm?.closest('section')
    if (!realNameSection) return
    realNameSection.classList.add('lcm-real-name-host')
    const existingCard = document.getElementById('lien-customer-merge-v385-card')
    if (existingCard) {
      existingCard.classList.add('lcm-card--real-name')
      if (existingCard.parentElement !== realNameSection) realNameSection.appendChild(existingCard)
      return
    }
    const card = document.createElement('aside')
    card.id = 'lien-customer-merge-v385-card'
    card.className = 'lcm-card lcm-card--embedded lcm-card--real-name'
    card.setAttribute('aria-label', realNameSection.querySelector('h2')?.textContent || 'Customer record merge')
${cardMarkupLine}
    realNameSection.appendChild(card)
    card.querySelector('.lcm-open').addEventListener('click', openDialog)`

client = client.slice(0, mountStartIndex) + newMount + client.slice(mountEndIndex + oldMountEnd.length)
tenantClient = replaceOnce(tenantClient, '/customer-merge-v385.js?v=408', '/customer-merge-v385.js?v=416', 'tenant loader cache bust')

fs.writeFileSync(clientPath, client)
fs.writeFileSync(tenantClientPath, tenantClient)

console.log('customer merge real-name placement v416 runtime patched')
