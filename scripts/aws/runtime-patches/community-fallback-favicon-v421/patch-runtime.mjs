import fs from 'node:fs'

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

function writePatched(filePath, transform) {
  const source = fs.readFileSync(filePath, 'utf8')
  fs.writeFileSync(filePath, transform(source))
}

writePatched('/app/customer-store-staff-v276.js', source => replaceOnce(
  source,
  `       FROM "VisitCommunityPost" p
       JOIN "Customer" c ON c."id"=p."customerId" AND c."organizationId"=p."organizationId" AND c."deletedAt" IS NULL
       LEFT JOIN "AppUser" u ON u."customerId"=c."id" AND u."organizationId"=p."organizationId" AND u."role"='CUSTOMER' AND u."active"=TRUE`,
  `       FROM "VisitCommunityPost" p
       LEFT JOIN "Customer" c ON c."id"=p."customerId" AND c."organizationId"=p."organizationId"
       LEFT JOIN "AppUser" u ON u."customerId"=p."customerId" AND u."organizationId"=p."organizationId" AND u."role"='CUSTOMER' AND u."active"=TRUE`,
  'historical community nickname fallback',
))

writePatched('/app/server.js', source => replaceOnce(
  source,
  "      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)\n      if (url.pathname === '/admin/settings' && req.method === 'GET') {",
  `      const url = new URL(req.url, \`http://\${req.headers.host || 'localhost'}\`)
      if (url.pathname === '/favicon.ico' && req.method === 'GET') {
        res.statusCode = 200
        res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8')
        res.setHeader('Cache-Control', 'public, max-age=86400')
        res.setHeader('X-Content-Type-Options', 'nosniff')
        res.end(fs.readFileSync(path.join(dir, 'public', 'brand', 'salon-customer-service-mark.svg')))
        return
      }
      if (url.pathname === '/admin/settings' && req.method === 'GET') {`,
  'application favicon route',
))

console.log('community fallback and favicon v421 runtime patched')
