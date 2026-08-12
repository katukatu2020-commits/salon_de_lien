"use strict";
((exports.id = 1759),
  (exports.ids = [1759]),
  (exports.modules = {
    57371: (e, t, r) => {
      r.d(t, { default: () => a.a });
      var n = r(670),
        a = r.n(n);
    },
    670: (e, t, r) => {
      let { createProxy: n } = r(68570);
      e.exports = n("/app/node_modules/next/dist/client/link.js");
    },
    90878: (e, t, r) => {
      r.d(t, {
        IP: () => i,
        OE: () => d,
        i9: () => u,
        mr: () => l,
        ub: () => m,
      });
      var n = r(19510);
      function a(...e) {
        return e.filter(Boolean).join(" ");
      }
      let o = {
          default:
            "border-[color:var(--lien-border)] bg-[color:var(--lien-surface)]",
          soft: "border-[color:var(--lien-border)] bg-[color:var(--lien-surface-soft)]",
          highlight: "border-[color:var(--lien-primary-soft)] bg-[#fff7f3]",
          success: "border-[#cbdcc8] bg-[color:var(--lien-sage-soft)]",
          warning: "border-[#ead09a] bg-[color:var(--lien-warning-soft)]",
          danger: "border-[#edc2bd] bg-[color:var(--lien-danger-soft)]",
          premium:
            "border-[#ddc68b] bg-gradient-to-br from-white via-[#fff9ee] to-[#f7e8c9]",
        },
        s = {
          default:
            "border-[color:var(--lien-border)] bg-white text-[color:var(--lien-muted)]",
          soft: "border-[color:var(--lien-border)] bg-[color:var(--lien-surface-soft)] text-[color:var(--lien-ink)]",
          highlight:
            "border-[color:var(--lien-primary-soft)] bg-[#fff2ed] text-[color:var(--lien-primary-dark)]",
          success:
            "border-[#cbdcc8] bg-[color:var(--lien-sage-soft)] text-[#405d41]",
          warning:
            "border-[#ead09a] bg-[color:var(--lien-warning-soft)] text-[#7c4f12]",
          danger:
            "border-[#edc2bd] bg-[color:var(--lien-danger-soft)] text-[#884039]",
          premium: "border-[#ddc68b] bg-[#fff8e8] text-[#74521a]",
        };
      function l({
        eyebrow: e,
        title: t,
        description: r,
        primaryAction: o,
        secondaryAction: s,
        breadcrumb: l,
        visual: i,
        children: u,
      }) {
        return (0, n.jsxs)("header", {
          className:
            "lien-glass overflow-hidden rounded-[28px] border p-5 sm:p-6",
          children: [
            (0, n.jsxs)("div", {
              className: a(
                "grid gap-5",
                !!i && "lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]",
              ),
              children: [
                (0, n.jsxs)("div", {
                  className:
                    "flex min-w-0 flex-col gap-5 xl:flex-row xl:items-start xl:justify-between",
                  children: [
                    (0, n.jsxs)("div", {
                      className: "min-w-0",
                      children: [
                        l
                          ? n.jsx("div", {
                              className:
                                "mb-3 text-xs font-semibold text-[color:var(--lien-muted)]",
                              children: l,
                            })
                          : null,
                        e
                          ? n.jsx("div", {
                              className:
                                "mb-2 inline-flex rounded-full border border-[color:var(--lien-primary-soft)] bg-white/70 px-3 py-1 text-xs font-semibold text-[color:var(--lien-primary-dark)]",
                              children: e,
                            })
                          : null,
                        n.jsx("h1", {
                          className:
                            "text-balance text-2xl font-semibold tracking-normal text-[color:var(--lien-ink)] sm:text-3xl",
                          children: t,
                        }),
                        r
                          ? n.jsx("p", {
                              className:
                                "mt-2 max-w-3xl text-sm leading-6 text-[color:var(--lien-muted)]",
                              children: r,
                            })
                          : null,
                      ],
                    }),
                    o || s
                      ? (0, n.jsxs)("div", {
                          className:
                            "flex w-full shrink-0 flex-wrap gap-2 sm:w-auto [&>*]:min-h-11 [&>*]:flex-1 sm:[&>*]:flex-none",
                          children: [s, o],
                        })
                      : null,
                  ],
                }),
                i
                  ? n.jsx("div", {
                      className:
                        "min-h-36 overflow-hidden rounded-[20px] border border-white/70 shadow-sm lg:min-h-40",
                      children: i,
                    })
                  : null,
              ],
            }),
            u ? n.jsx("div", { className: "mt-5", children: u }) : null,
          ],
        });
      }
      function i({
        children: e,
        className: t = "",
        tone: r = "default",
        hoverable: s = !1,
        as: l = "section",
        style: c,
      }) {
        return n.jsx(l, {
          className: a(
            "min-w-0 rounded-[22px] border p-5 shadow-lien-sm transition sm:p-6",
            o[r],
            s && "lien-hover-lift",
            t,
          ),
          style: c,
          children: e,
        });
      }
      function u({
        label: e,
        value: t,
        unit: r,
        delta: a,
        helper: o,
        icon: s,
        tone: l = "default",
      }) {
        return (0, n.jsxs)(i, {
          tone: l,
          className: "p-4 sm:p-5",
          children: [
            (0, n.jsxs)("div", {
              className: "flex items-start justify-between gap-3",
              children: [
                (0, n.jsxs)("div", {
                  className: "min-w-0",
                  children: [
                    n.jsx("p", {
                      className:
                        "text-xs font-semibold text-[color:var(--lien-muted)]",
                      children: e,
                    }),
                    (0, n.jsxs)("div", {
                      className:
                        "mt-2 flex items-baseline gap-1 text-[color:var(--lien-ink)]",
                      children: [
                        n.jsx("span", {
                          className:
                            "tabular-nums text-2xl font-semibold sm:text-3xl",
                          children: t,
                        }),
                        r
                          ? n.jsx("span", {
                              className:
                                "text-xs font-semibold text-[color:var(--lien-muted)]",
                              children: r,
                            })
                          : null,
                      ],
                    }),
                  ],
                }),
                s
                  ? n.jsx("span", {
                      className:
                        "inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-[color:var(--lien-primary)] shadow-sm",
                      children: n.jsx(s, { className: "h-5 w-5" }),
                    })
                  : null,
              ],
            }),
            a
              ? n.jsx("div", {
                  className:
                    "mt-3 text-xs font-semibold text-[color:var(--lien-primary-dark)]",
                  children: a,
                })
              : null,
            o
              ? n.jsx("p", {
                  className:
                    "mt-2 text-xs leading-5 text-[color:var(--lien-muted)]",
                  children: o,
                })
              : null,
          ],
        });
      }
      function d({
        children: e,
        tone: t = "default",
        icon: r,
        className: o = "",
      }) {
        return (0, n.jsxs)("span", {
          className: a("lien-badge", s[t], o),
          children: [r ? n.jsx(r, { className: "h-3.5 w-3.5" }) : null, e],
        });
      }
      function m({ icon: e, title: t, description: r, action: a }) {
        return (0, n.jsxs)("div", {
          className:
            "relative overflow-hidden rounded-[22px] border border-dashed border-[color:var(--lien-border-strong)] bg-[color:var(--lien-surface-soft)] p-6 text-center",
          children: [
            n.jsx("div", {
              className:
                "pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[color:var(--lien-primary-soft)]/45",
            }),
            n.jsx("div", {
              className:
                "pointer-events-none absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-[color:var(--lien-accent-soft)]/70",
            }),
            (0, n.jsxs)("div", {
              className: "relative mx-auto flex max-w-md flex-col items-center",
              children: [
                e
                  ? n.jsx("span", {
                      className:
                        "inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-[color:var(--lien-primary)] shadow-sm",
                      children: n.jsx(e, { className: "h-6 w-6" }),
                    })
                  : null,
                n.jsx("p", {
                  className:
                    "mt-3 text-sm font-semibold text-[color:var(--lien-ink)]",
                  children: t,
                }),
                r
                  ? n.jsx("p", {
                      className:
                        "mt-2 text-sm leading-6 text-[color:var(--lien-muted)]",
                      children: r,
                    })
                  : null,
                a ? n.jsx("div", { className: "mt-4", children: a }) : null,
              ],
            }),
          ],
        });
      }
    },
    68024: (e, t, r) => {
      r.d(t, { m2: () => v, n7: () => f, ng: () => l });
      var n = r(13538),
        a = r(60353);
      let o = [
          "デモ顧客",
          "メーカー商品フィードバック連携用の顧客データ",
          "操作説明資料用",
          "店舗状況シミュレーション用",
          "Codex verification",
        ],
        s = ["demo", "デモ", "操作説明資料", "Codex"],
        l = "owner-dashboard-simulation-v1";
      function i(e) {
        let t = new Date(e.getTime() + 324e5);
        return {
          year: t.getUTCFullYear(),
          monthIndex: t.getUTCMonth(),
          day: t.getUTCDate(),
        };
      }
      function u(e, t) {
        let { year: r, monthIndex: n } = i(e);
        return new Date(Date.UTC(r, n + t, 1) - 324e5);
      }
      function d(e) {
        let { year: t, monthIndex: r } = i(e);
        return `${t}-${String(r + 1).padStart(2, "0")}`;
      }
      function m(e, t) {
        return t > 0 ? Math.round(e / t) : 0;
      }
      function c(e) {
        return {
          organizationId: e,
          deletedAt: null,
          NOT: { name: { contains: "Codex" } },
          AND: [
            ...o.map((e) => ({
              OR: [{ memo: null }, { NOT: { memo: { contains: e } } }],
            })),
          ],
        };
      }
      function f(e) {
        return "6" === e ? 6 : "24" === e ? 24 : 12;
      }
      async function v(
        e,
        t = "actual",
        r = process.env.DEFAULT_ORGANIZATION_ID ?? "org_salon_de_lien",
        o = new Date(),
      ) {
        var f, v, p, h;
        let x = (function (e) {
            let { year: t, monthIndex: r } = i(e);
            return new Date(Date.UTC(t, r, 1) - 324e5);
          })(o),
          g = u(x, 1),
          b = u(x, -(e - 1)),
          w = new Date(o.getTime() + 2592e6),
          C =
            "simulation" === t
              ? {
                  organizationId: r,
                  deletedAt: null,
                  memo: { contains: "店舗状況シミュレーション用" },
                }
              : c(r),
          y =
            "simulation" === t
              ? { source: l, customer: C }
              : {
                  customer: c(r),
                  AND: s.flatMap((e) => [
                    {
                      OR: [
                        { source: null },
                        { NOT: { source: { contains: e } } },
                      ],
                    },
                    {
                      OR: [{ note: null }, { NOT: { note: { contains: e } } }],
                    },
                  ]),
                },
          N =
            "simulation" === t
              ? {
                  nextRecommendation: {
                    contains: "OWNER_DASHBOARD_SIMULATION_V1",
                  },
                  customer: C,
                }
              : { customer: C },
          A = "simulation" === t ? { source: l, customer: C } : { customer: C },
          [j, k, M, _, I, S, T, D, P, R, O] = await Promise.all([
            n._.serviceSale.findMany({
              where: { ...y, paidAt: { gte: b, lt: g } },
              orderBy: { paidAt: "desc" },
              select: {
                id: !0,
                customerId: !0,
                title: !0,
                amount: !0,
                paidAt: !0,
                paymentMethod: !0,
                appointment: { select: { staffName: !0 } },
                customer: { select: { name: !0 } },
              },
            }),
            n._.visit.findMany({
              where: { ...N, visitedAt: { gte: b, lt: g } },
              select: { customerId: !0, visitedAt: !0, stylistName: !0 },
            }),
            n._.customer.findMany({
              where: { ...C, createdAt: { gte: b, lt: g } },
              select: { createdAt: !0 },
            }),
            n._.serviceSale.groupBy({
              by: ["customerId"],
              where: { ...y, paidAt: { lt: g } },
              _min: { paidAt: !0 },
            }),
            n._.customer.findMany({
              where: C,
              select: {
                id: !0,
                name: !0,
                gender: !0,
                birthYear: !0,
                phone: !0,
                _count: { select: { visits: !0 } },
              },
            }),
            n._.serviceSale.aggregate({
              where: y,
              _count: { _all: !0 },
              _sum: { amount: !0 },
            }),
            n._.appointment.count({
              where: { ...A, scheduledAt: { gte: o, lt: w } },
            }),
            n._.visit.count({ where: N }),
            n._.customer.count({
              where: { organizationId: r, deletedAt: null },
            }),
            n._.serviceSale.count({
              where: { customer: { organizationId: r, deletedAt: null } },
            }),
            n._.visit.count({
              where: { customer: { organizationId: r, deletedAt: null } },
            }),
          ]),
          B = new Map(
            _.filter((e) => e._min.paidAt).map((e) => [
              e.customerId,
              d(e._min.paidAt),
            ]),
          ),
          L = Array.from({ length: e }, (e, t) => {
            let r = u(b, t),
              n = d(r),
              a = j.filter((e) => d(e.paidAt) === n),
              o = k.filter((e) => d(e.visitedAt) === n),
              s = Array.from(new Set(a.map((e) => e.customerId))),
              l = s.filter((e) => B.get(e) === n).length;
            return {
              key: n,
              label: (function (e) {
                let { year: t, monthIndex: r } = i(e);
                return `${t}年${r + 1}月`;
              })(r),
              shortLabel: (function (e) {
                let { monthIndex: t } = i(e);
                return `${t + 1}月`;
              })(r),
              revenue: a.reduce((e, t) => e + t.amount, 0),
              paidCustomerCount: s.length,
              visitCount: o.length,
              visitedCustomerCount: new Set(o.map((e) => e.customerId)).size,
              registeredCustomerCount: M.filter((e) => d(e.createdAt) === n)
                .length,
              newPaidCustomerCount: l,
              repeatPaidCustomerCount: Math.max(0, s.length - l),
            };
          }),
          $ = L.at(-1),
          U = L.at(-2) ?? {
            revenue: 0,
            paidCustomerCount: 0,
            newPaidCustomerCount: 0,
            repeatPaidCustomerCount: 0,
            visitCount: 0,
          },
          z = new Map(),
          V = new Map(),
          Z = new Map(),
          E = new Map(),
          K = new Map(),
          W = new Map();
        for (let e of k)
          W.set(e.customerId, [...(W.get(e.customerId) ?? []), e]);
        let Y = 0,
          F = 0;
        for (let e of W.values()) {
          let t = [...e].sort(
            (e, t) => e.visitedAt.getTime() - t.visitedAt.getTime(),
          );
          for (let e = 1; e < t.length; e += 1) {
            let r =
              (t[e].visitedAt.getTime() - t[e - 1].visitedAt.getTime()) / 864e5;
            r < 1 || ((Y += r), (F += 1));
          }
        }
        let G = F > 0 ? Math.round(Y / F) : 0;
        for (let e of j) {
          let t = ((f = e.title), f?.trim() || "内容未設定"),
            r = z.get(t) ?? { revenue: 0, count: 0 };
          ((r.revenue += e.amount), (r.count += 1), z.set(t, r));
          let n = ((v = e.paymentMethod), v?.trim() || "未設定"),
            o = V.get(n) ?? { revenue: 0, count: 0 };
          ((o.revenue += e.amount), (o.count += 1), V.set(n, o));
          let s = (W.get(e.customerId) ?? [])
              .map((t) => ({
                visit: t,
                distance: Math.abs(t.visitedAt.getTime() - e.paidAt.getTime()),
              }))
              .filter((e) => e.distance <= 14 * 24 * 60 * 60 * 1e3)
              .sort((e, t) => e.distance - t.distance)[0]?.visit,
            l =
              (0, a.K7)(e.appointment?.staffName ?? s?.stylistName) ??
              "フリー・担当不明",
            i = E.get(l) ?? {
              revenue: 0,
              saleCount: 0,
              customerIds: new Set(),
            };
          ((i.revenue += e.amount),
            (i.saleCount += 1),
            i.customerIds.add(e.customerId),
            E.set(l, i));
          let u = K.get(e.customerId) ?? {
            customerName: e.customer.name,
            revenue: 0,
            saleCount: 0,
          };
          ((u.revenue += e.amount), (u.saleCount += 1), K.set(e.customerId, u));
        }
        for (let e of k) {
          let t = (0, a.K7)(e.stylistName) ?? "フリー・担当不明";
          Z.set(t, (Z.get(t) ?? 0) + 1);
        }
        let H = [
            "19歳以下",
            "20代",
            "30代",
            "40代",
            "50代",
            "60代",
            "70歳以上",
            "未設定",
          ],
          q = new Map(H.map((e) => [e, 0])),
          J = ["女性", "男性", "その他", "未回答"],
          Q = new Map(J.map((e) => [e, 0])),
          X = i(o).year;
        for (let e of I) {
          let t = e.birthYear ? X - e.birthYear : null,
            r =
              null === t || t < 0
                ? "未設定"
                : t <= 19
                  ? "19歳以下"
                  : t >= 70
                    ? "70歳以上"
                    : `${10 * Math.floor(t / 10)}代`;
          q.set(r, (q.get(r) ?? 0) + 1);
          let n = e.gender?.trim(),
            a =
              "女性" === n || n?.toLowerCase() === "female"
                ? "女性"
                : "男性" === n || n?.toLowerCase() === "male"
                  ? "男性"
                  : n && "未回答" !== n
                    ? "その他"
                    : "未回答";
          Q.set(a, (Q.get(a) ?? 0) + 1);
        }
        return {
          generatedAt: o,
          period: e,
          scope: t,
          periodStart: b,
          periodEnd: g,
          currentMonthLabel: $.label,
          summary: {
            currentRevenue: $.revenue,
            previousRevenue: U.revenue,
            currentPaidCustomerCount: $.paidCustomerCount,
            previousPaidCustomerCount: U.paidCustomerCount,
            currentAverageSpend: m($.revenue, $.paidCustomerCount),
            previousAverageSpend: m(U.revenue, U.paidCustomerCount),
            currentNewPaidCustomerCount: $.newPaidCustomerCount,
            currentRepeatPaidCustomerCount: $.repeatPaidCustomerCount,
            currentRepeatRate:
              ((p = $.repeatPaidCustomerCount),
              (h = $.paidCustomerCount) > 0 ? Math.round((p / h) * 100) : 0),
            currentVisitCount: $.visitCount,
            averageVisitCycleDays: G,
            visitCycleIntervalCount: F,
            totalRegisteredCustomers: I.length,
            upcomingAppointmentCount: T,
            lifetimeRevenue: S._sum.amount ?? 0,
            lifetimeSaleCount: S._count._all,
          },
          dataStatus: {
            operationalCustomerCount: I.length,
            customersWithPhoneCount: I.filter((e) => !!e.phone?.trim()).length,
            customersWithVisitCount: I.filter((e) => e._count.visits > 0)
              .length,
            customersWithSaleCount: _.length,
            excludedCustomerCount:
              "actual" === t ? Math.max(0, P - I.length) : 0,
            excludedSaleCount:
              "actual" === t ? Math.max(0, R - S._count._all) : 0,
            excludedVisitCount: "actual" === t ? Math.max(0, O - D) : 0,
          },
          months: L,
          menuBreakdown: Array.from(z.entries())
            .map(([e, t]) => ({ label: e, ...t }))
            .sort((e, t) => t.revenue - e.revenue)
            .slice(0, 6),
          paymentBreakdown: Array.from(V.entries())
            .map(([e, t]) => ({ label: e, ...t }))
            .sort((e, t) => t.revenue - e.revenue),
          stylistBreakdown: Array.from(Z.entries())
            .map(([e, t]) => ({ label: e, visitCount: t }))
            .sort((e, t) => t.visitCount - e.visitCount)
            .slice(0, 6),
          staffPerformance: Array.from(new Set([...E.keys(), ...Z.keys()]))
            .map((e) => {
              let t = E.get(e),
                r = t?.saleCount ?? 0;
              return {
                label: e,
                revenue: t?.revenue ?? 0,
                saleCount: r,
                customerCount: t?.customerIds.size ?? 0,
                visitCount: Z.get(e) ?? 0,
                averageSpend: m(t?.revenue ?? 0, r),
              };
            })
            .sort(
              (e, t) => t.revenue - e.revenue || t.visitCount - e.visitCount,
            ),
          topCustomers: Array.from(K.entries())
            .map(([e, t]) => ({
              customerId: e,
              customerName: t.customerName,
              revenue: t.revenue,
              saleCount: t.saleCount,
              visitCount: W.get(e)?.length ?? 0,
              averageSpend: m(t.revenue, t.saleCount),
            }))
            .sort((e, t) => t.revenue - e.revenue)
            .slice(0, 10),
          ageBreakdown: H.map((e) => ({ label: e, count: q.get(e) ?? 0 })),
          genderBreakdown: J.map((e) => ({ label: e, count: Q.get(e) ?? 0 })),
          recentSales: j
            .slice(0, 10)
            .map((e) => ({
              id: e.id,
              customerId: e.customerId,
              customerName: e.customer.name,
              title: e.title,
              amount: e.amount,
              paidAt: e.paidAt,
              paymentMethod: e.paymentMethod,
            })),
        };
      }
    },
    60353: (e, t, r) => {
      r.d(t, {
        Cp: () => l,
        K7: () => i,
        iu: () => a,
        jb: () => o,
        tp: () => s,
        tt: () => u,
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
      function s(e) {
        return e === o.key ? o : (n.find((t) => t.key === e) ?? null);
      }
      function l(e) {
        let t = i(e) ?? o.name;
        return t === o.name
          ? o.key
          : (n.find((e) => e.name === t)?.key ?? null);
      }
      function i(e) {
        let t = e?.trim();
        if (!t) return null;
        let r = n.find((e) => e.name === t || e.aliases.includes(t));
        return r?.name ?? t;
      }
      function u(e) {
        let t = e.visits[0];
        if (t) return `前回の対応者: ${i(t.stylistName) ?? "フリー"}`;
        let r =
          "assigned" === e.staffAssignmentType ? i(e.assignedStaffName) : null;
        return `来店履歴なし / 指名: ${r ?? "フリー"}`;
      }
    },
    72852: (e, t, r) => {
      r.d(t, { Z: () => n });
      let n = (0, r(40430).Z)("japanese-yen", [
        ["path", { d: "M12 9.5V21m0-11.5L6 3m6 6.5L18 3", key: "2ej80x" }],
        ["path", { d: "M6 15h12", key: "1hwgt5" }],
        ["path", { d: "M6 11h12", key: "wf4gp6" }],
      ]);
    },
    48723: (e, t, r) => {
      r.d(t, { Z: () => n });
      let n = (0, r(40430).Z)("user-round", [
        ["circle", { cx: "12", cy: "8", r: "5", key: "1hypcn" }],
        ["path", { d: "M20 21a8 8 0 0 0-16 0", key: "rfgkzh" }],
      ]);
    },
  }));
