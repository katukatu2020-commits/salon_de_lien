import fs from 'node:fs'

const server = fs.readFileSync('/app/server.js', 'utf8')
const workflow = fs.readFileSync('/app/ui-workflows-v294.js', 'utf8')
const commercial = fs.readFileSync('/app/commercial-admin-v101.js', 'utf8')
const service = fs.readFileSync('/app/line-reservations-v436.js', 'utf8')
const client = fs.readFileSync('/app/line-settings-client-v436.js', 'utf8')

const assertions = [
  [server.includes("require('./line-reservations-v436')"), 'service require'],
  [server.includes('const lineReservations = createLineReservationService'), 'service initialization'],
  [server.includes('await lineReservations.ensureSchema()'), 'schema initialization'],
  [server.includes('await lineReservations.handle(req, res, url)'), 'route hook'],
  [workflow.includes('/line-settings-client-v436.js?v=436'), 'settings client loader'],
  [commercial.includes("script.src='/ui-workflows-v294.js?v=436'"), 'workflow cache key'],
  [service.includes('/api/integrations/line/webhook/'), 'webhook route'],
  [service.includes('/api/lien-line-booking/book'), 'booking route'],
  [service.includes('verifyWebhookSignature'), 'webhook signature verification'],
  [service.includes('LineBookingRequest_org_line_idempotency_key'), 'booking idempotency'],
  [client.includes('Messaging API チャネルID'), 'settings form'],
]

for (const [condition, label] of assertions) if (!condition) throw new Error(`runtime verification failed: ${label}`)
console.log(`line LIFF reservations v436 verified (${assertions.length} assertions)`)
