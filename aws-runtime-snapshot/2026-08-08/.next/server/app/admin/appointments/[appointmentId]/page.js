(() => {
  var e = {};
  ((e.id = 327),
    (e.ids = [327]),
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
      91946: (e, t, s) => {
        "use strict";
        s.a(e, async (e, r) => {
          try {
            (s.r(t),
              s.d(t, {
                GlobalError: () => c.a,
                __next_app__: () => b,
                originalPathname: () => h,
                pages: () => p,
                routeModule: () => f,
                tree: () => x,
              }));
            var a = s(71768),
              n = s(32029);
            s(35866);
            var i = s(23191),
              l = s(88716),
              o = s(37922),
              c = s.n(o),
              d = s(95231),
              m = {};
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
                ].indexOf(e) && (m[e] = () => d[e]);
            s.d(t, m);
            var u = e([a, n]);
            [a, n] = u.then ? (await u)() : u;
            let x = [
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
                                "__PAGE__",
                                {},
                                {
                                  page: [
                                    () =>
                                      Promise.resolve().then(s.bind(s, 71768)),
                                    "/app/src/app/admin/appointments/[appointmentId]/page.tsx",
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
                    () => Promise.resolve().then(s.bind(s, 32029)),
                    "/app/src/app/layout.tsx",
                  ],
                  "not-found": [
                    () => Promise.resolve().then(s.t.bind(s, 35866, 23)),
                    "next/dist/client/components/not-found-error",
                  ],
                },
              ],
              p = ["/app/src/app/admin/appointments/[appointmentId]/page.tsx"],
              h = "/admin/appointments/[appointmentId]/page",
              b = { require: s, loadChunk: () => Promise.resolve() },
              f = new i.AppPageRouteModule({
                definition: {
                  kind: l.x.APP_PAGE,
                  page: "/admin/appointments/[appointmentId]/page",
                  pathname: "/admin/appointments/[appointmentId]",
                  bundlePath: "",
                  filename: "",
                  appPaths: [],
                },
                userland: { loaderTree: x },
              });
            r();
          } catch (e) {
            r(e);
          }
        });
      },
      56466: (e, t, s) => {
        let r = {
          "44c2d42fb3e72f53d65c394837c061eb44359e3e": () =>
            Promise.resolve()
              .then(s.bind(s, 69541))
              .then((e) => e.completeAppointmentCheckoutAction),
        };
        async function a(e, ...t) {
          return (await r[e]()).apply(null, t);
        }
        e.exports = {
          "44c2d42fb3e72f53d65c394837c061eb44359e3e": a.bind(
            null,
            "44c2d42fb3e72f53d65c394837c061eb44359e3e",
          ),
        };
      },
      46896: (e, t, s) => {
        (Promise.resolve().then(s.bind(s, 2430)),
          Promise.resolve().then(s.t.bind(s, 92481, 23)),
          Promise.resolve().then(s.t.bind(s, 79404, 23)),
          Promise.resolve().then(s.bind(s, 70428)),
          Promise.resolve().then(s.bind(s, 98301)));
      },
      70428: (e, t, s) => {
        "use strict";
        s.d(t, { AppointmentCheckoutForm: () => w });
        var r = s(10326),
          a = s(17577),
          n = s(60962),
          i = s(80361),
          l = s(80380),
          o = s(4165),
          c = s(52761);
        let d = (0, c.Z)("badge-japanese-yen", [
            [
              "path",
              {
                d: "M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z",
                key: "3c2336",
              },
            ],
            ["path", { d: "m9 8 3 3v7", key: "17yadx" }],
            ["path", { d: "m12 11 3-3", key: "p4cfq1" }],
            ["path", { d: "M9 12h6", key: "1c52cq" }],
            ["path", { d: "M9 16h6", key: "8wimt3" }],
          ]),
          m = (0, c.Z)("credit-card", [
            [
              "rect",
              {
                width: "20",
                height: "14",
                x: "2",
                y: "5",
                rx: "2",
                key: "ynyp8z",
              },
            ],
            ["line", { x1: "2", x2: "22", y1: "10", y2: "10", key: "1b3vmo" }],
          ]);
        var u = s(92332);
        let x = (0, c.Z)("ruler", [
          [
            "path",
            {
              d: "M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z",
              key: "icamh8",
            },
          ],
          ["path", { d: "m14.5 12.5 2-2", key: "inckbg" }],
          ["path", { d: "m11.5 9.5 2-2", key: "fmmyf7" }],
          ["path", { d: "m8.5 6.5 2-2", key: "vc6u1g" }],
          ["path", { d: "m17.5 15.5 2-2", key: "wo5hmg" }],
        ]);
        var p = s(73183);
        let h = (0, c.Z)("percent", [
            ["line", { x1: "19", x2: "5", y1: "5", y2: "19", key: "1x9vlm" }],
            ["circle", { cx: "6.5", cy: "6.5", r: "2.5", key: "4mh3h7" }],
            ["circle", { cx: "17.5", cy: "17.5", r: "2.5", key: "1mdrzq" }],
          ]),
          b = (0, c.Z)("coins", [
            [
              "path",
              { d: "M13.744 17.736a6 6 0 1 1-7.48-7.48", key: "bq4yh3" },
            ],
            ["path", { d: "M15 6h1v4", key: "11y1tn" }],
            ["path", { d: "m6.134 14.768.866-.5 2 3.464", key: "17snzx" }],
            ["circle", { cx: "16", cy: "8", r: "6", key: "14bfc9" }],
          ]);
        var f = s(98594);
        s(15424);
        var g = (0, s(46242).$)("44c2d42fb3e72f53d65c394837c061eb44359e3e");
        let j = { M: 600, L: 1100, LL: 1700 };
        function v(e, t, s) {
          return Number.isFinite(e)
            ? Math.min(s, Math.max(t, Math.floor(e)))
            : t;
        }
        function y() {
          let { pending: e } = (0, n.useFormStatus)();
          return e
            ? r.jsx("div", {
                className:
                  "fixed inset-0 z-[100] grid place-items-center bg-[#fbf7f0]/95 px-6 backdrop-blur-sm",
                role: "status",
                "aria-live": "assertive",
                "aria-label": "会計処理中",
                children: (0, r.jsxs)("div", {
                  className: "grid max-w-sm justify-items-center text-center",
                  children: [
                    r.jsx("span", {
                      className:
                        "grid h-20 w-20 place-items-center rounded-full border border-[#e8ded2] bg-white text-[color:var(--lien-primary)] shadow-lien",
                      children: r.jsx(i.Z, {
                        className: "h-10 w-10 animate-spin",
                        "aria-hidden": "true",
                      }),
                    }),
                    r.jsx("p", {
                      className:
                        "mt-6 text-xl font-semibold text-[color:var(--lien-ink)]",
                      children: "会計処理中です",
                    }),
                    (0, r.jsxs)("p", {
                      className:
                        "mt-2 text-sm leading-6 text-[color:var(--lien-muted)]",
                      children: [
                        "売上・ポイント・購入商品を記録しています。",
                        r.jsx("br", {}),
                        "そのままお待ちください。",
                      ],
                    }),
                  ],
                }),
              })
            : null;
        }
        function N({
          open: e,
          onClose: t,
          section: s,
          setSection: a,
          longHairLength: n,
          setLongHairLength: i,
          products: o,
          productLines: c,
          addProduct: d,
          coupons: m,
          couponSelection: u,
          setCouponSelection: x,
          availablePoints: p,
          maxPointDiscount: h,
          pointDiscount: b,
          setPointDiscount: f,
        }) {
          return e
            ? r.jsx("div", {
                className:
                  "fixed inset-0 z-[90] flex items-end justify-center bg-[#2f2a25]/45 p-0 backdrop-blur-sm sm:items-center sm:p-5",
                role: "presentation",
                onMouseDown: (e) => {
                  e.currentTarget === e.target && t();
                },
                children: (0, r.jsxs)("section", {
                  role: "dialog",
                  "aria-modal": "true",
                  "aria-labelledby": "checkout-item-picker-title",
                  className:
                    "flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[26px] border border-[#e8ded2] bg-[#fbf7f0] shadow-2xl sm:rounded-[26px]",
                  children: [
                    (0, r.jsxs)("header", {
                      className:
                        "flex items-center justify-between gap-4 border-b border-[#e8ded2] bg-white px-5 py-4",
                      children: [
                        (0, r.jsxs)("div", {
                          children: [
                            r.jsx("p", {
                              className:
                                "text-xs font-semibold text-[color:var(--lien-primary)]",
                              children: "会計項目",
                            }),
                            r.jsx("h2", {
                              id: "checkout-item-picker-title",
                              className: "mt-1 text-lg font-semibold",
                              children: "追加する項目を選択",
                            }),
                          ],
                        }),
                        r.jsx("button", {
                          type: "button",
                          onClick: t,
                          className: "lien-icon-button h-11 w-11",
                          "aria-label": "閉じる",
                          children: r.jsx(l.Z, { className: "h-5 w-5" }),
                        }),
                      ],
                    }),
                    r.jsx("nav", {
                      className:
                        "grid grid-cols-4 gap-1.5 border-b border-[#e8ded2] bg-white px-4 py-3 sm:gap-2",
                      "aria-label": "会計項目の種類",
                      children: [
                        { key: "long", label: "ロング料金" },
                        { key: "product", label: "商品" },
                        { key: "coupon", label: "クーポン" },
                        { key: "points", label: "ポイント" },
                      ].map((e) =>
                        r.jsx(
                          "button",
                          {
                            type: "button",
                            onClick: () => a(e.key),
                            "aria-pressed": s === e.key,
                            className: `lien-segment min-h-10 min-w-0 rounded-full px-1.5 text-xs font-semibold transition sm:px-4 sm:text-sm ${s === e.key ? "bg-[color:var(--lien-primary)] text-white shadow-sm" : "bg-[color:var(--lien-surface-soft)] text-[color:var(--lien-ink)]"}`,
                            children: e.label,
                          },
                          e.key,
                        ),
                      ),
                    }),
                    (0, r.jsxs)("div", {
                      className: "min-h-0 flex-1 overflow-y-auto p-4 sm:p-5",
                      children: [
                        "long" === s
                          ? (0, r.jsxs)("div", {
                              className: "grid gap-3 sm:grid-cols-2",
                              children: [
                                (0, r.jsxs)("button", {
                                  type: "button",
                                  onClick: () => {
                                    (i(""), t());
                                  },
                                  "aria-pressed": "" === n,
                                  className: `lien-list-action min-h-16 rounded-2xl border px-4 text-left shadow-sm ${"" === n ? "border-[color:var(--lien-primary)] bg-[#f8e9e3] ring-2 ring-[#e9c9be]/45" : "border-[#e8ded2] bg-white"}`,
                                  children: [
                                    r.jsx("span", {
                                      className: "block text-sm font-semibold",
                                      children: "ロング料金なし",
                                    }),
                                    r.jsx("span", {
                                      className:
                                        "mt-1 block text-xs text-[color:var(--lien-muted)]",
                                      children: "追加 0円",
                                    }),
                                  ],
                                }),
                                Object.entries(j).map(([e, s]) =>
                                  (0, r.jsxs)(
                                    "button",
                                    {
                                      type: "button",
                                      onClick: () => {
                                        (i(e), t());
                                      },
                                      "aria-pressed": n === e,
                                      className: `lien-list-action min-h-16 rounded-2xl border px-4 text-left shadow-sm ${n === e ? "border-[color:var(--lien-primary)] bg-[#f8e9e3] ring-2 ring-[#e9c9be]/45" : "border-[#e8ded2] bg-white"}`,
                                      children: [
                                        (0, r.jsxs)("span", {
                                          className:
                                            "block text-sm font-semibold",
                                          children: ["ロング料金 ", e],
                                        }),
                                        (0, r.jsxs)("span", {
                                          className:
                                            "mt-1 block text-xs tabular-nums text-[color:var(--lien-muted)]",
                                          children: [
                                            "+",
                                            s.toLocaleString("ja-JP"),
                                            "円",
                                          ],
                                        }),
                                      ],
                                    },
                                    e,
                                  ),
                                ),
                              ],
                            })
                          : null,
                        "product" === s
                          ? r.jsx("div", {
                              className: "grid gap-2",
                              children:
                                0 === o.length
                                  ? r.jsx("p", {
                                      className:
                                        "rounded-2xl bg-white px-4 py-5 text-sm text-[color:var(--lien-muted)]",
                                      children:
                                        "商品棚に販売可能な商品がありません。",
                                    })
                                  : o.map((e) => {
                                      let t = c.some(
                                          (t) => t.productId === e.id,
                                        ),
                                        s = e.stockQuantity < 1;
                                      return (0, r.jsxs)(
                                        "button",
                                        {
                                          type: "button",
                                          disabled: t || s,
                                          onClick: () => d(e.id),
                                          className:
                                            "lien-list-action flex min-h-16 items-center justify-between gap-3 rounded-2xl border border-[#e8ded2] bg-white px-4 text-left shadow-sm disabled:opacity-45",
                                          children: [
                                            (0, r.jsxs)("span", {
                                              className: "min-w-0",
                                              children: [
                                                r.jsx("span", {
                                                  className:
                                                    "block truncate text-xs font-semibold text-[color:var(--lien-primary)]",
                                                  children: e.manufacturerName,
                                                }),
                                                r.jsx("span", {
                                                  className:
                                                    "mt-1 block break-words text-sm font-semibold",
                                                  children: e.name,
                                                }),
                                              ],
                                            }),
                                            (0, r.jsxs)("span", {
                                              className:
                                                "shrink-0 text-right text-xs tabular-nums text-[color:var(--lien-muted)]",
                                              children: [
                                                e.retailPrice.toLocaleString(
                                                  "ja-JP",
                                                ),
                                                "円",
                                                r.jsx("br", {}),
                                                "在庫 ",
                                                e.stockQuantity,
                                              ],
                                            }),
                                          ],
                                        },
                                        e.id,
                                      );
                                    }),
                            })
                          : null,
                        "coupon" === s
                          ? (0, r.jsxs)("div", {
                              className: "grid gap-3",
                              children: [
                                r.jsx("button", {
                                  type: "button",
                                  onClick: () => {
                                    (x(""), t());
                                  },
                                  "aria-pressed": "" === u,
                                  className: `lien-list-action min-h-16 rounded-2xl border px-4 text-left shadow-sm ${"" === u ? "border-[color:var(--lien-primary)] bg-[#f8e9e3] ring-2 ring-[#e9c9be]/45" : "border-[#e8ded2] bg-white"}`,
                                  children: r.jsx("span", {
                                    className: "block text-sm font-semibold",
                                    children: "クーポンを利用しない",
                                  }),
                                }),
                                m.map((e) =>
                                  (0, r.jsxs)(
                                    "button",
                                    {
                                      type: "button",
                                      onClick: () => {
                                        (x(e.value), t());
                                      },
                                      "aria-pressed": u === e.value,
                                      className: `lien-list-action min-h-16 rounded-2xl border px-4 text-left shadow-sm ${u === e.value ? "border-[color:var(--lien-primary)] bg-[#f8e9e3] ring-2 ring-[#e9c9be]/45" : "border-[#e8ded2] bg-white"}`,
                                      children: [
                                        r.jsx("span", {
                                          className:
                                            "block text-sm font-semibold",
                                          children: e.label,
                                        }),
                                        r.jsx("span", {
                                          className:
                                            "mt-1 block text-xs leading-5 text-[color:var(--lien-muted)]",
                                          children: e.detail,
                                        }),
                                      ],
                                    },
                                    e.value,
                                  ),
                                ),
                                0 === m.length
                                  ? r.jsx("p", {
                                      className:
                                        "rounded-2xl bg-white px-4 py-5 text-sm text-[color:var(--lien-muted)]",
                                      children:
                                        "現在利用できるクーポンはありません。",
                                    })
                                  : null,
                              ],
                            })
                          : null,
                        "points" === s
                          ? (0, r.jsxs)("div", {
                              className:
                                "rounded-2xl border border-[#e8ded2] bg-white p-4",
                              children: [
                                r.jsx("p", {
                                  className: "text-sm font-semibold",
                                  children: "利用ポイント",
                                }),
                                (0, r.jsxs)("p", {
                                  className:
                                    "mt-1 text-xs leading-5 text-[color:var(--lien-muted)]",
                                  children: [
                                    "保有 ",
                                    p.toLocaleString("ja-JP"),
                                    "pt / 今回の上限 ",
                                    h.toLocaleString("ja-JP"),
                                    "pt",
                                  ],
                                }),
                                (0, r.jsxs)("div", {
                                  className: "mt-4 flex items-center gap-2",
                                  children: [
                                    r.jsx("input", {
                                      className:
                                        "lien-input min-w-0 flex-1 tabular-nums",
                                      type: "number",
                                      min: "0",
                                      max: h,
                                      step: "1",
                                      value: Math.min(b, h),
                                      onChange: (e) =>
                                        f(v(Number(e.target.value), 0, h)),
                                    }),
                                    r.jsx("span", {
                                      className:
                                        "text-sm font-semibold text-[color:var(--lien-muted)]",
                                      children: "pt",
                                    }),
                                  ],
                                }),
                                (0, r.jsxs)("div", {
                                  className: "mt-3 grid grid-cols-2 gap-2",
                                  children: [
                                    r.jsx("button", {
                                      type: "button",
                                      className:
                                        "lien-button-secondary min-h-10 px-3 text-xs",
                                      onClick: () => f(0),
                                      children: "利用しない",
                                    }),
                                    r.jsx("button", {
                                      type: "button",
                                      className:
                                        "lien-button-primary min-h-10 px-3 text-xs",
                                      onClick: () => f(h),
                                      disabled: h < 1,
                                      children: "上限まで使う",
                                    }),
                                  ],
                                }),
                                r.jsx("button", {
                                  type: "button",
                                  className:
                                    "mt-4 w-full text-center text-sm font-semibold text-[color:var(--lien-primary)]",
                                  onClick: t,
                                  children: "決定",
                                }),
                              ],
                            })
                          : null,
                      ],
                    }),
                  ],
                }),
              })
            : null;
        }
        function w({
          appointmentId: e,
          initialMenu: t,
          initialSubtotal: s,
          availablePoints: n,
          coupons: l,
          products: c,
          taxRate: w,
        }) {
          let [k, I] = (0, a.useState)(s),
            [P, S] = (0, a.useState)(""),
            [q, L] = (0, a.useState)(""),
            [$, A] = (0, a.useState)(0),
            [M, J] = (0, a.useState)([]),
            [C, _] = (0, a.useState)(!1),
            [E, Z] = (0, a.useState)("long"),
            F = P ? j[P] : 0,
            z = k + F,
            R = (0, a.useMemo)(
              () =>
                M.reduce((e, t) => {
                  let s = c.find((e) => e.id === t.productId);
                  return e + t.quantity * (s?.retailPrice ?? 0);
                }, 0),
              [M, c],
            ),
            D = l.find((e) => e.value === q) ?? null,
            T = D ? Math.floor((Math.max(0, z) * D.rate) / 100) : 0,
            Q = z + R,
            O = Math.max(0, Q - T),
            B = Math.min(n, Math.floor(0.5 * O)),
            U = Math.min($, B),
            H = Math.max(0, O - U),
            G =
              !Number.isSafeInteger(H) ||
              H <= 0 ||
              !Number.isInteger(w) ||
              w <= 0
                ? 0
                : Math.floor((H * w) / (100 + w)),
            V = g.bind(null, e);
          function W(e) {
            (Z(e), _(!0));
          }
          return (0, r.jsxs)("form", {
            action: V,
            className: "grid gap-5",
            children: [
              r.jsx(y, {}),
              r.jsx("input", {
                type: "hidden",
                name: "longHairLength",
                value: P,
              }),
              r.jsx("input", {
                type: "hidden",
                name: "couponSelection",
                value: q,
              }),
              r.jsx("input", {
                type: "hidden",
                name: "pointDiscount",
                value: U,
              }),
              (0, r.jsxs)("div", {
                className: "grid gap-4 sm:grid-cols-2",
                children: [
                  (0, r.jsxs)("label", {
                    className:
                      "grid gap-1.5 text-sm font-semibold sm:col-span-2",
                    children: [
                      (0, r.jsxs)("span", {
                        className: "inline-flex items-center gap-2",
                        children: [
                          r.jsx(o.Z, {
                            className:
                              "h-4 w-4 text-[color:var(--lien-primary)]",
                          }),
                          "本日のメニュー",
                        ],
                      }),
                      r.jsx("input", {
                        className: "lien-input",
                        name: "menu",
                        defaultValue: t,
                        placeholder: "カット + カラー",
                        required: !0,
                      }),
                    ],
                  }),
                  (0, r.jsxs)("label", {
                    className: "grid gap-1.5 text-sm font-semibold",
                    children: [
                      (0, r.jsxs)("span", {
                        className: "inline-flex items-center gap-2",
                        children: [
                          r.jsx(d, {
                            className:
                              "h-4 w-4 text-[color:var(--lien-primary)]",
                          }),
                          "基本施術料金",
                        ],
                      }),
                      r.jsx("input", {
                        className: "lien-input tabular-nums",
                        name: "subtotal",
                        type: "number",
                        min: "1",
                        step: "1",
                        value: k,
                        onChange: (e) => I(v(Number(e.target.value), 0, 1e7)),
                        required: !0,
                      }),
                    ],
                  }),
                  (0, r.jsxs)("label", {
                    className: "grid gap-1.5 text-sm font-semibold",
                    children: [
                      (0, r.jsxs)("span", {
                        className: "inline-flex items-center gap-2",
                        children: [
                          r.jsx(m, {
                            className:
                              "h-4 w-4 text-[color:var(--lien-primary)]",
                          }),
                          "支払い方法",
                        ],
                      }),
                      (0, r.jsxs)("select", {
                        className: "lien-input",
                        name: "paymentMethod",
                        defaultValue: "",
                        required: !0,
                        children: [
                          r.jsx("option", {
                            value: "",
                            disabled: !0,
                            children: "選択してください",
                          }),
                          r.jsx("option", { value: "現金", children: "現金" }),
                          r.jsx("option", {
                            value: "カード",
                            children: "カード",
                          }),
                          r.jsx("option", {
                            value: "QR決済",
                            children: "QR決済",
                          }),
                          r.jsx("option", {
                            value: "電子マネー",
                            children: "電子マネー",
                          }),
                          r.jsx("option", { value: "未収", children: "未収" }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              (0, r.jsxs)("section", {
                className:
                  "overflow-hidden rounded-[22px] border border-[color:var(--lien-border)] bg-white",
                children: [
                  (0, r.jsxs)("div", {
                    className:
                      "flex items-center justify-between gap-3 border-b border-[color:var(--lien-border)] px-4 py-4",
                    children: [
                      (0, r.jsxs)("div", {
                        children: [
                          r.jsx("h3", {
                            className: "text-sm font-semibold",
                            children: "会計項目",
                          }),
                          r.jsx("p", {
                            className:
                              "mt-1 text-xs text-[color:var(--lien-muted)]",
                            children:
                              "追加料金・商品・割引をここにまとめます。",
                          }),
                        ],
                      }),
                      (0, r.jsxs)("button", {
                        type: "button",
                        onClick: () => W("long"),
                        className: "lien-button-primary px-4",
                        children: [
                          r.jsx(u.Z, { className: "h-4 w-4" }),
                          "項目を追加",
                        ],
                      }),
                    ],
                  }),
                  (0, r.jsxs)("div", {
                    className: "divide-y divide-[color:var(--lien-border)]",
                    children: [
                      P
                        ? (0, r.jsxs)("div", {
                            className:
                              "flex items-center justify-between gap-3 px-4 py-3",
                            children: [
                              (0, r.jsxs)("span", {
                                className:
                                  "inline-flex items-center gap-2 text-sm font-semibold",
                                children: [
                                  r.jsx(x, {
                                    className:
                                      "h-4 w-4 text-[color:var(--lien-primary)]",
                                  }),
                                  "ロング料金 ",
                                  P,
                                ],
                              }),
                              (0, r.jsxs)("span", {
                                className: "flex items-center gap-2",
                                children: [
                                  (0, r.jsxs)("span", {
                                    className:
                                      "text-sm font-semibold tabular-nums",
                                    children: [
                                      "+",
                                      F.toLocaleString("ja-JP"),
                                      "円",
                                    ],
                                  }),
                                  r.jsx("button", {
                                    type: "button",
                                    onClick: () => S(""),
                                    className:
                                      "lien-icon-button min-h-9 min-w-9 border-transparent bg-[#fff4f2] text-[#884039] shadow-none",
                                    "aria-label": "ロング料金を外す",
                                    children: r.jsx(p.Z, {
                                      className: "h-4 w-4",
                                    }),
                                  }),
                                ],
                              }),
                            ],
                          })
                        : null,
                      M.map((e) => {
                        let t = c.find((t) => t.id === e.productId);
                        return t
                          ? (0, r.jsxs)(
                              "div",
                              {
                                className:
                                  "grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_7rem_auto] sm:items-center",
                                children: [
                                  r.jsx("input", {
                                    type: "hidden",
                                    name: "productId",
                                    value: e.productId,
                                  }),
                                  (0, r.jsxs)("div", {
                                    className: "min-w-0",
                                    children: [
                                      r.jsx("p", {
                                        className:
                                          "truncate text-xs font-semibold text-[color:var(--lien-primary)]",
                                        children: t.manufacturerName,
                                      }),
                                      r.jsx("p", {
                                        className:
                                          "mt-1 break-words text-sm font-semibold",
                                        children: t.name,
                                      }),
                                    ],
                                  }),
                                  (0, r.jsxs)("label", {
                                    className:
                                      "grid gap-1 text-xs font-semibold text-[color:var(--lien-muted)]",
                                    children: [
                                      "数量",
                                      r.jsx("input", {
                                        className:
                                          "lien-input h-10 tabular-nums",
                                        name: "productQuantity",
                                        type: "number",
                                        min: "1",
                                        max: Math.min(99, t.stockQuantity),
                                        value: e.quantity,
                                        onChange: (s) => {
                                          var r, a;
                                          return (
                                            (r = e.productId),
                                            (a = v(
                                              Number(s.target.value),
                                              1,
                                              Math.min(99, t.stockQuantity),
                                            )),
                                            void J((e) =>
                                              e.map((e) =>
                                                e.productId === r
                                                  ? { ...e, quantity: a }
                                                  : e,
                                              ),
                                            )
                                          );
                                        },
                                      }),
                                    ],
                                  }),
                                  (0, r.jsxs)("div", {
                                    className:
                                      "flex items-center justify-between gap-2 sm:justify-end",
                                    children: [
                                      (0, r.jsxs)("span", {
                                        className:
                                          "text-sm font-semibold tabular-nums",
                                        children: [
                                          (
                                            e.quantity * t.retailPrice
                                          ).toLocaleString("ja-JP"),
                                          "円",
                                        ],
                                      }),
                                      r.jsx("button", {
                                        type: "button",
                                        onClick: () =>
                                          J((t) =>
                                            t.filter(
                                              (t) =>
                                                t.productId !== e.productId,
                                            ),
                                          ),
                                        className:
                                          "lien-icon-button min-h-9 min-w-9 border-transparent bg-[#fff4f2] text-[#884039] shadow-none",
                                        "aria-label": `${t.name}を外す`,
                                        children: r.jsx(p.Z, {
                                          className: "h-4 w-4",
                                        }),
                                      }),
                                    ],
                                  }),
                                ],
                              },
                              e.productId,
                            )
                          : null;
                      }),
                      D
                        ? (0, r.jsxs)("div", {
                            className:
                              "flex items-center justify-between gap-3 px-4 py-3",
                            children: [
                              (0, r.jsxs)("span", {
                                className:
                                  "inline-flex min-w-0 items-center gap-2 text-sm font-semibold",
                                children: [
                                  r.jsx(h, {
                                    className:
                                      "h-4 w-4 shrink-0 text-[#47674a]",
                                  }),
                                  r.jsx("span", {
                                    className: "truncate",
                                    children: D.label,
                                  }),
                                ],
                              }),
                              (0, r.jsxs)("span", {
                                className: "flex shrink-0 items-center gap-2",
                                children: [
                                  (0, r.jsxs)("span", {
                                    className:
                                      "text-sm font-semibold tabular-nums text-[#47674a]",
                                    children: [
                                      "-",
                                      T.toLocaleString("ja-JP"),
                                      "円",
                                    ],
                                  }),
                                  r.jsx("button", {
                                    type: "button",
                                    onClick: () => L(""),
                                    className:
                                      "lien-icon-button min-h-9 min-w-9 border-transparent bg-[#fff4f2] text-[#884039] shadow-none",
                                    "aria-label": "クーポンを外す",
                                    children: r.jsx(p.Z, {
                                      className: "h-4 w-4",
                                    }),
                                  }),
                                ],
                              }),
                            ],
                          })
                        : null,
                      U > 0
                        ? (0, r.jsxs)("div", {
                            className:
                              "flex items-center justify-between gap-3 px-4 py-3",
                            children: [
                              (0, r.jsxs)("span", {
                                className:
                                  "inline-flex items-center gap-2 text-sm font-semibold",
                                children: [
                                  r.jsx(b, {
                                    className:
                                      "h-4 w-4 text-[color:var(--lien-primary)]",
                                  }),
                                  "ポイント利用",
                                ],
                              }),
                              (0, r.jsxs)("span", {
                                className: "flex items-center gap-2",
                                children: [
                                  (0, r.jsxs)("span", {
                                    className:
                                      "text-sm font-semibold tabular-nums text-[color:var(--lien-primary-dark)]",
                                    children: [
                                      "-",
                                      U.toLocaleString("ja-JP"),
                                      "円",
                                    ],
                                  }),
                                  r.jsx("button", {
                                    type: "button",
                                    onClick: () => A(0),
                                    className:
                                      "lien-icon-button min-h-9 min-w-9 border-transparent bg-[#fff4f2] text-[#884039] shadow-none",
                                    "aria-label": "ポイント利用を外す",
                                    children: r.jsx(p.Z, {
                                      className: "h-4 w-4",
                                    }),
                                  }),
                                ],
                              }),
                            ],
                          })
                        : null,
                      P || 0 !== M.length || D || 0 !== U
                        ? null
                        : r.jsx("p", {
                            className:
                              "px-4 py-5 text-center text-sm text-[color:var(--lien-muted)]",
                            children: "追加項目はありません。",
                          }),
                    ],
                  }),
                  (0, r.jsxs)("div", {
                    className:
                      "grid grid-cols-2 gap-px border-t border-[color:var(--lien-border)] bg-[color:var(--lien-border)] sm:grid-cols-4",
                    children: [
                      r.jsx("button", {
                        type: "button",
                        onClick: () => W("long"),
                        className:
                          "min-h-11 bg-[color:var(--lien-surface-soft)] px-3 text-xs font-semibold transition hover:bg-white hover:text-[color:var(--lien-primary-dark)] active:bg-[#f3e5dc]",
                        children: "ロング料金",
                      }),
                      r.jsx("button", {
                        type: "button",
                        onClick: () => W("product"),
                        className:
                          "min-h-11 bg-[color:var(--lien-surface-soft)] px-3 text-xs font-semibold transition hover:bg-white hover:text-[color:var(--lien-primary-dark)] active:bg-[#f3e5dc]",
                        children: "商品",
                      }),
                      r.jsx("button", {
                        type: "button",
                        onClick: () => W("coupon"),
                        className:
                          "min-h-11 bg-[color:var(--lien-surface-soft)] px-3 text-xs font-semibold transition hover:bg-white hover:text-[color:var(--lien-primary-dark)] active:bg-[#f3e5dc]",
                        children: "クーポン",
                      }),
                      r.jsx("button", {
                        type: "button",
                        onClick: () => W("points"),
                        className:
                          "min-h-11 bg-[color:var(--lien-surface-soft)] px-3 text-xs font-semibold transition hover:bg-white hover:text-[color:var(--lien-primary-dark)] active:bg-[#f3e5dc]",
                        children: "ポイント",
                      }),
                    ],
                  }),
                ],
              }),
              r.jsx("section", {
                className:
                  "rounded-[22px] border border-[#ddc68b] bg-gradient-to-br from-white via-[#fff9ee] to-[#f7e8c9] p-5",
                children: (0, r.jsxs)("div", {
                  className: "grid gap-2 text-sm",
                  children: [
                    (0, r.jsxs)("div", {
                      className:
                        "flex justify-between gap-4 text-[color:var(--lien-muted)]",
                      children: [
                        r.jsx("span", { children: "基本施術料金" }),
                        (0, r.jsxs)("span", {
                          className: "font-semibold tabular-nums",
                          children: [k.toLocaleString("ja-JP"), "円"],
                        }),
                      ],
                    }),
                    P
                      ? (0, r.jsxs)("div", {
                          className:
                            "flex justify-between gap-4 text-[color:var(--lien-muted)]",
                          children: [
                            (0, r.jsxs)("span", {
                              children: ["ロング料金 ", P],
                            }),
                            (0, r.jsxs)("span", {
                              className: "font-semibold tabular-nums",
                              children: ["+", F.toLocaleString("ja-JP"), "円"],
                            }),
                          ],
                        })
                      : null,
                    R > 0
                      ? (0, r.jsxs)("div", {
                          className:
                            "flex justify-between gap-4 text-[color:var(--lien-muted)]",
                          children: [
                            r.jsx("span", { children: "商品" }),
                            (0, r.jsxs)("span", {
                              className: "font-semibold tabular-nums",
                              children: [R.toLocaleString("ja-JP"), "円"],
                            }),
                          ],
                        })
                      : null,
                    (0, r.jsxs)("div", {
                      className: "flex justify-between gap-4",
                      children: [
                        r.jsx("span", { children: "小計" }),
                        (0, r.jsxs)("span", {
                          className: "font-semibold tabular-nums",
                          children: [Q.toLocaleString("ja-JP"), "円"],
                        }),
                      ],
                    }),
                    D
                      ? (0, r.jsxs)("div", {
                          className:
                            "flex justify-between gap-4 text-[#47674a]",
                          children: [
                            r.jsx("span", { children: D.label }),
                            (0, r.jsxs)("span", {
                              className: "font-semibold tabular-nums",
                              children: ["-", T.toLocaleString("ja-JP"), "円"],
                            }),
                          ],
                        })
                      : null,
                    U > 0
                      ? (0, r.jsxs)("div", {
                          className:
                            "flex justify-between gap-4 text-[color:var(--lien-primary-dark)]",
                          children: [
                            r.jsx("span", { children: "ポイント割引" }),
                            (0, r.jsxs)("span", {
                              className: "font-semibold tabular-nums",
                              children: ["-", U.toLocaleString("ja-JP"), "円"],
                            }),
                          ],
                        })
                      : null,
                    (0, r.jsxs)("div", {
                      className:
                        "mt-2 flex items-end justify-between gap-4 border-t border-[#ddc68b] pt-4",
                      children: [
                        r.jsx("span", {
                          className: "font-semibold",
                          children: "本日のお会計",
                        }),
                        (0, r.jsxs)("span", {
                          className:
                            "text-3xl font-semibold tabular-nums text-[color:var(--lien-primary-dark)]",
                          children: [
                            H.toLocaleString("ja-JP"),
                            r.jsx("span", {
                              className: "ml-1 text-sm",
                              children: "円",
                            }),
                          ],
                        }),
                      ],
                    }),
                    r.jsx("div", {
                      className:
                        "flex justify-end text-xs text-[color:var(--lien-muted)]",
                      children: (0, r.jsxs)("span", {
                        children: [
                          "うち消費税（",
                          w,
                          "%） ",
                          G.toLocaleString("ja-JP"),
                          "円",
                        ],
                      }),
                    }),
                  ],
                }),
              }),
              r.jsx(f.ConfirmSubmitButton, {
                message: `本日のお会計 ${H.toLocaleString("ja-JP")}円を確定しますか？確定後は売上とポイント履歴に記録されます。`,
                pendingText: (0, r.jsxs)("span", {
                  className: "inline-flex items-center gap-2",
                  children: [
                    r.jsx(i.Z, { className: "h-4 w-4 animate-spin" }),
                    "会計処理中...",
                  ],
                }),
                className: "lien-button-primary w-full",
                children: "会計を確定する",
              }),
              r.jsx(N, {
                open: C,
                onClose: () => _(!1),
                section: E,
                setSection: Z,
                longHairLength: P,
                setLongHairLength: S,
                products: c,
                productLines: M,
                addProduct: function (e) {
                  let t = c.find((t) => t.id === e);
                  !t ||
                    t.stockQuantity < 1 ||
                    M.some((e) => e.productId === t.id) ||
                    J((e) => [...e, { productId: t.id, quantity: 1 }]);
                },
                coupons: l,
                couponSelection: q,
                setCouponSelection: L,
                availablePoints: n,
                maxPointDiscount: B,
                pointDiscount: U,
                setPointDiscount: A,
              }),
            ],
          });
        }
      },
      98594: (e, t, s) => {
        "use strict";
        s.d(t, { ConfirmSubmitButton: () => n });
        var r = s(10326),
          a = s(60962);
        function n({
          children: e,
          message: t,
          className: s,
          pendingText: n = "処理中...",
        }) {
          let { pending: i } = (0, a.useFormStatus)();
          return r.jsx("button", {
            type: "submit",
            disabled: i,
            "aria-busy": i,
            className: `${s ?? ""} disabled:pointer-events-none disabled:opacity-60`,
            onClick: (e) => {
              if (i) {
                e.preventDefault();
                return;
              }
              let s = e.currentTarget.form;
              (!s || s.checkValidity()) &&
                (window.confirm(t) || e.preventDefault());
            },
            children: i ? n : e,
          });
        }
      },
      71768: (e, t, s) => {
        "use strict";
        s.a(e, async (e, r) => {
          try {
            (s.r(t), s.d(t, { default: () => k, dynamic: () => I }));
            var a = s(19510),
              n = s(57371),
              i = s(58585),
              l = s(72852),
              o = s(48723),
              c = s(24874),
              d = s(56247),
              m = s(67209),
              u = s(61473),
              x = s(42189),
              p = s(60994),
              h = s(9922),
              b = s(73884),
              f = s(76598),
              g = s(90878),
              j = s(59219),
              v = s(57295),
              y = s(13538),
              N = e([h]);
            h = (N.then ? (await N)() : N)[0];
            let I = "force-dynamic";
            function w(e) {
              return new Intl.DateTimeFormat("ja-JP", {
                timeZone: "Asia/Tokyo",
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "short",
                hour: "2-digit",
                minute: "2-digit",
              }).format(e);
            }
            async function k({ params: e, searchParams: t }) {
              var s, r;
              let N = await (0, j.Os)(["ADMIN", "STAFF"]);
              N.organizationId || (0, i.notFound)();
              let k = await y._.appointment.findFirst({
                where: {
                  id: e.appointmentId,
                  customer: {
                    organizationId: N.organizationId,
                    deletedAt: null,
                  },
                },
                include: {
                  customer: {
                    select: {
                      id: !0,
                      name: !0,
                      phone: !0,
                      organizationId: !0,
                      organization: { select: { taxRate: !0 } },
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
              k || (0, i.notFound)();
              let [I, P, S, q, L] = await Promise.all([
                  (0, v.n3)(k.customerId),
                  y._.pointTransaction.findFirst({
                    where: {
                      customerId: k.customerId,
                      sourceType: "checkout",
                      sourceId: k.id,
                      type: "redeem",
                    },
                    orderBy: { createdAt: "desc" },
                  }),
                  y._.product.findMany({
                    where: {
                      organizationId: k.customer.organizationId,
                      active: !0,
                    },
                    orderBy: [{ manufacturerName: "asc" }, { name: "asc" }],
                    select: {
                      id: !0,
                      manufacturerName: !0,
                      name: !0,
                      category: !0,
                      retailPrice: !0,
                      stockQuantity: !0,
                    },
                  }),
                  (0, v.Pl)(k.customerId),
                  y._.couponIssue.findMany({
                    where: {
                      customerId: k.customerId,
                      status: "issued",
                      issuedAt: { lte: new Date() },
                      expiresAt: { gte: new Date() },
                    },
                    orderBy: { expiresAt: "asc" },
                    select: {
                      id: !0,
                      couponCode: !0,
                      discountRate: !0,
                      targetMenusJson: !0,
                      expiresAt: !0,
                    },
                  }),
                ]),
                $ = k.serviceSales[0] ?? null,
                A = P ? Math.abs(P.amount) : 0,
                M = (function (e) {
                  let t =
                    e?.match(/クーポン (.+?) -([\d,]+)円/) ??
                    e?.match(/(友達紹介（(?:[^）]+)）\d+%OFF) -([\d,]+)円/);
                  return t
                    ? { label: t[1], amount: Number(t[2].replace(/,/g, "")) }
                    : null;
                })($?.note ?? null),
                J = M?.amount ?? 0,
                C = (function (e) {
                  let t = e?.match(/ロング料金 (M|L|LL) \+([\d,]+)円/);
                  return t
                    ? { length: t[1], amount: Number(t[2].replace(/,/g, "")) }
                    : null;
                })($?.note ?? null),
                _ = $?.productLines.reduce((e, t) => e + t.lineTotal, 0) ?? 0,
                E =
                  k.estimatedPrice ??
                  ($ ? Math.max(0, $.amount + A + J - _) : 0),
                Z =
                  (function (e) {
                    let t =
                      e?.match(/基本施術料金 ([\d,]+)円/) ??
                      e?.match(/施術料金 ([\d,]+)円/);
                    return t ? Number(t[1].replace(/,/g, "")) : null;
                  })($?.note ?? null) ?? Math.max(0, E - (C?.amount ?? 0)),
                F = E + _,
                z = $?.amount ?? Math.max(0, F - J - A),
                R =
                  k.staffName ??
                  ((s = k.note),
                  (r = "担当"),
                  s
                    ?.split("\n")
                    .find((e) => e.startsWith(`${r}: `))
                    ?.slice(r.length + 2) ?? null) ??
                  "フリー",
                D = !!$,
                T = [
                  ...(q
                    ? [
                        {
                          value: "referral",
                          label: q.label,
                          detail: `施術料金から${q.rate}%OFF`,
                          rate: q.rate,
                        },
                      ]
                    : []),
                  ...L.map((e) => ({
                    value: `couponIssue:${e.id}`,
                    label: `限定クーポン ${e.discountRate}%OFF`,
                    detail: `${e.couponCode} / ${new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric" }).format(e.expiresAt)}まで`,
                    rate: e.discountRate,
                  })),
                ];
              return (0, a.jsxs)("div", {
                className: "mx-auto grid w-full max-w-6xl gap-6",
                children: [
                  a.jsx(g.mr, {
                    eyebrow: (0, a.jsxs)("span", {
                      className: "inline-flex items-center gap-2",
                      children: [
                        a.jsx(l.Z, { className: "h-3.5 w-3.5" }),
                        "Appointment Checkout",
                      ],
                    }),
                    title: `${k.customer.name}様の予約・会計`,
                    description:
                      "予約内容を確認し、ポイント割引を反映した本日のお会計を記録します。",
                    breadcrumb: a.jsx(n.default, {
                      href: "/admin/appointments",
                      className: "hover:text-[color:var(--lien-primary)]",
                      children: "予約カレンダー / 予約詳細",
                    }),
                    primaryAction: (0, a.jsxs)(n.default, {
                      href: `/admin/customers/${k.customer.id}`,
                      className: "lien-button-primary px-4",
                      children: [
                        a.jsx(o.Z, { className: "h-4 w-4" }),
                        "お客様カルテ",
                      ],
                    }),
                    secondaryAction: (0, a.jsxs)(n.default, {
                      href: "/admin/appointments",
                      className: "lien-button-secondary px-4",
                      children: [
                        a.jsx(c.Z, { className: "h-4 w-4" }),
                        "カレンダーへ戻る",
                      ],
                    }),
                    visual: a.jsx(f.n8, {
                      variant: "consultation",
                      className: "h-full min-h-40",
                      imageClassName: "object-[52%_48%]",
                      sizes: "(max-width: 1024px) 100vw, 352px",
                      overlay: "none",
                    }),
                  }),
                  t?.error
                    ? a.jsx("div", {
                        role: "alert",
                        className:
                          "rounded-[18px] border border-[#edc2bd] bg-[#fff1ef] px-4 py-3 text-sm font-semibold text-[#884039]",
                        children: t.error,
                      })
                    : null,
                  t?.checkoutCancelled === "1"
                    ? (0, a.jsxs)("div", {
                        role: "status",
                        className:
                          "rounded-[18px] border border-[#cbdcc8] bg-[#eef5ed] px-4 py-3 text-sm font-semibold text-[#405d41]",
                        children: [
                          "会計を取り消しました。下の会計欄で内容を修正し、再度「会計を確定する」を押してください。",
                          a.jsx("span", {
                            className: "mt-1 block text-xs font-medium",
                            children:
                              "取消操作を行ったログイン担当者の名前は、お客様の履歴に保存されています。",
                          }),
                        ],
                      })
                    : null,
                  t?.completed === "1"
                    ? (0, a.jsxs)("div", {
                        className:
                          "flex items-center gap-3 rounded-[18px] border border-[#cbdcc8] bg-[#eef5ed] px-4 py-3 text-sm font-semibold text-[#405d41]",
                        children: [
                          a.jsx(d.Z, { className: "h-5 w-5 shrink-0" }),
                          Number(t.bookingPoints) > 0
                            ? `会計を記録し、オンライン予約特典${Number(t.bookingPoints).toLocaleString("ja-JP")}ptを付与しました。`
                            : "会計を記録しました。売上とポイント履歴にも反映されています。",
                        ],
                      })
                    : null,
                  (0, a.jsxs)("section", {
                    className: "grid gap-3 sm:grid-cols-2 xl:grid-cols-4",
                    children: [
                      a.jsx(g.i9, {
                        label: "予約日時",
                        value: w(k.scheduledAt),
                        icon: m.Z,
                        helper: k.status,
                      }),
                      a.jsx(g.i9, {
                        label: "本日のメニュー",
                        value: k.menu ?? "未記載",
                        icon: u.Z,
                        helper: R ? `担当: ${R}` : "担当者未記載",
                        tone: "highlight",
                      }),
                      a.jsx(g.i9, {
                        label: "利用可能ポイント",
                        value: I.availablePoints.toLocaleString("ja-JP"),
                        unit: "pt",
                        icon: x.Z,
                        tone: "success",
                      }),
                      a.jsx(g.i9, {
                        label: "本日のお会計",
                        value: z.toLocaleString("ja-JP"),
                        unit: "円",
                        icon: l.Z,
                        helper: D ? "会計済み" : "ポイント反映前",
                        tone: "premium",
                      }),
                    ],
                  }),
                  (0, a.jsxs)("div", {
                    className:
                    "grid min-w-0 gap-6 lg:items-start lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]",
                    children: [
                      (0, a.jsxs)(g.IP, {
                        children: [
                          (0, a.jsxs)("div", {
                            className: "flex items-start justify-between gap-3",
                            children: [
                              (0, a.jsxs)("div", {
                                children: [
                                  a.jsx("p", {
                                    className:
                                      "text-xs font-semibold text-[color:var(--lien-muted)]",
                                    children: "お客様",
                                  }),
                                  (0, a.jsxs)("h2", {
                                    className:
                                      "mt-1 text-xl font-semibold text-[color:var(--lien-ink)]",
                                    children: [k.customer.name, "様"],
                                  }),
                                  k.customer.phone
                                    ? a.jsx("p", {
                                        className:
                                          "mt-1 text-sm tabular-nums text-[color:var(--lien-muted)]",
                                        children: k.customer.phone,
                                      })
                                    : null,
                                ],
                              }),
                              a.jsx(g.OE, {
                                tone: D ? "success" : "highlight",
                                children: D ? "会計済み" : k.status,
                              }),
                            ],
                          }),
                          (0, a.jsxs)("dl", {
                            className:
                              "mt-5 grid gap-3 border-t border-[color:var(--lien-border)] pt-5 text-sm",
                            children: [
                              (0, a.jsxs)("div", {
                                className: "flex justify-between gap-4",
                                children: [
                                  a.jsx("dt", {
                                    className: "text-[color:var(--lien-muted)]",
                                    children: "予約日時",
                                  }),
                                  a.jsx("dd", {
                                    className: "text-right font-semibold",
                                    children: w(k.scheduledAt),
                                  }),
                                ],
                              }),
                              k.durationMinutes
                                ? (0, a.jsxs)("div", {
                                    className: "flex justify-between gap-4",
                                    children: [
                                      a.jsx("dt", {
                                        className:
                                          "text-[color:var(--lien-muted)]",
                                        children: "施術時間",
                                      }),
                                      (0, a.jsxs)("dd", {
                                        className: "font-semibold",
                                        children: [k.durationMinutes, "分"],
                                      }),
                                    ],
                                  })
                                : null,
                              (0, a.jsxs)("div", {
                                className: "flex justify-between gap-4",
                                children: [
                                  a.jsx("dt", {
                                    className: "text-[color:var(--lien-muted)]",
                                    children: "メニュー",
                                  }),
                                  a.jsx("dd", {
                                    className: "text-right font-semibold",
                                    children: k.menu ?? "未記載",
                                  }),
                                ],
                              }),
                              (0, a.jsxs)("div", {
                                className: "flex justify-between gap-4",
                                children: [
                                  a.jsx("dt", {
                                    className: "text-[color:var(--lien-muted)]",
                                    children: "予定料金",
                                  }),
                                  (0, a.jsxs)("dd", {
                                    className: "font-semibold tabular-nums",
                                    children: [E.toLocaleString("ja-JP"), "円"],
                                  }),
                                ],
                              }),
                              R
                                ? (0, a.jsxs)("div", {
                                    className: "flex justify-between gap-4",
                                    children: [
                                      a.jsx("dt", {
                                        className:
                                          "text-[color:var(--lien-muted)]",
                                        children: "担当",
                                      }),
                                      a.jsx("dd", {
                                        className: "font-semibold",
                                        children: R,
                                      }),
                                    ],
                                  })
                                : null,
                            ],
                          }),
                          k.note
                            ? a.jsx("p", {
                                className:
                                  "mt-5 rounded-2xl bg-[color:var(--lien-surface-soft)] p-4 text-xs leading-6 text-[color:var(--lien-muted)]",
                                children: k.note,
                              })
                            : null,
                        ],
                      }),
                      a.jsx(g.IP, {
                        tone: D ? "success" : "default",
                        children: $
                          ? (0, a.jsxs)("div", {
                              className: "grid gap-5",
                              children: [
                                (0, a.jsxs)("div", {
                                  className: "flex items-center gap-3",
                                  children: [
                                    a.jsx("span", {
                                      className:
                                        "inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#47674a] shadow-sm",
                                      children: a.jsx(d.Z, {
                                        className: "h-5 w-5",
                                      }),
                                    }),
                                    (0, a.jsxs)("div", {
                                      children: [
                                        a.jsx("p", {
                                          className:
                                            "text-xs font-semibold text-[#47674a]",
                                          children: "会計完了",
                                        }),
                                        a.jsx("h2", {
                                          className:
                                            "mt-1 text-lg font-semibold",
                                          children: $.title,
                                        }),
                                      ],
                                    }),
                                  ],
                                }),
                                (0, a.jsxs)("dl", {
                                  className: "grid gap-3 text-sm",
                                  children: [
                                    (0, a.jsxs)("div", {
                                      className: "flex justify-between gap-4",
                                      children: [
                                        a.jsx("dt", {
                                          className:
                                            "text-[color:var(--lien-muted)]",
                                          children: "基本施術料金",
                                        }),
                                        (0, a.jsxs)("dd", {
                                          className:
                                            "font-semibold tabular-nums",
                                          children: [
                                            Z.toLocaleString("ja-JP"),
                                            "円",
                                          ],
                                        }),
                                      ],
                                    }),
                                    C
                                      ? (0, a.jsxs)("div", {
                                          className:
                                            "flex justify-between gap-4",
                                          children: [
                                            (0, a.jsxs)("dt", {
                                              className:
                                                "text-[color:var(--lien-muted)]",
                                              children: [
                                                "ロング料金 ",
                                                C.length,
                                              ],
                                            }),
                                            (0, a.jsxs)("dd", {
                                              className:
                                                "font-semibold tabular-nums",
                                              children: [
                                                "+",
                                                C.amount.toLocaleString(
                                                  "ja-JP",
                                                ),
                                                "円",
                                              ],
                                            }),
                                          ],
                                        })
                                      : null,
                                    $.productLines.map((e) =>
                                      (0, a.jsxs)(
                                        "div",
                                        {
                                          className:
                                            "flex justify-between gap-4",
                                          children: [
                                            (0, a.jsxs)("dt", {
                                              className:
                                                "min-w-0 text-[color:var(--lien-muted)]",
                                              children: [
                                                e.productNameSnapshot,
                                                " \xd7 ",
                                                e.quantity,
                                              ],
                                            }),
                                            (0, a.jsxs)("dd", {
                                              className:
                                                "shrink-0 font-semibold tabular-nums",
                                              children: [
                                                e.lineTotal.toLocaleString(
                                                  "ja-JP",
                                                ),
                                                "円",
                                              ],
                                            }),
                                          ],
                                        },
                                        e.id,
                                      ),
                                    ),
                                    _ > 0
                                      ? (0, a.jsxs)("div", {
                                          className:
                                            "flex justify-between gap-4",
                                          children: [
                                            a.jsx("dt", {
                                              className:
                                                "text-[color:var(--lien-muted)]",
                                              children: "商品計",
                                            }),
                                            (0, a.jsxs)("dd", {
                                              className:
                                                "font-semibold tabular-nums",
                                              children: [
                                                _.toLocaleString("ja-JP"),
                                                "円",
                                              ],
                                            }),
                                          ],
                                        })
                                      : null,
                                    (0, a.jsxs)("div", {
                                      className: "flex justify-between gap-4",
                                      children: [
                                        a.jsx("dt", {
                                          className:
                                            "text-[color:var(--lien-muted)]",
                                          children: "小計",
                                        }),
                                        (0, a.jsxs)("dd", {
                                          className:
                                            "font-semibold tabular-nums",
                                          children: [
                                            F.toLocaleString("ja-JP"),
                                            "円",
                                          ],
                                        }),
                                      ],
                                    }),
                                    M
                                      ? (0, a.jsxs)("div", {
                                          className:
                                            "flex justify-between gap-4",
                                          children: [
                                            a.jsx("dt", {
                                              className: "text-[#47674a]",
                                              children: M.label,
                                            }),
                                            (0, a.jsxs)("dd", {
                                              className:
                                                "font-semibold tabular-nums text-[#47674a]",
                                              children: [
                                                "-",
                                                M.amount.toLocaleString(
                                                  "ja-JP",
                                                ),
                                                "円",
                                              ],
                                            }),
                                          ],
                                        })
                                      : null,
                                    (0, a.jsxs)("div", {
                                      className: "flex justify-between gap-4",
                                      children: [
                                        a.jsx("dt", {
                                          className:
                                            "text-[color:var(--lien-muted)]",
                                          children: "ポイント割引",
                                        }),
                                        (0, a.jsxs)("dd", {
                                          className:
                                            "font-semibold tabular-nums text-[color:var(--lien-primary-dark)]",
                                          children: [
                                            "-",
                                            A.toLocaleString("ja-JP"),
                                            "円",
                                          ],
                                        }),
                                      ],
                                    }),
                                    (0, a.jsxs)("div", {
                                      className:
                                        "flex items-end justify-between gap-4 border-t border-[#cbdcc8] pt-4",
                                      children: [
                                        a.jsx("dt", {
                                          className: "font-semibold",
                                          children: "本日のお会計",
                                        }),
                                        (0, a.jsxs)("dd", {
                                          className:
                                            "text-3xl font-semibold tabular-nums text-[#405d41]",
                                          children: [
                                            $.amount.toLocaleString("ja-JP"),
                                            a.jsx("span", {
                                              className: "ml-1 text-sm",
                                              children: "円",
                                            }),
                                          ],
                                        }),
                                      ],
                                    }),
                                  ],
                                }),
                                (0, a.jsxs)("p", {
                                  className:
                                    "text-xs text-[color:var(--lien-muted)]",
                                  children: [
                                    "支払い方法: ",
                                    $.paymentMethod ?? "未記載",
                                  ],
                                }),
                                a.jsx(b.A, {
                                  appointmentId: k.id,
                                  className: "mt-1 w-full",
                                }),
                                (0, a.jsxs)("form", {
                                  action: `/api/admin/appointments/${encodeURIComponent(k.id)}/schedule`,
                                  method: "post",
                                  className:
                                    "mt-4 rounded-2xl border border-[#edc2bd] bg-[#fff4f2] p-4",
                                  children: [
                                    a.jsx("input", {
                                      type: "hidden",
                                      name: "confirm",
                                      value: "cancel",
                                    }),
                                    a.jsx("p", {
                                      className:
                                        "text-sm font-semibold text-[#884039]",
                                      children: "会計を取り消す",
                                    }),
                                    a.jsx("p", {
                                      className:
                                        "mt-1 text-xs leading-5 text-[#884039]",
                                      children:
                                        "売上、商品在庫、ポイント、クーポン、紹介特典を会計前の状態へ戻します。",
                                    }),
                                    (0, a.jsxs)("label", {
                                      className:
                                        "mt-3 flex items-start gap-2 text-xs font-semibold text-[#884039]",
                                      children: [
                                        a.jsx("input", {
                                          type: "checkbox",
                                          required: !0,
                                          className: "mt-0.5 h-4 w-4",
                                        }),
                                        "会計内容を確認し、取り消すことに同意します",
                                      ],
                                    }),
                                    a.jsx("button", {
                                      type: "submit",
                                      className:
                                        "mt-3 min-h-11 w-full rounded-full border border-[#b85f55] bg-white px-4 text-sm font-semibold text-[#884039]",
                                      children: "会計を取り消す",
                                    }),
                                  ],
                                }),
                              ],
                            })
                          : a.jsx(p.n, {
                              appointmentId: k.id,
                              initialMenu: k.menu ?? "",
                              initialSubtotal: k.estimatedPrice ?? 0,
                              availablePoints: I.availablePoints,
                              coupons: T,
                              products: S,
                              taxRate: k.customer.organization.taxRate,
                            }),
                      }),
                    ],
                  }),
                  D
                    ? a.jsx(h.P, {
                        customerId: k.customerId,
                        scheduledAt: k.scheduledAt,
                      })
                    : null,
                ],
              });
            }
            r();
          } catch (e) {
            r(e);
          }
        });
      },
      60994: (e, t, s) => {
        "use strict";
        s.d(t, { n: () => r });
        let r = (0, s(68570).createProxy)(
          String.raw`/app/src/components/appointments/appointment-checkout-form.tsx#AppointmentCheckoutForm`,
        );
      },
      90878: (e, t, s) => {
        "use strict";
        s.d(t, {
          IP: () => o,
          OE: () => d,
          i9: () => c,
          mr: () => l,
          ub: () => m,
        });
        var r = s(19510);
        function a(...e) {
          return e.filter(Boolean).join(" ");
        }
        let n = {
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
          title: t,
          description: s,
          primaryAction: n,
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
                className: a(
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
                            children: t,
                          }),
                          s
                            ? r.jsx("p", {
                                className:
                                  "mt-2 max-w-3xl text-sm leading-6 text-[color:var(--lien-muted)]",
                                children: s,
                              })
                            : null,
                        ],
                      }),
                      n || i
                        ? (0, r.jsxs)("div", {
                            className:
                              "flex w-full shrink-0 flex-wrap gap-2 sm:w-auto [&>*]:min-h-11 [&>*]:flex-1 sm:[&>*]:flex-none",
                            children: [i, n],
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
          className: t = "",
          tone: s = "default",
          hoverable: i = !1,
          as: l = "section",
        }) {
          return r.jsx(l, {
            className: a(
              "min-w-0 rounded-[22px] border p-5 shadow-lien-sm transition sm:p-6",
              n[s],
              i && "lien-hover-lift",
              t,
            ),
            children: e,
          });
        }
        function c({
          label: e,
          value: t,
          unit: s,
          delta: a,
          helper: n,
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
                            children: t,
                          }),
                          s
                            ? r.jsx("span", {
                                className:
                                  "text-xs font-semibold text-[color:var(--lien-muted)]",
                                children: s,
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
              a
                ? r.jsx("div", {
                    className:
                      "mt-3 text-xs font-semibold text-[color:var(--lien-primary-dark)]",
                    children: a,
                  })
                : null,
              n
                ? r.jsx("p", {
                    className:
                      "mt-2 text-xs leading-5 text-[color:var(--lien-muted)]",
                    children: n,
                  })
                : null,
            ],
          });
        }
        function d({
          children: e,
          tone: t = "default",
          icon: s,
          className: n = "",
        }) {
          return (0, r.jsxs)("span", {
            className: a("lien-badge", i[t], n),
            children: [s ? r.jsx(s, { className: "h-3.5 w-3.5" }) : null, e],
          });
        }
        function m({ icon: e, title: t, description: s, action: a }) {
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
                    children: t,
                  }),
                  s
                    ? r.jsx("p", {
                        className:
                          "mt-2 text-sm leading-6 text-[color:var(--lien-muted)]",
                        children: s,
                      })
                    : null,
                  a ? r.jsx("div", { className: "mt-4", children: a }) : null,
                ],
              }),
            ],
          });
        }
      },
      69541: (e, t, s) => {
        "use strict";
        (s.r(t), s.d(t, { completeAppointmentCheckoutAction: () => v }));
        var r = s(27745);
        s(26461);
        var a = s(30207),
          n = s(74739),
          i = s(24831),
          l = s(81199),
          o = s(84770);
        function c(e, t) {
          let s = new Date(e);
          return (s.setDate(s.getDate() + t), s);
        }
        async function d({ db: e, proposal: t, visitAt: s, baseUrl: r }) {
          if (!t.purchased && "purchased" !== t.status)
            throw Error("購入済みの商品だけアンケートを発行できます。");
          for (let a = 0; a < 10; a += 1) {
            let a = (0, o.randomBytes)(32).toString("base64url"),
              n = (0, o.createHash)("sha256").update(a).digest("hex");
            if (
              await e.productReviewRequest.findUnique({
                where: { tokenHash: n },
                select: { id: !0 },
              })
            )
              continue;
            let i = await e.productReviewRequest.create({
              data: {
                productProposalId: t.id,
                tokenHash: n,
                requestedAt: s,
                expiresAt: (function (e, t = new Date()) {
                  return "purchased" === e
                    ? c(t, 30)
                    : "used_in_service" === e
                      ? c(t, 7)
                      : c(t, 14);
                })("purchased", s),
                status: "active",
              },
              select: { id: !0, expiresAt: !0 },
            });
            return {
              requestId: i.id,
              reviewUrl: (function (e, t) {
                let s =
                    t ??
                    process.env.NEXT_PUBLIC_APP_URL ??
                    process.env.APP_URL ??
                    "",
                  r = `/review/product/${encodeURIComponent(e)}`;
                return s ? `${s.replace(/\/$/, "")}${r}` : r;
              })(a, r),
              expiresAt: i.expiresAt,
            };
          }
          throw Error(
            "レビュー依頼URLを生成できませんでした。もう一度お試しください。",
          );
        }
        var m = s(12206);
        let u = /^\d{4}-\d{2}-\d{2}$/;
        function x(e, t) {
          let s = (0, o.createHash)("sha256")
            .update(`${e}:${t}`)
            .digest("hex")
            .slice(0, 24);
          return `history_${s}`;
        }
        async function p(e, t) {
          var s;
          let r =
              ((s = t.occurredAt),
              new Intl.DateTimeFormat("en-CA", {
                timeZone: "Asia/Tokyo",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              }).format(s)),
            a = (function (e) {
              if (!u.test(e)) return null;
              let t = new Date(`${e}T00:00:00+09:00`);
              if (Number.isNaN(t.getTime())) return null;
              let s = new Date(t.getTime() + 864e5);
              return { key: e, start: t, end: s };
            })(r);
          if (!a) throw Error("来店日を確認できませんでした。");
          let n = await e.visit.findFirst({
            where: {
              customerId: t.customerId,
              visitedAt: { gte: a.start, lt: a.end },
            },
            orderBy: { visitedAt: "desc" },
            select: {
              id: !0,
              stylistName: !0,
              requestedStyle: !0,
              performedStyle: !0,
            },
          });
          if (n) {
            let s = {};
            return (!n.stylistName &&
              t.staffName &&
              (s.stylistName = t.staffName),
            !n.requestedStyle && t.menu && (s.requestedStyle = t.menu),
            !n.performedStyle && t.menu && (s.performedStyle = t.menu),
            Object.keys(s).length > 0)
              ? e.visit.update({
                  where: { id: n.id },
                  data: s,
                  select: { id: !0 },
                })
              : { id: n.id };
          }
          return e.visit.upsert({
            where: { id: x(t.customerId, r) },
            update: {},
            create: {
              id: x(t.customerId, r),
              customerId: t.customerId,
              visitedAt: t.occurredAt,
              stylistName: t.staffName?.trim() || null,
              requestedStyle: t.menu?.trim() || null,
              performedStyle: t.menu?.trim() || null,
            },
            select: { id: !0 },
          });
        }
        let h = { M: 600, L: 1100, LL: 1700 };
        function b(e) {
          return Object.prototype.hasOwnProperty.call(h, e);
        }
        var f = s(30961);
        function g(e, t) {
          let s = e.get(t);
          return "string" == typeof s ? s.trim() : "";
        }
        function j(e, t) {
          let s = Number(g(e, t));
          return Number.isInteger(s) ? s : Number.NaN;
        }
        async function v(e, t) {
          let s = await (0, l.Os)(["ADMIN", "STAFF"]),
            r = g(t, "menu"),
            o = j(t, "subtotal"),
            c = j(t, "pointDiscount"),
            u = g(t, "paymentMethod"),
            x = g(t, "longHairLength"),
            v = g(t, "couponSelection"),
            y = t
              .getAll("productId")
              .map((e) => ("string" == typeof e ? e.trim() : "")),
            N = t.getAll("productQuantity").map((e) => Number(e)),
            w = "",
            k = "";
          try {
            if (!r) throw Error("本日のメニューを入力してください。");
            if (!Number.isInteger(o) || o <= 0)
              throw Error("施術料金を正しく入力してください。");
            if (!Number.isInteger(c) || c < 0)
              throw Error("利用ポイントを正しく入力してください。");
            if (!u) throw Error("支払い方法を選択してください。");
            if (x && !b(x)) throw Error("ロング料金を選び直してください。");
            if (v && "referral" !== v && !v.startsWith("couponIssue:"))
              throw Error("クーポンを選び直してください。");
            if (y.length !== N.length)
              throw Error(
                "購入商品の入力内容が一致しません。商品を選び直してください。",
              );
            if (new Set(y).size !== y.length || y.some((e) => !e))
              throw Error("同じ商品は数量をまとめて入力してください。");
            let t = y.map((e, t) => ({ productId: e, quantity: N[t] }));
            for (let e of t)
              if (
                !Number.isSafeInteger(e.quantity) ||
                e.quantity < 1 ||
                e.quantity > 99
              )
                throw Error("商品の数量を正しく入力してください。");
            let a = await i._.appointment.findUnique({
              where: { id: e },
              select: { customerId: !0 },
            });
            if (!a) throw Error("予約が見つかりません。");
            ((w = a.customerId),
              await (0, m.Z_)(w),
              await i._.$transaction(async (a) => {
                var n;
                let i = await a.appointment.findUnique({
                  where: { id: e },
                  select: {
                    id: !0,
                    customerId: !0,
                    scheduledAt: !0,
                    staffName: !0,
                    source: !0,
                    customer: {
                      select: {
                        organizationId: !0,
                        organization: { select: { taxRate: !0 } },
                      },
                    },
                    serviceSales: { select: { id: !0 }, take: 1 },
                  },
                });
                if (!i) throw Error("予約が見つかりません。");
                if (
                  !s.organizationId ||
                  i.customer.organizationId !== s.organizationId
                )
                  throw Error("この予約を操作する権限がありません。");
                if (i.serviceSales.length > 0)
                  throw Error("この予約はすでに会計済みです。");
                let l = t.length
                  ? await a.product.findMany({
                      where: {
                        id: { in: t.map((e) => e.productId) },
                        organizationId: s.organizationId,
                        active: !0,
                      },
                      select: {
                        id: !0,
                        manufacturerName: !0,
                        name: !0,
                        retailPrice: !0,
                        stockQuantity: !0,
                      },
                    })
                  : [];
                if (l.length !== t.length)
                  throw Error(
                    "選択した商品が商品棚にありません。画面を更新して選び直してください。",
                  );
                let g = new Map(l.map((e) => [e.id, e]));
                for (let e of t) {
                  let t = g.get(e.productId);
                  if (!t || t.stockQuantity < e.quantity)
                    throw Error(
                      `${t?.name ?? "選択した商品"}の在庫が不足しています。商品棚を確認してください。`,
                    );
                }
                let j = t.reduce((e, t) => {
                    let s = g.get(t.productId);
                    return e + t.quantity * (s?.retailPrice ?? 0);
                  }, 0),
                  y = b(x) ? h[x] : 0,
                  N = o + y,
                  w = N + j,
                  k = new Date(),
                  I = 0,
                  P = "クーポン利用なし";
                if ("referral" === v) {
                  let e = await (0, m.k9)(a, i.customerId, N, k);
                  if (!e.discount)
                    throw Error(
                      "選択した紹介クーポンは利用できません。画面を更新してください。",
                    );
                  ((I = e.amount), (P = e.discount.label));
                } else if (v.startsWith("couponIssue:")) {
                  let e = v.slice(12),
                    t = await a.couponIssue.findFirst({
                      where: {
                        id: e,
                        customerId: i.customerId,
                        status: "issued",
                        issuedAt: { lte: k },
                        expiresAt: { gte: k },
                      },
                      select: { id: !0, couponCode: !0, discountRate: !0 },
                    });
                  if (!t)
                    throw Error(
                      "選択したクーポンは期限切れまたは使用済みです。",
                    );
                  if (
                    ((n = t.discountRate),
                    (I =
                      !Number.isSafeInteger(N) ||
                      N <= 0 ||
                      !Number.isSafeInteger(n) ||
                      n <= 0 ||
                      n > 100
                        ? 0
                        : Math.floor((N * n) / 100)) <= 0)
                  )
                    throw Error(
                      "選択したクーポンの割引内容を確認してください。",
                    );
                  P = `限定クーポン ${t.discountRate}%OFF（${t.couponCode}）`;
                  let s = await a.couponIssue.updateMany({
                    where: { id: t.id, status: "issued" },
                    data: { status: "used" },
                  });
                  if (1 !== s.count)
                    throw Error("選択したクーポンはすでに使用されています。");
                }
                let S = w - I;
                c > 0 &&
                  (await (0, m.ky)(a, {
                    customerId: i.customerId,
                    points: c,
                    checkoutAmount: S,
                    checkoutSourceId: i.id,
                    note: `${r}の予約会計で利用`,
                  }));
                let q = S - c,
                  L = i.customer.organization.taxRate,
                  $ = (0, f.Hf)(q, L),
                  A = x
                    ? `ロング料金 ${x} +${y.toLocaleString("ja-JP")}円`
                    : "ロング料金 なし 0円",
                  M = `${P} -${I.toLocaleString("ja-JP")}円`,
                  J = await a.serviceSale.create({
                    data: {
                      customerId: i.customerId,
                      appointmentId: i.id,
                      title: r,
                      amount: q,
                      paymentMethod: u,
                      paidAt: k,
                      source: "予約会計",
                      note: `基本施術料金 ${o.toLocaleString("ja-JP")}円 / ${A} / 商品 ${j.toLocaleString("ja-JP")}円 / クーポン ${M} / ポイント割引 ${c.toLocaleString("ja-JP")}円 / お支払い ${q.toLocaleString("ja-JP")}円 / うち消費税（${L}%） ${$.toLocaleString("ja-JP")}円`,
                    },
                    select: { id: !0 },
                  });
                for (let e of t) {
                  let t = g.get(e.productId);
                  if (!t) throw Error("購入商品の保存に失敗しました。");
                  let r = await a.product.updateMany({
                    where: {
                      id: t.id,
                      organizationId: s.organizationId,
                      active: !0,
                      stockQuantity: { gte: e.quantity },
                    },
                    data: { stockQuantity: { decrement: e.quantity } },
                  });
                  if (1 !== r.count)
                    throw Error(
                      `${t.name}の在庫が不足しています。商品棚を確認してください。`,
                    );
                  await a.productSaleLine.create({
                    data: {
                      serviceSaleId: J.id,
                      productId: t.id,
                      productNameSnapshot: t.name,
                      manufacturerNameSnapshot: t.manufacturerName,
                      unitPrice: t.retailPrice,
                      quantity: e.quantity,
                      lineTotal: t.retailPrice * e.quantity,
                    },
                  });
                  let n = await a.productProposal.create({
                    data: {
                      customerId: i.customerId,
                      productId: t.id,
                      proposalReason: "会計時に購入",
                      status: "purchased",
                      reaction: "purchased",
                      purchased: !0,
                      note: `${e.quantity}点 / ${t.retailPrice.toLocaleString("ja-JP")}円`,
                    },
                    select: { id: !0, status: !0, purchased: !0 },
                  });
                  await d({ db: a, proposal: n, visitAt: i.scheduledAt });
                }
                ((0, m.v2)(i.source) &&
                  (await (0, m.BE)(a, i.customerId, i.id, k)),
                  await a.contactLog.create({
                    data: {
                      customerId: i.customerId,
                      channel: "店頭",
                      purpose: "来店後フォロー予定",
                      message: `予約会計: ${r} / 基本施術料金 ${o.toLocaleString("ja-JP")}円 / ${A} / 商品 ${j.toLocaleString("ja-JP")}円 / ${M} / ポイント ${c.toLocaleString("ja-JP")}pt / お支払い ${q.toLocaleString("ja-JP")}円`,
                      outcome: "売上登録済み",
                      nextAction:
                        "仕上がり確認、レビュー依頼、次回メンテナンス提案を送る",
                      scheduledFollowUp: new Date(Date.now() + 6048e5),
                    },
                  }),
                  await a.appointment.update({
                    where: { id: i.id },
                    data: { menu: r, estimatedPrice: N, status: "来店済み" },
                  }),
                  await p(a, {
                    customerId: i.customerId,
                    occurredAt: i.scheduledAt,
                    menu: r,
                    staffName: i.staffName,
                  }),
                  await (0, m.uR)(a, i.customerId, k));
              }));
          } catch (e) {
            k = e instanceof Error ? e.message : "会計を確定できませんでした。";
          }
          (k &&
            (0, n.redirect)(
              `/admin/appointments/${e}?error=${encodeURIComponent(k)}`,
            ),
            (0, a.revalidatePath)("/admin/appointments"),
            (0, a.revalidatePath)(`/admin/appointments/${e}`),
            (0, a.revalidatePath)(`/admin/customers/${w}`),
            (0, a.revalidatePath)("/admin/customers?section=points"),
            (0, a.revalidatePath)("/u/reviews"),
            (0, n.redirect)(`/admin/appointments/${e}/completed`));
        }
        ((0, s(85723).h)([v]),
          (0, r.j)("44c2d42fb3e72f53d65c394837c061eb44359e3e", v));
      },
      4165: (e, t, s) => {
        "use strict";
        s.d(t, { Z: () => r });
        let r = (0, s(52761).Z)("scissors", [
          ["circle", { cx: "6", cy: "6", r: "3", key: "1lh9wr" }],
          ["path", { d: "M8.12 8.12 12 12", key: "1alkpv" }],
          ["path", { d: "M20 4 8.12 15.88", key: "xgtan2" }],
          ["circle", { cx: "6", cy: "18", r: "3", key: "fqmcym" }],
          ["path", { d: "M14.8 14.8 20 20", key: "ptml3r" }],
        ]);
      },
      67209: (e, t, s) => {
        "use strict";
        s.d(t, { Z: () => r });
        let r = (0, s(40430).Z)("clock-3", [
          ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
          ["path", { d: "M12 6v6h4", key: "135r8i" }],
        ]);
      },
    }));
  var t = require("../../../../webpack-runtime.js");
  t.C(e);
  var s = (e) => t((t.s = e)),
    r = t.X(
      0,
      [9380, 4108, 2159, 3914, 2564, 9529, 1425, 7295, 805, 7391],
      () => s(91946),
    );
  module.exports = r;
})();
