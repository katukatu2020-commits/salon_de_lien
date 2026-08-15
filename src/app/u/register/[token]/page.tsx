import Link from "next/link";
import { CircleAlert, Mail } from "lucide-react";
import { CustomerRegistrationPage } from "@/components/customer-app/customer-registration-page";
import {
  hashCustomerRegistrationToken,
  isCustomerRegistrationTokenFormat,
  parseCustomerRegistrationContext
} from "@/lib/auth/customer-registration-invite";
import { prisma } from "@/lib/prisma";

function InvalidRegistrationLink() {
  return (
    <main className="grid min-h-screen place-items-center bg-lien px-4 py-8 text-lien-ink">
      <section className="w-full max-w-md rounded-[24px] border border-lien bg-white p-6 text-center shadow-lien-sm">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#fff3e6] text-[#9a642f]">
          <CircleAlert className="h-5 w-5" />
        </span>
        <h1 className="mt-5 text-xl font-semibold">登録リンクを確認できません</h1>
        <p className="mt-3 text-sm leading-7 text-lien-muted">リンクの有効期限が切れたか、すでに登録が完了しています。新しい登録用メールを受け取ってください。</p>
        <Link href="/u/register" className="lien-button-primary mt-6 min-h-12 w-full">
          <Mail className="h-4 w-4" />
          登録用メールを再送する
        </Link>
      </section>
    </main>
  );
}

export default async function CustomerRegistrationFromMailPage({
  params,
  searchParams
}: {
  params: { token: string };
  searchParams?: { error?: string };
}) {
  const token = params.token;
  if (!isCustomerRegistrationTokenFormat(token)) return <InvalidRegistrationLink />;

  const invite = await prisma.customerRegistrationInvite.findUnique({
    where: { tokenHash: hashCustomerRegistrationToken(token) },
    select: { email: true, contextJson: true, expiresAt: true, usedAt: true }
  });
  if (!invite || invite.usedAt || invite.expiresAt <= new Date()) return <InvalidRegistrationLink />;

  const context = parseCustomerRegistrationContext(invite.contextJson);
  return (
    <CustomerRegistrationPage
      email={invite.email}
      registrationInviteToken={token}
      searchParams={{ ...context, error: searchParams?.error }}
    />
  );
}
