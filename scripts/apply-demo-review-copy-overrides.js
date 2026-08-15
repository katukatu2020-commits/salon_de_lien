const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const REVIEW_SEED_PREFIX = "MILBON_REVIEW_SEED";
const APPLY = process.argv.includes("--apply");

loadLocalEnv();
assertLocalDatabase();

const prisma = new PrismaClient();

function loadLocalEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^"|"$/g, "");
  }
}

function assertLocalDatabase() {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is not configured.");

  const url = new URL(value);
  if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
    throw new Error(`Refusing to update a non-local database host: ${url.hostname}`);
  }
}

async function loadOverrides() {
  const module = await import("../src/lib/products/demo-review-copy-overrides.ts");
  return module.DEMO_REVIEW_COPY_OVERRIDES;
}

async function main() {
  const overrides = await loadOverrides();
  const rows = await prisma.productReview.findMany({
    where: {
      productProposal: {
        note: {
          startsWith: `${REVIEW_SEED_PREFIX}:`
        }
      }
    },
    select: {
      id: true,
      freeComment: true,
      productProposal: {
        select: {
          note: true
        }
      }
    }
  });

  const changes = [];
  const alreadyApplied = [];
  const missingOverrides = [];

  for (const row of rows) {
    const marker = row.productProposal.note ?? "";
    const key = marker.slice(`${REVIEW_SEED_PREFIX}:`.length);
    const editedComment = overrides[key];

    if (!editedComment) {
      missingOverrides.push(marker);
      continue;
    }

    if (row.freeComment === editedComment) {
      alreadyApplied.push(marker);
      continue;
    }

    changes.push({
      id: row.id,
      marker,
      before: row.freeComment ?? "",
      after: editedComment
    });
  }

  console.log(
    JSON.stringify(
      {
        mode: APPLY ? "apply" : "dry-run",
        databaseHost: new URL(process.env.DATABASE_URL).hostname,
        seededReviewsFound: rows.length,
        correctionsDefined: Object.keys(overrides).length,
        changes: changes.length,
        alreadyApplied: alreadyApplied.length,
        intentionallyUnchangedOrNeedsReview: missingOverrides.length,
        preview: changes.map(({ marker, before, after }) => ({ marker, before, after }))
      },
      null,
      2
    )
  );

  if (!APPLY || changes.length === 0) return;

  await prisma.$transaction(
    changes.map((change) =>
      prisma.productReview.update({
        where: { id: change.id },
        data: { freeComment: change.after }
      })
    )
  );

  console.log(`Applied ${changes.length} demo review copy corrections.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
