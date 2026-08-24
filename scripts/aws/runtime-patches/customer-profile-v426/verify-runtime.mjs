import fs from 'node:fs'
import path from 'node:path'

const appRoot = '/app'
const profilePagePath = path.join(appRoot, '.next/server/app/u/(account)/profile/page.js')
const cssDirectory = path.join(appRoot, '.next/static/css')
const profilePage = fs.readFileSync(profilePagePath, 'utf8')

if (profilePage.includes('担当者・指名')) throw new Error('visible assigned staff field remains on customer profile')
if (!profilePage.includes('type:"hidden",name:"assignedStaffSelection",value:N')) {
  throw new Error('assigned staff preservation input is missing')
}
if (!profilePage.includes('className:"customer-profile-birth-date-v426 "+w')) {
  throw new Error('profile birth date class is missing')
}

const cssFiles = fs.readdirSync(cssDirectory).filter((fileName) => fileName.endsWith('.css'))
if (cssFiles.length < 1) throw new Error('compiled CSS files are missing')
for (const fileName of cssFiles) {
  const css = fs.readFileSync(path.join(cssDirectory, fileName), 'utf8')
  if (!css.includes('customer-profile-birth-date-v426[type="date"]::-webkit-date-and-time-value')) {
    throw new Error(`${fileName}: profile date alignment CSS is missing`)
  }
}

console.log('customer profile v426 verified')
