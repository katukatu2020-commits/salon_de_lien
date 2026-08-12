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
                r.searchParams.set("sent", "1");
                let t = s.NextResponse.redirect(r, 303);
                return (t.headers.set("Cache-Control", "no-store"), t);
              })(e);
          if (!(0, c.U9)(t)) return n();
          let o = process.env.DEFAULT_ORGANIZATION_ID ?? "org_salon_de_lien";
          if (
            await m._.appUser.findFirst({
              where: { email: { equals: t, mode: "insensitive" } },
              select: { id: !0 },
            })
          )
            return n();
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
                provider: "gmail",
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
      6183: (e, r, t) => {
        function n(e) {
          return `=?UTF-8?B?${Buffer.from(e, "utf8").toString("base64")}?=`;
        }
        async function o() {
          let e = process.env.GMAIL_OAUTH_CLIENT_ID?.trim(),
            r = process.env.GMAIL_OAUTH_CLIENT_SECRET?.trim(),
            t = process.env.GMAIL_OAUTH_REFRESH_TOKEN?.trim();
          if (!e || !r || !t)
            throw Error("Gmail OAuthの送信設定が完了していません。");
          let n = await fetch("https://oauth2.googleapis.com/token", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({
                client_id: e,
                client_secret: r,
                refresh_token: t,
                grant_type: "refresh_token",
              }),
              cache: "no-store",
            }),
            o = await n.json();
          if (!n.ok || !o.access_token)
            throw Error(
              `Gmail OAuth token error (${n.status}, ${o.error ?? "unknown"})`,
            );
          return o.access_token;
        }
        async function i(e) {
          let r = process.env.GMAIL_RESERVATION_EMAIL?.trim();
          if (!r) throw Error("GMAIL_RESERVATION_EMAILが設定されていません。");
          let t =
              process.env.PASSWORD_RESET_MAIL_FROM_NAME?.trim() ||
              "Salon de Lien",
            i = await o(),
            a = [
              `From: ${n(t)} <${r}>`,
              `To: ${e.to}`,
              `Subject: ${n(e.subject)}`,
              "MIME-Version: 1.0",
              "Content-Type: text/plain; charset=UTF-8",
              "Content-Transfer-Encoding: 8bit",
              "",
              e.body,
            ].join("\r\n"),
            s = await fetch(
              "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${i}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  raw: Buffer.from(a, "utf8").toString("base64url"),
                }),
                cache: "no-store",
              },
            );
          if (!s.ok) throw Error(`Gmail send error (${s.status})`);
        }
        async function a(e) {
          let r = e.loginId
              ? `ログインID: ${e.loginId}\r
\r
`
              : "",
            t = [
              `${e.audienceLabel}のログイン情報再設定を受け付けました。`,
              "",
              r.trimEnd(),
              `次のURLを開き、${e.expiresInMinutes}分以内に新しいパスワードを設定してください。`,
              e.resetUrl,
              "",
              "このメールに心当たりがない場合は、何もせず破棄してください。",
              "このURLは一度使用すると無効になります。",
              "",
              "Salon de Lien",
            ]
              .filter(Boolean)
              .join("\r\n");
          await i({
            to: e.to,
            subject: "Salon de Lien ログイン情報の再設定",
            body: t,
          });
        }
        t.d(r, { c: () => i, f: () => a });
      },
      13538: (e, r, t) => {
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
