(() => {
  var e = {};
  ((e.id = 4122),
    (e.ids = [4122]),
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
      25567: (e, t, a) => {
        "use strict";
        a.a(e, async (e, s) => {
          try {
            (a.r(t),
              a.d(t, {
                GlobalError: () => d.a,
                __next_app__: () => h,
                originalPathname: () => x,
                pages: () => p,
                routeModule: () => f,
                tree: () => u,
              }),
              a(20076));
            var r = a(32029);
            a(35866);
            var i = a(23191),
              n = a(88716),
              l = a(37922),
              d = a.n(l),
              c = a(95231),
              o = {};
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
                ].indexOf(e) && (o[e] = () => c[e]);
            a.d(t, o);
            var m = e([r]);
            r = (m.then ? (await m)() : m)[0];
            let u = [
                "",
                {
                  children: [
                    "admin",
                    {
                      children: [
                        "products",
                        {
                          children: [
                            "__PAGE__",
                            {},
                            {
                              page: [
                                () => Promise.resolve().then(a.bind(a, 20076)),
                                "/app/src/app/admin/products/page.tsx",
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
                    () => Promise.resolve().then(a.bind(a, 32029)),
                    "/app/src/app/layout.tsx",
                  ],
                  "not-found": [
                    () => Promise.resolve().then(a.t.bind(a, 35866, 23)),
                    "next/dist/client/components/not-found-error",
                  ],
                },
              ],
              p = ["/app/src/app/admin/products/page.tsx"],
              x = "/admin/products/page",
              h = { require: a, loadChunk: () => Promise.resolve() },
              f = new i.AppPageRouteModule({
                definition: {
                  kind: n.x.APP_PAGE,
                  page: "/admin/products/page",
                  pathname: "/admin/products",
                  bundlePath: "",
                  filename: "",
                  appPaths: [],
                },
                userland: { loaderTree: u },
              });
            s();
          } catch (e) {
            s(e);
          }
        });
      },
      39729: (e, t, a) => {
        let s = {
          "7ea163e51d49f91e6daec6aa9cea5b4ff30bb2da": () =>
            Promise.resolve()
              .then(a.bind(a, 94166))
              .then((e) => e.updateManufacturerReviewAction),
          c0dce2eb2979e674987bc45fb14a00b5c13fcd4f: () =>
            Promise.resolve()
              .then(a.bind(a, 94166))
              .then((e) => e.createManufacturerReviewAction),
          "10ef13940f88a2537a0a79ff12b1ac50e6a4294c": () =>
            Promise.resolve()
              .then(a.bind(a, 34829))
              .then((e) => e.updateProductMasterAction),
          a84e11940f88a2537a0a79ff12b1ac50e6a4294c: () =>
            Promise.resolve()
              .then(a.bind(a, 34829))
              .then((e) => e.updateProductSalesSettingsAction),
          "5732b66173726cd3e4034be70326f06896afcc3a": () =>
            Promise.resolve()
              .then(a.bind(a, 34829))
              .then((e) => e.createProductReviewRequestAction),
          "9f0204ae9ce01ea661f7c828bab608b578719d2d": () =>
            Promise.resolve()
              .then(a.bind(a, 34829))
              .then((e) => e.deleteProductMasterAction),
          d402241d73a9680a726450db19fa4ee0475e5058: () =>
            Promise.resolve()
              .then(a.bind(a, 34829))
              .then((e) => e.createProductMasterAction),
          e665f5bfa46dd381dc443c57549707bb3107b2e2: () =>
            Promise.resolve()
              .then(a.bind(a, 34829))
              .then((e) => e.createProductProposalAction),
        };
        async function r(e, ...t) {
          return (await s[e]()).apply(null, t);
        }
        e.exports = {
          "7ea163e51d49f91e6daec6aa9cea5b4ff30bb2da": r.bind(
            null,
            "7ea163e51d49f91e6daec6aa9cea5b4ff30bb2da",
          ),
          c0dce2eb2979e674987bc45fb14a00b5c13fcd4f: r.bind(
            null,
            "c0dce2eb2979e674987bc45fb14a00b5c13fcd4f",
          ),
          "10ef13940f88a2537a0a79ff12b1ac50e6a4294c": r.bind(
            null,
            "10ef13940f88a2537a0a79ff12b1ac50e6a4294c",
          ),
          a84e11940f88a2537a0a79ff12b1ac50e6a4294c: r.bind(
            null,
            "a84e11940f88a2537a0a79ff12b1ac50e6a4294c",
          ),
          "5732b66173726cd3e4034be70326f06896afcc3a": r.bind(
            null,
            "5732b66173726cd3e4034be70326f06896afcc3a",
          ),
          "9f0204ae9ce01ea661f7c828bab608b578719d2d": r.bind(
            null,
            "9f0204ae9ce01ea661f7c828bab608b578719d2d",
          ),
          d402241d73a9680a726450db19fa4ee0475e5058: r.bind(
            null,
            "d402241d73a9680a726450db19fa4ee0475e5058",
          ),
          e665f5bfa46dd381dc443c57549707bb3107b2e2: r.bind(
            null,
            "e665f5bfa46dd381dc443c57549707bb3107b2e2",
          ),
        };
      },
      69509: (e, t, a) => {
        (Promise.resolve().then(a.bind(a, 2430)),
          Promise.resolve().then(a.t.bind(a, 92481, 23)),
          Promise.resolve().then(a.t.bind(a, 79404, 23)),
          Promise.resolve().then(a.bind(a, 55601)),
          Promise.resolve().then(a.bind(a, 48319)),
          Promise.resolve().then(a.bind(a, 4276)),
          Promise.resolve().then(a.bind(a, 52217)));
      },
      46242: (e, t, a) => {
        "use strict";
        Object.defineProperty(t, "$", {
          enumerable: !0,
          get: function () {
            return r;
          },
        });
        let s = a(15424);
        function r(e) {
          let { createServerReference: t } = a(56493);
          return t(e, s.callServer);
        }
      },
      48319: (e, t, a) => {
        "use strict";
        a.d(t, { ProductCreateDialog: () => d });
        var s = a(10326),
          r = a(17577);
        let i = (0, a(52761).Z)("package-plus", [
          ["path", { d: "M12 22V12", key: "d0xqtd" }],
          ["path", { d: "M16 17h6", key: "1ook5g" }],
          ["path", { d: "M19 14v6", key: "1ckrd5" }],
          [
            "path",
            {
              d: "M21 10.535V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.729l7 4a2 2 0 0 0 2 .001l1.675-.955",
              key: "28k6lz",
            },
          ],
          ["path", { d: "M3.29 7 12 12l8.71-5", key: "19ckod" }],
          ["path", { d: "m7.5 4.27 8.997 5.148", key: "9yrvtv" }],
        ]);
        var n = a(80380),
          l = a(92332);
        function d({
          action: e,
          categories: t,
          tagOptions: a,
          buttonLabel: d = "新しい商品を追加",
          buttonClassName: c = "lien-button-primary", mode: f = "product",
        }) {
          let [o, m] = (0, r.useState)(!1),
            u = (0, r.useId)(),
            p = (0, r.useRef)(null);
          return "menu" === f ? (0, s.jsxs)(s.Fragment,{children:[(0, s.jsxs)("button",{type:"button",className:c,onClick:()=>m(!0),children:[s.jsx(i,{className:"h-4 w-4"}),d]}),o?s.jsx("div",{className:"fixed inset-0 z-[100] grid items-end bg-[#2f2a25]/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-5",onMouseDown:e=>{e.target===e.currentTarget&&m(!1)},children:(0, s.jsxs)("section",{role:"dialog","aria-modal":"true","aria-labelledby":u,className:"flex max-h-[calc(100dvh-0.75rem)] w-full flex-col overflow-hidden rounded-t-[26px] border border-lien bg-[#fffdfa] shadow-[0_28px_80px_rgba(47,42,37,0.22)] sm:mx-auto sm:max-h-[calc(100dvh-2.5rem)] sm:max-w-3xl sm:rounded-[26px]",children:[(0, s.jsxs)("header",{className:"flex shrink-0 items-start justify-between gap-4 border-b border-lien bg-white px-5 py-4 sm:px-6",children:[(0, s.jsxs)("div",{className:"flex min-w-0 items-start gap-3",children:[s.jsx("span",{className:"inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-lien-soft text-lien-primary",children:s.jsx(i,{className:"h-5 w-5"})}),(0, s.jsxs)("div",{className:"min-w-0",children:[s.jsx("p",{className:"text-xs font-semibold text-lien-primary",children:"メニュー台帳"}),s.jsx("h2",{id:u,className:"mt-0.5 text-lg font-semibold text-lien-ink",children:"新しい施術メニューを登録"}),s.jsx("p",{className:"mt-1 text-xs leading-5 text-lien-muted sm:text-sm",children:"登録した内容は、予約・会計・配信クーポンのメニュー選択へ反映されます。"})]})]}),s.jsx("button",{type:"button",onClick:()=>m(!1),className:"inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-lien bg-white text-lien-muted transition hover:bg-lien-soft hover:text-lien-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#E9C9BE]/60","aria-label":"メニュー登録を閉じる",children:s.jsx(n.Z,{className:"h-5 w-5"})})]}),(0, s.jsxs)("form",{action:e,className:"min-h-0 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6",children:[s.jsx("div",{className:"rounded-[18px] border border-lien bg-lien-soft px-4 py-3 text-xs leading-5 text-lien-muted",children:"名称・カテゴリ・施術時間・税込価格を入力してください。あとから一覧で内容を確認できます。"}),(0, s.jsxs)("div",{className:"mt-5 grid gap-4 sm:grid-cols-2",children:[(0, s.jsxs)("label",{className:"grid gap-2 text-sm font-semibold text-lien-ink sm:col-span-2",children:["メニュー名 ",s.jsx("span",{className:"text-xs font-normal text-lien-muted",children:"必須"}),s.jsx("input",{ref:p,name:"menuName",className:"lien-input",placeholder:"例: カット＋カラー",maxLength:140,required:!0})]}),(0, s.jsxs)("label",{className:"grid gap-2 text-sm font-semibold text-lien-ink",children:["カテゴリ ",s.jsx("span",{className:"text-xs font-normal text-lien-muted",children:"必須"}),s.jsx("input",{name:"menuCategory",className:"lien-input",placeholder:"例: カット・カラー",maxLength:80,required:!0})]}),(0, s.jsxs)("label",{className:"grid gap-2 text-sm font-semibold text-lien-ink",children:["施術時間（分） ",s.jsx("span",{className:"text-xs font-normal text-lien-muted",children:"必須"}),s.jsx("input",{name:"menuDuration",className:"lien-input tabular-nums",type:"number",min:"1",max:"1440",step:"1",inputMode:"numeric",placeholder:"例: 120",required:!0})]}),(0, s.jsxs)("label",{className:"grid gap-2 text-sm font-semibold text-lien-ink",children:["税込価格（円） ",s.jsx("span",{className:"text-xs font-normal text-lien-muted",children:"必須"}),s.jsx("input",{name:"menuPrice",className:"lien-input tabular-nums",type:"number",min:"0",max:"10000000",step:"1",inputMode:"numeric",placeholder:"例: 13200",required:!0})]}),(0, s.jsxs)("label",{className:"grid gap-2 text-sm font-semibold text-lien-ink sm:col-span-2",children:["説明（任意）",s.jsx("textarea",{name:"menuDescription",className:"lien-input min-h-28 resize-y py-3 leading-6",placeholder:"施術内容やお客様への案内を入力",maxLength:1200})]})]}),(0, s.jsxs)("footer",{className:"sticky bottom-0 -mx-5 mt-6 flex gap-3 border-t border-lien bg-[#fffdfa]/95 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur sm:-mx-6 sm:px-6",children:[s.jsx("button",{type:"button",onClick:()=>m(!1),className:"lien-button-secondary flex-1 sm:flex-none",children:"キャンセル"}),(0, s.jsxs)("button",{type:"submit",className:"lien-button-primary flex-1 sm:ml-auto sm:flex-none",children:[s.jsx(l.Z,{className:"h-4 w-4"}),"メニューを登録"]})]})]})]})}):null]}) : (0, s.jsxs)(s.Fragment, {
            children: [
              (0, s.jsxs)("button", {
                type: "button",
                className: c,
                onClick: () => m(!0),
                children: [s.jsx(i, { className: "h-4 w-4" }), d],
              }),
              o
                ? s.jsx("div", {
                    className:
                      "fixed inset-0 z-[100] grid items-end bg-[#2f2a25]/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-5",
                    onMouseDown: (e) => {
                      e.target === e.currentTarget && m(!1);
                    },
                    children: (0, s.jsxs)("section", {
                      role: "dialog",
                      "aria-modal": "true",
                      "aria-labelledby": u,
                      className:
                        "flex max-h-[calc(100dvh-0.75rem)] w-full flex-col overflow-hidden rounded-t-[26px] border border-lien bg-[#fffdfa] shadow-[0_28px_80px_rgba(47,42,37,0.22)] sm:mx-auto sm:max-h-[calc(100dvh-2.5rem)] sm:max-w-3xl sm:rounded-[26px]",
                      children: [
                        (0, s.jsxs)("header", {
                          className:
                            "flex shrink-0 items-start justify-between gap-4 border-b border-lien bg-white px-5 py-4 sm:px-6",
                          children: [
                            (0, s.jsxs)("div", {
                              className: "flex min-w-0 items-start gap-3",
                              children: [
                                s.jsx("span", {
                                  className:
                                    "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-lien-soft text-lien-primary",
                                  children: s.jsx(i, { className: "h-5 w-5" }),
                                }),
                                (0, s.jsxs)("div", {
                                  className: "min-w-0",
                                  children: [
                                    s.jsx("p", {
                                      className:
                                        "text-xs font-semibold text-lien-primary",
                                      children: "商品マスタ登録",
                                    }),
                                    s.jsx("h2", {
                                      id: u,
                                      className:
                                        "mt-0.5 text-lg font-semibold text-lien-ink",
                                      children: "新しい商品を商品棚へ追加",
                                    }),
                                    s.jsx("p", {
                                      className:
                                        "mt-1 text-xs leading-5 text-lien-muted sm:text-sm",
                                      children:
                                        "価格と在庫は、会計の商品選択にも反映されます。",
                                    }),
                                  ],
                                }),
                              ],
                            }),
                            s.jsx("button", {
                              type: "button",
                              onClick: () => m(!1),
                              className:
                                "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-lien bg-white text-lien-muted transition hover:bg-lien-soft hover:text-lien-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#E9C9BE]/60",
                              "aria-label": "商品登録を閉じる",
                              children: s.jsx(n.Z, { className: "h-5 w-5" }),
                            }),
                          ],
                        }),
                        (0, s.jsxs)("form", {
                          action: e,
                          className:
                            "min-h-0 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6",
                          children: [
                            (0, s.jsxs)("div", {
                              className: "grid gap-5",
                              children: [
                                (0, s.jsxs)("div", {
                                  className: "grid gap-4 sm:grid-cols-2",
                                  children: [
                                    (0, s.jsxs)("label", {
                                      className:
                                        "grid gap-2 text-sm font-semibold text-lien-ink",
                                      children: [
                                        "メーカー名 ",
                                        s.jsx("span", {
                                          className:
                                            "text-xs font-normal text-lien-muted",
                                          children: "必須",
                                        }),
                                        s.jsx("input", {
                                          ref: p,
                                          name: "manufacturerName",
                                          className: "lien-input",
                                          placeholder: "例: ミルボン",
                                          maxLength: 80,
                                          required: !0,
                                        }),
                                      ],
                                    }),
                                    (0, s.jsxs)("label", {
                                      className:
                                        "grid gap-2 text-sm font-semibold text-lien-ink",
                                      children: [
                                        "商品名 ",
                                        s.jsx("span", {
                                          className:
                                            "text-xs font-normal text-lien-muted",
                                          children: "必須",
                                        }),
                                        s.jsx("input", {
                                          name: "name",
                                          className: "lien-input",
                                          placeholder:
                                            "例: オージュア クエンチ シャンプー",
                                          maxLength: 140,
                                          required: !0,
                                        }),
                                      ],
                                    }),
                                    (0, s.jsxs)("label", {
                                      className:
                                        "grid gap-2 text-sm font-semibold text-lien-ink",
                                      children: [
                                        "カテゴリ ",
                                        s.jsx("span", {
                                          className:
                                            "text-xs font-normal text-lien-muted",
                                          children: "必須",
                                        }),
                                        (0, s.jsxs)("select", {
                                          name: "category",
                                          defaultValue: "",
                                          className: "lien-input",
                                          required: !0,
                                          children: [
                                            s.jsx("option", {
                                              value: "",
                                              disabled: !0,
                                              children: "カテゴリを選択",
                                            }),
                                            t.map((e) =>
                                              s.jsx(
                                                "option",
                                                { value: e, children: e },
                                                e,
                                              ),
                                            ),
                                          ],
                                        }),
                                      ],
                                    }),
                                    (0, s.jsxs)("label", {
                                      className:
                                        "grid gap-2 text-sm font-semibold text-lien-ink",
                                      children: [
                                        "店頭価格 ",
                                        s.jsx("span", {
                                          className:
                                            "text-xs font-normal text-lien-muted",
                                          children: "必須",
                                        }),
                                        s.jsx("input", {
                                          name: "retailPrice",
                                          className: "lien-input tabular-nums",
                                          type: "number",
                                          min: "1",
                                          max: "10000000",
                                          step: "1",
                                          inputMode: "numeric",
                                          placeholder: "例: 3300",
                                          required: !0,
                                        }),
                                      ],
                                    }),
                                    (0, s.jsxs)("label", {
                                      className:
                                        "grid gap-2 text-sm font-semibold text-lien-ink",
                                      children: [
                                        "在庫数 ",
                                        s.jsx("span", {
                                          className:
                                            "text-xs font-normal text-lien-muted",
                                          children: "必須",
                                        }),
                                        s.jsx("input", {
                                          name: "stockQuantity",
                                          className: "lien-input tabular-nums",
                                          type: "number",
                                          min: "0",
                                          max: "100000",
                                          step: "1",
                                          inputMode: "numeric",
                                          defaultValue: "0",
                                          required: !0,
                                        }),
                                      ],
                                    }),
                                    (0, s.jsxs)("label", {
                                      className:
                                        "grid gap-2 text-sm font-semibold text-lien-ink",
                                      children: [
                                        "独自タグ",
                                        s.jsx("input", {
                                          name: "concernTags",
                                          className: "lien-input",
                                          placeholder:
                                            "例: 薄毛、べたつき、乾燥、熱ダメージ（読点区切り）",
                                          maxLength: 300,
                                        }),
                                      ],
                                    }),
                                  ],
                                }),
                                (0, s.jsxs)("fieldset", {
                                  className: "grid gap-3",
                                  children: [
                                    s.jsx("legend", {
                                      className:
                                        "text-sm font-semibold text-lien-ink",
                                      children: "よく使う悩み・効果タグ",
                                    }),
                                    s.jsx("div", {
                                      className: "flex flex-wrap gap-2",
                                      children: a.map((e) =>
                                        (0, s.jsxs)(
                                          "label",
                                          {
                                            className: "cursor-pointer",
                                            children: [
                                              s.jsx("input", {
                                                type: "checkbox",
                                                name: "concernTags",
                                                value: e,
                                                className: "peer sr-only",
                                              }),
                                              s.jsx("span", {
                                                className:
                                                  "inline-flex min-h-10 items-center rounded-full border border-lien bg-white px-3 text-xs font-semibold text-lien-muted transition peer-checked:border-lien-primary peer-checked:bg-[#fff2ed] peer-checked:text-lien-primary-dark peer-focus-visible:ring-4 peer-focus-visible:ring-[#E9C9BE]/50",
                                                children: e,
                                              }),
                                            ],
                                          },
                                          e,
                                        ),
                                      ),
                                    }),
                                  ],
                                }),
                                (0, s.jsxs)("label", {
                                  className:
                                    "grid gap-2 text-sm font-semibold text-lien-ink",
                                  children: [
                                    "商品説明・提案時の補足",
                                    s.jsx("textarea", {
                                      name: "description",
                                      className:
                                        "lien-input min-h-28 resize-y py-3 leading-6",
                                      placeholder:
                                        "商品の特徴、向いている髪質、スタッフが提案時に伝えたい内容など",
                                      maxLength: 1200,
                                    }),
                                  ],
                                }),
                                (0, s.jsxs)("label", {
                                  className:
                                    "grid gap-2 text-sm font-semibold text-lien-ink",
                                  children: [
                                    "この商品が合わない場合の代替提案",
                                    s.jsx("input", {
                                      name: "alternativeRecommendation",
                                      className: "lien-input",
                                      placeholder:
                                        "例: 重く感じる場合は、スムースタイプを提案",
                                      maxLength: 180,
                                    }),
                                    s.jsx("span", {
                                      className:
                                        "text-xs font-normal leading-5 text-lien-muted",
                                      children:
                                        "接客時に次の候補として案内する商品名や提案理由を入力します。",
                                    }),
                                  ],
                                }),
                              ],
                            }),
                            (0, s.jsxs)("footer", {
                              className:
                                "sticky bottom-0 -mx-5 mt-6 flex gap-3 border-t border-lien bg-[#fffdfa]/95 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur sm:-mx-6 sm:px-6",
                              children: [
                                s.jsx("button", {
                                  type: "button",
                                  onClick: () => m(!1),
                                  className:
                                    "lien-button-secondary flex-1 sm:flex-none",
                                  children: "キャンセル",
                                }),
                                (0, s.jsxs)("button", {
                                  type: "submit",
                                  className:
                                    "lien-button-primary flex-1 sm:ml-auto sm:flex-none",
                                  children: [
                                    s.jsx(l.Z, { className: "h-4 w-4" }),
                                    "商品を登録",
                                  ],
                                }),
                              ],
                            }),
                          ],
                        }),
                      ],
                    }),
                  })
                : null,
            ],
          });
        }
      },
      4276: (e, t, a) => {
        "use strict";
        a.d(t, { ProductDeleteButton: () => l });
        var s = a(10326),
          r = a(73183);
        a(15424);
        var i = a(46242);
        ((0, i.$)("5732b66173726cd3e4034be70326f06896afcc3a"),
          (0, i.$)("d402241d73a9680a726450db19fa4ee0475e5058"),
          (0, i.$)("10ef13940f88a2537a0a79ff12b1ac50e6a4294c"));
        var n = (0, i.$)("9f0204ae9ce01ea661f7c828bab608b578719d2d");
        function l({ productId: e, productName: t, proposalCount: a }) {
          return (0, s.jsxs)("form", {
            action: n,
            onSubmit: function (e) {
              let s =
                a > 0
                  ? `「${t}」を商品棚から削除しますか？

過去の会計・レビュー履歴は保持されます。`
                  : `「${t}」を商品棚から削除しますか？`;
              window.confirm(s) || e.preventDefault();
            },
            children: [
              s.jsx("input", { type: "hidden", name: "productId", value: e }),
              (0, s.jsxs)("button", {
                type: "submit",
                className:
                  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#edc2bd] bg-white px-3 text-xs font-semibold text-[#884039] transition hover:bg-[#fff3f1] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#edc2bd]/50",
                "aria-label": `${t}を削除`,
                title: "商品を削除",
                children: [
                  s.jsx(r.Z, { className: "h-4 w-4", "aria-hidden": "true" }),
                  "削除",
                ],
              }),
            ],
          });
        }
        (0, i.$)("e665f5bfa46dd381dc443c57549707bb3107b2e2");
      },
      52217: (e, t, a) => {
        "use strict";
        a.d(t, { ProductEditDialog: () => c });
        var s = a(10326),
          r = a(17577),
          i = a(52761);
        let n = (0, i.Z)("pen-line", [
          ["path", { d: "M13 21h8", key: "1jsn5i" }],
          [
            "path",
            {
              d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",
              key: "1a8usu",
            },
          ],
        ]);
        var l = a(80380);
        let d = (0, i.Z)("save", [
          [
            "path",
            {
              d: "M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",
              key: "1c8476",
            },
          ],
          [
            "path",
            { d: "M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7", key: "1ydtos" },
          ],
          ["path", { d: "M7 3v4a1 1 0 0 0 1 1h7", key: "t51u73" }],
        ]);
        function c({ action: e, product: t, categories: a, tagOptions: i }) {
          let [c, o] = (0, r.useState)(!1),
            m = (0, r.useId)(),
            u = (0, r.useRef)(null),
            p = new Set(t.concernTags);
          return (0, s.jsxs)(s.Fragment, {
            children: [
              (0, s.jsxs)("button", {
                type: "button",
                onClick: () => o(!0),
                className: "lien-button-secondary min-h-10 px-3 text-xs",
                children: [s.jsx(n, { className: "h-4 w-4" }), "編集"],
              }),
              c
                ? s.jsx("div", {
                    className:
                      "fixed inset-0 z-[100] grid items-end bg-[#2f2a25]/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-5",
                    onMouseDown: (e) => {
                      e.target === e.currentTarget && o(!1);
                    },
                    children: (0, s.jsxs)("section", {
                      role: "dialog",
                      "aria-modal": "true",
                      "aria-labelledby": m,
                      className:
                        "flex max-h-[calc(100dvh-0.75rem)] w-full flex-col overflow-hidden rounded-t-[26px] border border-lien bg-[#fffdfa] shadow-[0_28px_80px_rgba(47,42,37,0.22)] sm:mx-auto sm:max-h-[calc(100dvh-2.5rem)] sm:max-w-3xl sm:rounded-[26px]",
                      children: [
                        (0, s.jsxs)("header", {
                          className:
                            "flex shrink-0 items-start justify-between gap-4 border-b border-lien bg-white px-5 py-4 sm:px-6",
                          children: [
                            (0, s.jsxs)("div", {
                              className: "flex min-w-0 items-start gap-3",
                              children: [
                                s.jsx("span", {
                                  className:
                                    "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-lien-soft text-lien-primary",
                                  children: s.jsx(n, { className: "h-5 w-5" }),
                                }),
                                (0, s.jsxs)("div", {
                                  className: "min-w-0",
                                  children: [
                                    s.jsx("p", {
                                      className:
                                        "text-xs font-semibold text-lien-primary",
                                      children: "商品編集",
                                    }),
                                    s.jsx("h2", {
                                      id: m,
                                      className:
                                        "mt-0.5 truncate text-lg font-semibold text-lien-ink",
                                      children: t.name,
                                    }),
                                    s.jsx("p", {
                                      className:
                                        "mt-1 text-xs leading-5 text-lien-muted sm:text-sm",
                                      children:
                                        "保存後、価格と在庫は会計の商品棚へすぐ反映されます。",
                                    }),
                                  ],
                                }),
                              ],
                            }),
                            s.jsx("button", {
                              type: "button",
                              onClick: () => o(!1),
                              className:
                                "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-lien bg-white text-lien-muted hover:bg-lien-soft",
                              "aria-label": "商品編集を閉じる",
                              children: s.jsx(l.Z, { className: "h-5 w-5" }),
                            }),
                          ],
                        }),
                        (0, s.jsxs)("form", {
                          action: e,
                          className:
                            "min-h-0 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6",
                          children: [
                            s.jsx("input", {
                              type: "hidden",
                              name: "productId",
                              value: t.id,
                            }),
                            (0, s.jsxs)("div", {
                              className: "grid gap-5",
                              children: [
                                (0, s.jsxs)("div", {
                                  className: "grid gap-4 sm:grid-cols-2",
                                  children: [
                                    (0, s.jsxs)("label", {
                                      className:
                                        "grid gap-2 text-sm font-semibold text-lien-ink",
                                      children: [
                                        "メーカー名",
                                        s.jsx("input", {
                                          ref: u,
                                          name: "manufacturerName",
                                          className: "lien-input",
                                          defaultValue: t.manufacturerName,
                                          maxLength: 80,
                                          required: !0,
                                        }),
                                      ],
                                    }),
                                    (0, s.jsxs)("label", {
                                      className:
                                        "grid gap-2 text-sm font-semibold text-lien-ink",
                                      children: [
                                        "商品名",
                                        s.jsx("input", {
                                          name: "name",
                                          className: "lien-input",
                                          defaultValue: t.name,
                                          maxLength: 140,
                                          required: !0,
                                        }),
                                      ],
                                    }),
                                    (0, s.jsxs)("label", {
                                      className:
                                        "grid gap-2 text-sm font-semibold text-lien-ink",
                                      children: [
                                        "カテゴリ",
                                        s.jsx("select", {
                                          name: "category",
                                          className: "lien-input",
                                          defaultValue: a.includes(
                                            t.category ?? "",
                                          )
                                            ? (t.category ?? "")
                                            : "その他",
                                          required: !0,
                                          children: a.map((e) =>
                                            s.jsx(
                                              "option",
                                              { value: e, children: e },
                                              e,
                                            ),
                                          ),
                                        }),
                                      ],
                                    }),
                                    (0, s.jsxs)("label", {
                                      className:
                                        "grid gap-2 text-sm font-semibold text-lien-ink",
                                      children: [
                                        "店頭価格",
                                        s.jsx("input", {
                                          name: "retailPrice",
                                          className: "lien-input tabular-nums",
                                          type: "number",
                                          min: "1",
                                          max: "10000000",
                                          step: "1",
                                          inputMode: "numeric",
                                          defaultValue: t.retailPrice,
                                          required: !0,
                                        }),
                                      ],
                                    }),
                                    (0, s.jsxs)("label", {
                                      className:
                                        "grid gap-2 text-sm font-semibold text-lien-ink",
                                      children: [
                                        "在庫数",
                                        s.jsx("input", {
                                          name: "stockQuantity",
                                          className: "lien-input tabular-nums",
                                          type: "number",
                                          min: "0",
                                          max: "100000",
                                          step: "1",
                                          inputMode: "numeric",
                                          defaultValue: t.stockQuantity,
                                          required: !0,
                                        }),
                                      ],
                                    }),
                                    (0, s.jsxs)("label", {
                                      className:
                                        "grid gap-2 text-sm font-semibold text-lien-ink",
                                      children: [
                                        "独自タグ",
                                        s.jsx("input", {
                                          name: "concernTags",
                                          className: "lien-input",
                                          defaultValue:
                                            t.concernTags.join("、"),
                                          maxLength: 300,
                                        }),
                                      ],
                                    }),
                                  ],
                                }),
                                (0, s.jsxs)("fieldset", {
                                  className: "grid gap-3",
                                  children: [
                                    s.jsx("legend", {
                                      className:
                                        "text-sm font-semibold text-lien-ink",
                                      children: "よく使う悩み・効果タグ",
                                    }),
                                    s.jsx("div", {
                                      className: "flex flex-wrap gap-2",
                                      children: i.map((e) =>
                                        (0, s.jsxs)(
                                          "label",
                                          {
                                            className: "cursor-pointer",
                                            children: [
                                              s.jsx("input", {
                                                type: "checkbox",
                                                name: "concernTags",
                                                value: e,
                                                defaultChecked: p.has(e),
                                                className: "peer sr-only",
                                              }),
                                              s.jsx("span", {
                                                className:
                                                  "inline-flex min-h-10 items-center rounded-full border border-lien bg-white px-3 text-xs font-semibold text-lien-muted transition peer-checked:border-lien-primary peer-checked:bg-[#fff2ed] peer-checked:text-lien-primary-dark peer-focus-visible:ring-4 peer-focus-visible:ring-[#E9C9BE]/50",
                                                children: e,
                                              }),
                                            ],
                                          },
                                          e,
                                        ),
                                      ),
                                    }),
                                  ],
                                }),
                                (0, s.jsxs)("label", {
                                  className:
                                    "grid gap-2 text-sm font-semibold text-lien-ink",
                                  children: [
                                    "商品説明・提案時の補足",
                                    s.jsx("textarea", {
                                      name: "description",
                                      className:
                                        "lien-input min-h-28 resize-y py-3 leading-6",
                                      defaultValue: t.description ?? "",
                                      maxLength: 1200,
                                    }),
                                  ],
                                }),
                                (0, s.jsxs)("label", {
                                  className:
                                    "grid gap-2 text-sm font-semibold text-lien-ink",
                                  children: [
                                    "この商品が合わない場合の代替提案",
                                    s.jsx("input", {
                                      name: "alternativeRecommendation",
                                      className: "lien-input",
                                      defaultValue:
                                        t.alternativeRecommendation ?? "",
                                      placeholder:
                                        "例: 重く感じる場合は、スムースタイプを提案",
                                      maxLength: 180,
                                    }),
                                    s.jsx("span", {
                                      className:
                                        "text-xs font-normal leading-5 text-lien-muted",
                                      children:
                                        "接客時に次の候補として案内する商品名や提案理由を入力します。",
                                    }),
                                  ],
                                }),
                              ],
                            }),
                            (0, s.jsxs)("footer", {
                              className:
                                "sticky bottom-0 -mx-5 mt-6 flex gap-3 border-t border-lien bg-[#fffdfa]/95 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur sm:-mx-6 sm:px-6",
                              children: [
                                s.jsx("button", {
                                  type: "button",
                                  onClick: () => o(!1),
                                  className:
                                    "lien-button-secondary flex-1 sm:flex-none",
                                  children: "キャンセル",
                                }),
                                (0, s.jsxs)("button", {
                                  type: "submit",
                                  className:
                                    "lien-button-primary flex-1 sm:ml-auto sm:flex-none",
                                  children: [
                                    s.jsx(d, { className: "h-4 w-4" }),
                                    "変更を保存",
                                  ],
                                }),
                              ],
                            }),
                          ],
                        }),
                      ],
                    }),
                  })
                : null,
            ],
          });
        }
      },
      20076: (e, t, a) => {
        "use strict";
        (a.r(t), a.d(t, { default: () => I, dynamic: () => P }));
        var s = a(19510),
          r = a(57371),
          i = a(40430);
        let n = (0, i.Z)("triangle-alert", [
          [
            "path",
            {
              d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",
              key: "wmoenq",
            },
          ],
          ["path", { d: "M12 9v4", key: "juzpu7" }],
          ["path", { d: "M12 17h.01", key: "p32p05" }],
        ]);
        var l = a(56247),
          d = a(72387),
          c = a(48241);
        let o = (0, i.Z)("factory", [
            ["path", { d: "M12 16h.01", key: "1drbdi" }],
            ["path", { d: "M16 16h.01", key: "1f9h7w" }],
            [
              "path",
              {
                d: "M3 19a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5a.5.5 0 0 0-.769-.422l-4.462 2.844A.5.5 0 0 1 15 10.5v-2a.5.5 0 0 0-.769-.422L9.77 10.922A.5.5 0 0 1 9 10.5V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z",
                key: "1iv0i2",
              },
            ],
            ["path", { d: "M8 16h.01", key: "18s6g9" }],
          ]),
          m = (0, i.Z)("tags", [
            [
              "path",
              {
                d: "M13.172 2a2 2 0 0 1 1.414.586l6.71 6.71a2.4 2.4 0 0 1 0 3.408l-4.592 4.592a2.4 2.4 0 0 1-3.408 0l-6.71-6.71A2 2 0 0 1 6 9.172V3a1 1 0 0 1 1-1z",
                key: "16rjxf",
              },
            ],
            [
              "path",
              {
                d: "M2 7v6.172a2 2 0 0 0 .586 1.414l6.71 6.71a2.4 2.4 0 0 0 3.191.193",
                key: "178nd4",
              },
            ],
            [
              "circle",
              {
                cx: "10.5",
                cy: "6.5",
                r: ".5",
                fill: "currentColor",
                key: "12ikhr",
              },
            ],
          ]),
          u = (0, i.Z)("package-plus", [
            ["path", { d: "M12 22V12", key: "d0xqtd" }],
            ["path", { d: "M16 17h6", key: "1ook5g" }],
            ["path", { d: "M19 14v6", key: "1ckrd5" }],
            [
              "path",
              {
                d: "M21 10.535V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.729l7 4a2 2 0 0 0 2 .001l1.675-.955",
                key: "28k6lz",
              },
            ],
            ["path", { d: "M3.29 7 12 12l8.71-5", key: "19ckod" }],
            ["path", { d: "m7.5 4.27 8.997 5.148", key: "9yrvtv" }],
          ]);
        var p = a(90878),
          x = a(76598),
          h = a(68570);
        let f = (0, h.createProxy)(
            String.raw`/app/src/components/products/product-delete-button.tsx#ProductDeleteButton`,
          ),
          b = (0, h.createProxy)(
            String.raw`/app/src/components/products/product-create-dialog.tsx#ProductCreateDialog`,
          ),
          g = (0, h.createProxy)(
            String.raw`/app/src/components/products/product-edit-dialog.tsx#ProductEditDialog`,
          );
        function j({ recentPurchaseCount: e, compact: t = !1 }) {
          return e > 0
            ? null
            : (0, s.jsxs)("span", {
                className: `inline-flex items-center rounded-full border border-[#e8a7a1] bg-[#fff3f1] font-semibold text-[#9f2d25] ${t ? "gap-1.5 px-2 py-1 text-[11px]" : "gap-2 px-2.5 py-1.5 text-xs"}`,
                "aria-label": "販売停滞。直近90日の購入がありません",
                title: "直近90日の購入がありません",
                children: [
                  s.jsx("span", {
                    className: "lien-sales-alert-lamp",
                    "aria-hidden": "true",
                    children: s.jsx(n, {
                      className: t ? "h-3 w-3" : "h-3.5 w-3.5",
                      strokeWidth: 2.5,
                    }),
                  }),
                  "販売停滞",
                ],
              });
        }
        function salesControls({ product: e, owner: t }) {
          let a = A(e.campaignTags);
          return (0, s.jsxs)("div", {
            className: "mt-3 grid gap-2",
            children: [
              (0, s.jsxs)("div", {
                className: "flex flex-wrap items-center gap-2",
                children: [
                  s.jsx("span", {
                    className: `rounded-full px-2.5 py-1 text-xs font-semibold ${e.salesSuspended ? "bg-[#fff0ed] text-[#9f2d25]" : "bg-[#edf6ea] text-[#466349]"}`,
                    children: e.salesSuspended ? "販売停止中" : "販売中",
                  }),
                  (t ? a : []).map((e) =>
                    s.jsx("span", {
                      className: "rounded-full bg-[#fff3d8] px-2.5 py-1 text-xs font-semibold text-[#76551a]",
                      children: e,
                    }, e),
                  ),
                ],
              }),
              t
                ? (0, s.jsxs)("form", {
                    action: N.updateProductMasterAction,
                    className: "grid gap-2 rounded-xl border border-lien bg-lien-soft p-3",
                    children: [
                      s.jsx("input", { type: "hidden", name: "productId", value: e.id }),
                      s.jsx("input", { type: "hidden", name: "settingsOnly", value: "sales" }),
                      (0, s.jsxs)("div", {
                        className: "flex flex-wrap gap-3 text-xs font-semibold text-lien-ink",
                        children: [
                          (0, s.jsxs)("label", { className: "inline-flex items-center gap-2", children: [s.jsx("input", { type: "checkbox", name: "salesSuspended", defaultChecked: e.salesSuspended, className: "h-4 w-4 accent-lien-primary" }), "販売を停止する"] }),
                        ],
                      }),
                      (0, s.jsxs)("div", { className: "flex flex-wrap gap-2 text-xs", children: ["夏季商戦", "年末商戦", "春季商戦"].map((t) => (0, s.jsxs)("label", { className: "inline-flex items-center gap-1 rounded-full bg-white px-2 py-1", children: [s.jsx("input", { type: "checkbox", name: "campaignTags", value: t, defaultChecked: a.includes(t), className: "accent-lien-primary" }), t] }, t)) }),
                      s.jsx("button", { type: "submit", className: "lien-button-secondary min-h-9 px-3 text-xs", children: "販売設定を保存" }),
                    ],
                  })
                : null,
            ],
          });
        }
        var v = a(21488),
          y = a(40970),
          N = a(34829),
          U = a(17403),
          k = a(59219),
          w = a(13538);
        let P = "force-dynamic",
          M = [
            "シャンプー",
            "トリートメント",
            "スタイリング剤",
            "アウトバス",
            "その他",
          ],
          q = [
            "乾燥",
            "ダメージ",
            "カラー後",
            "ブリーチ",
            "広がり",
            "まとまり",
            "ツヤ",
            "うねり",
            "くせ",
            "頭皮",
            "敏感",
            "ボリューム",
            "香り",
            "セット力",
            "キープ",
            "ウェット感",
          ];
        function _(e) {
          return Array.from(
            new Set(e.map((e) => e?.trim()).filter((e) => !!e)),
          ).sort((e, t) => e.localeCompare(t, "ja"));
        }
        function A(e) {
          return Array.isArray(e)
            ? e.map((e) => String(e).trim()).filter(Boolean)
            : [];
        }
        async function I({ searchParams: e }) {
          var t, a, i;
          if (e?.section === "feedback")
            return s.jsx(y.default, { searchParams: e });
          let h = await (0, k.Os)(["ADMIN", "STAFF"]);
          if (!h.organizationId) throw Error("店舗所属が設定されていません。");
          if (e?.section === "menus") {
            let catalogUnifiedVersion = "catalog-unified-v110";
            void catalogUnifiedVersion;
            let menus = await U.listSalonMenus(h.organizationId),
              activeMenus = menus.filter((menu) => menu.active).length,
              categories = new Set(menus.map((menu) => String(menu.category || "").trim()).filter(Boolean)).size,
              averagePrice = menus.length ? Math.round(menus.reduce((total, menu) => total + Number(menu.priceYen || 0), 0) / menus.length) : 0,
              canManageMenus = "ADMIN" === h.role,
              notice = e?.notice,
              error = e?.error;
            return (0, s.jsxs)("div", {
              className: "mx-auto grid max-w-7xl gap-6",
              children: [
                s.jsx(v.i, { active: "menu" }),
                s.jsx(p.mr,{eyebrow:"メニュー",title:"メニュー・料金を管理",description:"施術メニューの名称・カテゴリ・料金・施術時間を管理します。商品棚と同じ操作で編集・削除できます。",primaryAction:s.jsx(b,{action:U.createSalonMenuAction,mode:"menu",buttonLabel:"新しいメニューを追加"}),visual:s.jsx(x.n8,{variant:"products",className:"h-full min-h-40",imageClassName:"object-[58%_52%]",sizes:"(max-width: 1023px) 100vw, 352px"})}),
                "menu-created" === notice ? s.jsx("div", { className: "rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-800", role: "status", children: "メニューを追加しました。" }) : null,
                "menu-updated" === notice ? s.jsx("div", { className: "rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-800", role: "status", children: "メニューを更新しました。" }) : null,
                "menu-deleted" === notice ? s.jsx("div", { className: "rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-800", role: "status", children: "メニューを削除しました。" }) : null,
                "menu-not-found" === error ? s.jsx("div", { className: "rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-800", role: "alert", children: "メニューが見つからないか、すでに削除されています。" }) : null,
                (0, s.jsxs)("section", {
                  className: "grid gap-3 sm:grid-cols-2 xl:grid-cols-4",
                  "aria-label": "メニュー集計",
                  children: [
                    s.jsx(p.i9, { icon: d.Z, label: "メニュー数", value: menus.length, unit: "件", tone: "success" }),
                    s.jsx(p.i9, { icon: c.Z, label: "公開中", value: activeMenus, unit: "件", tone: "soft" }),
                    s.jsx(p.i9, { icon: o, label: "カテゴリ", value: categories, unit: "種類", tone: "premium" }),
                    s.jsx(p.i9, { icon: m, label: "平均価格", value: averagePrice, unit: "円", tone: "highlight", helper: "登録メニューの税込平均" }),
                  ],
                }),
                (0, s.jsxs)("section", { className: "overflow-hidden rounded-[22px] border border-lien bg-white shadow-lien-sm", children: [
                  (0, s.jsxs)("div", { className: "flex flex-col gap-2 border-b border-lien px-5 py-4 sm:flex-row sm:items-center sm:justify-between", children: [(0, s.jsxs)("div", { children: [s.jsx("p", { className: "text-xs font-semibold text-lien-primary", children: "メニューカタログ" }), s.jsx("h2", { className: "mt-1 text-xl font-semibold text-lien-ink", children: "登録済みのメニュー" }), s.jsx("p", { className: "mt-1 text-xs leading-5 text-lien-muted", children: "基本情報・公開状態を編集画面にまとめています。" })] }), (0, s.jsxs)("span", { className: "text-sm font-semibold tabular-nums text-lien-muted", children: [menus.length, "件"] })] }),
                  menus.length ? s.jsx("div", { className: "overflow-x-auto", children: (0, s.jsxs)("table", { className: "w-full min-w-[940px] border-collapse", children: [
                    s.jsx("thead", { className: "bg-[#fcf8f5] text-left text-xs font-semibold text-lien-muted", children: (0, s.jsxs)("tr", { children: [s.jsx("th", { className: "px-5 py-3", children: "名称" }), s.jsx("th", { className: "px-4 py-3", children: "カテゴリ" }), s.jsx("th", { className: "px-4 py-3 text-right", children: "施術時間" }), s.jsx("th", { className: "px-4 py-3 text-right", children: "税込価格" }), s.jsx("th", { className: "px-5 py-3 text-right", children: "状態・操作" })] }) }),
                    s.jsx("tbody", { className: "divide-y divide-lien", children: menus.map((menu) => (0, s.jsxs)("tr", { className: "align-top transition-colors hover:bg-[#fffaf8]", children: [
                      s.jsx("td", { className: "px-5 py-4", children: (0, s.jsxs)("div", { className: "max-w-xl", children: [s.jsx("p", { className: "font-semibold leading-6 text-lien-ink", children: menu.name }), menu.description ? s.jsx("p", { className: "mt-1 line-clamp-2 text-xs leading-5 text-lien-muted", children: menu.description }) : s.jsx("p", { className: "mt-1 text-xs text-lien-faint", children: "説明は登録されていません" })] }) }),
                      s.jsx("td", { className: "px-4 py-4", children: s.jsx("span", { className: "ca-catalog-tag is-category", children: menu.category }) }),
                      (0, s.jsxs)("td", { className: "px-4 py-4 text-right font-semibold tabular-nums text-lien-ink", children: [Number(menu.durationMinutes || 0).toLocaleString("ja-JP"), "分"] }),
                      (0, s.jsxs)("td", { className: "px-4 py-4 text-right text-base font-semibold tabular-nums text-lien-ink", children: [Number(menu.priceYen || 0).toLocaleString("ja-JP"), "円"] }),
                      s.jsx("td", { className: "px-5 py-4", children: (0, s.jsxs)("div", { className: "flex items-start justify-end gap-2", children: [s.jsx("span", { className: menu.active ? "ca-catalog-state is-live" : "ca-catalog-state is-stopped", children: menu.active ? "公開中" : "停止中" }), canManageMenus ? s.jsx("button", { type: "button", "data-catalog-edit": "menu", "data-menu-id": menu.id, "data-menu-name": menu.name, "data-menu-category": menu.category, "data-menu-duration": String(menu.durationMinutes || 0), "data-menu-price": String(menu.priceYen || 0), "data-menu-description": menu.description || "", "data-menu-active": menu.active ? "true" : "false", className: "ca-catalog-action ca-catalog-action-edit", children: "編集" }) : null, canManageMenus ? s.jsx("button", { type: "button", "data-catalog-delete": "menu", "data-catalog-name": menu.name, "data-menu-id": menu.id, className: "ca-catalog-action ca-catalog-action-delete", children: "削除" }) : s.jsx("span", { className: "inline-flex min-h-9 items-center text-xs text-lien-muted", children: "閲覧のみ" })] }) }),
                    ] }, menu.id)) }),
                  ] }) }) : s.jsx(p.ub, { icon: u, title: "メニューがまだ登録されていません", description: "上のメニュー登録から、最初のメニューを追加してください。", action: s.jsx(b, { action: U.createSalonMenuAction, mode: "menu", buttonLabel: "メニューを追加" }) }),
                ] }),
              ],
            });
          }
          let P = new Date();
          P.setDate(P.getDate() - 90);
          let [I, z, C] = await Promise.all([
              w._.product.findMany({
                where: { organizationId: h.organizationId, active: !0 },
                orderBy: [{ manufacturerName: "asc" }, { name: "asc" }],
                select: {
                  id: !0,
                  manufacturerName: !0,
                  name: !0,
                  category: !0,
                  retailPrice: !0,
                  stockQuantity: !0,
                  concernTags: !0,
                  description: !0,
                  alternativeRecommendation: !0,
                  salesSuspended: !0,
                  salesStagnant: !0,
                  campaignTags: !0,
                  _count: { select: { proposals: !0 } },
                },
              }),
              w._.productSaleLine.groupBy({
                by: ["productId"],
                where: {
                  product: { organizationId: h.organizationId, active: !0 },
                },
                _sum: { quantity: !0 },
              }).catch((error)=>{console.error("product sales aggregate unavailable",error);return []}),
              w._.productSaleLine.groupBy({
                by: ["productId"],
                where: {
                  createdAt: { gte: P },
                  product: { organizationId: h.organizationId, active: !0 },
                },
                _sum: { quantity: !0 },
              }).catch((error)=>{console.error("product sales aggregate unavailable",error);return []}),
            ]),
            $ = new Map(z.map((e) => [e.productId, e._sum.quantity ?? 0])),
            Z = new Map(C.map((e) => [e.productId, e._sum.quantity ?? 0])),
            V = I.map((e) => ({
              ...e,
              purchaseCount: $.get(e.id) ?? 0,
              recentPurchaseCount: Z.get(e.id) ?? 0,
              alternativeRecommendation: e.alternativeRecommendation || (() => { let tags = A(e.concernTags); let matches = I.filter(p => p.id !== e.id && A(p.concernTags).some(tag => tags.includes(tag))).sort((a,b) => A(b.concernTags).filter(tag => tags.includes(tag)).length - A(a.concernTags).filter(tag => tags.includes(tag)).length).slice(0,3); return matches.length ? matches.map(p => p.name).join(" / ") : null; })(),
            })),
            S = _(V.map((e) => e.manufacturerName)),
            R = _([...q, ...V.flatMap((e) => A(e.concernTags))]).slice(0, 24),
            T = _(V.flatMap((e) => A(e.concernTags))),
            E = V.reduce((e, t) => e + t.stockQuantity, 0),
            L = V.filter((e) => e.stockQuantity <= 3).length,
            B = V.filter((e) => 0 === e.recentPurchaseCount).length,
            F = V.find((t) => t.id === e?.focus),
            D =
              ((t = e?.notice),
              (a = e?.error),
              (i = F?.name),
              "product-not-found" === a
                ? {
                    tone: "error",
                    title: "商品が見つかりませんでした。",
                    description:
                      "すでに削除された可能性があります。商品一覧を再読み込みしてください。",
                  }
                : "product-archived" === t
                  ? {
                      tone: "success",
                      title: "商品を提案候補から削除しました。",
                      description:
                        "過去の商品提案・レビュー履歴はそのまま保持されています。",
                    }
                  : "product-deleted" === t
                    ? {
                        tone: "success",
                        title: "商品を削除しました。",
                        description:
                          "提案履歴のない商品を登録商品から完全に削除しました。",
                      }
                    : "product-exists" === a
                      ? {
                          tone: "error",
                          title:
                            "同じメーカー・商品名がすでに登録されています。",
                          description: "一覧で既存商品を確認してください。",
                        }
                      : "product-reactivated" === t
                        ? {
                            tone: "success",
                            title: "同名商品を商品棚へ戻しました。",
                            description:
                              "価格と在庫を更新し、会計から選択できるようにしました。",
                          }
                        : "product-created" === t
                          ? {
                              tone: "success",
                              title: i
                                ? `「${i}」を追加しました。`
                                : "商品を追加しました。",
                              description:
                                "商品棚へ登録し、会計の商品選択へ反映しました。追加した行を下で強調表示しています。",
                            }
                          : "product-updated" === t
                            ? {
                                tone: "success",
                                title: "商品情報を更新しました。",
                                description:
                                  "価格と在庫は会計の商品選択にも反映されています。",
                              }
                            : null);
          return (0, s.jsxs)("div", {
            className: "mx-auto grid max-w-7xl gap-6",
            children: [
              s.jsx(v.i, { active: "catalog" }),
              s.jsx(p.mr, {
                eyebrow: "商品棚",
                title: "商品・価格・在庫を管理",
                description:
                  "商品棚の価格と在庫を正本として管理します。会計では商品と個数を選ぶだけで金額へ反映されます。",
                primaryAction: s.jsx(b, {
                  action: N.createProductMasterAction,
                  categories: M,
                  tagOptions: R,
                }),
                visual: s.jsx(x.n8, {
                  variant: "products",
                  className: "h-full min-h-40",
                  imageClassName: "object-[58%_52%]",
                  sizes: "(max-width: 1023px) 100vw, 352px",
                }),
              }),
              D
                ? s.jsx("div", {
                    className: `fixed inset-x-4 top-4 z-50 mx-auto max-w-md rounded-[22px] border bg-white p-4 shadow-[0_20px_60px_rgba(47,42,37,0.18)] sm:left-auto sm:right-6 sm:mx-0 ${"error" === D.tone ? "border-[#edc2bd]" : "border-[#cbdcc8]"}`,
                    role: "status",
                    children: (0, s.jsxs)("div", {
                      className: "flex gap-3",
                      children: [
                        "error" === D.tone
                          ? s.jsx(n, {
                              className:
                                "mt-0.5 h-5 w-5 shrink-0 text-[#884039]",
                            })
                          : s.jsx(l.Z, {
                              className:
                                "mt-0.5 h-5 w-5 shrink-0 text-[#466349]",
                            }),
                        (0, s.jsxs)("div", {
                          children: [
                            s.jsx("p", {
                              className: "text-sm font-semibold text-lien-ink",
                              children: D.title,
                            }),
                            s.jsx("p", {
                              className:
                                "mt-1 text-xs leading-5 text-lien-muted",
                              children: D.description,
                            }),
                            s.jsx(r.default, {
                              href: "/admin/products#product-catalog",
                              className:
                                "mt-3 inline-flex text-xs font-semibold text-lien-primary",
                              children: "閉じる",
                            }),
                          ],
                        }),
                      ],
                    }),
                  })
                : null,
              (0, s.jsxs)("section", {
                className: "grid gap-3 sm:grid-cols-2 xl:grid-cols-4",
                children: [
                  s.jsx(p.i9, {
                    icon: d.Z,
                    label: "商品数",
                    value: V.length,
                    unit: "件",
                    tone: "success",
                  }),
                  s.jsx(p.i9, {
                    icon: c.Z,
                    label: "在庫合計",
                    value: E,
                    unit: "点",
                    tone: "soft",
                  }),
                  s.jsx(p.i9, {
                    icon: o,
                    label: "メーカー",
                    value: S.length,
                    unit: "社",
                    tone: "premium",
                  }),
                  s.jsx(p.i9, {
                    icon: m,
                    label: "在庫3点以下",
                    value: L,
                    unit: "商品",
                    tone: "highlight",
                    helper: `登録タグ ${T.length}種類`,
                  }),
                ],
              }),
              (0, s.jsxs)("section", { id: "product-catalog", className: "scroll-mt-24 overflow-hidden rounded-[22px] border border-lien bg-white shadow-lien-sm", children: [
                (0, s.jsxs)("div", { className: "flex flex-col gap-2 border-b border-lien px-5 py-4 sm:flex-row sm:items-center sm:justify-between", children: [(0, s.jsxs)("div", { children: [s.jsx("p", { className: "text-xs font-semibold text-lien-primary", children: "商品カタログ" }), s.jsx("h2", { className: "mt-1 text-xl font-semibold text-lien-ink", children: "登録済みの商品" }), s.jsx("p", { className: "mt-1 text-xs leading-5 text-lien-muted", children: "基本情報・販売停止・商戦タグを編集画面にまとめています。" })] }), (0, s.jsxs)("span", { className: "text-sm font-semibold tabular-nums text-lien-muted", children: [V.length, "件"] })] }),
                V.length ? s.jsx("div", { className: "overflow-x-auto", children: (0, s.jsxs)("table", { className: "w-full min-w-[940px] border-collapse", children: [
                  s.jsx("thead", { className: "bg-[#fcf8f5] text-left text-xs font-semibold text-lien-muted", children: (0, s.jsxs)("tr", { children: [s.jsx("th", { className: "px-5 py-3", children: "名称" }), s.jsx("th", { className: "px-4 py-3", children: "カテゴリ・タグ" }), s.jsx("th", { className: "px-4 py-3 text-right", children: "在庫" }), s.jsx("th", { className: "px-4 py-3 text-right", children: "店頭価格" }), s.jsx("th", { className: "px-5 py-3 text-right", children: "状態・操作" })] }) }),
                  s.jsx("tbody", { className: "divide-y divide-lien", children: V.map((product) => { let concernTags = A(product.concernTags), campaignTags = A(product.campaignTags), stagnant = "ADMIN" === h.role && 0 === product.recentPurchaseCount; return (0, s.jsxs)("tr", { id: "product-" + product.id, className: "scroll-mt-28 align-top transition-colors hover:bg-[#fffaf8] " + (F?.id === product.id ? "bg-[#f2f8ef] ring-2 ring-inset ring-[#8aa58a]" : ""), children: [
                    s.jsx("td", { className: "px-5 py-4", children: (0, s.jsxs)("div", { className: "max-w-xl", children: [s.jsx("p", { className: "text-xs font-semibold text-lien-primary", children: product.manufacturerName }), s.jsx("p", { className: "mt-1 font-semibold leading-6 text-lien-ink", children: product.name }), product.description ? s.jsx("p", { className: "mt-1 line-clamp-2 text-xs leading-5 text-lien-muted", children: product.description }) : s.jsx("p", { className: "mt-1 text-xs text-lien-faint", children: "説明は登録されていません" }), product.alternativeRecommendation ? (0, s.jsxs)("p", { className: "mt-2 text-xs leading-5 text-lien-muted", children: [s.jsx("span", { className: "font-semibold text-lien-primary", children: "代替: " }), product.alternativeRecommendation] }) : null] }) }),
                    s.jsx("td", { className: "max-w-sm px-4 py-4", children: (0, s.jsxs)("div", { className: "flex flex-wrap gap-1.5", children: [s.jsx("span", { className: "ca-catalog-tag is-category", children: product.category || "未設定" }), ...concernTags.map((tag) => s.jsx("span", { className: "ca-catalog-tag is-concern", children: tag }, tag))] }) }),
                    (0, s.jsxs)("td", { className: "px-4 py-4 text-right font-semibold tabular-nums " + (product.stockQuantity <= 3 ? "text-[#884039]" : "text-[#466349]"), children: [Number(product.stockQuantity || 0).toLocaleString("ja-JP"), "点"] }),
                    (0, s.jsxs)("td", { className: "px-4 py-4 text-right text-base font-semibold tabular-nums text-lien-ink", children: [Number(product.retailPrice || 0).toLocaleString("ja-JP"), "円"] }),
                    s.jsx("td", { className: "px-5 py-4", children: (0, s.jsxs)("div", { className: "flex items-start justify-end gap-2", children: [(0, s.jsxs)("div", { className: "flex max-w-[170px] flex-wrap justify-end gap-1.5", children: [s.jsx("span", { className: product.salesSuspended ? "ca-catalog-state is-stopped" : "ca-catalog-state is-live", children: product.salesSuspended ? "販売停止中" : "販売中" }), stagnant ? s.jsx("span", { className: "ca-catalog-state is-stagnant", title: "直近90日の購入がありません", children: "販売停滞" }) : null, ...("ADMIN" === h.role ? campaignTags.map((tag) => s.jsx("span", { className: "ca-catalog-tag is-campaign", children: tag }, tag)) : [])] }), "ADMIN" === h.role ? s.jsx("button", { type: "button", "data-catalog-edit": "product", "data-product-id": product.id, "data-product-name": product.name, "data-product-manufacturer": product.manufacturerName, "data-product-category": product.category || "その他", "data-product-price": String(product.retailPrice || 0), "data-product-stock": String(product.stockQuantity || 0), "data-product-description": product.description || "", "data-product-alternative": product.alternativeRecommendation || "", "data-product-concern-tags": JSON.stringify(concernTags), "data-product-campaign-tags": JSON.stringify(campaignTags), "data-product-sales-suspended": product.salesSuspended ? "true" : "false", "data-product-can-manage-sales": "true", className: "ca-catalog-action ca-catalog-action-edit", children: "編集" }) : null, "ADMIN" === h.role ? s.jsx("button", { type: "button", "data-catalog-delete": "product", "data-catalog-name": product.name, "data-product-id": product.id, className: "ca-catalog-action ca-catalog-action-delete", children: "削除" }) : s.jsx("span", { className: "inline-flex min-h-9 items-center text-xs text-lien-muted", children: "閲覧のみ" })] }) }),
                  ] }, product.id); }) }),
                ] }) }) : s.jsx(p.ub, { icon: u, title: "商品がまだ登録されていません", description: "上の商品登録から、最初の商品を追加してください。", action: s.jsx(b, { action: N.createProductMasterAction, categories: M, tagOptions: R, buttonLabel: "商品を追加" }) }),
              ] }),
            ],
          });
        }
      },
      34829: (e, t, a) => {
        "use strict";
        (a.r(t),
          a.d(t, {
            createProductMasterAction: () => b,
            createProductProposalAction: () => v,
            createProductReviewRequestAction: () => y,
            deleteProductMasterAction: () => j,
            updateProductMasterAction: () => g,
          }));
        var s = a(24330);
        a(60166);
        var r = a(57708),
          i = a(58585),
          n = a(13538),
          l = a(92938),
          d = a(59219),
          c = a(40618);
        let o = [
          "シャンプー",
          "トリートメント",
          "スタイリング剤",
          "アウトバス",
          "その他",
        ];
        function m(e, t) {
          let a = (0, l.Bx)(e.get(t));
          if (!a) throw Error(`${t} は必須です。`);
          return a;
        }
        function u(e, t, a) {
          let s = e.replace(/\s+/g, " ").trim();
          if (s.length > a)
            throw Error(`${t}は${a}文字以内で入力してください。`);
          return s;
        }
        function p(e, t, a, s, r) {
          let i = Number(m(e, t));
          if (!Number.isSafeInteger(i) || i < s || i > r)
            throw Error(`${a}を正しく入力してください。`);
          return i;
        }
        function x(e) {
          let t = u(m(e, "manufacturerName"), "メーカー名", 80),
            a = u(m(e, "name"), "商品名", 140),
            s = u(m(e, "category"), "カテゴリ", 60),
            r = o.includes(s) ? s : null,
            i = (0, l.Bx)(e.get("description")),
            n = i ? u(i, "商品説明", 1200) : null,
            d = (0, l.Bx)(e.get("alternativeRecommendation")),
            c = d ? u(d, "合わない場合の代替提案", 180) : null,
            x = p(e, "retailPrice", "店頭価格", 1, 1e7),
            h = p(e, "stockQuantity", "在庫数", 0, 1e5),
            f = Array.from(
              new Set(
                (0, l.zW)(e, "concernTags")
                  .map((e) => e.replace(/\s+/g, " ").trim())
                  .filter((e) => e.length > 0 && e.length <= 30),
              ),
            ).slice(0, 16);
          if (!r)
            throw Error("カテゴリは指定された5種類から選択してください。");
          return {
            manufacturerName: t,
            name: a,
            category: r,
            retailPrice: x,
            stockQuantity: h,
            concernTags: f,
            description: n,
            alternativeRecommendation: c,
          };
        }
        function h() {
          ((0, r.revalidatePath)("/admin/products"),
            (0, r.revalidatePath)("/api/products"),
            (0, r.revalidatePath)("/api/admin/products"),
            (0, r.revalidatePath)("/admin/reports/manufacturer-products"),
            (0, r.revalidatePath)("/admin/reports/product-feedback"));
        }
        function f(e) {
          let t = new URLSearchParams();
          (e.notice && t.set("notice", e.notice),
            e.error && t.set("error", e.error),
            e.focus && t.set("focus", e.focus),
            (0, i.redirect)(
              `/admin/products?${t.toString()}#${e.focus ? `product-${e.focus}` : "product-catalog"}`,
            ));
        }
        async function b(e) {
          let t = await (0, d.Os)(["ADMIN", "STAFF"]),
            a = x(e),
            s = await n._.product.findFirst({
              where: {
                manufacturerName: {
                  equals: a.manufacturerName,
                  mode: "insensitive",
                },
                name: { equals: a.name, mode: "insensitive" },
                organizationId: t.organizationId ?? void 0,
              },
              select: { id: !0, active: !0 },
            });
          (s?.active && f({ error: "product-exists" }),
            s &&
              (await n._.product.update({
                where: { id: s.id },
                data: { ...a, active: !0 },
              }),
              h(),
              f({ notice: "product-reactivated", focus: s.id })));
          let r = await n._.product.create({
            data: {
              ...a,
              active: !0,
              organizationId: t.organizationId ?? void 0,
            },
            select: { id: !0 },
          });
          (h(), f({ notice: "product-created", focus: r.id }));
        }
        async function g(e) {
          let t = await (0, d.Os)(["ADMIN", "STAFF"]),
            a = m(e, "productId");
          if ("sales" === (0, l.Bx)(e.get("settingsOnly"))) {
            if ("ADMIN" !== t.role)
              throw Error("この操作はオーナー権限のみ実行できます。");
            let s = "on" === (0, l.Bx)(e.get("salesSuspended")),
              i = ["夏季商戦", "年末商戦", "春季商戦"],
              c = Array.from(new Set((0, l.zW)(e, "campaignTags").filter((e) => i.includes(e))));
            if (1 !== (await n._.product.updateMany({ where: { id: a, organizationId: t.organizationId ?? void 0, active: !0 }, data: { salesSuspended: s, campaignTags: c } })).count)
              f({ error: "product-not-found" });
            (h(), f({ notice: "product-updated", focus: a }));
          }
          let s = x(e);
          ((await n._.product.findFirst({
            where: {
              id: { not: a },
              manufacturerName: {
                equals: s.manufacturerName,
                mode: "insensitive",
              },
              name: { equals: s.name, mode: "insensitive" },
              organizationId: t.organizationId ?? void 0,
              active: !0,
            },
            select: { id: !0 },
          })) && f({ error: "product-exists" }),
            1 !==
              (
                await n._.product.updateMany({
                  where: {
                    id: a,
                    organizationId: t.organizationId ?? void 0,
                    active: !0,
                  },
                  data: s,
                })
              ).count && f({ error: "product-not-found" }),
            h(),
            f({ notice: "product-updated" }));
        }
        async function j(e) {
          let t = await (0, d.Os)(["ADMIN", "STAFF"]),
            a = m(e, "productId"),
            s = await n._.$transaction(async (e) => {
              let s = await e.product.findFirst({
                where: { id: a, organizationId: t.organizationId ?? void 0 },
                select: { id: !0, _count: { select: { proposals: !0 } } },
              });
              return s
                ? s._count.proposals > 0
                  ? (await e.product.update({
                      where: { id: s.id },
                      data: { active: !1 },
                    }),
                    "archived")
                  : (await e.product.delete({ where: { id: s.id } }), "deleted")
                : "missing";
            });
          ("missing" === s && f({ error: "product-not-found" }),
            h(),
            f({
              notice: "archived" === s ? "product-archived" : "product-deleted",
            }));
        }
        async function v(e, t) {
          var a, s;
          let { session: i } = await (0, d.zH)(e),
            c = m(t, "productId"),
            o =
              (a = (0, l.Bx)(t.get("status"))) && l.F$.includes(a)
                ? a
                : "proposed",
            u =
              (s = (0, l.Bx)(t.get("reaction"))) && l.SX.includes(s) ? s : null,
            p = (0, l.zW)(t, "concernTags").slice(0, 8);
          if (
            !(await n._.customer.findFirst({
              where: {
                id: e,
                organizationId: i.organizationId ?? void 0,
                deletedAt: null, storeHiddenAt: null /* store-hidden-customer-consistency-v360 */,
              },
              select: { id: !0 },
            }))
          )
            throw Error("顧客が見つかりません。");
          if (
            !(await n._.product.findFirst({
              where: {
                id: c,
                organizationId: i.organizationId ?? void 0,
                active: !0,
              },
              select: { id: !0 },
            }))
          )
            throw Error("商品が見つかりません。");
          let x = "purchased" === o || "purchased" === u;
          (await n._.$transaction(async (a) => {
            let s = await a.productProposal.create({
              data: {
                customerId: e,
                productId: c,
                visitId: (0, l.Bx)(t.get("visitId")) ?? void 0,
                proposalReason: (0, l.Bx)(t.get("proposalReason")) ?? void 0,
                concernTags: p,
                status: o,
                reaction: u ?? void 0,
                purchased: x,
                note: (0, l.Bx)(t.get("note")) ?? void 0,
              },
              select: {
                id: !0,
                status: !0,
                purchased: !0,
                createdAt: !0,
                visit: { select: { visitedAt: !0 } },
              },
            });
            x &&
              (await (0, l.Md)({
                db: a,
                proposal: s,
                visitAt: s.visit?.visitedAt ?? s.createdAt,
              }));
          }),
            (0, r.revalidatePath)(`/admin/customers/${e}`),
            (0, r.revalidatePath)("/admin/reports/manufacturer-products"));
        }
        async function y(e, t) {
          let { proposal: a } = await (0, d.dS)(e);
          if (a.customerId !== t) throw Error("商品提案と顧客が一致しません。");
          let s = await (0, l.WM)({ proposalId: e, customerId: t });
          return ((0, r.revalidatePath)(`/admin/customers/${t}`), s);
        }
        ((0, c.h)([b, g, j, v, y]),
          (0, s.j)("d402241d73a9680a726450db19fa4ee0475e5058", b),
          (0, s.j)("10ef13940f88a2537a0a79ff12b1ac50e6a4294c", g),
          (0, s.j)("9f0204ae9ce01ea661f7c828bab608b578719d2d", j),
          (0, s.j)("e665f5bfa46dd381dc443c57549707bb3107b2e2", v),
          (0, s.j)("5732b66173726cd3e4034be70326f06896afcc3a", y));
      },
      92332: (e, t, a) => {
        "use strict";
        a.d(t, { Z: () => s });
        let s = (0, a(52761).Z)("plus", [
          ["path", { d: "M5 12h14", key: "1ays0h" }],
          ["path", { d: "M12 5v14", key: "s699le" }],
        ]);
      },
      73183: (e, t, a) => {
        "use strict";
        a.d(t, { Z: () => s });
        let s = (0, a(52761).Z)("trash-2", [
          ["path", { d: "M10 11v6", key: "nco0om" }],
          ["path", { d: "M14 11v6", key: "outv1u" }],
          [
            "path",
            { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6", key: "miytrc" },
          ],
          ["path", { d: "M3 6h18", key: "d0wm0j" }],
          [
            "path",
            { d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2", key: "e791ji" },
          ],
        ]);
      },
      48241: (e, t, a) => {
        "use strict";
        a.d(t, { Z: () => s });
        let s = (0, a(40430).Z)("boxes", [
          [
            "path",
            {
              d: "M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z",
              key: "lc1i9w",
            },
          ],
          ["path", { d: "m7 16.5-4.74-2.85", key: "1o9zyk" }],
          ["path", { d: "m7 16.5 5-3", key: "va8pkn" }],
          ["path", { d: "M7 16.5v5.17", key: "jnp8gn" }],
          [
            "path",
            {
              d: "M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z",
              key: "8zsnat",
            },
          ],
          ["path", { d: "m17 16.5-5-3", key: "8arw3v" }],
          ["path", { d: "m17 16.5 4.74-2.85", key: "8rfmw" }],
          ["path", { d: "M17 16.5v5.17", key: "k6z78m" }],
          [
            "path",
            {
              d: "M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z",
              key: "1xygjf",
            },
          ],
          ["path", { d: "M12 8 7.26 5.15", key: "1vbdud" }],
          ["path", { d: "m12 8 4.74-2.85", key: "3rx089" }],
          ["path", { d: "M12 13.5V8", key: "1io7kd" }],
        ]);
      },
      56247: (e, t, a) => {
        "use strict";
        a.d(t, { Z: () => s });
        let s = (0, a(40430).Z)("circle-check", [
          ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
          ["path", { d: "m9 12 2 2 4-4", key: "dzmm74" }],
        ]);
      },
      72387: (e, t, a) => {
        "use strict";
        a.d(t, { Z: () => s });
        let s = (0, a(40430).Z)("package-check", [
          ["path", { d: "M12 22V12", key: "d0xqtd" }],
          ["path", { d: "m16 17 2 2 4-4", key: "uh5qu3" }],
          [
            "path",
            {
              d: "M21 11.127V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.729l7 4a2 2 0 0 0 2 .001l1.32-.753",
              key: "kpkbpo",
            },
          ],
          ["path", { d: "M3.29 7 12 12l8.71-5", key: "19ckod" }],
          ["path", { d: "m7.5 4.27 8.997 5.148", key: "9yrvtv" }],
        ]);
      },
    }));
  var t = require("../../../webpack-runtime.js");
  t.C(e);
  var a = (e) => t((t.s = e)),
    s = t.X(0, [9380, 4108, 2159, 3914, 7708, 2564, 5433, 1425, 6006, 2241, 9845], () =>
      a(25567),
    );
  module.exports = s;
})();
