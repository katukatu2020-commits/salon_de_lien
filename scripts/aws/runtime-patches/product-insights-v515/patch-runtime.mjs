import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const patchRoot = path.dirname(fileURLToPath(import.meta.url))
const serverPath = path.join(root, 'server.js')
const reportChunkPath = path.join(root, '.next', 'server', 'chunks', '6006.js')
const publicAssetPath = path.join(root, 'public', 'product-insights-v515.js')
const nextRoot = path.join(root, '.next')

function replaceExact(source, before, after, expected, label) {
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  return source.split(before).join(after)
}

function collectFiles(directory, predicate, output = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) collectFiles(fullPath, predicate, output)
    else if (predicate(fullPath, entry.name)) output.push(fullPath)
  }
  return output
}

function replaceNextReferences(oldValue, newValue, label) {
  let files = 0
  let references = 0
  for (const file of collectFiles(nextRoot, (_fullPath, name) => name.endsWith('.js') || name.endsWith('.json'))) {
    const source = fs.readFileSync(file, 'utf8')
    const count = source.split(oldValue).length - 1
    if (!count) continue
    fs.writeFileSync(file, source.split(oldValue).join(newValue))
    files += 1
    references += count
  }
  if (!files || !references) throw new Error(`${label}: no manifest references were updated`)
  return { files, references }
}

fs.copyFileSync(path.join(patchRoot, 'product-insights-v515.js'), publicAssetPath)
const oldLayoutName = 'layout-runtime-v510.js'
const newLayoutName = 'layout-runtime-v515.js'
const oldLayoutPath = path.join(nextRoot, 'static', 'chunks', 'app', oldLayoutName)
const newLayoutPath = path.join(nextRoot, 'static', 'chunks', 'app', newLayoutName)
const productInsightsRuntime = fs.readFileSync(publicAssetPath, 'utf8')
const layoutRuntime = fs.readFileSync(oldLayoutPath, 'utf8') + `\n/* product-insights-v515-inline */\n${productInsightsRuntime}\n`
fs.writeFileSync(newLayoutPath, layoutRuntime)
replaceNextReferences(oldLayoutName, newLayoutName, 'product insights layout cache activation')

let server = fs.readFileSync(serverPath, 'utf8')
server = replaceExact(
  server,
  `<script src="/broadcast-layout-v510.js?v=510-final" defer></script>`,
  `<script src="/broadcast-layout-v510.js?v=510-final" defer></script><script src="/product-insights-v515.js?v=515" defer></script>`,
  1,
  'product insights browser asset',
)
server = replaceExact(
  server,
  `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Business-Hours-Consistency', 'v514')`,
  `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Business-Hours-Consistency', 'v514')
      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Product-Insights', 'v515')`,
  1,
  'product insights readiness marker',
)
server = replaceExact(
  server,
  `    \`SELECT p."id",p."name",p."manufacturerName",p."active",
            l."quantity",s."paidAt",c."id" AS "customerId",c."gender",c."birthDate",c."birthYear"
       FROM "Product" p
       LEFT JOIN "ProductSaleLine" l ON l."productId"=p."id"
       LEFT JOIN "ServiceSale" s ON s."id"=l."serviceSaleId"
       LEFT JOIN "Customer" c ON c."id"=s."customerId" AND c."deletedAt" IS NULL
      WHERE p."organizationId"=$1
      ORDER BY p."active" DESC,p."updatedAt" DESC,s."paidAt" DESC\``,
  `    \`SELECT p."id",p."name",p."manufacturerName",p."category",p."imageUrl",p."active",
            COALESCE(rv."reviewCount",0)::int AS "reviewCount",rv."averageRating",
            l."quantity",s."paidAt",c."id" AS "customerId",c."gender",c."birthDate",c."birthYear"
       FROM "Product" p
       LEFT JOIN (
         SELECT pp."productId",COUNT(r."id")::int AS "reviewCount",AVG(r."rating")::float8 AS "averageRating"
           FROM "ProductProposal" pp
           JOIN "ProductReview" r ON r."productProposalId"=pp."id" AND r."allowAnonymousShare"=TRUE
           JOIN "Customer" rc ON rc."id"=pp."customerId" AND rc."deletedAt" IS NULL AND rc."storeHiddenAt" IS NULL
          GROUP BY pp."productId"
       ) rv ON rv."productId"=p."id"
       LEFT JOIN "ProductSaleLine" l ON l."productId"=p."id"
       LEFT JOIN "ServiceSale" s ON s."id"=l."serviceSaleId"
       LEFT JOIN "Customer" c ON c."id"=s."customerId" AND c."deletedAt" IS NULL
      WHERE p."organizationId"=$1
      ORDER BY p."active" DESC,p."updatedAt" DESC,s."paidAt" DESC\``,
  1,
  'product insight image and review query',
)
server = replaceExact(
  server,
  `        manufacturerName: row.manufacturerName,
        active: row.active === true,
        totalQuantity: 0,`,
  `        manufacturerName: row.manufacturerName,
        category: row.category,
        imageUrl: row.imageUrl,
        active: row.active === true,
        reviewCount: Math.max(0, Number(row.reviewCount || 0)),
        averageRating: row.averageRating == null ? null : Math.round(Number(row.averageRating) * 10) / 10,
        totalQuantity: 0,`,
  1,
  'product insight aggregation fields',
)
server = replaceExact(
  server,
  `      manufacturerName: product.manufacturerName,
      active: product.active,
      totalQuantity: product.totalQuantity,`,
  `      manufacturerName: product.manufacturerName,
      category: product.category,
      imageUrl: product.imageUrl,
      active: product.active,
      reviewCount: product.reviewCount,
      averageRating: product.averageRating,
      totalQuantity: product.totalQuantity,`,
  1,
  'product insight response fields',
)
server = replaceExact(
  server,
  `  return json(res, 200, { products: output, generatedAt: new Date().toISOString() })
}

async function chatApi`,
  `  res.setHeader('Cache-Control', 'private, no-store')
  return json(res, 200, { products: output, generatedAt: new Date().toISOString() })
}

async function chatApi`,
  1,
  'product insight cache policy',
)
server += '\n/* product-insights-v515 */\n'
fs.writeFileSync(serverPath, server)

let reportChunk = fs.readFileSync(reportChunkPath, 'utf8')
reportChunk = replaceExact(
  reportChunk,
  `          _ = (function ({
            manufacturer: e,
            productName: t,
            category: a,
            from: r,
            to: n,
          }) {
            let s = new URLSearchParams();
            (e && s.set("manufacturer", e),
              t && s.set("productName", t),
              a && s.set("category", a),
              r && s.set("from", r),
              n && s.set("to", n),
              s.set("section", "feedback"));
            let i = s.toString();
            return \`/admin/products?\${i}\`;
          })({
            manufacturer: l,
            productName: h,
            category: b,
            from: e?.from,
            to: e?.to,
          }),`,
  `          _ = (function ({
            manufacturer: e,
            productName: t,
            category: a,
            from: r,
            to: n,
            insightProduct: i,
          }) {
            let s = new URLSearchParams();
            (e && s.set("manufacturer", e),
              t && s.set("productName", t),
              a && s.set("category", a),
              r && s.set("from", r),
              n && s.set("to", n),
              i && s.set("insightProduct", i),
              s.set("section", "feedback"));
            let o = s.toString();
            return \`/admin/products?\${o}\`;
          })({
            manufacturer: l,
            productName: h,
            category: b,
            from: e?.from,
            to: e?.to,
            insightProduct: e?.insightProduct,
          }),`,
  1,
  'review return path keeps selected product',
)
reportChunk = replaceExact(
  reportChunk,
  `          B = await (0, f.n$)({
            manufacturer: l,
            organizationId: a.organizationId,
            productName: h,
            category: b,
            from: w(e?.from),
            to: w(e?.to),
            includeCustomerLinks: "MANUFACTURER" !== a.role,
          }),`,
  `          B = ((report) => {
            if (!e?.insightProduct) return report;
            return {
              ...report,
              products: report.products.filter(
                (product) => product.productId === e.insightProduct,
              ),
            };
          })(await (0, f.n$)({
            manufacturer: l,
            organizationId: a.organizationId,
            productName: h,
            category: b,
            from: w(e?.from),
            to: w(e?.to),
            includeCustomerLinks: "MANUFACTURER" !== a.role,
          })),`,
  1,
  'review report exact product selection',
)
reportChunk += '\n/* product-insights-v515 */\n'
fs.writeFileSync(reportChunkPath, reportChunk)

console.log(JSON.stringify({ release: 'product-insights-v515' }))
