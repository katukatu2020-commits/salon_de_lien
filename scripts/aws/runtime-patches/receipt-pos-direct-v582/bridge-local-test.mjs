import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'

const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const browser = await chromium.launch({ executablePath, headless:true })

try {
  const context = await browser.newContext()
  await context.grantPermissions(['local-network-access'], { origin:'https://salon-de-lien.com' })
  const page = await context.newPage()
  page.on('console', message => console.error('browser-console:', message.type(), message.text()))
  page.on('requestfailed', request => console.error('request-failed:', request.url(), request.failure()?.errorText))
  await page.route('https://salon-de-lien.com/', async route => {
    const response = await route.fetch()
    const headers = response.headers()
    headers['content-security-policy'] = String(headers['content-security-policy'] || '')
      .replace("connect-src 'self'", "connect-src 'self' http://127.0.0.1:17615")
    await route.fulfill({ response, headers })
  })
  await page.goto('https://salon-de-lien.com/', { waitUntil:'domcontentloaded', timeout:30_000 })
  const result = await page.evaluate(async () => {
    const statusResponse = await fetch('http://127.0.0.1:17615/status', { cache:'no-store' })
    const status = await statusResponse.json()
    const receipt = {
      brand:['ヘアサロン ハレルヤ', 'ORIMIA for Salon'],
      title:'領 収 書',
      meta:[{ label:'発行日時', value:'2026/09/08 12:00' }],
      items:[{ label:'髪質ケアトリートメント', detail:'施術', value:'5,500円' }],
      summary:[
        { label:'小計', value:'5,500円' },
        { label:'合計', value:'5,500円', emphasis:true },
      ],
      tax:'（うち消費税10% 500円）',
      payment:{ label:'お支払い', value:'現金' },
      message:['上記正に領収いたしました。', 'ご来店ありがとうございました。'],
      store:['ORIMIA for Salon', '岡山駅徒歩3分 / イコットニコット手前', '10:00〜19:00'],
    }
    const printResponse = await fetch('http://127.0.0.1:17615/print', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body:JSON.stringify({ version:1, dryRun:true, receipt }),
    })
    const print = await printResponse.json()
    const longResponse = await fetch('http://127.0.0.1:17615/print', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body:JSON.stringify({
        version:1,
        dryRun:true,
        receipt:{ ...receipt, items:Array.from({ length:18 }, (_, index) => ({
          label:`施術・商品明細 ${index + 1}`,
          detail:index % 2 ? '店販' : '施術',
          value:'5,500円',
        })) },
      }),
    })
    return {
      origin:location.origin,
      statusCode:statusResponse.status,
      status,
      printCode:printResponse.status,
      print,
      longCode:longResponse.status,
      long:await longResponse.json(),
    }
  })

  assert.equal(result.origin, 'https://salon-de-lien.com')
  assert.equal(result.statusCode, 200)
  assert.equal(result.status.version, 'v582')
  assert.equal(result.status.available, true)
  assert.equal(result.printCode, 200)
  assert.equal(result.print.dryRun, true)
  assert.equal(result.print.printed, false)
  assert.ok(result.print.heightMm > 40 && result.print.heightMm < 160)
  assert.equal(result.longCode, 200)
  assert.equal(result.long.dryRun, true)
  assert.ok(result.long.heightMm > result.print.heightMm + 80)
  console.log(JSON.stringify(result))
} finally {
  await browser.close()
}
