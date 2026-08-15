import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { AuthorizationError, requireCustomerAccess } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";
import { deleteCustomerPhotoReference, storeCustomerPhoto } from "@/lib/storage/customer-photo";
import { ensureHistoryVisit, historyDateRange } from "@/lib/visits/history-visit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_FILES_PER_UPLOAD = 4;

type RouteContext = {
  params: { customerId: string };
};

function isUploadedFile(value: FormDataEntryValue): value is File {
  return typeof value !== "string" && typeof value.arrayBuffer === "function";
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const storedReferences: string[] = [];

  try {
    const { session } = await requireCustomerAccess(params.customerId, ["ADMIN", "STAFF"]);
    const formData = await request.formData();
    const files = formData.getAll("photos").filter(isUploadedFile);
    if (files.length === 0) {
      return NextResponse.json({ error: "施術後の写真を選択してください。" }, { status: 400 });
    }
    if (files.length > MAX_FILES_PER_UPLOAD) {
      return NextResponse.json({ error: `一度に追加できる写真は${MAX_FILES_PER_UPLOAD}枚までです。` }, { status: 400 });
    }

    const dateValue = String(formData.get("historyDate") || "").trim();
    const range = historyDateRange(dateValue);
    if (!range) {
      return NextResponse.json({ error: "対象の履歴日を確認できませんでした。" }, { status: 400 });
    }

    const sale = await prisma.serviceSale.findFirst({
      where: {
        customerId: params.customerId,
        OR: [
          { paidAt: { gte: range.start, lt: range.end } },
          { appointment: { scheduledAt: { gte: range.start, lt: range.end } } }
        ]
      },
      orderBy: { paidAt: "desc" },
      select: {
        title: true,
        paidAt: true,
        appointment: { select: { scheduledAt: true, menu: true, staffName: true } }
      }
    });
    if (!sale) {
      return NextResponse.json({ error: "対象の来店・会計履歴が見つかりません。" }, { status: 404 });
    }

    const occurredAt = sale.appointment?.scheduledAt ?? sale.paidAt;
    const visit = await prisma.$transaction((tx) =>
      ensureHistoryVisit(tx, {
        customerId: params.customerId,
        occurredAt,
        menu: sale.appointment?.menu ?? sale.title,
        staffName: sale.appointment?.staffName
      })
    );

    const captionValue = formData.get("caption");
    const caption = typeof captionValue === "string" ? captionValue.trim().slice(0, 120) || null : null;
    const appUser = session.userId
      ? await prisma.appUser.findUnique({ where: { id: session.userId }, select: { displayName: true } })
      : null;
    const uploadedByName =
      appUser?.displayName?.trim() || (session.role === "ADMIN" ? "管理者" : session.role === "STAFF" ? "スタッフ" : null);

    for (const file of files) {
      const stored = await storeCustomerPhoto({
        file,
        organizationId: session.organizationId ?? undefined,
        customerId: params.customerId,
        visitId: visit.id,
        kind: "after"
      });
      storedReferences.push(stored.reference);
    }

    await prisma.$transaction(
      storedReferences.map((storageReference) =>
        prisma.visitPhoto.create({
          data: {
            customerId: params.customerId,
            visitId: visit.id,
            storageReference,
            caption,
            uploadedByUserId: session.userId,
            uploadedByName
          }
        })
      )
    );

    revalidatePath(`/customers/${params.customerId}`);
    revalidatePath(`/admin/customers/${params.customerId}`);
    revalidatePath("/admin/appointments");
    revalidatePath("/u/history");
    revalidatePath("/u/community");
    revalidatePath("/admin/community");
    return NextResponse.json({ success: true, count: storedReferences.length, visitId: visit.id }, { status: 201 });
  } catch (error) {
    await Promise.allSettled(storedReferences.map((reference) => deleteCustomerPhotoReference(reference)));
    const status = error instanceof AuthorizationError ? error.status : 400;
    const message = error instanceof Error ? error.message : "写真を保存できませんでした。";
    return NextResponse.json({ error: message }, { status });
  }
}
