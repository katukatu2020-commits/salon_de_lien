'use strict'
const fs = require('node:fs'), path = require('node:path')
const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const asset = file => fs.readFileSync(path.join(__dirname, file), 'utf8').replace(/\r\n/g, '\n')
const write = (file, value) => fs.writeFileSync(path.join(root, file), value)
function replace(source, before, after) {
  if (source.split(before).length !== 2) throw Error('Expected unique anchor: ' + before.slice(0, 100))
  return source.replace(before, after)
}
write('broadcast-preview-v706.cjs', asset('audience.cjs'))
let client = read('customer-link-ui-v293.js')
client = replace(client, '  async function cropImage(file) {', asset('campaign-crop.js') + '\n  async function cropImage(file) {')
client = replace(client, 'const cropped = await cropImage(file)', "const cropped = await (input.id === 'campaign-image' ? cropCampaignImageV706(file) : cropImage(file))")
client = replace(client, "if (!cropped) { input.value = ''; return }", "if (!cropped) { input.value = ''; if (input.id === 'campaign-image') input.dispatchEvent(new Event('change', { bubbles: true })); return }")
client = replace(client, "input.value = ''\n        toast(error?.message || '画像を調整できませんでした。', true)", "input.value = ''\n        if (input.id === 'campaign-image') input.dispatchEvent(new Event('change', { bubbles: true }))\n        toast(error?.message || '画像を調整できませんでした。', true)")
client = replace(client, "toast('正方形にトリミングしました。保存ボタンで確定してください。')", "toast(input.id === 'campaign-image' ? '4:3で画像を調整しました。保存ボタンで確定してください。' : '正方形にトリミングしました。保存ボタンで確定してください。')")
client += '\n;(() => { const style = document.createElement("style"); style.dataset.campaignCouponV706 = "1"; style.textContent = ' + JSON.stringify(asset('client.css')) + '; document.head.appendChild(style) })();\n' + asset('confirmation.js')
write('customer-link-ui-v293.js', client)
for (const file of ['commercial-admin-v101.js', 'customer-runtime-v267.js']) {
  write(file, replace(read(file), '/customer-link-ui-v293.js?v=670-orimia-directory1', '/customer-link-ui-v293.js?v=706-campaign-coupon1'))
}
let campaign = read('customer-campaigns-v427.js')
campaign = replace(campaign, '広告画像（任意・JPG / PNG / WebP）', '広告画像（横4：縦3・任意・JPG / PNG / WebP）')
campaign = replace(campaign, '.home-campaign img,.home-campaign-visual{width:104px;height:100%;min-height:96px;object-fit:cover}', '.home-campaign img,.home-campaign-visual{width:104px;height:100%;min-height:78px;object-fit:contain;background:#fff}')
campaign = replace(campaign, ".resize({ width: 1600, height: 900, fit: 'cover', position: 'attention' })", ".resize({ width: 1600, height: 1200, fit: 'contain', background: '#ffffff' }) /* campaign-aspect-v706 */")
campaign = replace(campaign, '[data-campaign-admin] .preview img{display:block;width:100%;max-height:360px;object-fit:cover}', '[data-campaign-admin] .preview img{display:block;width:100%;height:auto;aspect-ratio:4/3;object-fit:contain;background:#fff}')
campaign = replace(campaign, '.history-media{position:relative;overflow:hidden;aspect-ratio:16/9;', '.history-media{position:relative;overflow:hidden;aspect-ratio:4/3;')
campaign = replace(campaign, 'justify-content:center;object-fit:cover;color:#8f4f42', 'justify-content:center;object-fit:contain;color:#8f4f42')
campaign = replace(campaign, '.campaign-card>img,.campaign-fallback{display:block;width:100%;aspect-ratio:16/9;object-fit:cover}', '.campaign-card>img,.campaign-fallback{display:block;width:100%;aspect-ratio:4/3;object-fit:contain;background:#fff}')
write('customer-campaigns-v427.js', campaign)
// Update the actual deployed action, preserving existing coupon, quota and delivery transactions.
let action = read('.next/server/chunks/9845.js')
const begin = action.indexOf('let selectedCustomerIds = new Set('), end = action.indexOf('        let skippedNoEmail = 0;', begin)
if (begin < 0 || end < begin) throw Error('Broadcast recipient action anchor missing')
action = action.slice(0, begin) + 'let M = (await require("/app/broadcast-preview-v706.cjs").resolve(u._, t.organizationId, e)).matched;\n' + action.slice(end)
action = replace(action, '        let $ = new Date();\n        (await u._.$transaction(', `        let confirmedBroadcastIdV706;
        try { confirmedBroadcastIdV706 = require('/app/broadcast-preview-v706.cjs').verify(t, e, M); }
        catch { (0, o.redirect)('/admin/customers/messages?error=confirmation-required'); }
        if (await u._.customerBroadcast.findUnique({ where: { id: confirmedBroadcastIdV706 }, select: { id: true } }))
          (0, o.redirect)('/admin/customers/messages?notice=already-sent');
        let $ = new Date();
        (await u._.$transaction(`)
action = replace(action, 'let a = await e.customerBroadcast.create({\n              data: {\n                organizationId:', 'let a = await e.customerBroadcast.create({\n              data: {\n                id: confirmedBroadcastIdV706,\n                organizationId:')
write('.next/server/chunks/9845.js', action)
let server = read('server.js')
server = replace(server, 'const customerCampaigns = createCustomerCampaignService({', "const broadcastPreviewV706 = require('./broadcast-preview-v706.cjs').createService({ prisma, sessionProvider: req => chatSession(req, 'staff'), json })\nconst customerCampaigns = createCustomerCampaignService({")
server = replace(server, '      if(await wholesaleOrdering.flowGate(req,res,url))return', "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Campaign-Coupon-Confirm', 'v706')\n      if(await wholesaleOrdering.flowGate(req,res,url))return\n      if (await broadcastPreviewV706.handle(req, res, url)) return")
write('server.js', server)
console.log('v706 campaign 4:3 editor and verified broadcast confirmation installed.')
