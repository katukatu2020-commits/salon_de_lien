(() => {
  var e = {};
  ((e.id = 9590),
    (e.ids = [9590]),
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
      91764: (e, t, r) => {
        "use strict";
        r.a(e, async (e, n) => {
          try {
            (r.r(t),
              r.d(t, {
                GlobalError: () => o.a,
                __next_app__: () => h,
                originalPathname: () => x,
                pages: () => p,
                routeModule: () => f,
                tree: () => u,
              }),
              r(54726));
            var a = r(32029);
            r(35866);
            var s = r(23191),
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
            var m = e([a]);
            a = (m.then ? (await m)() : m)[0];
            let u = [
                "",
                {
                  children: [
                    "admin",
                    {
                      children: [
                        "appointments",
                        {
                          children: [
                            "__PAGE__",
                            {},
                            {
                              page: [
                                () => Promise.resolve().then(r.bind(r, 54726)),
                                "/app/src/app/admin/appointments/page.tsx",
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
              p = ["/app/src/app/admin/appointments/page.tsx"],
              x = "/admin/appointments/page",
              h = { require: r, loadChunk: () => Promise.resolve() },
              f = new s.AppPageRouteModule({
                definition: {
                  kind: i.x.APP_PAGE,
                  page: "/admin/appointments/page",
                  pathname: "/admin/appointments",
                  bundlePath: "",
                  filename: "",
                  appPaths: [],
                },
                userland: { loaderTree: u },
              });
            n();
          } catch (e) {
            n(e);
          }
        });
      },
      60451: (e, t, r) => {
        (Promise.resolve().then(r.bind(r, 2430)),
          Promise.resolve().then(r.t.bind(r, 92481, 23)),
          Promise.resolve().then(r.t.bind(r, 79404, 23)),
          Promise.resolve().then(r.bind(r, 83590)),
          Promise.resolve().then(r.bind(r, 84448)));
      },
      83590: (e, t, r) => {
        "use strict";
        r.d(t, { GmailReservationSync: () => s });
        var n = r(10326),
          a = r(17577);
        function s({ latestImportedAt: e }) {
          let [t, r] = (0, a.useState)(null),
            [s, i] = (0, a.useState)(!1);
          return (0, n.jsxs)("div", {
            id: "gmail-api-sync",
            className:
              "flex flex-wrap items-center justify-end gap-x-4 gap-y-1 px-1 text-[11px] leading-5 text-[color:var(--lien-muted)]",
            role: "status",
            "aria-live": "polite",
            children: [
              (0, n.jsxs)("span", {
                children: [
                  "アカウント: ",
                  s
                    ? "確認できません"
                    : t
                      ? (function (e) {
                          if (!e) return "未設定";
                          let [t, r] = e.split("@");
                          if (!r) return e;
                          let n = t.slice(0, Math.min(4, t.length));
                          return `${n}${"*".repeat(Math.max(3, t.length - n.length))}@${r}`;
                        })(t.email)
                      : "確認中",
                ],
              }),
              (0, n.jsxs)("span", {
                children: [
                  "最終更新: ",
                  e
                    ? new Intl.DateTimeFormat("ja-JP", {
                        month: "numeric",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(e))
                    : "未取込",
                ],
              }),
            ],
          });
        }
      },
      84448: (e, t, r) => {
        "use strict";
        r.d(t, { StaffScheduleTimeline: () => k });
        var n = r(10326),
          a = r(90434),
          s = r(35047),
          i = r(17577),
          l = r(80854),
          o = r(80361),
          d = r(52761);
        let c = (0, d.Z)("grip-vertical", [
            ["circle", { cx: "9", cy: "12", r: "1", key: "1vctgf" }],
            ["circle", { cx: "9", cy: "5", r: "1", key: "hp0tcf" }],
            ["circle", { cx: "9", cy: "19", r: "1", key: "fkjjf6" }],
            ["circle", { cx: "15", cy: "12", r: "1", key: "1tmaij" }],
            ["circle", { cx: "15", cy: "5", r: "1", key: "19l28e" }],
            ["circle", { cx: "15", cy: "19", r: "1", key: "f4zoj3" }],
          ]),
          m = (0, d.Z)("move-horizontal", [
            ["path", { d: "m18 8 4 4-4 4", key: "1ak13k" }],
            ["path", { d: "M2 12h20", key: "9i4pu4" }],
            ["path", { d: "m6 8-4 4 4 4", key: "15zrgr" }],
          ]),
          u = (0, d.Z)("calendar-plus-2", [
            ["path", { d: "M8 2v4", key: "1cmpym" }],
            ["path", { d: "M16 2v4", key: "4m81vk" }],
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
            ["path", { d: "M3 10h18", key: "8toen8" }],
            ["path", { d: "M10 16h4", key: "17e571" }],
            ["path", { d: "M12 14v4", key: "1thi36" }],
          ]),
          p = (0, d.Z)("phone-call", [
            ["path", { d: "M13 2a9 9 0 0 1 9 9", key: "1itnx2" }],
            ["path", { d: "M13 6a5 5 0 0 1 5 5", key: "11nki7" }],
            [
              "path",
              {
                d: "M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384",
                key: "9njp5v",
              },
            ],
          ]);
        var x = r(80380);
        let h =
          "mt-1.5 h-11 w-full rounded-xl border border-[color:var(--lien-border)] bg-white px-3 text-sm text-[color:var(--lien-ink)] outline-none transition focus:border-[color:var(--lien-primary)] focus:ring-4 focus:ring-[#e9c9be]/35";
        function f({ date: e, customers: t, staff: r, onCreated: a }) {
          let [s, l] = (0, i.useState)(!1),
            [d, c] = (0, i.useState)(!1),
            [m, f] = (0, i.useState)(null),
            b = (0, i.useRef)(null);
          async function g(t) {
            (t.preventDefault(), c(!0), f(null));
            let r = new FormData(t.currentTarget);
            try {
              let t = await fetch("/api/admin/appointments/manual", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    customerId: r.get("customerId"),
                    date: e,
                    startMinutes: (function (e) {
                      let [t, r] = e.split(":").map(Number);
                      return 60 * t + r;
                    })(String(r.get("startTime") ?? "")),
                    durationMinutes: Number(r.get("durationMinutes")),
                    staffName: r.get("staffName"),
                    menu: r.get("menu"),
                    estimatedPrice: r.get("estimatedPrice"),
                    bookingProvider: r.get("bookingProvider"),
                    note: r.get("note"),
                  }),
                }),
                n = await t.json();
              if (!t.ok || !n.appointment)
                throw Error(n.error || "予約を登録できませんでした。");
              (a(n.appointment), l(!1));
            } catch (e) {
              f(
                e instanceof Error ? e.message : "予約を登録できませんでした。",
              );
            } finally {
              c(!1);
            }
          }
          return (0, n.jsxs)(n.Fragment, {
            children: [
              (0, n.jsxs)("button", {
                type: "button",
                onClick: () => {
                  (f(null), l(!0));
                },
                className:
                  "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[color:var(--lien-primary)] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[color:var(--lien-primary-dark)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e9c9be]/50",
                children: [
                  n.jsx(u, { className: "h-4 w-4" }),
                  "電話・店頭予約を登録",
                ],
              }),
              s
                ? n.jsx("div", {
                    className:
                      "fixed inset-0 z-[100] grid place-items-center bg-[#2f2a25]/45 p-3 backdrop-blur-sm sm:p-6",
                    onMouseDown: (e) => {
                      e.target !== e.currentTarget || d || l(!1);
                    },
                    children: (0, n.jsxs)("section", {
                      role: "dialog",
                      "aria-modal": "true",
                      "aria-labelledby": "manual-appointment-title",
                      className:
                        "max-h-[calc(100dvh-24px)] w-full max-w-2xl overflow-y-auto rounded-[24px] border border-[color:var(--lien-border)] bg-[#fbf7f0] shadow-[0_24px_80px_rgba(47,42,37,0.24)] sm:max-h-[calc(100dvh-48px)]",
                      children: [
                        (0, n.jsxs)("header", {
                          className:
                            "sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[color:var(--lien-border)] bg-white/95 px-5 py-4 backdrop-blur sm:px-6",
                          children: [
                            (0, n.jsxs)("div", {
                              children: [
                                (0, n.jsxs)("p", {
                                  className:
                                    "flex items-center gap-2 text-xs font-semibold text-[color:var(--lien-primary)]",
                                  children: [
                                    n.jsx(p, { className: "h-4 w-4" }),
                                    "手動予約",
                                  ],
                                }),
                                n.jsx("h3", {
                                  id: "manual-appointment-title",
                                  className:
                                    "mt-1 text-lg font-semibold text-[color:var(--lien-ink)]",
                                  children: "電話・店頭予約を登録",
                                }),
                                n.jsx("p", {
                                  className:
                                    "mt-1 text-xs text-[color:var(--lien-muted)]",
                                  children: new Intl.DateTimeFormat("ja-JP", {
                                    timeZone: "Asia/Tokyo",
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                    weekday: "short",
                                  }).format(new Date(`${e}T12:00:00+09:00`)),
                                }),
                              ],
                            }),
                            n.jsx("button", {
                              ref: b,
                              type: "button",
                              onClick: () => l(!1),
                              disabled: d,
                              className:
                                "grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[color:var(--lien-border)] bg-white text-[color:var(--lien-ink)] transition hover:bg-[color:var(--lien-surface-soft)] disabled:opacity-50",
                              "aria-label": "閉じる",
                              children: n.jsx(x.Z, { className: "h-4 w-4" }),
                            }),
                          ],
                        }),
                        (0, n.jsxs)("form", {
                          onSubmit: g,
                          className: "grid gap-5 p-5 sm:p-6",
                          children: [
                            m
                              ? n.jsx("p", {
                                  role: "alert",
                                  className:
                                    "rounded-xl border border-[#edc2bd] bg-[#fff1ef] px-4 py-3 text-sm font-semibold text-[#884039]",
                                  children: m,
                                })
                              : null,
                            (0, n.jsxs)("label", {
                              className:
                                "text-sm font-semibold text-[color:var(--lien-ink)]",
                              children: [
                                "お客様",
                                (0, n.jsxs)("select", {
                                  name: "customerId",
                                  required: !0,
                                  defaultValue: "",
                                  className: h,
                                  children: [
                                    n.jsx("option", {
                                      value: "",
                                      disabled: !0,
                                      children: "顧客を選択",
                                    }),
                                    t.map((e) =>
                                      (0, n.jsxs)(
                                        "option",
                                        {
                                          value: e.id,
                                          children: [
                                            e.name,
                                            e.phone ? `（${e.phone}）` : "",
                                          ],
                                        },
                                        e.id,
                                      ),
                                    ),
                                  ],
                                }),
                              ],
                            }),
                            (0, n.jsxs)("div", {
                              className: "grid gap-4 sm:grid-cols-2",
                              children: [
                                (0, n.jsxs)("label", {
                                  className:
                                    "text-sm font-semibold text-[color:var(--lien-ink)]",
                                  children: [
                                    "開始時刻",
                                    n.jsx("input", {
                                      name: "startTime",
                                      type: "time",
                                      min: "10:00",
                                      max: "18:45",
                                      step: "900",
                                      defaultValue: "10:00",
                                      required: !0,
                                      className: h,
                                    }),
                                  ],
                                }),
                                (0, n.jsxs)("label", {
                                  className:
                                    "text-sm font-semibold text-[color:var(--lien-ink)]",
                                  children: [
                                    "施術時間（分）",
                                    n.jsx("input", {
                                      name: "durationMinutes",
                                      type: "number",
                                      min: "15",
                                      max: "540",
                                      step: "15",
                                      defaultValue: "60",
                                      required: !0,
                                      className: h,
                                    }),
                                  ],
                                }),
                                (0, n.jsxs)("label", {
                                  className:
                                    "text-sm font-semibold text-[color:var(--lien-ink)]",
                                  children: [
                                    "担当者",
                                    n.jsx("select", {
                                      name: "staffName",
                                      defaultValue: "フリー",
                                      required: !0,
                                      className: h,
                                      children: r.map((e) =>
                                        n.jsx(
                                          "option",
                                          { value: e.name, children: e.name },
                                          e.name,
                                        ),
                                      ),
                                    }),
                                  ],
                                }),
                                (0, n.jsxs)("label", {
                                  className:
                                    "text-sm font-semibold text-[color:var(--lien-ink)]",
                                  children: [
                                    "予約経路",
                                    (0, n.jsxs)("select", {
                                      name: "bookingProvider",
                                      defaultValue: "phone",
                                      required: !0,
                                      className: h,
                                      children: [
                                        n.jsx("option", {
                                          value: "phone",
                                          children: "電話",
                                        }),
                                        n.jsx("option", {
                                          value: "walk_in",
                                          children: "店頭",
                                        }),
                                        n.jsx("option", {
                                          value: "manual",
                                          children: "その他の手動登録",
                                        }),
                                      ],
                                    }),
                                  ],
                                }),
                              ],
                            }),
                            (0, n.jsxs)("label", {
                              className:
                                "text-sm font-semibold text-[color:var(--lien-ink)]",
                              children: [
                                "メニュー",
                                n.jsx("input", {
                                  name: "menu",
                                  type: "text",
                                  maxLength: 120,
                                  required: !0,
                                  placeholder: "例: カット + カラー",
                                  className: h,
                                }),
                              ],
                            }),
                            (0, n.jsxs)("div", {
                              className: "grid gap-4 sm:grid-cols-2",
                              children: [
                                (0, n.jsxs)("label", {
                                  className:
                                    "text-sm font-semibold text-[color:var(--lien-ink)]",
                                  children: [
                                    "見込み金額（任意）",
                                    n.jsx("input", {
                                      name: "estimatedPrice",
                                      type: "number",
                                      min: "0",
                                      max: "1000000",
                                      step: "1",
                                      placeholder: "例: 12000",
                                      className: h,
                                    }),
                                  ],
                                }),
                                (0, n.jsxs)("label", {
                                  className:
                                    "text-sm font-semibold text-[color:var(--lien-ink)]",
                                  children: [
                                    "メモ（任意）",
                                    n.jsx("input", {
                                      name: "note",
                                      type: "text",
                                      maxLength: 500,
                                      placeholder: "電話で確認した内容など",
                                      className: h,
                                    }),
                                  ],
                                }),
                              ],
                            }),
                            (0, n.jsxs)("div", {
                              className:
                                "flex flex-col-reverse gap-3 border-t border-[color:var(--lien-border)] pt-5 sm:flex-row sm:justify-end",
                              children: [
                                n.jsx("button", {
                                  type: "button",
                                  onClick: () => l(!1),
                                  disabled: d,
                                  className:
                                    "lien-button-secondary h-11 px-5 disabled:opacity-50",
                                  children: "キャンセル",
                                }),
                                (0, n.jsxs)("button", {
                                  type: "submit",
                                  disabled: d,
                                  className:
                                    "lien-button-primary h-11 px-6 disabled:cursor-wait disabled:opacity-70",
                                  children: [
                                    d
                                      ? n.jsx(o.Z, {
                                          className: "h-4 w-4 animate-spin",
                                        })
                                      : n.jsx(u, { className: "h-4 w-4" }),
                                    d ? "登録中" : "予約を登録",
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
        let b = {
          kanzashi: {
            symbol: "結",
            label: "かんざし結",
            className: "bg-[#5a6f91] text-white",
          },
          hotpepper: {
            symbol: "H",
            label: "HOT PEPPER Beauty",
            className: "bg-[#c7485b] text-white",
          },
          customer_app: {
            symbol: "A",
            label: "お客様アプリ",
            className: "bg-[#477b69] text-white",
          },
          phone: {
            symbol: "電",
            label: "電話",
            className: "bg-[#8b6a45] text-white",
          },
          walk_in: {
            symbol: "店",
            label: "店頭",
            className: "bg-[#725d52] text-white",
          },
          manual: {
            symbol: "手",
            label: "手動登録",
            className: "bg-[#77716b] text-white",
          },
        };
        function g(e, t, r) {
          return Math.min(r, Math.max(t, e));
        }
        function y(e) {
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
        let v = new Set([
          "会計完了",
          "来店完了",
          "キャンセル",
          "無断キャンセル",
        ]);
        function j(e) {
          return `${String(Math.floor(e / 60)).padStart(2, "0")}:${String(e % 60).padStart(2, "0")}`;
        }
        function w(e) {
          let t = y(e.scheduledAt);
          return `${j(t)}〜${j(t + e.durationMinutes)}`;
        }
        function N(e) {
          return !v.has(e.status);
        }
        function W(e) {
          let t = String(e ?? ""),
            r = [];
          (/カット|前髪/.test(t) && r.push("C"),
            /カラー|マニキュア|ブリーチ|ホイル/.test(t) && r.push("L"),
            /パーマ/.test(t) && !/ストレート|縮毛/.test(t) && r.push("P"),
            /ストレート|縮毛/.test(t) && r.push("S"),
            /エクステ/.test(t) && r.push("E"),
            /トリートメント|Aujua|インプライム/.test(t) && r.push("T"),
            /ヘア.?セット|セット|着付/.test(t) && r.push("B"),
            /ヘッドスパ|スパ/.test(t) && r.push("SP"),
            /眉|マッサージ|頭皮保護|デトックス|フェイシャル|その他|オプション/.test(
              t,
            ) && r.push("O"));
          return 0 === r.length ? "O" : [...new Set(r)].join("・");
        }
        function k({
          date: e,
          dateLabel: t,
          appointments: r,
          staff: d,
          customers: u,
          isToday: p,
          currentMinutes: x,
        }) {
          let h = (0, s.useRouter)(),
            [v, k] = (0, i.useState)(r),
            [M, $] = (0, i.useState)([]),
            [S, T] = (0, i.useState)(null),
            [Q, ee] = (0, i.useState)({}),
            A = (0, i.useRef)(r),
            P = (0, i.useRef)(null),
            C = (0, i.useRef)(null),
            D = (0, i.useRef)(null),
            I = (0, i.useRef)(0),
            [q, Z] = (0, i.useState)(1180),[__businessSchedule,__setBusinessSchedule]=(0,i.useState)({openMinutes:600,closeMinutes:1140,closedWeekdays:[1]}),__businessOpen=Number(__businessSchedule.openMinutes)||600,__businessClose=Number(__businessSchedule.closeMinutes)||1140,__businessDuration=Math.max(60,__businessClose-__businessOpen),__shiftWeekday=new Date(e+"T00:00:00Z").getUTCDay(),[__shiftHydrated,__setShiftHydrated]=(0,i.useState)(false),
            _ = q < 720 ? 150 : 190,
            z = Math.max(Math.max(760,Math.ceil(__businessDuration/30)*56),q-_),
            E = z / __businessDuration,
            U = z < 440 ? 60 : 30,
            F = (0, i.useMemo)(
              () => Array.from({ length: __businessDuration / U }, (e, t) => __businessOpen + t * U),
              [U,__businessOpen,__businessDuration],
            ),
            L = (0, i.useMemo)(() => {
              let e = z < 260 ? 180 : z < 520 ? 120 : 60,
                t = Array.from(
                  { length: Math.floor(__businessDuration / e) + 1 },
                  (t, r) => __businessOpen + r * e,
                );
              return (__businessClose !== t.at(-1) && t.push(__businessClose), t);
            }, [z,__businessOpen,__businessClose,__businessDuration]),
            R = (0, i.useMemo)(() => {
              let e = new Map();
              for (let t of d) e.set(t.name, []);
              for (let t of v) {
                let r = e.has(t.staffName) ? t.staffName : "フリー";
                e.set(r, [...(e.get(r) ?? []), t]);
              }
              return e;
            }, [v, d]),
            O = (0, i.useMemo)(
              () =>
                F.map((e) => {
                  let t = e + U,
                    r = d.reduce(
                      (r, n) =>
                        r +
                        (!n.isVirtualFree && n.key !== "free" && n.name !== "フリー" && !(Array.isArray(n.closedWeekdays) && n.closedWeekdays.includes(__shiftWeekday)) && n.workStartMinutes < t && e < n.workEndMinutes
                          ? Math.max(1, Number(n.maxConcurrentAppointments) || 1)
                          : 0),
                      0,
                    ),
                    n = v.filter((r) => {
                      if (!N(r)) return !1;
                      let n = y(r.scheduledAt);
                      return n < t && e < n + r.durationMinutes;
                    }).length;
                  let a = Math.max(0, r - n),
                    o = Number.isInteger(Q[e]) && Q[e] >= 0 ? Q[e] : null;
                  return {
                    slotStart: e,
                    capacity: r,
                    booked: n,
                    remaining: null === o ? a : Math.min(a, o),
                  };
                }),
              [v, U, F, d, Q],
            );
          (0,i.useEffect)(()=>{let __cancelled=false;const __apply=e=>{if(__cancelled||!e)return;const t=e.businessSchedule||e;if(Number.isFinite(Number(t.openMinutes))&&Number.isFinite(Number(t.closeMinutes)))__setBusinessSchedule({openMinutes:Number(t.openMinutes),closeMinutes:Number(t.closeMinutes),closedWeekdays:Array.isArray(t.closedWeekdays)?t.closedWeekdays:[]})};fetch("/api/admin/store-profile",{headers:{Accept:"application/json"},credentials:"same-origin",cache:"no-store"}).then(e=>e.ok?e.json():null).then(__apply).catch(()=>{});const __onSchedule=e=>__apply(e.detail);window.addEventListener("lien:business-schedule-updated",__onSchedule);return()=>{__cancelled=true;window.removeEventListener("lien:business-schedule-updated",__onSchedule)}},[]);(0,i.useEffect)(()=>{__setShiftHydrated(true)},[]);(0, i.useEffect)(() => {
            try {
              let t = window.localStorage.getItem(
                `salon-capacity-overrides:${e}`,
              );
              t && ee(JSON.parse(t));
            } catch {}
          }, [e]);
          function et(t, r) {
            ee((n) => {
              let a = { ...n, [t]: g(Number(r) || 0, 0, 99) };
              try {
                window.localStorage.setItem(
                  `salon-capacity-overrides:${e}`,
                  JSON.stringify(a),
                );
              } catch {}
              void fetch("/api/lien-capacity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: e, slotStart: t, remaining: g(Number(r) || 0, 0, 99) }) }).catch(() => {});
              return a;
            });
          }
          function G(e, t) {
            k((r) => {
              let n = r.map((r) => (r.id === e ? { ...r, ...t } : r));
              return ((A.current = n), n);
            });
          }
          async function J(t) {
            ($((e) => [...e, t.id]), T(null));
            try {
              let r = await fetch(`/api/admin/appointments/${t.id}/schedule`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    date: e,
                    startMinutes: y(t.scheduledAt),
                    durationMinutes: t.durationMinutes,
                    staffName: t.staffName,
                    updatedAt: t.updatedAt,
                  }),
                }),
                n = await r.json();
              if (!r.ok || !n.appointment)
                throw Error(n.error || "予約を更新できませんでした。");
              (G(t.id, n.appointment),
                T({ tone: "success", text: "予約時間を更新しました。" }),
                h.refresh());
            } catch (e) {
              (C.current?.id === t.id && G(t.id, C.current),
                T({
                  tone: "error",
                  text:
                    e instanceof Error
                      ? e.message
                      : "予約を更新できませんでした。",
                }));
            } finally {
              ($((e) => e.filter((e) => e !== t.id)), (C.current = null));
            }
          }
          function H(e, t = !1) {
            let r = P.current;
            if (!r || r.pointerId !== e.pointerId) return;
            if (
              ((P.current = null),
              e.currentTarget.hasPointerCapture(e.pointerId) &&
                e.currentTarget.releasePointerCapture(e.pointerId),
              t)
            ) {
              (C.current?.id === r.appointmentId &&
                G(r.appointmentId, C.current),
                (C.current = null),
                r.moved && (I.current = Date.now()));
              return;
            }
            if (!r.moved) {
              C.current = null;
              return;
            }
            I.current = Date.now();
            let n = A.current.find((e) => e.id === r.appointmentId);
            n && J(n);
          }
          function V(e, t, r) {
            if (!(!N(t) || M.includes(t.id)) && 0 === e.button) {
              if (P.current) {
                let e = P.current;
                (C.current?.id === e.appointmentId &&
                  G(e.appointmentId, C.current),
                  (P.current = null),
                  (C.current = null));
              }
              ("touch" !== e.pointerType &&
                e.currentTarget.setPointerCapture(e.pointerId),
                (C.current = { ...t }),
                (P.current = {
                  appointmentId: t.id,
                  pointerId: e.pointerId,
                  pointerType: e.pointerType,
                  mode: r,
                  originClientX: e.clientX,
                  originClientY: e.clientY,
                  originStartMinutes: y(t.scheduledAt),
                  originDurationMinutes: t.durationMinutes,
                  originStaffName: t.staffName,
                  moved: !1,
                }));
            }
          }
          function Y(t) {
            let r = P.current;
            if (!r || r.pointerId !== t.pointerId) return;
            if ("touch" !== r.pointerType && (1 & t.buttons) == 0) {
              H(t);
              return;
            }
            let n = t.clientX - r.originClientX,
              a = t.clientY - r.originClientY;
            if ("touch" !== r.pointerType || r.moved) {
              if (!r.moved && 3 >= Math.abs(n)) return;
            } else {
              let e = Math.abs(n),
                r = Math.abs(a);
              if (r >= 6 && r > e) {
                ((P.current = null), (C.current = null));
                return;
              }
              if (e < 8 || e <= r) return;
              t.currentTarget.setPointerCapture(t.pointerId);
            }
            (r.moved || (r.moved = !0), t.preventDefault());
            let s = (function (e, t = 15) {
                return Math.round(e / t) * t;
              })(n / E),
              i = A.current.find((e) => e.id === r.appointmentId);
            if (!i) return;
            if ("resize" === r.mode) {
              let e = g(
                r.originDurationMinutes + s,
                15,
                __businessClose - r.originStartMinutes,
              );
              G(i.id, { durationMinutes: e });
              return;
            }
            let l = g(r.originStartMinutes + s, __businessOpen, __businessClose - i.durationMinutes),
              o = document
                .elementsFromPoint(t.clientX, t.clientY)
                .find((e) => e instanceof HTMLElement && e.dataset.staffName),
              d = o?.dataset.staffName || r.originStaffName;
            G(i.id, {
              scheduledAt: `${e}T${String(Math.floor(l / 60)).padStart(2, "0")}:${String(l % 60).padStart(2, "0")}:00+09:00`,
              staffName: d,
            });
          }
          function B(e) {
            H(e);
          }
          function X(e) {
            H(e, !0);
          }
          async function K(t, r) {
            if (!N(t) || M.includes(t.id)) return;
            let n = d.findIndex((e) => e.name === t.staffName),
              a = y(t.scheduledAt),
              s = t.durationMinutes,
              i = t.staffName;
            if ("Enter" === r.key) {
              (r.preventDefault(), h.push(`/admin/appointments/${t.id}`));
              return;
            }
            if ("ArrowLeft" === r.key)
              r.shiftKey
                ? (s = Math.max(15, s - 15))
                : (a = Math.max(__businessOpen, a - 15));
            else if ("ArrowRight" === r.key)
              r.shiftKey
                ? (s = Math.min(__businessClose - a, s + 15))
                : (a = Math.min(__businessClose - s, a + 15));
            else if ("ArrowUp" === r.key && n > 0) i = d[n - 1].name;
            else {
              if ("ArrowDown" !== r.key || !(n < d.length - 1)) return;
              i = d[n + 1].name;
            }
            (r.preventDefault(), (C.current = { ...t }));
            let l = Math.floor(a / 60),
              o = a % 60,
              c = {
                ...t,
                scheduledAt: `${e}T${String(l).padStart(2, "0")}:${String(o).padStart(2, "0")}:00+09:00`,
                durationMinutes: s,
                staffName: i,
              };
            (G(t.id, c), await J(c));
          }
          if(!__shiftHydrated)return (0,n.jsxs)("div",{className:"grid min-h-[520px] place-items-center rounded-2xl border border-[color:var(--lien-border)] bg-white shadow-sm",role:"status","aria-live":"polite","aria-busy":"true",children:[(0,n.jsx)("span",{className:"h-8 w-8 animate-spin rounded-full border-2 border-[#ead8d1] border-t-[color:var(--lien-primary)]","aria-hidden":"true"}),(0,n.jsx)("span",{className:"sr-only",children:"シフト表を読み込んでいます"})]});return (0, n.jsxs)("div", {
            className: "lien-reference-shift grid gap-4",
            children: [n.jsx("style",{children:`.lien-reference-shift{--shift-navy:#082f4d;--shift-grid:#c9c4ba;--shift-pink:#f8dddd}.lien-reference-shift .shift-shell{border-radius:4px!important;border-color:#aaa49a!important;box-shadow:none!important;background:#f7f5ed!important}.lien-reference-shift .shift-canvas{min-width:1180px}.lien-reference-shift .shift-top{background:#ddd9cc!important;border-color:#aaa49a!important}.lien-reference-shift .shift-staff-cell{background:#f6f3e8!important;padding:10px 12px!important;align-items:flex-start!important}.lien-reference-shift .shift-staff-link{width:100%;padding:0!important}.lien-reference-shift .shift-staff-name{display:block!important;border-radius:3px!important;background:var(--shift-navy)!important;color:white!important;padding:10px 8px!important;text-align:center!important;font-size:14px!important;letter-spacing:.02em;box-shadow:inset 0 0 0 1px #05233a}.lien-reference-shift .shift-staff-capacity{display:block!important;margin-top:5px!important;text-align:center!important;font-size:11px!important;color:#665f56!important}.lien-reference-shift .shift-staff-icons{display:flex;gap:4px;justify-content:center;margin-top:8px}.lien-reference-shift .shift-staff-icons span{display:grid;height:18px;min-width:18px;place-items:center;border-radius:3px;background:#a82e46;color:#fff;font-size:10px;font-weight:800}.lien-reference-shift .shift-staff-icons span:nth-child(3n){background:#1681a2}.lien-reference-shift .shift-staff-icons span:nth-child(4n){background:#2f846d}.lien-reference-shift .shift-lane{background-color:#fffdf7!important;background-image:linear-gradient(to right,rgba(124,118,107,.12) 1px,transparent 1px),linear-gradient(to bottom,rgba(124,118,107,.09) 1px,transparent 1px)!important;background-size:55px 100%,100% 32px!important}.lien-reference-shift .shift-off{background:#c7c6c3!important;background-image:none!important;opacity:.72}.lien-reference-shift .shift-booking{border-radius:5px!important;border:1px solid #dca7a9!important;background:var(--shift-pink)!important;color:#5c3435!important;box-shadow:none!important;padding:6px 7px!important}.lien-reference-shift .shift-booking:hover{z-index:30!important;box-shadow:0 3px 8px #65433a35!important}.lien-reference-shift .shift-summary-input{border:0!important;border-right:1px solid #aaa49a!important;background:#f7f5ed!important;font-size:12px!important}.lien-reference-shift .shift-summary-input:focus{background:#fff5d9!important;outline:2px solid #8e382f!important;outline-offset:-2px}.lien-reference-shift .shift-time-label{font-family:Georgia,serif;font-size:14px!important;font-weight:700!important}.lien-reference-shift .shift-now{background:#b52525!important}.lien-reference-shift .shift-header-copy{border:1px solid #aaa49a;background:#f6f3e8;padding:12px 14px}.lien-reference-shift .shift-header-copy h2{font-family:Georgia,"Yu Mincho",serif;font-size:24px!important}@media(max-width:720px){.lien-reference-shift .shift-canvas{min-width:1080px}}`}),
              (0, n.jsxs)("div", {
                className:
                  "shift-header-copy flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between",
                children: [
                  (0, n.jsxs)("div", {
                    children: [
                      n.jsx("p", {
                        className:
                          "text-sm font-semibold text-[color:var(--lien-primary)]",
                        children: "日別シフト表",
                      }),
                      (0, n.jsxs)("div", {
                        className: "mt-1 flex items-center gap-2",
                        children: [
                          n.jsx("a", {
                            href: (() => { const day = new Date(new Date(e + "T00:00:00Z").getTime() - 864e5).toISOString().slice(0, 10); return "/admin/appointments?month=" + day.slice(0, 7) + "&date=" + day + "#staff-schedule" })(),
                            className: "group inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[color:var(--lien-border)] bg-white text-[color:var(--lien-primary-dark)] shadow-[0_4px_14px_rgba(99,67,55,0.08)] transition hover:-translate-y-0.5 hover:border-[color:var(--lien-primary)] hover:bg-[color:var(--lien-primary-soft)] hover:shadow-[0_7px_18px_rgba(99,67,55,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--lien-primary)] focus-visible:ring-offset-2 active:translate-y-0 active:scale-95",
                            "aria-label": "前日のシフト表へ",
                            title: "前日",
                            "data-shift-day-nav": "previous",
                            children: n.jsx("svg", {
                            viewBox: "0 0 24 24",
                            className: "h-4 w-4",
                            fill: "none",
                            stroke: "currentColor",
                            strokeWidth: 2,
                            strokeLinecap: "round",
                            strokeLinejoin: "round",
                            "aria-hidden": "true",
                            children: n.jsx("path", { d: "m15 18-6-6 6-6" }),
                          }),
                          }),
                          n.jsx("h2", {
                            className: "min-w-0 text-xl font-semibold tabular-nums text-[color:var(--lien-ink)]",
                            children: t,
                          }),
                          n.jsx("a", {
                            href: (() => { const day = new Date(new Date(e + "T00:00:00Z").getTime() + 864e5).toISOString().slice(0, 10); return "/admin/appointments?month=" + day.slice(0, 7) + "&date=" + day + "#staff-schedule" })(),
                            className: "group inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[color:var(--lien-border)] bg-white text-[color:var(--lien-primary-dark)] shadow-[0_4px_14px_rgba(99,67,55,0.08)] transition hover:-translate-y-0.5 hover:border-[color:var(--lien-primary)] hover:bg-[color:var(--lien-primary-soft)] hover:shadow-[0_7px_18px_rgba(99,67,55,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--lien-primary)] focus-visible:ring-offset-2 active:translate-y-0 active:scale-95",
                            "aria-label": "翌日のシフト表へ",
                            title: "翌日",
                            "data-shift-day-nav": "next",
                            children: n.jsx("svg", {
                            viewBox: "0 0 24 24",
                            className: "h-4 w-4",
                            fill: "none",
                            stroke: "currentColor",
                            strokeWidth: 2,
                            strokeLinecap: "round",
                            strokeLinejoin: "round",
                            "aria-hidden": "true",
                            children: n.jsx("path", { d: "m9 18 6-6-6-6" }),
                          }),
                          }),
                        ],
                      }),
                      n.jsx("p", {
                        className:
                          "mt-1 text-xs leading-5 text-[color:var(--lien-muted)]",
                        children:
                          "予約をドラッグして移動、右端を引いて施術時間を変更できます。15分単位で保存されます。",
                      }),
                    ],
                  }),
                  (0, n.jsxs)("div", {
                    className: "flex flex-col items-start gap-3 lg:items-end",
                    children: [
                      n.jsx(f, {
                        date: e,
                        customers: u,
                        staff: d,
                        onCreated: function (e) {
                          let t = [...A.current, e].sort(
                            (e, t) =>
                              new Date(e.scheduledAt).getTime() -
                              new Date(t.scheduledAt).getTime(),
                          );
                          ((A.current = t),
                            k(t),
                            T({
                              tone: "success",
                              text: "手動予約を登録しました。",
                            }),
                            h.refresh());
                        },
                      }),
                      n.jsx("div", {
                        className:
                          "flex flex-wrap gap-2 text-[11px] font-semibold lg:justify-end",
                        children: Object.keys(b).map((e) => {
                          let t = b[e];
                          return (0, n.jsxs)(
                            "span",
                            {
                              className:
                                "inline-flex items-center gap-1.5 rounded-full border border-[color:var(--lien-border)] bg-white px-2.5 py-1.5 text-[color:var(--lien-muted)]",
                              children: [
                                n.jsx("span", {
                                  className: `grid h-5 min-w-5 place-items-center rounded px-1 text-[10px] ${t.className}`,
                                  children: t.symbol,
                                }),
                                t.label,
                              ],
                            },
                            e,
                          );
                        }),
                      }),
                    ],
                  }),
                ],
              }),
              S
                ? (0, n.jsxs)("div", {
                    role: "status",
                    className: `flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${"error" === S.tone ? "border-[#edc2bd] bg-[#fff1ef] text-[#884039]" : "border-[#bed9ca] bg-[#edf8f1] text-[#315d47]"}`,
                    children: [
                      "error" === S.tone
                        ? n.jsx(l.Z, { className: "h-4 w-4 shrink-0" })
                        : null,
                      S.text,
                    ],
                  })
                : null,
              n.jsx("div", {
                ref: D,
                className:
                  "shift-shell w-full overflow-x-auto border bg-white",
                children: (0, n.jsxs)("div", {
                  className: "shift-canvas w-full",
                  children: [
                    (0, n.jsxs)("div", {
                      className:
                        "shift-top grid border-b border-[color:var(--lien-border)] bg-[#ddd9cc]",
                      style: { gridTemplateColumns: `${_}px minmax(0, 1fr)` },
                      children: [
                        n.jsx("div", {
                          className:
                            "flex items-center border-r border-[color:var(--lien-border)] bg-[#fbf8f3] px-2 text-[10px] font-semibold leading-4 text-[color:var(--lien-muted)] sm:px-4 sm:text-xs",
                          children: "スタッフ / 受付可能数",
                        }),
                        n.jsx("div", {
                          className:
                            "relative h-11 border-b border-[color:var(--lien-border)]",
                          children: L.map((e, t) =>
                            n.jsx(
                              "span",
                              {
                                className: `shift-time-label absolute top-3 whitespace-nowrap text-[10px] font-semibold tabular-nums text-[color:var(--lien-ink)] sm:text-xs ${0 === t ? "" : t === L.length - 1 ? "-translate-x-full" : "-translate-x-1/2"}`,
                                style: {
                                  left:
                                    0 === t
                                      ? 4
                                      : t === L.length - 1
                                        ? z - 4
                                        : (e - __businessOpen) * E,
                                },
                                children: j(e),
                              },
                              e,
                            ),
                          ),
                        }),
                        (0, n.jsxs)("div", {
                          className:
                            "grid border-r border-[color:var(--lien-border)] bg-[#fbf8f3] text-[9px] font-semibold leading-3 text-[color:var(--lien-muted)] sm:text-[11px]",
                          children: [
                            n.jsx("span", {
                              className: "flex h-8 items-center px-2 sm:px-4",
                              children: "予約数",
                            }),
                            n.jsx("span", {
                              className:
                                "flex h-8 items-center border-t border-[color:var(--lien-border)] px-2 sm:px-4",
                              children: "残り受付数",
                            }),
                          ],
                        }),
                        (0, n.jsxs)("div", {
                          children: [
                            n.jsx("div", {
                              className: "flex h-8",
                              children: O.map((e) =>
                                n.jsx(
                                  "span",
                                  {
                                    className:
                                      "grid place-items-center border-r border-[color:var(--lien-border)] text-[9px] font-semibold tabular-nums text-[color:var(--lien-ink)] sm:text-[11px]",
                                    style: { width: U * E },
                                    title: `${j(e.slotStart)} 予約${e.booked}件`,
                                    children: e.booked,
                                  },
                                  `booked-${e.slotStart}`,
                                ),
                              ),
                            }),
                            n.jsx("div", {
                              className:
                                "flex h-8 border-t border-[color:var(--lien-border)]",
                              children: O.map((e) =>
                                n.jsx(
                                  "input",
                                  {
                                    className: `shift-summary-input grid place-items-center border-r border-[color:var(--lien-border)] text-[9px] font-bold tabular-nums sm:text-[11px] ${0 === e.remaining ? "bg-[#f9e8e5] text-[#9d4038]" : "text-[#41684f]"}`,
                                    style: { width: U * E },
                                    title: `${j(e.slotStart)} 残り${e.remaining}件 / ${e.capacity}件`,
                                    "aria-label": `${j(e.slotStart)} 残り受付数`,
                                    type: "number",
                                    min: 0,
                                    max: 99,
                                    value: e.remaining,
                                    onChange: (t) =>
                                      et(e.slotStart, t.target.value),
                                  },
                                  `remaining-${e.slotStart}`,
                                ),
                              ),
                            }),
                          ],
                        }),
                      ],
                    }),
                    d.map((e) => {
                      let t = R.get(e.name) ?? [],
                        r = (function (e) {
                          let t = [...e].sort(
                              (e, t) =>
                                e.startMinutes - t.startMinutes ||
                                t.durationMinutes - e.durationMinutes,
                            ),
                            r = [],
                            n = new Map();
                          for (let e of t) {
                            let t = r.findIndex((t) => t <= e.startMinutes),
                              a = -1 === t ? r.length : t;
                            ((r[a] = e.startMinutes + e.durationMinutes),
                              n.set(e.id, a));
                          }
                          return { lanes: n, laneCount: Math.max(1, r.length) };
                        })(
                          t.map((e) => ({
                            ...e,
                            startMinutes: y(e.scheduledAt),
                            durationMinutes: e.durationMinutes,
                          })),
                        ),
                        s = Math.max(
                          74,
                          20 +
                            42 * r.laneCount +
                            5 * Math.max(0, r.laneCount - 1),
                        );
                      return (0, n.jsxs)(
                        "div",
                        {
                          className:
                            "grid border-b border-[color:var(--lien-border)] last:border-b-0",
                          style: {
                            gridTemplateColumns: `${_}px minmax(0, 1fr)`,
                            minHeight: s,
                          },
                          children: [
                            n.jsx("div", {
                              className:
                                "shift-staff-cell z-20 flex min-w-0 items-center border-r border-[color:var(--lien-border)] bg-white px-1.5 py-3 sm:px-3",
                              children: (0, n.jsxs)(a.default, {
                                href: `/admin/staff/${e.key}`,
                                className:
                                  "shift-staff-link group min-w-0 rounded-xl px-1 py-1.5 transition sm:px-2",
                                children: [
                                  n.jsx("span", {
                                    className:
                                      "shift-staff-name block truncate text-[11px] font-semibold text-[color:var(--lien-ink)] sm:text-sm",
                                    children: e.name,
                                  }),
                                  (0, n.jsxs)("span", {
                                    className:
                                      "shift-staff-capacity mt-1 block truncate text-[9px] text-[color:var(--lien-muted)] sm:text-[10px]",
                                    children: [
                                      "受付: ",
                                      e.maxConcurrentAppointments,
                                    ],
                                  }),
                                  (0,n.jsxs)("span",{className:"shift-staff-icons",children:[n.jsx("span",{children:"C"}),n.jsx("span",{children:"L"}),n.jsx("span",{children:"P"}),n.jsx("span",{children:"SP"})]}),
                                ],
                              }),
                            }),
                            (0, n.jsxs)("div", {
                              className:
                                "shift-lane relative min-w-0 overflow-hidden bg-white",
                              "data-staff-name": e.name,
                              style: { height: s },
                              children: [
                                n.jsx("div", {
                                  className:
                                    "shift-off pointer-events-none absolute inset-y-0 left-0",
                                  style: {
                                    width:
                                      Math.max(0, e.workStartMinutes - __businessOpen) * E,
                                  },
                                }),
                                n.jsx("div", {
                                  className:
                                    "shift-off pointer-events-none absolute inset-y-0 right-0",
                                  style: {
                                    width:
                                      Math.max(0, __businessClose - e.workEndMinutes) * E,
                                  },
                                }),
                                F.map((t) =>
                                  n.jsx(
                                    "span",
                                    {
                                      "aria-hidden": "true",
                                      className:
                                        "pointer-events-none absolute inset-y-0 border-l border-[#ddd4ca]",
                                      style: { left: (t - __businessOpen) * E },
                                    },
                                    `${e.key}-${t}`,
                                  ),
                                ),
                                p && null !== x && x >= __businessOpen && x <= __businessClose
                                  ? n.jsx("span", {
                                      "aria-label": "現在時刻",
                                      className:
                                        "shift-now pointer-events-none absolute inset-y-0 z-20 w-0.5",
                                      style: { left: (x - __businessOpen) * E },
                                      children: n.jsx("span", {
                                        className:
                                          "absolute -left-1.5 -top-1 h-3 w-3 rounded-full bg-[#c24842]",
                                      }),
                                    })
                                  : null,
                                0 === t.length
                                  ? n.jsx("span", {
                                      className:
                                        "absolute left-4 top-1/2 -translate-y-1/2 text-xs text-[#b8ada3]",
                                      children: "予約なし",
                                    })
                                  : null,
                                t.map((e) => {
                                  var t;
                                  let a = y(e.scheduledAt),
                                    s = r.lanes.get(e.id) ?? 0,
                                    i =
                                      b[
                                        (function (e) {
                                          let t = e.bookingProvider
                                            ?.trim()
                                            .toLowerCase();
                                          if (t && t in b) return t;
                                          let r = `${e.source ?? ""}
${e.subject ?? ""}
${e.content ?? ""}`;
                                          return /hot\s*pepper|ホットペッパー|salon\s*board|サロンボード/i.test(
                                            r,
                                          )
                                            ? "hotpepper"
                                            : /kanzashi|かんざし|gmail:/i.test(
                                                  r,
                                                )
                                              ? "kanzashi"
                                              : /お客様アプリ|customer_app/i.test(
                                                    r,
                                                  )
                                                ? "customer_app"
                                                : /電話|\bTEL\b/i.test(r)
                                                  ? "phone"
                                                  : /店頭|飛び込み/i.test(r)
                                                    ? "walk_in"
                                                    : "manual";
                                        })(e)
                                      ],
                                    l = M.includes(e.id),
                                    d = (a - __businessOpen) * E + 1,
                                    u = Math.max(
                                      10,
                                      Math.min(
                                        e.durationMinutes * E - 2,
                                        z - d - 1,
                                      ),
                                    );
                                  return (0, n.jsxs)(
                                    "button",
                                    {
                                      type: "button",
                                      className: `shift-booking group absolute z-10 overflow-hidden rounded-xl border px-2 py-1.5 text-left text-[11px] leading-4 shadow-sm outline-none transition hover:z-20 hover:shadow-md focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-[color:var(--lien-primary)] ${"予約確定" === (t = e.status) ? "border-[#e2b9b1] bg-[#fff0ed] text-[#603d37]" : "変更受付" === t ? "border-[#dfc78e] bg-[#fff8e6] text-[#725117]" : "仮予約" === t ? "border-[#c7d7c4] bg-[#f0f6ee] text-[#405b40]" : "border-[#ddd5cc] bg-[#f5f1ec] text-[#6f665e]"} ${N(e) ? "cursor-grab active:cursor-grabbing" : "cursor-default opacity-70"}`,
                                      style: {
                                        left: d,
                                        top: 10 + 47 * s,
                                        width: u,
                                        height: 42,
                                        touchAction: "pan-y pinch-zoom",
                                      },
                                      title: `${w(e)} ${e.customerName} / ${i.label}。ダブルクリックで予約・会計を開く`,
                                      "aria-label": `${e.customerName} ${w(e)}。ダブルクリックまたはEnterキーで予約・会計を開く。矢印キーで15分移動、Shiftと左右キーで長さを変更`,
                                      onPointerDown: (t) => V(t, e, "move"),
                                      onPointerMove: Y,
                                      onPointerUp: B,
                                      onPointerCancel: X,
                                      onLostPointerCapture: (e) => H(e),
                                      onKeyDown: (t) => void K(e, t),
                                      onDoubleClick: () => {
                                        Date.now() - I.current < 500 ||
                                          h.push(`/admin/appointments/${e.id}`);
                                      },
                                      children: [
                                        (0, n.jsxs)("span", {
                                          className:
                                            "flex min-w-0 items-center",
                                          children: [
                                            n.jsx("span", {
                                              className: `block min-w-0 truncate rounded px-1.5 py-0.5 text-[9px] font-bold ${i.className}`,
                                              title: i.label,
                                              children: i.label,
                                            }),
                                            null,
                                          ],
                                        }),
                                        u >= 42
                                          ? (0, n.jsxs)("span", {
                                              className:
                                                "block truncate font-semibold",
                                              children: [
                                                e.customerName,
                                                " ・ ",
                                                W(e.menu),
                                              ],
                                            })
                                          : null,
                                        N(e)
                                          ? n.jsx("span", {
                                              role: "presentation",
                                              className:
                                                "absolute inset-y-0 right-0 flex w-3 cursor-ew-resize items-center justify-center border-l border-black/10 bg-white/35 opacity-60 transition group-hover:opacity-100",
                                              onPointerDown: (t) => {
                                                (t.stopPropagation(),
                                                  V(t, e, "resize"));
                                              },
                                              onDoubleClick: (e) =>
                                                e.stopPropagation(),
                                              onPointerMove: Y,
                                              onPointerUp: B,
                                              onPointerCancel: X,
                                              onLostPointerCapture: (e) => H(e),
                                              children: n.jsx(m, {
                                                className: "h-2.5 w-2.5",
                                              }),
                                            })
                                          : null,
                                      ],
                                    },
                                    e.id,
                                  );
                                }),
                              ],
                            }),
                          ],
                        },
                        e.key,
                      );
                    }),
                  ],
                }),
              }),
            ],
          });
        }/* shift-hydration-gate-v131 *//* business-schedule-v127 */
      },
      54726: (e, t, r) => {
        "use strict";
        (r.r(t), r.d(t, { default: () => P, dynamic: () => N }));
        var n = r(19510),
          a = r(57371),
          s = r(24874);
        let i = (0, r(40430).Z)("calendar-check-2", [
          ["path", { d: "M8 2v4", key: "1cmpym" }],
          ["path", { d: "M16 2v4", key: "4m81vk" }],
          [
            "path",
            {
              d: "M21 14V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8",
              key: "bce9hv",
            },
          ],
          ["path", { d: "M3 10h18", key: "8toen8" }],
          ["path", { d: "m16 20 2 2 4-4", key: "13tcca" }],
        ]);
        var l = r(6644),
          o = r(18306),
          d = r(61473),
          c = r(48723),
          m = r(67209),
          u = r(72852),
          p = r(19213),
          x = r(68570);
        let h = (0, x.createProxy)(
            String.raw`/app/src/components/appointments/gmail-reservation-sync.tsx#GmailReservationSync`,
          ),
          f = (0, x.createProxy)(
            String.raw`/app/src/components/appointments/staff-schedule-timeline.tsx#StaffScheduleTimeline`,
          );
        var b = r(90878),
          g = r(76598),
          y = r(59219),
          v = r(13538),
          j = r(68024),
          w = r(60353);
        let N = "force-dynamic";
        function k() {
          return new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Tokyo",
            year: "numeric",
            month: "2-digit",
          }).format(new Date());
        }
        function M(e, t) {
          let [r, n] = e.split("-").map(Number),
            a = new Date(Date.UTC(r, n - 1 + t, 1));
          return `${a.getUTCFullYear()}-${String(a.getUTCMonth() + 1).padStart(2, "0")}`;
        }
        function $(e) {
          return new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Tokyo",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(e);
        }
        function S(e) {
          return new Intl.DateTimeFormat("ja-JP", {
            timeZone: "Asia/Tokyo",
            hour: "2-digit",
            minute: "2-digit",
          }).format(e);
        }
        function T(e, t) {
          return (
            e
              ?.split("\n")
              .find((e) => e.startsWith(`${t}: `))
              ?.slice(t.length + 2) ?? null
          );
        }
        function A(e) {
          let t = Number(T(e.note, "所要時間")?.replace(/\D/g, ""));
          return e.durationMinutes ?? (Number.isInteger(t) && t > 0 ? t : 60);
        }
        async function P({ searchParams: e }) {
          var t, r;
          let x = await (0, y.Os)(["ADMIN", "STAFF"]);
          if (!x.organizationId) throw Error("店舗所属が設定されていません。");
          let N =
              (t = e?.month) && /^20\d{2}-(0[1-9]|1[0-2])$/.test(t) ? t : k(),
            P =
              (r = e?.date) &&
              /^20\d{2}-(0[1-9]|1[0-2])-([012]\d|3[01])$/.test(r) &&
              r.startsWith(`${N}-`)
                ? r
                : N === k()
                  ? $(new Date())
                  : null,
            C = M(N, 1),
            D = new Date(`${N}-01T00:00:00+09:00`),
            I = new Date(`${C}-01T00:00:00+09:00`),
            [q, Z, _, z, V, dailySalesRows] = await Promise.all([
              v._.appointment.findMany({
                where: {
                  scheduledAt: { gte: D, lt: I },
                  status: { notIn: ["キャンセル", "無断キャンセル"] }, /* calendar-hide-cancelled-v103 */
                  customer: {
                    organizationId: x.organizationId,
                    deletedAt: null,
                  },
                  OR: [{ source: null }, { source: { not: j.ng } }],
                },
                include: {
                  customer: { select: { id: !0, name: !0, phone: !0 } },
                },
                orderBy: { scheduledAt: "asc" },
              }),
              v._.appointment.findFirst({
                where: {
                  source: { startsWith: "gmail:" },
                  customer: {
                    organizationId: x.organizationId,
                    deletedAt: null,
                  },
                },
                orderBy: { updatedAt: "desc" },
                select: { updatedAt: !0 },
              }),
              v._.$queryRawUnsafe('SELECT "staffKey","staffName","maxConcurrentAppointments","workStartMinutes","workEndMinutes","closedWeekdays" FROM "StaffBookingSetting" WHERE "organizationId"=$1 AND "active"=TRUE AND "onLeave"=FALSE ORDER BY "createdAt","staffName"', x.organizationId),
              v._.customer.findMany({
                where: { organizationId: x.organizationId, deletedAt: null, storeHiddenAt: null /* store-hidden-customer-consistency-v360 */ },
                orderBy: [{ name: "asc" }, { updatedAt: "desc" }],
                select: { id: !0, name: !0, phone: !0 },
              }),
              v._.contactLog.findMany({
                where: {
                  customer: {
                    organizationId: x.organizationId,
                    deletedAt: null,
                  },
                },
                include: {
                  customer: { select: { id: !0, name: !0 } },
                },
                orderBy: { createdAt: "desc" },
                take: 200,
              }),
              v._.serviceSale.findMany({
                where: {
                  paidAt: { gte: D, lt: I },
                  customer: { organizationId: x.organizationId, deletedAt: null },
                },
                select: { paidAt: !0, amount: !0, appointmentId: !0 },
              }),
            ]),
            E = $(new Date()),
            U = (function (e) {
              let [t, r] = e.split("-").map(Number),
                n = new Date(Date.UTC(t, r - 1, 1)).getUTCDay();
              return Array.from(
                {
                  length:
                    n + new Date(Date.UTC(t, r, 0)).getUTCDate() <= 35
                      ? 35
                      : 42,
                },
                (e, a) => {
                  let s = new Date(Date.UTC(t, r - 1, a - n + 1));
                  return {
                    key: `${s.getUTCFullYear()}-${String(s.getUTCMonth() + 1).padStart(2, "0")}-${String(s.getUTCDate()).padStart(2, "0")}`,
                    day: s.getUTCDate(),
                    currentMonth: s.getUTCMonth() === r - 1,
                  };
                },
              );
            })(N),
            F = new Map();
          for (let e of q) {
            let t = $(e.scheduledAt);
            F.set(t, [...(F.get(t) ?? []), e]);
          }
          let cancelledAppointmentIds = new Set(q.filter((e) => ["キャンセル", "無断キャンセル"].includes(e.status)).map((e) => e.id)),
            linkedSaleAppointmentIds = new Set(dailySalesRows.map((e) => e.appointmentId).filter(Boolean)),
            dailySales = new Map(),
            dailyForecast = new Map(),
            dailyRevenue = new Map();
          for (let sale of dailySalesRows) {
            if (sale.appointmentId && cancelledAppointmentIds.has(sale.appointmentId)) continue;
            let dateKey = $(sale.paidAt);
            dailySales.set(dateKey, (dailySales.get(dateKey) ?? 0) + sale.amount);
          }
          for (let appointment of q) {
            if (["キャンセル", "無断キャンセル"].includes(appointment.status) || linkedSaleAppointmentIds.has(appointment.id)) continue;
            let amount = Number(appointment.estimatedPrice ?? 0);
            if (!Number.isSafeInteger(amount) || amount <= 0) continue;
            let dateKey = $(appointment.scheduledAt);
            dailyForecast.set(dateKey, (dailyForecast.get(dateKey) ?? 0) + amount);
          }
          for (let dateKey of new Set([...dailySales.keys(), ...dailyForecast.keys()])) {
            dailyRevenue.set(dateKey, (dailySales.get(dateKey) ?? 0) + (dailyForecast.get(dateKey) ?? 0));
          }
          let L = P ? (F.get(P) ?? []) : [],
            R = P ? L : q,
            O = new Map(_.map((e) => [e.staffKey, e])),
            G = x.organizationId === "org_salon_de_lien"
              ? [...w.zj, w.jb].map((e) => {
              let t = O.get(e.key);
              return {
                key: e.key,
                name: t?.staffName || e.name,
                role: e.role,
                maxConcurrentAppointments:
                  t?.maxConcurrentAppointments ??
                  ("tanizaki" === e.key ? 2 : 1),
                workStartMinutes: t?.workStartMinutes ?? 600,
                workEndMinutes: t?.workEndMinutes ?? 1140,
                closedWeekdays: String(t?.closedWeekdays || '').split(',').map(Number).filter(Number.isInteger),
                isVirtualFree: false,
              };
            })
              : [..._.map((e) => ({
                  key: e.staffKey,
                  name: e.staffName,
                  role: "スタイリスト",
                  maxConcurrentAppointments: e.maxConcurrentAppointments,
                  workStartMinutes: e.workStartMinutes,
                  workEndMinutes: e.workEndMinutes,
                  closedWeekdays: String(e.closedWeekdays || '').split(',').map(Number).filter(Number.isInteger),
                  isVirtualFree: false,
                })), {
                  key: w.jb.key,
                  name: w.jb.name,
                  role: w.jb.role,
                  maxConcurrentAppointments: 1,
                  workStartMinutes: 600,
                  workEndMinutes: 1140,
                  closedWeekdays: [],
                  isVirtualFree: true,
                }];
          function J(e) {
            let t = e.slice(0, 7);
            return `/admin/appointments?month=${t}&date=${e}&view=shift`;
          }
          let K = "history" === e?.tab,
            Y = "calendar" === e?.view ? "calendar" : "shift",
            Q = (e) =>
              new Intl.DateTimeFormat("ja-JP", {
                timeZone: "Asia/Tokyo",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              }).format(e),
            X = n.jsx("nav", {
              className:
                "inline-grid w-full grid-cols-3 gap-1 rounded-[18px] border border-lien bg-white p-1 shadow-lien-sm sm:w-auto",
              style: { order: -20 },
              "aria-label": "予約管理表示切替",
              children: [
                n.jsx(a.default, {
                  href: `/admin/appointments?month=${N}&date=${P ?? `${N}-01`}&view=shift`,
                  className: `lien-segment inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-[14px] px-2 text-[13px] font-semibold transition sm:gap-2 sm:px-4 sm:text-sm ${!K && "shift" === Y ? "bg-[color:var(--lien-surface-rose)] text-[color:var(--lien-primary-dark)] ring-1 ring-inset ring-[color:var(--lien-primary-soft)]" : "text-[color:var(--lien-muted)] hover:bg-[color:var(--lien-surface-soft)]"}`,
                  "aria-current": !K && "shift" === Y ? "page" : void 0,
                  children: "シフト表",
                }),
                n.jsx(a.default, {
                  href: `/admin/appointments?month=${N}&view=calendar`,
                  className: `lien-segment inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-[14px] px-2 text-[13px] font-semibold transition sm:gap-2 sm:px-4 sm:text-sm ${!K && "calendar" === Y ? "bg-[color:var(--lien-surface-rose)] text-[color:var(--lien-primary-dark)] ring-1 ring-inset ring-[color:var(--lien-primary-soft)]" : "text-[color:var(--lien-muted)] hover:bg-[color:var(--lien-surface-soft)]"}`,
                  "aria-current": !K && "calendar" === Y ? "page" : void 0,
                  children: "予約カレンダー",
                }),
                n.jsx(a.default, {
                  href: `/admin/appointments?month=${N}&tab=history`,
                  className: `lien-segment inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-[14px] px-2 text-[13px] font-semibold transition sm:gap-2 sm:px-4 sm:text-sm ${K ? "bg-[color:var(--lien-surface-rose)] text-[color:var(--lien-primary-dark)] ring-1 ring-inset ring-[color:var(--lien-primary-soft)]" : "text-[color:var(--lien-muted)] hover:bg-[color:var(--lien-surface-soft)]"}`,
                  "aria-current": K ? "page" : void 0,
                  children: "履歴",
                }),
              ],
            });
          if (K)
            return (0, n.jsxs)("div", {
              className: "mx-auto grid w-full max-w-7xl gap-6",
              children: [
                n.jsx(b.mr, {
                  eyebrow: "Operation History",
                  title: "予約・会計の操作履歴",
                  description:
                    "予約登録や会計取り消しなど、店舗で行われた過去の操作を新しい順に確認できます。",
                  secondaryAction: n.jsx(a.default, {
                    href: "/admin/customers",
                    className: "lien-button-secondary px-4",
                    children: "顧客一覧へ戻る",
                  }),
                  visual: n.jsx(g.n8, {
                    variant: "workflow",
                    className: "h-full min-h-40",
                    imageClassName: "object-[28%_56%]",
                    sizes: "(max-width: 1023px) 100vw, 352px",
                  }),
                }),
                X,
                (0, n.jsxs)(b.IP, {
                  children: [
                    (0, n.jsxs)("div", {
                      className:
                        "flex flex-col gap-1 border-b border-[color:var(--lien-border)] pb-4 sm:flex-row sm:items-end sm:justify-between",
                      children: [
                        (0, n.jsxs)("div", {
                          children: [
                            n.jsx("h2", {
                              className:
                                "text-xl font-semibold text-[color:var(--lien-ink)]",
                              children: "操作履歴",
                            }),
                            n.jsx("p", {
                              className:
                                "mt-1 text-sm text-[color:var(--lien-muted)]",
                              children:
                                "直近200件を表示しています。担当者名が記録された操作もここで確認できます。",
                            }),
                          ],
                        }),
                        (0, n.jsxs)("span", {
                          className:
                            "text-sm font-semibold text-[color:var(--lien-muted)]",
                          children: [V.length, "件"],
                        }),
                      ],
                    }),
                    V.length
                      ? n.jsx("div", {
                          className: "mt-4 grid gap-3",
                          children: V.map((e) =>
                            (0, n.jsxs)(
                              "article",
                              {
                                className:
                                  "rounded-2xl border border-[color:var(--lien-border)] bg-white p-4 shadow-sm",
                                children: [
                                  (0, n.jsxs)("div", {
                                    className:
                                      "flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between",
                                    children: [
                                      (0, n.jsxs)("div", {
                                        children: [
                                          (0, n.jsxs)("div", {
                                            className:
                                              "flex flex-wrap items-center gap-2",
                                            children: [
                                              n.jsx("span", {
                                                className:
                                                  "rounded-full bg-[color:var(--lien-primary-soft)] px-2.5 py-1 text-xs font-semibold text-[color:var(--lien-primary-dark)]",
                                                children:
                                                  e.purpose ?? "操作記録",
                                              }),
                                              e.outcome
                                                ? n.jsx("span", {
                                                    className:
                                                      "text-sm font-semibold text-[color:var(--lien-ink)]",
                                                    children: e.outcome,
                                                  })
                                                : null,
                                            ],
                                          }),
                                          n.jsx(a.default, {
                                            href: `/admin/customers/${e.customer.id}`,
                                            className:
                                              "mt-2 inline-block font-semibold text-[color:var(--lien-primary-dark)] hover:underline",
                                            children: e.customer.name,
                                          }),
                                        ],
                                      }),
                                      (0, n.jsxs)("div", {
                                        className:
                                          "text-xs text-[color:var(--lien-muted)] sm:text-right",
                                        children: [
                                          n.jsx("p", {
                                            children: Q(e.createdAt),
                                          }),
                                          n.jsx("p", {
                                            className: "mt-1",
                                            children: e.channel,
                                          }),
                                        ],
                                      }),
                                    ],
                                  }),
                                  n.jsx("p", {
                                    className:
                                      "mt-3 whitespace-pre-wrap text-sm leading-6 text-[color:var(--lien-ink)]",
                                    children: e.message,
                                  }),
                                  e.nextAction
                                    ? (0, n.jsxs)("p", {
                                        className:
                                          "mt-3 rounded-xl bg-[color:var(--lien-surface-soft)] px-3 py-2 text-xs text-[color:var(--lien-muted)]",
                                        children: ["次の対応: ", e.nextAction],
                                      })
                                    : null,
                                ],
                              },
                              e.id,
                            ),
                          ),
                        })
                      : n.jsx("p", {
                          className:
                            "mt-5 rounded-2xl bg-[color:var(--lien-surface-soft)] p-6 text-center text-sm text-[color:var(--lien-muted)]",
                          children: "操作履歴はまだありません。",
                        }),
                  ],
                }),
              ],
            });
          let H = q.filter(
            (e) => "キャンセル" !== e.status && "無断キャンセル" !== e.status,
          );
          return (0, n.jsxs)("div", {
            className: "mx-auto grid w-full max-w-7xl gap-6",
            children: [
              n.jsx(b.mr, {
                eyebrow: (0, n.jsxs)("span", {
                  className: "inline-flex items-center gap-2",
                  children: [
                    n.jsx(s.Z, { className: "h-3.5 w-3.5" }),
                    "Reservation Calendar",
                  ],
                }),
                title: "シフト表・予約カレンダー",
                description:
                  "店舗専用の予約メール受信アドレスへ届いた新着予約を自動で予約台帳へ反映し、当日の来店予定と月間の予約状況を確認します。",
                secondaryAction: n.jsx(a.default, {
                  href: "/admin/customers",
                  className: "lien-button-secondary px-4",
                  children: "顧客一覧へ戻る",
                }),
                visual: n.jsx(g.n8, {
                  variant: "workflow",
                  className: "h-full min-h-40",
                  imageClassName: "object-[28%_56%]",
                  sizes: "(max-width: 1023px) 100vw, 352px",
                }),
              }),
              X,
              "calendar" === Y ? (0, n.jsxs)(b.IP, {
                className: "order-[5]",
                style: { order: 5 },
                children: [
                  n.jsx("div", {
                    id: "appointment-calendar",
                    className:
                      "scroll-mt-20 flex flex-col gap-4 md:flex-row md:items-center md:justify-between",
                    children: (0, n.jsxs)("div", {
                      className:
                        "flex items-center justify-between gap-3 sm:justify-start",
                      children: [
                        n.jsx(a.default, {
                          href: `/admin/appointments?month=${M(N, -1)}&view=calendar`,
                          className:
                            "lien-icon-button text-[color:var(--lien-ink)]",
                          "aria-label": "前の月",
                          children: n.jsx(l.Z, { className: "h-4 w-4" }),
                        }),
                        (0, n.jsxs)("div", {
                          className: "min-w-36 text-center",
                          children: [
                            n.jsx("p", {
                              className:
                                "text-xs font-semibold text-[color:var(--lien-muted)]",
                              children: "表示月",
                            }),
                            n.jsx("h2", {
                              className:
                                "mt-1 text-xl font-semibold text-[color:var(--lien-ink)]",
                              children: (function (e) {
                                let [t, r] = e.split("-").map(Number);
                                return `${t}年${r}月`;
                              })(N),
                            }),
                          ],
                        }),
                        n.jsx(a.default, {
                          href: `/admin/appointments?month=${M(N, 1)}&view=calendar`,
                          className:
                            "lien-icon-button text-[color:var(--lien-ink)]",
                          "aria-label": "次の月",
                          children: n.jsx(o.Z, { className: "h-4 w-4" }),
                        }),
                        n.jsx(a.default, {
                          href: `/admin/appointments?month=${k()}&view=calendar`,
                          className:
                            "lien-button-secondary ml-1 h-10 min-h-10 px-3 text-xs",
                          children: "今月",
                        }),
                      ],
                    }),
                  }),
                  (0, n.jsxs)("div", {
                    className:
                      "mt-5 hidden overflow-hidden rounded-2xl border border-[color:var(--lien-border)] md:block",
                    children: [
                      n.jsx("div", {
                        className:
                          "grid grid-cols-7 border-b border-[color:var(--lien-border)] bg-[color:var(--lien-surface-soft)] text-center text-xs font-semibold text-[color:var(--lien-muted)]",
                        children: [
                          "日",
                          "月",
                          "火",
                          "水",
                          "木",
                          "金",
                          "土",
                        ].map((e, t) =>
                          n.jsx(
                            "div",
                            {
                              className: `py-3 ${0 === t ? "text-[#b85d55]" : 6 === t ? "text-[#55758d]" : ""}`,
                              children: e,
                            },
                            e,
                          ),
                        ),
                      }),
                      n.jsx("div", {
                        className:
                          "grid grid-cols-7 bg-[color:var(--lien-border)] gap-px",
                        children: U.map((e) => {
                          let t = F.get(e.key) ?? [],
                            activeDayCount = t.filter((e) => !["キャンセル", "無断キャンセル"].includes(e.status)).length,
                            r = e.key === E,
                            s = e.key === P;
                          return (0, n.jsxs)(
                            "div",
                            {
                              className: `min-h-36 bg-white p-2 ${e.currentMonth ? "" : "bg-[#fbf8f3] text-[#b0a49a]"} ${s ? "ring-2 ring-inset ring-[color:var(--lien-primary)]" : ""}`,
                              children: [
                                (0, n.jsxs)("div", {
                                  className:
                                    "flex items-center justify-between",
                                  children: [
                                    n.jsx(a.default, {
                                      href: J(e.key),
                                      className: `grid h-8 w-8 place-items-center rounded-full text-xs font-semibold transition hover:bg-[color:var(--lien-primary-soft)] ${s ? "bg-[color:var(--lien-primary)] text-white" : r ? "bg-[color:var(--lien-primary-soft)] text-[color:var(--lien-primary-dark)] ring-2 ring-inset ring-[color:var(--lien-primary)]" : ""}`,
                                      "aria-label": `${e.key}の稼働表を表示${r ? "（今日）" : ""}`,
                                      children: e.day,
                                    }),
                                    (0, n.jsxs)("div", {
                                      className: "flex flex-col items-end gap-0.5 text-right",
                                      children: [
                                        r ? n.jsx("span", { className: "rounded-full bg-[color:var(--lien-primary-soft)] px-2 py-0.5 text-[9px] font-bold text-[color:var(--lien-primary-dark)]", children: "今日" }) : null,
                                        activeDayCount > 0 || (dailyRevenue.get(e.key) ?? 0) > 0 ? (0, n.jsxs)("span", { className: "text-[10px] font-semibold tabular-nums text-[color:var(--lien-muted)]", children: [activeDayCount, "件 ・ ", (dailyForecast.get(e.key) ?? 0) > 0 ? "見込 " : "売上 ", "¥", (dailyRevenue.get(e.key) ?? 0).toLocaleString("ja-JP")] }) : null,
                                      ],
                                    }),
                                  ],
                                }),
                                (0, n.jsxs)("div", {
                                  className: "mt-2 grid gap-1.5",
                                  children: [
                                    t.slice(0, 3).map((e) => {
                                      var t;
                                      return (0, n.jsxs)(
                                        a.default,
                                        {
                                          href: `/admin/appointments/${e.id}`,
                                          className: `block rounded-lg border px-2 py-1.5 text-[10px] leading-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 ${"予約確定" === (t = e.status) ? "border-[#cbdcc8] bg-[#eef5ed] text-[#405d41]" : "キャンセル" === t || "無断キャンセル" === t ? "border-[#edc2bd] bg-[#fff1ef] text-[#884039]" : "変更受付" === t ? "border-[#ead09a] bg-[#fff8e8] text-[#7c4f12]" : "border-[#ead0c7] bg-[#fff2ed] text-[color:var(--lien-primary-dark)]"}`,
                                          children: [
                                            n.jsx("span", {
                                              className:
                                                "font-semibold tabular-nums",
                                              children: S(e.scheduledAt),
                                            }),
                                            n.jsx("span", {
                                              className: "ml-1 font-semibold",
                                              children: e.customer.name,
                                            }),
                                            (0, n.jsxs)("span", {
                                              className: "ml-1 opacity-80",
                                              children: ["・", A(e), "分"],
                                            }),
                                            n.jsx("span", {
                                              className:
                                                "block truncate opacity-80",
                                              children:
                                                e.menu ?? "メニュー未記載",
                                            }),
                                            (0, n.jsxs)("span", {
                                              className:
                                                "block truncate opacity-80",
                                              children: [
                                                "担当: ",
                                                e.staffName ??
                                                  T(e.note, "担当") ??
                                                  "フリー",
                                              ],
                                            }),
                                          ],
                                        },
                                        e.id,
                                      );
                                    }),
                                    t.length > 3
                                      ? (0, n.jsxs)("p", {
                                          className:
                                            "px-2 text-[10px] font-semibold text-[color:var(--lien-muted)]",
                                          children: [
                                            "ほか",
                                            t.length - 3,
                                            "件",
                                          ],
                                        })
                                      : null,
                                  ],
                                }),
                              ],
                            },
                            e.key,
                          );
                        }),
                      }),
                    ],
                  }),
                  (0, n.jsxs)("div", {
                    className:
                      "mt-5 overflow-hidden rounded-2xl border border-[color:var(--lien-border)] bg-white md:hidden",
                    children: [
                      n.jsx("div", {
                        className:
                          "grid grid-cols-7 bg-[color:var(--lien-surface-soft)] text-center text-[10px] font-semibold text-[color:var(--lien-muted)]",
                        children: [
                          "日",
                          "月",
                          "火",
                          "水",
                          "木",
                          "金",
                          "土",
                        ].map((e) =>
                          n.jsx("span", { className: "py-2", children: e }, e),
                        ),
                      }),
                      n.jsx("div", {
                        className:
                          "grid grid-cols-7 gap-px bg-[color:var(--lien-border)]",
                        children: U.map((e) => {
                          let t = F.get(e.key) ?? [],
                            activeDayCount = t.filter((e) => !["キャンセル", "無断キャンセル"].includes(e.status)).length,
                            r = e.key === P,
                            s = e.key === E;
                          return (0, n.jsxs)(
                            a.default,
                            {
                              href: J(e.key),
                              className: `relative grid min-h-12 place-items-center bg-white text-xs font-semibold transition hover:z-10 hover:bg-[color:var(--lien-surface-soft)] active:scale-95 ${e.currentMonth ? "text-[color:var(--lien-ink)]" : "text-[#b7aca3]"} ${r ? "bg-[#8f4f42] text-white" : s ? "bg-[color:var(--lien-primary-soft)] text-[color:var(--lien-primary-dark)] ring-2 ring-inset ring-[color:var(--lien-primary)]" : ""}`,
                              "aria-label": `${e.key}の稼働表を表示${s ? "（今日）" : ""}`,
                              children: [
                                s
                                  ? n.jsx("span", {
                                      className: `absolute top-0.5 text-[8px] font-bold ${r ? "text-white" : "text-[color:var(--lien-primary-dark)]"}`,
                                      children: "今日",
                                    })
                                  : null,
                                e.day,
                                activeDayCount > 0 || (dailyRevenue.get(e.key) ?? 0) > 0
                                  ? (0, n.jsxs)("span", { className: `absolute bottom-0.5 whitespace-nowrap text-[7px] font-bold tabular-nums ${r ? "text-white" : "text-[#8f4f42]"}`, children: [activeDayCount, "件 ¥", Math.round((dailyRevenue.get(e.key) ?? 0) / 1000), "k"] })
                                  : null,
                              ],
                            },
                            e.key,
                          );
                        }),
                      }),
                    ],
                  }),
                  n.jsx("div", {
                    className: "mt-5 grid gap-3 md:hidden",
                    children:
                      0 === R.length
                        ? n.jsx(b.ub, {
                            icon: s.Z,
                            title: "この月の予約はありません",
                            description:
                              "新しい予約メールを受信すると、自動で予約台帳へ追加されます。",
                          })
                        : R.map((e) => {
                            var t, r;
                            let s =
                              e.staffName ?? T(e.note, "担当") ?? "フリー";
                            return (0, n.jsxs)(
                              a.default,
                              {
                                href: `/admin/appointments/${e.id}`,
                                className:
                                  "lien-action-card rounded-[18px] border bg-white p-4 pr-12",
                                children: [
                                  (0, n.jsxs)("div", {
                                    className:
                                      "flex items-start justify-between gap-3",
                                    children: [
                                      (0, n.jsxs)("div", {
                                        children: [
                                          n.jsx("p", {
                                            className:
                                              "text-sm font-semibold text-[color:var(--lien-primary-dark)]",
                                            children:
                                              ((t = e.scheduledAt),
                                              new Intl.DateTimeFormat("ja-JP", {
                                                timeZone: "Asia/Tokyo",
                                                month: "numeric",
                                                day: "numeric",
                                                weekday: "short",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                              }).format(t)),
                                          }),
                                          n.jsx("p", {
                                            className:
                                              "mt-1 text-base font-semibold text-[color:var(--lien-ink)]",
                                            children: e.customer.name,
                                          }),
                                        ],
                                      }),
                                      n.jsx(b.OE, {
                                        tone:
                                          "予約確定" === (r = e.status)
                                            ? "success"
                                            : "キャンセル" === r ||
                                                "無断キャンセル" === r
                                              ? "danger"
                                              : "変更受付" === r
                                                ? "warning"
                                                : "仮予約" === r
                                                  ? "highlight"
                                                  : "default",
                                        children: e.status,
                                      }),
                                    ],
                                  }),
                                  (0, n.jsxs)("div", {
                                    className:
                                      "mt-3 grid gap-2 text-xs leading-5 text-[color:var(--lien-muted)]",
                                    children: [
                                      (0, n.jsxs)("p", {
                                        className: "flex items-center gap-2",
                                        children: [
                                          n.jsx(d.Z, {
                                            className: "h-4 w-4 shrink-0",
                                          }),
                                          e.menu ?? "メニュー未記載",
                                        ],
                                      }),
                                      (0, n.jsxs)("p", {
                                        className: "flex items-center gap-2",
                                        children: [
                                          n.jsx(c.Z, {
                                            className: "h-4 w-4 shrink-0",
                                          }),
                                          "担当: ",
                                          s,
                                        ],
                                      }),
                                      (0, n.jsxs)("p", {
                                        className: "flex items-center gap-2",
                                        children: [
                                          n.jsx(m.Z, {
                                            className: "h-4 w-4 shrink-0",
                                          }),
                                          (function (e) {
                                            let t = new Date(
                                              e.scheduledAt.getTime() +
                                                6e4 * A(e),
                                            );
                                            return `${S(e.scheduledAt)}〜${S(t)}`;
                                          })(e),
                                          "（",
                                          A(e),
                                          "分）",
                                        ],
                                      }),
                                      null !== e.estimatedPrice
                                        ? (0, n.jsxs)("p", {
                                            className:
                                              "flex items-center gap-2",
                                            children: [
                                              n.jsx(u.Z, {
                                                className: "h-4 w-4 shrink-0",
                                              }),
                                              e.estimatedPrice.toLocaleString(
                                                "ja-JP",
                                              ),
                                              "円",
                                            ],
                                          })
                                        : null,
                                      (0, n.jsxs)("p", {
                                        className: "flex items-center gap-2",
                                        children: [
                                          n.jsx(p.Z, {
                                            className: "h-4 w-4 shrink-0",
                                          }),
                                          e.source?.startsWith("gmail:")
                                            ? "Gmail取込"
                                            : (e.source ?? "予約台帳"),
                                        ],
                                      }),
                                    ],
                                  }),
                                ],
                              },
                              e.id,
                            );
                          }),
                  }),
                ],
              }) : null,
              "shift" === Y && P
                ? n.jsx("section", {
                    id: "staff-schedule",
                    tabIndex: -1,
                    className:
                      "order-[4] scroll-mt-20 outline-none md:scroll-mt-6",
                    style: { order: 4 },
                    children: n.jsx(b.IP, {
                      children: n.jsx(f, {
                        date: P,
                        dateLabel: new Intl.DateTimeFormat("ja-JP", {
                          timeZone: "Asia/Tokyo",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          weekday: "short",
                        }).format(new Date(`${P}T12:00:00+09:00`)),
                        staff: G,
                        customers: z,
                        appointments: L.map((e) => {
                          let t = (0, w.K7)(e.staffName ?? T(e.note, "担当")),
                            r = t && G.some((entry) => entry.name === t) ? t : w.jb.name;
                          return {
                            id: e.id,
                            customerId: e.customerId,
                            customerName: e.customer.name,
                            scheduledAt: e.scheduledAt.toISOString(),
                            durationMinutes: A(e),
                            menu: e.menu,
                            staffName: r,
                            status: e.status,
                            source: e.source,
                            bookingProvider: e.bookingProvider,
                            updatedAt: e.updatedAt.toISOString(),
                          };
                        }),
                        isToday: P === E,
                        currentMinutes:
                          P === E
                            ? (function (e) {
                                let t = new Intl.DateTimeFormat("en-US", {
                                  timeZone: "Asia/Tokyo",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hourCycle: "h23",
                                }).formatToParts(e);
                                return (
                                  60 *
                                    Number(
                                      t.find((e) => "hour" === e.type)?.value ??
                                        0,
                                    ) +
                                  Number(
                                    t.find((e) => "minute" === e.type)?.value ??
                                      0,
                                  )
                                );
                              })(new Date())
                            : null,
                      }),
                    }),
                  })
                : null,
            ],
          });
        }
      },
      76598: (e, t, r) => {
        "use strict";
        r.d(t, { lW: () => i, n8: () => o, xt: () => d });
        var n = r(19510),
          a = r(17710);
        let s = {
          workflow: {
            src: "/brand/salon-interior-illustrated.png",
            alt: "Salon de Lienの明るい施術スペースを描いたイラスト",
          },
          customerCrm: {
            src: "/brand/customer-crm.webp",
            alt: "顧客カルテとヘアスタイル記録を確認するサロンのイラスト",
          },
          points: {
            src: "/brand/points-management.webp",
            alt: "Salon de Lienの会員カードとポイントを表現したイラスト",
          },
          customerCare: {
            src: "/brand/customer-hair-care.webp",
            alt: "顔が映らない女性のお客様の後ろ姿とヘアケア風景",
          },
          customerCareMale: {
            src: "/brand/customer-hair-care-male.png",
            alt: "顔が映らない男性のお客様の後ろ姿とヘアケア風景",
          },
          products: {
            src: "/brand/salon-product-shelf-illustrated.png",
            alt: "Salon de Lien店内の商品棚を描いたイラスト",
          },
          consultation: {
            src: "/brand/consultation.webp",
            alt: "Salon de Lienで行うヘアカウンセリング",
          },
          insights: {
            src: "/brand/salon-style-short-dark.jpg",
            alt: "Salon de Lienのショートスタイル",
          },
          reviews: {
            src: "/brand/product-collection.webp",
            alt: "ヘアケア商品とお客様アンケートを表現したイラスト",
          },
          history: {
            src: "/brand/customer-visit-history-v2.png",
            alt: "施術後の後ろ姿と来店記録を表現したサロンイラスト",
          },
          profile: {
            src: "/brand/customer-profile-v2.png",
            alt: "髪のプロフィールを表現した鏡とヘアケア用品のイラスト",
          },
        };
        function i(e) {
          let t = e?.trim().toLowerCase() ?? "";
          return "male" === t || t.includes("男性") || t.includes("男")
            ? "customerCareMale"
            : "customerCare";
        }
        function l(...e) {
          return e.filter(Boolean).join(" ");
        }
        function o({
          variant: e,
          className: t = "",
          imageClassName: r = "",
          sizes: i = "(max-width: 768px) 100vw, 420px",
          priority: o = !1,
          children: d,
          overlay: c = "soft",
        }) {
          let m = s[e];
          return (0, n.jsxs)("figure", {
            className: l("relative isolate overflow-hidden bg-[#efe5da]", t),
            children: [
              n.jsx(a.default, {
                src: m.src,
                alt: m.alt,
                fill: !0,
                priority: o,
                sizes: i,
                className: l("object-cover", r),
              }),
              "none" !== c
                ? n.jsx("span", {
                    "aria-hidden": "true",
                    className: l(
                      "pointer-events-none absolute inset-0",
                      "strong" === c
                        ? "bg-gradient-to-t from-[#2f2a25]/65 via-[#2f2a25]/10 to-transparent"
                        : "bg-gradient-to-t from-[#2f2a25]/24 via-transparent to-white/5",
                    ),
                  })
                : null,
              d
                ? n.jsx("div", {
                    className: "relative z-10 h-full",
                    children: d,
                  })
                : null,
            ],
          });
        }
        function d({
          variant: e,
          eyebrow: t,
          title: r,
          description: a,
          badge: s,
          imageClassName: i = "",
        }) {
          return (0, n.jsxs)("header", {
            className: "grid gap-3",
            children: [
              n.jsx(o, {
                variant: e,
                className:
                  "h-36 rounded-[22px] border border-[#e8ded2] shadow-sm md:h-48 lg:h-52",
                imageClassName: i,
                sizes: "(max-width: 767px) 100vw, 960px",
                overlay: "strong",
                children: (0, n.jsxs)("div", {
                  className:
                    "flex h-full items-end justify-between gap-3 p-4 md:p-6",
                  children: [
                    (0, n.jsxs)("div", {
                      className: "min-w-0 text-white",
                      children: [
                        n.jsx("p", {
                          className: "text-xs font-semibold text-white/80",
                          children: t,
                        }),
                        n.jsx("h1", {
                          className:
                            "mt-1 text-2xl font-semibold tracking-normal drop-shadow-sm md:text-3xl",
                          children: r,
                        }),
                      ],
                    }),
                    s
                      ? n.jsx("div", { className: "shrink-0", children: s })
                      : null,
                  ],
                }),
              }),
              a
                ? n.jsx("p", {
                    className:
                      "text-sm leading-6 text-[#7c7168] md:text-base md:leading-7",
                    children: a,
                  })
                : null,
            ],
          });
        }
      },
      80854: (e, t, r) => {
        "use strict";
        r.d(t, { Z: () => n });
        let n = (0, r(52761).Z)("circle-alert", [
          ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
          ["line", { x1: "12", x2: "12", y1: "8", y2: "12", key: "1pkeuh" }],
          [
            "line",
            { x1: "12", x2: "12.01", y1: "16", y2: "16", key: "4dfq90" },
          ],
        ]);
      },
      80361: (e, t, r) => {
        "use strict";
        r.d(t, { Z: () => n });
        let n = (0, r(52761).Z)("loader-circle", [
          ["path", { d: "M21 12a9 9 0 1 1-6.219-8.56", key: "13zald" }],
        ]);
      },
      24874: (e, t, r) => {
        "use strict";
        r.d(t, { Z: () => n });
        let n = (0, r(40430).Z)("calendar-days", [
          ["path", { d: "M8 2v4", key: "1cmpym" }],
          ["path", { d: "M16 2v4", key: "4m81vk" }],
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
          ["path", { d: "M3 10h18", key: "8toen8" }],
          ["path", { d: "M8 14h.01", key: "6423bh" }],
          ["path", { d: "M12 14h.01", key: "1etili" }],
          ["path", { d: "M16 14h.01", key: "1gbofw" }],
          ["path", { d: "M8 18h.01", key: "lrp35t" }],
          ["path", { d: "M12 18h.01", key: "mhygvu" }],
          ["path", { d: "M16 18h.01", key: "kzsmim" }],
        ]);
      },
      6644: (e, t, r) => {
        "use strict";
        r.d(t, { Z: () => n });
        let n = (0, r(40430).Z)("chevron-left", [
          ["path", { d: "m15 18-6-6 6-6", key: "1wnfg3" }],
        ]);
      },
      18306: (e, t, r) => {
        "use strict";
        r.d(t, { Z: () => n });
        let n = (0, r(40430).Z)("chevron-right", [
          ["path", { d: "m9 18 6-6-6-6", key: "mthhwq" }],
        ]);
      },
      67209: (e, t, r) => {
        "use strict";
        r.d(t, { Z: () => n });
        let n = (0, r(40430).Z)("clock-3", [
          ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
          ["path", { d: "M12 6v6h4", key: "135r8i" }],
        ]);
      },
      19213: (e, t, r) => {
        "use strict";
        r.d(t, { Z: () => n });
        let n = (0, r(40430).Z)("mail-check", [
          [
            "path",
            {
              d: "M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8",
              key: "12jkf8",
            },
          ],
          [
            "path",
            { d: "m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7", key: "1ocrg3" },
          ],
          ["path", { d: "m16 19 2 2 4-4", key: "1b14m6" }],
        ]);
      },
      61473: (e, t, r) => {
        "use strict";
        r.d(t, { Z: () => n });
        let n = (0, r(40430).Z)("scissors", [
          ["circle", { cx: "6", cy: "6", r: "3", key: "1lh9wr" }],
          ["path", { d: "M8.12 8.12 12 12", key: "1alkpv" }],
          ["path", { d: "M20 4 8.12 15.88", key: "xgtan2" }],
          ["circle", { cx: "6", cy: "18", r: "3", key: "fqmcym" }],
          ["path", { d: "M14.8 14.8 20 20", key: "ptml3r" }],
        ]);
      },
    }));
  var t = require("../../../webpack-runtime.js");
  t.C(e);
  var r = (e) => t((t.s = e)),
    n = t.X(0, [9380, 4108, 2159, 3914, 2564, 1425, 1759], () => r(91764));
  module.exports = n;
})();
