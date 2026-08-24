import { CheckCircle2, Mail, MessageCircle, Scissors, UserRound } from "lucide-react";
import { ProfileImageUploader } from "@/components/customers/profile-image-uploader";
import { CustomerVisualHeader } from "@/components/lien/brand-visual";
import { getCurrentCustomerSession } from "@/lib/auth/current-customer";
import { isDeliverableRecoveryEmail } from "@/lib/auth/password-reset";
import {
  CUSTOMER_GENDER_OPTIONS,
  HAIR_CURL_OPTIONS,
  HAIR_TEXTURE_OPTIONS,
  HAIR_THICKNESS_OPTIONS,
  HAIR_VOLUME_OPTIONS,
  SERVICE_PREFERENCE_OPTIONS
} from "@/lib/customer-profile-options";
import { prisma } from "@/lib/prisma";
import { resolveCustomerPhotoReference } from "@/lib/storage/customer-photo";
import { birthDateInputValue } from "@/lib/customer-age";

const fieldClassName =
  "h-12 w-full min-w-0 max-w-full rounded-xl border border-[#e8ded2] bg-white px-4 text-base text-[#2f2a25] outline-none transition focus:border-[#8f4f42] focus:ring-4 focus:ring-[#e9c9be]/40";

function SelectField({
  label,
  name,
  options,
  defaultValue
}: {
  label: string;
  name: string;
  options: readonly string[];
  defaultValue?: string | null;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-[#4f463f]">
      {label}
      <select name={name} defaultValue={defaultValue ?? ""} className={fieldClassName}>
        <option value="">未選択</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export default async function CustomerProfilePage({
  searchParams
}: {
  searchParams?: { email?: string; profile?: string; account?: string; withdrawal?: string };
}) {
  const session = await getCurrentCustomerSession();
  if (!session) return null;

  const [customer, appUser] = await Promise.all([
    prisma.customer.findFirst({
      where: {
        id: session.customerId,
        organizationId: session.organizationId,
        deletedAt: null
      },
      include: { hairProfile: true }
    }),
    prisma.appUser.findUnique({
      where: { id: session.userId },
      select: { email: true, loginId: true, nickname: true }
    })
  ]);
  if (!customer || !appUser) return null;

  const staffSelection =
    customer.staffAssignmentType === "assigned" && customer.assignedStaffName
      ? customer.assignedStaffName
      : "free";
  const recoveryEmail = isDeliverableRecoveryEmail(appUser.email) ? appUser.email : "";
  const profileImageUrl = await resolveCustomerPhotoReference(customer.profileImageUrl);
  const accountErrors: Record<string, string> = {
    current: "現在のパスワードが正しくありません。",
    duplicate: "そのログインIDはすでに使用されています。",
    loginId: "ログインIDは半角英数字と . _ @ + - を使い、4〜80文字で入力してください。",
    password: "新しいパスワードは8文字以上で、確認欄と同じ内容を入力してください。",
    unchanged: "新しいログインIDまたはパスワードを入力してください。",
    failed: "変更を保存できませんでした。時間をおいてもう一度お試しください。"
  };

  return (
    <div className="grid gap-5">
      <CustomerVisualHeader
        variant="profile"
        eyebrow="My profile"
        title="プロフィール"
        description="基本情報や髪の特徴、接客の希望をいつでも変更できます。"
        imageClassName="object-[50%_30%]"
      />

      {searchParams?.profile === "saved" ? (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-3 rounded-[18px] border border-[#b9d9c0] bg-[#edf7ef] px-4 py-3 text-sm font-semibold text-[#315c3c] shadow-sm"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          プロフィールを保存しました。
        </div>
      ) : null}
      {searchParams?.profile === "invalid" ? (
        <p role="alert" className="rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          入力内容を確認してください。プロフィールはまだ変更されていません。
        </p>
      ) : null}
      {searchParams?.profile === "failed" ? (
        <p role="alert" className="rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          保存できませんでした。時間をおいて、もう一度お試しください。
        </p>
      ) : null}

      <section className="rounded-[20px] border border-[#e8ded2] bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-center text-base font-semibold">プロフィールアイコン</h2>
        <ProfileImageUploader
          customerId={customer.id}
          customerName={customer.name}
          profileImageUrl={profileImageUrl}
        />
      </section>

      <form action="/api/customer/profile" method="post" className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-[20px] border border-[#e8ded2] bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <UserRound className="h-5 w-5 text-[#8f4f42]" />基本情報
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold text-[#4f463f]">
              お名前
              <input name="name" required maxLength={80} defaultValue={customer.name} className={fieldClassName} />
            </label>
            <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-[#4f463f]">
              ニックネーム
              <input
                name="nickname"
                maxLength={30}
                autoComplete="nickname"
                defaultValue={appUser.nickname ?? ""}
                placeholder="例：ひなた"
                className={fieldClassName}
              />
              <span className="text-[11px] font-normal leading-relaxed text-[#8b8178]">
                スタイル共有やコメントなど、公開される場所では本名の代わりに表示されます。
              </span>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-[#4f463f]">
              電話番号
              <input
                name="phone"
                type="tel"
                inputMode="tel"
                maxLength={30}
                autoComplete="tel"
                defaultValue={customer.phone ?? ""}
                className={fieldClassName}
              />
            </label>
            <SelectField
              label="性別"
              name="gender"
              options={CUSTOMER_GENDER_OPTIONS}
              defaultValue={customer.gender}
            />
            <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-[#4f463f]">
              生年月日
              <input
                name="birthDate"
                type="date"
                min="1900-01-01"
                autoComplete="bday"
                defaultValue={birthDateInputValue(customer.birthDate)}
                className={`${fieldClassName} customer-profile-birth-date-v426 appearance-none`}
              />
            </label>
            <input type="hidden" name="assignedStaffSelection" value={staffSelection} />
            <div className="rounded-xl bg-[#f8f3ed] px-4 py-3 sm:col-span-2">
              <p className="text-xs font-semibold text-[#8b8178]">ログインID</p>
              <p className="mt-1 text-sm font-semibold">{appUser.loginId}</p>
            </div>
          </div>
        </section>

        <section className="rounded-[20px] border border-[#e8ded2] bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Scissors className="h-5 w-5 text-[#8aa58a]" />髪の特徴
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <SelectField
              label="髪量"
              name="hairVolume"
              options={HAIR_VOLUME_OPTIONS}
              defaultValue={customer.hairProfile?.hairVolume}
            />
            <SelectField
              label="髪質"
              name="hairTexture"
              options={HAIR_TEXTURE_OPTIONS}
              defaultValue={customer.hairProfile?.hairTexture}
            />
            <SelectField
              label="髪の太さ"
              name="hairThickness"
              options={HAIR_THICKNESS_OPTIONS}
              defaultValue={customer.hairProfile?.hairThickness}
            />
            <SelectField
              label="クセ"
              name="hairCurl"
              options={HAIR_CURL_OPTIONS}
              defaultValue={customer.hairProfile?.hairCurl}
            />
          </div>
        </section>

        <section className="rounded-[20px] border border-[#e8ded2] bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <MessageCircle className="h-5 w-5 text-[#d8b56d]" />接客の希望
          </h2>
          <div className="mt-4">
            <SelectField
              label="接客スタイル"
              name="servicePreference"
              options={SERVICE_PREFERENCE_OPTIONS}
              defaultValue={customer.servicePreference}
            />
          </div>
        </section>

        <button
          type="submit"
          className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#8f4f42] px-6 text-base font-semibold text-white shadow-sm transition hover:bg-[#7d453a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e9c9be]/60 lg:col-span-2 lg:w-auto lg:justify-self-end lg:px-12"
        >
          変更を保存
        </button>
      </form>

      <section id="login-settings" className="scroll-mt-24 rounded-[20px] border border-[#e8ded2] bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <UserRound className="h-5 w-5 text-[#8f4f42]" />ログインID・パスワード
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#7c7168]">現在のパスワードで本人確認後、ログイン情報を変更します。変更後はいったんログアウトします。</p>
        {searchParams?.account && accountErrors[searchParams.account] ? (
          <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{accountErrors[searchParams.account]}</p>
        ) : null}
        <form action="/api/customer-auth/account" method="post" className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-semibold text-[#4f463f]">新しいログインID
            <input name="newLoginId" required minLength={4} maxLength={80} autoComplete="username" defaultValue={appUser.loginId ?? ""} className={fieldClassName} />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-[#4f463f]">現在のパスワード
            <input name="currentPassword" type="password" required maxLength={256} autoComplete="current-password" className={fieldClassName} />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-[#4f463f]">新しいパスワード
            <input name="newPassword" type="password" minLength={8} maxLength={128} autoComplete="new-password" placeholder="変更しない場合は空欄" className={fieldClassName} />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-[#4f463f]">新しいパスワード（確認）
            <input name="newPasswordConfirm" type="password" minLength={8} maxLength={128} autoComplete="new-password" className={fieldClassName} />
          </label>
          <button type="submit" className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#8f4f42] px-6 text-sm font-semibold text-white shadow-sm hover:bg-[#7d453a] lg:col-span-2 lg:justify-self-end">ログイン情報を変更</button>
        </form>
      </section>

      <section className="rounded-[20px] border border-[#e8ded2] bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Mail className="h-5 w-5 text-[#8f4f42]" />ログイン情報の復旧
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#7c7168]">
          ID・パスワードを忘れたときに、再設定メールを受け取るアドレスです。
        </p>
        {searchParams?.email === "saved" ? (
          <p className="mt-3 rounded-xl bg-[#edf7ef] px-4 py-3 text-sm text-[#315c3c]">
            復旧用メールアドレスを保存しました。
          </p>
        ) : null}
        {searchParams?.email === "invalid" ? (
          <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
            有効なメールアドレスを入力してください。
          </p>
        ) : null}
        {searchParams?.email === "duplicate" ? (
          <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
            このメールアドレスは別のアカウントで使用されています。
          </p>
        ) : null}
        <form
          action="/api/customer-auth/recovery-email"
          method="post"
          className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
        >
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue={recoveryEmail}
            placeholder="example@email.com"
            className={fieldClassName}
          />
          <button type="submit" className="h-12 rounded-full bg-[#8f4f42] px-5 text-sm font-semibold text-white">
            保存する
          </button>
        </form>
      </section>

      <section className="rounded-[20px] border border-[#efced0] bg-[#fffafa] p-5 shadow-sm">
        <h2 className="text-base font-semibold text-[#71383c]">退会手続き</h2>
        <p className="mt-2 text-sm leading-6 text-[#7c6566]">
          登録済みのメールアドレスへ確認リンクを送ります。リンク先で退会を確定するまで、アカウントは停止されません。
        </p>
        {searchParams?.withdrawal === "sent" ? (
          <p role="status" className="mt-3 rounded-xl bg-[#edf7ef] px-4 py-3 text-sm text-[#315c3c]">
            退会確認メールを送信しました。30分以内にメール内のリンクを開いてください。
          </p>
        ) : null}
        {searchParams?.withdrawal === "email-required" ? (
          <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
            先に、このページの「ログイン情報の復旧」で受信可能なメールアドレスを登録してください。
          </p>
        ) : null}
        {searchParams?.withdrawal === "limited" ? (
          <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
            送信回数の上限に達しました。1時間ほど待ってからお試しください。
          </p>
        ) : null}
        {searchParams?.withdrawal === "mail-failed" ? (
          <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
            確認メールを送信できませんでした。時間をおいてもう一度お試しください。
          </p>
        ) : null}
        <form action="/api/customer-auth/withdrawal/request" method="post" className="mt-4">
          <button
            type="submit"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#b94c53] bg-white px-6 text-sm font-semibold text-[#9f3f44] transition hover:bg-[#fff0f1]"
          >
            退会確認メールを送信する
          </button>
        </form>
      </section>
    </div>
  );
}
