"use client";

import { Copy, ExternalLink, LoaderCircle } from "lucide-react";
import { useState } from "react";

export function CustomerPortalLinkButton({
  customerId,
  suffix = "",
  mode = "open",
  label,
  className = ""
}: {
  customerId: string;
  suffix?: string;
  mode?: "open" | "copy";
  label: string;
  className?: string;
}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function handleClick() {
    if (pending) return;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/customers/${encodeURIComponent(customerId)}/portal-access`, {
        method: "POST"
      });
      const payload = (await response.json()) as { portalUrl?: string; error?: string };
      if (!response.ok || !payload.portalUrl) throw new Error(payload.error ?? "お客様URLを発行できませんでした。");
      const destination = `${payload.portalUrl.replace(/\/$/, "")}${suffix}`;
      if (mode === "copy") {
        await navigator.clipboard.writeText(destination);
        setMessage("コピーしました");
      } else {
        window.open(destination, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作に失敗しました");
    } finally {
      setPending(false);
    }
  }

  const Icon = pending ? LoaderCircle : mode === "copy" ? Copy : ExternalLink;
  return (
    <span className="grid gap-1">
      <button type="button" onClick={handleClick} disabled={pending} className={className}>
        <Icon className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} />
        {label}
      </button>
      {message ? <span className="text-center text-[11px] font-semibold text-stone-600">{message}</span> : null}
    </span>
  );
}

const PORTAL_URL_PLACEHOLDER = "{{PORTAL_URL}}";

export function CustomerPortalMessageCopyButton({
  customerId,
  text,
  label = "文面コピー",
  className = ""
}: {
  customerId: string;
  text: string;
  label?: string;
  className?: string;
}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function handleCopy() {
    if (pending) return;
    setPending(true);
    setMessage("");

    try {
      let copyText = text;
      if (text.includes(PORTAL_URL_PLACEHOLDER)) {
        const response = await fetch(`/api/admin/customers/${encodeURIComponent(customerId)}/portal-access`, {
          method: "POST"
        });
        const payload = (await response.json()) as { portalUrl?: string; error?: string };
        if (!response.ok || !payload.portalUrl) {
          throw new Error(payload.error ?? "お客様URLを発行できませんでした。");
        }
        copyText = text.replaceAll(PORTAL_URL_PLACEHOLDER, payload.portalUrl.replace(/\/$/, ""));
      }

      await navigator.clipboard.writeText(copyText);
      setMessage("コピーしました");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "コピーできませんでした。");
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="grid gap-1">
      <button
        type="button"
        onClick={handleCopy}
        disabled={pending}
        className={className || "inline-flex h-9 items-center justify-center gap-2 rounded-md border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-800 hover:bg-stone-50"}
      >
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
        {label}
      </button>
      {message ? <span className="text-center text-[11px] font-semibold text-stone-600">{message}</span> : null}
    </span>
  );
}
