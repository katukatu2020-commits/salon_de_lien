"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  BadgeJapaneseYen,
  Coins,
  CreditCard,
  LoaderCircle,
  Percent,
  Plus,
  Ruler,
  Scissors,
  Trash2,
  X
} from "lucide-react";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { completeAppointmentCheckoutAction } from "@/lib/actions/appointment-actions";
import { LONG_HAIR_FEES, type LongHairLength } from "@/lib/appointments/checkout-items";
import { includedTaxAmount } from "@/lib/salon/operational-settings";

type CheckoutCoupon = {
  value: string;
  label: string;
  detail: string;
  rate: number;
};

type CheckoutProduct = {
  id: string;
  manufacturerName: string;
  name: string;
  category: string | null;
  retailPrice: number;
  stockQuantity: number;
};

type PickerSection = "long" | "product" | "coupon" | "points";

function clampInteger(value: number, minimum: number, maximum: number) {
  if (!Number.isFinite(value)) return minimum;
  return Math.min(maximum, Math.max(minimum, Math.floor(value)));
}

function CheckoutSubmittingOverlay() {
  const { pending } = useFormStatus();
  if (!pending) return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-[#fbf7f0]/95 px-6 backdrop-blur-sm" role="status" aria-live="assertive" aria-label="会計処理中">
      <div className="grid max-w-sm justify-items-center text-center">
        <span className="grid h-20 w-20 place-items-center rounded-full border border-[#e8ded2] bg-white text-[color:var(--lien-primary)] shadow-lien">
          <LoaderCircle className="h-10 w-10 animate-spin" aria-hidden="true" />
        </span>
        <p className="mt-6 text-xl font-semibold text-[color:var(--lien-ink)]">会計処理中です</p>
        <p className="mt-2 text-sm leading-6 text-[color:var(--lien-muted)]">売上・ポイント・購入商品を記録しています。<br />そのままお待ちください。</p>
      </div>
    </div>
  );
}

function ItemPicker({
  open,
  onClose,
  section,
  setSection,
  longHairLength,
  setLongHairLength,
  products,
  productLines,
  addProduct,
  coupons,
  couponSelection,
  setCouponSelection,
  availablePoints,
  maxPointDiscount,
  pointDiscount,
  setPointDiscount
}: {
  open: boolean;
  onClose: () => void;
  section: PickerSection;
  setSection: (section: PickerSection) => void;
  longHairLength: LongHairLength | "";
  setLongHairLength: (value: LongHairLength | "") => void;
  products: CheckoutProduct[];
  productLines: Array<{ productId: string; quantity: number }>;
  addProduct: (productId: string) => void;
  coupons: CheckoutCoupon[];
  couponSelection: string;
  setCouponSelection: (value: string) => void;
  availablePoints: number;
  maxPointDiscount: number;
  pointDiscount: number;
  setPointDiscount: (value: number) => void;
}) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose, open]);

  if (!open) return null;

  const sections: Array<{ key: PickerSection; label: string }> = [
    { key: "long", label: "ロング料金" },
    { key: "product", label: "商品" },
    { key: "coupon", label: "クーポン" },
    { key: "points", label: "ポイント" }
  ];

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[#2f2a25]/45 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => {
      if (event.currentTarget === event.target) onClose();
    }}>
      <section role="dialog" aria-modal="true" aria-labelledby="checkout-item-picker-title" className="flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[26px] border border-[#e8ded2] bg-[#fbf7f0] shadow-2xl sm:rounded-[26px]">
        <header className="flex items-center justify-between gap-4 border-b border-[#e8ded2] bg-white px-5 py-4">
          <div>
            <p className="text-xs font-semibold text-[color:var(--lien-primary)]">会計項目</p>
            <h2 id="checkout-item-picker-title" className="mt-1 text-lg font-semibold">追加する項目を選択</h2>
          </div>
          <button type="button" onClick={onClose} className="lien-icon-button h-11 w-11" aria-label="閉じる">
            <X className="h-5 w-5" />
          </button>
        </header>

        <nav className="grid grid-cols-4 gap-1.5 border-b border-[#e8ded2] bg-white px-4 py-3 sm:gap-2" aria-label="会計項目の種類">
          {sections.map((item) => (
            <button key={item.key} type="button" onClick={() => setSection(item.key)} aria-pressed={section === item.key} className={`lien-segment min-h-10 min-w-0 rounded-full px-1.5 text-xs font-semibold transition sm:px-4 sm:text-sm ${section === item.key ? "bg-[color:var(--lien-primary)] text-white shadow-sm" : "bg-[color:var(--lien-surface-soft)] text-[color:var(--lien-ink)]"}`}>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {section === "long" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => { setLongHairLength(""); onClose(); }} aria-pressed={longHairLength === ""} className={`lien-list-action min-h-16 rounded-2xl border px-4 text-left shadow-sm ${longHairLength === "" ? "border-[color:var(--lien-primary)] bg-[#f8e9e3] ring-2 ring-[#e9c9be]/45" : "border-[#e8ded2] bg-white"}`}>
                <span className="block text-sm font-semibold">ロング料金なし</span>
                <span className="mt-1 block text-xs text-[color:var(--lien-muted)]">追加 0円</span>
              </button>
              {(Object.entries(LONG_HAIR_FEES) as Array<[LongHairLength, number]>).map(([length, price]) => (
                <button key={length} type="button" onClick={() => { setLongHairLength(length); onClose(); }} aria-pressed={longHairLength === length} className={`lien-list-action min-h-16 rounded-2xl border px-4 text-left shadow-sm ${longHairLength === length ? "border-[color:var(--lien-primary)] bg-[#f8e9e3] ring-2 ring-[#e9c9be]/45" : "border-[#e8ded2] bg-white"}`}>
                  <span className="block text-sm font-semibold">ロング料金 {length}</span>
                  <span className="mt-1 block text-xs tabular-nums text-[color:var(--lien-muted)]">+{price.toLocaleString("ja-JP")}円</span>
                </button>
              ))}
            </div>
          ) : null}

          {section === "product" ? (
            <div className="grid gap-2">
              {products.length === 0 ? <p className="rounded-2xl bg-white px-4 py-5 text-sm text-[color:var(--lien-muted)]">商品棚に販売可能な商品がありません。</p> : products.map((product) => {
                const selected = productLines.some((line) => line.productId === product.id);
                const unavailable = product.stockQuantity < 1;
                return (
                  <button key={product.id} type="button" disabled={selected || unavailable} onClick={() => addProduct(product.id)} className="lien-list-action flex min-h-16 items-center justify-between gap-3 rounded-2xl border border-[#e8ded2] bg-white px-4 text-left shadow-sm disabled:opacity-45">
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-[color:var(--lien-primary)]">{product.manufacturerName}</span>
                      <span className="mt-1 block break-words text-sm font-semibold">{product.name}</span>
                    </span>
                    <span className="shrink-0 text-right text-xs tabular-nums text-[color:var(--lien-muted)]">{product.retailPrice.toLocaleString("ja-JP")}円<br />在庫 {product.stockQuantity}</span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {section === "coupon" ? (
            <div className="grid gap-3">
              <button type="button" onClick={() => { setCouponSelection(""); onClose(); }} aria-pressed={couponSelection === ""} className={`lien-list-action min-h-16 rounded-2xl border px-4 text-left shadow-sm ${couponSelection === "" ? "border-[color:var(--lien-primary)] bg-[#f8e9e3] ring-2 ring-[#e9c9be]/45" : "border-[#e8ded2] bg-white"}`}>
                <span className="block text-sm font-semibold">クーポンを利用しない</span>
              </button>
              {coupons.map((coupon) => (
                <button key={coupon.value} type="button" onClick={() => { setCouponSelection(coupon.value); onClose(); }} aria-pressed={couponSelection === coupon.value} className={`lien-list-action min-h-16 rounded-2xl border px-4 text-left shadow-sm ${couponSelection === coupon.value ? "border-[color:var(--lien-primary)] bg-[#f8e9e3] ring-2 ring-[#e9c9be]/45" : "border-[#e8ded2] bg-white"}`}>
                  <span className="block text-sm font-semibold">{coupon.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-[color:var(--lien-muted)]">{coupon.detail}</span>
                </button>
              ))}
              {coupons.length === 0 ? <p className="rounded-2xl bg-white px-4 py-5 text-sm text-[color:var(--lien-muted)]">現在利用できるクーポンはありません。</p> : null}
            </div>
          ) : null}

          {section === "points" ? (
            <div className="rounded-2xl border border-[#e8ded2] bg-white p-4">
              <p className="text-sm font-semibold">利用ポイント</p>
              <p className="mt-1 text-xs leading-5 text-[color:var(--lien-muted)]">保有 {availablePoints.toLocaleString("ja-JP")}pt / 今回の上限 {maxPointDiscount.toLocaleString("ja-JP")}pt</p>
              <div className="mt-4 flex items-center gap-2">
                <input className="lien-input min-w-0 flex-1 tabular-nums" type="number" min="0" max={maxPointDiscount} step="1" value={Math.min(pointDiscount, maxPointDiscount)} onChange={(event) => setPointDiscount(clampInteger(Number(event.target.value), 0, maxPointDiscount))} />
                <span className="text-sm font-semibold text-[color:var(--lien-muted)]">pt</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" className="lien-button-secondary min-h-10 px-3 text-xs" onClick={() => setPointDiscount(0)}>利用しない</button>
                <button type="button" className="lien-button-primary min-h-10 px-3 text-xs" onClick={() => setPointDiscount(maxPointDiscount)} disabled={maxPointDiscount < 1}>上限まで使う</button>
              </div>
              <button type="button" className="mt-4 w-full text-center text-sm font-semibold text-[color:var(--lien-primary)]" onClick={onClose}>決定</button>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export function AppointmentCheckoutForm({
  appointmentId,
  initialMenu,
  initialSubtotal,
  availablePoints,
  coupons,
  products,
  taxRate
}: {
  appointmentId: string;
  initialMenu: string;
  initialSubtotal: number;
  availablePoints: number;
  coupons: CheckoutCoupon[];
  products: CheckoutProduct[];
  taxRate: number;
}) {
  const [subtotal, setSubtotal] = useState(initialSubtotal);
  const [longHairLength, setLongHairLength] = useState<LongHairLength | "">("");
  const [couponSelection, setCouponSelection] = useState("");
  const [pointDiscount, setPointDiscount] = useState(0);
  const [productLines, setProductLines] = useState<Array<{ productId: string; quantity: number }>>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSection, setPickerSection] = useState<PickerSection>("long");

  const longCharge = longHairLength ? LONG_HAIR_FEES[longHairLength] : 0;
  const serviceTotal = subtotal + longCharge;
  const productTotal = useMemo(() => productLines.reduce((sum, line) => {
    const product = products.find((item) => item.id === line.productId);
    return sum + line.quantity * (product?.retailPrice ?? 0);
  }, 0), [productLines, products]);
  const selectedCoupon = coupons.find((coupon) => coupon.value === couponSelection) ?? null;
  const couponDiscount = selectedCoupon ? Math.floor((Math.max(0, serviceTotal) * selectedCoupon.rate) / 100) : 0;
  const checkoutSubtotal = serviceTotal + productTotal;
  const checkoutAfterCoupon = Math.max(0, checkoutSubtotal - couponDiscount);
  const maxPointDiscount = Math.min(availablePoints, Math.floor(checkoutAfterCoupon * 0.5));
  const appliedPoints = Math.min(pointDiscount, maxPointDiscount);
  const finalAmount = Math.max(0, checkoutAfterCoupon - appliedPoints);
  const includedTax = includedTaxAmount(finalAmount, taxRate);
  const checkoutAction = completeAppointmentCheckoutAction.bind(null, appointmentId);

  function openPicker(section: PickerSection) {
    setPickerSection(section);
    setPickerOpen(true);
  }

  function addProduct(productId: string) {
    const product = products.find((item) => item.id === productId);
    if (!product || product.stockQuantity < 1 || productLines.some((line) => line.productId === product.id)) return;
    setProductLines((current) => [...current, { productId: product.id, quantity: 1 }]);
  }

  function updateProductQuantity(productId: string, quantity: number) {
    setProductLines((current) => current.map((line) => line.productId === productId ? { ...line, quantity } : line));
  }

  return (
    <form action={checkoutAction} className="grid gap-5">
      <CheckoutSubmittingOverlay />
      <input type="hidden" name="longHairLength" value={longHairLength} />
      <input type="hidden" name="couponSelection" value={couponSelection} />
      <input type="hidden" name="pointDiscount" value={appliedPoints} />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">
          <span className="inline-flex items-center gap-2"><Scissors className="h-4 w-4 text-[color:var(--lien-primary)]" />本日のメニュー</span>
          <input className="lien-input" name="menu" defaultValue={initialMenu} placeholder="カット + カラー" required />
        </label>
        <label className="grid gap-1.5 text-sm font-semibold">
          <span className="inline-flex items-center gap-2"><BadgeJapaneseYen className="h-4 w-4 text-[color:var(--lien-primary)]" />基本施術料金</span>
          <input className="lien-input tabular-nums" name="subtotal" type="number" min="1" step="1" value={subtotal} onChange={(event) => setSubtotal(clampInteger(Number(event.target.value), 0, 10_000_000))} required />
        </label>
        <label className="grid gap-1.5 text-sm font-semibold">
          <span className="inline-flex items-center gap-2"><CreditCard className="h-4 w-4 text-[color:var(--lien-primary)]" />支払い方法</span>
          <select className="lien-input" name="paymentMethod" defaultValue="" required>
            <option value="" disabled>選択してください</option><option value="現金">現金</option><option value="カード">カード</option><option value="QR決済">QR決済</option><option value="電子マネー">電子マネー</option><option value="未収">未収</option>
          </select>
        </label>
      </div>

      <section className="overflow-hidden rounded-[22px] border border-[color:var(--lien-border)] bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-[color:var(--lien-border)] px-4 py-4">
          <div>
            <h3 className="text-sm font-semibold">会計項目</h3>
            <p className="mt-1 text-xs text-[color:var(--lien-muted)]">追加料金・商品・割引をここにまとめます。</p>
          </div>
          <button type="button" onClick={() => openPicker("long")} className="lien-button-primary px-4">
            <Plus className="h-4 w-4" />項目を追加
          </button>
        </div>

        <div className="divide-y divide-[color:var(--lien-border)]">
          {longHairLength ? (
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="inline-flex items-center gap-2 text-sm font-semibold"><Ruler className="h-4 w-4 text-[color:var(--lien-primary)]" />ロング料金 {longHairLength}</span>
              <span className="flex items-center gap-2"><span className="text-sm font-semibold tabular-nums">+{longCharge.toLocaleString("ja-JP")}円</span><button type="button" onClick={() => setLongHairLength("")} className="lien-icon-button min-h-9 min-w-9 border-transparent bg-[#fff4f2] text-[#884039] shadow-none" aria-label="ロング料金を外す"><Trash2 className="h-4 w-4" /></button></span>
            </div>
          ) : null}

          {productLines.map((line) => {
            const product = products.find((item) => item.id === line.productId);
            if (!product) return null;
            return (
              <div key={line.productId} className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_7rem_auto] sm:items-center">
                <input type="hidden" name="productId" value={line.productId} />
                <div className="min-w-0"><p className="truncate text-xs font-semibold text-[color:var(--lien-primary)]">{product.manufacturerName}</p><p className="mt-1 break-words text-sm font-semibold">{product.name}</p></div>
                <label className="grid gap-1 text-xs font-semibold text-[color:var(--lien-muted)]">数量<input className="lien-input h-10 tabular-nums" name="productQuantity" type="number" min="1" max={Math.min(99, product.stockQuantity)} value={line.quantity} onChange={(event) => updateProductQuantity(line.productId, clampInteger(Number(event.target.value), 1, Math.min(99, product.stockQuantity)))} /></label>
                <div className="flex items-center justify-between gap-2 sm:justify-end"><span className="text-sm font-semibold tabular-nums">{(line.quantity * product.retailPrice).toLocaleString("ja-JP")}円</span><button type="button" onClick={() => setProductLines((current) => current.filter((item) => item.productId !== line.productId))} className="lien-icon-button min-h-9 min-w-9 border-transparent bg-[#fff4f2] text-[#884039] shadow-none" aria-label={`${product.name}を外す`}><Trash2 className="h-4 w-4" /></button></div>
              </div>
            );
          })}

          {selectedCoupon ? (
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold"><Percent className="h-4 w-4 shrink-0 text-[#47674a]" /><span className="truncate">{selectedCoupon.label}</span></span>
              <span className="flex shrink-0 items-center gap-2"><span className="text-sm font-semibold tabular-nums text-[#47674a]">-{couponDiscount.toLocaleString("ja-JP")}円</span><button type="button" onClick={() => setCouponSelection("")} className="lien-icon-button min-h-9 min-w-9 border-transparent bg-[#fff4f2] text-[#884039] shadow-none" aria-label="クーポンを外す"><Trash2 className="h-4 w-4" /></button></span>
            </div>
          ) : null}

          {appliedPoints > 0 ? (
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="inline-flex items-center gap-2 text-sm font-semibold"><Coins className="h-4 w-4 text-[color:var(--lien-primary)]" />ポイント利用</span>
              <span className="flex items-center gap-2"><span className="text-sm font-semibold tabular-nums text-[color:var(--lien-primary-dark)]">-{appliedPoints.toLocaleString("ja-JP")}円</span><button type="button" onClick={() => setPointDiscount(0)} className="lien-icon-button min-h-9 min-w-9 border-transparent bg-[#fff4f2] text-[#884039] shadow-none" aria-label="ポイント利用を外す"><Trash2 className="h-4 w-4" /></button></span>
            </div>
          ) : null}

          {!longHairLength && productLines.length === 0 && !selectedCoupon && appliedPoints === 0 ? (
            <p className="px-4 py-5 text-center text-sm text-[color:var(--lien-muted)]">追加項目はありません。</p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-px border-t border-[color:var(--lien-border)] bg-[color:var(--lien-border)] sm:grid-cols-4">
          <button type="button" onClick={() => openPicker("long")} className="min-h-11 bg-[color:var(--lien-surface-soft)] px-3 text-xs font-semibold transition hover:bg-white hover:text-[color:var(--lien-primary-dark)] active:bg-[#f3e5dc]">ロング料金</button>
          <button type="button" onClick={() => openPicker("product")} className="min-h-11 bg-[color:var(--lien-surface-soft)] px-3 text-xs font-semibold transition hover:bg-white hover:text-[color:var(--lien-primary-dark)] active:bg-[#f3e5dc]">商品</button>
          <button type="button" onClick={() => openPicker("coupon")} className="min-h-11 bg-[color:var(--lien-surface-soft)] px-3 text-xs font-semibold transition hover:bg-white hover:text-[color:var(--lien-primary-dark)] active:bg-[#f3e5dc]">クーポン</button>
          <button type="button" onClick={() => openPicker("points")} className="min-h-11 bg-[color:var(--lien-surface-soft)] px-3 text-xs font-semibold transition hover:bg-white hover:text-[color:var(--lien-primary-dark)] active:bg-[#f3e5dc]">ポイント</button>
        </div>
      </section>

      <section className="rounded-[22px] border border-[#ddc68b] bg-gradient-to-br from-white via-[#fff9ee] to-[#f7e8c9] p-5">
        <div className="grid gap-2 text-sm">
          <div className="flex justify-between gap-4 text-[color:var(--lien-muted)]"><span>基本施術料金</span><span className="font-semibold tabular-nums">{subtotal.toLocaleString("ja-JP")}円</span></div>
          {longHairLength ? <div className="flex justify-between gap-4 text-[color:var(--lien-muted)]"><span>ロング料金 {longHairLength}</span><span className="font-semibold tabular-nums">+{longCharge.toLocaleString("ja-JP")}円</span></div> : null}
          {productTotal > 0 ? <div className="flex justify-between gap-4 text-[color:var(--lien-muted)]"><span>商品</span><span className="font-semibold tabular-nums">{productTotal.toLocaleString("ja-JP")}円</span></div> : null}
          <div className="flex justify-between gap-4"><span>小計</span><span className="font-semibold tabular-nums">{checkoutSubtotal.toLocaleString("ja-JP")}円</span></div>
          {selectedCoupon ? <div className="flex justify-between gap-4 text-[#47674a]"><span>{selectedCoupon.label}</span><span className="font-semibold tabular-nums">-{couponDiscount.toLocaleString("ja-JP")}円</span></div> : null}
          {appliedPoints > 0 ? <div className="flex justify-between gap-4 text-[color:var(--lien-primary-dark)]"><span>ポイント割引</span><span className="font-semibold tabular-nums">-{appliedPoints.toLocaleString("ja-JP")}円</span></div> : null}
          <div className="mt-2 flex items-end justify-between gap-4 border-t border-[#ddc68b] pt-4"><span className="font-semibold">本日のお会計</span><span className="text-3xl font-semibold tabular-nums text-[color:var(--lien-primary-dark)]">{finalAmount.toLocaleString("ja-JP")}<span className="ml-1 text-sm">円</span></span></div>
          <div className="flex justify-end text-xs text-[color:var(--lien-muted)]"><span>うち消費税（{taxRate}%） {includedTax.toLocaleString("ja-JP")}円</span></div>
        </div>
      </section>

      <ConfirmSubmitButton message={`本日のお会計 ${finalAmount.toLocaleString("ja-JP")}円を確定しますか？確定後は売上とポイント履歴に記録されます。`} pendingText={<span className="inline-flex items-center gap-2"><LoaderCircle className="h-4 w-4 animate-spin" />会計処理中...</span>} className="lien-button-primary w-full">会計を確定する</ConfirmSubmitButton>

      <ItemPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        section={pickerSection}
        setSection={setPickerSection}
        longHairLength={longHairLength}
        setLongHairLength={setLongHairLength}
        products={products}
        productLines={productLines}
        addProduct={addProduct}
        coupons={coupons}
        couponSelection={couponSelection}
        setCouponSelection={setCouponSelection}
        availablePoints={availablePoints}
        maxPointDiscount={maxPointDiscount}
        pointDiscount={appliedPoints}
        setPointDiscount={setPointDiscount}
      />
    </form>
  );
}
