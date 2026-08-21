import fs from "node:fs";

const pagePath = "/app/.next/server/app/u/register/page.js";
const serverPath = "/app/server.js";

let page = fs.readFileSync(pagePath, "utf8");
const oldAsset = "/customer-registration-resend-v345.js";
const newAsset = "/customer-registration-resend-v347.js";
if (!page.includes(oldAsset)) throw new Error("old registration resend asset marker not found");
page = page.replace(oldAsset, newAsset);
fs.writeFileSync(pagePath, page);

let server = fs.readFileSync(serverPath, "utf8");
const marker = "      if (url.pathname === '/customer-registration-resend-v345.js' && req.method === 'GET') {";
if (!server.includes(marker)) throw new Error("registration resend asset route marker not found");
server = server.replace(marker, "      if (url.pathname === '/customer-registration-resend-v347.js' && req.method === 'GET') {\n        res.statusCode = 200\n        res.setHeader('Content-Type', 'application/javascript; charset=utf-8')\n        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')\n        res.setHeader('X-Content-Type-Options', 'nosniff')\n        res.end(fs.readFileSync(path.join(dir, 'customer-registration-resend-v347.js')))\n        return\n      } /* customer-registration-resend-v347 */\n" + marker);
fs.writeFileSync(serverPath, server);
