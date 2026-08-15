const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const CUSTOMER_ID_PREFIX = "owner-sim-customer-";
const CUSTOMER_MEMO = "店舗状況シミュレーション用の顧客データ。実際の店舗実績には含めない。";

const femaleGivenNames = [
  "彩花", "玲奈", "真由", "遥", "優子", "由佳", "奈央", "千尋", "麻衣", "沙織",
  "恵", "絵里", "愛", "理沙", "香織", "明日香", "智子", "舞", "陽子", "美穂",
  "加奈", "葵", "琴音", "結衣", "瑞希", "里奈", "杏奈", "佳奈", "菜々子", "美月",
  "友香", "亜美", "梨花", "知佳", "晴香", "桃子", "紗季", "裕子", "夏美", "真奈",
  "千夏", "和香", "美緒", "春香", "優奈", "直子", "久美子", "祥子", "早紀", "綾"
];

const maleGivenNames = [
  "翔太", "拓也", "大輔", "健太", "直樹", "亮", "悠斗", "和也", "誠", "達也",
  "祐介", "良太", "圭介", "智也", "一樹", "航", "俊介", "大地", "啓太", "裕也",
  "悠真", "隆之", "慎太郎", "健一", "哲也", "陽介", "直人", "匠", "涼太", "悠介",
  "修", "章", "颯太", "海斗", "康平", "雅人"
];

function replacementName(customer) {
  const index = Number(customer.id.slice(-4)) - 1;
  if (!Number.isInteger(index) || index < 0 || index >= 120) {
    throw new Error(`対象外のシミュレーション顧客IDです: ${customer.id}`);
  }

  const female = index < 84;
  const groupIndex = female ? index : index - 84;
  const surnameCount = female ? 28 : 12;
  const givenNames = female ? femaleGivenNames : maleGivenNames;
  const surname = customer.name.trim().split(/\s+/)[0];
  const givenName = givenNames[(groupIndex * 7 + Math.floor(groupIndex / surnameCount)) % givenNames.length];

  return `${surname} ${givenName}`;
}

async function main() {
  const customers = await prisma.customer.findMany({
    where: {
      id: { startsWith: CUSTOMER_ID_PREFIX },
      memo: CUSTOMER_MEMO,
      deletedAt: null
    },
    orderBy: { id: "asc" },
    select: { id: true, name: true }
  });

  const changes = customers.map((customer) => ({
    ...customer,
    nextName: replacementName(customer)
  }));
  const changed = changes.filter((customer) => customer.name !== customer.nextName);
  const givenNameCounts = new Map();

  for (const customer of changes) {
    const givenName = customer.nextName.split(/\s+/).at(-1);
    givenNameCounts.set(givenName, (givenNameCounts.get(givenName) ?? 0) + 1);
  }

  const report = {
    mode: APPLY ? "apply" : "dry-run",
    targetCount: changes.length,
    changedCount: changed.length,
    maxSameGivenName: Math.max(0, ...givenNameCounts.values()),
    duplicateFullNameCount: changes.length - new Set(changes.map((customer) => customer.nextName)).size,
    sample: changed.slice(0, 8).map((customer) => ({ before: customer.name, after: customer.nextName }))
  };

  console.log(JSON.stringify(report, null, 2));

  if (!APPLY || changed.length === 0) return;

  await prisma.$transaction(
    changed.map((customer) => prisma.customer.update({
      where: { id: customer.id },
      data: { name: customer.nextName }
    }))
  );

  console.log(`シミュレーション顧客 ${changed.length}名の名前を更新しました。`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
