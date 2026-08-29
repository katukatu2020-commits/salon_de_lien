import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const runtimePath = `${root}/admin-staff-experience-v276.js`
const marker = 'staff-avatar-stability-v463'

const oldBlock = `  function updateHeaderAvatar(profile) {
    if (!profile?.avatarUrl) return
    document.querySelectorAll('[data-ca-current-user]').forEach(node => {
      let image = node.querySelector('.sm-current-avatar')
      if (!image) { image = document.createElement('img'); image.className = 'sm-current-avatar'; image.alt = ''; node.prepend(image) }
      image.src = profile.avatarUrl + (profile.avatarUrl.includes('?') ? '&' : '?') + 'v=' + Date.now()
      node.querySelector('svg')?.remove()
    })
  }
`

const newBlock = `  /* ${marker}: keep one stable same-origin URL so DOM observers cannot abort image loading. */
  function stableHeaderAvatarUrl(value) {
    try {
      const source = new URL(String(value), location.origin)
      if (source.origin !== location.origin) return String(value)
      if (source.pathname === '/api/lien-staff-avatar') source.searchParams.set('audience', 'staff')
      return source.pathname + source.search + source.hash
    } catch {
      return String(value)
    }
  }

  function updateHeaderAvatar(profile) {
    if (!profile?.avatarUrl) return
    const target = stableHeaderAvatarUrl(profile.avatarUrl)
    document.querySelectorAll('[data-ca-current-user]').forEach(node => {
      let image = node.querySelector('.sm-current-avatar')
      if (!image) { image = document.createElement('img'); image.className = 'sm-current-avatar'; image.alt = ''; node.prepend(image) }
      if (image.getAttribute('src') !== target) image.src = target
      node.querySelector('svg')?.remove()
    })
  }
`

const source = fs.readFileSync(runtimePath, 'utf8')
if (source.includes(marker)) throw new Error(`${marker}: runtime patch already applied`)
const first = source.indexOf(oldBlock)
if (first < 0 || source.indexOf(oldBlock, first + oldBlock.length) >= 0) {
  throw new Error(`${marker}: expected exactly one legacy header avatar updater`)
}

fs.writeFileSync(runtimePath, source.replace(oldBlock, newBlock))
console.log(`${marker} runtime patched`)
