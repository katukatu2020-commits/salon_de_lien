import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3173'
const out = process.env.SCREENSHOT_DIR || 'artifacts/salon-directory-ranking-v673/browser'
fs.mkdirSync(out, { recursive:true })
const browser = await chromium.launch({ executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless:true, args:['--no-sandbox'] })
try {
  for (const viewport of [{width:1440,height:1000},{width:390,height:844},{width:320,height:740}]) {
    const context = await browser.newContext({ viewport, deviceScaleFactor:1 })
    await context.addCookies([{ name:'fixture',value:'customer',url:base }])
    const page = await context.newPage(), errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(base + '/u/stores')
    await page.waitForSelector('[data-filter-ready="1"]')
    await page.waitForFunction(() => document.documentElement.dataset.orimiaUiReady === 'v516')
    const visible = () => page.locator('.orimia-store-card:visible').evaluateAll(cards => cards.map(c => c.dataset.organizationId))
    const all = await visible()
    assert.deepEqual(all.slice(0,4), ['org-c','org-b','org-d','org-a'])
    assert.equal(all.length,8)
    assert.equal(await page.locator('#orimia-prefecture-filter option').count(),49)
    await page.evaluate(() => { window.fixtureCard = document.querySelector('[data-organization-id="org-b"]') })
    let requests = 0, navigations = 0
    page.on('request', req => {
      if (req.resourceType() !== 'image') requests++
      if (req.isNavigationRequest()) navigations++
    })
    await page.getByLabel('都道府県', {exact:true}).selectOption('岡山県')
    assert.deepEqual(await visible(),['org-b','org-d','org-a'])
    assert.equal(await page.locator('[data-directory-count]').innerText(),'3店舗')
    await page.getByLabel('都道府県', {exact:true}).selectOption('沖縄県')
    assert.equal((await visible()).length,0)
    assert.equal(await page.locator('[data-directory-empty]').isVisible(),true)
    await page.getByLabel('都道府県', {exact:true}).selectOption('')
    assert.deepEqual(await visible(),all)
    assert.equal(await page.evaluate(() => window.fixtureCard === document.querySelector('[data-organization-id="org-b"]')),true)
    // Filtering changes only card visibility; no fetch or document navigation.
    assert.equal(requests,0)
    assert.equal(navigations,0)
    assert.equal(await page.evaluate(() => document.documentElement.dataset.orimiaUiReady), 'v516')
    await page.evaluate(() => window.scrollTo(0,110))
    const y = await page.evaluate(() => scrollY)
    await page.evaluate(() => { const s=document.querySelector('#orimia-prefecture-filter'); s.value='岡山県'; s.dispatchEvent(new Event('change',{bubbles:true})) })
    await page.waitForTimeout(350)
    const maxScroll = await page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - innerHeight))
    assert.equal(await page.evaluate(() => scrollY),Math.min(y, maxScroll))
    await page.evaluate(() => { const s=document.querySelector('#orimia-prefecture-filter'); s.value=''; s.dispatchEvent(new Event('change',{bubbles:true})); window.scrollTo(0,0) })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true,'no horizontal overflow')
    await page.waitForFunction(() => [...document.querySelectorAll('.orimia-store-card:nth-child(-n+2) img')].every(img => img.complete && img.naturalWidth>0))
    await page.screenshot({ path:path.join(out,`directory-${viewport.width}.png`),fullPage:true })
    await page.screenshot({ path:path.join(out,`viewport-${viewport.width}.png`) })
    await page.goto(base + '/u/stores?prefecture=' + encodeURIComponent('東京都'))
    await page.waitForSelector('[data-filter-ready="1"]')
    assert.deepEqual(await visible(),['org-c'])
    // Keep navigation in the fixture while exercising the unchanged production switch client.
    await page.route('**/api/lien-customer-stores', async route => {
      const response = await route.fetch()
      assert.equal(response.status(),200)
      assert.equal((await response.json()).redirect,'/u/home')
      await route.fulfill({ response, json:{ ok:true, redirect:'/u/stores?prefecture=switched' } })
    })
    await page.getByLabel('都道府県', {exact:true}).selectOption('岡山県')
    await page.locator('[data-select-orimia-store="org-b"]').click()
    await page.waitForURL('**/u/stores?prefecture=switched')
    assert.deepEqual(errors,[])
    await context.close()
  }
  console.log(JSON.stringify({ release:'salon-directory-ranking-v673',browserVerified:true,desktopAndMobile:true,filterWithoutNavigation:true,switchVerified:true }))
} finally { await browser.close() }
