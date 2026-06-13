"use client";

import { useState } from "react";
import { Copy } from "lucide-react";

type CopyTextButtonProps = {
  text: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
};

export function CopyTextButton({
  text,
  label = "コピー",
  copiedLabel = "コピー済み",
  className = ""
}: CopyTextButtonProps) {
  const [copied, setCopied] = useState(false);

  function fallbackCopy() {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }

  async function copyText() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        fallbackCopy();
      }
    } catch {
      fallbackCopy();
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={copyText}
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-md border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 hover:bg-stone-50 ${className}`}
    >
      <Copy className="h-3.5 w-3.5" />
      {copied ? copiedLabel : label}
    </button>
  );
}
