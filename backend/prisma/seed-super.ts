/**
 * Super Admin seed: platforma egasi akkaunti + demo tariflar + demo tenantlar.
 *
 * Ishga tushirish:
 *   cd backend
 *   npx ts-node prisma/seed-super.ts
 *
 * Yoki environment override bilan:
 *   SUPER_SEED_EMAIL=owner@platform.uz SUPER_SEED_PASSWORD=MyStr0ngP@ss npx ts-node prisma/seed-super.ts
 */
import { PrismaClient, PlatformRole, TariffPlan, TenantStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEFAULT_TARIFFS = [
  {
    plan: TariffPlan.FREE,
    monthlyPrice: 0,
    yearlyPrice: 0,
    yearlyDiscount: 0,
    maxCategories: 3,
    maxProducts: 6,
    maxBanners: 1,
    maxImagesPerProduct: 3,
    maxOptionsPerProduct: 5,
    aiImagesPerMonth: 3,
    aiAutoFillPerMonth: 3,
    features: {
      paymeIntegration: 'one-only',
      clickIntegration: 'one-only',
      ownBot: true,
      stats: 'basic',
      moySklad: false,
      support: false,
      whiteLabel: false,
      apiAccess: false,
    },
    description: 'Boshlash uchun',
    position: 1,
  },
  {
    plan: TariffPlan.STANDARD,
    monthlyPrice: 199_000,
    yearlyPrice: 1_990_000, // 2 oy bepul (~17%) — landing bilan bir xil
    yearlyDiscount: 17,
    maxCategories: 50,
    maxProducts: 200,
    maxBanners: 5,
    maxImagesPerProduct: 5,
    maxOptionsPerProduct: 5,
    aiImagesPerMonth: 50,
    aiAutoFillPerMonth: 150,
    features: {
      paymeIntegration: true,
      clickIntegration: true,
      ownBot: true,
      stats: 'basic',
      moySklad: true,
      support: '24/7',
      whiteLabel: false,
      apiAccess: false,
    },
    badge: null,
    description: "O'sayotgan biznes uchun",
    position: 2,
  },
  {
    plan: TariffPlan.PRO,
    monthlyPrice: 499_000,
    yearlyPrice: 4_990_000, // 2 oy bepul (~17%) — landing bilan bir xil
    yearlyDiscount: 17,
    maxCategories: 100,
    maxProducts: 2_000,
    maxBanners: 10,
    maxImagesPerProduct: 10,
    maxOptionsPerProduct: 5,
    aiImagesPerMonth: 200,
    aiAutoFillPerMonth: 1_000,
    features: {
      paymeIntegration: true,
      clickIntegration: true,
      ownBot: true,
      stats: 'pro',
      moySklad: true,
      support: 'priority',
      whiteLabel: false,
      apiAccess: false,
      ownDelivery: true,
      channelButton: true,
    },
    badge: 'ENG MASHHUR',
    description: "Mashhur — O'sish uchun",
    position: 3,
  },
  {
    plan: TariffPlan.PREMIUM,
    monthlyPrice: 790_000,
    yearlyPrice: 7_900_000, // 2 oy bepul (~17%) — landing bilan bir xil
    yearlyDiscount: 17,
    maxCategories: 999_999,
    maxProducts: 999_999,
    maxBanners: 999_999,
    maxImagesPerProduct: 10,
    maxOptionsPerProduct: 5,
    aiImagesPerMonth: 200,
    aiAutoFillPerMonth: 2_000,
    features: {
      paymeIntegration: true,
      clickIntegration: true,
      ownBot: true,
      stats: 'pro+',
      moySklad: true,
      support: 'dedicated',
      whiteLabel: true,
      apiAccess: true,
      ownDelivery: true,
      channelButton: true,
      multiCurrency: true,
      b2b: true,
    },
    badge: null,
    description: 'Yetakchilar uchun',
    position: 4,
  },
];

async function main(): Promise<void> {
  // Login service'i emailni .toLowerCase() qilib qidiradi, shuning uchun
  // DB'da ham faqat lowercase shaklda saqlaymiz. Aks holda mixed-case email
  // bilan yaratilgan akkountga login bo'lmaydi.
  const ownerEmail = (process.env.SUPER_SEED_EMAIL ?? 'owner@platform.uz').toLowerCase().trim();
  const ownerPassword = process.env.SUPER_SEED_PASSWORD ?? 'SuperOwner123!';
  const ownerName = process.env.SUPER_SEED_FULLNAME ?? 'Platform Owner';

  // 1. Platform Owner — mavjud bo'lsa parolini ham yangilaymiz
  // (shu skript qayta ishlatilganda parolni reset qilish uchun ishlatiladi)
  const passwordHash = await bcrypt.hash(ownerPassword, 12);
  const owner = await prisma.platformAdmin.upsert({
    where: { email: ownerEmail },
    update: { passwordHash, fullName: ownerName },
    create: {
      email: ownerEmail,
      passwordHash,
      fullName: ownerName,
      role: PlatformRole.OWNER,
      isActive: true,
    },
  });
  console.log(`✓ Platform OWNER upserted: ${ownerEmail} / ${ownerPassword}`);

  // 2. Tarif konfiguratsiyasi
  for (const t of DEFAULT_TARIFFS) {
    await prisma.tariffConfig.upsert({
      where: { plan: t.plan },
      update: {
        monthlyPrice: t.monthlyPrice,
        yearlyPrice: t.yearlyPrice,
        yearlyDiscount: t.yearlyDiscount,
        maxCategories: t.maxCategories,
        maxProducts: t.maxProducts,
        maxBanners: t.maxBanners,
        maxImagesPerProduct: t.maxImagesPerProduct,
        maxOptionsPerProduct: t.maxOptionsPerProduct,
        aiImagesPerMonth: t.aiImagesPerMonth,
        aiAutoFillPerMonth: t.aiAutoFillPerMonth,
        features: t.features,
        badge: t.badge,
        description: t.description,
        position: t.position,
      },
      create: t,
    });
  }
  console.log(`✓ ${DEFAULT_TARIFFS.length} tariff configs upserted`);

  // 3. Demo tenantlar (development uchun)
  if (process.env.SUPER_SEED_DEMO === '1') {
    const demoTenants = [
      {
        slug: 'eshik-bozori',
        shopName: 'Eshik Bozori',
        ownerName: 'Sardor Karimov',
        ownerEmail: 'sardor@eshik.uz',
        ownerPhone: '+998901234567',
        tariffPlan: TariffPlan.PRO,
        status: TenantStatus.ACTIVE,
        totalRevenue: 45_000_000,
        totalOrders: 234,
      },
      {
        slug: 'modnaya-leli',
        shopName: 'Modnaya Leli',
        ownerName: 'Madina Saidova',
        ownerEmail: 'madina@modnaya.uz',
        ownerPhone: '+998902345678',
        tariffPlan: TariffPlan.STANDARD,
        status: TenantStatus.ACTIVE,
        totalRevenue: 8_500_000,
        totalOrders: 89,
      },
      {
        slug: 'cosmo-shop',
        shopName: 'Cosmo Shop',
        ownerName: 'Nilufar Tursunova',
        ownerEmail: 'nilufar@cosmo.uz',
        ownerPhone: '+998903456789',
        tariffPlan: TariffPlan.PREMIUM,
        status: TenantStatus.ACTIVE,
        isWhiteLabel: true,
        customDomain: 'shop.cosmo.uz',
        totalRevenue: 120_000_000,
        totalOrders: 567,
      },
      {
        slug: 'home-kitchen',
        shopName: 'Home & Kitchen',
        ownerName: 'Dilshod Rahimov',
        ownerEmail: 'dilshod@hk.uz',
        ownerPhone: '+998904567890',
        tariffPlan: TariffPlan.FREE,
        status: TenantStatus.ACTIVE,
        isOnTrial: true,
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        totalRevenue: 1_200_000,
        totalOrders: 12,
      },
      {
        slug: 'failed-payment',
        shopName: 'Test To\'lov',
        ownerName: 'Aziz Yusupov',
        ownerEmail: 'aziz@test.uz',
        ownerPhone: '+998905678901',
        tariffPlan: TariffPlan.STANDARD,
        status: TenantStatus.PENDING_PAYMENT,
        totalRevenue: 0,
        totalOrders: 0,
      },
    ];

    for (const t of demoTenants) {
      await prisma.tenant.upsert({
        where: { slug: t.slug },
        update: {},
        create: {
          ...t,
          tariffStartedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          lastActivityAt: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000),
        },
      });
    }
    console.log(`✓ ${demoTenants.length} demo tenants created`);
  }

  console.log('\n🎉 Super Admin seed complete!');
  console.log('   Login: ' + ownerEmail);
  console.log('   Password: ' + ownerPassword);
  console.log('   URL: http://localhost:5180/login');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
