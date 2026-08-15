import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { AuthorizationError, requireCustomerAccess } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";
import { deleteCustomerPhotoReference } from "@/lib/storage/customer-photo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: {
    customerId: string;
    visitId: string;
    photoId: string;
  };
};

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { session } = await requireCustomerAccess(params.customerId, ["ADMIN", "STAFF"]);
    const photo = await prisma.visitPhoto.findFirst({
      where: {
        id: params.photoId,
        customerId: params.customerId,
        visitId: params.visitId,
        customer: {
          organizationId: session.organizationId ?? undefined,
          deletedAt: null
        }
      },
      select: { id: true, storageReference: true }
    });
    if (!photo) {
      return NextResponse.json({ error: "対象の写真が見つかりません。" }, { status: 404 });
    }

    await deleteCustomerPhotoReference(photo.storageReference);
    const deleted = await prisma.visitPhoto.deleteMany({
      where: {
        id: photo.id,
        customerId: params.customerId,
        visitId: params.visitId
      }
    });
    if (deleted.count !== 1) {
      return NextResponse.json({ error: "写真情報を削除できませんでした。もう一度お試しください。" }, { status: 409 });
    }

    revalidatePath(`/customers/${params.customerId}`);
    revalidatePath(`/admin/customers/${params.customerId}`);
    revalidatePath("/admin/appointments");
    revalidatePath("/u/history");
    revalidatePath("/u/community");
    revalidatePath("/admin/community");
    return NextResponse.json({ success: true });
  } catch (error) {
    const status = error instanceof AuthorizationError ? error.status : 400;
    const message = error instanceof Error ? error.message : "写真を削除できませんでした。";
    return NextResponse.json({ error: message }, { status });
  }
}
