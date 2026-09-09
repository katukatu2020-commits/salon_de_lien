import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import fs from 'node:fs'
const require=createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE||import.meta.url)
const {chromium}=require('playwright-core')
const base=process.env.SMOKE_BASE_URL||'http://localhost:3601'
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Real favorite writes are restricted to the local test environment')
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true})
const context=await browser.newContext({viewport:{width:390,height:900}})
const login=async ctx=>assert.ok((await ctx.request.post(base+'/api/customer-auth/login',{form:{loginId:'demo.hana',password:'Mypage2026!'}})).ok())
let productId,wasFavorite=false
try{
  await login(context)
  const page=await context.newPage()
  await page.goto(base+'/u/catalog')
  const href=await page.locator('.product-row').first().getAttribute('href')
  productId=decodeURIComponent(href.split('/').pop())
  const before=await(await context.request.get(base+'/api/customer/product-favorites')).json()
  wasFavorite=before.productIds.includes(productId)
  const response=await context.request.put(base+'/api/customer/product-favorites',{headers:{Origin:base},data:{productId,favorite:true}})
  assert.equal(response.status(),200)
  const second=await browser.newContext({viewport:{width:390,height:900}})
  await login(second)
  const other=await second.newPage()
  await other.goto(base+'/u/catalog?category=favorites')
  await other.locator('.cj-favorites-list').waitFor()
  await other.locator(`.cj-favorites-list a[href="${href}"]`).waitFor()
  assert.equal(await other.locator('.cj-favorites-list .rank').count(),0)
  fs.mkdirSync('artifacts/customer-journey-favorites-v601/browser',{recursive:true})
  await other.waitForTimeout(1000)
  await other.screenshot({path:'artifacts/customer-journey-favorites-v601/browser/favorites-persisted-390.png'})
  await other.locator(`.cj-favorites-list a[href="${href}"]`).click()
  assert.equal(await other.locator('[data-cj-favorite]').getAttribute('aria-pressed'),'true')
  await other.locator('[data-cj-favorite]').click()
  await other.waitForFunction(()=>document.querySelector('[data-cj-favorite]')?.getAttribute('aria-pressed')==='false')
  await other.goto(base+'/u/catalog?category=favorites')
  assert.equal(await other.locator(`.cj-favorites-list a[href="${href}"]`).count(),0)
  await other.screenshot({path:'artifacts/customer-journey-favorites-v601/browser/favorites-removed-390.png'})
  await page.goto(base+'/u/profile');await page.locator('.cj-member').waitFor()
  const styles=await page.evaluate(()=>({route:document.documentElement.dataset.customerJourney,styles:['main.cj-main','.cj-profile-overview h1','.cj-member h2'].map(selector=>{
    const el=document.querySelector(selector),style=getComputedStyle(el)
    const flatten=rules=>[...rules].flatMap(rule=>rule.type===CSSRule.STYLE_RULE?[rule]:rule.cssRules?flatten(rule.cssRules):[])
    return {selector,font:style.fontFamily,maxWidth:style.maxWidth,rules:[...document.styleSheets].flatMap(sheet=>{try{return flatten(sheet.cssRules)}catch{return []}}).filter(rule=>rule.selectorText&&el.matches(rule.selectorText)&&(rule.style?.fontFamily||rule.style?.maxWidth)).map(rule=>rule.cssText)}
  })}))
  fs.writeFileSync('artifacts/customer-journey-favorites-v601/computed-styles.json',JSON.stringify(styles,null,2))
  await second.close()
  console.log(JSON.stringify({passed:true,realApiPersistenceAcrossLogins:true,onlyFavoritedProductsShown:true,removeReflected:true}))
}finally{
  if(productId)assert.equal((await context.request.put(base+'/api/customer/product-favorites',{headers:{Origin:base},data:{productId,favorite:wasFavorite}})).status(),200)
  await browser.close()
}
