"use client";

import { useRef } from "react";
import { Search } from "lucide-react";

type ManufacturerProductReportFiltersProps = {
  manufacturer: string;
  manufacturerOptions: string[];
  productName: string;
  productNameOptions: string[];
  category: string;
  categoryOptions: string[];
  from: string;
  to: string;
};

export function ManufacturerProductReportFilters({
  manufacturer,
  manufacturerOptions,
  productName,
  productNameOptions,
  category,
  categoryOptions,
  from,
  to
}: ManufacturerProductReportFiltersProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const productNameRef = useRef<HTMLSelectElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);

  function submitFilters() {
    formRef.current?.requestSubmit();
  }

  function handleManufacturerChange() {
    // Manufacturer owns the available products/categories, so stale child filters must be cleared.
    if (productNameRef.current) productNameRef.current.value = "";
    if (categoryRef.current) categoryRef.current.value = "";
    submitFilters();
  }

  return (
    <form
      ref={formRef}
      action="/admin/products"
      className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_auto]"
    >
      <input type="hidden" name="section" value="feedback" />
      <label className="grid gap-1.5 text-sm font-semibold text-lien-ink">
        メーカー
        <select name="manufacturer" defaultValue={manufacturer} className="lien-input" onChange={handleManufacturerChange}>
          {manufacturerOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5 text-sm font-semibold text-lien-ink">
        商品名
        <select
          ref={productNameRef}
          name="productName"
          defaultValue={productName}
          className="lien-input"
          onChange={submitFilters}
        >
          <option value="">すべての商品</option>
          {productNameOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5 text-sm font-semibold text-lien-ink">
        カテゴリ
        <select ref={categoryRef} name="category" defaultValue={category} className="lien-input" onChange={submitFilters}>
          <option value="">すべてのカテゴリ</option>
          {categoryOptions.map((categoryName) => (
            <option key={categoryName} value={categoryName}>
              {categoryName}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5 text-sm font-semibold text-lien-ink">
        開始日
        <input name="from" type="date" defaultValue={from} className="lien-input" onChange={submitFilters} />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold text-lien-ink">
        終了日
        <input name="to" type="date" defaultValue={to} className="lien-input" onChange={submitFilters} />
      </label>
      <button className="lien-button-primary mt-auto">
        <Search className="h-4 w-4" />
        更新
      </button>
    </form>
  );
}
