import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const marker = 'customer-registration-name-fields-v633'
const pageFile = '.next/server/app/u/register/[token]/page.js'
const actionFile = '.next/server/chunks/2241.js'
const changes = []

function replaceExact(file, before, after, expected, label) {
  const target = path.join(root, file)
  const source = fs.readFileSync(target, 'utf8')
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  fs.writeFileSync(target, source.split(before).join(after))
  changes.push({ file, label, count })
}

const profileError = 'a?.error==="profile"?s.jsx("p",{role:"alert",className:"rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800",children:"入力内容を確認してください。プロフィールの各項目を選択してから登録してください。"}):null'
replaceExact(
  pageFile,
  profileError,
  `${profileError},a?.error==="name"?s.jsx("p",{role:"alert",className:"rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800",children:"姓名とフリガナをすべて入力してください。フリガナはカタカナで入力してください。"}):null`,
  1,
  'add separated-name validation error',
)

replaceExact(
  pageFile,
  '(0,s.jsxs)("label",{className:"grid gap-1.5 text-sm font-semibold",children:["お名前",s.jsx("input",{name:"name",required:!0,className:"lien-input"})]})',
  '(0,s.jsxs)("label",{className:"grid gap-1.5 text-sm font-semibold",children:["姓",s.jsx("input",{name:"lastName",required:!0,maxLength:50,autoComplete:"family-name",placeholder:"例: 山田",className:"lien-input"})]}),(0,s.jsxs)("label",{className:"grid gap-1.5 text-sm font-semibold",children:["名",s.jsx("input",{name:"firstName",required:!0,maxLength:50,autoComplete:"given-name",placeholder:"例: 花子",className:"lien-input"})]}),(0,s.jsxs)("label",{className:"grid gap-1.5 text-sm font-semibold",children:["セイ（フリガナ）",s.jsx("input",{name:"lastNameKana",required:!0,maxLength:50,autoComplete:"off",placeholder:"例: ヤマダ",className:"lien-input"})]}),(0,s.jsxs)("label",{className:"grid gap-1.5 text-sm font-semibold",children:["メイ（フリガナ）",s.jsx("input",{name:"firstNameKana",required:!0,maxLength:50,autoComplete:"off",placeholder:"例: ハナコ",className:"lien-input"})]})',
  1,
  'replace single name field with four fields',
)

replaceExact(
  actionFile,
  'let h=(0,_.p)(g),f=(0,w.Jc)(e,"name"),p=(0,w.Jc)(e,"phone"),y=(0,$.ni)(p),I=(0,w.PB)(e,"phoneVerificationId"),b=(0,w.PB)(e,"phoneVerificationToken"),P=n.organizationId;',
  'let h=(0,_.p)(g),registrationNameV633=require("/app/customer-registration-name-v633.js").parseCustomerRegistrationNameV633({lastName:(0,w.PB)(e,"lastName"),firstName:(0,w.PB)(e,"firstName"),lastNameKana:(0,w.PB)(e,"lastNameKana"),firstNameKana:(0,w.PB)(e,"firstNameKana")});registrationNameV633||(0,l.redirect)(i("name"));let f=registrationNameV633.fullName,registrationNameKanaV633=registrationNameV633.fullNameKana,registrationLastNameV633=registrationNameV633.lastName,registrationFirstNameV633=registrationNameV633.firstName,registrationLastNameKanaV633=registrationNameV633.lastNameKana,registrationFirstNameKanaV633=registrationNameV633.firstNameKana,p=(0,w.Jc)(e,"phone"),y=(0,$.ni)(p),I=(0,w.PB)(e,"phoneVerificationId"),b=(0,w.PB)(e,"phoneVerificationToken"),P=n.organizationId;',
  1,
  'parse the four customer name fields',
)

replaceExact(
  actionFile,
  'let em=[`新規相談: ${f}`,S?',
  'let em=[`新規相談: ${f}`,`フリガナ: ${registrationNameKanaV633}`,S?',
  1,
  'include kana in registration notes',
)

replaceExact(
  actionFile,
  'await t.customer.delete({where:{id:duplicateCustomerId}})\n}\nreturn g&&await t.contactLog.create',
  'await t.customer.delete({where:{id:duplicateCustomerId}})\n}\nawait t.$executeRawUnsafe(\'UPDATE "Customer" SET "lastName"=$2,"firstName"=$3,"lastNameKana"=$4,"firstNameKana"=$5 WHERE "id"=$1\',p.id,registrationLastNameV633,registrationFirstNameV633,registrationLastNameKanaV633,registrationFirstNameKanaV633)\nreturn g&&await t.contactLog.create',
  1,
  'persist structured name fields on the final customer record',
)

replaceExact(
  'prisma/schema.prisma',
  '  name                  String\n  gender                String?',
  '  name                  String\n  lastName              String?\n  firstName             String?\n  lastNameKana          String?\n  firstNameKana         String?\n  gender                String?',
  1,
  'document structured customer name fields in runtime schema',
)

const readinessAnchor = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Salon-Onboarding-Guides', 'removed-v632') /* salon-onboarding-guide-removal-v632-ready */"
replaceExact(
  'server.js',
  readinessAnchor,
  `${readinessAnchor}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Registration-Name-Fields', 'v633') /* ${marker}-ready */`,
  1,
  'customer registration name fields readiness marker',
)

fs.writeFileSync('/tmp/customer-registration-name-fields-v633-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({ release: marker, modified: [...new Set(changes.map(change => change.file))] }))
