import fs from 'node:fs'

const pagePath = '/app/.next/server/app/u/(account)/community/[postId]/page.js'
let page = fs.readFileSync(pagePath, 'utf8')

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

const css = `
@media(max-width:639px){
html body .community-detail-page{display:block!important;width:100%!important;height:auto!important;min-height:0!important;max-height:none!important;align-self:start!important;align-content:start!important}
html body .community-detail-page>div.grid{display:block!important;width:100%!important;height:auto!important;min-height:0!important;max-height:none!important;align-self:start!important;align-content:start!important;grid-auto-rows:max-content!important}
html body .community-detail-page article{display:block!important;width:100%!important;height:auto!important;min-height:0!important;max-height:none!important;align-self:start!important;align-content:start!important;flex:none!important}
html body .community-detail-page article div{height:auto!important;min-height:0!important;max-height:none!important;flex-grow:0!important;align-self:auto!important}
html body .community-detail-page article>div:first-of-type{display:grid!important;width:100%!important;grid-auto-rows:max-content!important;align-content:start!important}
html body .community-detail-page article>div:first-of-type>a{display:block!important;width:100%!important;height:auto!important;min-height:0!important;max-height:none!important;aspect-ratio:4/3!important;align-self:start!important;flex:none!important}
html body .community-detail-page article>div:last-of-type{display:block!important;width:100%!important;height:auto!important;min-height:0!important;max-height:none!important;padding:14px!important;flex:none!important}
html body .community-detail-page article>div:last-of-type>div:first-child{display:flex!important;flex-wrap:wrap!important;align-items:center!important;justify-content:flex-start!important;gap:6px 16px!important;width:100%!important;height:auto!important;min-height:0!important;max-height:none!important;padding:10px 12px!important;flex:none!important}
html body .community-detail-page article>div:last-of-type>div:first-child>*{flex:0 1 auto!important;margin:0!important}
html body .community-detail-page article>div:last-of-type>div.mt-4.grid{display:grid!important;grid-auto-rows:max-content!important;align-content:start!important;width:100%!important;height:auto!important;min-height:0!important;max-height:none!important;flex:none!important}
html body .community-detail-page article>div:last-of-type>div.mt-4.grid>div{height:auto!important;min-height:0!important;max-height:none!important;flex:none!important}
}
`.replace(/\s+/g, ' ').trim()

const anchor = 'children:[(0,s.jsx)("style",{id:"customer-community-layout-v367"'
if (!page.includes(anchor)) throw new Error('customer community v367 style anchor is missing')

const childrenAnchor = 'children:[(0,s.jsx)("style",{id:"customer-community-layout-v367"'
page = replaceOnce(
  page,
  childrenAnchor,
  `children:[(0,s.jsx)("style",{id:"customer-community-content-height-v375",dangerouslySetInnerHTML:{__html:${JSON.stringify(css)}}}),(0,s.jsx)("style",{id:"customer-community-layout-v367"`,
  'customer community content-height style',
)

fs.writeFileSync(pagePath, page)
