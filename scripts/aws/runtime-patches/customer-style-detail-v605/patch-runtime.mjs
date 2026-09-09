import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const marker = 'customer-style-detail-v605'
const changes = []

function replaceExact(file, before, after, expected, label) {
  const target = path.join(root, file)
  const source = fs.readFileSync(target, 'utf8')
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  fs.writeFileSync(target, source.split(before).join(after))
  changes.push({ kind:'replace', file, before, after, count:expected })
}

function replaceSection(file, startNeedle, endNeedle, replacement, label) {
  const target = path.join(root, file)
  const source = fs.readFileSync(target, 'utf8')
  const start = source.indexOf(startNeedle)
  const end = source.indexOf(endNeedle, start + startNeedle.length)
  if (start < 0 || end < 0 || source.indexOf(startNeedle, start + 1) >= 0) {
    throw new Error(`${label}: section anchors were not unique`)
  }
  const before = source.slice(start, end)
  fs.writeFileSync(target, source.slice(0, start) + replacement + source.slice(end))
  changes.push({ kind:'replace', file, before, after:replacement, count:1 })
}

function append(file, addition, label) {
  const target = path.join(root, file)
  const source = fs.readFileSync(target, 'utf8')
  if (source.includes(addition.trim())) throw new Error(`${label}: patch already applied`)
  fs.writeFileSync(target, source + addition)
  changes.push({ kind:'append', file, addition })
}

const client = 'public/style-system-integration-v602.js'

replaceSection(
  client,
  '  function leadMarkup(style) {',
  '\n\n  function menuMarkup(style) {',
  `  function leadMarkup(style) {
    return \`<section class="orimia-style-lead-v602" aria-label="スタイルの概要">
      <p class="orimia-style-kicker-v602">SALON STYLE</p>
      <h1>\${esc(style.title)}</h1>
      <div class="orimia-style-lead-grid-v602 is-menu-only-v605">
        <div class="orimia-style-menu-compact-v602"><small>施術メニュー</small><strong>\${esc(menuLabel(style))}</strong></div>
      </div>
    </section>\`
  }`,
  'customer style lead',
)

replaceSection(
  client,
  '  function detailsMarkup(style) {',
  '\n\n  function suppressLegacy(article) {',
  `  function detailsMarkup(style) {
    const linkedLabel = audience === 'customer' ? '担当スタイリスト' : (style.stylist.linked ? 'ORIMIAスタイリスト' : '担当スタイリスト')
    const staffHeader = audience === 'staff'
      ? \`<header><p class="orimia-style-kicker-v602">STYLE PROFILE</p><h2>\${esc(style.title)}</h2></header>\`
      : ''
    const sourceFooter = audience === 'staff' && style.source
      ? \`<footer><span>\${esc([style.source.name, style.source.area].filter(Boolean).join(' / '))}</span><a href="\${esc(style.source.url)}" target="_blank" rel="noopener noreferrer">掲載元を見る</a></footer>\`
      : ''
    return \`<section class="orimia-style-details-v602" aria-label="スタイル情報">
      \${staffHeader}
      <div class="orimia-style-stylist-v602">\${avatar(style.stylist)}<div><small>\${linkedLabel}</small><strong>\${esc(style.stylist.name)}</strong>\${style.stylist.role ? \`<span>\${esc(style.stylist.role)}</span>\` : ''}\${style.stylist.specialties ? \`<p>得意な施術　\${esc(style.stylist.specialties)}</p>\` : ''}</div></div>
      \${style.comment ? \`<section class="orimia-style-copy-v602"><h3>スタイリストコメント</h3><p>\${esc(style.comment)}</p></section>\` : ''}
      <section class="orimia-style-menus-v602"><h3>メニュー内容</h3>\${menuMarkup(style)}</section>
      \${sourceFooter}
      \${audience === 'staff' ? '<button type="button" class="orimia-style-edit-v602" data-orimia-style-edit-v602>スタイル情報と紐付けを編集</button>' : ''}
    </section>\`
  }`,
  'customer style details',
)

replaceSection(
  client,
  '  function markGallery(article) {',
  '\n\n  function render() {',
  `  function markGallery(article) {
    const header = article.querySelector(':scope > header')
    let gallery = article.querySelector(':scope > .community-feed-media')
    if (!gallery && header?.nextElementSibling?.querySelector('a[aria-label="施術後写真を拡大表示"]')) gallery = header.nextElementSibling
    if (!gallery) return null
    const photos = [...gallery.querySelectorAll(':scope > a[aria-label="施術後写真を拡大表示"]')]
    gallery.classList.add('orimia-style-gallery-v602')
    gallery.dataset.photoCountV602 = String(photos.length)
    if (audience === 'customer') {
      gallery.classList.add('orimia-style-gallery-stable-v605')
      const positions = ['orimia-style-photo-primary-v605', 'orimia-style-photo-secondary-top-v605', 'orimia-style-photo-secondary-bottom-v605']
      for (const [index, photo] of photos.entries()) {
        for (const property of [
          'align-self', 'aspect-ratio', 'bottom', 'display', 'flex-grow', 'flex-shrink',
          'height', 'inset', 'left', 'max-height', 'max-width', 'min-height', 'min-width',
          'position', 'right', 'top', 'width',
        ]) photo.style.removeProperty(property)
        photo.classList.add('orimia-style-photo-v605')
        if (positions[index]) photo.classList.add(positions[index])
      }
    }
    return gallery
  }`,
  'stable customer gallery',
)

const css = 'public/style-system-integration-v602.css'
append(css, `

/* customer-style-detail-v605 */
.orimia-style-detail-customer-v602 .orimia-style-lead-grid-v602.is-menu-only-v605 {
  display: block;
}

.orimia-style-detail-customer-v602 .orimia-style-menu-compact-v602 {
  width: 100%;
}

.orimia-style-detail-customer-v602 .orimia-style-stylist-compact-v602,
.orimia-style-detail-customer-v602 .orimia-style-details-v602 > footer {
  display: none !important;
}

body .community-detail-page article.orimia-style-detail-customer-v602 > .orimia-style-gallery-stable-v605 {
  position: relative !important;
  isolation: isolate;
  contain: layout paint;
  display: block !important;
  clear: both;
  width: 100% !important;
  height: auto !important;
  min-height: 0 !important;
  max-height: none !important;
  aspect-ratio: 4 / 3 !important;
  overflow: hidden !important;
  grid-template: none !important;
  gap: 0 !important;
  background: #eee7df !important;
}

body .community-detail-page article.orimia-style-detail-customer-v602 > .orimia-style-gallery-stable-v605[data-photo-count-v602="2"] {
  aspect-ratio: 3 / 2 !important;
}

body .community-detail-page article.orimia-style-detail-customer-v602 > .orimia-style-gallery-stable-v605 > a.orimia-style-photo-v605 {
  position: absolute !important;
  inset: auto !important;
  box-sizing: border-box !important;
  display: block !important;
  min-width: 0 !important;
  min-height: 0 !important;
  max-width: none !important;
  max-height: none !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  contain: paint;
}

body .community-detail-page article.orimia-style-detail-customer-v602 > .orimia-style-gallery-stable-v605 > a.orimia-style-photo-v605 img {
  position: absolute !important;
  inset: 0 !important;
  display: block !important;
  width: 100% !important;
  height: 100% !important;
  min-width: 0 !important;
  min-height: 0 !important;
  max-width: none !important;
  max-height: none !important;
  margin: 0 !important;
  padding: 0 !important;
  aspect-ratio: auto !important;
  object-fit: cover !important;
}

body .community-detail-page article.orimia-style-detail-customer-v602 > .orimia-style-gallery-stable-v605[data-photo-count-v602="1"] > a.orimia-style-photo-primary-v605 {
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 100% !important;
}

body .community-detail-page article.orimia-style-detail-customer-v602 > .orimia-style-gallery-stable-v605[data-photo-count-v602="2"] > a.orimia-style-photo-primary-v605 {
  top: 0 !important;
  left: 0 !important;
  width: calc(50% - 2px) !important;
  height: 100% !important;
}

body .community-detail-page article.orimia-style-detail-customer-v602 > .orimia-style-gallery-stable-v605[data-photo-count-v602="2"] > a.orimia-style-photo-secondary-top-v605 {
  top: 0 !important;
  left: 50% !important;
  width: 50% !important;
  height: 100% !important;
}

body .community-detail-page article.orimia-style-detail-customer-v602 > .orimia-style-gallery-stable-v605[data-photo-count-v602="3"] > a.orimia-style-photo-primary-v605 {
  top: 0 !important;
  left: 0 !important;
  width: calc(66.6667% - 2px) !important;
  height: 100% !important;
}

body .community-detail-page article.orimia-style-detail-customer-v602 > .orimia-style-gallery-stable-v605[data-photo-count-v602="3"] > a.orimia-style-photo-secondary-top-v605 {
  top: 0 !important;
  left: 66.6667% !important;
  width: 33.3333% !important;
  height: calc(50% - 2px) !important;
}

body .community-detail-page article.orimia-style-detail-customer-v602 > .orimia-style-gallery-stable-v605[data-photo-count-v602="3"] > a.orimia-style-photo-secondary-bottom-v605 {
  top: 50% !important;
  left: 66.6667% !important;
  width: 33.3333% !important;
  height: 50% !important;
}

.community-detail-page article.orimia-style-detail-customer-v602 > .orimia-style-gallery-stable-v605 ~ .community-feed-content {
  position: relative;
  z-index: 2;
  clear: both;
  min-width: 0;
  background: #fff;
}

@media (min-width: 768px) {
  body .community-detail-page article.orimia-style-detail-customer-v602 > .orimia-style-gallery-stable-v605 {
    aspect-ratio: 16 / 10 !important;
  }
}
`, 'customer style layout CSS')

const server = 'server.js'
replaceExact(server, '/style-system-integration-v602.css?v=602', '/style-system-integration-v602.css?v=605-customer-detail1', 1, 'style CSS cache key')
replaceExact(server, '/style-system-integration-v602.js?v=602', '/style-system-integration-v602.js?v=605-customer-detail1', 1, 'style client cache key')

const readinessAnchor = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Mypage-Navigation', 'v604') /* customer-mypage-navigation-v604-ready */`
replaceExact(
  server,
  readinessAnchor,
  `${readinessAnchor}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Style-Detail', 'v605') /* ${marker}-ready */`,
  1,
  'customer style readiness header',
)

fs.writeFileSync('/tmp/customer-style-detail-v605-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({ release:marker, modified:[...new Set(changes.map(change => change.file))] }))
