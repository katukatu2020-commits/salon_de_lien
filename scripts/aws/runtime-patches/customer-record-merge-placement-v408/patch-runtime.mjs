import fs from 'node:fs'

function replaceOnce(source, oldValue, newValue, label) {
  const count = source.split(oldValue).length - 1
  if (count !== 1) throw new Error(`${label}: expected 1 match, found ${count}`)
  return source.replace(oldValue, newValue)
}

const clientPath = '/app/customer-merge-client-v385.js'
const tenantClientPath = '/app/tenant-setup-client.js'
let client = fs.readFileSync(clientPath, 'utf8')
let tenantClient = fs.readFileSync(tenantClientPath, 'utf8')

const oldResponsiveStyles = `      @media(max-width:700px){.lcm-card{align-items:stretch;flex-direction:column;padding:18px}.lcm-open{width:100%}.lcm-overlay{align-items:end;padding:0}.lcm-dialog{width:100%;max-height:94dvh;border-radius:26px 26px 0 0}.lcm-head{padding:19px 16px 15px}.lcm-head h2{font-size:21px}.lcm-body{padding:17px 16px calc(22px + env(safe-area-inset-bottom))}.lcm-result{grid-template-columns:38px minmax(0,1fr)}.lcm-stats{grid-column:1/-1;justify-content:flex-start;padding-left:50px}.lcm-actions{display:grid}.lcm-actions button{width:100%}}`

const newResponsiveStyles = `      .lcm-card.lcm-card--embedded{box-sizing:border-box;width:100%;max-width:none;margin:0;border:1px solid var(--lien-border,#e8ded2);border-radius:18px;background:#fff;padding:18px 20px;box-shadow:0 1px 2px rgba(47,42,37,.05);font-family:var(--font-noto-sans-jp),system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.lcm-card--embedded .lcm-card-copy{align-items:center}.lcm-card--embedded .lcm-symbol{width:38px;height:38px;flex-basis:38px;border-radius:12px;background:var(--lien-primary-soft,#e9c9be);color:var(--lien-primary,#8f4f42)}.lcm-card--embedded .lcm-symbol svg{width:19px;height:19px}.lcm-card--embedded h3{margin:0;color:var(--lien-ink,#2f2a25);font-family:inherit;font-size:15px;font-weight:700;letter-spacing:0}.lcm-card--embedded p{margin:4px 0 0;color:var(--lien-muted,#7c7168);font-size:12px;line-height:1.7}.lcm-card--embedded .lcm-open{min-height:40px;flex:0 0 auto;border:0;border-radius:999px;background:var(--lien-primary,#8f4f42);padding:0 16px;color:#fff;box-shadow:0 3px 10px rgba(143,79,66,.18);font-family:inherit;font-size:12px}.lcm-card--embedded .lcm-open:hover{background:var(--lien-primary-dark,#5b332c);box-shadow:0 5px 14px rgba(91,51,44,.2)}.lcm-dialog,.lcm-dialog button,.lcm-dialog input{font-family:var(--font-noto-sans-jp),system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.lcm-head h2,.lcm-success h3{font-family:inherit;letter-spacing:0}
      @media(max-width:700px){.lcm-card{align-items:stretch;flex-direction:column;padding:18px}.lcm-card.lcm-card--embedded{gap:14px;padding:16px}.lcm-card--embedded .lcm-card-copy{align-items:flex-start}.lcm-open{width:100%}.lcm-overlay{align-items:end;padding:0}.lcm-dialog{width:100%;max-height:94dvh;border-radius:26px 26px 0 0}.lcm-head{padding:19px 16px 15px}.lcm-head h2{font-size:21px}.lcm-body{padding:17px 16px calc(22px + env(safe-area-inset-bottom))}.lcm-result{grid-template-columns:38px minmax(0,1fr)}.lcm-stats{grid-column:1/-1;justify-content:flex-start;padding-left:50px}.lcm-actions{display:grid}.lcm-actions button{width:100%}}`

client = replaceOnce(client, oldResponsiveStyles, newResponsiveStyles, 'embedded merge card styles')

const oldMount = `    if (document.getElementById('lien-customer-merge-v385-card')) return
    const main = document.querySelector('main')
    if (!main) return
    const card = document.createElement('section')
    card.id = 'lien-customer-merge-v385-card'
    card.className = 'lcm-card'
    card.innerHTML = \`<div class="lcm-card-copy"><span class="lcm-symbol">\${icon('merge')}</span><div><h3>重複した顧客カルテを統合</h3><p>同じお客様のカルテが複数ある場合、予約・会計・ポイント・施術履歴を現在のカルテへまとめます。</p></div></div><button type="button" class="lcm-open">\${icon('merge')}統合する顧客を選択</button>\`
    const dangerForm = [...main.querySelectorAll('form')].find(form => form.textContent.includes('顧客一覧から非表示'))
    const anchor = dangerForm ? dangerForm.parentElement : null
    if (anchor && anchor.parentElement) anchor.parentElement.insertBefore(card, anchor)
    else main.appendChild(card)
    card.querySelector('.lcm-open').addEventListener('click', openDialog)`

const newMount = `    if (document.getElementById('lien-customer-merge-v385-card')) return
    const main = document.querySelector('main')
    if (!main) return
    const dangerForm = [...main.querySelectorAll('form')].find(form => form.textContent.includes('顧客一覧から非表示'))
    const dangerSection = dangerForm?.closest('section')
    const managementPanel = dangerSection?.parentElement
    // Never fall back to the page root. The action belongs only inside this
    // customer's management tab and mounts when that tab content is ready.
    if (!dangerSection || !managementPanel) return
    const card = document.createElement('section')
    card.id = 'lien-customer-merge-v385-card'
    card.className = 'lcm-card lcm-card--embedded'
    card.innerHTML = \`<div class="lcm-card-copy"><span class="lcm-symbol">\${icon('merge')}</span><div><h3>顧客カルテを統合</h3><p>同じお客様のカルテがある場合、予約・会計・ポイント・施術履歴をこのカルテへまとめます。</p></div></div><button type="button" class="lcm-open">\${icon('merge')}統合するカルテを選択</button>\`
    managementPanel.insertBefore(card, dangerSection)
    card.querySelector('.lcm-open').addEventListener('click', openDialog)`

client = replaceOnce(client, oldMount, newMount, 'customer-chart-only merge placement')

client = client.replace('/customer-merge-v385.js?v=386', '/customer-merge-v385.js?v=408')
tenantClient = replaceOnce(
  tenantClient,
  '/customer-merge-v385.js?v=386',
  '/customer-merge-v385.js?v=408',
  'customer merge cache-bust URL',
)

fs.writeFileSync(clientPath, client)
fs.writeFileSync(tenantClientPath, tenantClient)
console.log('customer record merge placement v408 patched')
