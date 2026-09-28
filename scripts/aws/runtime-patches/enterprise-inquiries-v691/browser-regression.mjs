import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {execFileSync} from 'node:child_process'
import {createRequire} from 'node:module'
const require=createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || path.resolve('../node_modules/playwright-core/package.json'))
const {chromium}=require('playwright-core')
const base='http://127.0.0.1:3188'
const guard="if(process.env.ORIMIA_ISOLATED_QA!=='v680'||!process.env.DATABASE_URL.includes('/orimia_qa_v680_20260926?'))throw Error('Isolated QA only');"
function local(code){return execFileSync('docker',['exec','orimia-qa-v680-app','node','-e',guard+code],{encoding:'utf8'}).trim()}
function query(sql,params=[]){return JSON.parse(local("const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.$queryRawUnsafe("+JSON.stringify(sql)+','+params.map(v=>JSON.stringify(v)).join(',')+").then(r=>console.log(JSON.stringify(r))).finally(()=>p.$disconnect())"))}
const token=local("const p=require('/app/platform-operator');console.log(p.signSession(require('crypto'),p.operatorConfig()))")
const prefix='QA-v691-'+Date.now()
const artifact=path.resolve('artifacts/enterprise-inquiries-v691');fs.mkdirSync(artifact,{recursive:true})
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const errors=[]
try {
  const context=await browser.newContext({viewport:{width:1440,height:1000}})
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message))
  const paths=['/business','/business/salon','/business/dealer']
  for(let i=0;i<paths.length;i++) {
    await page.goto(base+paths[i]+'#contact')
    const box=page.getByRole('checkbox',{name:'50店舗以上での導入を希望（大口契約）'})
    assert.equal(await box.isChecked(),false)
    assert.equal(await box.getAttribute('required'),null)
    await page.locator('[name=audience]').selectOption(i===2?'dealer':'salon')
    if(i!==1) await box.check()
    await page.locator('[name=organizationName]').fill(prefix+'-'+i)
    await page.locator('[name=contactName]').fill('QA担当者')
    await page.locator('[name=email]').fill('qa-v691@example.test')
    await page.locator('[name=phone]').fill('070-1111-2222')
    await page.locator('[name=message]').fill('隔離されたテスト環境からの申請確認です。')
    await page.locator('[name=privacyAccepted]').check()
    await page.getByRole('button',{name:'相談内容を送信'}).click()
    await page.waitForURL(/inquiry=sent/)
    assert.ok(await page.getByRole('status').isVisible())
  }
  const saved=query('SELECT "organizationName","isEnterprise","audience" FROM "BusinessInquiry" WHERE "organizationName" LIKE $1 ORDER BY "organizationName"',[prefix+'%'])
  assert.equal(saved.length,3)
  assert.deepEqual(saved.map(row=>row.isEnterprise),[true,false,true])
  assert.equal(saved[2].audience,'dealer')
  for(const width of [1440,390,320]) {
    await page.setViewportSize({width,height:900})
    await page.goto(base+'/business#contact')
    await page.locator('[name=isEnterprise]').uncheck()
    await page.locator('.inquiry-enterprise').scrollIntoViewIfNeeded()
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
    const bounds=await page.locator('.inquiry-enterprise').boundingBox()
    assert.ok(bounds.height>=44)
    await page.locator('.inquiry-enterprise').click()
    assert.equal(await page.locator('[name=isEnterprise]').isChecked(),true)
    await page.screenshot({path:path.join(artifact,'application-'+width+'.png')})
  }
  await context.addCookies([{name:'lien_platform_operator_session',value:token,url:base}])
  await page.setViewportSize({width:1440,height:1000})
  await page.goto(base+'/platform/inquiries?q='+prefix)
  assert.equal(await page.locator('.baaInquiry').count(),3)
  await page.locator('[name=contractType]').selectOption('enterprise')
  await page.getByRole('button',{name:'絞り込む'}).click()
  assert.equal(await page.locator('.baaInquiry').count(),2)
  assert.equal(await page.locator('.baaInquiry .baaState').filter({hasText:'大口契約（50店舗以上）'}).count(),2)
  await page.screenshot({path:path.join(artifact,'operator-enterprise.png'),fullPage:true})
  await page.locator('[name=contractType]').selectOption('standard')
  await page.getByRole('button',{name:'絞り込む'}).click()
  assert.equal(await page.locator('.baaInquiry').count(),1)
  for(const width of [1200,1024,850,390,320]) {
    await page.setViewportSize({width,height:900})
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
    assert.ok(await page.locator('.baaToolbar').evaluate(e=>[...e.children].every(child=>child.getBoundingClientRect().right<=e.getBoundingClientRect().right+1)))
    await page.screenshot({path:path.join(artifact,'operator-'+width+'.png'),fullPage:true})
  }
  assert.deepEqual(errors,[])
  console.log('PASS browser form submissions, optional checkbox, persisted classification, operator filter, desktop/mobile layout; isolated QA only')
} finally {
  await browser.close()
  local("const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.$executeRawUnsafe('DELETE FROM \"BusinessInquiry\" WHERE \"organizationName\" LIKE $1',"+JSON.stringify(prefix+'%')+").finally(()=>p.$disconnect())")
}
