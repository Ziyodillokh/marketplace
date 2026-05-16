import { PrismaClient, PromoType, AdminRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const adminEmail = process.env.ADMIN_SEED_EMAIL ?? 'admin@example.com';
  const adminPassword = process.env.ADMIN_SEED_PASSWORD ?? 'ChangeMe123!';
  const adminFullName = process.env.ADMIN_SEED_FULLNAME ?? 'Super Admin';

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  await prisma.admin.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash,
      fullName: adminFullName,
      role: AdminRole.SUPERADMIN,
    },
  });
  console.log(`✓ Admin created: ${adminEmail}`);

  const categories = [
    { slug: 'phones', titleUz: 'Telefonlar', titleRu: 'Телефоны', iconUrl: null, position: 1 },
    { slug: 'accessories', titleUz: 'Aksessuarlar', titleRu: 'Аксессуары', iconUrl: null, position: 2 },
    { slug: 'clothing-women', titleUz: 'Ayollar kiyimi', titleRu: 'Женская мода', iconUrl: null, position: 3 },
    { slug: 'clothing-men', titleUz: 'Erkaklar kiyimi', titleRu: 'Мужская мода', iconUrl: null, position: 4 },
    { slug: 'cosmetics', titleUz: 'Kosmetika', titleRu: 'Косметика', iconUrl: null, position: 5 },
    { slug: 'electronics', titleUz: 'Elektronika', titleRu: 'Электроника', iconUrl: null, position: 6 },
    { slug: 'home', titleUz: 'Uy uchun', titleRu: 'Для дома', iconUrl: null, position: 7 },
  ];

  const categoryMap = new Map<string, string>();
  for (const c of categories) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { titleUz: c.titleUz, titleRu: c.titleRu, position: c.position },
      create: c,
    });
    categoryMap.set(c.slug, cat.id);
  }
  console.log(`✓ ${categories.length} categories created`);

  const productData: Array<{
    slug: string;
    titleUz: string;
    titleRu: string;
    descriptionUz: string;
    descriptionRu: string;
    categorySlug: string;
    brand: string;
    basePrice: number;
    oldPrice?: number;
    isFeatured?: boolean;
    images: string[];
    variants: Array<{ color?: string; size?: string; price: number; stock: number }>;
  }> = [
    {
      slug: 'iphone-15-silicone-case-blue',
      titleUz: 'iPhone 15 silikon chexol',
      titleRu: 'Силиконовый чехол для iPhone 15',
      descriptionUz: 'Original sifatli silikon chexol. Aniq o\'lcham, qulay tutuv.',
      descriptionRu: 'Оригинальный качественный силиконовый чехол.',
      categorySlug: 'accessories',
      brand: 'Apple',
      basePrice: 180000,
      oldPrice: 250000,
      isFeatured: true,
      images: ['https://images.unsplash.com/photo-1601593346740-925612772716?w=800'],
      variants: [
        { color: 'Ko\'k', price: 180000, stock: 50 },
        { color: 'Qora', price: 180000, stock: 30 },
        { color: 'Qizil', price: 195000, stock: 12 },
      ],
    },
    {
      slug: 'samsung-galaxy-s24',
      titleUz: 'Samsung Galaxy S24',
      titleRu: 'Samsung Galaxy S24',
      descriptionUz: 'Samsung kompaniyasining yangi flagman smartfoni.',
      descriptionRu: 'Новый флагманский смартфон Samsung.',
      categorySlug: 'phones',
      brand: 'Samsung',
      basePrice: 11500000,
      oldPrice: 12500000,
      isFeatured: true,
      images: ['https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800'],
      variants: [
        { color: 'Qora', size: '128GB', price: 11500000, stock: 8 },
        { color: 'Qora', size: '256GB', price: 12800000, stock: 5 },
        { color: 'Kumush', size: '256GB', price: 12800000, stock: 3 },
      ],
    },
    {
      slug: 'cream-midi-skirt',
      titleUz: 'Kremovaya midi yubka',
      titleRu: 'Кремовая миди-юбка',
      descriptionUz: 'Yumshoq mato, qulay kesim. Kunduzgi va kechki uchun mos.',
      descriptionRu: 'Мягкая ткань, удобный крой.',
      categorySlug: 'clothing-women',
      brand: 'Zara',
      basePrice: 320000,
      oldPrice: 400000,
      images: ['https://images.unsplash.com/photo-1583496661160-fb5886a13d44?w=800'],
      variants: [
        { color: 'Krem', size: 'S', price: 320000, stock: 4 },
        { color: 'Krem', size: 'M', price: 320000, stock: 7 },
        { color: 'Krem', size: 'L', price: 320000, stock: 3 },
      ],
    },
    {
      slug: 'blue-striped-shirt',
      titleUz: 'Ko\'k chiziqli ayollar ko\'ylagi',
      titleRu: 'Голубая полосатая женская рубашка',
      descriptionUz: 'Yengil paxta mato, ofisga va kunlik kiyim uchun.',
      descriptionRu: 'Лёгкая хлопковая ткань.',
      categorySlug: 'clothing-women',
      brand: 'Mango',
      basePrice: 150000,
      oldPrice: 250000,
      isFeatured: true,
      images: ['https://images.unsplash.com/photo-1604176354204-9268737828e4?w=800'],
      variants: [
        { color: 'Ko\'k', size: 'S', price: 150000, stock: 5 },
        { color: 'Ko\'k', size: 'M', price: 150000, stock: 8 },
      ],
    },
    {
      slug: 'apple-airpods-pro',
      titleUz: 'Apple AirPods Pro 2',
      titleRu: 'Apple AirPods Pro 2',
      descriptionUz: 'Active noise cancellation. Spatial Audio. Magsafe charging case.',
      descriptionRu: 'Активное шумоподавление.',
      categorySlug: 'electronics',
      brand: 'Apple',
      basePrice: 2890000,
      isFeatured: true,
      images: ['https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=800'],
      variants: [{ color: 'Oq', price: 2890000, stock: 15 }],
    },
    {
      slug: 'maybelline-lipstick',
      titleUz: 'Maybelline pomada',
      titleRu: 'Помада Maybelline',
      descriptionUz: 'SuperStay Matte Ink — uzoq turuvchi mayda formula.',
      descriptionRu: 'Стойкая матовая формула.',
      categorySlug: 'cosmetics',
      brand: 'Maybelline',
      basePrice: 95000,
      oldPrice: 120000,
      images: ['https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800'],
      variants: [
        { color: 'Lover', price: 95000, stock: 25 },
        { color: 'Pioneer', price: 95000, stock: 18 },
      ],
    },
    {
      slug: 'mens-classic-watch',
      titleUz: 'Erkaklar uchun klassik soat',
      titleRu: 'Мужские классические часы',
      descriptionUz: 'Charm tasma, mexanik. Sovg\'aga ham mos.',
      descriptionRu: 'Кожаный ремешок, механика.',
      categorySlug: 'clothing-men',
      brand: 'Casio',
      basePrice: 450000,
      images: ['https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800'],
      variants: [{ color: 'Qora', price: 450000, stock: 10 }],
    },
    {
      slug: 'kitchen-knife-set',
      titleUz: 'Oshxona pichoqlari to\'plami',
      titleRu: 'Набор кухонных ножей',
      descriptionUz: '5 ta pichoq + magnitli stenddan iborat.',
      descriptionRu: '5 ножей и магнитная подставка.',
      categorySlug: 'home',
      brand: 'Tramontina',
      basePrice: 380000,
      oldPrice: 480000,
      images: ['https://images.unsplash.com/photo-1593618998160-e34014e67546?w=800'],
      variants: [{ price: 380000, stock: 6 }],
    },
    {
      slug: 'dreame-vacuum-v12',
      titleUz: 'Dreame V12 cho\'tka',
      titleRu: 'Dreame V12 пылесос',
      descriptionUz: 'Simsiz vertikal changyutkich.',
      descriptionRu: 'Беспроводной вертикальный пылесос.',
      categorySlug: 'electronics',
      brand: 'Dreame',
      basePrice: 3200000,
      oldPrice: 3800000,
      isFeatured: true,
      images: ['https://images.unsplash.com/photo-1558317374-067fb5f30001?w=800'],
      variants: [{ price: 3200000, stock: 7 }],
    },
  ];

  for (const p of productData) {
    const categoryId = categoryMap.get(p.categorySlug);
    if (!categoryId) continue;
    const discountPct = p.oldPrice
      ? Math.round(((p.oldPrice - p.basePrice) / p.oldPrice) * 100)
      : null;
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        slug: p.slug,
        titleUz: p.titleUz,
        titleRu: p.titleRu,
        descriptionUz: p.descriptionUz,
        descriptionRu: p.descriptionRu,
        categoryId,
        brand: p.brand,
        basePrice: p.basePrice,
        oldPrice: p.oldPrice ?? null,
        discountPct,
        isFeatured: p.isFeatured ?? false,
        images: {
          create: p.images.map((url, i) => ({ url, position: i })),
        },
        variants: {
          create: p.variants.map((v) => ({
            color: v.color ?? null,
            size: v.size ?? null,
            price: v.price,
            stock: v.stock,
          })),
        },
      },
    });
    console.log(`  • ${product.titleUz}`);
  }
  console.log(`✓ ${productData.length} products created`);

  const promos = [
    {
      code: 'WELCOME10',
      type: PromoType.PERCENT,
      value: 10,
      minOrderAmount: 100000,
      maxDiscount: 100000,
      isPublic: true,
      descriptionUz: 'Birinchi buyurtmaga 10% chegirma',
      descriptionRu: 'Скидка 10% на первый заказ',
    },
    {
      code: 'SAVE50K',
      type: PromoType.FIXED,
      value: 50000,
      minOrderAmount: 300000,
      isPublic: true,
      descriptionUz: '300 000 so\'mdan boshlab 50 000 so\'m chegirma',
      descriptionRu: 'Скидка 50 000 сум от 300 000',
    },
  ];
  for (const promo of promos) {
    await prisma.promoCode.upsert({
      where: { code: promo.code },
      update: {},
      create: promo,
    });
  }
  console.log(`✓ ${promos.length} promo codes created`);

  await prisma.banner.create({
    data: {
      placement: 'home',
      imageUrlUz: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200',
      targetType: 'category',
      targetValue: categoryMap.get('electronics') ?? '',
      position: 1,
      isActive: true,
    },
  });
  await prisma.banner.create({
    data: {
      placement: 'home',
      imageUrlUz: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200',
      targetType: 'category',
      targetValue: categoryMap.get('clothing-women') ?? '',
      position: 2,
      isActive: true,
    },
  });
  console.log('✓ Banners created');

  const phonesId = categoryMap.get('phones');
  const accessoriesId = categoryMap.get('accessories');
  if (phonesId && accessoriesId) {
    await prisma.relatedRule.create({
      data: {
        sourceCategoryId: phonesId,
        targetCategoryId: accessoriesId,
        position: 1,
        isActive: true,
      },
    });
    console.log('✓ Related rules created');
  }

  await prisma.settings.upsert({
    where: { key: 'store' },
    update: {},
    create: {
      key: 'store',
      value: {
        name: 'Marketplace',
        phone: '+998901234567',
        address: 'Toshkent, O\'zbekiston',
        workingHours: '09:00–22:00',
      },
    },
  });

  console.log('\n✅ Seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
