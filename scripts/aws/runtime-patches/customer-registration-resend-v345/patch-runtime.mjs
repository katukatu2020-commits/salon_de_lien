import fs from "node:fs";

const root = "/app";
const pagePath = `${root}/.next/server/app/u/register/page.js`;
const routePath = `${root}/.next/server/app/api/customer-auth/registration-link/request/route.js`;
const serverPath = `${root}/server.js`;

function replaceOnce(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`${label} marker not found`);
  return source.replace(before, after);
}

let page = fs.readFileSync(pagePath, "utf8");
page = replaceOnce(
  page,
  's.jsx("button",{type:"submit",className:"lien-button-primary min-h-12 w-full",children:"登録用メールを送る"})',
  '(0,s.jsxs)(s.Fragment,{children:[s.jsx("button",{type:"submit",className:"lien-button-primary min-h-12 w-full",children:"登録用メールを送る"}),s.jsx("script",{src:"/customer-registration-resend-v345.js",defer:!0})]})',
  "registration form"
);
fs.writeFileSync(pagePath, page);

let route = fs.readFileSync(routePath, "utf8");
const requestWindowMarker = 'let i = new Date(Date.now() - 9e5);';
route = replaceOnce(
  route,
  requestWindowMarker,
  'let latestInvite=await m._.customerRegistrationInvite.findFirst({where:{organizationId:o,email:t},orderBy:{createdAt:"desc"},select:{createdAt:!0}});if(latestInvite&&Date.now()-new Date(latestInvite.createdAt).getTime()<6e4)return n();\n          '+requestWindowMarker,
  "registration API cooldown"
);
fs.writeFileSync(routePath, route);

let server = fs.readFileSync(serverPath, "utf8");
const serverMarker = "      if (url.pathname === '/ui-workflows-v294.js' && req.method === 'GET') {";
server = replaceOnce(
  server,
  serverMarker,
  "      if (url.pathname === '/customer-registration-resend-v345.js' && req.method === 'GET') {\n        res.statusCode = 200\n        res.setHeader('Content-Type', 'application/javascript; charset=utf-8')\n        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')\n        res.setHeader('X-Content-Type-Options', 'nosniff')\n        res.end(fs.readFileSync(path.join(dir, 'customer-registration-resend-v345.js')))\n        return\n      } /* customer-registration-resend-v345 */\n" + serverMarker,
  "runtime asset route"
);
fs.writeFileSync(serverPath, server);
