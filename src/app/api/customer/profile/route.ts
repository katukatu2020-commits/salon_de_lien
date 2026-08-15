import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentCustomerSession } from "@/lib/auth/current-customer";
import { getExternalRequestUrl, hasValidRequestOrigin } from "@/lib/auth/request-security";
import {
  CUSTOMER_GENDER_OPTIONS,
  HAIR_CURL_OPTIONS,
  HAIR_TEXTURE_OPTIONS,
  HAIR_THICKNESS_OPTIONS,
  HAIR_VOLUME_OPTIONS,
  SERVICE_PREFERENCE_OPTIONS,
  isProfileOption
} from "@/lib/customer-profile-options";
import { prisma } from "@/lib/prisma";
import { SALON_STAFF_NAMES } from "@/lib/salon/staff";
import { birthYearFromDate, parseBirthDateInput } from "@/lib/customer-age";

function textValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalProfileValue<T extends readonly string[]>(formData: FormData, key: string, options: T) {
  const value = textValue(formData, key);
  if (!value) return null;
  return isProfileOption(options, value) ? value : undefined;
}

function redirectTo(request: NextRequest, status: "saved" | "invalid" | "failed") {
  const url = getExternalRequestUrl(request, "/u/profile");
  url.searchParams.set("profile", status);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest) {
  if (!hasValidRequestOrigin(request)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  const session = await getCurrentCustomerSession();
  if (!session) {
    return NextResponse.redirect(getExternalRequestUrl(request, "/u/login"), 303);
  }

  const formData = await request.formData();
  const name = textValue(formData, "name");
  const phone = textValue(formData, "phone");
  const birthDate = parseBirthDateInput(textValue(formData, "birthDate"));
  const gender = optionalProfileValue(formData, "gender", CUSTOMER_GENDER_OPTIONS);
  const hairVolume = optionalProfileValue(formData, "hairVolume", HAIR_VOLUME_OPTIONS);
  const hairTexture = optionalProfileValue(formData, "hairTexture", HAIR_TEXTURE_OPTIONS);
  const hairThickness = optionalProfileValue(formData, "hairThickness", HAIR_THICKNESS_OPTIONS);
  const hairCurl = optionalProfileValue(formData, "hairCurl", HAIR_CURL_OPTIONS);
  const servicePreference = optionalProfileValue(
    formData,
    "servicePreference",
    SERVICE_PREFERENCE_OPTIONS
  );
  const assignedStaffSelection = textValue(formData, "assignedStaffSelection");
  const hasAssignedStaff = assignedStaffSelection !== "free";
  const validAssignedStaff = SALON_STAFF_NAMES.includes(assignedStaffSelection);

  const invalid =
    name.length < 1 ||
    name.length > 80 ||
    phone.length > 30 ||
    birthDate === undefined ||
    gender === undefined ||
    hairVolume === undefined ||
    hairTexture === undefined ||
    hairThickness === undefined ||
    hairCurl === undefined ||
    servicePreference === undefined ||
    (hasAssignedStaff && !validAssignedStaff);

  if (invalid) return redirectTo(request, "invalid");

  try {
    await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findFirst({
        where: {
          id: session.customerId,
          organizationId: session.organizationId,
          deletedAt: null
        },
        select: { id: true, birthYear: true }
      });
      if (!customer) throw new Error("Customer not found");

      await tx.customer.update({
        where: { id: customer.id },
        data: {
          name,
          phone: phone || null,
          gender,
          birthDate,
          birthYear: birthDate ? birthYearFromDate(birthDate) : customer.birthYear,
          servicePreference,
          staffAssignmentType: hasAssignedStaff ? "assigned" : "free",
          assignedStaffName: hasAssignedStaff ? assignedStaffSelection : null
        }
      });

      await tx.hairProfile.upsert({
        where: { customerId: customer.id },
        update: { hairVolume, hairTexture, hairThickness, hairCurl },
        create: {
          customerId: customer.id,
          hairVolume,
          hairTexture,
          hairThickness,
          hairCurl
        }
      });
    });
  } catch {
    return redirectTo(request, "failed");
  }

  revalidatePath("/u/profile");
  return redirectTo(request, "saved");
}
