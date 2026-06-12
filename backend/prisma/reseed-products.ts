/**
 * Reseed: supermarket katalogini tiklash.
 *  - 7 ta kategoriya (telefon, aksessuar, ayollar/erkaklar kiyimi, kosmetika, elektronika, uy)
 *  - Har kategoriyada 4 ta sifatli mahsulot (Unsplash rasmlari bilan)
 *  - Eshik kategoriyalari (door-frames-*, door-accessories) avtomatik yashiriladi
 *  - Eski mahsulotlar isActive=false qilinadi (order history saqlanadi)
 *  - Idempotent: slug bo'yicha upsert
 *
 * Run: npm run db:seed:supermarket
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Variant {
  color?: string | null;
  size?: string | null;
  price: number;
  oldPrice?: number | null;
  stock: number;
}

interface Spec {
  labelUz: string;
  labelRu: string;
  valueUz: string;
  valueRu: string;
}

interface ProductSeed {
  slug: string;
  categorySlug: string;
  brand: string;
  titleUz: string;
  titleRu: string;
  descriptionUz: string;
  descriptionRu: string;
  basePrice: number;
  oldPrice?: number;
  isFeatured?: boolean;
  images: string[];
  variants: Variant[];
  specs: Spec[];
}

const UNSPLASH = (id: string) =>
  `https://images.unsplash.com/${id}?w=800&q=80&auto=format&fit=crop`;

const products: ProductSeed[] = [
  // ============== TELEFONLAR ==============
  {
    slug: 'iphone-15-pro-256gb',
    categorySlug: 'phones',
    brand: 'Apple',
    titleUz: 'Apple iPhone 15 Pro 256GB',
    titleRu: 'Apple iPhone 15 Pro 256GB',
    descriptionUz:
      'Yangi A17 Pro chip, titan korpus, 48MP Pro kamera tizimi. ProMotion 120Hz Super Retina XDR ekran. USB-C bilan tezkor zaryadlash.',
    descriptionRu:
      'Новый чип A17 Pro, титановый корпус, камера Pro 48MP. ProMotion 120Hz Super Retina XDR. Быстрая зарядка USB-C.',
    basePrice: 14500000,
    oldPrice: 16000000,
    isFeatured: true,
    images: [
      UNSPLASH('photo-1592286927505-1def25115558'),
      UNSPLASH('photo-1695048133142-1a20484d2569'),
    ],
    variants: [
      { color: 'Titan tabiiy', size: '256GB', price: 14500000, oldPrice: 16000000, stock: 8 },
      { color: 'Titan qora', size: '256GB', price: 14500000, oldPrice: 16000000, stock: 5 },
      { color: 'Titan ko\'k', size: '256GB', price: 14500000, oldPrice: 16000000, stock: 3 },
      { color: 'Titan tabiiy', size: '512GB', price: 16800000, stock: 4 },
    ],
    specs: [
      { labelUz: 'Ekran', labelRu: 'Дисплей', valueUz: '6.1" Super Retina XDR', valueRu: '6.1" Super Retina XDR' },
      { labelUz: 'Protsessor', labelRu: 'Процессор', valueUz: 'A17 Pro', valueRu: 'A17 Pro' },
      { labelUz: 'Kamera', labelRu: 'Камера', valueUz: '48 MP', valueRu: '48 МП' },
      { labelUz: 'Batareya', labelRu: 'Аккумулятор', valueUz: '23 soat video', valueRu: '23 ч видео' },
    ],
  },
  {
    slug: 'samsung-galaxy-s24-ultra',
    categorySlug: 'phones',
    brand: 'Samsung',
    titleUz: 'Samsung Galaxy S24 Ultra 256GB',
    titleRu: 'Samsung Galaxy S24 Ultra 256GB',
    descriptionUz:
      'Galaxy AI funksiyalari, S Pen, 200MP kamera, 6.8" Dynamic AMOLED 2X ekran. Snapdragon 8 Gen 3.',
    descriptionRu:
      'Galaxy AI, S Pen, камера 200 МП, 6.8" Dynamic AMOLED 2X. Snapdragon 8 Gen 3.',
    basePrice: 13800000,
    oldPrice: 15200000,
    isFeatured: true,
    images: [
      UNSPLASH('photo-1610945265064-0e34e5519bbf'),
      UNSPLASH('photo-1582287014914-1db836ad27e6'),
    ],
    variants: [
      { color: 'Titan qora', size: '256GB', price: 13800000, oldPrice: 15200000, stock: 7 },
      { color: 'Titan kumush', size: '256GB', price: 13800000, oldPrice: 15200000, stock: 5 },
      { color: 'Titan binafsha', size: '512GB', price: 15500000, stock: 3 },
    ],
    specs: [
      { labelUz: 'Ekran', labelRu: 'Дисплей', valueUz: '6.8" Dynamic AMOLED 2X', valueRu: '6.8" Dynamic AMOLED 2X' },
      { labelUz: 'Protsessor', labelRu: 'Процессор', valueUz: 'Snapdragon 8 Gen 3', valueRu: 'Snapdragon 8 Gen 3' },
      { labelUz: 'Kamera', labelRu: 'Камера', valueUz: '200 MP + 50 MP + 12 MP + 10 MP', valueRu: '200 МП + 50 МП + 12 МП + 10 МП' },
      { labelUz: 'S Pen', labelRu: 'S Pen', valueUz: 'Bor', valueRu: 'Есть' },
    ],
  },
  {
    slug: 'xiaomi-14-pro',
    categorySlug: 'phones',
    brand: 'Xiaomi',
    titleUz: 'Xiaomi 14 Pro 256GB',
    titleRu: 'Xiaomi 14 Pro 256GB',
    descriptionUz:
      'Leica Summilux optikasi, Snapdragon 8 Gen 3, 120W tezkor zaryadlash, 6.73" AMOLED 120Hz.',
    descriptionRu:
      'Оптика Leica Summilux, Snapdragon 8 Gen 3, быстрая зарядка 120W, 6.73" AMOLED 120Hz.',
    basePrice: 9500000,
    images: [
      UNSPLASH('photo-1611532736597-de2d4265fba3'),
      UNSPLASH('photo-1565849904461-04a58ad377e0'),
    ],
    variants: [
      { color: 'Qora', size: '256GB', price: 9500000, stock: 6 },
      { color: 'Oq', size: '256GB', price: 9500000, stock: 4 },
      { color: 'Yashil', size: '512GB', price: 10800000, stock: 2 },
    ],
    specs: [
      { labelUz: 'Ekran', labelRu: 'Дисплей', valueUz: '6.73" LTPO AMOLED', valueRu: '6.73" LTPO AMOLED' },
      { labelUz: 'Tezkor zaryad', labelRu: 'Быстрая зарядка', valueUz: '120W', valueRu: '120 Вт' },
      { labelUz: 'Kamera', labelRu: 'Камера', valueUz: 'Leica 50 MP × 3', valueRu: 'Leica 50 МП × 3' },
    ],
  },
  {
    slug: 'google-pixel-8-pro',
    categorySlug: 'phones',
    brand: 'Google',
    titleUz: 'Google Pixel 8 Pro 128GB',
    titleRu: 'Google Pixel 8 Pro 128GB',
    descriptionUz:
      'Eng yaxshi kamera mahsuloti — Magic Editor va AI funksiyalari. Tensor G3 chip, 7 yil yangilash.',
    descriptionRu:
      'Лучшая камера — Magic Editor и AI функции. Tensor G3, обновления 7 лет.',
    basePrice: 10500000,
    oldPrice: 11800000,
    images: [
      UNSPLASH('photo-1598327105666-5b89351aff97'),
      UNSPLASH('photo-1592890288564-76628a30a657'),
    ],
    variants: [
      { color: 'Obsidian', size: '128GB', price: 10500000, oldPrice: 11800000, stock: 4 },
      { color: 'Porcelain', size: '128GB', price: 10500000, oldPrice: 11800000, stock: 3 },
      { color: 'Bay', size: '256GB', price: 11500000, stock: 2 },
    ],
    specs: [
      { labelUz: 'Ekran', labelRu: 'Дисплей', valueUz: '6.7" LTPO OLED 120Hz', valueRu: '6.7" LTPO OLED 120Hz' },
      { labelUz: 'AI Camera', labelRu: 'AI Камера', valueUz: 'Magic Editor', valueRu: 'Magic Editor' },
      { labelUz: 'Yangilash', labelRu: 'Обновления', valueUz: '7 yil', valueRu: '7 лет' },
    ],
  },

  // ============== AKSESSUARLAR ==============
  {
    slug: 'iphone-15-silicone-case',
    categorySlug: 'accessories',
    brand: 'Apple',
    titleUz: 'iPhone 15 Silicone Case (MagSafe)',
    titleRu: 'iPhone 15 силиконовый чехол (MagSafe)',
    descriptionUz:
      'Original Apple silikon chexol. MagSafe magnitlar bilan mukammal mos keladi. Yumshoq mikrofibra ichki qatlam.',
    descriptionRu:
      'Оригинальный силиконовый чехол Apple. Идеально подходит к MagSafe. Мягкая внутренняя подкладка.',
    basePrice: 180000,
    oldPrice: 250000,
    isFeatured: true,
    images: [
      UNSPLASH('photo-1601593346740-925612772716'),
      UNSPLASH('photo-1592890288564-76628a30a657'),
    ],
    variants: [
      { color: 'Qora', price: 180000, oldPrice: 250000, stock: 25 },
      { color: 'Ko\'k', price: 180000, oldPrice: 250000, stock: 18 },
      { color: 'Qizil', price: 195000, stock: 12 },
      { color: 'Pushti', price: 180000, oldPrice: 250000, stock: 15 },
      { color: 'Yashil', price: 180000, oldPrice: 250000, stock: 10 },
    ],
    specs: [
      { labelUz: 'Material', labelRu: 'Материал', valueUz: 'Silikon', valueRu: 'Силикон' },
      { labelUz: 'MagSafe', labelRu: 'MagSafe', valueUz: 'Ha', valueRu: 'Да' },
    ],
  },
  {
    slug: 'airpods-pro-case-silicone',
    categorySlug: 'accessories',
    brand: 'Apple',
    titleUz: 'AirPods Pro 2 silikon chexol',
    titleRu: 'Силиконовый чехол AirPods Pro 2',
    descriptionUz:
      'Yumshoq silikondan tayyorlangan, karabin bilan. Tushishlardan va chizilishlardan himoya qiladi.',
    descriptionRu:
      'Мягкий силикон с карабином. Защищает от падений и царапин.',
    basePrice: 95000,
    images: [
      UNSPLASH('photo-1572569511254-d8f925fe2cbb'),
      UNSPLASH('photo-1606220588913-b3aacb4d2f46'),
    ],
    variants: [
      { color: 'Qora', price: 95000, stock: 30 },
      { color: 'Oq', price: 95000, stock: 25 },
      { color: 'Ko\'k', price: 95000, stock: 20 },
      { color: 'Yashil', price: 95000, stock: 15 },
    ],
    specs: [
      { labelUz: 'Material', labelRu: 'Материал', valueUz: 'Silikon', valueRu: 'Силикон' },
      { labelUz: 'Karabin', labelRu: 'Карабин', valueUz: 'Bor', valueRu: 'Есть' },
    ],
  },
  {
    slug: 'magsafe-wireless-charger',
    categorySlug: 'accessories',
    brand: 'Apple',
    titleUz: 'MagSafe simsiz zaryadlovchi',
    titleRu: 'Беспроводная зарядка MagSafe',
    descriptionUz:
      'Tezkor magnitli simsiz zaryadlovchi. 15W gacha quvvat. iPhone 12 va undan keyingi modellar bilan.',
    descriptionRu:
      'Быстрая магнитная беспроводная зарядка. До 15 Вт. Для iPhone 12 и новее.',
    basePrice: 290000,
    oldPrice: 350000,
    images: [
      UNSPLASH('photo-1606220588913-b3aacb4d2f46'),
      UNSPLASH('photo-1583394838336-acd977736f90'),
    ],
    variants: [{ price: 290000, oldPrice: 350000, stock: 18 }],
    specs: [
      { labelUz: 'Quvvat', labelRu: 'Мощность', valueUz: '15W', valueRu: '15 Вт' },
      { labelUz: 'Kabel', labelRu: 'Кабель', valueUz: '1m USB-C', valueRu: '1 м USB-C' },
    ],
  },
  {
    slug: 'phone-popsocket',
    categorySlug: 'accessories',
    brand: 'PopSockets',
    titleUz: 'PopSocket ushlagich',
    titleRu: 'PopSocket держатель',
    descriptionUz:
      'Telefon orqasiga yopishtiriladigan ushlagich. Selfi olish va video tomosha qilish uchun qulay.',
    descriptionRu:
      'Держатель для смартфона. Удобно для селфи и просмотра видео.',
    basePrice: 65000,
    images: [
      UNSPLASH('photo-1551816230-ef5deaed4a26'),
      UNSPLASH('photo-1556656793-08538906a9f8'),
    ],
    variants: [
      { color: 'Qora', price: 65000, stock: 40 },
      { color: 'Oq', price: 65000, stock: 35 },
      { color: 'Bayroqsimon', price: 75000, stock: 20 },
    ],
    specs: [
      { labelUz: 'Material', labelRu: 'Материал', valueUz: 'Plastik', valueRu: 'Пластик' },
    ],
  },

  // ============== AYOLLAR KIYIMI ==============
  {
    slug: 'cream-midi-skirt-zara',
    categorySlug: 'clothing-women',
    brand: 'Zara',
    titleUz: 'Krem rangli midi yubka',
    titleRu: 'Кремовая миди-юбка',
    descriptionUz:
      'Yumshoq mato, qulay kesim. Kunduzgi va kechki uchun mos. Yuqori bel.',
    descriptionRu:
      'Мягкая ткань, удобный крой. Подходит для дня и вечера. Высокая талия.',
    basePrice: 320000,
    oldPrice: 400000,
    isFeatured: true,
    images: [
      UNSPLASH('photo-1583496661160-fb5886a13d44'),
      UNSPLASH('photo-1551163943-3f6a855d1153'),
    ],
    variants: [
      { color: 'Krem', size: 'S', price: 320000, oldPrice: 400000, stock: 8 },
      { color: 'Krem', size: 'M', price: 320000, oldPrice: 400000, stock: 12 },
      { color: 'Krem', size: 'L', price: 320000, oldPrice: 400000, stock: 6 },
    ],
    specs: [
      { labelUz: 'Material', labelRu: 'Материал', valueUz: 'Paxta 65%, Polyester 35%', valueRu: 'Хлопок 65%, Полиэстер 35%' },
      { labelUz: 'Uzunlik', labelRu: 'Длина', valueUz: 'Midi', valueRu: 'Миди' },
    ],
  },
  {
    slug: 'blue-striped-shirt-mango',
    categorySlug: 'clothing-women',
    brand: 'Mango',
    titleUz: 'Ko\'k chiziqli ayollar ko\'ylagi',
    titleRu: 'Голубая полосатая женская рубашка',
    descriptionUz:
      'Yengil paxta mato, ofis va kunlik kiyim uchun. Kavida tugmalar.',
    descriptionRu:
      'Лёгкая хлопковая ткань, для офиса и повседневности. Перламутровые пуговицы.',
    basePrice: 150000,
    oldPrice: 250000,
    isFeatured: true,
    images: [
      UNSPLASH('photo-1604176354204-9268737828e4'),
      UNSPLASH('photo-1551048632-24e444b48a3e'),
    ],
    variants: [
      { color: 'Ko\'k', size: 'S', price: 150000, oldPrice: 250000, stock: 10 },
      { color: 'Ko\'k', size: 'M', price: 150000, oldPrice: 250000, stock: 14 },
      { color: 'Ko\'k', size: 'L', price: 150000, oldPrice: 250000, stock: 8 },
    ],
    specs: [
      { labelUz: 'Material', labelRu: 'Материал', valueUz: '100% paxta', valueRu: '100% хлопок' },
    ],
  },
  {
    slug: 'classic-black-dress',
    categorySlug: 'clothing-women',
    brand: 'Massimo Dutti',
    titleUz: 'Klassik qora ko\'ylak',
    titleRu: 'Классическое чёрное платье',
    descriptionUz:
      'Universal kechki ko\'ylak. A-line silueti, kichkina qora ko\'ylak (LBD).',
    descriptionRu:
      'Универсальное вечернее платье. A-силуэт, маленькое чёрное платье (LBD).',
    basePrice: 480000,
    images: [
      UNSPLASH('photo-1539109136881-3be0616acf4b'),
      UNSPLASH('photo-1572804013309-59a88b7e92f1'),
    ],
    variants: [
      { color: 'Qora', size: 'S', price: 480000, stock: 5 },
      { color: 'Qora', size: 'M', price: 480000, stock: 8 },
      { color: 'Qora', size: 'L', price: 480000, stock: 4 },
    ],
    specs: [
      { labelUz: 'Mato', labelRu: 'Ткань', valueUz: 'Krep', valueRu: 'Креп' },
      { labelUz: 'Stil', labelRu: 'Стиль', valueUz: 'Klassik', valueRu: 'Классика' },
    ],
  },
  {
    slug: 'beige-trench-coat',
    categorySlug: 'clothing-women',
    brand: 'Burberry',
    titleUz: 'Bej trench palto',
    titleRu: 'Бежевый тренчкот',
    descriptionUz:
      'Klassik trench palto, bel kamar bilan. Yomg\'ir va shamoldan himoya. Iqtibos: yuqori sifatli paxta gabardin.',
    descriptionRu:
      'Классический тренч с поясом. Защита от дождя и ветра. Хлопковый габардин премиум-качества.',
    basePrice: 980000,
    oldPrice: 1200000,
    images: [
      UNSPLASH('photo-1591047139829-d91aecb6caea'),
      UNSPLASH('photo-1551488831-00ddcb6c6bd3'),
    ],
    variants: [
      { color: 'Bej', size: 'M', price: 980000, oldPrice: 1200000, stock: 4 },
      { color: 'Bej', size: 'L', price: 980000, oldPrice: 1200000, stock: 3 },
      { color: 'Qora', size: 'M', price: 1050000, stock: 2 },
    ],
    specs: [
      { labelUz: 'Material', labelRu: 'Материал', valueUz: 'Paxta gabardin', valueRu: 'Хлопковый габардин' },
      { labelUz: 'Mavsum', labelRu: 'Сезон', valueUz: 'Bahor/Kuz', valueRu: 'Весна/Осень' },
    ],
  },

  // ============== ERKAKLAR KIYIMI ==============
  {
    slug: 'mens-classic-watch-casio',
    categorySlug: 'clothing-men',
    brand: 'Casio',
    titleUz: 'Erkaklar uchun klassik soat',
    titleRu: 'Мужские классические часы',
    descriptionUz:
      'Charm tasma, mexanik mexanizm. Suvga chidamli. Sovg\'aga ham mos.',
    descriptionRu:
      'Кожаный ремешок, механизм. Водостойкие. Отличный подарок.',
    basePrice: 450000,
    images: [
      UNSPLASH('photo-1524805444758-089113d48a6d'),
      UNSPLASH('photo-1547996160-81dfa63595aa'),
    ],
    variants: [
      { color: 'Qora', price: 450000, stock: 12 },
      { color: 'Jigarrang', price: 450000, stock: 8 },
    ],
    specs: [
      { labelUz: 'Mexanizm', labelRu: 'Механизм', valueUz: 'Kvarts', valueRu: 'Кварц' },
      { labelUz: 'Suv', labelRu: 'Водозащита', valueUz: '50m', valueRu: '50 м' },
      { labelUz: 'Tasma', labelRu: 'Ремешок', valueUz: 'Charm', valueRu: 'Кожа' },
    ],
  },
  {
    slug: 'mens-classic-suit',
    categorySlug: 'clothing-men',
    brand: 'Hugo Boss',
    titleUz: 'Klassik erkaklar kostyumi',
    titleRu: 'Классический мужской костюм',
    descriptionUz:
      'Slim fit kostyum, pidjak va shim. Rasmiy tadbirlar uchun. Yuqori sifatli mato.',
    descriptionRu:
      'Slim fit, пиджак и брюки. Для официальных мероприятий. Премиум ткань.',
    basePrice: 1850000,
    oldPrice: 2200000,
    isFeatured: true,
    images: [
      UNSPLASH('photo-1594938298603-c8148c4dae35'),
      UNSPLASH('photo-1490578474895-699cd4e2cf59'),
    ],
    variants: [
      { color: 'Qora', size: '48', price: 1850000, oldPrice: 2200000, stock: 3 },
      { color: 'Qora', size: '50', price: 1850000, oldPrice: 2200000, stock: 5 },
      { color: 'Qora', size: '52', price: 1850000, oldPrice: 2200000, stock: 4 },
      { color: 'Ko\'k navy', size: '50', price: 1950000, stock: 2 },
    ],
    specs: [
      { labelUz: 'Mato', labelRu: 'Ткань', valueUz: 'Jun aralashma', valueRu: 'Шерстяная смесь' },
      { labelUz: 'Fit', labelRu: 'Силуэт', valueUz: 'Slim Fit', valueRu: 'Slim Fit' },
    ],
  },
  {
    slug: 'white-cotton-shirt',
    categorySlug: 'clothing-men',
    brand: 'Massimo Dutti',
    titleUz: 'Oq paxta ko\'ylak',
    titleRu: 'Белая хлопковая рубашка',
    descriptionUz:
      'Klassik kesim, premium paxta mato. Kunlik va ofis uchun mos.',
    descriptionRu:
      'Классический крой, премиальный хлопок. Для повседневности и офиса.',
    basePrice: 280000,
    images: [
      UNSPLASH('photo-1602810318383-e386cc2a3ccf'),
      UNSPLASH('photo-1607345366928-199ea26cfe3e'),
    ],
    variants: [
      { color: 'Oq', size: 'M', price: 280000, stock: 15 },
      { color: 'Oq', size: 'L', price: 280000, stock: 18 },
      { color: 'Oq', size: 'XL', price: 280000, stock: 10 },
      { color: 'Ko\'k', size: 'L', price: 290000, stock: 8 },
    ],
    specs: [
      { labelUz: 'Material', labelRu: 'Материал', valueUz: '100% paxta', valueRu: '100% хлопок' },
    ],
  },
  {
    slug: 'slim-fit-jeans',
    categorySlug: 'clothing-men',
    brand: 'Levi\'s',
    titleUz: 'Slim fit jinsi shim 511',
    titleRu: 'Джинсы Slim fit 511',
    descriptionUz:
      'Levi\'s 511 Slim fit kesim. Klassik 5 cho\'ntakli dizayn. Streych mato.',
    descriptionRu:
      'Levi\'s 511 Slim fit. Классический крой с 5 карманами. Стрейчевая ткань.',
    basePrice: 350000,
    oldPrice: 450000,
    images: [
      UNSPLASH('photo-1542272604-787c3835535d'),
      UNSPLASH('photo-1604176354204-9268737828e4'),
    ],
    variants: [
      { color: 'Ko\'k', size: '30', price: 350000, oldPrice: 450000, stock: 8 },
      { color: 'Ko\'k', size: '32', price: 350000, oldPrice: 450000, stock: 12 },
      { color: 'Ko\'k', size: '34', price: 350000, oldPrice: 450000, stock: 9 },
      { color: 'Qora', size: '32', price: 380000, stock: 6 },
    ],
    specs: [
      { labelUz: 'Mato', labelRu: 'Ткань', valueUz: 'Paxta 98% + Elastan 2%', valueRu: 'Хлопок 98% + Эластан 2%' },
      { labelUz: 'Kesim', labelRu: 'Крой', valueUz: 'Slim', valueRu: 'Slim' },
    ],
  },

  // ============== KOSMETIKA ==============
  {
    slug: 'maybelline-superstay-matte',
    categorySlug: 'cosmetics',
    brand: 'Maybelline',
    titleUz: 'Maybelline SuperStay Matte Ink pomada',
    titleRu: 'Помада Maybelline SuperStay Matte Ink',
    descriptionUz:
      'Uzoq turuvchi matte formula. 16 soatgacha o\'chmaydi. Lablar uchun yumshoq.',
    descriptionRu:
      'Стойкая матовая формула. Держится до 16 часов. Не сушит губы.',
    basePrice: 95000,
    oldPrice: 120000,
    isFeatured: true,
    images: [
      UNSPLASH('photo-1586495777744-4413f21062fa'),
      UNSPLASH('photo-1631214540242-44c8e21d1f96'),
    ],
    variants: [
      { color: 'Lover (qizg\'ish)', price: 95000, oldPrice: 120000, stock: 25 },
      { color: 'Pioneer (qizil)', price: 95000, oldPrice: 120000, stock: 22 },
      { color: 'Heroine (pushti)', price: 95000, oldPrice: 120000, stock: 18 },
      { color: 'Voyager (qoramtir)', price: 95000, stock: 15 },
    ],
    specs: [
      { labelUz: 'Tip', labelRu: 'Тип', valueUz: 'Suyuq matte', valueRu: 'Жидкая матовая' },
      { labelUz: 'Davomiyligi', labelRu: 'Стойкость', valueUz: '16 soat', valueRu: '16 часов' },
    ],
  },
  {
    slug: 'chanel-coco-mademoiselle',
    categorySlug: 'cosmetics',
    brand: 'Chanel',
    titleUz: 'Chanel Coco Mademoiselle ayollar atri 50ml',
    titleRu: 'Chanel Coco Mademoiselle 50ml',
    descriptionUz:
      'Mashhur Chanel atri. Sandalovaye, vetiver va pachuli notalari. Original Fransiyadan.',
    descriptionRu:
      'Легендарный аромат Chanel. Сандал, ветивер и пачули. Оригинал из Франции.',
    basePrice: 1450000,
    isFeatured: true,
    images: [
      UNSPLASH('photo-1541643600914-78b084683601'),
      UNSPLASH('photo-1592945403244-b3fbafd7f539'),
    ],
    variants: [{ size: '50ml', price: 1450000, stock: 8 }, { size: '100ml', price: 2100000, stock: 4 }],
    specs: [
      { labelUz: 'Tip', labelRu: 'Тип', valueUz: 'Eau de Parfum', valueRu: 'Парфюмерная вода' },
      { labelUz: 'Asosiy nota', labelRu: 'Основная нота', valueUz: 'Sandal, pachuli', valueRu: 'Сандал, пачули' },
    ],
  },
  {
    slug: 'estee-lauder-double-wear',
    categorySlug: 'cosmetics',
    brand: 'Estée Lauder',
    titleUz: 'Estée Lauder Double Wear tonal asos',
    titleRu: 'Estée Lauder Double Wear тональный крем',
    descriptionUz:
      '24 soat turuvchi yuqori qoplama. Yog\'liq teri uchun mos. SPF 10.',
    descriptionRu:
      'Стойкое покрытие на 24 часа. Подходит для жирной кожи. SPF 10.',
    basePrice: 580000,
    images: [
      UNSPLASH('photo-1596462502278-27bfdc403348'),
      UNSPLASH('photo-1599735734574-50ed0d5e3aaf'),
    ],
    variants: [
      { color: '1N1 Ivory Nude', price: 580000, stock: 8 },
      { color: '2C2 Pale Almond', price: 580000, stock: 10 },
      { color: '3W1 Tawny', price: 580000, stock: 6 },
    ],
    specs: [
      { labelUz: 'Hajm', labelRu: 'Объем', valueUz: '30ml', valueRu: '30 мл' },
      { labelUz: 'SPF', labelRu: 'SPF', valueUz: '10', valueRu: '10' },
    ],
  },
  {
    slug: 'maybelline-lash-sensational',
    categorySlug: 'cosmetics',
    brand: 'Maybelline',
    titleUz: 'Maybelline Lash Sensational tushi',
    titleRu: 'Тушь Maybelline Lash Sensational',
    descriptionUz:
      '10 qatorli yelpig\'ich shchyotka. Hajm va uzunlik beradi. Suvga chidamli versiya ham bor.',
    descriptionRu:
      'Веерная щёточка с 10 рядами. Объём и длина. Есть водостойкая версия.',
    basePrice: 145000,
    images: [
      UNSPLASH('photo-1631214524020-7e18db9a8f92'),
      UNSPLASH('photo-1596704017254-9b121068fb31'),
    ],
    variants: [
      { color: 'Qora', price: 145000, stock: 30 },
      { color: 'Qora (suvga chidamli)', price: 165000, stock: 20 },
    ],
    specs: [
      { labelUz: 'Effekt', labelRu: 'Эффект', valueUz: 'Hajm + uzunlik', valueRu: 'Объём + длина' },
    ],
  },

  // ============== ELEKTRONIKA ==============
  {
    slug: 'apple-airpods-pro-2',
    categorySlug: 'electronics',
    brand: 'Apple',
    titleUz: 'Apple AirPods Pro 2 (USB-C)',
    titleRu: 'Apple AirPods Pro 2 (USB-C)',
    descriptionUz:
      'Active Noise Cancellation, Adaptive Audio, Spatial Audio. MagSafe charging case. H2 chip.',
    descriptionRu:
      'Активное шумоподавление, Adaptive Audio, Spatial Audio. MagSafe футляр. Чип H2.',
    basePrice: 2890000,
    isFeatured: true,
    images: [
      UNSPLASH('photo-1606220588913-b3aacb4d2f46'),
      UNSPLASH('photo-1572569511254-d8f925fe2cbb'),
    ],
    variants: [{ color: 'Oq', price: 2890000, stock: 15 }],
    specs: [
      { labelUz: 'Chip', labelRu: 'Чип', valueUz: 'Apple H2', valueRu: 'Apple H2' },
      { labelUz: 'Batareya', labelRu: 'Батарея', valueUz: '30 soat (case bilan)', valueRu: '30 ч (с футляром)' },
      { labelUz: 'ANC', labelRu: 'ANC', valueUz: 'Bor', valueRu: 'Есть' },
    ],
  },
  {
    slug: 'apple-watch-series-9',
    categorySlug: 'electronics',
    brand: 'Apple',
    titleUz: 'Apple Watch Series 9 GPS 45mm',
    titleRu: 'Apple Watch Series 9 GPS 45mm',
    descriptionUz:
      'Double Tap, S9 chip, brighter display, ECG va Blood Oxygen sensorlari.',
    descriptionRu:
      'Double Tap, чип S9, ярче дисплей, датчики ECG и SpO2.',
    basePrice: 4250000,
    oldPrice: 4800000,
    images: [
      UNSPLASH('photo-1546435770-a3e426bf472b'),
      UNSPLASH('photo-1551816230-ef5deaed4a26'),
    ],
    variants: [
      { color: 'Midnight', size: '41mm', price: 4250000, oldPrice: 4800000, stock: 5 },
      { color: 'Midnight', size: '45mm', price: 4450000, oldPrice: 5000000, stock: 7 },
      { color: 'Starlight', size: '45mm', price: 4450000, stock: 4 },
      { color: '(PRODUCT)RED', size: '45mm', price: 4450000, stock: 3 },
    ],
    specs: [
      { labelUz: 'Chip', labelRu: 'Чип', valueUz: 'S9 SiP', valueRu: 'S9 SiP' },
      { labelUz: 'Display', labelRu: 'Экран', valueUz: 'Retina LTPO OLED', valueRu: 'Retina LTPO OLED' },
      { labelUz: 'Suvga chidamli', labelRu: 'Водозащита', valueUz: '50m', valueRu: '50 м' },
    ],
  },
  {
    slug: 'macbook-air-m3-13',
    categorySlug: 'electronics',
    brand: 'Apple',
    titleUz: 'MacBook Air 13" M3 256GB',
    titleRu: 'MacBook Air 13" M3 256GB',
    descriptionUz:
      'Apple M3 chip, 8GB RAM, Liquid Retina display. 18 soat batareya. Yengil va ingichka.',
    descriptionRu:
      'Чип Apple M3, 8 ГБ RAM, Liquid Retina. 18 часов работы. Тонкий и лёгкий.',
    basePrice: 14800000,
    images: [
      UNSPLASH('photo-1517336714731-489689fd1ca8'),
      UNSPLASH('photo-1496181133206-80ce9b88a853'),
    ],
    variants: [
      { color: 'Midnight', size: '256GB', price: 14800000, stock: 4 },
      { color: 'Midnight', size: '512GB', price: 16800000, stock: 3 },
      { color: 'Silver', size: '256GB', price: 14800000, stock: 5 },
      { color: 'Starlight', size: '512GB', price: 16800000, stock: 2 },
    ],
    specs: [
      { labelUz: 'Chip', labelRu: 'Чип', valueUz: 'Apple M3 8-core', valueRu: 'Apple M3 8-core' },
      { labelUz: 'RAM', labelRu: 'RAM', valueUz: '8GB', valueRu: '8 ГБ' },
      { labelUz: 'Batareya', labelRu: 'Батарея', valueUz: '18 soat', valueRu: '18 ч' },
    ],
  },
  {
    slug: 'sony-wh-1000xm5',
    categorySlug: 'electronics',
    brand: 'Sony',
    titleUz: 'Sony WH-1000XM5 simsiz quloqchin',
    titleRu: 'Sony WH-1000XM5 беспроводные наушники',
    descriptionUz:
      'Industriya yetakchisi shovqin susaytirish. 30 soat batareya. Hi-Res Audio sertifikati.',
    descriptionRu:
      'Лидирующее шумоподавление. 30 часов работы. Hi-Res Audio.',
    basePrice: 3950000,
    oldPrice: 4400000,
    isFeatured: true,
    images: [
      UNSPLASH('photo-1505740420928-5e560c06d30e'),
      UNSPLASH('photo-1583394838336-acd977736f90'),
    ],
    variants: [
      { color: 'Qora', price: 3950000, oldPrice: 4400000, stock: 6 },
      { color: 'Kumush', price: 3950000, oldPrice: 4400000, stock: 4 },
    ],
    specs: [
      { labelUz: 'ANC', labelRu: 'ANC', valueUz: 'Industriya yetakchisi', valueRu: 'Лидер индустрии' },
      { labelUz: 'Batareya', labelRu: 'Батарея', valueUz: '30 soat', valueRu: '30 ч' },
      { labelUz: 'Bluetooth', labelRu: 'Bluetooth', valueUz: '5.2', valueRu: '5.2' },
    ],
  },

  // ============== UY UCHUN ==============
  {
    slug: 'dreame-v12-cordless-vacuum',
    categorySlug: 'home',
    brand: 'Dreame',
    titleUz: 'Dreame V12 simsiz changyutkich',
    titleRu: 'Dreame V12 беспроводной пылесос',
    descriptionUz:
      'Simsiz vertikal changyutkich. 185 AW so\'rg\'ich kuchi, 90 daqiqa ishlash, LED ekran.',
    descriptionRu:
      'Беспроводной вертикальный пылесос. 185 AW мощность, 90 мин работы, LED дисплей.',
    basePrice: 3200000,
    oldPrice: 3800000,
    isFeatured: true,
    images: [
      UNSPLASH('photo-1558317374-067fb5f30001'),
      UNSPLASH('photo-1581578731548-c64695cc6952'),
    ],
    variants: [{ price: 3200000, oldPrice: 3800000, stock: 7 }],
    specs: [
      { labelUz: 'So\'rg\'ich kuchi', labelRu: 'Мощность', valueUz: '185 AW', valueRu: '185 AW' },
      { labelUz: 'Batareya', labelRu: 'Батарея', valueUz: '90 daqiqa', valueRu: '90 мин' },
      { labelUz: 'HEPA filtr', labelRu: 'HEPA фильтр', valueUz: 'Bor', valueRu: 'Есть' },
    ],
  },
  {
    slug: 'tramontina-knife-set',
    categorySlug: 'home',
    brand: 'Tramontina',
    titleUz: 'Tramontina oshxona pichoqlari to\'plami',
    titleRu: 'Набор кухонных ножей Tramontina',
    descriptionUz:
      '5 ta pichoq + magnitli stenddan iborat. Brazil zanglamas po\'lat. Original.',
    descriptionRu:
      '5 ножей и магнитная подставка. Бразильская нержавеющая сталь. Оригинал.',
    basePrice: 380000,
    oldPrice: 480000,
    images: [
      UNSPLASH('photo-1593618998160-e34014e67546'),
      UNSPLASH('photo-1591814468924-caf88d1232e1'),
    ],
    variants: [{ price: 380000, oldPrice: 480000, stock: 9 }],
    specs: [
      { labelUz: 'Pichoqlar', labelRu: 'Ножей', valueUz: '5 ta', valueRu: '5 шт' },
      { labelUz: 'Material', labelRu: 'Материал', valueUz: 'Zanglamas po\'lat', valueRu: 'Нержавеющая сталь' },
    ],
  },
  {
    slug: 'smeg-retro-kettle',
    categorySlug: 'home',
    brand: 'Smeg',
    titleUz: 'Smeg KLF03 retro elektr choynak',
    titleRu: 'Электрочайник Smeg KLF03 в ретро-стиле',
    descriptionUz:
      'Italyan retro dizayn. 1.7L hajm, 2400W quvvat. 4 ta haroratga moslash.',
    descriptionRu:
      'Итальянский ретро-дизайн. Объём 1.7 л, мощность 2400 Вт. 4 настройки температуры.',
    basePrice: 750000,
    images: [
      UNSPLASH('photo-1517668808822-9ebb02f2a0e6'),
      UNSPLASH('photo-1556909114-f6e7ad7d3136'),
    ],
    variants: [
      { color: 'Pastel ko\'k', price: 750000, stock: 5 },
      { color: 'Qizil', price: 750000, stock: 4 },
      { color: 'Krem', price: 750000, stock: 6 },
      { color: 'Qora', price: 780000, stock: 3 },
    ],
    specs: [
      { labelUz: 'Hajm', labelRu: 'Объем', valueUz: '1.7L', valueRu: '1.7 л' },
      { labelUz: 'Quvvat', labelRu: 'Мощность', valueUz: '2400W', valueRu: '2400 Вт' },
    ],
  },
  {
    slug: 'monstera-plant',
    categorySlug: 'home',
    brand: 'Plant Studio',
    titleUz: 'Monstera Deliciosa o\'simligi',
    titleRu: 'Растение Монстера Делициоза',
    descriptionUz:
      'Mashhur ichki o\'simlik. Yashilroq xona, toza havo. O\'rta nurli joylar uchun.',
    descriptionRu:
      'Популярное комнатное растение. Зелень в доме, чистый воздух. Для умеренного освещения.',
    basePrice: 250000,
    images: [
      UNSPLASH('photo-1556909114-f6e7ad7d3136'),
      UNSPLASH('photo-1485955900006-10f4d324d411'),
    ],
    variants: [
      { color: 'Kichik (30cm)', price: 250000, stock: 8 },
      { color: 'O\'rta (60cm)', price: 450000, stock: 5 },
      { color: 'Katta (100cm)', price: 750000, stock: 3 },
    ],
    specs: [
      { labelUz: 'Yorug\'lik', labelRu: 'Освещение', valueUz: 'O\'rta', valueRu: 'Умеренное' },
      { labelUz: 'Sug\'orish', labelRu: 'Полив', valueUz: 'Haftada 1-2', valueRu: '1-2 раза в неделю' },
    ],
  },
];

const SUPERMARKET_CATEGORIES: Array<{
  slug: string;
  titleUz: string;
  titleRu: string;
  position: number;
}> = [
  { slug: 'phones', titleUz: 'Telefonlar', titleRu: 'Телефоны', position: 1 },
  { slug: 'accessories', titleUz: 'Aksessuarlar', titleRu: 'Аксессуары', position: 2 },
  { slug: 'clothing-women', titleUz: 'Ayollar kiyimi', titleRu: 'Женская мода', position: 3 },
  { slug: 'clothing-men', titleUz: 'Erkaklar kiyimi', titleRu: 'Мужская мода', position: 4 },
  { slug: 'cosmetics', titleUz: 'Kosmetika', titleRu: 'Косметика', position: 5 },
  { slug: 'electronics', titleUz: 'Elektronika', titleRu: 'Электроника', position: 6 },
  { slug: 'home', titleUz: 'Uy uchun', titleRu: 'Для дома', position: 7 },
];

async function main() {
  console.log('=== Reseed boshlandi (supermarket rejimi) ===');

  // 0. Supermarket kategoriyalarini upsert qilamiz va ko'rinadigan qilamiz
  const supermarketSlugs = new Set(SUPERMARKET_CATEGORIES.map((c) => c.slug));
  for (const c of SUPERMARKET_CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { titleUz: c.titleUz, titleRu: c.titleRu, position: c.position, isVisible: true },
      create: { slug: c.slug, titleUz: c.titleUz, titleRu: c.titleRu, position: c.position, isVisible: true },
    });
  }
  console.log(`✓ ${SUPERMARKET_CATEGORIES.length} ta supermarket kategoriyasi tayyor`);

  // 0.1. Boshqa hamma kategoriyalarni (jumladan eshiklar) yashiramiz
  const hidden = await prisma.category.updateMany({
    where: { slug: { notIn: [...supermarketSlugs] }, isVisible: true },
    data: { isVisible: false },
  });
  if (hidden.count > 0) {
    console.log(`✓ ${hidden.count} ta eski kategoriya yashirildi (eshiklar va boshqalar)`);
  }

  // 0.2. Yashirilgan kategoriyalardagi barcha mahsulotlarni ham deaktivlashtirish
  const hiddenCategoryIds = (
    await prisma.category.findMany({
      where: { slug: { notIn: [...supermarketSlugs] } },
      select: { id: true },
    })
  ).map((c) => c.id);
  if (hiddenCategoryIds.length > 0) {
    const offCount = await prisma.product.updateMany({
      where: { categoryId: { in: hiddenCategoryIds }, isActive: true },
      data: { isActive: false },
    });
    if (offCount.count > 0) {
      console.log(`✓ ${offCount.count} ta eshik/eski mahsulot deaktivlashtirildi`);
    }
  }

  // 1. Yangi slug ro'yxatida bo'lmagan eski mahsulotlarni ham deaktivlashtiramiz
  //    (order history saqlanadi — faqat isActive=false)
  const existingProducts = await prisma.product.findMany({ select: { slug: true } });
  const newSlugs = new Set(products.map((p) => p.slug));
  const toDeactivate = existingProducts.filter((p) => !newSlugs.has(p.slug));

  if (toDeactivate.length > 0) {
    await prisma.product.updateMany({
      where: { slug: { in: toDeactivate.map((p) => p.slug) } },
      data: { isActive: false },
    });
    console.log(`✓ ${toDeactivate.length} ta eski mahsulot deaktivlashtirildi`);
  }

  // 2. Kategoriya'larni topish
  const categories = await prisma.category.findMany();
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c.id]));

  // 3. Har bir mahsulotni upsert qilamiz
  for (const p of products) {
    const categoryId = categoryBySlug.get(p.categorySlug);
    if (!categoryId) {
      console.warn(`⚠️  Category not found: ${p.categorySlug} — ${p.titleUz}`);
      continue;
    }

    const discountPct = p.oldPrice
      ? Math.round(((p.oldPrice - p.basePrice) / p.oldPrice) * 100)
      : null;

    // Avval mavjudligini tekshiramiz
    const existing = await prisma.product.findUnique({ where: { slug: p.slug } });

    if (existing) {
      // Update — eski variants/images/specs o'chirib qaytadan yaratamiz
      await prisma.productImage.deleteMany({ where: { productId: existing.id } });
      await prisma.productVariant.deleteMany({ where: { productId: existing.id } });
      await prisma.productSpec.deleteMany({ where: { productId: existing.id } });

      await prisma.product.update({
        where: { id: existing.id },
        data: {
          titleUz: p.titleUz,
          titleRu: p.titleRu,
          descriptionUz: p.descriptionUz,
          descriptionRu: p.descriptionRu,
          categoryId,
          brand: p.brand,
          basePrice: p.basePrice,
          oldPrice: p.oldPrice ?? null,
          discountPct,
          isActive: true,
          isFeatured: p.isFeatured ?? false,
          images: {
            create: p.images.map((url, i) => ({ url, position: i })),
          },
          variants: {
            create: p.variants.map((v) => ({
              color: v.color ?? null,
              size: v.size ?? null,
              price: v.price,
              oldPrice: v.oldPrice ?? null,
              stock: v.stock,
              isActive: true,
            })),
          },
          specs: {
            create: p.specs.map((s, i) => ({
              labelUz: s.labelUz,
              labelRu: s.labelRu,
              valueUz: s.valueUz,
              valueRu: s.valueRu,
              position: i,
            })),
          },
        },
      });
      console.log(`  ↻ ${p.titleUz}`);
    } else {
      // Create
      await prisma.product.create({
        data: {
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
          isActive: true,
          isFeatured: p.isFeatured ?? false,
          images: {
            create: p.images.map((url, i) => ({ url, position: i })),
          },
          variants: {
            create: p.variants.map((v) => ({
              color: v.color ?? null,
              size: v.size ?? null,
              price: v.price,
              oldPrice: v.oldPrice ?? null,
              stock: v.stock,
              isActive: true,
            })),
          },
          specs: {
            create: p.specs.map((s, i) => ({
              labelUz: s.labelUz,
              labelRu: s.labelRu,
              valueUz: s.valueUz,
              valueRu: s.valueRu,
              position: i,
            })),
          },
        },
      });
      console.log(`  + ${p.titleUz}`);
    }
  }

  // 4. Stats
  const stats = await prisma.product.groupBy({
    by: ['categoryId'],
    where: { isActive: true },
    _count: true,
  });
  console.log('\n=== Yangi mahsulotlar bo\'yicha kategoriyalar ===');
  for (const s of stats) {
    const cat = categories.find((c) => c.id === s.categoryId);
    console.log(`  ${cat?.titleUz}: ${s._count} ta`);
  }

  console.log('\n✅ Reseed tugadi');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
