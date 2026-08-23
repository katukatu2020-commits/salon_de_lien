"use strict";
(() => {
  var e = {};
  ((e.id = 9287),
    (e.ids = [9287]),
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
      65466: (e, t, r) => {
        (r.r(t),
          r.d(t, {
            originalPathname: () => g,
            patchFetch: () => A,
            requestAsyncStorage: () => d,
            routeModule: () => f,
            serverHooks: () => h,
            staticGenerationAsyncStorage: () => _,
          }));
        var n = {};
        (r.r(n), r.d(n, { POST: () => m, dynamic: () => p, runtime: () => u }));
        var s = r(49303),
          a = r(88716),
          o = r(60670),
          i = r(6005),
          c = r(87070),
          l = r(9078);
        let u = "nodejs",
          p = "force-dynamic";
        async function m(e) {
          if (!process.env.GMAIL_SYNC_CRON_SECRET?.trim())
            return c.NextResponse.json(
              { success: !1, error: "同期用シークレットが未設定です。" },
              { status: 503 },
            );
          if (
            !(function (e) {
              let t = process.env.GMAIL_SYNC_CRON_SECRET?.trim(),
                r = e.headers
                  .get("authorization")
                  ?.replace(/^Bearer\s+/i, "")
                  .trim();
              if (!t || !r) return !1;
              let n = Buffer.from(t),
                s = Buffer.from(r);
              return n.length === s.length && (0, i.timingSafeEqual)(n, s);
            })(e)
          )
            return c.NextResponse.json(
              { success: !1, error: "認証できません。" },
              { status: 401 },
            );
          try {
            return c.NextResponse.json(
              await (0, l.D)(
                process.env.GMAIL_SYNC_ORGANIZATION_ID ??
                  process.env.DEFAULT_ORGANIZATION_ID,
              ),
            );
          } catch (e) {
            return c.NextResponse.json(
              {
                success: !1,
                error:
                  e instanceof Error ? e.message : "Gmail同期に失敗しました。",
              },
              { status: 502 },
            );
          }
        }
        let f = new s.AppRouteRouteModule({
            definition: {
              kind: a.x.APP_ROUTE,
              page: "/api/integrations/gmail/reservations/sync/route",
              pathname: "/api/integrations/gmail/reservations/sync",
              filename: "route",
              bundlePath: "app/api/integrations/gmail/reservations/sync/route",
            },
            resolvedPagePath:
              "/app/src/app/api/integrations/gmail/reservations/sync/route.ts",
            nextConfigOutput: "standalone",
            userland: n,
          }),
          {
            requestAsyncStorage: d,
            staticGenerationAsyncStorage: _,
            serverHooks: h,
          } = f,
          g = "/api/integrations/gmail/reservations/sync/route";
        function A() {
          return (0, o.patchFetch)({
            serverHooks: h,
            staticGenerationAsyncStorage: _,
          });
        }
      },
      9078: (e, t, r) => {
        r.d(t, { D: () => A, a: () => p });
        var n = r(6005),
          s = r(13538),
          a = r(83447),
          o = r(44860);
        let i = ["salonboard.com", "beauty.hotpepper.jp", "recruit.co.jp"],
          c = globalThis;
        function l() {
          return ((c.__lienGmailSyncState ??= {}), c.__lienGmailSyncState);
        }
        function u(e, t) {
          let r = Number(e);
          return Number.isSafeInteger(r) && r > 0 ? r : t;
        }
        function p() {
          var e;
          let t = [
            "GMAIL_OAUTH_CLIENT_ID",
            "GMAIL_OAUTH_CLIENT_SECRET",
            "GMAIL_OAUTH_REFRESH_TOKEN",
          ].filter((e) => !process.env[e]?.trim());
          return {
            configured: 0 === t.length,
            autoSyncEnabled:
              ((e = process.env.GMAIL_AUTO_SYNC_ENABLED),
              e?.trim().toLowerCase() === "true"),
            email: process.env.GMAIL_RESERVATION_EMAIL?.trim() || null,
            subject:
              process.env.GMAIL_RESERVATION_SUBJECT?.trim() ||
              "新規のご予約が確定しました",
            sender:
              process.env.GMAIL_RESERVATION_SENDER?.trim() ||
              "kanzashi@pacificporter.jp",
            hotPepperSenders: (function (e, t) {
              let r =
                e
                  ?.split(",")
                  .map((e) => e.trim())
                  .filter(Boolean) ?? [];
              return r.length > 0 ? r : t;
            })(process.env.GMAIL_HOTPEPPER_RESERVATION_SENDERS, i),
            pollIntervalSeconds: u(process.env.GMAIL_SYNC_INTERVAL_SECONDS, 60),
            missingEnvironmentVariables: t,
          };
        }
        function m(e) {
          let t = process.env[e]?.trim();
          if (!t) throw Error(`Gmail OAuth設定が不足しています: ${e}`);
          return t;
        }
        async function f(e, t) {
          let r = new AbortController(),
            n = setTimeout(() => r.abort(), 2e4);
          try {
            return await fetch(e, { ...t, signal: r.signal });
          } finally {
            clearTimeout(n);
          }
        }
        async function d() {
          let e = l();
          if (
            e.accessToken &&
            e.accessTokenExpiresAt &&
            e.accessTokenExpiresAt > Date.now() + 6e4
          )
            return e.accessToken;
          let t = await f("https://oauth2.googleapis.com/token", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({
                client_id: m("GMAIL_OAUTH_CLIENT_ID"),
                client_secret: m("GMAIL_OAUTH_CLIENT_SECRET"),
                refresh_token: m("GMAIL_OAUTH_REFRESH_TOKEN"),
                grant_type: "refresh_token",
              }),
              cache: "no-store",
            }),
            r = await t.json();
          if (!t.ok || !r.access_token) {
            let e = r.error_description || r.error || `HTTP ${t.status}`;
            throw Error(`Gmail OAuth認証に失敗しました: ${e}`);
          }
          return (
            (e.accessToken = r.access_token),
            (e.accessTokenExpiresAt =
              Date.now() + (r.expires_in ?? 3600) * 1e3),
            r.access_token
          );
        }
        async function _(e, t, r = { retry: !0 }) {
          let n = await f(
            `https://gmail.googleapis.com/gmail/v1/users/me${e}`,
            { headers: { Authorization: `Bearer ${t}` }, cache: "no-store" },
          );
          r.status = n.status;
          if (!n.ok) {
            if (401 === n.status) {
              let e = l();
              ((e.accessToken = void 0), (e.accessTokenExpiresAt = void 0));
              if (r.retry) return _(arguments[0], await d(), { retry: !1 });
            }
            throw Error(`Gmail APIの取得に失敗しました (HTTP ${r.status})`);
          }
          return await n.json();
        }
        function h(e, t) {
          let r = e.payload?.headers?.find(
            (e) => e.name?.toLowerCase() === t.toLowerCase(),
          );
          return r?.value
            ? r.value.replace(
                /=\?([^?]+)\?([bq])\?([^?]+)\?=/gi,
                (e, t, r, n) => {
                  if (!/^utf-?8$/i.test(String(t))) return String(e);
                  if ("b" === String(r).toLowerCase())
                    return Buffer.from(String(n), "base64").toString("utf8");
                  let s = String(n)
                    .replace(/_/g, " ")
                    .replace(/=([0-9a-f]{2})/gi, (e, t) =>
                      String.fromCharCode(Number.parseInt(String(t), 16)),
                    );
                  return Buffer.from(s, "binary").toString("utf8");
                },
              )
            : "";
        }
        function B(e) {
          return new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Tokyo",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(e);
        }
        function C(e, t) {
          let r = new Date(e);
          return (r.setDate(r.getDate() + t), r);
        }
        function F(e = new Date()) {
          let t = `45${String(e.getFullYear()).slice(-2)}${String(e.getMonth() + 1).padStart(2, "0")}${String(e.getDate()).padStart(2, "0")}${Array.from({ length: 4 }, () => Math.floor(10 * Math.random())).join("")}`,
            r = t
              .split("")
              .reduce((e, t, r) => e + Number(t) * (r % 2 == 0 ? 1 : 3), 0);
          return `${t}${(10 - (r % 10)) % 10}`;
        }
        async function W(e) {
          await s._.$executeRawUnsafe(
            `CREATE TABLE IF NOT EXISTS "AutomatedCouponRule" ("id" TEXT PRIMARY KEY,"organizationId" TEXT NOT NULL,"createdByStaffId" TEXT,"name" TEXT NOT NULL,"triggerType" TEXT NOT NULL,"offsetDays" INTEGER NOT NULL DEFAULT 0,"stylistName" TEXT,"phoneLastDigit" TEXT,"couponTitle" TEXT NOT NULL,"discountRate" INTEGER NOT NULL,"targetMenu" TEXT NOT NULL,"validDays" INTEGER NOT NULL,"active" BOOLEAN NOT NULL DEFAULT TRUE,"createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),"updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
          );
          await s._.$executeRawUnsafe(
            `CREATE TABLE IF NOT EXISTS "AutomatedCouponGrant" ("id" TEXT PRIMARY KEY,"ruleId" TEXT NOT NULL REFERENCES "AutomatedCouponRule"("id") ON DELETE CASCADE,"customerId" TEXT NOT NULL REFERENCES "Customer"("id") ON DELETE CASCADE,"triggerKey" TEXT NOT NULL,"couponIssueId" TEXT REFERENCES "CouponIssue"("id") ON DELETE SET NULL,"broadcastId" TEXT REFERENCES "CustomerBroadcast"("id") ON DELETE SET NULL,"grantedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE("ruleId","customerId","triggerKey"))`,
          );
          let t = await s._.$queryRawUnsafe(
            `SELECT * FROM "AutomatedCouponRule" WHERE "organizationId"=$1 AND "active"=TRUE`,
            e,
          );
          if (!t.length) return { rules: 0, issued: 0 };
          let r = await s._.customer.findMany({
              where: { organizationId: e, deletedAt: null },
              select: {
                id: !0,
                name: !0,
                phone: !0,
                birthDate: !0,
                visits: {
                  orderBy: { visitedAt: "desc" },
                  take: 1,
                  select: { visitedAt: !0, stylistName: !0 },
                },
                serviceSales: {
                  orderBy: { paidAt: "desc" },
                  take: 1,
                  select: {
                    paidAt: !0,
                    appointment: { select: { staffName: !0 } },
                  },
                },
              },
            }),
            i = B(new Date()),
            a = 0;
          for (let n of t) {
            let t = [];
            for (let e of r) {
              let r = e.visits[0],
                a = e.serviceSales[0],
                o =
                  !r || (a && a.paidAt > r.visitedAt) ? a?.paidAt : r.visitedAt,
                s = a?.appointment?.staffName ?? null,
                l = null;
              if ("birthday" === n.triggerType && e.birthDate) {
                let t = new Date(),
                  r = new Date(
                    t.getFullYear(),
                    e.birthDate.getMonth(),
                    e.birthDate.getDate(),
                  );
                B(C(r, -n.offsetDays)) === i &&
                  (l = `birthday:${t.getFullYear()}`);
              } else if (
                ["welcome_back", "frequency", "review"].includes(
                  n.triggerType,
                ) &&
                o &&
                B(C(o, n.offsetDays)) === i
              )
                l = `${n.triggerType}:${B(o)}`;
              else if (
                "stylist" === n.triggerType &&
                a?.paidAt &&
                s?.trim() &&
                n.stylistName?.trim() &&
                String(s).replace(/[\s　]+/g, " ").trim() === String(n.stylistName).replace(/[\s　]+/g, " ").trim() &&
                B(C(a.paidAt, n.offsetDays)) === i
              )
                l = `stylist:${B(a.paidAt)}:${s}`;
              else if (
                "phone_last_digit" === n.triggerType &&
                e.phone?.replace(/\D/g, "") &&
                e.phone.replace(/\D/g, "").slice(-1) === n.phoneLastDigit
              )
                l = `phone:${e.phone.replace(/\D/g, "").slice(-1)}`;
              l &&
                t.push({
                  customer: e,
                  triggerKey: l,
                  stylistName: s ?? null,
                  phoneLastDigit: e.phone?.replace(/\D/g, "").slice(-1) ?? null,
                });
            }
            if (!t.length) continue;
            for (let e of t)
              try {
                await s._.$transaction(
                  async (t) => {
                    if (
                      (
                        await t.$queryRawUnsafe(
                          `SELECT "id" FROM "AutomatedCouponGrant" WHERE "ruleId"=$1 AND "customerId"=$2 AND "triggerKey"=$3 LIMIT 1`,
                          n.id,
                          e.customer.id,
                        )
                      ).length
                    )
                      return;
                    let r = new Date(),
                      i = C(r, n.validDays),
                      o = F(r),
                      s = await t.customerBroadcast.create({
                        data: {
                          organizationId: n.organizationId,
                          createdByStaffId: n.createdByStaffId,
                          title: n.couponTitle,
                          body: `${n.name}の対象クーポンをお届けします。`,
                          audienceMatchedCount: 1,
                          couponEnabled: !0,
                          couponTitle: n.couponTitle,
                          couponTargetMenu: n.targetMenu,
                          couponDiscountRate: n.discountRate,
                          couponValidDays: n.validDays,
                          sentAt: r,
                        },
                      }),
                      l = await t.couponIssue.create({
                        data: {
                          customerId: e.customer.id,
                          staffUserId: n.createdByStaffId,
                          couponCode: o,
                          customerName: e.customer.name,
                          discountRate: n.discountRate,
                          targetMenusJson: [n.targetMenu],
                          issuedAt: r,
                          expiresAt: i,
                          salonMessage: n.name,
                          templateVersion: "coupon-v2-auto",
                          status: "issued",
                        },
                      });
                    await t.customerBroadcastRecipient.create({
                      data: {
                        broadcastId: s.id,
                        customerId: e.customer.id,
                        couponIssueId: l.id,
                        deliveredAt: r,
                      },
                    });
                    await t.$executeRawUnsafe(
                      `INSERT INTO "AutomatedCouponGrant" ("id","ruleId","customerId","triggerKey","couponIssueId","broadcastId") VALUES ($1,$2,$3,$4,$5,$6)`,
                      `auto-grant-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                      n.id,
                      e.customer.id,
                      e.triggerKey,
                      l.id,
                      s.id,
                    );
                    a += 1;
                  },
                  { timeout: 3e4 },
                );
              } catch (e) {
                console.error("[automated-coupon] grant failed", {
                  ruleId: n.id,
                  error: e instanceof Error ? e.message : "unknown",
                });
              }
          }
          return { rules: t.length, issued: a };
        }
        async function g(
          e = process.env.DEFAULT_ORGANIZATION_ID ?? "org_salon_de_lien",
        ) {
          let t = p();
          if (!t.configured)
            throw Error(
              `Gmail OAuth設定が不足しています: ${t.missingEnvironmentVariables.join(", ")}`,
            );
          let r = await d(),
            i = await _("/profile", r);
          if (
            t.email &&
            i.emailAddress &&
            i.emailAddress.toLowerCase() !== t.email.toLowerCase()
          )
            throw Error(
              "OAuthで接続したGmailアカウントが予約受付用アカウントと一致しません。",
            );
          let c = u(process.env.GMAIL_SYNC_LOOKBACK_DAYS, 30),
            l = `in:anywhere newer_than:${c}d`,
            m = `(from:${t.sender.replace(/[\s"]/g, "")} (subject:予約 OR subject:キャンセル OR subject:取消 OR subject:取り消し))`,
            f = t.hotPepperSenders
              .map((e) => `from:${e.replace(/[\s"]/g, "")}`)
              .join(" OR "),
            g = `((${f}) (subject:予約 OR subject:ご予約 OR subject:キャンセル OR subject:取消))`,
            A = `${l} (${m} OR ${g})`,
            E = (
              (
                await _(
                  `/messages?maxResults=100&q=${encodeURIComponent(A)}`,
                  r,
                )
              ).messages ?? []
            )
              .map((e) => e.id)
              .filter((e) => !!e),
            S = new Map(
              E.map((t) => [
                t,
                (function (e, t) {
                  let r = (0, n.createHash)("sha256")
                    .update(
                      `${t}:${(0, n.createHash)("sha256").update(e, "utf8").digest("hex")}:staff-parser-v3`,
                      "utf8",
                    )
                    .digest("hex");
                  return `gmail-contact-${r.slice(0, 24)}`;
                })(t, e),
              ]),
            ),
            T = new Set(
              (E.length
                ? await s._.contactLog.findMany({
                    where: {
                      id: { in: [...S.values()] },
                      customer: { organizationId: e },
                    },
                    select: { id: !0 },
                  })
                : []
              ).map((e) => e.id),
            ),
            I = E.filter((e) => !T.has(S.get(e) ?? "")),
            R = [],
            O = 0,
            y = 0,
            w = 0;
          for (let n of I)
            try {
              let s = await _(
                  `/messages/${encodeURIComponent(n)}?format=full`,
                  r,
                ),
                i = h(s, "Subject"),
                c = h(s, "From"),
                l = (function (e) {
                  let t = { plain: [], html: [] };
                  return (
                    (function e(t, r) {
                      if (t) {
                        if (t.body?.data) {
                          let e = (function (e) {
                            let t = e.replace(/-/g, "+").replace(/_/g, "/");
                            return Buffer.from(t, "base64").toString("utf8");
                          })(t.body.data);
                          (t.mimeType?.toLowerCase().startsWith("text/plain") &&
                            r.plain.push(e),
                            t.mimeType?.toLowerCase().startsWith("text/html") &&
                              r.html.push(e));
                        }
                        for (let n of t.parts ?? []) e(n, r);
                      }
                    })(e.payload, t),
                    (t.plain.length > 0 ? t.plain : t.html).join("\n").trim()
                  );
                })(s);
              if (!l) {
                R.push(`メール ${n.slice(0, 8)}: 本文を取得できませんでした。`);
                continue;
              }
              let u = (0, o.k)({ subject: i, content: l, source: c }),
                p = `${i}
${l}`,
                m =
                  "kanzashi" === u &&
                  c.toLowerCase().includes(t.sender.toLowerCase()) &&
                  /予約|ご予約|キャンセル|取消|取り消し/.test(p) &&
                  /■\s*来店日時/.test(p) &&
                  /■\s*(?:担当スタッフ|予約時メニュー|お客様名)/.test(p),
                f =
                  "hotpepper" === u &&
                  /予約|ご予約|キャンセル|取消|取り消し/.test(p) &&
                  /■\s*予約番号/.test(p) &&
                  /■\s*来店日時/.test(p) &&
                  /■\s*(?:スタイリスト|メニュー|氏名)/.test(p);
              if (!m && !f) continue;
              O += 1;
              let d = await (0, a.v)(
                { subject: i, content: l, messageId: n, sender: c },
                e,
              );
              if (!d.ok) {
                R.push(`メール ${n.slice(0, 8)}: ${d.errors.join(" ")}`);
                continue;
              }
              d.duplicate ? (w += 1) : (y += 1);
            } catch (e) {
              R.push(
                `メール ${n.slice(0, 8)}: ${e instanceof Error ? e.message.slice(0, 300) : "不明なエラーが発生しました。"}`,
              );
            }
          let automatedCoupons = await W(e).catch(
            (e) => (
              console.error("[automated-coupon] processing failed", e),
              { rules: 0, issued: 0 }
            ),
          );
          return {
            success: !0,
            scanned: E.length,
            matched: O,
            imported: y,
            updated: w,
            alreadyImported: E.length - I.length,
            failed: R.length,
            errors: R.slice(0, 10),
            automatedCoupons,
            syncedAt: new Date().toISOString(),
          };
        }
        async function A(
          e = process.env.DEFAULT_ORGANIZATION_ID ?? "org_salon_de_lien",
        ) {
          let t = l();
          return (
            t.syncPromise ||
              (t.syncPromise = g(e).finally(() => {
                t.syncPromise = void 0;
              })),
            t.syncPromise
          );
        }
      },
    }));
  var t = require("../../../../../../webpack-runtime.js");
  t.C(e);
  var r = (e) => t((t.s = e)),
    n = t.X(0, [9380, 5972, 3447], () => r(65466));
  module.exports = n;
})();
