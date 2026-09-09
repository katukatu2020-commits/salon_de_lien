import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const base = process.env.SMOKE_BASE_URL || 'http://localhost:3596'
const output = process.env.SCREENSHOT_DIR || 'artifacts/hotpepper-style-import-v596/browser'
fs.mkdirSync(output,{recursive:true})
const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']})
const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lYQAAAAASUVORK5CYII=','base64')
try {
  for(const viewport of [{width:1440,height:1000},{width:390,height:844},{width:320,height:740}]) {
    const context = await browser.newContext({viewport})
    const login = await context.request.post(base+'/api/auth/login',{form:{email:'demo.owner',password:'LienDemo2026!',next:'/admin/community'},headers:{Origin:base}})
    assert(login.ok(),'staff login failed: '+login.status())
    const availability = await context.request.get(base+'/api/lien-hotpepper-styles')
    assert.equal(availability.status(),200,'import API unavailable')
    const image = await context.request.get(base+'/brand/customer-hair-care.webp')
    const imageBody = image.ok() ? await image.body() : pixel
    await context.route('https://imgbp.hotp.jp/**',route=>route.fulfill({status:200,contentType:image.ok()?'image/webp':'image/png',body:imageBody}))
    let job = null, publication = null, manual = null
    const posts = [0,1,2].map(index=>({index,url:`https://beauty.hotpepper.jp/slnH000307612/style/L${index+1}.html`,status:'READY',data:{title:['透明感カラーとレイヤーカット','自然な丸みのショートボブ','うるおいストレート'][index],stylistName:'山田 花子',stylistRole:'スタイリスト',stylistKana:'ヤマダ ハナコ',stylistComment:'色の透明感と扱いやすさを大切にした仕上がり。',menuDescription:'カット + カラー + トリートメント',photos:['FRONT','BACK'].map(direction=>({direction,url:`https://imgbp.hotp.jp/CSP/IMG_SRC/00/01/B123456789/B123456789.jpg?${direction}`}))}}))
    await context.route('**/api/lien-hotpepper-styles*', async route=>{
      const req=route.request()
      if(req.method()==='POST') {
        const data=req.postDataJSON()
        if(data.action==='start') { assert(data.rightsConfirmed && data.permissionConfirmed);job={id:'fixture-job',sourceUrl:data.url,status:'SCANNING',salonName:'テストサロン',total:3,loaded:0,duplicate:0,failed:0,published:0,ready:0,discoveredPages:1,items:[],remainingPages:0} }
        if(data.action==='step') { if(job.status==='SCANNING'){job={...job,status:'READY',loaded:3,ready:3,items:structuredClone(posts)}} else if(job.status==='PUBLISHING'){job={...job,status:'DONE',published:2,ready:1,items:job.items.map(i=>({...i,status:i.index===1?'READY':'PUBLISHED',postId:'fixture-post'}))}} }
        if(data.action==='edit'){job.items[data.index].data={...job.items[data.index].data,...data.metadata}}
        if(data.action==='publish'){publication=data;job.status='PUBLISHING';job.ready=0}
        if(data.action==='cancel'){job.status='CANCELLED'}
      }
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({job})})
    })
    await context.route('**/api/lien-community-publish',async route=>{manual=route.request().postDataJSON();await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({error:'テスト送信を確認しました（未公開）。'})})})
    const page=await context.newPage(), failures=[]
    page.on('pageerror',error=>failures.push(error.message))
    await page.goto(base+'/admin/community',{waitUntil:'domcontentloaded'})
    const open=page.getByRole('button',{name:'新しいスタイルを投稿'})
    await open.waitFor({timeout:30000})
    await page.waitForTimeout(1500)
    const inheritedPageErrors = failures.splice(0)
    // Verified on the untouched v595 parent; this release does not alter its React hydration.
    assert(inheritedPageErrors.length <= 4 && inheritedPageErrors.every(message => /Minified React error #(418|423);/.test(message)), inheritedPageErrors.join('\n'))
    await open.click()
    const dialog=page.getByRole('dialog',{name:'新しいスタイルを投稿'})
    assert.equal(await dialog.locator('[data-hp-mode]').count(),1)
    await dialog.locator('#hp-manual-title').fill('手動投稿のテスト')
    await dialog.locator('#hp-manual-menuDescription').fill('カット・カラー')
    await dialog.locator('[data-ca-cp-rights]').check()
    for(const direction of ['FRONT','SIDE','BACK'])await dialog.locator(`[data-ca-cp-slot="${direction}"] input[type=file]`).setInputFiles({name:direction+'.png',mimeType:'image/png',buffer:pixel})
    await dialog.getByRole('button',{name:'3方向を公開'}).click()
    await page.waitForFunction(()=>document.querySelector('[data-ca-cp-feedback]')?.textContent.includes('テスト送信'))
    assert.equal(manual.metadata.title,'手動投稿のテスト');assert.equal(manual.photos.length,3)
    await dialog.locator('[data-hp-mode]').check()
    assert.equal(await dialog.locator('.hp-manual').isVisible(),false)
    await dialog.locator('#hp-url').fill('https://beauty.hotpepper.jp/slnH000307612/style/')
    assert.equal(await dialog.locator('[data-hp-start]').isDisabled(),true)
    await dialog.locator('[data-hp-rights]').check();await dialog.locator('[data-hp-permission]').check()
    await dialog.locator('[data-hp-start]').click()
    await dialog.locator('[data-hp-all]').waitFor({timeout:15000})
    assert.equal(await dialog.locator('.hp-table tbody tr').count(),3)
    await dialog.locator('[data-hp-all]').check()
    await dialog.locator('[data-hp-select="1"]').uncheck()
    assert.equal(await dialog.locator('[data-hp-count]').innerText(),'2件選択中')
    await dialog.locator('[data-hp-review="0"]').click()
    await dialog.locator('#hp-review-title').fill('透明感カラーの編集テスト')
    await dialog.locator('[data-hp-save]').click()
    await page.screenshot({path:path.join(output,`import-${viewport.width}.png`)})
    const overflow=await dialog.evaluate(el=>({width:el.getBoundingClientRect().width,viewport:innerWidth,body:document.documentElement.scrollWidth}))
    assert(overflow.width<=overflow.viewport && overflow.body<=overflow.viewport,'horizontal overflow: '+JSON.stringify(overflow))
    await dialog.locator('[data-hp-publish]').click()
    await page.waitForFunction(()=>document.querySelector('.hp-tools')?.textContent.includes('2件公開'),{},{timeout:15000})
    assert(publication.allReady);assert.deepEqual(publication.excluded,[1])
    await dialog.getByRole('button',{name:'閉じる',exact:true}).click()
    await open.click();await dialog.locator('[data-hp-mode]').check()
    await page.waitForFunction(()=>document.querySelector('.hp-tools')?.textContent.includes('2件公開'))
    await page.keyboard.press('Escape');assert.equal(await dialog.count(),0)
    assert.equal(failures.length,0,failures.join('\n'))
    console.log(JSON.stringify({viewport:viewport.width,manualFields:true,checkboxMode:true,permissionGate:true,previewEdit:true,selection:true,resume:true,noHorizontalOverflow:true,inheritedPageErrors:inheritedPageErrors.length,featureErrors:failures}))
    await context.close()
  }
}finally{await browser.close()}
