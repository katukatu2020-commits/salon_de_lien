import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { execFileSync } from 'node:child_process'
const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const read = file => fs.readFileSync(root + '/' + file, 'utf8')
for (const file of ['public/dealer-orders-v715.js', 'dealer-workspace-v715.js', 'wholesale-ordering-v543.js', 'server.js']) {
  execFileSync(process.execPath, ['--check', root + '/' + file])
}
const client = read('public/dealer-orders-v715.js')
const sourceFunction = name => {
  const match = client.match(new RegExp('  (?:async )?function ' + name + '\\('))
  assert(match, name)
  const end = client.indexOf('\n  }', match.index)
  assert(end > match.index)
  return client.slice(match.index, end + 4)
}
const functions = ['canEditDealerOrderLines', 'updateDealerOrder', 'openDealerOrder'].map(sourceFunction).join('\n')
let assertions = 0
for (const status of ['ORDERED', 'ACCEPTED', 'SHIPPED', 'DELIVERED', 'CANCELLED']) {
  for (const cutoffOpen of [true, false]) {
    const editable = cutoffOpen && ['ORDERED', 'ACCEPTED'].includes(status)
    let calls = 0, reads = 0, closed = 0, reloads = 0
    const lines = [{ id: 'line', productCode: '001', janCode: '0123456789012', deliveredQuantity: 1, unitPrice: 1782 }]
    const context = vm.createContext({
      dealer: { busy: false, detail: { cutoffOpen, order: { id: 'test/order', status } } },
      document: { getElementById: id => id === 'dealer-note' ? { value: 'existing memo' } : { close: () => { closed++ } } },
      detailLinesPayload: () => { reads++; assert(editable, 'Locked lines must not even be read'); return lines },
      post: async (url, payload) => {
        calls++
        assert.equal(url, '/api/dealer/orders/test%2Forder/status')
        assert.equal(payload.status, status === 'SHIPPED' ? 'DELIVERED' : status)
        assert.equal(payload.dealerNote, 'existing memo')
        assert.equal(Object.hasOwn(payload, 'lines'), editable)
        if (editable) assert.deepEqual(payload.lines, lines)
      },
      notify: () => {}, statusLabels: {}, reloadDealer: async () => { reloads++ },
    })
    vm.runInContext(functions, context)
    assert.equal(context.canEditDealerOrderLines(context.dealer.detail), editable)
    const button = { disabled: false }
    await context.updateDealerOrder(button, status === 'SHIPPED' ? 'DELIVERED' : status)
    assert.deepEqual([calls, reads, closed, reloads], [1, editable ? 1 : 0, 1, 1])
    assert.equal(context.dealer.busy, false)
    context.dealer.busy = true
    await context.updateDealerOrder(button, 'DELIVERED')
    assert.equal(calls, 1, 'Repeated clicks while busy must be ignored')
    assertions++
  }
}
let failureNotice = '', failureClosed = false
const failed = vm.createContext({
  dealer: { busy: false, detail: { cutoffOpen: false, order: { id: 'test', status: 'SHIPPED' } } },
  document: { getElementById: id => id === 'dealer-note' ? null : { close: () => { failureClosed = true } } },
  post: async () => { throw Error('network failure') }, notify: message => { failureNotice = message },
})
vm.runInContext(functions, failed)
const failedButton = { disabled: false }
await failed.updateDealerOrder(failedButton, 'DELIVERED')
assert.equal(failedButton.disabled, false)
assert.equal(failed.dealer.busy, false)
assert.equal(failureNotice, 'network failure')
assert.equal(failureClosed, false)
const tracked = vm.createContext({
  dealer: {}, location: {}, document: { getElementById: () => ({ showModal() {} }) },
  api: async () => ({ tracked: true }),
})
vm.runInContext(functions, tracked)
await tracked.openDealerOrder('tracked/order')
assert.equal(tracked.location.href, '/dealer/fulfillment?order=tracked%2Forder')
// Delivery must not weaken immutable lines, role/tenant scope or transactional ERP billing.
const server = read('wholesale-ordering-v543.js'), erp = read('dealer-erp-v678.js')
assert(server.includes("if (submittedLines.length && !['ORDERED', 'ACCEPTED'].includes(order.status)) throw new WholesaleError('出荷後の明細は変更できません。', 409)"))
assert(server.includes('await dealerErpV678.legacyGuard(tx, session, orderId, target)'))
assert(server.includes('const result = await prisma.$transaction(async tx =>'))
assert(erp.includes("if (o.tracked || target === 'SHIPPED') fail("))
assert(erp.includes('s.id, logisticsScope(s)'))
assert(read('dealer-workspace-v715.js').includes("'/dealer-orders-v715.js'"))
assert(server.includes("require('./dealer-workspace-v715.js').render"))
assert(read('server.js').includes("res.setHeader('X-Lien-Dealer-Delivery', 'v715')"))
console.log(`v715 passed: ${assertions} state/deadline combinations, duplicate click, failure recovery, ERP routing and server guards`)
