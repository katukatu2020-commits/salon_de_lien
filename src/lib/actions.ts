"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  nullableBoolean,
  nullableInt,
  nullableString,
  requiredDate,
  requiredString
} from "@/lib/form";

export async function createCustomer(formData: FormData) {
  const customer = await prisma.customer.create({
    data: {
      name: requiredString(formData, "name"),
      gender: nullableString(formData, "gender"),
      birthYear: nullableInt(formData, "birthYear"),
      phone: nullableString(formData, "phone"),
      memo: nullableString(formData, "memo")
    }
  });

  revalidatePath("/customers");
  redirect(`/customers/${customer.id}`);
}

export async function updateCustomer(customerId: string, formData: FormData) {
  await prisma.customer.update({
    where: { id: customerId },
    data: {
      name: requiredString(formData, "name"),
      gender: nullableString(formData, "gender"),
      birthYear: nullableInt(formData, "birthYear"),
      phone: nullableString(formData, "phone"),
      memo: nullableString(formData, "memo")
    }
  });

  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
}

export async function upsertHairProfile(customerId: string, formData: FormData) {
  await prisma.hairProfile.upsert({
    where: { customerId },
    create: {
      customerId,
      hairThickness: nullableString(formData, "hairThickness"),
      hairVolume: nullableString(formData, "hairVolume"),
      hairTexture: nullableString(formData, "hairTexture"),
      scalpCondition: nullableString(formData, "scalpCondition"),
      faceShape: nullableString(formData, "faceShape"),
      forehead: nullableString(formData, "forehead"),
      lifestyle: nullableString(formData, "lifestyle"),
      stylingTimeMinutes: nullableInt(formData, "stylingTimeMinutes")
    },
    update: {
      hairThickness: nullableString(formData, "hairThickness"),
      hairVolume: nullableString(formData, "hairVolume"),
      hairTexture: nullableString(formData, "hairTexture"),
      scalpCondition: nullableString(formData, "scalpCondition"),
      faceShape: nullableString(formData, "faceShape"),
      forehead: nullableString(formData, "forehead"),
      lifestyle: nullableString(formData, "lifestyle"),
      stylingTimeMinutes: nullableInt(formData, "stylingTimeMinutes")
    }
  });

  revalidatePath(`/customers/${customerId}`);
}

export async function upsertPreference(customerId: string, formData: FormData) {
  await prisma.preference.upsert({
    where: { customerId },
    create: {
      customerId,
      preferredLength: nullableString(formData, "preferredLength"),
      preferredStyle: nullableString(formData, "preferredStyle"),
      dislikes: nullableString(formData, "dislikes"),
      colorPreference: nullableString(formData, "colorPreference"),
      maintenanceLevel: nullableString(formData, "maintenanceLevel"),
      referenceNotes: nullableString(formData, "referenceNotes")
    },
    update: {
      preferredLength: nullableString(formData, "preferredLength"),
      preferredStyle: nullableString(formData, "preferredStyle"),
      dislikes: nullableString(formData, "dislikes"),
      colorPreference: nullableString(formData, "colorPreference"),
      maintenanceLevel: nullableString(formData, "maintenanceLevel"),
      referenceNotes: nullableString(formData, "referenceNotes")
    }
  });

  revalidatePath(`/customers/${customerId}`);
}

export async function createVisit(customerId: string, formData: FormData) {
  await prisma.visit.create({
    data: {
      customerId,
      visitedAt: requiredDate(formData, "visitedAt"),
      stylistName: nullableString(formData, "stylistName"),
      requestedStyle: nullableString(formData, "requestedStyle"),
      performedStyle: nullableString(formData, "performedStyle"),
      cutNotes: nullableString(formData, "cutNotes"),
      colorNotes: nullableString(formData, "colorNotes"),
      permNotes: nullableString(formData, "permNotes"),
      customerReaction: nullableString(formData, "customerReaction"),
      nextRecommendation: nullableString(formData, "nextRecommendation")
    }
  });

  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
}

export async function createStyleSuggestion(customerId: string, formData: FormData) {
  await prisma.styleSuggestion.create({
    data: {
      customerId,
      visitId: nullableString(formData, "visitId"),
      suggestedStyleName: requiredString(formData, "suggestedStyleName"),
      reason: nullableString(formData, "reason"),
      caution: nullableString(formData, "caution"),
      stylingAdvice: nullableString(formData, "stylingAdvice"),
      accepted: nullableBoolean(formData, "accepted")
    }
  });

  revalidatePath(`/customers/${customerId}`);
}

export async function updateStyleSuggestionAccepted(
  customerId: string,
  suggestionId: string,
  accepted: boolean
) {
  await prisma.styleSuggestion.update({
    where: { id: suggestionId },
    data: { accepted }
  });

  revalidatePath(`/customers/${customerId}`);
}
