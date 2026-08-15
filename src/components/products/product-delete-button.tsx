"use client";

import type { FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { deleteProductMasterAction } from "@/lib/actions/product-actions";

type ProductDeleteButtonProps = {
  productId: string;
  productName: string;
  proposalCount: number;
};

export function ProductDeleteButton({ productId, productName, proposalCount }: ProductDeleteButtonProps) {
  function confirmDelete(event: FormEvent<HTMLFormElement>) {
    const message =
      proposalCount > 0
        ? `「${productName}」を商品棚から削除しますか？\n\n過去の会計・レビュー履歴は保持されます。`
        : `「${productName}」を商品棚から削除しますか？`;

    if (!window.confirm(message)) {
      event.preventDefault();
    }
  }

  return (
    <form action={deleteProductMasterAction} onSubmit={confirmDelete}>
      <input type="hidden" name="productId" value={productId} />
      <button
        type="submit"
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#edc2bd] bg-white px-3 text-xs font-semibold text-[#884039] transition hover:bg-[#fff3f1] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#edc2bd]/50"
        aria-label={`${productName}を削除`}
        title="商品を削除"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        削除
      </button>
    </form>
  );
}
