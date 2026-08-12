"use strict";
((exports.id = 6006),
  (exports.ids = [6006]),
  (exports.modules = {
    55601: (e, t, a) => {
      a.d(t, { ManufacturerProductReportFilters: () => i });
      var r = a(10326),
        n = a(17577),
        s = a(8183);
      function i({
        manufacturer: e,
        manufacturerOptions: t,
        productName: a,
        productNameOptions: i,
        category: l,
        categoryOptions: d,
        from: o,
        to: c,
      }) {
        let u = (0, n.useRef)(null),
          m = (0, n.useRef)(null),
          p = (0, n.useRef)(null);
        function x() {
          u.current?.requestSubmit();
        }
        return (0, r.jsxs)("form", {
          ref: u,
          action: "/admin/products",
          className:
            "grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_auto]",
          children: [
            r.jsx("input", {
              type: "hidden",
              name: "section",
              value: "feedback",
            }),
            (0, r.jsxs)("label", {
              className: "grid gap-1.5 text-sm font-semibold text-lien-ink",
              children: [
                "メーカー",
                r.jsx("select", {
                  name: "manufacturer",
                  defaultValue: e,
                  className: "lien-input",
                  onChange: function () {
                    (m.current && (m.current.value = ""),
                      p.current && (p.current.value = ""),
                      x());
                  },
                  children: t.map((e) =>
                    r.jsx("option", { value: e, children: e }, e),
                  ),
                }),
              ],
            }),
            (0, r.jsxs)("label", {
              className: "grid gap-1.5 text-sm font-semibold text-lien-ink",
              children: [
                "商品名",
                (0, r.jsxs)("select", {
                  ref: m,
                  name: "productName",
                  defaultValue: a,
                  className: "lien-input",
                  onChange: x,
                  children: [
                    r.jsx("option", { value: "", children: "すべての商品" }),
                    i.map((e) => r.jsx("option", { value: e, children: e }, e)),
                  ],
                }),
              ],
            }),
            (0, r.jsxs)("label", {
              className: "grid gap-1.5 text-sm font-semibold text-lien-ink",
              children: [
                "カテゴリ",
                (0, r.jsxs)("select", {
                  ref: p,
                  name: "category",
                  defaultValue: l,
                  className: "lien-input",
                  onChange: x,
                  children: [
                    r.jsx("option", {
                      value: "",
                      children: "すべてのカテゴリ",
                    }),
                    d.map((e) => r.jsx("option", { value: e, children: e }, e)),
                  ],
                }),
              ],
            }),
            (0, r.jsxs)("label", {
              className: "grid gap-1.5 text-sm font-semibold text-lien-ink",
              children: [
                "開始日",
                r.jsx("input", {
                  name: "from",
                  type: "date",
                  defaultValue: o,
                  className: "lien-input",
                  onChange: x,
                }),
              ],
            }),
            (0, r.jsxs)("label", {
              className: "grid gap-1.5 text-sm font-semibold text-lien-ink",
              children: [
                "終了日",
                r.jsx("input", {
                  name: "to",
                  type: "date",
                  defaultValue: c,
                  className: "lien-input",
                  onChange: x,
                }),
              ],
            }),
            (0, r.jsxs)("button", {
              className: "lien-button-primary mt-auto",
              children: [r.jsx(s.Z, { className: "h-4 w-4" }), "更新"],
            }),
          ],
        });
      }
    },
    57371: (e, t, a) => {
      a.d(t, { default: () => n.a });
      var r = a(670),
        n = a.n(r);
    },
    670: (e, t, a) => {
      let { createProxy: r } = a(68570);
      e.exports = r("/app/node_modules/next/dist/client/link.js");
    },
    40970: (e, t, a) => {
      (a.r(t), a.d(t, { default: () => R, dynamic: () => b }));
      var r = a(19510),
        n = a(57371),
        s = a(90682),
        i = a(94971);
      let l = (0, a(40430).Z)("plus", [
        ["path", { d: "M5 12h14", key: "1ays0h" }],
        ["path", { d: "M12 5v14", key: "s699le" }],
      ]);
      var d = a(48723),
        o = a(24874),
        c = a(68059),
        u = a(90878),
        m = a(76598);
      let p = (0, a(68570).createProxy)(
        String.raw`/app/src/components/products/ManufacturerProductReportFilters.tsx#ManufacturerProductReportFilters`,
      );
      var x = a(21488),
        f = a(75251),
        h = a(94166),
        g = a(59219);
      let b = "force-dynamic",
        v = [
          "#8F4F42",
          "#D8B56D",
          "#8AA58A",
          "#C69076",
          "#5B332C",
          "#B85D55",
          "#7C7168",
          "#E8DED2",
        ];
      function w(e) {
        if (!e) return;
        let t = new Date(e);
        return Number.isNaN(t.getTime()) ? void 0 : t;
      }
      function N(e) {
        return null === e ? "-" : e.toFixed(1);
      }
      function j(e) {
        return e.join(", ");
      }
      function y({ title: e, slices: t }) {
        let a = t.reduce((e, t) => e + t.value, 0);
        return (0, r.jsxs)("div", {
          className:
            "rounded-[24px] border border-lien bg-white p-5 shadow-lien-sm",
          children: [
            (0, r.jsxs)("div", {
              className: "flex items-center justify-between gap-3",
              children: [
                r.jsx("h3", {
                  className: "text-sm font-semibold text-lien-ink",
                  children: e,
                }),
                (0, r.jsxs)("span", {
                  className:
                    "text-xs font-semibold tabular-nums text-lien-muted",
                  children: ["合計 ", a, "人"],
                }),
              ],
            }),
            (0, r.jsxs)("div", {
              className: "mt-4 flex flex-col gap-4 sm:flex-row sm:items-center",
              children: [
                r.jsx("div", {
                  className:
                    "grid h-32 w-32 shrink-0 place-items-center rounded-full",
                  style: {
                    background: (function (e) {
                      let t = e.reduce((e, t) => e + t.value, 0);
                      if (t <= 0) return "#f6efe6";
                      let a = 0,
                        r = e
                          .filter((e) => e.value > 0)
                          .map((e) => {
                            let r = a,
                              n = a + (e.value / t) * 360;
                            return ((a = n), `${e.color} ${r}deg ${n}deg`);
                          });
                      return `conic-gradient(${r.join(", ")})`;
                    })(t),
                  },
                  "aria-hidden": "true",
                  children: r.jsx("div", {
                    className:
                      "h-16 w-16 rounded-full border border-lien bg-white shadow-sm",
                  }),
                }),
                r.jsx("div", {
                  className: "grid flex-1 gap-2",
                  children: t.map((e) => {
                    var t;
                    return (0, r.jsxs)(
                      "div",
                      {
                        className:
                          "flex items-center justify-between gap-3 text-sm",
                        children: [
                          (0, r.jsxs)("span", {
                            className:
                              "flex min-w-0 items-center gap-2 text-lien-muted",
                            children: [
                              r.jsx("span", {
                                className: "h-3 w-3 shrink-0 rounded-full",
                                style: { backgroundColor: e.color },
                              }),
                              r.jsx("span", {
                                className: "truncate",
                                children: e.label,
                              }),
                            ],
                          }),
                          (0, r.jsxs)("span", {
                            className:
                              "shrink-0 font-semibold tabular-nums text-lien-ink",
                            children: [
                              e.value,
                              "人 / ",
                              ((t = e.value),
                              a <= 0 ? 0 : Math.round((t / a) * 100)),
                              "%",
                            ],
                          }),
                        ],
                      },
                      e.label,
                    );
                  }),
                }),
              ],
            }),
          ],
        });
      }
      function k({ rating: e }) {
        let t = "number" == typeof e ? Math.max(0, Math.min(5, e)) : 0;
        return r.jsx("span", {
          className: "inline-flex items-center gap-0.5",
          "aria-label": `星${t}`,
          children: Array.from({ length: 5 }).map((e, a) =>
            r.jsx(
              s.Z,
              {
                className: `h-4 w-4 ${a < t ? "fill-[#D8B56D] text-[#D8B56D]" : "fill-transparent text-[#d8cec3]"}`,
              },
              a,
            ),
          ),
        });
      }
      function A({ review: e, returnTo: t, canEdit: a }) {
        let s = e.reviewerName.trim().slice(0, 1) || "L",
          l = e.reviewerHref
            ? r.jsx(n.default, {
                href: e.reviewerHref,
                className:
                  "font-semibold text-lien-ink transition hover:text-[#8F4F42] hover:underline",
                children: e.reviewerName,
              })
            : r.jsx("span", {
                className: "font-semibold text-lien-ink",
                children: e.reviewerName,
              });
        return r.jsx("div", {
          className:
            "rounded-[22px] border border-lien bg-white p-4 shadow-[0_10px_28px_rgba(47,42,37,0.05)]",
          children: (0, r.jsxs)("div", {
            className: "flex items-start gap-3",
            children: [
              r.jsx("div", {
                className:
                  "grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#F6EFE6] text-sm font-semibold text-[#8F4F42]",
                children: s,
              }),
              (0, r.jsxs)("div", {
                className: "min-w-0 flex-1",
                children: [
                  (0, r.jsxs)("div", {
                    className:
                      "flex flex-wrap items-center justify-between gap-2",
                    children: [
                      (0, r.jsxs)("div", {
                        children: [
                          r.jsx("p", { children: l }),
                          (0, r.jsxs)("p", {
                            className: "mt-0.5 text-xs text-lien-muted",
                            children: [
                              e.reviewerAgeGroup,
                              " / ",
                              e.reviewerGender,
                            ],
                          }),
                        ],
                      }),
                      r.jsx("span", {
                        className: "text-xs tabular-nums text-lien-muted",
                        children: (function (e) {
                          let t = new Date(e);
                          return Number.isNaN(t.getTime())
                            ? ""
                            : new Intl.DateTimeFormat("ja-JP", {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                              }).format(t);
                        })(e.submittedAt),
                      }),
                    ],
                  }),
                  (0, r.jsxs)("div", {
                    className: "mt-2 flex flex-wrap items-center gap-2",
                    children: [
                      r.jsx(k, { rating: e.rating }),
                      (0, r.jsxs)("span", {
                        className:
                          "text-sm font-semibold tabular-nums text-lien-ink",
                        children: [e.rating ?? "-", " / 5"],
                      }),
                    ],
                  }),
                  e.comment
                    ? r.jsx("p", {
                        className:
                          "mt-3 whitespace-pre-wrap text-sm leading-7 text-[#4f463f]",
                        children: e.comment,
                      })
                    : r.jsx("p", {
                        className: "mt-3 text-sm text-lien-muted",
                        children: "コメントなし",
                      }),
                  (0, r.jsxs)("div", {
                    className: "mt-3 flex flex-wrap gap-2",
                    children: [
                      e.goodPoints
                        .slice(0, 4)
                        .map((e) =>
                          (0, r.jsxs)(
                            "span",
                            {
                              className:
                                "rounded-full bg-[#eef5ed] px-3 py-1 text-xs font-semibold text-[#5f7c5f]",
                              children: ["良かった: ", e],
                            },
                            `good-${e}`,
                          ),
                        ),
                      e.badPoints
                        .slice(0, 4)
                        .map((e) =>
                          (0, r.jsxs)(
                            "span",
                            {
                              className:
                                "rounded-full bg-[#fbefec] px-3 py-1 text-xs font-semibold text-[#9b554d]",
                              children: ["気になる: ", e],
                            },
                            `bad-${e}`,
                          ),
                        ),
                    ],
                  }),
                  a
                    ? (0, r.jsxs)("details", {
                        className:
                          "mt-4 rounded-[18px] border border-lien bg-[#fffdf9] p-3",
                        children: [
                          r.jsx("summary", {
                            className:
                              "cursor-pointer text-xs font-semibold text-[#8F4F42]",
                            children: "レビューを編集",
                          }),
                          (0, r.jsxs)("form", {
                            action: h.updateManufacturerReviewAction,
                            className: "mt-3 grid gap-3",
                            children: [
                              r.jsx("input", {
                                type: "hidden",
                                name: "reviewId",
                                value: e.reviewId,
                              }),
                              r.jsx("input", {
                                type: "hidden",
                                name: "returnTo",
                                value: t,
                              }),
                              (0, r.jsxs)("div", {
                                className: "grid gap-3 sm:grid-cols-2",
                                children: [
                                  (0, r.jsxs)("label", {
                                    className:
                                      "grid gap-1.5 text-xs font-semibold text-lien-ink",
                                    children: [
                                      "星評価",
                                      r.jsx("select", {
                                        name: "rating",
                                        defaultValue: e.rating ?? 5,
                                        className: "lien-input",
                                        children: [5, 4, 3, 2, 1].map((e) =>
                                          r.jsx(
                                            "option",
                                            { value: e, children: e },
                                            e,
                                          ),
                                        ),
                                      }),
                                    ],
                                  }),
                                  (0, r.jsxs)("label", {
                                    className:
                                      "grid gap-1.5 text-xs font-semibold text-lien-ink",
                                    children: [
                                      "投稿日",
                                      r.jsx("input", {
                                        name: "submittedAt",
                                        type: "date",
                                        defaultValue: (function (e) {
                                          let t = new Date(e);
                                          return Number.isNaN(t.getTime())
                                            ? ""
                                            : t.toISOString().slice(0, 10);
                                        })(e.submittedAt),
                                        className: "lien-input",
                                      }),
                                    ],
                                  }),
                                ],
                              }),
                              (0, r.jsxs)("label", {
                                className:
                                  "grid gap-1.5 text-xs font-semibold text-lien-ink",
                                children: [
                                  "コメント",
                                  r.jsx("textarea", {
                                    name: "comment",
                                    defaultValue: e.comment,
                                    rows: 4,
                                    className:
                                      "lien-input min-h-28 rounded-[18px]",
                                  }),
                                ],
                              }),
                              (0, r.jsxs)("div", {
                                className: "grid gap-3 sm:grid-cols-2",
                                children: [
                                  (0, r.jsxs)("label", {
                                    className:
                                      "grid gap-1.5 text-xs font-semibold text-lien-ink",
                                    children: [
                                      "良かった点",
                                      r.jsx("input", {
                                        name: "goodPoints",
                                        defaultValue: j(e.goodPoints),
                                        className: "lien-input",
                                      }),
                                    ],
                                  }),
                                  (0, r.jsxs)("label", {
                                    className:
                                      "grid gap-1.5 text-xs font-semibold text-lien-ink",
                                    children: [
                                      "気になった点",
                                      r.jsx("input", {
                                        name: "badPoints",
                                        defaultValue: j(e.badPoints),
                                        className: "lien-input",
                                      }),
                                    ],
                                  }),
                                ],
                              }),
                              (0, r.jsxs)("button", {
                                type: "submit",
                                className: "lien-button-secondary w-fit",
                                children: [
                                  r.jsx(i.Z, { className: "h-4 w-4" }),
                                  "保存",
                                ],
                              }),
                            ],
                          }),
                        ],
                      })
                    : null,
                ],
              }),
            ],
          }),
        });
      }
      function M({ productId: e, customers: t, returnTo: a }) {
        let n = new Date().toISOString().slice(0, 10);
        return (0, r.jsxs)("details", {
          className: "rounded-[20px] border border-lien bg-[#fffdf9] p-4",
          children: [
            r.jsx("summary", {
              className: "cursor-pointer text-sm font-semibold text-[#8F4F42]",
              children: "レビューを新規追加",
            }),
            (0, r.jsxs)("form", {
              action: h.createManufacturerReviewAction,
              className: "mt-3 grid gap-3",
              children: [
                r.jsx("input", { type: "hidden", name: "productId", value: e }),
                r.jsx("input", { type: "hidden", name: "returnTo", value: a }),
                (0, r.jsxs)("div", {
                  className: "grid gap-3 md:grid-cols-3",
                  children: [
                    (0, r.jsxs)("label", {
                      className:
                        "grid gap-1.5 text-xs font-semibold text-lien-ink",
                      children: [
                        "顧客",
                        (0, r.jsxs)("select", {
                          name: "customerId",
                          className: "lien-input",
                          required: !0,
                          children: [
                            r.jsx("option", {
                              value: "",
                              children: "顧客を選択",
                            }),
                            t.map((e) =>
                              r.jsx(
                                "option",
                                { value: e.id, children: e.name },
                                e.id,
                              ),
                            ),
                          ],
                        }),
                      ],
                    }),
                    (0, r.jsxs)("label", {
                      className:
                        "grid gap-1.5 text-xs font-semibold text-lien-ink",
                      children: [
                        "星評価",
                        r.jsx("select", {
                          name: "rating",
                          defaultValue: "5",
                          className: "lien-input",
                          children: [5, 4, 3, 2, 1].map((e) =>
                            r.jsx("option", { value: e, children: e }, e),
                          ),
                        }),
                      ],
                    }),
                    (0, r.jsxs)("label", {
                      className:
                        "grid gap-1.5 text-xs font-semibold text-lien-ink",
                      children: [
                        "投稿日",
                        r.jsx("input", {
                          name: "submittedAt",
                          type: "date",
                          defaultValue: n,
                          className: "lien-input",
                        }),
                      ],
                    }),
                  ],
                }),
                (0, r.jsxs)("label", {
                  className: "grid gap-1.5 text-xs font-semibold text-lien-ink",
                  children: [
                    "コメント",
                    r.jsx("textarea", {
                      name: "comment",
                      rows: 4,
                      className: "lien-input min-h-28 rounded-[18px]",
                      placeholder: "口コミコメントを入力",
                      required: !0,
                    }),
                  ],
                }),
                (0, r.jsxs)("div", {
                  className: "grid gap-3 md:grid-cols-3",
                  children: [
                    (0, r.jsxs)("label", {
                      className:
                        "grid gap-1.5 text-xs font-semibold text-lien-ink",
                      children: [
                        "良かった点",
                        r.jsx("input", {
                          name: "goodPoints",
                          className: "lien-input",
                          placeholder: "手触り, 香り, まとまり",
                        }),
                      ],
                    }),
                    (0, r.jsxs)("label", {
                      className:
                        "grid gap-1.5 text-xs font-semibold text-lien-ink",
                      children: [
                        "気になった点",
                        r.jsx("input", {
                          name: "badPoints",
                          className: "lien-input",
                          placeholder: "価格, 香り",
                        }),
                      ],
                    }),
                    (0, r.jsxs)("label", {
                      className:
                        "grid gap-1.5 text-xs font-semibold text-lien-ink",
                      children: [
                        "リピート意向",
                        (0, r.jsxs)("select", {
                          name: "repeatIntent",
                          defaultValue: "yes",
                          className: "lien-input",
                          children: [
                            r.jsx("option", { value: "yes", children: "はい" }),
                            r.jsx("option", {
                              value: "maybe",
                              children: "迷う",
                            }),
                            r.jsx("option", {
                              value: "no",
                              children: "いいえ",
                            }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
                (0, r.jsxs)("button", {
                  type: "submit",
                  className: "lien-button-primary w-fit",
                  children: [
                    r.jsx(l, { className: "h-4 w-4" }),
                    "レビューを追加",
                  ],
                }),
              ],
            }),
          ],
        });
      }
      async function P({ searchParams: e }) {
        var t;
        let a = await (0, g.C7)(e?.manufacturer ?? null),
          i = "MANUFACTURER" !== a.role,
          l =
            "MANUFACTURER" === a.role
              ? (a.manufacturerName ?? "")
              : e?.manufacturer || "ミルボン",
          h = e?.productName ?? "",
          b = e?.category ?? "",
          [j, P, R, I] = await Promise.all([
            (0, f.OT)(a.organizationId),
            (0, f.i4)(l, a.organizationId),
            (0, f.N8)(l, a.organizationId),
            i
              ? (0, f.eR)(l, a.organizationId)
              : Promise.resolve({ products: [], customers: [] }),
          ]),
          _ = (function ({
            manufacturer: e,
            productName: t,
            category: a,
            from: r,
            to: n,
          }) {
            let s = new URLSearchParams();
            (e && s.set("manufacturer", e),
              t && s.set("productName", t),
              a && s.set("category", a),
              r && s.set("from", r),
              n && s.set("to", n),
              s.set("section", "feedback"));
            let i = s.toString();
            return `/admin/products?${i}`;
          })({
            manufacturer: l,
            productName: h,
            category: b,
            from: e?.from,
            to: e?.to,
          }),
          C =
            "product-created" === (t = e?.notice)
              ? "商品を追加しました。"
              : "review-created" === t
                ? "レビューを追加しました。"
                : "product-updated" === t
                  ? "商品情報を保存しました。"
                  : "review-updated" === t
                    ? "レビューを保存しました。"
                    : "product-deleted" === t
                      ? "商品を削除しました。"
                      : null,
          S = j.includes(l) ? j : [l, ...j],
          F = b && !R.includes(b) ? [b, ...R] : R,
          B = await (0, f.n$)({
            manufacturer: l,
            organizationId: a.organizationId,
            productName: h,
            category: b,
            from: w(e?.from),
            to: w(e?.to),
            includeCustomerLinks: "MANUFACTURER" !== a.role,
          }),
          D = B.products.flatMap((e) =>
            e.reviews.map((e) => e.rating).filter((e) => "number" == typeof e),
          ),
          E = B.products.reduce((e, t) => e + t.reviewCount, 0),
          $ =
            0 === D.length
              ? null
              : Math.round((D.reduce((e, t) => e + t, 0) / D.length) * 10) / 10;
        return (0, r.jsxs)("div", {
          className: "mx-auto grid max-w-7xl gap-6",
          children: [
            r.jsx(x.i, { active: "feedback" }),
            r.jsx(u.mr, {
              eyebrow: (0, r.jsxs)("span", {
                className: "inline-flex items-center gap-2",
                children: [
                  r.jsx(s.Z, { className: "h-4 w-4" }),
                  "Product Reviews",
                ],
              }),
              title: "メーカー向け商品レビュー",
              description:
                "顧客台帳に紐づいた実レビューを、商品ごとに確認します。表示するのは氏名・年代・性別・星評価・コメントのみで、電話番号や顧客IDは表示しません。",
              visual: r.jsx(m.n8, {
                variant: "insights",
                className: "h-full min-h-40",
                imageClassName: "object-[76%_54%]",
                sizes: "(max-width: 1023px) 100vw, 352px",
              }),
            }),
            C
              ? (0, r.jsxs)("div", {
                  className:
                    "fixed right-4 top-4 z-50 max-w-sm rounded-[22px] border border-[#cbdcc8] bg-white p-4 shadow-lien",
                  children: [
                    r.jsx("p", {
                      className: "text-sm font-semibold text-lien-ink",
                      children: C,
                    }),
                    r.jsx("p", {
                      className: "mt-1 text-xs leading-5 text-lien-muted",
                      children: "変更内容を保存し、画面を更新しました。",
                    }),
                    r.jsx(n.default, {
                      href: _,
                      className:
                        "mt-3 inline-flex text-xs font-semibold text-[#8F4F42]",
                      children: "閉じる",
                    }),
                  ],
                })
              : null,
            r.jsx(u.IP, {
              as: "div",
              className: "p-4",
              children: r.jsx(p, {
                manufacturer: l,
                manufacturerOptions: S,
                productName: h,
                productNameOptions: P,
                category: b,
                categoryOptions: F,
                from: e?.from ?? "",
                to: e?.to ?? "",
              }),
            }),
            (0, r.jsxs)("section", {
              className: "grid gap-3 md:grid-cols-4",
              children: [
                r.jsx(u.i9, {
                  icon: d.Z,
                  label: "回答者数",
                  value: B.respondentCount,
                  unit: "人",
                  tone: "soft",
                }),
                r.jsx(u.i9, {
                  icon: s.Z,
                  label: "平均レビュー点数",
                  value: N($),
                  unit: "/ 5.0",
                  tone: "premium",
                }),
                r.jsx(u.i9, {
                  icon: o.Z,
                  label: "レビュー回答数",
                  value: E,
                  unit: "件",
                  tone: "highlight",
                }),
                r.jsx(u.i9, {
                  icon: c.Z,
                  label: "対象商品",
                  value: B.products.length,
                  unit: "件",
                  tone: "success",
                }),
              ],
            }),
            r.jsx(y, {
              title: "回答者の年齢層",
              slices: B.ageGroupBreakdown.map((e, t) => ({
                label: e.label,
                value: e.count,
                color: v[t % v.length],
              })),
            }),
            r.jsx("section", {
              className: "grid gap-5",
              children: B.products.map((e) =>
                (0, r.jsxs)(
                  "article",
                  {
                    className:
                      "rounded-[28px] border border-lien bg-lien-surface p-5 shadow-lien-sm",
                    children: [
                      (0, r.jsxs)("div", {
                        className:
                          "flex flex-col gap-4 md:flex-row md:items-start md:justify-between",
                        children: [
                          (0, r.jsxs)("div", {
                            children: [
                              r.jsx("p", {
                                className:
                                  "text-xs font-semibold text-lien-muted",
                                children: e.category ?? "カテゴリ未設定",
                              }),
                              r.jsx("h2", {
                                className:
                                  "mt-1 text-xl font-semibold text-lien-ink",
                                children: e.productName,
                              }),
                            ],
                          }),
                          r.jsx(u.OE, {
                            tone: "success",
                            children: "顧客レビュー",
                          }),
                        ],
                      }),
                      i
                        ? r.jsx("div", {
                            className: "mt-4 grid gap-3",
                            children: r.jsx(M, {
                              productId: e.productId,
                              customers: I.customers,
                              returnTo: _,
                            }),
                          })
                        : null,
                      (0, r.jsxs)("div", {
                        className: "mt-4 grid gap-3 sm:grid-cols-2",
                        children: [
                          (0, r.jsxs)("div", {
                            className:
                              "rounded-[22px] border border-lien bg-lien-soft p-4",
                            children: [
                              r.jsx("p", {
                                className:
                                  "text-xs font-semibold text-lien-muted",
                                children: "平均レビュー点数",
                              }),
                              (0, r.jsxs)("div", {
                                className:
                                  "mt-2 flex flex-wrap items-center gap-3",
                                children: [
                                  r.jsx("span", {
                                    className:
                                      "text-3xl font-semibold tabular-nums text-lien-ink",
                                    children: N(e.averageRating),
                                  }),
                                  r.jsx(k, {
                                    rating:
                                      null === e.averageRating
                                        ? null
                                        : Math.round(e.averageRating),
                                  }),
                                ],
                              }),
                            ],
                          }),
                          (0, r.jsxs)("div", {
                            className:
                              "rounded-[22px] border border-lien bg-lien-soft p-4",
                            children: [
                              r.jsx("p", {
                                className:
                                  "text-xs font-semibold text-lien-muted",
                                children: "回答数",
                              }),
                              (0, r.jsxs)("p", {
                                className:
                                  "mt-2 text-3xl font-semibold tabular-nums text-lien-ink",
                                children: [
                                  e.reviewCount,
                                  r.jsx("span", {
                                    className: "ml-1 text-base",
                                    children: "件",
                                  }),
                                ],
                              }),
                            ],
                          }),
                        ],
                      }),
                      r.jsx("div", {
                        className: "mt-5 grid gap-3",
                        children:
                          e.reviews.length > 0
                            ? e.reviews.map((e) =>
                                r.jsx(
                                  A,
                                  { review: e, returnTo: _, canEdit: i },
                                  e.reviewId,
                                ),
                              )
                            : r.jsx("div", {
                                className:
                                  "rounded-[22px] border border-dashed border-lien bg-white p-5 text-sm text-lien-muted",
                                children: "まだレビューはありません。",
                              }),
                      }),
                    ],
                  },
                  e.productId,
                ),
              ),
            }),
          ],
        });
      }
      async function R({ searchParams: e }) {
        return P({ searchParams: e });
      }
    },
    76598: (e, t, a) => {
      a.d(t, { lW: () => i, n8: () => d, xt: () => o });
      var r = a(19510),
        n = a(17710);
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
      function d({
        variant: e,
        className: t = "",
        imageClassName: a = "",
        sizes: i = "(max-width: 768px) 100vw, 420px",
        priority: d = !1,
        children: o,
        overlay: c = "soft",
      }) {
        let u = s[e];
        return (0, r.jsxs)("figure", {
          className: l("relative isolate overflow-hidden bg-[#efe5da]", t),
          children: [
            r.jsx(n.default, {
              src: u.src,
              alt: u.alt,
              fill: !0,
              priority: d,
              sizes: i,
              className: l("object-cover", a),
            }),
            "none" !== c
              ? r.jsx("span", {
                  "aria-hidden": "true",
                  className: l(
                    "pointer-events-none absolute inset-0",
                    "strong" === c
                      ? "bg-gradient-to-t from-[#2f2a25]/65 via-[#2f2a25]/10 to-transparent"
                      : "bg-gradient-to-t from-[#2f2a25]/24 via-transparent to-white/5",
                  ),
                })
              : null,
            o
              ? r.jsx("div", { className: "relative z-10 h-full", children: o })
              : null,
          ],
        });
      }
      function o({
        variant: e,
        eyebrow: t,
        title: a,
        description: n,
        badge: s,
        imageClassName: i = "",
      }) {
        return (0, r.jsxs)("header", {
          className: "grid gap-3",
          children: [
            r.jsx(d, {
              variant: e,
              className:
                "h-36 rounded-[22px] border border-[#e8ded2] shadow-sm md:h-48 lg:h-52",
              imageClassName: i,
              sizes: "(max-width: 767px) 100vw, 960px",
              overlay: "strong",
              children: (0, r.jsxs)("div", {
                className:
                  "flex h-full items-end justify-between gap-3 p-4 md:p-6",
                children: [
                  (0, r.jsxs)("div", {
                    className: "min-w-0 text-white",
                    children: [
                      r.jsx("p", {
                        className: "text-xs font-semibold text-white/80",
                        children: t,
                      }),
                      r.jsx("h1", {
                        className:
                          "mt-1 text-2xl font-semibold tracking-normal drop-shadow-sm md:text-3xl",
                        children: a,
                      }),
                    ],
                  }),
                  s
                    ? r.jsx("div", { className: "shrink-0", children: s })
                    : null,
                ],
              }),
            }),
            n
              ? r.jsx("p", {
                  className:
                    "text-sm leading-6 text-[#7c7168] md:text-base md:leading-7",
                  children: n,
                })
              : null,
          ],
        });
      }
    },
    90878: (e, t, a) => {
      a.d(t, {
        IP: () => d,
        OE: () => c,
        i9: () => o,
        mr: () => l,
        ub: () => u,
      });
      var r = a(19510);
      function n(...e) {
        return e.filter(Boolean).join(" ");
      }
      let s = {
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
        description: a,
        primaryAction: s,
        secondaryAction: i,
        breadcrumb: l,
        visual: d,
        children: o,
      }) {
        return (0, r.jsxs)("header", {
          className:
            "lien-glass overflow-hidden rounded-[28px] border p-5 sm:p-6",
          children: [
            (0, r.jsxs)("div", {
              className: n(
                "grid gap-5",
                !!d && "lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]",
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
                        a
                          ? r.jsx("p", {
                              className:
                                "mt-2 max-w-3xl text-sm leading-6 text-[color:var(--lien-muted)]",
                              children: a,
                            })
                          : null,
                      ],
                    }),
                    s || i
                      ? (0, r.jsxs)("div", {
                          className:
                            "flex w-full shrink-0 flex-wrap gap-2 sm:w-auto [&>*]:min-h-11 [&>*]:flex-1 sm:[&>*]:flex-none",
                          children: [i, s],
                        })
                      : null,
                  ],
                }),
                d
                  ? r.jsx("div", {
                      className:
                        "min-h-36 overflow-hidden rounded-[20px] border border-white/70 shadow-sm lg:min-h-40",
                      children: d,
                    })
                  : null,
              ],
            }),
            o ? r.jsx("div", { className: "mt-5", children: o }) : null,
          ],
        });
      }
      function d({
        children: e,
        className: t = "",
        tone: a = "default",
        hoverable: i = !1,
        as: l = "section",
      }) {
        return r.jsx(l, {
          className: n(
            "min-w-0 rounded-[22px] border p-5 shadow-lien-sm transition sm:p-6",
            s[a],
            i && "lien-hover-lift",
            t,
          ),
          children: e,
        });
      }
      function o({
        label: e,
        value: t,
        unit: a,
        delta: n,
        helper: s,
        icon: i,
        tone: l = "default",
      }) {
        return (0, r.jsxs)(d, {
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
                        a
                          ? r.jsx("span", {
                              className:
                                "text-xs font-semibold text-[color:var(--lien-muted)]",
                              children: a,
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
            s
              ? r.jsx("p", {
                  className:
                    "mt-2 text-xs leading-5 text-[color:var(--lien-muted)]",
                  children: s,
                })
              : null,
          ],
        });
      }
      function c({
        children: e,
        tone: t = "default",
        icon: a,
        className: s = "",
      }) {
        return (0, r.jsxs)("span", {
          className: n("lien-badge", i[t], s),
          children: [a ? r.jsx(a, { className: "h-3.5 w-3.5" }) : null, e],
        });
      }
      function u({ icon: e, title: t, description: a, action: n }) {
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
              className: "relative mx-auto flex max-w-md flex-col items-center",
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
                a
                  ? r.jsx("p", {
                      className:
                        "mt-2 text-sm leading-6 text-[color:var(--lien-muted)]",
                      children: a,
                    })
                  : null,
                n ? r.jsx("div", { className: "mt-4", children: n }) : null,
              ],
            }),
          ],
        });
      }
    },
    21488: (e, t, a) => {
      a.d(t, { i: () => l });
      var r = a(19510),
        n = a(57371);
      let s = (0, a(40430).Z)("package-search", [
        ["path", { d: "M12 22V12", key: "d0xqtd" }],
        ["path", { d: "M20.27 18.27 22 20", key: "er2am" }],
        [
          "path",
          {
            d: "M21 10.498V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.729l7 4a2 2 0 0 0 2 .001l.98-.559",
            key: "tok1h1",
          },
        ],
        ["path", { d: "M3.29 7 12 12l8.71-5", key: "19ckod" }],
        ["path", { d: "m7.5 4.27 8.997 5.148", key: "9yrvtv" }],
        ["circle", { cx: "18.5", cy: "16.5", r: "2.5", key: "ke13xx" }],
      ]);
      var i = a(38676);
      function l({ active: e }) {
        let t = [
          {
            key: "menu",
            href: "/admin/products?section=menus",
            label: "メニュー",
            icon: s,
          },
          { key: "catalog", href: "/admin/products", label: "商品棚", icon: s },
          {
            key: "feedback",
            href: "/admin/products?section=feedback",
            label: "集計",
            icon: i.Z,
          },
        ];
        return r.jsx("nav", {
          className:
            "grid w-full grid-cols-3 gap-1 rounded-[18px] border border-lien bg-white p-1 shadow-lien-sm",
          "aria-label": "商品ページ切替",
          children: t.map((t) => {
            let a = t.icon,
              s = e === t.key;
            return (0, r.jsxs)(
              n.default,
              {
                href: t.href,
                "aria-current": s ? "page" : void 0,
                className: `lien-segment inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-[14px] px-2 text-[13px] font-semibold transition sm:gap-2 sm:px-4 sm:text-sm ${s ? "bg-[color:var(--lien-primary)] text-white shadow-sm" : "text-lien-muted hover:bg-lien-soft hover:text-lien-ink"}`,
                children: [
                  r.jsx(a, { className: "h-4 w-4 shrink-0" }),
                  t.label,
                ],
              },
              t.key,
            );
          }),
        });
      }
    },
    94166: (e, t, a) => {
      (a.r(t),
        a.d(t, {
          createManufacturerReviewAction: () => j,
          updateManufacturerReviewAction: () => y,
        }));
      var r = a(24330);
      a(60166);
      var n = a(84770),
        s = a(57708),
        i = a(58585),
        l = a(13538),
        d = a(92938),
        o = a(59219),
        c = a(40618);
      let u = "/admin/products?section=feedback";
      async function m() {
        let e = await (0, o.Os)(["ADMIN", "STAFF"]);
        if (!e.organizationId)
          throw new o.M_("店舗所属が設定されていません。", 403);
        return e.organizationId;
      }
      function p(e, t) {
        let a = (0, d.Bx)(e.get(t));
        if (!a) throw Error(`${t} is required.`);
        return a;
      }
      function x(e, t) {
        return (0, d.Bx)(e.get(t)) ?? void 0;
      }
      function f(e) {
        let t = Number(e.get("rating"));
        if (!Number.isInteger(t) || t < 1 || t > 5)
          throw Error("rating must be an integer between 1 and 5.");
        return t;
      }
      function h(e) {
        let t = (0, d.Bx)(e.get("submittedAt")),
          a = t ? new Date(`${t}T12:00:00.000+09:00`) : new Date();
        if (Number.isNaN(a.getTime())) throw Error("submittedAt is invalid.");
        return a;
      }
      function g(e, t) {
        return (0, d.c0)(e.get(t)).slice(0, 8);
      }
      function b(e) {
        return e.replace(/\s+/g, " ").trim();
      }
      async function v({
        organizationId: e,
        manufacturerName: t,
        freeComment: a,
        excludeReviewId: r,
      }) {
        let n = b(a);
        if (
          (
            await l._.productReview.findMany({
              where: {
                ...(r ? { id: { not: r } } : {}),
                productProposal: {
                  product: {
                    organizationId: e,
                    manufacturerName: t,
                    active: !0,
                  },
                },
              },
              select: { freeComment: !0 },
            })
          ).some((e) => b(e.freeComment ?? "") === n)
        )
          throw Error(
            "同じ口コミ本文が既に存在します。内容を少し変えて保存してください。",
          );
      }
      function w() {
        ((0, s.revalidatePath)(u),
          (0, s.revalidatePath)("/admin/reports/manufacturer-products"),
          (0, s.revalidatePath)("/admin/reports/product-feedback"),
          (0, s.revalidatePath)("/api/reports/manufacturer-products"),
          (0, s.revalidatePath)("/api/admin/reports/manufacturer-products"));
      }
      function N(e, t) {
        let a = new URL(
            (0, d.Bx)(e.get("returnTo")) ?? u,
            "http://salon.local",
          ),
          r =
            "/admin/products" === a.pathname &&
            "feedback" === a.searchParams.get("section")
              ? a
              : new URL(u, "http://salon.local");
        (r.searchParams.set("notice", t),
          (0, i.redirect)(`${r.pathname}${r.search}`));
      }
      async function j(e) {
        let t = await m(),
          a = p(e, "productId"),
          r = p(e, "customerId"),
          s = f(e),
          i = h(e),
          d = p(e, "comment"),
          o = g(e, "goodPoints"),
          c = g(e, "badPoints"),
          u =
            x(e, "repeatIntent") ?? (s >= 4 ? "yes" : 3 === s ? "maybe" : "no"),
          [b, j] = await Promise.all([
            l._.product.findFirst({
              where: { id: a, organizationId: t, active: !0 },
              select: { id: !0, name: !0, manufacturerName: !0 },
            }),
            l._.customer.findFirst({
              where: { id: r, organizationId: t, deletedAt: null },
              select: { id: !0 },
            }),
          ]);
        if (!b) throw Error("Product was not found.");
        if (!j) throw Error("Customer was not found.");
        (await v({
          organizationId: t,
          manufacturerName: b.manufacturerName,
          freeComment: d,
        }),
          await l._.$transaction(async (e) => {
            let t = await e.productProposal.create({
                data: {
                  customerId: r,
                  productId: a,
                  proposalReason: `${b.name}の手動レビュー登録`,
                  concernTags: [],
                  status: "purchased",
                  reaction: "purchased",
                  purchased: !0,
                  note: "MANUAL_MANUFACTURER_REVIEW",
                  createdAt: i,
                  updatedAt: i,
                },
                select: { id: !0 },
              }),
              l = await e.productReviewRequest.create({
                data: {
                  productProposalId: t.id,
                  tokenHash: (0, n.createHash)("sha256")
                    .update(
                      `manual-review:${(0, n.randomBytes)(32).toString("hex")}`,
                    )
                    .digest("hex"),
                  expiresAt: i,
                  requestedAt: i,
                  answeredAt: i,
                  status: "answered",
                  createdAt: i,
                  updatedAt: i,
                },
                select: { id: !0 },
              });
            await e.productReview.create({
              data: {
                productProposalId: t.id,
                reviewRequestId: l.id,
                usedStatus: "used",
                rating: s,
                goodPoints: o,
                badPoints: c,
                repeatIntent: u,
                freeComment: d,
                allowAnonymousShare: !0,
                allowAnonymousQuote: !0,
                submittedAt: i,
                createdAt: i,
                updatedAt: i,
              },
            });
          }),
          w(),
          N(e, "review-created"));
      }
      async function y(e) {
        let t = await m(),
          a = p(e, "reviewId"),
          r = f(e),
          n = h(e),
          s = p(e, "comment"),
          i = g(e, "goodPoints"),
          d = g(e, "badPoints"),
          o =
            x(e, "repeatIntent") ?? (r >= 4 ? "yes" : 3 === r ? "maybe" : "no"),
          c = await l._.productReview.findFirst({
            where: {
              id: a,
              productProposal: {
                customer: { organizationId: t, deletedAt: null },
                product: { organizationId: t },
              },
            },
            select: {
              id: !0,
              reviewRequestId: !0,
              productProposalId: !0,
              productProposal: {
                select: { product: { select: { manufacturerName: !0 } } },
              },
            },
          });
        if (!c) throw Error("Review was not found.");
        (await v({
          organizationId: t,
          manufacturerName: c.productProposal.product.manufacturerName,
          freeComment: s,
          excludeReviewId: c.id,
        }),
          await l._.$transaction([
            l._.productReview.update({
              where: { id: c.id },
              data: {
                rating: r,
                submittedAt: n,
                freeComment: s,
                goodPoints: i,
                badPoints: d,
                repeatIntent: o,
                usedStatus: "used",
                updatedAt: new Date(),
              },
            }),
            l._.productReviewRequest.update({
              where: { id: c.reviewRequestId },
              data: {
                answeredAt: n,
                status: "answered",
                updatedAt: new Date(),
              },
            }),
            l._.productProposal.update({
              where: { id: c.productProposalId },
              data: {
                status: "purchased",
                reaction: "purchased",
                purchased: !0,
                updatedAt: new Date(),
              },
            }),
          ]),
          w(),
          N(e, "review-updated"));
      }
      ((0, c.h)([j, y]),
        (0, r.j)("c0dce2eb2979e674987bc45fb14a00b5c13fcd4f", j),
        (0, r.j)("7ea163e51d49f91e6daec6aa9cea5b4ff30bb2da", y));
    },
    75251: (e, t, a) => {
      a.d(t, {
        N8: () => u,
        OT: () => c,
        eR: () => m,
        i4: () => o,
        n$: () => p,
      });
      var r = a(13538),
        n = a(92938);
      let s = Number(process.env.MANUFACTURER_MIN_SAMPLE_SIZE ?? 5);
      function i(e, t) {
        return e.from || e.to
          ? {
              [t]: {
                ...(e.from ? { gte: e.from } : {}),
                ...(e.to ? { lte: e.to } : {}),
              },
            }
          : {};
      }
      function l(e, t) {
        let a = t.trim();
        a && e.set(a, (e.get(a) ?? 0) + 1);
      }
      function d(e, t = 8) {
        return Array.from(e.entries())
          .map(([e, t]) => ({ label: e, count: t }))
          .sort(
            (e, t) => t.count - e.count || e.label.localeCompare(t.label, "ja"),
          )
          .slice(0, t);
      }
      async function o(e, t) {
        return (
          await r._.product.findMany({
            where: {
              manufacturerName: e,
              ...(t ? { organizationId: t } : {}),
              active: !0,
            },
            orderBy: { name: "asc" },
            select: { name: !0 },
          })
        ).map((e) => e.name);
      }
      async function c(e) {
        return (
          await r._.product.findMany({
            where: { active: !0, ...(e ? { organizationId: e } : {}) },
            distinct: ["manufacturerName"],
            orderBy: { manufacturerName: "asc" },
            select: { manufacturerName: !0 },
          })
        )
          .map((e) => e.manufacturerName)
          .filter(Boolean);
      }
      async function u(e, t) {
        return (
          await r._.product.findMany({
            where: {
              active: !0,
              ...(e ? { manufacturerName: e } : {}),
              ...(t ? { organizationId: t } : {}),
              category: { not: null },
            },
            distinct: ["category"],
            orderBy: { category: "asc" },
            select: { category: !0 },
          })
        )
          .map((e) => e.category)
          .filter((e) => !!e);
      }
      async function m(e, t) {
        let [a, n] = await Promise.all([
          r._.product.findMany({
            where: {
              manufacturerName: e,
              ...(t ? { organizationId: t } : {}),
              active: !0,
            },
            orderBy: { name: "asc" },
            select: { id: !0, name: !0 },
          }),
          r._.customer.findMany({
            where: { deletedAt: null, ...(t ? { organizationId: t } : {}) },
            orderBy: { name: "asc" },
            take: 300,
            select: { id: !0, name: !0, gender: !0, birthYear: !0 },
          }),
        ]);
        return { products: a, customers: n };
      }
      async function p({
        manufacturer: e,
        organizationId: t,
        productName: a,
        category: o,
        from: c,
        to: u,
        includeCustomerLinks: m = !1,
      }) {
        var p;
        let x = { from: c, to: u },
          f = a?.trim(),
          h = o?.trim(),
          g = await r._.product.findMany({
            where: {
              manufacturerName: e,
              ...(t ? { organizationId: t } : {}),
              active: !0,
              ...(h ? { category: h } : {}),
              ...(f ? { name: { contains: f, mode: "insensitive" } } : {}),
            },
            orderBy: [{ manufacturerName: "asc" }, { name: "asc" }],
            select: {
              id: !0,
              name: !0,
              manufacturerName: !0,
              category: !0,
              proposals: {
                where: {
                  customer: {
                    deletedAt: null,
                    ...(t ? { organizationId: t } : {}),
                  },
                  ...i(x, "createdAt"),
                },
                select: {
                  id: !0,
                  status: !0,
                  reaction: !0,
                  purchased: !0,
                  concernTags: !0,
                  customer: {
                    select: { id: !0, name: !0, gender: !0, birthYear: !0 },
                  },
                  reviewRequests: {
                    where: i(x, "requestedAt"),
                    select: { id: !0, status: !0 },
                  },
                  reviews: {
                    where: { allowAnonymousShare: !0, ...i(x, "submittedAt") },
                    orderBy: { submittedAt: "desc" },
                    select: {
                      id: !0,
                      usedStatus: !0,
                      rating: !0,
                      goodPoints: !0,
                      badPoints: !0,
                      repeatIntent: !0,
                      freeComment: !0,
                      allowAnonymousQuote: !0,
                      submittedAt: !0,
                    },
                  },
                },
              },
            },
          }),
          b = new Map(),
          v = new Map(),
          w = new Map(),
          N = g.map((e) => {
            let t = new Map(),
              a = new Map(),
              r = new Map();
            for (let t of e.proposals)
              for (let e of (0, n.c0)(t.concernTags)) l(r, e);
            let i = e.proposals.flatMap((e) =>
                e.reviews.map((r) => {
                  let s = (function (e) {
                      if (!e) return "年代不明";
                      let t = new Date().getFullYear() - e;
                      return t < 20
                        ? "10代"
                        : t < 30
                          ? "20代"
                          : t < 40
                            ? "30代"
                            : t < 50
                              ? "40代"
                              : t < 60
                                ? "50代"
                                : t < 70
                                  ? "60代"
                                  : "70代以上";
                    })(e.customer.birthYear),
                    i = e.customer.gender ?? "未設定";
                  for (let a of (b.has(e.customer.id) ||
                    (b.set(e.customer.id, { ageGroup: s, gender: i }),
                    l(v, s),
                    l(w, i)),
                  (0, n.c0)(r.goodPoints)))
                    l(t, a);
                  for (let e of (0, n.c0)(r.badPoints)) l(a, e);
                  return {
                    reviewId: r.id,
                    reviewerName: m ? e.customer.name : "匿名のお客様",
                    ...(m
                      ? { reviewerHref: `/admin/customers/${e.customer.id}` }
                      : {}),
                    reviewerGender: m ? i : "非表示",
                    reviewerAgeGroup: m ? s : "非表示",
                    rating: r.rating,
                    usedStatus: r.usedStatus,
                    comment: r.allowAnonymousQuote
                      ? (function (e) {
                          let t = e?.trim() ?? "";
                          return !t ||
                            /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(t) ||
                            /(?:0\d{1,4}[-ー‐－]?\d{1,4}[-ー‐－]?\d{3,4})/.test(
                              t,
                            )
                            ? ""
                            : t;
                        })(r.freeComment)
                      : "",
                    goodPoints: (0, n.c0)(r.goodPoints),
                    badPoints: (0, n.c0)(r.badPoints),
                    repeatIntent: r.repeatIntent,
                    submittedAt: r.submittedAt.toISOString(),
                  };
                }),
              ),
              o = i.map((e) => ({
                ...e,
                comment: i.length >= Math.max(3, s) ? e.comment : "",
              })),
              c = o.map((e) => e.rating).filter((e) => "number" == typeof e);
            return {
              productId: e.id,
              productName: e.name,
              category: e.category,
              reviewCount: o.length,
              averageRating:
                0 === c.length
                  ? null
                  : Math.round((c.reduce((e, t) => e + t, 0) / c.length) * 10) /
                    10,
              ratingBreakdown: {
                star1: c.filter((e) => 1 === e).length,
                star2: c.filter((e) => 2 === e).length,
                star3: c.filter((e) => 3 === e).length,
                star4: c.filter((e) => 4 === e).length,
                star5: c.filter((e) => 5 === e).length,
              },
              goodPointRanking: d(t),
              badPointRanking: d(a),
              concernTagBreakdown: d(r),
              reviews: o
                .sort(
                  (e, t) =>
                    Date.parse(t.submittedAt) - Date.parse(e.submittedAt),
                )
                .slice(0, 50),
            };
          });
        return {
          manufacturer: e,
          period: {
            from: c?.toISOString() ?? null,
            to: u?.toISOString() ?? null,
          },
          respondentCount: b.size,
          ageGroupBreakdown:
            b.size >= Math.max(3, s)
              ? [
                  ...(p = [
                    "10代",
                    "20代",
                    "30代",
                    "40代",
                    "50代",
                    "60代",
                    "70代以上",
                    "年代不明",
                  ])
                    .filter((e) => v.has(e))
                    .map((e) => ({ label: e, count: v.get(e) ?? 0 })),
                  ...Array.from(v.entries())
                    .filter(([e]) => !p.includes(e))
                    .map(([e, t]) => ({ label: e, count: t }))
                    .sort(
                      (e, t) =>
                        t.count - e.count ||
                        e.label.localeCompare(t.label, "ja"),
                    ),
                ]
              : [],
          genderBreakdown: b.size >= Math.max(3, s) ? d(w) : [],
          products: N,
        };
      }
    },
    92938: (e, t, a) => {
      a.d(t, {
        $R: () => g,
        A7: () => u,
        Bx: () => f,
        F$: () => s,
        Md: () => v,
        SX: () => i,
        Us: () => c,
        WM: () => w,
        Zw: () => b,
        c0: () => p,
        cT: () => o,
        ef: () => d,
        iu: () => l,
        uR: () => h,
        zW: () => x,
      });
      var r = a(84770),
        n = a(13538);
      let s = ["proposed", "sample_given", "purchased", "used_in_service"],
        i = ["interested", "not_interested", "consider_next", "purchased"],
        l = ["used", "not_yet", "forgot"],
        d = ["yes", "maybe", "no"],
        o = 50,
        c = 500;
      function u(e) {
        return (0, r.createHash)("sha256").update(e).digest("hex");
      }
      function m(e, t) {
        let a = new Date(e);
        return (a.setDate(a.getDate() + t), a);
      }
      function p(e) {
        if (Array.isArray(e))
          return e.map((e) => String(e).trim()).filter(Boolean);
        if ("string" == typeof e) {
          let t = e.trim();
          if (!t) return [];
          try {
            let e = JSON.parse(t);
            if (Array.isArray(e))
              return e.map((e) => String(e).trim()).filter(Boolean);
          } catch {}
          return t
            .split(/[,\n、]/)
            .map((e) => e.trim())
            .filter(Boolean);
        }
        return [];
      }
      function x(e, t) {
        return Array.from(
          new Set(
            e
              .getAll(t)
              .filter((e) => "string" == typeof e)
              .flatMap((e) => p(e)),
          ),
        );
      }
      function f(e) {
        if ("string" != typeof e) return null;
        let t = e.trim();
        return t.length > 0 ? t : null;
      }
      function h(e) {
        return "sample_given" === e
          ? "商品を案内した"
          : "purchased" === e
            ? "購入した"
            : "used_in_service" === e
              ? "施術で使った"
              : "提案のみ";
      }
      function g(e) {
        return "purchased" === e
          ? "購入"
          : "consider_next" === e
            ? "次回検討"
            : "not_interested" === e
              ? "興味なし"
              : "interested" === e
                ? "興味あり"
                : "未記録";
      }
      function b(e, t, a) {
        return "answered" === e || a
          ? "回答済み"
          : "revoked" === e
            ? "停止"
            : t.getTime() < Date.now()
              ? "期限切れ"
              : "active" === e
                ? "依頼済み"
                : "未依頼";
      }
      async function v({ db: e, proposal: t, visitAt: a, baseUrl: n }) {
        if (!t.purchased && "purchased" !== t.status)
          throw Error("購入済みの商品だけアンケートを発行できます。");
        for (let s = 0; s < 10; s += 1) {
          let s = (0, r.randomBytes)(32).toString("base64url"),
            i = u(s);
          if (
            await e.productReviewRequest.findUnique({
              where: { tokenHash: i },
              select: { id: !0 },
            })
          )
            continue;
          let l = await e.productReviewRequest.create({
            data: {
              productProposalId: t.id,
              tokenHash: i,
              requestedAt: a,
              expiresAt: (function (e, t = new Date()) {
                return "purchased" === e
                  ? m(t, 30)
                  : "used_in_service" === e
                    ? m(t, 7)
                    : m(t, 14);
              })("purchased", a),
              status: "active",
            },
            select: { id: !0, expiresAt: !0 },
          });
          return {
            requestId: l.id,
            reviewUrl: (function (e, t) {
              let a =
                  t ??
                  process.env.NEXT_PUBLIC_APP_URL ??
                  process.env.APP_URL ??
                  "",
                r = `/review/product/${encodeURIComponent(e)}`;
              return a ? `${a.replace(/\/$/, "")}${r}` : r;
            })(s, n),
            expiresAt: l.expiresAt,
          };
        }
        throw Error(
          "レビュー依頼URLを生成できませんでした。もう一度お試しください。",
        );
      }
      async function w({ proposalId: e, customerId: t, baseUrl: a }) {
        let r = await n._.productProposal.findFirst({
          where: {
            id: e,
            ...(t ? { customerId: t } : {}),
            customer: { deletedAt: null },
          },
          select: {
            id: !0,
            status: !0,
            purchased: !0,
            createdAt: !0,
            visit: { select: { visitedAt: !0 } },
          },
        });
        if (!r) throw Error("商品提案が見つかりません。");
        if (!r.purchased)
          throw Error("購入済みの商品だけアンケートを発行できます。");
        return v({
          db: n._,
          proposal: r,
          visitAt: r.visit?.visitedAt ?? r.createdAt,
          baseUrl: a,
        });
      }
    },
    24874: (e, t, a) => {
      a.d(t, { Z: () => r });
      let r = (0, a(40430).Z)("calendar-days", [
        ["path", { d: "M8 2v4", key: "1cmpym" }],
        ["path", { d: "M16 2v4", key: "4m81vk" }],
        [
          "rect",
          { width: "18", height: "18", x: "3", y: "4", rx: "2", key: "1hopcy" },
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
    38676: (e, t, a) => {
      a.d(t, { Z: () => r });
      let r = (0, a(40430).Z)("chart-column", [
        ["path", { d: "M3 3v16a2 2 0 0 0 2 2h16", key: "c24i48" }],
        ["path", { d: "M18 17V9", key: "2bz60n" }],
        ["path", { d: "M13 17V5", key: "1frdt8" }],
        ["path", { d: "M8 17v-3", key: "17ska0" }],
      ]);
    },
    94971: (e, t, a) => {
      a.d(t, { Z: () => r });
      let r = (0, a(40430).Z)("save", [
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
    },
    90682: (e, t, a) => {
      a.d(t, { Z: () => r });
      let r = (0, a(40430).Z)("star", [
        [
          "path",
          {
            d: "M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z",
            key: "r04s7s",
          },
        ],
      ]);
    },
    48723: (e, t, a) => {
      a.d(t, { Z: () => r });
      let r = (0, a(40430).Z)("user-round", [
        ["circle", { cx: "12", cy: "8", r: "5", key: "1hypcn" }],
        ["path", { d: "M20 21a8 8 0 0 0-16 0", key: "rfgkzh" }],
      ]);
    },
    68059: (e, t, a) => {
      a.d(t, { Z: () => r });
      let r = (0, a(40430).Z)("users-round", [
        ["path", { d: "M18 21a8 8 0 0 0-16 0", key: "3ypg7q" }],
        ["circle", { cx: "10", cy: "8", r: "5", key: "o932ke" }],
        [
          "path",
          { d: "M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3", key: "10s06x" },
        ],
      ]);
    },
  }));
