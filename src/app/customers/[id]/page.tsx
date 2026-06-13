import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeDollarSign,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  MessageCircle,
  Phone,
  Scissors,
  Sparkles,
  Trash2,
  UserRound
} from "lucide-react";
import {
  createAppointment,
  createCourseRecommendation,
  createContactLog,
  createServiceSale,
  createStyleSuggestion,
  createVisit,
  deleteCustomer,
  generateCourseRecommendationsAction,
  toggleCourseRecommendationAccepted,
  updateCustomer,
  updateAppointmentStatus,
  updateProposalResponseStatus,
  updateStyleSuggestionAccepted
} from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { CopyTextButton } from "@/components/copy-text-button";
import { AiReferencePhotoUploader } from "@/components/customers/ai-reference-photo-uploader";
import { StyleSuggestionGenerator } from "@/components/customers/style-suggestion-generator";
import { StyleSuggestionImageGenerator } from "@/components/customers/style-suggestion-image-generator";
import { StyleSuggestionSelector } from "@/components/customers/style-suggestion-selector";
import { SelectField, SubmitButton, TextAreaField, TextField } from "@/components/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type CustomerDetailPageProps = {
  params: {
    id: string;
  };
  searchParams?: {
    suggestionId?: string;
  };
};

type Tone = "red" | "amber" | "green" | "stone";

const genderOptions = ["女性", "男性", "その他", "未回答"];

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

function inputDateTime(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

function addMonths(date: Date, months: number) {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + months);
  return nextDate;
}

function isActiveAppointmentStatus(status: string) {
  return status !== "キャンセル" && status !== "無断キャンセル" && status !== "来店済み";
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

function priceSum(values: Array<number | null | undefined>) {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
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

function customerCode(id: string) {
  return `C-${id.slice(-5).toUpperCase()}`;
}

function feedbackShareUrl(customerId: string) {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  return baseUrl ? `${baseUrl.replace(/\/$/, "")}/feedback/${customerId}` : `/feedback/${customerId}`;
}

function carePlanShareUrl(customerId: string) {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  return baseUrl ? `${baseUrl.replace(/\/$/, "")}/care/${customerId}` : `/care/${customerId}`;
}

function customerAppShareUrl(customerId: string) {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  return baseUrl ? `${baseUrl.replace(/\/$/, "")}/app/${customerId}` : `/app/${customerId}`;
}

function appointmentConfirmationUrl(appointmentId: string) {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  return baseUrl ? `${baseUrl.replace(/\/$/, "")}/appointments/${appointmentId}/confirm` : `/appointments/${appointmentId}/confirm`;
}

function intakeReferralUrl(customerId: string, customerName: string) {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  const path = `/intake?referrer=${encodeURIComponent(customerId)}&referrerName=${encodeURIComponent(customerName)}`;

  return baseUrl ? `${baseUrl.replace(/\/$/, "")}${path}` : path;
}

function statusClass(tone: Tone) {
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

function Pill({ children, tone = "stone" }: { children: React.ReactNode; tone?: Tone }) {
  return <span className={`inline-flex rounded border px-2 py-1 text-[11px] font-semibold ${statusClass(tone)}`}>{children}</span>;
}

function ReadOnlyField({
  label,
  value,
  className = ""
}: {
  label: string;
  value?: React.ReactNode;
  className?: string;
}) {
  const isEmpty = value === null || value === undefined || value === "";

  return (
    <div className={`rounded-md border border-stone-200 bg-white px-3 py-2 ${className}`}>
      <p className="text-xs font-semibold text-stone-500">{label}</p>
      <div className={`mt-1 whitespace-pre-wrap text-sm leading-6 ${isEmpty ? "text-stone-400" : "font-semibold text-stone-950"}`}>
        {isEmpty ? "未登録" : value}
      </div>
    </div>
  );
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

function nextActionStatus({
  latestVisitDays,
  hasUpcomingAppointment,
  latestProposalIntent,
  hasRecentContact,
  aiReady,
  openCourseValue
}: {
  latestVisitDays: number | null;
  hasUpcomingAppointment: boolean;
  latestProposalIntent?: string | null;
  hasRecentContact: boolean;
  aiReady: boolean;
  openCourseValue: number;
}) {
  if (!hasUpcomingAppointment && latestProposalIntent?.includes("予約")) {
    return {
      label: "予約希望",
      tone: "red" as const,
      action: "お客様が提案ページで予約希望を送っています。希望日時を確認して予約枠を押さえてください。"
    };
  }

  if (!hasUpcomingAppointment && latestProposalIntent?.includes("相談")) {
    return {
      label: "相談希望",
      tone: "amber" as const,
      action: "提案画像と候補メニューを見ながら、相談返信を送ってください。"
    };
  }

  if (hasUpcomingAppointment) {
    return {
      label: "予約あり",
      tone: "green" as const,
      action: "当日の提案メニュー、注意点、売上候補を準備してください。"
    };
  }

  if (latestVisitDays !== null && latestVisitDays >= 75) {
    return {
      label: "失客防止",
      tone: "red" as const,
      action: "前回来店から時間が空いています。画像提案と次回メニューを添えて連絡してください。"
    };
  }

  if (latestVisitDays !== null && latestVisitDays >= 45) {
    return {
      label: "再来店提案",
      tone: "amber" as const,
      action: "メンテナンス周期に合わせて、次回予約候補を送ってください。"
    };
  }

  if (openCourseValue > 0) {
    return {
      label: "単価アップ余地",
      tone: "green" as const,
      action: "未採用メニューを提案画像と紐づけて説明してください。"
    };
  }

  if (hasRecentContact) {
    return {
      label: "返信待ち",
      tone: "green" as const,
      action: "直近で追客済みです。返信が来たら予約または相談へ進めてください。"
    };
  }

  if (!aiReady) {
    return {
      label: "素材不足",
      tone: "stone" as const,
      action: "提案画像に必要な写真同意、正面、横、後ろ写真がそろっているか確認してください。"
    };
  }

  return {
    label: "接客準備済み",
    tone: "green" as const,
    action: "来店時に提案画像とメニューを確認してください。"
  };
}

export default async function CustomerDetailPage({ params, searchParams }: CustomerDetailPageProps) {
  const customer = await prisma.customer.findFirst({
    where: {
      id: params.id,
      deletedAt: null
    },
    include: {
      preference: true,
      hairProfile: true,
      visits: {
        orderBy: { visitedAt: "desc" },
        take: 5
      },
      styleSuggestions: {
        where: { archivedAt: null },
        orderBy: { createdAt: "desc" },
        take: 10
      },
      courseRecommendations: {
        orderBy: { createdAt: "desc" },
        take: 10
      },
      contactLogs: {
        orderBy: { createdAt: "desc" },
        take: 6
      },
      appointments: {
        orderBy: { scheduledAt: "desc" },
        take: 8
      },
      serviceSales: {
        orderBy: { paidAt: "desc" },
        take: 8
      },
      proposalResponses: {
        orderBy: { createdAt: "desc" },
        take: 6,
        include: {
          suggestion: {
            select: {
              suggestedStyleName: true
            }
          }
        }
      }
    }
  });

  if (!customer) {
    notFound();
  }

  const createContactLogAction = createContactLog.bind(null, customer.id);
  const createAppointmentAction = createAppointment.bind(null, customer.id);
  const createCourseRecommendationAction = createCourseRecommendation.bind(null, customer.id);
  const createServiceSaleAction = createServiceSale.bind(null, customer.id);
  const createStyleSuggestionAction = createStyleSuggestion.bind(null, customer.id);
  const createVisitAction = createVisit.bind(null, customer.id);
  const deleteCustomerAction = deleteCustomer.bind(null, customer.id);
  const generateCourseRecommendations = generateCourseRecommendationsAction.bind(null, customer.id);
  const updateCustomerAction = updateCustomer.bind(null, customer.id);
  const latestVisit = customer.visits[0] ?? null;
  const latestVisitDays = daysSince(latestVisit?.visitedAt);
  const nextVisitDate = latestVisit ? addMonths(latestVisit.visitedAt, 2) : null;
  const latestContactLog = customer.contactLogs[0] ?? null;
  const latestProposalResponse = customer.proposalResponses[0] ?? null;
  const latestResponseConcerns = proposalMessageList(latestProposalResponse?.message, "相談したい不安");
  const latestResponseContactPreference = proposalMessageLine(latestProposalResponse?.message, "希望連絡方法");
  const latestResponseStylePriority = proposalMessageLine(latestProposalResponse?.message, "当日の優先順位");
  const latestResponseBudgetPreference = proposalMessageLine(latestProposalResponse?.message, "予算感");
  const latestResponsePricePlan = proposalMessageLine(latestProposalResponse?.message, "選んだ料金プラン");
  const latestResponseVisitTiming = proposalMessageLine(latestProposalResponse?.message, "来店希望時期");
  const latestResponseFinishBy = proposalMessageLine(latestProposalResponse?.message, "終了希望");
  const latestResponseDecisionBlocker = proposalMessageLine(latestProposalResponse?.message, "予約を迷う理由");
  const latestResponseAlternativeDate1 = proposalMessageLine(latestProposalResponse?.message, "第2希望日時");
  const latestResponseAlternativeDate2 = proposalMessageLine(latestProposalResponse?.message, "第3希望日時");
  const latestResponseUrgencyPreference = proposalMessageLine(latestProposalResponse?.message, "空き枠希望");
  const latestResponsePackageInterest = proposalMessageLine(latestProposalResponse?.message, "継続プラン相談");
  const latestResponseCourses = proposalMessageList(latestProposalResponse?.message, "相談したい追加メニュー");
  const latestResponseMemo = proposalFreeMemo(latestProposalResponse?.message);
  const upcomingAppointment =
    customer.appointments
      .filter((appointment) => appointment.scheduledAt.getTime() >= Date.now() && isActiveAppointmentStatus(appointment.status))
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())[0] ?? null;
  const upcomingAppointmentHours = hoursUntil(upcomingAppointment?.scheduledAt);
  const frontImageUrls = uniqueUrls([...parseJsonStringArray(customer.aiFrontImageUrlsJson), customer.aiFrontImageUrl]);
  const sideImageUrls = uniqueUrls([...parseJsonStringArray(customer.aiSideImageUrlsJson), customer.aiSideImageUrl]);
  const backImageUrls = uniqueUrls([...parseJsonStringArray(customer.aiBackImageUrlsJson), customer.aiBackImageUrl]);
  const frontCount = frontImageUrls.length;
  const sideCount = sideImageUrls.length;
  const backCount = backImageUrls.length;
  const aiReady = customer.aiPhotoConsent && frontCount >= 1 && sideCount >= 1 && backCount >= 1;
  const acceptedCourses = customer.courseRecommendations.filter((course) => course.accepted);
  const openCourses = customer.courseRecommendations.filter((course) => !course.accepted);
  const openCourseValue = priceSum(openCourses.map((course) => course.estimatedPrice));
  const totalServiceRevenue = priceSum(customer.serviceSales.map((sale) => sale.amount));
  const averageCustomerTicket =
    customer.serviceSales.length > 0 ? Math.round(totalServiceRevenue / customer.serviceSales.length) : 0;
  const latestSale = customer.serviceSales[0] ?? null;
  const latestSaleDays = daysSince(latestSale?.paidAt);
  const recentServiceRevenue = priceSum(
    customer.serviceSales
      .filter((sale) => Date.now() - sale.paidAt.getTime() <= 30 * 24 * 60 * 60 * 1000)
      .map((sale) => sale.amount)
  );
  const bestSuggestion =
    customer.styleSuggestions.find((suggestion) => suggestion.id === searchParams?.suggestionId) ??
    customer.styleSuggestions.find((suggestion) => suggestion.accepted) ??
    customer.styleSuggestions.find((suggestion) => suggestion.imageUrls.length > 0 || Boolean(suggestion.imageUrlsJson)) ??
    customer.styleSuggestions[0] ??
    null;
  const customerAppUrl = customerAppShareUrl(customer.id);
  const customerFeedbackUrl = feedbackShareUrl(customer.id);
  const customerCarePlanUrl = carePlanShareUrl(customer.id);
  const upcomingAppointmentConfirmationUrl = upcomingAppointment ? appointmentConfirmationUrl(upcomingAppointment.id) : null;
  const latestProposalReplyMessage =
    latestProposalResponse && bestSuggestion
      ? buildProposalResponseReplyMessage({
          customerName: customer.name,
          styleName: bestSuggestion.suggestedStyleName,
          intent: latestProposalResponse.intent,
          preferredDate: latestProposalResponse.preferredDate,
          concerns: latestResponseConcerns,
          selectedCourses: latestResponseCourses,
          stylePriority: latestResponseStylePriority,
          budgetPreference: latestResponseBudgetPreference,
          pricePlan: latestResponsePricePlan,
          visitTiming: latestResponseVisitTiming,
          finishBy: latestResponseFinishBy,
          decisionBlocker: latestResponseDecisionBlocker,
          alternativeDate1: latestResponseAlternativeDate1,
          alternativeDate2: latestResponseAlternativeDate2,
          urgencyPreference: latestResponseUrgencyPreference,
          packageInterest: latestResponsePackageInterest,
          freeMemo: latestResponseMemo
        })
      : null;
  const bestCourse = acceptedCourses[0] ?? openCourses[0] ?? null;
  const hasRecentContact =
    latestContactLog ? Date.now() - latestContactLog.createdAt.getTime() <= 14 * 24 * 60 * 60 * 1000 : false;
  const hasRecentAppointmentConfirmation = customer.contactLogs.some(
    (log) =>
      (log.outcome === "予約確認送信" || log.outcome === "予約確認返信") &&
      Date.now() - log.createdAt.getTime() <= 2 * 24 * 60 * 60 * 1000
  );
  const cancellationCount = customer.appointments.filter((appointment) => appointment.status === "キャンセル").length;
  const noShowCount = customer.appointments.filter((appointment) => appointment.status === "無断キャンセル").length;
  const appointmentValueForRisk = upcomingAppointment?.estimatedPrice ?? averageCustomerTicket;
  const appointmentRiskResult = appointmentRisk({
    appointment: upcomingAppointment,
    hours: upcomingAppointmentHours,
    value: appointmentValueForRisk,
    baselineTicket: averageCustomerTicket,
    cancellationCount,
    noShowCount,
    hasPhone: Boolean(customer.phone?.trim()),
    hasRecentConfirmation: hasRecentAppointmentConfirmation
  });
  const status = nextActionStatus({
    latestVisitDays,
    hasUpcomingAppointment: Boolean(upcomingAppointment),
    latestProposalIntent: latestProposalResponse?.intent,
    hasRecentContact,
    aiReady,
    openCourseValue
  });
  const contactTemplate = bestSuggestion
    ? `${customer.name}様\n前回の状態を踏まえて「${bestSuggestion.suggestedStyleName}」の提案をご用意しています。\n画像、予約確認、ホームケアはこちらから確認できます。\n${customerAppUrl}\n気になる点や予約希望日があれば、このままご返信ください。`
    : `${customer.name}様\n髪の状態に合わせて次回提案をご用意できます。\n相談・予約確認はこちらからできます。\n${customerAppUrl}`;
  const appointmentReminderTemplate = upcomingAppointment
    ? `${customer.name}様\nご予約の確認です。\n日時: ${formatDateTime(upcomingAppointment.scheduledAt)}\nメニュー: ${upcomingAppointment.menu ?? "当日相談"}\n変更や不安な点があれば、下記から送ってください。\n${upcomingAppointmentConfirmationUrl ?? ""}\n当日はお気をつけてお越しください。`
    : null;
  const needsAppointmentConfirmation =
    Boolean(upcomingAppointment) &&
    upcomingAppointmentHours !== null &&
    upcomingAppointmentHours >= 0 &&
    upcomingAppointmentHours <= 48 &&
    !hasRecentAppointmentConfirmation;
  const reviewRequestTemplate = latestSale
    ? `${customer.name}様\n先日はご来店ありがとうございました。\n今回の「${latestSale.title}」の仕上がりはいかがでしょうか。\n気になる点があれば遠慮なくご相談ください。\nよろしければ下記から仕上がりの感想や次回の目安も送ってください。\n${customerFeedbackUrl}\n次回の目安は${formatDate(nextVisitDate)}頃です。`
    : null;
  const needsReviewRequest = latestSaleDays !== null && latestSaleDays <= 7 && !hasRecentContact;
  const checkoutAnchorDate = upcomingAppointment?.scheduledAt ?? latestSale?.paidAt ?? latestVisit?.visitedAt ?? new Date();
  const checkoutNextVisitDate = nextVisitDate ?? addMonths(checkoutAnchorDate, 2);
  const checkoutBaseTicket = upcomingAppointment?.estimatedPrice ?? latestSale?.amount ?? bestCourse?.estimatedPrice ?? averageCustomerTicket;
  const checkoutRetailValue = 2800;
  const checkoutPackageValue = Math.max(checkoutBaseTicket || 0, 6000) * 3;
  const customerReferralUrl = intakeReferralUrl(customer.id, customer.name);
  const checkoutNextBookingMessage = `${customer.name}様\n本日はありがとうございました。\nきれいな状態を保つ目安として、次回は${formatDate(checkoutNextVisitDate)}頃がおすすめです。\n前髪・顔まわりや色持ちが気になる前に整えると、毎日の扱いやすさも保ちやすいです。\nご都合が合う候補日を一緒に仮押さえできます。`;
  const checkoutHomeCareMessage = `${customer.name}様\n今日の仕上がりを家でも保ちやすいように、乾かし方とホームケアを簡単にまとめます。\n髪の状態に合わせて、無理に増やさず必要なものだけご案内します。\n気になる場合はシャンプー・トリートメント・スタイリング剤の相性も確認できます。\nホームケアメモはこちらです。\n${customerCarePlanUrl}`;
  const checkoutPackageMessage = `${customer.name}様\n今回の仕上がりを安定して保つなら、3回分のメンテナンス目安も出せます。\n都度払いでも大丈夫ですが、周期と内容を先に決めると、根元・前髪・まとまりが崩れる前に整えやすくなります。\n料金と内容は必要な範囲だけ、施術前に毎回確認します。`;
  const checkoutReferralMessage = `${customer.name}様\nもし髪型やカラーで悩んでいるご友人がいれば、こちらの相談フォームを送っていただけます。\n紹介の方も、髪の悩み・希望・写真を先に確認してから無理なく提案します。\n${customerReferralUrl}`;
  const checkoutClosingCards = [
    {
      label: "次回予約",
      value: checkoutBaseTicket || averageCustomerTicket,
      help: `${formatDate(checkoutNextVisitDate)}頃の再来を提案`,
      message: checkoutNextBookingMessage,
      outcome: "会計時次回予約提案",
      nextAction: "候補日時を確認し、次回予約または仮予約を作成する",
      className: "border-teal-200 bg-teal-50 text-teal-900"
    },
    {
      label: "ホームケア",
      value: checkoutRetailValue,
      help: "家での扱いやすさと店販候補を提案",
      message: checkoutHomeCareMessage,
      outcome: "会計時ホームケア提案",
      nextAction: "必要なホームケア商品・乾かし方・使用量を案内する",
      className: "border-indigo-200 bg-indigo-50 text-indigo-900"
    },
    {
      label: "継続プラン",
      value: checkoutPackageValue,
      help: "3回分のメンテナンス目安を提案",
      message: checkoutPackageMessage,
      outcome: "会計時継続プラン提案",
      nextAction: "周期・料金・必要メニューを確認し、継続プラン候補を保存する",
      className: "border-violet-200 bg-violet-50 text-violet-900"
    },
    {
      label: "紹介",
      value: Math.round((checkoutBaseTicket || averageCustomerTicket || 0) * 0.25),
      help: "紹介フォームを案内",
      message: checkoutReferralMessage,
      outcome: "会計時紹介案内",
      nextAction: "紹介フォームの反応を確認し、紹介元へのお礼連絡を行う",
      className: "border-emerald-200 bg-emerald-50 text-emerald-900"
    }
  ];
  const preferredContactMessage = appointmentReminderTemplate ?? reviewRequestTemplate ?? latestContactLog?.message ?? contactTemplate;
  const imageGenerationDisabled = !customer.aiPhotoConsent || frontCount === 0 || sideCount === 0 || backCount === 0;
  const imageGenerationDisabledReason = !customer.aiPhotoConsent
    ? "お客様側の相談フォームで写真利用同意が必要です"
    : frontCount === 0 || sideCount === 0 || backCount === 0
      ? "正面・横・斜め後ろの参照写真が必要です"
      : undefined;

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/customers" className="inline-flex items-center gap-2 text-sm font-semibold text-teal-800 hover:text-teal-950">
          <ArrowLeft className="h-4 w-4" />
          顧客一覧へ戻る
        </Link>
        <span className="text-xs font-semibold text-stone-500">{customerCode(customer.id)}</span>
      </div>

      <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-semibold text-stone-950">{customer.name}</h1>
              <Pill tone={status.tone}>{status.label}</Pill>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-stone-600">
              <span className="inline-flex items-center gap-1">
                <UserRound className="h-4 w-4" />
                {customer.gender ?? "性別未登録"} / {customer.birthYear ?? "生年未登録"}
              </span>
              <span className="inline-flex items-center gap-1">
                <Phone className="h-4 w-4" />
                {customer.phone ?? "電話番号未登録"}
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-4 w-4" />
                最終来店 {formatDate(latestVisit?.visitedAt)}
              </span>
            </div>
            <div className="mt-4 inline-flex rounded border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-stone-700">
              {status.action}
            </div>
            {appointmentReminderTemplate ? (
              <div className={`mt-4 rounded-md border p-4 ${needsAppointmentConfirmation ? "border-amber-200 bg-amber-50" : "border-stone-200 bg-[#fbf8f3]"}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className={`text-sm font-semibold ${needsAppointmentConfirmation ? "text-amber-950" : "text-stone-950"}`}>
                    予約確認メッセージ
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <CopyTextButton text={appointmentReminderTemplate} label="文面コピー" />
                    {upcomingAppointmentHours !== null ? (
                      <span className={`rounded border px-2 py-1 text-[11px] font-semibold ${needsAppointmentConfirmation ? "border-amber-200 bg-white text-amber-800" : "border-stone-200 bg-white text-stone-600"}`}>
                        あと{upcomingAppointmentHours}時間
                      </span>
                    ) : null}
                    {upcomingAppointment ? (
                      <span className={`rounded border px-2 py-1 text-[11px] font-semibold ${appointmentRiskClass(appointmentRiskResult.score)}`}>
                        予約リスク {appointmentRiskResult.label} {appointmentRiskResult.score}
                      </span>
                    ) : null}
                  </div>
                </div>
                {appointmentRiskResult.reasons.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {appointmentRiskResult.reasons.map((reason) => (
                      <span key={reason} className="rounded border border-amber-200 bg-white px-2 py-1 text-[11px] font-semibold text-amber-800">
                        {reason}
                      </span>
                    ))}
                  </div>
                ) : null}
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-semibold text-stone-600">文面</summary>
                  <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-stone-700">{appointmentReminderTemplate}</p>
                </details>
              </div>
            ) : null}
            {reviewRequestTemplate ? (
              <div className={`mt-4 rounded-md border p-4 ${needsReviewRequest ? "border-emerald-200 bg-emerald-50" : "border-stone-200 bg-[#fbf8f3]"}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className={`text-sm font-semibold ${needsReviewRequest ? "text-emerald-950" : "text-stone-950"}`}>
                    来店後フォロー・レビュー依頼
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <CopyTextButton text={reviewRequestTemplate} label="文面コピー" />
                    {latestSaleDays !== null ? (
                      <span className={`rounded border px-2 py-1 text-[11px] font-semibold ${needsReviewRequest ? "border-emerald-200 bg-white text-emerald-800" : "border-stone-200 bg-white text-stone-600"}`}>
                        会計から{latestSaleDays}日
                      </span>
                    ) : null}
                  </div>
                </div>
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-semibold text-stone-600">文面</summary>
                  <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-stone-700">{reviewRequestTemplate}</p>
                </details>
              </div>
            ) : null}
          </div>
          <div className="grid min-w-[220px] gap-2 text-sm">
            <div className="grid gap-2 rounded-md border border-teal-200 bg-teal-50 p-2">
              <Link
                href={`/app/${customer.id}`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-teal-900 px-4 font-semibold text-white shadow-sm hover:bg-teal-950"
              >
                <Sparkles className="h-4 w-4" />
                お客様アプリ
              </Link>
              <CopyTextButton text={customerAppUrl} label="アプリURLコピー" className="border-teal-200 bg-white text-teal-900" />
            </div>
            <Link
              href={bestSuggestion ? `/proposals/${bestSuggestion.id}` : "#suggestions"}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-teal-900 px-4 font-semibold text-white shadow-sm hover:bg-teal-950"
            >
              <Sparkles className="h-4 w-4" />
              提案ページを開く
            </Link>
            <Link
              href="#contact-form"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-stone-200 bg-stone-50 px-4 font-semibold text-stone-800 hover:bg-stone-100"
            >
              <MessageCircle className="h-4 w-4" />
              追客を記録
            </Link>
            <Link
              href={customerFeedbackUrl}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 font-semibold text-emerald-900 hover:bg-emerald-100"
            >
              <CheckCircle2 className="h-4 w-4" />
              仕上がり確認ページ
            </Link>
            <Link
              href={customerCarePlanUrl}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-indigo-200 bg-indigo-50 px-4 font-semibold text-indigo-900 hover:bg-indigo-100"
            >
              <ClipboardList className="h-4 w-4" />
              ホームケアメモ
            </Link>
            {upcomingAppointmentConfirmationUrl ? (
              <Link
                href={upcomingAppointmentConfirmationUrl}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 font-semibold text-amber-900 hover:bg-amber-100"
              >
                <CalendarDays className="h-4 w-4" />
                予約確認ページ
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-stone-500">次回来店目安</p>
          <p className="mt-2 text-xl font-semibold text-stone-950">{formatDate(nextVisitDate)}</p>
          <p className="mt-2 hidden text-xs text-stone-500 md:block">{latestVisitDays === null ? "来店履歴なし" : `前回来店から${latestVisitDays}日`}</p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-stone-500">次回予約</p>
          <p className="mt-2 text-xl font-semibold text-stone-950">{upcomingAppointment ? formatDate(upcomingAppointment.scheduledAt) : "未設定"}</p>
          <p className="mt-2 hidden text-xs text-stone-500 md:block">{upcomingAppointment?.menu ?? "予約枠なし"}</p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-stone-500">写真素材</p>
          <p className="mt-2 text-xl font-semibold text-stone-950">{aiReady ? "準備済み" : "不足あり"}</p>
          <p className="mt-2 hidden text-xs text-stone-500 md:block">
            正面{Math.min(frontCount, 1)} / 横{Math.min(sideCount, 1)} / 後ろ{Math.min(backCount, 1)}
          </p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-stone-500">未採用メニュー</p>
          <p className="mt-2 text-xl font-semibold text-stone-950">{openCourseValue.toLocaleString("ja-JP")}円</p>
          <p className="mt-2 hidden text-xs text-stone-500 md:block">{openCourses.length}件</p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-stone-500">直近30日売上</p>
          <p className="mt-2 text-xl font-semibold text-stone-950">{recentServiceRevenue.toLocaleString("ja-JP")}円</p>
          <p className="mt-2 hidden text-xs text-stone-500 md:block">累計 {totalServiceRevenue.toLocaleString("ja-JP")}円</p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-stone-500">提案反応</p>
          <p className="mt-2 text-xl font-semibold text-stone-950">{latestProposalResponse?.intent ?? "未返信"}</p>
          <p className="mt-2 hidden text-xs text-stone-500 md:block">{latestProposalResponse ? formatDate(latestProposalResponse.createdAt) : "共有ページ反応なし"}</p>
        </div>
      </section>

      <details className="rounded-lg border border-teal-200 bg-white p-4 shadow-sm">
        <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-teal-950">
            <ClipboardList className="h-4 w-4" />
            来店前ブリーフ
          </span>
          <span className={`rounded border px-3 py-2 text-xs font-semibold ${statusClass(status.tone)}`}>
            {status.label}
          </span>
        </summary>
        <div className="mt-4 grid gap-3 lg:grid-cols-4">
          <div className="rounded-md border border-stone-200 bg-[#fbf8f3] p-4">
            <p className="text-xs font-semibold text-stone-500">予約・本日の入口</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-stone-950">
              {upcomingAppointment ? `${formatDateTime(upcomingAppointment.scheduledAt)} / ${upcomingAppointment.menu ?? "当日相談"}` : "次回予約は未設定"}
            </p>
            <p className="mt-2 text-xs leading-5 text-stone-600">
              {latestProposalResponse ? `提案反応: ${latestProposalResponse.intent}` : "提案ページの返信はまだありません。"}
            </p>
          </div>
          <div className="rounded-md border border-red-100 bg-red-50 p-4">
            <p className="text-xs font-semibold text-red-700">必ず避けること</p>
            <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-red-900">
              {customer.preference?.dislikes ?? "NG条件は未登録です。カウンセリングで確認してください。"}
            </p>
            <p className="mt-2 text-xs leading-5 text-red-800">
              好み: {customer.preference?.preferredLength ?? "未登録"} / {customer.preference?.preferredStyle ?? "未登録"}
            </p>
          </div>
          <div className="rounded-md border border-stone-200 bg-[#fbf8f3] p-4">
            <p className="text-xs font-semibold text-stone-500">前回施術・反応</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-stone-950">
              {latestVisit ? `${formatDate(latestVisit.visitedAt)} ${latestVisit.performedStyle ?? ""}` : "来店履歴なし"}
            </p>
            <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs leading-5 text-stone-600">
              {latestVisit?.customerReaction ?? latestVisit?.cutNotes ?? latestVisit?.colorNotes ?? "前回反応や施術メモは未登録です。"}
            </p>
          </div>
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold text-amber-800">単価アップ候補</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-stone-950">
              {bestCourse ? bestCourse.title : "追加メニュー候補なし"}
            </p>
            <p className="mt-2 text-xs leading-5 text-amber-900">
              {bestCourse?.estimatedPrice ? `${bestCourse.estimatedPrice.toLocaleString("ja-JP")}円` : "金額未設定"}
              {bestCourse?.estimatedMinutes ? ` / 約${bestCourse.estimatedMinutes}分` : ""}
            </p>
          </div>
        </div>
        {latestProposalResponse ? (
          <div className="mt-3 rounded-md border border-teal-200 bg-teal-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-teal-800">提案返信からの接客ToDo</p>
              <div className="flex flex-wrap items-center gap-2">
                {latestProposalReplyMessage ? <CopyTextButton text={latestProposalReplyMessage} label="返信文面コピー" /> : null}
                <span className="rounded border border-teal-200 bg-white px-2 py-1 text-[11px] font-semibold text-teal-900">
                  {latestProposalResponse.status}
                </span>
              </div>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-4">
              <div className="rounded-md border border-teal-100 bg-white p-3">
                <p className="text-xs font-semibold text-stone-500">先に答える不安</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {latestResponseConcerns.length > 0 ? latestResponseConcerns.map((concern) => <Pill key={concern} tone="amber">{concern}</Pill>) : <Pill>未選択</Pill>}
                </div>
              </div>
              <div className="rounded-md border border-teal-100 bg-white p-3">
                <p className="text-xs font-semibold text-stone-500">希望連絡方法</p>
                <p className="mt-2 text-sm font-semibold text-stone-950">{latestResponseContactPreference ?? "おまかせ"}</p>
            </div>
              <div className="rounded-md border border-teal-100 bg-white p-3">
                <p className="text-xs font-semibold text-stone-500">調整条件</p>
                <div className="mt-2 grid gap-1 text-xs leading-5 text-stone-700">
                  <p>優先: {latestResponseStylePriority ?? "未選択"}</p>
                  <p>予算: {latestResponseBudgetPreference ?? "未選択"}</p>
                  <p>料金プラン: {latestResponsePricePlan ?? "未選択"}</p>
                  <p>時期: {latestResponseVisitTiming ?? "未選択"}</p>
                  <p>終了: {latestResponseFinishBy ?? "未選択"}</p>
                  <p>迷い: {latestResponseDecisionBlocker ?? "未選択"}</p>
                  <p>第2希望: {latestResponseAlternativeDate1 ?? "未選択"}</p>
                  <p>第3希望: {latestResponseAlternativeDate2 ?? "未選択"}</p>
                  <p>空き枠: {latestResponseUrgencyPreference ?? "未選択"}</p>
                  <p>継続プラン: {latestResponsePackageInterest ?? "未選択"}</p>
                </div>
              </div>
              <div className="rounded-md border border-teal-100 bg-white p-3">
                <p className="text-xs font-semibold text-stone-500">追加相談</p>
                <div className="mt-2 grid gap-1 text-xs leading-5 text-stone-700">
                  {latestResponseCourses.length > 0 ? latestResponseCourses.map((course) => <p key={course}>{course}</p>) : <p>追加メニュー選択なし</p>}
                  {latestResponseMemo ? <p className="whitespace-pre-wrap text-stone-500">{latestResponseMemo}</p> : null}
                </div>
              </div>
            </div>
            {latestProposalReplyMessage ? (
              <details className="mt-3 rounded-md border border-teal-100 bg-white p-3">
                <summary className="cursor-pointer text-xs font-semibold text-stone-500">返信文面</summary>
                <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-stone-700">{latestProposalReplyMessage}</p>
              </details>
            ) : null}
          </div>
        ) : null}
        <div className="mt-3 rounded-md border border-stone-200 bg-white p-4">
          <p className="text-xs font-semibold text-stone-500">接客で使う一言</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-700">
            {bestSuggestion
              ? `前回の状態を踏まえて「${bestSuggestion.suggestedStyleName}」を軸にご提案します。苦手な印象を避けながら、${bestCourse ? `相性の良い「${bestCourse.title}」も必要性だけ確認します。` : "当日の髪の状態を見てメニューを相談します。"}`
              : "好み、NG条件、朝の扱いやすさを確認してから、無理のない提案に進めます。"}
          </p>
        </div>
      </details>

      <Tabs defaultValue="proposal" className="grid gap-5">
        <TabsList className="sticky top-16 z-10 bg-white/95 shadow-sm backdrop-blur">
          <TabsTrigger value="proposal">提案</TabsTrigger>
          <TabsTrigger value="menu">メニュー</TabsTrigger>
          <TabsTrigger value="karte">写真</TabsTrigger>
          <TabsTrigger value="actions">操作</TabsTrigger>
          <TabsTrigger value="history">履歴</TabsTrigger>
        </TabsList>

        <TabsContent value="proposal" className="mt-0 grid gap-5">
          <section id="suggestions" className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-900">
                  <Sparkles className="h-4 w-4" />
                  提案
                </div>
                <h2 className="mt-3 text-xl font-semibold text-stone-950">提案画像</h2>
              </div>
              {bestSuggestion ? (
                <Link href={`/proposals/${bestSuggestion.id}`} className="inline-flex h-10 items-center gap-2 rounded-md border border-stone-200 bg-stone-50 px-4 text-sm font-semibold text-stone-800 hover:bg-stone-100">
                  共有ページ
                  <ChevronRight className="h-4 w-4" />
                </Link>
              ) : null}
            </div>
            <StyleSuggestionGenerator customerId={customer.id} hasVisibleSuggestions={customer.styleSuggestions.length > 0} />
            <div className="mt-4">
              <StyleSuggestionSelector
                customerId={customer.id}
                suggestions={customer.styleSuggestions.map((suggestion) => ({
                  ...suggestion,
                  createdAt: suggestion.createdAt.toISOString(),
                  archivedAt: suggestion.archivedAt ? suggestion.archivedAt.toISOString() : null,
                  visit: null
                }))}
                hasAiReferencePhotos={frontCount >= 1 && sideCount >= 1 && backCount >= 1}
                hasAiPhotoConsent={customer.aiPhotoConsent}
                isStyleImageGenerationEnabled={process.env.ENABLE_STYLE_IMAGE_GENERATION === "true"}
                initialSelectedSuggestionId={searchParams?.suggestionId}
              />
            </div>
            <details className="mt-4 rounded-md border border-stone-200 bg-stone-50 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-stone-800">
                スタッフ用の手動提案・一覧
              </summary>
              <form action={createStyleSuggestionAction} className="mt-3 grid gap-4 rounded-md border border-teal-200 bg-teal-50 p-4">
              <div>
                <h3 className="text-sm font-semibold text-teal-950">スタッフ提案を追加</h3>
              </div>
              {latestVisit ? <input type="hidden" name="visitId" value={latestVisit.id} /> : null}
              <div className="grid gap-4 md:grid-cols-2">
                <TextField label="スタイル名" name="suggestedStyleName" placeholder="例: 顔まわりレイヤーボブ" required />
                <SelectField label="提案ラベル" name="label" options={["スタッフ提案", "本命提案", "扱いやすさ重視", "印象チェンジ", "メンテナンス重視"]} />
                <TextField label="メニュー候補" name="menuSuggestion" placeholder="例: カット + 顔まわり調整 + 艶トリートメント" />
                <TextField label="目安時間" name="estimatedMinutes" type="number" placeholder="例: 120" />
              </div>
              <TextAreaField label="提案理由" name="reason" placeholder="骨格、髪質、前回反応、好みに合わせてなぜ似合うかを残す" required />
              <TextAreaField label="注意点" name="caution" placeholder="避ける長さ、苦手な質感、薬剤履歴、朝のセット負担など" />
              <TextAreaField label="スタイリングアドバイス" name="stylingAdvice" placeholder="乾かし方、アイロンの入れ方、スタイリング剤の量など" />
              <TextAreaField label="画像生成メモ" name="imagePrompt" placeholder="前髪、顔まわり、毛先、カラーの見せ方など画像生成に反映したい要点" />
              <div className="grid gap-4 md:grid-cols-2">
                <SelectField label="メンテナンス" name="maintenanceLevel" options={["低め", "標準", "高めでも可"]} />
                <label className="flex items-center gap-2 pt-7 text-sm font-semibold text-stone-700">
                  <input name="accepted" type="checkbox" className="h-4 w-4 rounded border-stone-300 text-teal-700" />
                  本命提案として扱う
                </label>
              </div>
              <SubmitButton>スタッフ提案を保存</SubmitButton>
              </form>
              <div className="mt-4 grid gap-3">
              {customer.styleSuggestions.map((suggestion) => (
                <article key={suggestion.id} className="rounded-md border border-stone-200 bg-[#fbf8f3] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-stone-950">{suggestion.suggestedStyleName}</h3>
                        {suggestion.accepted ? <Pill tone="green">採用済み</Pill> : <Pill>提案中</Pill>}
                        {suggestion.label ? <Pill tone="amber">{suggestion.label}</Pill> : null}
                      </div>
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-stone-700">{suggestion.reason ?? "提案理由は未登録です。"}</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <form action={updateStyleSuggestionAccepted.bind(null, customer.id, suggestion.id, !suggestion.accepted)}>
                        <button type="submit" className="text-xs font-semibold text-teal-800 hover:text-teal-950">
                          {suggestion.accepted ? "本命解除" : "本命にする"}
                        </button>
                      </form>
                      <Link href={`/proposals/${suggestion.id}`} className="text-xs font-semibold text-teal-800 hover:text-teal-950">
                        共有ページ
                      </Link>
                      <Link href={`/customers/${customer.id}?suggestionId=${suggestion.id}`} className="text-xs font-semibold text-teal-800 hover:text-teal-950">
                        詳細へ
                      </Link>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-stone-600">
                    {suggestion.menuSuggestion ? <Pill>{suggestion.menuSuggestion}</Pill> : null}
                    {suggestion.estimatedMinutes ? <Pill>約{suggestion.estimatedMinutes}分</Pill> : null}
                    {suggestion.maintenanceLevel ? <Pill>メンテナンス: {suggestion.maintenanceLevel}</Pill> : null}
                    {(suggestion.imageUrls.length > 0 || suggestion.imageUrlsJson) ? <Pill tone="green">画像あり</Pill> : <Pill tone="stone">画像未生成</Pill>}
                  </div>
                  <div className="mt-4">
                    <StyleSuggestionImageGenerator
                      styleSuggestionId={suggestion.id}
                      customerId={customer.id}
                      disabled={imageGenerationDisabled}
                      disabledReason={imageGenerationDisabledReason}
                    />
                  </div>
                </article>
              ))}
              {customer.styleSuggestions.length === 0 ? (
                <p className="rounded-md border border-dashed border-stone-300 bg-[#fbf8f3] p-4 text-sm text-stone-600">
                  髪型提案はまだありません。顧客情報と写真をそろえると、提案作成に進めます。
                </p>
              ) : null}
              </div>
            </details>
          </section>

        </TabsContent>

        <TabsContent value="menu" className="mt-0 grid gap-5">
          <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
                  <BadgeDollarSign className="h-4 w-4" />
                  追加メニュー提案
                </div>
                <h2 className="mt-3 text-xl font-semibold text-stone-950">単価アップ候補</h2>
              </div>
              <form action={generateCourseRecommendations}>
                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center rounded-md border border-amber-200 bg-amber-50 px-4 text-sm font-semibold text-amber-900 hover:bg-amber-100"
                >
                  コース提案を作成
                </button>
              </form>
            </div>

            <form action={createCourseRecommendationAction} className="mt-4 grid gap-4 rounded-md border border-amber-200 bg-amber-50 p-4">
              <div>
                <h3 className="text-sm font-semibold text-amber-950">スタッフ提案を追加</h3>
              </div>
              {latestVisit ? <input type="hidden" name="visitId" value={latestVisit.id} /> : null}
              <div className="grid gap-4 md:grid-cols-2">
                <TextField label="提案名" name="title" placeholder="例: 集中補修トリートメント" required />
                <SelectField label="優先度" name="priority" options={["高優先", "標準", "低め", "店販候補"]} />
                <TextField label="見込み金額" name="estimatedPrice" type="number" placeholder="例: 6600" />
                <TextField label="所要時間" name="estimatedMinutes" type="number" placeholder="例: 30" />
              </div>
              <TextAreaField label="提案理由" name="reason" placeholder="前回カラー後の乾燥が強く、まとまりを出すため" required />
              <TextAreaField label="注意点" name="caution" placeholder="予算、時間、薬剤履歴、苦手な質感など" />
              <label className="flex items-center gap-2 text-sm font-semibold text-stone-700">
                <input name="accepted" type="checkbox" className="h-4 w-4 rounded border-stone-300 text-amber-700" />
                すぐ採用候補にする
              </label>
              <SubmitButton>スタッフ提案を保存</SubmitButton>
            </form>

            <div className="mt-4 grid gap-3">
              {customer.courseRecommendations.map((course) => (
                <article key={course.id} className={`rounded-md border p-4 ${course.accepted ? "border-emerald-200 bg-emerald-50" : "border-stone-200 bg-[#fbf8f3]"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-stone-950">{course.title}</h3>
                        {course.priority ? <Pill tone={course.priority.includes("高") ? "red" : "amber"}>{course.priority}</Pill> : null}
                        {course.accepted ? <Pill tone="green">採用候補</Pill> : <Pill>未採用</Pill>}
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-700">{course.reason}</p>
                      {course.caution ? <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-red-700">注意: {course.caution}</p> : null}
                    </div>
                    <div className="grid min-w-[150px] gap-1 text-right text-sm">
                      {course.estimatedPrice ? <p className="font-semibold text-stone-950">{course.estimatedPrice.toLocaleString("ja-JP")}円</p> : null}
                      {course.estimatedMinutes ? <p className="text-xs text-stone-500">約{course.estimatedMinutes}分</p> : null}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <form action={toggleCourseRecommendationAccepted.bind(null, course.id, customer.id)}>
                      <button
                        type="submit"
                        className="inline-flex h-9 items-center justify-center rounded-md border border-teal-200 bg-white px-3 text-xs font-semibold text-teal-900 hover:bg-teal-50"
                      >
                        {course.accepted ? "採用候補から外す" : "採用候補にする"}
                      </button>
                    </form>
                    <form action={createAppointmentAction} className="flex flex-wrap gap-2">
                      <input type="hidden" name="scheduledAt" value={inputDateTime(nextVisitDate ?? new Date())} />
                      <input type="hidden" name="menu" value={course.title} />
                      <input type="hidden" name="estimatedPrice" value={course.estimatedPrice ?? ""} />
                      <input type="hidden" name="status" value="仮予約" />
                      <input type="hidden" name="source" value="コース提案" />
                      <input type="hidden" name="note" value={course.reason} />
                      <button
                        type="submit"
                        className="inline-flex h-9 items-center justify-center rounded-md border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                      >
                        このコースで仮予約
                      </button>
                    </form>
                    <form action={createServiceSaleAction}>
                      <input type="hidden" name="title" value={course.title} />
                      <input type="hidden" name="amount" value={course.estimatedPrice ?? 0} />
                      <input type="hidden" name="source" value="コース提案" />
                      <input type="hidden" name="note" value={course.reason} />
                      <button
                        type="submit"
                        className="inline-flex h-9 items-center justify-center rounded-md bg-teal-900 px-3 text-xs font-semibold text-white hover:bg-teal-950"
                      >
                        売上に記録
                      </button>
                    </form>
                  </div>
                </article>
              ))}
              {customer.courseRecommendations.length === 0 ? (
                <p className="rounded-md border border-dashed border-stone-300 bg-[#fbf8f3] p-4 text-sm text-stone-600">
                  追加メニュー提案はまだありません。
                </p>
              ) : null}
            </div>
          </section>

        </TabsContent>

        <TabsContent value="karte" className="mt-0 grid gap-5">
          <section className="grid gap-5">
            <AiReferencePhotoUploader
              frontImageUrls={frontImageUrls}
              sideImageUrls={sideImageUrls}
              backImageUrls={backImageUrls}
              consent={customer.aiPhotoConsent}
            />
            <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-950">
                <Scissors className="h-5 w-5 text-teal-800" />
                好み・髪質情報
              </h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                お客様側で回答された内容を表示します。店側では編集せず、必要な確認だけ行います。
              </p>
              <div className="mt-5 grid gap-5 xl:grid-cols-2">
                <section className="grid gap-4 rounded-md border border-stone-200 bg-[#fbf8f3] p-4">
                  <h3 className="text-sm font-semibold text-stone-950">好み・NG条件</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <ReadOnlyField label="好きな長さ" value={customer.preference?.preferredLength} />
                    <ReadOnlyField label="好きな雰囲気" value={customer.preference?.preferredStyle} />
                    <ReadOnlyField label="カラーの好み" value={customer.preference?.colorPreference} />
                    <ReadOnlyField label="メンテナンス許容度" value={customer.preference?.maintenanceLevel} />
                  </div>
                  <ReadOnlyField label="避けたい条件" value={customer.preference?.dislikes} />
                  <ReadOnlyField label="参考メモ" value={customer.preference?.referenceNotes} />
                </section>

                <section className="grid gap-4 rounded-md border border-stone-200 bg-[#fbf8f3] p-4">
                  <h3 className="text-sm font-semibold text-stone-950">髪質・骨格</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <ReadOnlyField label="髪の太さ" value={customer.hairProfile?.hairThickness} />
                    <ReadOnlyField label="髪量" value={customer.hairProfile?.hairVolume} />
                    <ReadOnlyField label="髪質" value={customer.hairProfile?.hairTexture} />
                    <ReadOnlyField label="頭皮状態" value={customer.hairProfile?.scalpCondition} />
                    <ReadOnlyField label="顔型" value={customer.hairProfile?.faceShape} />
                    <ReadOnlyField label="額・前髪" value={customer.hairProfile?.forehead} />
                    <ReadOnlyField
                      label="朝のスタイリング時間"
                      value={
                        typeof customer.hairProfile?.stylingTimeMinutes === "number"
                          ? `${customer.hairProfile.stylingTimeMinutes}分`
                          : undefined
                      }
                    />
                  </div>
                  <ReadOnlyField label="生活習慣・扱い方" value={customer.hairProfile?.lifestyle} />
                </section>
              </div>
            </div>
            <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-950">
                <ClipboardList className="h-5 w-5 text-teal-800" />
                来店履歴
              </h2>
              <div className="mt-4 grid gap-3 text-sm">
                {customer.visits.map((visit) => (
                  <div key={visit.id} className="rounded-md border border-stone-200 bg-[#fbf8f3] p-3">
                    <p className="font-semibold text-stone-950">{formatDate(visit.visitedAt)} {visit.performedStyle ?? ""}</p>
                    <p className="mt-1 text-xs text-stone-500">担当: {visit.stylistName ?? "未入力"}</p>
                    <div className="mt-2 grid gap-1 text-xs leading-5 text-stone-700">
                      {visit.requestedStyle ? <p>希望: {visit.requestedStyle}</p> : null}
                      {visit.cutNotes ? <p>カット: {visit.cutNotes}</p> : null}
                      {visit.colorNotes ? <p>カラー: {visit.colorNotes}</p> : null}
                      {visit.permNotes ? <p>質感: {visit.permNotes}</p> : null}
                      {visit.customerReaction ? <p>反応: {visit.customerReaction}</p> : null}
                      <p className="font-semibold text-teal-800">次回: {visit.nextRecommendation ?? "次回提案は未登録です。"}</p>
                    </div>
                  </div>
                ))}
                {customer.visits.length === 0 ? <p className="text-sm text-stone-500">来店履歴はまだありません。</p> : null}
              </div>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="actions" className="mt-0 grid gap-4 xl:grid-cols-2">
          <section className="rounded-lg border border-red-200 bg-white p-4 shadow-sm xl:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-red-800">
                  <Trash2 className="h-4 w-4" />
                  顧客情報の削除
                </h2>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  この顧客を削除すると、顧客一覧とお客様アプリから表示されなくなります。施術履歴などの関連データは復旧や確認のためDB上に保持されます。
                </p>
              </div>
              <span className="rounded border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-800">
                論理削除
              </span>
            </div>
            <form action={deleteCustomerAction} className="mt-4 grid gap-3 rounded-md border border-red-100 bg-red-50 p-4">
              <label className="flex items-start gap-2 text-sm font-semibold leading-6 text-red-900">
                <input
                  type="checkbox"
                  name="confirmDelete"
                  value="yes"
                  required
                  className="mt-1 h-4 w-4 rounded border-red-300 text-red-700"
                />
                {customer.name}さんの顧客情報を削除することを確認しました。
              </label>
              <button
                type="submit"
                className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md bg-red-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-red-800"
              >
                <Trash2 className="h-4 w-4" />
                顧客情報を削除
              </button>
            </form>
          </section>
        </TabsContent>

        <TabsContent value="history" className="mt-0 grid gap-5">
          <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-950">
              <UserRound className="h-4 w-4 text-teal-700" />
              基本情報を更新
            </h2>
            <form action={updateCustomerAction} className="mt-4 grid gap-3">
              <TextField label="名前" name="name" value={customer.name} required />
              <SelectField label="性別" name="gender" value={customer.gender} options={genderOptions} />
              <TextField label="生年" name="birthYear" type="number" value={customer.birthYear} />
              <TextField label="電話番号" name="phone" value={customer.phone} />
              <TextAreaField label="メモ" name="memo" value={customer.memo} />
              <SubmitButton>基本情報を保存</SubmitButton>
            </form>
          </section>

          <section className="rounded-lg border border-amber-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-950">
                  <BadgeDollarSign className="h-4 w-4 text-amber-700" />
                  会計時クロージング
                </h2>
              </div>
              <span className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                見込み {priceSum(checkoutClosingCards.map((card) => card.value)).toLocaleString("ja-JP")}円
              </span>
            </div>
            <div className="mt-4 grid gap-3 xl:grid-cols-2">
              {checkoutClosingCards.map((card) => (
                <article key={card.label} className={`rounded-md border p-4 ${card.className}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold">{card.label}</h3>
                      <p className="mt-1 hidden text-xs leading-5 md:block">{card.help}</p>
                    </div>
                    <span className="rounded border border-white/80 bg-white px-2 py-1 text-[11px] font-semibold text-stone-700">
                      {card.value.toLocaleString("ja-JP")}円
                    </span>
                  </div>
                  <details className="mt-3 rounded-md bg-white/80 p-3">
                    <summary className="cursor-pointer text-xs font-semibold text-stone-600">文面</summary>
                    <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-stone-700">{card.message}</p>
                  </details>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <CopyTextButton text={card.message} label="文面コピー" />
                    <form action={createContactLogAction}>
                      <input type="hidden" name="channel" value="店内" />
                      <input type="hidden" name="purpose" value="会計時クロージング" />
                      <input type="hidden" name="message" value={card.message} />
                      <input type="hidden" name="outcome" value={card.outcome} />
                      <input type="hidden" name="nextAction" value={card.nextAction} />
                      <button
                        type="submit"
                        className="inline-flex h-9 items-center rounded-md border border-white bg-white px-3 text-xs font-semibold text-stone-800 hover:bg-stone-50"
                      >
                        実施ログを残す
                      </button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section id="contact-form" className="rounded-lg border border-teal-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-950">
                <MessageCircle className="h-4 w-4 text-teal-700" />
                追客を記録
              </h2>
              <CopyTextButton text={preferredContactMessage} label="入力文面をコピー" />
            </div>
            <form action={createContactLogAction} className="mt-4 grid gap-3">
              <SelectField label="チャネル" name="channel" options={["LINE", "電話", "SMS", "メール", "店頭"]} />
              <SelectField label="目的" name="purpose" options={["次回予約", "髪型提案", "コース提案", "来店後フォロー", "確認"]} />
              <TextAreaField
                label="送信・会話内容"
                name="message"
                value={preferredContactMessage}
                required
              />
              <SelectField label="結果" name="outcome" options={["予約確認送信", "送信済み", "返信待ち", "予約相談", "予約確定", "保留"]} />
              <TextField label="次回フォロー予定" name="scheduledFollowUp" type="datetime-local" />
              <TextAreaField
                label="次アクション"
                name="nextAction"
                value={
                  needsAppointmentConfirmation
                    ? "予約確認メッセージを送り、変更有無を確認する"
                    : needsReviewRequest
                      ? "来店後フォローとレビュー依頼を送り、次回予約のきっかけを作る"
                      : status.action
                }
              />
              <SubmitButton>追客ログを保存</SubmitButton>
            </form>
          </section>

          <section className="rounded-lg border border-teal-200 bg-white p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-950">
              <ClipboardList className="h-4 w-4 text-teal-700" />
              施術記録を追加
            </h2>
            <form action={createVisitAction} className="mt-4 grid gap-3">
              <TextField label="来店日" name="visitedAt" type="date" value={new Date().toISOString().slice(0, 10)} required />
              <TextField label="担当者" name="stylistName" placeholder="例: 佐藤" />
              <TextAreaField label="希望スタイル" name="requestedStyle" value={bestSuggestion?.suggestedStyleName ?? ""} />
              <TextAreaField label="実施スタイル" name="performedStyle" value={upcomingAppointment?.menu ?? bestSuggestion?.menuSuggestion ?? ""} />
              <TextAreaField label="カットメモ" name="cutNotes" placeholder="長さ、レイヤー、前髪、量感調整など" />
              <TextAreaField label="カラーメモ" name="colorNotes" placeholder="薬剤、明度、色味、白髪ぼかし、退色の注意など" />
              <TextAreaField label="パーマ・質感メモ" name="permNotes" placeholder="パーマ、縮毛、トリートメント、ダメージ状態など" />
              <TextAreaField label="お客様の反応" name="customerReaction" placeholder="喜んだ点、不安点、次回相談したいことなど" />
              <TextAreaField label="次回提案" name="nextRecommendation" value={bestCourse?.title ?? bestSuggestion?.menuSuggestion ?? ""} />
              <SubmitButton>施術記録を保存</SubmitButton>
            </form>
          </section>

          <section className="rounded-lg border border-teal-200 bg-white p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-950">
              <CalendarDays className="h-4 w-4 text-teal-700" />
              予約メモを作成
            </h2>
            <form action={createAppointmentAction} className="mt-4 grid gap-3">
              <TextField label="予約日時" name="scheduledAt" type="datetime-local" value={inputDateTime(nextVisitDate ?? new Date())} required />
              <TextField label="メニュー" name="menu" value={bestCourse?.title ?? bestSuggestion?.menuSuggestion ?? ""} />
              <TextField label="見込み金額" name="estimatedPrice" type="number" value={bestCourse?.estimatedPrice ?? undefined} />
              <SelectField label="状態" name="status" options={["仮予約", "予約確定", "来店済み", "キャンセル", "無断キャンセル"]} />
              <SelectField label="きっかけ" name="source" options={["画像提案", "追客", "店頭", "電話", "LINE"]} />
              <TextAreaField label="予約メモ" name="note" value={bestSuggestion?.suggestedStyleName ?? ""} />
              <SubmitButton>予約メモを保存</SubmitButton>
            </form>
          </section>

          <section className="rounded-lg border border-teal-200 bg-white p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-950">
              <BadgeDollarSign className="h-4 w-4 text-teal-700" />
              売上を記録
            </h2>
            <form action={createServiceSaleAction} className="mt-4 grid gap-3">
              <label className="grid gap-1 text-sm font-medium text-stone-700">
                紐づける予約
                <select
                  name="appointmentId"
                  defaultValue={upcomingAppointment?.id ?? ""}
                  className="h-11 rounded-md border border-stone-200 bg-white px-3 text-stone-950 shadow-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                >
                  <option value="">予約に紐づけない</option>
                  {customer.appointments.map((appointment) => (
                    <option key={appointment.id} value={appointment.id}>
                      {formatDateTime(appointment.scheduledAt)} {appointment.menu ?? ""}
                    </option>
                  ))}
                </select>
              </label>
              <TextField label="売上名" name="title" value={bestCourse?.title ?? upcomingAppointment?.menu ?? "施術売上"} required />
              <TextField label="売上金額" name="amount" type="number" value={bestCourse?.estimatedPrice ?? upcomingAppointment?.estimatedPrice} required />
              <TextField label="会計日時" name="paidAt" type="datetime-local" value={inputDateTime(new Date())} />
              <SelectField label="支払い方法" name="paymentMethod" options={["現金", "カード", "QR決済", "電子マネー", "未収"]} />
              <SelectField label="きっかけ" name="source" options={["画像提案", "追客", "店頭提案", "予約", "紹介"]} />
              <TextAreaField label="売上メモ" name="note" value={bestSuggestion?.suggestedStyleName ?? ""} />
              <SubmitButton>売上を保存</SubmitButton>
            </form>
          </section>

          <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-950">
              <Clock3 className="h-4 w-4 text-stone-500" />
              反応・追客・予約・売上履歴
            </h2>
            <div className="mt-4 grid gap-3 text-sm">
              {customer.proposalResponses.map((response) => (
                <HistoryCard key={response.id} title={response.intent} date={response.createdAt} tone="green">
                  <p>{response.suggestion.suggestedStyleName}</p>
                  <p>状態: {response.status}</p>
                  {response.preferredDate ? <p>希望: {formatDateTime(response.preferredDate)}</p> : null}
                  {response.message ? <p>{response.message}</p> : null}
                  {response.status !== "対応済み" ? (
                    <form action={updateProposalResponseStatus.bind(null, response.id, customer.id)} className="pt-1">
                      <input type="hidden" name="status" value="対応済み" />
                      <button
                        type="submit"
                        className="inline-flex h-8 items-center justify-center rounded-md border border-teal-200 bg-white px-3 text-[11px] font-semibold text-teal-900 hover:bg-teal-50"
                      >
                        対応済みにする
                      </button>
                    </form>
                  ) : null}
                </HistoryCard>
              ))}
              {customer.serviceSales.map((sale) => (
                <HistoryCard key={sale.id} title={`${sale.amount.toLocaleString("ja-JP")}円`} date={sale.paidAt} tone="green">
                  <p>{sale.title}</p>
                  {sale.paymentMethod ? <p>{sale.paymentMethod}</p> : null}
                </HistoryCard>
              ))}
              {customer.contactLogs.map((log) => (
                <HistoryCard key={log.id} title={log.channel} date={log.createdAt} tone="amber">
                  <p>{log.message}</p>
                  {log.outcome ? <p>{log.outcome}</p> : null}
                </HistoryCard>
              ))}
              {customer.appointments.map((appointment) => (
                <HistoryCard key={appointment.id} title={appointment.status} date={appointment.scheduledAt} tone="stone">
                  <p>{appointment.menu ?? "メニュー未設定"}</p>
                  {appointment.estimatedPrice ? <p>{appointment.estimatedPrice.toLocaleString("ja-JP")}円</p> : null}
                  {isActiveAppointmentStatus(appointment.status) ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {appointment.status !== "予約確定" ? (
                        <form action={updateAppointmentStatus.bind(null, appointment.id, customer.id)}>
                          <input type="hidden" name="status" value="予約確定" />
                          <button
                            type="submit"
                            className="inline-flex h-8 items-center justify-center rounded-md border border-teal-200 bg-white px-3 text-[11px] font-semibold text-teal-900 hover:bg-teal-50"
                          >
                            予約確定
                          </button>
                        </form>
                      ) : null}
                      <form action={updateAppointmentStatus.bind(null, appointment.id, customer.id)}>
                        <input type="hidden" name="status" value="来店済み" />
                        <button
                          type="submit"
                          className="inline-flex h-8 items-center justify-center rounded-md border border-emerald-200 bg-white px-3 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-50"
                        >
                          来店済み
                        </button>
                      </form>
                      <form action={updateAppointmentStatus.bind(null, appointment.id, customer.id)}>
                        <input type="hidden" name="status" value="キャンセル" />
                        <button
                          type="submit"
                          className="inline-flex h-8 items-center justify-center rounded-md border border-red-200 bg-white px-3 text-[11px] font-semibold text-red-700 hover:bg-red-50"
                        >
                          キャンセル
                        </button>
                      </form>
                      <form action={updateAppointmentStatus.bind(null, appointment.id, customer.id)}>
                        <input type="hidden" name="status" value="無断キャンセル" />
                        <button
                          type="submit"
                          className="inline-flex h-8 items-center justify-center rounded-md border border-red-200 bg-red-50 px-3 text-[11px] font-semibold text-red-800 hover:bg-red-100"
                        >
                          無断キャンセル
                        </button>
                      </form>
                    </div>
                  ) : null}
                </HistoryCard>
              ))}
              {customer.proposalResponses.length === 0 &&
              customer.serviceSales.length === 0 &&
              customer.contactLogs.length === 0 &&
              customer.appointments.length === 0 ? (
                <p className="rounded-md border border-dashed border-stone-300 bg-[#fbf8f3] p-3 text-xs leading-5 text-stone-600">
                  まだ反応・追客・予約・売上の記録はありません。
                </p>
              ) : null}
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function HistoryCard({
  title,
  date,
  tone,
  children
}: {
  title: string;
  date: Date;
  tone: Tone;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-stone-200 bg-[#fbf8f3] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone={tone}>{title}</Pill>
        <span className="text-xs text-stone-500">{formatDateTime(date)}</span>
      </div>
      <div className="mt-2 grid gap-1 text-xs leading-5 text-stone-700">{children}</div>
    </div>
  );
}
