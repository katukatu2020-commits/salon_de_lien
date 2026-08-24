import fs from 'node:fs'
import path from 'node:path'

const appRoot = '/app'
const profilePagePath = path.join(appRoot, '.next/server/app/u/(account)/profile/page.js')
const cssDirectory = path.join(appRoot, '.next/static/css')
const cssPatchPath = '/tmp/lien-v426/customer-profile-v426.css'

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

let profilePage = fs.readFileSync(profilePagePath, 'utf8')
profilePage = replaceOnce(
  profilePage,
  'defaultValue:(0,b.xW)(s.birthDate),className:w',
  'defaultValue:(0,b.xW)(s.birthDate),className:"customer-profile-birth-date-v426 "+w',
  'profile birth date class',
)

const staffFieldStart = '(0,a.jsxs)("label",{className:"grid gap-1.5 text-sm font-semibold text-[#4f463f] sm:col-span-2",children:["担当者・指名"'
const nextFieldStart = ',(0,a.jsxs)("div",{className:"rounded-xl bg-[#f8f3ed] px-4 py-3 sm:col-span-2"'
const startIndex = profilePage.indexOf(staffFieldStart)
if (startIndex < 0) throw new Error('profile assigned staff field start was not found')
const endIndex = profilePage.indexOf(nextFieldStart, startIndex)
if (endIndex < 0) throw new Error('profile assigned staff field end was not found')
profilePage =
  profilePage.slice(0, startIndex) +
  'a.jsx("input",{type:"hidden",name:"assignedStaffSelection",value:N})' +
  profilePage.slice(endIndex)
fs.writeFileSync(profilePagePath, profilePage)

const cssPatch = fs.readFileSync(cssPatchPath, 'utf8')
let cssFileCount = 0
for (const fileName of fs.readdirSync(cssDirectory)) {
  if (!fileName.endsWith('.css')) continue
  const filePath = path.join(cssDirectory, fileName)
  let css = fs.readFileSync(filePath, 'utf8')
  if (!css.includes('customer-profile-birth-date-v426')) {
    css += `\n${cssPatch}\n`
    fs.writeFileSync(filePath, css)
  }
  cssFileCount += 1
}
if (cssFileCount < 1) throw new Error('no compiled CSS files were patched')

console.log(`customer profile v426 patched (${cssFileCount} stylesheets)`)
