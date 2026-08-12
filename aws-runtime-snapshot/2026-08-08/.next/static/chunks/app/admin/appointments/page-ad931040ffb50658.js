(self.webpackChunk_N_E = self.webpackChunk_N_E || []).push([
  [9590],
  {
    1456: function (e, t, n) {
      (Promise.resolve().then(n.bind(n, 2228)),
        Promise.resolve().then(n.t.bind(n, 5878, 23)),
        Promise.resolve().then(n.t.bind(n, 2972, 23)),
        Promise.resolve().then(n.bind(n, 1351)),
        Promise.resolve().then(n.bind(n, 4548)));
    },
    7648: function (e, t, n) {
      "use strict";
      n.d(t, {
        default: function () {
          return a.a;
        },
      });
      var r = n(2972),
        a = n.n(r);
    },
    9376: function (e, t, n) {
      "use strict";
      var r = n(5475);
      (n.o(r, "usePathname") &&
        n.d(t, {
          usePathname: function () {
            return r.usePathname;
          },
        }),
        n.o(r, "useRouter") &&
          n.d(t, {
            useRouter: function () {
              return r.useRouter;
            },
          }),
        n.o(r, "useSearchParams") &&
          n.d(t, {
            useSearchParams: function () {
              return r.useSearchParams;
            },
          }));
    },
    1351: function (e, t, n) {
      "use strict";
      n.d(t, {
        GmailReservationSync: function () {
          return i;
        },
      });
      var r = n(7437),
        a = n(2265);
      function i(e) {
        let { latestImportedAt: t } = e,
          [n, i] = (0, a.useState)(null),
          [l, o] = (0, a.useState)(!1);
        return (
          (0, a.useEffect)(() => {
            let e = !0;
            return (
              (async function () {
                try {
                  let t = await fetch("/api/admin/appointments/sync-gmail", {
                      cache: "no-store",
                    }),
                    n = await t.json();
                  if (!t.ok)
                    throw Error("Gmail連携状態を確認できませんでした。");
                  e && i(n);
                } catch (t) {
                  e && o(!0);
                }
              })(),
              () => {
                e = !1;
              }
            );
          }, []),
          (0, r.jsxs)("div", {
            id: "gmail-api-sync",
            className:
              "flex flex-wrap items-center justify-end gap-x-4 gap-y-1 px-1 text-[11px] leading-5 text-[color:var(--lien-muted)]",
            role: "status",
            "aria-live": "polite",
            children: [
              (0, r.jsxs)("span", {
                children: [
                  "アカウント: ",
                  l
                    ? "確認できません"
                    : n
                      ? (function (e) {
                          if (!e) return "未設定";
                          let [t, n] = e.split("@");
                          if (!n) return e;
                          let r = t.slice(0, Math.min(4, t.length));
                          return ""
                            .concat(r)
                            .concat(
                              "*".repeat(Math.max(3, t.length - r.length)),
                              "@",
                            )
                            .concat(n);
                        })(n.email)
                      : "確認中",
                ],
              }),
              (0, r.jsxs)("span", {
                children: [
                  "最終更新: ",
                  t
                    ? new Intl.DateTimeFormat("ja-JP", {
                        month: "numeric",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(t))
                    : "未取込",
                ],
              }),
            ],
          })
        );
      }
    },
    4548: function (e, t, n) {
      "use strict";
      n.d(t, {
        StaffScheduleTimeline: function () {
          return k;
        },
      });
      var r = n(7437),
        a = n(7648),
        i = n(9376),
        l = n(2265),
        o = n(1746),
        s = n(7887),
        c = n(5480);
      let d = (0, c.Z)("grip-vertical", [
          ["circle", { cx: "9", cy: "12", r: "1", key: "1vctgf" }],
          ["circle", { cx: "9", cy: "5", r: "1", key: "hp0tcf" }],
          ["circle", { cx: "9", cy: "19", r: "1", key: "fkjjf6" }],
          ["circle", { cx: "15", cy: "12", r: "1", key: "1tmaij" }],
          ["circle", { cx: "15", cy: "5", r: "1", key: "19l28e" }],
          ["circle", { cx: "15", cy: "19", r: "1", key: "f4zoj3" }],
        ]),
        u = (0, c.Z)("move-horizontal", [
          ["path", { d: "m18 8 4 4-4 4", key: "1ak13k" }],
          ["path", { d: "M2 12h20", key: "9i4pu4" }],
          ["path", { d: "m6 8-4 4 4 4", key: "15zrgr" }],
        ]),
        m = (0, c.Z)("calendar-plus-2", [
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
        p = (0, c.Z)("phone-call", [
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
      var f = n(4891);
      let x =
        "mt-1.5 h-11 w-full rounded-xl border border-[color:var(--lien-border)] bg-white px-3 text-sm text-[color:var(--lien-ink)] outline-none transition focus:border-[color:var(--lien-primary)] focus:ring-4 focus:ring-[#e9c9be]/35";
      function h(e) {
        let { date: t, customers: n, staff: a, onCreated: i } = e,
          [o, c] = (0, l.useState)(!1),
          [d, u] = (0, l.useState)(!1),
          [h, b] = (0, l.useState)(null),
          v = (0, l.useRef)(null);
        async function g(e) {
          (e.preventDefault(), u(!0), b(null));
          let n = new FormData(e.currentTarget);
          try {
            var r;
            let e = await fetch("/api/admin/appointments/manual", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  customerId: n.get("customerId"),
                  date: t,
                  startMinutes: (function (e) {
                    let [t, n] = e.split(":").map(Number);
                    return 60 * t + n;
                  })(
                    String(
                      null !== (r = n.get("startTime")) && void 0 !== r
                        ? r
                        : "",
                    ),
                  ),
                  durationMinutes: Number(n.get("durationMinutes")),
                  staffName: n.get("staffName"),
                  menu: n.get("menu"),
                  estimatedPrice: n.get("estimatedPrice"),
                  bookingProvider: n.get("bookingProvider"),
                  note: n.get("note"),
                }),
              }),
              a = await e.json();
            if (!e.ok || !a.appointment)
              throw Error(a.error || "予約を登録できませんでした。");
            (i(a.appointment), c(!1));
          } catch (e) {
            b(e instanceof Error ? e.message : "予約を登録できませんでした。");
          } finally {
            u(!1);
          }
        }
        return (
          (0, l.useEffect)(() => {
            var e;
            if (!o) return;
            let t = document.body.style.overflow;
            ((document.body.style.overflow = "hidden"),
              null === (e = v.current) || void 0 === e || e.focus());
            let n = (e) => {
              "Escape" !== e.key || d || c(!1);
            };
            return (
              window.addEventListener("keydown", n),
              () => {
                ((document.body.style.overflow = t),
                  window.removeEventListener("keydown", n));
              }
            );
          }, [o, d]),
          (0, r.jsxs)(r.Fragment, {
            children: [
              (0, r.jsxs)("button", {
                type: "button",
                onClick: () => {
                  (b(null), c(!0));
                },
                className:
                  "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[color:var(--lien-primary)] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[color:var(--lien-primary-dark)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e9c9be]/50",
                children: [
                  (0, r.jsx)(m, { className: "h-4 w-4" }),
                  "電話・店頭予約を登録",
                ],
              }),
              o
                ? (0, r.jsx)("div", {
                    className:
                      "fixed inset-0 z-[100] grid place-items-center bg-[#2f2a25]/45 p-3 backdrop-blur-sm sm:p-6",
                    onMouseDown: (e) => {
                      e.target !== e.currentTarget || d || c(!1);
                    },
                    children: (0, r.jsxs)("section", {
                      role: "dialog",
                      "aria-modal": "true",
                      "aria-labelledby": "manual-appointment-title",
                      className:
                        "max-h-[calc(100dvh-24px)] w-full max-w-2xl overflow-y-auto rounded-[24px] border border-[color:var(--lien-border)] bg-[#fbf7f0] shadow-[0_24px_80px_rgba(47,42,37,0.24)] sm:max-h-[calc(100dvh-48px)]",
                      children: [
                        (0, r.jsxs)("header", {
                          className:
                            "sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[color:var(--lien-border)] bg-white/95 px-5 py-4 backdrop-blur sm:px-6",
                          children: [
                            (0, r.jsxs)("div", {
                              children: [
                                (0, r.jsxs)("p", {
                                  className:
                                    "flex items-center gap-2 text-xs font-semibold text-[color:var(--lien-primary)]",
                                  children: [
                                    (0, r.jsx)(p, { className: "h-4 w-4" }),
                                    "手動予約",
                                  ],
                                }),
                                (0, r.jsx)("h3", {
                                  id: "manual-appointment-title",
                                  className:
                                    "mt-1 text-lg font-semibold text-[color:var(--lien-ink)]",
                                  children: "電話・店頭予約を登録",
                                }),
                                (0, r.jsx)("p", {
                                  className:
                                    "mt-1 text-xs text-[color:var(--lien-muted)]",
                                  children: new Intl.DateTimeFormat("ja-JP", {
                                    timeZone: "Asia/Tokyo",
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                    weekday: "short",
                                  }).format(
                                    new Date("".concat(t, "T12:00:00+09:00")),
                                  ),
                                }),
                              ],
                            }),
                            (0, r.jsx)("button", {
                              ref: v,
                              type: "button",
                              onClick: () => c(!1),
                              disabled: d,
                              className:
                                "grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[color:var(--lien-border)] bg-white text-[color:var(--lien-ink)] transition hover:bg-[color:var(--lien-surface-soft)] disabled:opacity-50",
                              "aria-label": "閉じる",
                              children: (0, r.jsx)(f.Z, {
                                className: "h-4 w-4",
                              }),
                            }),
                          ],
                        }),
                        (0, r.jsxs)("form", {
                          onSubmit: g,
                          className: "grid gap-5 p-5 sm:p-6",
                          children: [
                            h
                              ? (0, r.jsx)("p", {
                                  role: "alert",
                                  className:
                                    "rounded-xl border border-[#edc2bd] bg-[#fff1ef] px-4 py-3 text-sm font-semibold text-[#884039]",
                                  children: h,
                                })
                              : null,
                            (0, r.jsxs)("label", {
                              className:
                                "text-sm font-semibold text-[color:var(--lien-ink)]",
                              children: [
                                "お客様",
                                (0, r.jsxs)("select", {
                                  name: "customerId",
                                  required: !0,
                                  defaultValue: "",
                                  className: x,
                                  children: [
                                    (0, r.jsx)("option", {
                                      value: "",
                                      disabled: !0,
                                      children: "顧客を選択",
                                    }),
                                    n.map((e) =>
                                      (0, r.jsxs)(
                                        "option",
                                        {
                                          value: e.id,
                                          children: [
                                            e.name,
                                            e.phone
                                              ? "（".concat(e.phone, "）")
                                              : "",
                                          ],
                                        },
                                        e.id,
                                      ),
                                    ),
                                  ],
                                }),
                              ],
                            }),
                            (0, r.jsxs)("div", {
                              className: "grid gap-4 sm:grid-cols-2",
                              children: [
                                (0, r.jsxs)("label", {
                                  className:
                                    "text-sm font-semibold text-[color:var(--lien-ink)]",
                                  children: [
                                    "開始時刻",
                                    (0, r.jsx)("input", {
                                      name: "startTime",
                                      type: "time",
                                      min: "10:00",
                                      max: "18:45",
                                      step: "900",
                                      defaultValue: "10:00",
                                      required: !0,
                                      className: x,
                                    }),
                                  ],
                                }),
                                (0, r.jsxs)("label", {
                                  className:
                                    "text-sm font-semibold text-[color:var(--lien-ink)]",
                                  children: [
                                    "施術時間（分）",
                                    (0, r.jsx)("input", {
                                      name: "durationMinutes",
                                      type: "number",
                                      min: "15",
                                      max: "540",
                                      step: "15",
                                      defaultValue: "60",
                                      required: !0,
                                      className: x,
                                    }),
                                  ],
                                }),
                                (0, r.jsxs)("label", {
                                  className:
                                    "text-sm font-semibold text-[color:var(--lien-ink)]",
                                  children: [
                                    "担当者",
                                    (0, r.jsx)("select", {
                                      name: "staffName",
                                      defaultValue: "フリー",
                                      required: !0,
                                      className: x,
                                      children: a.map((e) =>
                                        (0, r.jsx)(
                                          "option",
                                          { value: e.name, children: e.name },
                                          e.name,
                                        ),
                                      ),
                                    }),
                                  ],
                                }),
                                (0, r.jsxs)("label", {
                                  className:
                                    "text-sm font-semibold text-[color:var(--lien-ink)]",
                                  children: [
                                    "予約経路",
                                    (0, r.jsxs)("select", {
                                      name: "bookingProvider",
                                      defaultValue: "phone",
                                      required: !0,
                                      className: x,
                                      children: [
                                        (0, r.jsx)("option", {
                                          value: "phone",
                                          children: "電話",
                                        }),
                                        (0, r.jsx)("option", {
                                          value: "walk_in",
                                          children: "店頭",
                                        }),
                                        (0, r.jsx)("option", {
                                          value: "manual",
                                          children: "その他の手動登録",
                                        }),
                                      ],
                                    }),
                                  ],
                                }),
                              ],
                            }),
                            (0, r.jsxs)("label", {
                              className:
                                "text-sm font-semibold text-[color:var(--lien-ink)]",
                              children: [
                                "メニュー",
                                (0, r.jsx)("input", {
                                  name: "menu",
                                  type: "text",
                                  maxLength: 120,
                                  required: !0,
                                  placeholder: "例: カット + カラー",
                                  className: x,
                                }),
                              ],
                            }),
                            (0, r.jsxs)("div", {
                              className: "grid gap-4 sm:grid-cols-2",
                              children: [
                                (0, r.jsxs)("label", {
                                  className:
                                    "text-sm font-semibold text-[color:var(--lien-ink)]",
                                  children: [
                                    "見込み金額（任意）",
                                    (0, r.jsx)("input", {
                                      name: "estimatedPrice",
                                      type: "number",
                                      min: "0",
                                      max: "1000000",
                                      step: "1",
                                      placeholder: "例: 12000",
                                      className: x,
                                    }),
                                  ],
                                }),
                                (0, r.jsxs)("label", {
                                  className:
                                    "text-sm font-semibold text-[color:var(--lien-ink)]",
                                  children: [
                                    "メモ（任意）",
                                    (0, r.jsx)("input", {
                                      name: "note",
                                      type: "text",
                                      maxLength: 500,
                                      placeholder: "電話で確認した内容など",
                                      className: x,
                                    }),
                                  ],
                                }),
                              ],
                            }),
                            (0, r.jsxs)("div", {
                              className:
                                "flex flex-col-reverse gap-3 border-t border-[color:var(--lien-border)] pt-5 sm:flex-row sm:justify-end",
                              children: [
                                (0, r.jsx)("button", {
                                  type: "button",
                                  onClick: () => c(!1),
                                  disabled: d,
                                  className:
                                    "lien-button-secondary h-11 px-5 disabled:opacity-50",
                                  children: "キャンセル",
                                }),
                                (0, r.jsxs)("button", {
                                  type: "submit",
                                  disabled: d,
                                  className:
                                    "lien-button-primary h-11 px-6 disabled:cursor-wait disabled:opacity-70",
                                  children: [
                                    d
                                      ? (0, r.jsx)(s.Z, {
                                          className: "h-4 w-4 animate-spin",
                                        })
                                      : (0, r.jsx)(m, { className: "h-4 w-4" }),
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
          })
        );
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
      function v(e, t, n) {
        return Math.min(n, Math.max(t, e));
      }
      function g(e) {
        var t, n, r, a;
        let i = "string" == typeof e ? new Date(e) : e,
          l = new Intl.DateTimeFormat("en-US", {
            timeZone: "Asia/Tokyo",
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23",
          }).formatToParts(i);
        return (
          60 *
            Number(
              null !==
                (r =
                  null === (t = l.find((e) => "hour" === e.type)) ||
                  void 0 === t
                    ? void 0
                    : t.value) && void 0 !== r
                ? r
                : 0,
            ) +
          Number(
            null !==
              (a =
                null === (n = l.find((e) => "minute" === e.type)) ||
                void 0 === n
                  ? void 0
                  : n.value) && void 0 !== a
              ? a
              : 0,
          )
        );
      }
      let y = new Set(["会計完了", "来店完了", "キャンセル", "無断キャンセル"]);
      function w(e) {
        return ""
          .concat(String(Math.floor(e / 60)).padStart(2, "0"), ":")
          .concat(String(e % 60).padStart(2, "0"));
      }
      function N(e) {
        let t = g(e.scheduledAt);
        return "".concat(w(t), "〜").concat(w(t + e.durationMinutes));
      }
      function j(e) {
        return !y.has(e.status);
      }
      function menuCategory(e) {
        let t = String(null != e ? e : ""),
          n = [];
        return (
          /カット|前髪/.test(t) && n.push("C"),
          /カラー|マニキュア|ブリーチ|ホイル/.test(t) && n.push("L"),
          /パーマ/.test(t) && !/ストレート|縮毛/.test(t) && n.push("P"),
          /ストレート|縮毛/.test(t) && n.push("S"),
          /エクステ/.test(t) && n.push("E"),
          /トリートメント|Aujua|インプライム/.test(t) && n.push("T"),
          /ヘア.?セット|セット|着付/.test(t) && n.push("B"),
          /ヘッドスパ|スパ/.test(t) && n.push("SP"),
          /眉|マッサージ|頭皮保護|デトックス|フェイシャル|その他|オプション/.test(
            t,
          ) && n.push("O"),
          0 === n.length ? "O" : [...new Set(n)].join("・")
        );
      }
      function k(e) {
        let {
            date: t,
            dateLabel: n,
            appointments: c,
            staff: m,
            customers: p,
            isToday: f,
            currentMinutes: x,
          } = e,
          y = (0, i.useRouter)(),
          [k, M] = (0, l.useState)(c),
          [S, P] = (0, l.useState)([]),
          [C, T] = (0, l.useState)(null),
          [capacityOverrides, setCapacityOverrides] = (0, l.useState)({}),
          A = (0, l.useRef)(c),
          D = (0, l.useRef)(null),
          I = (0, l.useRef)(null),
          E = (0, l.useRef)(null),
          _ = (0, l.useRef)(0),
          [z, Z] = (0, l.useState)(960),
          R = z < 420 ? 92 : z < 760 ? 124 : 176,
          L = Math.max(1, z - R),
          O = L / 540,
          q = L < 440 ? 60 : 30,
          F = (0, l.useMemo)(
            () => Array.from({ length: 540 / q }, (e, t) => 600 + t * q),
            [q],
          ),
          U = (0, l.useMemo)(() => {
            let e = L < 260 ? 180 : L < 520 ? 120 : 60,
              t = Array.from(
                { length: Math.floor(540 / e) + 1 },
                (t, n) => 600 + n * e,
              );
            return (1140 !== t.at(-1) && t.push(1140), t);
          }, [L]);
        ((0, l.useEffect)(() => {
          ((A.current = c), M(c));
        }, [c]),
          (0, l.useEffect)(() => {
            let e = E.current;
            if (!e) return;
            let t = () =>
              Z(Math.max(1, Math.floor(e.getBoundingClientRect().width)));
            t();
            let n = new ResizeObserver(t);
            return (n.observe(e), () => n.disconnect());
          }, []));
        let H = (0, l.useMemo)(() => {
            let e = new Map();
            for (let t of m) e.set(t.name, []);
            for (let n of k) {
              var t;
              let r = e.has(n.staffName) ? n.staffName : "フリー";
              e.set(r, [
                ...(null !== (t = e.get(r)) && void 0 !== t ? t : []),
                n,
              ]);
            }
            return e;
          }, [k, m]),
          V = (0, l.useMemo)(
            () =>
              F.map((e) => {
                let t = e + q,
                  n = m.reduce(
                    (n, r) =>
                      n +
                      (r.workStartMinutes < t && e < r.workEndMinutes
                        ? r.maxConcurrentAppointments
                        : 0),
                    0,
                  ),
                  r = k.filter((n) => {
                    if (!j(n)) return !1;
                    let r = g(n.scheduledAt);
                    return r < t && e < r + n.durationMinutes;
                  }).length;
                let a = Math.max(0, n - r);
                return {
                  slotStart: e,
                  capacity: n,
                  booked: r,
                  remaining:
                    Number.isInteger(capacityOverrides[e]) &&
                    capacityOverrides[e] >= 0
                      ? capacityOverrides[e]
                      : a,
                };
              }),
            [k, q, F, m, capacityOverrides],
          );
        ((0, l.useEffect)(() => {
          try {
            let e = window.localStorage.getItem(
              "salon-capacity-overrides:".concat(t),
            );
            e && setCapacityOverrides(JSON.parse(e));
          } catch (e) {}
        }, [t]));
        function updateCapacityOverride(e, n) {
          setCapacityOverrides((r) => {
            let a = { ...r, [e]: v(Number(n) || 0, 0, 99) };
            try {
              window.localStorage.setItem(
                "salon-capacity-overrides:".concat(t),
                JSON.stringify(a),
              );
            } catch (e) {}
            return a;
          });
        }
        function X(e, t) {
          M((n) => {
            let r = n.map((n) => (n.id === e ? { ...n, ...t } : n));
            return ((A.current = r), r);
          });
        }
        async function Y(e) {
          (P((t) => [...t, e.id]), T(null));
          try {
            let n = await fetch(
                "/api/admin/appointments/".concat(e.id, "/schedule"),
                {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    date: t,
                    startMinutes: g(e.scheduledAt),
                    durationMinutes: e.durationMinutes,
                    staffName: e.staffName,
                    updatedAt: e.updatedAt,
                  }),
                },
              ),
              r = await n.json();
            if (!n.ok || !r.appointment)
              throw Error(r.error || "予約を更新できませんでした。");
            (X(e.id, r.appointment),
              T({ tone: "success", text: "予約時間を更新しました。" }),
              y.refresh());
          } catch (t) {
            var n;
            ((null === (n = I.current) || void 0 === n ? void 0 : n.id) ===
              e.id && X(e.id, I.current),
              T({
                tone: "error",
                text:
                  t instanceof Error
                    ? t.message
                    : "予約を更新できませんでした。",
              }));
          } finally {
            (P((t) => t.filter((t) => t !== e.id)), (I.current = null));
          }
        }
        function J(e) {
          var t;
          let n =
              arguments.length > 1 && void 0 !== arguments[1] && arguments[1],
            r = D.current;
          if (!r || r.pointerId !== e.pointerId) return;
          if (
            ((D.current = null),
            e.currentTarget.hasPointerCapture(e.pointerId) &&
              e.currentTarget.releasePointerCapture(e.pointerId),
            n)
          ) {
            ((null === (t = I.current) || void 0 === t ? void 0 : t.id) ===
              r.appointmentId && X(r.appointmentId, I.current),
              (I.current = null),
              r.moved && (_.current = Date.now()));
            return;
          }
          if (!r.moved) {
            I.current = null;
            return;
          }
          _.current = Date.now();
          let a = A.current.find((e) => e.id === r.appointmentId);
          a && Y(a);
        }
        function K(e, t, n) {
          if (!(!j(t) || S.includes(t.id)) && 0 === e.button) {
            if (D.current) {
              var r;
              let e = D.current;
              ((null === (r = I.current) || void 0 === r ? void 0 : r.id) ===
                e.appointmentId && X(e.appointmentId, I.current),
                (D.current = null),
                (I.current = null));
            }
            ("touch" !== e.pointerType &&
              e.currentTarget.setPointerCapture(e.pointerId),
              (I.current = { ...t }),
              (D.current = {
                appointmentId: t.id,
                pointerId: e.pointerId,
                pointerType: e.pointerType,
                mode: n,
                originClientX: e.clientX,
                originClientY: e.clientY,
                originStartMinutes: g(t.scheduledAt),
                originDurationMinutes: t.durationMinutes,
                originStaffName: t.staffName,
                moved: !1,
              }));
          }
        }
        function B(e) {
          let n = D.current;
          if (!n || n.pointerId !== e.pointerId) return;
          if ("touch" !== n.pointerType && (1 & e.buttons) == 0) {
            J(e);
            return;
          }
          let r = e.clientX - n.originClientX,
            a = e.clientY - n.originClientY;
          if ("touch" !== n.pointerType || n.moved) {
            if (!n.moved && 3 >= Math.abs(r)) return;
          } else {
            let t = Math.abs(r),
              n = Math.abs(a);
            if (n >= 6 && n > t) {
              ((D.current = null), (I.current = null));
              return;
            }
            if (t < 8 || t <= n) return;
            e.currentTarget.setPointerCapture(e.pointerId);
          }
          (n.moved || (n.moved = !0), e.preventDefault());
          let i = (function (e) {
              let t =
                arguments.length > 1 && void 0 !== arguments[1]
                  ? arguments[1]
                  : 15;
              return Math.round(e / t) * t;
            })(r / O),
            l = A.current.find((e) => e.id === n.appointmentId);
          if (!l) return;
          if ("resize" === n.mode) {
            let e = v(
              n.originDurationMinutes + i,
              15,
              1140 - n.originStartMinutes,
            );
            X(l.id, { durationMinutes: e });
            return;
          }
          let o = v(n.originStartMinutes + i, 600, 1140 - l.durationMinutes),
            s = document
              .elementsFromPoint(e.clientX, e.clientY)
              .find((e) => e instanceof HTMLElement && e.dataset.staffName),
            c = (null == s ? void 0 : s.dataset.staffName) || n.originStaffName;
          X(l.id, {
            scheduledAt: ""
              .concat(t, "T")
              .concat(String(Math.floor(o / 60)).padStart(2, "0"), ":")
              .concat(String(o % 60).padStart(2, "0"), ":00+09:00"),
            staffName: c,
          });
        }
        function G(e) {
          J(e);
        }
        function $(e) {
          J(e, !0);
        }
        async function Q(e, n) {
          if (!j(e) || S.includes(e.id)) return;
          let r = m.findIndex((t) => t.name === e.staffName),
            a = g(e.scheduledAt),
            i = e.durationMinutes,
            l = e.staffName;
          if ("Enter" === n.key) {
            (n.preventDefault(), y.push("/admin/appointments/".concat(e.id)));
            return;
          }
          if ("ArrowLeft" === n.key)
            n.shiftKey
              ? (i = Math.max(15, i - 15))
              : (a = Math.max(600, a - 15));
          else if ("ArrowRight" === n.key)
            n.shiftKey
              ? (i = Math.min(1140 - a, i + 15))
              : (a = Math.min(1140 - i, a + 15));
          else if ("ArrowUp" === n.key && r > 0) l = m[r - 1].name;
          else {
            if ("ArrowDown" !== n.key || !(r < m.length - 1)) return;
            l = m[r + 1].name;
          }
          (n.preventDefault(), (I.current = { ...e }));
          let o = Math.floor(a / 60),
            s = a % 60,
            c = {
              ...e,
              scheduledAt: ""
                .concat(t, "T")
                .concat(String(o).padStart(2, "0"), ":")
                .concat(String(s).padStart(2, "0"), ":00+09:00"),
              durationMinutes: i,
              staffName: l,
            };
          (X(e.id, c), await Y(c));
        }
        return (0, r.jsxs)("div", {
          className: "grid gap-4",
          children: [
            (0, r.jsxs)("div", {
              className:
                "flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between",
              children: [
                (0, r.jsxs)("div", {
                  children: [
                    (0, r.jsx)("p", {
                      className:
                        "text-sm font-semibold text-[color:var(--lien-primary)]",
                      children: "日別シフト表",
                    }),
                    (0, r.jsx)("h2", {
                      className:
                        "mt-1 text-xl font-semibold text-[color:var(--lien-ink)]",
                      children: n,
                    }),
                    (0, r.jsx)("p", {
                      className:
                        "mt-1 text-xs leading-5 text-[color:var(--lien-muted)]",
                      children:
                        "予約をドラッグして移動、右端を引いて施術時間を変更できます。15分単位で保存されます。",
                    }),
                  ],
                }),
                (0, r.jsxs)("div", {
                  className: "flex flex-col items-start gap-3 lg:items-end",
                  children: [
                    (0, r.jsx)(h, {
                      date: t,
                      customers: p,
                      staff: m,
                      onCreated: function (e) {
                        let t = [...A.current, e].sort(
                          (e, t) =>
                            new Date(e.scheduledAt).getTime() -
                            new Date(t.scheduledAt).getTime(),
                        );
                        ((A.current = t),
                          M(t),
                          T({
                            tone: "success",
                            text: "手動予約を登録しました。",
                          }),
                          y.refresh());
                      },
                    }),
                    (0, r.jsx)("div", {
                      className:
                        "flex flex-wrap gap-2 text-[11px] font-semibold lg:justify-end",
                      children: Object.keys(b).map((e) => {
                        let t = b[e];
                        return (0, r.jsxs)(
                          "span",
                          {
                            className:
                              "inline-flex items-center gap-1.5 rounded-full border border-[color:var(--lien-border)] bg-white px-2.5 py-1.5 text-[color:var(--lien-muted)]",
                            children: [
                              (0, r.jsx)("span", {
                                className:
                                  "grid h-5 min-w-5 place-items-center rounded px-1 text-[10px] ".concat(
                                    t.className,
                                  ),
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
            C
              ? (0, r.jsxs)("div", {
                  role: "status",
                  className:
                    "flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ".concat(
                      "error" === C.tone
                        ? "border-[#edc2bd] bg-[#fff1ef] text-[#884039]"
                        : "border-[#bed9ca] bg-[#edf8f1] text-[#315d47]",
                    ),
                  children: [
                    "error" === C.tone
                      ? (0, r.jsx)(o.Z, { className: "h-4 w-4 shrink-0" })
                      : null,
                    C.text,
                  ],
                })
              : null,
            (0, r.jsx)("div", {
              ref: E,
              className:
                "w-full overflow-hidden rounded-2xl border border-[color:var(--lien-border)] bg-white shadow-sm",
              children: (0, r.jsxs)("div", {
                className: "w-full",
                children: [
                  (0, r.jsxs)("div", {
                    className:
                      "grid border-b border-[color:var(--lien-border)] bg-[#fbf8f3]",
                    style: {
                      gridTemplateColumns: "".concat(R, "px minmax(0, 1fr)"),
                    },
                    children: [
                      (0, r.jsx)("div", {
                        className:
                          "flex items-center border-r border-[color:var(--lien-border)] bg-[#fbf8f3] px-2 text-[10px] font-semibold leading-4 text-[color:var(--lien-muted)] sm:px-4 sm:text-xs",
                        children: "スタッフ / 受付可能数",
                      }),
                      (0, r.jsx)("div", {
                        className:
                          "relative h-11 border-b border-[color:var(--lien-border)]",
                        children: U.map((e, t) =>
                          (0, r.jsx)(
                            "span",
                            {
                              className:
                                "absolute top-3 whitespace-nowrap text-[10px] font-semibold tabular-nums text-[color:var(--lien-ink)] sm:text-xs ".concat(
                                  0 === t
                                    ? ""
                                    : t === U.length - 1
                                      ? "-translate-x-full"
                                      : "-translate-x-1/2",
                                ),
                              style: {
                                left:
                                  0 === t
                                    ? 4
                                    : t === U.length - 1
                                      ? L - 4
                                      : (e - 600) * O,
                              },
                              children: w(e),
                            },
                            e,
                          ),
                        ),
                      }),
                      (0, r.jsxs)("div", {
                        className:
                          "grid border-r border-[color:var(--lien-border)] bg-[#fbf8f3] text-[9px] font-semibold leading-3 text-[color:var(--lien-muted)] sm:text-[11px]",
                        children: [
                          (0, r.jsx)("span", {
                            className: "flex h-8 items-center px-2 sm:px-4",
                            children: "予約数",
                          }),
                          (0, r.jsx)("span", {
                            className:
                              "flex h-8 items-center border-t border-[color:var(--lien-border)] px-2 sm:px-4",
                            children: "残り受付数",
                          }),
                        ],
                      }),
                      (0, r.jsxs)("div", {
                        children: [
                          (0, r.jsx)("div", {
                            className: "flex h-8",
                            children: V.map((e) =>
                              (0, r.jsx)(
                                "span",
                                {
                                  className:
                                    "grid place-items-center border-r border-[color:var(--lien-border)] text-[9px] font-semibold tabular-nums text-[color:var(--lien-ink)] sm:text-[11px]",
                                  style: { width: q * O },
                                  title: ""
                                    .concat(w(e.slotStart), " 予約")
                                    .concat(e.booked, "件"),
                                  children: e.booked,
                                },
                                "booked-".concat(e.slotStart),
                              ),
                            ),
                          }),
                          (0, r.jsx)("div", {
                            className:
                              "flex h-8 border-t border-[color:var(--lien-border)]",
                            children: V.map((e) =>
                              (0, r.jsx)(
                                "input",
                                {
                                  className:
                                    "grid place-items-center border-r border-[color:var(--lien-border)] text-[9px] font-bold tabular-nums sm:text-[11px] ".concat(
                                      0 === e.remaining
                                        ? "bg-[#f9e8e5] text-[#9d4038]"
                                        : "text-[#41684f]",
                                    ),
                                  style: { width: q * O },
                                  title: ""
                                    .concat(w(e.slotStart), " 残り")
                                    .concat(e.remaining, "件 / ")
                                    .concat(e.capacity, "件"),
                                  "aria-label": ""
                                    .concat(w(e.slotStart), " 残り受付数"),
                                  type: "number",
                                  min: 0,
                                  max: 99,
                                  value: e.remaining,
                                  onChange: (t) =>
                                    updateCapacityOverride(
                                      e.slotStart,
                                      t.target.value,
                                    ),
                                },
                                "remaining-".concat(e.slotStart),
                              ),
                            ),
                          }),
                        ],
                      }),
                    ],
                  }),
                  m.map((e) => {
                    var t;
                    let n =
                        null !== (t = H.get(e.name)) && void 0 !== t ? t : [],
                      i = (function (e) {
                        let t = [...e].sort(
                            (e, t) =>
                              e.startMinutes - t.startMinutes ||
                              t.durationMinutes - e.durationMinutes,
                          ),
                          n = [],
                          r = new Map();
                        for (let e of t) {
                          let t = n.findIndex((t) => t <= e.startMinutes),
                            a = -1 === t ? n.length : t;
                          ((n[a] = e.startMinutes + e.durationMinutes),
                            r.set(e.id, a));
                        }
                        return { lanes: r, laneCount: Math.max(1, n.length) };
                      })(
                        n.map((e) => ({
                          ...e,
                          startMinutes: g(e.scheduledAt),
                          durationMinutes: e.durationMinutes,
                        })),
                      ),
                      l = Math.max(
                        74,
                        20 +
                          42 * i.laneCount +
                          5 * Math.max(0, i.laneCount - 1),
                      );
                    return (0, r.jsxs)(
                      "div",
                      {
                        className:
                          "grid border-b border-[color:var(--lien-border)] last:border-b-0",
                        style: {
                          gridTemplateColumns: "".concat(
                            R,
                            "px minmax(0, 1fr)",
                          ),
                          minHeight: l,
                        },
                        children: [
                          (0, r.jsx)("div", {
                            className:
                              "z-20 flex min-w-0 items-center border-r border-[color:var(--lien-border)] bg-white px-1.5 py-3 sm:px-3",
                            children: (0, r.jsxs)(a.default, {
                              href: "/admin/staff/".concat(e.key),
                              className:
                                "group min-w-0 rounded-xl px-1 py-1.5 transition hover:bg-[color:var(--lien-surface-soft)] sm:px-2",
                              children: [
                                (0, r.jsx)("span", {
                                  className:
                                    "block truncate text-[11px] font-semibold text-[color:var(--lien-ink)] group-hover:text-[color:var(--lien-primary)] sm:text-sm",
                                  children: e.name,
                                }),
                                (0, r.jsxs)("span", {
                                  className:
                                    "mt-1 block truncate text-[9px] text-[color:var(--lien-muted)] sm:text-[10px]",
                                  children: [
                                    "受付: ",
                                    e.maxConcurrentAppointments,
                                  ],
                                }),
                              ],
                            }),
                          }),
                          (0, r.jsxs)("div", {
                            className:
                              "relative min-w-0 overflow-hidden bg-white",
                            "data-staff-name": e.name,
                            style: { height: l },
                            children: [
                              (0, r.jsx)("div", {
                                className:
                                  "pointer-events-none absolute inset-y-0 left-0 bg-[repeating-linear-gradient(135deg,#f5f1ec_0,#f5f1ec_6px,#fbf8f3_6px,#fbf8f3_12px)]",
                                style: {
                                  width:
                                    Math.max(0, e.workStartMinutes - 600) * O,
                                },
                              }),
                              (0, r.jsx)("div", {
                                className:
                                  "pointer-events-none absolute inset-y-0 right-0 bg-[repeating-linear-gradient(135deg,#f5f1ec_0,#f5f1ec_6px,#fbf8f3_6px,#fbf8f3_12px)]",
                                style: {
                                  width:
                                    Math.max(0, 1140 - e.workEndMinutes) * O,
                                },
                              }),
                              F.map((t) =>
                                (0, r.jsx)(
                                  "span",
                                  {
                                    "aria-hidden": "true",
                                    className:
                                      "pointer-events-none absolute inset-y-0 border-l border-[#ddd4ca]",
                                    style: { left: (t - 600) * O },
                                  },
                                  "".concat(e.key, "-").concat(t),
                                ),
                              ),
                              f && null !== x && x >= 600 && x <= 1140
                                ? (0, r.jsx)("span", {
                                    "aria-label": "現在時刻",
                                    className:
                                      "pointer-events-none absolute inset-y-0 z-20 w-0.5 bg-[#c24842]",
                                    style: { left: (x - 600) * O },
                                    children: (0, r.jsx)("span", {
                                      className:
                                        "absolute -left-1.5 -top-1 h-3 w-3 rounded-full bg-[#c24842]",
                                    }),
                                  })
                                : null,
                              0 === n.length
                                ? (0, r.jsx)("span", {
                                    className:
                                      "absolute left-4 top-1/2 -translate-y-1/2 text-xs text-[#b8ada3]",
                                    children: "予約なし",
                                  })
                                : null,
                              n.map((e) => {
                                var t, n, a;
                                let l = g(e.scheduledAt),
                                  o =
                                    null !== (t = i.lanes.get(e.id)) &&
                                    void 0 !== t
                                      ? t
                                      : 0,
                                  c =
                                    b[
                                      (function (e) {
                                        var t, n, r, a;
                                        let i =
                                          null === (t = e.bookingProvider) ||
                                          void 0 === t
                                            ? void 0
                                            : t.trim().toLowerCase();
                                        if (i && i in b) return i;
                                        let l = ""
                                          .concat(
                                            null !== (n = e.source) &&
                                              void 0 !== n
                                              ? n
                                              : "",
                                            "\n",
                                          )
                                          .concat(
                                            null !== (r = e.subject) &&
                                              void 0 !== r
                                              ? r
                                              : "",
                                            "\n",
                                          )
                                          .concat(
                                            null !== (a = e.content) &&
                                              void 0 !== a
                                              ? a
                                              : "",
                                          );
                                        return /hot\s*pepper|ホットペッパー|salon\s*board|サロンボード/i.test(
                                          l,
                                        )
                                          ? "hotpepper"
                                          : /kanzashi|かんざし|gmail:/i.test(l)
                                            ? "kanzashi"
                                            : /お客様アプリ|customer_app/i.test(
                                                  l,
                                                )
                                              ? "customer_app"
                                              : /電話|\bTEL\b/i.test(l)
                                                ? "phone"
                                                : /店頭|飛び込み/i.test(l)
                                                  ? "walk_in"
                                                  : "manual";
                                      })(e)
                                    ],
                                  m = S.includes(e.id),
                                  p = (l - 600) * O + 1,
                                  f = Math.max(
                                    10,
                                    Math.min(
                                      e.durationMinutes * O - 2,
                                      L - p - 1,
                                    ),
                                  );
                                return (0, r.jsxs)(
                                  "button",
                                  {
                                    type: "button",
                                    className:
                                      "group absolute z-10 overflow-hidden rounded-xl border px-2 py-1.5 text-left text-[11px] leading-4 shadow-sm outline-none transition hover:z-20 hover:shadow-md focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-[color:var(--lien-primary)] "
                                        .concat(
                                          "予約確定" === (a = e.status)
                                            ? "border-[#e2b9b1] bg-[#fff0ed] text-[#603d37]"
                                            : "変更受付" === a
                                              ? "border-[#dfc78e] bg-[#fff8e6] text-[#725117]"
                                              : "仮予約" === a
                                                ? "border-[#c7d7c4] bg-[#f0f6ee] text-[#405b40]"
                                                : "border-[#ddd5cc] bg-[#f5f1ec] text-[#6f665e]",
                                          " ",
                                        )
                                        .concat(
                                          j(e)
                                            ? "cursor-grab active:cursor-grabbing"
                                            : "cursor-default opacity-70",
                                        ),
                                    style: {
                                      left: p,
                                      top: 10 + 47 * o,
                                      width: f,
                                      height: 42,
                                      touchAction: "pan-y pinch-zoom",
                                    },
                                    title: ""
                                      .concat(N(e), " ")
                                      .concat(e.customerName, " / ")
                                      .concat(
                                        c.label,
                                        "。ダブルクリックで予約・会計を開く",
                                      ),
                                    "aria-label": ""
                                      .concat(e.customerName, " ")
                                      .concat(
                                        N(e),
                                        "。ダブルクリックまたはEnterキーで予約・会計を開く。矢印キーで15分移動、Shiftと左右キーで長さを変更",
                                      ),
                                    onPointerDown: (t) => K(t, e, "move"),
                                    onPointerMove: B,
                                    onPointerUp: G,
                                    onPointerCancel: $,
                                    onLostPointerCapture: (e) => J(e),
                                    onKeyDown: (t) => void Q(e, t),
                                    onDoubleClick: () => {
                                      Date.now() - _.current < 500 ||
                                        y.push(
                                          "/admin/appointments/".concat(e.id),
                                        );
                                    },
                                    children: [
                                      (0, r.jsxs)("span", {
                                        className:
                                          "flex min-w-0 items-center",
                                        children: [
                                          (0, r.jsx)("span", {
                                            className:
                                              "block min-w-0 truncate rounded px-1.5 py-0.5 text-[9px] font-bold ".concat(
                                                c.className,
                                              ),
                                            title: c.label,
                                            children: c.label,
                                          }),
                                          null,
                                        ],
                                      }),
                                      f >= 42
                                        ? (0, r.jsxs)("span", {
                                            className:
                                              "block truncate font-semibold",
                                            children: [
                                              e.customerName,
                                              " ・ ",
                                              menuCategory(e.menu),
                                            ],
                                          })
                                        : null,
                                      j(e)
                                        ? (0, r.jsx)("span", {
                                            role: "presentation",
                                            className:
                                              "absolute inset-y-0 right-0 flex w-3 cursor-ew-resize items-center justify-center border-l border-black/10 bg-white/35 opacity-60 transition group-hover:opacity-100",
                                            onPointerDown: (t) => {
                                              (t.stopPropagation(),
                                                K(t, e, "resize"));
                                            },
                                            onDoubleClick: (e) =>
                                              e.stopPropagation(),
                                            onPointerMove: B,
                                            onPointerUp: G,
                                            onPointerCancel: $,
                                            onLostPointerCapture: (e) => J(e),
                                            children: (0, r.jsx)(u, {
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
      }
    },
    5480: function (e, t, n) {
      "use strict";
      n.d(t, {
        Z: function () {
          return c;
        },
      });
      var r = n(2265),
        a = n(6775);
      let i = (e) => e.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(),
        l = (e) =>
          e.replace(/^([A-Z])|[\s-_]+(\w)/g, (e, t, n) =>
            n ? n.toUpperCase() : t.toLowerCase(),
          ),
        o = (e) => {
          let t = l(e);
          return t.charAt(0).toUpperCase() + t.slice(1);
        };
      var s = n(2228);
      let c = (e, t) => {
        let n = (0, r.forwardRef)((n, l) => {
          let { className: c, ...d } = n;
          return (0, r.createElement)(s.default, {
            ref: l,
            iconNode: t,
            className: (0, a.z)(
              "lucide-".concat(i(o(e))),
              "lucide-".concat(e),
              c,
            ),
            ...d,
          });
        });
        return ((n.displayName = o(e)), n);
      };
    },
    1746: function (e, t, n) {
      "use strict";
      n.d(t, {
        Z: function () {
          return r;
        },
      });
      let r = (0, n(5480).Z)("circle-alert", [
        ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
        ["line", { x1: "12", x2: "12", y1: "8", y2: "12", key: "1pkeuh" }],
        ["line", { x1: "12", x2: "12.01", y1: "16", y2: "16", key: "4dfq90" }],
      ]);
    },
    7887: function (e, t, n) {
      "use strict";
      n.d(t, {
        Z: function () {
          return r;
        },
      });
      let r = (0, n(5480).Z)("loader-circle", [
        ["path", { d: "M21 12a9 9 0 1 1-6.219-8.56", key: "13zald" }],
      ]);
    },
    4891: function (e, t, n) {
      "use strict";
      n.d(t, {
        Z: function () {
          return r;
        },
      });
      let r = (0, n(5480).Z)("x", [
        ["path", { d: "M18 6 6 18", key: "1bl5f8" }],
        ["path", { d: "m6 6 12 12", key: "d8bk6v" }],
      ]);
    },
  },
  function (e) {
    (e.O(0, [3717, 5878, 2971, 2117, 1744], function () {
      return e((e.s = 1456));
    }),
      (_N_E = e.O()));
  },
]);
