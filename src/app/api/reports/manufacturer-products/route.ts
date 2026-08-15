import { NextResponse, type NextRequest } from "next/server";
import { getDemoManufacturerProductFeedbackReport } from "@/lib/products/demo-manufacturer-feedback";
import { getManufacturerProductReport } from "@/lib/products/manufacturer-report";
import { requireManufacturerReportAccess } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

function parseDateParam(value: string | null) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function containsForbiddenKeys(value: unknown): boolean {
  const forbidden = new Set(["customerId", "customerName", "phone", "email", "staffId", "visitId", "visitedAt"]);

  if (Array.isArray(value)) {
    return value.some(containsForbiddenKeys);
  }

  if (typeof value === "object" && value !== null) {
    return Object.entries(value).some(([key, nested]) => forbidden.has(key) || containsForbiddenKeys(nested));
  }

  return false;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const isDemo =
    process.env.APP_ENV !== "production" &&
    process.env.ALLOW_DEMO_DATA === "true" &&
    searchParams.get("demo") === "1";
  const requestedManufacturer = searchParams.get("manufacturer") || "ミルボン";
  const session = await requireManufacturerReportAccess(requestedManufacturer);
  const manufacturer = session.role === "MANUFACTURER" ? session.manufacturerName ?? requestedManufacturer : requestedManufacturer;
  const reportParams = {
    manufacturer,
    organizationId: session.organizationId,
    productName: searchParams.get("productName") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    from: parseDateParam(searchParams.get("from")),
    to: parseDateParam(searchParams.get("to"))
  };
  const report = isDemo ? getDemoManufacturerProductFeedbackReport(reportParams) : await getManufacturerProductReport(reportParams);

  if (containsForbiddenKeys(report)) {
    return NextResponse.json({ error: "PII guard blocked manufacturer report response" }, { status: 500 });
  }

  return NextResponse.json(report);
}
