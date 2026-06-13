"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Menu, Plus, Search, Sparkles, UserRound, UsersRound, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

const navItems = [
  { href: "/customers", label: "顧客", icon: UsersRound },
  { href: "/customers/new", label: "新規", icon: UserRound },
  { href: "/customers?view=calendar", label: "予約", icon: CalendarDays },
  { href: "/customers?view=styles", label: "提案", icon: Sparkles }
];

const publicPathPrefixes = ["/app/", "/proposals/", "/intake", "/feedback/", "/care/", "/appointments/"];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [currentView, setCurrentView] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const syncView = () => {
      setCurrentView(new URLSearchParams(window.location.search).get("view") ?? "");
    };

    syncView();
    window.addEventListener("popstate", syncView);
    return () => window.removeEventListener("popstate", syncView);
  }, [pathname]);

  if (publicPathPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return <div className="min-h-screen bg-stone-50 text-stone-950">{children}</div>;
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-white text-stone-950">
      <div className="flex h-16 items-center justify-between border-b border-stone-200 px-4">
        <Link href="/customers" className="font-serif text-xl font-semibold tracking-normal text-stone-950">
          Salon de Lien
        </Link>
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-stone-600 hover:bg-stone-100 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="メニューを閉じる"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="grid gap-1 p-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const itemView = item.href.includes("?") ? new URLSearchParams(item.href.split("?")[1]).get("view") ?? "" : "";
          const active =
            item.href === "/customers"
              ? (pathname === "/customers" && currentView === "") ||
                (pathname.startsWith("/customers/") && pathname !== "/customers/new")
              : itemView
                ? pathname === "/customers" && currentView === itemView
                : pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                setCurrentView(itemView);
                setMobileOpen(false);
              }}
              className={`flex h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition-colors ${
                active ? "bg-teal-50 text-teal-950 ring-1 ring-teal-100" : "text-stone-600 hover:bg-stone-50 hover:text-stone-950"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50 text-stone-950">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 border-r border-stone-200 lg:block">{sidebar}</aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-stone-950/30"
            onClick={() => setMobileOpen(false)}
            aria-label="メニューを閉じる"
          />
          <aside className="relative h-full w-64 border-r border-stone-200 shadow-xl">{sidebar}</aside>
        </div>
      ) : null}

      <div className="lg:pl-56">
        <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/95 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-700 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="メニューを開く"
            >
              <Menu className="h-5 w-5" />
            </button>
            <form action="/customers" className="relative min-w-0 flex-1 lg:max-w-lg">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                name="q"
                placeholder="顧客名・電話・メモで検索"
                className="h-10 w-full rounded-md border border-stone-200 bg-white px-9 text-sm shadow-sm outline-none placeholder:text-stone-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              />
            </form>
            <Link
              href="/customers/new"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-teal-800 px-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-900"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">新規</span>
            </Link>
          </div>
        </header>
        <main className="px-4 py-5 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
