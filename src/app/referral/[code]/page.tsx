import Link from "next/link";
import { notFound } from "next/navigation";
import { Gift, HeartHandshake } from "lucide-react";
import { prisma } from "@/lib/prisma";

type ReferralPageProps = {
  params: {
    code: string;
  };
};

export default async function ReferralPage({ params }: ReferralPageProps) {
  const code = params.code.trim().toUpperCase();
  const referral = await prisma.referral.findUnique({
    where: { code },
    include: {
      referrerCustomer: {
        select: {
          name: true,
          organization: {
            select: {
              referralReferrerDiscountRate: true,
              referralReferredDiscountRate: true
            }
          }
        }
      }
    }
  });

  if (!referral || referral.status !== "issued") {
    notFound();
  }
  const referrerRate = referral.referrerCustomer.organization.referralReferrerDiscountRate;
  const referredRate = referral.referrerCustomer.organization.referralReferredDiscountRate;

  const registrationUrl = `/u/register?source=${encodeURIComponent("紹介")}&referrer=${encodeURIComponent(code)}&referrerName=${encodeURIComponent(referral.referrerCustomer.name)}`;

  return (
    <main className="min-h-screen bg-lien px-4 py-6 text-lien-ink">
      <section className="mx-auto grid max-w-xl gap-5">
        <div className="relative overflow-hidden rounded-[28px] border border-lien bg-white p-6 shadow-lien-sm">
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[color:var(--lien-primary-soft)]/50" />
          <div className="relative">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-lien-soft text-[color:var(--lien-primary)]">
              <HeartHandshake className="h-6 w-6" />
            </span>
            <p className="mt-4 text-sm font-semibold text-[color:var(--lien-primary-dark)]">Salon de Lien</p>
            <h1 className="mt-2 text-2xl font-semibold">友達紹介クーポン</h1>
            <p className="mt-3 text-sm leading-7 text-lien-muted">
              {referral.referrerCustomer.name}様からの紹介コードです。ご来店予定のお名前と連絡先を登録してください。
            </p>
            <p className="mt-3 rounded-2xl bg-[#edf7ef] px-4 py-3 text-sm font-semibold leading-6 text-[#315c3c]">
              あなたの初回お会計は{referredRate}%OFFです。会計完了後、
              紹介者様の次回お会計が{referrerRate}%OFFになります。
            </p>
            <p className="mt-4 rounded-2xl border border-lien bg-lien-soft px-4 py-3 font-mono text-sm font-semibold">{code}</p>
          </div>
        </div>

        <section className="grid gap-4 rounded-[28px] border border-lien bg-white p-6 shadow-lien-sm">
          <p className="text-sm leading-7 text-lien-muted">初めてのお客様は、携帯電話番号をSMSで確認してからプロフィールを登録します。1つの携帯番号で作成できるアカウントは1つです。</p>
          <Link href={registrationUrl} className="lien-button-primary min-h-12">
            <Gift className="h-4 w-4" />
            SMS認証して新規登録
          </Link>
          <Link href="/u/login?next=/u/points" className="lien-button-secondary min-h-12">登録済みの方はログイン</Link>
          <p className="text-xs leading-5 text-lien-muted">
            登録後、初回のお会計に{referredRate}%OFFが自動適用されます。紹介者様の{referrerRate}%OFFは、その会計完了後に利用可能になります。
          </p>
        </section>
      </section>
    </main>
  );
}
