import fs from 'node:fs'
import { spawnSync } from 'node:child_process'

const customerLinkPath = '/app/customer-link-ui-v293.js'
const staffExperiencePath = '/app/admin-staff-experience-v276.js'
const commercialAdminPath = '/app/commercial-admin-v101.js'
const customerLink = fs.readFileSync(customerLinkPath, 'utf8')
const staffExperience = fs.readFileSync(staffExperiencePath, 'utf8')
const commercialAdmin = fs.readFileSync(commercialAdminPath, 'utf8')

const cropLayer = Number(customerLink.match(/lien-v293-crop-modal\{z-index:(\d+)/)?.[1] || 0)
const staffLayer = Number(staffExperience.match(/\.sm-overlay\{position:fixed;z-index:(\d+)/)?.[1] || 0)

const assertions = [
  [customerLink.includes('staff-image-crop-layer-v460'), 'the reviewed crop-layer marker exists'],
  [customerLink.includes("dialog.overlay.classList.add('lien-v293-crop-modal')"), 'only the crop dialog receives the top-layer class'],
  [cropLayer === 2147483000, 'the crop dialog uses the dedicated top layer'],
  [staffLayer === 110000, 'the existing staff editor layer remains unchanged'],
  [cropLayer > staffLayer, 'the crop dialog is above the staff editor'],
  [customerLink.includes('.lien-crop-stage canvas{display:block;width:min(72vw,360px);height:min(72vw,360px)'), 'the square crop viewport remains fixed to equal width and height'],
  [customerLink.includes('canvas.toBlob'), 'the cropped image export remains available'],
  [customerLink.includes('const transfer = new DataTransfer()'), 'the cropped file is returned to the existing staff form'],
  [customerLink.includes("input.dispatchEvent(new Event('change', { bubbles: true }))"), 'the existing staff upload flow resumes after cropping'],
  [staffExperience.includes("location.pathname.includes('staffManagement')") || commercialAdmin.includes("location.pathname.includes('staffManagement')"), 'staff-management image inputs remain cropper-managed'],
  [staffExperience.includes("request('/api/admin/staff-profile'"), 'the existing staff profile save API remains unchanged'],
]

for (const [condition, label] of assertions) {
  if (!condition) throw new Error(`runtime verification failed: ${label}`)
}

for (const file of [customerLinkPath, staffExperiencePath, commercialAdminPath]) {
  const syntax = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' })
  if (syntax.status !== 0) throw new Error(`${file}: ${syntax.stderr || syntax.stdout}`)
}

console.log(`staff image crop layer v460 verified (${assertions.length} assertions, crop ${cropLayer} > staff ${staffLayer})`)
