(() => {
  var e = {};
  ((e.id = 1163),
    (e.ids = [1163]),
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
      9296: (e, s, t) => {
        "use strict";
        t.a(e, async (e, r) => {
          try {
            (t.r(s),
              t.d(s, {
                GlobalError: () => o.a,
                __next_app__: () => h,
                originalPathname: () => p,
                pages: () => x,
                routeModule: () => g,
                tree: () => u,
              }),
              t(95239));
            var n = t(32029);
            t(35866);
            var a = t(23191),
              i = t(88716),
              l = t(37922),
              o = t.n(l),
              c = t(95231),
              d = {};
            for (let e in c)
              0 >
                [
                  "default",
                  "tree",
                  "pages",
                  "GlobalError",
                  "originalPathname",
                  "__next_app__",
                  "routeModule",
                ].indexOf(e) && (d[e] = () => c[e]);
            t.d(s, d);
            var m = e([n]);
            n = (m.then ? (await m)() : m)[0];
            let u = [
                "",
                {
                  children: [
                    "admin",
                    {
                      children: [
                        "customers",
                        {
                          children: [
                            "messages",
                            {
                              children: [
                                "__PAGE__",
                                {},
                                {
                                  page: [
                                    () =>
                                      Promise.resolve().then(t.bind(t, 95239)),
                                    "/app/src/app/admin/customers/messages/page.tsx",
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
                {
                  layout: [
                    () => Promise.resolve().then(t.bind(t, 32029)),
                    "/app/src/app/layout.tsx",
                  ],
                  "not-found": [
                    () => Promise.resolve().then(t.t.bind(t, 35866, 23)),
                    "next/dist/client/components/not-found-error",
                  ],
                },
              ],
              x = ["/app/src/app/admin/customers/messages/page.tsx"],
              p = "/admin/customers/messages/page",
              h = { require: t, loadChunk: () => Promise.resolve() },
              g = new a.AppPageRouteModule({
                definition: {
                  kind: i.x.APP_PAGE,
                  page: "/admin/customers/messages/page",
                  pathname: "/admin/customers/messages",
                  bundlePath: "",
                  filename: "",
                  appPaths: [],
                },
                userland: { loaderTree: u },
              });
            r();
          } catch (e) {
            r(e);
          }
        });
      },
      75324: (e, s, t) => {
        (Promise.resolve().then(t.bind(t, 2430)),
          Promise.resolve().then(t.t.bind(t, 79404, 23)),
          Promise.resolve().then(t.bind(t, 98594)));
      },
      98594: (e, s, t) => {
        "use strict";
        t.d(s, { ConfirmSubmitButton: () => a });
        var r = t(10326),
          n = t(60962);
        function a({
          children: e,
          message: s,
          className: t,
          pendingText: a = "処理中...",
        }) {
          let { pending: i } = (0, n.useFormStatus)();
          return r.jsx("button", {
            type: "submit",
            disabled: i,
            "aria-busy": i,
            className: `${t ?? ""} disabled:pointer-events-none disabled:opacity-60`,
            onClick: (e) => {
              if (i) {
                e.preventDefault();
                return;
              }
              let t = e.currentTarget.form;
              (!t || t.checkValidity()) &&
                (window.confirm(s) || e.preventDefault());
            },
            children: i ? a : e,
          });
        }
      },
      57371: (e, s, t) => {
        "use strict";
        t.d(s, { default: () => n.a });
        var r = t(670),
          n = t.n(r);
      },
      670: (e, s, t) => {
        "use strict";
        let { createProxy: r } = t(68570);
        e.exports = r("/app/node_modules/next/dist/client/link.js");
      },
      95239: (e, s, t) => {
        "use strict";
        (t.r(s), t.d(s, { default: () => j, dynamic: () => b }));
        var r = t(19510),
          n = t(57371),
          a = t(18690),
          i = t(56247),
          l = t(40430);
        let o = (0, l.Z)("funnel", [
          [
            "path",
            {
              d: "M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z",
              key: "sc7q7i",
            },
          ],
        ]);
        var c = t(97867);
        let d = (0, l.Z)("send", [
          [
            "path",
            {
              d: "M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z",
              key: "1ffxy3",
            },
          ],
          ["path", { d: "m21.854 2.147-10.94 10.939", key: "12cjpa" }],
        ]);
        var m = t(68059),
          u = t(47015),
          x = t(35381),
          p = t(90878),
          h = t(17403),
          g = t(59219),
          f = t(13538);
        let b = "force-dynamic";
        async function j({ searchParams: e }) {
          let s = await (0, g.Os)(["ADMIN"]);
          if (!s.organizationId) return null;
          let [t, l, b, R, U] = await Promise.all([
            f._.organization.findUnique({
              where: { id: s.organizationId },
              select: {
                defaultCouponDiscountRate: !0,
                couponDefaultValidDays: !0,
                couponMaxValidDays: !0,
                couponMinimumDiscountRate: !0,
                couponMaximumDiscountRate: !0,
              },
            }),
            f._.customer.findMany({
              where: { organizationId: s.organizationId, deletedAt: null },
              orderBy: [{ name: "asc" }, { updatedAt: "desc" }],
              select: {
                id: !0,
                name: !0,
                phone: !0,
                gender: !0,
                birthDate: !0,
                birthYear: !0,
              },
            }),
            f._.customerBroadcast.findMany({
              where: { organizationId: s.organizationId },
              orderBy: { sentAt: "desc" },
              take: 20,
              select: {
                id: !0,
                title: !0,
                body: !0,
                audienceGender: !0,
                audienceMinAge: !0,
                audienceMaxAge: !0,
                audienceMatchedCount: !0,
                couponEnabled: !0,
                couponTitle: !0,
                couponDiscountRate: !0,
                couponValidDays: !0,
                sentAt: !0,
              },
            }),
            h.listAutomatedCouponRules(s.organizationId),
            h.listSalonMenus(s.organizationId),
          ]);
          if (!t) return null;
          let j = l.filter((e) =>
              /女性|female|woman|^f$/i.test(e.gender ?? ""),
            ).length,
            v = l.filter(
              (e) =>
                /男性|male|man|^m$/i.test(e.gender ?? "") &&
                !/female|woman/i.test(e.gender ?? ""),
            ).length,
            N = l.filter((e) => e.birthDate || e.birthYear).length,
            y = Number(e?.count ?? 0);
          return (0, r.jsxs)("div", {
            className: "mx-auto grid w-full max-w-6xl gap-6",
            children: [
              r.jsx(u.Z, { active: "messages" }),
              r.jsx(p.mr, {
                eyebrow: (0, r.jsxs)("span", {
                  className: "inline-flex items-center gap-2",
                  children: [
                    r.jsx(a.Z, { className: "h-4 w-4" }),
                    "Customer message",
                  ],
                }),
                title: "顧客へのお知らせ・クーポン配信",
                description:
                  "対象顧客と配信方法を選び、アプリ内・登録メール・SMSへお知らせを届けます。クーポンを付けると対象者ごとに個別コードを発行します。",
                breadcrumb: r.jsx(n.default, {
                  href: "/admin/customers",
                  className: "hover:text-lien-primary",
                  children: "顧客・ポイント / 配信",
                }),
              }),
              e?.notice === "sent"
                ? (0, r.jsxs)("div", {
                    role: "status",
                    className:
                      "flex items-center gap-3 rounded-[18px] border border-[#cbdcc8] bg-[#eef5ed] px-4 py-3 text-sm font-semibold text-[#405d41]",
                    children: [
                      r.jsx(i.Z, { className: "h-5 w-5" }),
                      y.toLocaleString("ja-JP"),
                      "名へ配信しました。",
                    ],
                  })
                : null,
              r.jsx("section", {
                className: "grid gap-3 sm:grid-cols-4",
                children: [
                  ["登録顧客", l.length],
                  ["女性", j],
                  ["男性", v],
                  ["年齢登録済み", N],
                ].map(([e, s]) =>
                  (0, r.jsxs)(
                    "div",
                    {
                      className:
                        "rounded-[18px] border border-lien bg-white p-4 shadow-lien-sm",
                      children: [
                        r.jsx("p", {
                          className: "text-xs font-semibold text-lien-muted",
                          children: e,
                        }),
                        (0, r.jsxs)("p", {
                          className: "mt-2 text-2xl font-semibold tabular-nums",
                          children: [
                            Number(s).toLocaleString("ja-JP"),
                            r.jsx("span", {
                              className: "ml-1 text-xs",
                              children: "名",
                            }),
                          ],
                        }),
                      ],
                    },
                    String(e),
                  ),
                ),
              }),
              (0, r.jsxs)("form", {
                action: h.createCustomerBroadcastAction,
                className:
                  "grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start",
                children: [
                  (0, r.jsxs)(p.IP, {
                    children: [
                      (0, r.jsxs)("div", {
                        className: "flex items-start gap-3",
                        children: [
                          r.jsx("span", {
                            className:
                              "grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-lien-soft text-lien-primary",
                            children: r.jsx(a.Z, { className: "h-5 w-5" }),
                          }),
                          (0, r.jsxs)("div", {
                            children: [
                              r.jsx("h2", {
                                className: "text-lg font-semibold",
                                children: "配信内容",
                              }),
                              r.jsx("p", {
                                className:
                                  "mt-1 text-sm leading-6 text-lien-muted",
                                children:
                                  "お客様アプリ内に表示する件名と本文です。",
                              }),
                            ],
                          }),
                        ],
                      }),
                      (0, r.jsxs)("div", {
                        className: "mt-5 grid gap-4",
                        children: [
                          (0, r.jsxs)("label", {
                            className: "grid gap-2 text-sm font-semibold",
                            children: [
                              "件名",
                              r.jsx("input", {
                                className: "lien-input",
                                name: "title",
                                maxLength: 60,
                                placeholder: "例: 秋のヘアケアのお知らせ",
                                required: !0,
                              }),
                            ],
                          }),
                          (0, r.jsxs)("label", {
                            className: "grid gap-2 text-sm font-semibold",
                            children: [
                              "本文",
                              r.jsx("textarea", {
                                className:
                                  "lien-input min-h-36 resize-y py-3 leading-7",
                                name: "body",
                                maxLength: 500,
                                placeholder:
                                  "お客様へ伝えたい内容を入力してください。",
                                required: !0,
                              }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
                  (0, r.jsxs)(p.IP, {
                    children: [
                      (0, r.jsxs)("div", {
                        className: "flex items-start gap-3",
                        children: [
                          r.jsx(o, {
                            className:
                              "mt-0.5 h-5 w-5 shrink-0 text-lien-primary",
                          }),
                          (0, r.jsxs)("div", {
                            children: [
                              r.jsx("h2", {
                                className: "font-semibold",
                                children: "配信対象",
                              }),
                              r.jsx("p", {
                                className:
                                  "mt-1 text-xs leading-5 text-lien-muted",
                                children:
                                  "未設定の年齢は年齢指定時に対象外です。",
                              }),
                            ],
                          }),
                        ],
                      }),
                      (0, r.jsxs)("div", {
                        className: "mt-4 grid gap-4",
                        children: [
                          (0, r.jsxs)("fieldset", {
                            className: "grid gap-2",
                            children: [
                              r.jsx("legend", {
                                className: "text-sm font-semibold",
                                children: "配信方法",
                              }),
                              (0, r.jsxs)("div", {
                                className: "grid grid-cols-3 gap-2",
                                children: [
                                  ["app", "アプリ内", "お客様アプリの受信ボックスへ配信"],
                                  ["email", "登録メール", "顧客アカウントの登録メールへ配信"],
                                  ["sms", "SMS", "本人確認済み携帯番号へ配信（通信料が発生）"],
                                ].map((e) =>
                                  (0, r.jsxs)(
                                    "label",
                                    {
                                      className:
                                        "grid min-h-16 cursor-pointer grid-cols-[auto_1fr] items-center gap-2 rounded-[14px] border border-[color:var(--lien-border)] bg-white px-2.5 py-2",
                                      children: [
                                        r.jsx("input", {
                                          type: "radio",
                                          name: "deliveryMethod",
                                          value: e[0],
                                          defaultChecked: "app" === e[0],
                                          className: "h-4 w-4 shrink-0",
                                        }),
                                        (0, r.jsxs)("span", {
                                          className: "min-w-0",
                                          children: [
                                            r.jsx("span", {
                                              className: "block text-sm font-semibold",
                                              children: e[1],
                                            }),
                                            r.jsx("span", {
                                              className: "hidden",
                                              children: e[2],
                                            }),
                                          ],
                                        }),
                                      ],
                                    },
                                    e[0],
                                  ),
                                ),
                              }),
                            ],
                          }),
                          (0, r.jsxs)("label", {
                            className: "grid gap-2 text-sm font-semibold",
                            children: [
                              "性別",
                              (0, r.jsxs)("select", {
                                className: "lien-select",
                                name: "audienceGender",
                                defaultValue: "all",
                                children: [
                                  r.jsx("option", {
                                    value: "all",
                                    children: "すべて",
                                  }),
                                  r.jsx("option", {
                                    value: "female",
                                    children: "女性",
                                  }),
                                  r.jsx("option", {
                                    value: "male",
                                    children: "男性",
                                  }),
                                  r.jsx("option", {
                                    value: "other",
                                    children: "その他・未設定",
                                  }),
                                ],
                              }),
                            ],
                          }),
                          (0, r.jsxs)("div", {
                            className: "grid grid-cols-2 gap-3",
                            children: [
                              (0, r.jsxs)("label", {
                                className: "grid gap-2 text-sm font-semibold",
                                children: [
                                  "年齢 下限",
                                  r.jsx("input", {
                                    className: "lien-input tabular-nums",
                                    name: "audienceMinAge",
                                    type: "number",
                                    min: "0",
                                    max: "120",
                                    placeholder: "指定なし",
                                  }),
                                ],
                              }),
                              (0, r.jsxs)("label", {
                                className: "grid gap-2 text-sm font-semibold",
                                children: [
                                  "年齢 上限",
                                  r.jsx("input", {
                                    className: "lien-input tabular-nums",
                                    name: "audienceMaxAge",
                                    type: "number",
                                    min: "0",
                                    max: "120",
                                    placeholder: "指定なし",
                                  }),
                                ],
                              }),
                            ],
                          }),
                          (0, r.jsxs)("section", {
                            className:
                              "rounded-[16px] border border-[color:var(--lien-border)] bg-[color:var(--lien-surface-soft)] p-3",
                            children: [
                              (0, r.jsxs)("div", {
                                className:
                                  "flex items-center justify-between gap-3",
                                children: [
                                  (0, r.jsxs)("div", {
                                    className: "min-w-0",
                                    children: [
                                      r.jsx("p", {
                                        className:
                                          "text-sm font-semibold text-[color:var(--lien-ink)]",
                                        children: "個別の配信対象",
                                      }),
                                      r.jsx("p", {
                                        id: "broadcast-recipient-count",
                                        className:
                                          "mt-1 text-xs text-[color:var(--lien-muted)]",
                                        children: "個別選択なし（条件配信）",
                                      }),
                                    ],
                                  }),
                                  r.jsx(x.o, {
                                    recipientSelector: !0,
                                    id: "broadcast-recipient-open",
                                    className:
                                      "lien-button-secondary min-h-10 shrink-0 px-4 text-xs",
                                    children: "配信対象を選択",
                                  }),
                                ],
                              }),
                              (0, r.jsxs)("div", {
                                id: "broadcast-recipient-modal",
                                hidden: !0,
                                role: "dialog",
                                "aria-modal": "true",
                                "aria-labelledby":
                                  "broadcast-recipient-modal-title",
                                className:
                                  "fixed inset-0 z-[100] hidden place-items-center bg-stone-950/40 p-4 backdrop-blur-[2px]",
                                style: {
                                  overflowY: "auto",
                                  overscrollBehavior: "contain",
                                },
                                children: [
                                  r.jsx("button", {
                                    id: "broadcast-recipient-backdrop",
                                    type: "button",
                                    className: "absolute inset-0",
                                    "aria-label": "配信対象選択を閉じる",
                                  }),
                                  (0, r.jsxs)("div", {
                                    className:
                                      "relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-[24px] border border-[color:var(--lien-border)] bg-[#fffdf9] shadow-2xl",
                                    style: {
                                      height: "min(85dvh, 52rem)",
                                      maxHeight: "calc(100dvh - 2rem)",
                                    },
                                    children: [
                                      (0, r.jsxs)("div", {
                                        className:
                                          "flex items-start justify-between gap-3 border-b border-[color:var(--lien-border)] p-5",
                                        children: [
                                          (0, r.jsxs)("div", {
                                            children: [
                                              r.jsx("h3", {
                                                id: "broadcast-recipient-modal-title",
                                                className:
                                                  "text-lg font-semibold text-[color:var(--lien-ink)]",
                                                children: "配信対象を選択",
                                              }),
                                              r.jsx("p", {
                                                className:
                                                  "mt-1 text-xs leading-5 text-[color:var(--lien-muted)]",
                                                children:
                                                  "顧客名または電話番号で検索し、配信する顧客にチェックしてください。",
                                              }),
                                            ],
                                          }),
                                          r.jsx("button", {
                                            id: "broadcast-recipient-close",
                                            type: "button",
                                            className:
                                              "lien-icon-button shrink-0",
                                            "aria-label": "閉じる",
                                            children: "×",
                                          }),
                                        ],
                                      }),
                                      r.jsx("div", {
                                        className:
                                          "border-b border-[color:var(--lien-border)] p-4",
                                        children: r.jsx("input", {
                                          id: "broadcast-recipient-search",
                                          type: "search",
                                          className: "lien-input",
                                          placeholder: "顧客名・電話番号で検索",
                                          autoComplete: "off",
                                        }),
                                      }),
                                      r.jsx("div", {
                                        id: "broadcast-recipient-list",
                                        className:
                                          "grid min-h-0 flex-1 gap-2 overflow-y-auto p-4",
                                        style: {
                                          minHeight: 0,
                                          overflowY: "auto",
                                          overscrollBehavior: "contain",
                                          WebkitOverflowScrolling: "touch",
                                        },
                                        children: l.map((e) =>
                                          (0, r.jsxs)(
                                            "label",
                                            {
                                              "data-recipient-search":
                                                `${e.name} ${e.phone ?? ""}`.toLowerCase(),
                                              className:
                                                "broadcast-recipient-row flex cursor-pointer items-center gap-3 rounded-xl border border-[color:var(--lien-border)] bg-white px-3 py-2.5 text-sm transition hover:border-[color:var(--lien-border-strong)]",
                                              children: [
                                                r.jsx("input", {
                                                  type: "checkbox",
                                                  name: "targetCustomerId",
                                                  value: e.id,
                                                  className:
                                                    "h-4 w-4 shrink-0",
                                                }),
                                                (0, r.jsxs)("span", {
                                                  className: "min-w-0",
                                                  children: [
                                                    r.jsx("span", {
                                                      className:
                                                        "block truncate font-semibold text-[color:var(--lien-ink)]",
                                                      children: e.name,
                                                    }),
                                                    r.jsx("span", {
                                                      className:
                                                        "block truncate text-xs text-[color:var(--lien-muted)]",
                                                      children:
                                                        e.phone ||
                                                        "電話番号未登録",
                                                    }),
                                                  ],
                                                }),
                                              ],
                                            },
                                            e.id,
                                          ),
                                        ),
                                      }),
                                      (0, r.jsxs)("div", {
                                        className:
                                          "flex items-center justify-between gap-3 border-t border-[color:var(--lien-border)] p-4",
                                        children: [
                                          r.jsx("span", {
                                            id: "broadcast-recipient-modal-count",
                                            className:
                                              "text-sm font-semibold text-[color:var(--lien-muted)]",
                                            children: "0名選択中",
                                          }),
                                          r.jsx("button", {
                                            id: "broadcast-recipient-done",
                                            type: "button",
                                            className:
                                              "lien-button-primary min-h-10 px-5 text-sm",
                                            children: "選択を完了",
                                          }),
                                        ],
                                      }),
                                    ],
                                  }),
                                ],
                              }),
                              r.jsx("script", {
                                src: "/broadcast-recipient-modal.js",
                              }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
                  (0, r.jsxs)(p.IP, {
                    className: "lg:col-span-2",
                    children: [
                      (0, r.jsxs)("label", {
                        className:
                          "flex min-h-12 cursor-pointer items-center gap-3 rounded-[16px] border border-[#e8cfc4] bg-[#fff7f3] px-4 py-3 text-sm font-semibold",
                        children: [
                          r.jsx("input", {
                            name: "couponEnabled",
                            type: "checkbox",
                          }),
                          "クーポンも一緒に配布する",
                        ],
                      }),
                      (0, r.jsxs)("div", {
                        className:
                          "mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5",
                        children: [
                          (0, r.jsxs)("label", {
                            className:
                              "grid gap-2 text-sm font-semibold sm:col-span-2",
                            children: [
                              "クーポン名",
                              r.jsx("input", {
                                className: "lien-input",
                                name: "couponTitle",
                                maxLength: 60,
                                placeholder: "例: カラーケア限定クーポン",
                              }),
                            ],
                          }),
                          (0, r.jsxs)("label", {
                            className: "grid gap-2 text-sm font-semibold",
                            children: [
                              "対象メニュー",
                              r.jsx("input", {
                                className: "lien-input",
                                name: "couponTargetMenu",
                                maxLength: 40,
                                placeholder: "例: トリートメント",
                              }),
                            ],
                          }),
                          (0, r.jsxs)("label", {
                            className: "grid gap-2 text-sm font-semibold",
                            children: [
                              "割引率",
                              (0, r.jsxs)("span", {
                                className: "flex items-center gap-2",
                                children: [
                                  r.jsx("input", {
                                    className: "lien-input tabular-nums",
                                    name: "couponDiscountRate",
                                    type: "number",
                                    min: t.couponMinimumDiscountRate,
                                    max: t.couponMaximumDiscountRate,
                                    defaultValue: t.defaultCouponDiscountRate,
                                  }),
                                  r.jsx("span", { children: "%" }),
                                ],
                              }),
                            ],
                          }),
                          (0, r.jsxs)("label", {
                            className: "grid gap-2 text-sm font-semibold",
                            children: [
                              "有効日数",
                              (0, r.jsxs)("span", {
                                className: "flex items-center gap-2",
                                children: [
                                  r.jsx("input", {
                                    className: "lien-input tabular-nums",
                                    name: "couponValidDays",
                                    type: "number",
                                    min: "1",
                                    max: t.couponMaxValidDays,
                                    defaultValue: t.couponDefaultValidDays,
                                  }),
                                  r.jsx("span", { children: "日" }),
                                ],
                              }),
                            ],
                          }),
                          (0, r.jsxs)("label", {
                            className:
                              "grid gap-2 text-sm font-semibold sm:col-span-2 lg:col-span-5",
                            children: [
                              "クーポン説明",
                              r.jsx("textarea", {
                                className: "lien-input min-h-20 resize-y py-3",
                                name: "couponDescription",
                                maxLength: 200,
                                placeholder:
                                  "利用条件やおすすめ理由を入力できます。",
                              }),
                            ],
                          }),
                        ],
                      }),
                      (0, r.jsxs)("p", {
                        className: "mt-3 text-xs leading-5 text-lien-muted",
                        children: [
                          r.jsx(c.Z, { className: "mr-1 inline h-4 w-4" }),
                          "クーポンを付けない場合、クーポン欄は未入力のままで構いません。",
                        ],
                      }),
                    ],
                  }),
                  r.jsx("div", {
                    className: "lg:col-span-2 flex justify-end",
                    children: (0, r.jsxs)(x.o, {
                      className:
                        "lien-button-primary min-h-12 w-full px-6 sm:w-auto",
                      message:
                        "指定した条件の顧客へ配信します。内容と配信条件を確認しましたか？",
                      pendingText: "配信中...",
                      children: [
                        r.jsx(d, { className: "h-4 w-4" }),
                        "対象顧客へ配信する",
                      ],
                    }),
                  }),
                ],
              }),
              (0, r.jsxs)(p.IP, {
                children: [
                  (0, r.jsxs)("div", {
                    className: "flex flex-col gap-2 border-b border-lien pb-5 sm:flex-row sm:items-start sm:justify-between",
                    children: [
                      (0, r.jsxs)("div", {
                        children: [
                          r.jsx("h2", { className: "text-lg font-semibold", children: "顧客別・自動クーポン" }),
                          r.jsx("p", { className: "mt-1 text-sm leading-6 text-lien-muted", children: "誕生日、前回来店、担当者、電話番号末尾を条件に、対象日に一度だけ自動発行します。" }),
                        ],
                      }),
                      r.jsx(p.OE, { tone: "success", children: "60秒ごとに自動判定" }),
                    ],
                  }),
                  (0, r.jsxs)("form", {
                    action: h.saveAutomatedCouponRuleAction,
                    className: "mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
                    children: [
                      r.jsx("input", { type: "hidden", name: "ruleName", value: "顧客別自動クーポン" }),
                      (0, r.jsxs)("label", { className: "grid gap-2 text-sm font-semibold sm:col-span-2", children: ["クーポンの種類", (0, r.jsxs)("select", { className: "lien-select", name: "triggerType", defaultValue: "birthday", children: [
                        r.jsx("option", { value: "birthday", children: "誕生日クーポン（誕生日の○日前）" }),
                        r.jsx("option", { value: "welcome_back", children: "お帰りなさいクーポン（前回来店の○日後）" }),
                        r.jsx("option", { value: "frequency", children: "来店頻度向上クーポン（前回来店の○日後）" }),
                        r.jsx("option", { value: "review", children: "口コミクーポン（前回来店の○日後）" }),
                        r.jsx("option", { value: "stylist", children: "前回担当スタイリスト別クーポン" }),
                        r.jsx("option", { value: "phone_last_digit", children: "電話番号の下一桁クーポン" }),
                      ] })] }),
                      (0, r.jsxs)("label", { className: "grid gap-2 text-sm font-semibold", children: ["基準日からの日数", r.jsx("input", { className: "lien-input tabular-nums", name: "offsetDays", type: "number", min: "0", max: "730", defaultValue: "30", required: !0 })] }),
                      r.jsx("input", { type: "hidden", name: "stylistName", value: "前回担当者" }),
                      r.jsx("input", { type: "hidden", name: "phoneLastDigit", value: "0" }),
                      (0, r.jsxs)("label", { className: "grid gap-2 text-sm font-semibold", children: ["割引率", r.jsx("input", { className: "lien-input tabular-nums", name: "automatedDiscountRate", type: "number", min: "1", max: "100", defaultValue: t.defaultCouponDiscountRate, required: !0 })] }),
                      r.jsx("input", { type: "hidden", name: "automatedCouponTitle", value: "顧客別特別クーポン" }),
                      (0, r.jsxs)("label", { className: "grid gap-2 text-sm font-semibold sm:col-span-2", children: ["対象メニュー", (0,r.jsxs)("select", { className: "lien-select", name: "automatedTargetMenu", required: !0, defaultValue: "", children: [r.jsx("option",{value:"",disabled:!0,children:"現在のメニューから選択"}),U.filter(e=>e.active).map(e=>r.jsx("option",{value:e.name,children:`${e.name}（${Number(e.priceYen).toLocaleString("ja-JP")}円）`},e.id))] })] }),
                      (0, r.jsxs)("label", { className: "grid gap-2 text-sm font-semibold", children: ["発行後の有効日数", r.jsx("input", { className: "lien-input tabular-nums", name: "automatedValidDays", type: "number", min: "1", max: "365", defaultValue: t.couponDefaultValidDays, required: !0 })] }),
                      r.jsx("div", { className: "flex items-end sm:col-span-2 lg:col-span-4", children: r.jsx("button", { type: "submit", className: "lien-button-primary min-h-12 w-full px-6 sm:w-auto", children: "自動クーポン設定を保存" }) }),
                    ],
                  }),
                  R.length > 0 ? (0, r.jsxs)("div", { className: "mt-6", children: [
                    r.jsx("h3", { className: "text-sm font-semibold", children: "登録済みの自動設定" }),
                    r.jsx("div", { className: "mt-3 grid gap-3", children: R.map((e) => (0, r.jsxs)("article", { className: "flex flex-col gap-3 rounded-[16px] border border-lien bg-white p-4 sm:flex-row sm:items-center sm:justify-between", children: [
                      (0, r.jsxs)("div", { className: "min-w-0", children: [
                        (0, r.jsxs)("div", { className: "flex flex-wrap items-center gap-2", children: [r.jsx("p", { className: "font-semibold", children: e.name }), r.jsx(p.OE, { tone: e.active ? "success" : "neutral", children: e.active ? "有効" : "停止中" })] }),
                        (0, r.jsxs)("p", { className: "mt-1 text-xs leading-5 text-lien-muted", children: [e.couponTitle, " / ", e.discountRate, "%OFF / ", e.targetMenu, " / ", e.validDays, "日間"] }),
                      ] }),
                      (0, r.jsxs)("form", { action: h.toggleAutomatedCouponRuleAction, children: [r.jsx("input", { type: "hidden", name: "ruleId", value: e.id }), r.jsx("input", { type: "hidden", name: "nextActive", value: e.active ? "false" : "true" }), r.jsx("button", { type: "submit", className: "lien-button-secondary min-h-10 px-4 text-xs", children: e.active ? "一時停止" : "有効にする" })] }),
                    ] }, e.id)) }),
                  ] }) : r.jsx("p", { className: "mt-5 rounded-[14px] bg-lien-soft px-4 py-3 text-sm text-lien-muted", children: "自動クーポン設定はまだありません。" }),
                ],
              }),
              (0, r.jsxs)(p.IP, {
                className: "p-0 sm:p-0",
                children: [
                  (0, r.jsxs)("div", {
                    className:
                      "flex items-center justify-between border-b border-lien p-5 sm:p-6",
                    children: [
                      (0, r.jsxs)("div", {
                        children: [
                          r.jsx("h2", {
                            className: "text-lg font-semibold",
                            children: "配信履歴",
                          }),
                          r.jsx("p", {
                            className: "mt-1 text-sm text-lien-muted",
                            children: "直近20件",
                          }),
                        ],
                      }),
                      r.jsx(m.Z, { className: "h-5 w-5 text-lien-primary" }),
                    ],
                  }),
                  b.length > 0
                    ? r.jsx("div", {
                        className: "divide-y divide-lien",
                        children: b.map((e) => {
                          var s;
                          return (0, r.jsxs)(
                            "article",
                            {
                              className:
                                "grid gap-3 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-6",
                              children: [
                                (0, r.jsxs)("div", {
                                  className: "min-w-0",
                                  children: [
                                    (0, r.jsxs)("div", {
                                      className:
                                        "flex flex-wrap items-center gap-2",
                                      children: [
                                        r.jsx("h3", {
                                          className: "font-semibold",
                                          children: e.title,
                                        }),
                                        e.couponEnabled
                                          ? r.jsx(p.OE, {
                                              tone: "warning",
                                              children: "クーポン付き",
                                            })
                                          : null,
                                      ],
                                    }),
                                    r.jsx("p", {
                                      className:
                                        "mt-2 line-clamp-2 text-sm leading-6 text-lien-muted",
                                      children: e.body,
                                    }),
                                    (0, r.jsxs)("p", {
                                      className: "mt-2 text-xs text-lien-muted",
                                      children: [
                                        (function (e) {
                                          let s =
                                              "female" === e.audienceGender
                                                ? "女性"
                                                : "male" === e.audienceGender
                                                  ? "男性"
                                                  : "other" === e.audienceGender
                                                    ? "その他・未設定"
                                                    : "全性別",
                                            t =
                                              null !== e.audienceMinAge ||
                                              null !== e.audienceMaxAge
                                                ? `${e.audienceMinAge ?? 0}〜${e.audienceMaxAge ?? 120}歳`
                                                : "全年齢";
                                          return `${s}・${t}`;
                                        })(e),
                                        "・",
                                        ((s = e.sentAt),
                                        new Intl.DateTimeFormat("ja-JP", {
                                          year: "numeric",
                                          month: "2-digit",
                                          day: "2-digit",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        }).format(s)),
                                      ],
                                    }),
                                    e.couponEnabled
                                      ? (0, r.jsxs)("p", {
                                          className:
                                            "mt-2 text-xs font-semibold text-lien-primary",
                                          children: [
                                            e.couponTitle,
                                            " / ",
                                            e.couponDiscountRate,
                                            "%OFF / ",
                                            e.couponValidDays,
                                            "日",
                                          ],
                                        })
                                      : null,
                                  ],
                                }),
                                (0, r.jsxs)("div", {
                                  className:
                                    "flex items-center gap-2 sm:flex-col sm:items-end",
                                  children: [
                                    r.jsx("span", {
                                      className:
                                        "text-2xl font-semibold tabular-nums",
                                      children: e.audienceMatchedCount,
                                    }),
                                    r.jsx("span", {
                                      className: "text-xs text-lien-muted",
                                      children: "配信",
                                    }),
                                  ],
                                }),
                              ],
                            },
                            e.id,
                          );
                        }),
                      })
                    : r.jsx("p", {
                        className: "p-8 text-center text-sm text-lien-muted",
                        children: "配信履歴はまだありません。",
                      }),
                ],
              }),
            ],
          });
        }
      },
      35381: (e, s, t) => {
        "use strict";
        t.d(s, { o: () => r });
        let r = (0, t(68570).createProxy)(
          String.raw`/app/src/components/confirm-submit-button.tsx#ConfirmSubmitButton`,
        );
      },
      47015: (e, s, t) => {
        "use strict";
        t.d(s, { Z: () => o });
        var r = t(19510),
          n = t(57371),
          a = t(68059),
          i = t(38698),
          l = t(18690);
        function o({ active: e }) {
          let s = [
            {
              key: "customers",
              href: "/admin/customers",
              label: "顧客管理",
              icon: a.Z,
            },
            {
              key: "points",
              href: "/admin/customers?section=points",
              label: "ポイント",
              icon: i.Z,
            },
            {
              key: "messages",
              href: "/admin/customers/messages",
              label: "配信",
              icon: l.Z,
            },
          ];
          return r.jsx("nav", {
            className:
              "inline-grid w-full grid-cols-3 gap-1 rounded-[18px] border border-lien bg-white p-1 shadow-lien-sm sm:w-auto",
            "aria-label": "顧客ページ切替",
            children: s.map((s) => {
              let t = s.icon,
                a = e === s.key;
              return (0, r.jsxs)(
                n.default,
                {
                  href: s.href,
                  "aria-current": a ? "page" : void 0,
                  className: `lien-segment inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-[14px] px-2 text-[13px] font-semibold transition sm:gap-2 sm:px-4 sm:text-sm ${a ? "bg-[color:var(--lien-primary)] text-white shadow-sm" : "text-lien-muted hover:bg-lien-soft hover:text-lien-ink"}`,
                  children: [
                    r.jsx(t, { className: "h-4 w-4 shrink-0" }),
                    s.label,
                  ],
                },
                s.key,
              );
            }),
          });
        }
      },
      90878: (e, s, t) => {
        "use strict";
        t.d(s, {
          IP: () => o,
          OE: () => d,
          i9: () => c,
          mr: () => l,
          ub: () => m,
        });
        var r = t(19510);
        function n(...e) {
          return e.filter(Boolean).join(" ");
        }
        let a = {
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
          i = {
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
          title: s,
          description: t,
          primaryAction: a,
          secondaryAction: i,
          breadcrumb: l,
          visual: o,
          children: c,
        }) {
          return (0, r.jsxs)("header", {
            className:
              "lien-glass overflow-hidden rounded-[28px] border p-5 sm:p-6",
            children: [
              (0, r.jsxs)("div", {
                className: n(
                  "grid gap-5",
                  !!o && "lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]",
                ),
                children: [
                  (0, r.jsxs)("div", {
                    className:
                      "flex min-w-0 flex-col gap-5 xl:flex-row xl:items-start xl:justify-between",
                    children: [
                      (0, r.jsxs)("div", {
                        className: "min-w-0",
                        children: [
                          l
                            ? r.jsx("div", {
                                className:
                                  "mb-3 text-xs font-semibold text-[color:var(--lien-muted)]",
                                children: l,
                              })
                            : null,
                          e
                            ? r.jsx("div", {
                                className:
                                  "mb-2 inline-flex rounded-full border border-[color:var(--lien-primary-soft)] bg-white/70 px-3 py-1 text-xs font-semibold text-[color:var(--lien-primary-dark)]",
                                children: e,
                              })
                            : null,
                          r.jsx("h1", {
                            className:
                              "text-balance text-2xl font-semibold tracking-normal text-[color:var(--lien-ink)] sm:text-3xl",
                            children: s,
                          }),
                          t
                            ? r.jsx("p", {
                                className:
                                  "mt-2 max-w-3xl text-sm leading-6 text-[color:var(--lien-muted)]",
                                children: t,
                              })
                            : null,
                        ],
                      }),
                      a || i
                        ? (0, r.jsxs)("div", {
                            className:
                              "flex w-full shrink-0 flex-wrap gap-2 sm:w-auto [&>*]:min-h-11 [&>*]:flex-1 sm:[&>*]:flex-none",
                            children: [i, a],
                          })
                        : null,
                    ],
                  }),
                  o
                    ? r.jsx("div", {
                        className:
                          "min-h-36 overflow-hidden rounded-[20px] border border-white/70 shadow-sm lg:min-h-40",
                        children: o,
                      })
                    : null,
                ],
              }),
              c ? r.jsx("div", { className: "mt-5", children: c }) : null,
            ],
          });
        }
        function o({
          children: e,
          className: s = "",
          tone: t = "default",
          hoverable: i = !1,
          as: l = "section",
        }) {
          return r.jsx(l, {
            className: n(
              "min-w-0 rounded-[22px] border p-5 shadow-lien-sm transition sm:p-6",
              a[t],
              i && "lien-hover-lift",
              s,
            ),
            children: e,
          });
        }
        function c({
          label: e,
          value: s,
          unit: t,
          delta: n,
          helper: a,
          icon: i,
          tone: l = "default",
        }) {
          return (0, r.jsxs)(o, {
            tone: l,
            className: "p-4 sm:p-5",
            children: [
              (0, r.jsxs)("div", {
                className: "flex items-start justify-between gap-3",
                children: [
                  (0, r.jsxs)("div", {
                    className: "min-w-0",
                    children: [
                      r.jsx("p", {
                        className:
                          "text-xs font-semibold text-[color:var(--lien-muted)]",
                        children: e,
                      }),
                      (0, r.jsxs)("div", {
                        className:
                          "mt-2 flex items-baseline gap-1 text-[color:var(--lien-ink)]",
                        children: [
                          r.jsx("span", {
                            className:
                              "tabular-nums text-2xl font-semibold sm:text-3xl",
                            children: s,
                          }),
                          t
                            ? r.jsx("span", {
                                className:
                                  "text-xs font-semibold text-[color:var(--lien-muted)]",
                                children: t,
                              })
                            : null,
                        ],
                      }),
                    ],
                  }),
                  i
                    ? r.jsx("span", {
                        className:
                          "inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-[color:var(--lien-primary)] shadow-sm",
                        children: r.jsx(i, { className: "h-5 w-5" }),
                      })
                    : null,
                ],
              }),
              n
                ? r.jsx("div", {
                    className:
                      "mt-3 text-xs font-semibold text-[color:var(--lien-primary-dark)]",
                    children: n,
                  })
                : null,
              a
                ? r.jsx("p", {
                    className:
                      "mt-2 text-xs leading-5 text-[color:var(--lien-muted)]",
                    children: a,
                  })
                : null,
            ],
          });
        }
        function d({
          children: e,
          tone: s = "default",
          icon: t,
          className: a = "",
        }) {
          return (0, r.jsxs)("span", {
            className: n("lien-badge", i[s], a),
            children: [t ? r.jsx(t, { className: "h-3.5 w-3.5" }) : null, e],
          });
        }
        function m({ icon: e, title: s, description: t, action: n }) {
          return (0, r.jsxs)("div", {
            className:
              "relative overflow-hidden rounded-[22px] border border-dashed border-[color:var(--lien-border-strong)] bg-[color:var(--lien-surface-soft)] p-6 text-center",
            children: [
              r.jsx("div", {
                className:
                  "pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[color:var(--lien-primary-soft)]/45",
              }),
              r.jsx("div", {
                className:
                  "pointer-events-none absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-[color:var(--lien-accent-soft)]/70",
              }),
              (0, r.jsxs)("div", {
                className:
                  "relative mx-auto flex max-w-md flex-col items-center",
                children: [
                  e
                    ? r.jsx("span", {
                        className:
                          "inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-[color:var(--lien-primary)] shadow-sm",
                        children: r.jsx(e, { className: "h-6 w-6" }),
                      })
                    : null,
                  r.jsx("p", {
                    className:
                      "mt-3 text-sm font-semibold text-[color:var(--lien-ink)]",
                    children: s,
                  }),
                  t
                    ? r.jsx("p", {
                        className:
                          "mt-2 text-sm leading-6 text-[color:var(--lien-muted)]",
                        children: t,
                      })
                    : null,
                  n ? r.jsx("div", { className: "mt-4", children: n }) : null,
                ],
              }),
            ],
          });
        }
      },
      65051: (e, s, t) => {
        "use strict";
        t.d(s, { j: () => i });
        var r = t(71615),
          n = t(13538),
          a = t(60055);
        async function i() {
          let e = await (0, a.ib)(r.cookies().get(a.fh)?.value, (0, a.LD)());
          if (!e) return null;
          let s = await n._.appUser.findFirst({
            where: {
              id: e.userId,
              loginId: e.subject,
              role: "CUSTOMER",
              active: !0,
              customerId: e.customerId,
              organizationId: e.organizationId,
              customer: {
                id: e.customerId,
                organizationId: e.organizationId,
                deletedAt: null,
              },
            },
            select: {
              id: !0,
              customerId: !0,
              organizationId: !0,
              customer: { select: { id: !0, name: !0 } },
            },
          });
          return s?.customerId && s.organizationId && s.customer
            ? { ...e, customer: s.customer }
            : null;
        }
      },
      60055: (e, s, t) => {
        "use strict";
        t.d(s, {
          B3: () => o,
          LD: () => l,
          Zd: () => i,
          fh: () => r,
          ib: () => d,
          zU: () => c,
        });
        let r = "lien_customer_session";
        function n(e) {
          let s = "";
          for (let t of e) s += String.fromCharCode(t);
          return btoa(s)
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/g, "");
        }
        async function a(e, s) {
          let t = await crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(s),
            { name: "HMAC", hash: "SHA-256" },
            !1,
            ["sign"],
          );
          return n(
            new Uint8Array(
              await crypto.subtle.sign("HMAC", t, new TextEncoder().encode(e)),
            ),
          );
        }
        function i(e) {
          return e.trim().toLowerCase();
        }
        function l() {
          return (
            process.env.CUSTOMER_AUTH_SECRET || process.env.ADMIN_AUTH_SECRET
          );
        }
        function o() {
          let e = Number(process.env.CUSTOMER_SESSION_DAYS);
          return Number.isFinite(e)
            ? Math.min(90, Math.max(1, Math.floor(e)))
            : 30;
        }
        async function c({
          loginId: e,
          customerId: s,
          organizationId: t,
          userId: r,
          secret: l,
          now: o = Date.now(),
          sessionDays: c = 30,
        }) {
          var d;
          let m = Math.floor(o / 1e3),
            u =
              ((d = {
                version: 1,
                subject: i(e),
                role: "CUSTOMER",
                customerId: s,
                organizationId: t,
                userId: r,
                issuedAt: m,
                expiresAt: m + 86400 * c,
                sessionId: crypto.randomUUID(),
              }),
              n(new TextEncoder().encode(JSON.stringify(d))));
          return `${u}.${await a(u, l)}`;
        }
        async function d(e, s, t = Date.now()) {
          if (!e || !s || s.length < 32) return null;
          let [r, n, i] = e.split(".");
          if (
            !r ||
            !n ||
            i ||
            !(function (e, s) {
              let t = Math.max(e.length, s.length),
                r = e.length ^ s.length;
              for (let n = 0; n < t; n += 1)
                r |= (e.charCodeAt(n) || 0) ^ (s.charCodeAt(n) || 0);
              return 0 === r;
            })(n, await a(r, s))
          )
            return null;
          let l = (function (e) {
            try {
              return JSON.parse(
                new TextDecoder().decode(
                  (function (e) {
                    let s = e.replace(/-/g, "+").replace(/_/g, "/"),
                      t = atob(s.padEnd(4 * Math.ceil(s.length / 4), "="));
                    return Uint8Array.from(t, (e) => e.charCodeAt(0));
                  })(e),
                ),
              );
            } catch {
              return null;
            }
          })(r);
          return !l ||
            1 !== l.version ||
            "CUSTOMER" !== l.role ||
            !l.customerId ||
            !l.organizationId ||
            !l.userId ||
            !l.sessionId ||
            l.expiresAt <= Math.floor(t / 1e3)
            ? null
            : l;
        }
      },
      56247: (e, s, t) => {
        "use strict";
        t.d(s, { Z: () => r });
        let r = (0, t(40430).Z)("circle-check", [
          ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
          ["path", { d: "m9 12 2 2 4-4", key: "dzmm74" }],
        ]);
      },
      18690: (e, s, t) => {
        "use strict";
        t.d(s, { Z: () => r });
        let r = (0, t(40430).Z)("megaphone", [
          [
            "path",
            {
              d: "M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z",
              key: "q8bfy3",
            },
          ],
          [
            "path",
            {
              d: "M6 14a12 12 0 0 0 2.4 7.2 2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14",
              key: "1853fq",
            },
          ],
          ["path", { d: "M8 6v8", key: "15ugcq" }],
        ]);
      },
      68059: (e, s, t) => {
        "use strict";
        t.d(s, { Z: () => r });
        let r = (0, t(40430).Z)("users-round", [
          ["path", { d: "M18 21a8 8 0 0 0-16 0", key: "3ypg7q" }],
          ["circle", { cx: "10", cy: "8", r: "5", key: "o932ke" }],
          [
            "path",
            { d: "M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3", key: "10s06x" },
          ],
        ]);
      },
      38698: (e, s, t) => {
        "use strict";
        t.d(s, { Z: () => r });
        let r = (0, t(40430).Z)("wallet-cards", [
          [
            "rect",
            {
              width: "18",
              height: "18",
              x: "3",
              y: "3",
              rx: "2",
              key: "afitv7",
            },
          ],
          ["path", { d: "M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2", key: "4125el" }],
          [
            "path",
            {
              d: "M3 11h3c.8 0 1.6.3 2.1.9l1.1.9c1.6 1.6 4.1 1.6 5.7 0l1.1-.9c.5-.5 1.3-.9 2.1-.9H21",
              key: "1dpki6",
            },
          ],
        ]);
      },
    }));
  var s = require("../../../../webpack-runtime.js");
  s.C(e);
  var t = (e) => s((s.s = e)),
    r = s.X(0, [9380, 4108, 2159, 3914, 7708, 5433, 1425, 9845], () => t(9296));
  module.exports = r;
})();
