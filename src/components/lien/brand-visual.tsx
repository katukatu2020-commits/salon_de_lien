import Image from "next/image";
import type { ReactNode } from "react";

const BRAND_VISUALS = {
  workflow: {
    src: "/brand/salon-interior-illustrated.png",
    alt: "ORIMIAの明るい施術スペースを描いたイラスト"
  },
  customerCrm: {
    src: "/brand/customer-crm.webp",
    alt: "顧客カルテとヘアスタイル記録を確認するサロンのイラスト"
  },
  points: {
    src: "/brand/points-management.webp",
    alt: "ORIMIAの会員カードとポイントを表現したイラスト"
  },
  customerCare: {
    src: "/brand/customer-hair-care.webp",
    alt: "顔が映らない女性のお客様の後ろ姿とヘアケア風景"
  },
  customerCareMale: {
    src: "/brand/customer-hair-care-male.png",
    alt: "顔が映らない男性のお客様の後ろ姿とヘアケア風景"
  },
  products: {
    src: "/brand/salon-product-shelf-illustrated.png",
    alt: "ORIMIA店内の商品棚を描いたイラスト"
  },
  consultation: {
    src: "/brand/consultation.webp",
    alt: "ORIMIAで行うヘアカウンセリング"
  },
  insights: {
    src: "/brand/salon-style-short-dark.jpg",
    alt: "ORIMIAのショートスタイル"
  },
  reviews: {
    src: "/brand/product-collection.webp",
    alt: "ヘアケア商品とお客様アンケートを表現したイラスト"
  },
  history: {
    src: "/brand/customer-visit-history-v2.png",
    alt: "施術後の後ろ姿と来店記録を表現したサロンイラスト"
  },
  profile: {
    src: "/brand/customer-profile-v2.png",
    alt: "髪のプロフィールを表現した鏡とヘアケア用品のイラスト"
  }
} as const;

export type BrandVisualVariant = keyof typeof BRAND_VISUALS;

export function customerCareVisualVariant(gender?: string | null): BrandVisualVariant {
  const normalized = gender?.trim().toLowerCase() ?? "";
  return normalized === "male" || normalized.includes("男性") || normalized.includes("男")
    ? "customerCareMale"
    : "customerCare";
}

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function BrandVisual({
  variant,
  className = "",
  imageClassName = "",
  sizes = "(max-width: 768px) 100vw, 420px",
  priority = false,
  children,
  overlay = "soft"
}: {
  variant: BrandVisualVariant;
  className?: string;
  imageClassName?: string;
  sizes?: string;
  priority?: boolean;
  children?: ReactNode;
  overlay?: "none" | "soft" | "strong";
}) {
  const visual = BRAND_VISUALS[variant];

  return (
    <figure className={cn("relative isolate overflow-hidden bg-[#efe5da]", className)}>
      <Image
        src={visual.src}
        alt={visual.alt}
        fill
        priority={priority}
        sizes={sizes}
        className={cn("object-cover", imageClassName)}
      />
      {overlay !== "none" ? (
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0",
            overlay === "strong"
              ? "bg-gradient-to-t from-[#2f2a25]/65 via-[#2f2a25]/10 to-transparent"
              : "bg-gradient-to-t from-[#2f2a25]/24 via-transparent to-white/5"
          )}
        />
      ) : null}
      {children ? <div className="relative z-10 h-full">{children}</div> : null}
    </figure>
  );
}

export function CustomerVisualHeader({
  variant,
  eyebrow,
  title,
  description,
  badge,
  imageClassName = ""
}: {
  variant: BrandVisualVariant;
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
  imageClassName?: string;
}) {
  return (
    <header className="grid gap-3">
      <BrandVisual
        variant={variant}
        className="h-36 rounded-[22px] border border-[#e8ded2] shadow-sm md:h-48 lg:h-52"
        imageClassName={imageClassName}
        sizes="(max-width: 767px) 100vw, 960px"
        overlay="strong"
      >
        <div className="flex h-full items-end justify-between gap-3 p-4 md:p-6">
          <div className="min-w-0 text-white">
            <p className="text-xs font-semibold text-white/80">{eyebrow}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal drop-shadow-sm md:text-3xl">{title}</h1>
          </div>
          {badge ? <div className="shrink-0">{badge}</div> : null}
        </div>
      </BrandVisual>
      {description ? <p className="text-sm leading-6 text-[#7c7168] md:text-base md:leading-7">{description}</p> : null}
    </header>
  );
}
