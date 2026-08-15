import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { AuthorizationError, requireCustomerAccess } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";
import { deleteCustomerPhotoReference, storeCustomerPhoto } from "@/lib/storage/customer-photo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_FILES_PER_UPLOAD = 4;

type RouteContext = {
  params: {
    customerId: string;
    visitId: string;
  };
};

function isUploadedFile(value: FormDataEntryValue): value is File {
  return typeof value !== "string" && typeof value.arrayBuffer === "function";
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const storedReferences: string[] = [];

  try {
    const { session } = await requireCustomerAccess(params.customerId, ["ADMIN", "STAFF"]);
    const visit = await prisma.visit.findFirst({
      where: {
        id: params.visitId,
        customerId: params.customerId,
        customer: {
          organizationId: session.organizationId ?? undefined,
          deletedAt: null
        }
      },
      select: { id: true }
    });

    if (!visit) {
      return NextResponse.json({ error: "対象の来店履歴が見つかりません。" }, { status: 404 });
    }

    const formData = await request.formData();
    const files = formData.getAll("photos").filter(isUploadedFile);
    if (files.length === 0) {
      return NextResponse.json({ error: "施術後の写真を選択してください。" }, { status: 400 });
    }
    if (files.length > MAX_FILES_PER_UPLOAD) {
      return NextResponse.json({ error: `一度に追加できる写真は${MAX_FILES_PER_UPLOAD}枚までです。` }, { status: 400 });
    }

    const captionValue = formData.get("caption");
    const caption = typeof captionValue === "string" ? captionValue.trim().slice(0, 120) || null : null;
    const appUser = session.userId
      ? await prisma.appUser.findUnique({
          where: { id: session.userId },
          select: { displayName: true }
        })
      : null;
    const uploadedByName =
      appUser?.displayName?.trim() || (session.role === "ADMIN" ? "管理者" : session.role === "STAFF" ? "スタッフ" : null);

    for (const file of files) {
      const stored = await storeCustomerPhoto({
        file,
        organizationId: session.organizationId ?? undefined,
        customerId: params.customerId,
        visitId: params.visitId,
        kind: "after"
      });
      storedReferences.push(stored.reference);
    }

    const photos = await prisma.$transaction(
      storedReferences.map((storageReference) =>
        prisma.visitPhoto.create({
          data: {
            customerId: params.customerId,
            visitId: params.visitId,
            storageReference,
            caption,
            uploadedByUserId: session.userId,
            uploadedByName
          },
          select: { id: true }
        })
      )
    );

    revalidatePath(`/customers/${params.customerId}`);
    revalidatePath(`/admin/customers/${params.customerId}`);
    revalidatePath("/admin/appointments");
    revalidatePath("/u/history");
    revalidatePath("/u/community");
    revalidatePath("/admin/community");
    return NextResponse.json({ success: true, count: photos.length }, { status: 201 });
  } catch (error) {
    await Promise.allSettled(storedReferences.map((reference) => deleteCustomerPhotoReference(reference)));
    const status = error instanceof AuthorizationError ? error.status : 400;
    const message = error instanceof Error ? error.message : "写真を保存できませんでした。";
    return NextResponse.json({ error: message }, { status });
  }
}
