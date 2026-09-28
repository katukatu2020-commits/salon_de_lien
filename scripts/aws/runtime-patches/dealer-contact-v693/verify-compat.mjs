import fs from 'node:fs'
let source=fs.readFileSync('/tmp/lien-v692/verify-runtime.mjs','utf8')
// Retain all earlier business assertions; only the immutable entry URLs have changed.
source=source.replaceAll('inventory-orders-common-layout-v572.salon-orders-v692.js?v=692-1','inventory-orders-common-layout-v572.salon-orders-v693.js?v=693-1')
source=source.replaceAll('/salon-order-entry-v692.css?v=692-1','/salon-order-entry-v693.css?v=693-1')
await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))
