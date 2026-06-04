"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarDays,
  Clock3,
  Crown,
  Flower2,
  Menu,
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
  { href: "/customers?view=settings", label: "設定", icon: Settings }
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#f7f3ec] text-stone-900">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-stone-200 bg-white/90 backdrop-blur lg:flex lg:flex-col">
        <div className="flex h-[74px] items-center gap-3 border-b border-stone-200 px-7">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-stone-200 bg-[#fbf8f2] text-teal-800">
            <Flower2 className="h-5 w-5" />
          </div>
          <div>
            <div className="font-serif text-2xl leading-none text-stone-900">Salon de Lien</div>
            <div className="mt-1 text-xs font-medium text-stone-500">サロン ド リアン</div>
          </div>
        </div>

        <nav className="grid gap-2 px-3 py-5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/customers"
                ? pathname === "/customers" || pathname.startsWith("/customers/")
                : pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex h-12 items-center gap-3 rounded-md px-4 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-teal-800 text-white shadow-sm"
                    : "text-stone-650 hover:bg-stone-100 hover:text-stone-950"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto grid gap-6 px-7 pb-7">
          <div className="rounded-md border border-stone-100 bg-[#f7efe6] p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-stone-800">
              <Crown className="h-4 w-4 text-amber-700" />
              プレミアムプラン
            </div>
            <p className="mt-1 text-sm font-semibold text-teal-800">契約中</p>
          </div>
          <div className="text-xs text-stone-500">
            <p className="font-semibold text-stone-700">Salon de Lien</p>
            <p className="mt-2">© 2026 Salon de Lien</p>
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
            <div className="ml-auto flex items-center gap-2">
              <button className="hidden h-11 w-11 items-center justify-center rounded-md text-stone-700 hover:bg-stone-100 sm:inline-flex">
                <Bell className="h-5 w-5" />
              </button>
              <button className="hidden h-11 w-11 items-center justify-center rounded-md text-stone-700 hover:bg-stone-100 sm:inline-flex">
                <CalendarDays className="h-5 w-5" />
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
