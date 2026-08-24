"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CalendarDays, Clock3, Home, LogOut, MessageCircle, Sparkles } from "lucide-react";

const navItems = [
  { href: "/u/home", label: "ホーム", icon: Home },
  { href: "/u/appointments", label: "予約", icon: CalendarDays },
  { href: "/u/history", label: "履歴", icon: Clock3 },
  { href: "/u/chat", label: "チャット相談", icon: MessageCircle }
];

export function CustomerAccountShell({ customerName, children }: { customerName: string; children: React.ReactNode }) {
  const pathname = usePathname();

  const navigation = navItems.map((item) => {
    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
    const Icon = item.icon;
    return { ...item, active, Icon };
  });

  return (
    <div className="min-h-screen bg-[#fbf7f0] text-[#2f2a25]">
      <header className="customer-account-mobile-header-removed hidden">
        <div className="mx-auto flex h-16 w-full max-w-xl items-center justify-between gap-3 px-4">
          <Link href="/u/profile" className="flex min-w-0 items-center gap-3" aria-label="プロフィールとアカウント設定を開く">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#8f4f42] text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">Salon de Lien</span>
              <span className="block truncate text-xs text-[#7c7168]">{customerName}様のアプリ</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/u/messages" className="lien-icon-button text-[#8f4f42] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e9c9be]/50" aria-label="サロンからのお知らせ" title="お知らせ">
              <Bell className="h-4 w-4" />
            </Link>
            <form action="/api/customer-auth/logout" method="post">
              <button
                type="submit"
                className="lien-icon-button text-[#6f6259] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e9c9be]/50"
                aria-label="ログアウト"
                title="ログアウト"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto min-h-screen w-full md:grid md:max-w-none md:grid-cols-[220px_minmax(0,1fr)] md:gap-5 md:px-4 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-8 lg:px-6 xl:max-w-[1600px]">
        <aside className="sticky top-0 hidden h-screen flex-col border-r border-[#e8ded2] py-7 pr-5 md:flex lg:pr-6">
          <Link href="/u/home" className="flex items-center gap-3 px-2" aria-label="お客様アプリのホーム">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#8f4f42] text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-base font-semibold">Salon de Lien</span>
              <span className="mt-0.5 block text-xs text-[#7c7168]">お客様アプリ</span>
            </span>
          </Link>

          <nav className="mt-10 grid gap-2" aria-label="お客様アプリメニュー">
            {navigation.map(({ href, label, active, Icon }) => (
              <Link
                key={href}
                href={href}
                className={`lien-nav-item flex min-h-12 items-center gap-3 rounded-2xl px-4 text-sm font-semibold transition ${
                  active
                    ? "bg-[#8f4f42] text-white shadow-sm"
                    : "text-[#6f6259] hover:bg-[#f6efe6] hover:text-[#2f2a25]"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{label}</span>
              </Link>
            ))}
          </nav>

          <div className="mt-auto rounded-[20px] border border-[#e8ded2] bg-white p-4 shadow-sm">
            <p className="text-xs text-[#8b8178]">ログイン中</p>
            <Link href="/u/profile#login-settings" className="mt-1 block truncate text-sm font-semibold text-[#5b332c] hover:text-[#8f4f42]">
              {customerName}様
            </Link>
            <Link href="/u/profile#login-settings" className="mt-1 block text-xs font-semibold text-[#8f4f42]">
              ID・パスワードを変更
            </Link>
            <form action="/api/customer-auth/logout" method="post" className="mt-3">
              <button type="submit" className="lien-button-secondary min-h-10 w-full px-4 text-xs text-[#6f6259]">
                <LogOut className="h-4 w-4" />ログアウト
              </button>
            </form>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="hidden h-20 items-center justify-between border-b border-[#eadfd4] md:flex">
            <div>
              <p className="text-xs font-semibold text-[#8f4f42]">Salon de Lien Customer Portal</p>
              <p className="mt-1 text-sm text-[#7c7168]">{customerName}様のサロン記録</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/u/messages" className="lien-button-secondary min-h-10 px-4 text-sm text-[#5b332c]">
                <Bell className="h-4 w-4" />お知らせ
              </Link>
              <Link href="/u/profile#login-settings" className="lien-button-secondary min-h-10 px-4 text-sm text-[#5b332c]">
                {customerName}様
              </Link>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1180px] px-4 pb-28 pt-5 sm:px-6 md:px-0 md:pb-12 md:pt-7 lg:pt-8">{children}</main>
        </div>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 box-border h-[calc(64px+env(safe-area-inset-bottom))] border-t border-[#eadfd4] bg-[#fffdf9]/[0.97] pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(62,42,35,0.07)] backdrop-blur md:hidden"
        aria-label="お客様アプリメニュー"
        data-customer-bottom-nav
      >
        <div className="grid h-16 w-full grid-cols-4 p-0" data-customer-bottom-nav-inner>
          {navigation.map((item) => {
            const { active, Icon } = item;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`box-border flex h-16 min-h-16 min-w-0 flex-col items-center justify-center gap-1 px-0.5 py-1.5 text-[10px] font-semibold leading-[1.15] transition ${
                  active
                    ? "text-[#d85d79]"
                    : "text-[#8b8178] hover:bg-[#f6efe6] hover:text-[#5b332c]"
                }`}
                aria-current={active ? "page" : undefined}
                data-customer-bottom-nav-item
              >
                <Icon className={`h-5 w-5 shrink-0 ${active ? "stroke-[2.4]" : ""}`} />
                <span className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
