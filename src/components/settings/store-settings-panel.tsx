import Link from "next/link";
import { Building2, CalendarSync, Clock3, MapPin, Star, UsersRound } from "lucide-react";
import { CopyTextButton } from "@/components/copy-text-button";
import { LienCard, PageHeader } from "@/components/lien/lien-ui";
import { StoreIconUploader } from "@/components/settings/store-icon-uploader";
import { SALON_STAFF } from "@/lib/salon/staff";

type StoreSettingsPanelProps = {
  storeName: string;
  gmailEmail: string | null;
  latestGmailImportedAt: Date | null;
  googleReviewUrl: string | null;
  iconImageUrl: string | null;
};

function maskedEmail(value: string | null) {
  if (!value) return "未設定";
  const [local, domain] = value.split("@");
  if (!domain) return value;
  const visible = local.slice(0, Math.min(4, local.length));
  return `${visible}${"*".repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}

function formatDateTime(value: Date | null) {
  if (!value) return "未取込";
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b border-[color:var(--lien-border)] py-3 last:border-0 sm:grid-cols-[8rem_1fr] sm:items-start sm:gap-5">
      <dt className="text-xs font-semibold text-[color:var(--lien-muted)]">{label}</dt>
      <dd className="text-sm font-medium leading-6 text-[color:var(--lien-ink)]">{value}</dd>
    </div>
  );
}

export function StoreSettingsPanel({
  storeName,
  gmailEmail,
  latestGmailImportedAt,
  googleReviewUrl,
  iconImageUrl
}: StoreSettingsPanelProps) {
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="店舗設定"
        title="店舗の基本設定"
        description="日々の店舗運用に必要な基本情報と連携状況だけを確認できます。"
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <LienCard className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[color:var(--lien-primary-soft)] text-[color:var(--lien-primary-dark)]">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-[color:var(--lien-ink)]">店舗情報</h2>
              <p className="mt-1 text-xs text-[color:var(--lien-muted)]">お客様への案内に使用する情報</p>
            </div>
          </div>
          <dl className="mt-4">
            <SettingRow label="店舗名" value={storeName} />
            <SettingRow label="住所" value="岡山県岡山市北区駅前町1-1-118" />
            <SettingRow label="アクセス" value="岡山駅徒歩3分 / イコットニコット手前" />
            <SettingRow label="営業時間" value="10:00〜19:00" />
          </dl>
          <div className="mt-4 border-t border-[color:var(--lien-border)] pt-1">
            <StoreIconUploader imageUrl={iconImageUrl} />
          </div>
        </LienCard>

        <LienCard className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#edf4ec] text-[#55725b]">
              <UsersRound className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-[color:var(--lien-ink)]">スタッフ</h2>
              <p className="mt-1 text-xs text-[color:var(--lien-muted)]">予約・来店履歴で使用する担当者</p>
            </div>
          </div>
          <div className="mt-4 divide-y divide-[color:var(--lien-border)]">
            {SALON_STAFF.map((staff) => (
              <div key={staff.name} className="flex items-center justify-between gap-4 py-3">
                <span className="text-sm font-semibold text-[color:var(--lien-ink)]">{staff.name}</span>
                <span className="text-right text-xs text-[color:var(--lien-muted)]">{staff.role}</span>
              </div>
            ))}
          </div>
        </LienCard>
      </div>

      <LienCard className="p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[#f8eee9] text-[color:var(--lien-primary)]">
            <CalendarSync className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-[color:var(--lien-ink)]">外部連携</h2>
            <p className="mt-1 text-xs text-[color:var(--lien-muted)]">予約メールと口コミリンクの接続状況</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-[color:var(--lien-border)] bg-[color:var(--lien-surface-soft)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-[color:var(--lien-ink)]">
                  <Clock3 className="h-4 w-4 text-[color:var(--lien-primary)]" />
                  予約メール
                </p>
                <p className="mt-2 text-xs leading-5 text-[color:var(--lien-muted)]">アカウント: {maskedEmail(gmailEmail)}</p>
                <p className="text-xs leading-5 text-[color:var(--lien-muted)]">最終更新: {formatDateTime(latestGmailImportedAt)}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${gmailEmail ? "bg-[#e8f3ea] text-[#42634a]" : "bg-[#f7ead9] text-[#8b5d2f]"}`}>
                {gmailEmail ? "接続済み" : "未設定"}
              </span>
            </div>
            <Link href="/admin/appointments" className="mt-4 inline-flex min-h-10 items-center rounded-full border border-[color:var(--lien-border)] bg-white px-4 text-xs font-semibold text-[color:var(--lien-ink)] shadow-sm hover:bg-[color:var(--lien-surface-soft)]">
              予約カレンダーを開く
            </Link>
          </div>

          <div className="rounded-2xl border border-[color:var(--lien-border)] bg-[color:var(--lien-surface-soft)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-semibold text-[color:var(--lien-ink)]">
                  <Star className="h-4 w-4 text-[color:var(--lien-primary)]" />
                  Google口コミ
                </p>
                <p className="mt-2 text-xs leading-5 text-[color:var(--lien-muted)]">
                  {googleReviewUrl ? "口コミ案内で使用するリンクを設定済みです。" : "口コミリンクはまだ設定されていません。"}
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${googleReviewUrl ? "bg-[#e8f3ea] text-[#42634a]" : "bg-[#f7ead9] text-[#8b5d2f]"}`}>
                {googleReviewUrl ? "設定済み" : "未設定"}
              </span>
            </div>
            {googleReviewUrl ? (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <CopyTextButton text={googleReviewUrl} label="口コミURLをコピー" />
              </div>
            ) : null}
          </div>
        </div>
      </LienCard>

      <p className="flex items-center gap-2 px-1 text-xs leading-5 text-[color:var(--lien-muted)]">
        <MapPin className="h-3.5 w-3.5 shrink-0" />
        顧客分析や販促実績は各業務ページで確認できます。設定画面には表示しません。
      </p>
    </div>
  );
}
