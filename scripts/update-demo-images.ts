import { prisma } from "@/lib/prisma";

const DEMO_IMAGE_URLS = [
  "/demo-anchor-images/anchor-front.png",
  "/demo-anchor-images/anchor-side.png",
  "/demo-anchor-images/anchor-back.png"
];

const DEMO_GENERATED_URLS = [
  "/demo-anchor-images/generated-front.png",
  "/demo-anchor-images/generated-side-fixed.png",
  "/demo-anchor-images/generated-back.png"
];

async function updateDemoImages() {
  try {
    console.log("Updating style suggestions with demo anchor images...");

    // Update all existing style suggestions
    const suggestions = await prisma.styleSuggestion.findMany();

    for (const suggestion of suggestions) {
      // Use generated images if available, otherwise use anchor images
      const newUrls = [...DEMO_GENERATED_URLS];

      await prisma.styleSuggestion.update({
        where: { id: suggestion.id },
        data: {
          imageUrls: newUrls,
          imageUrlsJson: JSON.stringify(
            newUrls.map((url, index) => ({
              angle: ["斜め正面", "横", "斜め後ろ"][index] || `画像${index + 1}`,
              url
            }))
          )
        }
      });

      console.log(`✓ Updated ${suggestion.id}: ${suggestion.suggestedStyleName}`);
    }

    console.log(`\n✓ Updated ${suggestions.length} style suggestions`);
    console.log("Demo images updated successfully!");
  } catch (error) {
    console.error("Error updating demo images:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateDemoImages().catch((error) => {
  console.error(error);
  process.exit(1);
});
