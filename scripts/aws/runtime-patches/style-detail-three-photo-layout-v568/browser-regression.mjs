import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3143').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const artifactRoot = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'orimia-style-detail-three-photo-layout-v568')
fs.mkdirSync(artifactRoot, { recursive:true })

const browser = await chromium.launch({ executablePath, headless:true })
const results = {}

try {
  for (const [name, viewport] of [
    ['desktop', { width:1600, height:1000 }],
    ['mobile', { width:390, height:844 }],
  ]) {
    const context = await browser.newContext({ viewport, deviceScaleFactor:1 })
    const login = await context.request.post(`${baseUrl}/api/auth/login`, {
      form:{ email:'demo.owner', password:'LienDemo2026!', next:'/admin/community' },
    })
    assert.ok(login.ok(), `${name}: login failed with ${login.status()}`)

    const errors = []
    const page = await context.newPage()
    page.on('console', message => {
      if (message.type() === 'error') errors.push(`console: ${message.text()}`)
    })
    page.on('pageerror', error => errors.push(`page: ${error.message}`))

    await page.goto(`${baseUrl}/admin/community/showcase-yohaku-community-post-001`, {
      waitUntil:'networkidle',
    })
    await page.waitForFunction(() => Boolean(window.__lienStyleDetailThreePhotoLayoutV568))

    const grid = page.locator('.ts-community-detail article > header + div').first()
    await grid.waitFor({ state:'visible' })
    await grid.evaluate(node => {
      const first = node.querySelector(':scope > a[aria-label="施術後写真を拡大表示"]')
      if (!first) throw new Error('photo fixture was not found')
      while (node.children.length > 1) node.lastElementChild?.remove()
      for (const direction of ['SIDE', 'BACK']) {
        const clone = first.cloneNode(true)
        clone.dataset.testDirection = direction
        clone.setAttribute('aria-label', '施術後写真を拡大表示')
        node.appendChild(clone)
      }
      window.__lienStyleDetailThreePhotoLayoutV568.refresh()
    })

    const expectedLayout = name === 'desktop' ? 'triptych' : 'stack'
    await page.waitForFunction(
      ({ selector, layout }) => document.querySelector(selector)?.getAttribute('data-style-detail-photo-layout-v568') === layout,
      { selector:'.ts-community-detail article > header + div', layout:expectedLayout },
    )

    const measurement = await grid.evaluate(node => {
      const photos = [...node.querySelectorAll(':scope > a')]
      const gridBox = node.getBoundingClientRect()
      const boxes = photos.map(photo => {
        const box = photo.getBoundingClientRect()
        return { x:box.x, y:box.y, width:box.width, height:box.height, right:box.right, bottom:box.bottom }
      })
      return {
        layout:node.getAttribute('data-style-detail-photo-layout-v568'),
        columns:getComputedStyle(node).gridTemplateColumns,
        grid:{ x:gridBox.x, y:gridBox.y, width:gridBox.width, height:gridBox.height, right:gridBox.right },
        boxes,
        documentWidth:document.documentElement.scrollWidth,
        viewportWidth:innerWidth,
      }
    })

    assert.equal(measurement.boxes.length, 3, `${name}: three photos were not rendered`)
    assert.ok(measurement.documentWidth <= measurement.viewportWidth, `${name}: horizontal overflow`)

    if (name === 'desktop') {
      assert.equal(measurement.columns.trim().split(/\s+/).length, 2, 'desktop: expected two mosaic columns')
      assert.ok(measurement.boxes[1].x > measurement.boxes[0].x, 'desktop: side photo is not in the right column')
      assert.ok(measurement.boxes[2].x > measurement.boxes[0].x, 'desktop: back photo is not in the right column')
      assert.ok(measurement.boxes[2].y > measurement.boxes[1].bottom, 'desktop: back photo is not in the lower-right cell')
      assert.ok(Math.abs(measurement.boxes[2].right - measurement.grid.right) < 2, 'desktop: unused space remained at the right edge')
      assert.ok(Math.abs(measurement.boxes[0].bottom - measurement.boxes[2].bottom) < 2, 'desktop: mosaic bottom edges do not align')
      assert.ok(Math.abs(measurement.grid.height - measurement.boxes[0].height) < 2, 'desktop: an empty area remained below the main photo')
    } else {
      assert.equal(measurement.columns.trim().split(/\s+/).length, 1, 'mobile: expected one column')
      assert.ok(measurement.boxes[1].y > measurement.boxes[0].bottom, 'mobile: second photo did not stack')
      assert.ok(measurement.boxes[2].y > measurement.boxes[1].bottom, 'mobile: third photo did not stack')
      assert.ok(measurement.boxes.every(box => Math.abs(box.width - measurement.grid.width) < 2), 'mobile: photo did not fill the row')
    }

    const unexpectedErrors = errors.filter(message => (
      !message.includes('Minified React error #418')
      && !message.includes('Minified React error #423')
    ))
    assert.deepEqual(unexpectedErrors, [], `${name}: new browser errors detected`)
    await page.screenshot({
      path:path.join(artifactRoot, `three-photo-${name}.png`),
      fullPage:false,
    })
    results[name] = measurement
    await context.close()
  }
} finally {
  await browser.close()
}

console.log(JSON.stringify({
  release:'style-detail-three-photo-layout-v568',
  desktopMosaic:true,
  mobileStack:true,
  noBlankCell:true,
  noOverflow:true,
  artifacts:artifactRoot,
  layouts:{ desktop:results.desktop?.layout, mobile:results.mobile?.layout },
}))
