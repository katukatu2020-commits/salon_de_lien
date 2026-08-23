"use strict";
((exports.id = 3447),
  (exports.ids = [3447]),
  (exports.modules = {
    44860: (e, t, a) => {
      a.d(t, { k: () => l, n: () => n });
      let n = {
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
      function l(e) {
        let t = e.bookingProvider?.trim().toLowerCase();
        if (t && t in n) return t;
        let a = `${e.source ?? ""}
${e.subject ?? ""}
${e.content ?? ""}`;
        return /hot\s*pepper|ホットペッパー|salon\s*board|サロンボード/i.test(a)
          ? "hotpepper"
          : /kanzashi|かんざし|gmail:/i.test(a)
            ? "kanzashi"
            : /お客様アプリ|customer_app/i.test(a)
              ? "customer_app"
              : /電話|\bTEL\b/i.test(a)
                ? "phone"
                : /店頭|飛び込み/i.test(a)
                  ? "walk_in"
                  : "manual";
      }
    },
    83447: (e, t, a) => {
      a.d(t, { v: () => f });
      var n = a(6005),
        l = a(13538);
      let u = {
        customerName: [
          "ご来店者名",
          "来店者名",
          "ご予約者名",
          "予約者氏名",
          "予約者名",
          "お客様氏名",
          "お客様名",
          "顧客氏名",
          "顧客名",
          "お名前",
          "ご氏名",
          "氏名",
          "名前",
          "ご予約者",
        ],
        phone: [
          "ご連絡先電話番号",
          "連絡先電話番号",
          "携帯電話番号",
          "お電話番号",
          "電話番号",
          "携帯電話",
          "携帯番号",
          "ご連絡先",
          "連絡先",
          "お電話",
          "TEL",
          "電話",
        ],
        scheduledAt: [
          "予約日時",
          "ご予約日時",
          "来店日時",
          "ご来店日時",
          "予約日",
          "来店日",
          "日時",
        ],
        coupon: ["予約時クーポン", "ご利用クーポン", "利用クーポン"],
        menu: [
          "予約時メニュー",
          "予約メニュー",
          "ご予約メニュー",
          "施術メニュー",
          "メニュー",
          "コース",
        ],
        price: [
          "予約時合計金額",
          "メニュー金額",
          "お支払い予定金額",
          "支払い予定金額",
          "今回のお支払い金額",
          "合計金額",
          "予定金額",
          "料金",
          "金額",
        ],
        staff: [
          "予約時担当スタイリスト名",
          "予約時担当スタイリスト",
          "予約時担当スタッフ名",
          "予約時担当スタッフ",
          "予約時スタイリスト名",
          "予約時スタイリスト",
          "予約時指名スタッフ",
          "予約時指名",
          "ご指名担当者名",
          "ご指名担当者",
          "指名担当者名",
          "指名担当者",
          "担当スタイリスト名",
          "担当スタイリスト",
          "指名スタイリスト",
          "スタイリスト",
          "担当スタッフ",
          "指名スタッフ",
          "スタッフ名",
          "担当者名",
          "指名担当者",
          "担当者",
          "スタッフ",
          "担当",
        ],
        duration: [
          "合計施術時間",
          "施術時間目安",
          "合計時間",
          "所要時間",
          "施術時間",
          "予定時間",
        ],
        usedPoints: ["今回の利用ポイント", "予約時利用ポイント", "ご利用ポイント", "利用ポイント", "ポイント利用"],
        usedGiftAmount: ["今回の利用ギフト券", "予約時利用ギフト券", "ご利用ギフト券", "利用ギフト券", "ギフト券利用", "今回の利用ギフトカード", "利用ギフトカード"],
        otherDiscountAmount: ["今回のその他割引", "その他割引", "割引額", "値引額", "キャンペーン割引"],
        prepaidAmount: ["事前決済額", "オンライン決済額", "事前支払い金額", "事前支払額"],
        reference: ["予約番号", "予約ID", "受付番号", "予約No", "予約NO"],
      };
      function r(e, t) {
        let a = new Map();
        for (let n of [...t].sort((e, t) => t.length - e.length)) {
          let t = n.normalize("NFKC"),
            l = `${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\s*[（(][^）)\\n]{1,20}[）)])?`;
          for (let n of [
            RegExp(
              `(?:^|\\n|[■●])\\s*[・]?\\s*(${l})\\s*[:：]?\\s*([^\\n■●]+)`,
              "gi",
            ),
            RegExp(
              `(?:^|\\n|[■●])\\s*[・]?\\s*(${l})\\s*[:：]?\\s*\\n\\s*([^\\n■●]+)`,
              "gi",
            ),
          ])
            for (let l of e.matchAll(n)) {
              let e = l.index,
                n = l[2]?.trim(),
                u = l[1]?.trim() || t;
              if (!Number.isInteger(e) || !n) continue;
              let r = `${e}:${n}`;
              a.has(r) || a.set(r, { index: e, label: u, value: n });
            }
        }
        return [...a.values()].sort((e, t) => e.index - t.index);
      }
      function s(e, t, a = "first") {
        let n = r(e, t).map((e) => e.value);
        return "last" === a ? (n.at(-1) ?? null) : (n[0] ?? null);
      }
      function i(e) {
        let t = (e ?? "").replace(/\D/g, "");
        return 11 === t.length
          ? `${t.slice(0, 3)}-${t.slice(3, 7)}-${t.slice(7)}`
          : 10 === t.length
            ? `${t.slice(0, 3)}-${t.slice(3, 6)}-${t.slice(6)}`
            : t || null;
      }
      function o(e) {
        let t = (e ?? "").replace(/\D/g, "");
        return /^(0120|0800|0570)/.test(t);
      }
      function c(e) {
        return (
          (e ?? "")
            .replace(/^[・\-\s]+/, "")
            .replace(/\s+/g, " ")
            .trim() || null
        );
      }

      function parseReservationStaffName(e) {
        let t = r(e, u.staff)
            .map((e) => c(e.value)?.replace(/^指名あり\s*[:：]?\s*/, "").replace(/\s*(?:様|さん|氏)\s*$/, "").trim())
            .filter(Boolean),
          a = [
            ["谷崎 太二", ["谷崎太二", "谷崎", "谷崎店長", "店長谷崎"]],
            ["渡邊 浩明", ["渡邊浩明", "渡辺浩明", "渡邊", "渡辺"]],
            ["浅野 清美", ["浅野清美", "浅野"]],
            ["小林 美奈子", ["小林美奈子", "小林"]],
            ["kaori", ["kaori", "カオリ"]],
          ],
          n = (e) => String(e || "").normalize("NFKC").replace(/[\s　・:：()（）]/g, "").toLowerCase(),
          l = (e) => a.find((t) => t[1].some((a) => n(e).includes(n(a))))?.[0] ?? null;
        for (let e of t) { let t = l(e); if (t) return t; }
        for (let t of e.split("\n").filter((e) => /担当|指名|スタイリスト|スタッフ/.test(e))) { let e = l(t); if (e) return e; }
        let i = /^(?:フリー|指名なし|指定なし|希望なし|おまかせ|お任せ|なし)$/,
          o = /^(?:-|ー|未定|あり|指名あり|希望あり)$/;
        for (let e of t) { let t = n(e); if (!i.test(t) && !o.test(t)) return e; }
        return t.some((e) => i.test(n(e))) ? "フリー" : null;
      }

      function extractReservationSection(e, t) {
        let a = (e ?? "").split("\n");
        for (let n = 0; n < a.length; n += 1) {
          let l = a[n].trim().replace(/^[■●]\s*/, "").trim();
          for (let e of t) {
            if (l !== e && !l.startsWith(e + ":") && !l.startsWith(e + "："))
              continue;
            let t = l.slice(e.length).replace(/^\s*[:：]\s*/, "").trim(),
              r = t ? [t] : [];
            for (let e = n + 1; e < a.length; e += 1) {
              let t = a[e].trim();
              if (/^[■◇◆●]/.test(t)) break;
              t && r.push(t);
            }
            return r.join("\n").trim() || null;
          }
        }
        return null;
      }
      function extractCouponTitle(e) {
        let t = extractReservationSection(e, [
          "予約時クーポン",
          "ご利用クーポン",
          "利用クーポン",
        ]);
        if (!t || /利用クーポンなし|クーポン利用なし/.test(t)) return null;
        let a = t
          .split("\n")
          .map((e) => e.trim())
          .filter(Boolean)
          .find((e) => !/^(?:\[[^\]]+\]\s*)+$/.test(e));
        return a ?? null;
      }
      function parseYenAmount(e) {
        if (!e) return null;
        let t = e.match(/(?:[¥￥]\s*)?([\d,]+)\s*円?/);
        if (!t) return null;
        let a = Number(t[1].replace(/,/g, ""));
        return Number.isSafeInteger(a) && a >= 0 ? a : null;
      }
      function extractReservationPrice(e) {
        let t = e ?? "",
          a = [
            /予約時合計金額\s*[:：]?\s*(?:\n\s*)?(?:[¥￥]\s*)?([\d,]+)\s*円?/i,
            /メニュー金額\s*[:：]?\s*(?:\n\s*)?(?:[¥￥]\s*)?([\d,]+)\s*円?/i,
            /お支払い予定金額\s*[:：]?\s*(?:\n\s*)?(?:[¥￥]\s*)?([\d,]+)\s*円?/i,
            /支払い予定金額\s*[:：]?\s*(?:\n\s*)?(?:[¥￥]\s*)?([\d,]+)\s*円?/i,
            /今回のお支払い金額\s*[:：]?\s*(?:\n\s*)?(?:[¥￥]\s*)?([\d,]+)\s*円?/i,
          ];
        for (let e of a) {
          let a = t.match(e),
            n = parseYenAmount(a?.[1]);
          if (null !== n) return n;
        }
        for (let e of [
          extractCouponTitle(t),
          extractReservationSection(t, [
            "予約時メニュー",
            "予約メニュー",
            "ご予約メニュー",
            "施術メニュー",
            "メニュー",
          ]),
        ]) {
          let t = Array.from(
            (e ?? "").matchAll(/(?:[¥￥]\s*([\d,]+)|([\d,]+)\s*円)/g),
            (e) => Number((e[1] ?? e[2]).replace(/,/g, "")),
          ).filter((e) => Number.isSafeInteger(e) && e >= 0);
          if (t.length > 0) return t.at(-1);
        }
        return null;
      }
      function extractReservationPoints(e) {
        let t = s(e ?? "", u.usedPoints);
        if (!t) return null;
        if (/利用なし|未利用|なし/.test(t)) return 0;
        let a = t.match(/([\d,]+)\s*(?:ポイント|point|pt|p)?/i);
        if (!a) return null;
        let n = Number(a[1].replace(/,/g, ""));
        return Number.isSafeInteger(n) && n >= 0 ? n : null;
      }
      function extractReservationUsageAmount(e, t) {
        let a = s(e ?? "", t);
        if (!a) return null;
        if (/利用なし|未利用|なし|使用なし|適用なし/.test(a)) return 0;
        let n = a.normalize("NFKC").match(/(?:¥\s*)?([\d,]+)\s*(?:円|円分)?/i);
        if (!n) return null;
        let l = Number(n[1].replace(/,/g, ""));
        return Number.isSafeInteger(l) && l >= 0 ? l : null;
      }
      function extractReservationPaymentDue(e) {
        let t = (e ?? "").match(/(?:お支払い予定金額|支払い予定金額|今回のお支払い金額)\s*[:：]?\s*(?:\n\s*)?(?:[¥￥]\s*)?([\d,]+)\s*円?/i);
        if (!t) return null;
        let a = Number(t[1].replace(/,/g, ""));
        return Number.isSafeInteger(a) && a >= 0 ? a : null;
      }
      function storedReservationAmount(e, t) {
        let a = (e ?? "").match(RegExp("(?:^|\\n)" + t + ":\\s*([\\d,]+)", "i"));
        if (!a) return null;
        let n = Number(a[1].replace(/,/g, ""));
        return Number.isSafeInteger(n) && n >= 0 ? n : null;
      }
      function normalizeReservationMenu(e) {
        return (e ?? "")
          .normalize("NFKC")
          .split(/\s*\/\s*クーポン\s*:/)[0]
          .replace(/^\s*\d+\s*[.．]\s*/, "")
          .replace(/[+＋]/g, "+")
          .replace(/[（]/g, "(")
          .replace(/[）]/g, ")")
          .replace(/\s+/g, "")
          .toLowerCase();
      }
      var m = a(44860);
      function d(e) {
        return (0, n.createHash)("sha256").update(e, "utf8").digest("hex");
      }
      async function p(e, t, a, n) {
        let u = i(t)?.replace(/\D/g, "") ?? "",
          r = u.slice(-4),
          s = await l._.customer.findMany({
            where: {
              deletedAt: null,
              organizationId: n,
              OR: [
                { name: e },
                { memo: { contains: `[予約時名:${e}]` } },
                ...(r ? [{ phone: { contains: r } }] : []),
              ],
            },
            select: { id: !0, name: !0, phone: !0, memo: !0 },
            take: 30,
          }),
          o = u ? s.find((e) => i(e.phone)?.replace(/\D/g, "") === u) : null,
          c = s.find(
            (t) =>
              t.name.replace(/\s+/g, "") === e.replace(/\s+/g, "") ||
              (t.memo ?? "").includes(`[予約時名:${e}]`),
          ),
          m = o ?? c;
        if (m) return { customer: m, created: !1 };
        let p = `gmail-customer-${d(`${n}:${t || `${e}:${a}`}`).slice(0, 20)}`;
        return {
          customer: await l._.customer.upsert({
            where: { id: p },
            update: { name: e, phone: t, organizationId: n, deletedAt: null },
            create: {
              id: p,
              name: e,
              phone: t,
              organizationId: n,
              memo: "Gmail予約メールから登録。内容確認後に正式な顧客情報へ更新してください。",
            },
            select: { id: !0, name: !0, phone: !0 },
          }),
          created: !0,
        };
      }
      async function f(
        e,
        t = process.env.DEFAULT_ORGANIZATION_ID ?? "org_salon_de_lien",
      ) {
        var a;
        let n = (function (e) {
          let t = e.content
              .normalize("NFKC")
              .replace(/<br\s*\/?\s*>/gi, "\n")
              .replace(/<\/(?:p|div|li|tr|td|th|dt|dd|section)\s*>/gi, "\n")
              .replace(/<[^>]+>/g, " ")
              .replace(/&nbsp;/gi, " ")
              .replace(/&amp;/gi, "&")
              .replace(/\r/g, "")
              .replace(
                /^\s*\(([^()\n]*(?:施術時間目安|メニュー金額)[^()\n]*)\)\s*$/gm,
                "$1",
              )
              .replace(/[\t ]+/g, " ")
              .replace(/\n{3,}/g, "\n\n")
              .trim(),
            a = c(e.subject),
            n = (function (e) {
              let t = r(e, u.phone)
                  .map((e) => ({ ...e, phone: i(e.value) }))
                  .filter((e) => !!e.phone),
                a = t.filter((e) =>
                  /^(070|080|090)/.test(e.phone.replace(/\D/g, "")),
                ),
                n = t.filter((e) => !o(e.phone)),
                l = a.at(-1) ?? n.at(-1);
              return l
                ? { value: l.phone, index: l.index }
                : (Array.from(
                    e.matchAll(
                      /(?:^|\D)(0\d{1,4}[-ー‐− ]?\d{1,4}[-ー‐− ]?\d{3,4})(?=\D|$)/g,
                    ),
                    (e) => ({ index: e.index ?? 0, value: i(e[1]) }),
                  )
                    .filter((e) => !!e.value && !o(e.value))
                    .at(-1) ?? null);
            })(t),
            l = (function (e, t) {
              let a = r(e, u.customerName)
                .map((e) => ({
                  ...e,
                  name: (e.value ?? "")
                    .replace(/\s*(?:様|さま)\s*$/, "")
                    .replace(/\s*[（(][^）)]*[）)]\s*$/, "")
                    .replace(/\s+/g, " ")
                    .trim(),
                }))
                .filter((e) => !!e.name);
              if (0 === a.length) return "";
              let n = (e) =>
                (null == t ? 0 : Math.abs(e.index - t)) +
                (/カナ|かな|ふりがな|フリガナ/.test(e.label) ? 500 : 0);
              return [...a].sort((e, t) => n(e) - n(t))[0]?.name ?? "";
            })(t, n?.index),
            m = (function (e) {
              let t = s(e, u.scheduledAt),
                a = `${t ?? ""} ${e.replace(/\n/g, " ")}`,
                n = a.match(
                  /(20\d{2})\s*(?:年|[./-])\s*(\d{1,2})\s*(?:月|[./-])\s*(\d{1,2})\s*日?(?:\s*\([^)]*\))?\s*(\d{1,2})\s*(?::|時)\s*(\d{1,2})?\s*分?/,
                ),
                l = a.match(
                  /(20\d{2})(\d{2})(\d{2})[^\d]{0,8}(\d{1,2}):(\d{2})/,
                ),
                r = n ?? l;
              if (!r) return null;
              let [, i, o, c, m, d = "0"] = r,
                p = Number(i),
                f = Number(o),
                h = Number(c),
                g = Number(m),
                v = Number(d);
              if (
                !Number.isInteger(p) ||
                f < 1 ||
                f > 12 ||
                h < 1 ||
                h > 31 ||
                g < 0 ||
                g > 23 ||
                v < 0 ||
                v > 59
              )
                return null;
              let b = new Date(Date.UTC(p, f - 1, h, g - 9, v)),
                $ = new Intl.DateTimeFormat("ja-JP", {
                  timeZone: "Asia/Tokyo",
                  year: "numeric",
                  month: "numeric",
                  day: "numeric",
                  hour: "numeric",
                  minute: "numeric",
                  hourCycle: "h23",
                }).formatToParts(b),
                N = (e) => Number($.find((t) => t.type === e)?.value);
              return N("year") !== p ||
                N("month") !== f ||
                N("day") !== h ||
                N("hour") !== g ||
                N("minute") !== v
                ? null
                : b;
            })(t),
            d = [];
          return (l || d.push("お客様名を読み取れませんでした。"),
          m ||
            d.push(
              "予約日時を読み取れませんでした。西暦を含む日時が必要です。",
            ),
          d.length > 0 || !m)
            ? { ok: !1, errors: d }
            : {
                ok: !0,
                value: {
                  customerName: l,
                  phone: n?.value ?? null,
                  scheduledAt: m,
                  menu: (() => { let e = c(s(t, u.menu)), a = extractCouponTitle(t) ?? c(s(t, u.coupon)); return [e, a ? `クーポン: ${a}` : null].filter(Boolean).join(" / ") || null; })(),
                  estimatedPrice: extractReservationPrice(t),
                  usedPoints: extractReservationPoints(t),
                  usedGiftAmount: extractReservationUsageAmount(t, u.usedGiftAmount),
                  otherDiscountAmount: extractReservationUsageAmount(t, u.otherDiscountAmount),
                  prepaidAmount: extractReservationUsageAmount(t, u.prepaidAmount),
                  paymentDue: extractReservationPaymentDue(t),
                  staffName: parseReservationStaffName(t),
                  durationMinutes: (function (e) {
                    if (!e) return null;
                    let t =
                      60 * Number(e.match(/(\d+)\s*時間/)?.[1] ?? 0) +
                      Number(e.match(/(\d+)\s*分/)?.[1] ?? 0);
                    return t > 0 && t <= 720 ? t : null;
                  })(s(t, u.duration)),
                  bookingReference:
                    c(s(t, u.reference)) ??
                    t.match(/kanzashi\.com\/reservation\/(\d+)/i)?.[1] ??
                    null,
                  status: (function (e, t) {
                    let a = `${e}
${t}`;
                    return /キャンセル|取消|取り消し/.test(a)
                      ? "キャンセル"
                      : /変更受付|予約変更|予約を変更|ご予約を変更/.test(a)
                        ? "変更受付"
                        : /予約確定|予約が確定|ご予約を承りました|予約完了|受付完了/.test(
                              a,
                            )
                          ? "予約確定"
                          : "仮予約";
                  })(a ?? "", t),
                  subject: a,
                },
              };
        })(e);
        if (!n.ok) return n;
        if ((null === n.value.estimatedPrice || 0 === n.value.estimatedPrice) && n.value.menu) {
          let e = normalizeReservationMenu(n.value.menu),
            menuRows = await l._.$queryRawUnsafe(
              'SELECT "name","priceYen" FROM "SalonMenu" WHERE "organizationId"=$1 AND "active"=true AND "priceYen">0',
              t,
            ),
            a = menuRows.find((t) => normalizeReservationMenu(t.name) === e);
          a && (n.value.estimatedPrice = a.priceYen);
        }
        let f = e.content.normalize("NFKC").replace(/\r/g, "").trim(),
          h = d(
            e.messageId?.trim() ||
              `${e.subject ?? ""}
${f}`,
          ),
          g = `gmail:${h}`,
          v = (0, m.k)({
            source: g,
            subject: n.value.subject,
            content: `${e.sender ?? ""}
${f}`,
          }),
          b = m.n[v].label,
          { customer: $, created: N } = await p(
            n.value.customerName,
            n.value.phone,
            h,
            t,
          ),
          w =
            "キャンセル" !== n.value.status || n.value.bookingReference
              ? null
              : await l._.appointment.findFirst({
                  where: {
                    customerId: $.id,
                    scheduledAt: n.value.scheduledAt,
                    status: {
                      notIn: ["キャンセル", "無断キャンセル", "来店済み"],
                    },
                    OR: [
                      { bookingProvider: v },
                      { source: { startsWith: "gmail:" } },
                    ],
                  },
                  orderBy: { updatedAt: "desc" },
                  select: { id: !0 },
                }),
          A = n.value.bookingReference
            ? `booking:${n.value.bookingReference}`
            : `message:${h}`,
          k = w?.id ?? `gmail-appt-${d(`${t}:${A}`).slice(0, 24)}`,
          y = await l._.appointment.findUnique({
            where: { id: k },
            select: { id: !0, estimatedPrice: !0, staffName: !0, note: !0 },
          }),
          externalUsedPoints = n.value.usedPoints ?? storedReservationAmount(y?.note, "利用ポイント"),
          externalUsedGiftAmount = n.value.usedGiftAmount ?? storedReservationAmount(y?.note, "利用ギフト券"),
          externalOtherDiscountAmount = n.value.otherDiscountAmount ?? storedReservationAmount(y?.note, "その他割引"),
          externalPrepaidAmount = n.value.prepaidAmount ?? storedReservationAmount(y?.note, "事前決済額"),
          externalPaymentDue = n.value.paymentDue ?? storedReservationAmount(y?.note, "支払予定額"),
          x = [
            n.value.bookingReference
              ? `予約番号: ${n.value.bookingReference}`
              : null,
            n.value.staffName ? `担当: ${n.value.staffName}` : null,
            n.value.durationMinutes
              ? `所要時間: ${n.value.durationMinutes}分`
              : null,
            n.value.subject ? `メール件名: ${n.value.subject}` : null,
            externalUsedPoints !== null ? `利用ポイント: ${externalUsedPoints}pt` : null,
            externalUsedGiftAmount !== null ? `利用ギフト券: ${externalUsedGiftAmount}円` : null,
            externalOtherDiscountAmount !== null ? `その他割引: ${externalOtherDiscountAmount}円` : null,
            externalPrepaidAmount !== null ? `事前決済額: ${externalPrepaidAmount}円` : null,
            externalPaymentDue !== null ? `支払予定額: ${externalPaymentDue}円` : null,
            `予約元: ${b}`,
            "Gmail予約メールから抽出。元メール本文は保存していません。",
          ]
            .filter((e) => !!e)
            .join("\n"),
          I = await l._.appointment.upsert({
            where: { id: k },
            update: {
              customerId: $.id,
              scheduledAt: n.value.scheduledAt,
              durationMinutes: n.value.durationMinutes,
              menu: n.value.menu,
              staffName: n.value.staffName ?? y?.staffName ?? null,
              estimatedPrice: "キャンセル" === n.value.status && null != y?.estimatedPrice ? y.estimatedPrice : (n.value.estimatedPrice ?? y?.estimatedPrice ?? null),
              status: n.value.status,
              source: g,
              bookingProvider: v,
              note: x,
            },
            create: {
              id: k,
              customerId: $.id,
              scheduledAt: n.value.scheduledAt,
              durationMinutes: n.value.durationMinutes,
              menu: n.value.menu,
              staffName: n.value.staffName,
              estimatedPrice: n.value.estimatedPrice,
              status: n.value.status,
              source: g,
              bookingProvider: v,
              note: x,
            },
            include: { customer: { select: { id: !0, name: !0 } } },
          }),
          _ = `gmail-contact-${d(`${t}:${h}:staff-parser-v3`).slice(0, 24)}`;
        return (
          await l._.contactLog.upsert({
            where: { id: _ },
            update: {
              customerId: $.id,
              channel: `${b}予約メール`,
              purpose: "予約取込",
              message: [
                `予約日時: ${n.value.scheduledAt.toISOString()}`,
                n.value.durationMinutes
                  ? `施術時間: ${n.value.durationMinutes}分`
                  : null,
                `メニュー: ${n.value.menu ?? "記載なし"}`,
                `ステータス: ${n.value.status}`,
                n.value.staffName ? `担当: ${n.value.staffName}` : null,
                n.value.bookingReference
                  ? `予約番号: ${n.value.bookingReference}`
                  : null,
                externalUsedPoints !== null ? `利用ポイント: ${externalUsedPoints}pt` : null,
                externalUsedGiftAmount !== null ? `利用ギフト券: ${externalUsedGiftAmount}円` : null,
                externalOtherDiscountAmount !== null ? `その他割引: ${externalOtherDiscountAmount}円` : null,
                externalPrepaidAmount !== null ? `事前決済額: ${externalPrepaidAmount}円` : null,
                externalPaymentDue !== null ? `支払予定額: ${externalPaymentDue}円` : null,
              ]
                .filter(Boolean)
                .join("\n"),
              outcome: y ? "予約更新" : "予約登録",
              nextAction: "予約内容と顧客情報を確認する",
              scheduledFollowUp: n.value.scheduledAt,
            },
            create: {
              id: _,
              customerId: $.id,
              channel: `${b}予約メール`,
              purpose: "予約取込",
              message: [
                `予約日時: ${n.value.scheduledAt.toISOString()}`,
                n.value.durationMinutes
                  ? `施術時間: ${n.value.durationMinutes}分`
                  : null,
                `メニュー: ${n.value.menu ?? "記載なし"}`,
                `ステータス: ${n.value.status}`,
                n.value.staffName ? `担当: ${n.value.staffName}` : null,
                n.value.bookingReference
                  ? `予約番号: ${n.value.bookingReference}`
                  : null,
                externalUsedPoints !== null ? `利用ポイント: ${externalUsedPoints}pt` : null,
                externalUsedGiftAmount !== null ? `利用ギフト券: ${externalUsedGiftAmount}円` : null,
                externalOtherDiscountAmount !== null ? `その他割引: ${externalOtherDiscountAmount}円` : null,
                externalPrepaidAmount !== null ? `事前決済額: ${externalPrepaidAmount}円` : null,
                externalPaymentDue !== null ? `支払予定額: ${externalPaymentDue}円` : null,
              ]
                .filter(Boolean)
                .join("\n"),
              outcome: y ? "予約更新" : "予約登録",
              nextAction: "予約内容と顧客情報を確認する",
              scheduledFollowUp: n.value.scheduledAt,
            },
          }),
          {
            ok: !0,
            appointment: I,
            customerCreated: N,
            duplicate: !!y,
            month:
              ((a = n.value.scheduledAt),
              new Intl.DateTimeFormat("en-CA", {
                timeZone: "Asia/Tokyo",
                year: "numeric",
                month: "2-digit",
              }).format(a)),
            parsed: n.value,
          }
        );
      }
    },
    13538: (e, t, a) => {
      a.d(t, { _: () => l });
      var n = a(53524);
      let l = globalThis.prisma ?? new n.PrismaClient({ log: ["error"] });
    },
  }));
