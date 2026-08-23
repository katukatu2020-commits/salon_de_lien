import Link from "next/link";
import { redirect } from "next/navigation";
import { Boxes, CheckCircle2, Gift, Percent, ReceiptJapaneseYen, Save, TicketPercent, Trophy, WalletCards } from "lucide-react";
import { LienCard, PageHeader, StatusBadge } from "@/components/lien/lien-ui";
import { StoreIdentityCard } from "@/components/settings/store-identity-card";
import { updateStoreOperationalSettingsAction } from "@/lib/actions/store-settings-actions";
import { requireBackofficeSession } from "@/lib/auth/authorization";
import { OWNER_CONFIGURABLE_POINT_RULE_KEYS, POINT_RULE_DEFINITIONS } from "@/lib/points/point-service";
import { organizationPublicCode } from "@/lib/organizations/public-code";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type StoreSettingsPageProps = { searchParams?: { notice?: string } };

function NumberField({ name, label, value, min, max, unit }: { name: string; label: string; value: number; min: number; max: number; unit: string }) {
  return (
    <label className="grid gap-2 text-sm font-semibold">
      <span>{label}</span>
      <span className="flex items-center gap-2">
        <input className="lien-input min-w-0 tabular-nums" name={name} type="number" min={min} max={max} step="1" defaultValue={value} required />
        <span className="shrink-0 text-xs text-[color:var(--lien-muted)]">{unit}</span>
      </span>
    </label>
  );
}

export default async function StoreSettingsPage({ searchParams }: StoreSettingsPageProps) {
  const session = await requireBackofficeSession(["ADMIN", "STAFF"]);
  // Store operational settings remain owner-only. Shared store accounts are
  // redirected to their account page instead of rendering an unhandled 403.
  if (session.role !== "ADMIN") redirect("/admin/account?notice=owner-required");
  if (!session.organizationId) return null;

  const [organization, pointRules] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: session.organizationId },
      select: {
        name: true,
        publicCode: true,
        taxRate: true,
        defaultCouponDiscountRate: true,
        referralReferrerDiscountRate: true,
        referralReferredDiscountRate: true,
        pointDefaultValidDays: true,
        pointMinimumRedeem: true,
        pointMaxRedemptionPercent: true,
        reviewPrizeFirstPoints: true,
        reviewPrizeFirstRate: true,
        reviewPrizeSecondPoints: true,
        reviewPrizeSecondRate: true,
        reviewPrizeThirdPoints: true,
        reviewPrizeThirdRate: true,
        couponDefaultValidDays: true,
        couponMaxValidDays: true,
        couponMinimumDiscountRate: true,
        couponMaximumDiscountRate: true,
        products: {
          where: { active: true },
          orderBy: [{ stockQuantity: "asc" }, { manufacturerName: "asc" }, { name: "asc" }],
          select: { id: true, manufacturerName: true, name: true, category: true, stockQuantity: true }
        }
      }
    }),
    prisma.pointRule.findMany({ where: { key: { in: [...OWNER_CONFIGURABLE_POINT_RULE_KEYS] } } })
  ]);
  if (!organization) return null;
  const publicCode = organization.publicCode ?? organizationPublicCode(session.organizationId);
  if (!organization.publicCode) {
    await prisma.organization.update({
      where: { id: session.organizationId },
      data: { publicCode }
    });
  }
  const pointRuleMap = new Map(pointRules.map((rule) => [rule.key, rule]));

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6">
      <PageHeader
        eyebrow={<span className="inline-flex items-center gap-2"><ReceiptJapaneseYen className="h-3.5 w-3.5" />Owner settings</span>}
        title="店舗運用設定"
        description="会計、ポイント、抽選特典、クーポンと在庫を一か所で管理します。変更後に発生する処理から新しい設定が適用されます。"
        breadcrumb={<Link href="/admin/customers" className="hover:text-[color:var(--lien-primary)]">管理画面 / 店舗運用設定</Link>}
      />

      <StoreIdentityCard storeName={organization.name} publicCode={publicCode} />

      {searchParams?.notice === "saved" ? (
        <div role="status" className="flex items-center gap-3 rounded-[18px] border border-[#cbdcc8] bg-[#eef5ed] px-4 py-3 text-sm font-semibold text-[#405d41]">
          <CheckCircle2 className="h-5 w-5 shrink-0" />店舗運用設定を保存しました。
        </div>
      ) : null}

      <form action={updateStoreOperationalSettingsAction} className="grid gap-6">
        <section className="grid gap-6 lg:grid-cols-2">
          <LienCard>
            <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-lien-soft text-lien-primary"><Percent className="h-5 w-5" /></span><div><h2 className="text-lg font-semibold">会計</h2><p className="mt-1 text-sm leading-6 text-lien-muted">税込会計に含まれる消費税額を計算します。</p></div></div>
            <div className="mt-5 max-w-48"><NumberField name="taxRate" label="消費税率" value={organization.taxRate} min={0} max={30} unit="%" /></div>
          </LienCard>

          <LienCard>
            <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#edf5ed] text-[#466349]"><WalletCards className="h-5 w-5" /></span><div><h2 className="text-lg font-semibold">ポイント利用条件</h2><p className="mt-1 text-sm leading-6 text-lien-muted">手動・キャンペーン付与の期限と、会計で利用できる範囲です。</p></div></div>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <NumberField name="pointDefaultValidDays" label="標準有効期限" value={organization.pointDefaultValidDays} min={1} max={365} unit="日" />
              <NumberField name="pointMinimumRedeem" label="最低利用" value={organization.pointMinimumRedeem} min={1} max={100000} unit="pt" />
              <NumberField name="pointMaxRedemptionPercent" label="会計利用上限" value={organization.pointMaxRedemptionPercent} min={1} max={100} unit="%" />
            </div>
          </LienCard>
        </section>

        <LienCard className="p-0 sm:p-0">
          <div className="border-b border-lien p-5 sm:p-6"><div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#f6efe6] text-lien-primary"><Gift className="h-5 w-5" /></span><div><h2 className="text-lg font-semibold">ポイント付与ルール</h2><p className="mt-1 text-sm leading-6 text-lien-muted">行動ごとの付与数、有効期限、利用可否を設定します。</p></div></div></div>
          <div className="divide-y divide-lien">
            {OWNER_CONFIGURABLE_POINT_RULE_KEYS.map((key) => {
              const definition = POINT_RULE_DEFINITIONS[key];
              const rule = pointRuleMap.get(key);
              return (
                <div key={key} className="grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_9rem_9rem_7rem] sm:items-end sm:px-6">
                  <div><p className="text-sm font-semibold">{definition.label}</p><p className="mt-1 text-xs text-lien-muted">{definition.eventType}</p></div>
                  <NumberField name={`pointRule:${key}:points`} label="付与" value={rule?.points ?? definition.points} min={0} max={100000} unit="pt" />
                  <NumberField name={`pointRule:${key}:validDays`} label="有効期限" value={rule?.validDays ?? definition.validDays} min={1} max={365} unit="日" />
                  <label className="flex min-h-12 items-center gap-2 rounded-xl border border-lien bg-white px-3 text-sm font-semibold"><input name={`pointRule:${key}:active`} type="checkbox" defaultChecked={rule?.active ?? true} />有効</label>
                </div>
              );
            })}
          </div>
        </LienCard>

        <LienCard>
          <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#fff4e4] text-[#8a5b1b]"><Trophy className="h-5 w-5" /></span><div><h2 className="text-lg font-semibold">アンケート抽選</h2><p className="mt-1 text-sm leading-6 text-lien-muted">3つの確率は合計100%にしてください。</p></div></div>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {[
              ["First", "1等", organization.reviewPrizeFirstPoints, organization.reviewPrizeFirstRate],
              ["Second", "2等", organization.reviewPrizeSecondPoints, organization.reviewPrizeSecondRate],
              ["Third", "3等", organization.reviewPrizeThirdPoints, organization.reviewPrizeThirdRate]
            ].map(([key, label, points, rate]) => (
              <div key={String(key)} className="grid grid-cols-2 gap-3 rounded-[18px] border border-lien bg-lien-soft p-4">
                <NumberField name={`reviewPrize${key}Points`} label={`${label}ポイント`} value={Number(points)} min={1} max={100000} unit="pt" />
                <NumberField name={`reviewPrize${key}Rate`} label="確率" value={Number(rate)} min={0} max={100} unit="%" />
              </div>
            ))}
          </div>
        </LienCard>

        <LienCard>
          <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#fbecea] text-lien-primary"><TicketPercent className="h-5 w-5" /></span><div><h2 className="text-lg font-semibold">クーポン</h2><p className="mt-1 text-sm leading-6 text-lien-muted">個別配信と限定チラシで使う割引率・期限、友達紹介の割引率です。</p></div></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <NumberField name="defaultCouponDiscountRate" label="限定クーポン初期値" value={organization.defaultCouponDiscountRate} min={1} max={90} unit="%" />
            <NumberField name="couponMinimumDiscountRate" label="割引率の最小" value={organization.couponMinimumDiscountRate} min={1} max={90} unit="%" />
            <NumberField name="couponMaximumDiscountRate" label="割引率の最大" value={organization.couponMaximumDiscountRate} min={1} max={90} unit="%" />
            <NumberField name="couponDefaultValidDays" label="標準有効期限" value={organization.couponDefaultValidDays} min={1} max={365} unit="日" />
            <NumberField name="couponMaxValidDays" label="有効期限の上限" value={organization.couponMaxValidDays} min={1} max={365} unit="日" />
            <NumberField name="referralReferrerDiscountRate" label="紹介した方" value={organization.referralReferrerDiscountRate} min={1} max={50} unit="%" />
            <NumberField name="referralReferredDiscountRate" label="紹介された方" value={organization.referralReferredDiscountRate} min={1} max={50} unit="%" />
          </div>
        </LienCard>

        <LienCard className="p-0 sm:p-0">
          <div className="flex flex-col gap-3 border-b border-lien p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#edf5ed] text-[#466349]"><Boxes className="h-5 w-5" /></span><div><h2 className="text-lg font-semibold">商品在庫</h2><p className="mt-1 text-sm leading-6 text-lien-muted">入荷・棚卸し後の実数を修正できます。</p></div></div><StatusBadge tone="soft">{organization.products.length}商品</StatusBadge></div>
          {organization.products.length > 0 ? <div className="divide-y divide-lien">{organization.products.map((product) => <div key={product.id} className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_10rem] sm:items-center sm:px-6"><div className="min-w-0"><p className="text-xs font-semibold text-lien-primary">{product.manufacturerName}</p><p className="mt-1 text-sm font-semibold">{product.name}</p><p className="mt-1 text-xs text-lien-muted">{product.category ?? "その他"}</p></div><NumberField name={`stockQuantity:${product.id}`} label="現在庫数" value={product.stockQuantity} min={0} max={100000} unit="個" /></div>)}</div> : <p className="p-6 text-sm text-lien-muted">商品棚に登録済みの商品がありません。</p>}
        </LienCard>

        <div className="sticky bottom-[calc(1rem+env(safe-area-inset-bottom))] z-20 flex justify-end rounded-[20px] border border-lien bg-white/95 p-3 shadow-lien backdrop-blur"><button type="submit" className="lien-button-primary min-h-12 w-full px-6 sm:w-auto"><Save className="h-4 w-4" />設定を保存</button></div>
      </form>
    </div>
  );
}
