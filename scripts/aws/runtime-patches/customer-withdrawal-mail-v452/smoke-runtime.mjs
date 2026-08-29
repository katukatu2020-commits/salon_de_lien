import crypto from 'node:crypto'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { createCustomerWithdrawalService } = require('/app/customer-withdrawal-v309.js')

process.env.POSTMARK_SERVER_TOKEN = 'server-token-for-smoke-test'
process.env.POSTMARK_FROM_EMAIL = 'no-reply@example.com'

const sentMessages = []
globalThis.fetch = async (url, options) => {
  sentMessages.push({ url, payload: JSON.parse(options.body) })
  return {
    ok: true,
    status: 200,
    async json() {
      return { ErrorCode: 0, MessageID: 'smoke-message-id' }
    },
  }
}

const prisma = {
  async $queryRawUnsafe(query) {
    if (query.includes('FROM "AppUser"')) {
      return [{ appUserId: 'user-1', email: 'customer@example.com', customerId: 'customer-1', name: '試験 <利用者>' }]
    }
    if (query.includes('COUNT(*)')) return [{ count: 0 }]
    throw new Error(`unexpected smoke-test query: ${query}`)
  },
  async $executeRawUnsafe() {
    throw new Error('cleanup must not run after a successful mail delivery')
  },
  async $transaction(callback) {
    const tx = { async $executeRawUnsafe() { return 1 } }
    return callback(tx)
  },
}

const service = createCustomerWithdrawalService({
  prisma,
  crypto,
  sessionProvider: async () => ({ userId: 'user-1', customerId: 'customer-1', organizationId: 'org-1' }),
})

const request = {
  method: 'POST',
  url: '/api/customer-auth/withdrawal/request',
  headers: {
    host: 'salon-de-lien.com',
    origin: 'https://salon-de-lien.com',
    'x-forwarded-proto': 'https',
  },
  async *[Symbol.asyncIterator]() {},
}
const headers = new Map()
const response = {
  statusCode: 0,
  setHeader(name, value) { headers.set(name.toLowerCase(), value) },
  end() {},
}

const handled = await service.handle(
  request,
  response,
  new URL('https://salon-de-lien.com/api/customer-auth/withdrawal/request'),
)

if (!handled) throw new Error('withdrawal request was not handled')
if (response.statusCode !== 303) throw new Error(`unexpected response status: ${response.statusCode}`)
if (headers.get('location') !== 'https://salon-de-lien.com/u/profile?withdrawal=sent') {
  throw new Error(`unexpected redirect: ${headers.get('location')}`)
}
if (sentMessages.length !== 1) throw new Error(`unexpected Postmark call count: ${sentMessages.length}`)
if (!sentMessages[0].payload.HtmlBody.includes('試験 &lt;利用者&gt; 様')) {
  throw new Error('customer-controlled HTML was not escaped')
}

console.log('customer withdrawal mail v452 smoke test passed')
