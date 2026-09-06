import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3139').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const artifactRoot = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'orimia-customer-appointment-history-v565')
fs.mkdirSync(artifactRoot, { recursive:true })

const browser = await chromium.launch({ executablePath, headless:true })
try {
  for (const [name, viewport] of [['desktop', { width:1440, height:1000 }], ['mobile', { width:390, height:844 }]]) {
    const context = await browser.newContext({ viewport, deviceScaleFactor:1 })
    const login = await context.request.post(`${baseUrl}/api/auth/login`, {
      form:{ email:'demo.owner', password:'LienDemo2026!', next:'/admin/customers' },
    })
    assert.ok(login.ok(), `${name}: login failed with ${login.status()}`)

    const memos = new Map([
      ['APPOINTMENT:appointment-v565-current', { body:'前回のカラー配合を確認', updatedByName:'店舗オーナー', updatedAt:'2026-09-06T05:00:00.000Z' }],
      ['APPOINTMENT:showcase-yohaku-appointment-past-067', { body:'次回は前髪を少し短めに調整', updatedByName:'雨宮 透', updatedAt:'2026-09-05T04:00:00.000Z' }],
    ])
    const saves = []
    const historyPayload = () => ({
      ok:true,
      customer:{ id:'showcase-yohaku-customer-023', name:'滝本 奏多' },
      totalCount:4,
      appointments:[{
        id:'appointment-v565-current',
        subjectKey:'APPOINTMENT:appointment-v565-current',
        scheduledAt:'2026-09-10T01:30:00.000Z',
        dateKey:'2026-09-10',
        displayDate:'2026/09/10',
        durationMinutes:90,
        menu:'カット + 透明感カラー',
        staffName:'雨宮 透',
        estimatedPrice:13200,
        status:'予約確定',
        source:'phone',
        bookingNote:'前髪の長さを当日相談',
        isPast:false,
        memo:memos.get('APPOINTMENT:appointment-v565-current') || null,
      }],
      completed:[
        { id:'visit-showcase-yohaku-visit-067', subjectKey:'APPOINTMENT:showcase-yohaku-appointment-past-067', dateKey:'2026-08-13', displayDate:'2026/08/13', memo:memos.get('APPOINTMENT:showcase-yohaku-appointment-past-067') || null },
        { id:'visit-showcase-yohaku-visit-068', subjectKey:'APPOINTMENT:showcase-yohaku-appointment-past-068', dateKey:'2026-03-26', displayDate:'2026/03/26', memo:null },
        { id:'visit-showcase-yohaku-visit-069', subjectKey:'APPOINTMENT:showcase-yohaku-appointment-past-069', dateKey:'2025-12-01', displayDate:'2025/12/01', memo:null },
      ],
    })

    const page = await context.newPage()
    const errors = []
    const knownHydrationNoise = /Minified React error #(418|423)/
    page.on('pageerror', error => { if (!knownHydrationNoise.test(error.message)) errors.push(`page:${error.message}`) })
    page.on('console', message => { if (message.type() === 'error' && !knownHydrationNoise.test(message.text())) errors.push(`console:${message.text()}`) })
    await page.route(/\/api\/admin\/customers\/[^/]+\/visit-history(?:\/memo)?(?:\?.*)?$/, async route => {
      const request = route.request()
      if (request.method() === 'PUT') {
        const input = request.postDataJSON()
        const body = String(input.body || '').trim()
        const memo = body ? { body, updatedByName:'店舗オーナー', updatedAt:'2026-09-06T06:00:00.000Z' } : null
        if (memo) memos.set(input.subjectKey, memo)
        else memos.delete(input.subjectKey)
        saves.push({ subjectKey:input.subjectKey, body })
        await route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ ok:true, subjectKey:input.subjectKey, memo, message:'施術メモを保存しました。' }) })
        return
      }
      await route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(historyPayload()) })
    })

    await page.goto(`${baseUrl}/admin/customers/showcase-yohaku-customer-023?verify=v565-${name}`, { waitUntil:'domcontentloaded', timeout:30_000 })
    await page.waitForFunction(() => window.__lienCustomerAppointmentHistoryV565 === true, null, { timeout:15_000 })
    const section = page.locator('[data-customer-history-v565]')
    await section.waitFor({ state:'visible', timeout:15_000 })
    await section.getByText('現在の予約', { exact:true }).waitFor()
    assert.equal(await section.locator('[data-current-appointment-v565]').count(), 1)
    assert.equal(await section.locator('[data-treatment-memo-v565]').count(), 4)
    assert.equal(await section.getByText('2026/09/10', { exact:true }).count(), 1)
    assert.equal(await section.locator('[data-current-appointment-v565] dd').filter({ hasText:'カット + 透明感カラー' }).count(), 1)
    assert.equal(await section.locator('[data-current-appointment-v565] dd').filter({ hasText:'予約確定' }).count(), 1)
    assert.equal(await section.getByText('4件', { exact:true }).count() >= 1, true)
    assert.ok(await section.getByText('写真を追加', { exact:true }).count() >= 1, `${name}: existing visit photo controls disappeared`)

    const currentMemo = section.locator('[data-current-appointment-v565] [data-treatment-memo-input]')
    await currentMemo.fill('カラーは6トーン、次回は褪色を確認')
    const currentSave = section.locator('[data-current-appointment-v565] [data-treatment-memo-save]')
    assert.equal(await currentSave.isDisabled(), false, `${name}: edited memo save button stayed disabled`)
    await Promise.all([
      page.waitForRequest(request => request.method() === 'PUT' && request.url().includes('/visit-history/memo')),
      currentSave.click(),
    ])
    const currentStatus = section.locator('[data-current-appointment-v565] [data-treatment-memo-status]')
    await page.waitForTimeout(800)
    const saveDiagnostic = {
      status:await currentStatus.textContent(),
      currentCards:await section.locator('[data-current-appointment-v565]').count(),
      memoEditors:await section.locator('[data-treatment-memo-v565]').count(),
      value:await currentMemo.inputValue(),
      saves:[...saves],
    }
    assert.equal(saveDiagnostic.status?.trim(), '保存しました', `${name}: ${JSON.stringify(saveDiagnostic)}`)
    assert.deepEqual(saves[0], { subjectKey:'APPOINTMENT:appointment-v565-current', body:'カラーは6トーン、次回は褪色を確認' })
    assert.equal(await currentMemo.inputValue(), 'カラーは6トーン、次回は褪色を確認')

    const completedCard = section.locator('article:not([data-current-appointment-v565])').first()
    const completedMemo = completedCard.locator('[data-treatment-memo-input]')
    await completedMemo.fill('仕上がりとホームケアを次回来店時に確認')
    await completedCard.locator('[data-treatment-memo-save]').click()
    await completedCard.getByText('保存しました', { exact:true }).waitFor()
    assert.equal(saves[1]?.subjectKey, 'APPOINTMENT:showcase-yohaku-appointment-past-067')

    await page.waitForTimeout(700)
    assert.equal(await section.locator('[data-current-appointment-v565]').count(), 1, `${name}: current appointment card duplicated`)
    assert.equal(await section.locator('[data-treatment-memo-v565]').count(), 4, `${name}: memo controls duplicated`)
    const overflow = await page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth)
    assert.ok(overflow <= 1, `${name}: page overflowed by ${overflow}px`)
    await section.scrollIntoViewIfNeeded()
    await page.screenshot({ path:path.join(artifactRoot, `customer-history-${name}.png`), fullPage:false })
    assert.deepEqual(errors, [], `${name}: browser errors: ${errors.join(' | ')}`)
    await context.close()
  }

  console.log(JSON.stringify({
    release:'customer-appointment-history-memos-v565',
    currentAppointmentCard:true,
    completedCardMemos:true,
    memoSave:true,
    noDuplicates:true,
    responsive:true,
    artifacts:artifactRoot,
  }))
} finally {
  await browser.close()
}
