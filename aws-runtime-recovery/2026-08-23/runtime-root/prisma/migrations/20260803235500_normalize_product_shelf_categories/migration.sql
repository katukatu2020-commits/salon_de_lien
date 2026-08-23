UPDATE "Product"
SET "category" = CASE
  WHEN "name" LIKE '%洗い流さないトリートメント%' THEN 'アウトバス'
  WHEN "name" LIKE '%シャンプー%' THEN 'シャンプー'
  WHEN "name" LIKE '%トリートメント%' THEN 'トリートメント'
  WHEN "name" LIKE '%ワックス%'
    OR "name" LIKE '%ジェルクリーム%'
    OR "name" LIKE '%ポリッシング オイル%' THEN 'スタイリング剤'
  WHEN "category" = 'アウトバス' THEN 'アウトバス'
  WHEN "category" IN ('スタイリング', 'スタイリング剤') THEN 'スタイリング剤'
  WHEN "category" IN ('シャンプー', 'トリートメント') THEN "category"
  ELSE 'その他'
END
WHERE "active" = true;
