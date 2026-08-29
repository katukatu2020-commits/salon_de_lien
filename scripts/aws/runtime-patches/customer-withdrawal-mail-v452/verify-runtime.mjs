import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const withdrawalPath = `${root}/customer-withdrawal-v309.js`
const withdrawal = fs.readFileSync(withdrawalPath, 'utf8')

const assertions = [
  [withdrawal.includes('function lienEscapeEmailHtml(value)'), 'HTML escape helper is defined'],
  [withdrawal.includes('function lienCommercialEmailHtml(input)'), 'commercial email renderer remains present'],
  [withdrawal.includes("Tag: 'customer-withdrawal'"), 'withdrawal Postmark tag remains present'],
  [withdrawal.includes('DELETE FROM "CustomerWithdrawalRequest" WHERE "id"=$1'), 'failed mail requests remain cleaned up'],
]

for (const [condition, label] of assertions) {
  if (!condition) throw new Error(`runtime verification failed: ${label}`)
}

new Function(withdrawal)
console.log(`customer withdrawal mail v452 verified (${assertions.length} assertions)`)
