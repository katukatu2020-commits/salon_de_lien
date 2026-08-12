"use strict";
(() => {
  var e = {};
  ((e.id = 4280),
    (e.ids = [4280]),
    (e.modules = {
      53524: (e) => {
        e.exports = require("@prisma/client");
      },
      72934: (e) => {
        e.exports = require("next/dist/client/components/action-async-storage.external.js");
      },
      54580: (e) => {
        e.exports = require("next/dist/client/components/request-async-storage.external.js");
      },
      45869: (e) => {
        e.exports = require("next/dist/client/components/static-generation-async-storage.external.js");
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
      8745: (e, t, r) => {
        (r.r(t),
          r.d(t, {
            originalPathname: () => k,
            patchFetch: () => I,
            requestAsyncStorage: () => A,
            routeModule: () => y,
            serverHooks: () => b,
            staticGenerationAsyncStorage: () => M,
          }));
        var n = {};
        (r.r(n), r.d(n, { PATCH: () => w, POST: () => C, runtime: () => m }));
        var a = r(49303),
          o = r(88716),
          i = r(60670),
          s = r(53524),
          u = r(87070),
          l = r(59219),
          d = r(58244),
          c = r(13538),
          f = r(6857),
          p = r(60353);
        let m = "nodejs",
          h = ["会計完了", "来店完了", "キャンセル", "無断キャンセル"];
        async function g(e, t, r) {
          let n = "string" == typeof t.date ? t.date : "",
            a = Number(t.startMinutes),
            o = Number(t.durationMinutes),
            i = "string" == typeof t.staffName ? t.staffName.trim() : "",
            u = "string" == typeof t.updatedAt ? new Date(t.updatedAt) : null;
          if (!/^20\d{2}-(0[1-9]|1[0-2])-([012]\d|3[01])$/.test(n))
            throw Error("予約日を確認してください。");
          let d = (0, f.iF)({ startMinutes: a, durationMinutes: o });
          if (d) throw Error(d);
          let m = i === p.jb.name ? p.jb.name : (0, p.K7)(i),
            g = (0, p.Cp)(m);
          if (!m || !g) throw Error("登録済みのスタッフを選択してください。");
          let w = (0, f.pz)(n, a);
          if (Number.isNaN(w.getTime()) || (0, f.Y$)(w) !== n)
            throw Error("予約日時を確認してください。");
          return c._.$transaction(
            async (t) => {
              let i = await t.appointment.findFirst({
                where: {
                  id: e,
                  customer: { organizationId: r, deletedAt: null },
                },
                select: { id: !0, status: !0, updatedAt: !0 },
              });
              if (!i) throw new l.M_("予約が見つかりません。", 404);
              if (h.includes(i.status))
                throw Error("完了・キャンセル済みの予約は移動できません。");
              if (u && i.updatedAt.getTime() !== u.getTime())
                throw Error(
                  "別の端末で予約が更新されました。画面を再読み込みしてください。",
                );
              let s = await t.staffBookingSetting.findUnique({
                  where: {
                    organizationId_staffKey: { organizationId: r, staffKey: g },
                  },
                  select: {
                    maxConcurrentAppointments: !0,
                    workStartMinutes: !0,
                    workEndMinutes: !0,
                  },
                }),
                d = s?.maxConcurrentAppointments ?? ("tanizaki" === g ? 2 : 1),
                c = s?.workStartMinutes ?? 600,
                y = s?.workEndMinutes ?? 1140;
              if (a < c || a + o > y)
                throw Error(
                  "スタッフの受付時間外です。スタッフ設定を確認してください。",
                );
              let A = new Date(w.getTime() + 6e4 * o),
                M = new Date(w.getTime() - 432e5),
                b = (
                  await t.appointment.findMany({
                    where: {
                      id: { not: e },
                      scheduledAt: { gte: M, lt: A },
                      status: { notIn: h },
                      customer: { organizationId: r, deletedAt: null },
                    },
                    select: {
                      scheduledAt: !0,
                      durationMinutes: !0,
                      staffName: !0,
                    },
                  })
                ).filter((e) => ((0, p.K7)(e.staffName) ?? p.jb.name) === m);
              for (let e = a; e < a + o; e += f.OV)
                if (
                  b.filter((t) => {
                    if ((0, f.Y$)(t.scheduledAt) !== n) return !1;
                    let r = (0, f.zl)(t.scheduledAt),
                      a = r + (t.durationMinutes ?? 60);
                    return r < e + f.OV && e < a;
                  }).length +
                    1 >
                  d
                )
                  throw Error(`${m}の受付可能数を超えています。`);
              if (
                1 !==
                (
                  await t.appointment.updateMany({
                    where: { id: e, ...(u ? { updatedAt: u } : {}) },
                    data: { scheduledAt: w, durationMinutes: o, staffName: m },
                  })
                ).count
              )
                throw Error(
                  "予約の更新が競合しました。画面を再読み込みしてください。",
                );
              return t.appointment.findUniqueOrThrow({
                where: { id: e },
                select: {
                  id: !0,
                  scheduledAt: !0,
                  durationMinutes: !0,
                  staffName: !0,
                  updatedAt: !0,
                },
              });
            },
            { isolationLevel: s.Prisma.TransactionIsolationLevel.Serializable },
          );
        }
        async function R(e, t, E) {
          return c._.$transaction(
            async (r) => {
              await r.$queryRaw(
                s.Prisma.sql`SELECT "id" FROM "Appointment" WHERE "id" = ${e} FOR UPDATE`,
              );
              let n = await r.appointment.findFirst({
                where: {
                  id: e,
                  customer: { organizationId: t, deletedAt: null },
                },
                select: {
                  id: !0,
                  customerId: !0,
                  serviceSales: {
                    orderBy: { createdAt: "desc" },
                    take: 2,
                    include: { productLines: !0 },
                  },
                },
              });
              if (!n) throw new l.M_("予約が見つかりません。", 404);
              if (n.serviceSales.length !== 1)
                throw Error(
                  n.serviceSales.length === 0
                    ? "この予約の会計はすでに取り消されています。"
                    : "複数の会計記録があるため、安全に取り消せません。",
                );
              let a = n.serviceSales[0],
                o = new Date(a.createdAt.getTime() - 3e4),
                i = new Date(a.createdAt.getTime() + 3e4),
                d = await r.pointTransaction.findFirst({
                  where: {
                    customerId: n.customerId,
                    sourceType: "checkout",
                    sourceId: n.id,
                    type: "redeem",
                  },
                  include: {
                    redemptionAllocations: { include: { pointLot: !0 } },
                  },
                }),
                f = await r.pointTransaction.findFirst({
                  where: {
                    customerId: n.customerId,
                    sourceType: "appointment_checkout",
                    sourceId: n.id,
                    type: "earn",
                  },
                  include: { earnedLots: !0 },
                });
              if (
                d?.redemptionAllocations.some(
                  (e) => e.pointLot.expiresAt < new Date(),
                )
              )
                throw Error(
                  "会計で利用したポイントの有効期限が過ぎているため、自動取り消しできません。",
                );
              let m = a.productLines.map((e) => e.productId),
                g = m.length
                  ? await r.productProposal.findMany({
                      where: {
                        customerId: n.customerId,
                        productId: { in: m },
                        proposalReason: "会計時に購入",
                        createdAt: { gte: o, lte: i },
                      },
                      select: {
                        id: !0,
                        _count: { select: { reviews: !0 } },
                      },
                    })
                  : [];
              for (let e of a.productLines)
                await r.product.update({
                  where: { id: e.productId },
                  data: { stockQuantity: { increment: e.quantity } },
                });
              let v = g.filter((e) => 0 === e._count.reviews),
                x = g.filter((e) => e._count.reviews > 0);
              if (v.length)
                await r.productProposal.deleteMany({
                  where: { id: { in: v.map((e) => e.id) } },
                });
              if (x.length)
                await r.productProposal.updateMany({
                  where: { id: { in: x.map((e) => e.id) } },
                  data: {
                    status: "cancelled",
                    purchased: !1,
                    reaction: "cancelled",
                  },
                });
              if (d) {
                for (let e of d.redemptionAllocations)
                  await r.pointLot.update({
                    where: { id: e.pointLotId },
                    data: { remainingAmount: { increment: e.amount } },
                  });
                await r.pointTransaction.delete({ where: { id: d.id } });
              }
              if (f) {
                let e = f.earnedLots.reduce(
                    (e, t) => e + t.originalAmount,
                    0,
                  ),
                  t = f.earnedLots.reduce(
                    (e, t) => e + t.remainingAmount,
                    0,
                  ),
                  s = e - t;
                if (s > 0) {
                  let o = await r.pointLot.findMany({
                      where: {
                        customerId: n.customerId,
                        id: { notIn: f.earnedLots.map((e) => e.id) },
                        remainingAmount: { gt: 0 },
                        expiresAt: { gt: new Date() },
                      },
                      orderBy: [{ expiresAt: "asc" }, { createdAt: "asc" }],
                    }),
                    i = o.reduce((e, t) => e + t.remainingAmount, 0);
                  if (i < s)
                    throw Error(
                      "会計特典ポイントの利用分を差し引ける有効ポイントが不足しています。ポイント履歴を確認してください。",
                    );
                  let d = await r.pointTransaction.create({
                    data: {
                      customerId: n.customerId,
                      accountId: f.accountId,
                      type: "adjustment",
                      amount: -e,
                      balanceAfter: 0,
                      sourceType: "appointment_checkout_cancel",
                      sourceId: n.id,
                      reason: "会計取り消し",
                      note: `${a.title}の会計特典ポイントを取り消し`,
                    },
                  });
                  for (let e of f.earnedLots)
                    e.remainingAmount > 0 &&
                      (await r.pointLot.update({
                        where: { id: e.id },
                        data: { remainingAmount: 0 },
                      }),
                      await r.pointRedemptionAllocation.create({
                        data: {
                          redeemTransactionId: d.id,
                          pointLotId: e.id,
                          amount: e.remainingAmount,
                        },
                      }));
                  let c = s;
                  for (let e of o) {
                    if (c <= 0) break;
                    let t = Math.min(c, e.remainingAmount);
                    (await r.pointLot.update({
                      where: { id: e.id },
                      data: { remainingAmount: { decrement: t } },
                    }),
                      await r.pointRedemptionAllocation.create({
                        data: {
                          redeemTransactionId: d.id,
                          pointLotId: e.id,
                          amount: t,
                        },
                      }),
                      (c -= t));
                  }
                  await r.pointTransaction.update({
                    where: { id: f.id },
                    data: {
                      sourceType: "cancelled_appointment_checkout",
                      sourceId: `${n.id}:${a.id}`,
                    },
                  });
                } else
                  await r.pointTransaction.delete({ where: { id: f.id } });
              }
              let p = await r.pointTransaction.findMany({
                  where: { customerId: n.customerId },
                  orderBy: [{ createdAt: "asc" }, { id: "asc" }],
                  select: { id: !0, type: !0, amount: !0, sourceType: !0 },
                }),
                h = 0,
                y = 0,
                A = 0,
                M = 0;
              for (let e of p) {
                h += e.amount;
                e.amount > 0 &&
                  "cancelled_appointment_checkout" !== e.sourceType &&
                  (y += e.amount);
                e.type === "redeem" && e.amount < 0 && (A += Math.abs(e.amount));
                e.type === "expire" && e.amount < 0 && (M += Math.abs(e.amount));
                await r.pointTransaction.update({
                  where: { id: e.id },
                  data: { balanceAfter: h },
                });
              }
              await r.customerPointAccount.upsert({
                where: { customerId: n.customerId },
                create: {
                  customerId: n.customerId,
                  availablePoints: h,
                  lifetimeEarned: y,
                  lifetimeRedeemed: A,
                  lifetimeExpired: M,
                },
                update: {
                  availablePoints: h,
                  lifetimeEarned: y,
                  lifetimeRedeemed: A,
                  lifetimeExpired: M,
                },
              });
              let b = a.note?.match(/（([^（）]+)）/u)?.[1];
              b &&
                (await r.couponIssue.updateMany({
                  where: {
                    customerId: n.customerId,
                    couponCode: b,
                    status: "used",
                  },
                  data: { status: "issued" },
                }));
              await r.referral.updateMany({
                where: {
                  referredCustomerId: n.customerId,
                  referredDiscountUsedAt: { gte: o, lte: i },
                },
                data: { referredDiscountUsedAt: null },
              });
              await r.referral.updateMany({
                where: {
                  referrerCustomerId: n.customerId,
                  referrerDiscountUsedAt: { gte: o, lte: i },
                },
                data: { referrerDiscountUsedAt: null },
              });
              await r.serviceSale.delete({ where: { id: a.id } });
              if (
                0 ===
                (await r.serviceSale.count({
                  where: { customerId: n.customerId },
                }))
              )
                await r.referral.updateMany({
                  where: {
                    referredCustomerId: n.customerId,
                    status: "rewarded",
                    referrerDiscountUsedAt: null,
                  },
                  data: {
                    status: "registered",
                    firstVisitCompletedAt: null,
                    rewardedAt: null,
                    referrerDiscountIssuedAt: null,
                  },
                });
              await r.appointment.update({
                where: { id: n.id },
                data: { status: "来店完了" },
              });
              await r.contactLog.create({
                data: {
                  customerId: n.customerId,
                  channel: "店頭",
                  purpose: "会計取り消し",
                  message: `予約会計を取り消しました: ${a.title} / ${a.amount.toLocaleString("ja-JP")}円 / 操作担当: ${E}`,
                  outcome: `${E}が会計取り消し`,
                  nextAction: "内容を修正して会計を確定し直す",
                },
              });
              return { customerId: n.customerId };
            },
            { isolationLevel: s.Prisma.TransactionIsolationLevel.Serializable },
          );
        }
        async function C(e, { params: t }) {
          if (!(0, d.dV)(e))
            return u.NextResponse.json({ error: "不正なリクエストです。" }, { status: 403 });
          try {
            let r = await (0, l.Os)(["ADMIN", "STAFF"]);
            if (!r.organizationId)
              throw new l.M_("店舗所属が設定されていません。", 403);
            let n = await e.formData();
            if (n.get("confirm") !== "cancel")
              throw Error("確認チェックを入れてください。");
            let a = r.userId
                ? await c._.appUser.findUnique({
                    where: { id: r.userId },
                    select: { displayName: !0, loginId: !0, email: !0 },
                  })
                : await c._.appUser.findFirst({
                    where: { email: { equals: r.subject, mode: "insensitive" } },
                    select: { displayName: !0, loginId: !0, email: !0 },
                  }),
              o =
                a?.displayName?.trim() ||
                a?.loginId?.trim() ||
                a?.email?.trim() ||
                r.subject ||
                "ログインユーザー";
            await R(t.appointmentId, r.organizationId, o);
            return new u.NextResponse(null, {
              status: 303,
              headers: {
                Location: `/admin/appointments/${encodeURIComponent(t.appointmentId)}?checkoutCancelled=1`,
              },
            });
          } catch (r) {
            let n = r instanceof l.M_ ? r.status : 400,
              a = r instanceof Error ? r.message : "会計を取り消せませんでした。";
            if (n === 401 || n === 403)
              return u.NextResponse.json({ error: a }, { status: n });
            return new u.NextResponse(null, {
              status: 303,
              headers: {
                Location: `/admin/appointments/${encodeURIComponent(t.appointmentId)}?cancelError=${encodeURIComponent(a)}`,
              },
            });
          }
        }
        async function w(e, { params: t }) {
          if (!(0, d.dV)(e))
            return u.NextResponse.json(
              { error: "不正なリクエストです。" },
              { status: 403 },
            );
          try {
            let r = await (0, l.Os)(["ADMIN", "STAFF"]);
            if (!r.organizationId)
              throw new l.M_("店舗所属が設定されていません。", 403);
            let n = await e.json(),
              a = await g(t.appointmentId, n, r.organizationId);
            return u.NextResponse.json({ success: !0, appointment: a });
          } catch (e) {
            return (function (e) {
              let t = e instanceof l.M_ ? e.status : 400;
              return u.NextResponse.json(
                {
                  error:
                    e instanceof Error
                      ? e.message
                      : "予約を更新できませんでした。",
                },
                { status: t },
              );
            })(e);
          }
        }
        let y = new a.AppRouteRouteModule({
            definition: {
              kind: o.x.APP_ROUTE,
              page: "/api/admin/appointments/[appointmentId]/schedule/route",
              pathname: "/api/admin/appointments/[appointmentId]/schedule",
              filename: "route",
              bundlePath:
                "app/api/admin/appointments/[appointmentId]/schedule/route",
            },
            resolvedPagePath:
              "/app/src/app/api/admin/appointments/[appointmentId]/schedule/route.ts",
            nextConfigOutput: "standalone",
            userland: n,
          }),
          {
            requestAsyncStorage: A,
            staticGenerationAsyncStorage: M,
            serverHooks: b,
          } = y,
          k = "/api/admin/appointments/[appointmentId]/schedule/route";
        function I() {
          return (0, i.patchFetch)({
            serverHooks: b,
            staticGenerationAsyncStorage: M,
          });
        }
      },
      71615: (e, t, r) => {
        var n = r(88757);
        r.o(n, "cookies") &&
          r.d(t, {
            cookies: function () {
              return n.cookies;
            },
          });
      },
      33085: (e, t, r) => {
        (Object.defineProperty(t, "__esModule", { value: !0 }),
          Object.defineProperty(t, "DraftMode", {
            enumerable: !0,
            get: function () {
              return o;
            },
          }));
        let n = r(45869),
          a = r(6278);
        class o {
          get isEnabled() {
            return this._provider.isEnabled;
          }
          enable() {
            let e = n.staticGenerationAsyncStorage.getStore();
            return (
              e && (0, a.trackDynamicDataAccessed)(e, "draftMode().enable()"),
              this._provider.enable()
            );
          }
          disable() {
            let e = n.staticGenerationAsyncStorage.getStore();
            return (
              e && (0, a.trackDynamicDataAccessed)(e, "draftMode().disable()"),
              this._provider.disable()
            );
          }
          constructor(e) {
            this._provider = e;
          }
        }
        ("function" == typeof t.default ||
          ("object" == typeof t.default && null !== t.default)) &&
          void 0 === t.default.__esModule &&
          (Object.defineProperty(t.default, "__esModule", { value: !0 }),
          Object.assign(t.default, t),
          (e.exports = t.default));
      },
      88757: (e, t, r) => {
        (Object.defineProperty(t, "__esModule", { value: !0 }),
          (function (e, t) {
            for (var r in t)
              Object.defineProperty(e, r, { enumerable: !0, get: t[r] });
          })(t, {
            cookies: function () {
              return f;
            },
            draftMode: function () {
              return p;
            },
            headers: function () {
              return c;
            },
          }));
        let n = r(68996),
          a = r(53047),
          o = r(92044),
          i = r(72934),
          s = r(33085),
          u = r(6278),
          l = r(45869),
          d = r(54580);
        function c() {
          let e = "headers",
            t = l.staticGenerationAsyncStorage.getStore();
          if (t) {
            if (t.forceStatic) return a.HeadersAdapter.seal(new Headers({}));
            (0, u.trackDynamicDataAccessed)(t, e);
          }
          return (0, d.getExpectedRequestStore)(e).headers;
        }
        function f() {
          let e = "cookies",
            t = l.staticGenerationAsyncStorage.getStore();
          if (t) {
            if (t.forceStatic)
              return n.RequestCookiesAdapter.seal(
                new o.RequestCookies(new Headers({})),
              );
            (0, u.trackDynamicDataAccessed)(t, e);
          }
          let r = (0, d.getExpectedRequestStore)(e),
            a = i.actionAsyncStorage.getStore();
          return (null == a ? void 0 : a.isAction) ||
            (null == a ? void 0 : a.isAppRoute)
            ? r.mutableCookies
            : r.cookies;
        }
        function p() {
          let e = (0, d.getExpectedRequestStore)("draftMode");
          return new s.DraftMode(e.draftMode);
        }
        ("function" == typeof t.default ||
          ("object" == typeof t.default && null !== t.default)) &&
          void 0 === t.default.__esModule &&
          (Object.defineProperty(t.default, "__esModule", { value: !0 }),
          Object.assign(t.default, t),
          (e.exports = t.default));
      },
      53047: (e, t, r) => {
        (Object.defineProperty(t, "__esModule", { value: !0 }),
          (function (e, t) {
            for (var r in t)
              Object.defineProperty(e, r, { enumerable: !0, get: t[r] });
          })(t, {
            HeadersAdapter: function () {
              return o;
            },
            ReadonlyHeadersError: function () {
              return a;
            },
          }));
        let n = r(38238);
        class a extends Error {
          constructor() {
            super(
              "Headers cannot be modified. Read more: https://nextjs.org/docs/app/api-reference/functions/headers",
            );
          }
          static callable() {
            throw new a();
          }
        }
        class o extends Headers {
          constructor(e) {
            (super(),
              (this.headers = new Proxy(e, {
                get(t, r, a) {
                  if ("symbol" == typeof r)
                    return n.ReflectAdapter.get(t, r, a);
                  let o = r.toLowerCase(),
                    i = Object.keys(e).find((e) => e.toLowerCase() === o);
                  if (void 0 !== i) return n.ReflectAdapter.get(t, i, a);
                },
                set(t, r, a, o) {
                  if ("symbol" == typeof r)
                    return n.ReflectAdapter.set(t, r, a, o);
                  let i = r.toLowerCase(),
                    s = Object.keys(e).find((e) => e.toLowerCase() === i);
                  return n.ReflectAdapter.set(t, s ?? r, a, o);
                },
                has(t, r) {
                  if ("symbol" == typeof r) return n.ReflectAdapter.has(t, r);
                  let a = r.toLowerCase(),
                    o = Object.keys(e).find((e) => e.toLowerCase() === a);
                  return void 0 !== o && n.ReflectAdapter.has(t, o);
                },
                deleteProperty(t, r) {
                  if ("symbol" == typeof r)
                    return n.ReflectAdapter.deleteProperty(t, r);
                  let a = r.toLowerCase(),
                    o = Object.keys(e).find((e) => e.toLowerCase() === a);
                  return void 0 === o || n.ReflectAdapter.deleteProperty(t, o);
                },
              })));
          }
          static seal(e) {
            return new Proxy(e, {
              get(e, t, r) {
                switch (t) {
                  case "append":
                  case "delete":
                  case "set":
                    return a.callable;
                  default:
                    return n.ReflectAdapter.get(e, t, r);
                }
              },
            });
          }
          merge(e) {
            return Array.isArray(e) ? e.join(", ") : e;
          }
          static from(e) {
            return e instanceof Headers ? e : new o(e);
          }
          append(e, t) {
            let r = this.headers[e];
            "string" == typeof r
              ? (this.headers[e] = [r, t])
              : Array.isArray(r)
                ? r.push(t)
                : (this.headers[e] = t);
          }
          delete(e) {
            delete this.headers[e];
          }
          get(e) {
            let t = this.headers[e];
            return void 0 !== t ? this.merge(t) : null;
          }
          has(e) {
            return void 0 !== this.headers[e];
          }
          set(e, t) {
            this.headers[e] = t;
          }
          forEach(e, t) {
            for (let [r, n] of this.entries()) e.call(t, n, r, this);
          }
          *entries() {
            for (let e of Object.keys(this.headers)) {
              let t = e.toLowerCase(),
                r = this.get(t);
              yield [t, r];
            }
          }
          *keys() {
            for (let e of Object.keys(this.headers)) {
              let t = e.toLowerCase();
              yield t;
            }
          }
          *values() {
            for (let e of Object.keys(this.headers)) {
              let t = this.get(e);
              yield t;
            }
          }
          [Symbol.iterator]() {
            return this.entries();
          }
        }
      },
      68996: (e, t, r) => {
        (Object.defineProperty(t, "__esModule", { value: !0 }),
          (function (e, t) {
            for (var r in t)
              Object.defineProperty(e, r, { enumerable: !0, get: t[r] });
          })(t, {
            MutableRequestCookiesAdapter: function () {
              return c;
            },
            ReadonlyRequestCookiesError: function () {
              return i;
            },
            RequestCookiesAdapter: function () {
              return s;
            },
            appendMutableCookies: function () {
              return d;
            },
            getModifiedCookieValues: function () {
              return l;
            },
          }));
        let n = r(92044),
          a = r(38238),
          o = r(45869);
        class i extends Error {
          constructor() {
            super(
              "Cookies can only be modified in a Server Action or Route Handler. Read more: https://nextjs.org/docs/app/api-reference/functions/cookies#cookiessetname-value-options",
            );
          }
          static callable() {
            throw new i();
          }
        }
        class s {
          static seal(e) {
            return new Proxy(e, {
              get(e, t, r) {
                switch (t) {
                  case "clear":
                  case "delete":
                  case "set":
                    return i.callable;
                  default:
                    return a.ReflectAdapter.get(e, t, r);
                }
              },
            });
          }
        }
        let u = Symbol.for("next.mutated.cookies");
        function l(e) {
          let t = e[u];
          return t && Array.isArray(t) && 0 !== t.length ? t : [];
        }
        function d(e, t) {
          let r = l(t);
          if (0 === r.length) return !1;
          let a = new n.ResponseCookies(e),
            o = a.getAll();
          for (let e of r) a.set(e);
          for (let e of o) a.set(e);
          return !0;
        }
        class c {
          static wrap(e, t) {
            let r = new n.ResponseCookies(new Headers());
            for (let t of e.getAll()) r.set(t);
            let i = [],
              s = new Set(),
              l = () => {
                let e = o.staticGenerationAsyncStorage.getStore();
                if (
                  (e && (e.pathWasRevalidated = !0),
                  (i = r.getAll().filter((e) => s.has(e.name))),
                  t)
                ) {
                  let e = [];
                  for (let t of i) {
                    let r = new n.ResponseCookies(new Headers());
                    (r.set(t), e.push(r.toString()));
                  }
                  t(e);
                }
              };
            return new Proxy(r, {
              get(e, t, r) {
                switch (t) {
                  case u:
                    return i;
                  case "delete":
                    return function (...t) {
                      s.add("string" == typeof t[0] ? t[0] : t[0].name);
                      try {
                        e.delete(...t);
                      } finally {
                        l();
                      }
                    };
                  case "set":
                    return function (...t) {
                      s.add("string" == typeof t[0] ? t[0] : t[0].name);
                      try {
                        return e.set(...t);
                      } finally {
                        l();
                      }
                    };
                  default:
                    return a.ReflectAdapter.get(e, t, r);
                }
              },
            });
          }
        }
      },
      6857: (e, t, r) => {
        r.d(t, {
          Gn: () => a,
          OV: () => o,
          Y$: () => s,
          ep: () => l,
          iF: () => d,
          jD: () => n,
          pz: () => u,
          zl: () => i,
        });
        let n = 600,
          a = 1140,
          o = 15;
        function i(e) {
          let t = "string" == typeof e ? new Date(e) : e,
            r = new Intl.DateTimeFormat("en-US", {
              timeZone: "Asia/Tokyo",
              hour: "2-digit",
              minute: "2-digit",
              hourCycle: "h23",
            }).formatToParts(t);
          return (
            60 * Number(r.find((e) => "hour" === e.type)?.value ?? 0) +
            Number(r.find((e) => "minute" === e.type)?.value ?? 0)
          );
        }
        function s(e) {
          let t = "string" == typeof e ? new Date(e) : e;
          return new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Tokyo",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(t);
        }
        function u(e, t) {
          return new Date(
            `${e}T${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}:00+09:00`,
          );
        }
        function l(e, t) {
          let r = e.startMinutes + e.durationMinutes,
            n = t.startMinutes + t.durationMinutes;
          return e.startMinutes < n && t.startMinutes < r;
        }
        function d(e) {
          return Number.isInteger(e.startMinutes) && e.startMinutes % o == 0
            ? !Number.isInteger(e.durationMinutes) ||
              e.durationMinutes < 15 ||
              e.durationMinutes > 540 ||
              e.durationMinutes % o != 0
              ? "施術時間は15分単位で指定してください。"
              : e.startMinutes < n || e.startMinutes + e.durationMinutes > a
                ? "予約は10:00から19:00の営業時間内に収めてください。"
                : null
            : "開始時刻は15分単位で指定してください。";
        }
      },
      85124: (e, t, r) => {
        r.d(t, {
          Gy: () => s,
          aw: () => l,
          gO: () => u,
          iI: () => n,
          x_: () => i,
        });
        let n = "lien_admin_session";
        function a(e) {
          let t = "";
          for (let r of e) t += String.fromCharCode(r);
          return btoa(t)
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/g, "");
        }
        async function o(e, t) {
          let r = await crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(t),
            { name: "HMAC", hash: "SHA-256" },
            !1,
            ["sign"],
          );
          return a(
            new Uint8Array(
              await crypto.subtle.sign("HMAC", r, new TextEncoder().encode(e)),
            ),
          );
        }
        function i(e) {
          return e.trim().toLowerCase();
        }
        function s() {
          let e = Number(process.env.ADMIN_SESSION_HOURS);
          return Number.isFinite(e)
            ? Math.min(24, Math.max(1, Math.floor(e)))
            : 12;
        }
        async function u({
          email: e,
          secret: t,
          role: r = "ADMIN",
          organizationId: n = process.env.DEFAULT_ORGANIZATION_ID ??
            "org_salon_de_lien",
          manufacturerName: s = null,
          userId: u = null,
          now: l = Date.now(),
          sessionHours: d = 12,
        }) {
          var c;
          let f = Math.floor(l / 1e3),
            p =
              ((c = {
                version: 2,
                subject: i(e),
                role: r,
                organizationId: n,
                manufacturerName: s,
                userId: u,
                issuedAt: f,
                expiresAt: f + 3600 * d,
                sessionId: crypto.randomUUID(),
              }),
              a(new TextEncoder().encode(JSON.stringify(c)))),
            m = await o(p, t);
          return `${p}.${m}`;
        }
        async function l(e, t, r = Date.now()) {
          if (!e || !t || t.length < 32) return null;
          let [n, a, i] = e.split(".");
          if (
            !n ||
            !a ||
            i ||
            !(function (e, t) {
              let r = Math.max(e.length, t.length),
                n = e.length ^ t.length;
              for (let a = 0; a < r; a += 1)
                n |= (e.charCodeAt(a) || 0) ^ (t.charCodeAt(a) || 0);
              return 0 === n;
            })(a, await o(n, t))
          )
            return null;
          let s = (function (e) {
            try {
              return JSON.parse(
                new TextDecoder().decode(
                  (function (e) {
                    let t = e.replace(/-/g, "+").replace(/_/g, "/"),
                      r = atob(t.padEnd(4 * Math.ceil(t.length / 4), "="));
                    return Uint8Array.from(r, (e) => e.charCodeAt(0));
                  })(e),
                ),
              );
            } catch {
              return null;
            }
          })(n);
          return !s ||
            2 !== s.version ||
            !["ADMIN", "STAFF", "MANUFACTURER"].includes(s.role) ||
            !s.subject ||
            !s.sessionId ||
            s.expiresAt <= Math.floor(r / 1e3)
            ? null
            : s;
        }
      },
      59219: (e, t, r) => {
        r.d(t, {
          C7: () => f,
          M_: () => s,
          Os: () => l,
          dS: () => c,
          eU: () => u,
          pI: () => p,
          zH: () => d,
        });
        var n = r(71615),
          a = r(85124),
          o = r(13538),
          i = r(99448);
        class s extends Error {
          constructor(e, t = 403) {
            (super(e), (this.status = t), (this.name = "AuthorizationError"));
          }
        }
        async function u() {
          return (0, a.aw)(
            n.cookies().get(a.iI)?.value,
            process.env.ADMIN_AUTH_SECRET,
          );
        }
        async function l(e = ["ADMIN", "STAFF"]) {
          let t = await u();
          if (!t) throw new s("ログインが必要です。", 401);
          if (!e.includes(t.role))
            throw new s("この操作を行う権限がありません。", 403);
          return t;
        }
        async function d(e, t = ["ADMIN", "STAFF"]) {
          let r = await l(t);
          if (!r.organizationId)
            throw new s("店舗所属が設定されていません。", 403);
          let n = await o._.customer.findFirst({
            where: { id: e, organizationId: r.organizationId, deletedAt: null },
            select: { id: !0, organizationId: !0 },
          });
          if (!n)
            throw new s(
              "顧客が見つからないか、この店舗から参照できません。",
              404,
            );
          return { session: r, customer: n };
        }
        async function c(e) {
          let t = await l(["ADMIN", "STAFF"]);
          if (!t.organizationId)
            throw new s("店舗所属が設定されていません。", 403);
          let r = await o._.productProposal.findFirst({
            where: {
              id: e,
              customer: { organizationId: t.organizationId, deletedAt: null },
              product: { organizationId: t.organizationId },
            },
            select: { id: !0, customerId: !0, productId: !0 },
          });
          if (!r)
            throw new s(
              "商品提案が見つからないか、この店舗から参照できません。",
              404,
            );
          return { session: t, proposal: r };
        }
        async function f(e) {
          let t = await l(["ADMIN", "STAFF", "MANUFACTURER"]);
          if ("MANUFACTURER" === t.role) {
            if (!t.manufacturerName)
              throw new s("メーカー所属が設定されていません。", 403);
            if (e && e !== t.manufacturerName)
              throw new s("他メーカーの集計は参照できません。", 403);
          }
          return t;
        }
        async function p(e, t) {
          if (t) {
            let r = await (0, i.jS)(t, { touch: !1 });
            if (!r || r.customerId !== e)
              throw new s("お客様ページの認証情報が無効です。", 403);
            return { actor: "CUSTOMER", organizationId: r.organizationId };
          }
          if ((0, i.XP)())
            return {
              actor: "CUSTOMER",
              organizationId:
                process.env.DEFAULT_ORGANIZATION_ID ?? "org_salon_de_lien",
            };
          let { session: r } = await d(e);
          return { actor: r.role, organizationId: r.organizationId };
        }
      },
      99448: (e, t, r) => {
        r.d(t, { RL: () => s, XP: () => l, jS: () => u });
        var n = r(13538),
          a = r(6005);
        let o = /^[A-Za-z0-9_-]{40,80}$/;
        function i(e) {
          return (0, a.createHash)("sha256").update(e, "utf8").digest("hex");
        }
        async function s({
          customerId: e,
          organizationId: t,
          validDays: r = 90,
        }) {
          if (
            !(await n._.customer.findFirst({
              where: {
                id: e,
                deletedAt: null,
                ...(t ? { organizationId: t } : {}),
              },
              select: { id: !0 },
            }))
          )
            throw Error("顧客が見つかりません。");
          let o = (0, a.randomBytes)(32).toString("base64url"),
            s = new Date(Date.now() + 864e5 * Math.min(365, Math.max(1, r)));
          return (
            await n._.customerPortalAccess.create({
              data: { customerId: e, tokenHash: i(o), expiresAt: s },
            }),
            { token: o, expiresAt: s, urlPath: `/u/${o}` }
          );
        }
        async function u(e, { touch: t = !0 } = {}) {
          if (!o.test(e)) return null;
          let r = new Date(),
            a = await n._.customerPortalAccess.findFirst({
              where: {
                tokenHash: i(e),
                revokedAt: null,
                expiresAt: { gt: r },
                customer: { deletedAt: null },
              },
              select: {
                id: !0,
                customerId: !0,
                expiresAt: !0,
                lastUsedAt: !0,
                customer: { select: { organizationId: !0 } },
              },
            });
          return a
            ? (t &&
                (!a.lastUsedAt || r.getTime() - a.lastUsedAt.getTime() > 3e5) &&
                (await n._.customerPortalAccess.update({
                  where: { id: a.id },
                  data: { lastUsedAt: r },
                })),
              {
                accessId: a.id,
                customerId: a.customerId,
                organizationId: a.customer.organizationId,
                expiresAt: a.expiresAt,
              })
            : null;
        }
        function l() {
          return (
            "production" !== process.env.APP_ENV &&
            "true" === process.env.ALLOW_LEGACY_CUSTOMER_ID_PORTAL
          );
        }
      },
      58244: (e, t, r) => {
        function n(e) {
          return e?.split(",")[0]?.trim() || null;
        }
        function a(e) {
          let t = n(e.headers.get("x-forwarded-host")) || e.headers.get("host");
          if (!t) return e.nextUrl.origin;
          let r =
            n(e.headers.get("cloudfront-forwarded-proto")) ||
            n(e.headers.get("x-forwarded-proto")) ||
            e.nextUrl.protocol.replace(/:$/, "");
          return `${r}://${t}`;
        }
        function o(e) {
          return a(e).startsWith("https://");
        }
        function i(e, t) {
          return new URL(t, a(e));
        }
        function s(e) {
          let t = e.headers.get("origin");
          return !t || t === a(e);
        }
        r.d(t, { dV: () => s, sY: () => o, tm: () => i });
      },
      13538: (e, t, r) => {
        r.d(t, { _: () => a });
        var n = r(53524);
        let a = globalThis.prisma ?? new n.PrismaClient({ log: ["error"] });
      },
      60353: (e, t, r) => {
        r.d(t, {
          Cp: () => s,
          K7: () => u,
          iu: () => a,
          jb: () => o,
          tp: () => i,
          tt: () => l,
          zj: () => n,
        });
        let n = [
            {
              key: "tanizaki",
              name: "谷崎 太二",
              role: "オーナースタイリスト",
              aliases: ["谷崎", "店長（谷崎）", "谷崎店長"],
            },
            {
              key: "watanabe",
              name: "渡邊 浩明",
              role: "トップスタイリスト",
              aliases: ["渡辺", "渡邊", "渡辺 浩明"],
            },
            {
              key: "asano",
              name: "浅野 清美",
              role: "トップスタイリスト",
              aliases: ["浅野"],
            },
            {
              key: "kobayashi",
              name: "小林 美奈子",
              role: "トップスタイリスト",
              aliases: ["小林"],
            },
            {
              key: "kaori",
              name: "kaori",
              role: "スタイリスト",
              aliases: ["Kaori", "カオリ"],
            },
          ],
          a = n.map((e) => e.name),
          o = { key: "free", name: "フリー", role: "指名なし" };
        function i(e) {
          return e === o.key ? o : (n.find((t) => t.key === e) ?? null);
        }
        function s(e) {
          let t = u(e) ?? o.name;
          return t === o.name
            ? o.key
            : (n.find((e) => e.name === t)?.key ?? null);
        }
        function u(e) {
          let t = e?.trim();
          if (!t) return null;
          let r = n.find((e) => e.name === t || e.aliases.includes(t));
          return r?.name ?? t;
        }
        function l(e) {
          let t = e.visits[0];
          if (t) return `前回の対応者: ${u(t.stylistName) ?? "フリー"}`;
          let r =
            "assigned" === e.staffAssignmentType
              ? u(e.assignedStaffName)
              : null;
          return `来店履歴なし / 指名: ${r ?? "フリー"}`;
        }
      },
    }));
  var t = require("../../../../../../webpack-runtime.js");
  t.C(e);
  var r = (e) => t((t.s = e)),
    n = t.X(0, [9380, 5972], () => r(8745));
  module.exports = n;
})();
