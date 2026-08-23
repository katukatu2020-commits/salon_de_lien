import fs from 'node:fs'

const pagePath = '/app/.next/server/app/admin/appointments/page.js'
let page = fs.readFileSync(pagePath, 'utf8')

const oldFragment = `.split(',').map(Number).filter(Number.isInteger)`
const newFragment = `.split(',').filter(value => value.trim() !== '').map(Number).filter(Number.isInteger)`
const matches = page.split(oldFragment).length - 1

if (matches !== 2) {
  throw new Error(`shift capacity weekday normalization: expected 2 matches, found ${matches}`)
}

page = page.replaceAll(oldFragment, newFragment)
fs.writeFileSync(pagePath, page)
