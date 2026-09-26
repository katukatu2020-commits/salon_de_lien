import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
const require=createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const {chromium}=require('playwright-core')
const sharp=require('sharp')
const before=process.env.BASELINE_URL || 'http://127.0.0.1:3174'
const after=process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3175'
for(const url of [before,after]) assert.ok(['127.0.0.1','localhost'].includes(new URL(url).hostname),'Local copied database only')
const out=process.env.SCREENSHOT_DIR || 'artifacts/customer-desktop-quality-v674/regression'
fs.mkdirSync(out,{recursive:true})
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true})
const report={desktop:[],mobile:[],interactions:[]}
async function open(context,base,route,viewport) {
  const page=await context.newPage()
  if(viewport) await page.setViewportSize(viewport)
  await page.goto(base+'/u/'+route,{waitUntil:'load',timeout:35000})
  await page.waitForFunction(()=>document.documentElement.dataset.orimiaUiReady==='v516',null,{timeout:15000})
  await page.evaluate(()=>document.fonts.ready)
  await page.waitForTimeout(700)
  return page
}
try {
  const contexts=[]
  for(const base of [before,after]) {
    const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,locale:'ja-JP',timezoneId:'Asia/Tokyo',reducedMotion:'reduce'})
    const res=await context.request.post(base+'/api/customer-auth/login',{form:{loginId:process.env.TEST_LOGIN_ID || 'demo.hana',password:process.env.TEST_PASSWORD || 'Mypage2026!',next:'/u/home'}})
    assert.equal(res.status(),200)
    contexts.push(context)
  }
  if(!process.env.SKIP_MOBILE) for(const width of (process.env.MOBILE_WIDTHS || '390,768').split(',').map(Number)) for(const route of (process.env.MOBILE_ROUTES || 'home,appointments,profile,stamps,stores,chat,catalog').split(',')) {
    const pages=[];const shots=[]
    for(let i=0;i<2;i++) {
      const page=await open(contexts[i],i===0?before:after,route,{width,height:844})
      await page.waitForTimeout(500)
      assert.equal(await page.locator('#orimia-customer-desktop-nav-v529').count(),0)
      assert.equal(await page.evaluate(()=>document.documentElement.dataset.orimiaDesktopQuality),undefined)
      const file=path.join(out,`mobile-${width}-${route}-${i}.png`)
      shots.push(await sharp(await page.screenshot({path:file,fullPage:true,animations:'disabled'})).raw().toBuffer({resolveWithObject:true}))
      pages.push(page)
    }
    assert.deepEqual(shots[0].info,shots[1].info,`${width} ${route} mobile dimensions`)
    let changed=0
    for(let i=0;i<shots[0].data.length;i++) if(shots[0].data[i]!==shots[1].data[i]) changed++
    report.mobile.push({width,route,changedChannels:changed})
    console.log('mobile',width,route,changed)
    for(const page of pages) await page.close()
    assert.equal(changed,0,`${width} ${route} mobile pixels changed`)
  }
  const context=contexts[1]
  if(!process.env.SKIP_LAYOUTS) for(const width of [1024,1440,1920]) for(const route of ['home','appointments','profile','chat','stores','catalog']) {
    const page=await open(context,after,route)
    await page.setViewportSize({width,height:900})
    await page.waitForFunction(()=>document.documentElement.dataset.orimiaDesktopQuality==='v674')
    await page.waitForTimeout(150)
    const metrics=await page.evaluate(()=>{
      const main=document.querySelector('main');const nav=document.querySelector('.ocd-sidebar');const header=document.querySelector('.ocd-header')
      const box=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,top:r.top}}
      return {main:box(main),nav:box(nav),header:box(header),overflow:document.documentElement.scrollWidth-innerWidth,count:document.querySelectorAll('.ocd-sidebar').length}
    })
    assert.equal(metrics.count,1)
    assert.ok(metrics.overflow<=0,`${route} horizontal overflow`)
    assert.ok(metrics.main.left>=metrics.nav.right,`${route} content behind sidebar`)
    assert.equal(metrics.header.left,metrics.nav.width)
    assert.ok(await page.locator('.ocd-book').isVisible())
    await page.screenshot({path:path.join(out,`desktop-${width}-${route}.png`),fullPage:true,animations:'disabled'})
    report.desktop.push({width,route,...metrics})
    await page.close()
  }
  const page=await open(context,after,'appointments')
  await page.setViewportSize({width:1440,height:1000})
  const search=page.getByRole('searchbox',{name:'メニューを検索'})
  await search.fill('カット')
  await page.waitForTimeout(300)
  assert.equal(await search.inputValue(),'カット')
  await search.fill('')
  await page.locator('[data-cj-menu]').first().check()
  await page.locator('[data-cj-next]').click()
  await page.waitForFunction(()=>document.querySelector('.cj-steps [data-cj-step="2"]')?.getAttribute('aria-current')==='step')
  await page.screenshot({path:path.join(out,'booking-staff.png'),fullPage:true})
  await page.locator('[data-cj-next]').click()
  await page.waitForFunction(()=>document.querySelector('.cj-steps [data-cj-step="3"]')?.getAttribute('aria-current')==='step')
  await page.screenshot({path:path.join(out,'booking-dates.png'),fullPage:true})
  const slot=page.locator('.cj-slot-row button:not(:disabled)').first()
  await slot.click()
  await page.locator('[data-cj-next]').click()
  await page.waitForFunction(()=>document.querySelector('.cj-steps [data-cj-step="4"]')?.getAttribute('aria-current')==='step')
  assert.equal(await page.locator('.cj-booking-footer').isVisible(),false,'Step four must hide the step navigation footer')
  await page.screenshot({path:path.join(out,'booking-confirmation.png'),fullPage:true})
  await page.locator('.cj-steps [data-cj-step="2"]').click()
  await page.locator('[data-cj-prev]').click()
  assert.ok(await search.isVisible())
  report.interactions.push('booking menu search, all four steps, previous; no reservation created')
  await page.goto(after+'/u/profile')
  await page.waitForFunction(()=>document.querySelector('.cj-account-links'))
  await page.locator('a[data-cj-profile-edit-action]').click()
  await page.locator('.cx-profile-form-v508').waitFor({state:'visible'})
  await page.screenshot({path:path.join(out,'profile-edit.png'),fullPage:true})
  report.interactions.push('profile edit opens without layout overlap')
  await page.goto(after+'/u/chat')
  await page.locator('.lien-chat-v294__staff-button').first().click()
  const textarea=page.locator('.lien-chat-v294__composer textarea')
  await textarea.fill('入力確認（送信しません）')
  await page.waitForTimeout(1000)
  assert.equal(await textarea.inputValue(),'入力確認（送信しません）')
  const box=await textarea.boundingBox()
  assert.ok(box.y+box.height<=1000,'Chat composer outside viewport')
  await page.screenshot({path:path.join(out,'chat-conversation.png'),fullPage:true})
  report.interactions.push('chat staff selection and stable draft; no message sent')
  await page.setViewportSize({width:390,height:844})
  await page.waitForFunction(()=>!document.querySelector('.ocd-sidebar'))
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.orimiaDesktopQuality),undefined)
  report.interactions.push('desktop to mobile removes desktop styles and flags')
  await page.close()
  console.log(JSON.stringify(report))
} finally {
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2))
  await browser.close()
}
