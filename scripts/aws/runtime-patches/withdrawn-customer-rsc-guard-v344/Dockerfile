ARG BASE_IMAGE
FROM ${BASE_IMAGE}
USER root
RUN node -e "const fs=require('fs'),p='/app/server.js';let s=fs.readFileSync(p,'utf8');const a=\"const customerRecordMatch = req.method === 'GET' && acceptsAdminHtml ? url.pathname.match(/^\\\\/admin\\\\/customers\\\\/([^/]+)$/) : null\",b=\"const customerRecordMatch = req.method === 'GET' ? url.pathname.match(/^\\\\/admin\\\\/customers\\\\/([^/]+)$/) : null\";if(!s.includes(a))throw Error('v343 guard marker missing');fs.writeFileSync(p,s.replace(a,b))" \
 && node --check /app/server.js \
 && grep -F "const customerRecordMatch = req.method === 'GET' ?" /app/server.js
USER nextjs
