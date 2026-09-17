import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const marker = 'sales-ledger-product-names-v655'

const servicePath = path.join(root, 'sales-ledger-accounts-v318.js')
const clientPath = path.join(root, 'sales-ledger-client-v318.js')
const serverPath = path.join(root, 'server.js')

let service = fs.readFileSync(servicePath, 'utf8')
let client = fs.readFileSync(clientPath, 'utf8')
let server = fs.readFileSync(serverPath, 'utf8')

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before)
  if (first < 0) throw new Error(`${label}: target was not found`)
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`${label}: target was not unique`)
  return source.slice(0, first) + after + source.slice(first + before.length)
}

function appendClientStyles(source, addition) {
  const anchor = '/* salon-records-controls-v561 */\n      .sl-row-actions'
  const start = source.indexOf(anchor)
  if (start < 0) throw new Error('sales ledger style anchor was not found')
  const end = source.indexOf('\n\n    `', start)
  if (end < 0) throw new Error('sales ledger style template end was not found')
  return source.slice(0, end) + '\n' + addition.trimEnd() + source.slice(end)
}

service = replaceOnce(
  service,
  `function localDate(value, end = false) {
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(String(value || ''))) return null
  return new Date(\`${'${value}'}T${'${end'} ? '23:59:59.999' : '00:00:00.000'}+09:00\`)
}`,
  `function localDate(value, end = false) {
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(String(value || ''))) return null
  return new Date(\`${'${value}'}T${'${end'} ? '23:59:59.999' : '00:00:00.000'}+09:00\`)
}

function normalizeProductLines(value) {
  let lines = value
  if (typeof lines === 'string') {
    try { lines = JSON.parse(lines) } catch { lines = [] }
  }
  if (!Array.isArray(lines)) return []
  return lines.map(line => ({
    name: cleanText(line && line.name, 240),
    manufacturer: cleanText(line && line.manufacturer, 160),
    quantity: Math.max(0, Number(line && line.quantity) || 0),
    unitPrice: Math.max(0, Number(line && line.unitPrice) || 0),
    lineTotal: Math.max(0, Number(line && line.lineTotal) || 0),
  }))
}`,
  'product line normalization',
)

service = replaceOnce(
  service,
  `        COALESCE(lines."productTotal",0)::int AS "productTotal",COALESCE(lines."productCount",0)::int AS "productCount",COALESCE(lines."productLineCount",0)::int AS "productLineCount",`,
  `        COALESCE(lines."productTotal",0)::int AS "productTotal",COALESCE(lines."productCount",0)::int AS "productCount",COALESCE(lines."productLineCount",0)::int AS "productLineCount",
        COALESCE(lines."productLines",'[]'::jsonb) AS "productLines",`,
  'product line result column',
)

service = replaceOnce(
  service,
  `      LEFT JOIN LATERAL (SELECT COALESCE(SUM(l."lineTotal"),0)::int AS "productTotal",COALESCE(SUM(l."quantity"),0)::int AS "productCount",COUNT(*)::int AS "productLineCount" FROM "ProductSaleLine" l WHERE l."serviceSaleId"=s."id") lines ON TRUE`,
  `      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(l."lineTotal"),0)::int AS "productTotal",
          COALESCE(SUM(l."quantity"),0)::int AS "productCount",
          COUNT(*)::int AS "productLineCount",
          COALESCE(jsonb_agg(jsonb_build_object(
            'name',l."productNameSnapshot",
            'manufacturer',l."manufacturerNameSnapshot",
            'quantity',l."quantity",
            'unitPrice',l."unitPrice",
            'lineTotal',l."lineTotal"
          ) ORDER BY l."createdAt",l."id"),'[]'::jsonb) AS "productLines"
        FROM "ProductSaleLine" l
        WHERE l."serviceSaleId"=s."id"
      ) lines ON TRUE`,
  'product line aggregate',
)

service = replaceOnce(
  service,
  `        AND ($6='' OR s."title" ILIKE '%'||$6||'%' OR COALESCE(s."note",'') ILIKE '%'||$6||'%' OR COALESCE(a."menu",'') ILIKE '%'||$6||'%')`,
  `        AND ($6='' OR s."title" ILIKE '%'||$6||'%' OR COALESCE(s."note",'') ILIKE '%'||$6||'%' OR COALESCE(a."menu",'') ILIKE '%'||$6||'%'
          OR EXISTS (
            SELECT 1 FROM "ProductSaleLine" search_line
            WHERE search_line."serviceSaleId"=s."id"
              AND (search_line."productNameSnapshot" ILIKE '%'||$6||'%' OR search_line."manufacturerNameSnapshot" ILIKE '%'||$6||'%')
          ))`,
  'product keyword search',
)

service = replaceOnce(
  service,
  `      productLineCount: Number(row.productLineCount),
      pointDiscount: Number(row.pointDiscount),`,
  `      productLineCount: Number(row.productLineCount),
      productLines: normalizeProductLines(row.productLines),
      pointDiscount: Number(row.pointDiscount),`,
  'product line response normalization',
)
service += `\n/* ${marker} */\n`

client = replaceOnce(client, `  const VERSION = 'shared-account-contact-v549'`, `  const VERSION = '${marker}'`, 'client release version')

client = replaceOnce(
  client,
  `  function renderRows(root) {`,
  `  function productLinesMarkup(row) {
    const lines = Array.isArray(row.productLines) ? row.productLines : []
    const count = Math.max(0, Number(row.productCount) || 0)
    const total = Math.max(0, Number(row.productTotal) || 0)
    if (!lines.length) return count ? \`<span class="sl-product-fallback">\${count.toLocaleString('ja-JP')}点 / \${esc(yen(total))}</span>\` : '—'
    const items = lines.map(line => {
      const name = String(line && line.name || '').trim() || '商品名未登録'
      const manufacturer = String(line && line.manufacturer || '').trim()
      const quantity = Math.max(0, Number(line && line.quantity) || 0)
      const lineTotal = Math.max(0, Number(line && line.lineTotal) || 0)
      const meta = [manufacturer, \`\${quantity.toLocaleString('ja-JP')}点\`, yen(lineTotal)].filter(Boolean).map(esc).join(' / ')
      return \`<li class="sl-product-line"><strong class="sl-product-name">\${esc(name)}</strong><span class="sl-product-meta">\${meta}</span></li>\`
    }).join('')
    return \`<div class="sl-product-detail"><ul class="sl-product-list">\${items}</ul><span class="sl-product-total">商品計 \${count.toLocaleString('ja-JP')}点 / \${esc(yen(total))}</span></div>\`
  }

  function renderRows(root) {`,
  'product line renderer',
)

client = replaceOnce(
  client,
  `      <td>${'${row.productCount'} ? \`${'${Number(row.productCount).toLocaleString(\'ja-JP\')}'}点 / ${'${yen(row.productTotal)}'}\` : '—'}</td>`,
  `      <td class="sl-product-cell">${'${productLinesMarkup(row)}'}</td>`,
  'product line table cell',
)

client = replaceOnce(
  client,
  `<div class="sl-field"><label>施術・メニュー・メモ</label><input aria-label="施術・メニュー・メモ" name="keyword" maxlength="120" placeholder="内容を検索"></div>`,
  `<div class="sl-field"><label>施術・商品・メニュー・メモ</label><input aria-label="施術・商品・メニュー・メモ" name="keyword" maxlength="120" placeholder="内容・商品名を検索"></div>`,
  'product keyword label',
)

client = appendClientStyles(client, `      /* ${marker} */
      .sl-product-cell{min-width:250px;max-width:340px;vertical-align:top!important}
      .sl-product-detail{display:grid;gap:8px;min-width:0}
      .sl-product-list{display:grid;gap:7px;margin:0;padding:0;list-style:none}
      .sl-product-line{display:grid;gap:2px;min-width:0}
      .sl-product-line+.sl-product-line{padding-top:7px;border-top:1px solid color-mix(in srgb,var(--sl-line) 72%,transparent)}
      .sl-product-name{overflow-wrap:anywhere;color:var(--sl-ink);font-size:11px;line-height:1.5}
      .sl-product-meta{overflow-wrap:anywhere;color:var(--sl-muted);font-size:9px;line-height:1.5}
      .sl-product-total{padding-top:7px;border-top:1px solid var(--sl-line);color:var(--sl-ink);font-size:10px;font-weight:900;line-height:1.5}
      .sl-product-fallback{display:block;min-width:150px;color:var(--sl-muted);font-size:10px;line-height:1.5}
      @media(max-width:700px){.sl-product-cell{min-width:230px;max-width:280px}}
      @media print{.sl-product-cell{min-width:0!important;max-width:none!important}.sl-product-meta,.sl-product-total{font-size:6pt!important}.sl-product-name{font-size:6.5pt!important}}`)
client += `\n/* ${marker} */\n`

const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Store-Unlink', 'v654') /* customer-store-unlink-v654-ready */`
server = replaceOnce(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Sales-Ledger-Product-Names', 'v655') /* ${marker}-ready */`,
  'sales ledger product names readiness marker',
)
server += `\n/* ${marker} */\n`

fs.writeFileSync(servicePath, service)
fs.writeFileSync(clientPath, client)
fs.writeFileSync(serverPath, server)

console.log(JSON.stringify({ release: marker, patched: true }))
