import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE||path.resolve('node_modules/playwright-core/package.json'))
const {chromium}=require('playwright-core')
const base=process.env.VERIFY_BASE_URL||'http://127.0.0.1:3186'
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox']})
const out='artifacts/platform-usage-payments-v679/browser';fs.mkdirSync(out,{recursive:true})
const body=Buffer.from(JSON.stringify({version:1,role:'PLATFORM_OPERATOR',subject:'operator@example.test',issuedAt:Math.floor(Date.now()/1000),expiresAt:Math.floor(Date.now()/1000)+3600,sessionId:crypto.randomUUID()})).toString('base64url')
const token=body+'.'+crypto.createHmac('sha256','v679-fixture-only-secret-000000000000000000000000000').update(body).digest('base64url')
try{
  for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844],['small-mobile',360,780]]){
    const context=await browser.newContext({viewport:{width,height}})
    await context.addCookies([{name:'lien_platform_operator_session',value:token,url:base}])
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message))
    async function noOverflow(){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),name+': horizontal overflow')}
    await page.goto(base+'/platform/payments?month=2026-09')
    await page.getByRole('heading',{name:'利用料・支払い状況',exact:true}).waitFor()
    await noOverflow();await page.screenshot({path:out+'/'+name+'-list.png'})
    await page.getByLabel('事業者名',{exact:true}).fill('サロン')
    assert.equal(await page.getByLabel('事業者名',{exact:true}).inputValue(),'サロン')
    await Promise.all([page.waitForURL(/q=/),page.getByRole('button',{name:'絞り込む',exact:true}).click()])
    assert.ok(!(await page.locator('.fee-table').innerText()).includes('dealer-a'))
    await page.goto(base+'/platform/payments/salon/salon-unconfigured?month=2026-09')
    if(name==='desktop'){
      await page.getByLabel('初回請求月',{exact:true}).fill('2026-09')
      await page.getByLabel('月額利用料（税込・円）',{exact:true}).fill('12800')
      await page.getByLabel('毎月の支払期日',{exact:true}).selectOption('27')
      await page.getByLabel('口座振替の手続き完了',{exact:true}).check()
      await Promise.all([page.waitForURL(/saved=1/),page.getByRole('button',{name:'請求設定を保存',exact:true}).click()])
      await page.locator('.fee-meta').waitFor();assert.ok((await page.locator('.fee-meta').innerText()).includes('銀行振込'))
      const payment=page.locator('form').filter({has:page.getByRole('heading',{name:'2026-09の支払い記録'})})
      await payment.getByLabel('支払い状況',{exact:true}).selectOption('PARTIAL')
      await payment.getByLabel('累計入金額（一部入金のみ・円）',{exact:true}).fill('3000')
      await payment.getByLabel('入金日（入金済み・一部入金）',{exact:true}).fill('2026-09-25')
      await payment.getByLabel('変更理由・確認内容',{exact:true}).fill('画面からの入金確認')
      await Promise.all([page.waitForNavigation(),page.getByRole('button',{name:'支払い状況を保存',exact:true}).click()])
      assert.equal(await page.locator('.fee-meta .fee-state').innerText(),'一部入金')
      await page.getByLabel('対象月',{exact:true}).fill('2026-10')
      await Promise.all([page.waitForURL(/month=2026-10/),page.getByRole('button',{name:'表示',exact:true}).click()])
      assert.ok((await page.locator('.fee-meta').innerText()).includes('口座振替'))
      await page.goto(base+'/platform/payments/salon/salon-unconfigured?month=2026-09')
      await page.getByLabel('支払い状況',{exact:true}).selectOption('PAID')
      await page.getByLabel('入金日（入金済み・一部入金）',{exact:true}).fill('2026-09-26')
      await page.getByLabel('変更理由・確認内容',{exact:true}).fill('残額確認')
      await Promise.all([page.waitForNavigation(),page.getByRole('button',{name:'支払い状況を保存',exact:true}).click()])
      assert.equal(await page.locator('.fee-meta .fee-state').innerText(),'入金済み')
    }
    await noOverflow();await page.screenshot({path:out+'/'+name+'-detail.png',fullPage:true})
    await page.goto(base+'/platform/payments/dealer/dealer-a?month=2026-10')
    await noOverflow();await page.screenshot({path:out+'/'+name+'-debit.png',fullPage:true})
    await page.goto(base+'/platform')
    await page.getByRole('heading',{name:'利用中の事業者',exact:true}).waitFor()
    assert.ok(await page.locator('a[href="/platform/payments"]').count()>0)
    assert.equal(await page.locator('.fee-dashboard-payment').count(),6)
    await noOverflow();await page.screenshot({path:out+'/'+name+'-dashboard.png'})
    assert.deepEqual(errors,[])
    await context.close()
  }
  console.log('PASS: desktop/390px/360px layout, search, profile, transfer, debit, partial/full manual payments, dashboard links')
}finally{await browser.close()}
