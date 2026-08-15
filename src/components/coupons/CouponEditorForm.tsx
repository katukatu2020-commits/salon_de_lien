"use client";

import { Eye, RefreshCcw, Save, TicketPercent } from "lucide-react";
import { useMemo, useState } from "react";
import { CouponFieldWarning } from "@/components/coupons/CouponFieldWarning";
import { CouponFlyerPreview } from "@/components/coupons/CouponFlyerPreview";
import { LienCard } from "@/components/lien/lien-ui";
import { DEFAULT_COUPON_MENUS } from "@/lib/coupons/coupon-defaults";
import { generateCouponIssueCode } from "@/lib/coupons/coupon-code";
import { couponFlyerWarnings } from "@/lib/coupons/coupon-render-utils";
import { validateCouponIssueInput, type CouponIssueInput } from "@/lib/coupons/coupon-validation";

export type CouponEditorInitialValues = {
  customerName: string;
  discountRate: number;
  targetMenus: string[];
  issuedAt: string;
  expiresAt: string;
  couponCode: string;
};

type CouponEditorFormProps = {
  customerId: string;
  initialValues: CouponEditorInitialValues;
  createAction: (formData: FormData) => Promise<void>;
};

export function CouponEditorForm({ customerId, initialValues, createAction }: CouponEditorFormProps) {
  const [customerName, setCustomerName] = useState(initialValues.customerName);
  const [discountRate, setDiscountRate] = useState(String(initialValues.discountRate));
  const [targetMenus, setTargetMenus] = useState(initialValues.targetMenus.join("\n"));
  const [issuedAt, setIssuedAt] = useState(initialValues.issuedAt);
  const [expiresAt, setExpiresAt] = useState(initialValues.expiresAt);
  const [couponCode, setCouponCode] = useState(initialValues.couponCode);

  const previewIssue = useMemo<CouponIssueInput>(() => {
    return {
      customerId,
      customerName,
      discountRate: Number(discountRate),
      targetMenus: splitMenus(targetMenus),
      issuedAt: parseInputDate(issuedAt),
      expiresAt: parseInputDate(expiresAt),
      couponCode
    };
  }, [customerId, couponCode, customerName, discountRate, expiresAt, issuedAt, targetMenus]);

  const validation = useMemo(() => validateCouponIssueInput(previewIssue), [previewIssue]);
  const warnings = useMemo(() => {
    return [...validation.warnings, ...couponFlyerWarnings(previewIssue)];
  }, [previewIssue, validation.warnings]);

  return (
    <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,430px)_minmax(360px,1fr)]">
      <LienCard as="div" className="p-0">
        <form action={createAction} className="grid min-w-0 gap-5 p-5 sm:p-6">
          <input type="hidden" name="customerId" value={customerId} />

          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--lien-primary-soft)] bg-[#fff2ed] px-3 py-1 text-xs font-semibold text-[color:var(--lien-primary-dark)]">
              <TicketPercent className="h-4 w-4" />
              クーポン作成
            </div>
            <h2 className="mt-3 text-xl font-semibold text-[color:var(--lien-ink)]">入力すると右のチラシに反映されます</h2>
            <p className="mt-2 text-sm leading-6 text-[color:var(--lien-muted)]">
              背景テンプレートは固定し、顧客名・割引率・対象メニュー・有効期限・ご利用コードだけを安全に差し替えます。
            </p>
          </div>

          <label className="grid gap-1.5 text-sm font-semibold text-[color:var(--lien-ink)]">
            顧客名
            <input
              name="customerName"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              className="lien-input"
              required
            />
          </label>

          <label className="grid gap-1.5 text-sm font-semibold text-[color:var(--lien-ink)]">
            割引率
            <div className="relative">
              <input
                name="discountRate"
                type="number"
                min={5}
                max={30}
                step={1}
                value={discountRate}
                onChange={(event) => setDiscountRate(event.target.value)}
                className="lien-input pr-14 tabular-nums"
                required
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[color:var(--lien-muted)]">
                %OFF
              </span>
            </div>
          </label>

          <label className="grid gap-1.5 text-sm font-semibold text-[color:var(--lien-ink)]">
            対象メニュー
            <textarea
              name="targetMenus"
              value={targetMenus}
              onChange={(event) => setTargetMenus(event.target.value)}
              rows={6}
              className="lien-input py-3"
              required
            />
            <span className="text-xs font-medium text-[color:var(--lien-muted)]">1行に1メニュー。最大6件までチラシに収まります。</span>
          </label>

          <div className="flex flex-wrap gap-2">
            {DEFAULT_COUPON_MENUS.map((menu) => (
              <button
                key={menu}
                type="button"
                onClick={() => addMenu(menu, targetMenus, setTargetMenus)}
                className="min-h-9 rounded-full border border-[color:var(--lien-border)] bg-[color:var(--lien-surface-soft)] px-3 text-xs font-semibold text-[color:var(--lien-ink)] hover:bg-white"
              >
                {menu}
              </button>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold text-[color:var(--lien-ink)]">
              発行日
              <input
                name="issuedAt"
                type="date"
                value={issuedAt}
                onChange={(event) => setIssuedAt(event.target.value)}
                className="lien-input"
                required
              />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-[color:var(--lien-ink)]">
              有効期限
              <input
                name="expiresAt"
                type="date"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
                className="lien-input"
                required
              />
            </label>
          </div>

          <label className="grid gap-1.5 text-sm font-semibold text-[color:var(--lien-ink)]">
            ご利用コード（JAN）
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
              <input
                name="couponCode"
                value={couponCode}
                onChange={(event) => setCouponCode(event.target.value.replace(/\D/g, "").slice(0, 13))}
                inputMode="numeric"
                pattern="\d{13}"
                maxLength={13}
                className="lien-input min-w-0 flex-1 font-mono tabular-nums"
                required
              />
              <button type="button" onClick={() => setCouponCode(generateCouponIssueCode(parseInputDate(issuedAt)))} className="lien-button-secondary px-4">
                <RefreshCcw className="h-4 w-4" />
                再生成
              </button>
            </div>
          </label>

          {validation.errors.length > 0 ? (
            <div className="rounded-[18px] border border-[#edc2bd] bg-[color:var(--lien-danger-soft)] p-3 text-sm text-[#884039]">
              <p className="font-semibold">保存前に修正が必要です</p>
              <ul className="mt-2 grid gap-1">
                {validation.errors.map((error) => (
                  <li key={error}>・{error}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <CouponFieldWarning warnings={warnings} />

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button type="button" className="lien-button-secondary">
              <Eye className="h-4 w-4" />
              プレビュー更新
            </button>
            <button
              type="submit"
              disabled={validation.errors.length > 0}
              className="lien-button-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              保存して印刷ページへ
            </button>
          </div>
        </form>
      </LienCard>

      <div className="grid min-w-0 gap-3 overflow-hidden">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[color:var(--lien-ink)]">印刷プレビュー</h2>
            <p className="text-sm text-[color:var(--lien-muted)]">印刷ページと同じテンプレートです。</p>
          </div>
        </div>
        <CouponFlyerPreview issue={previewIssue} />
      </div>
    </div>
  );
}

function splitMenus(value: string) {
  return value
    .split(/\r?\n|,/g)
    .map((menu) => menu.trim())
    .filter(Boolean);
}

function parseInputDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isFinite(date.getTime()) ? date : new Date("Invalid Date");
}

function addMenu(menu: string, currentValue: string, setValue: (value: string) => void) {
  const menus = splitMenus(currentValue);
  if (menus.includes(menu)) {
    return;
  }

  setValue([...menus, menu].join("\n"));
}

export function buildDefaultCouponEditorValues(customerName: string, couponCode: string, issuedAt: string, expiresAt: string): CouponEditorInitialValues {
  return {
    customerName,
    discountRate: 10,
    targetMenus: ["カット"],
    issuedAt,
    expiresAt,
    couponCode
  };
}
