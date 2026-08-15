import { PrismaClient } from "@prisma/client";
import { hashScryptPassword } from "../src/lib/auth/password";

const prisma = new PrismaClient();

const ORGANIZATION_ID = "org_salon_de_lien";
const CUSTOMER_ID = "demo-reservation-customer-001";
const APPOINTMENT_ID = "demo-reservation-appointment-001";
const LOGIN_ID = "demo8801";
const PASSWORD = "Lien8801!";

function nextDemoSlot() {
  const todayInJapan = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
  const slot = new Date(`${todayInJapan}T14:30:00+09:00`);
  slot.setUTCDate(slot.getUTCDate() + 1);
  return slot;
}

async function main() {
  if (process.env.APP_ENV === "production") {
    throw new Error("本番環境ではデモ予約・顧客ログインを作成できません。");
  }
  if (PASSWORD.length < 8) {
    throw new Error("デモ顧客のパスワードは8文字以上にしてください。");
  }

  const organization = await prisma.organization.findUnique({
    where: { id: ORGANIZATION_ID },
    select: { id: true }
  });
  if (!organization) {
    throw new Error(`店舗データが見つかりません: ${ORGANIZATION_ID}`);
  }

  const scheduledAt = nextDemoSlot();
  const passwordHash = hashScryptPassword(PASSWORD);

  const result = await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.upsert({
      where: { id: CUSTOMER_ID },
      update: {
        organizationId: ORGANIZATION_ID,
        name: "石井 ひなた",
        gender: "女性",
        birthYear: 1996,
        phone: "090-4827-6153",
        servicePreference: "適度に話したい",
        staffAssignmentType: "assigned",
        assignedStaffName: "浅野 清美",
        memo: "デモ予約・お客様アプリ確認用（実在顧客ではありません）",
        deletedAt: null
      },
      create: {
        id: CUSTOMER_ID,
        organizationId: ORGANIZATION_ID,
        name: "石井 ひなた",
        gender: "女性",
        birthYear: 1996,
        phone: "090-4827-6153",
        servicePreference: "適度に話したい",
        staffAssignmentType: "assigned",
        assignedStaffName: "浅野 清美",
        memo: "デモ予約・お客様アプリ確認用（実在顧客ではありません）"
      }
    });

    await tx.hairProfile.upsert({
      where: { customerId: customer.id },
      update: {
        hairVolume: "普通",
        hairTexture: "やわらかい",
        hairThickness: "普通",
        hairCurl: "少しあり"
      },
      create: {
        customerId: customer.id,
        hairVolume: "普通",
        hairTexture: "やわらかい",
        hairThickness: "普通",
        hairCurl: "少しあり"
      }
    });

    await tx.preference.upsert({
      where: { customerId: customer.id },
      update: {
        preferredLength: "ミディアム",
        preferredStyle: "まとまりやすい自然なスタイル",
        colorPreference: "透明感のあるブラウン"
      },
      create: {
        customerId: customer.id,
        preferredLength: "ミディアム",
        preferredStyle: "まとまりやすい自然なスタイル",
        colorPreference: "透明感のあるブラウン"
      }
    });

    await tx.customerPointAccount.upsert({
      where: { customerId: customer.id },
      update: {},
      create: { customerId: customer.id }
    });

    const appUser = await tx.appUser.upsert({
      where: { customerId: customer.id },
      update: {
        organizationId: ORGANIZATION_ID,
        loginId: LOGIN_ID,
        email: `${LOGIN_ID}@customer.salon-de-lien.local`,
        passwordHash,
        role: "CUSTOMER",
        active: true
      },
      create: {
        organizationId: ORGANIZATION_ID,
        customerId: customer.id,
        loginId: LOGIN_ID,
        email: `${LOGIN_ID}@customer.salon-de-lien.local`,
        passwordHash,
        role: "CUSTOMER",
        active: true
      }
    });

    const appointment = await tx.appointment.upsert({
      where: { id: APPOINTMENT_ID },
      update: {
        customerId: customer.id,
        scheduledAt,
        menu: "カット + カラー",
        staffName: "浅野 清美",
        estimatedPrice: 13200,
        status: "予約確定",
        source: "demo-calendar-login",
        note: "デモ予約。透明感のあるブラウンを希望。"
      },
      create: {
        id: APPOINTMENT_ID,
        customerId: customer.id,
        scheduledAt,
        menu: "カット + カラー",
        staffName: "浅野 清美",
        estimatedPrice: 13200,
        status: "予約確定",
        source: "demo-calendar-login",
        note: "デモ予約。透明感のあるブラウンを希望。"
      }
    });

    return { customer, appUser, appointment };
  });

  console.log(
    JSON.stringify(
      {
        customerId: result.customer.id,
        customerName: result.customer.name,
        appointmentId: result.appointment.id,
        scheduledAt: result.appointment.scheduledAt.toISOString(),
        menu: result.appointment.menu,
        staffName: result.appointment.staffName,
        loginId: result.appUser.loginId,
        password: PASSWORD,
        loginUrl: "/u/login"
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
