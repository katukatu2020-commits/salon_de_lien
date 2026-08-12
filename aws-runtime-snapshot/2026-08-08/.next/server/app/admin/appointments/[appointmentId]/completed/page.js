(() => {
  var e = {};
  ((e.id = 4340),
    (e.ids = [4340]),
    (e.modules = {
      21841: (e) => {
        "use strict";
        e.exports = require("@aws-sdk/client-s3");
      },
      53524: (e) => {
        "use strict";
        e.exports = require("@prisma/client");
      },
      72934: (e) => {
        "use strict";
        e.exports = require("next/dist/client/components/action-async-storage.external.js");
      },
      54580: (e) => {
        "use strict";
        e.exports = require("next/dist/client/components/request-async-storage.external.js");
      },
      45869: (e) => {
        "use strict";
        e.exports = require("next/dist/client/components/static-generation-async-storage.external.js");
      },
      20399: (e) => {
        "use strict";
        e.exports = require("next/dist/compiled/next-server/app-page.runtime.prod.js");
      },
      84770: (e) => {
        "use strict";
        e.exports = require("crypto");
      },
      76162: (e) => {
        "use strict";
        e.exports = require("stream");
      },
      74026: (e) => {
        "use strict";
        e.exports = require("string_decoder");
      },
      67783: (e) => {
        "use strict";
        e.exports = import("sharp");
      },
      98061: (e) => {
        "use strict";
        e.exports = require("node:assert");
      },
      92761: (e) => {
        "use strict";
        e.exports = require("node:async_hooks");
      },
      72254: (e) => {
        "use strict";
        e.exports = require("node:buffer");
      },
      40027: (e) => {
        "use strict";
        e.exports = require("node:console");
      },
      6005: (e) => {
        "use strict";
        e.exports = require("node:crypto");
      },
      65714: (e) => {
        "use strict";
        e.exports = require("node:diagnostics_channel");
      },
      30604: (e) => {
        "use strict";
        e.exports = require("node:dns");
      },
      15673: (e) => {
        "use strict";
        e.exports = require("node:events");
      },
      93977: (e) => {
        "use strict";
        e.exports = require("node:fs/promises");
      },
      88849: (e) => {
        "use strict";
        e.exports = require("node:http");
      },
      42725: (e) => {
        "use strict";
        e.exports = require("node:http2");
      },
      87503: (e) => {
        "use strict";
        e.exports = require("node:net");
      },
      70612: (e) => {
        "use strict";
        e.exports = require("node:os");
      },
      49411: (e) => {
        "use strict";
        e.exports = require("node:path");
      },
      38846: (e) => {
        "use strict";
        e.exports = require("node:perf_hooks");
      },
      39630: (e) => {
        "use strict";
        e.exports = require("node:querystring");
      },
      84492: (e) => {
        "use strict";
        e.exports = require("node:stream");
      },
      31764: (e) => {
        "use strict";
        e.exports = require("node:tls");
      },
      41041: (e) => {
        "use strict";
        e.exports = require("node:url");
      },
      47261: (e) => {
        "use strict";
        e.exports = require("node:util");
      },
      93746: (e) => {
        "use strict";
        e.exports = require("node:util/types");
      },
      24086: (e) => {
        "use strict";
        e.exports = require("node:worker_threads");
      },
      65628: (e) => {
        "use strict";
        e.exports = require("node:zlib");
      },
      80118: (e, t, r) => {
        "use strict";
        r.a(e, async (e, s) => {
          try {
            (r.r(t),
              r.d(t, {
                GlobalError: () => c.a,
                __next_app__: () => h,
                originalPathname: () => f,
                pages: () => x,
                routeModule: () => g,
                tree: () => m,
              }));
            var n = r(42122),
              o = r(32029);
            r(35866);
            var i = r(23191),
              a = r(88716),
              d = r(37922),
              c = r.n(d),
              l = r(95231),
              u = {};
            for (let e in l)
              0 >
                [
                  "default",
                  "tree",
                  "pages",
                  "GlobalError",
                  "originalPathname",
                  "__next_app__",
                  "routeModule",
                ].indexOf(e) && (u[e] = () => l[e]);
            r.d(t, u);
            var p = e([n, o]);
            [n, o] = p.then ? (await p)() : p;
            let m = [
                "",
                {
                  children: [
                    "admin",
                    {
                      children: [
                        "appointments",
                        {
                          children: [
                            "[appointmentId]",
                            {
                              children: [
                                "completed",
                                {
                                  children: [
                                    "__PAGE__",
                                    {},
                                    {
                                      page: [
                                        () =>
                                          Promise.resolve().then(
                                            r.bind(r, 42122),
                                          ),
                                        "/app/src/app/admin/appointments/[appointmentId]/completed/page.tsx",
                                      ],
                                    },
                                  ],
                                },
                                {},
                              ],
                            },
                            {},
                          ],
                        },
                        {},
                      ],
                    },
                    {},
                  ],
                },
                {
                  layout: [
                    () => Promise.resolve().then(r.bind(r, 32029)),
                    "/app/src/app/layout.tsx",
                  ],
                  "not-found": [
                    () => Promise.resolve().then(r.t.bind(r, 35866, 23)),
                    "next/dist/client/components/not-found-error",
                  ],
                },
              ],
              x = [
                "/app/src/app/admin/appointments/[appointmentId]/completed/page.tsx",
              ],
              f = "/admin/appointments/[appointmentId]/completed/page",
              h = { require: r, loadChunk: () => Promise.resolve() },
              g = new i.AppPageRouteModule({
                definition: {
                  kind: a.x.APP_PAGE,
                  page: "/admin/appointments/[appointmentId]/completed/page",
                  pathname: "/admin/appointments/[appointmentId]/completed",
                  bundlePath: "",
                  filename: "",
                  appPaths: [],
                },
                userland: { loaderTree: m },
              });
            s();
          } catch (e) {
            s(e);
          }
        });
      },
      71761: (e, t, r) => {
        (Promise.resolve().then(r.bind(r, 2430)),
          Promise.resolve().then(r.t.bind(r, 79404, 23)),
          Promise.resolve().then(r.bind(r, 98301)));
      },
      58585: (e, t, r) => {
        "use strict";
        var s = r(61085);
        (r.o(s, "notFound") &&
          r.d(t, {
            notFound: function () {
              return s.notFound;
            },
          }),
          r.o(s, "redirect") &&
            r.d(t, {
              redirect: function () {
                return s.redirect;
              },
            }));
      },
      61085: (e, t, r) => {
        "use strict";
        (Object.defineProperty(t, "__esModule", { value: !0 }),
          (function (e, t) {
            for (var r in t)
              Object.defineProperty(e, r, { enumerable: !0, get: t[r] });
          })(t, {
            ReadonlyURLSearchParams: function () {
              return i;
            },
            RedirectType: function () {
              return s.RedirectType;
            },
            notFound: function () {
              return n.notFound;
            },
            permanentRedirect: function () {
              return s.permanentRedirect;
            },
            redirect: function () {
              return s.redirect;
            },
          }));
        let s = r(83953),
          n = r(16399);
        class o extends Error {
          constructor() {
            super(
              "Method unavailable on `ReadonlyURLSearchParams`. Read more: https://nextjs.org/docs/app/api-reference/functions/use-search-params#updating-searchparams",
            );
          }
        }
        class i extends URLSearchParams {
          append() {
            throw new o();
          }
          delete() {
            throw new o();
          }
          set() {
            throw new o();
          }
          sort() {
            throw new o();
          }
        }
        ("function" == typeof t.default ||
          ("object" == typeof t.default && null !== t.default)) &&
          void 0 === t.default.__esModule &&
          (Object.defineProperty(t.default, "__esModule", { value: !0 }),
          Object.assign(t.default, t),
          (e.exports = t.default));
      },
      16399: (e, t) => {
        "use strict";
        (Object.defineProperty(t, "__esModule", { value: !0 }),
          (function (e, t) {
            for (var r in t)
              Object.defineProperty(e, r, { enumerable: !0, get: t[r] });
          })(t, {
            isNotFoundError: function () {
              return n;
            },
            notFound: function () {
              return s;
            },
          }));
        let r = "NEXT_NOT_FOUND";
        function s() {
          let e = Error(r);
          throw ((e.digest = r), e);
        }
        function n(e) {
          return (
            "object" == typeof e &&
            null !== e &&
            "digest" in e &&
            e.digest === r
          );
        }
        ("function" == typeof t.default ||
          ("object" == typeof t.default && null !== t.default)) &&
          void 0 === t.default.__esModule &&
          (Object.defineProperty(t.default, "__esModule", { value: !0 }),
          Object.assign(t.default, t),
          (e.exports = t.default));
      },
      8586: (e, t) => {
        "use strict";
        var r;
        (Object.defineProperty(t, "__esModule", { value: !0 }),
          Object.defineProperty(t, "RedirectStatusCode", {
            enumerable: !0,
            get: function () {
              return r;
            },
          }),
          (function (e) {
            ((e[(e.SeeOther = 303)] = "SeeOther"),
              (e[(e.TemporaryRedirect = 307)] = "TemporaryRedirect"),
              (e[(e.PermanentRedirect = 308)] = "PermanentRedirect"));
          })(r || (r = {})),
          ("function" == typeof t.default ||
            ("object" == typeof t.default && null !== t.default)) &&
            void 0 === t.default.__esModule &&
            (Object.defineProperty(t.default, "__esModule", { value: !0 }),
            Object.assign(t.default, t),
            (e.exports = t.default)));
      },
      83953: (e, t, r) => {
        "use strict";
        var s;
        (Object.defineProperty(t, "__esModule", { value: !0 }),
          (function (e, t) {
            for (var r in t)
              Object.defineProperty(e, r, { enumerable: !0, get: t[r] });
          })(t, {
            RedirectType: function () {
              return s;
            },
            getRedirectError: function () {
              return d;
            },
            getRedirectStatusCodeFromError: function () {
              return x;
            },
            getRedirectTypeFromError: function () {
              return m;
            },
            getURLFromRedirectError: function () {
              return p;
            },
            isRedirectError: function () {
              return u;
            },
            permanentRedirect: function () {
              return l;
            },
            redirect: function () {
              return c;
            },
          }));
        let n = r(54580),
          o = r(72934),
          i = r(8586),
          a = "NEXT_REDIRECT";
        function d(e, t, r) {
          void 0 === r && (r = i.RedirectStatusCode.TemporaryRedirect);
          let s = Error(a);
          s.digest = a + ";" + t + ";" + e + ";" + r + ";";
          let o = n.requestAsyncStorage.getStore();
          return (o && (s.mutableCookies = o.mutableCookies), s);
        }
        function c(e, t) {
          void 0 === t && (t = "replace");
          let r = o.actionAsyncStorage.getStore();
          throw d(
            e,
            t,
            (null == r ? void 0 : r.isAction)
              ? i.RedirectStatusCode.SeeOther
              : i.RedirectStatusCode.TemporaryRedirect,
          );
        }
        function l(e, t) {
          void 0 === t && (t = "replace");
          let r = o.actionAsyncStorage.getStore();
          throw d(
            e,
            t,
            (null == r ? void 0 : r.isAction)
              ? i.RedirectStatusCode.SeeOther
              : i.RedirectStatusCode.PermanentRedirect,
          );
        }
        function u(e) {
          if (
            "object" != typeof e ||
            null === e ||
            !("digest" in e) ||
            "string" != typeof e.digest
          )
            return !1;
          let [t, r, s, n] = e.digest.split(";", 4),
            o = Number(n);
          return (
            t === a &&
            ("replace" === r || "push" === r) &&
            "string" == typeof s &&
            !isNaN(o) &&
            o in i.RedirectStatusCode
          );
        }
        function p(e) {
          return u(e) ? e.digest.split(";", 3)[2] : null;
        }
        function m(e) {
          if (!u(e)) throw Error("Not a redirect error");
          return e.digest.split(";", 2)[1];
        }
        function x(e) {
          if (!u(e)) throw Error("Not a redirect error");
          return Number(e.digest.split(";", 4)[3]);
        }
        ((function (e) {
          ((e.push = "push"), (e.replace = "replace"));
        })(s || (s = {})),
          ("function" == typeof t.default ||
            ("object" == typeof t.default && null !== t.default)) &&
            void 0 === t.default.__esModule &&
            (Object.defineProperty(t.default, "__esModule", { value: !0 }),
            Object.assign(t.default, t),
            (e.exports = t.default)));
      },
      42122: (e, t, r) => {
        "use strict";
        r.a(e, async (e, s) => {
          try {
            (r.r(t), r.d(t, { default: () => g, dynamic: () => b }));
            var n = r(19510),
              o = r(57371),
              i = r(58585),
              a = r(56247),
              d = r(42189),
              c = r(24874),
              l = r(48723),
              u = r(72852),
              p = r(9922),
              m = r(73884),
              x = r(59219),
              f = r(13538),
              h = e([p]);
            p = (h.then ? (await h)() : h)[0];
            let b = "force-dynamic";
            async function g({ params: e, searchParams: E }) {
              var t;
              let r = await (0, x.Os)(["ADMIN", "STAFF"]);
              r.organizationId || (0, i.notFound)();
              let s = await f._.appointment.findFirst({
                where: {
                  id: e.appointmentId,
                  customer: {
                    organizationId: r.organizationId,
                    deletedAt: null,
                  },
                },
                include: {
                  customer: {
                    select: {
                      id: !0,
                      name: !0,
                      pointAccount: { select: { availablePoints: !0 } },
                    },
                  },
                  serviceSales: {
                    orderBy: { paidAt: "desc" },
                    take: 1,
                    include: {
                      productLines: { orderBy: { createdAt: "asc" } },
                    },
                  },
                },
              });
              s || (0, i.notFound)();
              let h = s.serviceSales[0] ?? null,
                O = typeof E?.cancelError === "string" ? E.cancelError : "";
              h ||
                (0, i.redirect)(
                  `/admin/appointments/${encodeURIComponent(e.appointmentId)}?checkoutCancelled=1`,
                );
              let [g, b] = await Promise.all([
                  f._.pointTransaction.findFirst({
                    where: {
                      customerId: s.customerId,
                      sourceType: "checkout",
                      sourceId: s.id,
                      type: "redeem",
                    },
                    orderBy: { createdAt: "desc" },
                    select: { amount: !0 },
                  }),
                  f._.pointTransaction.findFirst({
                    where: {
                      customerId: s.customerId,
                      sourceType: "appointment_checkout",
                      sourceId: s.id,
                      type: "earn",
                    },
                    orderBy: { createdAt: "desc" },
                    select: { amount: !0 },
                  }),
                ]),
                j = Math.abs(g?.amount ?? 0),
                y = (function (e) {
                  let t = e?.match(/(友達紹介（[^）]+）(\d+)%OFF) -([\d,]+)円/);
                  return t
                    ? { label: t[1], amount: Number(t[3].replace(/,/g, "")) }
                    : null;
                })(h.note),
                v = b?.amount ?? 0,
                N = h.productLines.reduce((e, t) => e + t.lineTotal, 0),
                w = Math.max(0, h.amount + j + (y?.amount ?? 0) - N);
              return (0, n.jsxs)("main", {
                className: "mx-auto grid w-full max-w-3xl gap-6 pb-8",
                children: [
                  (0, n.jsxs)("section", {
                    className:
                      "overflow-hidden rounded-[28px] border border-[#cbdcc8] bg-white shadow-lien",
                    children: [
                      (0, n.jsxs)("div", {
                        className:
                          "grid justify-items-center bg-[#eef5ed] px-5 py-10 text-center sm:px-10",
                        children: [
                          n.jsx("span", {
                            className:
                              "grid h-20 w-20 place-items-center rounded-full bg-white text-[#47674a] shadow-sm",
                            children: n.jsx(a.Z, {
                              className: "h-11 w-11",
                              "aria-hidden": "true",
                            }),
                          }),
                          n.jsx("p", {
                            className:
                              "mt-5 text-xs font-semibold text-[#5b745d]",
                            children: "CHECKOUT COMPLETE",
                          }),
                          n.jsx("h1", {
                            className:
                              "mt-2 text-2xl font-semibold text-[#2f3d30] sm:text-3xl",
                            children: "会計処理が終わりました",
                          }),
                          (0, n.jsxs)("p", {
                            className:
                              "mt-3 max-w-xl text-sm leading-7 text-[#5b6f5c]",
                            children: [
                              s.customer.name,
                              "様のお会計を、売上・ポイント履歴・購入商品へ反映しました。",
                            ],
                          }),
                        ],
                      }),
                      (0, n.jsxs)("div", {
                        className: "grid gap-6 p-5 sm:p-8",
                        children: [
                          (0, n.jsxs)("div", {
                            className: "grid gap-3 sm:grid-cols-2",
                            children: [
                              (0, n.jsxs)("div", {
                                className:
                                  "rounded-[20px] bg-[color:var(--lien-surface-soft)] p-4",
                                children: [
                                  n.jsx("p", {
                                    className:
                                      "text-xs font-semibold text-[color:var(--lien-muted)]",
                                    children: "お客様",
                                  }),
                                  (0, n.jsxs)("p", {
                                    className:
                                      "mt-2 text-lg font-semibold text-[color:var(--lien-ink)]",
                                    children: [s.customer.name, "様"],
                                  }),
                                  n.jsx("p", {
                                    className:
                                      "mt-1 text-xs leading-5 text-[color:var(--lien-muted)]",
                                    children:
                                      ((t = s.scheduledAt),
                                      new Intl.DateTimeFormat("ja-JP", {
                                        timeZone: "Asia/Tokyo",
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                        weekday: "short",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      }).format(t)),
                                  }),
                                ],
                              }),
                              (0, n.jsxs)("div", {
                                className: "rounded-[20px] bg-[#fff8e8] p-4",
                                children: [
                                  n.jsx("p", {
                                    className:
                                      "text-xs font-semibold text-[#80611d]",
                                    children: "本日のお会計",
                                  }),
                                  (0, n.jsxs)("p", {
                                    className:
                                      "mt-2 text-3xl font-semibold tabular-nums text-[#5b332c]",
                                    children: [
                                      h.amount.toLocaleString("ja-JP"),
                                      n.jsx("span", {
                                        className: "ml-1 text-sm",
                                        children: "円",
                                      }),
                                    ],
                                  }),
                                  n.jsx("p", {
                                    className: "mt-1 text-xs text-[#806b42]",
                                    children:
                                      h.paymentMethod ?? "支払い方法未記載",
                                  }),
                                ],
                              }),
                            ],
                          }),
                          (0, n.jsxs)("dl", {
                            className:
                              "grid gap-3 rounded-[20px] border border-[color:var(--lien-border)] bg-white p-4 text-sm",
                            children: [
                              (0, n.jsxs)("div", {
                                className: "flex justify-between gap-4",
                                children: [
                                  n.jsx("dt", {
                                    className: "text-[color:var(--lien-muted)]",
                                    children: "施術",
                                  }),
                                  (0, n.jsxs)("dd", {
                                    className: "text-right font-semibold",
                                    children: [
                                      h.title,
                                      " / ",
                                      w.toLocaleString("ja-JP"),
                                      "円",
                                    ],
                                  }),
                                ],
                              }),
                              h.productLines.map((e) =>
                                (0, n.jsxs)(
                                  "div",
                                  {
                                    className: "flex justify-between gap-4",
                                    children: [
                                      (0, n.jsxs)("dt", {
                                        className:
                                          "min-w-0 text-[color:var(--lien-muted)]",
                                        children: [
                                          e.productNameSnapshot,
                                          " \xd7 ",
                                          e.quantity,
                                        ],
                                      }),
                                      (0, n.jsxs)("dd", {
                                        className:
                                          "shrink-0 font-semibold tabular-nums",
                                        children: [
                                          e.lineTotal.toLocaleString("ja-JP"),
                                          "円",
                                        ],
                                      }),
                                    ],
                                  },
                                  e.id,
                                ),
                              ),
                              y
                                ? (0, n.jsxs)("div", {
                                    className: "flex justify-between gap-4",
                                    children: [
                                      n.jsx("dt", {
                                        className: "text-[#47674a]",
                                        children: y.label,
                                      }),
                                      (0, n.jsxs)("dd", {
                                        className:
                                          "font-semibold tabular-nums text-[#47674a]",
                                        children: [
                                          "-",
                                          y.amount.toLocaleString("ja-JP"),
                                          "円",
                                        ],
                                      }),
                                    ],
                                  })
                                : null,
                              j > 0
                                ? (0, n.jsxs)("div", {
                                    className: "flex justify-between gap-4",
                                    children: [
                                      n.jsx("dt", {
                                        className:
                                          "text-[color:var(--lien-muted)]",
                                        children: "ポイント利用",
                                      }),
                                      (0, n.jsxs)("dd", {
                                        className:
                                          "font-semibold tabular-nums text-[color:var(--lien-primary-dark)]",
                                        children: [
                                          "-",
                                          j.toLocaleString("ja-JP"),
                                          "pt",
                                        ],
                                      }),
                                    ],
                                  })
                                : null,
                              v > 0
                                ? (0, n.jsxs)("div", {
                                    className:
                                      "flex justify-between gap-4 border-t border-[color:var(--lien-border)] pt-3",
                                    children: [
                                      (0, n.jsxs)("dt", {
                                        className:
                                          "inline-flex items-center gap-2 font-semibold text-[#47674a]",
                                        children: [
                                          n.jsx(d.Z, { className: "h-4 w-4" }),
                                          "予約・会計特典",
                                        ],
                                      }),
                                      (0, n.jsxs)("dd", {
                                        className:
                                          "font-semibold tabular-nums text-[#47674a]",
                                        children: [
                                          "+",
                                          v.toLocaleString("ja-JP"),
                                          "pt",
                                        ],
                                      }),
                                    ],
                                  })
                                : null,
                              (0, n.jsxs)("div", {
                                className:
                                  "flex justify-between gap-4 border-t border-[color:var(--lien-border)] pt-3",
                                children: [
                                  n.jsx("dt", {
                                    className: "text-[color:var(--lien-muted)]",
                                    children: "現在の保有ポイント",
                                  }),
                                  (0, n.jsxs)("dd", {
                                    className: "font-semibold tabular-nums",
                                    children: [
                                      (
                                        s.customer.pointAccount
                                          ?.availablePoints ?? 0
                                      ).toLocaleString("ja-JP"),
                                      "pt",
                                    ],
                                  }),
                                ],
                              }),
                            ],
                          }),
                          (0, n.jsxs)("div", {
                            className: "grid gap-3 sm:grid-cols-3",
                            children: [
                              n.jsx(m.A, {
                                appointmentId: s.id,
                                className: "w-full sm:col-span-3",
                              }),
                              (0, n.jsxs)(o.default, {
                                href: "/admin/appointments",
                                className: "lien-button-primary w-full",
                                children: [
                                  n.jsx(c.Z, { className: "h-4 w-4" }),
                                  "予約カレンダーへ戻る",
                                ],
                              }),
                              (0, n.jsxs)(o.default, {
                                href: `/admin/customers/${s.customer.id}`,
                                className: "lien-button-secondary w-full",
                                children: [
                                  n.jsx(l.Z, { className: "h-4 w-4" }),
                                  "お客様カルテを見る",
                                ],
                              }),
                              (0, n.jsxs)("form", {
                                action: `/api/admin/appointments/${encodeURIComponent(s.id)}/schedule`,
                                method: "post",
                                className:
                                  "grid gap-3 rounded-[20px] border border-[#e7b8b2] bg-[#fff4f2] p-4 sm:col-span-3",
                                style: {
                                  border: "2px solid #b85f55",
                                  backgroundColor: "#fff1ef",
                                  boxShadow: "0 8px 22px rgba(124, 48, 43, 0.12)",
                                },
                                children: [
                                  n.jsx("p", {
                                    className:
                                      "text-sm font-semibold text-[#7c302b]",
                                    style: { fontSize: "16px", color: "#712d28" },
                                    children: "会計を取り消す",
                                  }),
                                  n.jsx("p", {
                                    className:
                                      "text-xs leading-5 text-[#7c514d]",
                                    children:
                                      "売上、商品在庫、利用・付与ポイント、クーポン、紹介特典を会計前の状態へ戻します。取り消し後は会計を入力し直せます。",
                                  }),
                                  O
                                    ? n.jsx("p", {
                                        role: "alert",
                                        className:
                                          "rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[#9b2f29]",
                                        children: O,
                                      })
                                    : null,
                                  (0, n.jsxs)("label", {
                                    className:
                                      "flex items-start gap-2 text-xs font-semibold text-[#6f3b37]",
                                    style: {
                                      padding: "12px",
                                      border: "1px solid #d89a92",
                                      borderRadius: "12px",
                                      backgroundColor: "#ffffff",
                                      color: "#5f2925",
                                    },
                                    children: [
                                      n.jsx("input", {
                                        type: "checkbox",
                                        name: "confirm",
                                        value: "cancel",
                                        required: !0,
                                        className: "mt-0.5 h-4 w-4",
                                        style: {
                                          width: "18px",
                                          height: "18px",
                                          accentColor: "#8f3f32",
                                          flexShrink: 0,
                                        },
                                      }),
                                      "会計内容を確認し、取り消すことに同意します",
                                    ],
                                  }),
                                  n.jsx("button", {
                                    type: "submit",
                                    className:
                                      "min-h-11 rounded-full bg-[#9b3b34] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#812f2a]",
                                    style: {
                                      minHeight: "52px",
                                      border: "2px solid #6f2d27",
                                      borderRadius: "9999px",
                                      backgroundColor: "#8f3f32",
                                      color: "#ffffff",
                                      fontSize: "15px",
                                      fontWeight: 700,
                                      letterSpacing: "0.04em",
                                      boxShadow: "0 6px 16px rgba(111, 45, 39, 0.28)",
                                      cursor: "pointer",
                                    },
                                    children: "会計を取り消す",
                                  }),
                                ],
                              }),
                            ],
                          }),
                          (0, n.jsxs)("p", {
                            className:
                              "flex items-center justify-center gap-2 text-center text-xs leading-5 text-[color:var(--lien-muted)]",
                            children: [
                              n.jsx(u.Z, { className: "h-4 w-4 shrink-0" }),
                              "同じ予約で会計が重複して記録されることはありません。",
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
                  n.jsx(p.P, {
                    customerId: s.customerId,
                    scheduledAt: s.scheduledAt,
                  }),
                ],
              });
            }
            s();
          } catch (e) {
            s(e);
          }
        });
      },
      99225: (e, t, r) => {
        "use strict";
        r.d(t, { Z: () => s });
        let s = (0, r(52761).Z)("upload", [
          ["path", { d: "M12 3v12", key: "1x0j5s" }],
          ["path", { d: "m17 8-5-5-5 5", key: "7q97r8" }],
          [
            "path",
            { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", key: "ih7n3h" },
          ],
        ]);
      },
      40430: (e, t, r) => {
        "use strict";
        r.d(t, { Z: () => c });
        var s = r(71159);
        let n = (...e) =>
            e
              .filter((e, t, r) => !!e && "" !== e.trim() && r.indexOf(e) === t)
              .join(" ")
              .trim(),
          o = (e) => e.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(),
          i = (e) =>
            e.replace(/^([A-Z])|[\s-_]+(\w)/g, (e, t, r) =>
              r ? r.toUpperCase() : t.toLowerCase(),
            ),
          a = (e) => {
            let t = i(e);
            return t.charAt(0).toUpperCase() + t.slice(1);
          },
          d = (0, r(68570).createProxy)(
            String.raw`/app/node_modules/lucide-react/dist/esm/Icon.mjs#default`,
          ),
          c = (e, t) => {
            let r = (0, s.forwardRef)(({ className: r, ...i }, c) =>
              (0, s.createElement)(d, {
                ref: c,
                iconNode: t,
                className: n(`lucide-${o(a(e))}`, `lucide-${e}`, r),
                ...i,
              }),
            );
            return ((r.displayName = a(e)), r);
          };
      },
      56247: (e, t, r) => {
        "use strict";
        r.d(t, { Z: () => s });
        let s = (0, r(40430).Z)("circle-check", [
          ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
          ["path", { d: "m9 12 2 2 4-4", key: "dzmm74" }],
        ]);
      },
    }));
  var t = require("../../../../../webpack-runtime.js");
  t.C(e);
  var r = (e) => t((t.s = e)),
    s = t.X(0, [9380, 4108, 2159, 3914, 1425, 7391], () => r(80118));
  module.exports = s;
})();
