import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {execFileSync} from 'node:child_process'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url),{chromium}=require('playwright-core'),base='http://127.0.0.1:3188'
const dir='scripts/aws/runtime-patches/dealer-product-master-v709',artifacts=path.resolve('artifacts/dealer-product-master-v709')
fs.mkdirSync(artifacts,{recursive:true})
const fixture=mode=>execFileSync('docker',['exec','orimia-qa-v680-app','node','/tmp/qa709-fixture.cjs',mode],{encoding:'utf8'})
execFileSync('docker',['cp',dir+'/qa-fixture.cjs','orimia-qa-v680-app:/tmp/qa709-fixture.cjs'])
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
async function login(ctx,name){const r=await ctx.request.post(base+'/api/dealer/auth/login',{headers:{Origin:base},data:{loginId:name,password:'QaLocalOnly-v709!'},maxRedirects:0});assert.equal(r.status(),303);return r}
try{
  console.log(fixture('seed'))
  const ctx=await browser.newContext({viewport:{width:1440,height:1050}}),page=await ctx.newPage(),errors=[]
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000)
  assert.equal((await login(ctx,'qa709.a')).headers().location,'/dealer/products/master')
  for(const search of ['オルディーブ','ｵﾙﾃﾞｨｰﾌﾞ','おるでぃーぶ']){
    const response=await ctx.request.get(base+'/api/dealer/product-master?search='+encodeURIComponent(search));assert.equal(response.status(),200)
    const body=await response.json();assert.equal(body.total,1);assert.equal(body.products[0].id,'qa-v709-p3999')
  }
  await page.goto(base+'/dealer/products/master');await page.locator('[data-product]').first().waitFor()
  assert.equal(await page.locator('[data-product]').count(),50)
  const select=async(selector,value)=>{const response=page.waitForResponse(r=>r.url().includes('/api/dealer/product-master?'));await page.locator(selector).selectOption(value);await response;await page.waitForFunction(()=>document.querySelector('[data-results]').getAttribute('aria-busy')==='false')}
  await select('[name=manufacturer]','QA709 中野製薬')
  assert.deepEqual(await page.locator('[name=category] option').allTextContents(),['すべてのカテゴリ','スタイリング'])
  await page.locator('[data-product="qa-v709-p0002"]').check()
  const nextResponse=page.waitForResponse(r=>r.url().includes('/api/dealer/product-master?'));await page.locator('[data-next]').click();await nextResponse
  await page.waitForFunction(()=>document.querySelector('[data-page-label]').textContent==='2 / 40')
  await page.locator('[data-product]').first().check();assert.equal(await page.locator('[data-selected-count]').textContent(),'2件選択')
  await page.locator('[data-review]').click();assert.equal(await page.locator('.dpm-review-row').count(),2)
  await page.locator('[data-price="qa-v709-p0002"]').fill('1500')
  await page.screenshot({path:path.join(artifacts,'desktop-confirm.png')})
  const posted=page.waitForResponse(r=>r.url().endsWith('/api/dealer/product-master')&&r.request().method()==='POST')
  await page.locator('#dpm-import button[type=submit]').click();assert.equal((await posted).status(),200)
  await page.waitForFunction(()=>document.querySelector('[data-status]').textContent.includes('2商品を登録しました'))
  assert.equal(await page.locator('[data-selected-count]').textContent(),'0件選択')
  await page.goto(base+'/dealer/products');await page.locator('.dpm-entry a').waitFor();await page.locator('.dpm-entry a').click();await page.locator('[data-product]').first().waitFor()
  const searchResponse=page.waitForResponse(r=>r.url().includes('/api/dealer/product-master?'));await page.locator('[name=search]').fill('QA709-0002');await page.locator('#dpm-search button').click();await searchResponse
  await page.waitForFunction(()=>document.querySelector('[data-results]').getAttribute('aria-busy')==='false')
  assert.equal(await page.locator('[data-product]').isDisabled(),true)
  assert.equal(await page.locator('.dpm-registered').textContent(),'登録済み')
  for(const width of [1440,390,320]){
    await page.setViewportSize({width,height:900});await page.screenshot({path:path.join(artifacts,'catalog-'+width+'.png')})
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'page overflow '+width)
  }
  await page.setViewportSize({width:390,height:844})
  const search2=page.waitForResponse(r=>r.url().includes('/api/dealer/product-master?'));await page.locator('[name=search]').fill('QA709-0004');await page.locator('#dpm-search button').click();await search2
  await page.locator('[data-product="qa-v709-p0004"]').check();await page.locator('[data-review]').click()
  assert.equal(await page.locator('[data-price]').inputValue(),'')
  assert.equal(await page.locator('#dpm-import').evaluate(el=>el.checkValidity()),false)
  await page.locator('[data-price]').fill('1200');await page.screenshot({path:path.join(artifacts,'mobile-confirm.png')});await page.locator('dialog [data-close]').first().click()
  const customer=await browser.newContext();await customer.request.post(base+'/api/customer-auth/login',{data:{loginId:'demo.hana',password:'QaLocalOnly-v680!'},maxRedirects:0})
  const anonymous=await browser.newContext(),staff=await browser.newContext();await login(staff,'qa709.staff')
  for(const [c,status]of [[anonymous,401],[customer,401],[staff,403]])for(const method of ['GET','POST']){
    const r=await c.request.fetch(base+'/api/dealer/product-master',{method,headers:{Origin:base},...(method==='POST'?{data:{products:[{id:'qa-v709-p0002',price:1000}]}}:{})});assert.equal(r.status(),status)
  }
  assert.equal((await ctx.request.post(base+'/api/dealer/product-master',{headers:{Origin:'https://invalid.example'},data:{products:[{id:'qa-v709-p0002',price:1000}]}})).status(),403)
  assert.equal((await ctx.request.post(base+'/api/dealer/product-master',{headers:{Origin:base},data:{dealerId:'qa-v709-b',sourceCode:'OTHER',products:[{id:'qa-v709-foreign-product',price:1000}]}})).status(),409)
  assert.deepEqual(errors,[])
  await ctx.close();await anonymous.close();await customer.close();await staff.close()
  console.log('v709 browser PASS: first login, master entry, 4000-product pagination, manufacturer/category filters, persistent selection, price confirmation, import, existing badge, desktop/mobile and authorization')
  console.log(fixture('seed'));console.log(fixture('test'))
  console.log(execFileSync('docker',['exec','orimia-qa-v680-app','node','/tmp/lien-v709/production-audit.cjs'],{encoding:'utf8'}))
}finally{await browser.close();console.log(fixture('restore'));console.log('v709 QA fixtures removed')}
