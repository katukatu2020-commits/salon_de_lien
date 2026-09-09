import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import fs from 'node:fs'
const require=createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE||import.meta.url)
const {chromium}=require('playwright-core')
const base=process.env.SMOKE_BASE_URL||'http://localhost:3596'
assert(new URL(base).hostname==='localhost','Local fixture test only')
const out='artifacts/hotpepper-style-import-v596/detail'
fs.mkdirSync(out,{recursive:true})
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true})
const postId='qa-v596-style-metadata'
try {
  for(const audience of ['staff','customer'])for(const width of [1440,390]) {
    const context=await browser.newContext({viewport:{width,height:1000}})
    const staff=audience==='staff'
    const prefix=staff?'/admin':'/u'
    const login=await context.request.post(base+(staff?'/api/auth/login':'/api/customer-auth/login'),{headers:{Origin:base},form:staff?{email:'demo.owner',password:'LienDemo2026!',next:prefix+'/community'}:{loginId:'demo.hana',password:'Mypage2026!',next:prefix+'/community'}})
    assert(login.ok())
    const info=await context.request.get(base+`/api/lien-content-management?audience=${audience}&postId=${postId}`)
    assert.equal(info.status(),200)
    const before=(await info.json()).post.metadata
    assert.equal(before.menuDescription,'カット + カラー')
    const page=await context.newPage(), errors=[]
    page.on('pageerror',e=>errors.push(e.message))
    await page.goto(base+prefix+'/community/'+postId,{waitUntil:'domcontentloaded'})
    const section=page.locator('.lien-style-metadata-v596')
    await section.waitFor({timeout:30000})
    await section.getByText('カット + カラー',{exact:true}).waitFor()
    assert.equal(await section.getByText('テスト担当者',{exact:true}).count(),1)
    const attribution = await page.locator('.lien-owner-panel').evaluate(el=>el.previousElementSibling.textContent)
    assert(attribution.includes('担当 テスト担当者'),attribution)
    if(staff){
      await section.getByRole('button',{name:'スタイル情報を編集'}).click()
      const dialog=page.getByRole('dialog',{name:'スタイル情報を編集'})
      await dialog.getByLabel('メニュー内容',{exact:true}).fill('更新テスト')
      await dialog.getByRole('button',{name:'保存',exact:true}).click()
      await section.getByText('更新テスト',{exact:true}).waitFor()
      const response=await context.request.patch(base+'/api/lien-content-management?audience=staff',{headers:{Origin:base},data:{target:'post',action:'metadata',postId,metadata:before}})
      assert.equal(response.status(),200)
    }else{
      assert.equal(await section.getByRole('button',{name:'スタイル情報を編集'}).count(),0)
      const denied=await context.request.patch(base+'/api/lien-content-management?audience=customer',{headers:{Origin:base},data:{target:'post',action:'metadata',postId,metadata:{title:'should fail'}}})
      assert.equal(denied.status(),403)
    }
    await section.scrollIntoViewIfNeeded()
    await page.screenshot({path:`${out}/${audience}-${width}.png`})
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'page overflow')
    assert(errors.every(e=>/Minified React error #(418|423);/.test(e)),errors.join('\n'))
    console.log(JSON.stringify({audience,width,metadataRendered:true,editAuthorization:true,pageErrors:errors.length}))
    await context.close()
  }
}finally{await browser.close()}
