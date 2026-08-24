import Link from "next/link";
import { BadgePercent, Megaphone, MessageCircle, UsersRound } from "lucide-react";

export function CustomerWorkspaceTabs({ active }: { active: "customers" | "chat" | "messages" | "campaigns" }) {
  const items = [
    { key: "customers" as const, href: "/admin/customers", label: "顧客管理", icon: UsersRound },
    { key: "chat" as const, href: "/admin/customers/messages/chat", label: "チャット", icon: MessageCircle },
    { key: "messages" as const, href: "/admin/customers/messages", label: "配信", icon: Megaphone },
    { key: "campaigns" as const, href: "/admin/customers/messages/campaigns", label: "キャンペーン", icon: BadgePercent }
  ];

  return (
    <nav className="inline-grid w-full grid-cols-4 gap-1 rounded-[18px] border border-lien bg-white p-1 shadow-lien-sm" aria-label="顧客ページ切替">
      {items.map((item) => {
        const Icon = item.icon;
        const selected = active === item.key;

        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={selected ? "page" : undefined}
            className={`lien-segment inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-[14px] px-2 text-[13px] font-semibold transition sm:gap-2 sm:px-4 sm:text-sm ${
              selected
                ? "bg-[color:var(--lien-primary)] text-white shadow-sm"
                : "text-lien-muted hover:bg-lien-soft hover:text-lien-ink"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
