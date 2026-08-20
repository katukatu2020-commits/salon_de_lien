'use strict'

const assert = require('node:assert/strict')
const { PassThrough } = require('node:stream')
const { test } = require('node:test')
const crypto = require('node:crypto')
const { createSalesLedgerAccountsService } = require('../sales-ledger-accounts-v318/sales-ledger-accounts-v318')

function request(origin) {
  const req = new PassThrough()
  req.method = 'POST'
  req.headers = {
    origin,
    host: 'internal-alb.local',
    'x-forwarded-host': 'internal-alb.local',
    'x-forwarded-proto': 'https',
  }
  req.socket = { encrypted: false }
  process.nextTick(() => req.end(JSON.stringify({ loginId: 'existing-owner', password: '0123456789' })))
  return req
}

function response() {
  const chunks = []
  return {
    statusCode: 0,
    headers: {},
    setHeader(name, value) { this.headers[name] = value },
    end(value = '') { chunks.push(Buffer.from(value)); this.body = Buffer.concat(chunks).toString('utf8') },
  }
}

function service() {
  const prisma = {
    async $executeRawUnsafe() { return 0 },
    async $queryRawUnsafe(sql) {
      if (String(sql).includes('LOWER(COALESCE')) return [{ id: 'owner-user' }]
      return []
    },
  }
  return createSalesLedgerAccountsService({
    prisma,
    crypto,
    sessionProvider: async () => ({ role: 'ADMIN', organizationId: 'org-1', userId: 'owner-user' }),
  })
}

test('accepts the canonical public origin behind an internal forwarded host', async () => {
  const res = response()
  await service().handle(request('https://salon-de-lien.com'), res, new URL('https://internal-alb.local/api/admin/shared-store-account'))
  assert.equal(res.statusCode, 409)
  assert.match(JSON.parse(res.body).error, /使用されています/)
})

test('rejects an untrusted cross-site origin', async () => {
  const res = response()
  await service().handle(request('https://attacker.example'), res, new URL('https://internal-alb.local/api/admin/shared-store-account'))
  assert.equal(res.statusCode, 403)
  assert.match(JSON.parse(res.body).error, /安全のため/)
})
