import Link from "next/link";
import { ArrowLeft, KeyRound, MailCheck, MessageCircle, Scissors, UserRound } from "lucide-react";
import { createPublicConsultationLead } from "@/lib/actions";
import {
  CUSTOMER_GENDER_OPTIONS,
  HAIR_CURL_OPTIONS,
  HAIR_TEXTURE_OPTIONS,
  HAIR_THICKNESS_OPTIONS,
  HAIR_VOLUME_OPTIONS,
  SERVICE_PREFERENCE_OPTIONS
} from "@/lib/customer-profile-options";
import { SALON_STAFF_NAMES } from "@/lib/salon/staff";
import { BrandVisual } from "@/components/lien/brand-visual";
import { CustomerPhoneVerificationField } from "@/components/customer-app/customer-phone-verification-field";

const staffOptions = [...SALON_STAFF_NAMES];

export type CustomerRegistrationSearchParams = {
  source?: string;
  campaign?: string;
  referrer?: string;
  referrerName?: string;
  error?: string;
  sent?: string;
  registered?: string;
  limited?: string;
  cooldown?: string;
  retryAfter?: string;
};

function SelectBox({ label, name, options, defaultValue = "" }: { label: string; name: string; options: readonly string[]; defaultValue?: string }) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-lien-ink">
      {label}
      <select name={name} defaultValue={defaultValue} required className="lien-input">
        <option value="">未選択</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

export function CustomerRegistrationPage({
  email,
  registrationInviteToken,
  searchParams
}: {
  email: string;
  registrationInviteToken: string;
  searchParams?: CustomerRegistrationSearchParams;
}) {
  return (
    <main className="min-h-screen bg-lien px-4 py-6 text-lien-ink sm:px-6">
      <section className="mx-auto grid w-full max-w-2xl gap-5">
        <Link href="/u/login" className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full px-3 text-sm font-semibold text-lien-primary transition hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lien-primary-soft">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          ログインへ戻る
        </Link>
        <header className="grid overflow-hidden rounded-[26px] border border-lien bg-white shadow-lien-sm sm:grid-cols-[minmax(0,1fr)_15rem]">
          <div className="p-5 sm:p-6">
            <p className="text-sm font-semibold text-lien-primary">Salon de Lien</p>
            <h1 className="mt-2 text-2xl font-semibold">はじめてのお客様登録</h1>
            <p className="mt-3 text-sm leading-7 text-lien-muted">初回来店を心地よく過ごしていただくため、基本情報と髪の特徴を教えてください。</p>
          </div>
          <BrandVisual
            variant="consultation"
            className="h-44 sm:h-full sm:min-h-48"
            imageClassName="object-[70%_52%]"
            sizes="(max-width: 639px) 100vw, 240px"
            priority
          />
        </header>

        <form action={createPublicConsultationLead} className="grid gap-5">
          <input type="hidden" name="registrationInviteToken" value={registrationInviteToken} />
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="leadSourceParam" value={searchParams?.source ?? ""} />
          <input type="hidden" name="campaign" value={searchParams?.campaign ?? ""} />
          <input type="hidden" name="referrerCode" value={searchParams?.referrer ?? ""} />
          <input type="hidden" name="referrerName" value={searchParams?.referrerName ?? ""} />

          {searchParams?.error === "loginId" ? (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">このログインIDは使用されています。別のIDを入力してください。</p>
          ) : null}
          {searchParams?.error === "email" ? (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">このメールアドレスは登録済みです。ログイン情報の再設定をご利用ください。</p>
          ) : null}
          {searchParams?.error === "profile" ? (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">入力内容を確認してください。プロフィールの各項目を選択してから登録してください。</p>
          ) : null}
          {searchParams?.error === "sms" ? (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">携帯電話番号のSMS認証を完了してから登録してください。</p>
          ) : null}
          {searchParams?.error === "phone" ? (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">この電話番号はすでに登録されています。ログインまたはパスワード再設定をご利用ください。</p>
          ) : null}
          {searchParams?.error === "invite" ? (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">登録リンクの有効期限が切れています。登録用メールをもう一度受け取ってください。</p>
          ) : null}

          <section className="rounded-[22px] border border-lien bg-white p-5 shadow-lien-sm">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><KeyRound className="h-5 w-5 text-lien-primary" />アプリのログイン設定</h2>
            <p className="mt-2 text-sm leading-6 text-lien-muted">次回からお客様アプリを開くためのIDとパスワードです。メールアドレスはログイン情報の再設定に使用します。</p>
            <div className="mt-4 grid gap-4">
              <div className="flex min-h-12 items-center gap-3 rounded-xl border border-[#bfd5c1] bg-[#f2f8f2] px-4 text-sm text-[#315c3c]">
                <MailCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 break-all"><span className="font-semibold">確認済みメール:</span> {email}</span>
              </div>
              <label className="grid gap-1.5 text-sm font-semibold">ログインID<input name="loginId" required minLength={4} maxLength={24} pattern="[A-Za-z0-9_-]+" autoCapitalize="none" autoComplete="username" placeholder="半角英数字 4〜24文字" className="lien-input" /></label>
              <label className="grid gap-1.5 text-sm font-semibold">パスワード<input name="password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" placeholder="8文字以上" className="lien-input" /></label>
            </div>
          </section>

          <section className="rounded-[22px] border border-lien bg-white p-5 shadow-lien-sm">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><UserRound className="h-5 w-5 text-lien-primary" />基本情報</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-semibold">お名前<input name="name" required className="lien-input" /></label>
              <CustomerPhoneVerificationField />
              <SelectBox label="性別" name="gender" options={CUSTOMER_GENDER_OPTIONS} />
              <label className="grid gap-1.5 text-sm font-semibold">生年月日<input name="birthDate" type="date" min="1900-01-01" required autoComplete="bday" className="lien-input" /></label>
              <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">担当者・指名
                <select name="assignedStaffSelection" defaultValue="free" className="lien-input">
                  <option value="free">フリー（指名なし）</option>
                  {staffOptions.map((staff) => <option key={staff} value={staff}>{staff}</option>)}
                </select>
              </label>
            </div>
          </section>

          <section className="rounded-[22px] border border-lien bg-white p-5 shadow-lien-sm">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><Scissors className="h-5 w-5 text-lien-primary" />髪の特徴</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <SelectBox label="髪量" name="hairVolume" options={HAIR_VOLUME_OPTIONS} />
              <SelectBox label="髪質" name="hairTexture" options={HAIR_TEXTURE_OPTIONS} />
              <SelectBox label="髪の太さ" name="hairThickness" options={HAIR_THICKNESS_OPTIONS} />
              <SelectBox label="クセ" name="hairCurl" options={HAIR_CURL_OPTIONS} />
            </div>
          </section>

          <section className="rounded-[22px] border border-lien bg-white p-5 shadow-lien-sm">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><MessageCircle className="h-5 w-5 text-lien-primary" />接客の希望</h2>
            <div className="mt-4"><SelectBox label="接客スタイル" name="servicePreference" options={SERVICE_PREFERENCE_OPTIONS} /></div>
          </section>

          <button type="submit" className="lien-button-primary min-h-12 w-full text-base">登録する</button>
          <p className="pb-4 text-center text-xs leading-5 text-lien-muted">入力内容とログイン情報はSalon de Lienの顧客プロフィールとして安全に保存されます。</p>
        </form>
      </section>
    </main>
  );
}
