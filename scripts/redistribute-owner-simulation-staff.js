const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const VISIT_ID_PREFIX = "owner-sim-visit-";
const CUSTOMER_ID_PREFIX = "owner-sim-customer-";
const VISIT_MARKER = "OWNER_DASHBOARD_SIMULATION_V1";
const CUSTOMER_COUNT = 120;
const staffRotation = [
  "谷崎 太二",
  "渡邊 浩明",
  "浅野 清美",
  "谷崎 太二",
  "小林 美奈子",
  "kaori"
];

function sequenceNumber(id, prefix) {
  const value = Number(id.slice(prefix.length));
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`対象外のIDです: ${id}`);
  }
  return value;
}

function expectedStaff(visit) {
  const eventIndex = sequenceNumber(visit.id, VISIT_ID_PREFIX) - 1;
  const customerIndex = sequenceNumber(visit.customerId, CUSTOMER_ID_PREFIX) - 1;
  const visitCycle = Math.floor(eventIndex / CUSTOMER_COUNT);

  if (customerIndex < 0 || customerIndex >= CUSTOMER_COUNT) {
    throw new Error(`対象外のシミュレーション顧客IDです: ${visit.customerId}`);
  }

  return staffRotation[(customerIndex * 5 + visitCycle * 5) % staffRotation.length];
}

function countByStaff(visits, field) {
  return visits.reduce((counts, visit) => {
    const name = visit[field];
    counts[name] = (counts[name] ?? 0) + 1;
    return counts;
  }, {});
}

function latestByCustomer(visits, field) {
  const latest = new Map();
  for (const visit of visits) {
    const current = latest.get(visit.customerId);
    if (!current || visit.visitedAt > current.visitedAt) {
      latest.set(visit.customerId, visit);
    }
  }
  return countByStaff([...latest.values()], field);
}

async function main() {
  const visits = await prisma.visit.findMany({
    where: {
      id: { startsWith: VISIT_ID_PREFIX },
      customerId: { startsWith: CUSTOMER_ID_PREFIX },
      nextRecommendation: { contains: VISIT_MARKER }
    },
    orderBy: { id: "asc" },
    select: {
      id: true,
      customerId: true,
      stylistName: true,
      visitedAt: true
    }
  });

  const changes = visits.map((visit) => ({
    ...visit,
    nextStaffName: expectedStaff(visit)
  }));
  const changed = changes.filter((visit) => visit.stylistName !== visit.nextStaffName);

  console.log(JSON.stringify({
    mode: APPLY ? "apply" : "dry-run",
    targetCount: changes.length,
    changedCount: changed.length,
    currentAllVisits: countByStaff(changes, "stylistName"),
    nextAllVisits: countByStaff(changes, "nextStaffName"),
    currentLatestVisits: latestByCustomer(changes, "stylistName"),
    nextLatestVisits: latestByCustomer(changes, "nextStaffName"),
    sample: changed.slice(0, 10).map((visit) => ({
      visitId: visit.id,
      before: visit.stylistName,
      after: visit.nextStaffName
    }))
  }, null, 2));

  if (!APPLY || changed.length === 0) return;

  await prisma.$transaction(
    changed.map((visit) => prisma.visit.update({
      where: { id: visit.id },
      data: { stylistName: visit.nextStaffName }
    }))
  );

  console.log(`シミュレーション来店 ${changed.length}件の担当者を更新しました。`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
