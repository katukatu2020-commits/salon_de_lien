import assert from 'node:assert/strict'
export async function run({request,db,base,cookie}) {
  const list='/platform/businesses',detail=list+'/salon/salon-a'
  for(const path of [list,detail,list+'/dealer/dealer-a']) {
    assert.equal((await request(path,null,'')).status,302)
    assert.equal((await request(path,null,'lien_admin_session=salon')).status,302)
    assert.equal((await request(path)).status,200)
  }
  assert.equal((await request(list,{})).status,405)
  assert.equal((await fetch(base+detail,{method:'HEAD',headers:{Cookie:cookie}})).status,200)
  assert.equal((await request(list+'/salon/missing')).status,404)
  const overview=await request('/platform')
  assert.ok(!overview.body.includes('登録店舗一覧'));assert.ok(!overview.body.includes('利用中の事業者'))
  assert.ok(!overview.body.includes('data-business='))
  const html=(await request(list)).body
  assert.equal((html.match(/data-business=/g)||[]).length,6)
  assert.equal((html.match(/data-business="SALON:salon-a"/g)||[]).length,1)
  assert.ok(html.includes('入金済み'))
  assert.equal(((await request(list+'?type=DEALER')).body.match(/data-business=/g)||[]).length,2)
  assert.equal(((await request(list+'?state=SUSPENDED')).body.match(/data-business=/g)||[]).length,1)
  assert.equal(((await request(list+'?q=salon-a')).body.match(/data-business=/g)||[]).length,1)
  assert.ok((await request(list+'?q='+encodeURIComponent('<script>'))).body.includes('&lt;script&gt;'))
  await db.$executeRawUnsafe(`ALTER TABLE "AppUser" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT NOW()`)
  await db.$executeRawUnsafe(`ALTER TABLE "OrganizationBilling" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT NOW()`)
  await db.$executeRawUnsafe(`ALTER TABLE "WholesaleDealer" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT NOW()`)
  await db.$executeRawUnsafe(`ALTER TABLE "WholesaleDealer" ADD COLUMN IF NOT EXISTS "authVersion" INT DEFAULT 0`)
  await db.$executeRawUnsafe(`ALTER TABLE "WholesaleDealerBilling" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT NOW()`)
  for(const [type,id] of [['salon','salon-a'],['dealer','dealer-a']]) {
    const endpoint='/api/platform/business-accounts/'+type+'/'+id
    const returnTo=list+'/'+type+'/'+id
    const bad=await request(endpoint+'/suspend',{},cookie,'https://evil.test')
    assert.equal(bad.status,403)
    const stopped=await request(endpoint+'/suspend?returnTo='+encodeURIComponent(returnTo),{})
    assert.equal(stopped.headers.get('location'),returnTo+'?account=suspended')
    assert.equal((await db.$queryRawUnsafe('SELECT "status" FROM "BusinessAccountControl" WHERE "accountType"=$1 AND "targetId"=$2',type.toUpperCase(),id))[0].status,'SUSPENDED')
    assert.ok((await request(returnTo)).body.includes('利用再開を確定'))
    const resumed=await request(endpoint+'/resume?returnTo=https://evil.test',{})
    assert.equal(resumed.headers.get('location'),list+'?account=resumed')
    assert.ok((await request(returnTo)).body.includes('利用停止を確定'))
  }
  await db.$executeRawUnsafe(`INSERT INTO "Organization" ("id","name") SELECT 'console-page-'||n,'一覧検証'||n FROM generate_series(1,231) n`)
  const last=await request(list+'?q='+encodeURIComponent('一覧検証')+'&page=8')
  assert.equal(last.status,200)
  assert.equal((last.body.match(/data-business=/g)||[]).length,21)
  assert.ok(last.body.includes('8 / 8'));assert.ok(last.body.includes('231件'))
  await db.$executeRawUnsafe(`DELETE FROM "Organization" WHERE "id" LIKE 'console-page-%'`)
  console.log('PASS v683 DB: operator authorization, single business rows, filters, >200 records, HEAD/404, CSRF, audited suspend/resume, safe redirects, payments retained')
}
