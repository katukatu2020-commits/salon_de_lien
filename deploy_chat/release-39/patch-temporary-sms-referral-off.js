const fs = require('fs')
const path = require('path')

const appRoot = process.env.APP_ROOT || '/app'
const marker = 'temporary-sms-referral-off-v39'

function read(relative) {
  return fs.readFileSync(path.join(appRoot, relative), 'utf8')
}

function write(relative, source) {
  fs.writeFileSync(path.join(appRoot, relative), source)
}

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

function replaceRange(source, startNeedle, endNeedle, replacement, label) {
  const start = source.indexOf(startNeedle)
  if (start < 0) throw new Error(`${label}: start not found`)
  const end = source.indexOf(endNeedle, start + startNeedle.length)
  if (end < 0) throw new Error(`${label}: end not found`)
  return source.slice(0, start) + replacement + source.slice(end)
}

function patchOtpRoute(relative, anchor, responseRef) {
  let source = read(relative)
  if (source.includes(marker)) return
  source = replaceOnce(
    source,
    anchor,
    `${anchor}if("false"===process.env.CUSTOMER_SMS_VERIFICATION_ENABLED)return ${responseRef}.NextResponse.json({error:"SMS認証は現在一時停止中です。",feature:"${marker}"},{status:503,headers:{"Cache-Control":"no-store"}});`,
    `OTP route ${relative}`,
  )
  write(relative, source)
}

patchOtpRoute(
  '.next/server/app/api/customer-auth/phone-verification/request/route.js',
  'let c="nodejs",l="force-dynamic";async function p(e){',
  's',
)
patchOtpRoute(
  '.next/server/app/api/customer-auth/phone-verification/verify/route.js',
  'let u="nodejs",l="force-dynamic";async function p(e){',
  's',
)

function patchRegistrationLanding() {
  const relative = '.next/server/app/u/register/page.js'
  let source = read(relative)
  if (source.includes(marker)) return
  source = replaceOnce(
    source,
    '"メールのリンクを開いた後、プロフィール入力と携帯電話番号のSMS認証を行います。"',
    `"false"===process.env.CUSTOMER_SMS_VERIFICATION_ENABLED?"メールのリンクを開いた後、プロフィール入力と電話番号の重複確認を行います。SMS認証は現在一時停止中です。":"メールのリンクを開いた後、プロフィール入力と携帯電話番号のSMS認証を行います。"/* ${marker} */`,
    'registration landing copy',
  )
  write(relative, source)
}

function patchRegistrationForm() {
  const relative = '.next/server/app/u/register/[token]/page.js'
  let source = read(relative)
  if (source.includes(marker)) return
  source = replaceOnce(
    source,
    's.jsx(h.h,{})',
    `"false"===process.env.CUSTOMER_SMS_VERIFICATION_ENABLED?(0,s.jsxs)("label",{className:"grid gap-1.5 text-sm font-semibold sm:col-span-2 ${marker}",children:["携帯電話番号",s.jsx("input",{id:"customer-registration-phone",name:"phone",inputMode:"tel",autoComplete:"tel",required:!0,placeholder:"例: 090-1234-5678",className:"lien-input"}),s.jsx("span",{className:"text-xs font-normal leading-5 text-lien-muted",children:"SMS認証は現在一時停止中です。電話番号は、お客様アプリの重複登録防止に使用します。1つの携帯番号につき1アカウントまでです。"})]}):s.jsx(h.h,{})`,
    'registration phone field',
  )
  write(relative, source)
}

patchRegistrationLanding()
patchRegistrationForm()

function patchActiveRegistrationAction() {
  const relative = '.next/server/chunks/2241.js'
  let source = read(relative)
  if (source.includes(marker)) return

  source = replaceOnce(
    source,
    'async function H(e){let t;',
    `async function H(e){let t,smsEnabled="false"!==process.env.CUSTOMER_SMS_VERIFICATION_ENABLED,referralsEnabled="false"!==process.env.CUSTOMER_REFERRAL_REWARDS_ENABLED;/* ${marker} */`,
    'active registration flags',
  )
  source = replaceOnce(
    source,
    'select:{id:!0,email:!0,expiresAt:!0,usedAt:!0}',
    'select:{id:!0,email:!0,customerId:!0,expiresAt:!0,usedAt:!0}',
    'active invite customer link',
  )
  source = replaceOnce(
    source,
    'y||(0,l.redirect)(i("profile")),I&&b||(0,l.redirect)(i("sms")),await (0,E.yV)(P,y)&&(0,l.redirect)(i("phone"));',
    'y||(0,l.redirect)(i("profile")),smsEnabled&&(!I||!b)&&(0,l.redirect)(i("sms")),await (0,E.yV)(P,y)&&(0,l.redirect)(i("phone"));',
    'active OTP requirement',
  )
  source = replaceOnce(
    source,
    'ei=(0,w.PB)(e,"referrerCode"),en=(0,w.PB)(e,"referrerName"),',
    'ei=referralsEnabled?(0,w.PB)(e,"referrerCode"):null,en=referralsEnabled?(0,w.PB)(e,"referrerName"):null,',
    'active referral form values',
  )

  const challengeStart = 'await t.$queryRaw`SELECT "id" FROM "SmsVerificationChallenge" WHERE "id" = ${I} FOR UPDATE`;'
  const referralStart = 'let s=ei?.trim().toUpperCase().startsWith("LIEN-")'
  const registrationGuard = `await t.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))",\`customer-app-phone:\${P}:\${y}\`);let claimedIdentity=await t.customerPhoneIdentity.findUnique({where:{organizationId_phoneE164:{organizationId:P,phoneE164:y}},select:{customerId:!0}}),registeredPhones=await t.appUser.findMany({where:{organizationId:P,role:"CUSTOMER",active:!0,customer:{is:{deletedAt:null,phone:{not:null}}}},select:{customerId:!0,customer:{select:{phone:!0}}}});if(claimedIdentity&&claimedIdentity.customerId!==n.customerId||registeredPhones.some(e=>e.customerId!==n.customerId&&e.customer?.phone&&(0,$.ni)(e.customer.phone)===y))throw Error("CUSTOMER_PHONE_ALREADY_USED");let i=null;if(smsEnabled){${challengeStart}i=await t.smsVerificationChallenge.findUnique({where:{id:I}});let verificationHash=(0,$.Bj)({challengeId:I,token:b,secret:(0,$.KB)()});if(!i||i.organizationId!==P||i.phoneE164!==y||!i.verifiedAt||i.consumedAt||i.expiresAt<=new Date||!(0,$.wC)(i.registrationTokenHash,verificationHash))return null;}`
  source = replaceRange(source, challengeStart, referralStart, registrationGuard, 'active SMS challenge block')

  source = replaceOnce(
    source,
    'referredByCustomerId:g?.id??null,aiPhotoConsent:ed,memo:em,phoneIdentity:{create:{organizationId:P,phoneE164:y,verifiedAt:i.verifiedAt}},appUsers:',
    'referredByCustomerId:referralsEnabled?g?.id??null:null,aiPhotoConsent:ed,memo:em,...smsEnabled?{phoneIdentity:{create:{organizationId:P,phoneE164:y,verifiedAt:i.verifiedAt}}}:{},appUsers:',
    'active account create data',
  )
  source = replaceOnce(
    source,
    'await t.smsVerificationChallenge.update({where:{id:i.id},data:{consumedAt:new Date}}),await t.customerRegistrationInvite.update',
    'smsEnabled&&i&&await t.smsVerificationChallenge.update({where:{id:i.id},data:{consumedAt:new Date}}),await t.customerRegistrationInvite.update',
    'active challenge consumption',
  )
  source = replaceOnce(
    source,
    'if(e instanceof Error&&"CUSTOMER_REGISTRATION_INVITE_INVALID"===e.message&&(0,l.redirect)(i("invite")),e instanceof o.Prisma.PrismaClientKnownRequestError',
    'if(e instanceof Error&&"CUSTOMER_REGISTRATION_INVITE_INVALID"===e.message&&(0,l.redirect)(i("invite")),e instanceof Error&&"CUSTOMER_PHONE_ALREADY_USED"===e.message&&(0,l.redirect)(i("phone")),e instanceof o.Prisma.PrismaClientKnownRequestError',
    'active duplicate error redirect',
  )
  write(relative, source)
}

function patchAlternateRegistrationAction() {
  const relative = '.next/server/chunks/1608.js'
  let source = read(relative)
  if (source.includes(marker)) return

  source = replaceOnce(
    source,
    '          async function G(e) {\n            let t;',
    `          async function G(e) {\n            let t,\n              smsEnabled = "false" !== process.env.CUSTOMER_SMS_VERIFICATION_ENABLED,\n              referralsEnabled = "false" !== process.env.CUSTOMER_REFERRAL_REWARDS_ENABLED; /* ${marker} */`,
    'alternate registration flags',
  )
  source = replaceOnce(
    source,
    '            (b || (0, l.redirect)(i("profile")),\n              (w && I) || (0, l.redirect)(i("sms")),\n              (await (0, E.yV)(P, b)) && (0, l.redirect)(i("phone")));',
    '            (b || (0, l.redirect)(i("profile")),\n              smsEnabled && (!w || !I) && (0, l.redirect)(i("sms")),\n              (await (0, E.yV)(P, b)) && (0, l.redirect)(i("phone")));',
    'alternate OTP requirement',
  )
  source = replaceOnce(
    source,
    '              ei = (0, y.PB)(e, "referrerCode"),\n              en = (0, y.PB)(e, "referrerName"),',
    '              ei = referralsEnabled ? (0, y.PB)(e, "referrerCode") : null,\n              en = referralsEnabled ? (0, y.PB)(e, "referrerName") : null,',
    'alternate referral form values',
  )

  const challengeStart = '                await t.$queryRaw`SELECT "id" FROM "SmsVerificationChallenge" WHERE "id" = ${w} FOR UPDATE`;'
  const referralStart = '                let s = ei?.trim().toUpperCase().startsWith("LIEN-")'
  const registrationGuard = `                await t.$executeRawUnsafe(\n                  "SELECT pg_advisory_xact_lock(hashtext($1))",\n                  \`customer-app-phone:\${P}:\${b}\`,\n+                );\n+                let claimedIdentity =\n+                    await t.customerPhoneIdentity.findUnique({\n+                      where: {\n+                        organizationId_phoneE164: {\n+                          organizationId: P,\n+                          phoneE164: b,\n+                        },\n+                      },\n+                      select: { customerId: !0 },\n+                    }),\n+                  registeredPhones = await t.appUser.findMany({\n+                    where: {\n+                      organizationId: P,\n+                      role: "CUSTOMER",\n+                      active: !0,\n+                      customer: {\n+                        is: { deletedAt: null, phone: { not: null } },\n+                      },\n+                    },\n+                    select: {\n+                      customerId: !0,\n+                      customer: { select: { phone: !0 } },\n+                    },\n+                  });\n+                if (\n+                  (claimedIdentity &&\n+                    claimedIdentity.customerId !== n.customerId) ||\n+                  registeredPhones.some(\n+                    (e) =>\n+                      e.customerId !== n.customerId &&\n+                      e.customer?.phone &&\n+                      (0, $.ni)(e.customer.phone) === b,\n+                  )\n+                )\n+                  throw Error("CUSTOMER_PHONE_ALREADY_USED");\n+                let i = null;\n+                if (smsEnabled) {\n+                  await t.$queryRaw\`SELECT "id" FROM "SmsVerificationChallenge" WHERE "id" = \${w} FOR UPDATE\`;\n+                  i = await t.smsVerificationChallenge.findUnique({\n+                    where: { id: w },\n+                  });\n+                  let verificationHash = (0, $.Bj)({\n+                    challengeId: w,\n+                    token: I,\n+                    secret: (0, $.KB)(),\n+                  });\n+                  if (\n+                    !i ||\n+                    i.organizationId !== P ||\n+                    i.phoneE164 !== b ||\n+                    !i.verifiedAt ||\n+                    i.consumedAt ||\n+                    i.expiresAt <= new Date() ||\n+                    !(0, $.wC)(i.registrationTokenHash, verificationHash)\n+                  )\n+                    return null;\n+                }\n+`
  source = replaceRange(source, challengeStart, referralStart, registrationGuard.replace(/\n\+/g, '\n'), 'alternate SMS challenge block')

  source = replaceOnce(
    source,
    '                        phoneIdentity: {\n                          upsert: {\n                            create: {\n                              organizationId: P,\n                              phoneE164: b,\n                              verifiedAt: i.verifiedAt,\n                            },\n                            update: {\n                              phoneE164: b,\n                              verifiedAt: i.verifiedAt,\n                            },\n                          },\n                        },',
    '                        ...(smsEnabled\n                          ? {\n                              phoneIdentity: {\n                                upsert: {\n                                  create: {\n                                    organizationId: P,\n                                    phoneE164: b,\n                                    verifiedAt: i.verifiedAt,\n                                  },\n                                  update: {\n                                    phoneE164: b,\n                                    verifiedAt: i.verifiedAt,\n                                  },\n                                },\n                              },\n                            }\n                          : {}),',
    'alternate linked phone identity',
  )
  source = replaceOnce(
    source,
    '                        referredByCustomerId: m?.id ?? null,',
    '                        referredByCustomerId: referralsEnabled\n                          ? (m?.id ?? null)\n                          : null,',
    'alternate referral link',
  )
  source = replaceOnce(
    source,
    '                        phoneIdentity: {\n                          create: {\n                            organizationId: P,\n                            phoneE164: b,\n                            verifiedAt: i.verifiedAt,\n                          },\n                        },',
    '                        ...(smsEnabled\n                          ? {\n                              phoneIdentity: {\n                                create: {\n                                  organizationId: P,\n                                  phoneE164: b,\n                                  verifiedAt: i.verifiedAt,\n                                },\n                              },\n                            }\n                          : {}),',
    'alternate new phone identity',
  )
  source = replaceOnce(
    source,
    '                  await t.smsVerificationChallenge.update({\n                    where: { id: i.id },\n                    data: { consumedAt: new Date() },\n                  }),',
    '                  smsEnabled &&\n                    i &&\n                    (await t.smsVerificationChallenge.update({\n                      where: { id: i.id },\n                      data: { consumedAt: new Date() },\n                    })),',
    'alternate challenge consumption',
  )
  source = replaceOnce(
    source,
    '                  "CUSTOMER_REGISTRATION_INVITE_INVALID" === e.message &&\n                  (0, l.redirect)(i("invite")),\n                e instanceof o.Prisma.PrismaClientKnownRequestError',
    '                  "CUSTOMER_REGISTRATION_INVITE_INVALID" === e.message &&\n                  (0, l.redirect)(i("invite")),\n                e instanceof Error &&\n                  "CUSTOMER_PHONE_ALREADY_USED" === e.message &&\n                  (0, l.redirect)(i("phone")),\n                e instanceof o.Prisma.PrismaClientKnownRequestError',
    'alternate duplicate error redirect',
  )
  write(relative, source)
}

patchActiveRegistrationAction()
patchAlternateRegistrationAction()

function patchReferralModule7295() {
  const relative = '.next/server/chunks/7295.js'
  let source = read(relative)
  if (source.includes(marker)) return
  const stopped = '紹介クーポンは現在一時停止中です。'
  source = replaceOnce(source, 'async function $(e,t){', `async function $(e,t){if("false"===process.env.CUSTOMER_REFERRAL_REWARDS_ENABLED)throw Error("${stopped}");/* ${marker} */`, 'referral issue service')
  source = replaceOnce(source, 'async function k({code:e,customerId:t,organizationId:r}){', `async function k({code:e,customerId:t,organizationId:r}){if("false"===process.env.CUSTOMER_REFERRAL_REWARDS_ENABLED)throw Error("${stopped}");`, 'referral registration service')
  source = replaceOnce(source, 'async function z(e,t){', 'async function z(e,t){if("false"===process.env.CUSTOMER_REFERRAL_REWARDS_ENABLED)return null;', 'referral availability service')
  source = replaceOnce(source, 'async function B(e,t,r,i=new Date){', 'async function B(e,t,r,i=new Date){if("false"===process.env.CUSTOMER_REFERRAL_REWARDS_ENABLED)return{discount:null,amount:0};', 'referral checkout service')
  source = replaceOnce(source, 'async function O(e,t,r=new Date){', 'async function O(e,t,r=new Date){if("false"===process.env.CUSTOMER_REFERRAL_REWARDS_ENABLED)return{awardedPoints:0,referrerAwardedPoints:0,referredAwardedPoints:0,skipped:!0};', 'referral reward service')
  write(relative, source)
}

function patchReferralModule805() {
  const relative = '.next/server/chunks/805.js'
  let source = read(relative)
  if (source.includes(marker)) return
  source = replaceOnce(source, '12206:(e,t,r)=>{', `12206:(e,t,r)=>{/* ${marker} */`, 'checkout referral marker')
  source = replaceOnce(source, 'async function x(e,t){', 'async function x(e,t){if("false"===process.env.CUSTOMER_REFERRAL_REWARDS_ENABLED)return null;', 'checkout referral availability')
  source = replaceOnce(source, 'async function D(e,t,r,a=new Date){', 'async function D(e,t,r,a=new Date){if("false"===process.env.CUSTOMER_REFERRAL_REWARDS_ENABLED)return{discount:null,amount:0};', 'checkout referral application')
  source = replaceOnce(source, 'async function T(e,t,r=new Date){', 'async function T(e,t,r=new Date){if("false"===process.env.CUSTOMER_REFERRAL_REWARDS_ENABLED)return{awardedPoints:0,referrerAwardedPoints:0,referredAwardedPoints:0,skipped:!0};', 'checkout referral reward')
  write(relative, source)
}

patchReferralModule7295()
patchReferralModule805()

function patchApi(relative, before, after, label) {
  let source = read(relative)
  if (source.includes(marker)) return
  source = replaceOnce(source, before, after, label)
  write(relative, source)
}

const referralStopResponse = '{error:"紹介クーポンは現在一時停止中です。",feature:"temporary-sms-referral-off-v39"}'
patchApi(
  '.next/server/app/api/customer/referrals/route.js',
  'async function f(e){',
  `async function f(e){if("false"===process.env.CUSTOMER_REFERRAL_REWARDS_ENABLED)return i.NextResponse.json(${referralStopResponse},{status:410});`,
  'customer referral issue API',
)
patchApi(
  '.next/server/app/api/customers/[customerId]/referrals/route.js',
  'async function d(e,{params:t}){',
  `async function d(e,{params:t}){if("false"===process.env.CUSTOMER_REFERRAL_REWARDS_ENABLED)return i.NextResponse.json(${referralStopResponse},{status:410});`,
  'admin referral issue API',
)
patchApi(
  '.next/server/app/api/referrals/[code]/complete-first-visit/route.js',
  'async function f(e,{params:t}){',
  `async function f(e,{params:t}){if("false"===process.env.CUSTOMER_REFERRAL_REWARDS_ENABLED)return i.NextResponse.json(${referralStopResponse},{status:410});`,
  'referral completion API',
)
patchApi(
  '.next/server/app/api/referrals/[code]/register/route.js',
  'async function u(e,{params:r}){',
  `async function u(e,{params:r}){if("false"===process.env.CUSTOMER_REFERRAL_REWARDS_ENABLED)return i.NextResponse.json(${referralStopResponse},{status:410});`,
  'legacy referral registration API',
)

function patchCouponApi() {
  const relative = '.next/server/app/api/customer/coupons/use/route.js'
  let source = read(relative)
  if (source.includes(marker)) return
  source = replaceOnce(
    source,
    'if(await d._.referral.findUnique({where:{code:n},select:{id:!0}})){',
    `if("false"!==process.env.CUSTOMER_REFERRAL_REWARDS_ENABLED&&await d._.referral.findUnique({where:{code:n},select:{id:!0}})){/* ${marker} */`,
    'coupon referral code branch',
  )
  write(relative, source)
}

patchCouponApi()

function patchReferralLanding() {
  const relative = '.next/server/app/referral/[code]/page.js'
  let source = read(relative)
  if (source.includes(marker)) return
  source = replaceOnce(
    source,
    'async function d({params:e}){let r=',
    `async function d({params:e}){if("false"===process.env.CUSTOMER_REFERRAL_REWARDS_ENABLED)return s.jsx("main",{className:"grid min-h-screen place-items-center bg-lien px-4 py-8 text-lien-ink ${marker}",children:(0,s.jsxs)("section",{className:"w-full max-w-md rounded-[24px] border border-lien bg-white p-6 text-center shadow-lien-sm",children:[s.jsx("h1",{className:"text-xl font-semibold",children:"紹介クーポンは一時停止中です"}),s.jsx("p",{className:"mt-3 text-sm leading-7 text-lien-muted",children:"現在、紹介コードの発行・登録・割引適用を停止しています。通常のお客様登録は引き続きご利用いただけます。"}),s.jsx(n.default,{href:"/u/register",className:"lien-button-primary mt-6 min-h-12 w-full",children:"通常の新規登録へ"})]})});let r=`,
    'referral landing gate',
  )
  write(relative, source)
}

patchReferralLanding()

function patchPointsPage() {
  const relative = '.next/server/app/u/(account)/points/page.js'
  let source = read(relative)
  if (source.includes(marker)) return
  source = replaceOnce(
    source,
    'children:[s.jsx(l,{}),s.jsx(u,{discountRates:y,initialReferral:d?{code:d.code,referralUrl:`/referral/${encodeURIComponent(d.code)}`}:null})]',
    `children:[s.jsx(l,{referralsEnabled:"false"!==process.env.CUSTOMER_REFERRAL_REWARDS_ENABLED}),"false"!==process.env.CUSTOMER_REFERRAL_REWARDS_ENABLED?s.jsx(u,{discountRates:y,initialReferral:d?{code:d.code,referralUrl:\`/referral/\${encodeURIComponent(d.code)}\`}:null}):null/* ${marker} */]`,
    'points referral UI gate',
  )
  source = replaceOnce(
    source,
    'function c(){var e;let',
    'function c({referralsEnabled:R=!0}={}){var e;let',
    'server coupon entry props',
  )
  source = replaceOnce(
    source,
    'children:"限定クーポンまたは友達紹介コードを入力してください。"',
    'children:R?"限定クーポンまたは友達紹介コードを入力してください。":"限定クーポンコードを入力してください。"',
    'server coupon entry copy',
  )
  write(relative, source)

  const staticRelative = '.next/static/chunks/app/u/(account)/points/page-d5be485caa1e3acb.js'
  source = read(staticRelative)
  source = replaceOnce(
    source,
    'function c(){var e;let',
    `function c({referralsEnabled:R=!0}={}){var e;let/* ${marker} */`,
    'client coupon entry props',
  )
  source = replaceOnce(
    source,
    'children:"限定クーポンまたは友達紹介コードを入力してください。"',
    'children:R?"限定クーポンまたは友達紹介コードを入力してください。":"限定クーポンコードを入力してください。"',
    'client coupon entry copy',
  )
  write(staticRelative, source)
}

patchPointsPage()

function patchCompatibilityCoupons() {
  const relative = 'server.js'
  let source = read(relative)
  if (source.includes(marker)) return
  source = replaceOnce(
    source,
    '  const data = await customerAppData(session), now = new Date()\n',
    `  const data = await customerAppData(session), now = new Date()\n  const referralEnabled = process.env.CUSTOMER_REFERRAL_REWARDS_ENABLED !== 'false' // ${marker}\n`,
    'compatibility coupon flag',
  )
  source = replaceOnce(
    source,
    "  const rows = [...coupons.map(c => ({...c, benefit: `${c.discountValue}${String(c.discountType).includes('%') ? '%OFF' : ''}`, menu: c.targetMenu})), ...issues.map(c => ({...c, benefit: `${c.discountRate}%OFF`, menu: jsonArray(c.targetMenusJson).join('・')}))]\n  const allowed = new Set(['all','recommended','limited','referral'])",
    "  const referralPattern = /紹介|友達|家族/\n  const allRows = [...coupons.map(c => ({...c, benefit: `${c.discountValue}${String(c.discountType).includes('%') ? '%OFF' : ''}`, menu: c.targetMenu})), ...issues.map(c => ({...c, benefit: `${c.discountRate}%OFF`, menu: jsonArray(c.targetMenusJson).join('・')}))]\n  const rows = referralEnabled ? allRows : allRows.filter(c => !referralPattern.test([c.title,c.description,c.menu].filter(Boolean).join(' ')))\n  const allowed = new Set(referralEnabled ? ['all','recommended','limited','referral'] : ['all','recommended','limited'])",
    'compatibility referral row filter',
  )
  source = replaceOnce(
    source,
    "  const referralPattern = /紹介|友達|家族/\n  const viewRows",
    '  const viewRows',
    'compatibility duplicate referral pattern',
  )
  source = replaceOnce(
    source,
    "  const filters = [['all','すべて'],['recommended','おすすめ'],['limited','期間限定'],['referral','紹介特典']]",
    "  const filters = referralEnabled ? [['all','すべて'],['recommended','おすすめ'],['limited','期間限定'],['referral','紹介特典']] : [['all','すべて'],['recommended','おすすめ'],['limited','期間限定']]",
    'compatibility referral tab',
  )
  write(relative, source)
}

patchCompatibilityCoupons()

console.log(JSON.stringify({ patched: marker, appRoot }))
