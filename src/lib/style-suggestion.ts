import { prisma } from "@/lib/prisma";

export async function buildStyleSuggestionContext(customerId: string) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      hairProfile: true,
      preference: true,
      visits: {
        orderBy: { visitedAt: "desc" },
        take: 5
      },
      styleSuggestions: {
        orderBy: { createdAt: "desc" },
        take: 5
      }
    }
  });

  if (!customer) {
    throw new Error("Customer not found");
  }

  const acceptedStyleSuggestions = await prisma.styleSuggestion.findMany({
    where: {
      customerId,
      accepted: true
    },
    orderBy: { createdAt: "desc" }
  });

  return {
    customer: {
      id: customer.id,
      name: customer.name,
      gender: customer.gender,
      birthYear: customer.birthYear,
      phone: customer.phone,
      memo: customer.memo
    },
    hairProfile: customer.hairProfile,
    preference: customer.preference,
    recentVisits: customer.visits,
    recentStyleSuggestions: customer.styleSuggestions,
    acceptedStyleSuggestions
  };
}

export async function generateStyleSuggestions(customerId: string) {
  const context = await buildStyleSuggestionContext(customerId);

  return {
    context,
    suggestions: []
  };
}
