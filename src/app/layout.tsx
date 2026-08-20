import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { getBackofficeSession } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";
import "./globals.css";

export const metadata: Metadata = {
  title: "Salon de Lien",
  description: "美容室の顧客カルテから再来店、商品提案、ポイント、紹介までつなげるCRM"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

async function currentShellData() {
  try {
    const session = await getBackofficeSession();
    if (!session?.organizationId) {
      return { backofficeRole: session?.role ?? null, backofficeDisplayName: null };
    }
    const appUser = await (session.userId
        ? prisma.appUser.findUnique({
            where: { id: session.userId },
            select: { displayName: true }
          })
        : null);
    const backofficeDisplayName =
      appUser?.displayName?.trim() ||
      (session.role === "ADMIN" ? "管理者" : session.role === "STAFF" ? "スタッフ" : "メーカー担当者");
    return {
      backofficeRole: session.role,
      backofficeDisplayName
    };
  } catch {
    return { backofficeRole: null, backofficeDisplayName: null };
  }
}

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { backofficeRole, backofficeDisplayName } = await currentShellData();
  return (
    <html lang="ja">
      <body>
        <AppShell
          backofficeRole={backofficeRole}
          backofficeDisplayName={backofficeDisplayName}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
