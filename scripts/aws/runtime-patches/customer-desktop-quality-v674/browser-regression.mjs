import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { createRequire } from 'node:module'
const require=createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const {chromium}=require('playwright-core')
const runtime=fs.readFileSync(process.env.RUNTIME_CLIENT || '.tmp-v674-runtime/patched-client.js','utf8')
const start=runtime.indexOf(';/* customer-desktop-frontend-v529-boundary */')
const end=runtime.indexOf('/* customer-desktop-frontend-v529 */',start)
assert.ok(start>=0 && end>start)
const shell=runtime.slice(start,end)
assert.match(shell,/@layer orimiaDesktopQuality/)
const out=process.env.SCREENSHOT_DIR || 'artifacts/customer-desktop-quality-v674/browser'
fs.mkdirSync(out,{recursive:true})
const baseCss=`*{box-sizing:border-box}body{margin:0;font:14px Arial,sans-serif;background:#faf8f6;color:#342d29}.app{max-width:480px;margin:auto}.content,.customer-native-main{padding:20px}.topbar,.customer-premium-topbar{height:64px;background:#fff;padding:20px}.welcome span{display:block}.quick-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.quick-card{display:grid;padding:20px;background:white;border:1px solid #ddd}.quick-card svg{width:24px;height:24px}.hero{background:#e7eee9;height:120px;margin:20px 0}.bottom-nav{position:fixed;bottom:0;background:white;width:100%;padding:15px}.min-h-screen{min-height:100vh}.customer-native-main{max-width:1180px;margin:auto}.cj-menu-list{display:grid;grid-template-columns:1fr 1fr}.cj-menu-row{display:flex;gap:12px;padding:16px;border-bottom:1px solid #ddd}.cj-menu-row strong,.cj-menu-row small{display:block}.cj-booking-footer{position:fixed;bottom:0;left:0;right:0;display:flex;padding:20px}.cj-booking-footer button{flex:1}.cj-steps{display:flex;justify-content:space-around}.cj-steps>button{display:grid;gap:6px;background:none;border:0}.cj-steps>button>span{border:1px solid #ddd;border-radius:50%;display:grid;place-items:center}.cj-search{display:block;padding:10px}.cj-search input{width:100%;border:0}.cj-booking-footer [hidden]{display:none}body:has(.customer-premium-topbar):not(#customer-premium-shell){padding:0!important;font-family:serif!important}@media(min-width:1024px){.app{max-width:1440px;padding-left:238px}.customer-native-main{margin-left:280px}}`
const logo=fs.readFileSync('public/brand/orimia-icon-192.png')
const nav='<nav class="bottom-nav" id="customer-mobile-bottom-nav" data-customer-bottom-nav>ホーム　予約　履歴　チャット</nav>'
function markup(native) {
  const content=native?`<section class="cj-booking-top"><h1>予約する</h1><nav class="cj-steps">${['メニュー','担当者','日時','内容確認'].map((name,i)=>`<button><span>${i+1}</span><small>${name}</small></button>`).join('')}</nav><h2>メニューを選択してください</h2><label class="cj-search"><input type="search" aria-label="メニューを検索"></label><div class="cj-menu-list">${Array.from({length:10},(_,i)=>`<label class="cj-menu-row"><input type="radio" name="menu" value="${i}"><span><strong>カット・トリートメント ${i+1}</strong><small>60分 / 6,600円</small></span></label>`).join('')}</div></section><div class="cj-booking-footer"><button data-cj-prev hidden>戻る</button><button class="cj-primary" data-cj-next>担当者を選ぶ</button></div>`:`<section class="welcome"><strong>デモ会員 様</strong><span>いつもご来店ありがとうございます</span></section><section class="hero"></section><section class="quick-grid">${['予約する','ヘアスタイル','クーポン','マイページ','スタンプカード','サロンを探す'].map(name=>`<a class="quick-card" href="/u/appointments"><svg></svg><strong>${name}</strong><small>MEMBER</small></a>`).join('')}</section>`
  return `<div class="${native?'min-h-screen':'app'}"><header class="${native?'customer-premium-topbar':'topbar'}">ORIMIA</header><main class="${native?'customer-native-main':'content'}">${content}</main>${nav}</div>`
}
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1')
  if(url.pathname==='/desktop.js'){res.setHeader('Content-Type','application/javascript');return res.end(shell)}
  if(url.pathname.startsWith('/brand/')){res.setHeader('Content-Type','image/png');return res.end(logo)}
  res.setHeader('Content-Type','text/html; charset=utf-8')
  res.end(`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${baseCss}</style>${url.searchParams.has('baseline')?'':'<script defer src="/desktop.js"></script>'}</head><body>${markup(url.pathname==='/u/appointments')}</body></html>`)
})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
const base=`http://127.0.0.1:${server.address().port}`
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true})
try {
  for(const width of [320,390,768,1023]) for(const route of ['home','appointments']) {
    const page=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:1})
    await page.goto(`${base}/u/${route}?baseline=1`,{waitUntil:'networkidle'})
    const before=await page.screenshot({fullPage:true})
    await page.goto(`${base}/u/${route}`,{waitUntil:'networkidle'})
    const after=await page.screenshot({path:path.join(out,`mobile-${width}-${route}.png`),fullPage:true})
    assert.deepEqual(after,before,`Mobile pixels differ at ${width}: ${route}`)
    assert.equal(await page.locator('.ocd-sidebar').count(),0)
    await page.close()
  }
  const page=await browser.newPage()
  for(const width of [1024,1280,1440,1920]) for(const route of ['home','appointments']) {
    await page.setViewportSize({width,height:800})
    await page.goto(`${base}/u/${route}`,{waitUntil:'networkidle'})
    assert.equal(await page.locator('.ocd-sidebar').count(),1)
    assert.equal(await page.locator('.ocd-nav-link').count(),14)
    assert.equal(await page.locator(`[data-ocd-route="/u/${route}"]`).getAttribute('aria-current'),'page')
    const metric=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,main:document.querySelector('main').getBoundingClientRect().left,nav:document.querySelector('.ocd-sidebar').getBoundingClientRect().right,header:document.querySelector('.ocd-header').getBoundingClientRect().left,font:getComputedStyle(document.body).fontFamily}))
    assert.ok(metric.overflow<=0)
    assert.ok(metric.main>=metric.nav)
    assert.equal(metric.header,metric.nav)
    assert.ok(metric.font.includes('Segoe UI'))
    if(route==='appointments') {
      assert.ok((await page.locator('[data-cj-next]').boundingBox()).width<=320)
      await page.getByRole('searchbox').fill('カタカナ')
      await page.waitForTimeout(150)
      assert.equal(await page.getByRole('searchbox').inputValue(),'カタカナ')
    }
    await page.screenshot({path:path.join(out,`desktop-${width}-${route}.png`),fullPage:true})
  }
  await page.evaluate(()=>{
    const main=document.querySelector('main')
    main.insertAdjacentHTML('beforeend','<div class="cj-dates"><button data-cj-date="2" aria-current="false">Day 2</button></div><div class="cj-slot-row"><button data-cj-day="2">Available</button></div>')
    main.querySelector('[data-cj-date="2"]').addEventListener('click',()=>{main.dataset.testSelectedDay='2'})
    main.querySelector('.cj-slot-row button').click()
  })
  assert.equal(await page.locator('main').getAttribute('data-test-selected-day'),'2','Desktop slot must synchronize the existing day selector')
  await page.locator('.cj-booking-footer').evaluate(e=>{e.hidden=true})
  assert.equal(await page.locator('.cj-booking-footer').isVisible(),false)
  await page.evaluate(()=>history.pushState({},'','/u/profile'))
  await page.waitForFunction(()=>document.documentElement.dataset.orimiaCustomerView==='/u/profile')
  assert.equal(await page.locator('.ocd-sidebar').count(),1)
  await page.setViewportSize({width:390,height:844})
  await page.waitForFunction(()=>!document.querySelector('.ocd-sidebar'))
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.orimiaDesktopQuality),undefined)
  assert.equal(await page.locator('#orimia-customer-desktop-style-v529').count(),0)
  await page.evaluate(()=>{const main=document.querySelector('main');delete main.dataset.testSelectedDay;main.querySelector('.cj-slot-row button').click()})
  assert.equal(await page.locator('main').getAttribute('data-test-selected-day'),null,'Mobile slot handling must not be changed')
  for(const route of ['/u/login','/admin','/dealer']) {
    await page.setViewportSize({width:1440,height:900})
    await page.goto(base+route,{waitUntil:'networkidle'})
    assert.equal(await page.locator('.ocd-sidebar').count(),0,route+' should remain unchanged')
  }
  console.log('v674 browser regression passed: 8 pixel-identical mobile cases, 8 desktop layouts, route changes, resize, excluded portals')
} finally {
  await browser.close()
  await new Promise(resolve=>server.close(resolve))
}
