import Link from "next/link";
import { ArrowLeft, Mail, MailCheck, ShieldCheck } from "lucide-react";
import { BrandVisual } from "@/components/lien/brand-visual";
import type { CustomerRegistrationSearchParams } from "@/components/customer-app/customer-registration-page";

export function CustomerRegistrationLinkPage({ searchParams }: { searchParams?: CustomerRegistrationSearchParams }) {
  const sent = searchParams?.sent === "1";

  return (
    <main className="min-h-screen bg-lien px-4 py-6 text-lien-ink sm:px-6 sm:py-10">
      <section className="mx-auto grid w-full max-w-md gap-5">
        <Link href="/u/login" className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full px-3 text-sm font-semibold text-lien-primary transition hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lien-primary-soft">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          ログインへ戻る
        </Link>

        <BrandVisual variant="consultation" className="h-48 overflow-hidden rounded-[24px] border border-lien shadow-lien-sm" imageClassName="object-[70%_52%]" sizes="448px" priority overlay="none">
          <div className="flex h-full items-end bg-gradient-to-r from-white/95 via-white/65 to-transparent p-6">
            <div>
              <p className="text-sm font-semibold text-lien-primary">Salon de Lien</p>
              <h1 className="mt-1 text-2xl font-semibold">お客様アプリ初回登録</h1>
            </div>
          </div>
        </BrandVisual>

        <section className="rounded-[24px] border border-lien bg-white p-5 shadow-lien-sm sm:p-6">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lien-soft text-lien-primary">
            {sent ? <MailCheck className="h-5 w-5" /> : <Mail className="h-5 w-5" />}
          </span>
          <h2 className="mt-5 text-xl font-semibold">登録用リンクをメールで受け取る</h2>
          <p className="mt-2 text-sm leading-7 text-lien-muted">入力したメールアドレスへ、プロフィール登録を始めるための専用リンクを送ります。</p>

          {sent ? (
            <div role="status" className="mt-5 rounded-2xl border border-[#bfd5c1] bg-[#f2f8f2] px-4 py-4 text-sm leading-6 text-[#3f6144]">
              登録用メールを送信しました。受信箱と迷惑メールをご確認ください。リンクは60分間有効です。
            </div>
          ) : null}

          <form action="/api/customer-auth/registration-link/request" method="post" className="mt-6 grid gap-4">
            <input type="hidden" name="source" value={searchParams?.source ?? ""} />
            <input type="hidden" name="campaign" value={searchParams?.campaign ?? ""} />
            <input type="hidden" name="referrer" value={searchParams?.referrer ?? ""} />
            <input type="hidden" name="referrerName" value={searchParams?.referrerName ?? ""} />
            <label className="grid gap-2 text-sm font-semibold">
              メールアドレス
              <span className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-lien-muted" />
                <input name="email" type="email" autoComplete="email" required placeholder="example@email.com" className="lien-input h-12 pl-11" />
              </span>
            </label>
            <button type="submit" className="lien-button-primary min-h-12 w-full">登録用メールを送る</button>
          </form>

          <div className="mt-5 flex gap-2 rounded-2xl bg-lien-soft px-4 py-3 text-xs leading-5 text-lien-muted">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-lien-sage" />
            メールのリンクを開いた後、プロフィール入力と携帯電話番号のSMS認証を行います。
          </div>
        </section>
      </section>
    </main>
  );
}
