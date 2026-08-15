import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    orderBy: [{ manufacturerName: "asc" }, { name: "asc" }],
    select: {
      id: true,
      manufacturerName: true,
      name: true,
      category: true,
      retailPrice: true,
      stockQuantity: true,
      active: true,
    },
  });

  console.table(products);
  console.log(`登録商品: ${products.length}件`);
  console.log(`価格未設定: ${products.filter((product) => product.retailPrice === null).length}件`);
  console.log(`在庫合計: ${products.reduce((sum, product) => sum + product.stockQuantity, 0)}点`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
