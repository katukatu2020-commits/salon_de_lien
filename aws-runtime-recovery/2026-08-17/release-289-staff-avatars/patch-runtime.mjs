import fs from 'node:fs'

const root = process.argv[2] || '/app'
const file = `${root}/customer-experience-v278.js`
let source = fs.readFileSync(file, 'utf8')

const marker = 'function canonicalStaffName(value)'
if (source.includes(marker)) {
  console.log('Staff avatar identity patch is already applied.')
  process.exit(0)
}

const start = source.indexOf('  function enrichBooking(directory) {')
const end = source.indexOf('\n\n  function normalizedName', start)
if (start < 0 || end < 0) throw new Error('The staff booking renderer could not be located.')

const replacement = String.raw`  function canonicalStaffName(value) {
    return String(value || '')
      .replace(/^[✓✔]\s*/, '')
      .replace(/[\s　]/g, '')
      .replace(/[邊邉]/g, '辺')
      .replace(/[﨑]/g, '崎')
      .replace(/[髙]/g, '高')
      .replace(/[濵濱]/g, '浜')
  }

  function enrichBooking(directory) {
    if (location.pathname !== '/u/appointments') return
    const byName = name => directory.find(item => canonicalStaffName(item.name) === canonicalStaffName(name))
    const avatarCounts = directory.reduce((counts, item) => {
      if (item.avatarUrl) counts.set(item.avatarUrl, (counts.get(item.avatarUrl) || 0) + 1)
      return counts
    }, new Map())
    const avatarFor = (item, className = 'cx-staff-avatar') => {
      if (item.avatarUrl && avatarCounts.get(item.avatarUrl) === 1) {
        const avatar = document.createElement('img')
        avatar.className = className
        avatar.src = item.avatarUrl
        avatar.alt = ''
        return avatar
      }
      return fallbackAvatar(item, className)
    }

    document.querySelectorAll('button[aria-pressed]').forEach(button => {
      if (button.querySelector('.cx-staff-avatar')) return
      const label = button.textContent.trim().replace(/^[✓✔]\s*/, '')
      if (!label || label === '指名なし') return
      const item = byName(label) || { key: label, name: label }
      button.prepend(avatarFor(item))
    })

    const selectedName = selectedStaffName()
    if (!selectedName || selectedName === '指名なし') return
    const item = byName(selectedName) || { key: selectedName, name: selectedName }
    const nameNode = [...document.querySelectorAll('p')].find(node => canonicalStaffName(node.textContent) === canonicalStaffName(selectedName))
    const profileCard = nameNode && nameNode.closest('.grid')
    if (!profileCard) return
    const visual = profileCard.querySelector('span.grid.h-16')
    if (visual && !profileCard.querySelector('.cx-profile-avatar')) visual.replaceWith(avatarFor(item, 'cx-profile-avatar'))
    const role = nameNode.parentElement && nameNode.parentElement.querySelector('p.text-xs')
    if (role && item.role && role.textContent !== item.role) role.textContent = item.role
    const columns = profileCard.children[1]
    if (columns) {
      const paragraphs = columns.querySelectorAll('p')
      if (paragraphs[0] && item.specialties && paragraphs[0].textContent !== item.specialties) paragraphs[0].textContent = item.specialties
      if (paragraphs[1] && item.introduction && paragraphs[1].textContent !== item.introduction) paragraphs[1].textContent = item.introduction
    }
  }`

source = source.slice(0, start) + replacement + source.slice(end)
fs.writeFileSync(file, source, 'utf8')
console.log('Patched booking staff avatar identity handling.')
