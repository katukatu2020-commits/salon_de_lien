import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const marker = 'customer-current-appointment-v614'
const here = path.dirname(fileURLToPath(import.meta.url))
const changes = []

const appointmentsPage = '.next/server/app/u/(account)/appointments/page.js'
const homePage = '.next/server/app/u/(account)/home/page.js'
const checkoutPage = '.next/server/app/admin/appointments/[appointmentId]/page.js'
const prettyActions = '.next/server/chunks/1608.js'
const minifiedActions = '.next/server/chunks/2241.js'

function replaceExact(file, before, after, expected, label) {
  const target = path.join(root, file)
  const source = fs.readFileSync(target, 'utf8')
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  fs.writeFileSync(target, source.split(before).join(after))
  changes.push({ kind: 'replace', file, before, after, count })
}

function addFile(sourceName, targetName) {
  const target = path.join(root, targetName)
  if (fs.existsSync(target)) throw new Error(`${targetName}: target already exists`)
  fs.copyFileSync(path.join(here, sourceName), target)
  changes.push({ kind: 'add', file: targetName })
}

const terminalStatuses = '["キャンセル","キャンセル済み","無断キャンセル","来店済み","来店完了","会計済み","会計完了","completed","cancelled","canceled","no-show","no_show"]'

replaceExact(
  appointmentsPage,
  'appointments:{where:{scheduledAt:{gte:new Date},status:{notIn:["キャンセル","無断キャンセル"]}},orderBy',
  `appointments:{where:{scheduledAt:{gte:new Date},status:{notIn:${terminalStatuses}},serviceSales:{none:{}}},orderBy`,
  1,
  'customer appointments current reservation query',
)

replaceExact(
  homePage,
  'appointments:{where:{scheduledAt:{gte:t},status:{notIn:["キャンセル","無断キャンセル","来店済み"]}},orderBy',
  `appointments:{where:{scheduledAt:{gte:t},status:{notIn:${terminalStatuses}},serviceSales:{none:{}}},orderBy`,
  1,
  'customer home next appointment query',
)

replaceExact(
  checkoutPage,
  `            (0, a.revalidatePath)("/admin/customers?section=points"),
            (0, a.revalidatePath)("/u/reviews"),`,
  `            (0, a.revalidatePath)("/admin/customers?section=points"),
            (0, a.revalidatePath)("/u/home"),
            (0, a.revalidatePath)("/u/appointments"),
            (0, a.revalidatePath)("/u/mypage"),
            (0, a.revalidatePath)("/u/reviews"),`,
  1,
  'appointment checkout customer cache invalidation',
)

replaceExact(
  prettyActions,
  `              (0, s.revalidatePath)("/admin/customers?view=messages"),
              (0, s.revalidatePath)("/admin/customers?view=analytics"),
              (0, s.revalidatePath)(\`/admin/customers/\${e}\`));`,
  `              (0, s.revalidatePath)("/admin/customers?view=messages"),
              (0, s.revalidatePath)("/admin/customers?view=analytics"),
              (0, s.revalidatePath)(\`/admin/customers/\${e}\`),
              (0, s.revalidatePath)("/u/home"),
              (0, s.revalidatePath)("/u/appointments"),
              (0, s.revalidatePath)("/u/mypage"));`,
  1,
  'service sale customer cache invalidation in readable action chunk',
)

replaceExact(
  minifiedActions,
  '(0,s.revalidatePath)("/admin/customers?view=messages"),(0,s.revalidatePath)("/admin/customers?view=analytics"),(0,s.revalidatePath)(`/admin/customers/${e}`)}async function ec',
  '(0,s.revalidatePath)("/admin/customers?view=messages"),(0,s.revalidatePath)("/admin/customers?view=analytics"),(0,s.revalidatePath)(`/admin/customers/${e}`),(0,s.revalidatePath)("/u/home"),(0,s.revalidatePath)("/u/appointments"),(0,s.revalidatePath)("/u/mypage")}async function ec',
  1,
  'service sale customer cache invalidation in minified action chunk',
)

addFile('customer-summary-v614.js', 'customer-summary-v614.js')

replaceExact(
  'server.js',
  "const { customerSummaryV601 } = require('./customer-summary-v601')",
  "const { customerSummaryV614 } = require('./customer-summary-v614')",
  1,
  'customer summary module',
)

replaceExact(
  'server.js',
  'const summary = await customerSummaryV601(prisma,session,await customerLinks.customerPublicCode(session))',
  'const summary = await customerSummaryV614(prisma,session,await customerLinks.customerPublicCode(session))',
  1,
  'customer summary call',
)

const readinessAnchor = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Coupon-Email-Delivery', 'v613') /* coupon-email-delivery-v613-ready */"
replaceExact(
  'server.js',
  readinessAnchor,
  `${readinessAnchor}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Current-Appointment', 'v614') /* ${marker}-ready */`,
  1,
  'current appointment readiness header',
)

fs.writeFileSync('/tmp/customer-current-appointment-v614-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({
  release: marker,
  modified: [...new Set(changes.filter(change => change.kind === 'replace').map(change => change.file))],
  added: changes.filter(change => change.kind === 'add').map(change => change.file),
}))
