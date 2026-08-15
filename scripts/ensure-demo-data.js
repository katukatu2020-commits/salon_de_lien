const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const DEMO_DIR = path.join(process.cwd(), "docs", "demo");
const DEMO_DATA_PATH = path.join(DEMO_DIR, "demo-data.json");
const REVIEW_TOKEN_BYTES = 32;

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function hash(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function token() {
  return crypto.randomBytes(REVIEW_TOKEN_BYTES).toString("base64url");
}

function readDemoData() {
  try {
    return JSON.parse(fs.readFileSync(DEMO_DATA_PATH, "utf8"));
  } catch {
    return {};
  }
}

async function ensurePointAccount(customerId) {
  return prisma.customerPointAccount.upsert({
    where: { customerId },
    update: {},
    create: { customerId }
  });
}

async function ensureOpeningPoints(customerId) {
  const account = await ensurePointAccount(customerId);
  const sourceId = "demo-yamada-opening-480";
  const existing = await prisma.pointTransaction.findFirst({
    where: { customerId, sourceType: "campaign", sourceId, type: "earn" },
    select: { id: true }
  });

  if (existing) {
    return account;
  }

  const amount = 480;
  const expiresAt = addDays(new Date(), 40);
  const balanceAfter = account.availablePoints + amount;
  const transaction = await prisma.pointTransaction.create({
    data: {
      customerId,
      accountId: account.id,
      type: "earn",
      amount,
      balanceAfter,
      sourceType: "campaign",
      sourceId,
      reason: "デモ用ポイント付与",
      note: "操作説明資料用デモデータ",
      expiresAt
    }
  });

  await prisma.pointLot.create({
    data: {
      customerId,
      earnTransactionId: transaction.id,
      originalAmount: amount,
      remainingAmount: amount,
      expiresAt
    }
  });

  return prisma.customerPointAccount.update({
    where: { id: account.id },
    data: {
      availablePoints: { increment: amount },
      lifetimeEarned: { increment: amount }
    }
  });
}

async function ensureProduct() {
  return prisma.product.upsert({
    where: {
      organizationId_manufacturerName_name: {
        organizationId: "org_salon_de_lien",
        manufacturerName: "ミルボン",
        name: "Aujua クエンチ 洗い流さないトリートメント"
      }
    },
    update: {
      category: "アウトバス",
      retailPrice: 2860,
      concernTags: ["乾燥", "ダメージ", "カラー後", "広がり", "まとまり"],
      description: "カラー後のパサつきと広がりを抑え、ドライヤー前に使いやすいAujuaのホームケア。",
      active: true
    },
    create: {
      manufacturerName: "ミルボン",
      name: "Aujua クエンチ 洗い流さないトリートメント",
      organizationId: "org_salon_de_lien",
      category: "アウトバス",
      retailPrice: 2860,
      stockQuantity: 10,
      concernTags: ["乾燥", "ダメージ", "カラー後", "広がり", "まとまり"],
      description: "カラー後のパサつきと広がりを抑え、ドライヤー前に使いやすいAujuaのホームケア。",
      active: true
    }
  });
}

async function ensureCustomer() {
  const existing = await prisma.customer.findFirst({
    where: {
      name: "山田 美咲",
      phone: "09000003939",
      deletedAt: null
    }
  });

  const customer = existing
    ? await prisma.customer.update({
        where: { id: existing.id },
        data: {
          gender: "女性",
          birthYear: 1992,
          memo: "デモ顧客。カラー後のパサつき、広がり、まとまりにくさが悩み。"
        }
      })
    : await prisma.customer.create({
        data: {
          name: "山田 美咲",
          gender: "女性",
          birthYear: 1992,
          phone: "09000003939",
          memo: "デモ顧客。カラー後のパサつき、広がり、まとまりにくさが悩み。",
          pointAccount: {
            create: {}
          }
        }
      });

  await prisma.hairProfile.upsert({
    where: { customerId: customer.id },
    update: {
      hairThickness: "普通",
      hairVolume: "やや多い",
      hairTexture: "広がりやすい",
      scalpCondition: "普通",
      lifestyle: "朝のスタイリング時間は10分以内",
      stylingTimeMinutes: 10
    },
    create: {
      customerId: customer.id,
      hairThickness: "普通",
      hairVolume: "やや多い",
      hairTexture: "広がりやすい",
      scalpCondition: "普通",
      lifestyle: "朝のスタイリング時間は10分以内",
      stylingTimeMinutes: 10
    }
  });

  await prisma.preference.upsert({
    where: { customerId: customer.id },
    update: {
      preferredLength: "ミディアム",
      preferredStyle: "まとまりやすい自然なスタイル",
      dislikes: "広がり、重すぎる仕上がり",
      colorPreference: "落ち着いたブラウン",
      maintenanceLevel: "自宅で簡単に再現したい"
    },
    create: {
      customerId: customer.id,
      preferredLength: "ミディアム",
      preferredStyle: "まとまりやすい自然なスタイル",
      dislikes: "広がり、重すぎる仕上がり",
      colorPreference: "落ち着いたブラウン",
      maintenanceLevel: "自宅で簡単に再現したい"
    }
  });

  return customer;
}

async function ensureVisitAndSale(customerId) {
  const visitedAt = addDays(new Date(), -52);
  const demoStylistName = "谷崎 太二";
  let visit = await prisma.visit.findFirst({
    where: {
      customerId,
      performedStyle: "カラー + トリートメント"
    },
    orderBy: { visitedAt: "desc" }
  });

  if (!visit) {
    visit = await prisma.visit.create({
      data: {
        customerId,
        visitedAt,
        stylistName: demoStylistName,
        requestedStyle: "カラー後のパサつきを抑えたい",
        performedStyle: "カラー + トリートメント",
        cutNotes: "毛先を整え、まとまりやすい重さを残す",
        colorNotes: "落ち着いたブラウン。退色後の黄色味を抑える",
        customerReaction: "手触りが良くなり、次回もケアしたい",
        nextRecommendation: "45日後にカットとトリートメント"
      }
    });
  } else if (visit.stylistName !== demoStylistName) {
    visit = await prisma.visit.update({
      where: { id: visit.id },
      data: { stylistName: demoStylistName }
    });
  }

  let sale = await prisma.serviceSale.findFirst({
    where: {
      customerId,
      source: "demo",
      title: "カラー + トリートメント"
    },
    orderBy: { paidAt: "desc" }
  });

  if (!sale) {
    sale = await prisma.serviceSale.create({
      data: {
        customerId,
        title: "カラー + トリートメント",
        amount: 9800,
        paymentMethod: "カード",
        paidAt: visitedAt,
        source: "demo",
        note: "デモ用前回来店"
      }
    });
  }

  let appointment = await prisma.appointment.findFirst({
    where: { customerId, source: "demo-next-visit" },
    orderBy: { scheduledAt: "asc" }
  });

  if (!appointment) {
    appointment = await prisma.appointment.create({
      data: {
        customerId,
        scheduledAt: addDays(new Date(), 3),
        menu: "カット + トリートメント相談",
        estimatedPrice: 8800,
        status: "仮予約",
        source: "demo-next-visit",
        note: "操作説明資料用の来店予定"
      }
    });
  }

  return { visit, sale, appointment };
}

async function ensureStyleSuggestion(customerId, visitId) {
  const existing = await prisma.styleSuggestion.findFirst({
    where: {
      customerId,
      suggestedStyleName: "まとまり重視のケアカラー"
    },
    orderBy: { createdAt: "desc" }
  });

  if (existing) {
    return existing;
  }

  return prisma.styleSuggestion.create({
    data: {
      customerId,
      visitId,
      suggestedStyleName: "まとまり重視のケアカラー",
      reason: "カラー後のパサつきと広がりを抑え、次回まできれいな状態を保つため。",
      caution: "毛先の乾燥が出やすいため、ドライ前の保湿ケアを案内。",
      stylingAdvice: "ドライヤー前に毛先中心へヘアミルクをなじませる。",
      menuSuggestion: "カット + トリートメント",
      estimatedMinutes: 90,
      maintenanceLevel: "45日後にメンテナンス",
      accepted: true
    }
  });
}

async function ensureProductProposal(customerId, productId, visitId) {
  let proposal = await prisma.productProposal.findFirst({
    where: {
      customerId,
      productId,
      status: "sample_given"
    },
    orderBy: { createdAt: "desc" }
  });

  if (!proposal) {
    proposal = await prisma.productProposal.create({
      data: {
        customerId,
        productId,
        visitId,
        proposalReason: "カラー後のパサつき・広がりを抑え、次回までまとまりを保つため。",
        concernTags: ["乾燥", "ダメージ", "カラー後", "広がり", "まとまり"],
        status: "sample_given",
        reaction: "interested",
        purchased: false,
        note: "仕上げ時に使い方を案内。ドライヤー前に毛先中心で使うよう説明。"
      }
    });
  }

  return proposal;
}

async function ensureActiveReviewRequest(proposalId, existingToken) {
  if (existingToken) {
    const request = await prisma.productReviewRequest.findUnique({
      where: { tokenHash: hash(existingToken) },
      include: { review: true }
    });

    if (request && request.productProposalId === proposalId && request.status === "active" && !request.review && request.expiresAt > new Date()) {
      return { request, reviewToken: existingToken };
    }
  }

  const reviewToken = token();
  const request = await prisma.productReviewRequest.create({
    data: {
      productProposalId: proposalId,
      tokenHash: hash(reviewToken),
      expiresAt: addDays(new Date(), 14),
      status: "active"
    }
  });

  return { request, reviewToken };
}

async function ensureAnsweredReviewFixtures(productId, customerId) {
  const fixtures = [
    { good: ["手触り", "まとまり"], bad: ["価格"], comment: "手触りが良くなり、朝のまとまりが楽でした。" },
    { good: ["香り", "ツヤ"], bad: ["特になし"], comment: "香りが強すぎず使いやすかったです。" },
    { good: ["まとまり", "使いやすさ"], bad: ["効果が分かりにくい"], comment: "毛先中心につけると広がりが落ち着きました。" }
  ];

  for (let index = 0; index < fixtures.length; index += 1) {
    const source = `demo-answered-review-${index + 1}`;
    const tokenHash = hash(source);
    const existing = await prisma.productReviewRequest.findUnique({ where: { tokenHash } });
    if (existing) {
      continue;
    }

    const proposal = await prisma.productProposal.create({
      data: {
        customerId,
        productId,
        proposalReason: "メーカー向け集計デモ用の商品提案",
        concernTags: ["乾燥", "カラー後", "まとまり"],
        status: index === 0 ? "purchased" : "sample_given",
        reaction: index === 0 ? "purchased" : "interested",
        purchased: index === 0,
        note: "操作説明資料用レビュー集計データ"
      }
    });

    const request = await prisma.productReviewRequest.create({
      data: {
        productProposalId: proposal.id,
        tokenHash,
        expiresAt: addDays(new Date(), 14),
        status: "answered",
        answeredAt: new Date()
      }
    });

    await prisma.productReview.create({
      data: {
        productProposalId: proposal.id,
        reviewRequestId: request.id,
        usedStatus: "used",
        rating: index === 0 ? 5 : 4,
        goodPoints: fixtures[index].good,
        badPoints: fixtures[index].bad,
        repeatIntent: index === 2 ? "maybe" : "yes",
        freeComment: fixtures[index].comment,
        allowAnonymousShare: true,
        allowAnonymousQuote: true
      }
    });
  }
}

async function ensureCouponIssue(customerId) {
  const existing = await prisma.couponIssue.findFirst({
    where: {
      customerId,
      templateVersion: "coupon-v2"
    },
    orderBy: { createdAt: "desc" }
  });

  const issuedAt = new Date();
  const expiresAt = addDays(issuedAt, 14);
  const data = {
    customerName: "山田 美咲",
    discountRate: 10,
    targetMenusJson: ["カット", "トリートメント"],
    issuedAt,
    expiresAt,
    salonMessage: "次回もまとまりやすい状態を保てるよう、カットとケアをご提案します。",
    status: "issued",
    templateVersion: "coupon-v2"
  };

  if (existing) {
    return prisma.couponIssue.update({
      where: { id: existing.id },
      data
    });
  }

  const couponCode = `SDL-${issuedAt.toISOString().slice(0, 10).replace(/-/g, "")}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  return prisma.couponIssue.create({
    data: {
      customerId,
      couponCode,
      ...data
    }
  });
}

async function ensureCustomerCoupon(customerId) {
  const existing = await prisma.coupon.findFirst({
    where: {
      customerId,
      title: "山田様限定 次回ケアクーポン",
      status: "issued"
    },
    orderBy: { createdAt: "desc" }
  });

  if (existing) {
    return existing;
  }

  const issuedAt = new Date();
  return prisma.coupon.create({
    data: {
      customerId,
      title: "山田様限定 次回ケアクーポン",
      description: "次回のカットまたはトリートメントに使える限定クーポンです。",
      couponType: "salon",
      targetMenu: "カット + トリートメント",
      discountType: "percentage",
      discountValue: "10",
      validFrom: issuedAt,
      validUntil: addDays(issuedAt, 14),
      status: "issued",
      couponCode: `SDL-${issuedAt.toISOString().slice(0, 10).replace(/-/g, "")}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`,
      issuedAt
    }
  });
}

async function ensureReferral(customerId) {
  const code = "LIEN-A8K3X";
  const existing = await prisma.referral.findUnique({ where: { code } });
  if (existing) {
    return prisma.referral.update({
      where: { id: existing.id },
      data: {
        referrerCustomerId: customerId,
        status: "issued",
        referredCustomerId: null,
        registeredAt: null,
        firstVisitCompletedAt: null,
        rewardedAt: null,
        expiresAt: addDays(new Date(), 90)
      }
    });
  }

  return prisma.referral.create({
    data: {
      referrerCustomerId: customerId,
      tokenHash: hash(code),
      code,
      status: "issued",
      expiresAt: addDays(new Date(), 90)
    }
  });
}

async function main() {
  fs.mkdirSync(DEMO_DIR, { recursive: true });

  const previous = readDemoData();
  const product = await ensureProduct();
  const customer = await ensureCustomer();
  const { visit, sale, appointment } = await ensureVisitAndSale(customer.id);
  const suggestion = await ensureStyleSuggestion(customer.id, visit.id);
  const proposal = await ensureProductProposal(customer.id, product.id, visit.id);
  const reviewRequest = await ensureActiveReviewRequest(proposal.id, previous.productReviewToken);
  await ensureAnsweredReviewFixtures(product.id, customer.id);
  await ensureOpeningPoints(customer.id);
  const couponIssue = await ensureCouponIssue(customer.id);
  await ensureCustomerCoupon(customer.id);
  const referral = await ensureReferral(customer.id);

  const demoData = {
    generatedAt: new Date().toISOString(),
    customerId: customer.id,
    customerName: customer.name,
    productId: product.id,
    productName: product.name,
    productProposalId: proposal.id,
    productReviewRequestId: reviewRequest.request.id,
    productReviewToken: reviewRequest.reviewToken,
    couponIssueId: couponIssue.id,
    referralCode: referral.code,
    visitId: visit.id,
    serviceSaleId: sale.id,
    appointmentId: appointment.id,
    styleSuggestionId: suggestion.id
  };

  fs.writeFileSync(DEMO_DATA_PATH, JSON.stringify(demoData, null, 2), "utf8");
  console.log(JSON.stringify(demoData, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
