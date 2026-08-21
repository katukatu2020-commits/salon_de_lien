import Link from "next/link";
import { ArrowLeft, Mail, MailCheck, ShieldCheck } from "lucide-react";
import { BrandVisual } from "@/components/lien/brand-visual";
import { CustomerRegistrationEmailForm } from "@/components/customer-app/customer-registration-email-form";
import type { CustomerRegistrationSearchParams } from "@/components/customer-app/customer-registration-page";

export function CustomerRegistrationLinkPage({ searchParams }: { searchParams?: CustomerRegistrationSearchParams }) {
  const sent = searchParams?.sent === "1";
  const registered = searchParams?.registered === "1";
  const limited = searchParams?.limited === "1";
  const failed = searchParams?.error === "1";
  const cooldown = searchParams?.cooldown === "1";
  const retryAfterSeconds = Math.min(60, Math.max(0, Number(searchParams?.retryAfter) || 0));

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
          {registered ? (
            <div role="alert" className="mt-5 rounded-2xl border border-[#efc3c9] bg-[#fff4f5] px-4 py-4 text-sm font-semibold leading-6 text-[#9e4051]">
              このメールアドレスは登録済みです。
            </div>
          ) : null}
          {limited ? (
            <div role="alert" className="mt-5 rounded-2xl border border-[#ead4ae] bg-[#fff9ed] px-4 py-4 text-sm leading-6 text-[#805f28]">
              短時間に複数回の送信が行われました。15分ほど待ってから、もう一度お試しください。
            </div>
          ) : null}
          {failed ? (
            <div role="alert" className="mt-5 rounded-2xl border border-[#efc3c9] bg-[#fff4f5] px-4 py-4 text-sm leading-6 text-[#9e4051]">
              登録用メールを送信できませんでした。しばらくしてから、もう一度お試しください。
            </div>
          ) : null}
          {cooldown ? (
            <div role="status" className="mt-5 rounded-2xl border border-[#ead4ae] bg-[#fff9ed] px-4 py-4 text-sm leading-6 text-[#805f28]">
              直前にメールを送信しています。画面のカウントダウン後に再送できます。
            </div>
          ) : null}

          <CustomerRegistrationEmailForm
            resendMode={sent || cooldown}
            retryAfterSeconds={retryAfterSeconds}
            context={{
              source: searchParams?.source,
              campaign: searchParams?.campaign,
              referrer: searchParams?.referrer,
              referrerName: searchParams?.referrerName
            }}
          />

          <div className="mt-5 flex gap-2 rounded-2xl bg-lien-soft px-4 py-3 text-xs leading-5 text-lien-muted">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-lien-sage" />
            メールのリンクを開いた後、プロフィール入力と携帯電話番号のSMS認証を行います。
          </div>
        </section>
      </section>
    </main>
  );
}
