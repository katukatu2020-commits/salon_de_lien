import fs from 'node:fs'

const campaignPath = '/app/customer-campaigns-v427.js'
const marker = 'campaign-admin-layout-v457'

function boundedSection(source, startToken, endToken, label) {
  const start = source.indexOf(startToken)
  const end = source.indexOf(endToken, start + startToken.length)
  if (start < 0 || end < 0) throw new Error(`${label}: section was not found`)
  return { start, end, value: source.slice(start, end) }
}

function replaceSection(source, section, value) {
  return source.slice(0, section.start) + value + source.slice(section.end)
}

let source = fs.readFileSync(campaignPath, 'utf8')
if (source.includes(marker)) throw new Error(`${marker}: patch is already applied`)

const cssSection = boundedSection(
  source,
  '  function adminCssV429() {',
  '  function adminShellV429',
  'campaign admin CSS',
)
const cssClose = cssSection.value.lastIndexOf('`')
if (cssClose < 0) throw new Error('campaign admin CSS: template end was not found')

const layoutCss = `/* ${marker} */
html,body{min-width:1100px}
body{font-family:"Noto Sans JP","Hiragino Kaku Gothic ProN","Yu Gothic UI",Meiryo,system-ui,-apple-system,"Segoe UI",sans-serif}
.wrap{width:100%;max-width:1152px;margin:0 auto;padding:24px 24px 48px}
.workspace-tabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;border:1px solid var(--border);border-radius:18px;background:#fff;padding:4px;box-shadow:0 4px 14px rgba(47,42,37,.05)}
.workspace-tabs a{display:inline-flex;min-height:44px;align-items:center;justify-content:center;gap:8px;border-radius:14px;padding:0 16px;color:var(--muted);font-size:14px;font-weight:600;white-space:nowrap;transition:background-color .16s,color .16s,box-shadow .16s}
.workspace-tabs a svg{width:16px;height:16px;flex:0 0 auto}
.workspace-tabs a:hover{background:var(--soft);color:var(--ink)}
.workspace-tabs a.active{background:var(--primary);color:#fff;box-shadow:0 1px 3px rgba(47,42,37,.16)}
.workspace-tabs a.active svg{color:#fff}
.hero{margin-top:24px;border:1px solid var(--border);border-radius:28px;background:linear-gradient(145deg,#fffaf8,#f8f0e9);padding:24px;box-shadow:0 10px 30px rgba(47,42,37,.05)}
.eyebrow{display:inline-flex;align-items:center;gap:8px;border:1px solid #eab8c5;border-radius:999px;background:#fff;padding:7px 12px;color:#a23f59;font-size:12px;font-weight:700}
.eyebrow svg{width:16px;height:16px}
.hero h1{margin:12px 0 0;font-family:inherit;font-size:30px;font-weight:600;line-height:1.3;letter-spacing:0}
.hero p{max-width:800px;margin:10px 0 0;color:var(--muted);font-size:14px;line-height:1.75}
.grid{display:grid;grid-template-columns:minmax(0,1fr) 352px;gap:24px;margin-top:24px;align-items:start}
.card{border:1px solid var(--border);border-radius:22px;background:#fff;padding:24px;box-shadow:0 8px 24px rgba(47,42,37,.06)}
.card h2{font-family:inherit;font-size:18px;font-weight:600;letter-spacing:0}
.card-intro{font-size:13px;line-height:1.7}
.input{min-height:48px;border-radius:12px;font-size:14px}
.primary,.secondary,.danger{min-height:44px;font-size:13px;font-weight:700}
.history{gap:16px}
.history article{border-radius:16px;box-shadow:0 3px 12px rgba(47,42,37,.04)}
html[data-ca-theme="dark"] .workspace-tabs,html[data-ca-theme="dark"] .card,html[data-ca-theme="dark"] .history article{border-color:var(--border);background:#211b18;color:var(--ink)}
html[data-ca-theme="dark"] .workspace-tabs a.active{background:#4a2934;color:#f2b0c3;box-shadow:inset 0 0 0 1px #673747}
html[data-ca-theme="dark"] .workspace-tabs a.active svg{color:#f2b0c3}
html[data-ca-theme="dark"] .hero{border-color:var(--border);background:linear-gradient(145deg,#211b18,#2a221e)}
@media(max-width:1279px){.wrap{padding-left:24px;padding-right:24px}.grid{grid-template-columns:minmax(0,1fr) 320px}}
`

const patchedCss = cssSection.value.slice(0, cssClose) + layoutCss + cssSection.value.slice(cssClose)
source = replaceSection(source, cssSection, patchedCss)

const iconSection = boundedSection(
  source,
  '  function adminIconV429(name) {',
  '  // ui-regression-audit-v432',
  'campaign admin icons',
)
const campaignIconToken = "      campaign: '<path d=\"M3 11v2a2 2 0 0 0 2 2h2l4 5h3l-2-5 7-3V6l-12 4H5a2 2 0 0 0-2 1Z\"/><path d=\"M19 8a3 3 0 0 0 0-6\"/>',"
const iconCount = iconSection.value.split(campaignIconToken).length - 1
if (iconCount !== 1) throw new Error(`campaign admin icons: expected 1 campaign icon, found ${iconCount}`)
const addedIcons = `      message: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/>',
      megaphone: '<path d="m3 11 18-5v12L3 14v-3Z"/><path d="M11.6 16.1 13 21H7l-1.5-6"/>',
${campaignIconToken}`
const patchedIcons = iconSection.value.replace(campaignIconToken, addedIcons)
source = replaceSection(source, iconSection, patchedIcons)

const shellSection = boundedSection(
  source,
  '  function adminShellV429',
  '  async function adminPageV429',
  'campaign admin shell',
)
const tabStart = shellSection.value.indexOf('    const tabs = `<nav class="workspace-tabs"')
const tabEnd = shellSection.value.indexOf('</nav>`', tabStart)
if (tabStart < 0 || tabEnd < 0) throw new Error('campaign admin shell: workspace tabs were not found')

let tabMarkup = shellSection.value.slice(tabStart, tabEnd + '</nav>`'.length)
const oldIconCount = tabMarkup.split("adminIconV429('campaign')").length - 1
if (oldIconCount !== 3) throw new Error(`campaign admin tabs: expected 3 campaign icons, found ${oldIconCount}`)
tabMarkup = tabMarkup.replace("adminIconV429('campaign')", "adminIconV429('message')")
tabMarkup = tabMarkup.replace("adminIconV429('campaign')", "adminIconV429('megaphone')")

let patchedShell = shellSection.value.slice(0, tabStart) + tabMarkup + shellSection.value.slice(tabEnd + '</nav>`'.length)
const mainToken = '<main class="wrap">'
const mainCount = patchedShell.split(mainToken).length - 1
if (mainCount !== 1) throw new Error(`campaign admin shell: expected 1 main element, found ${mainCount}`)
patchedShell = patchedShell.replace(mainToken, `<main class="wrap" data-layout="${marker}">`)
source = replaceSection(source, shellSection, patchedShell)

fs.writeFileSync(campaignPath, source)
console.log(`${marker} patched`)
