import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const patchRoot = path.dirname(fileURLToPath(import.meta.url))
const patchCss = fs.readFileSync(path.join(patchRoot, 'customer-chart-header-actions-v575.css'), 'utf8')
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const artifactRoot = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'orimia-customer-chart-header-actions-v575')
fs.mkdirSync(artifactRoot, { recursive:true })

const fixtureCss = `
  *{box-sizing:border-box;letter-spacing:0}
  body{margin:0;background:#faf7f5;color:#302824;font-family:sans-serif}
  .admin-main-content{padding:28px}
  .lien-chart-card{width:100%;overflow:hidden;border:1px solid #e5d6cf;border-radius:8px;background:#fff}
  .lien-chart-card-header{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:22px 26px}
  .lien-chart-heading{display:flex;align-items:center;gap:14px;min-width:0}
  .lien-chart-heading>span{display:grid;width:46px;height:46px;flex:0 0 auto;place-items:center;border-radius:8px;background:#fbedf1}
  .lien-chart-heading h2{margin:0;font-size:22px}.lien-chart-heading p{margin:5px 0 0;color:#8b7b74;font-size:11px}
  .lien-chart-heading-line{display:flex;align-items:center;gap:10px}.lien-chart-private{font-size:10px}
  .lien-chart-actions{display:flex;flex:0 0 auto;flex-wrap:wrap;align-items:center;gap:9px}
  .lien-chart-button{display:inline-flex;min-height:44px;align-items:center;justify-content:center;gap:8px;border:1px solid #ddcbc3;border-radius:7px;background:#fff;padding:0 17px;color:#6f554c;font-size:12px;font-weight:900}
  .lien-chart-button.primary{border-color:#b94662;background:#b94662;color:#fff}
  .admin-main-content button.primary{margin-top:16px}
  @media(max-width:900px){.lien-chart-card-header{align-items:flex-start;flex-direction:column}.lien-chart-actions{width:100%}}
  @media(max-width:640px){.admin-main-content{padding:14px}.lien-chart-card-header{gap:17px;padding:18px 16px}.lien-chart-actions{display:grid;grid-template-columns:1fr;gap:8px}.lien-chart-button{width:100%}}
  ${patchCss}
`

function markup() {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width"><style>${fixtureCss}</style></head><body><main class="admin-main-content"><section class="lien-chart-card" data-chart-latest-card-v561><header class="lien-chart-card-header"><div class="lien-chart-heading"><span>+</span><div><div class="lien-chart-heading-line"><h2>カルテファイル</h2><span class="lien-chart-private">店舗内限定</span></div><p>JPG・PNG・WebP・PDF、20MBまで</p></div></div><div class="lien-chart-actions"><button class="lien-chart-button" data-chart-history>履歴を見る（0件）</button><button class="lien-chart-button primary" data-chart-upload>ファイルを添付</button></div></header></section></main></body></html>`
}

async function inspect(page) {
  return page.evaluate(() => {
    const rect = selector => {
      const node = document.querySelector(selector)
      const box = node.getBoundingClientRect()
      const style = getComputedStyle(node)
      return { x:box.x, y:box.y, right:box.right, bottom:box.bottom, width:box.width, height:box.height, marginTop:style.marginTop }
    }
    return {
      viewport:innerWidth,
      overflow:Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth,
      actions:rect('.lien-chart-actions'),
      history:rect('[data-chart-history]'),
      upload:rect('[data-chart-upload]'),
    }
  })
}

const browser = await chromium.launch({ executablePath, headless:true })
try {
  for (const sample of [
    { name:'desktop', width:1440, height:900, stacked:false },
    { name:'tablet', width:820, height:900, stacked:false },
    { name:'mobile', width:390, height:844, stacked:true },
  ]) {
    const page = await browser.newPage({ viewport:{ width:sample.width, height:sample.height } })
    await page.setContent(markup(), { waitUntil:'load' })
    const layout = await inspect(page)
    assert.equal(layout.history.marginTop, '0px', `${sample.name}: history margin`)
    assert.equal(layout.upload.marginTop, '0px', `${sample.name}: upload margin`)
    assert.equal(layout.history.height, 44, `${sample.name}: history height`)
    assert.equal(layout.upload.height, 44, `${sample.name}: upload height`)
    assert.ok(layout.overflow <= 1, `${sample.name}: overflowed by ${layout.overflow}px`)
    if (sample.stacked) {
      assert.ok(Math.abs(layout.history.x - layout.upload.x) <= 0.5, 'mobile: button left edges differ')
      assert.ok(Math.abs(layout.history.width - layout.upload.width) <= 0.5, 'mobile: button widths differ')
      assert.ok(Math.abs(layout.upload.y - layout.history.bottom - 8) <= 0.5, 'mobile: button gap differs')
    } else {
      assert.ok(Math.abs(layout.history.y - layout.upload.y) <= 0.5, `${sample.name}: button tops differ`)
      assert.equal(layout.actions.height, 44, `${sample.name}: action row height`)
    }
    await page.screenshot({ path:path.join(artifactRoot, `${sample.name}.png`), fullPage:true })
    await page.close()
  }
  console.log(JSON.stringify({
    release:'customer-chart-header-actions-v575',
    browserVerified:true,
    desktop:true,
    tablet:true,
    mobile:true,
    artifacts:artifactRoot,
  }))
} finally {
  await browser.close()
}
