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
        menu: [
          "予約時クーポン",
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
          "合計金額",
          "予定金額",
          "料金",
          "金額",
        ],
        staff: [
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
                  menu: c(s(t, u.menu)),
                  estimatedPrice: (function (e) {
                    let t = (e ?? "").match(/(?:¥|￥)?\s*([\d,]+)\s*円?/);
                    if (!t) return null;
                    let a = Number(t[1].replace(/,/g, ""));
                    return Number.isSafeInteger(a) && a >= 0 ? a : null;
                  })(s(t, u.price)),
                  staffName: c(s(t, u.staff)),
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
          x = [
            n.value.bookingReference
              ? `予約番号: ${n.value.bookingReference}`
              : null,
            n.value.staffName ? `担当: ${n.value.staffName}` : null,
            n.value.durationMinutes
              ? `所要時間: ${n.value.durationMinutes}分`
              : null,
            n.value.subject ? `メール件名: ${n.value.subject}` : null,
            `予約元: ${b}`,
            "Gmail予約メールから抽出。元メール本文は保存していません。",
          ]
            .filter((e) => !!e)
            .join("\n"),
          y = await l._.appointment.findUnique({
            where: { id: k },
            select: { id: !0 },
          }),
          I = await l._.appointment.upsert({
            where: { id: k },
            update: {
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
          _ = `gmail-contact-${d(`${t}:${h}:staff-parser-v2`).slice(0, 24)}`;
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
