((exports.id = 9845),
  (exports.ids = [9845]),
  (exports.modules = {
    31466: (e, t, r) => {
      let n = {
        "837214f73a30a9ce7ed38314411980a7196205a3": () =>
          Promise.resolve()
            .then(r.bind(r, 17403))
            .then((e) => e.createCustomerBroadcastAction),
        a41fb53b36f7420a9081017c2baf65a5e26220d1: () =>
          Promise.resolve()
            .then(r.bind(r, 17403))
            .then((e) => e.saveAutomatedCouponRuleAction),
        bc0e05a131115e930c08d60a03ce331f03abf050: () =>
          Promise.resolve()
            .then(r.bind(r, 17403))
            .then((e) => e.toggleAutomatedCouponRuleAction),
        f2dd87299610fbf0cb12f2b8f4d981ec8c712332: () =>
          Promise.resolve()
            .then(r.bind(r, 17403))
            .then((e) => e.markCustomerBroadcastsReadAction),
      };
      async function a(e, ...t) {
        return (await n[e]()).apply(null, t);
      }
      e.exports = {
        "837214f73a30a9ce7ed38314411980a7196205a3": a.bind(
          null,
          "837214f73a30a9ce7ed38314411980a7196205a3",
        ),
        a41fb53b36f7420a9081017c2baf65a5e26220d1: a.bind(
          null,
          "a41fb53b36f7420a9081017c2baf65a5e26220d1",
        ),
        bc0e05a131115e930c08d60a03ce331f03abf050: a.bind(
          null,
          "bc0e05a131115e930c08d60a03ce331f03abf050",
        ),
        f2dd87299610fbf0cb12f2b8f4d981ec8c712332: a.bind(
          null,
          "f2dd87299610fbf0cb12f2b8f4d981ec8c712332",
        ),
      };
    },
    17403: (e, t, r) => {
      "use strict";
      (r.r(t),
        r.d(t, {
          createCustomerBroadcastAction: () => m,
          createSalonMenuAction: () => H,
          listAutomatedCouponRules: () => q,
          listSalonMenus: () => G,
          markCustomerBroadcastsReadAction: () => h,
          saveAutomatedCouponRuleAction: () => J,
          toggleAutomatedCouponRuleAction: () => K,
        }));
      var n = r(24330);
      r(60166);
      var a = r(57708),
        o = r(58585),
        i = r(59219),
        l = r(65051),
        d = r(14429),
        u = r(13538),
        y = r(99001);
      let E = null;
      function A(e) {
        return `=?UTF-8?B?${Buffer.from(e, "utf8").toString("base64")}?=`;
      }
      async function C(e) {
        let t = process.env.GMAIL_OAUTH_CLIENT_ID?.trim(),
          r = process.env.GMAIL_OAUTH_CLIENT_SECRET?.trim(),
          n = process.env.GMAIL_OAUTH_REFRESH_TOKEN?.trim(),
          a = process.env.GMAIL_RESERVATION_EMAIL?.trim();
        if (!t || !r || !n || !a)
          throw Error("メール配信設定が完了していません。");
        let o = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: t,
              client_secret: r,
              refresh_token: n,
              grant_type: "refresh_token",
            }),
            cache: "no-store",
          }),
          i = await o.json();
        if (!o.ok || !i.access_token)
          throw Error("メール配信の認証に失敗しました。");
        let l =
            process.env.PASSWORD_RESET_MAIL_FROM_NAME?.trim() ||
            "Salon de Lien",
          d = [
            `From: ${A(l)} <${a}>`,
            `To: ${e.to}`,
            `Subject: ${A(e.subject)}`,
            "MIME-Version: 1.0",
            "Content-Type: text/plain; charset=UTF-8",
            "Content-Transfer-Encoding: 8bit",
            "",
            e.body,
          ].join("\r\n"),
          u = await fetch(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${i.access_token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                raw: Buffer.from(d, "utf8").toString("base64url"),
              }),
              cache: "no-store",
            },
          );
        if (!u.ok) throw Error(`メール配信に失敗しました (HTTP ${u.status})`);
      }
      async function I(e) {
        E ??= new y.SNSClient({
          region: process.env.AWS_REGION || "ap-northeast-1",
        });
        let t = {
            "AWS.SNS.SMS.SMSType": {
              DataType: "String",
              StringValue: "Transactional",
            },
          },
          r = process.env.SMS_SENDER_ID?.trim(),
          n = process.env.SMS_MAX_PRICE_USD?.trim();
        r &&
          (t["AWS.SNS.SMS.SenderID"] = { DataType: "String", StringValue: r });
        n &&
          (t["AWS.SNS.SMS.MaxPrice"] = { DataType: "Number", StringValue: n });
        await E.send(
          new y.PublishCommand({
            PhoneNumber: e.to,
            Message: e.body,
            MessageAttributes: t,
          }),
        );
      }
      function c(e, t, r) {
        let n = String(e.get(t) ?? "").trim();
        if (!n)
          throw Error(`${"title" === t ? "件名" : "本文"}を入力してください。`);
        if (n.length > r)
          throw Error(
            `${"title" === t ? "件名" : "本文"}は${r}文字以内で入力してください。`,
          );
        return n;
      }
      function s(e, t) {
        let r = String(e.get(t) ?? "").trim();
        if (!r) return null;
        let n = Number(r);
        if (!Number.isInteger(n)) throw Error(`${t}は整数で入力してください。`);
        return n;
      }
      async function f(e, t) {
        for (let r = 0; r < 100; r += 1) {
          let r = (0, d.Mu)(t);
          if (
            !(await e.couponIssue.findUnique({
              where: { couponCode: r },
              select: { id: !0 },
            }))
          )
            return r;
        }
        throw Error(
          "クーポンコードを発行できませんでした。もう一度お試しください。",
        );
      }
      async function m(e) {
        let t = await (0, i.Os)(["ADMIN"]);
        if (!t.organizationId) throw Error("店舗所属が設定されていません。");
        let r = c(e, "title", 60),
          n = c(e, "body", 500),
          deliveryMethod = String(e.get("deliveryMethod") ?? "app"),
          l = String(e.get("audienceGender") ?? "all");
        if (!["app", "email", "sms"].includes(deliveryMethod))
          throw Error("配信方法を確認してください。");
        if (!["all", "female", "male", "other"].includes(l))
          throw Error("性別フィルターを確認してください。");
        let d = s(e, "audienceMinAge"),
          m = s(e, "audienceMaxAge");
        if (null !== d && (d < 0 || d > 120))
          throw Error("年齢の下限を確認してください。");
        if (null !== m && (m < 0 || m > 120))
          throw Error("年齢の上限を確認してください。");
        if (null !== d && null !== m && d > m)
          throw Error("年齢範囲を確認してください。");
        let h = "on" === e.get("couponEnabled"),
          g = h ? String(e.get("couponTitle") ?? "").trim() : null,
          p = (h && String(e.get("couponDescription") ?? "").trim()) || null,
          w = h ? String(e.get("couponTargetMenu") ?? "").trim() : null,
          v = h ? s(e, "couponDiscountRate") : null,
          b = h ? s(e, "couponValidDays") : null,
          D = await u._.organization.findUnique({
            where: { id: t.organizationId },
            select: {
              couponMinimumDiscountRate: !0,
              couponMaximumDiscountRate: !0,
              couponMaxValidDays: !0,
            },
          });
        if (!D) throw Error("店舗情報が見つかりません。");
        if (h) {
          if (!g || g.length > 60)
            throw Error("クーポン名は1〜60文字で入力してください。");
          if (!w || w.length > 40)
            throw Error("対象メニューは1〜40文字で入力してください。");
          if (p && p.length > 200)
            throw Error("クーポン説明は200文字以内で入力してください。");
          if (
            null === v ||
            v < D.couponMinimumDiscountRate ||
            v > D.couponMaximumDiscountRate
          )
            throw Error(
              `割引率は${D.couponMinimumDiscountRate}〜${D.couponMaximumDiscountRate}%で入力してください。`,
            );
          if (null === b || b < 1 || b > D.couponMaxValidDays)
            throw Error(
              `有効期限は1〜${D.couponMaxValidDays}日で入力してください。`,
            );
        }
        let selectedCustomerIds = new Set(
            e
              .getAll("targetCustomerId")
              .map((e) => String(e).trim())
              .filter(Boolean),
          ),
          M = (
            await u._.customer.findMany({
              where: { organizationId: t.organizationId, deletedAt: null },
              select: {
                id: !0,
                name: !0,
                gender: !0,
                birthDate: !0,
                birthYear: !0,
                appUsers: {
                  where: { role: "CUSTOMER", active: !0 },
                  select: { email: !0 },
                  take: 1,
                },
                phoneIdentity: { select: { phoneE164: !0 } },
              },
            })
          ).filter((e) => {
            if (selectedCustomerIds.size > 0)
              return selectedCustomerIds.has(e.id);
            if (
              "all" !== l &&
              (function (e) {
                let t = (e ?? "").trim().toLowerCase();
                return /女性|female|woman|^f$/.test(t)
                  ? "female"
                  : /男性|male|man|^m$/.test(t)
                    ? "male"
                    : "other";
              })(e.gender) !== l
            )
              return !1;
            let t = (function (e, t = new Date()) {
              if (e.birthDate) {
                let r = t.getFullYear() - e.birthDate.getFullYear();
                return (
                  new Date(
                    t.getFullYear(),
                    e.birthDate.getMonth(),
                    e.birthDate.getDate(),
                  ).getTime() > t.getTime() && (r -= 1),
                  r
                );
              }
              return e.birthYear ? t.getFullYear() - e.birthYear : null;
            })(e);
            return (
              (null === d || (null !== t && !(t < d))) &&
              (null === m || (null !== t && !(t > m)))
            );
          });
        if (0 === M.length)
          throw Error(
            "条件に一致する顧客がいません。配信条件を変更してください。",
          );
        if ("email" === deliveryMethod) {
          let e = M.filter((e) => !e.appUsers[0]?.email).length;
          if (e > 0)
            throw Error(
              `対象者のうち${e}名に登録メールアドレスがありません。対象を選び直してください。`,
            );
        }
        if ("sms" === deliveryMethod) {
          let e = M.filter((e) => !e.phoneIdentity?.phoneE164).length;
          if (e > 0)
            throw Error(
              `対象者のうち${e}名に本人確認済み携帯番号がありません。対象を選び直してください。`,
            );
        }
        if ("email" === deliveryMethod || "sms" === deliveryMethod) {
          let e = String(process.env.SALON_PLAN_TIER ?? "take").toLowerCase(),
            r = {
              ume: { email: 500, sms: 100, label: "梅" },
              take: { email: 5000, sms: 1000, label: "竹" },
              matsu: {
                email: Number.MAX_SAFE_INTEGER,
                sms: 10000,
                label: "松",
              },
            }[e] ?? { email: 5000, sms: 1000, label: "竹" },
            n = "sms" === deliveryMethod ? "SMS" : "メール",
            a = "sms" === deliveryMethod ? r.sms : r.email,
            o = new Date(),
            i = new Date(o.getFullYear(), o.getMonth(), 1),
            l = await u._.contactLog.count({
              where: {
                channel: n,
                createdAt: { gte: i },
                customer: { organizationId: t.organizationId },
              },
            });
          if (l + M.length > a)
            throw Error(
              `${r.label}プランの${n}配信上限（${a.toLocaleString("ja-JP")}通／月）を超えるため送信できません。対象者を減らすか、プラン変更をご検討ください。`,
            );
        }
        let $ = new Date();
        await u._.$transaction(
          async (e) => {
            let a = await e.customerBroadcast.create({
              data: {
                organizationId: t.organizationId,
                createdByStaffId: t.userId,
                title: r,
                body: n,
                audienceGender: "all" === l ? null : l,
                audienceMinAge: d,
                audienceMaxAge: m,
                audienceMatchedCount: M.length,
                couponEnabled: h,
                couponTitle: g,
                couponDescription: p,
                couponTargetMenu: w,
                couponDiscountRate: v,
                couponValidDays: b,
                sentAt: $,
              },
            });
            for (let r of M) {
              let n = null;
              if (h && v && b && w) {
                let a = new Date($);
                a.setDate(a.getDate() + b);
                let o = await f(e, $);
                n = (
                  await e.couponIssue.create({
                    data: {
                      customerId: r.id,
                      staffUserId: t.userId,
                      couponCode: o,
                      customerName: r.name,
                      discountRate: v,
                      targetMenusJson: [w],
                      issuedAt: $,
                      expiresAt: a,
                      templateVersion: "coupon-v2",
                      status: "issued",
                    },
                    select: { id: !0 },
                  })
                ).id;
              }
              await e.customerBroadcastRecipient.create({
                data: {
                  broadcastId: a.id,
                  customerId: r.id,
                  couponIssueId: n,
                  deliveredAt: $,
                },
              });
            }
          },
          { timeout: 6e4 },
        );
        if ("app" !== deliveryMethod) {
          let e = `${n}${h ? "\n\nクーポンはお客様アプリでご確認ください。" : ""}\n\nSalon de Lien`,
            t = await Promise.allSettled(
              M.map((a) =>
                "email" === deliveryMethod
                  ? C({ to: a.appUsers[0].email, subject: r, body: e })
                  : I({ to: a.phoneIdentity.phoneE164, body: `${r}\n${e}` }),
              ),
            ),
            a = t.filter((e) => "rejected" === e.status).length;
          await u._.contactLog.createMany({
            data: M.map((e, r) => ({
              customerId: e.id,
              channel: "email" === deliveryMethod ? "メール" : "SMS",
              purpose: "一斉配信",
              message: `${r + 1}/${M.length} ${n}`.slice(0, 500),
              outcome: "fulfilled" === t[r].status ? "送信済み" : "送信失敗",
            })),
          });
          if (a > 0)
            throw Error(
              `${M.length - a}名へ送信し、${a}名への送信に失敗しました。配信履歴を確認してください。`,
            );
        }
        ((0, a.revalidatePath)("/admin/customers/messages"),
          (0, a.revalidatePath)("/u/home"),
          (0, a.revalidatePath)("/u/messages"),
          (0, a.revalidatePath)("/u/points"),
          (0, o.redirect)(
            `/admin/customers/messages?notice=sent&count=${M.length}`,
          ));
      }
      async function h() {
        let e = await (0, l.j)();
        if (!e) throw Error("ログインが必要です。");
        (await u._.customerBroadcastRecipient.updateMany({
          where: { customerId: e.customerId, readAt: null },
          data: { readAt: new Date() },
        }),
          (0, a.revalidatePath)("/u/home"),
          (0, a.revalidatePath)("/u/messages"));
      }
      async function Q() {
        await u._.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "AutomatedCouponRule" (
            "id" TEXT PRIMARY KEY,
            "organizationId" TEXT NOT NULL,
            "createdByStaffId" TEXT,
            "name" TEXT NOT NULL,
            "triggerType" TEXT NOT NULL,
            "offsetDays" INTEGER NOT NULL DEFAULT 0,
            "stylistName" TEXT,
            "phoneLastDigit" TEXT,
            "couponTitle" TEXT NOT NULL,
            "discountRate" INTEGER NOT NULL,
            "targetMenu" TEXT NOT NULL,
            "validDays" INTEGER NOT NULL,
            "active" BOOLEAN NOT NULL DEFAULT TRUE,
            "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);
        await u._.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "AutomatedCouponGrant" (
            "id" TEXT PRIMARY KEY,
            "ruleId" TEXT NOT NULL REFERENCES "AutomatedCouponRule"("id") ON DELETE CASCADE,
            "customerId" TEXT NOT NULL REFERENCES "Customer"("id") ON DELETE CASCADE,
            "triggerKey" TEXT NOT NULL,
            "couponIssueId" TEXT REFERENCES "CouponIssue"("id") ON DELETE SET NULL,
            "broadcastId" TEXT REFERENCES "CustomerBroadcast"("id") ON DELETE SET NULL,
            "grantedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE("ruleId", "customerId", "triggerKey")
          )
        `);
        await u._.$executeRawUnsafe(
          `CREATE INDEX IF NOT EXISTS "AutomatedCouponRule_org_active_idx" ON "AutomatedCouponRule"("organizationId", "active")`,
        );
      }
      async function q(e) {
        await Q();
        return u._.$queryRawUnsafe(
          `SELECT * FROM "AutomatedCouponRule" WHERE "organizationId" = $1 ORDER BY "createdAt" DESC`,
          e,
        );
      }
      const W = [
        ["1.学生カット", "カット", 50, 4000],
        ["2.前髪カット", "前髪カット", 10, 1100],
        ["3.カット（SB込）", "カット", 50, 4500],
        ["4.カット（SB込）＋眉カット", "カット・その他", 50, 5500],
        ["5.学生カット＋眉カット", "カット・その他", 60, 5000],
        ["6.カット＋炭酸スパ", "カット・ヘッドスパ", 60, 6000],
        ["7.カット＋リフレッシュスパ", "カット・ヘッドスパ", 90, 7000],
        ["8.カット＋リフトアップスパ", "カット・ヘッドスパ", 90, 9000],
        ["9.カット＋Aujuaスパ", "カット・ヘッドスパ", 90, 9900],
        [
          "10.カット＋インプライムトリートメント",
          "カット・トリートメント",
          60,
          7000,
        ],
        ["12.カット＋Aujuaトリートメント", "カット・トリートメント", 90, 9900],
        ["13.デザインカラー", "カラー", 90, 7700],
        ["14.リタッチカラー(２ヵ月以内)", "カラー", 90, 5500],
        ["15.デザインカラー(学生)", "カラー", 90, 7000],
        ["16.ブリーチ", "カラー", 120, 9900],
        ["17.マニキュアカラー", "カラー", 90, 7700],
        ["18.ホイルカラー（ハーフ）", "カラー", 60, 5000],
        ["19.ホイルカラー（フル）", "カラー", 90, 8000],
        ["20.学生対象：カット＋デザインカラー", "カット・カラー", 120, 9900],
        ["21.カット＋デザインカラー", "カット・カラー", 120, 11000],
        ["22.カット（SB込）＋マニキュアカラー", "カット・カラー", 120, 11000],
        [
          "23.カット＋デザインカラー＋インプライムトリートメント",
          "カット・カラー・トリートメント",
          120,
          12000,
        ],
        [
          "24.カット＋デザインカラー＋Aujuaトリートメント",
          "カット・カラー・トリートメント",
          150,
          14000,
        ],
        ["26.デザインパーマ", "パーマ", 90, 7700],
        ["27.デザインパーマ(学生)", "パーマ", 90, 7000],
        ["28.学生対象：カット＋デザインパーマ", "カット・パーマ", 120, 9900],
        ["29.カット＋デザインパーマ", "カット・パーマ", 120, 11000],
        [
          "31.カット＋デザインパーマ＋インプライムトリートメント",
          "カット・パーマ・トリートメント",
          120,
          12000,
        ],
        [
          "32.カット＋デザインパーマ＋Aujuaトリートメント",
          "カット・パーマ・トリートメント",
          150,
          14000,
        ],
        ["34.前髪ストレートパーマ", "縮毛矯正", 60, 6600],
        ["33.ストレートパーマ", "縮毛矯正", 120, 11000],
        ["35.カット＋前髪ストレートパーマ", "カット・縮毛矯正", 120, 11000],
        ["36.カット＋デザインストレートパーマ", "カット・縮毛矯正", 180, 15000],
        [
          "カット＋デザインストレートパーマ+インプライムトリートメント",
          "カット・縮毛矯正・トリートメント",
          180,
          17000,
        ],
        [
          "カット＋デザインストレートパーマ+Ａｕｊｕａトリートメント",
          "カット・縮毛矯正・トリートメント",
          180,
          18000,
        ],
        ["インプライムトリートメント", "トリートメント", 60, 4400],
        ["Aujuaトリートメント", "トリートメント", 50, 6600],
        ["43.炭酸スパ", "ヘッドスパ", 60, 4000],
        ["44.リフレッシュスパ", "ヘッドスパ", 60, 4200],
        ["45.リフトアップスパ", "ヘッドスパ", 60, 4500],
        ["47.Aujuaスパ", "ヘッドスパ", 60, 5500],
        ["46.頭皮環境改善スパ～育～", "ヘッドスパ", 60, 6600],
        ["48.リアンオリジナルヘッドスパ", "ヘッドスパ", 60, 7000],
        ["49.頭皮保護剤", "その他", 10, 1500],
        ["50.頭皮のデトックス", "その他", 10, 800],
        ["51.プチマッサージ", "その他", 10, 1100],
        ["52.眉カット", "その他", 10, 1100],
        [
          "53.～育　はぐくみ～スパ　デザインカット込み",
          "カット・ヘッドスパ",
          90,
          9000,
        ],
        [
          "54.[メンズ限定]トータルビューティーコース￥6600",
          "カット・ヘッドスパ・その他",
          60,
          6600,
        ],
        [
          "55.[メンズ限定]★トータルビューティーコース～極～　￥7700",
          "カット・ヘッドスパ・その他",
          90,
          7700,
        ],
        [
          "56.[メンズ限定]★トータルビューティーコース～響～￥8800",
          "カット・ヘッドスパ・その他",
          90,
          8800,
        ],
        ["998", "カット・その他", 30, 10000],
        ["フェイシャルエステ30分コース", "その他", 30, 3300],
        ["フェイシャルエステ40分コース", "その他", 40, 4400],
        ["フェイシャルエステ〜極美〜", "その他", 60, 6000],
      ];
      async function O() {
        await u._.$executeRawUnsafe(
          `CREATE TABLE IF NOT EXISTS "SalonMenu" ("id" TEXT PRIMARY KEY,"organizationId" TEXT NOT NULL,"name" TEXT NOT NULL,"category" TEXT NOT NULL,"description" TEXT,"durationMinutes" INTEGER NOT NULL,"priceYen" INTEGER NOT NULL,"source" TEXT NOT NULL DEFAULT 'manual',"sourceKey" TEXT,"active" BOOLEAN NOT NULL DEFAULT TRUE,"sortOrder" INTEGER NOT NULL DEFAULT 0,"createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),"updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE("organizationId","name"))`,
        );
        await u._.$executeRawUnsafe(
          `CREATE INDEX IF NOT EXISTS "SalonMenu_org_active_idx" ON "SalonMenu"("organizationId","active","sortOrder")`,
        );
      }
      async function G(e) {
        await O();
        for (let t = 0; t < W.length; t++) {
          let [r, n, a, o] = W[t];
          await u._.$executeRawUnsafe(
            `INSERT INTO "SalonMenu" ("id","organizationId","name","category","durationMinutes","priceYen","source","sourceKey","sortOrder") VALUES ($1,$2,$3,$4,$5,$6,'kanzashi',$7,$8) ON CONFLICT ("organizationId","name") DO NOTHING`,
            `menu-${e}-${t}`,
            e,
            r,
            n,
            a,
            o,
            r,
            t,
          );
        }
        return u._.$queryRawUnsafe(
          `SELECT * FROM "SalonMenu" WHERE "organizationId"=$1 ORDER BY "active" DESC,"sortOrder","name"`,
          e,
        );
      }
      async function H(e) {
        let t = await (0, i.Os)(["ADMIN", "STAFF"]);
        if (!t.organizationId) throw Error("店舗所属が設定されていません。");
        await O();
        let r = String(e.get("menuName") ?? "").trim(),
          n = String(e.get("menuCategory") ?? "").trim(),
          d = String(e.get("menuDescription") ?? "").trim() || null,
          c = Number(e.get("menuDuration") ?? 0),
          s = Number(e.get("menuPrice") ?? 0);
        if (!r || r.length > 140 || !n || n.length > 80)
          throw Error("メニュー名とカテゴリを確認してください。");
        if (
          !Number.isInteger(c) ||
          c < 1 ||
          c > 1440 ||
          !Number.isInteger(s) ||
          s < 0 ||
          s > 1e7
        )
          throw Error("施術時間と価格を確認してください。");
        await u._.$executeRawUnsafe(
          `INSERT INTO "SalonMenu" ("id","organizationId","name","category","description","durationMinutes","priceYen","source","sortOrder") VALUES ($1,$2,$3,$4,$5,$6,$7,'manual',9999)`,
          `menu-manual-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          t.organizationId,
          r,
          n,
          d,
          c,
          s,
        );
        (0, a.revalidatePath)("/admin/products");
        (0, a.revalidatePath)("/admin/customers/messages");
        (0, o.redirect)("/admin/products?section=menus&notice=menu-created");
      }
      async function J(e) {
        let t = await (0, i.Os)(["ADMIN"]);
        if (!t.organizationId) throw Error("店舗所属が設定されていません。");
        await Q();
        let r = String(e.get("ruleName") ?? "").trim(),
          n = String(e.get("triggerType") ?? ""),
          x = Number(e.get("offsetDays") ?? 0),
          l = String(e.get("stylistName") ?? "").trim() || null,
          d = String(e.get("phoneLastDigit") ?? "").trim() || null,
          c = String(e.get("automatedCouponTitle") ?? "").trim(),
          s = Number(e.get("automatedDiscountRate") ?? 0),
          f = String(e.get("automatedTargetMenu") ?? "").trim(),
          p = Number(e.get("automatedValidDays") ?? 0),
          v = [
            "birthday",
            "welcome_back",
            "frequency",
            "review",
            "stylist",
            "phone_last_digit",
          ];
        if (!r || r.length > 60)
          throw Error("設定名は1〜60文字で入力してください。");
        if (!v.includes(n))
          throw Error("自動クーポンの種類を確認してください。");
        if (!Number.isInteger(x) || x < 0 || x > 730)
          throw Error("基準日からの日数は0〜730日で入力してください。");
        if ("stylist" === n && !l)
          throw Error("対象スタイリストを入力してください。");
        if ("phone_last_digit" === n && !/^[0-9]$/.test(d ?? ""))
          throw Error("電話番号の下一桁は0〜9で入力してください。");
        if (!c || c.length > 60 || !f || f.length > 40)
          throw Error("クーポン名と対象メニューを入力してください。");
        if (!Number.isInteger(s) || s < 1 || s > 100)
          throw Error("割引率は1〜100%で入力してください。");
        if (!Number.isInteger(p) || p < 1 || p > 365)
          throw Error("有効日数は1〜365日で入力してください。");
        let b = `auto-rule-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        await u._.$executeRawUnsafe(
          `INSERT INTO "AutomatedCouponRule" ("id","organizationId","createdByStaffId","name","triggerType","offsetDays","stylistName","phoneLastDigit","couponTitle","discountRate","targetMenu","validDays") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          b,
          t.organizationId,
          t.userId,
          r,
          n,
          x,
          l,
          d,
          c,
          s,
          f,
          p,
        );
        (0, a.revalidatePath)("/admin/customers/messages");
        (0, o.redirect)("/admin/customers/messages?notice=rule-saved");
      }
      async function K(e) {
        let t = await (0, i.Os)(["ADMIN"]);
        if (!t.organizationId) throw Error("店舗所属が設定されていません。");
        await Q();
        let r = String(e.get("ruleId") ?? ""),
          n = "true" === String(e.get("nextActive") ?? "");
        await u._.$executeRawUnsafe(
          `UPDATE "AutomatedCouponRule" SET "active"=$1,"updatedAt"=NOW() WHERE "id"=$2 AND "organizationId"=$3`,
          n,
          r,
          t.organizationId,
        );
        (0, a.revalidatePath)("/admin/customers/messages");
      }
      ((0, r(40618).h)([m, h, J, K, H]),
        (0, n.j)("837214f73a30a9ce7ed38314411980a7196205a3", m),
        (0, n.j)("f2dd87299610fbf0cb12f2b8f4d981ec8c712332", h),
        (0, n.j)("a41fb53b36f7420a9081017c2baf65a5e26220d1", J),
        (0, n.j)("bc0e05a131115e930c08d60a03ce331f03abf050", K),
        (0, n.j)("6c0e05a131115e930c08d60a03ce331f03abf051", H));
    },
    99001: (e) => {
      e.exports = require("@aws-sdk/client-sns");
    },
    94464: (e, t, r) => {
      "use strict";
      r.d(t, { E_: () => d, IG: () => l, MO: () => c, NY: () => u });
      let n = {
          0: "0001101",
          1: "0011001",
          2: "0010011",
          3: "0111101",
          4: "0100011",
          5: "0110001",
          6: "0101111",
          7: "0111011",
          8: "0110111",
          9: "0001011",
        },
        a = {
          0: "0100111",
          1: "0110011",
          2: "0011011",
          3: "0100001",
          4: "0011101",
          5: "0111001",
          6: "0000101",
          7: "0010001",
          8: "0001001",
          9: "0010111",
        },
        o = {
          0: "1110010",
          1: "1100110",
          2: "1101100",
          3: "1000010",
          4: "1011100",
          5: "1001110",
          6: "1010000",
          7: "1000100",
          8: "1001000",
          9: "1110100",
        },
        i = {
          0: ["odd", "odd", "odd", "odd", "odd", "odd"],
          1: ["odd", "odd", "even", "odd", "even", "even"],
          2: ["odd", "odd", "even", "even", "odd", "even"],
          3: ["odd", "odd", "even", "even", "even", "odd"],
          4: ["odd", "even", "odd", "odd", "even", "even"],
          5: ["odd", "even", "even", "odd", "odd", "even"],
          6: ["odd", "even", "even", "even", "odd", "odd"],
          7: ["odd", "even", "odd", "even", "odd", "even"],
          8: ["odd", "even", "odd", "even", "even", "odd"],
          9: ["odd", "even", "even", "odd", "even", "odd"],
        };
      function l(e) {
        return `${e}${(function (e) {
          if (!/^\d{12}$/.test(e))
            throw Error(
              "JANコードは先頭12桁の数字からチェックデジットを計算します。",
            );
          return String(
            (10 -
              (e
                .split("")
                .reduce((e, t, r) => e + Number(t) * (r % 2 == 0 ? 1 : 3), 0) %
                10)) %
              10,
          );
        })(e)}`;
      }
      function d(e) {
        let t = e.replace(/\D/g, "");
        return 13 === t.length && l(t.slice(0, 12)) === t;
      }
      function u(e) {
        let t = (function (e) {
            let t = e.replace(/\D/g, "");
            return 13 === t.length && d(t)
              ? t
              : 12 === t.length
                ? l(t)
                : (function (e) {
                    let t = e.trim().toUpperCase() || "SALON-DE-LIEN";
                    return l(
                      `45${(function (e, t) {
                        let r = 2166136261;
                        for (let t = 0; t < e.length; t += 1)
                          ((r ^= e.charCodeAt(t)),
                            (r = Math.imul(r, 16777619) >>> 0));
                        let n = r || 1,
                          a = "";
                        for (; a.length < 10;)
                          a += String(
                            (n = (Math.imul(n, 1664525) + 1013904223) >>> 0) %
                              10,
                          );
                        return a.slice(0, 10);
                      })(t, 10)}`,
                    );
                  })(e);
          })(e),
          r = t[0],
          u = t.slice(1, 7).split(""),
          c = t.slice(7).split(""),
          f = u.flatMap((e, t) => s(("odd" === i[r][t] ? n : a)[e])),
          m = c.flatMap((e) => s(o[e]));
        return {
          payload: t,
          modules: [...s("101"), ...f, ...s("01010"), ...m, ...s("101")],
        };
      }
      function c(e, t, r = 11) {
        let n = e.modules.length + 2 * r,
          a = t.w / n,
          o = [],
          i = null;
        return (
          e.modules.forEach((n, l) => {
            if (
              (n && null === i && (i = l),
              (!n || l === e.modules.length - 1) && null !== i)
            ) {
              let d = n && l === e.modules.length - 1 ? l + 1 : l;
              (o.push({ x: t.x + (i + r) * a, y: t.y, w: (d - i) * a, h: t.h }),
                (i = null));
            }
          }),
          { background: t, darkRects: o }
        );
      }
      function s(e) {
        return e.split("").map((e) => "1" === e);
      }
    },
    14429: (e, t, r) => {
      "use strict";
      r.d(t, { $r: () => d, Mu: () => i, v4: () => l });
      var n = r(94464);
      let a = /^\d{13}$/;
      function o() {
        let e = globalThis.crypto;
        if (e?.getRandomValues) {
          let t = new Uint32Array(1);
          return (e.getRandomValues(t), String(t[0] % 10));
        }
        return String(Math.floor(10 * Math.random()));
      }
      function i(e = new Date()) {
        let t = `45${(function (e) {
          let t = String(e.getFullYear()).slice(-2),
            r = String(e.getMonth() + 1).padStart(2, "0"),
            n = String(e.getDate()).padStart(2, "0");
          return `${t}${r}${n}`;
        })(e)}${Array.from({ length: 4 }, o).join("")}`;
        return (0, n.IG)(t);
      }
      function l(e) {
        let t = e.replace(/\D/g, "");
        return 12 === t.length ? (0, n.IG)(t) : t;
      }
      function d(e) {
        let t = l(e);
        return a.test(t) && (0, n.E_)(t);
      }
    },
    40430: (e, t, r) => {
      "use strict";
      r.d(t, { Z: () => u });
      var n = r(71159);
      let a = (...e) =>
          e
            .filter((e, t, r) => !!e && "" !== e.trim() && r.indexOf(e) === t)
            .join(" ")
            .trim(),
        o = (e) => e.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(),
        i = (e) =>
          e.replace(/^([A-Z])|[\s-_]+(\w)/g, (e, t, r) =>
            r ? r.toUpperCase() : t.toLowerCase(),
          ),
        l = (e) => {
          let t = i(e);
          return t.charAt(0).toUpperCase() + t.slice(1);
        },
        d = (0, r(68570).createProxy)(
          String.raw`/app/node_modules/lucide-react/dist/esm/Icon.mjs#default`,
        ),
        u = (e, t) => {
          let r = (0, n.forwardRef)(({ className: r, ...i }, u) =>
            (0, n.createElement)(d, {
              ref: u,
              iconNode: t,
              className: a(`lucide-${o(l(e))}`, `lucide-${e}`, r),
              ...i,
            }),
          );
          return ((r.displayName = l(e)), r);
        };
    },
    97867: (e, t, r) => {
      "use strict";
      r.d(t, { Z: () => n });
      let n = (0, r(40430).Z)("ticket-percent", [
        [
          "path",
          {
            d: "M2 9a3 3 0 1 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 1 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z",
            key: "1l48ns",
          },
        ],
        ["path", { d: "M9 9h.01", key: "1q5me6" }],
        ["path", { d: "m15 9-6 6", key: "1uzhvr" }],
        ["path", { d: "M15 15h.01", key: "lqbp3k" }],
      ]);
    },
  }));
