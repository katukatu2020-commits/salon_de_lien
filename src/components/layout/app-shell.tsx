"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  Command,
  LogOut,
  Menu,
  PackageSearch,
  Images,
  Search,
  Settings,
  UsersRound,
  X
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { BrandVisual } from "@/components/lien/brand-visual";

const navItems = [
  { href: "/admin/appointments", label: "予約カレンダー", icon: CalendarDays },
  { href: "/admin/customers", label: "顧客・ポイント", icon: UsersRound },
  { href: "/admin/products", label: "商品棚・集計", icon: PackageSearch },
  { href: "/admin/community", label: "スタイル共有", icon: Images, staffOnly: true },
  { href: "/admin/owner-analytics", label: "経営分析", icon: BarChart3, ownerOnly: true }
];

const commandItems = [
  { href: "/admin/appointments", label: "予約カレンダー", hint: "Gmail予約と月間予定", icon: CalendarDays },
  { href: "/admin/customers", label: "顧客・ポイント", hint: "顧客管理とポイント管理", icon: UsersRound },
  { href: "/admin/products", label: "商品棚・集計", hint: "商品・在庫管理と集計", icon: PackageSearch },
  { href: "/admin/community", label: "スタイル共有", hint: "公開された施術写真とコメント", icon: Images, staffOnly: true },
  { href: "/admin/owner-analytics", label: "経営分析", hint: "売上・スタッフ・顧客構成", icon: BarChart3, ownerOnly: true }
];

const publicPathPrefixes = [
  "/u/",
  "/app/",
  "/proposals/",
  "/intake",
  "/feedback/",
  "/care/",
  "/appointments/",
  "/review/",
  "/referral/"
];

function splitHref(href: string) {
  const [path, query = ""] = href.split("?");
  return {
    path,
    view: new URLSearchParams(query).get("view") ?? ""
  };
}

function isActivePath(pathname: string, currentView: string, href: string) {
  const { path, view } = splitHref(href);

  if (view) {
    return pathname === path && currentView === view;
  }

  if (path === "/admin/customers") {
    if (pathname === path) {
      return currentView === "";
    }

    return pathname.startsWith(`${path}/`);
  }

  return pathname === path || pathname.startsWith(`${path}/`);
}

function StoreMark({ imageUrl, compact = false }: { imageUrl?: string | null; compact?: boolean }) {
  return (
    <span
      role="img"
      aria-label="店舗アイコン"
      className={`${compact ? "h-8 w-8 rounded-full text-sm" : "h-11 w-11 rounded-2xl text-lg"} inline-flex shrink-0 items-center justify-center border border-[#ead8ca] bg-[#fff7ef] bg-cover bg-center font-semibold text-[color:var(--lien-primary-dark)] shadow-sm`}
      style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
    >
      {imageUrl ? <span className="sr-only">Salon de Lien</span> : "L"}
    </span>
  );
}

function AccountBadge({ displayName, compact = false }: { displayName?: string | null; compact?: boolean }) {
  if (!displayName) return null;

  return (
    <Link
      href="/admin/account"
      className={`flex min-w-0 items-center rounded-full border border-lien bg-white shadow-sm ${
        compact ? "h-10 max-w-28 gap-1.5 px-2" : "h-10 max-w-44 gap-2 px-2.5 pr-3"
      } transition hover:border-[color:var(--lien-primary-soft)] hover:bg-lien-soft`}
      title="ログインID・パスワードを変更"
      aria-label={`${displayName}のアカウント設定を開く`}
    >
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f1dfd7] text-xs font-bold text-[color:var(--lien-primary-dark)]">
        {displayName.slice(0, 1)}
      </span>
      <span className={`${compact ? "text-[11px]" : "text-xs"} truncate font-semibold text-lien-ink`}>{displayName}</span>
    </Link>
  );
}

export function AppShell({
  children,
  storeIconUrl,
  backofficeRole,
  backofficeDisplayName
}: {
  children: ReactNode;
  storeIconUrl?: string | null;
  backofficeRole?: "ADMIN" | "STAFF" | "MANUFACTURER" | null;
  backofficeDisplayName?: string | null;
}) {
  const pathname = usePathname();
  const [currentView, setCurrentView] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const canSeeItem = (item: { ownerOnly?: boolean; staffOnly?: boolean }) =>
    (!item.ownerOnly || backofficeRole === "ADMIN") &&
    (!item.staffOnly || backofficeRole === "ADMIN" || backofficeRole === "STAFF");
  const visibleNavItems = navItems.filter(canSeeItem);
  const settingsHref = backofficeRole === "ADMIN" ? "/admin/settings" : "/admin/customers?view=settings";
  const visibleCommandItems = commandItems.filter(canSeeItem);

  const isPrintPath =
    /^\/admin\/coupon-issues\/[^/]+\/print$/.test(pathname) ||
    /^\/customers\/[^/]+\/coupons\/[^/]+\/print$/.test(pathname) ||
    /^\/customers\/[^/]+\/coupon\/print\/[^/]+$/.test(pathname) ||
    /^\/admin\/appointments\/[^/]+\/receipt$/.test(pathname);

  useEffect(() => {
    const syncView = () => {
      setCurrentView(new URLSearchParams(window.location.search).get("view") ?? "");
    };

    syncView();
    window.addEventListener("popstate", syncView);
    return () => window.removeEventListener("popstate", syncView);
  }, [pathname]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((value) => !value);
      }

      if (event.key === "Escape") {
        setCommandOpen(false);
        setMobileOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const pageLabel = pathname === "/admin/settings"
    ? "店舗運用設定"
    : pathname === "/admin/account"
      ? "アカウント設定"
    : visibleNavItems.find((item) => isActivePath(pathname, currentView, item.href))?.label ?? "Salon CRM";

  const filteredCommands = visibleCommandItems.filter((item) => {
    const query = commandQuery.trim().toLowerCase();
    if (!query) return true;
    return `${item.label} ${item.hint}`.toLowerCase().includes(query);
  });

  if (
    pathname === "/admin/login" ||
    pathname.startsWith("/admin/password-reset") ||
    publicPathPrefixes.some((prefix) => pathname.startsWith(prefix)) ||
    isPrintPath
  ) {
    return <div className="min-h-screen overflow-x-hidden bg-lien text-lien-ink">{children}</div>;
  }

  const sidebar = (
    <div className="flex h-[100dvh] min-h-0 flex-col bg-[#fffdf9] text-lien-ink md:h-full">
      <div className="border-b border-lien px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <Link href="/admin/customers" className="flex min-w-0 items-center gap-3 text-lien-ink">
            <StoreMark imageUrl={storeIconUrl} />
            <span className="min-w-0">
              <span className="block truncate text-lg font-semibold tracking-normal">Salon de Lien</span>
              <span className="block truncate text-[11px] font-semibold text-lien-muted">既存客を動かす美容室CRM</span>
            </span>
          </Link>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-lien-muted hover:bg-lien-soft md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="メニューを閉じる"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <nav
        className="grid min-h-0 flex-1 content-start gap-1 overflow-y-auto overscroll-contain p-3 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-3"
        aria-label="管理画面ナビゲーション"
      >
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const { view } = splitHref(item.href);
          const active = isActivePath(pathname, currentView, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                setCurrentView(view);
                setMobileOpen(false);
              }}
              className={`lien-nav-item group flex min-h-11 items-center gap-3 rounded-full px-3 text-sm font-semibold transition ${
                active
                  ? "bg-[color:var(--lien-primary)] text-white shadow-sm"
                  : "text-lien-muted hover:bg-lien-soft hover:text-lien-ink"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <Icon className={`h-4 w-4 shrink-0 ${active ? "text-white" : "text-[#a79b91] group-hover:text-[color:var(--lien-primary)]"}`} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}

        <form action="/api/auth/logout" method="post" className="mt-2 border-t border-lien pt-3 md:hidden">
          <button
            type="submit"
            className="flex min-h-11 w-full touch-manipulation items-center gap-3 rounded-full px-3 text-sm font-semibold text-lien-muted transition hover:bg-lien-soft hover:text-lien-ink active:bg-lien-soft"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>ログアウト</span>
          </button>
        </form>
      </nav>

      <div className="mx-3 mb-1 hidden lg:block">
        <BrandVisual
          variant="workflow"
          className="h-28 rounded-[18px] border border-lien shadow-sm"
          imageClassName="object-[24%_58%]"
          sizes="232px"
        >
          <div className="flex h-full items-end bg-gradient-to-t from-[#2f2a25]/70 via-transparent to-transparent p-3">
            <p className="text-xs font-semibold leading-5 text-white">今日の接客を、次の関係へ。</p>
          </div>
        </BrandVisual>
      </div>

      <div className="mt-auto hidden p-3 md:block">
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="flex min-h-11 w-full items-center gap-3 rounded-full px-3 text-sm font-semibold text-lien-muted transition hover:bg-lien-soft hover:text-lien-ink"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>ログアウト</span>
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen overflow-x-hidden bg-lien text-lien-ink">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-lien bg-white/90 shadow-lien-sm md:block">{sidebar}</aside>

      {mobileOpen ? (
        <div className="fixed inset-x-0 top-0 z-50 h-[100dvh] md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-stone-950/35 backdrop-blur-[2px]"
            onClick={() => setMobileOpen(false)}
            aria-label="メニューを閉じる"
          />
          <aside className="relative h-[100dvh] w-[min(18rem,88vw)] border-r border-lien shadow-lien">{sidebar}</aside>
        </div>
      ) : null}

      <div className="min-w-0 md:pl-64">
        <header className="sticky top-0 z-40 border-b border-lien bg-[#fffdf9]/92 backdrop-blur-xl">
          <div className="flex h-14 items-center justify-between px-4 md:hidden">
            <Link href="/admin/customers" className="flex min-w-0 items-center gap-2 font-semibold text-lien-ink">
              <StoreMark imageUrl={storeIconUrl} compact />
              <span className="truncate">Salon de Lien</span>
            </Link>
            <div className="flex items-center gap-2">
              <AccountBadge displayName={backofficeDisplayName} compact />
              <Link
                href={settingsHref}
                onClick={() => setCurrentView("settings")}
                className="lien-icon-button"
                aria-label="設定を開く"
                title="設定"
              >
                <Settings className="h-4 w-4" />
              </Link>
              <button
                type="button"
                className="lien-icon-button text-lien-ink"
                onClick={() => setMobileOpen(true)}
                aria-label="メニューを開く"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="hidden min-h-16 min-w-0 items-center gap-3 px-5 py-3 md:flex lg:px-8">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-lien-muted">Salon de Lien</p>
              <p className="truncate text-sm font-semibold text-lien-ink">{pageLabel}</p>
            </div>
            <form action="/admin/customers" className="relative ml-2 min-w-0 flex-1 max-w-xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#aa9b90]" />
              <input
                name="q"
                placeholder="顧客名・電話・メモで検索"
                className="h-11 w-full rounded-full border border-lien bg-white px-11 text-sm text-lien-ink shadow-sm outline-none placeholder:text-[#a99d93] focus:border-[color:var(--lien-primary)] focus:ring-2 focus:ring-[#ead0c7]"
              />
            </form>
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="lien-button-secondary h-11 px-4 text-xs text-lien-muted"
              aria-label="コマンドパレットを開く"
            >
              <Command className="h-4 w-4" />
              Ctrl K
            </button>
            <AccountBadge displayName={backofficeDisplayName} />
            <Link
              href={settingsHref}
              onClick={() => setCurrentView("settings")}
              className="lien-icon-button shrink-0"
              aria-label="設定を開く"
              title="設定"
            >
              <Settings className="h-4 w-4" />
            </Link>
          </div>
        </header>

        <main className="min-w-0 overflow-x-hidden px-4 py-5 sm:px-6 lg:px-8">{children}</main>
      </div>

      {commandOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-start bg-stone-950/35 px-4 py-16 backdrop-blur-[2px] sm:place-items-center sm:py-4">
          <button className="absolute inset-0" type="button" onClick={() => setCommandOpen(false)} aria-label="コマンドパレットを閉じる" />
          <div className="relative w-full max-w-xl overflow-hidden rounded-[26px] border border-lien bg-[#fffdf9] shadow-lien">
            <div className="flex items-center gap-3 border-b border-lien px-4 py-3">
              <Command className="h-5 w-5 shrink-0 text-[color:var(--lien-primary)]" />
              <input
                autoFocus
                value={commandQuery}
                onChange={(event) => setCommandQuery(event.target.value)}
                placeholder="画面や操作を検索"
                className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#a99d93]"
              />
              <button type="button" onClick={() => setCommandOpen(false)} className="lien-icon-button min-h-9 min-w-9 border-transparent bg-transparent shadow-none" aria-label="閉じる">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid max-h-[60vh] gap-1 overflow-y-auto p-2">
              {filteredCommands.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setCommandOpen(false)}
                    className="lien-list-action flex items-center gap-3 rounded-2xl px-3 py-3 text-lien-ink"
                  >
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[color:var(--lien-primary)] shadow-sm">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{item.label}</span>
                      <span className="block truncate text-xs text-lien-muted">{item.hint}</span>
                    </span>
                  </Link>
                );
              })}
              {filteredCommands.length === 0 ? (
                <div className="p-6 text-center text-sm text-lien-muted">一致する操作がありません。</div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
