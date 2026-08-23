import fs from 'node:fs'

function replaceOnce(source, oldValue, newValue, label) {
  const count = source.split(oldValue).length - 1
  if (count !== 1) throw new Error(`${label}: expected 1 match, found ${count}`)
  return source.replace(oldValue, newValue)
}

const billingPath = '/app/billing.js'
let billing = fs.readFileSync(billingPath, 'utf8')

billing = replaceOnce(
  billing,
  `    redirect(res, '/admin/owner-analytics?section=billing')`,
  `    // The store code is needed immediately for customer-store linking. Show the
    // owner settings page first; billing enforcement still redirects subsequent
    // protected navigation to the payment setup until onboarding is complete.
    redirect(res, '/admin/settings?registered=1')`,
  'new organization destination',
)

fs.writeFileSync(billingPath, billing)

console.log('store public code v404 runtime patched')
