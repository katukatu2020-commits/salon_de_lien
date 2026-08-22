import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeDollarSign,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Clock3,
  Gift,
  Handshake,
  MessageCircle,
  Phone,
  Printer,
  Scissors,
  ShoppingBag,
  Sparkles,
  TicketPercent,
  Trash2,
  UserRound
} from "lucide-react";
import {
  createAppointment,
  createCourseRecommendation,
  createContactLog,
  createCustomerOffer,
  createPartnerCoupon,
  createProductSuggestion,
  createServiceSale,
  createStyleSuggestion,
  createVisit,
  deleteCustomer,
  generateCourseRecommendationsAction,
  toggleCourseRecommendationAccepted,
  updateCustomer,
  updateAppointmentStatus,
  updateCustomerOfferStatus,
  updatePartnerCouponReaction,
  updateProductSuggestionReaction,
  updateProposalResponseStatus,
  updateStyleSuggestionAccepted
} from "@/lib/actions";
import { markCouponIssueUsedAction } from "@/lib/actions/coupon-actions";
import { createProductProposalAction } from "@/lib/actions/product-actions";
import { couponIssueStatusLabel, effectiveCouponIssueStatus } from "@/lib/coupons/coupon-validation";
import { expirePointsForCustomer } from "@/lib/points/point-service";
import { prisma } from "@/lib/prisma";
import { resolveCustomerPhotoReference, resolveCustomerPhotoReferences } from "@/lib/storage/customer-photo";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { ProductReviewRequestButton } from "@/components/products/ProductReviewRequestButton";
import { CustomerPortalLinkButton, CustomerPortalMessageCopyButton } from "@/components/customers/customer-portal-link-button";
import { VisitAfterPhotoUploader } from "@/components/customers/visit-after-photo-uploader";
import { StyleSuggestionGenerator } from "@/components/customers/style-suggestion-generator";
import { StyleSuggestionImageGenerator } from "@/components/customers/style-suggestion-image-generator";
import { StyleSuggestionSelector } from "@/components/customers/style-suggestion-selector";
import { SelectField, SubmitButton, TextAreaField, TextField } from "@/components/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  parseStringArray as parseProductStringArray,
  productProposalReactionLabel,
  productProposalStatusLabel,
  reviewRequestStatusLabel
} from "@/lib/products/product-review";
import { normalizeSalonStaffName, SALON_STAFF_NAMES } from "@/lib/salon/staff";
import { requireCustomerAccess } from "@/lib/auth/authorization";
import {
  birthDateInputValue,
  customerAgeLabel,
  formatBirthDate
} from "@/lib/customer-age";

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
const servicePreferenceOptions = ["静かに過ごしたい", "適度に会話したい"];
const staffOptions = [...SALON_STAFF_NAMES];

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

function historyDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
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

function parseCouponIssueMenus(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }

  return ["カット"];
}

function uniqueUrls(urls: Array<string | null | undefined>) {
  return Array.from(new Set(urls.filter((url): url is string => Boolean(url))));
}

function priceSum(values: Array<number | null | undefined>) {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

function customerCode(id: string) {
  return `C-${id.slice(-5).toUpperCase()}`;
}

function crmStatusLabel(status?: string | null) {
  if (status === "published") {
    return "公開中";
  }

  if (status === "redeemed") {
    return "利用済み";
  }

  if (status === "closed") {
    return "終了";
  }

  if (status === "archived") {
    return "アーカイブ";
  }

  if (status === "purchased") {
    return "購入済み";
  }

  if (status === "interested") {
    return "興味あり";
  }

  if (status === "declined") {
    return "見送り";
  }

  if (status === "proposed") {
    return "提案中";
  }

  if (status === "issued") {
    return "発行済み";
  }

  if (status === "registered") {
    return "登録済み";
  }

  if (status === "first_visit_completed") {
    return "初回来店完了";
  }

  if (status === "rewarded") {
    return "付与済み";
  }

  if (status === "cancelled") {
    return "取消";
  }

  return "下書き";
}

function crmStatusTone(status?: string | null): Tone {
  if (status === "published" || status === "interested" || status === "proposed") {
    return "green";
  }

  if (status === "redeemed" || status === "purchased") {
    return "green";
  }

  if (status === "declined" || status === "closed") {
    return "amber";
  }

  return "stone";
}

function feedbackShareUrl(customerId: string) {
  void customerId;
  return "{{PORTAL_URL}}/feedback";
}

function carePlanShareUrl(customerId: string) {
  void customerId;
  return "{{PORTAL_URL}}/care";
}

function customerAppShareUrl(customerId: string) {
  void customerId;
  return "{{PORTAL_URL}}";
}

function appointmentConfirmationUrl(customerId: string, appointmentId: string) {
  void customerId;
  return `{{PORTAL_URL}}/appointments/confirm/${appointmentId}`;
}

function intakeReferralUrl(customerId: string, customerName: string) {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  const path = `/u/${customerId}/intake?referrer=${encodeURIComponent(customerId)}&referrerName=${encodeURIComponent(customerName)}`;

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
  const { session } = await requireCustomerAccess(params.id);
  await expirePointsForCustomer(params.id);

  const customer = await prisma.customer.findFirst({
    where: {
      id: params.id,
      organizationId: session.organizationId ?? undefined,
      deletedAt: null,
      storeHiddenAt: null
    },
    include: {
      organization: {
        select: { defaultCouponDiscountRate: true }
      },
      preference: true,
      hairProfile: true,
      visits: {
        orderBy: { visitedAt: "desc" },
        include: {
          photos: {
            orderBy: { createdAt: "asc" }
          }
        }
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
        include: {
          appointment: {
            select: {
              scheduledAt: true,
              menu: true,
              staffName: true
            }
          },
          productLines: {
            orderBy: { createdAt: "asc" },
            select: {
              productId: true,
              productNameSnapshot: true,
              manufacturerNameSnapshot: true,
              unitPrice: true,
              quantity: true,
              lineTotal: true
            }
          }
        }
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
      },
      customerOffers: {
        orderBy: { createdAt: "desc" },
        take: 12
      },
      productSuggestions: {
        orderBy: { createdAt: "desc" },
        take: 12
      },
      productProposals: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          product: {
            select: {
              id: true,
              manufacturerName: true,
              name: true,
              category: true,
              concernTags: true
            }
          },
          reviewRequests: {
            orderBy: { createdAt: "desc" },
            take: 3,
            include: {
              review: {
                select: {
                  id: true,
                  usedStatus: true,
                  rating: true,
                  submittedAt: true
                }
              }
            }
          }
        }
      },
      partnerCoupons: {
        orderBy: { createdAt: "desc" },
        take: 12
      },
      coupons: {
        orderBy: { createdAt: "desc" },
        take: 20
      },
      couponIssues: {
        orderBy: { createdAt: "desc" },
        take: 8
      },
      pointAccount: true,
      pointTransactions: {
        orderBy: { createdAt: "desc" },
        take: 15
      }
    }
  });

  if (!customer) {
    notFound();
  }

  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: [{ manufacturerName: "asc" }, { name: "asc" }],
    select: {
      id: true,
      manufacturerName: true,
      name: true,
      category: true,
      concernTags: true
    }
  });

  const createContactLogAction = createContactLog.bind(null, customer.id);
  const createAppointmentAction = createAppointment.bind(null, customer.id);
  const createCourseRecommendationAction = createCourseRecommendation.bind(null, customer.id);
  const createCustomerOfferAction = createCustomerOffer.bind(null, customer.id);
  const createPartnerCouponAction = createPartnerCoupon.bind(null, customer.id);
  const createProductProposal = createProductProposalAction.bind(null, customer.id);
  const createProductSuggestionAction = createProductSuggestion.bind(null, customer.id);
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
  const upcomingAppointment =
    customer.appointments
      .filter((appointment) => appointment.scheduledAt.getTime() >= Date.now() && isActiveAppointmentStatus(appointment.status))
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())[0] ?? null;
  const upcomingAppointmentHours = hoursUntil(upcomingAppointment?.scheduledAt);
  const frontImageReferences = uniqueUrls([...parseJsonStringArray(customer.aiFrontImageUrlsJson), customer.aiFrontImageUrl]);
  const sideImageReferences = uniqueUrls([...parseJsonStringArray(customer.aiSideImageUrlsJson), customer.aiSideImageUrl]);
  const backImageReferences = uniqueUrls([...parseJsonStringArray(customer.aiBackImageUrlsJson), customer.aiBackImageUrl]);
  const [profileImageUrl, frontImageUrls, sideImageUrls, backImageUrls] = await Promise.all([
    resolveCustomerPhotoReference(customer.profileImageUrl),
    resolveCustomerPhotoReferences(frontImageReferences),
    resolveCustomerPhotoReferences(sideImageReferences),
    resolveCustomerPhotoReferences(backImageReferences)
  ]);
  const visitPhotoUrlEntries = await Promise.all(
    customer.visits.flatMap((visit) =>
      visit.photos.map(async (photo) => [photo.id, await resolveCustomerPhotoReference(photo.storageReference)] as const)
    )
  );
  const visitPhotoUrlById = new Map(
    visitPhotoUrlEntries.filter((entry): entry is readonly [string, string] => Boolean(entry[1]))
  );
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
  const menuFrequency = new Map<string, number>();
  customer.visits.forEach((visit) => {
    const menu = (visit.performedStyle ?? visit.requestedStyle)?.trim();
    if (menu) {
      menuFrequency.set(menu, (menuFrequency.get(menu) ?? 0) + 1);
    }
  });
  const favoriteMenu = [...menuFrequency.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ja"))[0]?.[0] ?? null;
  const salesByDate = new Map<string, typeof customer.serviceSales>();
  customer.serviceSales.forEach((sale) => {
    const key = historyDateKey(sale.appointment?.scheduledAt ?? sale.paidAt);
    salesByDate.set(key, [...(salesByDate.get(key) ?? []), sale]);
  });
  const unifiedVisitHistory = [
    ...customer.visits.map((visit) => {
      const key = historyDateKey(visit.visitedAt);
      const sales = salesByDate.get(key) ?? [];
      salesByDate.delete(key);
      return {
        id: `visit-${visit.id}`,
        occurredAt: visit.visitedAt,
        visit,
        sales
      };
    }),
    ...[...salesByDate.entries()].map(([key, sales]) => ({
      id: `sale-${key}`,
      occurredAt: sales[0]?.appointment?.scheduledAt ?? sales[0]?.paidAt ?? new Date(`${key}T00:00:00+09:00`),
      visit: null,
      sales
    }))
  ].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  const latestSale = customer.serviceSales[0] ?? null;
  const latestSaleDays = daysSince(latestSale?.paidAt);
  const bestSuggestion =
    customer.styleSuggestions.find((suggestion) => suggestion.id === searchParams?.suggestionId) ??
    customer.styleSuggestions.find((suggestion) => suggestion.accepted) ??
    customer.styleSuggestions.find((suggestion) => suggestion.imageUrls.length > 0 || Boolean(suggestion.imageUrlsJson)) ??
    customer.styleSuggestions[0] ??
    null;
  const customerAppUrl = customerAppShareUrl(customer.id);
  const customerFeedbackUrl = feedbackShareUrl(customer.id);
  const customerCarePlanUrl = carePlanShareUrl(customer.id);
  const upcomingAppointmentConfirmationUrl = upcomingAppointment ? appointmentConfirmationUrl(customer.id, upcomingAppointment.id) : null;
  const bestCourse = acceptedCourses[0] ?? openCourses[0] ?? null;
  const hasRecentContact =
    latestContactLog ? Date.now() - latestContactLog.createdAt.getTime() <= 14 * 24 * 60 * 60 * 1000 : false;
  const hasRecentAppointmentConfirmation = customer.contactLogs.some(
    (log) =>
      (log.outcome === "予約確認送信" || log.outcome === "予約確認返信") &&
      Date.now() - log.createdAt.getTime() <= 2 * 24 * 60 * 60 * 1000
  );
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
  const pointAccount = customer.pointAccount ?? { availablePoints: 0 };
  const offerNow = new Date();
  const activeCoupons = customer.couponIssues.filter((issue) => effectiveCouponIssueStatus(issue, offerNow) === "issued");
  const expiredCouponCount = customer.couponIssues.filter((issue) => effectiveCouponIssueStatus(issue, offerNow) === "expired").length;
  const usedCouponCount = customer.couponIssues.filter((issue) => issue.status === "used").length;
  const totalCouponPrintCount = customer.couponIssues.reduce((total, issue) => total + (issue.printedAt ? 1 : 0), 0);
  const visibleCustomerOffers = customer.customerOffers.filter((offer) => offer.status !== "archived");
  const publishedCustomerOffers = customer.customerOffers.filter(
    (offer) => offer.status === "published" && (!offer.validUntil || offer.validUntil.getTime() >= offerNow.getTime())
  );
  const offerRevenueValue = priceSum(customer.customerOffers.map((offer) => offer.expectedRevenue));
  const partnerCouponCount = customer.partnerCoupons.length;
  const latestCustomerOffer = visibleCustomerOffers[0] ?? null;
  const defaultOfferCode = `${customerCode(customer.id)}-${String(offerNow.getMonth() + 1).padStart(2, "0")}`;
  const latestOfferMessage = latestCustomerOffer
    ? [
        `${customer.name}様`,
        "このお客様だけの限定提案です。",
        latestCustomerOffer.title,
        latestCustomerOffer.benefit ? `特典: ${latestCustomerOffer.benefit}` : null,
        latestCustomerOffer.description,
        latestCustomerOffer.couponCode ? `クーポンコード: ${latestCustomerOffer.couponCode}` : null,
        latestCustomerOffer.validUntil ? `有効期限: ${formatDate(latestCustomerOffer.validUntil)}` : null,
        customerAppUrl
      ]
        .filter((line): line is string => Boolean(line))
        .join("\n")
    : null;
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
    <div className="mx-auto grid w-full max-w-7xl gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/customers" className="inline-flex items-center gap-2 text-sm font-semibold text-teal-800 hover:text-teal-950">
          <ArrowLeft className="h-4 w-4" />
          顧客一覧へ戻る
        </Link>
        <span className="text-xs font-semibold text-stone-500">{customerCode(customer.id)}</span>
      </div>

      <section className="lien-glass rounded-[28px] border p-5 shadow-lien sm:p-6">
        <div className="flex items-start gap-4 sm:items-center">
          <span
            role="img"
            aria-label={`${customer.name}のプロフィールアイコン`}
            className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-white bg-[color:var(--lien-primary-soft)] bg-cover bg-center text-xl font-semibold text-[color:var(--lien-primary-dark)] shadow-sm sm:h-20 sm:w-20 sm:text-2xl"
            style={profileImageUrl ? { backgroundImage: `url(${JSON.stringify(profileImageUrl)})` } : undefined}
          >
            {profileImageUrl ? <span className="sr-only">プロフィール画像</span> : customer.name.slice(0, 1)}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-stone-950 sm:text-3xl">{customer.name}</h1>
              <Pill tone={status.tone}>{status.label}</Pill>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-stone-600">
              <span className="inline-flex items-center gap-1">
                <UserRound className="h-4 w-4" />
                {customer.gender ?? "性別未登録"} / {customerAgeLabel(customer)} / {formatBirthDate(customer.birthDate) ?? (customer.birthYear ? `${customer.birthYear}年生まれ` : "生年月日未登録")}
              </span>
              <span className="inline-flex items-center gap-1">
                <Phone className="h-4 w-4" />
                {customer.phone ?? "電話番号未登録"}
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-4 w-4" />
                最終来店 {formatDate(latestVisit?.visitedAt)}
              </span>
              <span className="inline-flex items-center gap-1">
                <UserRound className="h-4 w-4" />
                担当: {customer.staffAssignmentType === "assigned" && customer.assignedStaffName ? normalizeSalonStaffName(customer.assignedStaffName) : "フリー（指名なし）"}
              </span>
              {customer.servicePreference ? (
                <span className="inline-flex items-center gap-1">
                  <MessageCircle className="h-4 w-4" />
                  接客: {customer.servicePreference}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[22px] border border-[color:var(--lien-border)] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2">
          <UserRound className="h-5 w-5 text-[color:var(--lien-primary)]" />
          <h2 className="text-lg font-semibold text-[color:var(--lien-ink)]">髪・接客情報</h2>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ReadOnlyField label="毛量" value={customer.hairProfile?.hairVolume} />
          <ReadOnlyField label="髪質" value={customer.hairProfile?.hairTexture} />
          <ReadOnlyField label="髪の太さ" value={customer.hairProfile?.hairThickness} />
          <ReadOnlyField label="クセ" value={customer.hairProfile?.hairCurl} />
          {customer.servicePreference ? <ReadOnlyField label="過ごし方の希望" value={customer.servicePreference} className="sm:col-span-2" /> : null}
          <ReadOnlyField label="カルテメモ" value={customer.memo} className="sm:col-span-2" />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[18px] border border-[color:var(--lien-border)] bg-white p-4 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-semibold text-[color:var(--lien-muted)]">
            <BadgeDollarSign className="h-4 w-4 text-[color:var(--lien-primary)]" />
            平均単価
          </p>
          <p className="mt-2 text-xl font-semibold tabular-nums text-[color:var(--lien-ink)]">
            {averageCustomerTicket > 0 ? `${averageCustomerTicket.toLocaleString("ja-JP")}円` : "未集計"}
          </p>
          <p className="mt-1 text-xs text-[color:var(--lien-muted)]">会計履歴 {customer.serviceSales.length}件から算出</p>
        </div>
        <div className="rounded-[18px] border border-[color:var(--lien-border)] bg-white p-4 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-semibold text-[color:var(--lien-muted)]">
            <Scissors className="h-4 w-4 text-[color:var(--lien-primary)]" />
            お気に入りメニュー
          </p>
          <p className="mt-2 text-xl font-semibold text-[color:var(--lien-ink)]">{favoriteMenu ?? "未集計"}</p>
          <p className="mt-1 text-xs text-[color:var(--lien-muted)]">来店履歴で最も多い施術メニュー</p>
        </div>
        <div className="rounded-[18px] border border-[color:var(--lien-border)] bg-white p-4 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-semibold text-[color:var(--lien-muted)]">
            <CalendarDays className="h-4 w-4 text-[color:var(--lien-primary)]" />
            次回予約
          </p>
          <p className="mt-2 text-xl font-semibold tabular-nums text-[color:var(--lien-ink)]">
            {upcomingAppointment ? formatDate(upcomingAppointment.scheduledAt) : "未設定"}
          </p>
          <p className="mt-1 truncate text-xs text-[color:var(--lien-muted)]">{upcomingAppointment?.menu ?? "予約はありません"}</p>
        </div>
      </section>

      <Tabs defaultValue="history" className="grid gap-0">
        <TabsList className="sticky top-16 z-10 !grid-cols-3 bg-white/95 shadow-sm backdrop-blur sm:!grid-cols-3">
          <TabsTrigger value="points">ポイント</TabsTrigger>
          <TabsTrigger value="history">履歴</TabsTrigger>
          <TabsTrigger value="delete" className="text-red-700 data-[state=active]:text-red-800">店舗から非表示</TabsTrigger>
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
                <CustomerPortalLinkButton customerId={customer.id} suffix={`/proposals/${bestSuggestion.id}`} label="共有ページ" className="inline-flex h-10 items-center gap-2 rounded-md border border-stone-200 bg-stone-50 px-4 text-sm font-semibold text-stone-800 hover:bg-stone-100" />
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
                      <CustomerPortalLinkButton customerId={customer.id} suffix={`/proposals/${suggestion.id}`} label="共有ページ" className="inline-flex items-center gap-1 text-xs font-semibold text-teal-800 hover:text-teal-950" />
                      <Link href={`/admin/customers/${customer.id}?suggestionId=${suggestion.id}`} className="text-xs font-semibold text-teal-800 hover:text-teal-950">
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
                    <div className="grid w-full min-w-0 gap-1 text-left text-sm sm:w-auto sm:min-w-[150px] sm:text-right">
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

        <TabsContent value="offers" className="mt-0 grid gap-5">
          <section className="rounded-lg border border-teal-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-900">
                  <TicketPercent className="h-4 w-4" />
                  販促CRM
                </div>
                <h2 className="mt-3 text-xl font-semibold text-stone-950">このお客様だけの限定提案</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {latestOfferMessage ? <CustomerPortalMessageCopyButton customerId={customer.id} text={latestOfferMessage} label="案内文をコピー" /> : null}
                <Link
                  href="/admin/reports/offers"
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-stone-200 bg-stone-50 px-4 text-sm font-semibold text-stone-800 hover:bg-stone-100"
                >
                  レポート
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <div className="rounded-md border border-stone-200 bg-[#fbf8f3] p-3">
                <p className="text-xs font-semibold text-stone-500">公開中</p>
                <p className="mt-2 text-xl font-semibold text-stone-950">{publishedCustomerOffers.length}</p>
              </div>
              <div className="rounded-md border border-stone-200 bg-[#fbf8f3] p-3">
                <p className="text-xs font-semibold text-stone-500">限定提案</p>
                <p className="mt-2 text-xl font-semibold text-stone-950">{visibleCustomerOffers.length}</p>
              </div>
              <div className="rounded-md border border-stone-200 bg-[#fbf8f3] p-3">
                <p className="text-xs font-semibold text-stone-500">提案見込み</p>
                <p className="mt-2 text-xl font-semibold text-stone-950">{offerRevenueValue.toLocaleString("ja-JP")}円</p>
              </div>
              <div className="rounded-md border border-stone-200 bg-[#fbf8f3] p-3">
                <p className="text-xs font-semibold text-stone-500">他業種クーポン</p>
                <p className="mt-2 text-xl font-semibold text-stone-950">{partnerCouponCount.toLocaleString("ja-JP")}件</p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 rounded-md border border-teal-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Printer className="h-4 w-4 text-teal-800" />
                    <h3 className="text-sm font-semibold text-stone-950">個別クーポンチラシ</h3>
                  </div>
                  <p className="mt-1 text-xs text-stone-500">散髪後にその場で渡せるA4印刷用クーポンです。</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
                  <div className="rounded border border-stone-200 bg-[#fbf8f3] p-2">
                    <p className="font-semibold text-stone-500">発行中</p>
                    <p className="mt-1 text-lg font-semibold text-stone-950">{activeCoupons.length}</p>
                  </div>
                  <div className="rounded border border-stone-200 bg-[#fbf8f3] p-2">
                    <p className="font-semibold text-stone-500">使用済み</p>
                    <p className="mt-1 text-lg font-semibold text-stone-950">{usedCouponCount}</p>
                  </div>
                  <div className="rounded border border-stone-200 bg-[#fbf8f3] p-2">
                    <p className="font-semibold text-stone-500">期限切れ</p>
                    <p className="mt-1 text-lg font-semibold text-stone-950">{expiredCouponCount}</p>
                  </div>
                  <div className="rounded border border-stone-200 bg-[#fbf8f3] p-2">
                    <p className="font-semibold text-stone-500">印刷回数</p>
                    <p className="mt-1 text-lg font-semibold text-stone-950">{totalCouponPrintCount}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-rose-100 bg-[#fff8f6] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-stone-950">固定テンプレートの限定クーポンチラシ</h4>
                    <p className="mt-1 text-xs text-stone-600">
                      新しい空白領域つきテンプレートで、文字が重ならないA4チラシを作成します。
                    </p>
                  </div>
                  <Link
                    href={`/admin/customers/${customer.id}/coupons/new`}
                    className="inline-flex h-10 items-center gap-2 rounded-md bg-teal-800 px-4 text-sm font-semibold text-white hover:bg-teal-900"
                  >
                    <Printer className="h-4 w-4" />
                    新しいチラシを作成
                  </Link>
                </div>

                <div className="mt-4 grid gap-2">
                  {customer.couponIssues.map((issue) => {
                    const status = effectiveCouponIssueStatus(issue);
                    const menus = parseCouponIssueMenus(issue.targetMenusJson);

                    return (
                      <div key={issue.id} className="grid min-w-0 gap-2 rounded-md border border-stone-200 bg-white p-3 text-xs text-stone-700 md:grid-cols-[minmax(0,1fr)_auto]">
                        <div className="grid gap-1 md:grid-cols-5">
                          <span>発行日: {formatDate(issue.issuedAt)}</span>
                          <span>期限: {formatDate(issue.expiresAt)}</span>
                          <span>{issue.discountRate}%OFF</span>
                          <span>{menus.join(" / ")}</span>
                          <span className="font-mono">{issue.couponCode}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-stone-100 px-2 py-1 font-semibold text-stone-700">
                            {couponIssueStatusLabel(status)}
                          </span>
                          <Link
                            href={`/admin/coupon-issues/${issue.id}/print`}
                            target="_blank"
                            className="inline-flex h-8 items-center gap-1 rounded-md border border-teal-200 bg-white px-2 font-semibold text-teal-900 hover:bg-teal-50"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            再印刷
                          </Link>
                          {status === "issued" ? (
                            <form action={markCouponIssueUsedAction.bind(null, issue.id, customer.id)}>
                              <ConfirmSubmitButton
                                message="このクーポンを使用済みにしますか？"
                                className="inline-flex h-8 items-center justify-center rounded-md border border-stone-200 bg-white px-2 font-semibold text-stone-700 hover:bg-stone-50"
                              >
                                使用済み
                              </ConfirmSubmitButton>
                            </form>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}

                  {customer.couponIssues.length === 0 ? (
                    <p className="rounded-md border border-dashed border-stone-300 bg-white p-3 text-sm text-stone-600">
                      固定テンプレートの発行履歴はまだありません。
                    </p>
                  ) : null}
                </div>
              </div>

              {/*
              Legacy Coupon UI removed. Fixed template CouponIssue UI remains above.
              {false ? (
                <>
              <form action={createCoupon} className="hidden gap-4 rounded-md border border-teal-100 bg-teal-50 p-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-teal-800" />
                  <h4 className="text-sm font-semibold text-teal-950">このお客様だけの限定提案を発行</h4>
                </div>
                <input type="hidden" name="couponType" value="salon" />
                <input type="hidden" name="visitId" value={latestVisit?.id ?? ""} />
                <div className="grid gap-3 md:grid-cols-2">
                  <TextField label="タイトル" name="title" placeholder="例: 次回カラー限定クーポン" required />
                  <label className="grid gap-1 text-sm font-medium text-stone-700">
                    対象メニュー
                    <select
                      name="targetMenu"
                      defaultValue="カット"
                      className="h-11 rounded-md border border-stone-200 bg-white px-3 text-stone-950 shadow-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                    >
                      <option value="カット">カット</option>
                      <option value="カラー">カラー</option>
                      <option value="パーマ">パーマ</option>
                      <option value="トリートメント">トリートメント</option>
                      <option value="ヘッドスパ">ヘッドスパ</option>
                      <option value="カット + カラー">カット + カラー</option>
                      <option value="カット + パーマ">カット + パーマ</option>
                      <option value="その他">その他</option>
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm font-medium text-stone-700">
                    割引タイプ
                    <select
                      name="discountType"
                      defaultValue="percentage"
                      className="h-11 rounded-md border border-stone-200 bg-white px-3 text-stone-950 shadow-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                    >
                      <option value="percentage">パーセント割引</option>
                      <option value="fixed_amount">金額割引</option>
                      <option value="service_bonus">サービス追加</option>
                    </select>
                  </label>
                  <TextField label="割引値" name="discountValue" value={customer.organization.defaultCouponDiscountRate} placeholder="例: 10 / 1000 / ヘッドスパサービス" required />
                  <TextField label="有効開始日" name="validFrom" type="date" value={inputDateValue(couponToday)} required />
                  <TextField label="有効期限" name="validUntil" type="date" value={inputDateValue(defaultCouponValidUntil)} required />
                </div>
                <TextAreaField label="サロンからの一言 任意" name="description" placeholder="例: いつもご来店ありがとうございます。次回もきれいを保てるようサポートします。" />
                <TextAreaField label="発行理由" name="issuedReason" placeholder="例: カラー後の褪色ケア提案として" />
                <TextAreaField label="スタッフメモ" name="staffMemo" placeholder="スタッフだけが確認する利用時メモ" />
                <p className="text-xs text-stone-600">
                  チラシデザインは固定です。対象メニュー、割引内容、有効期限、識別コード、サロンからの一言だけが印刷面に反映されます。
                </p>
                <SubmitButton>クーポンを発行</SubmitButton>
              </form>

              <div className="hidden gap-3">
                {customer.coupons.map((coupon) => {
                  const effectiveStatus = effectiveCouponStatus(coupon, offerNow);
                  const printUrl = `/admin/customers/${customer.id}/coupons/${coupon.id}/print`;

                  return (
                    <article key={coupon.id} className="rounded-md border border-stone-200 bg-[#fbf8f3] p-4">
                      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-semibold text-stone-950">{coupon.title}</h4>
                            <Pill tone={couponStatusTone(effectiveStatus) as Tone}>{couponStatusLabel(effectiveStatus)}</Pill>
                            <Pill>{coupon.couponType}</Pill>
                          </div>
                          <p className="mt-2 text-lg font-semibold text-teal-900">{formatCouponDiscount(coupon)}</p>
                          {coupon.description ? <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-700">{coupon.description}</p> : null}
                          <div className="mt-3 grid gap-1 text-xs text-stone-600 md:grid-cols-2">
                            <span>対象メニュー: {coupon.targetMenu}</span>
                            <span>有効期限: {formatDate(coupon.validUntil)}</span>
                            <span>識別コード: {coupon.couponCode}</span>
                            <span>印刷回数: {coupon.printCount}</span>
                            <span>チラシ: 固定テンプレート</span>
                            {coupon.usedAt ? <span>使用日: {formatDate(coupon.usedAt)}</span> : null}
                          </div>
                          {coupon.staffMemo ? <p className="mt-2 text-xs text-stone-500">スタッフメモ: {coupon.staffMemo}</p> : null}

                          <div className="mt-4 flex flex-wrap gap-2">
                            <Link
                              href={printUrl}
                              target="_blank"
                              className="inline-flex h-9 items-center gap-2 rounded-md bg-teal-900 px-3 text-xs font-semibold text-white hover:bg-teal-950"
                            >
                              <Printer className="h-4 w-4" />
                              印刷ページを開く
                            </Link>
                            {coupon.status !== "used" ? (
                              <form action={markCouponUsedAction.bind(null, coupon.id, customer.id)}>
                                <ConfirmSubmitButton
                                  message="このクーポンを使用済みにしますか？"
                                  className="inline-flex h-9 items-center justify-center rounded-md border border-teal-200 bg-white px-3 text-xs font-semibold text-teal-900 hover:bg-teal-50"
                                >
                                  使用済みにする
                                </ConfirmSubmitButton>
                              </form>
                            ) : null}
                            {coupon.status !== "cancelled" && coupon.status !== "used" ? (
                              <form action={cancelCouponAction.bind(null, coupon.id, customer.id)}>
                                <button
                                  type="submit"
                                  className="inline-flex h-9 items-center justify-center rounded-md border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                                >
                                  取消
                                </button>
                              </form>
                            ) : null}
                          </div>

                        </div>

                        <div className="rounded-md border border-stone-200 bg-white p-3">
                          <div className="flex items-center gap-2">
                            <TicketPercent className="h-4 w-4 text-teal-800" />
                            <h5 className="text-sm font-semibold text-stone-950">実チラシ画像テンプレート</h5>
                          </div>

                          <div className="relative mt-3 overflow-hidden rounded-md border border-[#d9c893] bg-[#fffaf1] text-[#4b3925]">
                            <img
                              src="/coupon-templates/salon-de-lien-coupon-template.jpg"
                              alt="クーポンチラシテンプレート"
                              className="aspect-[905/1280] w-full object-cover"
                            />
                            <div className="absolute left-[19%] top-[36%] grid h-[12%] w-[31%] place-items-center overflow-hidden bg-[#fffaf1]">
                              <p className="font-serif text-4xl font-semibold leading-none text-[#cf6862]">{formatCouponDiscount(coupon)}</p>
                            </div>
                            <div className="absolute left-[6%] top-[57%] max-w-[27%] overflow-hidden bg-[#fffaf1] p-1 text-[10px] font-semibold leading-tight">
                              {coupon.targetMenu}
                            </div>
                            <div className="absolute left-[38%] top-[58%] max-w-[22%] overflow-hidden bg-[#fffaf1] px-2 py-1 text-[10px] font-semibold">
                              {formatDate(coupon.validUntil)}
                            </div>
                            <div className="absolute left-[64%] top-[61%] max-w-[30%] overflow-hidden bg-white px-2 py-1 text-[10px] font-mono font-semibold">
                              {coupon.couponCode}
                            </div>
                          </div>

                          <p className="mt-3 text-xs leading-5 text-stone-600">
                            添付チラシの実画像をベースに、割引・対象メニュー・有効期限・識別コードだけを上書きして印刷します。
                          </p>
                          <Link
                            href={printUrl}
                            target="_blank"
                            className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-teal-900 px-3 text-xs font-semibold text-white hover:bg-teal-950"
                          >
                            <Printer className="h-4 w-4" />
                            A4チラシを確認
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
                {customer.coupons.length === 0 ? (
                  <p className="rounded-md border border-dashed border-stone-300 bg-[#fbf8f3] p-4 text-sm text-stone-600">
                    個別クーポンはまだありません。
                  </p>
                ) : null}
              </div>
                </>
              ) : null}
              */}
            </div>

            <form action={createCustomerOfferAction} className="mt-5 grid gap-4 rounded-md border border-teal-200 bg-teal-50 p-4">
              <div className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-teal-800" />
                <h3 className="text-sm font-semibold text-teal-950">限定提案を作成</h3>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <TextField label="提案名" name="title" placeholder="例: 次回カラー専用ケア提案" required />
                <label className="grid gap-1 text-sm font-medium text-stone-700">
                  種別
                  <select
                    name="offerType"
                    defaultValue="施術"
                    className="h-11 rounded-md border border-stone-200 bg-white px-3 text-stone-950 shadow-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  >
                    <option value="施術">施術</option>
                    <option value="ホームケア">ホームケア</option>
                    <option value="店販商品">店販商品</option>
                    <option value="他業種クーポン">他業種クーポン</option>
                  </select>
                </label>
                <TextField label="クーポンコード" name="couponCode" value={defaultOfferCode} />
                <TextField label="見込み金額" name="expectedRevenue" type="number" placeholder="例: 6600" />
                <TextField label="開始日" name="validFrom" type="date" value={new Date().toISOString().slice(0, 10)} />
                <TextField label="有効期限" name="validUntil" type="date" />
                <label className="grid gap-1 text-sm font-medium text-stone-700">
                  公開状態
                  <select
                    name="status"
                    defaultValue="draft"
                    className="h-11 rounded-md border border-stone-200 bg-white px-3 text-stone-950 shadow-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  >
                    <option value="draft">下書き</option>
                    <option value="published">お客様ページに公開</option>
                  </select>
                </label>
              </div>
              <TextField label="特典" name="benefit" placeholder="例: トリートメント10%OFF" />
              <TextAreaField label="提案内容" name="description" placeholder="顧客カルテ、来店周期、髪質に合わせた提案内容" />
              <SubmitButton>限定提案を保存</SubmitButton>
            </form>

            <div className="mt-5 grid gap-3">
              {visibleCustomerOffers.map((offer) => {
                const offerMessage = [
                  `${customer.name}様`,
                  "このお客様だけの限定提案です。",
                  offer.title,
                  offer.benefit ? `特典: ${offer.benefit}` : null,
                  offer.description,
                  offer.couponCode ? `クーポンコード: ${offer.couponCode}` : null,
                  offer.validUntil ? `有効期限: ${formatDate(offer.validUntil)}` : null,
                  customerAppUrl
                ]
                  .filter((line): line is string => Boolean(line))
                  .join("\n");

                return (
                  <article key={offer.id} className="rounded-md border border-stone-200 bg-[#fbf8f3] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-stone-950">{offer.title}</h3>
                          <Pill tone={crmStatusTone(offer.status)}>{crmStatusLabel(offer.status)}</Pill>
                          <Pill>{offer.offerType}</Pill>
                        </div>
                        {offer.benefit ? <p className="mt-2 text-sm font-semibold text-teal-900">{offer.benefit}</p> : null}
                        {offer.description ? <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-700">{offer.description}</p> : null}
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-stone-600">
                          {offer.couponCode ? <span>コード: {offer.couponCode}</span> : null}
                          {offer.expectedRevenue ? <span>{offer.expectedRevenue.toLocaleString("ja-JP")}円</span> : null}
                          {offer.validUntil ? <span>期限: {formatDate(offer.validUntil)}</span> : null}
                          {offer.reactionStatus ? <span>反応: {crmStatusLabel(offer.reactionStatus)}</span> : null}
                        </div>
                      </div>
                      <CustomerPortalMessageCopyButton customerId={customer.id} text={offerMessage} label="案内文をコピー" />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {offer.status !== "published" ? (
                        <form action={updateCustomerOfferStatus.bind(null, offer.id, customer.id)}>
                          <input type="hidden" name="status" value="published" />
                          <button
                            type="submit"
                            className="inline-flex h-9 items-center justify-center rounded-md border border-teal-200 bg-white px-3 text-xs font-semibold text-teal-900 hover:bg-teal-50"
                          >
                            公開する
                          </button>
                        </form>
                      ) : null}
                      <form action={updateCustomerOfferStatus.bind(null, offer.id, customer.id)}>
                        <input type="hidden" name="status" value="redeemed" />
                        <input type="hidden" name="reactionStatus" value="redeemed" />
                        <button
                          type="submit"
                          className="inline-flex h-9 items-center justify-center rounded-md bg-teal-900 px-3 text-xs font-semibold text-white hover:bg-teal-950"
                        >
                          利用済みにする
                        </button>
                      </form>
                      <form action={updateCustomerOfferStatus.bind(null, offer.id, customer.id)} className="flex flex-wrap gap-2">
                        <select
                          name="reactionStatus"
                          defaultValue={offer.reactionStatus ?? ""}
                          className="h-9 rounded-md border border-stone-200 bg-white px-2 text-xs text-stone-950"
                        >
                          <option value="">反応未記録</option>
                          <option value="interested">興味あり</option>
                          <option value="declined">見送り</option>
                          <option value="redeemed">利用済み</option>
                        </select>
                        <input
                          name="reactionNote"
                          defaultValue={offer.reactionNote ?? ""}
                          placeholder="反応メモ"
                          className="h-9 w-full min-w-0 rounded-md border border-stone-200 bg-white px-2 text-xs text-stone-950 sm:min-w-[180px]"
                        />
                        <button
                          type="submit"
                          className="inline-flex h-9 items-center justify-center rounded-md border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                        >
                          反応を保存
                        </button>
                      </form>
                    </div>
                  </article>
                );
              })}
              {visibleCustomerOffers.length === 0 ? (
                <p className="rounded-md border border-dashed border-stone-300 bg-[#fbf8f3] p-4 text-sm text-stone-600">
                  限定提案はまだありません。
                </p>
              ) : null}
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            <div className="hidden rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-amber-700" />
                <h2 className="text-sm font-semibold text-stone-950">商品提案・レビュー依頼</h2>
              </div>
              <p className="mt-2 text-xs leading-5 text-stone-500">
                商品名はマスタから選択します。お客様用アンケートは、この提案履歴に紐づく商品だけに発行されます。
              </p>

              <form action={createProductProposal} className="mt-4 grid gap-3 rounded-md border border-amber-200 bg-amber-50 p-4">
                <label className="grid gap-1 text-sm font-medium text-stone-700">
                  商品
                  <select
                    name="productId"
                    required
                    className="h-11 rounded-md border border-stone-200 bg-white px-3 text-stone-950 shadow-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  >
                    <option value="">商品を選択</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.manufacturerName} / {product.name}
                      </option>
                    ))}
                  </select>
                </label>
                <Link
                  href="/admin/products#new-product"
                  className="inline-flex min-h-10 items-center justify-center rounded-full border border-stone-200 bg-white px-4 text-xs font-semibold text-amber-800 shadow-sm transition hover:bg-amber-50"
                >
                  商品が見つからない場合は商品マスタに追加
                </Link>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1 text-sm font-medium text-stone-700">
                    状態
                    <select
                      name="status"
                      defaultValue="sample_given"
                      className="h-11 rounded-md border border-stone-200 bg-white px-3 text-stone-950 shadow-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                    >
                      <option value="proposed">提案のみ</option>
                      <option value="sample_given">商品を案内した</option>
                      <option value="purchased">購入した</option>
                      <option value="used_in_service">施術で使った</option>
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm font-medium text-stone-700">
                    お客様の反応
                    <select
                      name="reaction"
                      defaultValue="interested"
                      className="h-11 rounded-md border border-stone-200 bg-white px-3 text-stone-950 shadow-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                    >
                      <option value="">未記録</option>
                      <option value="interested">興味あり</option>
                      <option value="purchased">購入</option>
                      <option value="consider_next">次回検討</option>
                      <option value="not_interested">興味なし</option>
                    </select>
                  </label>
                </div>

                <label className="grid gap-1 text-sm font-medium text-stone-700">
                  悩みタグ
                  <input
                    name="concernTags"
                    placeholder="例: 乾燥、ダメージ、カラー後"
                    className="h-11 rounded-md border border-stone-200 bg-white px-3 text-stone-950 shadow-sm outline-none placeholder:text-stone-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  />
                </label>
                <TextAreaField label="提案理由" name="proposalReason" placeholder="例: カラー後のパサつき・まとまり対策" />
                <TextAreaField label="メモ" name="note" placeholder="使い方、使用量、次回確認したい点など" />
                <SubmitButton>商品提案を記録</SubmitButton>
              </form>

              <div className="mt-4 grid gap-3">
                {customer.productProposals.map((proposal) => {
                  const latestRequest = proposal.reviewRequests[0] ?? null;
                  const requestLabel = latestRequest
                    ? reviewRequestStatusLabel(latestRequest.status, latestRequest.expiresAt, latestRequest.answeredAt)
                    : "未依頼";
                  const tags = parseProductStringArray(proposal.concernTags);

                  return (
                    <article key={proposal.id} className="rounded-md border border-stone-200 bg-[#fbf8f3] p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold text-stone-950">{proposal.product.name}</h3>
                            <Pill tone={proposal.status === "purchased" ? "green" : proposal.status === "sample_given" ? "amber" : "stone"}>
                              {productProposalStatusLabel(proposal.status)}
                            </Pill>
                            <Pill tone={requestLabel === "回答済み" ? "green" : requestLabel === "期限切れ" ? "amber" : "stone"}>{requestLabel}</Pill>
                          </div>
                          <p className="mt-1 text-xs text-stone-500">
                            {[proposal.product.manufacturerName, proposal.product.category, productProposalReactionLabel(proposal.reaction)]
                              .filter(Boolean)
                              .join(" / ")}
                          </p>
                          {tags.length > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {tags.map((tag) => (
                                <span key={tag} className="rounded border border-amber-100 bg-white px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          {proposal.proposalReason ? <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-stone-700">{proposal.proposalReason}</p> : null}
                          {proposal.note ? <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-stone-500">{proposal.note}</p> : null}
                          {latestRequest?.review ? (
                            <p className="mt-2 text-xs text-teal-800">
                              回答: {latestRequest.review.usedStatus === "used" ? "使用済み" : latestRequest.review.usedStatus === "not_yet" ? "未使用" : "覚えていない"}
                              {latestRequest.review.rating ? ` / 満足度 ${latestRequest.review.rating}` : ""}
                            </p>
                          ) : null}
                        </div>
                        <ProductReviewRequestButton proposalId={proposal.id} />
                      </div>
                    </article>
                  );
                })}
                {customer.productProposals.length === 0 ? <p className="text-sm text-stone-500">商品提案はまだありません。</p> : null}
              </div>
            </div>

            <div className="hidden rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-amber-700" />
                <h2 className="text-sm font-semibold text-stone-950">商品提案・反応記録</h2>
              </div>
              <form action={createProductSuggestionAction} className="mt-4 grid gap-3 rounded-md border border-amber-200 bg-amber-50 p-4">
                <TextField label="商品名" name="productName" placeholder="例: カラーケアシャンプー" required />
                <div className="grid gap-3 md:grid-cols-2">
                  <TextField label="カテゴリ" name="category" placeholder="例: ホームケア" />
                  <TextField label="メーカー" name="makerName" placeholder="例: メーカー名" />
                  <TextField label="見込み金額" name="estimatedPrice" type="number" placeholder="例: 3200" />
                  <label className="grid gap-1 text-sm font-medium text-stone-700">
                    紐づく限定提案
                    <select
                      name="offerId"
                      defaultValue=""
                      className="h-11 rounded-md border border-stone-200 bg-white px-3 text-stone-950 shadow-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                    >
                      <option value="">紐づけなし</option>
                      {visibleCustomerOffers.map((offer) => (
                        <option key={offer.id} value={offer.id}>
                          {offer.title}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <TextAreaField label="提案理由" name="reason" placeholder="髪質、施術履歴、好みに基づく提案理由" />
                <SubmitButton>商品提案を保存</SubmitButton>
              </form>
              <div className="mt-4 grid gap-3">
                {customer.productSuggestions.map((suggestion) => (
                  <article key={suggestion.id} className="rounded-md border border-stone-200 bg-[#fbf8f3] p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-stone-950">{suggestion.productName}</h3>
                          <Pill tone={crmStatusTone(suggestion.status)}>{crmStatusLabel(suggestion.status)}</Pill>
                        </div>
                        <p className="mt-1 text-xs text-stone-500">
                          {[suggestion.category, suggestion.makerName, suggestion.estimatedPrice ? `${suggestion.estimatedPrice.toLocaleString("ja-JP")}円` : null]
                            .filter(Boolean)
                            .join(" / ")}
                        </p>
                        {suggestion.reason ? <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-stone-700">{suggestion.reason}</p> : null}
                      </div>
                    </div>
                    <form action={updateProductSuggestionReaction.bind(null, suggestion.id, customer.id)} className="mt-3 flex flex-wrap gap-2">
                      <select
                        name="status"
                        defaultValue={suggestion.status}
                        className="h-9 rounded-md border border-stone-200 bg-white px-2 text-xs text-stone-950"
                      >
                        <option value="proposed">提案中</option>
                        <option value="interested">興味あり</option>
                        <option value="purchased">購入済み</option>
                        <option value="declined">見送り</option>
                      </select>
                      <input
                        name="reactionNote"
                        defaultValue={suggestion.reactionNote ?? ""}
                        placeholder="反応メモ"
                        className="h-9 w-full min-w-0 rounded-md border border-stone-200 bg-white px-2 text-xs text-stone-950 sm:min-w-[180px]"
                      />
                      <button
                        type="submit"
                        className="inline-flex h-9 items-center justify-center rounded-md border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                      >
                        保存
                      </button>
                    </form>
                  </article>
                ))}
                {customer.productSuggestions.length === 0 ? <p className="text-sm text-stone-500">商品提案はまだありません。</p> : null}
              </div>
            </div>

            <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Handshake className="h-4 w-4 text-indigo-700" />
                <h2 className="text-sm font-semibold text-stone-950">他業種クーポン連携</h2>
              </div>
              <form action={createPartnerCouponAction} className="mt-4 grid gap-3 rounded-md border border-indigo-200 bg-indigo-50 p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <TextField label="連携先名" name="partnerName" placeholder="例: ネイルサロンA" required />
                  <TextField label="業種" name="industry" placeholder="例: ネイル / エステ / カフェ" />
                </div>
                <TextField label="クーポン名" name="title" placeholder="例: 初回ケアメニュー10%OFF" required />
                <div className="grid gap-3 md:grid-cols-2">
                  <TextField label="特典" name="benefit" placeholder="例: 10%OFF" />
                  <TextField label="クーポンコード" name="couponCode" />
                  <TextField label="URL" name="url" />
                  <TextField label="有効期限" name="validUntil" type="date" />
                </div>
                <label className="grid gap-1 text-sm font-medium text-stone-700">
                  公開状態
                  <select
                    name="status"
                    defaultValue="draft"
                    className="h-11 rounded-md border border-stone-200 bg-white px-3 text-stone-950 shadow-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  >
                    <option value="draft">下書き</option>
                    <option value="published">お客様ページに公開</option>
                  </select>
                </label>
                <TextAreaField label="説明" name="description" placeholder="紹介条件、対象メニュー、連携先への引き継ぎメモ" />
                <SubmitButton>他業種クーポンを保存</SubmitButton>
              </form>
              <div className="mt-4 grid gap-3">
                {customer.partnerCoupons.map((coupon) => (
                  <article key={coupon.id} className="rounded-md border border-stone-200 bg-[#fbf8f3] p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-stone-950">{coupon.title}</h3>
                      <Pill tone={crmStatusTone(coupon.status)}>{crmStatusLabel(coupon.status)}</Pill>
                    </div>
                    <p className="mt-1 text-xs text-stone-500">
                      {[coupon.partnerName, coupon.industry, coupon.benefit, coupon.validUntil ? `期限: ${formatDate(coupon.validUntil)}` : null]
                        .filter(Boolean)
                        .join(" / ")}
                    </p>
                    {coupon.description ? <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-stone-700">{coupon.description}</p> : null}
                    <form action={updatePartnerCouponReaction.bind(null, coupon.id, customer.id)} className="mt-3 flex flex-wrap gap-2">
                      <select
                        name="status"
                        defaultValue={coupon.status}
                        className="h-9 rounded-md border border-stone-200 bg-white px-2 text-xs text-stone-950"
                      >
                        <option value="draft">下書き</option>
                        <option value="published">公開中</option>
                        <option value="interested">興味あり</option>
                        <option value="redeemed">利用済み</option>
                        <option value="declined">見送り</option>
                      </select>
                      <input
                        name="reactionNote"
                        defaultValue={coupon.reactionNote ?? ""}
                        placeholder="反応メモ"
                        className="h-9 w-full min-w-0 rounded-md border border-stone-200 bg-white px-2 text-xs text-stone-950 sm:min-w-[180px]"
                      />
                      <button
                        type="submit"
                        className="inline-flex h-9 items-center justify-center rounded-md border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                      >
                        保存
                      </button>
                    </form>
                  </article>
                ))}
                {customer.partnerCoupons.length === 0 ? <p className="text-sm text-stone-500">他業種クーポンはまだありません。</p> : null}
              </div>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="products" className="mt-0 grid gap-5">
          <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
                  <ShoppingBag className="h-4 w-4" />
                  商品提案
                </div>
                <h2 className="mt-3 text-xl font-semibold text-stone-950">提案履歴・商品案内・購入・レビュー依頼</h2>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  商品名はマスタから選択します。お客様アンケートは、この提案履歴に紐づく商品だけに発行されます。
                </p>
              </div>
              <Link
                href="/admin/reports/product-feedback"
                className="inline-flex h-10 items-center gap-2 rounded-md border border-stone-200 bg-stone-50 px-4 text-sm font-semibold text-stone-800 hover:bg-stone-100"
              >
                商品レポート
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-md border border-stone-200 bg-[#fbf8f3] p-3">
                <p className="text-xs font-semibold text-stone-500">提案履歴</p>
                <p className="mt-2 text-xl font-semibold text-stone-950">{customer.productProposals.length}</p>
              </div>
              <div className="rounded-md border border-stone-200 bg-[#fbf8f3] p-3">
                <p className="text-xs font-semibold text-stone-500">商品案内</p>
                <p className="mt-2 text-xl font-semibold text-stone-950">
                  {customer.productProposals.filter((proposal) => proposal.status === "sample_given").length}
                </p>
              </div>
              <div className="rounded-md border border-stone-200 bg-[#fbf8f3] p-3">
                <p className="text-xs font-semibold text-stone-500">購入</p>
                <p className="mt-2 text-xl font-semibold text-stone-950">
                  {customer.productProposals.filter((proposal) => proposal.status === "purchased" || proposal.purchased).length}
                </p>
              </div>
              <div className="rounded-md border border-stone-200 bg-[#fbf8f3] p-3">
                <p className="text-xs font-semibold text-stone-500">レビュー依頼</p>
                <p className="mt-2 text-xl font-semibold text-stone-950">
                  {customer.productProposals.reduce((sum, proposal) => sum + proposal.reviewRequests.length, 0)}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-amber-700" />
              <h2 className="text-sm font-semibold text-stone-950">商品提案・レビュー依頼</h2>
            </div>
            <p className="mt-2 text-xs leading-5 text-stone-500">
              商品名はマスタから選択します。お客様用アンケートは、この提案履歴に紐づく商品だけに発行されます。
            </p>

            <form action={createProductProposal} className="mt-4 grid gap-3 rounded-md border border-amber-200 bg-amber-50 p-4">
              <label className="grid gap-1 text-sm font-medium text-stone-700">
                商品
                <select
                  name="productId"
                  required
                  className="h-11 rounded-md border border-stone-200 bg-white px-3 text-stone-950 shadow-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                >
                  <option value="">商品を選択</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.manufacturerName} / {product.name}
                    </option>
                  ))}
                </select>
              </label>
              <Link
                href="/admin/products#new-product"
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-stone-200 bg-white px-4 text-xs font-semibold text-amber-800 shadow-sm transition hover:bg-amber-50"
              >
                商品が見つからない場合は商品マスタに追加
              </Link>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-1 text-sm font-medium text-stone-700">
                  状態
                  <select
                    name="status"
                    defaultValue="sample_given"
                    className="h-11 rounded-md border border-stone-200 bg-white px-3 text-stone-950 shadow-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  >
                    <option value="proposed">提案のみ</option>
                    <option value="sample_given">商品を案内した</option>
                    <option value="purchased">購入した</option>
                    <option value="used_in_service">施術で使った</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm font-medium text-stone-700">
                  お客様の反応
                  <select
                    name="reaction"
                    defaultValue="interested"
                    className="h-11 rounded-md border border-stone-200 bg-white px-3 text-stone-950 shadow-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  >
                    <option value="">未記録</option>
                    <option value="interested">興味あり</option>
                    <option value="purchased">購入</option>
                    <option value="consider_next">次回検討</option>
                    <option value="not_interested">興味なし</option>
                  </select>
                </label>
              </div>

              <label className="grid gap-1 text-sm font-medium text-stone-700">
                悩みタグ
                <input
                  name="concernTags"
                  placeholder="例: 乾燥、ダメージ、カラー後"
                  className="h-11 rounded-md border border-stone-200 bg-white px-3 text-stone-950 shadow-sm outline-none placeholder:text-stone-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                />
              </label>
              <TextAreaField label="提案理由" name="proposalReason" placeholder="例: カラー後のパサつき・まとまり対策" />
              <TextAreaField label="メモ" name="note" placeholder="使い方、使用量、次回確認したい点など" />
              <SubmitButton>商品提案を記録</SubmitButton>
            </form>

            <div className="mt-4 grid gap-3">
              {customer.productProposals.map((proposal) => {
                const latestRequest = proposal.reviewRequests[0] ?? null;
                const requestLabel = latestRequest
                  ? reviewRequestStatusLabel(latestRequest.status, latestRequest.expiresAt, latestRequest.answeredAt)
                  : "未依頼";
                const tags = parseProductStringArray(proposal.concernTags);

                return (
                  <article key={proposal.id} className="rounded-md border border-stone-200 bg-[#fbf8f3] p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-stone-950">{proposal.product.name}</h3>
                          <Pill tone={proposal.status === "purchased" ? "green" : proposal.status === "sample_given" ? "amber" : "stone"}>
                            {productProposalStatusLabel(proposal.status)}
                          </Pill>
                          <Pill tone={requestLabel === "回答済み" ? "green" : requestLabel === "期限切れ" ? "amber" : "stone"}>{requestLabel}</Pill>
                        </div>
                        <p className="mt-1 text-xs text-stone-500">
                          {[proposal.product.manufacturerName, proposal.product.category, productProposalReactionLabel(proposal.reaction)]
                            .filter(Boolean)
                            .join(" / ")}
                        </p>
                        {tags.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {tags.map((tag) => (
                              <span key={tag} className="rounded border border-amber-100 bg-white px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {proposal.proposalReason ? <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-stone-700">{proposal.proposalReason}</p> : null}
                        {proposal.note ? <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-stone-500">{proposal.note}</p> : null}
                        {latestRequest?.review ? (
                          <p className="mt-2 text-xs text-teal-800">
                            回答: {latestRequest.review.usedStatus === "used" ? "使用済み" : latestRequest.review.usedStatus === "not_yet" ? "未使用" : "覚えていない"}
                            {latestRequest.review.rating ? ` / 満足度 ${latestRequest.review.rating}` : ""}
                          </p>
                        ) : null}
                      </div>
                      <ProductReviewRequestButton proposalId={proposal.id} />
                    </div>
                  </article>
                );
              })}
              {customer.productProposals.length === 0 ? <p className="text-sm text-stone-500">商品提案はまだありません。</p> : null}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="points" className="mt-0 grid gap-4">
          <section className="overflow-hidden rounded-[20px] border border-[color:var(--lien-border)] bg-white shadow-sm">
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
              <div>
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--lien-primary)]">
                  <TicketPercent className="h-4 w-4" />
                  利用可能ポイント
                </p>
                <p className="mt-2 text-4xl font-semibold tabular-nums text-[color:var(--lien-ink)]">
                  {pointAccount.availablePoints.toLocaleString("ja-JP")}
                  <span className="ml-1 text-lg">pt</span>
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[20px] border border-[color:var(--lien-border)] bg-white p-5 shadow-sm sm:p-6">
            <h3 className="text-base font-semibold text-[color:var(--lien-ink)]">ポイント履歴</h3>
            <div className="mt-3 divide-y divide-[color:var(--lien-border)]">
              {customer.pointTransactions.map((transaction) => (
                <div key={transaction.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[color:var(--lien-ink)]">{transaction.reason}</p>
                    <p className="mt-1 text-xs text-[color:var(--lien-muted)]">{formatDateTime(transaction.createdAt)}</p>
                  </div>
                  <p className={`self-center whitespace-nowrap text-sm font-semibold tabular-nums ${transaction.amount >= 0 ? "text-teal-800" : "text-red-700"}`}>
                    {transaction.amount > 0 ? "+" : ""}
                    {transaction.amount.toLocaleString("ja-JP")}pt
                  </p>
                </div>
              ))}
              {customer.pointTransactions.length === 0 ? (
                <p className="py-8 text-center text-sm text-[color:var(--lien-muted)]">履歴はまだありません。</p>
              ) : null}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="history" className="mt-0 grid gap-5">
          <section className="rounded-[20px] border border-[color:var(--lien-border)] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-[color:var(--lien-ink)]">
                  <ClipboardList className="h-5 w-5 text-teal-800" />
                  来店・会計履歴
                </h2>
                <p className="mt-1 text-sm text-[color:var(--lien-muted)]">施術メニュー、会計、担当者を来店日ごとにまとめています。</p>
              </div>
              <span className="shrink-0 rounded-full bg-[color:var(--lien-surface-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--lien-muted)]">
                {unifiedVisitHistory.length}件
              </span>
            </div>
            <div className="mt-4 grid gap-3">
              {unifiedVisitHistory.map((item) => {
                const appointment = item.sales.find((sale) => sale.appointment)?.appointment ?? null;
                const recordedMenus = Array.from(
                  new Set(
                    [item.visit?.performedStyle, item.visit?.requestedStyle, appointment?.menu]
                      .map((menu) => menu?.trim())
                      .filter((menu): menu is string => Boolean(menu))
                  )
                );
                const saleTitles = Array.from(new Set(item.sales.map((sale) => sale.title.trim()).filter(Boolean)));
                const menuLabels = recordedMenus.length > 0 ? recordedMenus : saleTitles;
                const saleBreakdown = saleTitles.filter((title) => !menuLabels.includes(title));
                const purchasedProducts = Array.from(
                  item.sales
                    .flatMap((sale) => sale.productLines)
                    .reduce((items, line) => {
                      const current = items.get(line.productId);
                      items.set(line.productId, {
                        productId: line.productId,
                        manufacturerName: line.manufacturerNameSnapshot,
                        productName: line.productNameSnapshot,
                        quantity: (current?.quantity ?? 0) + line.quantity,
                        total: (current?.total ?? 0) + line.lineTotal
                      });
                      return items;
                    }, new Map<string, { productId: string; manufacturerName: string; productName: string; quantity: number; total: number }>())
                    .values()
                );
                const staffName =
                  normalizeSalonStaffName(item.visit?.stylistName ?? appointment?.staffName) ?? "フリー（指名なし）";
                const saleTotal = priceSum(item.sales.map((sale) => sale.amount));
                const paymentMethods = Array.from(
                  new Set(item.sales.map((sale) => sale.paymentMethod?.trim()).filter((method): method is string => Boolean(method)))
                );
                const visitPhotos = (item.visit?.photos ?? []).flatMap((photo) => {
                  const url = visitPhotoUrlById.get(photo.id);
                  return url
                    ? [
                        {
                          id: photo.id,
                          url,
                          caption: photo.caption,
                          uploadedByName: photo.uploadedByName,
                          createdAt: photo.createdAt.toISOString()
                        }
                      ]
                    : [];
                });

                return (
                  <article key={item.id} className="rounded-xl border border-[color:var(--lien-border)] bg-[color:var(--lien-surface-soft)] p-4">
                    <div className="flex items-center justify-between gap-3 border-b border-[color:var(--lien-border)] pb-3">
                      <p className="font-semibold text-[color:var(--lien-ink)]">{formatDate(item.occurredAt)}</p>
                      {saleTotal > 0 ? (
                        <p className="whitespace-nowrap text-base font-semibold tabular-nums text-[color:var(--lien-primary-dark)]">
                          {saleTotal.toLocaleString("ja-JP")}円
                        </p>
                      ) : (
                        <span className="text-xs font-medium text-[color:var(--lien-muted)]">会計未登録</span>
                      )}
                    </div>
                    <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                      <div className="min-w-0">
                        <dt className="text-xs font-semibold text-[color:var(--lien-muted)]">施術メニュー</dt>
                        <dd className="mt-1 font-semibold text-[color:var(--lien-ink)]">
                          {menuLabels.length > 0 ? menuLabels.join(" / ") : "未入力"}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-xs font-semibold text-[color:var(--lien-muted)]">担当者</dt>
                        <dd className="mt-1 font-semibold text-[color:var(--lien-ink)]">{staffName}</dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-xs font-semibold text-[color:var(--lien-muted)]">会計</dt>
                        <dd className="mt-1 font-semibold text-[color:var(--lien-ink)]">
                          {saleTotal > 0 ? `${saleTotal.toLocaleString("ja-JP")}円` : "未登録"}
                          {paymentMethods.length > 0 ? ` / ${paymentMethods.join("・")}` : ""}
                        </dd>
                      </div>
                    </dl>
                    {saleBreakdown.length > 0 ? (
                      <p className="mt-3 text-xs leading-5 text-[color:var(--lien-muted)]">会計内訳: {saleBreakdown.join(" / ")}</p>
                    ) : null}
                    {purchasedProducts.length > 0 ? (
                      <div className="mt-3 rounded-xl border border-[color:var(--lien-border)] bg-white/80 p-3">
                        <p className="text-xs font-semibold text-[color:var(--lien-primary-dark)]">購入商品</p>
                        <div className="mt-2 grid gap-2">
                          {purchasedProducts.map((product) => (
                            <div key={product.productId} className="flex items-start justify-between gap-3 text-xs">
                              <span className="min-w-0 leading-5 text-[color:var(--lien-ink)]"><span className="text-[color:var(--lien-muted)]">{product.manufacturerName}</span><br />{product.productName}</span>
                              <span className="shrink-0 text-right font-semibold tabular-nums">{product.quantity}点<br /><span className="text-[color:var(--lien-muted)]">{product.total.toLocaleString("ja-JP")}円</span></span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {item.visit?.cutNotes || item.visit?.colorNotes || item.visit?.permNotes || item.visit?.customerReaction ? (
                      <div className="mt-3 grid gap-1 border-t border-[color:var(--lien-border)] pt-3 text-xs leading-5 text-stone-700">
                        {item.visit.cutNotes ? <p>カット: {item.visit.cutNotes}</p> : null}
                        {item.visit.colorNotes ? <p>カラー: {item.visit.colorNotes}</p> : null}
                        {item.visit.permNotes ? <p>パーマ・質感: {item.visit.permNotes}</p> : null}
                        {item.visit.customerReaction ? <p>お客様の反応: {item.visit.customerReaction}</p> : null}
                      </div>
                    ) : null}
                    <VisitAfterPhotoUploader
                      customerId={customer.id}
                      visitId={item.visit?.id ?? null}
                      historyDate={historyDateKey(item.occurredAt)}
                      photos={visitPhotos}
                    />
                  </article>
                );
              })}
              {unifiedVisitHistory.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[color:var(--lien-border)] bg-[color:var(--lien-surface-soft)] p-5 text-center text-sm text-[color:var(--lien-muted)]">
                  来店・会計履歴はまだありません。
                </p>
              ) : null}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="delete" className="mt-0 grid gap-4 xl:grid-cols-2">
          <section className="rounded-lg border border-red-200 bg-white p-4 shadow-sm xl:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-red-800">
                  <Trash2 className="h-4 w-4" />
                  店舗の顧客一覧から非表示
                </h2>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  この店舗の顧客一覧・カルテからのみ非表示にします。顧客アカウント、他店舗のカルテ、予約・会計・施術履歴は削除されません。
                </p>
              </div>
              <span className="rounded border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-800">
                店舗のみ非表示
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
                {customer.name}さんを、この店舗の顧客一覧から非表示にすることを確認しました。
              </label>
              <button
                type="submit"
                className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md bg-red-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-red-800"
              >
                <Trash2 className="h-4 w-4" />
                この店舗から非表示にする
              </button>
            </form>
          </section>
        </TabsContent>

        <TabsContent value="history-legacy" className="mt-0 grid gap-5">
          <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-950">
              <UserRound className="h-4 w-4 text-teal-700" />
              基本情報を更新
            </h2>
            <form action={updateCustomerAction} className="mt-4 grid gap-3">
              <TextField label="名前" name="name" value={customer.name} required />
              <SelectField label="性別" name="gender" value={customer.gender} options={genderOptions} />
              <TextField label="生年月日" name="birthDate" type="date" value={birthDateInputValue(customer.birthDate)} />
              <TextField label="電話番号" name="phone" value={customer.phone} />
              <label className="grid gap-1.5 text-sm font-semibold text-lien-ink">
                担当者・指名
                <select
                  name="assignedStaffSelection"
                  defaultValue={customer.staffAssignmentType === "assigned" && customer.assignedStaffName ? normalizeSalonStaffName(customer.assignedStaffName) ?? "free" : "free"}
                  className="lien-input"
                >
                  <option value="free">フリー（指名なし）</option>
                  {staffOptions.map((staff) => <option key={staff} value={staff}>{staff}</option>)}
                </select>
              </label>
              <SelectField label="接客スタイル" name="servicePreference" value={customer.servicePreference} options={servicePreferenceOptions} />
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
                    <CustomerPortalMessageCopyButton customerId={customer.id} text={card.message} label="文面コピー" />
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
              <CustomerPortalMessageCopyButton customerId={customer.id} text={preferredContactMessage} label="入力文面をコピー" />
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
              <SelectField
                label="担当者"
                name="stylistName"
                value={normalizeSalonStaffName(
                  customer.staffAssignmentType === "assigned" ? customer.assignedStaffName : latestVisit?.stylistName
                )}
                options={staffOptions}
              />
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

