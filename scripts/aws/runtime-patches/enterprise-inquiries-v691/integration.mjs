import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import http from 'node:http'
import {createRequire} from 'node:module'
const require = createRequire('/app/package.json')
const {PrismaClient} = require('@prisma/client')
const {createBusinessInquiryService, parsePublicInquiry} = require('/app/business-inquiries-v637.js')
const {createBusinessAccountApprovalService} = require('/app/business-account-approvals-v643.js')
const connection = process.env.TEST_DATABASE_URL
assert.ok(connection, 'TEST_DATABASE_URL required')
const schema = 'test_enterprise691_' + crypto.randomBytes(6).toString('hex')
const url = new URL(connection); url.searchParams.set('schema', schema)
const root = new PrismaClient({datasources:{db:{url:connection}}})
const db = new PrismaClient({datasources:{db:{url:url.href}}})
let server
try {
  await root.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`)
  const service = createBusinessInquiryService({prisma:db, crypto})
  await service.ensureSchema()
  const base = {audience:'salon', organizationName:'QA 50店舗', contactName:'テスト担当', email:'qa@example.test', phone:'070-1111-2222', preferredContact:'email', message:'50店舗以上での導入をご相談します。', privacyAccepted:'1'}
  const input = (extra={}) => new URLSearchParams({...base,...extra})
  const ordinary = await service.createInquiry(parsePublicInquiry(input()))
  // Exercise migration against an existing row and a pre-v691 schema.
  await db.$executeRawUnsafe('ALTER TABLE "BusinessInquiry" DROP COLUMN "isEnterprise"')
  await createBusinessInquiryService({prisma:db, crypto}).ensureSchema()
  assert.equal((await db.$queryRawUnsafe('SELECT "isEnterprise" FROM "BusinessInquiry" WHERE "id"=$1', ordinary.id))[0].isEnterprise, false)
  const enterprise = await service.createInquiry(parsePublicInquiry(input({isEnterprise:'1'})))
  assert.equal(enterprise.inserted, true)
  assert.equal((await service.createInquiry(parsePublicInquiry(input({isEnterprise:'1'})))).inserted, false)
  assert.equal((await service.createInquiry(parsePublicInquiry(input()))).inserted, false)
  await service.updateInquiry({id:enterprise.id, status:'in_progress', operatorNote:'大口商談'})
  assert.equal((await db.$queryRawUnsafe('SELECT "isEnterprise" FROM "BusinessInquiry" WHERE "id"=$1', enterprise.id))[0].isEnterprise, true)
  const approvals = createBusinessAccountApprovalService({prisma:db, crypto, operatorSession:req=>req.headers.cookie==='qa=operator'?{email:'qa@example.test'}:null, renderPlatformPage:(title,body)=>'<!doctype html><html lang="ja"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'</title></head><body>'+body+'</body></html>', mailSender:()=>{throw new Error('No email expected')}})
  await approvals.ensureSchema()
  for (let i=0; i<21; i++) await service.createInquiry(parsePublicInquiry(input({audience:'dealer',organizationName:'Dealer '+i,isEnterprise:'1'})))
  const all = await approvals.loadInquiries(new URL('http://localhost/platform/inquiries'))
  assert.equal(all.total, 23)
  const filtered = await approvals.loadInquiries(new URL('http://localhost/platform/inquiries?contractType=enterprise&audience=dealer'))
  assert.equal(filtered.total, 21)
  assert.equal(filtered.rows.length, 20)
  assert.ok(filtered.rows.every(row=>row.isEnterprise===true&&row.audience==='dealer'))
  assert.equal((await approvals.loadInquiries(new URL('http://localhost/platform/inquiries?contractType=enterprise&audience=salon&status=in_progress&q=QA'))).total, 1)
  assert.equal((await approvals.loadInquiries(new URL('http://localhost/platform/inquiries?contractType=standard'))).total, 1)
  assert.equal((await approvals.loadInquiries(new URL('http://localhost/platform/inquiries?contractType=invalid'))).total, 23)
  server = http.createServer(async(req,res)=>{
    try {
      req.headers['x-forwarded-proto']='http'
      const requestUrl = new URL(req.url,'http://localhost')
      if (await service.handlePublic(req,res,requestUrl) || await approvals.handle(req,res,requestUrl)) return
      res.statusCode=404; res.end()
    } catch (error) { console.error(error.message); res.statusCode=500; res.end() }
  })
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
  const origin='http://127.0.0.1:'+server.address().port
  let response=await fetch(origin+'/platform/inquiries',{redirect:'manual'})
  assert.equal(response.status,302)
  response=await fetch(origin+'/platform/inquiries?contractType=enterprise&audience=dealer',{headers:{cookie:'qa=operator'}})
  assert.equal(response.status,200)
  const html=await response.text()
  assert.ok(html.includes('大口契約（50店舗以上）'))
  assert.ok(html.includes('value="enterprise" selected'))
  assert.ok(html.includes('audience=dealer&contractType=enterprise&page=2'))
  assert.ok(!html.includes('QA 50店舗'))
  const submit=body=>fetch(origin+'/api/public/business-inquiries',{method:'POST',headers:{origin,'content-type':'application/x-www-form-urlencoded'},body,redirect:'manual'})
  response=await submit(input({organizationName:'HTTP enterprise',isEnterprise:'1'}))
  assert.equal(response.status,303); assert.ok(response.headers.get('location').includes('inquiry=sent'))
  assert.equal((await db.$queryRawUnsafe('SELECT "isEnterprise" FROM "BusinessInquiry" WHERE "organizationName"=$1','HTTP enterprise'))[0].isEnterprise,true)
  response=await submit(input({organizationName:'HTTP ordinary'}))
  assert.ok(response.headers.get('location').includes('inquiry=sent'))
  response=await submit(input({organizationName:'Invalid',isEnterprise:'true'}))
  assert.ok(response.headers.get('location').includes('inquiry=invalid'))
  response=await submit(input({organizationName:'Invalid phone',isEnterprise:'1',phone:''}))
  assert.ok(response.headers.get('location').includes('inquiry=invalid'))
  response=await fetch(origin+'/api/public/business-inquiries',{method:'POST',headers:{origin:'https://other.example','content-type':'application/x-www-form-urlencoded'},body:input({organizationName:'Cross site',isEnterprise:'1'}),redirect:'manual'})
  assert.ok(response.headers.get('location').includes('inquiry=invalid'))
  await submit(input({organizationName:'Honeypot',website:'spam',isEnterprise:'1'}))
  assert.equal((await db.$queryRawUnsafe('SELECT COUNT(*)::int AS n FROM "BusinessInquiry"'))[0].n,25)
  console.log('PASS migration/defaults, deduplication, salon/dealer classification, filtering, pagination, status preservation, auth/CSRF, HTTP submissions')
} finally {
  if (server) await new Promise(resolve=>server.close(resolve))
  await db.$disconnect()
  await root.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`)
  await root.$disconnect()
}
