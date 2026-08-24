import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type Tone = "default" | "soft" | "highlight" | "success" | "warning" | "danger" | "premium";

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

const cardToneClass: Record<Tone, string> = {
  default: "border-[color:var(--lien-border)] bg-[color:var(--lien-surface)]",
  soft: "border-[color:var(--lien-border)] bg-[color:var(--lien-surface-soft)]",
  highlight: "border-[color:var(--lien-primary-soft)] bg-[#fff7f3]",
  success: "border-[#cbdcc8] bg-[color:var(--lien-sage-soft)]",
  warning: "border-[#ead09a] bg-[color:var(--lien-warning-soft)]",
  danger: "border-[#edc2bd] bg-[color:var(--lien-danger-soft)]",
  premium: "border-[#ddc68b] bg-gradient-to-br from-white via-[#fff9ee] to-[#f7e8c9]"
};

const badgeToneClass: Record<Tone, string> = {
  default: "border-[color:var(--lien-border)] bg-white text-[color:var(--lien-muted)]",
  soft: "border-[color:var(--lien-border)] bg-[color:var(--lien-surface-soft)] text-[color:var(--lien-ink)]",
  highlight: "border-[color:var(--lien-primary-soft)] bg-[#fff2ed] text-[color:var(--lien-primary-dark)]",
  success: "border-[#cbdcc8] bg-[color:var(--lien-sage-soft)] text-[#405d41]",
  warning: "border-[#ead09a] bg-[color:var(--lien-warning-soft)] text-[#7c4f12]",
  danger: "border-[#edc2bd] bg-[color:var(--lien-danger-soft)] text-[#884039]",
  premium: "border-[#ddc68b] bg-[#fff8e8] text-[#74521a]"
};

export function PageHeader({
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  breadcrumb,
  visual,
  children
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  breadcrumb?: ReactNode;
  visual?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="lien-glass overflow-hidden rounded-[28px] border p-5 sm:p-6">
      <div className={cn("grid gap-5", Boolean(visual) && "lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]")}>
        <div className="flex min-w-0 flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            {breadcrumb ? <div className="mb-3 text-xs font-semibold text-[color:var(--lien-muted)]">{breadcrumb}</div> : null}
            {eyebrow ? (
              <div className="mb-2 inline-flex rounded-full border border-[color:var(--lien-primary-soft)] bg-white/70 px-3 py-1 text-xs font-semibold text-[color:var(--lien-primary-dark)]">
                {eyebrow}
              </div>
            ) : null}
            <h1 className="text-balance text-2xl font-semibold tracking-normal text-[color:var(--lien-ink)] sm:text-3xl">
              {title}
            </h1>
            {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--lien-muted)]">{description}</p> : null}
          </div>
          {(primaryAction || secondaryAction) ? (
            <div className="flex w-full shrink-0 flex-wrap gap-2 sm:w-auto [&>*]:min-h-11 [&>*]:flex-1 sm:[&>*]:flex-none">
              {secondaryAction}
              {primaryAction}
            </div>
          ) : null}
        </div>
        {visual ? (
          <div className="min-h-36 overflow-hidden rounded-[20px] border border-white/70 shadow-sm lg:min-h-40">
            {visual}
          </div>
        ) : null}
      </div>
      {children ? <div className="mt-5">{children}</div> : null}
    </header>
  );
}

export function LienCard({
  children,
  className = "",
  tone = "default",
  hoverable = false,
  as: Tag = "section"
}: {
  children: ReactNode;
  className?: string;
  tone?: Tone;
  hoverable?: boolean;
  as?: "section" | "article" | "div";
}) {
  return (
    <Tag
      className={cn(
        "min-w-0 rounded-[22px] border p-5 shadow-lien-sm transition sm:p-6",
        cardToneClass[tone],
        hoverable && "lien-hover-lift",
        className
      )}
    >
      {children}
    </Tag>
  );
}

export function MetricCard({
  label,
  value,
  unit,
  delta,
  helper,
  icon: Icon,
  tone = "default"
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  delta?: ReactNode;
  helper?: ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
}) {
  return (
    <LienCard tone={tone} className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-[color:var(--lien-muted)]">{label}</p>
          <div className="mt-2 flex min-w-0 flex-nowrap items-baseline gap-1 whitespace-nowrap text-[color:var(--lien-ink)]">
            <span className="tabular-nums text-2xl font-semibold leading-none 2xl:text-3xl">{value}</span>
            {unit ? <span className="text-xs font-semibold text-[color:var(--lien-muted)]">{unit}</span> : null}
          </div>
        </div>
        {Icon ? (
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/80 text-[color:var(--lien-primary)] shadow-sm">
            <Icon className="h-5 w-5" />
          </span>
        ) : null}
      </div>
      {delta ? <div className="mt-3 text-xs font-semibold text-[color:var(--lien-primary-dark)]">{delta}</div> : null}
      {helper ? <p className="mt-2 text-xs leading-5 text-[color:var(--lien-muted)]">{helper}</p> : null}
    </LienCard>
  );
}

export function StatusBadge({
  children,
  tone = "default",
  icon: Icon,
  className = ""
}: {
  children: ReactNode;
  tone?: Tone;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <span className={cn("lien-badge", badgeToneClass[tone], className)}>
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {children}
    </span>
  );
}

export function QuickActionCard({
  icon: Icon,
  title,
  description,
  reason,
  action,
  priority = "normal"
}: {
  icon: LucideIcon;
  title: ReactNode;
  description: ReactNode;
  reason?: ReactNode;
  action?: ReactNode;
  priority?: "high" | "normal" | "low";
}) {
  const tone: Tone = priority === "high" ? "highlight" : priority === "low" ? "soft" : "premium";

  return (
    <LienCard tone={tone} as="article" className="p-4">
      <div className="flex gap-3">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[color:var(--lien-primary)] shadow-sm">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[color:var(--lien-ink)]">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-[color:var(--lien-muted)]">{description}</p>
          {reason ? <p className="mt-2 text-xs font-semibold text-[color:var(--lien-primary-dark)]">{reason}</p> : null}
          {action ? <div className="mt-4">{action}</div> : null}
        </div>
      </div>
    </LienCard>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action
}: {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-[22px] border border-dashed border-[color:var(--lien-border-strong)] bg-[color:var(--lien-surface-soft)] p-6 text-center">
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[color:var(--lien-primary-soft)]/45" />
      <div className="pointer-events-none absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-[color:var(--lien-accent-soft)]/70" />
      <div className="relative mx-auto flex max-w-md flex-col items-center">
        {Icon ? (
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-[color:var(--lien-primary)] shadow-sm">
            <Icon className="h-6 w-6" />
          </span>
        ) : null}
        <p className="mt-3 text-sm font-semibold text-[color:var(--lien-ink)]">{title}</p>
        {description ? <p className="mt-2 text-sm leading-6 text-[color:var(--lien-muted)]">{description}</p> : null}
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    </div>
  );
}

export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="animate-pulse rounded-[18px] border border-[color:var(--lien-border)] bg-white p-4">
          <div className="h-3 w-1/3 rounded-full bg-[#eadfd3]" />
          <div className="mt-3 h-5 w-2/3 rounded-full bg-[#eee4d9]" />
          <div className="mt-3 h-3 w-full rounded-full bg-[#f1e8df]" />
        </div>
      ))}
    </div>
  );
}
