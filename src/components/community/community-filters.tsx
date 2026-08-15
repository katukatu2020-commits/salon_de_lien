"use client";

import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CommunityAgeBand, CommunityFilterOption, CommunityListFilters, CommunitySort } from "@/lib/community/visit-community";

const sortOptions: Array<{ value: CommunitySort; label: string }> = [
  { value: "latest", label: "新しい順" },
  { value: "likes", label: "いいねが多い順" },
  { value: "oldest", label: "古い順" }
];

const ageOptions: Array<{ value: CommunityAgeBand; label: string }> = [
  { value: "all", label: "すべての年代" },
  { value: "under20", label: "10代以下" },
  { value: "20s", label: "20代" },
  { value: "30s", label: "30代" },
  { value: "40s", label: "40代" },
  { value: "50s", label: "50代" },
  { value: "60s", label: "60代" },
  { value: "70plus", label: "70代以上" }
];

function FilterSelect({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid min-w-0 gap-1.5">
      <span className="text-[11px] font-semibold text-[#7c7168]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 min-w-0 rounded-xl border border-[#e8ded2] bg-white px-3 text-sm font-medium text-[#2f2a25] outline-none transition focus:border-[#8f4f42] focus:ring-4 focus:ring-[#e9c9be]/40"
      >
        {options.map((option) => <option key={option.value || "all"} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

export function CommunityFilters({
  filters,
  stylists,
  courses,
  genders
}: {
  filters: CommunityListFilters;
  stylists: CommunityFilterOption[];
  courses: CommunityFilterOption[];
  genders: CommunityFilterOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateFilter(name: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("page");
    if (!value || (name === "sort" && value === "latest") || (name === "age" && value === "all")) next.delete(name);
    else next.set(name, value);
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <section className="rounded-[20px] border border-[#e8ded2] bg-white p-4 shadow-[0_12px_35px_rgba(47,42,37,0.05)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold"><SlidersHorizontal className="h-4 w-4 text-[#8f4f42]" />絞り込み・並び順</p>
        <button type="button" onClick={() => router.push(pathname, { scroll: false })} className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-[#7c7168] transition hover:bg-[#f6efe6] hover:text-[#2f2a25]">
          <RotateCcw className="h-3.5 w-3.5" />リセット
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <FilterSelect label="並び順" value={filters.sort} options={sortOptions} onChange={(value) => updateFilter("sort", value)} />
        <FilterSelect label="スタイリスト" value={filters.stylist} options={[{ value: "", label: "すべて" }, ...stylists]} onChange={(value) => updateFilter("stylist", value)} />
        <FilterSelect label="コース" value={filters.course} options={[{ value: "", label: "すべて" }, ...courses]} onChange={(value) => updateFilter("course", value)} />
        <FilterSelect label="性別" value={filters.gender} options={[{ value: "", label: "すべて" }, ...genders]} onChange={(value) => updateFilter("gender", value)} />
        <FilterSelect label="年代" value={filters.age} options={ageOptions} onChange={(value) => updateFilter("age", value)} />
      </div>
    </section>
  );
}
