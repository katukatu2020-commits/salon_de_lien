import Link from "next/link";
import { CheckCircle2, Filter, Megaphone, Send, TicketPercent, UsersRound } from "lucide-react";
import { CustomerWorkspaceTabs } from "@/components/customers/customer-workspace-tabs";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { LienCard, PageHeader, StatusBadge } from "@/components/lien/lien-ui";
import { createCustomerBroadcastAction } from "@/lib/actions/customer-broadcast-actions";
import { requireBackofficeSession } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = { searchParams?: { notice?: string; count?: string } };

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(value);
}

function audienceLabel(broadcast: { audienceGender: string | null; audienceMinAge: number | null; audienceMaxAge: number | null }) {
  const gender = broadcast.audienceGender === "female" ? "女性" : broadcast.audienceGender === "male" ? "男性" : broadcast.audienceGender === "other" ? "その他・未設定" : "全性別";
  const age = broadcast.audienceMinAge !== null || broadcast.audienceMaxAge !== null
    ? `${broadcast.audienceMinAge ?? 0}〜${broadcast.audienceMaxAge ?? 120}歳`
    : "全年齢";
  return `${gender}・${age}`;
}

export default async function CustomerMessagesPage({ searchParams }: PageProps) {
  const session = await requireBackofficeSession(["ADMIN"]);
  if (!session.organizationId) return null;

  const [organization, customers, broadcasts] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: session.organizationId },
      select: {
        defaultCouponDiscountRate: true,
        couponDefaultValidDays: true,
        couponMaxValidDays: true,
        couponMinimumDiscountRate: true,
        couponMaximumDiscountRate: true
      }
    }),
    prisma.customer.findMany({
      where: { organizationId: session.organizationId, deletedAt: null },
      select: { gender: true, birthDate: true, birthYear: true }
    }),
    prisma.customerBroadcast.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { sentAt: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        body: true,
        audienceGender: true,
        audienceMinAge: true,
        audienceMaxAge: true,
        audienceMatchedCount: true,
        couponEnabled: true,
        couponTitle: true,
        couponDiscountRate: true,
        couponValidDays: true,
        sentAt: true
      }
    })
  ]);
  if (!organization) return null;

  const femaleCount = customers.filter((customer) => /女性|female|woman|^f$/i.test(customer.gender ?? "")).length;
  const maleCount = customers.filter((customer) => /男性|male|man|^m$/i.test(customer.gender ?? "") && !/female|woman/i.test(customer.gender ?? "")).length;
  const ageKnownCount = customers.filter((customer) => customer.birthDate || customer.birthYear).length;
  const sentCount = Number(searchParams?.count ?? 0);

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6">
      <CustomerWorkspaceTabs active="messages" />
      <PageHeader
        eyebrow={<span className="inline-flex items-center gap-2"><Megaphone className="h-4 w-4" />Customer message</span>}
        title="顧客へのお知らせ・クーポン配信"
        description="性別と年齢で対象を絞り、お客様アプリの受信ボックスへメッセージを届けます。クーポンを付けると対象者ごとに個別コードを発行します。"
        breadcrumb={<Link href="/admin/customers" className="hover:text-lien-primary">顧客・ポイント / 配信</Link>}
      />

      {searchParams?.notice === "sent" ? <div role="status" className="flex items-center gap-3 rounded-[18px] border border-[#cbdcc8] bg-[#eef5ed] px-4 py-3 text-sm font-semibold text-[#405d41]"><CheckCircle2 className="h-5 w-5" />{sentCount.toLocaleString("ja-JP")}名へ配信しました。</div> : null}

      <section className="grid gap-3 sm:grid-cols-4">
        {[['登録顧客', customers.length], ['女性', femaleCount], ['男性', maleCount], ['年齢登録済み', ageKnownCount]].map(([label, value]) => <div key={String(label)} className="rounded-[18px] border border-lien bg-white p-4 shadow-lien-sm"><p className="text-xs font-semibold text-lien-muted">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{Number(value).toLocaleString("ja-JP")}<span className="ml-1 text-xs">名</span></p></div>)}
      </section>

      <form action={createCustomerBroadcastAction} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <LienCard>
          <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-lien-soft text-lien-primary"><Megaphone className="h-5 w-5" /></span><div><h2 className="text-lg font-semibold">配信内容</h2><p className="mt-1 text-sm leading-6 text-lien-muted">お客様アプリ内に表示する件名と本文です。</p></div></div>
          <div className="mt-5 grid gap-4">
            <label className="grid gap-2 text-sm font-semibold">件名<input className="lien-input" name="title" maxLength={60} placeholder="例: 秋のヘアケアのお知らせ" required /></label>
            <label className="grid gap-2 text-sm font-semibold">本文<textarea className="lien-input min-h-36 resize-y py-3 leading-7" name="body" maxLength={500} placeholder="お客様へ伝えたい内容を入力してください。" required /></label>
          </div>
        </LienCard>

        <LienCard>
          <div className="flex items-start gap-3"><Filter className="mt-0.5 h-5 w-5 shrink-0 text-lien-primary" /><div><h2 className="font-semibold">配信対象</h2><p className="mt-1 text-xs leading-5 text-lien-muted">未設定の年齢は年齢指定時に対象外です。</p></div></div>
          <div className="mt-4 grid gap-4">
            <label className="grid gap-2 text-sm font-semibold">性別<select className="lien-select" name="audienceGender" defaultValue="all"><option value="all">すべて</option><option value="female">女性</option><option value="male">男性</option><option value="other">その他・未設定</option></select></label>
            <div className="grid grid-cols-2 gap-3"><label className="grid gap-2 text-sm font-semibold">年齢 下限<input className="lien-input tabular-nums" name="audienceMinAge" type="number" min="0" max="120" placeholder="指定なし" /></label><label className="grid gap-2 text-sm font-semibold">年齢 上限<input className="lien-input tabular-nums" name="audienceMaxAge" type="number" min="0" max="120" placeholder="指定なし" /></label></div>
          </div>
        </LienCard>

        <LienCard className="lg:col-span-2">
          <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-[16px] border border-[#e8cfc4] bg-[#fff7f3] px-4 py-3 text-sm font-semibold"><input name="couponEnabled" type="checkbox" />クーポンも一緒に配布する</label>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <label className="grid gap-2 text-sm font-semibold sm:col-span-2">クーポン名<input className="lien-input" name="couponTitle" maxLength={60} placeholder="例: カラーケア限定クーポン" /></label>
            <label className="grid gap-2 text-sm font-semibold">対象メニュー<input className="lien-input" name="couponTargetMenu" maxLength={40} placeholder="例: トリートメント" /></label>
            <label className="grid gap-2 text-sm font-semibold">割引率<span className="flex items-center gap-2"><input className="lien-input tabular-nums" name="couponDiscountRate" type="number" min={organization.couponMinimumDiscountRate} max={organization.couponMaximumDiscountRate} defaultValue={organization.defaultCouponDiscountRate} /><span>%</span></span></label>
            <label className="grid gap-2 text-sm font-semibold">有効日数<span className="flex items-center gap-2"><input className="lien-input tabular-nums" name="couponValidDays" type="number" min="1" max={organization.couponMaxValidDays} defaultValue={organization.couponDefaultValidDays} /><span>日</span></span></label>
            <label className="grid gap-2 text-sm font-semibold sm:col-span-2 lg:col-span-5">クーポン説明<textarea className="lien-input min-h-20 resize-y py-3" name="couponDescription" maxLength={200} placeholder="利用条件やおすすめ理由を入力できます。" /></label>
          </div>
          <p className="mt-3 text-xs leading-5 text-lien-muted"><TicketPercent className="mr-1 inline h-4 w-4" />クーポンを付けない場合、クーポン欄は未入力のままで構いません。</p>
        </LienCard>

        <div className="lg:col-span-2 flex justify-end">
          <ConfirmSubmitButton
            className="lien-button-primary min-h-12 w-full px-6 sm:w-auto"
            message="指定した条件の顧客へ配信します。内容と配信条件を確認しましたか？"
            pendingText="配信中..."
          >
            <Send className="h-4 w-4" />対象顧客へ配信する
          </ConfirmSubmitButton>
        </div>
      </form>

      <LienCard className="p-0 sm:p-0">
        <div className="flex items-center justify-between border-b border-lien p-5 sm:p-6"><div><h2 className="text-lg font-semibold">配信履歴</h2><p className="mt-1 text-sm text-lien-muted">直近20件</p></div><UsersRound className="h-5 w-5 text-lien-primary" /></div>
        {broadcasts.length > 0 ? <div className="divide-y divide-lien">{broadcasts.map((broadcast) => <article key={broadcast.id} className="grid gap-3 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-6"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{broadcast.title}</h3>{broadcast.couponEnabled ? <StatusBadge tone="warning">クーポン付き</StatusBadge> : null}</div><p className="mt-2 line-clamp-2 text-sm leading-6 text-lien-muted">{broadcast.body}</p><p className="mt-2 text-xs text-lien-muted">{audienceLabel(broadcast)}・{formatDateTime(broadcast.sentAt)}</p>{broadcast.couponEnabled ? <p className="mt-2 text-xs font-semibold text-lien-primary">{broadcast.couponTitle} / {broadcast.couponDiscountRate}%OFF / {broadcast.couponValidDays}日</p> : null}</div><div className="flex items-center gap-2 sm:flex-col sm:items-end"><span className="text-2xl font-semibold tabular-nums">{broadcast.audienceMatchedCount}</span><span className="text-xs text-lien-muted">配信</span></div></article>)}</div> : <p className="p-8 text-center text-sm text-lien-muted">配信履歴はまだありません。</p>}
      </LienCard>
    </div>
  );
}
