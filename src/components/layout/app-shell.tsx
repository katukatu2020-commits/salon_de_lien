"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarDays,
  Clock3,
  Crown,
  BarChart3,
  Menu,
  MessageCircle,
  Plus,
  Search,
  Settings,
  Sparkles,
  UserRound,
  UsersRound
} from "lucide-react";
import type { ReactNode } from "react";

const navItems = [
  { href: "/customers", label: "顧客一覧", icon: UsersRound },
  { href: "/customers/new", label: "新規顧客", icon: UserRound },
  { href: "/customers?view=visits", label: "来店履歴", icon: Clock3 },
  { href: "/customers?view=styles", label: "髪型提案", icon: Sparkles },
  { href: "/customers?view=calendar", label: "カレンダー", icon: CalendarDays },
  { href: "/customers?view=messages", label: "メッセージ", icon: MessageCircle },
  { href: "/customers?view=analytics", label: "集計・分析", icon: BarChart3 },
  { href: "/customers?view=settings", label: "設定", icon: Settings }
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#f8f5ef] text-stone-900">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-teal-950/40 bg-gradient-to-b from-[#073f3c] via-[#073b38] to-[#062f2d] text-white shadow-xl lg:flex lg:flex-col">
        <div className="flex h-[92px] items-center gap-3 px-7">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-amber-200/60 bg-white/5 font-serif text-2xl text-amber-200">
            L
          </div>
          <div>
            <div className="font-serif text-2xl leading-none text-white">Salon de Lien</div>
            <div className="mt-2 text-xs font-semibold text-white/80">サロン・ド・リアン</div>
          </div>
        </div>

        <nav className="grid gap-2 px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/customers"
                ? pathname === "/customers" || (pathname.startsWith("/customers/") && pathname !== "/customers/new")
                : pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex h-12 items-center gap-3 rounded-md px-4 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-white/16 text-white shadow-sm"
                    : "text-white/82 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto grid gap-6 border-t border-white/10 px-5 pb-6 pt-6">
          <div className="rounded-md border border-amber-200/60 bg-white/5 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Crown className="h-4 w-4 text-amber-200" />
              プレミアムプラン
            </div>
            <p className="mt-2 text-xs text-white/80">ご利用中</p>
            <p className="mt-3 text-xs text-white/80">有効期限: 2026/12/31</p>
            <button className="mt-3 h-9 w-full rounded-md border border-amber-200/70 text-xs font-semibold text-white hover:bg-white/10">
              プランを確認
            </button>
          </div>
          <div className="flex items-center gap-3 text-xs text-white/75">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/12 font-semibold text-white">
              佐
            </div>
            <div>
              <p className="font-semibold text-white">佐藤 真一</p>
              <p className="mt-1">スタイリスト</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/90 backdrop-blur">
          <div className="flex h-[74px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-700 lg:hidden"
              aria-label="メニュー"
            >
              <Menu className="h-5 w-5" />
            </button>
            <form action="/customers" className="relative min-w-0 flex-1 lg:max-w-xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
              <input
                name="q"
                placeholder="顧客名・電話番号・メモで検索"
                className="h-11 w-full rounded-md border border-stone-200 bg-white px-11 text-sm shadow-sm outline-none placeholder:text-stone-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              />
            </form>
            <div className="ml-auto flex items-center gap-3">
              <button className="hidden h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold text-stone-700 hover:bg-stone-100 md:inline-flex">
                <CalendarDays className="h-5 w-5" />
                予約カレンダー
              </button>
              <button className="hidden h-11 w-11 items-center justify-center rounded-md text-stone-700 hover:bg-stone-100 sm:inline-flex">
                <Bell className="h-5 w-5" />
              </button>
              <Link
                href="/customers/new"
                className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-teal-800 text-white shadow-sm hover:bg-teal-900 sm:hidden"
                aria-label="新規顧客"
              >
                <Plus className="h-5 w-5" />
              </Link>
              <div className="hidden items-center gap-3 pl-2 sm:flex">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eadfd4] text-sm font-bold text-stone-800">
                  佐
                </div>
                <div className="hidden leading-tight xl:block">
                  <p className="text-sm font-semibold text-stone-900">佐藤 美咲</p>
                  <p className="mt-1 text-xs text-stone-500">スタイリスト</p>
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="px-4 py-5 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
