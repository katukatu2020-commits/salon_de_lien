export type BookingProvider =
  | "kanzashi"
  | "hotpepper"
  | "customer_app"
  | "phone"
  | "walk_in"
  | "manual";

export const BOOKING_PROVIDERS: Record<
  BookingProvider,
  { symbol: string; label: string; className: string }
> = {
  kanzashi: { symbol: "結", label: "かんざし結", className: "bg-[#5a6f91] text-white" },
  hotpepper: { symbol: "H", label: "HOT PEPPER Beauty", className: "bg-[#c7485b] text-white" },
  customer_app: { symbol: "A", label: "お客様アプリ", className: "bg-[#477b69] text-white" },
  phone: { symbol: "電", label: "電話", className: "bg-[#8b6a45] text-white" },
  walk_in: { symbol: "店", label: "店頭", className: "bg-[#725d52] text-white" },
  manual: { symbol: "手", label: "手動登録", className: "bg-[#77716b] text-white" }
};

export function inferBookingProvider(input: {
  bookingProvider?: string | null;
  source?: string | null;
  subject?: string | null;
  content?: string | null;
}): BookingProvider {
  const explicit = input.bookingProvider?.trim().toLowerCase();
  if (explicit && explicit in BOOKING_PROVIDERS) return explicit as BookingProvider;

  const text = `${input.source ?? ""}\n${input.subject ?? ""}\n${input.content ?? ""}`;
  if (/hot\s*pepper|ホットペッパー|salon\s*board|サロンボード/i.test(text)) return "hotpepper";
  if (/kanzashi|かんざし|gmail:/i.test(text)) return "kanzashi";
  if (/お客様アプリ|customer_app/i.test(text)) return "customer_app";
  if (/電話|\bTEL\b/i.test(text)) return "phone";
  if (/店頭|飛び込み/i.test(text)) return "walk_in";
  return "manual";
}
