import Link from "next/link";
import {
  BadgeDollarSign,
  Camera,
  CalendarClock,
  ChevronRight,
  ClipboardList,
  Plus,
  Search,
  Sparkles,
  UsersRound
} from "lucide-react";
import { CopyTextButton } from "@/components/copy-text-button";
import { createContactLog, markProposalResponseHandledWithContactLog } from "@/lib/actions";
import { prisma } from "@/lib/prisma";

type CustomersPageProps = {
  searchParams: {
    q?: string;
    view?: string;
  };
};

const allowedViews = new Set(["visits", "styles", "calendar", "messages", "analytics", "settings"]);

type CommercialTone = "red" | "amber" | "green" | "stone";

function formatDate(date?: Date | null) {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function formatDateTime(date?: Date | null) {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function customerCode(id: string) {
  return `C-${id.slice(-5).toUpperCase()}`;
}

function parseJsonStringArray(value?: string | null) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && item.length > 0) : [];
  } catch {
    return [];
  }
}

function uniqueUrls(urls: Array<string | null | undefined>) {
  return Array.from(new Set(urls.filter((url): url is string => Boolean(url))));
}

function daysSince(date?: Date | null) {
  if (!date) {
    return null;
  }

  return Math.max(0, Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000)));
}

function hoursUntil(date?: Date | null) {
  if (!date) {
    return null;
  }

  return Math.ceil((date.getTime() - Date.now()) / (60 * 60 * 1000));
}

function minutesSince(date?: Date | null) {
  if (!date) {
    return null;
  }

  return Math.max(0, Math.floor((Date.now() - date.getTime()) / (60 * 1000)));
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function nextVisitCycleDays(title?: string | null) {
  const normalizedTitle = title ?? "";

  if (/(前髪|顔まわり|顔周り|白髪|リタッチ|根元)/.test(normalizedTitle)) {
    return 28;
  }

  if (/(カラー|パーマ|縮毛|ストレート|酸性|ブリーチ)/.test(normalizedTitle)) {
    return 42;
  }

  if (/(トリートメント|ヘッドスパ|頭皮|ケア)/.test(normalizedTitle)) {
    return 35;
  }

  return 56;
}

function isActiveAppointmentStatus(status: string) {
  return status !== "キャンセル" && status !== "無断キャンセル" && status !== "来店済み";
}

function priceSum(values: Array<number | null | undefined>) {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

function percent(numerator: number, denominator: number) {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
}

function normalizePhone(value?: string | null) {
  return (value ?? "").replace(/[^\d]/g, "");
}

function feedbackRating(message?: string | null) {
  const match = (message ?? "").match(/来店後評価:\s*(\d)\/5/);
  return match ? Number(match[1]) : null;
}

function feedbackShareUrl(customerId: string) {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  return baseUrl ? `${baseUrl.replace(/\/$/, "")}/feedback/${customerId}` : `/feedback/${customerId}`;
}

function googleReviewShareUrl() {
  const url = process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL ?? process.env.NEXT_PUBLIC_REVIEW_URL ?? process.env.GOOGLE_REVIEW_URL;
  return url?.trim() || null;
}

function carePlanShareUrl(customerId: string) {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  return baseUrl ? `${baseUrl.replace(/\/$/, "")}/care/${customerId}` : `/care/${customerId}`;
}

function appointmentConfirmationUrl(appointmentId: string) {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  return baseUrl ? `${baseUrl.replace(/\/$/, "")}/appointments/${appointmentId}/confirm` : `/appointments/${appointmentId}/confirm`;
}

function intakeShareUrl() {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  return baseUrl ? `${baseUrl.replace(/\/$/, "")}/intake` : "/intake";
}

function intakeSourceUrl(source: string) {
  const baseUrl = intakeShareUrl();
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}source=${encodeURIComponent(source)}`;
}

function intakeCampaignUrl(source: string, campaign: string) {
  const baseUrl = intakeSourceUrl(source);
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}campaign=${encodeURIComponent(campaign)}`;
}

function campaignPlaybookMessage({
  label,
  source,
  campaign,
  url
}: {
  label: string;
  source: string;
  campaign: string;
  url: string;
}) {
  if (source === "Instagram" && campaign === "story") {
    return `髪型で迷っている方へ\n今の髪の写真と悩みを送っていただければ、似合う方向性と必要メニューを先に確認します。\n相談はこちら\n${url}`;
  }

  if (source === "Instagram") {
    return `プロフィールの予約・相談リンクに設定してください。\nBefore/After投稿、固定投稿、ハイライトから同じURLへ誘導すると、Instagram経由の相談数と予約化を追えます。\n${url}`;
  }

  if (source === "LINE") {
    return `髪型・カラーの相談はこちらから送れます。\n写真、悩み、希望日時を入れていただくと、来店前に必要メニューと目安を確認できます。\n${url}`;
  }

  if (source === "Google") {
    return `Googleビジネスプロフィールの予約・問い合わせリンクに設定してください。\n口コミや検索から来た方が、そのまま写真付き相談に進めます。\n${url}`;
  }

  if (source === "Salon") {
    return `店頭QR用URLです。\n受付、鏡前、ショップカードに設置し、会計後・待ち時間・付き添いの方の相談入口として使います。\n${url}`;
  }

  if (source === "Referral") {
    return `紹介カード用URLです。\n髪型やカラーで悩んでいる方へ、この相談フォームを送ってください。\n${url}`;
  }

  return `${label}用の相談フォームURLです。\n${url}`;
}

function intakeReferralUrl(customer: { id: string; name: string }) {
  const baseUrl = intakeShareUrl();
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}source=${encodeURIComponent("紹介")}&referrer=${encodeURIComponent(customerCode(customer.id))}&referrerName=${encodeURIComponent(customer.name)}`;
}

function appointmentValue(row: { upcomingAppointment?: { estimatedPrice: number | null } | null }, fallback: number) {
  return row.upcomingAppointment?.estimatedPrice ?? fallback;
}

function appointmentRisk({
  appointment,
  hours,
  value,
  baselineTicket,
  cancellationCount,
  noShowCount,
  hasPhone,
  hasRecentConfirmation
}: {
  appointment?: { status: string; estimatedPrice: number | null } | null;
  hours: number | null;
  value: number;
  baselineTicket: number;
  cancellationCount: number;
  noShowCount: number;
  hasPhone: boolean;
  hasRecentConfirmation: boolean;
}) {
  if (!appointment) {
    return { score: 0, label: "予約なし", reasons: [] as string[] };
  }

  const reasons: string[] = [];
  let score = 0;

  if (hours !== null && hours <= 2) {
    score += 35;
    reasons.push("2時間以内");
  } else if (hours !== null && hours <= 24) {
    score += 24;
    reasons.push("24時間以内");
  } else if (hours !== null && hours <= 48) {
    score += 12;
    reasons.push("48時間以内");
  }

  if (!hasRecentConfirmation) {
    score += 20;
    reasons.push("未確認");
  }

  if (noShowCount > 0) {
    score += Math.min(50, noShowCount * 30);
    reasons.push(`無断キャンセル${noShowCount}回`);
  }

  if (cancellationCount > 0) {
    score += Math.min(30, cancellationCount * 15);
    reasons.push(`キャンセル${cancellationCount}回`);
  }

  if (!hasPhone) {
    score += 15;
    reasons.push("連絡先未登録");
  }

  if (appointment.status === "仮予約") {
    score += 10;
    reasons.push("仮予約");
  }

  if (baselineTicket > 0 && value >= Math.round(baselineTicket * 1.5)) {
    score += 12;
    reasons.push("高単価予約");
  }

  const normalizedScore = Math.min(100, score);
  const label = normalizedScore >= 70 ? "高リスク" : normalizedScore >= 40 ? "要確認" : "通常";

  return {
    score: normalizedScore,
    label,
    reasons: reasons.slice(0, 4)
  };
}

function appointmentRiskClass(score: number) {
  if (score >= 70) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (score >= 40) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function statusClass(tone: CommercialTone) {
  if (tone === "red") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (tone === "amber") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (tone === "green") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-stone-200 bg-stone-50 text-stone-600";
}

function proposalMessageLine(message: string | null | undefined, label: string) {
  return (message ?? "")
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.startsWith(`${label}:`))
    ?.replace(`${label}:`, "")
    .trim();
}

function proposalMessageList(message: string | null | undefined, label: string) {
  return (proposalMessageLine(message, label) ?? "")
    .split(" / ")
    .map((item) => item.trim())
    .filter(Boolean);
}

function newLeadIntentScore(message: string | null | undefined, hasPhone: boolean, source: string) {
  if (!message) {
    return 0;
  }

  let score = 20;
  if (hasPhone) {
    score += 20;
  }
  if (proposalMessageLine(message, "希望日時")) {
    score += 30;
  }
  if (proposalMessageLine(message, "予算感")) {
    score += 10;
  }
  if (proposalMessageLine(message, "一番の悩み")) {
    score += 10;
  }
  if (source !== "未記録") {
    score += 10;
  }

  return Math.min(100, score);
}

function newLeadIntentLabel(score: number) {
  if (score >= 80) {
    return "高確度";
  }

  if (score >= 55) {
    return "中確度";
  }

  return "要確認";
}

function newLeadIntentClass(score: number) {
  if (score >= 80) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (score >= 55) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-stone-200 bg-stone-50 text-stone-600";
}

function proposalFreeMemo(message: string | null | undefined) {
  return (message ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(
      (line) =>
        line &&
        !line.startsWith("相談したい不安:") &&
        !line.startsWith("希望連絡方法:") &&
        !line.startsWith("当日の優先順位:") &&
        !line.startsWith("予算感:") &&
        !line.startsWith("選んだ料金プラン:") &&
        !line.startsWith("来店希望時期:") &&
        !line.startsWith("終了希望:") &&
        !line.startsWith("予約を迷う理由:") &&
        !line.startsWith("第2希望日時:") &&
        !line.startsWith("第3希望日時:") &&
        !line.startsWith("空き枠希望:") &&
        !line.startsWith("継続プラン相談:") &&
        !line.startsWith("相談したい追加メニュー:")
    )
    .join("\n");
}

function concernReplyLines(concerns: string[]) {
  return concerns.map((concern) => {
    if (concern.includes("料金")) {
      return "料金は当日の髪の状態と必要なメニューを確認してから、施術前に必ずお伝えします。";
    }

    if (concern.includes("所要時間")) {
      return "所要時間はメニュー内容で変わるため、ご希望の終了時間があれば先に調整します。";
    }

    if (concern.includes("ダメージ")) {
      return "ダメージが心配な部分は薬剤や施術範囲を調整し、無理のない方法で進めます。";
    }

    if (concern.includes("似合う")) {
      return "似合わせは顔まわり、長さ、ボリューム感を当日鏡を見ながら微調整できます。";
    }

    if (concern.includes("朝のセット")) {
      return "朝のセットが楽になるように、乾かし方とスタイリング剤の量まで一緒にお伝えします。";
    }

    if (concern.includes("長持ち")) {
      return "長持ちさせるための周期やホームケアも、仕上がりに合わせてご案内します。";
    }

    return `${concern}について、当日分かりやすく確認します。`;
  });
}

function buildProposalResponseReplyMessage({
  customerName,
  styleName,
  intent,
  preferredDate,
  concerns,
  selectedCourses,
  stylePriority,
  budgetPreference,
  pricePlan,
  visitTiming,
  finishBy,
  decisionBlocker,
  alternativeDate1,
  alternativeDate2,
  urgencyPreference,
  packageInterest,
  freeMemo
}: {
  customerName: string;
  styleName: string;
  intent: string;
  preferredDate?: Date | null;
  concerns: string[];
  selectedCourses: string[];
  stylePriority?: string;
  budgetPreference?: string;
  pricePlan?: string;
  visitTiming?: string;
  finishBy?: string;
  decisionBlocker?: string;
  alternativeDate1?: string;
  alternativeDate2?: string;
  urgencyPreference?: string;
  packageInterest?: string;
  freeMemo?: string;
}) {
  const concernLines = concernReplyLines(concerns);
  return [
    `${customerName}様`,
    `「${styleName}」へのご返信ありがとうございます。`,
    intent.includes("予約")
      ? "ご予約希望として確認しました。"
      : intent.includes("相談")
        ? "気になる点を確認しながら、無理なく相談できます。"
        : "ご検討中の点を確認しました。",
    preferredDate ? `希望日時は ${formatDateTime(preferredDate)} で確認します。` : null,
    alternativeDate1 || alternativeDate2
      ? `代替候補も確認しました${alternativeDate1 ? `（第2希望: ${alternativeDate1}` : ""}${alternativeDate2 ? `${alternativeDate1 ? " / " : "（"}第3希望: ${alternativeDate2}` : ""}）。`
      : null,
    urgencyPreference ? `空き枠の希望は「${urgencyPreference}」として確認します。` : null,
    visitTiming ? `来店時期は「${visitTiming}」を目安に空き枠を確認します。` : null,
    finishBy ? `終了希望は ${finishBy} で確認します。` : null,
    stylePriority ? `当日は「${stylePriority}」を優先して調整します。` : null,
    budgetPreference ? `ご予算は「${budgetPreference}」として確認します。` : null,
    pricePlan ? `料金プランは「${pricePlan}」を目安に、施術前に最終確認します。` : null,
    decisionBlocker ? `迷われている点（${decisionBlocker}）も先に解消します。` : null,
    concernLines.length > 0 ? concernLines.join("\n") : null,
    selectedCourses.length > 0 ? `追加で気になっているメニュー（${selectedCourses.join(" / ")}）も、必要性・料金・所要時間を事前に確認します。` : null,
    packageInterest ? `継続プランは「${packageInterest}」として、必要な場合だけ目安をお伝えします。` : null,
    freeMemo ? `メモも確認しました: ${freeMemo}` : null,
    "不安な点を先に解消してから進めますので、ほかにも気になることがあればそのまま送ってください。"
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

function commercialStatus({
  latestVisitDays,
  aiReady,
  generatedImageCount,
  openCourseValue,
  hasUpcomingAppointment,
  hasRecentContact,
  latestProposalIntent
}: {
  latestVisitDays: number | null;
  aiReady: boolean;
  generatedImageCount: number;
  openCourseValue: number;
  hasUpcomingAppointment: boolean;
  hasRecentContact: boolean;
  latestProposalIntent?: string | null;
}) {
  if (!hasUpcomingAppointment && latestProposalIntent?.includes("予約")) {
    return {
      label: "予約希望",
      tone: "red" as const,
      priority: 140,
      action: "提案ページで予約希望あり。希望日時を確認して、すぐ予約枠を押さえる"
    };
  }

  if (!hasUpcomingAppointment && latestProposalIntent?.includes("相談")) {
    return {
      label: "相談希望",
      tone: "amber" as const,
      priority: 125,
      action: "提案画像と候補メニューを添えて、相談返信を送る"
    };
  }

  if (hasUpcomingAppointment) {
    return {
      label: "予約あり",
      tone: "green" as const,
      priority: 35,
      action: "予約内容、提案メニュー、当日の確認事項を準備する"
    };
  }

  if (hasRecentContact && latestVisitDays !== null && latestVisitDays < 75) {
    return {
      label: "追客済み",
      tone: "green" as const,
      priority: 42,
      action: "返信待ち。次の一手は予約候補日かメニュー比較を提示する"
    };
  }

  if (latestVisitDays === null) {
    return {
      label: "初回準備",
      tone: "amber" as const,
      priority: 82,
      action: "写真同意、髪質、好み、NG条件を先にそろえる"
    };
  }

  if (latestVisitDays >= 75) {
    return {
      label: "失客防止",
      tone: "red" as const,
      priority: 110 + Math.min(20, Math.floor(latestVisitDays / 15)),
      action: "画像提案と次回メニューを添えて、再来店の理由を作る"
    };
  }

  if (latestVisitDays >= 45) {
    return {
      label: "再来店提案",
      tone: "amber" as const,
      priority: 88,
      action: "メンテナンス周期に合わせて、次回予約候補を送る"
    };
  }

  if (openCourseValue > 0 && generatedImageCount > 0) {
    return {
      label: "単価アップ余地",
      tone: "green" as const,
      priority: 72,
      action: "未採用コースを画像提案に紐づけて説明する"
    };
  }

  if (!aiReady) {
    return {
      label: "素材不足",
      tone: "stone" as const,
      priority: 48,
      action: "提案画像に必要な正面・横・後ろ写真を追加する"
    };
  }

  return {
    label: "接客準備済み",
    tone: "green" as const,
    priority: 40,
    action: "来店時に提案画像とメニューを確認する"
  };
}

function followMessage({
  customerName,
  statusAction,
  proposalName,
  courseTitle,
  appointmentDate,
  appointmentMenu
}: {
  customerName: string;
  statusAction: string;
  proposalName?: string;
  courseTitle?: string;
  appointmentDate?: Date | null;
  appointmentMenu?: string | null;
}) {
  if (appointmentDate) {
    return `${customerName}様\nご予約の確認です。\n日時: ${formatDate(appointmentDate)}\nメニュー: ${appointmentMenu ?? "当日相談"}\n変更や不安な点があれば、事前にご連絡ください。当日はお気をつけてお越しください。`;
  }

  const proposalLine = proposalName
    ? `「${proposalName}」のイメージをご用意しています。`
    : "次回の似合わせ提案をご用意しています。";
  const courseLine = courseTitle
    ? `あわせて「${courseTitle}」も相性が良いです。`
    : "当日の髪の状態を見ながら、メニューを一緒に決められます。";

  return `${customerName}様\n前回の状態を踏まえて、${proposalLine}\n${courseLine}\n${statusAction} ご都合の良いタイミングを教えてください。`;
}

function appointmentConfirmationMessage({
  customerName,
  appointmentDate,
  appointmentMenu,
  confirmationUrl,
  readyItems,
  missingItems,
  riskReasons,
  rescheduleContactPreference,
  hasCancellationPolicyConsent,
  urgent
}: {
  customerName: string;
  appointmentDate?: Date | null;
  appointmentMenu?: string | null;
  confirmationUrl?: string | null;
  readyItems: string[];
  missingItems: string[];
  riskReasons: string[];
  rescheduleContactPreference?: string | null;
  hasCancellationPolicyConsent?: boolean;
  urgent?: boolean;
}) {
  const visibleReadyItems = readyItems.slice(0, 3);
  const visibleMissingItems = missingItems.slice(0, 3);
  return [
    `${customerName}様`,
    urgent ? "直前のご予約確認です。" : "ご予約の確認です。",
    `日時: ${formatDateTime(appointmentDate)}`,
    `メニュー: ${appointmentMenu ?? "当日相談"}`,
    visibleReadyItems.length > 0 ? `確認済み: ${visibleReadyItems.join(" / ")}` : null,
    visibleMissingItems.length > 0
      ? `当日スムーズに進めるため、${visibleMissingItems.join(" / ")} を先に確認させてください。`
      : "当日は現在の髪の状態を見ながら、仕上がりと料金を確認して進めます。",
    riskReasons.length > 0 ? `念のため確認: ${riskReasons.join(" / ")}` : null,
    hasCancellationPolicyConsent ? "変更・キャンセル時は早めにご連絡いただく内容で確認済みです。" : "変更・キャンセルが必要な場合は、できるだけ早めにご連絡ください。",
    rescheduleContactPreference ? `変更連絡の目安: ${rescheduleContactPreference}` : null,
    "変更や遅れがありそうな場合は、事前にご連絡ください。"
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n") + (confirmationUrl ? `\n確認・変更はこちら: ${confirmationUrl}` : "");
}

function appointmentRevenueBriefMessage({
  customerName,
  appointmentDate,
  appointmentMenu,
  appointmentValue,
  proposalName,
  courseTitle,
  openCourseValue,
  previsitConcern,
  priceExpectation,
  finishBy,
  priority,
  missingItems,
  careUrl,
  nextVisitDate
}: {
  customerName: string;
  appointmentDate?: Date | null;
  appointmentMenu?: string | null;
  appointmentValue: number;
  proposalName?: string | null;
  courseTitle?: string | null;
  openCourseValue: number;
  previsitConcern?: string | null;
  priceExpectation?: string | null;
  finishBy?: string | null;
  priority?: string | null;
  missingItems: string[];
  careUrl: string;
  nextVisitDate?: Date | null;
}) {
  return [
    `【本日の来店売上ブリーフ】${customerName}様`,
    `予約: ${formatDateTime(appointmentDate)} / ${appointmentMenu ?? "当日相談"}`,
    `予約売上目安: ${appointmentValue.toLocaleString("ja-JP")}円`,
    proposalName ? `似合わせ提案: ${proposalName}` : null,
    courseTitle ? `追加候補: ${courseTitle}${openCourseValue > 0 ? `（${openCourseValue.toLocaleString("ja-JP")}円）` : ""}` : null,
    previsitConcern ? `来店前相談: ${previsitConcern}` : null,
    priceExpectation ? `料金確認: ${priceExpectation}` : null,
    finishBy ? `終了希望: ${finishBy}` : null,
    priority ? `優先順位: ${priority}` : null,
    missingItems.length > 0 ? `来店前確認: ${missingItems.join(" / ")}` : "来店前確認: 大きな不足なし",
    "当日会話: 仕上がり、料金、所要時間、家での扱いやすさを施術前に確認する。",
    nextVisitDate ? `会計時: 次回目安は${formatDate(nextVisitDate)}頃。次回予約、ホームケアメモ、必要なら継続プランを案内する。` : "会計時: 次回予約、ホームケアメモ、必要なら継続プランを案内する。",
    `ホームケアメモ: ${careUrl}`
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

function waitlistOfferMessage({
  customerName,
  preferredTimeWindow,
  mainConcern,
  styleName,
  courseTitle
}: {
  customerName: string;
  preferredTimeWindow?: string | null;
  mainConcern?: string | null;
  styleName?: string | null;
  courseTitle?: string | null;
}) {
  return [
    `${customerName}様`,
    "空き枠が出た際にご連絡希望とのことでしたので、先に候補としてご案内します。",
    preferredTimeWindow ? `ご希望に近い時間帯: ${preferredTimeWindow}` : null,
    mainConcern ? `ご相談内容: ${mainConcern}` : null,
    styleName ? `似合わせ候補: ${styleName}` : null,
    courseTitle ? `相性の良いメニュー: ${courseTitle}` : null,
    "空き枠は埋まりやすいため、ご都合が合いそうでしたらこのまま返信ください。",
    "料金・所要時間・不安点は施術前に確認してから進めます。"
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

function reviewRequestMessage({
  customerName,
  saleTitle,
  nextVisitDate,
  feedbackUrl
}: {
  customerName: string;
  saleTitle?: string | null;
  nextVisitDate?: Date | null;
  feedbackUrl?: string;
}) {
  return `${customerName}様\n先日はご来店ありがとうございました。\n${saleTitle ? `今回の「${saleTitle}」の仕上がりはいかがでしょうか。` : "仕上がりや扱いやすさはいかがでしょうか。"}\n気になる点があれば遠慮なくご相談ください。\nよろしければ下記から仕上がりの感想や次回の目安も送ってください。\n${feedbackUrl ?? ""}\n次回の目安は${formatDate(nextVisitDate)}頃です。`;
}

function homeCareMessage({
  customerName,
  saleTitle,
  proposalName,
  courseTitle,
  addOnInterests,
  nextVisitDate
}: {
  customerName: string;
  saleTitle?: string | null;
  proposalName?: string | null;
  courseTitle?: string | null;
  addOnInterests: string[];
  nextVisitDate?: Date | null;
}) {
  const interestLine = addOnInterests.length > 0 ? `気になっていた内容: ${addOnInterests.join(" / ")}` : null;
  return [
    `${customerName}様`,
    saleTitle ? `先日の「${saleTitle}」の仕上がりを長持ちさせるためのホームケア候補です。` : "先日の仕上がりを長持ちさせるためのホームケア候補です。",
    proposalName ? `スタイル: ${proposalName}` : null,
    interestLine,
    courseTitle ? `相性の良いケア: ${courseTitle}` : "相性の良いケアは、髪の状態に合わせてシャンプー、トリートメント、乾かし方から選べます。",
    "必要なものだけで大丈夫です。髪の負担、予算、朝の扱いやすさに合わせてご案内します。",
    nextVisitDate ? `次回の目安: ${formatDate(nextVisitDate)}頃` : null,
    "気になる場合は、そのまま返信ください。"
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

function carePlanShareMessage({
  customerName,
  saleTitle,
  careUrl,
  nextVisitDate
}: {
  customerName: string;
  saleTitle?: string | null;
  careUrl: string;
  nextVisitDate?: Date | null;
}) {
  return [
    `${customerName}様`,
    "本日はご来店ありがとうございました。",
    saleTitle ? `今日の「${saleTitle}」を家でも扱いやすく保つためのメモをまとめました。` : "今日の仕上がりを家でも扱いやすく保つためのメモをまとめました。",
    careUrl,
    "乾かし方、次回の目安、気になった時の相談リンクを入れています。",
    nextVisitDate ? `次回の目安は${formatDate(nextVisitDate)}頃です。` : null,
    "家で扱ってみて気になる点があれば、そのままフォームから送ってください。"
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

function nextRebookingMessage({
  customerName,
  saleTitle,
  proposalName,
  courseTitle,
  nextVisitDate,
  preferredTimeWindow,
  addOnInterests
}: {
  customerName: string;
  saleTitle?: string | null;
  proposalName?: string | null;
  courseTitle?: string | null;
  nextVisitDate?: Date | null;
  preferredTimeWindow?: string | null;
  addOnInterests: string[];
}) {
  return [
    `${customerName}様`,
    saleTitle
      ? `先日の「${saleTitle}」の仕上がりが扱いやすいうちに、次回の目安だけ先にご案内します。`
      : "前回の仕上がりが扱いやすいうちに、次回の目安だけ先にご案内します。",
    nextVisitDate ? `おすすめ時期: ${formatDate(nextVisitDate)}頃` : null,
    proposalName ? `前回の似合わせ候補: ${proposalName}` : null,
    courseTitle ? `次回相性の良いメニュー: ${courseTitle}` : null,
    addOnInterests.length > 0 ? `気になっていた内容: ${addOnInterests.join(" / ")}` : null,
    preferredTimeWindow ? `ご連絡しやすい時間帯: ${preferredTimeWindow}` : null,
    "髪が崩れてからではなく、少し余裕のあるタイミングで整えると、朝の扱いやすさを保ちやすいです。",
    "ご都合が合いそうな候補日があれば、そのまま返信ください。料金や所要時間は予約前に確認します。"
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

function vipReactivationMessage({
  customerName,
  totalRevenue,
  latestVisitDays,
  saleTitle,
  proposalName,
  courseTitle,
  nextVisitDate,
  careUrl
}: {
  customerName: string;
  totalRevenue: number;
  latestVisitDays: number | null;
  saleTitle?: string | null;
  proposalName?: string | null;
  courseTitle?: string | null;
  nextVisitDate?: Date | null;
  careUrl: string;
}) {
  return [
    `${customerName}様`,
    "いつも大切な髪をお任せいただきありがとうございます。",
    latestVisitDays !== null ? `前回のご来店から${latestVisitDays}日ほど経ちました。` : null,
    saleTitle ? `前回の「${saleTitle}」の状態を見ながら、崩れる前のメンテナンスをご提案できます。` : "前回の状態を見ながら、崩れる前のメンテナンスをご提案できます。",
    proposalName ? `似合わせ方向: ${proposalName}` : null,
    courseTitle ? `相性の良い候補: ${courseTitle}` : null,
    nextVisitDate ? `次回目安: ${formatDate(nextVisitDate)}頃` : null,
    `店側メモ: 累計ご利用 ${totalRevenue.toLocaleString("ja-JP")}円`,
    "いつもの雰囲気を保ちつつ、今の髪の状態に合わせて必要な範囲だけ調整します。",
    `ホームケアメモ: ${careUrl}`,
    "ご都合が合いそうな候補日や、気になっている部分があればそのまま返信ください。"
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

function maintenancePackageTitle(title?: string | null) {
  const normalizedTitle = title ?? "";

  if (/(白髪|リタッチ|根元|カラー)/.test(normalizedTitle)) {
    return "カラー維持3回プラン";
  }

  if (/(前髪|顔まわり|顔周り)/.test(normalizedTitle)) {
    return "前髪・顔まわりメンテナンス3回プラン";
  }

  if (/(トリートメント|ヘッドスパ|頭皮|ケア)/.test(normalizedTitle)) {
    return "髪質ケア3回プラン";
  }

  return "似合わせメンテナンス3回プラン";
}

function maintenancePackageMessage({
  customerName,
  packageTitle,
  saleTitle,
  packagePrice,
  perVisitPrice,
  nextVisitDate,
  proposalName,
  courseTitle,
  addOnInterests
}: {
  customerName: string;
  packageTitle: string;
  saleTitle?: string | null;
  packagePrice: number;
  perVisitPrice: number;
  nextVisitDate?: Date | null;
  proposalName?: string | null;
  courseTitle?: string | null;
  addOnInterests: string[];
}) {
  return [
    `${customerName}様`,
    saleTitle
      ? `先日の「${saleTitle}」をきれいに保ちやすいように、通う間隔と料金が見えやすいプラン候補を作りました。`
      : "仕上がりをきれいに保ちやすいように、通う間隔と料金が見えやすいプラン候補を作りました。",
    `候補: ${packageTitle}`,
    `目安: 3回分 ${packagePrice.toLocaleString("ja-JP")}円前後 / 1回あたり ${perVisitPrice.toLocaleString("ja-JP")}円前後`,
    nextVisitDate ? `次回目安: ${formatDate(nextVisitDate)}頃` : null,
    proposalName ? `似合わせ方向: ${proposalName}` : null,
    courseTitle ? `組み合わせ候補: ${courseTitle}` : null,
    addOnInterests.length > 0 ? `気になっていた内容: ${addOnInterests.join(" / ")}` : null,
    "都度払いのままでも大丈夫です。先に目安を見ておくと、予算と来店周期を決めやすくなります。",
    "必要そうであれば、次回の予約候補と一緒に詳しくご案内します。"
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

function referralThankYouMessage({
  customerName,
  referralMessage,
  referralUrl
}: {
  customerName: string;
  referralMessage?: string | null;
  referralUrl: string;
}) {
  const referredName = proposalMessageLine(referralMessage, "紹介相談") ?? "ご紹介いただいた方";
  return [
    `${customerName}様`,
    `${referredName}様をご紹介いただきありがとうございます。`,
    "ご相談内容を確認し、予約や似合わせ提案につながるように対応します。",
    "また髪型に悩んでいる方がいれば、こちらの相談フォームをご案内ください。",
    referralUrl,
    "紹介いただいた内容はスタッフ側で確認できるように記録しています。"
  ].join("\n");
}

function referralAchievementMessage({
  customerName,
  referredName,
  saleTitle,
  saleAmount,
  referralUrl
}: {
  customerName: string;
  referredName: string;
  saleTitle?: string | null;
  saleAmount: number;
  referralUrl: string;
}) {
  return [
    `${customerName}様`,
    `${referredName}様をご紹介いただき、本当にありがとうございます。`,
    saleTitle ? `${referredName}様は「${saleTitle}」でご来店につながりました。` : `${referredName}様のご来店につながりました。`,
    saleAmount > 0 ? `店側メモ: 紹介経由売上 ${saleAmount.toLocaleString("ja-JP")}円` : null,
    "髪で悩んでいる方がいれば、無理のない範囲でまたこちらの相談フォームをご案内ください。",
    referralUrl,
    "紹介いただいた方にも安心して通っていただけるよう、責任を持って対応します。"
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

function cancellationRecoveryMessage({
  customerName,
  appointmentStatus,
  appointmentDate,
  appointmentMenu,
  estimatedPrice,
  proposalName,
  preferredTimeWindow
}: {
  customerName: string;
  appointmentStatus?: string | null;
  appointmentDate?: Date | null;
  appointmentMenu?: string | null;
  estimatedPrice?: number | null;
  proposalName?: string | null;
  preferredTimeWindow?: string | null;
}) {
  return [
    `${customerName}様`,
    appointmentStatus === "無断キャンセル"
      ? "先日のご予約について、体調やご都合はいかがでしょうか。"
      : "先日のご予約変更についてご連絡します。",
    `前回候補: ${formatDateTime(appointmentDate)} / ${appointmentMenu ?? "当日相談"}`,
    estimatedPrice ? `目安料金: ${estimatedPrice.toLocaleString("ja-JP")}円` : null,
    proposalName ? `前回の似合わせ候補「${proposalName}」は、別日でも状態を見ながら調整できます。` : null,
    preferredTimeWindow ? `ご連絡しやすい時間帯: ${preferredTimeWindow}` : null,
    "無理のない候補日で再調整できますので、ご都合の良い時期をそのまま返信ください。",
    "料金・所要時間・不安点は施術前に確認してから進めます。"
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

function courseProposalMessage({
  customerName,
  courseTitle,
  courseReason,
  courseCaution,
  estimatedPrice,
  estimatedMinutes,
  proposalName,
  upcomingAppointmentDate,
  shareUrl
}: {
  customerName: string;
  courseTitle: string;
  courseReason?: string | null;
  courseCaution?: string | null;
  estimatedPrice?: number | null;
  estimatedMinutes?: number | null;
  proposalName?: string | null;
  upcomingAppointmentDate?: Date | null;
  shareUrl?: string | null;
}) {
  return [
    `${customerName}様`,
    proposalName ? `前回のご希望に合わせて「${proposalName}」の方向性を確認しています。` : "ご相談内容に合わせて、追加で相性の良いメニューを確認しています。",
    `おすすめ候補: ${courseTitle}`,
    courseReason ? `理由: ${courseReason}` : null,
    estimatedPrice ? `目安料金: ${estimatedPrice.toLocaleString("ja-JP")}円` : null,
    estimatedMinutes ? `目安時間: 約${estimatedMinutes}分` : null,
    courseCaution ? `注意点: ${courseCaution}` : null,
    upcomingAppointmentDate ? `ご予約候補: ${formatDateTime(upcomingAppointmentDate)}` : null,
    shareUrl ? `提案ページ: ${shareUrl}` : null,
    "必要な場合だけ追加できます。施術前に料金・時間・髪への負担を確認してから進めます。"
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const keyword = searchParams.q?.trim() ?? "";
  const view = allowedViews.has(searchParams.view ?? "") ? searchParams.view ?? "" : "";
  const googleReviewUrl = googleReviewShareUrl();
  const customers = await prisma.customer.findMany({
    where: keyword
      ? {
          deletedAt: null,
          OR: [
            { name: { contains: keyword, mode: "insensitive" } },
            { phone: { contains: keyword, mode: "insensitive" } },
            { memo: { contains: keyword, mode: "insensitive" } }
          ]
        }
      : { deletedAt: null },
    include: {
      visits: {
        orderBy: { visitedAt: "desc" },
        take: 1
      },
      preference: true,
      styleSuggestions: {
        where: { archivedAt: null },
        select: { id: true, accepted: true, suggestedStyleName: true, imageUrls: true, imageUrlsJson: true }
      },
      courseRecommendations: {
        select: {
          id: true,
          accepted: true,
          title: true,
          reason: true,
          caution: true,
          estimatedMinutes: true,
          estimatedPrice: true,
          priority: true,
          createdAt: true
        }
      },
      contactLogs: {
        orderBy: { createdAt: "desc" },
        take: 8
      },
      appointments: {
        orderBy: { scheduledAt: "asc" },
        take: 20
      },
      serviceSales: {
        orderBy: { paidAt: "desc" },
        select: { id: true, customerId: true, amount: true, paidAt: true, title: true, source: true, note: true },
        take: 20
      },
      proposalResponses: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          intent: true,
          status: true,
          createdAt: true,
          preferredDate: true,
          message: true,
          suggestion: {
            select: {
              id: true,
              suggestedStyleName: true,
              menuSuggestion: true
            }
          }
        },
        take: 5
      }
    },
    orderBy: { updatedAt: "desc" }
  });
  const referralLogs = await prisma.contactLog.findMany({
    where: { purpose: "紹介発生" },
    orderBy: { createdAt: "desc" },
    take: 80,
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          phone: true
        }
      }
    }
  });
  const referralHandlingLogs = await prisma.contactLog.findMany({
    where: {
      OR: [{ purpose: "紹介お礼" }, { outcome: { contains: "紹介お礼送信" } }]
    },
    orderBy: { createdAt: "desc" },
    select: {
      customerId: true,
      createdAt: true
    },
    take: 200
  });
  const referralAchievementLogs = await prisma.contactLog.findMany({
    where: {
      OR: [{ purpose: "紹介成果お礼" }, { outcome: { contains: "紹介成果お礼送信" } }]
    },
    orderBy: { createdAt: "desc" },
    select: {
      customerId: true,
      createdAt: true
    },
    take: 200
  });
  const checkoutClosingLogs = await prisma.contactLog.findMany({
    where: {
      OR: [
        { purpose: "会計時クロージング" },
        { outcome: { contains: "会計時次回予約提案" } },
        { outcome: { contains: "会計時ホームケア提案" } },
        { outcome: { contains: "会計時継続プラン提案" } },
        { outcome: { contains: "会計時紹介案内" } }
      ]
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      customer: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  const followTargetCount = customers.filter((customer) => {
    const days = daysSince(customer.visits[0]?.visitedAt);
    return days === null || days >= 45;
  }).length;
  const aiReadyCount = customers.filter((customer) => {
    const frontCount = uniqueUrls([...parseJsonStringArray(customer.aiFrontImageUrlsJson), customer.aiFrontImageUrl]).length;
    const sideCount = uniqueUrls([...parseJsonStringArray(customer.aiSideImageUrlsJson), customer.aiSideImageUrl]).length;
    return customer.aiPhotoConsent && frontCount >= 2 && sideCount >= 2;
  }).length;
  const totalOpenCourseValue = priceSum(
    customers.flatMap((customer) =>
      customer.courseRecommendations.filter((course) => !course.accepted).map((course) => course.estimatedPrice)
    )
  );
  const totalServiceRevenue = priceSum(customers.flatMap((customer) => customer.serviceSales.map((sale) => sale.amount)));
  const allSales = customers.flatMap((customer) => customer.serviceSales);
  const allAppointments = customers.flatMap((customer) => customer.appointments);
  const allProposalResponses = customers.flatMap((customer) => customer.proposalResponses);
  const decisionBlockerCounts = Array.from(
    allProposalResponses.reduce((counts, response) => {
      const blocker = proposalMessageLine(response.message, "予約を迷う理由");
      if (!blocker) {
        return counts;
      }

      counts.set(blocker, (counts.get(blocker) ?? 0) + 1);
      return counts;
    }, new Map<string, number>())
  )
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason, "ja-JP"))
    .slice(0, 8);
  const topDecisionBlocker = decisionBlockerCounts[0];
  const recentServiceRevenue = priceSum(
    customers.flatMap((customer) =>
      customer.serviceSales
        .filter((sale) => Date.now() - sale.paidAt.getTime() <= 30 * 24 * 60 * 60 * 1000)
        .map((sale) => sale.amount)
    )
  );
  const recentSales = allSales.filter((sale) => Date.now() - sale.paidAt.getTime() <= 30 * 24 * 60 * 60 * 1000);
  const averageTicket = allSales.length > 0 ? Math.round(totalServiceRevenue / allSales.length) : 0;
  const recentAverageTicket =
    recentSales.length > 0 ? Math.round(priceSum(recentSales.map((sale) => sale.amount)) / recentSales.length) : 0;
  const activeAppointmentCount = allAppointments.filter(
    (appointment) => appointment.scheduledAt.getTime() >= Date.now() && isActiveAppointmentStatus(appointment.status)
  ).length;
  const canceledAppointmentCount = allAppointments.filter((appointment) => appointment.status === "キャンセル").length;
  const noShowAppointmentCount = allAppointments.filter((appointment) => appointment.status === "無断キャンセル").length;
  const handledProposalResponseCount = allProposalResponses.filter((response) => response.status === "対応済み").length;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const commercialRows = customers.map((customer) => {
    const latestVisitDays = daysSince(customer.visits[0]?.visitedAt);
    const frontCount = uniqueUrls([...parseJsonStringArray(customer.aiFrontImageUrlsJson), customer.aiFrontImageUrl]).length;
    const sideCount = uniqueUrls([...parseJsonStringArray(customer.aiSideImageUrlsJson), customer.aiSideImageUrl]).length;
    const backCount = uniqueUrls([...parseJsonStringArray(customer.aiBackImageUrlsJson), customer.aiBackImageUrl]).length;
    const aiReady = customer.aiPhotoConsent && frontCount >= 2 && sideCount >= 2;
    const generatedImageCount = customer.styleSuggestions.filter(
      (suggestion) => suggestion.imageUrls.length > 0 || Boolean(suggestion.imageUrlsJson)
    ).length;
    const proposalSuggestion =
      customer.styleSuggestions.find((suggestion) => suggestion.accepted) ??
      customer.styleSuggestions.find((suggestion) => suggestion.imageUrls.length > 0 || Boolean(suggestion.imageUrlsJson)) ??
      customer.styleSuggestions[0] ??
      null;
    const proposalShareUrl = proposalSuggestion ? `/proposals/${proposalSuggestion.id}` : null;
    const openCourses = customer.courseRecommendations.filter((course) => !course.accepted);
    const topOpenCourse = openCourses[0];
    const openCourseValue = priceSum(openCourses.map((course) => course.estimatedPrice));
    const upcomingAppointment =
      customer.appointments.find(
        (appointment) => appointment.scheduledAt.getTime() >= Date.now() && isActiveAppointmentStatus(appointment.status)
      ) ?? null;
    const latestContactLog = customer.contactLogs[0] ?? null;
    const latestNewLeadLog =
      customer.contactLogs.find((log) => log.purpose === "新規リード" || log.channel === "新規相談フォーム") ?? null;
    const newLeadMinutesSince = minutesSince(latestNewLeadLog?.createdAt);
    const newLeadSource = proposalMessageLine(latestNewLeadLog?.message, "流入元") ?? "未記録";
    const newLeadCampaign = proposalMessageLine(latestNewLeadLog?.message, "キャンペーン");
    const referralName = proposalMessageLine(latestNewLeadLog?.message, "紹介者");
    const referralCode = proposalMessageLine(latestNewLeadLog?.message, "紹介コード");
    const isReferralLead = newLeadSource === "紹介" || Boolean(referralName || referralCode);
    const addOnInterests = proposalMessageList(latestNewLeadLog?.message, "追加相談");
    const intakePhotoCount = Number((proposalMessageLine(latestNewLeadLog?.message, "事前写真") ?? "").match(/\d+/)?.[0] ?? 0);
    const hasIntakePhotoConsent = proposalMessageLine(latestNewLeadLog?.message, "写真利用同意") === "あり";
    const waitlistPreference = proposalMessageLine(latestNewLeadLog?.message, "空き枠通知");
    const preferredTimeWindow = proposalMessageLine(latestNewLeadLog?.message, "連絡しやすい時間帯");
    const rescheduleContactPreference = proposalMessageLine(latestNewLeadLog?.message, "変更連絡方法");
    const hasCancellationPolicyConsent = proposalMessageLine(latestNewLeadLog?.message, "キャンセルポリシー確認") === "あり";
    const hasLeadAppointment = customer.appointments.some(
      (appointment) => appointment.status !== "キャンセル" && appointment.status !== "無断キャンセル"
    );
    const wantsWaitlistContact =
      Boolean(waitlistPreference?.includes("希望")) && !waitlistPreference?.includes("希望しない") && !hasLeadAppointment;
    const newLeadScore = newLeadIntentScore(latestNewLeadLog?.message, Boolean(customer.phone?.trim()), newLeadSource);
    const hasNewLeadReply = latestNewLeadLog
      ? customer.contactLogs.some(
          (log) =>
            log.createdAt > latestNewLeadLog.createdAt &&
            ((log.outcome ?? "").includes("新規リード返信済み") || (log.outcome ?? "").includes("返信済み"))
        )
      : false;
    const hasRecentCourseProposal = topOpenCourse
      ? customer.contactLogs.some(
          (log) =>
            log.createdAt > topOpenCourse.createdAt &&
            ((log.outcome ?? "").includes("単価アップ提案送信") ||
              (log.outcome ?? "").includes("追加メニュー提案送信") ||
              (log.outcome ?? "").includes("コース提案送信") ||
              (log.outcome ?? "").includes("予約確定"))
        )
      : false;
    const latestFeedbackLog =
      customer.contactLogs.find((log) => log.purpose === "来店後フィードバック" || log.channel === "フィードバックページ") ?? null;
    const latestFeedbackRating = feedbackRating(latestFeedbackLog?.message);
    const needsFeedbackRecovery =
      Boolean(latestFeedbackLog) &&
      ((latestFeedbackLog?.outcome ?? "").includes("要フォロー") || (latestFeedbackRating !== null && latestFeedbackRating <= 3));
    const reviewCandidateFromFeedback =
      Boolean(latestFeedbackLog) &&
      !needsFeedbackRecovery &&
      ((latestFeedbackLog?.outcome ?? "").includes("口コミ依頼候補") || (latestFeedbackRating !== null && latestFeedbackRating >= 4));
    const latestFeedbackHomeStyling = proposalMessageLine(latestFeedbackLog?.message, "家での扱いやすさ");
    const latestFeedbackHomeCareInterest = proposalMessageLine(latestFeedbackLog?.message, "ホームケア相談");
    const latestFeedbackRebookReason = proposalMessageLine(latestFeedbackLog?.message, "次回理由");
    const hasRecentFeedbackHomeCareProposal = latestFeedbackLog
      ? customer.contactLogs.some(
          (log) =>
            log.createdAt > latestFeedbackLog.createdAt &&
            ((log.outcome ?? "").includes("ホームケア提案送信") ||
              (log.outcome ?? "").includes("店販提案送信") ||
              (log.outcome ?? "").includes("ホームケア購入") ||
              (log.outcome ?? "").includes("店販購入"))
        )
      : false;
    const needsFeedbackHomeCareProposal =
      Boolean(latestFeedbackLog) &&
      !hasRecentFeedbackHomeCareProposal &&
      ((latestFeedbackLog?.outcome ?? "").includes("ホームケア相談候補") ||
        Boolean(
          latestFeedbackHomeCareInterest &&
            !latestFeedbackHomeCareInterest.includes("不要") &&
            (latestFeedbackHomeCareInterest.includes("知りたい") ||
              latestFeedbackHomeCareInterest.includes("相談") ||
              latestFeedbackHomeCareInterest.includes("乾かし方"))
        ) ||
        Boolean(
          latestFeedbackHomeStyling &&
            (latestFeedbackHomeStyling.includes("難しい") ||
              latestFeedbackHomeStyling.includes("気になる") ||
              latestFeedbackHomeStyling.includes("相談"))
        ));
    const scheduledFollowUpLog =
      customer.contactLogs
        .filter((log) => log.scheduledFollowUp && log.scheduledFollowUp.getTime() >= Date.now() - 24 * 60 * 60 * 1000)
        .sort((a, b) => (a.scheduledFollowUp?.getTime() ?? 0) - (b.scheduledFollowUp?.getTime() ?? 0))[0] ?? null;
    const latestProposalResponse = customer.proposalResponses[0] ?? null;
    const openProposalResponse =
      customer.proposalResponses.find((response) => response.status !== "対応済み") ?? null;
    const hasRecentContact =
      latestContactLog ? Date.now() - latestContactLog.createdAt.getTime() <= 14 * 24 * 60 * 60 * 1000 : false;
    const hasRecentAppointmentConfirmation = customer.contactLogs.some(
      (log) =>
        (log.outcome === "予約確認送信" || log.outcome === "予約確認返信") &&
        Date.now() - log.createdAt.getTime() <= 2 * 24 * 60 * 60 * 1000
    );
    const latestAppointmentConfirmationLog =
      customer.contactLogs.find(
        (log) =>
          log.channel === "予約確認ページ" ||
          log.outcome === "予約確認返信" ||
          log.outcome === "予約変更希望"
      ) ?? null;
    const previsitConcern = proposalMessageLine(latestAppointmentConfirmationLog?.message, "来店前相談");
    const previsitPriceExpectation = proposalMessageLine(latestAppointmentConfirmationLog?.message, "料金確認");
    const previsitFinishBy = proposalMessageLine(latestAppointmentConfirmationLog?.message, "終了希望");
    const previsitPriority = proposalMessageLine(latestAppointmentConfirmationLog?.message, "当日の優先順位");
    const proposalPrevisitConcerns = proposalMessageList(latestProposalResponse?.message, "相談したい不安");
    const proposalPrevisitConcern =
      proposalMessageLine(latestProposalResponse?.message, "予約を迷う理由") ??
      (proposalPrevisitConcerns.length > 0 ? proposalPrevisitConcerns.join(" / ") : undefined);
    const proposalPrevisitPriceExpectation =
      proposalMessageLine(latestProposalResponse?.message, "選んだ料金プラン") ??
      proposalMessageLine(latestProposalResponse?.message, "予算感");
    const proposalPrevisitFinishBy = proposalMessageLine(latestProposalResponse?.message, "終了希望");
    const proposalPrevisitPriority = proposalMessageLine(latestProposalResponse?.message, "当日の優先順位");
    const effectivePrevisitConcern = previsitConcern ?? proposalPrevisitConcern;
    const effectivePrevisitPriceExpectation = previsitPriceExpectation ?? proposalPrevisitPriceExpectation;
    const effectivePrevisitFinishBy = previsitFinishBy ?? proposalPrevisitFinishBy;
    const effectivePrevisitPriority = previsitPriority ?? proposalPrevisitPriority;
    const upcomingAppointmentHours = hoursUntil(upcomingAppointment?.scheduledAt);
    const cancellationCount = customer.appointments.filter((appointment) => appointment.status === "キャンセル").length;
    const noShowCount = customer.appointments.filter((appointment) => appointment.status === "無断キャンセル").length;
    const latestLostAppointment =
      [...customer.appointments]
        .filter((appointment) => appointment.status === "キャンセル" || appointment.status === "無断キャンセル")
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0] ?? null;
    const latestLostAppointmentDays = daysSince(latestLostAppointment?.updatedAt);
    const hasLostAppointmentRecovery = latestLostAppointment
      ? customer.contactLogs.some(
          (log) =>
            log.createdAt > latestLostAppointment.updatedAt &&
            ((log.outcome ?? "").includes("キャンセル後フォロー送信") ||
              (log.outcome ?? "").includes("無断キャンセル後フォロー送信") ||
              (log.outcome ?? "").includes("再予約提案送信") ||
              (log.outcome ?? "").includes("予約確定"))
        )
      : false;
    const needsAppointmentConfirmation =
      Boolean(upcomingAppointment) &&
      upcomingAppointmentHours !== null &&
      upcomingAppointmentHours >= 0 &&
      upcomingAppointmentHours <= 48 &&
      !hasRecentAppointmentConfirmation;
    const totalCustomerRevenue = priceSum(customer.serviceSales.map((sale) => sale.amount));
    const latestSale = customer.serviceSales[0] ?? null;
    const latestSaleDays = daysSince(latestSale?.paidAt);
    const needsReviewRequest = latestSaleDays !== null && latestSaleDays <= 7 && !hasRecentContact;
    const hasRecentHomeCareProposal = latestSale
      ? customer.contactLogs.some(
          (log) =>
            log.createdAt > latestSale.paidAt &&
            ((log.outcome ?? "").includes("ホームケア提案送信") ||
              (log.outcome ?? "").includes("店販提案送信") ||
              (log.outcome ?? "").includes("ホームケア購入") ||
              (log.outcome ?? "").includes("店販購入"))
        )
      : false;
    const carePlanUrl = carePlanShareUrl(customer.id);
    const hasRecentCarePlanShare = latestSale
      ? customer.contactLogs.some(
          (log) =>
            log.createdAt > latestSale.paidAt &&
            ((log.outcome ?? "").includes("ホームケアメモ共有") ||
              (log.outcome ?? "").includes("ケアメモ共有") ||
              (log.purpose ?? "").includes("ホームケアメモ共有"))
        )
      : false;
    const needsCarePlanShare =
      Boolean(latestSale) && latestSaleDays !== null && latestSaleDays <= 3 && !hasRecentCarePlanShare;
    const needsHomeCareProposal =
      Boolean(latestSale) &&
      latestSaleDays !== null &&
      latestSaleDays <= 3 &&
      !hasRecentHomeCareProposal &&
      !((latestSale?.source ?? "").includes("店販") || (latestSale?.source ?? "").includes("ホームケア"));
    const rebookingAnchorDate = latestSale?.paidAt ?? customer.visits[0]?.visitedAt ?? null;
    const rebookingAnchorDays = daysSince(rebookingAnchorDate);
    const rebookingCycleDays = nextVisitCycleDays(latestSale?.title);
    const suggestedNextVisitDate = rebookingAnchorDate ? addDays(rebookingAnchorDate, rebookingCycleDays) : null;
    const rebookingDaysUntilDue = suggestedNextVisitDate
      ? Math.ceil((suggestedNextVisitDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
      : null;
    const hasRecentNextRebookingProposal = rebookingAnchorDate
      ? customer.contactLogs.some(
          (log) =>
            log.createdAt > rebookingAnchorDate &&
            ((log.outcome ?? "").includes("次回予約提案送信") ||
              (log.outcome ?? "").includes("再来予約提案送信") ||
              (log.outcome ?? "").includes("次回予約確定") ||
              (log.outcome ?? "").includes("予約確定") ||
              (log.purpose ?? "").includes("次回予約提案") ||
              (log.purpose ?? "").includes("再来予約提案"))
        )
      : false;
    const needsNextRebookingProposal =
      Boolean(rebookingAnchorDate) &&
      !upcomingAppointment &&
      !hasRecentNextRebookingProposal &&
      rebookingAnchorDays !== null &&
      rebookingAnchorDays <= Math.max(90, rebookingCycleDays + 28) &&
      (latestSaleDays !== null && latestSaleDays <= 7 || rebookingDaysUntilDue !== null && rebookingDaysUntilDue <= 14);
    const baselineTicket = averageTicket || recentAverageTicket || 10000;
    const maintenancePackageName = maintenancePackageTitle(latestSale?.title ?? topOpenCourse?.title);
    const maintenancePackageBasePrice = latestSale?.amount ?? baselineTicket;
    const maintenancePackagePerVisitPrice = Math.max(
      maintenancePackageBasePrice,
      Math.round(maintenancePackageBasePrice + (topOpenCourse?.estimatedPrice ?? 0) * 0.35)
    );
    const maintenancePackageValue = maintenancePackagePerVisitPrice * 3;
    const hasRecentMaintenancePackageProposal = latestSale
      ? customer.contactLogs.some(
          (log) =>
            log.createdAt > latestSale.paidAt &&
            ((log.outcome ?? "").includes("メンテナンスパック提案送信") ||
              (log.outcome ?? "").includes("回数券提案送信") ||
              (log.outcome ?? "").includes("継続プラン提案送信") ||
              (log.outcome ?? "").includes("会員プラン提案送信") ||
              (log.outcome ?? "").includes("メンテナンスパック申込") ||
              (log.purpose ?? "").includes("メンテナンスパック"))
        )
      : false;
    const needsMaintenancePackageProposal =
      Boolean(latestSale) &&
      latestSaleDays !== null &&
      latestSaleDays <= 30 &&
      !hasRecentMaintenancePackageProposal &&
      !((latestSale?.source ?? "").includes("店販") || (latestSale?.source ?? "").includes("ホームケア")) &&
      maintenancePackageBasePrice > 0 &&
      (latestSale.amount >= Math.round((baselineTicket || latestSale.amount) * 0.8) ||
        Boolean(topOpenCourse) ||
        addOnInterests.length > 0 ||
        totalCustomerRevenue >= maintenancePackageBasePrice * 2);
    const responseOpportunityValue =
      !upcomingAppointment && latestProposalResponse?.intent.includes("予約")
        ? baselineTicket
        : !upcomingAppointment && latestProposalResponse?.intent.includes("相談")
          ? Math.round(baselineTicket * 0.6)
          : 0;
    const retentionOpportunityValue =
      !upcomingAppointment && latestVisitDays !== null && latestVisitDays >= 45 ? Math.round(baselineTicket * 0.5) : 0;
    const lostAppointmentRecoveryValue = latestLostAppointment?.estimatedPrice ?? baselineTicket;
    const needsLostAppointmentRecovery =
      Boolean(latestLostAppointment) &&
      !upcomingAppointment &&
      !hasLostAppointmentRecovery &&
      latestLostAppointmentDays !== null &&
      latestLostAppointmentDays <= 14;
    const courseProposalValue = topOpenCourse?.estimatedPrice ?? 0;
    const needsCourseProposal =
      Boolean(topOpenCourse) &&
      !hasRecentCourseProposal &&
      courseProposalValue > 0 &&
      (Boolean(upcomingAppointment) || Boolean(proposalSuggestion) || Boolean(latestProposalResponse));
    const opportunityValue =
      openCourseValue +
      responseOpportunityValue +
      retentionOpportunityValue +
      (needsLostAppointmentRecovery ? lostAppointmentRecoveryValue : 0);
    const appointmentValueForRisk = upcomingAppointment?.estimatedPrice ?? baselineTicket;
    const appointmentRiskResult = appointmentRisk({
      appointment: upcomingAppointment,
      hours: upcomingAppointmentHours,
      value: appointmentValueForRisk,
      baselineTicket,
      cancellationCount,
      noShowCount,
      hasPhone: Boolean(customer.phone?.trim()),
      hasRecentConfirmation: hasRecentAppointmentConfirmation
    });
    const previsitReadyItems = [
      upcomingAppointment ? `予約: ${formatDateTime(upcomingAppointment.scheduledAt)} / ${upcomingAppointment.menu ?? "当日相談"}` : null,
      effectivePrevisitConcern ? `来店前相談: ${effectivePrevisitConcern}` : null,
      effectivePrevisitPriceExpectation ? `料金確認: ${effectivePrevisitPriceExpectation}` : null,
      effectivePrevisitFinishBy ? `終了希望: ${effectivePrevisitFinishBy}` : null,
      effectivePrevisitPriority ? `優先順位: ${effectivePrevisitPriority}` : null,
      proposalSuggestion ? `本命提案: ${proposalSuggestion.suggestedStyleName}` : null,
      customer.preference?.preferredLength ? `希望長さ: ${customer.preference.preferredLength}` : null,
      customer.preference?.preferredStyle ? `好み: ${customer.preference.preferredStyle}` : null,
      hasCancellationPolicyConsent ? "キャンセルポリシー確認済み" : null,
      rescheduleContactPreference ? `変更連絡: ${rescheduleContactPreference}` : null,
      topOpenCourse ? `追加提案: ${topOpenCourse.title}` : null,
      latestProposalResponse ? `提案反応: ${latestProposalResponse.intent}` : null
    ].filter((item): item is string => Boolean(item));
    const previsitMissingItems = [
      upcomingAppointment && !hasRecentAppointmentConfirmation ? "予約確認未送信" : null,
      upcomingAppointment && !customer.phone?.trim() ? "連絡先未登録" : null,
      upcomingAppointment && !hasCancellationPolicyConsent ? "キャンセルポリシー未確認" : null,
      upcomingAppointment && !proposalSuggestion ? "当日提案未作成" : null,
      upcomingAppointment && !customer.preference ? "好み・NG条件未登録" : null,
      upcomingAppointment && !effectivePrevisitPriceExpectation && !effectivePrevisitFinishBy ? "料金・時間希望未確認" : null,
      upcomingAppointment && !effectivePrevisitPriority ? "当日優先順位未確認" : null,
      upcomingAppointment && openProposalResponse ? "提案返信未対応" : null,
      upcomingAppointment && appointmentRiskResult.score >= 40 ? `予約リスク: ${appointmentRiskResult.label}` : null
    ].filter((item): item is string => Boolean(item));
    const previsitReadinessScore = upcomingAppointment
      ? Math.max(0, Math.min(100, 100 - previsitMissingItems.length * 18 + Math.min(10, previsitReadyItems.length * 2)))
      : 0;
    const status = commercialStatus({
      latestVisitDays,
      aiReady,
      generatedImageCount,
      openCourseValue,
      hasUpcomingAppointment: Boolean(upcomingAppointment),
      hasRecentContact,
      latestProposalIntent: latestProposalResponse?.intent
    });
    const href = proposalSuggestion
      ? `/customers/${customer.id}?suggestionId=${proposalSuggestion.id}`
      : `/customers/${customer.id}`;

    return {
      customer,
      latestVisitDays,
      frontCount,
      sideCount,
      backCount,
      aiReady,
      generatedImageCount,
      openCourseValue,
      topOpenCourse,
      proposalSuggestion,
      proposalShareUrl,
      latestContactLog,
      latestNewLeadLog,
      newLeadMinutesSince,
      newLeadSource,
      newLeadCampaign,
      referralName,
      referralCode,
      isReferralLead,
      addOnInterests,
      intakePhotoCount,
      hasIntakePhotoConsent,
      waitlistPreference,
      preferredTimeWindow,
      rescheduleContactPreference,
      hasCancellationPolicyConsent,
      hasLeadAppointment,
      wantsWaitlistContact,
      newLeadScore,
      hasNewLeadReply,
      hasRecentCourseProposal,
      latestAppointmentConfirmationLog,
      previsitConcern: effectivePrevisitConcern,
      previsitPriceExpectation: effectivePrevisitPriceExpectation,
      previsitFinishBy: effectivePrevisitFinishBy,
      previsitPriority: effectivePrevisitPriority,
      latestFeedbackLog,
      latestFeedbackRating,
      needsFeedbackRecovery,
      reviewCandidateFromFeedback,
      latestFeedbackHomeStyling,
      latestFeedbackHomeCareInterest,
      latestFeedbackRebookReason,
      needsFeedbackHomeCareProposal,
      scheduledFollowUpLog,
      upcomingAppointment,
      appointmentConfirmationUrl: upcomingAppointment ? appointmentConfirmationUrl(upcomingAppointment.id) : null,
      upcomingAppointmentHours,
      latestLostAppointment,
      latestLostAppointmentDays,
      hasLostAppointmentRecovery,
      needsLostAppointmentRecovery,
      lostAppointmentRecoveryValue,
      courseProposalValue,
      needsCourseProposal,
      appointmentValueForRisk,
      appointmentRiskScore: appointmentRiskResult.score,
      appointmentRiskLabel: appointmentRiskResult.label,
      appointmentRiskReasons: appointmentRiskResult.reasons,
      previsitReadyItems,
      previsitMissingItems,
      previsitReadinessScore,
      needsAppointmentConfirmation,
      latestSale,
      latestSaleDays,
      needsReviewRequest,
      hasRecentHomeCareProposal,
      carePlanUrl,
      needsCarePlanShare,
      needsHomeCareProposal,
      rebookingAnchorDate,
      rebookingCycleDays,
      suggestedNextVisitDate,
      rebookingDaysUntilDue,
      needsNextRebookingProposal,
      maintenancePackageName,
      maintenancePackagePerVisitPrice,
      maintenancePackageValue,
      needsMaintenancePackageProposal,
      latestProposalResponse,
      openProposalResponse,
      totalCustomerRevenue,
      responseOpportunityValue,
      retentionOpportunityValue,
      opportunityValue,
      href,
      status
    };
  });

  const actionRows = [...commercialRows]
    .sort((a, b) => b.status.priority - a.status.priority || b.opportunityValue - a.opportunityValue)
    .slice(0, 5);
  const baselineTicketForPlanning = averageTicket || recentAverageTicket || 10000;
  const actionOpportunityValue = priceSum(actionRows.map((row) => row.opportunityValue));
  const appointmentConfirmationRows = [...commercialRows]
    .filter((row) => row.needsAppointmentConfirmation)
    .sort((a, b) => b.appointmentRiskScore - a.appointmentRiskScore || (a.upcomingAppointmentHours ?? 999) - (b.upcomingAppointmentHours ?? 999))
    .slice(0, 8);
  const urgentAppointmentRows = [...commercialRows]
    .filter((row) => row.needsAppointmentConfirmation && (row.upcomingAppointmentHours ?? 999) <= 2)
    .sort((a, b) => b.appointmentRiskScore - a.appointmentRiskScore || (a.upcomingAppointmentHours ?? 999) - (b.upcomingAppointmentHours ?? 999))
    .slice(0, 5);
  const appointmentReminderRows = appointmentConfirmationRows.filter((row) => (row.upcomingAppointmentHours ?? 999) > 2).slice(0, 5);
  const highRiskAppointmentRows = [...commercialRows]
    .filter((row) => row.upcomingAppointment && row.appointmentRiskScore >= 60)
    .sort((a, b) => b.appointmentRiskScore - a.appointmentRiskScore || (a.upcomingAppointmentHours ?? 999) - (b.upcomingAppointmentHours ?? 999))
    .slice(0, 5);
  const policyUnconfirmedAppointmentRows = [...commercialRows]
    .filter((row) => row.upcomingAppointment && !row.hasCancellationPolicyConsent)
    .sort((a, b) => b.appointmentRiskScore - a.appointmentRiskScore || (a.upcomingAppointmentHours ?? 999) - (b.upcomingAppointmentHours ?? 999))
    .slice(0, 8);
  const newLeadRows = [...commercialRows]
    .filter((row) => row.latestNewLeadLog && !row.hasNewLeadReply)
    .sort((a, b) => (b.newLeadMinutesSince ?? 0) - (a.newLeadMinutesSince ?? 0))
    .slice(0, 8);
  const waitlistRows = [...commercialRows]
    .filter((row) => row.wantsWaitlistContact)
    .sort((a, b) => b.newLeadScore - a.newLeadScore || (b.newLeadMinutesSince ?? 0) - (a.newLeadMinutesSince ?? 0))
    .slice(0, 8);
  const lostAppointmentRecoveryRows = [...commercialRows]
    .filter((row) => row.needsLostAppointmentRecovery)
    .sort(
      (a, b) =>
        (b.latestLostAppointment?.status === "無断キャンセル" ? 1 : 0) -
          (a.latestLostAppointment?.status === "無断キャンセル" ? 1 : 0) ||
        b.lostAppointmentRecoveryValue - a.lostAppointmentRecoveryValue ||
        (a.latestLostAppointmentDays ?? 999) - (b.latestLostAppointmentDays ?? 999)
    )
    .slice(0, 8);
  const courseProposalRows = [...commercialRows]
    .filter((row) => row.needsCourseProposal)
    .sort(
      (a, b) =>
        b.courseProposalValue - a.courseProposalValue ||
        (b.upcomingAppointment ? 1 : 0) - (a.upcomingAppointment ? 1 : 0) ||
        (b.latestProposalResponse?.createdAt.getTime() ?? 0) - (a.latestProposalResponse?.createdAt.getTime() ?? 0)
    )
    .slice(0, 8);
  const reviewRequestRows = [...commercialRows]
    .filter((row) => row.needsReviewRequest)
    .sort((a, b) => (a.latestSaleDays ?? 999) - (b.latestSaleDays ?? 999))
    .slice(0, 5);
  const homeCareProposalRows = [...commercialRows]
    .filter((row) => row.needsHomeCareProposal)
    .sort((a, b) => (a.latestSaleDays ?? 999) - (b.latestSaleDays ?? 999) || b.totalCustomerRevenue - a.totalCustomerRevenue)
    .slice(0, 8);
  const carePlanShareRows = [...commercialRows]
    .filter((row) => row.needsCarePlanShare)
    .sort((a, b) => (a.latestSaleDays ?? 999) - (b.latestSaleDays ?? 999) || b.totalCustomerRevenue - a.totalCustomerRevenue)
    .slice(0, 8);
  const nextRebookingRows = [...commercialRows]
    .filter((row) => row.needsNextRebookingProposal)
    .sort(
      (a, b) =>
        (a.rebookingDaysUntilDue ?? 999) - (b.rebookingDaysUntilDue ?? 999) ||
        b.totalCustomerRevenue - a.totalCustomerRevenue ||
        (b.latestSale?.amount ?? 0) - (a.latestSale?.amount ?? 0)
    )
    .slice(0, 8);
  const maintenancePackageRows = [...commercialRows]
    .filter((row) => row.needsMaintenancePackageProposal)
    .sort(
      (a, b) =>
        b.maintenancePackageValue - a.maintenancePackageValue ||
        b.totalCustomerRevenue - a.totalCustomerRevenue ||
        (a.latestSaleDays ?? 999) - (b.latestSaleDays ?? 999)
    )
    .slice(0, 8);
  const feedbackRecoveryRows = [...commercialRows]
    .filter((row) => row.needsFeedbackRecovery)
    .sort((a, b) => (b.latestFeedbackLog?.createdAt.getTime() ?? 0) - (a.latestFeedbackLog?.createdAt.getTime() ?? 0))
    .slice(0, 5);
  const feedbackHomeCareRows = [...commercialRows]
    .filter((row) => row.needsFeedbackHomeCareProposal)
    .sort((a, b) => (b.latestFeedbackLog?.createdAt.getTime() ?? 0) - (a.latestFeedbackLog?.createdAt.getTime() ?? 0))
    .slice(0, 8);
  const feedbackReviewCandidateRows = [...commercialRows]
    .filter((row) => row.reviewCandidateFromFeedback)
    .sort((a, b) => (b.latestFeedbackRating ?? 0) - (a.latestFeedbackRating ?? 0))
    .slice(0, 5);
  const scheduledFollowUpRows = [...commercialRows]
    .filter((row) => {
      const followUpAt = row.scheduledFollowUpLog?.scheduledFollowUp;
      return Boolean(followUpAt && followUpAt.getTime() <= Date.now() + 7 * 24 * 60 * 60 * 1000);
    })
    .sort(
      (a, b) =>
        (a.scheduledFollowUpLog?.scheduledFollowUp?.getTime() ?? Number.MAX_SAFE_INTEGER) -
        (b.scheduledFollowUpLog?.scheduledFollowUp?.getTime() ?? Number.MAX_SAFE_INTEGER)
    )
    .slice(0, 8);
  const openProposalResponseRows = [...commercialRows]
    .filter((row) => row.openProposalResponse)
    .sort((a, b) => (b.openProposalResponse?.createdAt.getTime() ?? 0) - (a.openProposalResponse?.createdAt.getTime() ?? 0))
    .slice(0, 8);
  const referralThankYouRows = referralLogs
    .filter(
      (log) =>
        !referralHandlingLogs.some(
          (handlingLog) => handlingLog.customerId === log.customerId && handlingLog.createdAt > log.createdAt
        )
    )
    .slice(0, 8);
  const referralConversionRows = referralLogs
    .map((log) => {
      const referredName = proposalMessageLine(log.message, "紹介相談")?.trim();
      const referredPhone = normalizePhone(proposalMessageLine(log.message, "紹介先連絡先"));
      const referredRow = commercialRows.find((row) => {
        if (row.customer.id === log.customerId) {
          return false;
        }

        const rowPhone = normalizePhone(row.customer.phone);
        if (referredPhone && rowPhone && referredPhone === rowPhone) {
          return true;
        }

        return Boolean(referredName && row.customer.name.trim() === referredName);
      });
      const referredSales = referredRow?.customer.serviceSales.filter((sale) => sale.paidAt >= log.createdAt) ?? [];
      const referredRevenue = priceSum(referredSales.map((sale) => sale.amount));
      const latestReferredSale = referredSales[0] ?? null;

      return {
        log,
        referredName: referredName ?? "紹介先のお客様",
        referredRow,
        referredSales,
        referredRevenue,
        latestReferredSale
      };
    })
    .filter((row) => row.referredRow && row.referredRevenue > 0);
  const referralAchievementRows = referralConversionRows
    .filter(
      (row) =>
        !referralAchievementLogs.some(
          (achievementLog) =>
            achievementLog.customerId === row.log.customerId &&
            achievementLog.createdAt > (row.latestReferredSale?.paidAt ?? row.log.createdAt)
        )
    )
    .sort((a, b) => (b.latestReferredSale?.paidAt.getTime() ?? 0) - (a.latestReferredSale?.paidAt.getTime() ?? 0))
    .slice(0, 8);
  const referralChampionRows = Array.from(
    referralLogs.reduce(
      (champions, log) => {
        const referredName = proposalMessageLine(log.message, "紹介相談");
        const current =
          champions.get(log.customerId) ??
          {
            customer: log.customer,
            count: 0,
            latestAt: log.createdAt,
            latestReferredName: referredName
          };
        current.count += 1;
        if (log.createdAt > current.latestAt) {
          current.latestAt = log.createdAt;
          current.latestReferredName = referredName;
        }
        champions.set(log.customerId, current);
        return champions;
      },
      new Map<
        string,
        {
          customer: { id: string; name: string; phone: string | null };
          count: number;
          latestAt: Date;
          latestReferredName?: string;
        }
      >()
    )
  )
    .map(([, value]) => value)
    .sort((a, b) => b.count - a.count || b.latestAt.getTime() - a.latestAt.getTime())
    .slice(0, 6);
  const dailyRemainingTaskCount =
    newLeadRows.length +
    openProposalResponseRows.length +
    scheduledFollowUpRows.length +
    waitlistRows.length +
    lostAppointmentRecoveryRows.length +
    courseProposalRows.length +
    referralThankYouRows.length +
    urgentAppointmentRows.length +
    appointmentReminderRows.length +
    reviewRequestRows.length +
    carePlanShareRows.length +
    homeCareProposalRows.length +
    nextRebookingRows.length +
    maintenancePackageRows.length +
    feedbackHomeCareRows.length +
    feedbackRecoveryRows.length +
    feedbackReviewCandidateRows.length;
  const dailyCompletedTaskCount = customers.reduce((total, customer) => {
    return (
      total +
      customer.contactLogs.filter((log) => {
        const outcome = log.outcome ?? "";
        return (
          log.createdAt >= todayStart &&
          (outcome.includes("返信済み") ||
            outcome.includes("予約確認送信") ||
            outcome.includes("予約確認返信") ||
            outcome.includes("空き枠通知送信") ||
            outcome.includes("キャンセル後フォロー送信") ||
            outcome.includes("無断キャンセル後フォロー送信") ||
            outcome.includes("再予約提案送信") ||
            outcome.includes("単価アップ提案送信") ||
            outcome.includes("追加メニュー提案送信") ||
            outcome.includes("コース提案送信") ||
            outcome.includes("ホームケア提案送信") ||
            outcome.includes("店販提案送信") ||
            outcome.includes("ホームケアメモ共有") ||
            outcome.includes("次回予約提案送信") ||
            outcome.includes("再来予約提案送信") ||
            outcome.includes("会計時次回予約提案") ||
            outcome.includes("会計時ホームケア提案") ||
            outcome.includes("会計時継続プラン提案") ||
            outcome.includes("会計時紹介案内") ||
            outcome.includes("メンテナンスパック提案送信") ||
            outcome.includes("回数券提案送信") ||
            outcome.includes("継続プラン提案送信") ||
            outcome.includes("レビュー依頼送信") ||
            outcome.includes("紹介お礼送信") ||
            outcome.includes("口コミ依頼送信") ||
            outcome.includes("手直しフォロー送信") ||
            outcome.includes("新規リード返信済み"))
        );
      }).length
    );
  }, 0);
  const dailyTotalTaskCount = dailyRemainingTaskCount + dailyCompletedTaskCount;
  const dailyCompletionRate = percent(dailyCompletedTaskCount, dailyTotalTaskCount);
  const operationProgressRate = dailyTotalTaskCount > 0 ? dailyCompletionRate : 100;
  const operationProgressLabel = dailyTotalTaskCount > 0 ? `${dailyCompletionRate}%` : "OK";
  const protectedRevenueValue = priceSum(
    [...urgentAppointmentRows, ...appointmentReminderRows].map((row) => appointmentValue(row, baselineTicketForPlanning))
  );
  const responseRevenueValue = priceSum(
    openProposalResponseRows.map((row) => row.responseOpportunityValue || row.openCourseValue || row.opportunityValue)
  );
  const retentionRevenueValue =
    reviewRequestRows.length * Math.round(baselineTicketForPlanning * 0.3) +
    priceSum(
      scheduledFollowUpRows.map(
        (row) => row.retentionOpportunityValue || row.openCourseValue || Math.round(baselineTicketForPlanning * 0.4)
      )
    );
  const homeCareProposalValue = homeCareProposalRows.length * 2800;
  const carePlanShareValue = carePlanShareRows.length * 1200;
  const feedbackHomeCareValue = feedbackHomeCareRows.length * 2800;
  const nextRebookingValue = priceSum(
    nextRebookingRows.map((row) => row.latestSale?.amount ?? row.retentionOpportunityValue ?? baselineTicketForPlanning)
  );
  const maintenancePackageValue = priceSum(maintenancePackageRows.map((row) => row.maintenancePackageValue));
  const waitlistRecoveryValue = waitlistRows.length * Math.round((baselineTicketForPlanning || averageTicket || recentAverageTicket) * 0.8);
  const lostAppointmentRecoveryValue = priceSum(lostAppointmentRecoveryRows.map((row) => row.lostAppointmentRecoveryValue));
  const courseProposalValue = priceSum(courseProposalRows.map((row) => row.courseProposalValue));
  const referralConvertedRevenueValue = priceSum(referralConversionRows.map((row) => row.referredRevenue));
  const referralNurtureValue =
    (referralThankYouRows.length + referralAchievementRows.length) *
    Math.round((baselineTicketForPlanning || averageTicket || recentAverageTicket) * 0.25);
  const vipRevenueThreshold = Math.max(30000, Math.min((averageTicket || recentAverageTicket || 0) * 3, 120000));
  const vipReactivationRows = [...commercialRows]
    .filter((row) => {
      const hasRecentVipReactivation = row.customer.contactLogs.some(
        (log) =>
          log.createdAt.getTime() >= Date.now() - 30 * 24 * 60 * 60 * 1000 &&
          (((log.outcome ?? "").includes("VIP復帰提案送信") || (log.purpose ?? "").includes("VIP復帰")))
      );

      return (
        row.totalCustomerRevenue >= vipRevenueThreshold &&
        !row.upcomingAppointment &&
        !hasRecentVipReactivation &&
        (row.latestVisitDays === null || row.latestVisitDays >= 45 || row.rebookingDaysUntilDue === null || row.rebookingDaysUntilDue <= 14)
      );
    })
    .sort(
      (a, b) =>
        b.totalCustomerRevenue - a.totalCustomerRevenue ||
        (b.latestVisitDays ?? 999) - (a.latestVisitDays ?? 999) ||
        b.openCourseValue - a.openCourseValue
    )
    .slice(0, 6);
  const vipReactivationValue = priceSum(
    vipReactivationRows.map((row) => row.latestSale?.amount ?? row.retentionOpportunityValue ?? baselineTicketForPlanning)
  );
  const recentCheckoutCustomerIds = Array.from(new Set(recentSales.map((sale) => sale.customerId)));
  const recentCheckoutLogs = checkoutClosingLogs.filter(
    (log) => Date.now() - log.createdAt.getTime() <= 30 * 24 * 60 * 60 * 1000
  );
  const checkoutCoveredCustomerIds = new Set(recentCheckoutLogs.map((log) => log.customerId));
  const checkoutClosingCoverageRate = percent(
    recentCheckoutCustomerIds.filter((customerId) => checkoutCoveredCustomerIds.has(customerId)).length,
    recentCheckoutCustomerIds.length
  );
  const checkoutClosingTypeRows = [
    {
      label: "次回予約",
      logs: recentCheckoutLogs.filter((log) => (log.outcome ?? "").includes("会計時次回予約提案")),
      value: nextRebookingValue,
      action: "会計後すぐ次回目安と候補日を確認する"
    },
    {
      label: "ホームケア",
      logs: recentCheckoutLogs.filter((log) => (log.outcome ?? "").includes("会計時ホームケア提案")),
      value: homeCareProposalValue + carePlanShareValue,
      action: "仕上がりを家で保つケアメモと必要な商品だけ案内する"
    },
    {
      label: "継続プラン",
      logs: recentCheckoutLogs.filter((log) => (log.outcome ?? "").includes("会計時継続プラン提案")),
      value: maintenancePackageValue,
      action: "3回分の周期と料金目安を伝え、都度払いでも比較できるようにする"
    },
    {
      label: "紹介",
      logs: recentCheckoutLogs.filter((log) => (log.outcome ?? "").includes("会計時紹介案内")),
      value: referralNurtureValue,
      action: "満足度が高い会計直後に、紹介フォームを自然に渡す"
    }
  ];
  const dailyRevenueActionValue =
    protectedRevenueValue +
    responseRevenueValue +
    retentionRevenueValue +
    carePlanShareValue +
    homeCareProposalValue +
    feedbackHomeCareValue +
    nextRebookingValue +
    maintenancePackageValue +
    waitlistRecoveryValue +
    lostAppointmentRecoveryValue +
    courseProposalValue +
    vipReactivationValue +
    referralNurtureValue;
  const highRiskAppointmentValue = priceSum(highRiskAppointmentRows.map((row) => row.appointmentValueForRisk));
  const previsitBriefingRows = [...commercialRows]
    .filter((row) => row.upcomingAppointment)
    .sort((a, b) => a.previsitReadinessScore - b.previsitReadinessScore || (a.upcomingAppointmentHours ?? 999) - (b.upcomingAppointmentHours ?? 999))
    .slice(0, 6);
  const previsitMissingRows = previsitBriefingRows.filter((row) => row.previsitMissingItems.length > 0);
  const todayAppointmentBriefRows = [...commercialRows]
    .filter(
      (row) =>
        row.upcomingAppointment &&
        row.upcomingAppointmentHours !== null &&
        row.upcomingAppointmentHours >= 0 &&
        row.upcomingAppointmentHours <= 24
    )
    .sort((a, b) => (a.upcomingAppointmentHours ?? 999) - (b.upcomingAppointmentHours ?? 999))
    .slice(0, 8);
  const todayAppointmentBriefValue = priceSum(
    todayAppointmentBriefRows.map((row) => appointmentValue(row, baselineTicketForPlanning) + Math.round(row.openCourseValue * 0.35))
  );
  const urgentNewLeadRows = newLeadRows.filter((row) => (row.newLeadMinutesSince ?? 0) >= 60);
  const highIntentNewLeadRows = newLeadRows.filter((row) => row.newLeadScore >= 80);
  const averageNewLeadMinutes =
    newLeadRows.length > 0 ? Math.round(priceSum(newLeadRows.map((row) => row.newLeadMinutesSince ?? 0)) / newLeadRows.length) : 0;
  const allNewLeadRows = commercialRows.filter((row) => row.latestNewLeadLog);
  const retailSales = allSales.filter((sale) => {
    const source = sale.source ?? "";
    const title = sale.title ?? "";
    return (
      source.includes("店販") ||
      source.includes("ホームケア") ||
      title.includes("店販") ||
      title.includes("ホームケア") ||
      title.includes("シャンプー") ||
      title.includes("トリートメント")
    );
  });
  const retailSalesValue = priceSum(retailSales.map((sale) => sale.amount));
  const referralLeadRows = allNewLeadRows.filter((row) => row.isReferralLead);
  const referralBookedRows = referralLeadRows.filter((row) => row.hasLeadAppointment);
  const photoReadyLeadRows = allNewLeadRows.filter((row) => row.hasIntakePhotoConsent && row.intakePhotoCount > 0);
  const leadSourceCapturedCount = allNewLeadRows.filter((row) => row.newLeadSource !== "未記録").length;
  const leadSourceCounts = Array.from(
    allNewLeadRows.reduce((counts, row) => {
      const source = row.newLeadSource || "未記録";
      counts.set(source, (counts.get(source) ?? 0) + 1);
      return counts;
    }, new Map<string, number>())
  )
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source, "ja-JP"))
    .slice(0, 8);
  const topLeadSource = leadSourceCounts[0];
  const campaignLinkRows = [
    {
      label: "Instagramプロフィール",
      source: "Instagram",
      campaign: "profile",
      url: intakeCampaignUrl("Instagram", "profile"),
      help: "プロフィールURL、ハイライト、固定投稿に置く相談導線です。"
    },
    {
      label: "Instagramストーリーズ",
      source: "Instagram",
      campaign: "story",
      url: intakeCampaignUrl("Instagram", "story"),
      help: "Before/After投稿や空き枠告知のリンクスタンプ用です。"
    },
    {
      label: "LINEリッチメニュー",
      source: "LINE",
      campaign: "rich-menu",
      url: intakeCampaignUrl("LINE", "rich-menu"),
      help: "既存顧客の再相談・写真付き相談を受ける入口です。"
    },
    {
      label: "Googleプロフィール",
      source: "Google",
      campaign: "business-profile",
      url: intakeCampaignUrl("Google", "business-profile"),
      help: "Googleビジネスプロフィールや口コミ返信からの相談導線です。"
    },
    {
      label: "店頭QR",
      source: "Salon",
      campaign: "front-qr",
      url: intakeCampaignUrl("Salon", "front-qr"),
      help: "受付・鏡前・ショップカードに載せるQR用URLです。"
    },
    {
      label: "紹介カード",
      source: "Referral",
      campaign: "card",
      url: intakeCampaignUrl("Referral", "card"),
      help: "紹介者不明でも流入を紹介施策として集計するカード用URLです。"
    }
  ];
  const leadSourcePerformanceRows = Array.from(
    allNewLeadRows.reduce((sources, row) => {
      const source = row.newLeadSource || "未記録";
      const current = sources.get(source) ?? { source, leads: 0, booked: 0, revenue: 0 };
      current.leads += 1;
      current.booked += row.hasLeadAppointment ? 1 : 0;
      current.revenue += row.totalCustomerRevenue;
      sources.set(source, current);
      return sources;
    }, new Map<string, { source: string; leads: number; booked: number; revenue: number }>())
  )
    .map(([, value]) => value)
    .sort((a, b) => b.revenue - a.revenue || b.booked - a.booked || b.leads - a.leads)
    .slice(0, 8);
  const leadCampaignPerformanceRows = Array.from(
    allNewLeadRows.reduce((campaigns, row) => {
      const source = row.newLeadSource || "未記録";
      const campaign = row.newLeadCampaign || "未設定";
      const key = `${source}::${campaign}`;
      const current = campaigns.get(key) ?? { key, source, campaign, leads: 0, booked: 0, revenue: 0 };
      current.leads += 1;
      current.booked += row.hasLeadAppointment ? 1 : 0;
      current.revenue += row.totalCustomerRevenue;
      campaigns.set(key, current);
      return campaigns;
    }, new Map<string, { key: string; source: string; campaign: string; leads: number; booked: number; revenue: number }>())
  )
    .map(([, value]) => value)
    .sort((a, b) => b.revenue - a.revenue || b.booked - a.booked || b.leads - a.leads || a.key.localeCompare(b.key, "ja-JP"))
    .slice(0, 12);
  const topRevenueLeadSource = leadSourcePerformanceRows.find((row) => row.revenue > 0) ?? leadSourcePerformanceRows[0];
  const topRevenueLeadCampaign =
    leadCampaignPerformanceRows.find((row) => row.revenue > 0) ?? leadCampaignPerformanceRows[0];
  const campaignPlaybookRows = campaignLinkRows.map((link) => {
    const performance = leadCampaignPerformanceRows.find(
      (row) => row.source === link.source && row.campaign === link.campaign
    );
    const leads = performance?.leads ?? 0;
    const booked = performance?.booked ?? 0;
    const revenue = performance?.revenue ?? 0;
    const conversionRate = percent(booked, leads);
    const status =
      leads === 0
        ? "未計測"
        : revenue > 0 || conversionRate >= 40
          ? "伸ばす"
          : leads >= 2 && booked === 0
            ? "改善"
            : "継続";
    const action =
      status === "未計測"
        ? "まずURLを実際の設置場所に貼り、今週1件以上の相談流入を作る。"
        : status === "伸ばす"
          ? "予約化または売上化している導線です。投稿頻度・固定表示・導線露出を増やす。"
          : status === "改善"
            ? "相談は来ているが予約化していません。投稿文、フォーム前の説明、返信速度を見直す。"
            : "計測を続けつつ、相談が入ったら24時間以内に返信して予約化率を見る。";

    return {
      ...link,
      leads,
      booked,
      revenue,
      conversionRate,
      status,
      action,
      message: campaignPlaybookMessage(link)
    };
  });
  const feedbackRatings = commercialRows
    .map((row) => row.latestFeedbackRating)
    .filter((rating): rating is number => typeof rating === "number");
  const averageFeedbackRating =
    feedbackRatings.length > 0 ? Math.round((priceSum(feedbackRatings) / feedbackRatings.length) * 10) / 10 : 0;
  const averageOpenCourseValue = customers.length > 0 ? Math.round(totalOpenCourseValue / customers.length) : 0;
  const imageProposalCount = commercialRows.reduce((total, row) => total + row.generatedImageCount, 0);
  const conversionReadyCount = commercialRows.filter(
    (row) => row.generatedImageCount > 0 && (row.openCourseValue > 0 || row.aiReady)
  ).length;
  const proposalAssetCustomerCount = commercialRows.filter((row) => row.proposalSuggestion).length;
  const generatedProposalCustomerCount = commercialRows.filter((row) => row.generatedImageCount > 0).length;
  const responseCustomerCount = commercialRows.filter((row) => row.latestProposalResponse).length;
  const revenueCustomerCount = commercialRows.filter((row) => row.totalCustomerRevenue > 0).length;
  const commercialRateCards = [
    {
      label: "提案共有反応率",
      rate: percent(responseCustomerCount, proposalAssetCustomerCount),
      detail: `返信あり ${responseCustomerCount} / 共有可能 ${proposalAssetCustomerCount}`,
      help: "提案ページを送った後、予約・相談・検討の反応が返っている割合"
    },
    {
      label: "返信後予約保持",
      rate: percent(activeAppointmentCount, responseCustomerCount),
      detail: `有効予約 ${activeAppointmentCount} / 返信顧客 ${responseCustomerCount}`,
      help: "返信した顧客を次回予約または仮予約へつなげられている割合"
    },
    {
      label: "売上化率",
      rate: percent(revenueCustomerCount, customers.length),
      detail: `売上登録 ${revenueCustomerCount} / 顧客 ${customers.length}`,
      help: "カルテ登録から実会計まで到達している顧客の割合"
    }
  ];
  const complianceAuditRows = [
    {
      label: "写真・AI同意",
      count: customers.filter((customer) => !customer.aiPhotoConsent).length,
      status: customers.every((customer) => customer.aiPhotoConsent) ? "OK" : "要確認",
      action: "写真利用の前に、利用目的を説明して同意を記録する。",
      message: `写真利用同意の確認\n未同意: ${customers.filter((customer) => !customer.aiPhotoConsent).length}名\n対応: 提案画像や写真利用の前に、利用目的を説明して同意を記録する。SNS・広告投稿に使う場合は、提案画像用とは別に投稿範囲の同意を取る。`,
      className: customers.every((customer) => customer.aiPhotoConsent)
        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
        : "border-amber-200 bg-amber-50 text-amber-900"
    },
    {
      label: "連絡先未登録",
      count: customers.filter((customer) => !customer.phone).length,
      status: customers.some((customer) => !customer.phone) ? "要補完" : "OK",
      action: "予約確認、変更連絡、来店後フォローに使える連絡先を補完する。",
      message: `連絡先未登録の補完\n未登録: ${customers.filter((customer) => !customer.phone).length}名\n対応: 予約確認、変更連絡、来店後フォローに使える電話またはLINE連絡先を登録する。`,
      className: customers.some((customer) => !customer.phone)
        ? "border-red-200 bg-red-50 text-red-800"
        : "border-emerald-200 bg-emerald-50 text-emerald-900"
    },
    {
      label: "予約規約未確認",
      count: policyUnconfirmedAppointmentRows.length,
      status: policyUnconfirmedAppointmentRows.length > 0 ? "要確認" : "OK",
      action: "予約確認ページで変更・キャンセル時の連絡方法を確認する。",
      message: `予約規約未確認\n対象: ${policyUnconfirmedAppointmentRows.length}件\n対応: 予約確認ページを送り、変更・キャンセル時の連絡方法と来店可否を確認する。`,
      className: policyUnconfirmedAppointmentRows.length > 0
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-emerald-200 bg-emerald-50 text-emerald-900"
    },
    {
      label: "口コミリンク",
      count: googleReviewUrl ? 0 : 1,
      status: googleReviewUrl ? "OK" : "未設定",
      action: "Google口コミリンクを環境変数に設定し、高評価後の投稿導線を有効にする。",
      message: googleReviewUrl
        ? `口コミリンク設定済み\nURL: ${googleReviewUrl}\n対応: 高評価かつ投稿OKのお客様にだけ、回答後ページと返信文面で案内する。`
        : "口コミリンク未設定\n対応: .env に NEXT_PUBLIC_GOOGLE_REVIEW_URL を設定し、高評価かつ投稿OKのお客様だけに口コミ投稿リンクを案内できるようにする。",
      className: googleReviewUrl
        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
        : "border-amber-200 bg-amber-50 text-amber-900"
    },
    {
      label: "事前写真の利用範囲",
      count: photoReadyLeadRows.length,
      status: photoReadyLeadRows.length > 0 ? "運用確認" : "待機",
      action: "事前写真はカウンセリング・提案画像用として扱い、販促転用は別同意にする。",
      message: `事前写真の利用範囲\n写真付き相談: ${photoReadyLeadRows.length}件\n対応: 事前写真はカウンセリング・提案画像準備用として扱う。SNS、広告、店頭掲示に使う場合は、掲載先と期間を分けて別途同意を取る。`,
      className: "border-sky-200 bg-sky-50 text-sky-900"
    }
  ];
  const decisionBlockerAnalyticsCards = [
    {
      label: "予約迷い理由トップ",
      value: topDecisionBlocker ? topDecisionBlocker.reason : "-",
      help: topDecisionBlocker
        ? `${topDecisionBlocker.count}件。返信文面・料金説明・予約候補の改善ポイントです。`
        : "予約を迷う理由がまだ記録されていません。"
    },
    {
      label: "未解消の予約不安",
      value: openProposalResponseRows.length.toLocaleString("ja-JP"),
      help: "提案返信後、まだ対応済みになっていない相談・予約前の不安です。"
    },
    {
      label: "未対応返信候補額",
      value: `${responseRevenueValue.toLocaleString("ja-JP")}円`,
      help: "予約・相談返信を放置せず、返信文面と予約枠確認で回収したい金額です。"
    },
    {
      label: "単価アップ未提案",
      value: courseProposalRows.length.toLocaleString("ja-JP"),
      help: `未採用コースがあり、まだ追加メニュー提案を送っていない顧客です。提案可能 ${courseProposalValue.toLocaleString("ja-JP")}円。`
    }
  ];
  const appointmentRiskAnalyticsCards = [
    {
      label: "高リスク予約",
      value: highRiskAppointmentRows.length.toLocaleString("ja-JP"),
      help: "直前・未確認・キャンセル履歴・高単価を合わせて優先確認する予約"
    },
    {
      label: "高リスク保全額",
      value: `${highRiskAppointmentValue.toLocaleString("ja-JP")}円`,
      help: "高リスク予約を確認することで空席化から守りたい金額"
    },
    {
      label: "キャンセル回収候補",
      value: lostAppointmentRecoveryRows.length.toLocaleString("ja-JP"),
      help: `14日以内のキャンセル・無断キャンセルで、まだ再予約フォロー未対応の顧客です。回収見込み ${lostAppointmentRecoveryValue.toLocaleString("ja-JP")}円。`
    },
    {
      label: "平均予約リスク",
      value: `${percent(priceSum(commercialRows.map((row) => row.appointmentRiskScore)), commercialRows.length * 100)}%`,
      help: "全顧客の予約リスクスコア平均。低いほど確認運用が安定しています。"
    },
    {
      label: "規約未確認予約",
      value: policyUnconfirmedAppointmentRows.length.toLocaleString("ja-JP"),
      help: "予約はあるが、変更・キャンセル時の連絡確認が取れていない顧客です。"
    }
  ];
  const appointmentProtectionPlaybookRows = [
    {
      label: "2時間以内の直前確認",
      count: urgentAppointmentRows.length,
      value: priceSum(urgentAppointmentRows.map((row) => appointmentValue(row, baselineTicketForPlanning))),
      action: "来店可否・遅れ・変更希望を最優先で確認する",
      message: [
        "予約枠保護: 2時間以内の直前確認",
        `対象: ${urgentAppointmentRows.length}件`,
        `保全見込み: ${priceSum(urgentAppointmentRows.map((row) => appointmentValue(row, baselineTicketForPlanning))).toLocaleString("ja-JP")}円`,
        "対応: 直前確認カードから確認リンク付きメッセージを送る。返信がない場合は電話またはLINEで再確認する。"
      ].join("\n"),
      className: "border-red-200 bg-red-50 text-red-800"
    },
    {
      label: "前日・事前確認",
      count: appointmentReminderRows.length,
      value: priceSum(appointmentReminderRows.map((row) => appointmentValue(row, baselineTicketForPlanning))),
      action: "未確認予約に確認リンクを送り、変更希望を早めに拾う",
      message: [
        "予約枠保護: 前日・事前確認",
        `対象: ${appointmentReminderRows.length}件`,
        `保全見込み: ${priceSum(appointmentReminderRows.map((row) => appointmentValue(row, baselineTicketForPlanning))).toLocaleString("ja-JP")}円`,
        "対応: 予約確認カードから確認リンク付きメッセージを送る。変更希望が来たら空き枠通知候補へ回す。"
      ].join("\n"),
      className: "border-amber-200 bg-amber-50 text-amber-900"
    },
    {
      label: "高リスク予約保全",
      count: highRiskAppointmentRows.length,
      value: highRiskAppointmentValue,
      action: "高単価・未確認・キャンセル履歴のある予約を個別確認する",
      message: [
        "予約枠保護: 高リスク予約保全",
        `対象: ${highRiskAppointmentRows.length}件`,
        `保全見込み: ${highRiskAppointmentValue.toLocaleString("ja-JP")}円`,
        "対応: リスク理由を確認し、必要なら日時変更・メニュー短縮・事前相談で空席化を防ぐ。"
      ].join("\n"),
      className: "border-red-200 bg-white text-red-800"
    },
    {
      label: "空き枠回収",
      count: waitlistRows.length,
      value: waitlistRecoveryValue,
      action: "空き枠通知希望の未予約リードへ候補枠を案内する",
      message: [
        "予約枠保護: 空き枠回収",
        `対象: ${waitlistRows.length}件`,
        `回収見込み: ${waitlistRecoveryValue.toLocaleString("ja-JP")}円`,
        "対応: 空き枠通知候補へ候補時間を送り、埋まらない予約枠を新規相談から回収する。"
      ].join("\n"),
      className: "border-emerald-200 bg-emerald-50 text-emerald-800"
    },
    {
      label: "キャンセル後の再予約",
      count: lostAppointmentRecoveryRows.length,
      value: lostAppointmentRecoveryValue,
      action: "キャンセル・無断キャンセル後の再予約理由を作る",
      message: [
        "予約枠保護: キャンセル後の再予約",
        `対象: ${lostAppointmentRecoveryRows.length}件`,
        `回収見込み: ${lostAppointmentRecoveryValue.toLocaleString("ja-JP")}円`,
        "対応: キャンセル回収カードから、希望時間帯と悩みに合わせた再予約文面を送る。"
      ].join("\n"),
      className: "border-stone-200 bg-white text-stone-800"
    }
  ];
  const previsitAnalyticsCards = [
    {
      label: "来店前準備不足",
      value: previsitMissingRows.length.toLocaleString("ja-JP"),
      help: "予約はあるが、確認・提案・好み情報などに不足がある顧客です。"
    },
    {
      label: "平均来店準備度",
      value:
        previsitBriefingRows.length > 0
          ? `${Math.round(priceSum(previsitBriefingRows.map((row) => row.previsitReadinessScore)) / previsitBriefingRows.length)}%`
          : "-",
      help: "来店前ブリーフの準備度。高いほど当日の認識ズレを減らしやすい状態です。"
    }
  ];
  const feedbackAnalyticsCards = [
    {
      label: "平均仕上がり評価",
      value: feedbackRatings.length > 0 ? `${averageFeedbackRating}/5` : "-",
      help: `回答 ${feedbackRatings.length}件。低評価は内部フォロー、高評価は口コミ候補へ分けます。`
    },
    {
      label: "手直しフォロー",
      value: feedbackRecoveryRows.length.toLocaleString("ja-JP"),
      help: "3点以下、または相談希望のフィードバック。外部口コミ化する前に拾います。"
    },
    {
      label: "口コミ候補",
      value: feedbackReviewCandidateRows.length.toLocaleString("ja-JP"),
      help: "4点以上、または口コミ投稿OKの顧客。感想投稿と次回予約へつなげます。"
    },
    {
      label: "来店後ケア相談",
      value: feedbackHomeCareRows.length.toLocaleString("ja-JP"),
      help: `家での扱いにくさ・ホームケア相談があり、まだ提案していない顧客です。見込み ${feedbackHomeCareValue.toLocaleString("ja-JP")}円。`
    },
    {
      label: "次回予約未提案",
      value: nextRebookingRows.length.toLocaleString("ja-JP"),
      help: `会計後または再来周期が近いのに、まだ次回予約提案を送っていない顧客です。見込み ${nextRebookingValue.toLocaleString("ja-JP")}円。`
    },
    {
      label: "継続プラン未提案",
      value: maintenancePackageRows.length.toLocaleString("ja-JP"),
      help: `会計後30日以内で、まだメンテナンスパックを提案していない顧客です。見込み ${maintenancePackageValue.toLocaleString("ja-JP")}円。`
    },
    {
      label: "ホームケア未提案",
      value: homeCareProposalRows.length.toLocaleString("ja-JP"),
      help: `会計後3日以内で、まだホームケア提案を送っていない顧客です。見込み ${homeCareProposalValue.toLocaleString("ja-JP")}円。`
    },
    {
      label: "ケアメモ未共有",
      value: carePlanShareRows.length.toLocaleString("ja-JP"),
      help: `会計後3日以内で、まだホームケアメモURLを送っていない顧客です。見込み ${carePlanShareValue.toLocaleString("ja-JP")}円。`
    },
    {
      label: "店販売上",
      value: `${retailSalesValue.toLocaleString("ja-JP")}円`,
      help: `店販・ホームケアとして記録された売上。会計 ${allSales.length}件中 ${retailSales.length}件です。`
    }
  ];
  const leadAnalyticsCards = [
    {
      label: "新規リード未返信",
      value: newLeadRows.length.toLocaleString("ja-JP"),
      help: "公開相談フォームから入った未返信リード。予約化のため最優先で返します。"
    },
    {
      label: "1時間超えリード",
      value: urgentNewLeadRows.length.toLocaleString("ja-JP"),
      help: "初回返信が遅れているリード。空き枠提示や相談返信を急ぎます。"
    },
    {
      label: "高確度未返信",
      value: highIntentNewLeadRows.length.toLocaleString("ja-JP"),
      help: "希望日時・連絡先・悩みが明確な未返信リード。先に返すほど予約化しやすい対象です。"
    },
    {
      label: "空き枠候補",
      value: waitlistRows.length.toLocaleString("ja-JP"),
      help: `空き枠通知を希望していて、まだ予約がない顧客。回収見込み ${waitlistRecoveryValue.toLocaleString("ja-JP")}円。`
    },
    {
      label: "写真付き相談",
      value: photoReadyLeadRows.length.toLocaleString("ja-JP"),
      help: "写真利用同意と事前写真がある新規相談。来店前の似合わせ提案に進みやすい顧客です。"
    },
    {
      label: "紹介リード",
      value: referralLeadRows.length.toLocaleString("ja-JP"),
      help: `紹介経由の新規相談。予約化 ${percent(referralBookedRows.length, referralLeadRows.length)}% / 照合済み紹介売上 ${referralConvertedRevenueValue.toLocaleString("ja-JP")}円。`
    },
    {
      label: "紹介お礼未対応",
      value: (referralThankYouRows.length + referralAchievementRows.length).toLocaleString("ja-JP"),
      help: `紹介発生または売上化後、まだお礼送信ログがない紹介者。売上化済み ${referralAchievementRows.length}件。`
    },
    {
      label: "紹介者トップ",
      value: referralChampionRows[0]?.customer.name ?? "-",
      help: referralChampionRows[0]
        ? `${referralChampionRows[0].count}件の紹介が記録されています。`
        : "紹介発生ログがまだありません。"
    },
    {
      label: "平均未返信時間",
      value: newLeadRows.length > 0 ? `${averageNewLeadMinutes}分` : "-",
      help: "未返信リードの平均経過時間。短いほど商談化しやすい運用です。"
    },
    {
      label: "流入元記録率",
      value: `${percent(leadSourceCapturedCount, allNewLeadRows.length)}%`,
      help: "新規相談の流入元が残っている割合。広告、SNS、紹介の投資判断に使います。"
    },
    {
      label: "最多流入元",
      value: topLeadSource ? topLeadSource.source : "-",
      help: topLeadSource ? `${topLeadSource.count}件の新規相談がこの流入元から入っています。` : "流入元付きの新規相談がまだありません。"
    },
    {
      label: "流入元別売上トップ",
      value: topRevenueLeadSource ? topRevenueLeadSource.source : "-",
      help: topRevenueLeadSource
        ? `${topRevenueLeadSource.revenue.toLocaleString("ja-JP")}円 / 予約化 ${percent(topRevenueLeadSource.booked, topRevenueLeadSource.leads)}%`
        : "流入元付きの売上データがまだありません。"
    },
    {
      label: "キャンペーン売上トップ",
      value: topRevenueLeadCampaign ? `${topRevenueLeadCampaign.source} / ${topRevenueLeadCampaign.campaign}` : "-",
      help: topRevenueLeadCampaign
        ? `${topRevenueLeadCampaign.revenue.toLocaleString("ja-JP")}円 / 予約化 ${percent(topRevenueLeadCampaign.booked, topRevenueLeadCampaign.leads)}%`
        : "キャンペーン付きの売上データがまだありません。"
    }
  ];
  const ownerWeeklyReportMessage = [
    "【Salon de Lien 週次オーナーレポート】",
    `累計売上: ${totalServiceRevenue.toLocaleString("ja-JP")}円 / 直近30日: ${recentServiceRevenue.toLocaleString("ja-JP")}円`,
    `平均客単価: ${averageTicket.toLocaleString("ja-JP")}円 / 直近平均: ${recentAverageTicket.toLocaleString("ja-JP")}円`,
    `有効予約: ${activeAppointmentCount}件 / 予約リスク: 高リスク${highRiskAppointmentRows.length}件・規約未確認${policyUnconfirmedAppointmentRows.length}件`,
    `キャンセル率: ${percent(canceledAppointmentCount + noShowAppointmentCount, allAppointments.length)}%（キャンセル${canceledAppointmentCount} / 無断${noShowAppointmentCount} / 予約${allAppointments.length}）`,
    `新規相談: ${allNewLeadRows.length}件 / 未返信${newLeadRows.length}件 / 1時間超え${urgentNewLeadRows.length}件`,
    topRevenueLeadCampaign
      ? `集客トップ: ${topRevenueLeadCampaign.source} / ${topRevenueLeadCampaign.campaign}（売上${topRevenueLeadCampaign.revenue.toLocaleString("ja-JP")}円・予約化${percent(topRevenueLeadCampaign.booked, topRevenueLeadCampaign.leads)}%）`
      : "集客トップ: campaign付きの実績はまだありません",
    `口コミ・来店後: 平均評価${feedbackRatings.length > 0 ? `${averageFeedbackRating}/5` : "-"} / 手直し${feedbackRecoveryRows.length}件 / 口コミ候補${feedbackReviewCandidateRows.length}件`,
    `単価アップ: 未提案${courseProposalRows.length}件・${courseProposalValue.toLocaleString("ja-JP")}円 / 店販売上${retailSalesValue.toLocaleString("ja-JP")}円`,
    `再来施策: 次回予約未提案${nextRebookingRows.length}件 / 継続プラン未提案${maintenancePackageRows.length}件 / ケアメモ未共有${carePlanShareRows.length}件`,
    `優良顧客復帰: VIP復帰候補${vipReactivationRows.length}件・${vipReactivationValue.toLocaleString("ja-JP")}円 / 閾値${vipRevenueThreshold.toLocaleString("ja-JP")}円`,
    `会計時クロージング: 実行率${checkoutClosingCoverageRate}% / 次回予約${checkoutClosingTypeRows[0].logs.length}件 / ホームケア${checkoutClosingTypeRows[1].logs.length}件 / 継続${checkoutClosingTypeRows[2].logs.length}件 / 紹介${checkoutClosingTypeRows[3].logs.length}件`,
    `今日の運用インパクト: ${dailyRevenueActionValue.toLocaleString("ja-JP")}円`,
    "今週の優先順:",
    `1. 未返信リード${newLeadRows.length}件と提案返信${openProposalResponseRows.length}件を先に返す`,
    `2. 高リスク予約${highRiskAppointmentRows.length}件を確認して空席化を防ぐ`,
    `3. 会計後のケアメモ${carePlanShareRows.length}件とホームケア${homeCareProposalRows.length}件を送る`,
    topRevenueLeadCampaign
      ? `4. ${topRevenueLeadCampaign.source} / ${topRevenueLeadCampaign.campaign} の導線を増やし、低実績campaignは文面を改善する`
      : "4. 集客リンクセンターのURLを各チャネルへ設置してcampaign別計測を始める"
  ].join("\n");
  const commercialFunnel = [
    {
      label: "写真素材あり",
      count: aiReadyCount,
      help: "写真同意と参照画像が揃い、提案画像へ進める顧客"
    },
    {
      label: "提案保存済み",
      count: proposalAssetCustomerCount,
      help: "提案があり、共有ページに接続できる顧客"
    },
    {
      label: "画像提案あり",
      count: generatedProposalCustomerCount,
      help: "仕上がりイメージを見せて相談・予約を促せる顧客"
    },
    {
      label: "返信あり",
      count: responseCustomerCount,
      help: "提案ページから予約・相談・検討の反応が返っている顧客"
    },
    {
      label: "予約保持",
      count: activeAppointmentCount,
      help: "有効な次回予約がある顧客"
    },
    {
      label: "売上記録あり",
      count: revenueCustomerCount,
      help: "会計登録済みでLTV分析に使える顧客"
    }
  ];
  const commercialLeakage = [
    {
      label: "素材不足",
      count: Math.max(0, customers.length - aiReadyCount),
      action: "写真同意、正面、横写真を揃える"
    },
    {
      label: "提案未作成",
      count: Math.max(0, customers.length - proposalAssetCustomerCount),
      action: "提案を保存する"
    },
    {
      label: "画像未生成",
      count: Math.max(0, proposalAssetCustomerCount - generatedProposalCustomerCount),
      action: "本命提案から相談用画像を生成する"
    },
    {
      label: "返信未対応",
      count: openProposalResponseRows.length,
      action: "予約希望・相談希望を返信し、送信済みとして記録する"
    },
    {
      label: "予約なし",
      count: Math.max(0, customers.length - activeAppointmentCount),
      action: "次回候補日とメニュー理由を送る"
    },
    {
      label: "次回予約未提案",
      count: nextRebookingRows.length,
      action: "会計後・再来周期に合わせて次回予約の候補時期を送る"
    },
    {
      label: "継続プラン未提案",
      count: maintenancePackageRows.length,
      action: "定期メンテナンスを3回分の料金目安として提案する"
    }
  ].filter((item) => item.count > 0);
  const recentVisitRows = commercialRows
    .filter((row) => row.customer.visits[0])
    .sort((a, b) => b.customer.visits[0].visitedAt.getTime() - a.customer.visits[0].visitedAt.getTime())
    .slice(0, 12);
  const styleAssetRows = [...commercialRows]
    .sort((a, b) => b.generatedImageCount - a.generatedImageCount || b.openCourseValue - a.openCourseValue)
    .slice(0, 12);
  const calendarRows = [...commercialRows]
    .map((row) => ({
      ...row,
      nextDate:
        row.upcomingAppointment?.scheduledAt ??
        row.scheduledFollowUpLog?.scheduledFollowUp ??
        (row.customer.visits[0]?.visitedAt ? addDays(row.customer.visits[0].visitedAt, 60) : null)
    }))
    .sort((a, b) => {
      if (!a.nextDate && !b.nextDate) {
        return b.status.priority - a.status.priority;
      }

      if (!a.nextDate) {
        return -1;
      }

      if (!b.nextDate) {
        return 1;
      }

      return a.nextDate.getTime() - b.nextDate.getTime();
    })
    .slice(0, 12);
  const topRevenueRows = [...commercialRows]
    .filter((row) => row.totalCustomerRevenue > 0)
    .sort((a, b) => b.totalCustomerRevenue - a.totalCustomerRevenue)
    .slice(0, 5);
  const retentionRiskRows = [...commercialRows]
    .filter((row) => !row.upcomingAppointment && (row.latestVisitDays === null || row.latestVisitDays >= 45))
    .sort((a, b) => b.status.priority - a.status.priority || (b.latestVisitDays ?? 999) - (a.latestVisitDays ?? 999))
    .slice(0, 5);
  const highIntentRows = [...commercialRows]
    .filter((row) => row.openProposalResponse || row.latestProposalResponse?.intent.includes("予約") || row.latestProposalResponse?.intent.includes("相談"))
    .sort((a, b) => {
      const aTime = a.openProposalResponse?.createdAt.getTime() ?? a.latestProposalResponse?.createdAt.getTime() ?? 0;
      const bTime = b.openProposalResponse?.createdAt.getTime() ?? b.latestProposalResponse?.createdAt.getTime() ?? 0;
      return bTime - aTime;
    })
    .slice(0, 5);
  const dailyOperationCards = [
    {
      label: "新規リード",
      count: newLeadRows.length,
      href: "/customers?view=messages",
      action: "公開相談フォームの未返信を返す",
      className: "border-red-200 bg-red-50 text-red-800"
    },
    {
      label: "未対応返信",
      count: openProposalResponseRows.length,
      href: "/customers?view=messages",
      action: `返信文面をコピーして送信済みにする / 候補 ${responseRevenueValue.toLocaleString("ja-JP")}円`,
      className: "border-red-200 bg-red-50 text-red-800"
    },
    {
      label: "予定フォロー",
      count: scheduledFollowUpRows.length,
      href: "/customers?view=messages",
      action: "返信待ち・次回候補日を送る",
      className: "border-amber-200 bg-amber-50 text-amber-900"
    },
    {
      label: "空き枠候補",
      count: waitlistRows.length,
      href: "/customers?view=messages",
      action: "キャンセル枠を希望者へ提案",
      className: "border-emerald-200 bg-emerald-50 text-emerald-800"
    },
    {
      label: "キャンセル回収",
      count: lostAppointmentRecoveryRows.length,
      href: "/customers?view=messages",
      action: "再予約候補を送り直す",
      className: "border-red-200 bg-white text-red-800"
    },
    {
      label: "VIP復帰",
      count: vipReactivationRows.length,
      href: "/customers?view=messages",
      action: "優良顧客へ復帰提案を送る",
      className: "border-fuchsia-200 bg-white text-fuchsia-900"
    },
    {
      label: "写真付き相談",
      count: photoReadyLeadRows.length,
      href: "/customers?view=messages",
      action: "事前写真から似合わせ準備",
      className: "border-teal-200 bg-white text-teal-900"
    },
    {
      label: "単価アップ",
      count: courseProposalRows.length,
      href: "/customers?view=messages",
      action: "追加メニュー候補を送る",
      className: "border-amber-200 bg-white text-amber-900"
    },
    {
      label: "紹介お礼",
      count: referralThankYouRows.length + referralAchievementRows.length,
      href: "/customers?view=messages",
      action: "紹介者へお礼・成果報告を送る",
      className: "border-emerald-200 bg-white text-emerald-800"
    },
    {
      label: "直前確認",
      count: urgentAppointmentRows.length,
      href: "/customers?view=messages",
      action: "2時間以内の予約を確認",
      className: "border-red-200 bg-red-50 text-red-800"
    },
    {
      label: "当日ブリーフ",
      count: todayAppointmentBriefRows.length,
      href: "/customers?view=calendar",
      action: "本日の予約売上と提案を確認",
      className: "border-sky-200 bg-white text-sky-900"
    },
    {
      label: "予約確認",
      count: appointmentConfirmationRows.length,
      href: "/customers?view=messages",
      action: "48時間以内の予約を確認",
      className: "border-amber-200 bg-white text-amber-900"
    },
    {
      label: "予約リスク",
      count: highRiskAppointmentRows.length,
      href: "/customers?view=calendar",
      action: "空席化しやすい予約を優先確認",
      className: "border-red-200 bg-white text-red-800"
    },
    {
      label: "規約未確認",
      count: policyUnconfirmedAppointmentRows.length,
      href: "/customers?view=calendar",
      action: "変更・キャンセル時の連絡確認",
      className: "border-amber-200 bg-white text-amber-900"
    },
    {
      label: "レビュー依頼",
      count: reviewRequestRows.length,
      href: "/customers?view=messages",
      action: "来店後フォローを送る",
      className: "border-emerald-200 bg-emerald-50 text-emerald-800"
    },
    {
      label: "ホームケア",
      count: homeCareProposalRows.length,
      href: "/customers?view=messages",
      action: "仕上がり維持の提案を送る",
      className: "border-teal-200 bg-white text-teal-900"
    },
    {
      label: "ケアメモ",
      count: carePlanShareRows.length,
      href: "/customers?view=messages",
      action: "ホームケアメモURLを送る",
      className: "border-sky-200 bg-white text-sky-900"
    },
    {
      label: "来店後ケア",
      count: feedbackHomeCareRows.length,
      href: "/customers?view=messages",
      action: "家での扱いにくさをケア提案へつなぐ",
      className: "border-indigo-200 bg-white text-indigo-900"
    },
    {
      label: "次回予約",
      count: nextRebookingRows.length,
      href: "/customers?view=messages",
      action: "会計後・周期に合わせて次回候補を送る",
      className: "border-indigo-200 bg-white text-indigo-900"
    },
    {
      label: "継続プラン",
      count: maintenancePackageRows.length,
      href: "/customers?view=messages",
      action: "3回分のメンテナンス候補を提案",
      className: "border-violet-200 bg-white text-violet-900"
    },
    {
      label: "手直し対応",
      count: feedbackRecoveryRows.length,
      href: "/customers?view=messages",
      action: "低評価・相談希望を先に拾う",
      className: "border-red-200 bg-red-50 text-red-800"
    },
    {
      label: "口コミ候補",
      count: feedbackReviewCandidateRows.length,
      href: "/customers?view=messages",
      action: "高評価を口コミと次回予約へつなぐ",
      className: "border-emerald-200 bg-white text-emerald-800"
    },
    {
      label: "失客防止",
      count: retentionRiskRows.length,
      href: "/customers?view=analytics",
      action: "再来店理由を作る",
      className: "border-stone-200 bg-white text-stone-800"
    }
  ];
  const customerResponseValue = responseRevenueValue + waitlistRecoveryValue;
  const reservationProtectionValue = protectedRevenueValue + highRiskAppointmentValue + lostAppointmentRecoveryValue;
  const growthActionValue =
    courseProposalValue +
    homeCareProposalValue +
    carePlanShareValue +
    nextRebookingValue +
    maintenancePackageValue +
    vipReactivationValue;
  const operationFocusCards = [
    {
      label: "まず返す",
      title: "予約・相談の返事を止めない",
      count: newLeadRows.length + openProposalResponseRows.length + scheduledFollowUpRows.length,
      value: customerResponseValue,
      href: "/customers?view=messages",
      action: "未返信リード、提案返信、予定フォローを上から処理",
      details: [
        `新規 ${newLeadRows.length}件`,
        `提案返信 ${openProposalResponseRows.length}件`,
        `予定フォロー ${scheduledFollowUpRows.length}件`
      ],
      className: "border-red-200 bg-red-50 text-red-900",
      buttonClassName: "border-red-200 bg-white text-red-800 hover:bg-red-100"
    },
    {
      label: "予約を守る",
      title: "空席化しやすい予約を先に確認",
      count: urgentAppointmentRows.length + appointmentConfirmationRows.length + highRiskAppointmentRows.length + policyUnconfirmedAppointmentRows.length,
      value: reservationProtectionValue,
      href: "/customers?view=calendar",
      action: "直前確認、前日確認、高リスク予約、規約未確認を確認",
      details: [
        `直前 ${urgentAppointmentRows.length}件`,
        `確認 ${appointmentConfirmationRows.length}件`,
        `高リスク ${highRiskAppointmentRows.length}件`
      ],
      className: "border-amber-200 bg-amber-50 text-amber-950",
      buttonClassName: "border-amber-200 bg-white text-amber-900 hover:bg-amber-100"
    },
    {
      label: "売上を足す",
      title: "会計前後の提案漏れを回収",
      count:
        courseProposalRows.length +
        homeCareProposalRows.length +
        carePlanShareRows.length +
        nextRebookingRows.length +
        maintenancePackageRows.length +
        vipReactivationRows.length,
      value: growthActionValue,
      href: "/customers?view=messages",
      action: "追加メニュー、ホームケア、次回予約、継続プランを提案",
      details: [
        `単価アップ ${courseProposalRows.length}件`,
        `ホームケア ${homeCareProposalRows.length + carePlanShareRows.length}件`,
        `次回/継続 ${nextRebookingRows.length + maintenancePackageRows.length}件`
      ],
      className: "border-teal-200 bg-teal-50 text-teal-950",
      buttonClassName: "border-teal-200 bg-white text-teal-900 hover:bg-teal-100"
    }
  ];
  const visibleOperationCards = dailyOperationCards.filter((card) => card.count > 0).slice(0, 10);
  const businessSummaryCards = [
    {
      label: "顧客",
      value: customers.length.toLocaleString("ja-JP"),
      help: `追客対象 ${followTargetCount}名 / AI準備済み ${aiReadyCount}名`,
      icon: UsersRound,
      className: "border-stone-200 bg-white text-stone-900"
    },
    {
      label: "売上候補",
      value: `${dailyRevenueActionValue.toLocaleString("ja-JP")}円`,
      help: `返信 ${responseRevenueValue.toLocaleString("ja-JP")}円 / 未採用 ${totalOpenCourseValue.toLocaleString("ja-JP")}円`,
      icon: BadgeDollarSign,
      className: "border-teal-200 bg-white text-teal-950"
    },
    {
      label: "予約リスク",
      value: `${urgentAppointmentRows.length + highRiskAppointmentRows.length}`,
      help: `直前 ${urgentAppointmentRows.length}件 / 高リスク ${highRiskAppointmentRows.length}件 / 保全 ${protectedRevenueValue.toLocaleString("ja-JP")}円`,
      icon: CalendarClock,
      className: "border-red-200 bg-red-50 text-red-900"
    },
    {
      label: "接客品質",
      value: feedbackRatings.length > 0 ? `${averageFeedbackRating}/5` : "-",
      help: `レビュー候補 ${feedbackReviewCandidateRows.length}件 / 手直し ${feedbackRecoveryRows.length}件`,
      icon: Sparkles,
      className: "border-emerald-200 bg-white text-emerald-900"
    }
  ];
  const publicIntakeUrl = intakeShareUrl();

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-950">顧客</h1>
          <p className="mt-1 text-sm text-stone-600">検索して、必要なカルテだけを開きます。</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CopyTextButton text={publicIntakeUrl} label="受付URLをコピー" />
          <Link
            href="/customers/new"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-teal-800 px-5 text-sm font-semibold text-white shadow-sm hover:bg-teal-900"
          >
            <Plus className="h-4 w-4" />
            新規顧客
          </Link>
        </div>
      </div>

      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <form className="flex flex-col gap-3 sm:flex-row">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
            <input
              name="q"
              defaultValue={keyword}
              placeholder="顧客名・電話・メモで検索"
              className="h-11 w-full rounded-md border border-stone-200 bg-white px-11 text-sm shadow-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            />
          </label>
          <button
            type="submit"
            className="h-11 rounded-md border border-stone-200 bg-stone-50 px-5 text-sm font-semibold text-stone-800 shadow-sm hover:bg-stone-100"
          >
            検索
          </button>
        </form>
      </section>

      {view === "analytics" ? (
      <>
      <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-900">
              <ClipboardList className="h-4 w-4" />
              今日の操作卓
            </div>
            <h2 className="mt-3 text-xl font-semibold text-stone-950">この順番で処理する</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              返信を返す、予約を守る、売上を足す。店側が朝に判断することだけを先頭に集約しています。
            </p>
          </div>
          <div className="min-w-[160px] rounded-md border border-stone-200 bg-[#fbf8f3] px-4 py-3 text-right">
            <p className="text-xs font-semibold text-stone-500">本日の進捗</p>
            <p className="mt-1 text-2xl font-semibold text-stone-950">{operationProgressLabel}</p>
            <p className="mt-1 text-xs text-stone-500">
              {dailyTotalTaskCount > 0 ? `済 ${dailyCompletedTaskCount} / 残 ${dailyRemainingTaskCount}` : "未処理タスクなし"}
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {operationFocusCards.map((card, index) => (
            <article key={card.label} className={`rounded-md border p-4 shadow-sm ${card.className}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold">STEP {index + 1} / {card.label}</p>
                  <h3 className="mt-2 text-lg font-semibold">{card.title}</h3>
                </div>
                <span className="rounded border border-current/20 bg-white/70 px-2 py-1 text-[11px] font-semibold">
                  {card.count}件
                </span>
              </div>
              <p className="mt-4 text-2xl font-semibold">{card.value.toLocaleString("ja-JP")}円</p>
              <p className="mt-2 text-xs leading-5">{card.action}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {card.details.map((detail) => (
                  <span key={detail} className="rounded border border-current/15 bg-white/70 px-2 py-1 text-[11px] font-semibold">
                    {detail}
                  </span>
                ))}
              </div>
              <Link
                href={card.href}
                className={`mt-4 inline-flex h-9 items-center justify-center rounded-md border px-3 text-xs font-semibold ${card.buttonClassName}`}
              >
                開いて処理する
              </Link>
            </article>
          ))}
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-stone-200">
          <div className="h-full rounded-full bg-teal-700" style={{ width: `${operationProgressRate}%` }} />
        </div>
        {visibleOperationCards.length > 0 ? (
          <div className="mt-4 rounded-md border border-stone-200 bg-[#fbf8f3] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-stone-500">残タスク</span>
              {visibleOperationCards.map((card) => (
                <Link key={card.label} href={card.href} className="rounded border border-stone-200 bg-white px-2 py-1 text-[11px] font-semibold text-stone-700 hover:border-teal-300 hover:text-teal-900">
                  {card.label} {card.count}
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-900">
            いま急ぎの未処理タスクはありません。新規相談リンクと本日の予約だけ確認してください。
          </div>
        )}
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {businessSummaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`rounded-lg border p-4 shadow-sm ${card.className}`}>
              <div className="flex items-center gap-2 text-xs font-semibold">
                <Icon className="h-4 w-4" />
                {card.label}
              </div>
              <p className="mt-2 text-2xl font-semibold">{card.value}</p>
              <p className="mt-2 text-xs leading-5 opacity-80">{card.help}</p>
            </div>
          );
        })}
      </section>

      <section className="rounded-lg border border-teal-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-900">
              <ClipboardList className="h-4 w-4" />
              今日の売上アクション
            </div>
            <h2 className="mt-3 text-xl font-semibold text-stone-950">動くべき顧客を優先度順に表示</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              予約希望、相談希望、再来店周期、未採用メニュー、写真素材の不足を見て、スタッフがすぐ動ける順に並べます。
            </p>
          </div>
          <span className="rounded-md border border-stone-200 bg-[#fbf8f3] px-3 py-2 text-xs font-semibold text-stone-700">
            上位 {actionRows.length} 件 / 見込み {actionOpportunityValue.toLocaleString("ja-JP")}円
          </span>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-5">
          {actionRows.map((row, index) => (
            <Link
              key={row.customer.id}
              href={row.href}
              className="rounded-md border border-stone-200 bg-[#fbf8f3] p-3 hover:border-teal-300 hover:bg-teal-50/40"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-stone-500">#{index + 1}</span>
                <span className={`rounded border px-2 py-1 text-[11px] font-semibold ${statusClass(row.status.tone)}`}>
                  {row.status.label}
                </span>
              </div>
              <p className="mt-3 font-semibold text-stone-950">{row.customer.name}</p>
              <p className="mt-2 text-xs leading-5 text-stone-600">{row.status.action}</p>
              <p className="mt-2 text-xs text-stone-500">
                今日見込み {row.opportunityValue.toLocaleString("ja-JP")}円 / 未採用 {row.openCourseValue.toLocaleString("ja-JP")}円
              </p>
              {row.addOnInterests.length > 0 ? (
                <p className="mt-2 line-clamp-2 text-[11px] font-semibold text-amber-800">
                  追加相談: {row.addOnInterests.join(" / ")}
                </p>
              ) : null}
            </Link>
          ))}
        </div>
      </section>
      </>
      ) : null}

      {view === "visits" ? (
        <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-stone-950">最近の来店</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {recentVisitRows.map((row) => (
              <Link key={row.customer.id} href={row.href} className="rounded-md border border-stone-200 bg-[#fbf8f3] p-4 hover:border-teal-300">
                <p className="font-semibold text-stone-950">{row.customer.name}</p>
                <p className="mt-2 text-sm text-stone-600">最終来店: {formatDate(row.customer.visits[0]?.visitedAt)}</p>
                <p className="mt-2 text-xs text-stone-500">{row.status.action}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {view === "styles" ? (
        <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-stone-950">提案資産</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {styleAssetRows.map((row) => (
              <Link key={row.customer.id} href={row.href} className="rounded-md border border-stone-200 bg-[#fbf8f3] p-4 hover:border-teal-300">
                <p className="font-semibold text-stone-950">{row.customer.name}</p>
                <p className="mt-2 text-sm text-stone-600">
                  正面{row.frontCount} / 横{row.sideCount} / 後ろ{row.backCount} / 生成{row.generatedImageCount}
                </p>
                <p className="mt-2 text-xs text-teal-800">{row.proposalSuggestion?.suggestedStyleName ?? "提案未作成"}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {view === "calendar" ? (
        <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-stone-950">次回提案カレンダー</h2>
          {todayAppointmentBriefRows.length > 0 ? (
            <div className="mt-4 rounded-md border border-sky-200 bg-sky-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-sky-950">本日の来店売上ブリーフ</h3>
                  <p className="mt-1 text-xs leading-5 text-sky-900">
                    今日の予約ごとに、守る売上・追加候補・会計時の次アクションを確認します。
                  </p>
                </div>
                <span className="rounded border border-sky-200 bg-white px-2 py-1 text-[11px] font-semibold text-sky-900">
                  {todayAppointmentBriefRows.length}件 / {todayAppointmentBriefValue.toLocaleString("ja-JP")}円
                </span>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {todayAppointmentBriefRows.map((row) => {
                  const appointmentValueForToday = appointmentValue(row, baselineTicketForPlanning);
                  const addOnValue = Math.round(row.openCourseValue * 0.35);
                  const totalBriefValue = appointmentValueForToday + addOnValue;
                  const briefMessage = appointmentRevenueBriefMessage({
                    customerName: row.customer.name,
                    appointmentDate: row.upcomingAppointment?.scheduledAt,
                    appointmentMenu: row.upcomingAppointment?.menu,
                    appointmentValue: appointmentValueForToday,
                    proposalName: row.proposalSuggestion?.suggestedStyleName,
                    courseTitle: row.topOpenCourse?.title,
                    openCourseValue: row.openCourseValue,
                    previsitConcern: row.previsitConcern,
                    priceExpectation: row.previsitPriceExpectation,
                    finishBy: row.previsitFinishBy,
                    priority: row.previsitPriority,
                    missingItems: row.previsitMissingItems,
                    careUrl: row.carePlanUrl,
                    nextVisitDate: row.suggestedNextVisitDate
                  });

                  return (
                    <article key={`${row.customer.id}-today-brief`} className="rounded-md border border-sky-200 bg-white p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-stone-950">{row.customer.name}</p>
                        <span className={`rounded border px-2 py-1 text-[11px] font-semibold ${appointmentRiskClass(row.appointmentRiskScore)}`}>
                          {row.appointmentRiskLabel} {row.appointmentRiskScore}
                        </span>
                      </div>
                      <div className="mt-2 grid gap-1 text-xs leading-5 text-stone-700">
                        <p>予約: {row.upcomingAppointment ? `${formatDateTime(row.upcomingAppointment.scheduledAt)} / ${row.upcomingAppointment.menu ?? "当日相談"}` : "未設定"}</p>
                        <p>予約売上目安: {appointmentValueForToday.toLocaleString("ja-JP")}円</p>
                        <p>追加候補: {row.topOpenCourse?.title ?? "未設定"} / {addOnValue.toLocaleString("ja-JP")}円</p>
                        <p>会計後: 次回予約・ホームケアメモ・必要なら継続プラン</p>
                      </div>
                      {row.previsitMissingItems.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {row.previsitMissingItems.map((item) => (
                            <span key={item} className="rounded border border-red-100 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700">
                              {item}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <div className="mt-3 rounded-md border border-sky-100 bg-sky-50 p-3">
                        <p className="text-[11px] font-semibold text-sky-900">朝会メモ</p>
                        <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-stone-700">{briefMessage}</p>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <CopyTextButton text={briefMessage} label="メモコピー" />
                        <span className="rounded border border-sky-100 bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-900">
                          合計見込み {totalBriefValue.toLocaleString("ja-JP")}円
                        </span>
                        <Link href={row.href} className="inline-flex h-9 items-center rounded-md border border-sky-200 bg-sky-50 px-3 text-xs font-semibold text-sky-900 hover:bg-sky-100">
                          カルテを開く
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : null}
          {previsitBriefingRows.length > 0 ? (
            <div className="mt-4 rounded-md border border-teal-200 bg-teal-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-teal-950">来店前ブリーフ</h3>
                  <p className="mt-1 text-xs leading-5 text-teal-900">
                    予約前に確認すべき提案・好み・未対応事項をまとめます。
                  </p>
                </div>
                <span className="rounded border border-teal-200 bg-white px-2 py-1 text-[11px] font-semibold text-teal-900">
                  {previsitMissingRows.length}件要確認
                </span>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {previsitBriefingRows.map((row) => (
                  <article key={row.customer.id} className="rounded-md border border-teal-100 bg-white p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-stone-950">{row.customer.name}</p>
                      <span className={`rounded border px-2 py-1 text-[11px] font-semibold ${row.previsitReadinessScore >= 80 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : row.previsitReadinessScore >= 55 ? "border-amber-200 bg-amber-50 text-amber-800" : "border-red-200 bg-red-50 text-red-700"}`}>
                        準備度 {row.previsitReadinessScore}%
                      </span>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-teal-900">
                      {row.upcomingAppointment ? formatDateTime(row.upcomingAppointment.scheduledAt) : "予約未設定"}
                    </p>
                    {row.previsitReadyItems.length > 0 ? (
                      <div className="mt-3 grid gap-1 text-xs leading-5 text-stone-700">
                        {row.previsitReadyItems.slice(0, 6).map((item) => (
                          <p key={item}>・{item}</p>
                        ))}
                      </div>
                    ) : null}
                    {row.previsitMissingItems.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {row.previsitMissingItems.map((item) => (
                          <span key={item} className="rounded border border-red-100 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700">
                            {item}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Link href={row.href} className="inline-flex h-9 items-center rounded-md border border-teal-200 bg-teal-50 px-3 text-xs font-semibold text-teal-900 hover:bg-teal-100">
                        ブリーフを開く
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
          <div className="mt-4 overflow-hidden rounded-md border border-stone-200">
            <table className="min-w-full divide-y divide-stone-100 text-sm">
              <thead className="bg-[#fbf8f3] text-left text-xs font-semibold text-stone-500">
                <tr>
                  <th className="px-4 py-3">提案日</th>
                  <th className="px-4 py-3">顧客</th>
                  <th className="px-4 py-3">状態</th>
                  <th className="px-4 py-3">次の会話</th>
                  <th className="px-4 py-3 text-right">詳細</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {calendarRows.map((row) => (
                  <tr key={row.customer.id} className="hover:bg-[#fbf8f3]">
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-stone-950">
                      {row.nextDate ? formatDate(row.nextDate) : "今すぐ"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-stone-700">{row.customer.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <span className={`inline-flex rounded border px-2 py-1 text-xs font-semibold ${statusClass(row.status.tone)}`}>
                          {row.status.label}
                        </span>
                        {row.upcomingAppointment ? (
                          <span className="inline-flex rounded border border-stone-200 bg-white px-2 py-1 text-xs font-semibold text-stone-700">
                            {row.upcomingAppointment.status}
                          </span>
                        ) : null}
                        {row.upcomingAppointment ? (
                          <span className={`inline-flex rounded border px-2 py-1 text-xs font-semibold ${appointmentRiskClass(row.appointmentRiskScore)}`}>
                            予約リスク {row.appointmentRiskScore}
                          </span>
                        ) : null}
                        {!row.upcomingAppointment && row.scheduledFollowUpLog?.scheduledFollowUp ? (
                          <span className="inline-flex rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
                            フォロー予定
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-stone-600">{row.status.action}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={row.href} className="text-xs font-semibold text-teal-800 hover:text-teal-950">
                        開く
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {view === "messages" ? (
        <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-stone-950">追客メッセージキュー</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            LINEやDMに貼れる文面を、顧客ごとの提案・メニュー・予約状況から作ります。
          </p>
          {newLeadRows.length > 0 ? (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-red-800">新規相談フォーム・未返信</h3>
                <span className="rounded border border-red-200 bg-white px-2 py-1 text-[11px] font-semibold text-red-700">
                  {newLeadRows.length}件
                </span>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {newLeadRows.map((row) => {
                  const lead = row.latestNewLeadLog;
                  const message = `${row.customer.name}様\nご相談内容を送っていただきありがとうございます。\n髪のお悩みとご希望を確認しました。${row.upcomingAppointment ? "\nご希望日時を仮予約候補として確認しています。" : "\nご来店しやすい候補日時をいくつかご提案します。"}\n料金・所要時間・似合わせの不安点も、施術前に分かりやすく確認します。`;

                  if (!lead) {
                    return null;
                  }

                  return (
                    <article key={lead.id} className="rounded-md border border-red-200 bg-white p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-stone-950">{row.customer.name}</p>
                        <span className={`rounded border px-2 py-1 text-[11px] font-semibold ${(row.newLeadMinutesSince ?? 0) >= 60 ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
                          未返信 {row.newLeadMinutesSince ?? 0}分
                        </span>
                        <span className={`rounded border px-2 py-1 text-[11px] font-semibold ${newLeadIntentClass(row.newLeadScore)}`}>
                          {newLeadIntentLabel(row.newLeadScore)} {row.newLeadScore}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-stone-600">
                        <span className="rounded border border-stone-200 bg-stone-50 px-2 py-1">
                          流入元: {row.newLeadSource}
                        </span>
                        {row.newLeadCampaign ? (
                          <span className="rounded border border-stone-200 bg-stone-50 px-2 py-1">
                            キャンペーン: {row.newLeadCampaign}
                          </span>
                        ) : null}
                        {row.isReferralLead ? (
                          <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-900">
                            紹介: {row.referralName ?? row.referralCode ?? "未記録"}
                          </span>
                        ) : null}
                        {row.hasIntakePhotoConsent && row.intakePhotoCount > 0 ? (
                          <span className="rounded border border-teal-200 bg-teal-50 px-2 py-1 text-teal-900">
                            事前写真: {row.intakePhotoCount}枚
                          </span>
                        ) : null}
                        {row.addOnInterests.length > 0 ? (
                          <span className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-amber-900">
                            追加相談: {row.addOnInterests.join(" / ")}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 line-clamp-5 whitespace-pre-wrap text-xs leading-5 text-stone-700">{lead.message}</p>
                      <div className="mt-3 rounded-md border border-red-100 bg-red-50 p-3">
                        <p className="text-[11px] font-semibold text-red-700">初回返信文面</p>
                        <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-stone-700">{message}</p>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <CopyTextButton text={message} label="文面コピー" />
                        <form action={createContactLog.bind(null, row.customer.id)}>
                          <input type="hidden" name="channel" value="LINE" />
                          <input type="hidden" name="purpose" value="新規リード初回返信" />
                          <input type="hidden" name="message" value={message} />
                          <input type="hidden" name="outcome" value="新規リード返信済み" />
                          <input type="hidden" name="nextAction" value="返信後に予約枠確定、または追加相談を確認する" />
                          <button
                            type="submit"
                            className="inline-flex h-9 items-center rounded-md border border-teal-200 bg-white px-3 text-xs font-semibold text-teal-900 hover:bg-teal-50"
                          >
                            初回返信済み
                          </button>
                        </form>
                        <Link href={row.href} className="inline-flex h-9 items-center rounded-md border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-800 hover:bg-red-100">
                          詳細を開く
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : null}
          {referralThankYouRows.length > 0 ? (
            <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-emerald-950">紹介者お礼・紹介URL再案内</h3>
                <span className="rounded border border-emerald-200 bg-white px-2 py-1 text-[11px] font-semibold text-emerald-800">
                  {referralThankYouRows.length}件
                </span>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {referralThankYouRows.map((log) => {
                  const referralUrl = intakeReferralUrl(log.customer);
                  const message = referralThankYouMessage({
                    customerName: log.customer.name,
                    referralMessage: log.message,
                    referralUrl
                  });
                  const referredName = proposalMessageLine(log.message, "紹介相談");
                  const referredPhone = proposalMessageLine(log.message, "紹介先連絡先");

                  return (
                    <article key={log.id} className="rounded-md border border-emerald-200 bg-white p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-stone-950">{log.customer.name}</p>
                        <span className="rounded border border-emerald-100 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800">
                          {formatDate(log.createdAt)}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {referredName ? (
                          <span className="rounded border border-emerald-100 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800">
                            紹介先: {referredName}
                          </span>
                        ) : null}
                        {referredPhone ? (
                          <span className="rounded border border-stone-200 bg-stone-50 px-2 py-1 text-[11px] font-semibold text-stone-700">
                            連絡先あり
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-xs leading-5 text-stone-700">{log.message}</p>
                      <div className="mt-3 rounded-md border border-emerald-100 bg-emerald-50 p-3">
                        <p className="text-[11px] font-semibold text-emerald-800">お礼文面</p>
                        <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-stone-700">{message}</p>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <CopyTextButton text={message} label="文面コピー" />
                        <CopyTextButton text={referralUrl} label="紹介URLコピー" />
                        <form action={createContactLog.bind(null, log.customerId)}>
                          <input type="hidden" name="channel" value="LINE" />
                          <input type="hidden" name="purpose" value="紹介お礼" />
                          <input type="hidden" name="message" value={message} />
                          <input type="hidden" name="outcome" value="紹介お礼送信" />
                          <input type="hidden" name="nextAction" value="紹介先の予約化状況を確認し、必要なら紹介者へ経過を伝える" />
                          <button
                            type="submit"
                            className="inline-flex h-9 items-center rounded-md border border-teal-200 bg-white px-3 text-xs font-semibold text-teal-900 hover:bg-teal-50"
                          >
                            お礼送信済み
                          </button>
                        </form>
                        <Link href={`/customers/${log.customerId}`} className="inline-flex h-9 items-center rounded-md border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-900 hover:bg-emerald-100">
                          詳細を開く
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : null}
          {referralAchievementRows.length > 0 ? (
            <div className="mt-4 rounded-md border border-teal-200 bg-teal-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-teal-950">紹介成果お礼・紹介者フォロー</h3>
                <span className="rounded border border-teal-200 bg-white px-2 py-1 text-[11px] font-semibold text-teal-800">
                  {referralAchievementRows.length}件
                </span>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {referralAchievementRows.map((row) => {
                  const referralUrl = intakeReferralUrl(row.log.customer);
                  const message = referralAchievementMessage({
                    customerName: row.log.customer.name,
                    referredName: row.referredRow?.customer.name ?? row.referredName,
                    saleTitle: row.latestReferredSale?.title,
                    saleAmount: row.referredRevenue,
                    referralUrl
                  });

                  return (
                    <article key={`${row.log.id}-achievement`} className="rounded-md border border-teal-200 bg-white p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-stone-950">{row.log.customer.name}</p>
                        <span className="rounded border border-teal-100 bg-teal-50 px-2 py-1 text-[11px] font-semibold text-teal-800">
                          紹介売上 {row.referredRevenue.toLocaleString("ja-JP")}円
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <span className="rounded border border-teal-100 bg-teal-50 px-2 py-1 text-[11px] font-semibold text-teal-800">
                          紹介先: {row.referredRow?.customer.name ?? row.referredName}
                        </span>
                        {row.latestReferredSale ? (
                          <span className="rounded border border-stone-200 bg-stone-50 px-2 py-1 text-[11px] font-semibold text-stone-700">
                            {formatDate(row.latestReferredSale.paidAt)} / {row.latestReferredSale.title}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-3 rounded-md border border-teal-100 bg-teal-50 p-3">
                        <p className="text-[11px] font-semibold text-teal-800">成果お礼文面</p>
                        <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-stone-700">{message}</p>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <CopyTextButton text={message} label="文面コピー" />
                        <CopyTextButton text={referralUrl} label="紹介URLコピー" />
                        <form action={createContactLog.bind(null, row.log.customerId)}>
                          <input type="hidden" name="channel" value="LINE" />
                          <input type="hidden" name="purpose" value="紹介成果お礼" />
                          <input type="hidden" name="message" value={message} />
                          <input type="hidden" name="outcome" value="紹介成果お礼送信" />
                          <input type="hidden" name="nextAction" value="紹介者との関係を温め、次の紹介や来店時の会話につなげる" />
                          <button
                            type="submit"
                            className="inline-flex h-9 items-center rounded-md border border-teal-200 bg-white px-3 text-xs font-semibold text-teal-900 hover:bg-teal-50"
                          >
                            成果お礼送信済み
                          </button>
                        </form>
                        <Link href={`/customers/${row.log.customerId}`} className="inline-flex h-9 items-center rounded-md border border-teal-200 bg-teal-50 px-3 text-xs font-semibold text-teal-900 hover:bg-teal-100">
                          紹介者を開く
                        </Link>
                        {row.referredRow ? (
                          <Link href={row.referredRow.href} className="inline-flex h-9 items-center rounded-md border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 hover:bg-stone-50">
                            紹介先を開く
                          </Link>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : null}
          {waitlistRows.length > 0 ? (
            <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-emerald-950">空き枠通知候補</h3>
                <span className="rounded border border-emerald-200 bg-white px-2 py-1 text-[11px] font-semibold text-emerald-800">
                  {waitlistRows.length}件
                </span>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {waitlistRows.map((row) => {
                  const mainConcern = proposalMessageLine(row.latestNewLeadLog?.message, "一番の悩み");
                  const message = waitlistOfferMessage({
                    customerName: row.customer.name,
                    preferredTimeWindow: row.preferredTimeWindow,
                    mainConcern,
                    styleName: row.proposalSuggestion?.suggestedStyleName,
                    courseTitle: row.topOpenCourse?.title
                  });

                  return (
                    <article key={row.customer.id} className="rounded-md border border-emerald-200 bg-white p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-stone-950">{row.customer.name}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded border px-2 py-1 text-[11px] font-semibold ${newLeadIntentClass(row.newLeadScore)}`}>
                            {newLeadIntentLabel(row.newLeadScore)} {row.newLeadScore}
                          </span>
                          {row.preferredTimeWindow ? (
                            <span className="rounded border border-emerald-100 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800">
                              {row.preferredTimeWindow}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      {mainConcern || row.waitlistPreference ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {row.waitlistPreference ? (
                            <span className="rounded border border-emerald-100 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800">
                              空き枠通知: {row.waitlistPreference}
                            </span>
                          ) : null}
                          {mainConcern ? (
                            <span className="rounded border border-stone-200 bg-stone-50 px-2 py-1 text-[11px] font-semibold text-stone-700">
                              {mainConcern}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                      <p className="mt-3 whitespace-pre-wrap text-xs leading-5 text-stone-700">{message}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <CopyTextButton text={message} label="文面コピー" />
                        <form action={createContactLog.bind(null, row.customer.id)}>
                          <input type="hidden" name="channel" value="LINE" />
                          <input type="hidden" name="purpose" value="空き枠通知" />
                          <input type="hidden" name="message" value={message} />
                          <input type="hidden" name="outcome" value="空き枠通知送信" />
                          <input type="hidden" name="nextAction" value="返信があれば予約枠を確保し、メニューと所要時間を確認する" />
                          <button
                            type="submit"
                            className="inline-flex h-9 items-center rounded-md border border-teal-200 bg-white px-3 text-xs font-semibold text-teal-900 hover:bg-teal-50"
                          >
                            通知送信済み
                          </button>
                        </form>
                        <Link href={row.href} className="inline-flex h-9 items-center rounded-md border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-900 hover:bg-emerald-100">
                          詳細を開く
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : null}
          {lostAppointmentRecoveryRows.length > 0 ? (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-red-800">キャンセル・無断キャンセル後の再予約回収</h3>
                <span className="rounded border border-red-200 bg-white px-2 py-1 text-[11px] font-semibold text-red-700">
                  {lostAppointmentRecoveryRows.length}件 / {lostAppointmentRecoveryValue.toLocaleString("ja-JP")}円
                </span>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {lostAppointmentRecoveryRows.map((row) => {
                  const lostAppointment = row.latestLostAppointment;
                  const message = cancellationRecoveryMessage({
                    customerName: row.customer.name,
                    appointmentStatus: lostAppointment?.status,
                    appointmentDate: lostAppointment?.scheduledAt,
                    appointmentMenu: lostAppointment?.menu,
                    estimatedPrice: lostAppointment?.estimatedPrice,
                    proposalName: row.proposalSuggestion?.suggestedStyleName,
                    preferredTimeWindow: row.preferredTimeWindow
                  });

                  if (!lostAppointment) {
                    return null;
                  }

                  return (
                    <article key={lostAppointment.id} className="rounded-md border border-red-200 bg-white p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-stone-950">{row.customer.name}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded border border-red-100 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700">
                            {lostAppointment.status}
                          </span>
                          <span className="rounded border border-stone-200 bg-stone-50 px-2 py-1 text-[11px] font-semibold text-stone-700">
                            {row.latestLostAppointmentDays ?? 0}日前
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 grid gap-1 text-xs leading-5 text-stone-700">
                        <p>予約候補: {formatDateTime(lostAppointment.scheduledAt)}</p>
                        <p>メニュー: {lostAppointment.menu ?? "当日相談"}</p>
                        <p className="font-semibold text-red-700">
                          回収見込み: {row.lostAppointmentRecoveryValue.toLocaleString("ja-JP")}円
                        </p>
                      </div>
                      <div className="mt-3 rounded-md border border-red-100 bg-red-50 p-3">
                        <p className="text-[11px] font-semibold text-red-700">再予約フォロー文面</p>
                        <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-stone-700">{message}</p>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <CopyTextButton text={message} label="文面コピー" />
                        <form action={createContactLog.bind(null, row.customer.id)}>
                          <input type="hidden" name="channel" value="LINE" />
                          <input
                            type="hidden"
                            name="purpose"
                            value={lostAppointment.status === "無断キャンセル" ? "無断キャンセル後フォロー" : "予約キャンセル後フォロー"}
                          />
                          <input type="hidden" name="message" value={message} />
                          <input
                            type="hidden"
                            name="outcome"
                            value={lostAppointment.status === "無断キャンセル" ? "無断キャンセル後フォロー送信" : "キャンセル後フォロー送信"}
                          />
                          <input type="hidden" name="nextAction" value="返信があれば候補日を確認し、再予約または相談へ進める" />
                          <button
                            type="submit"
                            className="inline-flex h-9 items-center rounded-md border border-teal-200 bg-white px-3 text-xs font-semibold text-teal-900 hover:bg-teal-50"
                          >
                            フォロー送信済み
                          </button>
                        </form>
                        <Link href={row.href} className="inline-flex h-9 items-center rounded-md border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-800 hover:bg-red-100">
                          詳細を開く
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : null}
          {vipReactivationRows.length > 0 ? (
            <div className="mt-4 rounded-md border border-fuchsia-200 bg-fuchsia-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-fuchsia-950">VIP・優良顧客復帰提案</h3>
                <span className="rounded border border-fuchsia-200 bg-white px-2 py-1 text-[11px] font-semibold text-fuchsia-900">
                  {vipReactivationRows.length}件 / {vipReactivationValue.toLocaleString("ja-JP")}円
                </span>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {vipReactivationRows.map((row) => {
                  const message = vipReactivationMessage({
                    customerName: row.customer.name,
                    totalRevenue: row.totalCustomerRevenue,
                    latestVisitDays: row.latestVisitDays,
                    saleTitle: row.latestSale?.title,
                    proposalName: row.proposalSuggestion?.suggestedStyleName,
                    courseTitle: row.topOpenCourse?.title,
                    nextVisitDate: row.suggestedNextVisitDate,
                    careUrl: row.carePlanUrl
                  });

                  return (
                    <article key={row.customer.id} className="rounded-md border border-fuchsia-200 bg-white p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-stone-950">{row.customer.name}</p>
                        <span className="rounded border border-fuchsia-100 bg-fuchsia-50 px-2 py-1 text-[11px] font-semibold text-fuchsia-900">
                          累計 {row.totalCustomerRevenue.toLocaleString("ja-JP")}円
                        </span>
                      </div>
                      <div className="mt-2 grid gap-1 text-xs leading-5 text-stone-700">
                        <p>最終来店: {row.latestVisitDays === null ? "未記録" : `${row.latestVisitDays}日前`}</p>
                        <p>前回会計: {row.latestSale ? `${row.latestSale.title} / ${row.latestSale.amount.toLocaleString("ja-JP")}円` : "未記録"}</p>
                        <p>次回目安: {formatDate(row.suggestedNextVisitDate)}</p>
                      </div>
                      <div className="mt-3 rounded-md border border-fuchsia-100 bg-fuchsia-50 p-3">
                        <p className="text-[11px] font-semibold text-fuchsia-900">VIP復帰文面</p>
                        <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-stone-700">{message}</p>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <CopyTextButton text={message} label="文面コピー" />
                        <CopyTextButton text={row.carePlanUrl} label="ケアメモURL" />
                        <form action={createContactLog.bind(null, row.customer.id)}>
                          <input type="hidden" name="channel" value="LINE" />
                          <input type="hidden" name="purpose" value="VIP復帰提案" />
                          <input type="hidden" name="message" value={message} />
                          <input type="hidden" name="outcome" value="VIP復帰提案送信" />
                          <input type="hidden" name="scheduledFollowUp" value={row.suggestedNextVisitDate?.toISOString() ?? ""} />
                          <input type="hidden" name="nextAction" value="返信があれば候補日を確認し、優良顧客の次回予約または相談へつなげる" />
                          <button
                            type="submit"
                            className="inline-flex h-9 items-center rounded-md border border-teal-200 bg-white px-3 text-xs font-semibold text-teal-900 hover:bg-teal-50"
                          >
                            復帰提案送信済み
                          </button>
                        </form>
                        <Link href={row.href} className="inline-flex h-9 items-center rounded-md border border-fuchsia-200 bg-fuchsia-50 px-3 text-xs font-semibold text-fuchsia-900 hover:bg-fuchsia-100">
                          詳細を開く
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : null}
          {courseProposalRows.length > 0 ? (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-amber-950">追加メニュー・単価アップ提案</h3>
                <span className="rounded border border-amber-200 bg-white px-2 py-1 text-[11px] font-semibold text-amber-800">
                  {courseProposalRows.length}件 / {courseProposalValue.toLocaleString("ja-JP")}円
                </span>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {courseProposalRows.map((row) => {
                  const course = row.topOpenCourse;

                  if (!course) {
                    return null;
                  }

                  const message = courseProposalMessage({
                    customerName: row.customer.name,
                    courseTitle: course.title,
                    courseReason: course.reason,
                    courseCaution: course.caution,
                    estimatedPrice: course.estimatedPrice,
                    estimatedMinutes: course.estimatedMinutes,
                    proposalName: row.proposalSuggestion?.suggestedStyleName,
                    upcomingAppointmentDate: row.upcomingAppointment?.scheduledAt,
                    shareUrl: row.proposalShareUrl
                  });

                  return (
                    <article key={course.id} className="rounded-md border border-amber-200 bg-white p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-stone-950">{row.customer.name}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          {course.priority ? (
                            <span className="rounded border border-amber-100 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">
                              {course.priority}
                            </span>
                          ) : null}
                          <span className="rounded border border-stone-200 bg-stone-50 px-2 py-1 text-[11px] font-semibold text-stone-700">
                            {course.estimatedPrice ? `${course.estimatedPrice.toLocaleString("ja-JP")}円` : "料金相談"}
                          </span>
                        </div>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-stone-950">{course.title}</p>
                      <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs leading-5 text-stone-700">{course.reason}</p>
                      {row.upcomingAppointment ? (
                        <p className="mt-2 text-xs font-semibold text-amber-900">
                          予約候補: {formatDateTime(row.upcomingAppointment.scheduledAt)}
                        </p>
                      ) : null}
                      <div className="mt-3 rounded-md border border-amber-100 bg-amber-50 p-3">
                        <p className="text-[11px] font-semibold text-amber-800">追加提案文面</p>
                        <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-stone-700">{message}</p>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <CopyTextButton text={message} label="文面コピー" />
                        <form action={createContactLog.bind(null, row.customer.id)}>
                          <input type="hidden" name="channel" value="LINE" />
                          <input type="hidden" name="purpose" value="追加メニュー提案" />
                          <input type="hidden" name="message" value={message} />
                          <input type="hidden" name="outcome" value="単価アップ提案送信" />
                          <input type="hidden" name="nextAction" value="返信があれば料金・所要時間を確認し、予約または会計へ反映する" />
                          <button
                            type="submit"
                            className="inline-flex h-9 items-center rounded-md border border-teal-200 bg-white px-3 text-xs font-semibold text-teal-900 hover:bg-teal-50"
                          >
                            提案送信済み
                          </button>
                        </form>
                        <Link href={row.href} className="inline-flex h-9 items-center rounded-md border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-900 hover:bg-amber-100">
                          詳細を開く
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : null}
          {feedbackHomeCareRows.length > 0 ? (
            <div className="mt-4 rounded-md border border-indigo-200 bg-indigo-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-indigo-950">来店後ホームケア相談</h3>
                <span className="rounded border border-indigo-200 bg-white px-2 py-1 text-[11px] font-semibold text-indigo-900">
                  {feedbackHomeCareRows.length}件 / {feedbackHomeCareValue.toLocaleString("ja-JP")}円
                </span>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {feedbackHomeCareRows.map((row) => {
                  const feedback = row.latestFeedbackLog;
                  const message = [
                    `${row.customer.name}様`,
                    "仕上がり後のご回答ありがとうございます。",
                    row.latestFeedbackHomeStyling ? `家での扱いやすさ: ${row.latestFeedbackHomeStyling}` : null,
                    row.latestFeedbackHomeCareInterest ? `ホームケア相談: ${row.latestFeedbackHomeCareInterest}` : null,
                    row.latestFeedbackRebookReason ? `次回の目安: ${row.latestFeedbackRebookReason}` : null,
                    row.latestSale ? `前回メニュー: ${row.latestSale.title}` : null,
                    "必要なものだけで大丈夫です。乾かし方、スタイリング剤、シャンプー/トリートメントの相性を、髪の状態に合わせてご案内します。",
                    "気になる点があれば、そのまま返信ください。"
                  ]
                    .filter((line): line is string => Boolean(line))
                    .join("\n");

                  if (!feedback) {
                    return null;
                  }

                  return (
                    <article key={feedback.id} className="rounded-md border border-indigo-200 bg-white p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-stone-950">{row.customer.name}</p>
                        <span className="rounded border border-indigo-100 bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-800">
                          評価 {row.latestFeedbackRating ?? "-"} / 5
                        </span>
                      </div>
                      <div className="mt-2 grid gap-1 text-xs leading-5 text-stone-700">
                        {row.latestFeedbackHomeStyling ? <p>家での扱いやすさ: {row.latestFeedbackHomeStyling}</p> : null}
                        {row.latestFeedbackHomeCareInterest ? <p>ホームケア相談: {row.latestFeedbackHomeCareInterest}</p> : null}
                        {row.latestFeedbackRebookReason ? <p>次回理由: {row.latestFeedbackRebookReason}</p> : null}
                      </div>
                      <div className="mt-3 rounded-md border border-indigo-100 bg-indigo-50 p-3">
                        <p className="text-[11px] font-semibold text-indigo-900">ホームケア返信文面</p>
                        <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-stone-700">{message}</p>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <CopyTextButton text={message} label="文面コピー" />
                        <form action={createContactLog.bind(null, row.customer.id)}>
                          <input type="hidden" name="channel" value="LINE" />
                          <input type="hidden" name="purpose" value="来店後ホームケア提案" />
                          <input type="hidden" name="message" value={message} />
                          <input type="hidden" name="outcome" value="ホームケア提案送信" />
                          <input type="hidden" name="nextAction" value="返信があれば髪の状態・予算・使い方を確認し、店販または次回予約へつなげる" />
                          <button
                            type="submit"
                            className="inline-flex h-9 items-center rounded-md border border-teal-200 bg-white px-3 text-xs font-semibold text-teal-900 hover:bg-teal-50"
                          >
                            提案送信済み
                          </button>
                        </form>
                        <Link href={row.href} className="inline-flex h-9 items-center rounded-md border border-indigo-200 bg-indigo-50 px-3 text-xs font-semibold text-indigo-900 hover:bg-indigo-100">
                          詳細を開く
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : null}
          {feedbackRecoveryRows.length > 0 ? (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-red-800">手直し・不満フォロー</h3>
                <span className="rounded border border-red-200 bg-white px-2 py-1 text-[11px] font-semibold text-red-700">
                  {feedbackRecoveryRows.length}件
                </span>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {feedbackRecoveryRows.map((row) => {
                  const feedback = row.latestFeedbackLog;
                  const message = `${row.customer.name}様\n仕上がりのご回答ありがとうございます。\n気になる点を確認して、必要であれば手直しや扱い方をすぐご案内します。\nお困りの点をそのまま教えてください。`;

                  if (!feedback) {
                    return null;
                  }

                  return (
                    <article key={feedback.id} className="rounded-md border border-red-200 bg-white p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-stone-950">{row.customer.name}</p>
                        <span className="rounded border border-red-100 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700">
                          評価 {row.latestFeedbackRating ?? "-"} / 5
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-xs leading-5 text-stone-700">{feedback.message}</p>
                      <div className="mt-3 rounded-md border border-red-100 bg-red-50 p-3">
                        <p className="text-[11px] font-semibold text-red-700">返信文面</p>
                        <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-stone-700">{message}</p>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <CopyTextButton text={message} label="文面コピー" />
                        <form action={createContactLog.bind(null, row.customer.id)}>
                          <input type="hidden" name="channel" value="LINE" />
                          <input type="hidden" name="purpose" value="来店後フォロー" />
                          <input type="hidden" name="message" value={message} />
                          <input type="hidden" name="outcome" value="手直しフォロー送信" />
                          <input type="hidden" name="nextAction" value="返信内容を確認し、必要なら手直し枠または扱い方案内を設定する" />
                          <button
                            type="submit"
                            className="inline-flex h-9 items-center rounded-md border border-teal-200 bg-white px-3 text-xs font-semibold text-teal-900 hover:bg-teal-50"
                          >
                            フォロー送信済み
                          </button>
                        </form>
                        <Link href={row.href} className="inline-flex h-9 items-center rounded-md border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-800 hover:bg-red-100">
                          詳細を開く
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : null}
          {feedbackReviewCandidateRows.length > 0 ? (
            <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-emerald-950">口コミ候補・次回予約候補</h3>
                <span className="rounded border border-emerald-200 bg-white px-2 py-1 text-[11px] font-semibold text-emerald-800">
                  {feedbackReviewCandidateRows.length}件
                </span>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {feedbackReviewCandidateRows.map((row) => {
                  const feedback = row.latestFeedbackLog;
                  const referralUrl = intakeReferralUrl(row.customer);
                  const message = [
                    `${row.customer.name}様`,
                    "仕上がりのご感想ありがとうございます。",
                    googleReviewUrl
                      ? `よろしければ口コミ投稿にもご協力いただけると励みになります。\n${googleReviewUrl}`
                      : "よろしければ口コミ投稿にもご協力いただけると励みになります。",
                    "周りで髪型に悩んでいる方がいれば、こちらの相談フォームもご案内ください。",
                    referralUrl,
                    "次回の目安や気になる点も、いつでもご相談ください。"
                  ].join("\n");

                  if (!feedback) {
                    return null;
                  }

                  return (
                    <article key={feedback.id} className="rounded-md border border-emerald-200 bg-white p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-stone-950">{row.customer.name}</p>
                        <span className="rounded border border-emerald-100 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800">
                          評価 {row.latestFeedbackRating ?? "-"} / 5
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-xs leading-5 text-stone-700">{feedback.message}</p>
                      <div className="mt-3 rounded-md border border-emerald-100 bg-emerald-50 p-3">
                        <p className="text-[11px] font-semibold text-emerald-800">返信文面</p>
                        <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-stone-700">{message}</p>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <CopyTextButton text={message} label="文面コピー" />
                        <form action={createContactLog.bind(null, row.customer.id)}>
                          <input type="hidden" name="channel" value="LINE" />
                          <input type="hidden" name="purpose" value="口コミ依頼" />
                          <input type="hidden" name="message" value={message} />
                          <input type="hidden" name="outcome" value="口コミ依頼送信" />
                          <input type="hidden" name="nextAction" value="口コミ投稿や返信を確認し、次回予約のきっかけを作る" />
                          <button
                            type="submit"
                            className="inline-flex h-9 items-center rounded-md border border-teal-200 bg-white px-3 text-xs font-semibold text-teal-900 hover:bg-teal-50"
                          >
                            口コミ依頼送信済み
                          </button>
                        </form>
                        <Link href={row.href} className="inline-flex h-9 items-center rounded-md border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-900 hover:bg-emerald-100">
                          詳細を開く
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : null}
          {scheduledFollowUpRows.length > 0 ? (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-amber-950">予定フォロー・返信待ち確認</h3>
                <span className="rounded border border-amber-200 bg-white px-2 py-1 text-[11px] font-semibold text-amber-800">
                  {scheduledFollowUpRows.length}件
                </span>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {scheduledFollowUpRows.map((row) => {
                  const followUp = row.scheduledFollowUpLog;

                  if (!followUp?.scheduledFollowUp) {
                    return null;
                  }

                  return (
                    <Link key={followUp.id} href={row.href} className="rounded-md border border-amber-200 bg-white p-3 hover:border-amber-300">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-stone-950">{row.customer.name}</p>
                        <span className="text-xs font-semibold text-amber-800">{formatDateTime(followUp.scheduledFollowUp)}</span>
                      </div>
                      <p className="mt-2 text-xs font-semibold text-stone-600">
                        {followUp.purpose ?? followUp.outcome ?? "次回フォロー"}
                      </p>
                      <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs leading-5 text-stone-700">{followUp.nextAction ?? followUp.message}</p>
                      {followUp.nextAction && followUp.message ? (
                        <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-[11px] leading-5 text-stone-500">
                          前回内容: {followUp.message}
                        </p>
                      ) : null}
                      <p className="mt-3 text-[11px] font-semibold text-amber-800">
                        顧客詳細で追客ログを残すと、次の予定を更新できます。
                      </p>
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null}
          {openProposalResponseRows.length > 0 ? (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-red-800">提案ページ返信・未対応</h3>
                <span className="rounded border border-red-200 bg-white px-2 py-1 text-[11px] font-semibold text-red-700">
                  {openProposalResponseRows.length}件
                </span>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {openProposalResponseRows.map((row) => {
                  const response = row.openProposalResponse;

                  if (!response) {
                    return null;
                  }

                  const concerns = proposalMessageList(response.message, "相談したい不安");
                  const contactPreference = proposalMessageLine(response.message, "希望連絡方法");
                  const stylePriority = proposalMessageLine(response.message, "当日の優先順位");
                  const budgetPreference = proposalMessageLine(response.message, "予算感");
                  const pricePlan = proposalMessageLine(response.message, "選んだ料金プラン");
                  const visitTiming = proposalMessageLine(response.message, "来店希望時期");
                  const finishBy = proposalMessageLine(response.message, "終了希望");
                  const decisionBlocker = proposalMessageLine(response.message, "予約を迷う理由");
                  const alternativeDate1 = proposalMessageLine(response.message, "第2希望日時");
                  const alternativeDate2 = proposalMessageLine(response.message, "第3希望日時");
                  const urgencyPreference = proposalMessageLine(response.message, "空き枠希望");
                  const packageInterest = proposalMessageLine(response.message, "継続プラン相談");
                  const selectedCourses = proposalMessageList(response.message, "相談したい追加メニュー");
                  const freeMemo = proposalFreeMemo(response.message);
                  const responseValue = row.responseOpportunityValue || row.openCourseValue || row.opportunityValue;
                  const replyMessage = buildProposalResponseReplyMessage({
                    customerName: row.customer.name,
                    styleName: response.suggestion.suggestedStyleName,
                    intent: response.intent,
                    preferredDate: response.preferredDate,
                    concerns,
                    selectedCourses,
                    stylePriority,
                    budgetPreference,
                    pricePlan,
                    visitTiming,
                    finishBy,
                    decisionBlocker,
                    alternativeDate1,
                    alternativeDate2,
                    urgencyPreference,
                    packageInterest,
                    freeMemo
                  });

                  return (
                    <article
                      key={response.id}
                      className="rounded-md border border-red-200 bg-white p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-stone-950">{row.customer.name}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          {responseValue > 0 ? (
                            <span className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-900">
                              {responseValue.toLocaleString("ja-JP")}円候補
                            </span>
                          ) : null}
                          <span className="rounded border border-red-100 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700">
                            {response.status}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-1 text-xs leading-5 text-stone-700">
                        <p className="font-semibold text-red-800">{response.intent}</p>
                        <p>提案: {response.suggestion.suggestedStyleName}</p>
                        {response.suggestion.menuSuggestion ? <p>メニュー: {response.suggestion.menuSuggestion}</p> : null}
                        {response.preferredDate ? <p>希望日時: {formatDateTime(response.preferredDate)}</p> : null}
                        {alternativeDate1 ? <p>第2希望: {alternativeDate1}</p> : null}
                        {alternativeDate2 ? <p>第3希望: {alternativeDate2}</p> : null}
                        {urgencyPreference ? <p>空き枠希望: {urgencyPreference}</p> : null}
                        {contactPreference ? <p>希望連絡方法: {contactPreference}</p> : null}
                        {stylePriority ? <p>当日の優先順位: {stylePriority}</p> : null}
                        {budgetPreference ? <p>予算感: {budgetPreference}</p> : null}
                        {pricePlan ? <p>料金プラン: {pricePlan}</p> : null}
                        {visitTiming ? <p>来店希望時期: {visitTiming}</p> : null}
                        {finishBy ? <p>終了希望: {finishBy}</p> : null}
                        {decisionBlocker ? <p>予約を迷う理由: {decisionBlocker}</p> : null}
                        {packageInterest ? <p>継続プラン相談: {packageInterest}</p> : null}
                        {concerns.length > 0 ? (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {concerns.map((concern) => (
                              <span key={concern} className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-900">
                                {concern}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {selectedCourses.length > 0 ? <p className="line-clamp-2">追加相談: {selectedCourses.join(" / ")}</p> : null}
                        {freeMemo ? <p className="line-clamp-2">メモ: {freeMemo}</p> : null}
                      </div>
                      <div className="mt-3 rounded-md border border-red-100 bg-red-50 p-3">
                        <p className="text-[11px] font-semibold text-red-700">返信文面プレビュー</p>
                        <p className="mt-2 line-clamp-5 whitespace-pre-wrap text-xs leading-5 text-stone-700">{replyMessage}</p>
                      </div>
                      <p className="mt-3 text-[11px] font-semibold text-red-700">
                        顧客詳細で返信・予約枠確認後、「対応済み」にしてください。
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <CopyTextButton text={replyMessage} label="返信文面コピー" />
                        <form action={markProposalResponseHandledWithContactLog.bind(null, response.id, row.customer.id)}>
                          <input type="hidden" name="channel" value={contactPreference?.includes("電話") ? "電話" : contactPreference?.includes("SMS") ? "SMS" : "LINE"} />
                          <input type="hidden" name="message" value={replyMessage} />
                          <input type="hidden" name="nextAction" value="返信後の反応を確認し、予約または相談へ進める" />
                          <button
                            type="submit"
                            className="inline-flex h-9 items-center rounded-md border border-teal-200 bg-white px-3 text-xs font-semibold text-teal-900 hover:bg-teal-50"
                          >
                            送信済みにする
                          </button>
                        </form>
                        <Link
                          href={`/customers/${row.customer.id}?suggestionId=${response.suggestion.id}`}
                          className="inline-flex h-9 items-center rounded-md border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-800 hover:bg-red-100"
                        >
                          詳細を開く
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : null}
          {urgentAppointmentRows.length > 0 ? (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-red-800">直前確認・来店前リマインド</h3>
                <span className="rounded border border-red-200 bg-white px-2 py-1 text-[11px] font-semibold text-red-700">
                  {urgentAppointmentRows.length}件
                </span>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {urgentAppointmentRows.map((row) => {
                  const message = appointmentConfirmationMessage({
                    customerName: row.customer.name,
                    appointmentDate: row.upcomingAppointment?.scheduledAt,
                    appointmentMenu: row.upcomingAppointment?.menu,
                    confirmationUrl: row.appointmentConfirmationUrl,
                    readyItems: row.previsitReadyItems,
                    missingItems: row.previsitMissingItems,
                    riskReasons: row.appointmentRiskReasons,
                    rescheduleContactPreference: row.rescheduleContactPreference,
                    hasCancellationPolicyConsent: row.hasCancellationPolicyConsent,
                    urgent: true
                  });

                  return (
                    <article key={row.customer.id} className="rounded-md border border-red-200 bg-white p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-stone-950">{row.customer.name}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded border px-2 py-1 text-[11px] font-semibold ${appointmentRiskClass(row.appointmentRiskScore)}`}>
                            {row.appointmentRiskLabel} {row.appointmentRiskScore}
                          </span>
                          <span className="text-xs font-semibold text-red-700">
                            あと{row.upcomingAppointmentHours}時間
                          </span>
                        </div>
                      </div>
                      {row.appointmentRiskReasons.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {row.appointmentRiskReasons.map((reason) => (
                            <span key={reason} className="rounded border border-red-100 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700">
                              {reason}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <p className="mt-3 whitespace-pre-wrap text-xs leading-5 text-stone-700">{message}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <CopyTextButton text={message} label="文面コピー" />
                        <form action={createContactLog.bind(null, row.customer.id)}>
                          <input type="hidden" name="channel" value="LINE" />
                          <input type="hidden" name="purpose" value="予約直前確認" />
                          <input type="hidden" name="message" value={message} />
                          <input type="hidden" name="outcome" value="予約確認送信" />
                          <input type="hidden" name="nextAction" value="来店可否と遅れの有無を確認し、必要なら予約枠を調整する" />
                          <button
                            type="submit"
                            className="inline-flex h-9 items-center rounded-md border border-teal-200 bg-white px-3 text-xs font-semibold text-teal-900 hover:bg-teal-50"
                          >
                            確認送信済み
                          </button>
                        </form>
                        <Link href={row.href} className="inline-flex h-9 items-center rounded-md border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-800 hover:bg-red-100">
                          詳細を開く
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : null}
          {appointmentConfirmationRows.length > 0 ? (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-amber-950">予約確認・前日リマインド</h3>
                <span className="rounded border border-amber-200 bg-white px-2 py-1 text-[11px] font-semibold text-amber-800">
                  {appointmentReminderRows.length}件
                </span>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {appointmentReminderRows.map((row) => {
                  const message = appointmentConfirmationMessage({
                    customerName: row.customer.name,
                    appointmentDate: row.upcomingAppointment?.scheduledAt,
                    appointmentMenu: row.upcomingAppointment?.menu,
                    confirmationUrl: row.appointmentConfirmationUrl,
                    readyItems: row.previsitReadyItems,
                    missingItems: row.previsitMissingItems,
                    riskReasons: row.appointmentRiskReasons,
                    rescheduleContactPreference: row.rescheduleContactPreference,
                    hasCancellationPolicyConsent: row.hasCancellationPolicyConsent
                  });

                  return (
                    <article key={row.customer.id} className="rounded-md border border-amber-200 bg-white p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-stone-950">{row.customer.name}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded border px-2 py-1 text-[11px] font-semibold ${appointmentRiskClass(row.appointmentRiskScore)}`}>
                            {row.appointmentRiskLabel} {row.appointmentRiskScore}
                          </span>
                          <span className="text-xs font-semibold text-amber-800">
                            あと{row.upcomingAppointmentHours}時間
                          </span>
                        </div>
                      </div>
                      {row.appointmentRiskReasons.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {row.appointmentRiskReasons.map((reason) => (
                            <span key={reason} className="rounded border border-amber-100 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">
                              {reason}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <p className="mt-3 whitespace-pre-wrap text-xs leading-5 text-stone-700">{message}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <CopyTextButton text={message} label="文面コピー" />
                        <form action={createContactLog.bind(null, row.customer.id)}>
                          <input type="hidden" name="channel" value="LINE" />
                          <input type="hidden" name="purpose" value="予約確認" />
                          <input type="hidden" name="message" value={message} />
                          <input type="hidden" name="outcome" value="予約確認送信" />
                          <input type="hidden" name="nextAction" value="変更有無を確認し、来店前ブリーフを準備する" />
                          <button
                            type="submit"
                            className="inline-flex h-9 items-center rounded-md border border-teal-200 bg-white px-3 text-xs font-semibold text-teal-900 hover:bg-teal-50"
                          >
                            確認送信済み
                          </button>
                        </form>
                        <Link href={row.href} className="inline-flex h-9 items-center rounded-md border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-900 hover:bg-amber-100">
                          詳細を開く
                        </Link>
                      </div>
                    </article>
                  );
                })}
                {appointmentReminderRows.length === 0 ? (
                  <p className="rounded-md border border-amber-200 bg-white p-3 text-xs leading-5 text-amber-900">
                    2時間以内の予約は直前確認に分けて表示しています。
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
          {carePlanShareRows.length > 0 ? (
            <div className="mt-4 rounded-md border border-sky-200 bg-sky-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-sky-950">ホームケアメモ共有</h3>
                <span className="rounded border border-sky-200 bg-white px-2 py-1 text-[11px] font-semibold text-sky-900">
                  {carePlanShareRows.length}件 / {carePlanShareValue.toLocaleString("ja-JP")}円
                </span>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {carePlanShareRows.map((row) => {
                  const message = carePlanShareMessage({
                    customerName: row.customer.name,
                    saleTitle: row.latestSale?.title,
                    careUrl: row.carePlanUrl,
                    nextVisitDate: row.suggestedNextVisitDate
                  });

                  return (
                    <article key={row.customer.id} className="rounded-md border border-sky-200 bg-white p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-stone-950">{row.customer.name}</p>
                        <span className="text-xs font-semibold text-sky-800">
                          会計から{row.latestSaleDays}日
                        </span>
                      </div>
                      <div className="mt-2 grid gap-1 text-xs leading-5 text-stone-700">
                        <p>メニュー: {row.latestSale?.title ?? "会計記録"}</p>
                        <p>ケアメモ: {row.carePlanUrl}</p>
                        <p>次回目安: {formatDate(row.suggestedNextVisitDate)}</p>
                      </div>
                      <div className="mt-3 rounded-md border border-sky-100 bg-sky-50 p-3">
                        <p className="text-[11px] font-semibold text-sky-900">共有文面</p>
                        <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-stone-700">{message}</p>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <CopyTextButton text={message} label="文面コピー" />
                        <CopyTextButton text={row.carePlanUrl} label="URLコピー" />
                        <form action={createContactLog.bind(null, row.customer.id)}>
                          <input type="hidden" name="channel" value="LINE" />
                          <input type="hidden" name="purpose" value="ホームケアメモ共有" />
                          <input type="hidden" name="message" value={message} />
                          <input type="hidden" name="outcome" value="ホームケアメモ共有" />
                          <input type="hidden" name="nextAction" value="感想フォームの反応を確認し、必要に応じてホームケア・次回予約・紹介へつなげる" />
                          <button
                            type="submit"
                            className="inline-flex h-9 items-center rounded-md border border-teal-200 bg-white px-3 text-xs font-semibold text-teal-900 hover:bg-teal-50"
                          >
                            共有済みにする
                          </button>
                        </form>
                        <Link href={row.href} className="inline-flex h-9 items-center rounded-md border border-sky-200 bg-sky-50 px-3 text-xs font-semibold text-sky-900 hover:bg-sky-100">
                          詳細を開く
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : null}
          {homeCareProposalRows.length > 0 ? (
            <div className="mt-4 rounded-md border border-teal-200 bg-teal-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-teal-950">ホームケア・店販提案</h3>
                <span className="rounded border border-teal-200 bg-white px-2 py-1 text-[11px] font-semibold text-teal-900">
                  {homeCareProposalRows.length}件 / {homeCareProposalValue.toLocaleString("ja-JP")}円
                </span>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {homeCareProposalRows.map((row) => {
                  const message = homeCareMessage({
                    customerName: row.customer.name,
                    saleTitle: row.latestSale?.title,
                    proposalName: row.proposalSuggestion?.suggestedStyleName,
                    courseTitle: row.topOpenCourse?.title,
                    addOnInterests: row.addOnInterests,
                    nextVisitDate: row.customer.visits[0]?.visitedAt ? addDays(row.customer.visits[0].visitedAt, 60) : null
                  });

                  return (
                    <article key={row.customer.id} className="rounded-md border border-teal-200 bg-white p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-stone-950">{row.customer.name}</p>
                        <span className="text-xs font-semibold text-teal-800">
                          会計から{row.latestSaleDays}日
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {row.latestSale ? (
                          <span className="rounded border border-teal-100 bg-teal-50 px-2 py-1 text-[11px] font-semibold text-teal-800">
                            {row.latestSale.title}
                          </span>
                        ) : null}
                        {row.addOnInterests.slice(0, 3).map((interest) => (
                          <span key={interest} className="rounded border border-amber-100 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">
                            {interest}
                          </span>
                        ))}
                      </div>
                      <div className="mt-3 rounded-md border border-teal-100 bg-teal-50 p-3">
                        <p className="text-[11px] font-semibold text-teal-900">ホームケア提案文面</p>
                        <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-stone-700">{message}</p>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <CopyTextButton text={message} label="文面コピー" />
                        <form action={createContactLog.bind(null, row.customer.id)}>
                          <input type="hidden" name="channel" value="LINE" />
                          <input type="hidden" name="purpose" value="ホームケア提案" />
                          <input type="hidden" name="message" value={message} />
                          <input type="hidden" name="outcome" value="ホームケア提案送信" />
                          <input type="hidden" name="nextAction" value="返信があれば髪の状態・予算・使い方を確認し、店販または次回来店提案へつなげる" />
                          <button
                            type="submit"
                            className="inline-flex h-9 items-center rounded-md border border-teal-200 bg-white px-3 text-xs font-semibold text-teal-900 hover:bg-teal-50"
                          >
                            提案送信済み
                          </button>
                        </form>
                        <Link href={row.href} className="inline-flex h-9 items-center rounded-md border border-teal-200 bg-teal-50 px-3 text-xs font-semibold text-teal-900 hover:bg-teal-100">
                          詳細を開く
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : null}
          {nextRebookingRows.length > 0 ? (
            <div className="mt-4 rounded-md border border-indigo-200 bg-indigo-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-indigo-950">次回予約・再来周期提案</h3>
                <span className="rounded border border-indigo-200 bg-white px-2 py-1 text-[11px] font-semibold text-indigo-900">
                  {nextRebookingRows.length}件 / {nextRebookingValue.toLocaleString("ja-JP")}円
                </span>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {nextRebookingRows.map((row) => {
                  const message = nextRebookingMessage({
                    customerName: row.customer.name,
                    saleTitle: row.latestSale?.title,
                    proposalName: row.proposalSuggestion?.suggestedStyleName,
                    courseTitle: row.topOpenCourse?.title,
                    nextVisitDate: row.suggestedNextVisitDate,
                    preferredTimeWindow: row.preferredTimeWindow,
                    addOnInterests: row.addOnInterests
                  });

                  return (
                    <article key={row.customer.id} className="rounded-md border border-indigo-200 bg-white p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-stone-950">{row.customer.name}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded border border-indigo-100 bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-800">
                            周期 {row.rebookingCycleDays}日
                          </span>
                          <span className="rounded border border-stone-200 bg-stone-50 px-2 py-1 text-[11px] font-semibold text-stone-700">
                            {row.rebookingDaysUntilDue !== null && row.rebookingDaysUntilDue < 0
                              ? `${Math.abs(row.rebookingDaysUntilDue)}日超過`
                              : `あと${row.rebookingDaysUntilDue ?? "-"}日`}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 grid gap-1 text-xs leading-5 text-stone-700">
                        <p>前回会計: {row.latestSale ? `${row.latestSale.title} / ${row.latestSale.amount.toLocaleString("ja-JP")}円` : "未記録"}</p>
                        <p>次回目安: {formatDate(row.suggestedNextVisitDate)}</p>
                      </div>
                      <div className="mt-3 rounded-md border border-indigo-100 bg-indigo-50 p-3">
                        <p className="text-[11px] font-semibold text-indigo-900">次回予約提案文面</p>
                        <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-stone-700">{message}</p>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <CopyTextButton text={message} label="文面コピー" />
                        <form action={createContactLog.bind(null, row.customer.id)}>
                          <input type="hidden" name="channel" value="LINE" />
                          <input type="hidden" name="purpose" value="次回予約提案" />
                          <input type="hidden" name="message" value={message} />
                          <input type="hidden" name="outcome" value="次回予約提案送信" />
                          <input type="hidden" name="scheduledFollowUp" value={row.suggestedNextVisitDate?.toISOString() ?? ""} />
                          <input type="hidden" name="nextAction" value="返信があれば候補日を確認し、次回予約または仮予約へ進める" />
                          <button
                            type="submit"
                            className="inline-flex h-9 items-center rounded-md border border-teal-200 bg-white px-3 text-xs font-semibold text-teal-900 hover:bg-teal-50"
                          >
                            提案送信済み
                          </button>
                        </form>
                        <Link href={row.href} className="inline-flex h-9 items-center rounded-md border border-indigo-200 bg-indigo-50 px-3 text-xs font-semibold text-indigo-900 hover:bg-indigo-100">
                          詳細を開く
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : null}
          {maintenancePackageRows.length > 0 ? (
            <div className="mt-4 rounded-md border border-violet-200 bg-violet-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-violet-950">メンテナンスパック・継続プラン提案</h3>
                <span className="rounded border border-violet-200 bg-white px-2 py-1 text-[11px] font-semibold text-violet-900">
                  {maintenancePackageRows.length}件 / {maintenancePackageValue.toLocaleString("ja-JP")}円
                </span>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {maintenancePackageRows.map((row) => {
                  const message = maintenancePackageMessage({
                    customerName: row.customer.name,
                    packageTitle: row.maintenancePackageName,
                    saleTitle: row.latestSale?.title,
                    packagePrice: row.maintenancePackageValue,
                    perVisitPrice: row.maintenancePackagePerVisitPrice,
                    nextVisitDate: row.suggestedNextVisitDate,
                    proposalName: row.proposalSuggestion?.suggestedStyleName,
                    courseTitle: row.topOpenCourse?.title,
                    addOnInterests: row.addOnInterests
                  });

                  return (
                    <article key={row.customer.id} className="rounded-md border border-violet-200 bg-white p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-stone-950">{row.customer.name}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded border border-violet-100 bg-violet-50 px-2 py-1 text-[11px] font-semibold text-violet-800">
                            {row.maintenancePackageName}
                          </span>
                          <span className="rounded border border-stone-200 bg-stone-50 px-2 py-1 text-[11px] font-semibold text-stone-700">
                            3回 {row.maintenancePackageValue.toLocaleString("ja-JP")}円
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 grid gap-1 text-xs leading-5 text-stone-700">
                        <p>前回会計: {row.latestSale ? `${row.latestSale.title} / ${row.latestSale.amount.toLocaleString("ja-JP")}円` : "未記録"}</p>
                        <p>次回目安: {formatDate(row.suggestedNextVisitDate)}</p>
                      </div>
                      <div className="mt-3 rounded-md border border-violet-100 bg-violet-50 p-3">
                        <p className="text-[11px] font-semibold text-violet-900">継続プラン提案文面</p>
                        <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-stone-700">{message}</p>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <CopyTextButton text={message} label="文面コピー" />
                        <form action={createContactLog.bind(null, row.customer.id)}>
                          <input type="hidden" name="channel" value="LINE" />
                          <input type="hidden" name="purpose" value="メンテナンスパック提案" />
                          <input type="hidden" name="message" value={message} />
                          <input type="hidden" name="outcome" value="メンテナンスパック提案送信" />
                          <input type="hidden" name="scheduledFollowUp" value={row.suggestedNextVisitDate?.toISOString() ?? ""} />
                          <input type="hidden" name="nextAction" value="返信があれば支払い方法・有効期限・初回候補日を確認する" />
                          <button
                            type="submit"
                            className="inline-flex h-9 items-center rounded-md border border-teal-200 bg-white px-3 text-xs font-semibold text-teal-900 hover:bg-teal-50"
                          >
                            提案送信済み
                          </button>
                        </form>
                        <Link href={row.href} className="inline-flex h-9 items-center rounded-md border border-violet-200 bg-violet-50 px-3 text-xs font-semibold text-violet-900 hover:bg-violet-100">
                          詳細を開く
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : null}
          {reviewRequestRows.length > 0 ? (
            <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-emerald-950">来店後フォロー・レビュー依頼</h3>
                <span className="rounded border border-emerald-200 bg-white px-2 py-1 text-[11px] font-semibold text-emerald-800">
                  {reviewRequestRows.length}件
                </span>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {reviewRequestRows.map((row) => {
                  const message = reviewRequestMessage({
                    customerName: row.customer.name,
                    saleTitle: row.latestSale?.title,
                    nextVisitDate: row.customer.visits[0]?.visitedAt ? addDays(row.customer.visits[0].visitedAt, 60) : null,
                    feedbackUrl: feedbackShareUrl(row.customer.id)
                  });

                  return (
                    <article key={row.customer.id} className="rounded-md border border-emerald-200 bg-white p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-stone-950">{row.customer.name}</p>
                        <span className="text-xs font-semibold text-emerald-800">
                          会計から{row.latestSaleDays}日
                        </span>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-xs leading-5 text-stone-700">{message}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <CopyTextButton text={message} label="文面コピー" />
                        <form action={createContactLog.bind(null, row.customer.id)}>
                          <input type="hidden" name="channel" value="LINE" />
                          <input type="hidden" name="purpose" value="来店後フォロー" />
                          <input type="hidden" name="message" value={message} />
                          <input type="hidden" name="outcome" value="レビュー依頼送信" />
                          <input type="hidden" name="nextAction" value="返信や口コミ投稿を確認し、次回予約のきっかけを作る" />
                          <button
                            type="submit"
                            className="inline-flex h-9 items-center rounded-md border border-teal-200 bg-white px-3 text-xs font-semibold text-teal-900 hover:bg-teal-50"
                          >
                            フォロー送信済み
                          </button>
                        </form>
                        <Link href={row.href} className="inline-flex h-9 items-center rounded-md border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-900 hover:bg-emerald-100">
                          詳細を開く
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : null}
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {actionRows.map((row) => {
              const message = followMessage({
                customerName: row.customer.name,
                statusAction: row.status.action,
                proposalName: row.proposalSuggestion?.suggestedStyleName,
                courseTitle: row.topOpenCourse?.title
              });

              return (
                <article key={row.customer.id} className="rounded-md border border-stone-200 bg-[#fbf8f3] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-stone-950">{row.customer.name}</p>
                    <span className={`rounded border px-2 py-1 text-[11px] font-semibold ${statusClass(row.status.tone)}`}>
                      {row.status.label}
                    </span>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-xs leading-5 text-stone-700">{message}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <CopyTextButton text={message} label="文面コピー" />
                    <Link href={row.href} className="inline-flex h-9 items-center rounded-md border border-teal-200 bg-white px-3 text-xs font-semibold text-teal-900 hover:bg-teal-50">
                      詳細を開く
                    </Link>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-stone-600">
                    <span className="rounded border border-stone-200 bg-white px-2 py-1">
                      最新追客: {row.latestContactLog ? formatDate(row.latestContactLog.createdAt) : "未記録"}
                    </span>
                    <span className="rounded border border-stone-200 bg-white px-2 py-1">
                      次回予約: {row.upcomingAppointment ? formatDate(row.upcomingAppointment.scheduledAt) : "未設定"}
                    </span>
                    <span className="rounded border border-stone-200 bg-white px-2 py-1">
                      提案反応: {row.latestProposalResponse?.intent ?? "未返信"}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {view === "analytics" ? (
        <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-stone-950">売上化の見どころ</h2>
          <div className="mt-4 rounded-md border border-teal-200 bg-teal-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-teal-950">週次オーナーレポート</h3>
                <p className="mt-2 text-xs leading-5 text-teal-900">
                  店長会議、日報、Notion、LINE共有に貼れる経営サマリーです。
                </p>
              </div>
              <CopyTextButton text={ownerWeeklyReportMessage} label="レポートコピー" className="border-teal-200 text-teal-900" />
            </div>
            <p className="mt-3 whitespace-pre-wrap rounded-md border border-teal-100 bg-white p-3 text-xs leading-5 text-stone-700">
              {ownerWeeklyReportMessage}
            </p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <div className="rounded-md border border-stone-200 bg-[#fbf8f3] p-4">
              <p className="text-xs font-semibold text-stone-500">画像提案総数</p>
              <p className="mt-2 text-2xl font-semibold text-stone-950">{imageProposalCount}</p>
            </div>
            <div className="rounded-md border border-stone-200 bg-[#fbf8f3] p-4">
              <p className="text-xs font-semibold text-stone-500">商談準備済み</p>
              <p className="mt-2 text-2xl font-semibold text-stone-950">{conversionReadyCount}</p>
            </div>
            <div className="rounded-md border border-stone-200 bg-[#fbf8f3] p-4">
              <p className="text-xs font-semibold text-stone-500">顧客あたり未採用額</p>
              <p className="mt-2 text-2xl font-semibold text-stone-950">{averageOpenCourseValue.toLocaleString("ja-JP")}円</p>
            </div>
            <div className="rounded-md border border-stone-200 bg-[#fbf8f3] p-4">
              <p className="text-xs font-semibold text-stone-500">追客対象率</p>
              <p className="mt-2 text-2xl font-semibold text-stone-950">
                {customers.length > 0 ? Math.round((followTargetCount / customers.length) * 100) : 0}%
              </p>
            </div>
            <div className="rounded-md border border-stone-200 bg-[#fbf8f3] p-4">
              <p className="text-xs font-semibold text-stone-500">直近30日売上</p>
              <p className="mt-2 text-2xl font-semibold text-stone-950">{recentServiceRevenue.toLocaleString("ja-JP")}円</p>
            </div>
            <div className="rounded-md border border-stone-200 bg-[#fbf8f3] p-4">
              <p className="text-xs font-semibold text-stone-500">累計売上実績</p>
              <p className="mt-2 text-2xl font-semibold text-stone-950">{totalServiceRevenue.toLocaleString("ja-JP")}円</p>
            </div>
          </div>
          <div className="mt-4 rounded-md border border-indigo-100 bg-indigo-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-indigo-950">会計時クロージング実行率</h3>
                <p className="mt-2 text-xs leading-5 text-indigo-900">
                  直近30日の会計後に、次回予約・ホームケア・継続プラン・紹介をどれだけ自然に確認できたかを見ます。
                </p>
              </div>
              <span className="rounded border border-indigo-200 bg-white px-3 py-1 text-xs font-semibold text-indigo-900">
                {checkoutClosingCoverageRate}% / {recentCheckoutCustomerIds.length}名
              </span>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {checkoutClosingTypeRows.map((row) => {
                const latestLog = row.logs[0];
                return (
                  <div key={row.label} className="rounded-md border border-indigo-100 bg-white p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-stone-950">{row.label}</p>
                        <p className="mt-1 text-[11px] font-semibold text-indigo-800">
                          実行 {row.logs.length}件 / 見込み {row.value.toLocaleString("ja-JP")}円
                        </p>
                      </div>
                      <span className="rounded border border-indigo-100 bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-900">
                        {percent(row.logs.length, recentCheckoutCustomerIds.length)}%
                      </span>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-stone-600">{row.action}</p>
                    <p className="mt-2 text-[11px] leading-5 text-stone-500">
                      直近: {latestLog ? `${formatDate(latestLog.createdAt)} / ${latestLog.customer.name}` : "未実行"}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <div className="rounded-md border border-stone-200 bg-white p-4">
              <p className="text-xs font-semibold text-stone-500">平均客単価</p>
              <p className="mt-2 text-2xl font-semibold text-stone-950">{averageTicket.toLocaleString("ja-JP")}円</p>
              <p className="mt-2 text-xs text-stone-500">売上登録 {allSales.length}件</p>
            </div>
            <div className="rounded-md border border-stone-200 bg-white p-4">
              <p className="text-xs font-semibold text-stone-500">直近30日単価</p>
              <p className="mt-2 text-2xl font-semibold text-stone-950">{recentAverageTicket.toLocaleString("ja-JP")}円</p>
              <p className="mt-2 text-xs text-stone-500">直近会計 {recentSales.length}件</p>
            </div>
            <div className="rounded-md border border-stone-200 bg-white p-4">
              <p className="text-xs font-semibold text-stone-500">次回予約保持率</p>
              <p className="mt-2 text-2xl font-semibold text-stone-950">{percent(activeAppointmentCount, customers.length)}%</p>
              <p className="mt-2 text-xs text-stone-500">有効予約 {activeAppointmentCount}件</p>
            </div>
            <div className="rounded-md border border-stone-200 bg-white p-4">
              <p className="text-xs font-semibold text-stone-500">返信対応率</p>
              <p className="mt-2 text-2xl font-semibold text-stone-950">{percent(handledProposalResponseCount, allProposalResponses.length)}%</p>
              <p className="mt-2 text-xs text-stone-500">対応済み {handledProposalResponseCount} / 返信 {allProposalResponses.length}</p>
            </div>
            <div className="rounded-md border border-stone-200 bg-white p-4">
              <p className="text-xs font-semibold text-stone-500">キャンセル率</p>
              <p className="mt-2 text-2xl font-semibold text-stone-950">{percent(canceledAppointmentCount + noShowAppointmentCount, allAppointments.length)}%</p>
              <p className="mt-2 text-xs text-stone-500">
                キャンセル {canceledAppointmentCount} / 無断 {noShowAppointmentCount} / 予約 {allAppointments.length}
              </p>
            </div>
            <div className="rounded-md border border-red-200 bg-red-50 p-4">
              <p className="text-xs font-semibold text-red-700">失客リスク</p>
              <p className="mt-2 text-2xl font-semibold text-red-800">{retentionRiskRows.length}</p>
              <p className="mt-2 text-xs text-red-700">予約なし + 再来店提案対象</p>
            </div>
          </div>
          <div className="mt-5 rounded-md border border-stone-200 bg-[#fbf8f3] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-stone-950">改善すべき商用KPI</h3>
                <p className="mt-2 text-xs leading-5 text-stone-600">
                  提案を送る、反応を予約へ変える、会計まで記録する流れを数字で追います。
                </p>
              </div>
              <p className="text-xs font-semibold text-stone-500">
                今日の運用インパクト {dailyRevenueActionValue.toLocaleString("ja-JP")}円
              </p>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {commercialRateCards.map((card) => (
                <div key={card.label} className="rounded-md border border-stone-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-semibold text-stone-500">{card.label}</p>
                    <span className="rounded border border-teal-200 bg-teal-50 px-2 py-1 text-[11px] font-semibold text-teal-900">
                      {card.rate}%
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-200">
                    <div className="h-full rounded-full bg-teal-700" style={{ width: `${card.rate}%` }} />
                  </div>
                  <p className="mt-2 text-xs font-semibold text-stone-700">{card.detail}</p>
                  <p className="mt-2 text-xs leading-5 text-stone-500">{card.help}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {decisionBlockerAnalyticsCards.map((card) => (
                <div key={card.label} className="rounded-md border border-amber-100 bg-white p-3">
                  <p className="text-xs font-semibold text-amber-800">{card.label}</p>
                  <p className="mt-2 text-xl font-semibold text-stone-950">{card.value}</p>
                  <p className="mt-2 text-xs leading-5 text-stone-500">{card.help}</p>
                </div>
              ))}
            </div>
            {decisionBlockerCounts.length > 0 ? (
              <div className="mt-3 rounded-md border border-amber-100 bg-white p-3">
                <p className="text-xs font-semibold text-amber-800">予約前に止まりやすい理由</p>
                <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                  {decisionBlockerCounts.map((item) => (
                    <div key={item.reason} className="rounded-md border border-stone-200 bg-[#fbf8f3] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-stone-950">{item.reason}</p>
                        <span className="rounded border border-stone-200 bg-white px-2 py-1 text-[11px] font-semibold text-stone-700">
                          {item.count}件
                        </span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-200">
                        <div className="h-full rounded-full bg-amber-500" style={{ width: `${percent(item.count, allProposalResponses.length)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {leadAnalyticsCards.map((card) => (
                <div key={card.label} className="rounded-md border border-red-100 bg-white p-3">
                  <p className="text-xs font-semibold text-red-700">{card.label}</p>
                  <p className="mt-2 text-xl font-semibold text-stone-950">{card.value}</p>
                  <p className="mt-2 text-xs leading-5 text-stone-500">{card.help}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-md border border-red-100 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-red-700">流入元別リード</p>
                <span className="text-[11px] font-semibold text-stone-500">
                  新規相談 {allNewLeadRows.length}件
                </span>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                {leadSourceCounts.map((item) => (
                  <div key={item.source} className="rounded-md border border-stone-200 bg-[#fbf8f3] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-stone-950">{item.source}</p>
                      <span className="rounded border border-stone-200 bg-white px-2 py-1 text-[11px] font-semibold text-stone-700">
                        {item.count}件
                      </span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-200">
                      <div className="h-full rounded-full bg-red-600" style={{ width: `${percent(item.count, allNewLeadRows.length)}%` }} />
                    </div>
                  </div>
                ))}
                {leadSourceCounts.length === 0 ? (
                  <p className="text-xs text-stone-500">新規相談フォームからのリードはまだありません。</p>
                ) : null}
              </div>
              {leadSourcePerformanceRows.length > 0 ? (
                <div className="mt-3 overflow-hidden rounded-md border border-stone-200">
                  <table className="min-w-full divide-y divide-stone-200 text-left text-xs">
                    <thead className="bg-stone-50 text-stone-500">
                      <tr>
                        <th className="px-3 py-2 font-semibold">流入元</th>
                        <th className="px-3 py-2 font-semibold">相談</th>
                        <th className="px-3 py-2 font-semibold">予約化</th>
                        <th className="px-3 py-2 font-semibold">売上</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 bg-white">
                      {leadSourcePerformanceRows.map((item) => (
                        <tr key={item.source}>
                          <td className="px-3 py-2 font-semibold text-stone-950">{item.source}</td>
                          <td className="px-3 py-2 text-stone-700">{item.leads}件</td>
                          <td className="px-3 py-2 text-stone-700">
                            {item.booked}件 / {percent(item.booked, item.leads)}%
                          </td>
                          <td className="px-3 py-2 font-semibold text-teal-800">
                            {item.revenue.toLocaleString("ja-JP")}円
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
              {referralChampionRows.length > 0 ? (
                <div className="mt-3 rounded-md border border-emerald-100 bg-emerald-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-emerald-900">紹介者ランキング</p>
                    <span className="text-[11px] font-semibold text-emerald-800">
                      紹介発生 {referralLogs.length}件
                    </span>
                  </div>
                  <div className="mt-3 overflow-hidden rounded-md border border-emerald-100 bg-white">
                    <table className="min-w-full divide-y divide-stone-200 text-left text-xs">
                      <thead className="bg-stone-50 text-stone-500">
                        <tr>
                          <th className="px-3 py-2 font-semibold">紹介者</th>
                          <th className="px-3 py-2 font-semibold">紹介数</th>
                          <th className="px-3 py-2 font-semibold">直近紹介</th>
                          <th className="px-3 py-2 font-semibold">紹介URL</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 bg-white">
                        {referralChampionRows.map((row) => {
                          const referralUrl = intakeReferralUrl(row.customer);
                          return (
                            <tr key={row.customer.id}>
                              <td className="px-3 py-2 font-semibold text-stone-950">{row.customer.name}</td>
                              <td className="px-3 py-2 text-stone-700">{row.count}件</td>
                              <td className="px-3 py-2 text-stone-700">
                                {formatDate(row.latestAt)}
                                {row.latestReferredName ? ` / ${row.latestReferredName}` : ""}
                              </td>
                              <td className="px-3 py-2">
                                <CopyTextButton text={referralUrl} label="コピー" />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {appointmentRiskAnalyticsCards.map((card) => (
                <div key={card.label} className="rounded-md border border-red-100 bg-white p-3">
                  <p className="text-xs font-semibold text-red-700">{card.label}</p>
                  <p className="mt-2 text-xl font-semibold text-stone-950">{card.value}</p>
                  <p className="mt-2 text-xs leading-5 text-stone-500">{card.help}</p>
                </div>
              ))}
            </div>
            {appointmentProtectionPlaybookRows.length > 0 ? (
              <div className="mt-3 rounded-md border border-red-100 bg-red-50 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-red-800">予約枠保護プレイブック</p>
                    <p className="mt-1 text-xs leading-5 text-red-900">
                      直前確認、前日確認、空き枠回収、キャンセル後再予約を一つの運用順にまとめます。
                    </p>
                  </div>
                  <span className="rounded border border-red-200 bg-white px-2 py-1 text-[11px] font-semibold text-red-800">
                    {appointmentProtectionPlaybookRows.length}項目
                  </span>
                </div>
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  {appointmentProtectionPlaybookRows.map((row) => (
                    <article key={row.label} className={`rounded-md border p-3 ${row.className}`}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-semibold">{row.label}</h4>
                          <p className="mt-1 text-[11px] font-semibold">
                            {row.count}件 / {row.value.toLocaleString("ja-JP")}円
                          </p>
                        </div>
                        <CopyTextButton text={row.message} label="文面コピー" />
                      </div>
                      <p className="mt-3 text-xs leading-5">{row.action}</p>
                      <p className="mt-3 whitespace-pre-wrap rounded border border-white/70 bg-white/80 p-2 text-xs leading-5 text-stone-700">
                        {row.message}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {previsitAnalyticsCards.map((card) => (
                <div key={card.label} className="rounded-md border border-teal-100 bg-white p-3">
                  <p className="text-xs font-semibold text-teal-800">{card.label}</p>
                  <p className="mt-2 text-xl font-semibold text-stone-950">{card.value}</p>
                  <p className="mt-2 text-xs leading-5 text-stone-500">{card.help}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {feedbackAnalyticsCards.map((card) => (
                <div key={card.label} className="rounded-md border border-emerald-100 bg-white p-3">
                  <p className="text-xs font-semibold text-emerald-700">{card.label}</p>
                  <p className="mt-2 text-xl font-semibold text-stone-950">{card.value}</p>
                  <p className="mt-2 text-xs leading-5 text-stone-500">{card.help}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="rounded-md border border-teal-200 bg-teal-50 p-4">
              <h3 className="text-sm font-semibold text-teal-950">商用化ファネル</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                {commercialFunnel.map((step, index) => (
                  <div key={step.label} className="rounded-md border border-teal-100 bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-teal-800">{index + 1}. {step.label}</p>
                      <span className="text-[11px] font-semibold text-stone-500">{percent(step.count, customers.length)}%</span>
                    </div>
                    <p className="mt-2 text-2xl font-semibold text-stone-950">{step.count}</p>
                    <p className="mt-2 line-clamp-3 text-xs leading-5 text-stone-600">{step.help}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
              <h3 className="text-sm font-semibold text-amber-950">次に詰まりを外す場所</h3>
              <div className="mt-3 grid gap-2">
                {commercialLeakage.map((item) => (
                  <div key={item.label} className="rounded-md border border-amber-100 bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-stone-950">{item.label}</p>
                      <span className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-900">
                        {item.count}件
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-stone-600">{item.action}</p>
                  </div>
                ))}
                {commercialLeakage.length === 0 ? <p className="text-xs text-amber-900">大きな詰まりはありません。</p> : null}
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            <div className="rounded-md border border-stone-200 bg-[#fbf8f3] p-4">
              <h3 className="text-sm font-semibold text-stone-950">LTV上位顧客</h3>
              <div className="mt-3 grid gap-2">
                {topRevenueRows.map((row) => (
                  <Link key={row.customer.id} href={row.href} className="rounded-md border border-stone-200 bg-white p-3 hover:border-teal-300">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-stone-950">{row.customer.name}</p>
                      <p className="text-sm font-semibold text-teal-800">{row.totalCustomerRevenue.toLocaleString("ja-JP")}円</p>
                    </div>
                    <p className="mt-2 text-xs text-stone-500">
                      最終来店 {formatDate(row.customer.visits[0]?.visitedAt)} / 次回予約 {row.upcomingAppointment ? formatDate(row.upcomingAppointment.scheduledAt) : "未設定"}
                    </p>
                  </Link>
                ))}
                {topRevenueRows.length === 0 ? <p className="text-xs text-stone-500">売上登録がまだありません。</p> : null}
              </div>
              <div className="mt-3 rounded-md border border-fuchsia-100 bg-fuchsia-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-fuchsia-900">VIP復帰候補</p>
                  <span className="text-[11px] font-semibold text-fuchsia-900">
                    {vipReactivationRows.length}件 / {vipReactivationValue.toLocaleString("ja-JP")}円
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-fuchsia-900">
                  累計{vipRevenueThreshold.toLocaleString("ja-JP")}円以上で、次回予約がない優良顧客を優先して復帰提案します。
                </p>
              </div>
            </div>
            <div className="rounded-md border border-red-200 bg-red-50 p-4">
              <h3 className="text-sm font-semibold text-red-800">失客防止の優先顧客</h3>
              <div className="mt-3 grid gap-2">
                {retentionRiskRows.map((row) => (
                  <Link key={row.customer.id} href={row.href} className="rounded-md border border-red-100 bg-white p-3 hover:border-red-300">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-stone-950">{row.customer.name}</p>
                      <span className={`rounded border px-2 py-1 text-[11px] font-semibold ${statusClass(row.status.tone)}`}>
                        {row.status.label}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-stone-600">{row.status.action}</p>
                  </Link>
                ))}
                {retentionRiskRows.length === 0 ? <p className="text-xs text-red-700">失客防止の優先対象はありません。</p> : null}
              </div>
            </div>
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
              <h3 className="text-sm font-semibold text-amber-900">予約・相談につながる反応</h3>
              <div className="mt-3 grid gap-2">
                {highIntentRows.map((row) => (
                  <Link key={row.customer.id} href={row.href} className="rounded-md border border-amber-100 bg-white p-3 hover:border-amber-300">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-stone-950">{row.customer.name}</p>
                      <p className="text-xs font-semibold text-amber-800">{row.openProposalResponse?.status ?? row.latestProposalResponse?.status ?? "返信あり"}</p>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-stone-700">
                      {row.openProposalResponse?.intent ?? row.latestProposalResponse?.intent ?? "反応あり"}
                      {row.openProposalResponse?.preferredDate ? ` / 希望 ${formatDateTime(row.openProposalResponse.preferredDate)}` : ""}
                    </p>
                  </Link>
                ))}
                {highIntentRows.length === 0 ? <p className="text-xs text-amber-900">予約・相談につながる反応はまだありません。</p> : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {view === "settings" ? (
        <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-stone-950">商用運用チェック</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-md border border-stone-200 bg-[#fbf8f3] p-4">
              <p className="text-xs font-semibold text-stone-500">写真同意率</p>
              <p className="mt-2 text-2xl font-semibold text-stone-950">
                {customers.length > 0 ? Math.round((customers.filter((customer) => customer.aiPhotoConsent).length / customers.length) * 100) : 0}%
              </p>
              <p className="mt-2 text-xs text-stone-500">画像提案を使える顧客の割合</p>
            </div>
            <div className="rounded-md border border-stone-200 bg-[#fbf8f3] p-4">
              <p className="text-xs font-semibold text-stone-500">写真素材不足</p>
              <p className="mt-2 text-2xl font-semibold text-stone-950">{commercialRows.filter((row) => !row.aiReady).length}</p>
              <p className="mt-2 text-xs text-stone-500">正面・横写真が不足している顧客</p>
            </div>
            <div className="rounded-md border border-stone-200 bg-[#fbf8f3] p-4">
              <p className="text-xs font-semibold text-stone-500">追客未処理候補</p>
              <p className="mt-2 text-2xl font-semibold text-stone-950">{followTargetCount}</p>
              <p className="mt-2 text-xs text-stone-500">今日のメッセージ対象</p>
            </div>
          </div>
          <div className="mt-5 rounded-md border border-stone-200 bg-[#fbf8f3] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-stone-950">商用運用リスク監査</h3>
                <p className="mt-2 text-xs leading-5 text-stone-600">
                  写真、連絡先、予約規約、口コミ、事前写真の利用範囲を、売上運用に入る前に確認します。
                </p>
              </div>
              <span className="rounded border border-stone-200 bg-white px-2 py-1 text-[11px] font-semibold text-stone-700">
                {complianceAuditRows.filter((row) => row.status !== "OK").length}件確認
              </span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {complianceAuditRows.map((row) => (
                <article key={row.label} className={`rounded-md border p-3 ${row.className}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{row.label}</p>
                      <p className="mt-1 text-[11px] font-semibold">
                        {row.status} / {row.count}件
                      </p>
                    </div>
                    <CopyTextButton text={row.message} label="コピー" />
                  </div>
                  <p className="mt-3 text-xs leading-5">{row.action}</p>
                </article>
              ))}
            </div>
          </div>
          <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-amber-950">口コミリンク設定</h3>
                <p className="mt-2 text-xs leading-5 text-amber-900">
                  高評価かつ口コミ投稿OKのお客様だけに、回答後ページと店側の返信文面で口コミ投稿リンクを案内します。
                </p>
              </div>
              {googleReviewUrl ? (
                <CopyTextButton text={googleReviewUrl} label="URLコピー" className="border-amber-200 text-amber-900" />
              ) : null}
            </div>
            {googleReviewUrl ? (
              <p className="mt-3 truncate rounded border border-amber-100 bg-white px-3 py-2 text-xs text-stone-600">
                {googleReviewUrl}
              </p>
            ) : (
              <p className="mt-3 rounded border border-amber-100 bg-white px-3 py-2 text-xs leading-5 text-stone-600">
                未設定です。.env に NEXT_PUBLIC_GOOGLE_REVIEW_URL を入れると、口コミ候補メッセージと回答後ページに反映されます。
              </p>
            )}
          </div>
          <div className="mt-5 rounded-md border border-teal-200 bg-teal-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-teal-950">集客リンクセンター</h3>
                <p className="mt-2 text-xs leading-5 text-teal-900">
                  チャネル別に相談フォームURLを出し分けて、どこから予約・売上につながったかを後で比較します。
                </p>
              </div>
              <CopyTextButton text={intakeShareUrl()} label="基本URLコピー" className="border-teal-200 text-teal-900" />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {campaignLinkRows.map((link) => {
                const performance = leadCampaignPerformanceRows.find(
                  (row) => row.source === link.source && row.campaign === link.campaign
                );
                return (
                  <div key={`${link.source}-${link.campaign}`} className="rounded-md border border-teal-100 bg-white p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-semibold text-stone-950">{link.label}</h4>
                        <p className="mt-1 text-[11px] font-semibold text-teal-800">
                          source={link.source} / campaign={link.campaign}
                        </p>
                      </div>
                      <CopyTextButton text={link.url} label="URLコピー" />
                    </div>
                    <p className="mt-2 text-xs leading-5 text-stone-600">{link.help}</p>
                    <p className="mt-2 truncate rounded border border-stone-200 bg-[#fbf8f3] px-2 py-1 text-[11px] text-stone-500">
                      {link.url}
                    </p>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
                      <div className="rounded border border-stone-200 bg-[#fbf8f3] p-2">
                        <p className="font-semibold text-stone-950">{performance?.leads ?? 0}</p>
                        <p className="mt-1 text-stone-500">相談</p>
                      </div>
                      <div className="rounded border border-stone-200 bg-[#fbf8f3] p-2">
                        <p className="font-semibold text-stone-950">{performance?.booked ?? 0}</p>
                        <p className="mt-1 text-stone-500">予約</p>
                      </div>
                      <div className="rounded border border-stone-200 bg-[#fbf8f3] p-2">
                        <p className="font-semibold text-teal-800">{(performance?.revenue ?? 0).toLocaleString("ja-JP")}</p>
                        <p className="mt-1 text-stone-500">売上</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 overflow-hidden rounded-md border border-teal-100 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-100 bg-teal-50 px-3 py-2">
                <p className="text-xs font-semibold text-teal-950">キャンペーン別実績</p>
                <span className="text-[11px] font-semibold text-teal-800">
                  {leadCampaignPerformanceRows.length}件
                </span>
              </div>
              {leadCampaignPerformanceRows.length > 0 ? (
                <table className="min-w-full divide-y divide-stone-200 text-left text-xs">
                  <thead className="bg-stone-50 text-stone-500">
                    <tr>
                      <th className="px-3 py-2 font-semibold">source</th>
                      <th className="px-3 py-2 font-semibold">campaign</th>
                      <th className="px-3 py-2 font-semibold">相談</th>
                      <th className="px-3 py-2 font-semibold">予約化</th>
                      <th className="px-3 py-2 font-semibold">売上</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 bg-white">
                    {leadCampaignPerformanceRows.map((item) => (
                      <tr key={item.key}>
                        <td className="px-3 py-2 font-semibold text-stone-950">{item.source}</td>
                        <td className="px-3 py-2 text-stone-700">{item.campaign}</td>
                        <td className="px-3 py-2 text-stone-700">{item.leads}件</td>
                        <td className="px-3 py-2 text-stone-700">
                          {item.booked}件 / {percent(item.booked, item.leads)}%
                        </td>
                        <td className="px-3 py-2 font-semibold text-teal-800">
                          {item.revenue.toLocaleString("ja-JP")}円
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="p-3 text-xs leading-5 text-stone-500">
                  campaign付きの新規相談が入ると、ここにチャネル別の予約化率と売上が表示されます。
                </p>
              )}
            </div>
            <div className="mt-4 rounded-md border border-amber-100 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-amber-900">今週の集客改善プレイブック</p>
                  <p className="mt-1 text-xs leading-5 text-stone-600">
                    campaign別の実績から、設置・増やす・直す導線を分けます。
                  </p>
                </div>
                <span className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-900">
                  {campaignPlaybookRows.filter((row) => row.status !== "継続").length}件
                </span>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {campaignPlaybookRows.map((row) => (
                  <article key={`${row.source}-${row.campaign}-playbook`} className="rounded-md border border-stone-200 bg-[#fbf8f3] p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-semibold text-stone-950">{row.label}</h4>
                        <p className="mt-1 text-[11px] font-semibold text-stone-500">
                          {row.source} / {row.campaign}
                        </p>
                      </div>
                      <span className={`rounded border px-2 py-1 text-[11px] font-semibold ${
                        row.status === "伸ばす"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : row.status === "改善"
                            ? "border-red-200 bg-red-50 text-red-800"
                            : row.status === "未計測"
                              ? "border-amber-200 bg-amber-50 text-amber-900"
                              : "border-stone-200 bg-white text-stone-700"
                      }`}>
                        {row.status}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[11px]">
                      <div className="rounded border border-stone-200 bg-white p-2">
                        <p className="font-semibold text-stone-950">{row.leads}</p>
                        <p className="mt-1 text-stone-500">相談</p>
                      </div>
                      <div className="rounded border border-stone-200 bg-white p-2">
                        <p className="font-semibold text-stone-950">{row.booked}</p>
                        <p className="mt-1 text-stone-500">予約</p>
                      </div>
                      <div className="rounded border border-stone-200 bg-white p-2">
                        <p className="font-semibold text-stone-950">{row.conversionRate}%</p>
                        <p className="mt-1 text-stone-500">率</p>
                      </div>
                      <div className="rounded border border-stone-200 bg-white p-2">
                        <p className="font-semibold text-teal-800">{row.revenue.toLocaleString("ja-JP")}</p>
                        <p className="mt-1 text-stone-500">売上</p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-stone-700">{row.action}</p>
                    <p className="mt-3 line-clamp-4 whitespace-pre-wrap rounded border border-stone-200 bg-white p-2 text-xs leading-5 text-stone-600">
                      {row.message}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <CopyTextButton text={row.message} label="文面コピー" />
                      <CopyTextButton text={row.url} label="URLコピー" />
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <UsersRound className="h-5 w-5 text-teal-800" />
            <h2 className="font-semibold text-stone-950">顧客リスト</h2>
          </div>
          <span className="text-sm text-stone-500">{customers.length}件</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-100 text-sm [&_td:nth-child(2)]:hidden [&_td:nth-child(3)]:hidden [&_td:nth-child(4)]:hidden [&_td:nth-child(7)]:hidden [&_td:nth-child(9)]:hidden [&_td:nth-child(10)]:hidden [&_td:nth-child(11)]:hidden [&_td:nth-child(12)]:hidden [&_th:nth-child(2)]:hidden [&_th:nth-child(3)]:hidden [&_th:nth-child(4)]:hidden [&_th:nth-child(7)]:hidden [&_th:nth-child(9)]:hidden [&_th:nth-child(10)]:hidden [&_th:nth-child(11)]:hidden [&_th:nth-child(12)]:hidden">
            <thead className="bg-[#fbf8f3] text-left text-xs font-semibold text-stone-500">
              <tr>
                <th className="px-5 py-3">顧客</th>
                <th className="px-5 py-3">性別 / 生年</th>
                <th className="px-5 py-3">電話番号</th>
                <th className="px-5 py-3">最終来店</th>
                <th className="px-5 py-3">商用ステータス</th>
                <th className="px-5 py-3">追客 / 予約</th>
                <th className="px-5 py-3">提案反応</th>
                <th className="px-5 py-3">提案資産</th>
                <th className="px-5 py-3">未採用メニュー</th>
                <th className="px-5 py-3">売上実績</th>
                <th className="px-5 py-3">NG条件</th>
                <th className="px-5 py-3">メモ</th>
                <th className="px-5 py-3 text-right">詳細</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {commercialRows.map((row) => (
                <tr key={row.customer.id} className="hover:bg-[#fbf8f3]">
                  <td className="whitespace-nowrap px-5 py-4">
                    <Link href={row.href} className="font-semibold text-stone-950 hover:text-teal-800">
                      {row.customer.name}
                    </Link>
                    <div className="mt-1 text-xs font-medium text-teal-800">{customerCode(row.customer.id)}</div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-stone-700">
                    {row.customer.gender ?? "-"} / {row.customer.birthYear ?? "-"}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-stone-700">{row.customer.phone ?? "-"}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-stone-700">
                    <div>{formatDate(row.customer.visits[0]?.visitedAt)}</div>
                    <div className="mt-1 text-xs text-stone-500">
                      {row.latestVisitDays === null ? "履歴なし" : `${row.latestVisitDays}日前`}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded border px-2.5 py-1 text-xs font-semibold ${statusClass(row.status.tone)}`}>
                      {row.status.label}
                    </span>
                    <p className="mt-2 max-w-[240px] text-xs leading-5 text-stone-600">{row.status.action}</p>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-stone-700">
                    <div className="text-xs">
                      追客: {row.latestContactLog ? formatDate(row.latestContactLog.createdAt) : "未記録"}
                    </div>
                    <div className="mt-2 text-xs">
                      予約: {row.upcomingAppointment ? formatDate(row.upcomingAppointment.scheduledAt) : "未設定"}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-stone-700">
                    <div className="font-semibold text-stone-950">{row.latestProposalResponse?.intent ?? "未返信"}</div>
                    <div className="mt-1 text-xs text-stone-500">
                      {row.latestProposalResponse ? formatDate(row.latestProposalResponse.createdAt) : "共有ページ反応なし"}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-stone-700">
                    <div className="flex items-center gap-2 text-xs">
                      <Camera className="h-4 w-4 text-stone-400" />
                      正面{row.frontCount} / 横{row.sideCount} / 後ろ{row.backCount}
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <Sparkles className="h-4 w-4 text-stone-400" />
                      画像提案 {row.generatedImageCount}件
                    </div>
                    {row.proposalSuggestion ? (
                      <div className="mt-1 max-w-[190px] truncate text-xs text-teal-800">
                        {row.proposalSuggestion.suggestedStyleName}
                      </div>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-stone-700">
                    <div className="font-semibold text-stone-950">{row.openCourseValue.toLocaleString("ja-JP")}円</div>
                    <div className="mt-1 max-w-[180px] truncate text-xs text-stone-500">
                      {row.topOpenCourse?.title ?? "未採用メニューなし"}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-stone-700">
                    <div className="font-semibold text-stone-950">{row.totalCustomerRevenue.toLocaleString("ja-JP")}円</div>
                    <div className="mt-1 max-w-[180px] truncate text-xs text-stone-500">
                      {row.latestSale ? `${formatDate(row.latestSale.paidAt)} / ${row.latestSale.title}` : "売上未記録"}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {row.customer.preference?.dislikes ? (
                      <span className="inline-flex rounded bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                        あり
                      </span>
                    ) : (
                      <span className="text-stone-400">-</span>
                    )}
                  </td>
                  <td className="max-w-xs truncate px-5 py-4 text-stone-600">{row.customer.memo ?? "-"}</td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={row.href}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-teal-800"
                      aria-label={`${row.customer.name}の詳細`}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-5 py-12 text-center text-sm text-stone-500">
                    顧客が見つかりません。検索条件を変えるか、新規顧客を登録してください。
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
