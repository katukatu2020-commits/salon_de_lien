const { createHash } = require("node:crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply") || process.env.APPLY_BIRTHDATE_BACKFILL === "true";
const RANDOM_SALT = "salon-de-lien-customer-birthdate-v1";

function hashBytes(customerId) {
  return createHash("sha256").update(`${RANDOM_SALT}:${customerId}`).digest();
}

function randomAge(bytes) {
  const percentile = bytes[0] % 100;
  const ranges = [
    { until: 10, min: 18, max: 24 },
    { until: 30, min: 25, max: 34 },
    { until: 58, min: 35, max: 44 },
    { until: 80, min: 45, max: 54 },
    { until: 94, min: 55, max: 64 },
    { until: 100, min: 65, max: 79 }
  ];
  const range = ranges.find((candidate) => percentile < candidate.until) ?? ranges.at(-1);
  return range.min + (bytes[1] % (range.max - range.min + 1));
}

function generatedBirthDate(customer, now) {
  const bytes = hashBytes(customer.id);
  const currentYear = now.getUTCFullYear();
  const storedYear = Number.isInteger(customer.birthYear) ? customer.birthYear : null;
  const year = storedYear && storedYear >= 1900 && storedYear <= currentYear
    ? storedYear
    : currentYear - randomAge(bytes);
  const month = (bytes[2] % 12) + 1;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = (bytes[3] % daysInMonth) + 1;

  return {
    birthDate: new Date(Date.UTC(year, month - 1, day, 12)),
    birthYear: year
  };
}

function ageBand(year, currentYear) {
  const age = currentYear - year;
  if (age < 20) return "10代";
  if (age < 30) return "20代";
  if (age < 40) return "30代";
  if (age < 50) return "40代";
  if (age < 60) return "50代";
  if (age < 70) return "60代";
  return "70代以上";
}

async function main() {
  const now = new Date();
  const customers = await prisma.customer.findMany({
    where: { birthDate: null, deletedAt: null },
    orderBy: { id: "asc" },
    select: { id: true, birthYear: true }
  });
  const generated = customers.map((customer) => ({
    id: customer.id,
    ...generatedBirthDate(customer, now)
  }));
  const distribution = Object.fromEntries(
    [...generated.reduce((counts, customer) => {
      const band = ageBand(customer.birthYear, now.getUTCFullYear());
      counts.set(band, (counts.get(band) ?? 0) + 1);
      return counts;
    }, new Map())].sort(([left], [right]) => left.localeCompare(right, "ja"))
  );

  console.log(JSON.stringify({
    mode: APPLY ? "apply" : "dry-run",
    targetCount: generated.length,
    distribution
  }));

  if (!APPLY || generated.length === 0) return;

  const results = await prisma.$transaction(
    generated.map((customer) => prisma.customer.updateMany({
      where: { id: customer.id, birthDate: null },
      data: { birthDate: customer.birthDate, birthYear: customer.birthYear }
    }))
  );
  const updatedCount = results.reduce((total, result) => total + result.count, 0);
  const remainingCount = await prisma.customer.count({
    where: { birthDate: null, deletedAt: null }
  });

  console.log(JSON.stringify({ updatedCount, remainingCount }));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
