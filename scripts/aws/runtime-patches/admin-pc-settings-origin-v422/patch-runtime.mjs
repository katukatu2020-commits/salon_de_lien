import fs from 'node:fs'

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

function writePatched(filePath, transform) {
  const source = fs.readFileSync(filePath, 'utf8')
  fs.writeFileSync(filePath, transform(source))
}

const pcShellStyles = `
      html.ca-settings-embedded,html.ca-settings-embedded body{width:100%!important;min-width:0!important;max-width:100%!important;overflow-x:hidden!important}
      html.ca-settings-embedded body .admin-app-shell{width:100%!important;min-width:0!important;max-width:100%!important;overflow:hidden!important}
      html.ca-settings-embedded body .admin-main-content{width:100%!important;min-width:0!important;max-width:100%!important;overflow-x:hidden!important}
      html.ca-admin-pc-shell body .admin-app-shell>aside.admin-desktop-sidebar{position:fixed!important;inset:0 auto 0 0!important;width:16rem!important;min-width:16rem!important;max-width:16rem!important;height:100dvh!important;min-height:100dvh!important;border-right:1px solid var(--lien-border,#e8ded2)!important;border-top:0!important;border-radius:0!important}
      html.ca-admin-pc-shell body .admin-app-shell>aside.admin-desktop-sidebar>div{display:flex!important;width:100%!important;height:100dvh!important;min-height:100dvh!important;flex-direction:column!important}
      html.ca-admin-pc-shell body .admin-app-shell>aside.admin-desktop-sidebar>div>div.border-b,html.ca-admin-pc-shell body .admin-app-shell>aside.admin-desktop-sidebar>div>div.mx-3,html.ca-admin-pc-shell body .admin-app-shell>aside.admin-desktop-sidebar>div>div.mt-auto{display:block!important}
      html.ca-admin-pc-shell body .admin-app-shell>aside.admin-desktop-sidebar nav{position:static!important;inset:auto!important;display:grid!important;width:100%!important;height:auto!important;grid-template-columns:minmax(0,1fr)!important;align-content:start!important;gap:.25rem!important;overflow-y:auto!important;padding:.75rem!important}
      html.ca-admin-pc-shell body .admin-app-shell>aside.admin-desktop-sidebar nav a{display:flex!important;min-width:0!important;min-height:2.75rem!important;align-items:center!important;justify-content:flex-start!important;gap:.75rem!important;border-radius:.75rem!important;padding:.625rem .75rem!important;text-align:left!important}
      html.ca-admin-pc-shell body .admin-app-shell>aside.admin-desktop-sidebar nav a span{display:block!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}
      html.ca-admin-pc-shell body .admin-app-shell>aside.admin-desktop-sidebar button[aria-label="メニューを閉じる"],html.ca-admin-pc-shell body .admin-app-shell>aside.admin-desktop-sidebar button.touch-manipulation{display:none!important}
      html.ca-admin-pc-shell body .admin-app-shell .admin-mobile-header,html.ca-admin-pc-shell body .admin-app-shell .admin-mobile-sidebar{display:none!important}
      html.ca-admin-pc-shell body .admin-app-shell .admin-desktop-header{display:flex!important}
    `

writePatched('/app/commercial-admin-v101.js', source => {
  let patched = replaceOnce(
    source,
    `    document.head.appendChild(style)\n    const isolatedStart = style.textContent.indexOf('.ca-settings-embedded header.admin-shell-header')`,
    `    style.textContent += ${JSON.stringify(pcShellStyles)}\n    document.head.appendChild(style)\n    const isolatedStart = style.textContent.indexOf('.ca-settings-embedded header.admin-shell-header')`,
    'desktop shell final styles',
  )

  patched = replaceOnce(
    patched,
    `  function enforceAdminDesktopShell() {\n    if (!location.pathname.startsWith('/admin') || !document.querySelector('.admin-app-shell')) return\n    document.documentElement.classList.add('ca-admin-pc-shell')\n  }`,
    `  function enforceAdminDesktopShell() {
    if (!location.pathname.startsWith('/admin') || !document.querySelector('.admin-app-shell')) return
    const embeddedSettings = location.pathname === '/admin/settings' && new URLSearchParams(location.search).get('embedded') === '1'
    if (embeddedSettings) {
      document.documentElement.classList.remove('ca-admin-pc-shell')
      document.documentElement.classList.add('ca-settings-embedded')
      return
    }
    document.documentElement.classList.add('ca-admin-pc-shell')
    const shell = document.querySelector('.admin-app-shell')
    const sidebar = shell?.querySelector(':scope > aside.admin-desktop-sidebar')
    const nav = sidebar?.querySelector('nav')
    if (sidebar) {
      sidebar.style.setProperty('display', 'block', 'important')
      sidebar.style.setProperty('position', 'fixed', 'important')
      sidebar.style.setProperty('inset', '0 auto 0 0', 'important')
      sidebar.style.setProperty('width', '16rem', 'important')
      sidebar.style.setProperty('min-width', '16rem', 'important')
      sidebar.style.setProperty('max-width', '16rem', 'important')
      sidebar.style.setProperty('height', '100dvh', 'important')
    }
    if (nav) {
      nav.style.setProperty('position', 'static', 'important')
      nav.style.setProperty('inset', 'auto', 'important')
      nav.style.setProperty('display', 'grid', 'important')
      nav.style.setProperty('grid-template-columns', 'minmax(0, 1fr)', 'important')
      nav.style.setProperty('width', '100%', 'important')
      nav.style.setProperty('height', 'auto', 'important')
    }
    sidebar?.querySelectorAll(':scope > div > div.border-b,:scope > div > div.mx-3,:scope > div > div.mt-auto').forEach(node => node.style.setProperty('display', 'block', 'important'))
    sidebar?.querySelectorAll('button[aria-label="メニューを閉じる"],button.touch-manipulation').forEach(node => {
      node.style.setProperty('display', 'none', 'important')
      if (node.classList.contains('touch-manipulation')) node.closest('form')?.style.setProperty('display', 'none', 'important')
    })
    shell?.querySelectorAll('.admin-mobile-header,.admin-mobile-sidebar').forEach(node => node.style.setProperty('display', 'none', 'important'))
    shell?.querySelectorAll('.admin-desktop-header').forEach(node => node.style.setProperty('display', 'flex', 'important'))
  }`,
    'desktop shell enforcement',
  )
  return patched
})

writePatched('/app/sales-ledger-client-v318.js', source => replaceOnce(
  source,
  `    if (!isAccountSettingsPage() || accountInjecting || document.querySelector('[data-sl-shared-account]')) return`,
  `    if (!isAccountSettingsPage() || !document.querySelector('a[href="/admin/owner-analytics"]') || accountInjecting || document.querySelector('[data-sl-shared-account]')) return`,
  'owner-only shared account injection',
))

writePatched('/app/.next/server/app/admin/owner-analytics/page.js', source => {
  let patched = replaceOnce(
    source,
    `            {\n              key: "billing",\n              href: "/admin/owner-analytics?section=billing",\n              label: "システム利用料",\n            },`,
    `            {
              key: "ledger",
              href: "/admin/owner-analytics?salesLedger=1",
              label: "会計データ管理",
            },
            {
              key: "billing",
              href: "/admin/owner-analytics?section=billing",
              label: "システム利用料",
            },`,
    'server owner ledger tab',
  )
  patched = replaceOnce(
    patched,
    `"grid w-full grid-cols-2 gap-1 rounded-[18px] border border-lien bg-white p-1 shadow-lien-sm"`,
    `"grid w-full grid-cols-3 gap-1 rounded-[18px] border border-lien bg-white p-1 shadow-lien-sm"`,
    'server owner three-column tabs',
  )
  return patched
})

const canonicalOriginHelpers = [
  {
    path: '/app/catalog-operations.js',
    name: 'validSameOrigin',
    protocol: `'https'`,
    template: `protocol + '://' + host`,
  },
  {
    path: '/app/store-profile.js',
    name: 'sameOrigin',
    protocol: `'https'`,
    template: `protocol + '://' + host`,
  },
  {
    path: '/app/customer-store-staff-v276.js',
    name: 'sameOrigin',
    protocol: `(host.includes('localhost') ? 'http' : 'https')`,
    template: `protocol + '://' + host`,
  },
  {
    path: '/app/customer-links-v293.js',
    name: 'sameOrigin',
    protocol: `(host.includes('localhost') ? 'http' : 'https')`,
    template: '`${protocol}://${host}`',
  },
]

for (const helper of canonicalOriginHelpers) {
  writePatched(helper.path, source => {
    const before = `function ${helper.name}(req) {
  const origin = String(req.headers.origin || '').trim()
  if (!origin) return false
  const allowed = new Set()
  try { allowed.add(new URL(process.env.APP_URL || 'https://salon-de-lien.com').origin) } catch {}
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim()
  const protocol = String(req.headers['x-forwarded-proto'] || ${helper.protocol}).split(',')[0].trim()
  if (host) allowed.add(${helper.template})
  return allowed.has(origin)
}`
    const after = `function ${helper.name}(req) {
  const origin = String(req.headers.origin || '').trim()
  if (!origin) return false
  const allowed = new Set(['https://salon-de-lien.com', 'https://www.salon-de-lien.com'])
  for (const key of ['APP_URL', 'NEXT_PUBLIC_APP_URL', 'APP_BASE_URL', 'AUTH_BASE_URL', 'NEXTAUTH_URL']) {
    try { if (process.env[key]) allowed.add(new URL(process.env[key]).origin) } catch {}
  }
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim()
  const protocol = String(req.headers['x-forwarded-proto'] || (host.includes('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https')).split(',')[0].trim()
  if (host) allowed.add(protocol + '://' + host)
  try { return allowed.has(new URL(origin).origin) } catch { return false }
}`
    return replaceOnce(source, before, after, `${helper.path} canonical same-origin`)
  })
}

console.log('admin PC shell, settings and origin v422 runtime patched')
