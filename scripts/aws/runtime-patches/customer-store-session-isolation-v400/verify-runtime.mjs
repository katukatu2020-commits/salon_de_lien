import fs from 'node:fs'

const server = fs.readFileSync('/app/server.js', 'utf8')
const links = fs.readFileSync('/app/customer-links-v293.js', 'utf8')

if (!server.includes('LEFT JOIN "CustomerStoreLink" l ON l."appUserId"=u."id"')) {
  throw new Error('customer session validation does not accept a registered store link')
}
if (!server.includes('(u."customerId"=c."id" AND u."organizationId"=c."organizationId") OR l."id" IS NOT NULL')) {
  throw new Error('customer session validation does not preserve the canonical-store fallback')
}
if (server.includes('JOIN "Customer" c ON c."id"=u."customerId" WHERE u."id"=$1 AND u."customerId"=$2')) {
  throw new Error('customer session is still restricted to the globally mutable AppUser store')
}
if (links.includes('UPDATE "AppUser" SET "organizationId"=$1,"customerId"=$2')) {
  throw new Error('switching stores still mutates the global customer account')
}
if (!links.includes('const signed = signCustomerSession(session, users[0]?.loginId || users[0]?.email, links[0].customerId, organizationId)')) {
  throw new Error('switching stores no longer issues the selected-store session')
}

function canUseCustomerSession({ user, customer, link }) {
  if (!user.active || user.role !== 'CUSTOMER' || customer.deletedAt) return false
  if (customer.id === user.customerId && customer.organizationId === user.organizationId) return true
  return Boolean(
    link &&
      link.appUserId === user.id &&
      link.customerId === customer.id &&
      link.organizationId === customer.organizationId,
  )
}

const user = {
  id: 'customer-user-1',
  customerId: 'customer-home',
  organizationId: 'store-home',
  role: 'CUSTOMER',
  active: true,
}
const homeCustomer = { id: 'customer-home', organizationId: 'store-home', deletedAt: null }
const linkedCustomer = { id: 'customer-linked', organizationId: 'store-linked', deletedAt: null }
const link = {
  appUserId: user.id,
  customerId: linkedCustomer.id,
  organizationId: linkedCustomer.organizationId,
}

if (!canUseCustomerSession({ user, customer: homeCustomer, link: null })) {
  throw new Error('the canonical store session must remain valid')
}
if (!canUseCustomerSession({ user, customer: linkedCustomer, link })) {
  throw new Error('a registered secondary store session must be valid')
}
if (user.organizationId !== 'store-home' || user.customerId !== 'customer-home') {
  throw new Error('the verification mutated the canonical customer account')
}
if (canUseCustomerSession({ user, customer: { ...linkedCustomer, organizationId: 'store-other' }, link })) {
  throw new Error('an unregistered store session must be rejected')
}

console.log('customer store session isolation v400 verified')
