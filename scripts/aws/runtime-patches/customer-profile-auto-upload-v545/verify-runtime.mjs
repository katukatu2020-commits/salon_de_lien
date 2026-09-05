import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
const experience = fs.readFileSync(path.join(root, 'customer-experience-v503.js'), 'utf8')
const cropper = fs.readFileSync(path.join(root, 'customer-link-ui-v424.js'), 'utf8')
const sharedCropper = fs.readFileSync(path.join(root, 'customer-link-ui-v293.js'), 'utf8')
const customerRuntime = fs.readFileSync(path.join(root, 'customer-runtime-v267.js'), 'utf8')
const profileCropper = fs.readFileSync(path.join(root, 'public', 'customer-profile-image-v401.js'), 'utf8')
const customerChunkRoot = path.join(root, '.next', 'static', 'chunks', 'app', 'u', '(account)')
const customerChunk = fs.readFileSync(path.join(customerChunkRoot, 'layout-customer-mobile-nav-v425.profile-v545.js'), 'utf8')
const profileChunk = fs.readFileSync(path.join(customerChunkRoot, 'profile', 'page-profile-code-v267.auto-upload-v545.js'), 'utf8')

assert.match(server, /X-Lien-Customer-Profile-Auto-Upload', 'v545'/)
assert.equal((server.match(/customer-experience-v503\.js\?v=545-auto-profile1/g) || []).length, 2)
assert.equal((server.match(/customer-link-ui-v424\.js\?v=545-auto-profile1/g) || []).length, 2)
assert.doesNotMatch(server, /customer-experience-v503\.js\?v=529-release1/)
assert.doesNotMatch(server, /customer-link-ui-v424\.js\?v=424-1/)
assert.match(server, /layout-customer-mobile-nav-v425\.profile-v545\.js/)

assert.match(experience, /customer-profile-auto-upload-v545/)
assert.match(experience, /data-customer-profile-auto-upload-v545/)
assert.match(experience, /orimia:customer-profile-crop-ready-v545/)
assert.match(experience, /void uploadCroppedImage\(file \|\| input\.files\?\.\[0\], input, form\)/)
assert.match(experience, /fetch\('\/api\/customer\/profile-image'/)
assert.match(experience, /\[data-profile-upload-button-v424\].*display:none!important/)
assert.match(experience, /orimiaUiReady !== 'v516'/)
assert.match(experience, /location\.pathname === '\/u\/profile' && input\.name === 'profileImage'/)
assert.match(experience, /customer-link-ui-v424\.js\?v=545-auto-profile1/)

assert.match(cropper, /location\.pathname === '\/u\/profile' && input\.name === 'profileImage'/)
assert.match(cropper, /if \(location\.pathname === '\/u\/profile'\) return false/)
assert.match(cropper, /保存ボタンで確定してください/)
assert.match(sharedCropper, /if \(location\.pathname === '\/u\/profile'\) return false/)
assert.match(customerRuntime, /customer-link-ui-v293\.js\?v=545-auto-profile1/)
assert.doesNotMatch(customerRuntime, /customer-link-ui-v293\.js\?v=293-4/)

assert.match(profileCropper, /orimia:customer-profile-crop-ready-v545/)
assert.match(profileCropper, /detail: \{ file: cropped \}/)
assert.match(profileCropper, /event\.stopPropagation\(\)/)
assert.match(profileChunk, /customer-profile-image-v401\.js\?v=545-auto-profile1/)
assert.match(profileChunk, /customer-runtime-v267\.js\?v=545-auto-profile1/)
assert.match(profileChunk, /customer-profile-auto-upload-v545/)

assert.match(customerChunk, /customer-experience-v503\.js\?v=545-auto-profile1/)
assert.match(customerChunk, /customer-profile-auto-upload-v545/)

console.log(JSON.stringify({ release: 'customer-profile-auto-upload-v545', verified: true }))
