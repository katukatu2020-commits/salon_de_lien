import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const { canManagePost, canManageComment, canManageChatMessage } = require(`${root}/content-management-v465.js`)

const customer = { userId: 'user-customer-a', customerId: 'customer-a', organizationId: 'org-a' }
const staff = { userId: 'user-staff-a', organizationId: 'org-a', role: 'STAFF' }

assert.equal(canManagePost(customer, 'customer', { postKind: 'VISIT', customerId: 'customer-a' }), true)
assert.equal(canManagePost(customer, 'customer', { postKind: 'VISIT', customerId: 'customer-b' }), false)
assert.equal(canManagePost(staff, 'staff', { postKind: 'STORE', customerId: null }), true)
assert.equal(canManagePost(staff, 'staff', { postKind: 'VISIT', customerId: 'customer-a' }), false)
assert.equal(canManageComment(customer, { appUserId: 'user-customer-a' }), true)
assert.equal(canManageComment(customer, { appUserId: 'user-customer-b' }), false)
assert.equal(canManageChatMessage(customer, 'customer', { senderType: 'customer', senderUserId: 'user-customer-a', customerId: 'customer-a' }, () => false), true)
assert.equal(canManageChatMessage(customer, 'customer', { senderType: 'customer', senderUserId: 'user-customer-b', customerId: 'customer-a' }, () => false), false)
assert.equal(canManageChatMessage(staff, 'staff', { senderType: 'staff', senderUserId: 'user-staff-a', customerId: 'customer-a' }, () => true), true)
assert.equal(canManageChatMessage(staff, 'staff', { senderType: 'staff', senderUserId: 'user-staff-b', customerId: 'customer-a' }, () => true), false)
assert.equal(canManageChatMessage(staff, 'staff', { senderType: 'staff', senderUserId: 'user-staff-a', customerId: 'customer-a' }, () => false), false)

console.log('content edit/delete v465 ownership tests passed')
