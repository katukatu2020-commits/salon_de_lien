import fs from "node:fs";

const serverPath = "/app/server.js";
let server = fs.readFileSync(serverPath, "utf8");
const marker = `      if (req.method === 'GET' && acceptsAdminHtml && url.pathname.startsWith('/admin/') && !url.pathname.startsWith('/admin/login')) return tenantSetup.renderNext(req, res, url, handle) /* tenant-bootstrap-v93-ui-lifecycle */`;
const guard = `      // A withdrawn customer must not be reachable from a bookmarked or copied
      // store-side record URL. The Next page already filters list queries; this
      // guard also avoids rendering the legacy detail bundle with a null model.
      const customerRecordMatch = req.method === 'GET' && acceptsAdminHtml ? url.pathname.match(/^\\/admin\\/customers\\/([^/]+)$/) : null
      if (customerRecordMatch && customerRecordMatch[1] !== 'messages') {
        const recordSession = await chatSession(req, 'staff')
        if (!recordSession) { res.statusCode = 302; res.setHeader('Location', '/admin/login'); return res.end() }
        const customerId = decodeURIComponent(customerRecordMatch[1]).slice(0, 160)
        const activeCustomer = await prisma.$queryRawUnsafe('SELECT 1 FROM "Customer" WHERE "id"=$1 AND "organizationId"=$2 AND "deletedAt" IS NULL LIMIT 1', customerId, recordSession.organizationId)
        if (!activeCustomer[0]) {
          res.statusCode = 302
          res.setHeader('Location', '/admin/customers?notice=customer-unavailable')
          res.setHeader('Cache-Control', 'private, no-store')
          return res.end()
        }
      } /* withdrawn-customer-direct-guard-v343 */
`;
const count = server.split(marker).length - 1;
if (count !== 1) throw new Error(`Expected one admin render marker, found ${count}`);
server = server.replace(marker, () => guard + marker);
fs.writeFileSync(serverPath, server);
console.log("Withdrawn customer direct guard v343 applied");
