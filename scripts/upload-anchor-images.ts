import { put } from "@vercel/blob";
import { readFile } from "fs/promises";
import { resolve } from "path";

const ANCHOR_IMAGES = {
  front: "identity-results-preview/ui-anchor-verification-20260607/anchor-front.png",
  side: "identity-results-preview/ui-anchor-verification-20260607/anchor-side.png",
  back: "identity-results-preview/ui-anchor-verification-20260607/anchor-back.png",
  generatedFront: "identity-results-preview/ui-anchor-verification-20260607/generated-front.png",
  generatedSide: "identity-results-preview/ui-anchor-verification-20260607/generated-side-fixed.png",
  generatedBack: "identity-results-preview/ui-anchor-verification-20260607/generated-back.png"
};

async function uploadAnchorImages() {
  console.log("Uploading anchor images to Vercel Blob...");

  const urls: Record<string, string> = {};

  for (const [key, localPath] of Object.entries(ANCHOR_IMAGES)) {
    try {
      const filePath = resolve(process.cwd(), localPath);
      console.log(`Reading ${key} from ${filePath}...`);
      const buffer = await readFile(filePath);

      const filename = `anchor-${key}-${Date.now()}.png`;
      console.log(`Uploading ${filename}...`);
      const blob = await put(filename, buffer, { access: "public" });

      urls[key] = blob.url;
      console.log(`✓ ${key}: ${blob.url}`);
    } catch (error) {
      console.error(`✗ Failed to upload ${key}:`, error);
    }
  }

  console.log("\nUpload complete. URLs:");
  console.log(JSON.stringify(urls, null, 2));

  return urls;
}

uploadAnchorImages().catch(console.error);
