import fs from 'node:fs'

const links = fs.readFileSync('/app/customer-links-v293.js', 'utf8')

if (!links.includes('The membership code belongs to the platform customer account')) {
  throw new Error('store-independent membership lookup marker is missing')
}

if (!links.includes(`WHERE "id"=$1 AND "role"=\\'CUSTOMER\\' AND "active"=TRUE FOR UPDATE', session.userId)`)) {
  throw new Error('membership lookup is not scoped to the stable AppUser id')
}

if (links.includes(`WHERE "id"=$1 AND "customerId"=$2 AND "role"=\\'CUSTOMER\\' AND "active"=TRUE FOR UPDATE', session.userId, session.customerId)`)) {
  throw new Error('store-specific membership lookup is still present')
}

new Function(links)
console.log('customer store home membership lookup v407 verified')
