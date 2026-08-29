import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const routePath = `${root}/.next/server/app/api/auth/password-reset/request/route.js`
const pagePath = `${root}/.next/server/app/u/password-reset/page.js`
const marker = 'customer-password-reset-not-found-v464'

function replaceExactly(source, oldValue, newValue, label) {
  const first = source.indexOf(oldValue)
  if (first < 0 || source.indexOf(oldValue, first + oldValue.length) >= 0) {
    throw new Error(`${marker}: expected exactly one ${label}`)
  }
  return source.replace(oldValue, newValue)
}

let route = fs.readFileSync(routePath, 'utf8')
if (route.includes(marker)) throw new Error(`${marker}: route patch already applied`)

const oldRouteFlow = `let n=(0,u.bU)(String(t.get("email")||"")),o=()=>(function(e,t){let r=(0,d.tm)(e,"admin"===t?"/admin/password-reset":"/u/password-reset");r.searchParams.set("sent","1");let n=i.NextResponse.redirect(r,303);return n.headers.set("Cache-Control","no-store"),n})(e,r);if(!(0,u.U9)(n))return o();let s=function(e,t,r){let n=e.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"unknown";return\`${'${n}:${r}:${t}'}\`}(e,n,r),a=Date.now(),p=m.get(s);if(p&&p.resetAt>a&&p.count>=5)return o();m.set(s,{count:(p?.resetAt??0)>a?p.count+1:1,resetAt:(p?.resetAt??0)>a?p.resetAt:a+9e5});let f=await c._.appUser.findFirst({where:{email:{equals:n,mode:"insensitive"},active:!0,role:"customer"===r?"CUSTOMER":{in:["ADMIN","STAFF","MANUFACTURER"]}},select:{id:!0,email:!0,loginId:!0,role:!0}});if(!f||!(0,u.U9)(f.email))return o();`

const newRouteFlow = `let n=(0,u.bU)(String(t.get("email")||"")),o=()=>(function(e,t){let r=(0,d.tm)(e,"admin"===t?"/admin/password-reset":"/u/password-reset");r.searchParams.set("sent","1");let n=i.NextResponse.redirect(r,303);return n.headers.set("Cache-Control","no-store"),n})(e,r),v=()=>{if("admin"===r)return o();let t=(0,d.tm)(e,"/u/password-reset");t.searchParams.set("error","account-not-found");let n=i.NextResponse.redirect(t,303);return n.headers.set("Cache-Control","no-store"),n};/* ${marker} */if(!(0,u.U9)(n))return v();let f=await c._.appUser.findFirst({where:{email:{equals:n,mode:"insensitive"},active:!0,...("customer"===r?{role:"CUSTOMER",customer:{is:{deletedAt:null}}}:{role:{in:["ADMIN","STAFF","MANUFACTURER"]}})},select:{id:!0,email:!0,loginId:!0,role:!0}});if(!f||!(0,u.U9)(f.email))return v();let s=function(e,t,r){let n=e.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"unknown";return\`${'${n}:${r}:${t}'}\`}(e,n,r),a=Date.now(),p=m.get(s);if(p&&p.resetAt>a&&p.count>=5)return o();m.set(s,{count:(p?.resetAt??0)>a?p.count+1:1,resetAt:(p?.resetAt??0)>a?p.resetAt:a+9e5});`

route = replaceExactly(route, oldRouteFlow, newRouteFlow, 'legacy password-reset request flow')
fs.writeFileSync(routePath, route)

let page = fs.readFileSync(pagePath, 'utf8')
if (page.includes(marker)) throw new Error(`${marker}: page patch already applied`)

page = replaceExactly(
  page,
  `function o({searchParams:e}){return s.jsx(i.x,{audience:"customer",sent:e?.sent==="1"})}`,
  `function o({searchParams:e}){return s.jsx(i.x,{audience:"customer",sent:e?.sent==="1",accountNotFound:e?.error==="account-not-found"})}`,
  'customer password-reset page props',
)
page = replaceExactly(
  page,
  `function l({audience:e,sent:t=!1}){let r="admin"===e;`,
  `function l({audience:e,sent:t=!1,accountNotFound:q=!1}){let r="admin"===e;/* ${marker} */`,
  'password-reset request component signature',
)
page = replaceExactly(
  page,
  `t?s.jsx("div",{role:"status",className:"mt-5 rounded-2xl border border-[#bfd5c1] bg-[#f2f8f2] px-4 py-4 text-sm leading-6 text-[#3f6144]",children:"該当するアカウントがある場合、再設定メールを送信しました。受信箱と迷惑メールをご確認ください。"}):null,(0,s.jsxs)("form"`,
  `t?s.jsx("div",{role:"status",className:"mt-5 rounded-2xl border border-[#bfd5c1] bg-[#f2f8f2] px-4 py-4 text-sm leading-6 text-[#3f6144]",children:"再設定メールを送信しました。受信箱と迷惑メールをご確認ください。"}):null,q?s.jsx("div",{role:"alert",className:"mt-5 rounded-2xl border border-[#efb9b2] bg-[#fff4f2] px-4 py-4 text-sm leading-6 text-[#8a3f35]",children:"このメールアドレスに一致する登録情報はありません。入力内容をご確認ください。"}):null,(0,s.jsxs)("form"`,
  'customer password-reset status messages',
)
page = replaceExactly(
  page,
  `s.jsx(n.Z,{className:"mt-0.5 h-4 w-4 shrink-0 text-[#718b72]"}),"メールアドレスが登録されているかどうかは画面上に表示しません。再設定URLは30分間、一度だけ有効です。"`,
  `s.jsx(n.Z,{className:"mt-0.5 h-4 w-4 shrink-0 text-[#718b72]"}),"有効な登録情報があるメールアドレスにのみ再設定URLを送信します。再設定URLは30分間、一度だけ有効です。"`,
  'customer password-reset guidance',
)
fs.writeFileSync(pagePath, page)

console.log(`${marker} runtime patched`)
