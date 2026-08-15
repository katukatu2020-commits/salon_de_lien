import { PasswordResetConfirmPage } from "@/components/auth/password-reset-confirm-page";

export default function CustomerPasswordResetConfirmPage({ params, searchParams }: { params: { token: string }; searchParams?: { error?: string } }) {
  return <PasswordResetConfirmPage audience="customer" token={params.token} error={searchParams?.error} />;
}
