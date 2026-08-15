const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const MANUFACTURER = "ミルボン";
const CUSTOMER_COUNT = 103;
const REVIEW_SEED_PREFIX = "MILBON_REVIEW_SEED";
const PURCHASE_SEED_PREFIX = "MILBON_PURCHASE_SEED";
const MAX_PRODUCT_NAME_REVIEWS = 8;

const familyNames = [
  "山本",
  "田中",
  "佐藤",
  "井上",
  "小川",
  "森",
  "石井",
  "藤田",
  "中村",
  "清水",
  "橋本",
  "前田",
  "岡田",
  "長谷川",
  "三浦",
  "西村",
  "福田",
  "松本",
  "原田",
  "竹内",
  "宮本",
  "杉山",
  "高橋",
  "林",
  "野口",
  "大西",
  "平田",
  "柴田",
  "松田",
  "安藤",
  "川口",
  "北村",
  "今井",
  "河野",
  "武田",
  "上田",
  "石田",
  "和田",
  "内田",
  "原",
  "中川",
  "小林",
  "谷口",
  "渡辺",
  "浅野",
  "吉田",
  "藤原",
  "近藤",
  "村上",
  "青木",
  "木村",
  "山口",
  "斎藤",
  "久保",
  "横山",
  "岩田",
  "古川",
  "西田",
  "菊池",
  "奥田",
  "川上",
  "松尾",
  "永井",
  "黒田",
  "片山",
  "白石",
  "尾崎",
  "小野",
  "服部",
  "宮崎",
  "酒井",
  "丸山",
  "高田",
  "森田",
  "矢野",
  "大野",
  "本田",
  "杉本",
  "岩本",
  "田村",
  "小島",
  "新井",
  "中西",
  "堀",
  "坂本",
  "岡本",
  "西川",
  "金子",
  "飯田",
  "南",
  "河合",
  "大谷",
  "津田",
  "中尾"
];

const femaleGivenNames = [
  "美咲",
  "彩花",
  "玲奈",
  "真由",
  "遥",
  "優子",
  "由佳",
  "奈央",
  "千尋",
  "麻衣",
  "沙織",
  "恵",
  "絵里",
  "愛",
  "理沙",
  "香織",
  "明日香",
  "智子",
  "舞",
  "陽子",
  "美穂",
  "加奈",
  "葵",
  "琴音",
  "結衣",
  "瑞希",
  "里奈",
  "杏奈",
  "佳奈",
  "菜々子",
  "美月",
  "友香",
  "亜美",
  "梨花",
  "知佳",
  "晴香",
  "桃子",
  "紗季",
  "裕子",
  "夏美",
  "真奈",
  "千夏",
  "和香",
  "美緒"
];

const maleGivenNames = [
  "翔太",
  "拓也",
  "大輔",
  "健太",
  "直樹",
  "亮",
  "悠斗",
  "和也",
  "誠",
  "達也",
  "祐介",
  "良太",
  "圭介",
  "智也",
  "一樹",
  "航",
  "俊介",
  "大地",
  "啓太",
  "裕也",
  "悠真",
  "隆之",
  "慎太郎",
  "健一",
  "哲也",
  "陽介",
  "直人",
  "匠",
  "涼太",
  "悠介"
];

function hash(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function seededDate(index) {
  const start = new Date("2024-07-20T00:00:00.000Z");
  const rangeDays = 731;
  const digest = crypto.createHash("sha256").update(`milbon-review-date-v2:${index}`).digest();
  const dayOffset = digest.readUInt16BE(0) % rangeDays;
  const minuteOffset = digest.readUInt16BE(2) % (9 * 60);
  const date = new Date(start);

  date.setDate(date.getDate() + dayOffset);
  date.setHours(10 + Math.floor(minuteOffset / 60), minuteOffset % 60, 0, 0);
  return date;
}

function isFemaleCustomer(index) {
  return index % 10 < 7;
}

function customerName(index) {
  const givenNames = isFemaleCustomer(index) ? femaleGivenNames : maleGivenNames;
  const familyName = familyNames[(index * 17 + Math.floor(index / 3)) % familyNames.length];
  const givenName = givenNames[(index * 11 + Math.floor(index / 5)) % givenNames.length];

  return `${familyName} ${givenName}`;
}

function legacyCustomerPhone(index) {
  return `09088${String(index + 1).padStart(6, "0")}`;
}

function customerPhone(index) {
  const prefixes = ["090", "080", "070", "090", "080"];
  const prefix = prefixes[index % prefixes.length];
  const middle = 2100 + ((index * 379 + 137) % 7600);
  const last = 1200 + ((index * 811 + 421) % 8600);

  return `${prefix}-${String(middle).padStart(4, "0")}-${String(last).padStart(4, "0")}`;
}

function customerGender(index) {
  return isFemaleCustomer(index) ? "女性" : "男性";
}

function concernTags(product) {
  return product.concernTagBreakdown.slice(0, 3).map((item) => item.label);
}

function goodPoints(product, quote) {
  if (Array.isArray(quote.goodPoints)) {
    return quote.goodPoints;
  }

  if (quote.rating <= 2) return [];
  return product.goodPointRanking.slice(0, quote.rating >= 4 ? 3 : 1).map((item) => item.label);
}

function badPoints(product, quote) {
  if (Array.isArray(quote.badPoints)) {
    return quote.badPoints;
  }

  if (quote.rating >= 5) return [];
  return product.badPointRanking.slice(0, quote.rating <= 2 ? 3 : 1).map((item) => item.label);
}

function repeatIntent(rating) {
  if (rating >= 4) return "yes";
  if (rating === 3) return "maybe";
  return "no";
}

async function ensureCustomer(index) {
  const phone = customerPhone(index);
  const legacyPhone = legacyCustomerPhone(index);
  const existing = await prisma.customer.findFirst({
    where: {
      OR: [{ phone }, { phone: legacyPhone }],
      deletedAt: null
    },
    select: { id: true }
  });

  if (existing) {
    await prisma.customer.update({
      where: { id: existing.id },
      data: {
        name: customerName(index),
        gender: customerGender(index),
        birthYear: 1970 + ((index * 5) % 31),
        phone,
        memo: "メーカー商品フィードバック連携用の顧客データ。商品提案、購入、匿名レビュー集計と紐付け。"
      }
    });

    await prisma.customerPointAccount.upsert({
      where: { customerId: existing.id },
      update: {},
      create: { customerId: existing.id }
    });

    return existing;
  }

  const customer = await prisma.customer.create({
    data: {
      name: customerName(index),
      gender: customerGender(index),
      birthYear: 1970 + ((index * 5) % 31),
      phone,
      memo: "メーカー商品フィードバック連携用の顧客データ。商品提案、購入、匿名レビュー集計と紐付け。",
      pointAccount: {
        create: {}
      }
    },
    select: { id: true }
  });

  return customer;
}

async function migrateRemainingLegacyCustomers(startIndex) {
  const legacyCustomers = await prisma.customer.findMany({
    where: {
      phone: { startsWith: "09088" },
      deletedAt: null
    },
    orderBy: { createdAt: "asc" },
    select: { id: true }
  });

  for (let offset = 0; offset < legacyCustomers.length; offset += 1) {
    const index = startIndex + offset;
    await prisma.customer.update({
      where: { id: legacyCustomers[offset].id },
      data: {
        name: customerName(index),
        gender: customerGender(index),
        birthYear: 1970 + ((index * 5) % 31),
        phone: customerPhone(index),
        memo: "メーカー商品フィードバック連携用の顧客データ。商品提案、購入、匿名レビュー集計と紐付け。"
      }
    });

    await prisma.customerPointAccount.upsert({
      where: { customerId: legacyCustomers[offset].id },
      update: {},
      create: { customerId: legacyCustomers[offset].id }
    });
  }
}

async function ensureProduct(product) {
  const tags = concernTags(product);
  const retailPrice = product.productName.includes("ポリッシング オイル")
    ? 2640
    : product.productName.includes("ワックス") || product.productName.includes("ジェルクリーム")
      ? 2200
      : product.productName.includes("洗い流さないトリートメント")
        ? 2860
        : product.productName.includes("シャンプー")
          ? 3080
          : 4180;

  return prisma.product.upsert({
    where: {
      organizationId_manufacturerName_name: {
        organizationId: "org_salon_de_lien",
        manufacturerName: MANUFACTURER,
        name: product.productName
      }
    },
    update: {
      category: product.category,
      concernTags: tags,
      description: `${product.productName}の店販・ホームケア提案用商品。メーカー向け匿名集計レポート対象。`,
      retailPrice,
      active: true
    },
    create: {
      manufacturerName: MANUFACTURER,
      name: product.productName,
      organizationId: "org_salon_de_lien",
      category: product.category,
      retailPrice,
      stockQuantity: 10,
      concernTags: tags,
      description: `${product.productName}の店販・ホームケア提案用商品。メーカー向け匿名集計レポート対象。`,
      active: true
    }
  });
}

async function deactivateRemovedManufacturerProducts(activeProductNames) {
  await prisma.product.updateMany({
    where: {
      manufacturerName: MANUFACTURER,
      name: {
        notIn: activeProductNames
      }
    },
    data: {
      active: false
    }
  });
}

async function clearGeneratedMilbonFeedback() {
  const proposals = await prisma.productProposal.findMany({
    where: {
      OR: [{ note: { startsWith: REVIEW_SEED_PREFIX } }, { note: { startsWith: PURCHASE_SEED_PREFIX } }],
      product: {
        manufacturerName: MANUFACTURER
      }
    },
    select: { id: true }
  });
  const proposalIds = proposals.map((proposal) => proposal.id);

  if (proposalIds.length === 0) {
    return {
      proposals: 0,
      reviews: 0,
      reviewRequests: 0,
      consents: 0
    };
  }

  const reviews = await prisma.productReview.findMany({
    where: {
      productProposalId: { in: proposalIds }
    },
    select: { id: true }
  });
  const reviewIds = reviews.map((review) => review.id);

  const deletedConsents =
    reviewIds.length > 0
      ? await prisma.consent.deleteMany({
          where: {
            productReviewId: { in: reviewIds }
          }
        })
      : { count: 0 };
  const deletedReviews = await prisma.productReview.deleteMany({
    where: {
      productProposalId: { in: proposalIds }
    }
  });
  const deletedReviewRequests = await prisma.productReviewRequest.deleteMany({
    where: {
      productProposalId: { in: proposalIds }
    }
  });
  const deletedProposals = await prisma.productProposal.deleteMany({
    where: {
      id: { in: proposalIds }
    }
  });

  return {
    proposals: deletedProposals.count,
    reviews: deletedReviews.count,
    reviewRequests: deletedReviewRequests.count,
    consents: deletedConsents.count
  };
}

async function ensureProposal({ customerId, productId, product, marker, date, withReview }) {
  const proposalReason = product.productName + "の購入後フィードバック記録" + (withReview ? "・レビュー依頼" : "");
  const existing = await prisma.productProposal.findFirst({
    where: {
      productId,
      customerId,
      note: marker
    },
    select: { id: true }
  });

  if (existing) {
    return prisma.productProposal.update({
      where: { id: existing.id },
      data: {
        proposalReason,
        concernTags: concernTags(product),
        status: "purchased",
        reaction: "purchased",
        purchased: true,
        createdAt: date,
        updatedAt: date
      },
      select: { id: true }
    });
  }

  return prisma.productProposal.create({
    data: {
      customerId,
      productId,
      proposalReason,
      concernTags: concernTags(product),
      status: "purchased",
      reaction: "purchased",
      purchased: true,
      note: marker,
      createdAt: date,
      updatedAt: date
    },
    select: { id: true }
  });
}

async function ensureReview({ proposalId, customerId, product, quote, marker, index }) {
  const submittedAt = seededDate(index);
  const tokenHash = hash(marker);

  const request = await prisma.productReviewRequest.upsert({
    where: { tokenHash },
    update: {
      productProposalId: proposalId,
      status: "answered",
      requestedAt: addDays(submittedAt, -7),
      answeredAt: submittedAt,
      expiresAt: addDays(submittedAt, 21),
      createdAt: addDays(submittedAt, -7),
      updatedAt: submittedAt
    },
    create: {
      productProposalId: proposalId,
      tokenHash,
      status: "answered",
      requestedAt: addDays(submittedAt, -7),
      answeredAt: submittedAt,
      expiresAt: addDays(submittedAt, 21),
      createdAt: addDays(submittedAt, -7),
      updatedAt: submittedAt
    },
    select: { id: true }
  });

  const review = await prisma.productReview.upsert({
    where: { reviewRequestId: request.id },
    update: {
      productProposalId: proposalId,
      usedStatus: "used",
      rating: quote.rating,
      goodPoints: goodPoints(product, quote),
      badPoints: badPoints(product, quote),
      repeatIntent: repeatIntent(quote.rating),
      freeComment: quote.comment,
      allowAnonymousShare: true,
      allowAnonymousQuote: true,
      submittedAt,
      createdAt: submittedAt,
      updatedAt: submittedAt
    },
    create: {
      productProposalId: proposalId,
      reviewRequestId: request.id,
      usedStatus: "used",
      rating: quote.rating,
      goodPoints: goodPoints(product, quote),
      badPoints: badPoints(product, quote),
      repeatIntent: repeatIntent(quote.rating),
      freeComment: quote.comment,
      allowAnonymousShare: true,
      allowAnonymousQuote: true,
      submittedAt,
      createdAt: submittedAt,
      updatedAt: submittedAt
    },
    select: { id: true }
  });

  for (const consentType of ["aggregate_review_share", "anonymous_quote_share"]) {
    const existingConsent = await prisma.consent.findFirst({
      where: {
        customerId,
        productReviewId: review.id,
        consentType
      },
      select: { id: true }
    });

    if (!existingConsent) {
      await prisma.consent.create({
        data: {
          customerId,
          productReviewId: review.id,
          consentType,
          granted: true,
          source: "manufacturer_product_feedback_seed",
          createdAt: submittedAt
        }
      });
    }
  }
}

function normalizeReviewComment(comment) {
  return String(comment || "").replace(/\s+/g, " ").trim();
}

function reviewExpressionKeys(comment) {
  return normalizeReviewComment(comment)
    .split(/[。！？!?]/)
    .map((sentence) => sentence.replace(/[、・「」『』（）()\s]/g, "").trim())
    .filter((sentence) => sentence.length >= 12);
}

function productNameTerms(productName) {
  const terms = [productName];

  if (productName.startsWith("Aujua ")) {
    const seriesName = productName
      .replace(/^Aujua\s+/, "")
      .replace(/\s+洗い流さないトリートメント$/, "")
      .replace(/\s+(?:シャンプー|トリートメント)$/, "");
    terms.push("Aujua", "オージュア", seriesName);
  }

  if (productName.startsWith("グローバルミルボン ")) {
    const itemName = productName.replace(/^グローバルミルボン\s+/, "");
    terms.push("グローバルミルボン", itemName);

    const waxNumber = itemName.match(/ワックス\s+(\d+)/)?.[1];
    const gelNumber = itemName.match(/ジェルクリーム\s+(\d+)/)?.[1];
    if (waxNumber) terms.push(`ワックス${waxNumber}`);
    if (gelNumber) terms.push(`ジェルクリーム${gelNumber}`);
    if (itemName.includes("ポリッシング オイル")) terms.push("ポリッシング オイル");
  }

  return [...new Set(terms.filter((term) => term.length >= 3))];
}

function containsProductName(comment, productName) {
  return productNameTerms(productName).some((term) => comment.includes(term));
}

function hasRepeatedExpressionWithinComment(comment) {
  const sentences = comment
    .split(/[。！？!?]/)
    .map((sentence) => sentence.replace(/[、・「」『』（）()\s]/g, "").trim())
    .filter((sentence) => sentence.length >= 8);
  const ignored = /商品|シャンプー|トリートメント|ワックス|ジェル|オイル|使いやすい|続けやすい|毛先|香り|価格/;

  for (let leftIndex = 0; leftIndex < sentences.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < sentences.length; rightIndex += 1) {
      const left = sentences[leftIndex];
      const right = sentences[rightIndex];

      for (let start = 0; start <= left.length - 8; start += 1) {
        const phrase = left.slice(start, start + 8);
        if (!ignored.test(phrase) && right.includes(phrase)) return true;
      }
    }
  }

  return false;
}

function reviewJapaneseLooksNatural(comment, productName) {
  const unnaturalPatterns = [
    /^一方で、/,
    /^ただ、/,
    /。ただ、/,
    /乾かすと/,
    /してで(?:ツヤ|まとまり|束感|軽さ)/,
    /点は少し気になります/,
    /変化はゆっくり点/,
    /季節の変わり目で地肌/,
    /乾かした後に見ると、乾燥する日/,
    /浴室で使った日は、乾燥する日/,
    /乾かした後に見ると、[^。]*と聞いて/,
    /時間を置いても[^。]*。[^。]*すぐ流す場合と違って/,
    /同じようにしても[^。]*足りません/,
    /休日のセットにで/,
    /は出す量は/,
    /出す量は調整しやすいところ/,
    /アイロンへの手触り/,
    /手のひらに薄く伸ばしてで/,
    /に限定して中間から毛先/,
    /にで/,
    /週末に使った時は、[^。]*日は/,
    /夜のドライ前は、[^。]*日は/,
    /は一回の使用量が少ない日は/,
    /乾かした後に見ると、初日は/,
    /乾かした後に見ると、乾かした後/,
    /乾かした後に見ると、[^。]*(?:なじませて流しました|なじませやすい)/
  ];

  if (unnaturalPatterns.some((pattern) => pattern.test(comment))) return false;
  if (/シャンプー/.test(productName) && /時間を置いて流した日/.test(comment)) return false;
  if (/(ワックス|ジェルクリーム|オイル)/.test(productName) && /普段のケアに入れやすい/.test(comment)) return false;
  return !hasRepeatedExpressionWithinComment(comment);
}

async function cleanGeneratedReviewComments() {
  const rows = await prisma.productReview.findMany({
    where: {
      productProposal: {
        note: {
          startsWith: REVIEW_SEED_PREFIX
        },
        product: {
          manufacturerName: MANUFACTURER,
          active: true
        }
      }
    },
    orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      freeComment: true,
      productProposal: {
        select: {
          id: true,
          product: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    }
  });
  const usedComments = new Set();
  const usedExpressions = new Set();
  const duplicateProposalIds = [];
  const invalidJapaneseProposalIds = [];
  const excessProductNameProposalIds = [];
  const namedReviewCountByProduct = new Map();
  let namedReviewTotal = 0;

  for (const row of rows) {
    const comment = normalizeReviewComment(row.freeComment);
    if (!comment) continue;

    if (!reviewJapaneseLooksNatural(comment, row.productProposal.product.name)) {
      invalidJapaneseProposalIds.push(row.productProposal.id);
      continue;
    }

    if (containsProductName(comment, row.productProposal.product.name)) {
      const productId = row.productProposal.product.id;
      const namedReviewCount = namedReviewCountByProduct.get(productId) || 0;
      if (namedReviewCount >= 1 || namedReviewTotal >= MAX_PRODUCT_NAME_REVIEWS) {
        excessProductNameProposalIds.push(row.productProposal.id);
        continue;
      }
      namedReviewCountByProduct.set(productId, namedReviewCount + 1);
      namedReviewTotal += 1;
    }

    const expressions = reviewExpressionKeys(comment);
    const hasDuplicate = usedComments.has(comment) || expressions.some((expression) => usedExpressions.has(expression));

    if (hasDuplicate) {
      duplicateProposalIds.push(row.productProposal.id);
      continue;
    }

    usedComments.add(comment);
    for (const expression of expressions) usedExpressions.add(expression);
  }

  const deletedProposalIds = [...new Set([...invalidJapaneseProposalIds, ...duplicateProposalIds, ...excessProductNameProposalIds])];

  if (deletedProposalIds.length > 0) {
    await prisma.productProposal.deleteMany({
      where: {
        id: {
          in: deletedProposalIds
        }
      }
    });
  }

  return {
    duplicateReviews: duplicateProposalIds.length,
    invalidJapaneseReviews: invalidJapaneseProposalIds.length,
    excessProductNameReviews: excessProductNameProposalIds.length,
    totalDeleted: deletedProposalIds.length
  };
}

async function main() {
  const { getDemoManufacturerProductFeedbackReport, validateDemoManufacturerReviews } = await import("../src/lib/products/demo-manufacturer-feedback.ts");
  const report = getDemoManufacturerProductFeedbackReport({ manufacturer: MANUFACTURER });
  const validation = validateDemoManufacturerReviews(report);
  const customers = [];
  const activeProductNames = report.products.map((product) => product.productName);

  if (
    validation.duplicateCount > 0 ||
    validation.openingViolations > 0 ||
    validation.highSimilarityPairs > 0 ||
    validation.phraseOverlapPairs > 0 ||
    validation.duplicateSentenceCount > 0 ||
    validation.duplicatePhrasePairs > 0 ||
    validation.semanticEffectMaxCount > 2 ||
    validation.endingOveruseCount > 0 ||
    validation.ratingTagContradictions > 0 ||
    validation.productUsageContradictions > 0 ||
    validation.japaneseValidationFailures > 0
  ) {
    throw new Error(`Generated manufacturer reviews failed validation: ${JSON.stringify(validation)}`);
  }

  const clearedGeneratedFeedback = await clearGeneratedMilbonFeedback();
  await deactivateRemovedManufacturerProducts(activeProductNames);

  for (let index = 0; index < CUSTOMER_COUNT; index += 1) {
    customers.push(await ensureCustomer(index));
  }

  await migrateRemainingLegacyCustomers(CUSTOMER_COUNT);

  let globalReviewIndex = 0;
  let createdReviewCount = 0;
  let createdPurchaseOnlyCount = 0;

  for (const product of report.products) {
    const dbProduct = await ensureProduct(product);
    const reviews = product.anonymousQuoteDetails.slice(0, 50);

    for (let index = 0; index < reviews.length; index += 1) {
      const customer = customers[globalReviewIndex % customers.length];
      const marker = `${REVIEW_SEED_PREFIX}:${product.productId}:${index}`;
      const date = seededDate(globalReviewIndex);
      const proposal = await ensureProposal({
        customerId: customer.id,
        productId: dbProduct.id,
        product,
        marker,
        date,
        withReview: true
      });

      await ensureReview({
        proposalId: proposal.id,
        customerId: customer.id,
        product,
        quote: reviews[index],
        marker,
        index: globalReviewIndex
      });

      createdReviewCount += 1;
      globalReviewIndex += 1;
    }

    const targetPurchasedCount = Math.round(reviews.length * 2.5);
    const purchaseOnlyCount = Math.max(0, targetPurchasedCount - reviews.length);

    for (let index = 0; index < purchaseOnlyCount; index += 1) {
      const customer = customers[(globalReviewIndex + index) % customers.length];
      const marker = `${PURCHASE_SEED_PREFIX}:${product.productId}:${index}`;

      await ensureProposal({
        customerId: customer.id,
        productId: dbProduct.id,
        product,
        marker,
        date: seededDate(globalReviewIndex + index),
        withReview: false
      });

      createdPurchaseOnlyCount += 1;
    }
  }

  const reviewCleanup = await cleanGeneratedReviewComments();

  console.log(
    JSON.stringify(
      {
        manufacturer: MANUFACTURER,
        customers: customers.length,
        products: report.products.length,
        reviews: createdReviewCount - reviewCleanup.totalDeleted,
        purchaseOnlyProposals: createdPurchaseOnlyCount,
        reviewCleanup,
        clearedGeneratedFeedback,
        validation
      },
      null,
      2
    )
  );
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

