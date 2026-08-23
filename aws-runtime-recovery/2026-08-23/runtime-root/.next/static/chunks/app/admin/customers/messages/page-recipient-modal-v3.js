(self.webpackChunk_N_E = self.webpackChunk_N_E || []).push([
  [1163],
  {
    8596: function (e, n, t) {
      (Promise.resolve().then(t.bind(t, 2228)),
        Promise.resolve().then(t.t.bind(t, 2972, 23)),
        Promise.resolve().then(t.bind(t, 1974)));
    },
    1974: function (e, n, t) {
      "use strict";
      t.d(n, {
        ConfirmSubmitButton: function () {
          return u;
        },
      });
      var i = t(7437),
        r = t(4887),
        l = t(2265);
      function u(e) {
        let {
            children: n,
            message: t,
            className: u,
            pendingText: o = "処理中...",
            recipientSelector: a = !1,
            id: d,
          } = e,
          { pending: s } = (0, r.useFormStatus)();
        if (a)
          return (0, i.jsx)("button", {
            id: d,
            type: "button",
            className: u,
            onClick: () => {
              let e = document.getElementById("broadcast-recipient-modal"),
                n = document.getElementById("broadcast-recipient-search"),
                t = document.getElementById("broadcast-recipient-count"),
                r = document.getElementById(
                  "broadcast-recipient-modal-count",
                ),
                l = () => {
                  let e = Array.from(
                    document.querySelectorAll(
                      '#broadcast-recipient-modal input[name="targetCustomerId"]',
                    ),
                  ).filter((e) => e.checked).length;
                  (t &&
                    (t.textContent = e
                      ? `${e}名を個別選択中`
                      : "個別選択なし（条件配信）"),
                    r && (r.textContent = `${e}名選択中`));
                },
                o = () => {
                  e &&
                    ((e.hidden = !0),
                    (e.style.display = "none"),
                    (document.body.style.overflow = ""));
                };
              if (!e) return;
              ((e.hidden = !1),
                (e.style.display = "grid"),
                (document.body.style.overflow = "hidden"));
              for (let t of e.querySelectorAll(
                '#broadcast-recipient-modal input[name="targetCustomerId"]',
              ))
                t.onchange = l;
              n &&
                (n.oninput = () => {
                  let e = n.value.trim().toLowerCase();
                  document
                    .querySelectorAll(".broadcast-recipient-row")
                    .forEach(
                      (n) =>
                        (n.style.display =
                          e && !n.dataset.recipientSearch.includes(e)
                            ? "none"
                            : "flex"),
                    );
                });
              for (let t of [
                "broadcast-recipient-close",
                "broadcast-recipient-backdrop",
                "broadcast-recipient-done",
              ]) {
                let e = document.getElementById(t);
                e && (e.onclick = o);
              }
              (l(), setTimeout(() => n?.focus(), 0));
            },
            children: e.children,
          });
        ((0, l.useEffect)(() => {
          function e(e) {
            return document.getElementById(e);
          }
          function n() {
            let n = Array.from(
                document.querySelectorAll(
                  '#broadcast-recipient-modal input[name="targetCustomerId"]',
                ),
              ).filter((e) => e.checked).length,
              t = e("broadcast-recipient-count"),
              i = e("broadcast-recipient-modal-count");
            t &&
              (t.textContent = n
                ? `${n}名を個別選択中`
                : "個別選択なし（条件配信）"),
              i && (i.textContent = `${n}名選択中`);
          }
          function t() {
            let t = e("broadcast-recipient-modal"),
              i = e("broadcast-recipient-search");
            t &&
              ((t.hidden = !1),
              (document.body.style.overflow = "hidden"),
              setTimeout(() => i?.focus(), 0),
              n());
          }
          function i() {
            let t = e("broadcast-recipient-modal"),
              n = e("broadcast-recipient-open");
            t &&
              ((t.hidden = !0),
              (document.body.style.overflow = ""),
              n?.focus());
          }
          function r(e) {
            let n = e.target.closest?.("button");
            n &&
              ("broadcast-recipient-open" === n.id && t(),
              [
                "broadcast-recipient-close",
                "broadcast-recipient-backdrop",
                "broadcast-recipient-done",
              ].includes(n.id) && i());
          }
          function l(e) {
            e.target.matches?.(
              '#broadcast-recipient-modal input[name="targetCustomerId"]',
            ) && setTimeout(n, 0);
          }
          function o(e) {
            if ("broadcast-recipient-search" !== e.target.id) return;
            let n = e.target.value.trim().toLowerCase();
            document
              .querySelectorAll(".broadcast-recipient-row")
              .forEach(
                (e) =>
                  (e.hidden =
                    !!n && !e.dataset.recipientSearch.includes(n)),
              );
          }
          function s(n) {
            let t = e("broadcast-recipient-modal");
            "Escape" === n.key && t && !t.hidden && i();
          }
          return (
            document.addEventListener("click", r),
            document.addEventListener("change", l),
            document.addEventListener("input", o),
            document.addEventListener("keydown", s),
            n(),
            () => {
              (document.removeEventListener("click", r),
                document.removeEventListener("change", l),
                document.removeEventListener("input", o),
                document.removeEventListener("keydown", s),
                (document.body.style.overflow = ""));
            }
          );
        }, []),
          null);
        return (0, i.jsx)("button", {
          type: "submit",
          disabled: s,
          "aria-busy": s,
          className: "".concat(
            null != u ? u : "",
            " disabled:pointer-events-none disabled:opacity-60",
          ),
          onClick: (e) => {
            if (s) {
              e.preventDefault();
              return;
            }
            let n = e.currentTarget.form;
            (!n || n.checkValidity()) &&
              (window.confirm(t) || e.preventDefault());
          },
          children: s ? o : n,
        });
      }
    },
  },
  function (e) {
    (e.O(0, [3717, 2971, 2117, 1744], function () {
      return e((e.s = 8596));
    }),
      (_N_E = e.O()));
  },
]);
