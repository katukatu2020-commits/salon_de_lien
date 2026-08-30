import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { getBackofficeSession } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";
import "./globals.css";

export const metadata: Metadata = {
  title: "ORIMIA",
  description: "美容室の顧客カルテから再来店、商品提案、ポイント、紹介までつなげるCRM",
  applicationName: "ORIMIA",
  manifest: "/orimia.webmanifest",
  appleWebApp: {
    capable: true,
    title: "ORIMIA",
    statusBarStyle: "default"
  },
  icons: {
    icon: [
      { url: "/brand/orimia-icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/orimia-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/brand/orimia-icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/brand/orimia-icon-180.png", sizes: "180x180", type: "image/png" }],
    shortcut: [{ url: "/brand/orimia-icon-48.png", sizes: "48x48", type: "image/png" }]
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fffdf9"
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
