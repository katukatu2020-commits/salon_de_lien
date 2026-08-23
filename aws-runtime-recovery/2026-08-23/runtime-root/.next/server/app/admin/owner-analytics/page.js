(() => {
  var e = {};
  ((e.id = 1371),
    (e.ids = [1371]),
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
      43738: (e, t, r) => {
        "use strict";
        r.a(e, async (e, s) => {
          try {
            (r.r(t),
              r.d(t, {
                GlobalError: () => o.a,
                __next_app__: () => h,
                originalPathname: () => p,
                pages: () => x,
                routeModule: () => f,
                tree: () => m,
              }),
              r(69855));
            var n = r(32029);
            r(35866);
            var a = r(23191),
              i = r(88716),
              l = r(37922),
              o = r.n(l),
              d = r(95231),
              c = {};
            for (let e in d)
              0 >
                [
                  "default",
                  "tree",
                  "pages",
                  "GlobalError",
                  "originalPathname",
                  "__next_app__",
                  "routeModule",
                ].indexOf(e) && (c[e] = () => d[e]);
            r.d(t, c);
            var u = e([n]);
            n = (u.then ? (await u)() : u)[0];
            let m = [
                "",
                {
                  children: [
                    "admin",
                    {
                      children: [
                        "owner-analytics",
                        {
                          children: [
                            "__PAGE__",
                            {},
                            {
                              page: [
                                () => Promise.resolve().then(r.bind(r, 69855)),
                                "/app/src/app/admin/owner-analytics/page.tsx",
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
              x = ["/app/src/app/admin/owner-analytics/page.tsx"],
              p = "/admin/owner-analytics/page",
              h = { require: r, loadChunk: () => Promise.resolve() },
              f = new a.AppPageRouteModule({
                definition: {
                  kind: i.x.APP_PAGE,
                  page: "/admin/owner-analytics/page",
                  pathname: "/admin/owner-analytics",
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
      6832: (e, t, r) => {
        (Promise.resolve().then(r.bind(r, 2430)),
          Promise.resolve().then(r.t.bind(r, 79404, 23)));
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
        class a extends Error {
          constructor() {
            super(
              "Method unavailable on `ReadonlyURLSearchParams`. Read more: https://nextjs.org/docs/app/api-reference/functions/use-search-params#updating-searchparams",
            );
          }
        }
        class i extends URLSearchParams {
          append() {
            throw new a();
          }
          delete() {
            throw new a();
          }
          set() {
            throw new a();
          }
          sort() {
            throw new a();
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
              return o;
            },
            getRedirectStatusCodeFromError: function () {
              return p;
            },
            getRedirectTypeFromError: function () {
              return x;
            },
            getURLFromRedirectError: function () {
              return m;
            },
            isRedirectError: function () {
              return u;
            },
            permanentRedirect: function () {
              return c;
            },
            redirect: function () {
              return d;
            },
          }));
        let n = r(54580),
          a = r(72934),
          i = r(8586),
          l = "NEXT_REDIRECT";
        function o(e, t, r) {
          void 0 === r && (r = i.RedirectStatusCode.TemporaryRedirect);
          let s = Error(l);
          s.digest = l + ";" + t + ";" + e + ";" + r + ";";
          let a = n.requestAsyncStorage.getStore();
          return (a && (s.mutableCookies = a.mutableCookies), s);
        }
        function d(e, t) {
          void 0 === t && (t = "replace");
          let r = a.actionAsyncStorage.getStore();
          throw o(
            e,
            t,
            (null == r ? void 0 : r.isAction)
              ? i.RedirectStatusCode.SeeOther
              : i.RedirectStatusCode.TemporaryRedirect,
          );
        }
        function c(e, t) {
          void 0 === t && (t = "replace");
          let r = a.actionAsyncStorage.getStore();
          throw o(
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
            a = Number(n);
          return (
            t === l &&
            ("replace" === r || "push" === r) &&
            "string" == typeof s &&
            !isNaN(a) &&
            a in i.RedirectStatusCode
          );
        }
        function m(e) {
          return u(e) ? e.digest.split(";", 3)[2] : null;
        }
        function x(e) {
          if (!u(e)) throw Error("Not a redirect error");
          return e.digest.split(";", 2)[1];
        }
        function p(e) {
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
      69855: (e, t, r) => {
        "use strict";
        (r.r(t), r.d(t, { default: () => w, dynamic: () => g }));
        var s = r(19510),
          n = r(57371),
          a = r(58585),
          i = r(38676),
          l = r(72852),
          o = r(68059),
          d = r(40430);
        let c = (0, d.Z)("receipt-text", [
            ["path", { d: "M13 16H8", key: "wsln4y" }],
            ["path", { d: "M14 8H8", key: "1l3xfs" }],
            ["path", { d: "M16 12H8", key: "1fr5h0" }],
            [
              "path",
              {
                d: "M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z",
                key: "ycz6yz",
              },
            ],
          ]),
          u = (0, d.Z)("repeat-2", [
            ["path", { d: "m2 9 3-3 3 3", key: "1ltn5i" }],
            ["path", { d: "M13 18H7a2 2 0 0 1-2-2V6", key: "1r6tfw" }],
            ["path", { d: "m22 15-3 3-3-3", key: "4rnwn2" }],
            ["path", { d: "M11 6h6a2 2 0 0 1 2 2v10", key: "2f72bc" }],
          ]),
          m = (0, d.Z)("calendar-range", [
            [
              "rect",
              {
                width: "18",
                height: "18",
                x: "3",
                y: "4",
                rx: "2",
                key: "1hopcy",
              },
            ],
            ["path", { d: "M16 2v4", key: "4m81vk" }],
            ["path", { d: "M3 10h18", key: "8toen8" }],
            ["path", { d: "M8 2v4", key: "1cmpym" }],
            ["path", { d: "M17 14h-6", key: "bkmgh3" }],
            ["path", { d: "M13 18H7", key: "bb0bb7" }],
            ["path", { d: "M7 14h.01", key: "1qa3f1" }],
            ["path", { d: "M17 18h.01", key: "1bdyru" }],
          ]),
          x = (0, d.Z)("crown", [
            [
              "path",
              {
                d: "M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z",
                key: "1vdc57",
              },
            ],
            ["path", { d: "M5 21h14", key: "11awu3" }],
          ]),
          p = (0, d.Z)("trending-up", [
            ["path", { d: "M16 7h6v6", key: "box55l" }],
            ["path", { d: "m22 7-8.5 8.5-5-5L2 17", key: "1t1m79" }],
          ]);
        var h = r(48723),
          f = r(90878),
          j = r(59219),
          y = r(68024),
          z = r(13538);
        let g = "force-dynamic";
        function b(e) {
          return `${e.toLocaleString("ja-JP")}円`;
        }
        function v({ value: e, max: t }) {
          return s.jsx("div", {
            className: "mt-2 h-2 overflow-hidden rounded-full bg-[#f1e9e1]",
            children: s.jsx("div", {
              className: "h-full rounded-full bg-[#8f4f42]",
              style: {
                width: `${t > 0 ? Math.max(3, Math.round((e / t) * 100)) : 0}%`,
              },
            }),
          });
        }
        function N({ title: e, items: t }) {
          let r = t.reduce((e, t) => e + t.count, 0),
            n = Math.max(0, ...t.map((e) => e.count));
          return (0, s.jsxs)(f.IP, {
            children: [
              (0, s.jsxs)("div", {
                className: "flex items-center justify-between gap-3",
                children: [
                  s.jsx("h2", {
                    className: "text-lg font-semibold text-lien-ink",
                    children: e,
                  }),
                  (0, s.jsxs)("span", {
                    className:
                      "text-xs font-semibold tabular-nums text-lien-muted",
                    children: [r.toLocaleString("ja-JP"), "人"],
                  }),
                ],
              }),
              s.jsx("div", {
                className: "mt-5 grid gap-4",
                children: t.map((e) => {
                  let t = r > 0 ? Math.round((e.count / r) * 100) : 0;
                  return (0, s.jsxs)(
                    "div",
                    {
                      children: [
                        (0, s.jsxs)("div", {
                          className:
                            "flex items-center justify-between gap-3 text-sm",
                          children: [
                            s.jsx("span", {
                              className: "font-medium text-lien-ink",
                              children: e.label,
                            }),
                            (0, s.jsxs)("span", {
                              className: "tabular-nums text-lien-muted",
                              children: [e.count, "人 / ", t, "%"],
                            }),
                          ],
                        }),
                        s.jsx(v, { value: e.count, max: n }),
                      ],
                    },
                    e.label,
                  );
                }),
              }),
            ],
          });
        }
        function T({ active: e }) {
          let t = [
            {
              key: "analytics",
              href: "/admin/owner-analytics",
              label: "経営分析",
            },
            {
              key: "billing",
              href: "/admin/owner-analytics?section=billing",
              label: "システム利用料",
            },
          ];
          return s.jsx("nav", {
            className:
              "grid w-full grid-cols-2 gap-1 rounded-[18px] border border-lien bg-white p-1 shadow-lien-sm",
            "aria-label": "経営ページ切替",
            children: t.map((t) => {
              let r = e === t.key;
              return s.jsx(
                n.default,
                {
                  href: t.href,
                  "aria-current": r ? "page" : void 0,
                  className: `lien-segment inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-[14px] px-4 text-sm font-semibold transition ${r ? "bg-[color:var(--lien-primary)] text-white shadow-sm" : "text-lien-muted hover:bg-lien-soft hover:text-lien-ink"}`,
                  children: t.label,
                },
                t.key,
              );
            }),
          });
        }
        function S({ smsCount: e, emailCount: t, billing: r, plans: a }) {
          let i = Array.isArray(a) && a.length
              ? a
              : [
                  { planKey: "ume", displayName: "梅", monthlyAmount: 4980, staffLimit: 3, customerLimit: 500, emailLimit: 500, smsLimit: 100 },
                  { planKey: "take", displayName: "竹", monthlyAmount: 9800, staffLimit: 10, customerLimit: 3000, emailLimit: 5000, smsLimit: 1000 },
                  { planKey: "matsu", displayName: "松", monthlyAmount: 19800, staffLimit: null, customerLimit: null, emailLimit: null, smsLimit: 10000 },
                ],
            l = r?.planKey || (["ume", "take", "matsu"].includes(process.env.SALON_PLAN_TIER) ? process.env.SALON_PLAN_TIER : "take"),
            o = i.find((e) => e.planKey === l) || i[1] || i[0],
            d = Number(o?.monthlyAmount || 9800),
            c = 15,
            u = Number(e || 0) * c,
            m = d + u,
            x = r?.subscriptionStatus || "legacy",
            p = {
              legacy: "既存契約",
              none: "お支払い方法未登録",
              incomplete: "設定確認中",
              trialing: "無料トライアル中",
              active: "利用中",
              past_due: "支払い確認が必要",
              unpaid: "利用停止中",
              canceled: "解約済み",
              paused: "一時停止中",
            }[x] || x,
            h = (e) => {
              if (!e) return "未定";
              let t = new Date(e);
              return Number.isNaN(t.getTime()) ? "未定" : new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric" }).format(t);
            },
            fDate = "trialing" === x ? r?.trialEndsAt : r?.currentPeriodEnd,
            j = "trialing" === x ? 0 : d,
            y = r?.paymentMethodLast4
              ? `${String(r.paymentMethodBrand || "CARD").toUpperCase()} •••• ${r.paymentMethodLast4}`
              : "未登録",
            g = r?.paymentMethodExpMonth && r?.paymentMethodExpYear
              ? `有効期限 ${String(r.paymentMethodExpMonth).padStart(2, "0")}/${String(r.paymentMethodExpYear).slice(-2)}`
              : "Stripeの安全な画面で管理します",
            w = r?.trialEndsAt
              ? Math.max(0, Math.ceil((new Date(r.trialEndsAt).getTime() - Date.now()) / 86400000))
              : null,
            q = Boolean(r && ["none", "incomplete"].includes(x) && !r.trialUsedAt),
            v = Math.max(1, Math.min(365, Number.parseInt(process.env.SUBSCRIPTION_TRIAL_DAYS || "30", 10) || 30)),
            b = new Date(Date.now() + v * 86400000),
            k = "legacy" === x
              ? ["既存契約（Stripe未接続）", "既存店舗は新規課金オンボーディングの対象外です。この更新だけでカード登録や請求が開始されることはありません。"]
              : "trialing" === x
                ? ["無料トライアル中", `無料期間終了まであと ${w}日です。 ${h(r.trialEndsAt)}から${d.toLocaleString("ja-JP")}円／月の請求が開始されます。`]
                : "past_due" === x
                  ? ["お支払いを確認できませんでした", "サービス継続のため、Stripe Customer Portalから支払い方法をご確認ください。"]
                  : r?.cancelAtPeriodEnd
                    ? ["解約予約を受け付けています", `${h(fDate)}以降は自動更新されません。`]
                    : ["契約情報", `${p}です。次回請求予定日は${h(fDate)}です。`];
          return (0, s.jsxs)("div", {
            className: "mx-auto grid max-w-7xl gap-6",
            children: [
              s.jsx(T, { active: "billing" }),
              s.jsx(f.mr, {
                eyebrow: "Billing & plan",
                title: "システム利用料",
                description: "契約状況、次回請求、カード情報、SMS利用見込みを確認します。",
              }),
              (0, s.jsxs)("section", {
                className: `rounded-[22px] border p-5 shadow-lien-sm sm:p-6 ${"past_due" === x ? "border-[#9b5142] bg-[#fff8f3]" : "border-lien bg-white"}`,
                children: [
                  s.jsx("p", { className: "text-sm font-semibold text-lien-ink", children: k[0] }),
                  s.jsx("p", { className: "mt-2 text-sm leading-6 text-lien-muted", children: k[1] }),
                ],
              }),
              q
                ? (0, s.jsxs)(f.IP, {
                    children: [
                      (0, s.jsxs)("div", {
                        className: "grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start",
                        children: [
                          (0, s.jsxs)("div", {
                            children: [
                              s.jsx("p", { className: "text-xs font-semibold text-lien-primary", children: "START YOUR FREE TRIAL" }),
                              s.jsx("h2", { className: "mt-1 text-2xl font-semibold text-lien-ink", children: "お支払い方法を登録して利用を開始" }),
                              s.jsx("p", { className: "mt-3 text-sm leading-7 text-lien-muted", children: "新規登録時に選択したプランで無料トライアルを開始します。カード登録が完了するまで料金は発生せず、店舗の業務機能も開始されません。" }),
                              (0, s.jsxs)("div", {
                                className: "mt-5 grid gap-3 sm:grid-cols-3",
                                children: [
                                  (0, s.jsxs)("div", { className: "rounded-2xl border border-lien bg-[#fffaf7] p-4", children: [s.jsx("p", { className: "text-xs text-lien-muted", children: "選択中のプラン" }), s.jsx("p", { className: "mt-2 text-lg font-semibold text-lien-ink", children: `${o?.displayName || "竹"}プラン` })] }),
                                  (0, s.jsxs)("div", { className: "rounded-2xl border border-lien bg-[#fffaf7] p-4", children: [s.jsx("p", { className: "text-xs text-lien-muted", children: "本日の請求" }), s.jsx("p", { className: "mt-2 text-lg font-semibold text-[#47745d]", children: "0円" })] }),
                                  (0, s.jsxs)("div", { className: "rounded-2xl border border-lien bg-[#fffaf7] p-4", children: [s.jsx("p", { className: "text-xs text-lien-muted", children: "無料期間" }), s.jsx("p", { className: "mt-2 text-lg font-semibold text-lien-ink", children: `${v}日間` })] }),
                                ],
                              }),
                            ],
                          }),
                          (0, s.jsxs)("aside", {
                            className: "rounded-[20px] border border-[#ead8cf] bg-[#fff8f4] p-5",
                            children: [
                              s.jsx("p", { className: "text-xs font-semibold text-lien-primary", children: "初回請求のご案内" }),
                              (0, s.jsxs)("p", { className: "mt-2 text-2xl font-semibold tabular-nums text-lien-ink", children: [d.toLocaleString("ja-JP"), "円", s.jsx("span", { className: "ml-1 text-xs font-medium text-lien-muted", children: "／月（税込）" })] }),
                              s.jsx("p", { className: "mt-2 text-xs leading-5 text-lien-muted", children: `${h(b)}から自動課金されます。無料期間中に解約した場合、料金は発生しません。` }),
                              s.jsx("form", {
                                method: "post",
                                action: "/api/admin/billing/checkout",
                                className: "mt-5",
                                children: s.jsx("button", { className: "lien-button-primary min-h-12 w-full px-5 text-sm", type: "submit", children: `カードを登録して${v}日間無料で始める` }),
                              }),
                              s.jsx("p", { className: "mt-3 text-[11px] leading-5 text-lien-muted", children: "カード番号・CVCはStripeが安全に管理し、Salon de Lienでは保存しません。" }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  })
                : null,
              (0, s.jsxs)("section", {
                className: "grid gap-3 sm:grid-cols-2 xl:grid-cols-4",
                children: [
                  s.jsx(f.i9, { label: "現在のプラン", value: o?.displayName || "竹", helper: "店舗ごとの契約プラン", tone: "premium" }),
                  s.jsx(f.i9, { label: "ステータス", value: p, helper: r ? "Stripeと同期" : "既存店舗の契約", tone: "highlight" }),
                  s.jsx(f.i9, { label: "基本利用料", value: d.toLocaleString("ja-JP"), unit: "円／月", helper: "税込" }),
                  s.jsx(f.i9, { label: "今回の請求", value: j.toLocaleString("ja-JP"), unit: "円", helper: "trialing" === x ? "無料期間中は0円" : "基本利用料", tone: "success" }),
                ],
              }),
              (0, s.jsxs)(f.IP, {
                children: [
                  s.jsx("div", {
                    className: "grid gap-6 lg:grid-cols-2",
                    children: [
                      (0, s.jsxs)("section", {
                        children: [
                          s.jsx("p", { className: "text-xs font-semibold text-lien-primary", children: "Next billing" }),
                          s.jsx("h2", { className: "mt-1 text-xl font-semibold text-lien-ink", children: "次回請求" }),
                          s.jsx("div", {
                            className: "mt-5 divide-y divide-[#eaded5] overflow-hidden rounded-2xl border border-lien bg-white",
                            children: [
                              ["請求予定日", h(fDate)],
                              ["次回基本料金", `${d.toLocaleString("ja-JP")}円`],
                              ["SMS利用料（概算）", `${u.toLocaleString("ja-JP")}円`],
                              ["今月の合計見込み", `${m.toLocaleString("ja-JP")}円`],
                            ].map((e) => (0, s.jsxs)("div", {
                              className: "grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-4 sm:px-5",
                              children: [s.jsx("p", { className: "text-sm text-lien-muted", children: e[0] }), s.jsx("p", { className: "font-semibold tabular-nums text-lien-ink", children: e[1] })],
                            }, e[0])),
                          }),
                        ],
                      }),
                      (0, s.jsxs)("section", {
                        children: [
                          s.jsx("p", { className: "text-xs font-semibold text-lien-primary", children: "Payment method" }),
                          s.jsx("h2", { className: "mt-1 text-xl font-semibold text-lien-ink", children: "登録カード" }),
                          (0, s.jsxs)("div", {
                            className: "mt-5 rounded-2xl border border-lien bg-white p-5",
                            children: [
                              s.jsx("p", { className: "text-lg font-semibold text-lien-ink", children: y }),
                              s.jsx("p", { className: "mt-2 text-xs text-lien-muted", children: g }),
                            ],
                          }),
                          r?.stripeCustomerId
                            ? s.jsx("form", {
                                method: "post",
                                action: "/api/admin/billing/portal",
                                className: "mt-4",
                                children: s.jsx("button", { className: "lien-button-secondary min-h-11 px-5 text-sm", type: "submit", children: "支払い・解約を管理" }),
                              })
                            : s.jsx("p", { className: "mt-4 text-xs leading-5 text-lien-muted", children: "既存店舗には、この更新だけでカード登録を要求しません。" }),
                        ],
                      }),
                    ],
                  }),
                  s.jsx("p", { className: "mt-5 text-xs leading-5 text-lien-muted", children: "Stripeで実課金するのは基本月額プランのみです。SMSは現在の利用件数に基づく概算表示で、このStripe Subscriptionには含めていません。" }),
                ],
              }),
              (0, s.jsxs)(f.IP, {
                children: [
                  (0, s.jsxs)("div", {
                    className: "flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between",
                    children: [
                      (0, s.jsxs)("div", { children: [s.jsx("p", { className: "text-xs font-semibold text-lien-primary", children: "This month" }), s.jsx("h2", { className: "mt-1 text-xl font-semibold text-lien-ink", children: "当月の利用明細" })] }),
                      s.jsx("p", { className: "text-xs text-lien-muted", children: "毎月1日〜末日で集計" }),
                    ],
                  }),
                  s.jsx("div", {
                    className: "mt-5 divide-y divide-[#eaded5] overflow-hidden rounded-2xl border border-lien",
                    children: [
                      [`${o?.displayName || "竹"}プラン 基本利用料`, "1か月", d],
                      ["メール配信", `${Number(t || 0).toLocaleString("ja-JP")}通`, 0],
                      ["SMS配信", `${Number(e || 0).toLocaleString("ja-JP")}通 × ${c}円`, u],
                    ].map((e) => (0, s.jsxs)("div", {
                      className: "grid grid-cols-[1fr_auto] items-center gap-4 bg-white px-4 py-4 sm:px-5",
                      children: [(0, s.jsxs)("div", { children: [s.jsx("p", { className: "font-semibold text-lien-ink", children: e[0] }), s.jsx("p", { className: "mt-1 text-xs text-lien-muted", children: e[1] })] }), s.jsx("p", { className: "font-semibold tabular-nums text-lien-ink", children: `${Number(e[2]).toLocaleString("ja-JP")}円` })],
                    }, e[0])),
                  }),
                ],
              }),
              (0, s.jsxs)("section", {
                children: [
                  s.jsx("h2", { className: "text-xl font-semibold text-lien-ink", children: "松・竹・梅プラン" }),
                  s.jsx("p", { className: "mt-1 text-sm text-lien-muted", children: "現在の契約プランと、各プランの利用上限を確認できます。" }),
                  s.jsx("div", {
                    className: "mt-4 grid gap-4 lg:grid-cols-3",
                    children: i.map((e) => {
                      let t = e.planKey === l,
                        r = (e) => null == e ? "無制限" : Number(e).toLocaleString("ja-JP");
                      return (0, s.jsxs)("article", {
                        className: `relative rounded-[24px] border p-5 shadow-lien-sm ${t ? "border-[#9b5142] bg-[#fff8f3]" : "border-lien bg-white"}`,
                        children: [
                          t ? s.jsx("span", { className: "absolute right-4 top-4 rounded-full bg-[#9b5142] px-3 py-1 text-xs font-semibold text-white", children: "現在のプラン" }) : null,
                          s.jsx("p", { className: "text-2xl font-semibold text-lien-primary", children: `${e.displayName}プラン` }),
                          (0, s.jsxs)("p", { className: "mt-3 text-3xl font-semibold tabular-nums text-lien-ink", children: [Number(e.monthlyAmount).toLocaleString("ja-JP"), s.jsx("span", { className: "ml-1 text-sm font-medium text-lien-muted", children: "円／月" })] }),
                          s.jsx("ul", { className: "mt-5 grid gap-2 text-sm text-lien-muted", children: [null == e.staffLimit ? "スタッフ 無制限" : `スタッフ ${r(e.staffLimit)}名`, null == e.customerLimit ? "顧客 無制限" : `顧客 ${r(e.customerLimit)}名`, null == e.emailLimit ? "メール配信 無制限" : `メール配信 ${r(e.emailLimit)}通／月`, null == e.smsLimit ? "SMS配信 無制限" : `SMS配信 ${r(e.smsLimit)}通／月`].map((e) => s.jsx("li", { children: `✓ ${e}` }, e)) }),
                        ],
                      }, e.planKey);
                    }),
                  }),
                ],
              }),
            ],
          });
        }
        async function w({ searchParams: e }) {
          var t, r;
          let d = await (0, j.eU)();
          (d || (0, a.redirect)("/admin/login?next=/admin/owner-analytics"),
            ("ADMIN" === d.role && d.organizationId) ||
              (0, a.redirect)("/admin/customers"));
          if ("billing" === e?.section) {
            let t = new Date(),
              r = new Date(t.getFullYear(), t.getMonth(), 1),
              [a, i, l, o] = await Promise.all([
                z._.contactLog.count({
                  where: { channel: "SMS", createdAt: { gte: r }, customer: { organizationId: d.organizationId } },
                }),
                z._.contactLog.count({
                  where: { channel: "メール", createdAt: { gte: r }, customer: { organizationId: d.organizationId } },
                }),
                z._.$queryRawUnsafe(
                  'SELECT b.*, p."displayName", p."monthlyAmount", p."currency", p."staffLimit", p."customerLimit", p."emailLimit", p."smsLimit" FROM "OrganizationBilling" b JOIN "BillingPlan" p ON p."planKey"=b."planKey" WHERE b."organizationId"=$1 LIMIT 1',
                  d.organizationId,
                ),
                z._.$queryRawUnsafe(
                  'SELECT "planKey", "displayName", "monthlyAmount", "currency", "staffLimit", "customerLimit", "emailLimit", "smsLimit" FROM "BillingPlan" WHERE "active"=true ORDER BY "sortOrder" ASC',
                ),
              ]);
            return s.jsx(S, { smsCount: a, emailCount: i, billing: l[0] || null, plans: o });
          }
                    let g = (0, y.n7)(e?.period),
            w = await (0, y.m2)(g, "actual", d.organizationId),
            k =
              ((t = w.summary.currentRevenue),
              (r = w.summary.previousRevenue) <= 0
                ? t > 0
                  ? 100
                  : 0
                : Math.round(((t - r) / r) * 100)),
            P = Math.max(0, ...w.months.map((e) => e.revenue)),
            _ = Math.max(0, ...w.staffPerformance.map((e) => e.revenue)),
            M = Math.max(0, ...w.menuBreakdown.map((e) => e.revenue));
          return (0, s.jsxs)("div", {
            className: "mx-auto grid max-w-7xl gap-6",
            children: [
              s.jsx(T, { active: "analytics" }),
              s.jsx(f.mr, {
                eyebrow: (0, s.jsxs)("span", {
                  className: "inline-flex items-center gap-2",
                  children: [
                    s.jsx(i.Z, { className: "h-3.5 w-3.5" }),
                    "Business analytics",
                  ],
                }),
                title: "経営分析",
                description:
                  "店舗全体の売上、客数、スタッフ実績、顧客構成を実データからまとめています。",
                secondaryAction: (0, s.jsxs)("form", {
                  action: "/admin/owner-analytics",
                  className: "flex items-center gap-2",
                  children: [
                    s.jsx("label", {
                      className: "text-xs font-semibold text-lien-muted",
                      htmlFor: "analytics-period",
                      children: "集計期間",
                    }),
                    (0, s.jsxs)("select", {
                      id: "analytics-period",
                      name: "period",
                      defaultValue: String(g),
                      className:
                        "h-10 rounded-full border border-lien bg-white px-4 text-sm font-semibold",
                      children: [
                        s.jsx("option", { value: "6", children: "6か月" }),
                        s.jsx("option", { value: "12", children: "12か月" }),
                        s.jsx("option", { value: "24", children: "24か月" }),
                      ],
                    }),
                    s.jsx("button", {
                      className:
                        "lien-button-secondary h-10 min-h-10 px-3 text-xs",
                      type: "submit",
                      children: "表示",
                    }),
                  ],
                }),
              }),
              (0, s.jsxs)("section", {
                className: "grid gap-3 sm:grid-cols-2 xl:grid-cols-5",
                children: [
                  s.jsx(f.i9, {
                    label: "今月の売上",
                    value: w.summary.currentRevenue.toLocaleString("ja-JP"),
                    unit: "円",
                    icon: l.Z,
                    tone: "premium",
                    helper: `前月比 ${k >= 0 ? "+" : ""}${k}%`,
                  }),
                  s.jsx(f.i9, {
                    label: "今月の会計客数",
                    value: w.summary.currentPaidCustomerCount,
                    unit: "人",
                    icon: o.Z,
                    helper: `前月 ${w.summary.previousPaidCustomerCount}人`,
                  }),
                  s.jsx(f.i9, {
                    label: "平均客単価",
                    value:
                      w.summary.currentAverageSpend.toLocaleString("ja-JP"),
                    unit: "円",
                    icon: c,
                    tone: "highlight",
                    helper: "今月の会計から算出",
                  }),
                  s.jsx(f.i9, {
                    label: "再来客率",
                    value: w.summary.currentRepeatRate,
                    unit: "%",
                    icon: u,
                    tone: "success",
                    helper: `新規 ${w.summary.currentNewPaidCustomerCount}人 / 再来 ${w.summary.currentRepeatPaidCustomerCount}人`,
                  }),
                  s.jsx(f.i9, {
                    label: "平均来店サイクル",
                    value: w.summary.averageVisitCycleDays || "-",
                    unit: w.summary.averageVisitCycleDays ? "日" : void 0,
                    icon: m,
                    tone: "soft",
                    helper:
                      w.summary.visitCycleIntervalCount > 0
                        ? `${w.summary.visitCycleIntervalCount}件の来店間隔から算出`
                        : "2回以上の来店履歴が必要です",
                  }),
                ],
              }),
              (0, s.jsxs)(f.IP, {
                children: [
                  (0, s.jsxs)("div", {
                    className:
                      "flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between",
                    children: [
                      (0, s.jsxs)("div", {
                        children: [
                          s.jsx("p", {
                            className:
                              "text-xs font-semibold text-lien-primary",
                            children: "Revenue trend",
                          }),
                          s.jsx("h2", {
                            className:
                              "mt-1 text-xl font-semibold text-lien-ink",
                            children: "店舗売上の推移",
                          }),
                        ],
                      }),
                      s.jsx("p", {
                        className: "text-xs text-lien-muted",
                        children: "会計済み売上のみ集計",
                      }),
                    ],
                  }),
                  s.jsx("div", {
                    className: "mt-6 overflow-x-auto pb-2",
                    children: s.jsx("div", {
                      className: "flex min-w-[680px] items-end gap-3",
                      style: { height: "240px" },
                      children: w.months.map((e) => {
                        let t =
                          P > 0
                            ? Math.max(4, Math.round((e.revenue / P) * 180))
                            : 4;
                        return (0, s.jsxs)(
                          "div",
                          {
                            className:
                              "flex min-w-0 flex-1 flex-col items-center justify-end gap-2",
                            children: [
                              s.jsx("span", {
                                className:
                                  "text-[10px] font-semibold tabular-nums text-lien-muted",
                                children:
                                  e.revenue > 0
                                    ? `${Math.round(e.revenue / 1e4)}万`
                                    : "0",
                              }),
                              s.jsx("div", {
                                className:
                                  "w-full max-w-12 rounded-t-xl bg-gradient-to-t from-[#8f4f42] to-[#d3a08f]",
                                style: { height: t },
                              }),
                              s.jsx("span", {
                                className:
                                  "text-[11px] font-semibold text-lien-muted",
                                children: e.shortLabel,
                              }),
                            ],
                          },
                          e.key,
                        );
                      }),
                    }),
                  }),
                ],
              }),
              (0, s.jsxs)("section", {
                className: "grid gap-6 xl:grid-cols-[1.15fr_0.85fr]",
                children: [
                  (0, s.jsxs)(f.IP, {
                    children: [
                      (0, s.jsxs)("div", {
                        className: "flex items-center justify-between gap-3",
                        children: [
                          (0, s.jsxs)("div", {
                            children: [
                              s.jsx("p", {
                                className:
                                  "text-xs font-semibold text-lien-primary",
                                children: "Staff performance",
                              }),
                              s.jsx("h2", {
                                className:
                                  "mt-1 text-xl font-semibold text-lien-ink",
                                children: "スタッフ別売上",
                              }),
                            ],
                          }),
                          s.jsx(x, { className: "h-5 w-5 text-[#d8b56d]" }),
                        ],
                      }),
                      (0, s.jsxs)("div", {
                        className: "mt-5 grid gap-4",
                        children: [
                          w.staffPerformance.map((e, t) =>
                            (0, s.jsxs)(
                              "div",
                              {
                                className:
                                  "rounded-2xl border border-lien bg-[#fffdf9] p-4",
                                children: [
                                  (0, s.jsxs)("div", {
                                    className:
                                      "flex items-start justify-between gap-4",
                                    children: [
                                      (0, s.jsxs)("div", {
                                        className:
                                          "flex min-w-0 items-center gap-3",
                                        children: [
                                          s.jsx("span", {
                                            className: `grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-semibold ${0 === t ? "bg-[#d8b56d] text-white" : "bg-[#f1e7df] text-[#8f4f42]"}`,
                                            children: t + 1,
                                          }),
                                          (0, s.jsxs)("div", {
                                            className: "min-w-0",
                                            children: [
                                              s.jsx("p", {
                                                className:
                                                  "truncate font-semibold text-lien-ink",
                                                children: e.label,
                                              }),
                                              (0, s.jsxs)("p", {
                                                className:
                                                  "mt-1 text-xs text-lien-muted",
                                                children: [
                                                  "会計 ",
                                                  e.saleCount,
                                                  "件 / 担当来店 ",
                                                  e.visitCount,
                                                  "件 / 顧客 ",
                                                  e.customerCount,
                                                  "人",
                                                ],
                                              }),
                                            ],
                                          }),
                                        ],
                                      }),
                                      (0, s.jsxs)("div", {
                                        className: "shrink-0 text-right",
                                        children: [
                                          s.jsx("p", {
                                            className:
                                              "font-semibold tabular-nums text-lien-ink",
                                            children: b(e.revenue),
                                          }),
                                          (0, s.jsxs)("p", {
                                            className:
                                              "mt-1 text-xs tabular-nums text-lien-muted",
                                            children: [
                                              "平均 ",
                                              b(e.averageSpend),
                                            ],
                                          }),
                                        ],
                                      }),
                                    ],
                                  }),
                                  s.jsx(v, { value: e.revenue, max: _ }),
                                ],
                              },
                              e.label,
                            ),
                          ),
                          0 === w.staffPerformance.length
                            ? s.jsx("p", {
                                className:
                                  "py-8 text-center text-sm text-lien-muted",
                                children:
                                  "集計できる担当付き売上がありません。",
                              })
                            : null,
                        ],
                      }),
                    ],
                  }),
                  (0, s.jsxs)(f.IP, {
                    children: [
                      s.jsx("p", {
                        className: "text-xs font-semibold text-lien-primary",
                        children: "Customer value",
                      }),
                      s.jsx("h2", {
                        className: "mt-1 text-xl font-semibold text-lien-ink",
                        children: "トップ顧客",
                      }),
                      (0, s.jsxs)("div", {
                        className: "mt-5 grid gap-2",
                        children: [
                          w.topCustomers.map((e, t) =>
                            (0, s.jsxs)(
                              n.default,
                              {
                                href: `/admin/customers/${e.customerId}`,
                                className:
                                  "flex items-center gap-3 rounded-2xl border border-transparent p-3 transition hover:border-lien hover:bg-[#fffaf5]",
                                children: [
                                  s.jsx("span", {
                                    className:
                                      "grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f1e7df] text-sm font-semibold text-[#8f4f42]",
                                    children: t + 1,
                                  }),
                                  (0, s.jsxs)("div", {
                                    className: "min-w-0 flex-1",
                                    children: [
                                      s.jsx("p", {
                                        className:
                                          "truncate text-sm font-semibold text-lien-ink",
                                        children: e.customerName,
                                      }),
                                      (0, s.jsxs)("p", {
                                        className:
                                          "mt-1 text-xs text-lien-muted",
                                        children: [
                                          "会計 ",
                                          e.saleCount,
                                          "件 / 来店 ",
                                          e.visitCount,
                                          "件",
                                        ],
                                      }),
                                    ],
                                  }),
                                  s.jsx("p", {
                                    className:
                                      "shrink-0 text-sm font-semibold tabular-nums text-lien-ink",
                                    children: b(e.revenue),
                                  }),
                                ],
                              },
                              e.customerId,
                            ),
                          ),
                          0 === w.topCustomers.length
                            ? s.jsx("p", {
                                className:
                                  "py-8 text-center text-sm text-lien-muted",
                                children: "集計できる売上がありません。",
                              })
                            : null,
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              (0, s.jsxs)("section", {
                className: "grid gap-6 lg:grid-cols-2",
                children: [
                  s.jsx(N, { title: "年齢層", items: w.ageBreakdown }),
                  s.jsx(N, { title: "男女比率", items: w.genderBreakdown }),
                ],
              }),
              (0, s.jsxs)("section", {
                className: "grid gap-6 xl:grid-cols-[1fr_0.9fr]",
                children: [
                  (0, s.jsxs)(f.IP, {
                    children: [
                      (0, s.jsxs)("div", {
                        className: "flex items-center justify-between gap-3",
                        children: [
                          s.jsx("h2", {
                            className: "text-lg font-semibold text-lien-ink",
                            children: "売上メニュー構成",
                          }),
                          s.jsx(p, { className: "h-5 w-5 text-lien-primary" }),
                        ],
                      }),
                      s.jsx("div", {
                        className: "mt-5 grid gap-4",
                        children: w.menuBreakdown.map((e) =>
                          (0, s.jsxs)(
                            "div",
                            {
                              children: [
                                (0, s.jsxs)("div", {
                                  className:
                                    "flex items-center justify-between gap-3 text-sm",
                                  children: [
                                    s.jsx("span", {
                                      className:
                                        "truncate font-medium text-lien-ink",
                                      children: e.label,
                                    }),
                                    (0, s.jsxs)("span", {
                                      className:
                                        "shrink-0 tabular-nums text-lien-muted",
                                      children: [
                                        b(e.revenue),
                                        " / ",
                                        e.count,
                                        "件",
                                      ],
                                    }),
                                  ],
                                }),
                                s.jsx(v, { value: e.revenue, max: M }),
                              ],
                            },
                            e.label,
                          ),
                        ),
                      }),
                    ],
                  }),
                  (0, s.jsxs)(f.IP, {
                    children: [
                      s.jsx("h2", {
                        className: "text-lg font-semibold text-lien-ink",
                        children: "店舗の現在地",
                      }),
                      (0, s.jsxs)("div", {
                        className: "mt-5 grid gap-3 sm:grid-cols-2",
                        children: [
                          (0, s.jsxs)("div", {
                            className: "rounded-2xl bg-[#f8f2eb] p-4",
                            children: [
                              s.jsx(m, {
                                className: "h-5 w-5 text-lien-primary",
                              }),
                              (0, s.jsxs)("p", {
                                className:
                                  "mt-3 text-2xl font-semibold tabular-nums",
                                children: [
                                  w.summary.upcomingAppointmentCount,
                                  s.jsx("span", {
                                    className: "ml-1 text-sm",
                                    children: "件",
                                  }),
                                ],
                              }),
                              s.jsx("p", {
                                className: "mt-1 text-xs text-lien-muted",
                                children: "今後30日の予約",
                              }),
                            ],
                          }),
                          (0, s.jsxs)("div", {
                            className: "rounded-2xl bg-[#f8f2eb] p-4",
                            children: [
                              s.jsx(h.Z, {
                                className: "h-5 w-5 text-lien-primary",
                              }),
                              (0, s.jsxs)("p", {
                                className:
                                  "mt-3 text-2xl font-semibold tabular-nums",
                                children: [
                                  w.summary.totalRegisteredCustomers,
                                  s.jsx("span", {
                                    className: "ml-1 text-sm",
                                    children: "人",
                                  }),
                                ],
                              }),
                              s.jsx("p", {
                                className: "mt-1 text-xs text-lien-muted",
                                children: "実運用顧客",
                              }),
                            ],
                          }),
                          (0, s.jsxs)("div", {
                            className:
                              "rounded-2xl bg-[#f8f2eb] p-4 sm:col-span-2",
                            children: [
                              s.jsx(l.Z, {
                                className: "h-5 w-5 text-lien-primary",
                              }),
                              s.jsx("p", {
                                className:
                                  "mt-3 text-2xl font-semibold tabular-nums",
                                children: b(w.summary.lifetimeRevenue),
                              }),
                              (0, s.jsxs)("p", {
                                className: "mt-1 text-xs text-lien-muted",
                                children: [
                                  "累計売上 / 会計 ",
                                  w.summary.lifetimeSaleCount,
                                  "件",
                                ],
                              }),
                            ],
                          }),
                        ],
                      }),
                      (0, s.jsxs)("div", {
                        className: "mt-4 flex flex-wrap gap-2",
                        children: [
                          (0, s.jsxs)(f.OE, {
                            tone: "success",
                            children: [
                              "電話登録 ",
                              w.dataStatus.customersWithPhoneCount,
                              "人",
                            ],
                          }),
                          (0, s.jsxs)(f.OE, {
                            tone: "highlight",
                            children: [
                              "来店履歴あり ",
                              w.dataStatus.customersWithVisitCount,
                              "人",
                            ],
                          }),
                          (0, s.jsxs)(f.OE, {
                            tone: "default",
                            children: [
                              "売上履歴あり ",
                              w.dataStatus.customersWithSaleCount,
                              "人",
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          });
        }
      },
      40430: (e, t, r) => {
        "use strict";
        r.d(t, { Z: () => d });
        var s = r(71159);
        let n = (...e) =>
            e
              .filter((e, t, r) => !!e && "" !== e.trim() && r.indexOf(e) === t)
              .join(" ")
              .trim(),
          a = (e) => e.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(),
          i = (e) =>
            e.replace(/^([A-Z])|[\s-_]+(\w)/g, (e, t, r) =>
              r ? r.toUpperCase() : t.toLowerCase(),
            ),
          l = (e) => {
            let t = i(e);
            return t.charAt(0).toUpperCase() + t.slice(1);
          },
          o = (0, r(68570).createProxy)(
            String.raw`/app/node_modules/lucide-react/dist/esm/Icon.mjs#default`,
          ),
          d = (e, t) => {
            let r = (0, s.forwardRef)(({ className: r, ...i }, d) =>
              (0, s.createElement)(o, {
                ref: d,
                iconNode: t,
                className: n(`lucide-${a(l(e))}`, `lucide-${e}`, r),
                ...i,
              }),
            );
            return ((r.displayName = l(e)), r);
          };
      },
      38676: (e, t, r) => {
        "use strict";
        r.d(t, { Z: () => s });
        let s = (0, r(40430).Z)("chart-column", [
          ["path", { d: "M3 3v16a2 2 0 0 0 2 2h16", key: "c24i48" }],
          ["path", { d: "M18 17V9", key: "2bz60n" }],
          ["path", { d: "M13 17V5", key: "1frdt8" }],
          ["path", { d: "M8 17v-3", key: "17ska0" }],
        ]);
      },
      68059: (e, t, r) => {
        "use strict";
        r.d(t, { Z: () => s });
        let s = (0, r(40430).Z)("users-round", [
          ["path", { d: "M18 21a8 8 0 0 0-16 0", key: "3ypg7q" }],
          ["circle", { cx: "10", cy: "8", r: "5", key: "o932ke" }],
          [
            "path",
            { d: "M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3", key: "10s06x" },
          ],
        ]);
      },
    }));
  var t = require("../../../webpack-runtime.js");
  t.C(e);
  var r = (e) => t((t.s = e)),
    s = t.X(0, [9380, 4108, 2159, 3914, 1425, 1759], () => r(43738));
  module.exports = s;
})();
