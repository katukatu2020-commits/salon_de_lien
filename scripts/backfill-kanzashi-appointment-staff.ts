import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const bookingStaffPairs = [
  ["315097736", "小林 美奈子"],
  ["314948521", "谷崎 太二"],
  ["314849831", "谷崎 太二"],
  ["314703139", "谷崎 太二"],
  ["314664481", "谷崎 太二"],
  ["314639801", "渡邊 浩明"],
  ["314314940", "谷崎 太二"],
  ["314535379", "谷崎 太二"],
  ["314490759", "渡邊 浩明"],
  ["314342496", "谷崎 太二"],
  ["314340269", "谷崎 太二"],
  ["313997488", "谷崎 太二"],
  ["313983574", "フリー"],
  ["313615189", "谷崎 太二"],
  ["313540374", "フリー"],
  ["313261954", "谷崎 太二"],
  ["313018962", "谷崎 太二"],
  ["312999780", "谷崎 太二"],
  ["312951645", "谷崎 太二"],
] as const;

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("本番環境では実行できません。");
  }

  const apply = process.argv.includes("--apply");
  const changes: Array<{
    bookingNumber: string;
    appointmentId: string;
    staffName: string;
  }> = [];

  for (const [bookingNumber, staffName] of bookingStaffPairs) {
    const appointments = await prisma.appointment.findMany({
      where: {
        staffName: null,
        note: { contains: `予約番号: ${bookingNumber}` },
      },
      select: { id: true },
    });

    for (const appointment of appointments) {
      changes.push({
        bookingNumber,
        appointmentId: appointment.id,
        staffName,
      });
    }
  }

  console.table(changes);
  console.log(`${apply ? "更新対象" : "更新予定"}: ${changes.length}件`);

  if (!apply || changes.length === 0) return;

  await prisma.$transaction(
    changes.map((change) =>
      prisma.appointment.updateMany({
        where: { id: change.appointmentId, staffName: null },
        data: { staffName: change.staffName },
      }),
    ),
  );

  console.log(`担当者を補完しました: ${changes.length}件`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
