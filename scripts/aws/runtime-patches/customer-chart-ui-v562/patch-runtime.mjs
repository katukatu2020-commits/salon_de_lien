import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const marker = 'customer-chart-ui-v562'
const serverPath = path.join(root, 'server.js')
const commercialPath = path.join(root, 'commercial-admin-v101.js')

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

function replaceRegexOnce(source, pattern, replacement, label) {
  const matches = source.match(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`)) || []
  if (matches.length !== 1) throw new Error(`${label}: expected one match, found ${matches.length}`)
  return source.replace(pattern, replacement)
}

let server = fs.readFileSync(serverPath, 'utf8')
const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Salon-Records-Controls', 'v561') /* salon-records-controls-v561 */`
server = replaceOnce(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Chart-UI', 'v562') /* ${marker} */`,
  'readiness header',
)
server += `\n/* ${marker} */\n`

let commercial = fs.readFileSync(commercialPath, 'utf8')
commercial = replaceOnce(
  commercial,
  `  window.__lienCustomerChartPhotosV561 = true`,
  `  window.__lienCustomerChartPhotosV561 = true\n  window.__lienCustomerChartUiV562 = true`,
  'browser release marker',
)
commercial = replaceOnce(
  commercial,
  `      close: '<path d="m6 6 12 12M18 6 6 18"></path>',`,
  `      close: '<path d="m6 6 12 12M18 6 6 18"></path>',\n      zoom: '<circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4M11 8v6M8 11h6"></path>',`,
  'zoom icon',
)

const originalMobileCss = `      @media(max-width:640px){.lien-chart-card{gap:18px;padding:18px 16px}.lien-chart-heading h2{font-size:18px}.lien-chart-actions{display:grid;grid-template-columns:1fr}.lien-chart-button{width:100%}.lien-chart-latest{min-height:190px}.lien-chart-history-head{align-items:flex-start;flex-direction:column;padding:18px 16px}.lien-chart-history-toolbar{align-items:stretch;flex-direction:column;padding:13px 16px}.lien-chart-grid{grid-template-columns:1fr;padding:16px}.lien-chart-history h1{font-size:21px}}`
const commercialCss = `
      /* customer-chart-ui-v562 */
      .lien-chart-card{display:block;padding:0;overflow:hidden;border-color:#e5d6cf;box-shadow:0 10px 30px rgba(63,43,35,.055)}
      .lien-chart-card-header{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:22px 26px;border-bottom:1px solid #eadfd9;background:#fff}
      .lien-chart-heading{align-items:center;gap:14px}.lien-chart-heading>span{width:46px;height:46px;border:1px solid #f2d9e0;background:#fbedf1;color:#b54663}
      .lien-chart-heading h2{font-size:22px;line-height:1.25}.lien-chart-heading p{margin-top:5px;color:#8b7b74;font-size:11px}
      .lien-chart-heading-copy{display:grid;gap:0;min-width:0}.lien-chart-heading-line{display:flex;align-items:center;flex-wrap:wrap;gap:10px}
      .lien-chart-private{min-height:28px;margin:0;border:1px solid #cee4d7;border-radius:999px;background:#eff8f2;padding:0 10px;color:#397057;font-size:10px;white-space:nowrap}.lien-chart-private svg{width:14px;height:14px}
      .lien-chart-actions{flex:0 0 auto;align-items:center;margin:0}.lien-chart-button{min-height:44px;border-color:#ddcbc3;padding:0 17px;transition:background-color .16s ease,border-color .16s ease,color .16s ease,box-shadow .16s ease}.lien-chart-button:hover{border-color:#cfaea2;background:#fff8f5}.lien-chart-button.primary{border-color:#b94662;background:#b94662;box-shadow:0 7px 18px rgba(185,70,98,.16)}.lien-chart-button.primary:hover{border-color:#a83d57;background:#a83d57}
      .lien-chart-card>.lien-chart-status{min-height:0;margin:0;border-bottom:1px solid #eadfd9;background:#fff8f6;padding:10px 26px}.lien-chart-card>.lien-chart-status:empty{display:none}.lien-chart-card>.lien-chart-status.ok{background:#f2f8f4}
      .lien-chart-latest{display:block;min-height:390px;overflow:visible;border:0;border-radius:0;background:#f7f3f1}
      .lien-chart-image-shell{display:grid;grid-template-columns:minmax(0,1fr) 310px;width:100%;min-height:430px}
      .lien-chart-media{position:relative;display:grid;min-width:0;min-height:430px;place-items:center;overflow:hidden;border:0;border-right:1px solid #e7dcd6;background:#f3efed;padding:22px;cursor:zoom-in}
      .lien-chart-media img,.lien-chart-latest .lien-chart-media img{display:block;width:100%;height:100%;max-height:500px;border:1px solid rgba(91,67,58,.12);border-radius:4px;background:#fff;box-shadow:0 12px 28px rgba(53,39,34,.12);object-fit:contain}
      .lien-chart-zoom{position:absolute;right:34px;bottom:34px;display:grid;width:42px;height:42px;place-items:center;border:1px solid rgba(104,79,70,.18);border-radius:7px;background:rgba(255,255,255,.94);color:#634f47;box-shadow:0 6px 18px rgba(48,34,29,.14)}.lien-chart-zoom svg{width:19px;height:19px}
      .lien-chart-meta{display:flex;width:auto;align-items:stretch;justify-content:flex-start;flex-direction:column;gap:0;border:0;background:#fff;padding:30px 26px;color:#342b27;font-size:11px}
      .lien-chart-meta-kicker{color:#b54663;font-size:9px;font-weight:900;text-transform:uppercase}.lien-chart-meta h3{margin:9px 0 5px;font-family:"Yu Mincho","Hiragino Mincho ProN",serif;font-size:23px;line-height:1.35}.lien-chart-meta-sub{margin:0 0 23px;color:#8a7b74;font-size:10px}
      .lien-chart-meta-list{display:grid;margin:0}.lien-chart-meta-row{display:grid;gap:5px;border-top:1px solid #eee4df;padding:14px 0}.lien-chart-meta-row dt{color:#94857e;font-size:9px;font-weight:800}.lien-chart-meta-row dd{margin:0;color:#3d322e;font-size:11px;font-weight:900;line-height:1.6}
      .lien-chart-archive-summary{display:flex;align-items:center;gap:11px;margin-top:auto;border-top:1px solid #eee4df;padding-top:18px;color:#6e5b53}.lien-chart-archive-summary>span{display:grid;width:34px;height:34px;place-items:center;border-radius:7px;background:#f9edf0;color:#b54663}.lien-chart-archive-summary svg{width:17px;height:17px}.lien-chart-archive-summary div{display:grid}.lien-chart-archive-summary strong{font-size:15px}.lien-chart-archive-summary small{color:#91817a;font-size:9px}
      .lien-chart-empty{min-height:390px;align-content:center;gap:8px;background:#faf7f5}.lien-chart-empty>span:first-child{display:grid;width:52px;height:52px;place-items:center;border:1px solid #edddd6;border-radius:8px;background:#fff;color:#b78e80}.lien-chart-empty>span:first-child svg{width:24px;height:24px}.lien-chart-empty strong{margin-top:4px;color:#4e3f39;font-size:13px}.lien-chart-empty small{color:#95867f;font-size:10px}
      .lien-chart-history{border-color:#e5d6cf;box-shadow:0 10px 30px rgba(63,43,35,.055)}.lien-chart-history-head{background:#fff;padding:22px 26px}.lien-chart-history-toolbar{background:#fffaf8}.lien-chart-history .lien-chart-status:empty{display:none}.lien-chart-history .lien-chart-status{margin-top:8px}.lien-chart-grid{grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px;background:#fbf8f6}.lien-chart-item{border-color:#e5d8d2;box-shadow:0 4px 14px rgba(58,41,35,.045)}.lien-chart-item button{background:#f3efed;padding:10px}.lien-chart-item img{aspect-ratio:4/3;border-radius:4px;background:#fff;object-fit:contain}.lien-chart-item-copy{border-top:1px solid #eadfd9;background:#fff;padding:13px 14px}.lien-chart-badge{border:1px solid #cde3d6;border-radius:999px;background:#eef7f1}
      @media(max-width:900px){.lien-chart-card-header{align-items:flex-start;flex-direction:column}.lien-chart-actions{width:100%}.lien-chart-image-shell{grid-template-columns:1fr}.lien-chart-media{min-height:320px;border-right:0;border-bottom:1px solid #e7dcd6}.lien-chart-meta{min-height:260px}.lien-chart-archive-summary{margin-top:18px}}
      @media(max-width:640px){.lien-chart-card-header{gap:17px;padding:18px 16px}.lien-chart-heading{align-items:flex-start}.lien-chart-heading>span{width:42px;height:42px}.lien-chart-heading-line{align-items:flex-start;flex-direction:column;gap:7px}.lien-chart-heading h2{font-size:19px}.lien-chart-heading p{font-size:10px}.lien-chart-private{min-height:25px}.lien-chart-actions{grid-template-columns:1fr;gap:8px}.lien-chart-card>.lien-chart-status{padding:9px 16px}.lien-chart-latest{min-height:280px}.lien-chart-image-shell{min-height:0}.lien-chart-media{min-height:250px;padding:12px}.lien-chart-media img,.lien-chart-latest .lien-chart-media img{max-height:360px}.lien-chart-zoom{right:22px;bottom:22px;width:39px;height:39px}.lien-chart-meta{min-height:0;padding:20px 18px}.lien-chart-meta h3{font-size:21px}.lien-chart-meta-sub{margin-bottom:14px}.lien-chart-empty{min-height:280px}.lien-chart-history-head{padding:18px 16px}.lien-chart-history-toolbar{padding:13px 16px}.lien-chart-grid{padding:14px}.lien-chart-item button{padding:8px}}
`
commercial = replaceOnce(commercial, originalMobileCss, `${originalMobileCss}${commercialCss}`, 'commercial chart styles')

const newCardAssignment = `    card.innerHTML = \`<header class="lien-chart-card-header"><div class="lien-chart-heading"><span>\${icon('image')}</span><div class="lien-chart-heading-copy"><div class="lien-chart-heading-line"><h2>カルテ写真</h2><span class="lien-chart-private">\${icon('shield')}店舗内限定</span></div><p>紙カルテ・手書き記録</p></div></div><div class="lien-chart-actions"><button type="button" class="lien-chart-button" data-chart-history>\${icon('history')}<span>履歴を見る</span></button><button type="button" class="lien-chart-button primary" data-chart-upload>\${icon('upload')}写真を追加</button></div><input class="lien-chart-file" type="file" accept="image/jpeg,image/png,image/webp" data-chart-file></header><div class="lien-chart-status" data-chart-status role="status" aria-live="polite"></div><div class="lien-chart-latest" data-chart-latest><div class="lien-chart-empty">カルテ写真を読み込んでいます…</div></div>\``
commercial = replaceRegexOnce(
  commercial,
  /    card\.innerHTML = `<div><div class="lien-chart-heading"[\s\S]*?<div class="lien-chart-latest" data-chart-latest><div class="lien-chart-empty">カルテ写真を読み込んでいます…<\/div><\/div>`/,
  newCardAssignment,
  'latest card markup',
)

const latestRenderer = `  function imageMarkup(item, count) {
    if (!item) return \`<div class="lien-chart-empty"><span>\${icon('image')}</span><strong>カルテ写真は未登録です</strong><small>保存済みの写真はありません</small></div>\`
    return \`<div class="lien-chart-image-shell"><button type="button" class="lien-chart-media" data-chart-preview-image aria-label="最新のカルテ写真を拡大表示"><img src="\${esc(item.url)}" alt="最新のカルテ写真"><span class="lien-chart-zoom">\${icon('zoom')}</span></button><aside class="lien-chart-meta"><span class="lien-chart-meta-kicker">LATEST CHART</span><h3>最新のカルテ</h3><p class="lien-chart-meta-sub">店舗内記録</p><dl class="lien-chart-meta-list"><div class="lien-chart-meta-row"><dt>登録日時</dt><dd>\${esc(formatDate(item.createdAt))}</dd></div><div class="lien-chart-meta-row"><dt>登録者</dt><dd>\${esc(item.uploadedByName || '店舗スタッフ')}</dd></div></dl><div class="lien-chart-archive-summary"><span>\${icon('history')}</span><div><strong>\${Number(count || 0).toLocaleString('ja-JP')}件</strong><small>保存済みカルテ</small></div></div></aside></div>\`
  }`
commercial = replaceRegexOnce(
  commercial,
  /  function imageMarkup\(item\) \{[\s\S]*?\n  \}\n\n  function bindUpload/,
  `${latestRenderer}\n\n  function bindUpload`,
  'latest image renderer',
)
commercial = replaceOnce(commercial, `preview.innerHTML = imageMarkup(data.items?.[0])`, `preview.innerHTML = imageMarkup(data.items?.[0], data.count)`, 'latest item count')
commercial = replaceOnce(
  commercial,
  'history.querySelector(\'span\').textContent = `過去のカルテを見る（${Number(data.count || 0)}件）`',
  'history.querySelector(\'span\').textContent = `履歴を見る（${Number(data.count || 0)}件）`',
  'history count label',
)
commercial = replaceOnce(
  commercial,
  `<h1>過去のカルテ</h1><p>最新を含むカルテ写真を新しい順に表示しています。</p>`,
  `<h1>カルテ写真履歴</h1><p>新しい記録から順に表示しています。</p>`,
  'history title',
)
commercial = replaceOnce(
  commercial,
  `      main.appendChild(root)\n      root.querySelector('[data-chart-back]').addEventListener('click', () => {`,
  `      main.appendChild(root)\n      requestAnimationFrame(() => window.scrollTo({ top:0, behavior:'auto' }))\n      root.querySelector('[data-chart-back]').addEventListener('click', () => {`,
  'history initial scroll',
)
commercial += `\n/* ${marker} */\n`

fs.writeFileSync(serverPath, server)
fs.writeFileSync(commercialPath, commercial)

console.log(JSON.stringify({ release:marker, server:true, commercial:true }))
