import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3174'
if (!['127.0.0.1','localhost'].includes(new URL(base).hostname)) throw Error('Local fixture only')
const out = process.env.SCREENSHOT_DIR || 'artifacts/customer-desktop-quality-v674/before'
fs.mkdirSync(out,{recursive:true})
const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true})
try {
  const context = await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1})
  const login = await context.request.post(base+'/api/customer-auth/login',{form:{loginId:'demo.hana',password:'Mypage2026!',next:'/u/home'}})
  console.log('login',login.status())
  for (const route of (process.env.AUDIT_ROUTES || 'home,appointments,profile,stamps,stores,coupons,history,chat,community,catalog,points,campaigns,news,menu,reviews').split(',')) {
    const page = await context.newPage()
    const errors=[];page.on('pageerror',e=>errors.push(e.message))
    try {
      const r=await page.goto(base+'/u/'+route,{waitUntil:'domcontentloaded',timeout:35000})
      await page.waitForFunction(()=>document.documentElement.dataset.orimiaUiReady==='v516',{},{timeout:12000}).catch(()=>{})
      await page.waitForTimeout(500)
      if (process.env.APPLY_DESIGN_CSS) await page.addStyleTag({path:'scripts/aws/runtime-patches/customer-desktop-quality-v674/customer-desktop-quality-v674.css'})
      await page.screenshot({path:path.join(out,route+'.png'),fullPage:true})
      fs.writeFileSync(path.join(out,route+'.html'),await page.content())
      const data=await page.evaluate(()=>({path:location.pathname,overflow:document.documentElement.scrollWidth-innerWidth,main:[...document.querySelectorAll('main')].map(e=>({class:e.className,children:[...e.children].map(c=>({tag:c.tagName,class:c.className,id:c.id,children:[...c.children].slice(0,10).map(d=>({tag:d.tagName,class:d.className,id:d.id}))}))}))}))
      fs.writeFileSync(path.join(out,route+'.json'),JSON.stringify(data,null,2))
      if (process.env.AUDIT_GEOMETRY) console.log(JSON.stringify(await page.evaluate(()=>{const list=[];let e=document.querySelector('main');while(e){const s=getComputedStyle(e);list.push({tag:e.tagName,id:e.id,class:e.className,rect:e.getBoundingClientRect().toJSON(),style:{width:s.width,margin:s.margin,padding:s.padding,position:s.position,transform:s.transform,display:s.display,font:s.fontFamily}});e=e.parentElement}return list})))
      if (process.env.AUDIT_RULES) console.log(JSON.stringify(await page.evaluate(()=>{const a=[];function walk(rules){for(const r of rules){try{if(r.selectorText&&document.body.matches(r.selectorText)&&(r.style.padding||r.style.paddingLeft||r.style.fontFamily))a.push(r.cssText)}catch{}if(r.cssRules)walk(r.cssRules)}}for(const s of document.styleSheets){try{walk(s.cssRules)}catch{}}return a})))
      console.log(JSON.stringify({route,status:r.status(),...data,errors}))
    } catch(e) { console.log(route,e.message) }
    await page.close()
  }
} finally {await browser.close()}
