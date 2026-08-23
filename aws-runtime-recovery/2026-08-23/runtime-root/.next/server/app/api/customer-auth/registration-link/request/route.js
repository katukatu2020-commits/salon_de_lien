"use strict";
(() => {
  var e = {};
  ((e.id = 8383),
    (e.ids = [8383]),
    (e.modules = {
      53524: (e) => {
        e.exports = require("@prisma/client");
      },
      20399: (e) => {
        e.exports = require("next/dist/compiled/next-server/app-page.runtime.prod.js");
      },
      30517: (e) => {
        e.exports = require("next/dist/compiled/next-server/app-route.runtime.prod.js");
      },
      6005: (e) => {
        e.exports = require("node:crypto");
      },
      58659: (e, r, t) => {
        (t.r(r),
          t.d(r, {
            originalPathname: () => v,
            patchFetch: () => A,
            requestAsyncStorage: () => w,
            routeModule: () => h,
            serverHooks: () => S,
            staticGenerationAsyncStorage: () => _,
          }));
        var n = {};
        (t.r(n), t.d(n, { POST: () => g, runtime: () => p }));
        var o = t(49303),
          i = t(88716),
          a = t(60670),
          s = t(87070),
          u = t(71852),
          c = t(79129),
          l = t(58244),
          d = t(6183);
        async function f(e) {
          let r = [
            "Salon de Lien お客様アプリの初回登録を受け付けました。",
            "",
            `次のURLを開き、${e.expiresInMinutes}分以内にプロフィールとログイン情報を登録してください。`,
            e.registrationUrl,
            "",
            "登録画面では、携帯電話番号のSMS認証を行います。",
            "このメールに心当たりがない場合は、何もせず破棄してください。",
            "このURLは登録完了後に無効になります。",
            "",
            "Salon de Lien",
          ].join("\r\n");
          await (0, d.c)({
            to: e.to,
            subject: "Salon de Lien お客様アプリの初回登録",
            body: r,
          });
        }
        var m = t(13538);
        let p = "nodejs";
        async function g(e) {
          if (!(0, l.dV)(e))
            return s.NextResponse.json(
              { error: "Invalid origin" },
              { status: 403 },
            );
          let r = await e.formData(),
            t = (0, u.bl)(String(r.get("email") || "")),
            n = () =>
              (function (e) {
                let r = (0, l.tm)(e, "/u/register");
                r.searchParams.set("sent", "1"),r.searchParams.set("retryAfter","60");
                let t = s.NextResponse.redirect(r, 303);
                return (t.headers.set("Cache-Control", "no-store"), t);
              })(e);
          if (!(0, c.U9)(t)) return n();
          let o = process.env.DEFAULT_ORGANIZATION_ID ?? "org_salon_de_lien";
          if (
            await m._.appUser.findFirst({
              where: { email: { equals: t, mode: "insensitive" }, role: "CUSTOMER" },
              select: { id: !0 },
            })
          )
            return (function (e) { let r=(0,l.tm)(e,"/u/register"); r.searchParams.set("registered","1"); let t=s.NextResponse.redirect(r,303); return t.headers.set("Cache-Control","no-store"),t })(e);
          let latestInvite=await m._.customerRegistrationInvite.findFirst({where:{organizationId:o,email:t},orderBy:{createdAt:"desc"},select:{createdAt:!0}});if(latestInvite&&Date.now()-new Date(latestInvite.createdAt).getTime()<6e4)return n();
          let i = new Date(Date.now() - 9e5);
          if (
            (await m._.customerRegistrationInvite.count({
              where: { organizationId: o, email: t, createdAt: { gte: i } },
            })) >= 3
          )
            return n();
          let a = (0, u.oc)({
              source: String(r.get("source") || ""),
              campaign: String(r.get("campaign") || ""),
              referrer: String(r.get("referrer") || ""),
              referrerName: String(r.get("referrerName") || ""),
            }),
            customerId = a.source?.startsWith("customer:")
              ? a.source.slice("customer:".length)
              : null,
            existingCustomer = customerId
              ? await m._.customer.findFirst({
                  where: {
                    id: customerId,
                    organizationId: o,
                    deletedAt: null,
                    appUsers: { none: { role: "CUSTOMER", active: !0 } },
                  },
                  select: { id: !0 },
                })
              : null,
            d = (0, u.cg)(),
            p = await m._.$transaction(
              async (e) => (
                await e.customerRegistrationInvite.updateMany({
                  where: { organizationId: o, email: t, usedAt: null },
                  data: { usedAt: new Date() },
                }),
                e.customerRegistrationInvite.create({
                  data: {
                    organizationId: o,
                    customerId: existingCustomer?.id ?? null,
                    email: t,
                    tokenHash: (0, u.CZ)(d),
                    contextJson: a,
                    expiresAt: (0, u.lX)(),
                  },
                  select: { id: !0 },
                })
              ),
            );
          try {
            await f({
              to: t,
              registrationUrl: (0, l.tm)(e, `/u/register/${d}`).toString(),
              expiresInMinutes: (0, u.sG)(),
            });
          } catch (e) {
            (await m._.customerRegistrationInvite.deleteMany({
              where: { id: p.id },
            }),
              console.error("customer registration mail delivery failed", {
                provider:"postmark",
                error: e instanceof Error ? e.message : "unknown error",
              }));
          }
          return n();
        }
        let h = new o.AppRouteRouteModule({
            definition: {
              kind: i.x.APP_ROUTE,
              page: "/api/customer-auth/registration-link/request/route",
              pathname: "/api/customer-auth/registration-link/request",
              filename: "route",
              bundlePath:
                "app/api/customer-auth/registration-link/request/route",
            },
            resolvedPagePath:
              "/app/src/app/api/customer-auth/registration-link/request/route.ts",
            nextConfigOutput: "standalone",
            userland: n,
          }),
          {
            requestAsyncStorage: w,
            staticGenerationAsyncStorage: _,
            serverHooks: S,
          } = h,
          v = "/api/customer-auth/registration-link/request/route";
        function A() {
          return (0, a.patchFetch)({
            serverHooks: S,
            staticGenerationAsyncStorage: _,
          });
        }
      },
      71852: (e, r, t) => {
        t.d(r, {
          CZ: () => i,
          Ds: () => a,
          bl: () => c,
          cg: () => o,
          lX: () => u,
          oc: () => l,
          sG: () => s,
          vh: () => d,
        });
        var n = t(6005);
        function o() {
          return (0, n.randomBytes)(32).toString("base64url");
        }
        function i(e) {
          return (0, n.createHash)("sha256").update(e, "utf8").digest("hex");
        }
        function a(e) {
          return /^[A-Za-z0-9_-]{43}$/.test(e);
        }
        function s() {
          let e = Number(process.env.CUSTOMER_REGISTRATION_TOKEN_MINUTES);
          return Number.isFinite(e)
            ? Math.min(1440, Math.max(15, Math.floor(e)))
            : 60;
        }
        function u(e = new Date()) {
          return new Date(e.getTime() + 6e4 * s());
        }
        function c(e) {
          return e.trim().toLowerCase();
        }
        function l(e) {
          let r = (e, r) => {
            let t = e?.trim();
            return t ? t.slice(0, r) : void 0;
          };
          return {
            source: r(e.source, 80),
            campaign: r(e.campaign, 80),
            referrer: r(e.referrer, 80),
            referrerName: r(e.referrerName, 80),
          };
        }
        function d(e) {
          return !e || "object" != typeof e || Array.isArray(e)
            ? {}
            : l({
                source: "string" == typeof e.source ? e.source : void 0,
                campaign: "string" == typeof e.campaign ? e.campaign : void 0,
                referrer: "string" == typeof e.referrer ? e.referrer : void 0,
                referrerName:
                  "string" == typeof e.referrerName ? e.referrerName : void 0,
              });
        }
      },
      79129: (e, r, t) => {
        t.d(r, {
          KS: () => u,
          M6: () => s,
          U9: () => l,
          bU: () => c,
          g: () => i,
          pc: () => a,
          uE: () => o,
        });
        var n = t(6005);
        function o() {
          return (0, n.randomBytes)(32).toString("base64url");
        }
        function i(e) {
          return (0, n.createHash)("sha256").update(e, "utf8").digest("hex");
        }
        function a(e) {
          return /^[A-Za-z0-9_-]{43}$/.test(e);
        }
        function s() {
          let e = Number(process.env.PASSWORD_RESET_TOKEN_MINUTES);
          return Number.isFinite(e)
            ? Math.min(120, Math.max(10, Math.floor(e)))
            : 30;
        }
        function u(e = new Date()) {
          return new Date(e.getTime() + 6e4 * s());
        }
        function c(e) {
          return e.trim().toLowerCase();
        }
        function l(e) {
          let r = c(e);
          return (
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r) &&
            !r.endsWith(".local") &&
            !r.endsWith("@customer.salon-de-lien.local")
          );
        }
      },
      58244: (e, r, t) => {
        function n(e) {
          return e?.split(",")[0]?.trim() || null;
        }
        function o(e) {
          let r = n(e.headers.get("x-forwarded-host")) || e.headers.get("host");
          if (!r) return e.nextUrl.origin;
          let t =
            n(e.headers.get("cloudfront-forwarded-proto")) ||
            n(e.headers.get("x-forwarded-proto")) ||
            e.nextUrl.protocol.replace(/:$/, "");
          return `${t}://${r}`;
        }
        function i(e) {
          return o(e).startsWith("https://");
        }
        function a(e, r) {
          return new URL(r, o(e));
        }
        function s(e) {
          let r = e.headers.get("origin");
          return !r || r === o(e);
        }
        t.d(r, { dV: () => s, sY: () => i, tm: () => a });
      },
      6183:(e,t,r)=>{
  async function s(e){
    let token=String(process.env.POSTMARK_SERVER_TOKEN||"").trim(),
      from=String(process.env.POSTMARK_FROM_EMAIL||"").trim(),
      fromName=String(process.env.POSTMARK_FROM_NAME||"Salon de Lien").trim(),
      replyTo=String(process.env.POSTMARK_REPLY_TO||"").trim(),
      stream=String(process.env.POSTMARK_TRANSACTIONAL_STREAM||"outbound").trim();
    if(!token||!from)throw Error("Postmarkの送信設定が完了していません。");
    let payload={From:fromName+" <"+from+">",To:String(e.to||"").trim(),Subject:String(e.subject||""),TextBody:String(e.body||""),MessageStream:stream,TrackOpens:false,TrackLinks:"None"};
    if(replyTo)payload.ReplyTo=replyTo;
    let response=await fetch("https://api.postmarkapp.com/email",{method:"POST",headers:{Accept:"application/json","Content-Type":"application/json","X-Postmark-Server-Token":token},body:JSON.stringify(payload),cache:"no-store",signal:AbortSignal.timeout(20000)}),result=await response.json().catch(()=>({}));
    if(!response.ok||Number(result.ErrorCode||0)!==0)throw Error("Postmark send error (HTTP "+response.status+", code "+Number(result.ErrorCode||0)+")");
    return{messageId:result.MessageID||null,submittedAt:result.SubmittedAt||null}
  }
  async function a(e){
    let t=e.loginId?"ログインID: "+e.loginId+"\r\n\r\n":"",r=[e.audienceLabel+"のログイン情報再設定を受け付けました。","",t.trimEnd(),"次のURLを開き、"+e.expiresInMinutes+"分以内に新しいパスワードを設定してください。",e.resetUrl,"","このメールに心当たりがない場合は、何もせず破棄してください。","このURLは一度使用すると無効になります。","","Salon de Lien"].filter(Boolean).join("\r\n");
    await s({to:e.to,subject:"Salon de Lien ログイン情報の再設定",body:r})
  }
  r.d(t,{c:()=>s,f:()=>a})
},13538: (e, r, t) => {
        t.d(r, { _: () => o });
        var n = t(53524);
        let o = globalThis.prisma ?? new n.PrismaClient({ log: ["error"] });
      },
    }));
  var r = require("../../../../../webpack-runtime.js");
  r.C(e);
  var t = (e) => r((r.s = e)),
    n = r.X(0, [9380, 5972], () => t(58659));
  module.exports = n;
})();
