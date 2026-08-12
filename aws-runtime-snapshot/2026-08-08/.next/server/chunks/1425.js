((exports.id = 1425),
  (exports.ids = [1425]),
  (exports.modules = {
    99189: (e, t, n) => {
      (Promise.resolve().then(n.t.bind(n, 12994, 23)),
        Promise.resolve().then(n.t.bind(n, 96114, 23)),
        Promise.resolve().then(n.t.bind(n, 9727, 23)),
        Promise.resolve().then(n.t.bind(n, 79671, 23)),
        Promise.resolve().then(n.t.bind(n, 41868, 23)),
        Promise.resolve().then(n.t.bind(n, 84759, 23)));
    },
    97068: (e, t, n) => {
      Promise.resolve().then(n.bind(n, 50141));
    },
    50141: (e, t, n) => {
      "use strict";
      n.d(t, { AppShell: () => E });
      var r = n(10326),
        a = n(90434),
        s = n(35047),
        i = n(55736),
        l = n(19071),
        o = n(53982),
        c = n(78616),
        d = n(28953),
        u = n(80380),
        m = n(76125),
        h = n(96588),
        f = n(56636),
        p = n(8183),
        x = n(16035),
        b = n(17577),
        w = n(46226);
      let g = {
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
      function y(...e) {
        return e.filter(Boolean).join(" ");
      }
      function v({
        variant: e,
        className: t = "",
        imageClassName: n = "",
        sizes: a = "(max-width: 768px) 100vw, 420px",
        priority: s = !1,
        children: i,
        overlay: l = "soft",
      }) {
        let o = g[e];
        return (0, r.jsxs)("figure", {
          className: y("relative isolate overflow-hidden bg-[#efe5da]", t),
          children: [
            r.jsx(w.default, {
              src: o.src,
              alt: o.alt,
              fill: !0,
              priority: s,
              sizes: a,
              className: y("object-cover", n),
            }),
            "none" !== l
              ? r.jsx("span", {
                  "aria-hidden": "true",
                  className: y(
                    "pointer-events-none absolute inset-0",
                    "strong" === l
                      ? "bg-gradient-to-t from-[#2f2a25]/65 via-[#2f2a25]/10 to-transparent"
                      : "bg-gradient-to-t from-[#2f2a25]/24 via-transparent to-white/5",
                  ),
                })
              : null,
            i
              ? r.jsx("div", { className: "relative z-10 h-full", children: i })
              : null,
          ],
        });
      }
      let N = [
          { href: "/admin/appointments", label: "予約カレンダー", icon: i.Z },
          {
            href: "/admin/customers",
            label: "顧客・ポイント・配信",
            icon: l.Z,
          },
          {
            href: "/admin/products?section=menus",
            label: "メニュー・商品棚・集計",
            icon: o.Z,
          },
          {
            href: "/admin/community",
            label: "スタイル共有",
            icon: c.Z,
            staffOnly: !0,
          },
          {
            href: "/admin/owner-analytics",
            label: "経営分析",
            icon: d.Z,
            ownerOnly: !0,
          },
        ],
        j = [
          {
            href: "/admin/appointments",
            label: "予約カレンダー",
            hint: "Gmail予約と月間予定",
            icon: i.Z,
          },
          {
            href: "/admin/customers",
            label: "顧客・ポイント・配信",
            hint: "顧客管理とポイント管理",
            icon: l.Z,
          },
          {
            href: "/admin/products?section=menus",
            label: "メニュー・商品棚・集計",
            hint: "メニュー・商品・在庫管理と集計",
            icon: o.Z,
          },
          {
            href: "/admin/community",
            label: "スタイル共有",
            hint: "公開された施術写真とコメント",
            icon: c.Z,
            staffOnly: !0,
          },
          {
            href: "/admin/owner-analytics",
            label: "経営分析",
            hint: "売上・スタッフ・顧客構成",
            icon: d.Z,
            ownerOnly: !0,
          },
        ],
        I = [
          "/u/",
          "/app/",
          "/proposals/",
          "/intake",
          "/feedback/",
          "/care/",
          "/appointments/",
          "/review/",
          "/referral/",
        ];
      function A(e) {
        let [t, n = ""] = e.split("?");
        return { path: t, view: new URLSearchParams(n).get("view") ?? "" };
      }
      function S(e, t, n) {
        let { path: r, view: a } = A(n);
        return a
          ? e === r && t === a
          : "/admin/customers" === r
            ? e === r
              ? "" === t
              : e.startsWith(`${r}/`)
            : e === r || e.startsWith(`${r}/`);
      }
      function k({ imageUrl: e, compact: t = !1 }) {
        return r.jsx("span", {
          role: "img",
          "aria-label": "店舗アイコン",
          className: `${t ? "h-8 w-8 rounded-full text-sm" : "h-11 w-11 rounded-2xl text-lg"} inline-flex shrink-0 items-center justify-center border border-[#ead8ca] bg-[#fff7ef] bg-cover bg-center font-semibold text-[color:var(--lien-primary-dark)] shadow-sm`,
          style: e ? { backgroundImage: `url(${e})` } : void 0,
          children: e
            ? r.jsx("span", { className: "sr-only", children: "Salon de Lien" })
            : "L",
        });
      }
      function _({ displayName: e, compact: t = !1 }) {
        return e
          ? (0, r.jsxs)(a.default, {
              href: "/admin/account",
              className: `flex min-w-0 items-center rounded-full border border-lien bg-white shadow-sm ${t ? "h-10 max-w-28 gap-1.5 px-2" : "h-10 max-w-44 gap-2 px-2.5 pr-3"} transition hover:border-[color:var(--lien-primary-soft)] hover:bg-lien-soft`,
              title: "ログインID・パスワードを変更",
              "aria-label": `${e}のアカウント設定を開く`,
              children: [
                r.jsx("span", {
                  className:
                    "grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f1dfd7] text-xs font-bold text-[color:var(--lien-primary-dark)]",
                  children: e.slice(0, 1),
                }),
                r.jsx("span", {
                  className: `${t ? "text-[11px]" : "text-xs"} truncate font-semibold text-lien-ink`,
                  children: e,
                }),
              ],
            })
          : null;
      }
      function E({
        children: e,
        storeIconUrl: t,
        backofficeRole: n,
        backofficeDisplayName: i,
      }) {
        let l = (0, s.usePathname)(),
          [o, c] = (0, b.useState)(""),
          [d, w] = (0, b.useState)(!1),
          [sidebarCollapsed, setSidebarCollapsed] = (0, b.useState)(!1),
          [g, y] = (0, b.useState)(!1),
          [E, C] = (0, b.useState)(""),
          T = (e) =>
            (!e.ownerOnly || "ADMIN" === n) &&
            (!e.staffOnly || "ADMIN" === n || "STAFF" === n),
          U = N.filter(T),
          R =
            "ADMIN" === n
              ? "/admin/settings"
              : "/admin/customers?view=settings",
          O = j.filter(T),
          M =
            /^\/admin\/coupon-issues\/[^/]+\/print$/.test(l) ||
            /^\/customers\/[^/]+\/coupons\/[^/]+\/print$/.test(l) ||
            /^\/customers\/[^/]+\/coupon\/print\/[^/]+$/.test(l) ||
            /^\/admin\/appointments\/[^/]+\/receipt$/.test(l),
          D =
            "/admin/settings" === l
              ? "店舗運用設定"
              : "/admin/account" === l
                ? "アカウント設定"
                : (U.find((e) => S(l, o, e.href))?.label ?? "Salon CRM"),
          L = O.filter((e) => {
            let t = E.trim().toLowerCase();
            return !t || `${e.label} ${e.hint}`.toLowerCase().includes(t);
          });
        if (
          "/admin/login" === l ||
          l.startsWith("/admin/password-reset") ||
          I.some((e) => l.startsWith(e)) ||
          M
        )
          return r.jsx("div", {
            className: "min-h-screen overflow-x-hidden bg-lien text-lien-ink",
            children: e,
          });
        let P = (0, r.jsxs)("div", {
          className:
            "flex h-[100dvh] min-h-0 flex-col bg-[#fffdf9] text-lien-ink md:h-full",
          children: [
            r.jsx("div", {
              className: "border-b border-lien px-4 py-4",
              children: (0, r.jsxs)("div", {
                className: "flex items-center justify-between gap-3",
                children: [
                  (0, r.jsxs)(a.default, {
                    href: "/admin/customers",
                    className: "flex min-w-0 items-center gap-3 text-lien-ink",
                    children: [
                      r.jsx(k, { imageUrl: t }),
                      (0, r.jsxs)("span", {
                        className: "min-w-0",
                        children: [
                          r.jsx("span", {
                            className:
                              "block truncate text-lg font-semibold tracking-normal",
                            children: "Salon de Lien",
                          }),
                          r.jsx("span", {
                            className:
                              "block truncate text-[11px] font-semibold text-lien-muted",
                            children: "既存客を動かす美容室CRM",
                          }),
                        ],
                      }),
                    ],
                  }),
                  r.jsx("button", {
                    type: "button",
                    className:
                      "inline-flex h-10 w-10 items-center justify-center rounded-full text-lien-muted hover:bg-lien-soft md:hidden",
                    onClick: () => w(!1),
                    "aria-label": "メニューを閉じる",
                    children: r.jsx(u.Z, { className: "h-5 w-5" }),
                  }),
                ],
              }),
            }),
            (0, r.jsxs)("nav", {
              className:
                "grid min-h-0 flex-1 content-start gap-1 overflow-y-auto overscroll-contain p-3 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-3",
              "aria-label": "管理画面ナビゲーション",
              children: [
                U.map((e) => {
                  let t = e.icon,
                    { view: n } = A(e.href),
                    s = S(l, o, e.href);
                  return (0, r.jsxs)(
                    a.default,
                    {
                      href: e.href,
                      onClick: () => {
                        (c(n), w(!1));
                      },
                      className: `lien-nav-item group flex min-h-11 items-center gap-3 rounded-full px-3 text-sm font-semibold transition ${s ? "bg-[color:var(--lien-primary)] text-white shadow-sm" : "text-lien-muted hover:bg-lien-soft hover:text-lien-ink"}`,
                      "aria-current": s ? "page" : void 0,
                      children: [
                        r.jsx(t, {
                          className: `h-4 w-4 shrink-0 ${s ? "text-white" : "text-[#a79b91] group-hover:text-[color:var(--lien-primary)]"}`,
                        }),
                        r.jsx("span", {
                          className: "truncate",
                          children: e.label,
                        }),
                      ],
                    },
                    e.href,
                  );
                }),
                r.jsx("form", {
                  action: "/api/auth/logout",
                  method: "post",
                  className: "mt-2 border-t border-lien pt-3 md:hidden",
                  children: (0, r.jsxs)("button", {
                    type: "submit",
                    className:
                      "flex min-h-11 w-full touch-manipulation items-center gap-3 rounded-full px-3 text-sm font-semibold text-lien-muted transition hover:bg-lien-soft hover:text-lien-ink active:bg-lien-soft",
                    children: [
                      r.jsx(m.Z, { className: "h-4 w-4 shrink-0" }),
                      r.jsx("span", { children: "ログアウト" }),
                    ],
                  }),
                }),
              ],
            }),
            r.jsx("div", {
              className: "mx-3 mb-1 hidden lg:block",
              children: r.jsx(v, {
                variant: "workflow",
                className: "h-28 rounded-[18px] border border-lien shadow-sm",
                imageClassName: "object-[24%_58%]",
                sizes: "232px",
                children: r.jsx("div", {
                  className:
                    "flex h-full items-end bg-gradient-to-t from-[#2f2a25]/70 via-transparent to-transparent p-3",
                  children: r.jsx("p", {
                    className: "text-xs font-semibold leading-5 text-white",
                    children: "今日の接客を、次の関係へ。",
                  }),
                }),
              }),
            }),
            r.jsx("div", {
              className: "mt-auto hidden p-3 md:block",
              children: r.jsx("form", {
                action: "/api/auth/logout",
                method: "post",
                children: (0, r.jsxs)("button", {
                  type: "submit",
                  className:
                    "flex min-h-11 w-full items-center gap-3 rounded-full px-3 text-sm font-semibold text-lien-muted transition hover:bg-lien-soft hover:text-lien-ink",
                  children: [
                    r.jsx(m.Z, { className: "h-4 w-4 shrink-0" }),
                    r.jsx("span", { children: "ログアウト" }),
                  ],
                }),
              }),
            }),
          ],
        });
        return (0, r.jsxs)("div", {
          className: "min-h-screen overflow-x-hidden bg-lien text-lien-ink",
          children: [
            r.jsx("aside", {
              className: `fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-lien bg-white/90 shadow-lien-sm transition-transform duration-200 md:block ${sidebarCollapsed ? "-translate-x-full" : "translate-x-0"}`,
              children: P,
            }),
            r.jsx("button", {
              type: "button",
              onClick: () => setSidebarCollapsed((e) => !e),
              className: "fixed top-20 z-50 hidden h-9 w-9 items-center justify-center rounded-full border border-lien bg-white text-base font-bold text-lien-primary shadow-md transition-all hover:bg-lien-soft md:inline-flex",
              style: { left: sidebarCollapsed ? "0.5rem" : "15rem" },
              "aria-label": sidebarCollapsed
                ? "サイドバーを開く"
                : "サイドバーを閉じる",
              title: sidebarCollapsed
                ? "サイドバーを開く"
                : "サイドバーを閉じる",
              children: sidebarCollapsed ? "▶" : "◀",
            }),
            d
              ? (0, r.jsxs)("div", {
                  className: "fixed inset-x-0 top-0 z-50 h-[100dvh] md:hidden",
                  children: [
                    r.jsx("button", {
                      type: "button",
                      className:
                        "absolute inset-0 bg-stone-950/35 backdrop-blur-[2px]",
                      onClick: () => w(!1),
                      "aria-label": "メニューを閉じる",
                    }),
                    r.jsx("aside", {
                      className:
                        "relative h-[100dvh] w-[min(18rem,88vw)] border-r border-lien shadow-lien",
                      children: P,
                    }),
                  ],
                })
              : null,
            (0, r.jsxs)("div", {
              className: `min-w-0 transition-[padding] duration-200 ${sidebarCollapsed ? "md:pl-0" : "md:pl-64"}`,
              children: [
                (0, r.jsxs)("header", {
                  className:
                    "sticky top-0 z-40 border-b border-lien bg-[#fffdf9]/92 backdrop-blur-xl",
                  children: [
                    (0, r.jsxs)("div", {
                      className:
                        "flex h-14 items-center justify-between px-4 md:hidden",
                      children: [
                        (0, r.jsxs)(a.default, {
                          href: "/admin/customers",
                          className:
                            "flex min-w-0 items-center gap-2 font-semibold text-lien-ink",
                          children: [
                            r.jsx(k, { imageUrl: t, compact: !0 }),
                            r.jsx("span", {
                              className: "truncate",
                              children: "Salon de Lien",
                            }),
                          ],
                        }),
                        (0, r.jsxs)("div", {
                          className: "flex items-center gap-2",
                          children: [
                            r.jsx(_, { displayName: i, compact: !0 }),
                            r.jsx(a.default, {
                              href: R,
                              onClick: () => c("settings"),
                              className: "lien-icon-button",
                              "aria-label": "設定を開く",
                              title: "設定",
                              children: r.jsx(h.Z, { className: "h-4 w-4" }),
                            }),
                            r.jsx("button", {
                              type: "button",
                              className: "lien-icon-button text-lien-ink",
                              onClick: () => w(!0),
                              "aria-label": "メニューを開く",
                              children: r.jsx(f.Z, { className: "h-5 w-5" }),
                            }),
                          ],
                        }),
                      ],
                    }),
                    (0, r.jsxs)("div", {
                      className:
                        "hidden min-h-16 min-w-0 items-center gap-3 px-5 py-3 md:flex lg:px-8",
                      children: [
                        (0, r.jsxs)("div", {
                          className: "min-w-0",
                          children: [
                            r.jsx("p", {
                              className:
                                "text-[11px] font-semibold text-lien-muted",
                              children: "Salon de Lien",
                            }),
                            r.jsx("p", {
                              className:
                                "truncate text-sm font-semibold text-lien-ink",
                              children: D,
                            }),
                          ],
                        }),
                        (0, r.jsxs)("form", {
                          action: "/admin/customers",
                          className: "relative ml-2 min-w-0 flex-1 max-w-xl",
                          children: [
                            r.jsx(p.Z, {
                              className:
                                "pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#aa9b90]",
                            }),
                            r.jsx("input", {
                              name: "q",
                              placeholder: "顧客名・電話・メモで検索",
                              className:
                                "h-11 w-full rounded-full border border-lien bg-white px-11 text-sm text-lien-ink shadow-sm outline-none placeholder:text-[#a99d93] focus:border-[color:var(--lien-primary)] focus:ring-2 focus:ring-[#ead0c7]",
                            }),
                          ],
                        }),
                        (0, r.jsxs)("button", {
                          type: "button",
                          onClick: () => y(!0),
                          className:
                            "lien-button-secondary h-11 px-4 text-xs text-lien-muted",
                          "aria-label": "コマンドパレットを開く",
                          children: [
                            r.jsx(x.Z, { className: "h-4 w-4" }),
                            "Ctrl K",
                          ],
                        }),
                        r.jsx(_, { displayName: i }),
                        r.jsx(a.default, {
                          href: R,
                          onClick: () => c("settings"),
                          className: "lien-icon-button shrink-0",
                          "aria-label": "設定を開く",
                          title: "設定",
                          children: r.jsx(h.Z, { className: "h-4 w-4" }),
                        }),
                      ],
                    }),
                  ],
                }),
                r.jsx("main", {
                  className:
                    "min-w-0 overflow-x-hidden px-4 py-5 sm:px-6 lg:px-8",
                  children: e,
                }),
              ],
            }),
            g
              ? (0, r.jsxs)("div", {
                  className:
                    "fixed inset-0 z-50 grid place-items-start bg-stone-950/35 px-4 py-16 backdrop-blur-[2px] sm:place-items-center sm:py-4",
                  children: [
                    r.jsx("button", {
                      className: "absolute inset-0",
                      type: "button",
                      onClick: () => y(!1),
                      "aria-label": "コマンドパレットを閉じる",
                    }),
                    (0, r.jsxs)("div", {
                      className:
                        "relative w-full max-w-xl overflow-hidden rounded-[26px] border border-lien bg-[#fffdf9] shadow-lien",
                      children: [
                        (0, r.jsxs)("div", {
                          className:
                            "flex items-center gap-3 border-b border-lien px-4 py-3",
                          children: [
                            r.jsx(x.Z, {
                              className:
                                "h-5 w-5 shrink-0 text-[color:var(--lien-primary)]",
                            }),
                            r.jsx("input", {
                              autoFocus: !0,
                              value: E,
                              onChange: (e) => C(e.target.value),
                              placeholder: "画面や操作を検索",
                              className:
                                "h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#a99d93]",
                            }),
                            r.jsx("button", {
                              type: "button",
                              onClick: () => y(!1),
                              className:
                                "lien-icon-button min-h-9 min-w-9 border-transparent bg-transparent shadow-none",
                              "aria-label": "閉じる",
                              children: r.jsx(u.Z, { className: "h-4 w-4" }),
                            }),
                          ],
                        }),
                        (0, r.jsxs)("div", {
                          className:
                            "grid max-h-[60vh] gap-1 overflow-y-auto p-2",
                          children: [
                            L.map((e) => {
                              let t = e.icon;
                              return (0, r.jsxs)(
                                a.default,
                                {
                                  href: e.href,
                                  onClick: () => y(!1),
                                  className:
                                    "lien-list-action flex items-center gap-3 rounded-2xl px-3 py-3 text-lien-ink",
                                  children: [
                                    r.jsx("span", {
                                      className:
                                        "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[color:var(--lien-primary)] shadow-sm",
                                      children: r.jsx(t, {
                                        className: "h-4 w-4",
                                      }),
                                    }),
                                    (0, r.jsxs)("span", {
                                      className: "min-w-0",
                                      children: [
                                        r.jsx("span", {
                                          className:
                                            "block truncate text-sm font-semibold",
                                          children: e.label,
                                        }),
                                        r.jsx("span", {
                                          className:
                                            "block truncate text-xs text-lien-muted",
                                          children: e.hint,
                                        }),
                                      ],
                                    }),
                                  ],
                                },
                                e.href,
                              );
                            }),
                            0 === L.length
                              ? r.jsx("div", {
                                  className:
                                    "p-6 text-center text-sm text-lien-muted",
                                  children: "一致する操作がありません。",
                                })
                              : null,
                          ],
                        }),
                      ],
                    }),
                  ],
                })
              : null,
          ],
        });
      }
    },
    32029: (e, t, n) => {
      "use strict";
      n.a(e, async (e, r) => {
        try {
          (n.r(t),
            n.d(t, { default: () => u, metadata: () => m, viewport: () => h }));
          var a = n(19510),
            s = n(2906),
            i = n(59219),
            l = n(13538),
            o = n(1949);
          n(5023);
          var c = e([o]);
          o = (c.then ? (await c)() : c)[0];
          let m = {
              title: "Salon de Lien",
              description:
                "美容室の顧客カルテから再来店、商品提案、ポイント、紹介までつなげるCRM",
            },
            h = {
              width: "device-width",
              initialScale: 1,
              viewportFit: "cover",
            };
          async function d() {
            try {
              let e = await (0, i.eU)();
              if (!e?.organizationId)
                return {
                  storeIconUrl: null,
                  backofficeRole: e?.role ?? null,
                  backofficeDisplayName: null,
                };
              let [t, n] = await Promise.all([
                  l._.organization.findUnique({
                    where: { id: e.organizationId },
                    select: { iconImageUrl: !0 },
                  }),
                  e.userId
                    ? l._.appUser.findUnique({
                        where: { id: e.userId },
                        select: { displayName: !0 },
                      })
                    : null,
                ]),
                r =
                  n?.displayName?.trim() ||
                  ("ADMIN" === e.role
                    ? "管理者"
                    : "STAFF" === e.role
                      ? "スタッフ"
                      : "メーカー担当者");
              return {
                storeIconUrl: t?.iconImageUrl
                  ? ((await (0, o.I_)([t.iconImageUrl]))[0] ?? null)
                  : null,
                backofficeRole: e.role,
                backofficeDisplayName: r,
              };
            } catch {
              return {
                storeIconUrl: null,
                backofficeRole: null,
                backofficeDisplayName: null,
              };
            }
          }
          async function u({ children: e }) {
            let {
              storeIconUrl: t,
              backofficeRole: n,
              backofficeDisplayName: r,
            } = await d();
            return a.jsx("html", {
              lang: "ja",
              children: a.jsx("body", {
                children: a.jsx(s.V, {
                  storeIconUrl: t,
                  backofficeRole: n,
                  backofficeDisplayName: r,
                  children: e,
                }),
              }),
            });
          }
          r();
        } catch (e) {
          r(e);
        }
      });
    },
    2906: (e, t, n) => {
      "use strict";
      n.d(t, { V: () => r });
      let r = (0, n(68570).createProxy)(
        String.raw`/app/src/components/layout/app-shell.tsx#AppShell`,
      );
    },
    85124: (e, t, n) => {
      "use strict";
      n.d(t, {
        Gy: () => l,
        aw: () => c,
        gO: () => o,
        iI: () => r,
        x_: () => i,
      });
      let r = "lien_admin_session";
      function a(e) {
        let t = "";
        for (let n of e) t += String.fromCharCode(n);
        return btoa(t)
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/g, "");
      }
      async function s(e, t) {
        let n = await crypto.subtle.importKey(
          "raw",
          new TextEncoder().encode(t),
          { name: "HMAC", hash: "SHA-256" },
          !1,
          ["sign"],
        );
        return a(
          new Uint8Array(
            await crypto.subtle.sign("HMAC", n, new TextEncoder().encode(e)),
          ),
        );
      }
      function i(e) {
        return e.trim().toLowerCase();
      }
      function l() {
        let e = Number(process.env.ADMIN_SESSION_HOURS);
        return Number.isFinite(e)
          ? Math.min(24, Math.max(1, Math.floor(e)))
          : 12;
      }
      async function o({
        email: e,
        secret: t,
        role: n = "ADMIN",
        organizationId: r = process.env.DEFAULT_ORGANIZATION_ID ??
          "org_salon_de_lien",
        manufacturerName: l = null,
        userId: o = null,
        now: c = Date.now(),
        sessionHours: d = 12,
      }) {
        var u;
        let m = Math.floor(c / 1e3),
          h =
            ((u = {
              version: 2,
              subject: i(e),
              role: n,
              organizationId: r,
              manufacturerName: l,
              userId: o,
              issuedAt: m,
              expiresAt: m + 3600 * d,
              sessionId: crypto.randomUUID(),
            }),
            a(new TextEncoder().encode(JSON.stringify(u)))),
          f = await s(h, t);
        return `${h}.${f}`;
      }
      async function c(e, t, n = Date.now()) {
        if (!e || !t || t.length < 32) return null;
        let [r, a, i] = e.split(".");
        if (
          !r ||
          !a ||
          i ||
          !(function (e, t) {
            let n = Math.max(e.length, t.length),
              r = e.length ^ t.length;
            for (let a = 0; a < n; a += 1)
              r |= (e.charCodeAt(a) || 0) ^ (t.charCodeAt(a) || 0);
            return 0 === r;
          })(a, await s(r, t))
        )
          return null;
        let l = (function (e) {
          try {
            return JSON.parse(
              new TextDecoder().decode(
                (function (e) {
                  let t = e.replace(/-/g, "+").replace(/_/g, "/"),
                    n = atob(t.padEnd(4 * Math.ceil(t.length / 4), "="));
                  return Uint8Array.from(n, (e) => e.charCodeAt(0));
                })(e),
              ),
            );
          } catch {
            return null;
          }
        })(r);
        return !l ||
          2 !== l.version ||
          !["ADMIN", "STAFF", "MANUFACTURER"].includes(l.role) ||
          !l.subject ||
          !l.sessionId ||
          l.expiresAt <= Math.floor(n / 1e3)
          ? null
          : l;
      }
    },
    59219: (e, t, n) => {
      "use strict";
      n.d(t, {
        C7: () => m,
        M_: () => l,
        Os: () => c,
        dS: () => u,
        eU: () => o,
        pI: () => h,
        zH: () => d,
      });
      var r = n(71615),
        a = n(85124),
        s = n(13538),
        i = n(99448);
      class l extends Error {
        constructor(e, t = 403) {
          (super(e), (this.status = t), (this.name = "AuthorizationError"));
        }
      }
      async function o() {
        return (0, a.aw)(
          r.cookies().get(a.iI)?.value,
          process.env.ADMIN_AUTH_SECRET,
        );
      }
      async function c(e = ["ADMIN", "STAFF"]) {
        let t = await o();
        if (!t) throw new l("ログインが必要です。", 401);
        if (!e.includes(t.role))
          throw new l("この操作を行う権限がありません。", 403);
        return t;
      }
      async function d(e, t = ["ADMIN", "STAFF"]) {
        let n = await c(t);
        if (!n.organizationId)
          throw new l("店舗所属が設定されていません。", 403);
        let r = await s._.customer.findFirst({
          where: { id: e, organizationId: n.organizationId, deletedAt: null },
          select: { id: !0, organizationId: !0 },
        });
        if (!r)
          throw new l(
            "顧客が見つからないか、この店舗から参照できません。",
            404,
          );
        return { session: n, customer: r };
      }
      async function u(e) {
        let t = await c(["ADMIN", "STAFF"]);
        if (!t.organizationId)
          throw new l("店舗所属が設定されていません。", 403);
        let n = await s._.productProposal.findFirst({
          where: {
            id: e,
            customer: { organizationId: t.organizationId, deletedAt: null },
            product: { organizationId: t.organizationId },
          },
          select: { id: !0, customerId: !0, productId: !0 },
        });
        if (!n)
          throw new l(
            "商品提案が見つからないか、この店舗から参照できません。",
            404,
          );
        return { session: t, proposal: n };
      }
      async function m(e) {
        let t = await c(["ADMIN", "STAFF", "MANUFACTURER"]);
        if ("MANUFACTURER" === t.role) {
          if (!t.manufacturerName)
            throw new l("メーカー所属が設定されていません。", 403);
          if (e && e !== t.manufacturerName)
            throw new l("他メーカーの集計は参照できません。", 403);
        }
        return t;
      }
      async function h(e, t) {
        if (t) {
          let n = await (0, i.jS)(t, { touch: !1 });
          if (!n || n.customerId !== e)
            throw new l("お客様ページの認証情報が無効です。", 403);
          return { actor: "CUSTOMER", organizationId: n.organizationId };
        }
        if ((0, i.XP)())
          return {
            actor: "CUSTOMER",
            organizationId:
              process.env.DEFAULT_ORGANIZATION_ID ?? "org_salon_de_lien",
          };
        let { session: n } = await d(e);
        return { actor: n.role, organizationId: n.organizationId };
      }
    },
    99448: (e, t, n) => {
      "use strict";
      n.d(t, { RL: () => l, XP: () => c, jS: () => o });
      var r = n(13538),
        a = n(6005);
      let s = /^[A-Za-z0-9_-]{40,80}$/;
      function i(e) {
        return (0, a.createHash)("sha256").update(e, "utf8").digest("hex");
      }
      async function l({
        customerId: e,
        organizationId: t,
        validDays: n = 90,
      }) {
        if (
          !(await r._.customer.findFirst({
            where: {
              id: e,
              deletedAt: null,
              ...(t ? { organizationId: t } : {}),
            },
            select: { id: !0 },
          }))
        )
          throw Error("顧客が見つかりません。");
        let s = (0, a.randomBytes)(32).toString("base64url"),
          l = new Date(Date.now() + 864e5 * Math.min(365, Math.max(1, n)));
        return (
          await r._.customerPortalAccess.create({
            data: { customerId: e, tokenHash: i(s), expiresAt: l },
          }),
          { token: s, expiresAt: l, urlPath: `/u/${s}` }
        );
      }
      async function o(e, { touch: t = !0 } = {}) {
        if (!s.test(e)) return null;
        let n = new Date(),
          a = await r._.customerPortalAccess.findFirst({
            where: {
              tokenHash: i(e),
              revokedAt: null,
              expiresAt: { gt: n },
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
              (!a.lastUsedAt || n.getTime() - a.lastUsedAt.getTime() > 3e5) &&
              (await r._.customerPortalAccess.update({
                where: { id: a.id },
                data: { lastUsedAt: n },
              })),
            {
              accessId: a.id,
              customerId: a.customerId,
              organizationId: a.customer.organizationId,
              expiresAt: a.expiresAt,
            })
          : null;
      }
      function c() {
        return (
          "production" !== process.env.APP_ENV &&
          "true" === process.env.ALLOW_LEGACY_CUSTOMER_ID_PORTAL
        );
      }
    },
    13538: (e, t, n) => {
      "use strict";
      n.d(t, { _: () => a });
      var r = n(53524);
      let a = globalThis.prisma ?? new r.PrismaClient({ log: ["error"] });
    },
    2427: (e, t, n) => {
      "use strict";
      n.a(e, async (e, r) => {
        try {
          n.d(t, { I_: () => x, Ox: () => f, SR: () => p, l1: () => h });
          var a = n(84770),
            s = n(67783),
            i = n(48524),
            l = n(58376),
            o = e([s]);
          s = (o.then ? (await o)() : o)[0];
          let b = ["image/jpeg", "image/png", "image/webp"],
            w = "org_salon_de_lien";
          function c(e, t) {
            return e.trim().replace(/[^A-Za-z0-9_-]/g, "") || t;
          }
          async function d(e) {
            if (e.byteLength <= 0 || e.byteLength > 5242880)
              throw Error("写真は5MB以下にしてください。");
            let t = await (0, s.default)(e, {
              failOn: "error",
              limitInputPixels: 4e7,
            }).metadata();
            if (
              !t.format ||
              !["jpeg", "png", "webp"].includes(t.format) ||
              (t.pages ?? 1) > 1
            )
              throw Error("安全な静止画像として読み込めませんでした。");
            let n = await (0, s.default)(e, {
              failOn: "error",
              limitInputPixels: 4e7,
            })
              .rotate()
              .resize({
                width: 2400,
                height: 2400,
                fit: "inside",
                withoutEnlargement: !0,
              })
              .jpeg({ quality: 90, mozjpeg: !0 })
              .toBuffer();
            return {
              body: n,
              contentType: "image/jpeg",
              contentLength: n.byteLength,
              checksumHex: (0, a.createHash)("sha256").update(n).digest("hex"),
              checksumBase64: (0, a.createHash)("sha256")
                .update(n)
                .digest("base64"),
            };
          }
          async function u(e) {
            if (!b.includes(e.type))
              throw Error("写真は JPG / PNG / WebP のみアップロードできます。");
            return d(Buffer.from(await e.arrayBuffer()));
          }
          async function m({
            normalized: e,
            organizationId: t,
            customerId: n,
            visitId: r,
            kind: s,
          }) {
            let o = (function () {
                let e = process.env.STORAGE_PROVIDER?.trim().toLowerCase();
                if ("s3" === e || (!e && process.env.S3_PRIVATE_ASSETS_BUCKET))
                  return new i.S_();
                if ("production" === process.env.APP_ENV)
                  throw Error(
                    "Production customer photo storage requires STORAGE_PROVIDER=s3",
                  );
                return new l.h();
              })(),
              d = await o.upload({
                objectKey: (function ({
                  organizationId: e = process.env.DEFAULT_ORGANIZATION_ID ?? w,
                  customerId: t,
                  visitId: n,
                  kind: r,
                }) {
                  return [
                    "private/customer-photos",
                    c(e, w),
                    c(t, "customer"),
                    c(n ?? "unassigned", "unassigned"),
                    `${c(r, "photo")}-${(0, a.randomUUID)()}.jpg`,
                  ].join("/");
                })({ organizationId: t, customerId: n, visitId: r, kind: s }),
                body: e.body,
                contentType: e.contentType,
                contentLength: e.contentLength,
                checksumSha256: e.checksumBase64,
                metadata: { "content-sha256": e.checksumHex, kind: s },
              });
            return {
              ...d,
              provider: o.name,
              readUrl: await o.getReadUrl(d.reference),
              checksumSha256: e.checksumHex,
              byteSize: e.contentLength,
            };
          }
          async function h({
            file: e,
            organizationId: t,
            customerId: n,
            visitId: r,
            kind: a,
          }) {
            let s = await u(e);
            return m({
              normalized: s,
              organizationId: t,
              customerId: n,
              visitId: r,
              kind: a,
            });
          }
          async function f(e) {
            return e ? ((0, i._f)(e) ? new i.S_().getReadUrl(e) : e) : null;
          }
          async function p(e) {
            if (!e) return;
            let t = (0, i._f)(e) ? new i.S_() : new l.h();
            await t.delete(e);
          }
          async function x(e) {
            return (await Promise.all(e.map((e) => f(e)))).filter((e) => !!e);
          }
          r();
        } catch (e) {
          r(e);
        }
      });
    },
    1949: (e, t, n) => {
      "use strict";
      n.a(e, async (e, r) => {
        try {
          n.d(t, {
            I_: () => a.I_,
            Ox: () => a.Ox,
            SR: () => a.SR,
            l1: () => a.l1,
          });
          var a = n(2427),
            s = e([a]);
          ((a = (s.then ? (await s)() : s)[0]), r());
        } catch (e) {
          r(e);
        }
      });
    },
    48524: (e, t, n) => {
      "use strict";
      n.d(t, { E9: () => d, S_: () => o, _f: () => c });
      var r = n(21841),
        a = n(51471);
      let s = "s3-private://";
      function i() {
        let e = process.env.S3_PRIVATE_ASSETS_BUCKET?.trim();
        if (!e) throw Error("S3_PRIVATE_ASSETS_BUCKET is not configured");
        return e;
      }
      function l(e) {
        if (!e.startsWith(s))
          throw Error("Invalid private S3 object reference");
        let t = e.slice(s.length);
        if (!t || t.includes(".."))
          throw Error("Invalid private S3 object key");
        return t;
      }
      class o {
        async upload(e) {
          return (
            await this.client.send(
              new r.PutObjectCommand({
                Bucket: i(),
                Key: e.objectKey,
                Body: e.body,
                ContentType: e.contentType,
                ContentLength: e.contentLength,
                ChecksumSHA256: e.checksumSha256,
                ServerSideEncryption: "AES256",
                Metadata: e.metadata,
                CacheControl: "private, max-age=0, no-store",
              }),
            ),
            { objectKey: e.objectKey, reference: `${s}${e.objectKey}` }
          );
        }
        async delete(e) {
          await this.client.send(
            new r.DeleteObjectCommand({ Bucket: i(), Key: l(e) }),
          );
        }
        async getReadUrl(e, t) {
          return (0, a.e)(
            this.client,
            new r.GetObjectCommand({ Bucket: i(), Key: l(e) }),
            {
              expiresIn: (function (e) {
                let t = Number(process.env.S3_SIGNED_URL_TTL_SECONDS ?? 300),
                  n = e ?? t;
                return Math.min(
                  900,
                  Math.max(60, Number.isFinite(n) ? Math.floor(n) : 300),
                );
              })(t),
            },
          );
        }
        constructor() {
          ((this.name = "s3"),
            (this.client = new r.S3Client({
              region: process.env.AWS_REGION ?? "ap-northeast-1",
            })));
        }
      }
      function c(e) {
        return !!e?.startsWith(s);
      }
      function d(e) {
        if (c(e)) return e;
        try {
          let t = i(),
            n = new URL(e);
          if (!n.hostname.startsWith(`${t}.s3`)) return null;
          let r = decodeURIComponent(n.pathname.replace(/^\//, ""));
          if (!r.startsWith("private/customer-photos/") || r.includes(".."))
            return null;
          return `${s}${r}`;
        } catch {
          return null;
        }
      }
    },
    58376: (e, t, n) => {
      "use strict";
      n.d(t, { h: () => a });
      var r = n(52301);
      class a {
        async upload(e) {
          let t = await (0, r.gz)(e.objectKey, e.body, {
            access: "public",
            addRandomSuffix: !1,
            contentType: e.contentType,
            token: process.env.BLOB_READ_WRITE_TOKEN,
          });
          return { objectKey: e.objectKey, reference: t.url };
        }
        async delete(e) {
          (e.startsWith("http://") || e.startsWith("https://")) &&
            (await (0, r.IV)(e, { token: process.env.BLOB_READ_WRITE_TOKEN }));
        }
        async getReadUrl(e) {
          return e;
        }
        constructor() {
          this.name = "vercel-blob";
        }
      }
    },
    5023: () => {},
  }));
