const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const ORGANIZATION_ID = "org_showcase_yohaku";
const ORGANIZATION_NAME = "ヘアサロン 余白と前髪";

const customers = [
  ["相沢 しずく", "女性", 1998, 2, 14], ["秋山 美羽", "女性", 1987, 9, 3],
  ["有村 芹奈", "女性", 2001, 5, 28], ["石橋 さくら", "女性", 1994, 12, 7],
  ["上野 亜弥", "女性", 1982, 4, 19], ["江藤 ひかり", "女性", 1990, 8, 24],
  ["大西 璃子", "女性", 1978, 11, 11], ["岡部 優月", "女性", 2003, 1, 30],
  ["加納 すみれ", "女性", 1985, 6, 16], ["川島 茉央", "女性", 1997, 10, 5],
  ["久保田 杏", "女性", 1992, 3, 22], ["黒木 伊織", "女性", 1974, 7, 9],
  ["小松 菜摘", "女性", 1989, 5, 12], ["坂口 えみ", "女性", 1995, 2, 2],
  ["篠原 美波", "女性", 1980, 9, 27], ["高木 理央", "女性", 2000, 4, 8],
  ["武田 朱里", "女性", 1993, 11, 20], ["中尾 ひなた", "女性", 1986, 1, 17],
  ["西川 瑠奈", "女性", 1999, 6, 1], ["橋口 楓", "女性", 1976, 12, 13],
  ["原田 つむぎ", "女性", 1991, 8, 6], ["福永 瑞希", "女性", 1984, 3, 10],
  ["松岡 凛", "女性", 2002, 7, 25], ["宮田 ほのか", "女性", 1988, 10, 31],
  ["山内 美晴", "女性", 1969, 5, 4], ["井口 拓海", "男性", 1996, 6, 18],
  ["大森 慎吾", "男性", 1983, 1, 9], ["木下 直哉", "男性", 1990, 9, 15],
  ["小谷 陽介", "男性", 1977, 4, 26], ["佐久間 理久", "男性", 2000, 12, 2],
  ["竹内 颯", "男性", 1993, 7, 14], ["中原 圭吾", "男性", 1985, 11, 29],
  ["藤本 蒼士", "男性", 1998, 3, 6], ["前田 達也", "男性", 1972, 8, 21],
  ["三浦 智紀", "男性", 1989, 2, 25], ["吉岡 健人", "男性", 1995, 10, 12],
];

const staff = ["雨宮 透", "高瀬 美月", "真鍋 蓮", "白石 直子", "フリー"];
const menus = [
  { name: "似合わせカット", price: 5500, duration: 60 },
  { name: "透明感カラー", price: 8800, duration: 100 },
  { name: "カット + 髪質ケア", price: 9900, duration: 105 },
  { name: "ニュアンスパーマ", price: 12100, duration: 140 },
  { name: "頭皮リセットスパ", price: 4400, duration: 40 },
  { name: "メンズカット + 眉", price: 6600, duration: 70 },
];
const providers = [
  { bookingProvider: "kanzashi", source: "gmail:kanzashi" },
  { bookingProvider: "hotpepper", source: "gmail:hotpepper" },
  { bookingProvider: "phone", source: "phone" },
];

const customerComments = [
  ["松永 美緒", "顔まわりの軽さが素敵です。結んだ時の雰囲気も見てみたいです。"],
  ["北村 ひより", "前髪から横へつながるラインが自然で、普段のお手入れもしやすそう。"],
  ["岸本 皐月", "丸みの位置がきれいですね。襟足がすっきりしていて好みです。"],
  ["成瀬 琴葉", "乾かすだけでこの形になるなら、朝がかなり楽になりそうです。"],
  ["小泉 奈央", "暗すぎない色味がきれい。光に当たった時の透明感も好きです。"],
  ["笹原 悠真", "短めでも動きが出ていて良いですね。横から見た形も参考になります。"],
  ["水野 千紘", "色とカットのバランスがやわらかくて、季節が変わっても合わせやすそう。"],
  ["春日井 みのり", "耳まわりがすっきりしているので、メガネでも収まりが良さそうです。"],
  ["藤野 佳澄", "ツヤが出ていて毛先まできれい。広がりやすい髪でも試してみたいです。"],
  ["森川 はな", "まとまりがあるのに重く見えないところが素敵です。"],
  ["日高 旭", "動きが自然で、セットを頑張りすぎなくても雰囲気が出そうです。"],
  ["浦田 航平", "後ろのボリューム感がちょうど良いですね。自分の髪質でも相談したいです。"],
  ["平松 沙耶", "レイヤーの入り方がきれい。暗めのカラーでも軽く見えますね。"],
  ["望月 紬", "毛先の動きがやわらかくて好きです。伸びてきても扱いやすそう。"],
  ["奥田 芽衣", "横顔がすっきり見える形ですね。次回の候補に入れたいです。"],
  ["倉田 まどか", "顔まわりだけ少し軽くする感じが参考になりました。"],
  ["本多 真帆", "特別な日らしさはあるのに、きっちりしすぎていなくて素敵です。"],
  ["大庭 颯太", "飾りを変えると雰囲気も変えられそう。後ろから見てもきれいです。"],
  ["河合 晴美", "長さを残しながら整っているので、伸ばしかけにも良さそうですね。"],
  ["片桐 謙太", "自然なウェーブが残っていて、普段の服にも合わせやすそうです。"],
];

function jstDate(year, month, day, hour = 0, minute = 0) {
  return new Date(Date.UTC(year, month - 1, day, hour - 9, minute));
}

function nextBusinessDays() {
  const days = [];
  for (let day = 17; days.length < 28; day += 1) {
    const date = new Date(Date.UTC(2026, 7, day));
    if (date.getUTCDay() !== 1) days.push(date);
  }
  return days;
}

async function main() {
  const organization = await prisma.organization.findUnique({
    where: { id: ORGANIZATION_ID },
    select: { id: true, name: true },
  });
  if (!organization || organization.name !== ORGANIZATION_NAME) {
    throw new Error("Showcase safety check failed: the expected demo organization was not found.");
  }

  const before = {
    customers: await prisma.customer.count({ where: { organizationId: ORGANIZATION_ID, deletedAt: null } }),
    appointments: await prisma.appointment.count({ where: { customer: { organizationId: ORGANIZATION_ID } } }),
    comments: await prisma.visitCommunityComment.count({ where: { post: { organizationId: ORGANIZATION_ID }, deletedAt: null } }),
  };

  await prisma.$transaction(async (tx) => {
    for (let index = 0; index < customers.length; index += 1) {
      const [name, gender, year, month, day] = customers[index];
      const id = `showcase-yohaku-customer-${String(index + 37).padStart(3, "0")}`;
      const preferredStaff = staff[index % staff.length];
      await tx.customer.upsert({
        where: { id },
        update: {
          name,
          gender,
          birthYear: year,
          birthDate: jstDate(year, month, day),
          servicePreference: index % 3 === 0 ? "静かに過ごしたい" : "適度に話したい",
          staffAssignmentType: preferredStaff === "フリー" ? "free" : "assigned",
          assignedStaffName: preferredStaff === "フリー" ? null : preferredStaff,
          deletedAt: null,
        },
        create: {
          id,
          organizationId: ORGANIZATION_ID,
          name,
          gender,
          birthYear: year,
          birthDate: jstDate(year, month, day),
          phone: `000-7200-${String(index + 37).padStart(4, "0")}`,
          memo: "デモ店舗の接客確認用顧客",
          servicePreference: index % 3 === 0 ? "静かに過ごしたい" : "適度に話したい",
          staffAssignmentType: preferredStaff === "フリー" ? "free" : "assigned",
          assignedStaffName: preferredStaff === "フリー" ? null : preferredStaff,
        },
      });
      await tx.customerPointAccount.upsert({
        where: { customerId: id },
        update: {},
        create: {
          customerId: id,
          availablePoints: 0,
          lifetimeEarned: 0,
        },
      });
    }

    const days = nextBusinessDays();
    let appointmentIndex = 0;
    for (let dayIndex = 0; dayIndex < days.length; dayIndex += 1) {
      const date = days[dayIndex];
      const slots = [[10, 0], [12, 0], [14, 0]];
      for (let slotIndex = 0; slotIndex < slots.length; slotIndex += 1) {
        appointmentIndex += 1;
        const [hour, minute] = slots[slotIndex];
        const id = `showcase-yohaku-expanded-appointment-${String(appointmentIndex).padStart(3, "0")}`;
        const customerIndex = (appointmentIndex - 1) % customers.length;
        const customerId = `showcase-yohaku-customer-${String(customerIndex + 37).padStart(3, "0")}`;
        const staffName = staff[(dayIndex + slotIndex * 2) % staff.length];
        const menu = menus[(dayIndex * 2 + slotIndex) % menus.length];
        const provider = providers[(dayIndex + slotIndex) % providers.length];
        const scheduledAt = jstDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), hour, minute);
        const data = {
          customerId,
          scheduledAt,
          menu: menu.name,
          estimatedPrice: menu.price,
          status: appointmentIndex % 13 === 0 ? "仮予約" : "予約確定",
          source: provider.source,
          note: "デモ店舗の予約データ",
          staffName,
          durationMinutes: menu.duration,
          bookingProvider: provider.bookingProvider,
        };
        await tx.appointment.upsert({ where: { id }, update: data, create: { id, ...data } });
      }
    }

    for (let postIndex = 0; postIndex < 10; postIndex += 1) {
      for (let commentIndex = 0; commentIndex < 2; commentIndex += 1) {
        const source = customerComments[postIndex * 2 + commentIndex];
        const id = `showcase-yohaku-customer-comment-${String(postIndex + 1).padStart(3, "0")}-${commentIndex + 1}`;
        const data = {
          postId: `showcase-yohaku-community-post-${String(postIndex + 1).padStart(3, "0")}`,
          appUserId: null,
          authorDisplayName: source[0],
          authorRole: "CUSTOMER",
          isStylistComment: false,
          isAiAssistant: false,
          body: source[1],
          deletedAt: null,
        };
        await tx.visitCommunityComment.upsert({ where: { id }, update: data, create: { id, ...data } });
      }
    }
  }, { maxWait: 10000, timeout: 60000 });

  const after = {
    customers: await prisma.customer.count({ where: { organizationId: ORGANIZATION_ID, deletedAt: null } }),
    appointments: await prisma.appointment.count({ where: { customer: { organizationId: ORGANIZATION_ID } } }),
    comments: await prisma.visitCommunityComment.count({ where: { post: { organizationId: ORGANIZATION_ID }, deletedAt: null } }),
  };

  const generated = {
    customers: await prisma.customer.count({
      where: { organizationId: ORGANIZATION_ID, id: { startsWith: "showcase-yohaku-customer-0" } },
    }),
    appointments: await prisma.appointment.count({
      where: { id: { startsWith: "showcase-yohaku-expanded-appointment-" } },
    }),
    comments: await prisma.visitCommunityComment.count({
      where: { id: { startsWith: "showcase-yohaku-customer-comment-" } },
    }),
  };

  if (after.customers < 72 || generated.appointments !== 84 || generated.comments !== 20) {
    throw new Error(`Showcase verification failed: ${JSON.stringify({ before, after, generated })}`);
  }

  console.log(JSON.stringify({ organization, before, after, generated, applied: true }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
