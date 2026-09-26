export const marker = 'style-mobile-stability-v676'

function replaceOne(source, before, after) {
  if (source.split(before).length !== 2) throw new Error(`Unexpected parent: ${before}`)
  return source.replace(before, after)
}

export function patchLegacyClient(source) {
  if (source.includes(marker)) throw new Error('Already patched')
  const ownsList = `  function modernStyleListOwnsPageV676() {
    return Boolean(window.__orimiaStyleAdminControlsV618 || document.querySelector(
      '.orimia-style-admin-v618, [data-orimia-style-list-shell-v640]',
    ));
  }

`
  source = replaceOne(source, '  async function enhanceCommunityList() {', ownsList + `  async function enhanceCommunityList() {
    // The paginated renderer owns this DOM, including its loading/error states.
    if (modernStyleListOwnsPageV676()) return;`)
  source = replaceOne(source,
    '    if (!/^\\/admin\\/community\\/?$/.test(location.pathname)) return;',
    `    if (!/^\\/admin\\/community\\/?$/.test(location.pathname) || modernStyleListOwnsPageV676()) return;`)
  return source + `\n/* ${marker} */\n`
}

export function patchServer(source) {
  const anchor = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Salon-Branch-Inquiry', 'v675') /* salon-branch-inquiry-v675-ready */"
  source = replaceOne(source, anchor, anchor + `\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Style-Mobile-Stability', 'v676') /* ${marker}-ready */`)
  return replaceOne(source, '/style-admin-controls-v618.css?v=649-scroll1', '/style-admin-controls-v618.css?v=676-focus1')
}
