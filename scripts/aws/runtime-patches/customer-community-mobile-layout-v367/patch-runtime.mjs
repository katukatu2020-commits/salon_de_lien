import fs from 'node:fs'

const pagePath = '/app/.next/server/app/u/(account)/community/[postId]/page.js'
let page = fs.readFileSync(pagePath, 'utf8')

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

page = replaceOnce(
  page,
  'className:"mx-auto grid w-full max-w-3xl gap-4"',
  'className:"community-detail-page mx-auto flex w-full max-w-3xl flex-col gap-4"',
  'customer community detail root',
)

const css = `
.community-detail-page{display:flex!important;flex-direction:column!important;align-items:stretch!important;align-content:start!important;height:auto!important;min-height:0!important}
.community-detail-page>div.grid{display:block!important;align-self:start!important;width:100%!important;height:auto!important;min-height:0!important}
.community-detail-page article{display:block!important;align-self:start!important;width:100%!important;height:auto!important;min-height:0!important}
.community-detail-page article>header+div{align-content:start!important;grid-auto-rows:max-content!important;height:auto!important;min-height:0!important}
.community-detail-page article>header+div>a{display:block!important;width:100%!important;height:auto!important;min-height:0!important;aspect-ratio:4/3!important}
.community-detail-page article>header+div+div{display:block!important;align-self:start!important;height:auto!important;min-height:0!important}
.community-detail-page article>header+div+div>div:first-child{display:flex!important;flex-wrap:wrap!important;align-items:center!important;justify-content:flex-start!important;gap:.375rem 1rem!important;height:auto!important;min-height:0!important}
.community-detail-page article>header+div+div>div:first-child>*{flex:0 1 auto!important;margin:0!important}
@media(max-width:639px){.community-detail-page{gap:12px!important}.community-detail-page>div.grid{display:block!important}.community-detail-page article>header+div+div{padding:14px!important}.community-detail-page article>header+div+div>div:first-child{padding:10px 12px!important}}
`.replace(/\s+/g, ' ').trim()

const childrenAnchor = 'children:[(0,s.jsxs)(i.default,'
page = replaceOnce(
  page,
  childrenAnchor,
  `children:[(0,s.jsx)("style",{id:"customer-community-layout-v367",dangerouslySetInnerHTML:{__html:${JSON.stringify(css)}}}),(0,s.jsxs)(i.default,`,
  'customer community layout style',
)

fs.writeFileSync(pagePath, page)
