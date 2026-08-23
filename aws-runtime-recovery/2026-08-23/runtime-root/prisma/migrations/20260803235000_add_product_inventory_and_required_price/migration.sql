ALTER TABLE "Product"
ADD COLUMN "stockQuantity" INTEGER NOT NULL DEFAULT 0;

UPDATE "Product"
SET "retailPrice" = CASE
  WHEN "name" LIKE '%ポリッシング オイル%' THEN 2640
  WHEN "name" LIKE '%ワックス%' THEN 2200
  WHEN "name" LIKE '%ジェルクリーム%' THEN 2200
  WHEN "name" LIKE '%洗い流さないトリートメント%' THEN 2860
  WHEN "name" LIKE '%シャンプー%' THEN 3080
  WHEN "name" LIKE '%トリートメント%' THEN 4180
  WHEN "category" = 'アウトバス' THEN 3300
  WHEN "category" = 'シャンプー' THEN 3080
  WHEN "category" = 'トリートメント' THEN 4180
  WHEN "category" IN ('スタイリング', 'スタイリング剤') THEN 2200
  ELSE 3300
END
WHERE "retailPrice" IS NULL OR "retailPrice" <= 0;

UPDATE "Product"
SET "stockQuantity" = CASE WHEN "active" THEN 10 ELSE 0 END;

ALTER TABLE "Product"
ALTER COLUMN "retailPrice" SET NOT NULL;

ALTER TABLE "Product"
ADD CONSTRAINT "Product_retailPrice_positive" CHECK ("retailPrice" > 0),
ADD CONSTRAINT "Product_stockQuantity_nonnegative" CHECK ("stockQuantity" >= 0);
