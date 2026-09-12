import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const marker = 'customer-profile-name-fields-v636'
const profilePage = '.next/server/app/u/(account)/profile/page.js'
const profileRoute = '.next/server/app/api/customer/profile/route.js'
const changes = []

function replaceExact(file, before, after, expected, label) {
  const target = path.join(root, file)
  const source = fs.readFileSync(target, 'utf8')
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  fs.writeFileSync(target, source.split(before).join(after))
  changes.push({ file, label, count })
}

replaceExact(
  profilePage,
  'if(!s||!r)return null;let j="assigned"===s.staffAssignmentType?',
  'if(!s||!r)return null;let profileNameV636=await require("/app/customer-profile-name-v636.js").loadCustomerProfileNameV636(f._,s.id,s.name),j="assigned"===s.staffAssignmentType?',
  1,
  'load structured profile name fields',
)

const oldNameField = '(0,a.jsxs)("label",{className:"grid gap-1.5 text-sm font-semibold text-[#4f463f]",children:["お名前",a.jsx("input",{name:"name",required:!0,maxLength:80,defaultValue:s.name,className:w})]})'
const separatedNameFields = '(0,a.jsxs)("label",{className:"grid gap-1.5 text-sm font-semibold text-[#4f463f]",children:["姓",a.jsx("input",{name:"lastName",required:!0,maxLength:50,autoComplete:"family-name",placeholder:"例: 山田",defaultValue:profileNameV636.lastName,className:w})]}),(0,a.jsxs)("label",{className:"grid gap-1.5 text-sm font-semibold text-[#4f463f]",children:["名",a.jsx("input",{name:"firstName",required:!0,maxLength:50,autoComplete:"given-name",placeholder:"例: 花子",defaultValue:profileNameV636.firstName,className:w})]}),(0,a.jsxs)("label",{className:"grid gap-1.5 text-sm font-semibold text-[#4f463f]",children:["セイ（フリガナ）",a.jsx("input",{name:"lastNameKana",required:!0,maxLength:50,autoComplete:"off",placeholder:"例: ヤマダ",defaultValue:profileNameV636.lastNameKana,className:w})]}),(0,a.jsxs)("label",{className:"grid gap-1.5 text-sm font-semibold text-[#4f463f]",children:["メイ（フリガナ）",a.jsx("input",{name:"firstNameKana",required:!0,maxLength:50,autoComplete:"off",placeholder:"例: ハナコ",defaultValue:profileNameV636.firstNameKana,className:w})]})'
replaceExact(profilePage, oldNameField, separatedNameFields, 1, 'render four profile name fields')

replaceExact(
  profilePage,
  '(0,a.jsxs)("form",{action:"/api/customer/profile",method:"post",className:"grid gap-5 lg:grid-cols-2",',
  '(0,a.jsxs)("form",{action:"/api/customer/profile",method:"post","data-customer-profile-name-fields-v636":"separated",className:"grid gap-5 lg:grid-cols-2",',
  1,
  'mark the separated profile form',
)

const invalidProfile = 'e?.profile==="invalid"?a.jsx("p",{role:"alert",className:"rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800",children:"入力内容を確認してください。プロフィールはまだ変更されていません。"}):null'
replaceExact(
  profilePage,
  invalidProfile,
  `${invalidProfile},e?.profile==="name"?a.jsx("p",{role:"alert",className:"rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800",children:"姓・名とそれぞれのフリガナを入力してください。フリガナはカタカナで入力してください。"}):null`,
  1,
  'add profile name validation guidance',
)

replaceExact(
  profileRoute,
  'let r=await e.formData(),n=g(r,"name"),o=g(r,"phone"),',
  'let r=await e.formData(),profileNameV636=require("/app/customer-profile-name-v636.js").parseCustomerProfileNameV636({lastName:g(r,"lastName"),firstName:g(r,"firstName"),lastNameKana:g(r,"lastNameKana"),firstNameKana:g(r,"firstNameKana")});if(!profileNameV636)return y(e,"name");let n=profileNameV636.fullName,o=g(r,"phone"),',
  1,
  'parse the four profile name fields',
)

replaceExact(
  profileRoute,
  'assignedStaffName:k?x:null}}),await e.hairProfile.upsert',
  'assignedStaffName:k?x:null}}),await require("/app/customer-profile-name-v636.js").persistCustomerProfileNameV636(e,r.id,profileNameV636),await e.hairProfile.upsert',
  1,
  'persist structured name fields in the profile transaction',
)

replaceExact(
  'server.js',
  `    const params = await readStorePlatformFormV503(req)
    const name = String(params.get('name') || '').trim()
    const nickname = String(params.get('nickname') || '').trim()`,
  `    const params = await readStorePlatformFormV503(req)
    const profileNameV636 = require('/app/customer-profile-name-v636.js').parseCustomerProfileNameV636({
      lastName: params.get('lastName'),
      firstName: params.get('firstName'),
      lastNameKana: params.get('lastNameKana'),
      firstNameKana: params.get('firstNameKana'),
    })
    if (!profileNameV636) return redirectCustomerProfileV503(res, 'name')
    const name = profileNameV636.fullName
    const nickname = String(params.get('nickname') || '').trim()`,
  1,
  'parse separated names in the priority profile handler',
)

replaceExact(
  'server.js',
  '        await tx.hairProfile.upsert({',
  `        await require('/app/customer-profile-name-v636.js').persistCustomerProfileNameV636(
          tx,
          target.id,
          profileNameV636,
        )
        await tx.hairProfile.upsert({`,
  1,
  'persist separated names for every linked customer record',
)

replaceExact(
  'customer-experience-v503.js',
  'const nameInput = profileForm?.querySelector(\'input[name="name"]\')',
  'const nameInput = profileForm?.querySelector(\'input[name="firstName"]\') || profileForm?.querySelector(\'input[name="name"]\')',
  1,
  'keep the nickname editor compatible with separated names',
)

replaceExact(
  'customer-experience-v503.js',
  '    nameInput.closest(\'label\')?.insertAdjacentElement(\'afterend\', field)',
  '    const insertionAnchor = profileForm.querySelector(\'input[name="firstNameKana"]\')?.closest(\'label\') || nameInput.closest(\'label\')\n    insertionAnchor?.insertAdjacentElement(\'afterend\', field)',
  1,
  'place nickname after the separated name fields',
)

replaceExact(
  'server.js',
  'customer-experience-v503.js?v=597-notification-badge1',
  'customer-experience-v503.js?v=636-profile-name-fields1',
  2,
  'refresh the immutable customer profile helper asset',
)

const readinessAnchor = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Booking-Confirmation-Name', 'v635') /* booking-confirmation-name-v635-ready */"
replaceExact(
  'server.js',
  readinessAnchor,
  `${readinessAnchor}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Profile-Name-Fields', 'v636') /* ${marker}-ready */`,
  1,
  'customer profile name fields readiness marker',
)

fs.writeFileSync('/tmp/customer-profile-name-fields-v636-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({ release: marker, modified: [...new Set(changes.map(change => change.file))] }))
