/**
 * Reseed: HAQIQIY supermarket katalogi (Korzinka / Makro / Havas uslubida).
 *
 * Bu skript:
 *  1. 8 ta haqiqiy supermarket bo'limini upsert qiladi va `isVisible=true` qiladi
 *  2. Ro'yxatda yo'q boshqa kategoriyalarni (eshik / telefon / kiyim va h.k.) yashiradi
 *  3. Yashirilgan bo'limlardagi mahsulotlarni `isActive=false` qiladi
 *     (order history saqlanadi — fizik o'chirilmaydi)
 *  4. Har bo'limga 5-8 ta haqiqiy mahsulot yuklaydi (Coca-Cola, Imkon sut, va h.k.)
 *  5. Slug bo'yicha upsert qiladi — bir necha marta xavfsiz ishga tushiriladi
 *
 * RASMLAR HAQIDA:
 *  Tasdiqlangan Unsplash CDN URL'lari ishlatildi (har biri WebFetch bilan tekshirilgan).
 *  Bu boshlang'ich seed — REKLAMA OLDIDAN admin paneldan haqiqiy do'kondagi
 *  mahsulotlarni suratga olib YANGI rasmlar bilan almashtirib chiqing.
 *  Admin panel: Mahsulotlar → mahsulotni tanlang → "Rasm yuklash"
 *
 * Run: npm run db:seed:supermarket
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============== KATEGORIYALAR ==============
const SUPERMARKET_CATEGORIES: Array<{
  slug: string;
  titleUz: string;
  titleRu: string;
  position: number;
}> = [
  { slug: 'oziq-ovqat', titleUz: 'Oziq-ovqat', titleRu: 'Бакалея', position: 1 },
  { slug: 'sut-mahsulotlari', titleUz: 'Sut mahsulotlari', titleRu: 'Молочные продукты', position: 2 },
  { slug: 'ichimliklar', titleUz: 'Ichimliklar', titleRu: 'Напитки', position: 3 },
  { slug: 'sabzavot-mevalar', titleUz: 'Sabzavot va mevalar', titleRu: 'Овощи и фрукты', position: 4 },
  { slug: 'gosht-baliq', titleUz: 'Go\'sht va baliq', titleRu: 'Мясо и рыба', position: 5 },
  { slug: 'shirinliklar', titleUz: 'Shirinliklar', titleRu: 'Сладости', position: 6 },
  { slug: 'uy-xojaligi', titleUz: 'Uy xo\'jaligi', titleRu: 'Бытовые товары', position: 7 },
  { slug: 'shaxsiy-parvarish', titleUz: 'Shaxsiy parvarish', titleRu: 'Личная гигиена', position: 8 },
  { slug: 'elektronika', titleUz: 'Elektronika', titleRu: 'Электроника', position: 9 },
  { slug: 'aksessuarlar', titleUz: 'Aksessuarlar', titleRu: 'Аксессуары', position: 10 },
];

// ============== TASDIQLANGAN UNSPLASH RASMLAR ==============
// Har bir URL WebFetch bilan tekshirilgan — 200 OK qaytarganlar
const U = (id: string) => `https://images.unsplash.com/${id}?w=800&q=80&auto=format&fit=crop`;

const IMG = {
  COCA_COLA: U('photo-1591254460606-fab865bf82b8'),
  WATER: U('photo-1551024601-bec78aea704b'),
  JUICE: U('photo-1601493700631-2b16ec4b4716'),
  TEA: U('photo-1576092768241-dec231879fc3'),
  COFFEE: U('photo-1559056199-641a0ac8b55e'),
  MILK: U('photo-1563636619-e9143da7973b'),
  YOGURT: U('photo-1571212515416-fef01fc43637'),
  CHEESE: U('photo-1542838132-92c53300491e'),
  EGGS: U('photo-1582722872445-44dc5f7e3c8f'),
  RICE: U('photo-1574323347407-f5e1ad6d020b'),
  PASTA: U('photo-1551892374-ecf8754cf8b0'),
  BREAD: U('photo-1509440159596-0249088772ff'),
  APPLE: U('photo-1568702846914-96b305d2aaeb'),
  BANANA: U('photo-1531326240216-7b04ad593229'),
  TOMATO: U('photo-1518977822534-7049a61ee0c2'),
  CHICKEN: U('photo-1604503468506-a8da13d82791'),
  CHOCOLATE: U('photo-1623660053975-cf75a8be0908'),
  DETERGENT: U('photo-1624372635310-01d078c05dd9'),
  SHAMPOO: U('photo-1556228720-195a672e8a03'),
  SOAP: U('photo-1584305574647-0cc949a2bb9f'),
};

// ============== MAHSULOTLAR ==============
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

const products: ProductSeed[] = [
  // ============== OZIQ-OVQAT ==============
  {
    slug: 'imkon-guruch-premium-1kg',
    categorySlug: 'oziq-ovqat',
    brand: 'Imkon',
    titleUz: 'Imkon Premium guruch, 1 kg',
    titleRu: 'Рис Imkon Premium, 1 кг',
    descriptionUz: 'Mahalliy ishlab chiqarilgan tozalangan oq guruch. Plov va palov uchun mos.',
    descriptionRu: 'Очищенный белый рис местного производства. Подходит для плова.',
    basePrice: 18000,
    oldPrice: 22000,
    isFeatured: true,
    images: [IMG.RICE],
    variants: [{ size: '1 kg', price: 18000, oldPrice: 22000, stock: 80 }],
    specs: [
      { labelUz: 'Vazni', labelRu: 'Вес', valueUz: '1 kg', valueRu: '1 кг' },
      { labelUz: 'Ishlab chiqaruvchi', labelRu: 'Производитель', valueUz: 'Imkon (Toshkent)', valueRu: 'Imkon (Ташкент)' },
    ],
  },
  {
    slug: 'imkon-guruch-premium-5kg',
    categorySlug: 'oziq-ovqat',
    brand: 'Imkon',
    titleUz: 'Imkon Premium guruch, 5 kg',
    titleRu: 'Рис Imkon Premium, 5 кг',
    descriptionUz: 'Oilaviy o\'lcham. Plov va shirguruch uchun ideal.',
    descriptionRu: 'Семейная упаковка. Идеально для плова и каш.',
    basePrice: 85000,
    oldPrice: 100000,
    images: [IMG.RICE],
    variants: [{ size: '5 kg', price: 85000, oldPrice: 100000, stock: 35 }],
    specs: [{ labelUz: 'Vazni', labelRu: 'Вес', valueUz: '5 kg', valueRu: '5 кг' }],
  },
  {
    slug: 'makfa-spagetti-500g',
    categorySlug: 'oziq-ovqat',
    brand: 'Makfa',
    titleUz: 'Makfa spagetti, 500 g',
    titleRu: 'Спагетти Makfa, 500 г',
    descriptionUz: 'Yumshoq bug\'doy unidan. Yopishmaydigan formula.',
    descriptionRu: 'Из твёрдых сортов пшеницы. Не слипается.',
    basePrice: 14000,
    isFeatured: true,
    images: [IMG.PASTA],
    variants: [{ size: '500 g', price: 14000, stock: 120 }],
    specs: [
      { labelUz: 'Vazni', labelRu: 'Вес', valueUz: '500 g', valueRu: '500 г' },
      { labelUz: 'Brend', labelRu: 'Бренд', valueUz: 'Makfa', valueRu: 'Makfa' },
    ],
  },
  {
    slug: 'makfa-makaron-pero-400g',
    categorySlug: 'oziq-ovqat',
    brand: 'Makfa',
    titleUz: 'Makfa makaron "Pero", 400 g',
    titleRu: 'Макароны Makfa «Перо», 400 г',
    descriptionUz: 'Klassik shakl. Sho\'rva va garnirlar uchun.',
    descriptionRu: 'Классическая форма. Для супов и гарниров.',
    basePrice: 11000,
    images: [IMG.PASTA],
    variants: [{ size: '400 g', price: 11000, stock: 95 }],
    specs: [{ labelUz: 'Vazni', labelRu: 'Вес', valueUz: '400 g', valueRu: '400 г' }],
  },
  {
    slug: 'oltin-bugdoy-un-5kg',
    categorySlug: 'oziq-ovqat',
    brand: 'Oltin Bug\'doy',
    titleUz: 'Oltin Bug\'doy oliy nav un, 5 kg',
    titleRu: 'Мука высшего сорта Oltin Bug\'doy, 5 кг',
    descriptionUz: 'Oliy nav. Non, somsa, qatlama uchun.',
    descriptionRu: 'Высший сорт. Для хлеба, сомсы, слоёного теста.',
    basePrice: 38000,
    oldPrice: 45000,
    images: [IMG.RICE],
    variants: [{ size: '5 kg', price: 38000, oldPrice: 45000, stock: 50 }],
    specs: [{ labelUz: 'Vazni', labelRu: 'Вес', valueUz: '5 kg', valueRu: '5 кг' }],
  },
  {
    slug: 'oltin-tomchi-kungaboqar-yogi-1l',
    categorySlug: 'oziq-ovqat',
    brand: 'Oltin Tomchi',
    titleUz: 'Oltin Tomchi kungaboqar yog\'i, 1 L',
    titleRu: 'Подсолнечное масло Oltin Tomchi, 1 л',
    descriptionUz: 'Tozalangan, hidsiz. Pishirish va qovurish uchun.',
    descriptionRu: 'Рафинированное, без запаха. Для жарки и заправки.',
    basePrice: 28000,
    isFeatured: true,
    images: [IMG.WATER],
    variants: [{ size: '1 L', price: 28000, stock: 70 }],
    specs: [{ labelUz: 'Hajmi', labelRu: 'Объём', valueUz: '1 L', valueRu: '1 л' }],
  },
  {
    slug: 'imkon-non-non-uy',
    categorySlug: 'oziq-ovqat',
    brand: 'Toshkent non',
    titleUz: 'Tandir non',
    titleRu: 'Хлеб тандыр',
    descriptionUz: 'An\'anaviy tandirda yopilgan issiq non.',
    descriptionRu: 'Свежий хлеб из тандыра.',
    basePrice: 6000,
    images: [IMG.BREAD],
    variants: [{ size: '1 dona', price: 6000, stock: 200 }],
    specs: [{ labelUz: 'Tur', labelRu: 'Тип', valueUz: 'Tandir', valueRu: 'Тандыр' }],
  },

  // ============== SUT MAHSULOTLARI ==============
  {
    slug: 'imkon-sut-2-5-1l',
    categorySlug: 'sut-mahsulotlari',
    brand: 'Imkon',
    titleUz: 'Imkon sut 2.5%, 1 L',
    titleRu: 'Молоко Imkon 2.5%, 1 л',
    descriptionUz: 'Pasterlangan sut. Tabiiy ta\'m.',
    descriptionRu: 'Пастеризованное молоко. Натуральный вкус.',
    basePrice: 13000,
    isFeatured: true,
    images: [IMG.MILK],
    variants: [{ size: '1 L', price: 13000, stock: 100 }],
    specs: [
      { labelUz: 'Yog\'lilik', labelRu: 'Жирность', valueUz: '2.5%', valueRu: '2.5%' },
      { labelUz: 'Hajmi', labelRu: 'Объём', valueUz: '1 L', valueRu: '1 л' },
    ],
  },
  {
    slug: 'imkon-sut-3-2-1l',
    categorySlug: 'sut-mahsulotlari',
    brand: 'Imkon',
    titleUz: 'Imkon sut 3.2%, 1 L',
    titleRu: 'Молоко Imkon 3.2%, 1 л',
    descriptionUz: 'To\'la yog\'li sut. Bolalar va kechki choy uchun.',
    descriptionRu: 'Цельное молоко. Для детей и вечернего чая.',
    basePrice: 14500,
    images: [IMG.MILK],
    variants: [{ size: '1 L', price: 14500, stock: 80 }],
    specs: [{ labelUz: 'Yog\'lilik', labelRu: 'Жирность', valueUz: '3.2%', valueRu: '3.2%' }],
  },
  {
    slug: 'imkon-kefir-1l',
    categorySlug: 'sut-mahsulotlari',
    brand: 'Imkon',
    titleUz: 'Imkon kefir 1%, 1 L',
    titleRu: 'Кефир Imkon 1%, 1 л',
    descriptionUz: 'Probiyotikli, ovqat hazm qilishga foydali.',
    descriptionRu: 'С пробиотиками, полезен для пищеварения.',
    basePrice: 12000,
    images: [IMG.MILK],
    variants: [{ size: '1 L', price: 12000, stock: 65 }],
    specs: [{ labelUz: 'Yog\'lilik', labelRu: 'Жирность', valueUz: '1%', valueRu: '1%' }],
  },
  {
    slug: 'imkon-yogurt-vanil-350g',
    categorySlug: 'sut-mahsulotlari',
    brand: 'Imkon',
    titleUz: 'Imkon Yogurt vanilli, 350 g',
    titleRu: 'Йогурт Imkon ванильный, 350 г',
    descriptionUz: 'Tabiiy vanildan. Bolalar uchun ham yoqimli.',
    descriptionRu: 'С натуральной ванилью. Подойдёт детям.',
    basePrice: 9500,
    oldPrice: 11000,
    isFeatured: true,
    images: [IMG.YOGURT],
    variants: [
      { size: 'Vanilli 350g', price: 9500, oldPrice: 11000, stock: 50 },
      { size: 'Tabiiy 350g', price: 9500, oldPrice: 11000, stock: 40 },
    ],
    specs: [{ labelUz: 'Vazni', labelRu: 'Вес', valueUz: '350 g', valueRu: '350 г' }],
  },
  {
    slug: 'imkon-sariyog-73-200g',
    categorySlug: 'sut-mahsulotlari',
    brand: 'Imkon',
    titleUz: 'Imkon sariyog\' 73%, 200 g',
    titleRu: 'Сливочное масло Imkon 73%, 200 г',
    descriptionUz: 'Tabiiy sariyog\'. Non bilan va pishiriqlarga.',
    descriptionRu: 'Натуральное сливочное. Для бутербродов и выпечки.',
    basePrice: 22000,
    images: [IMG.MILK],
    variants: [{ size: '200 g', price: 22000, stock: 45 }],
    specs: [{ labelUz: 'Yog\'lilik', labelRu: 'Жирность', valueUz: '73%', valueRu: '73%' }],
  },
  {
    slug: 'imkon-tvorog-5-200g',
    categorySlug: 'sut-mahsulotlari',
    brand: 'Imkon',
    titleUz: 'Imkon tvorog 5%, 200 g',
    titleRu: 'Творог Imkon 5%, 200 г',
    descriptionUz: 'Yumshoq tekstura. Sirniki va salatalar uchun.',
    descriptionRu: 'Мягкая текстура. Для сырников и салатов.',
    basePrice: 11500,
    images: [IMG.CHEESE],
    variants: [{ size: '200 g', price: 11500, stock: 55 }],
    specs: [{ labelUz: 'Yog\'lilik', labelRu: 'Жирность', valueUz: '5%', valueRu: '5%' }],
  },
  {
    slug: 'tovuq-tuxumi-c1-10dona',
    categorySlug: 'sut-mahsulotlari',
    brand: 'Asl tuxum',
    titleUz: 'Tovuq tuxumi C1, 10 dona',
    titleRu: 'Куриные яйца C1, 10 шт',
    descriptionUz: 'Yangi, fermerdan. Sariq tuxum.',
    descriptionRu: 'Свежие, с фермы. Жёлтый желток.',
    basePrice: 18000,
    isFeatured: true,
    images: [IMG.EGGS],
    variants: [
      { size: '10 dona', price: 18000, stock: 80 },
      { size: '30 dona', price: 50000, stock: 25 },
    ],
    specs: [{ labelUz: 'Toifa', labelRu: 'Категория', valueUz: 'C1', valueRu: 'C1' }],
  },

  // ============== ICHIMLIKLAR ==============
  {
    slug: 'coca-cola-1-5l',
    categorySlug: 'ichimliklar',
    brand: 'Coca-Cola',
    titleUz: 'Coca-Cola, 1.5 L',
    titleRu: 'Coca-Cola, 1.5 л',
    descriptionUz: 'Klassik gazli ichimlik.',
    descriptionRu: 'Классический газированный напиток.',
    basePrice: 14000,
    oldPrice: 16000,
    isFeatured: true,
    images: [IMG.COCA_COLA],
    variants: [
      { size: '0.5 L', price: 7000, stock: 200 },
      { size: '1 L', price: 11000, stock: 150 },
      { size: '1.5 L', price: 14000, oldPrice: 16000, stock: 120 },
      { size: '2 L', price: 17000, stock: 80 },
    ],
    specs: [{ labelUz: 'Hajmi', labelRu: 'Объём', valueUz: '0.5 / 1 / 1.5 / 2 L', valueRu: '0.5 / 1 / 1.5 / 2 л' }],
  },
  {
    slug: 'coca-cola-zero-1-5l',
    categorySlug: 'ichimliklar',
    brand: 'Coca-Cola',
    titleUz: 'Coca-Cola Zero, 1.5 L',
    titleRu: 'Coca-Cola Zero, 1.5 л',
    descriptionUz: 'Shakarsiz. Sof Cola ta\'mi.',
    descriptionRu: 'Без сахара. Чистый вкус колы.',
    basePrice: 14000,
    images: [IMG.COCA_COLA],
    variants: [
      { size: '0.5 L', price: 7000, stock: 100 },
      { size: '1.5 L', price: 14000, stock: 80 },
    ],
    specs: [{ labelUz: 'Shakar', labelRu: 'Сахар', valueUz: 'Yo\'q', valueRu: 'Нет' }],
  },
  {
    slug: 'pepsi-1-5l',
    categorySlug: 'ichimliklar',
    brand: 'Pepsi',
    titleUz: 'Pepsi, 1.5 L',
    titleRu: 'Pepsi, 1.5 л',
    descriptionUz: 'Coca-Cola alternativasi. Yumshoqroq ta\'m.',
    descriptionRu: 'Альтернатива Coca-Cola. Мягче на вкус.',
    basePrice: 13500,
    images: [IMG.COCA_COLA],
    variants: [
      { size: '0.5 L', price: 6500, stock: 120 },
      { size: '1.5 L', price: 13500, stock: 90 },
    ],
    specs: [{ labelUz: 'Hajmi', labelRu: 'Объём', valueUz: '0.5 / 1.5 L', valueRu: '0.5 / 1.5 л' }],
  },
  {
    slug: 'aqua-minerale-1-5l',
    categorySlug: 'ichimliklar',
    brand: 'Aqua Minerale',
    titleUz: 'Aqua Minerale ichimlik suvi, 1.5 L',
    titleRu: 'Питьевая вода Aqua Minerale, 1.5 л',
    descriptionUz: 'Tozalangan tabiiy suv. Gazsiz va gazli variantlar.',
    descriptionRu: 'Очищенная природная вода. Газированная и негаз.',
    basePrice: 6500,
    isFeatured: true,
    images: [IMG.WATER],
    variants: [
      { size: 'Gazsiz 1.5L', price: 6500, stock: 250 },
      { size: 'Gazli 1.5L', price: 6500, stock: 200 },
      { size: 'Gazsiz 5L', price: 12000, stock: 100 },
    ],
    specs: [{ labelUz: 'Tur', labelRu: 'Тип', valueUz: 'Tozalangan suv', valueRu: 'Очищенная вода' }],
  },
  {
    slug: 'i-juice-apelsin-1l',
    categorySlug: 'ichimliklar',
    brand: 'I-Juice',
    titleUz: 'I-Juice apelsin sharbati, 1 L',
    titleRu: 'Апельсиновый сок I-Juice, 1 л',
    descriptionUz: '100% tabiiy. Konsentratdan tayyorlangan.',
    descriptionRu: '100% натуральный. Из концентрата.',
    basePrice: 18000,
    images: [IMG.JUICE],
    variants: [{ size: '1 L', price: 18000, stock: 70 }],
    specs: [{ labelUz: 'Hajmi', labelRu: 'Объём', valueUz: '1 L', valueRu: '1 л' }],
  },
  {
    slug: 'i-juice-olma-1l',
    categorySlug: 'ichimliklar',
    brand: 'I-Juice',
    titleUz: 'I-Juice olma sharbati, 1 L',
    titleRu: 'Яблочный сок I-Juice, 1 л',
    descriptionUz: 'Mahalliy olmadan. Bolalar uchun mos.',
    descriptionRu: 'Из местных яблок. Подойдёт детям.',
    basePrice: 16000,
    images: [IMG.JUICE],
    variants: [{ size: '1 L', price: 16000, stock: 60 }],
    specs: [{ labelUz: 'Hajmi', labelRu: 'Объём', valueUz: '1 L', valueRu: '1 л' }],
  },
  {
    slug: 'lipton-yellow-label-100tb',
    categorySlug: 'ichimliklar',
    brand: 'Lipton',
    titleUz: 'Lipton Yellow Label, 100 paket',
    titleRu: 'Lipton Yellow Label, 100 пакетиков',
    descriptionUz: 'Klassik qora choy paketlari.',
    descriptionRu: 'Классические пакетики чёрного чая.',
    basePrice: 42000,
    oldPrice: 50000,
    images: [IMG.TEA],
    variants: [{ size: '100 paket', price: 42000, oldPrice: 50000, stock: 40 }],
    specs: [{ labelUz: 'Soni', labelRu: 'Количество', valueUz: '100 paket', valueRu: '100 шт' }],
  },
  {
    slug: 'nescafe-gold-95g',
    categorySlug: 'ichimliklar',
    brand: 'Nescafé',
    titleUz: 'Nescafé Gold, 95 g',
    titleRu: 'Nescafé Gold, 95 г',
    descriptionUz: 'Erituvchi qahva. Boy aromat.',
    descriptionRu: 'Растворимый кофе. Богатый аромат.',
    basePrice: 65000,
    isFeatured: true,
    images: [IMG.COFFEE],
    variants: [
      { size: '95 g banka', price: 65000, stock: 35 },
      { size: '190 g banka', price: 125000, stock: 20 },
    ],
    specs: [{ labelUz: 'Vazni', labelRu: 'Вес', valueUz: '95 g / 190 g', valueRu: '95 г / 190 г' }],
  },

  // ============== SABZAVOT VA MEVALAR ==============
  {
    slug: 'olma-aim-1kg',
    categorySlug: 'sabzavot-mevalar',
    brand: 'Mahalliy',
    titleUz: 'Olma "Aim", 1 kg',
    titleRu: 'Яблоки «Aim», 1 кг',
    descriptionUz: 'Mahalliy bog\'lardan. Shirin, qattiq, suvli.',
    descriptionRu: 'Из местных садов. Сладкие, твёрдые, сочные.',
    basePrice: 12000,
    isFeatured: true,
    images: [IMG.APPLE],
    variants: [{ size: '1 kg', price: 12000, stock: 150 }],
    specs: [{ labelUz: 'Manba', labelRu: 'Происхождение', valueUz: 'O\'zbekiston', valueRu: 'Узбекистан' }],
  },
  {
    slug: 'banan-ekvador-1kg',
    categorySlug: 'sabzavot-mevalar',
    brand: 'Import',
    titleUz: 'Banan (Ekvador), 1 kg',
    titleRu: 'Бананы (Эквадор), 1 кг',
    descriptionUz: 'Premium navli, pishgan.',
    descriptionRu: 'Премиум сорт, спелые.',
    basePrice: 18000,
    isFeatured: true,
    images: [IMG.BANANA],
    variants: [{ size: '1 kg', price: 18000, stock: 120 }],
    specs: [{ labelUz: 'Manba', labelRu: 'Происхождение', valueUz: 'Ekvador', valueRu: 'Эквадор' }],
  },
  {
    slug: 'pomidor-mahalliy-1kg',
    categorySlug: 'sabzavot-mevalar',
    brand: 'Mahalliy',
    titleUz: 'Pomidor (mahalliy), 1 kg',
    titleRu: 'Помидоры (местные), 1 кг',
    descriptionUz: 'Quyoshda pishgan, salatalar uchun ideal.',
    descriptionRu: 'Поспели на солнце, идеальны для салатов.',
    basePrice: 15000,
    images: [IMG.TOMATO],
    variants: [{ size: '1 kg', price: 15000, stock: 100 }],
    specs: [{ labelUz: 'Manba', labelRu: 'Происхождение', valueUz: 'O\'zbekiston', valueRu: 'Узбекистан' }],
  },
  {
    slug: 'kartoshka-1kg',
    categorySlug: 'sabzavot-mevalar',
    brand: 'Mahalliy',
    titleUz: 'Kartoshka (yangi), 1 kg',
    titleRu: 'Картофель (свежий), 1 кг',
    descriptionUz: 'Sariq qubbasi, pishirish va qovurish uchun.',
    descriptionRu: 'Жёлтая, для варки и жарки.',
    basePrice: 7000,
    images: [IMG.TOMATO],
    variants: [
      { size: '1 kg', price: 7000, stock: 200 },
      { size: '5 kg qop', price: 32000, stock: 50 },
    ],
    specs: [{ labelUz: 'Tur', labelRu: 'Сорт', valueUz: 'Sariq', valueRu: 'Жёлтый' }],
  },
  {
    slug: 'piyoz-mahalliy-1kg',
    categorySlug: 'sabzavot-mevalar',
    brand: 'Mahalliy',
    titleUz: 'Piyoz (oq), 1 kg',
    titleRu: 'Лук (белый), 1 кг',
    descriptionUz: 'Quruq piyoz. Oshxonaning asosi.',
    descriptionRu: 'Сухой лук. Основа кухни.',
    basePrice: 5000,
    images: [IMG.TOMATO],
    variants: [
      { size: '1 kg', price: 5000, stock: 200 },
      { size: '5 kg qop', price: 22000, stock: 40 },
    ],
    specs: [{ labelUz: 'Tur', labelRu: 'Тип', valueUz: 'Oq quruq', valueRu: 'Белый сухой' }],
  },
  {
    slug: 'bodring-1kg',
    categorySlug: 'sabzavot-mevalar',
    brand: 'Mahalliy',
    titleUz: 'Bodring (qisqa), 1 kg',
    titleRu: 'Огурцы (короткие), 1 кг',
    descriptionUz: 'Yangi terilgan, salatalar uchun.',
    descriptionRu: 'Свежесобранные, для салатов.',
    basePrice: 13000,
    images: [IMG.TOMATO],
    variants: [{ size: '1 kg', price: 13000, stock: 80 }],
    specs: [{ labelUz: 'Manba', labelRu: 'Происхождение', valueUz: 'O\'zbekiston', valueRu: 'Узбекистан' }],
  },
  {
    slug: 'limon-1kg',
    categorySlug: 'sabzavot-mevalar',
    brand: 'Import',
    titleUz: 'Limon, 1 kg',
    titleRu: 'Лимон, 1 кг',
    descriptionUz: 'Choy va pishiriqlar uchun.',
    descriptionRu: 'Для чая и выпечки.',
    basePrice: 22000,
    images: [IMG.APPLE],
    variants: [{ size: '1 kg', price: 22000, stock: 60 }],
    specs: [{ labelUz: 'Manba', labelRu: 'Происхождение', valueUz: 'Turkiya', valueRu: 'Турция' }],
  },

  // ============== GO'SHT VA BALIQ ==============
  {
    slug: 'tovuq-filesi-1kg',
    categorySlug: 'gosht-baliq',
    brand: 'Asl tovuq',
    titleUz: 'Tovuq filesi (ko\'krak), 1 kg',
    titleRu: 'Куриное филе (грудка), 1 кг',
    descriptionUz: 'Yangi, sovutilgan. Suyaqsiz, terisiz.',
    descriptionRu: 'Свежее, охлаждённое. Без костей и кожи.',
    basePrice: 52000,
    oldPrice: 58000,
    isFeatured: true,
    images: [IMG.CHICKEN],
    variants: [{ size: '1 kg', price: 52000, oldPrice: 58000, stock: 40 }],
    specs: [
      { labelUz: 'Holati', labelRu: 'Состояние', valueUz: 'Sovutilgan', valueRu: 'Охлаждённое' },
      { labelUz: 'Tarkibi', labelRu: 'Состав', valueUz: 'Tovuq', valueRu: 'Курица' },
    ],
  },
  {
    slug: 'tovuq-oyogi-1kg',
    categorySlug: 'gosht-baliq',
    brand: 'Asl tovuq',
    titleUz: 'Tovuq oyog\'i, 1 kg',
    titleRu: 'Куриные ножки, 1 кг',
    descriptionUz: 'Yangi tovuq oyog\'i. Pishirish va qovurish uchun.',
    descriptionRu: 'Свежие куриные ножки. Для варки и жарки.',
    basePrice: 38000,
    images: [IMG.CHICKEN],
    variants: [{ size: '1 kg', price: 38000, stock: 50 }],
    specs: [{ labelUz: 'Holati', labelRu: 'Состояние', valueUz: 'Sovutilgan', valueRu: 'Охлаждённое' }],
  },
  {
    slug: 'mol-goshti-yagona-1kg',
    categorySlug: 'gosht-baliq',
    brand: 'Mahalliy ferma',
    titleUz: 'Mol go\'shti (yagona qism), 1 kg',
    titleRu: 'Говядина (мякоть), 1 кг',
    descriptionUz: 'Premium, suyaqsiz. Plov va sho\'rva uchun.',
    descriptionRu: 'Премиум, без костей. Для плова и супов.',
    basePrice: 105000,
    images: [IMG.CHICKEN],
    variants: [{ size: '1 kg', price: 105000, stock: 25 }],
    specs: [{ labelUz: 'Qismi', labelRu: 'Часть', valueUz: 'Yagona (mякot\')', valueRu: 'Мякоть' }],
  },
  {
    slug: 'qoy-goshti-1kg',
    categorySlug: 'gosht-baliq',
    brand: 'Mahalliy ferma',
    titleUz: 'Qo\'y go\'shti, 1 kg',
    titleRu: 'Баранина, 1 кг',
    descriptionUz: 'Yosh qo\'y go\'shti. Plov va kebab uchun.',
    descriptionRu: 'Молодая баранина. Для плова и шашлыка.',
    basePrice: 135000,
    images: [IMG.CHICKEN],
    variants: [{ size: '1 kg', price: 135000, stock: 20 }],
    specs: [{ labelUz: 'Yosh', labelRu: 'Возраст', valueUz: 'Yosh qo\'y', valueRu: 'Молодая баранина' }],
  },
  {
    slug: 'baliq-forel-500g',
    categorySlug: 'gosht-baliq',
    brand: 'Norvegiya',
    titleUz: 'Forel baliq filesi, 500 g',
    titleRu: 'Филе форели, 500 г',
    descriptionUz: 'Yangi muzlatilgan. Omega-3 ga boy.',
    descriptionRu: 'Свежемороженое. Богато Омега-3.',
    basePrice: 95000,
    images: [IMG.CHICKEN],
    variants: [{ size: '500 g', price: 95000, stock: 15 }],
    specs: [{ labelUz: 'Manba', labelRu: 'Происхождение', valueUz: 'Norvegiya', valueRu: 'Норвегия' }],
  },

  // ============== SHIRINLIKLAR ==============
  {
    slug: 'snickers-50g',
    categorySlug: 'shirinliklar',
    brand: 'Mars',
    titleUz: 'Snickers, 50 g',
    titleRu: 'Snickers, 50 г',
    descriptionUz: 'Yong\'oq, karamel va sutli shokoladdan.',
    descriptionRu: 'С арахисом, карамелью и молочным шоколадом.',
    basePrice: 8500,
    isFeatured: true,
    images: [IMG.CHOCOLATE],
    variants: [
      { size: '50 g', price: 8500, stock: 250 },
      { size: '95 g maxi', price: 15000, stock: 100 },
    ],
    specs: [{ labelUz: 'Vazni', labelRu: 'Вес', valueUz: '50 g / 95 g', valueRu: '50 г / 95 г' }],
  },
  {
    slug: 'mars-50g',
    categorySlug: 'shirinliklar',
    brand: 'Mars',
    titleUz: 'Mars, 50 g',
    titleRu: 'Mars, 50 г',
    descriptionUz: 'Karamel va nuga sutli shokoladda.',
    descriptionRu: 'Карамель и нуга в молочном шоколаде.',
    basePrice: 8000,
    images: [IMG.CHOCOLATE],
    variants: [{ size: '50 g', price: 8000, stock: 200 }],
    specs: [{ labelUz: 'Vazni', labelRu: 'Вес', valueUz: '50 g', valueRu: '50 г' }],
  },
  {
    slug: 'twix-50g',
    categorySlug: 'shirinliklar',
    brand: 'Mars',
    titleUz: 'Twix, 50 g',
    titleRu: 'Twix, 50 г',
    descriptionUz: 'Pechene, karamel, shokolad. 2 ta tayoq.',
    descriptionRu: 'Печенье, карамель, шоколад. Две палочки.',
    basePrice: 8000,
    images: [IMG.CHOCOLATE],
    variants: [{ size: '50 g', price: 8000, stock: 180 }],
    specs: [{ labelUz: 'Vazni', labelRu: 'Вес', valueUz: '50 g', valueRu: '50 г' }],
  },
  {
    slug: 'milka-tablet-100g',
    categorySlug: 'shirinliklar',
    brand: 'Milka',
    titleUz: 'Milka Alpine Milk shokoladi, 100 g',
    titleRu: 'Шоколад Milka Alpine Milk, 100 г',
    descriptionUz: 'Alp tog\'lari sutidan tayyorlangan klassik shokolad.',
    descriptionRu: 'Классический шоколад из альпийского молока.',
    basePrice: 18000,
    oldPrice: 22000,
    isFeatured: true,
    images: [IMG.CHOCOLATE],
    variants: [
      { size: 'Klassik 100g', price: 18000, oldPrice: 22000, stock: 90 },
      { size: 'Yong\'oqli 100g', price: 19000, stock: 60 },
    ],
    specs: [{ labelUz: 'Vazni', labelRu: 'Вес', valueUz: '100 g', valueRu: '100 г' }],
  },
  {
    slug: 'kitkat-41g',
    categorySlug: 'shirinliklar',
    brand: 'Nestlé',
    titleUz: 'Nestlé KitKat, 41 g',
    titleRu: 'Nestlé KitKat, 41 г',
    descriptionUz: '4 ta xrustyashchiy tayoq sutli shokoladda.',
    descriptionRu: '4 хрустящие палочки в молочном шоколаде.',
    basePrice: 7000,
    images: [IMG.CHOCOLATE],
    variants: [{ size: '41 g', price: 7000, stock: 200 }],
    specs: [{ labelUz: 'Vazni', labelRu: 'Вес', valueUz: '41 g', valueRu: '41 г' }],
  },
  {
    slug: 'nutella-350g',
    categorySlug: 'shirinliklar',
    brand: 'Ferrero',
    titleUz: 'Nutella shokoladli pasta, 350 g',
    titleRu: 'Шоколадная паста Nutella, 350 г',
    descriptionUz: 'Findiq va shokoladdan tayyorlangan pasta.',
    descriptionRu: 'Паста из фундука и шоколада.',
    basePrice: 78000,
    oldPrice: 88000,
    isFeatured: true,
    images: [IMG.CHOCOLATE],
    variants: [
      { size: '350 g', price: 78000, oldPrice: 88000, stock: 50 },
      { size: '630 g', price: 135000, stock: 25 },
    ],
    specs: [{ labelUz: 'Vazni', labelRu: 'Вес', valueUz: '350 g / 630 g', valueRu: '350 г / 630 г' }],
  },

  // ============== UY XO'JALIGI ==============
  {
    slug: 'ariel-kir-kukuni-3kg',
    categorySlug: 'uy-xojaligi',
    brand: 'Ariel',
    titleUz: 'Ariel kir yuvish kukuni, 3 kg',
    titleRu: 'Стиральный порошок Ariel, 3 кг',
    descriptionUz: 'Avtomatik mashina uchun. Eng dog\' kirlar uchun.',
    descriptionRu: 'Для автоматических машин. Против сложных пятен.',
    basePrice: 95000,
    oldPrice: 115000,
    isFeatured: true,
    images: [IMG.DETERGENT],
    variants: [
      { size: '3 kg', price: 95000, oldPrice: 115000, stock: 40 },
      { size: '6 kg', price: 175000, stock: 20 },
    ],
    specs: [
      { labelUz: 'Tur', labelRu: 'Тип', valueUz: 'Avtomat', valueRu: 'Автомат' },
      { labelUz: 'Vazni', labelRu: 'Вес', valueUz: '3 / 6 kg', valueRu: '3 / 6 кг' },
    ],
  },
  {
    slug: 'persil-kir-kukuni-4kg',
    categorySlug: 'uy-xojaligi',
    brand: 'Persil',
    titleUz: 'Persil Color kir yuvish kukuni, 4 kg',
    titleRu: 'Стиральный порошок Persil Color, 4 кг',
    descriptionUz: 'Rangli kirlar uchun. Rangni saqlaydi.',
    descriptionRu: 'Для цветных вещей. Сохраняет цвет.',
    basePrice: 120000,
    images: [IMG.DETERGENT],
    variants: [{ size: '4 kg', price: 120000, stock: 30 }],
    specs: [{ labelUz: 'Tur', labelRu: 'Тип', valueUz: 'Rangli kir uchun', valueRu: 'Для цветного' }],
  },
  {
    slug: 'fairy-original-1l',
    categorySlug: 'uy-xojaligi',
    brand: 'Fairy',
    titleUz: 'Fairy idish yuvish suyuqligi, 1 L',
    titleRu: 'Средство для мытья посуды Fairy, 1 л',
    descriptionUz: 'Idishlarni yog\'dan tozalaydi. Limon hidi.',
    descriptionRu: 'Удаляет жир с посуды. Лимонный аромат.',
    basePrice: 28000,
    images: [IMG.DETERGENT],
    variants: [
      { size: '450 ml', price: 14000, stock: 80 },
      { size: '1 L', price: 28000, stock: 50 },
    ],
    specs: [{ labelUz: 'Hajmi', labelRu: 'Объём', valueUz: '450 ml / 1 L', valueRu: '450 мл / 1 л' }],
  },
  {
    slug: 'domestos-750ml',
    categorySlug: 'uy-xojaligi',
    brand: 'Domestos',
    titleUz: 'Domestos sanitar tozalovchi, 750 ml',
    titleRu: 'Дезинфицирующее средство Domestos, 750 мл',
    descriptionUz: '99.9% mikroblarni o\'ldiradi. Hojatxona va bosh uchun.',
    descriptionRu: 'Убивает 99.9% микробов. Для туалета и ванной.',
    basePrice: 32000,
    images: [IMG.DETERGENT],
    variants: [{ size: '750 ml', price: 32000, stock: 60 }],
    specs: [{ labelUz: 'Hajmi', labelRu: 'Объём', valueUz: '750 ml', valueRu: '750 мл' }],
  },
  {
    slug: 'zewa-tualet-qogozi-8rulon',
    categorySlug: 'uy-xojaligi',
    brand: 'Zewa',
    titleUz: 'Zewa Plus tualet qog\'ozi, 8 rulon',
    titleRu: 'Туалетная бумага Zewa Plus, 8 рулонов',
    descriptionUz: '2 qatlamli, yumshoq. Oilaviy o\'lcham.',
    descriptionRu: '2 слоя, мягкая. Семейная упаковка.',
    basePrice: 38000,
    images: [IMG.DETERGENT],
    variants: [
      { size: '4 rulon', price: 22000, stock: 80 },
      { size: '8 rulon', price: 38000, stock: 50 },
    ],
    specs: [{ labelUz: 'Qatlam', labelRu: 'Слои', valueUz: '2', valueRu: '2' }],
  },

  // ============== SHAXSIY PARVARISH ==============
  {
    slug: 'head-shoulders-shampun-400ml',
    categorySlug: 'shaxsiy-parvarish',
    brand: 'Head & Shoulders',
    titleUz: 'Head & Shoulders qazg\'oqqa qarshi shampun, 400 ml',
    titleRu: 'Шампунь от перхоти Head & Shoulders, 400 мл',
    descriptionUz: 'Qazg\'oqdan himoya. Klassik mentol formulasi.',
    descriptionRu: 'Защита от перхоти. Классический ментол.',
    basePrice: 55000,
    oldPrice: 65000,
    isFeatured: true,
    images: [IMG.SHAMPOO],
    variants: [
      { size: '200 ml', price: 32000, stock: 60 },
      { size: '400 ml', price: 55000, oldPrice: 65000, stock: 40 },
    ],
    specs: [{ labelUz: 'Hajmi', labelRu: 'Объём', valueUz: '200 / 400 ml', valueRu: '200 / 400 мл' }],
  },
  {
    slug: 'pantene-shampun-400ml',
    categorySlug: 'shaxsiy-parvarish',
    brand: 'Pantene',
    titleUz: 'Pantene Pro-V shampun, 400 ml',
    titleRu: 'Шампунь Pantene Pro-V, 400 мл',
    descriptionUz: 'Quruq va shikastlangan sochlar uchun.',
    descriptionRu: 'Для сухих и повреждённых волос.',
    basePrice: 52000,
    images: [IMG.SHAMPOO],
    variants: [{ size: '400 ml', price: 52000, stock: 50 }],
    specs: [{ labelUz: 'Hajmi', labelRu: 'Объём', valueUz: '400 ml', valueRu: '400 мл' }],
  },
  {
    slug: 'dove-sovun-100g',
    categorySlug: 'shaxsiy-parvarish',
    brand: 'Dove',
    titleUz: 'Dove kremli sovun, 100 g',
    titleRu: 'Крем-мыло Dove, 100 г',
    descriptionUz: '1/4 hayvonot kremi tarkibida. Yumshoq tozalanish.',
    descriptionRu: 'Содержит 1/4 увлажняющего крема. Мягкое очищение.',
    basePrice: 14000,
    images: [IMG.SOAP],
    variants: [
      { size: '100 g', price: 14000, stock: 120 },
      { size: '4 dona to\'plam', price: 50000, stock: 50 },
    ],
    specs: [{ labelUz: 'Vazni', labelRu: 'Вес', valueUz: '100 g', valueRu: '100 г' }],
  },
  {
    slug: 'nivea-sovun-100g',
    categorySlug: 'shaxsiy-parvarish',
    brand: 'Nivea',
    titleUz: 'Nivea sovun, 100 g',
    titleRu: 'Мыло Nivea, 100 г',
    descriptionUz: 'Klassik Nivea formulasi. Tabiiy aromat.',
    descriptionRu: 'Классическая формула Nivea. Натуральный аромат.',
    basePrice: 9500,
    images: [IMG.SOAP],
    variants: [{ size: '100 g', price: 9500, stock: 150 }],
    specs: [{ labelUz: 'Vazni', labelRu: 'Вес', valueUz: '100 g', valueRu: '100 г' }],
  },
  // ============== ELEKTRONIKA ==============
  {
    slug: 'samsung-galaxy-s25-ultra-256gb',
    categorySlug: 'elektronika',
    brand: 'Samsung',
    titleUz: 'Samsung Galaxy S25 Ultra 256GB',
    titleRu: 'Samsung Galaxy S25 Ultra 256GB',
    descriptionUz:
      'Galaxy S25 Ultra — Samsung\'ning flagman smartfoni. 6.9" Dynamic AMOLED 2X 120Hz QHD+ ekran, S Pen, 200 MP asosiy kamera, Snapdragon 8 Elite protsessor. Titanium korpus, IP68 himoya, 5000 mAh batareya, Galaxy AI funksiyalari. Rasmiy Samsung kafolati 12 oy.',
    descriptionRu:
      'Galaxy S25 Ultra — флагман Samsung. Экран 6.9" Dynamic AMOLED 2X 120Гц QHD+, S Pen, основная камера 200 МП, процессор Snapdragon 8 Elite. Титановый корпус, защита IP68, батарея 5000 мАч, функции Galaxy AI. Официальная гарантия Samsung 12 месяцев.',
    basePrice: 15800000,
    oldPrice: 18500000,
    isFeatured: true,
    images: [
      'https://techmall-images-repo.s3.eu-west-2.amazonaws.com/wp-content/uploads/2024/07/12161402/Samsung-Galaxy-S25.png',
    ],
    variants: [
      { color: 'Titanium Black', size: '256GB', price: 15800000, oldPrice: 18500000, stock: 10 },
      { color: 'Titanium Gray', size: '256GB', price: 15800000, oldPrice: 18500000, stock: 7 },
      { color: 'Titanium Silver', size: '256GB', price: 15800000, oldPrice: 18500000, stock: 5 },
      { color: 'Titanium Black', size: '512GB', price: 17900000, stock: 4 },
      { color: 'Titanium Black', size: '1TB', price: 21500000, stock: 2 },
    ],
    specs: [
      { labelUz: 'Ekran', labelRu: 'Дисплей', valueUz: '6.9" Dynamic AMOLED 2X, 120Hz QHD+', valueRu: '6.9" Dynamic AMOLED 2X, 120Гц QHD+' },
      { labelUz: 'Protsessor', labelRu: 'Процессор', valueUz: 'Snapdragon 8 Elite', valueRu: 'Snapdragon 8 Elite' },
      { labelUz: 'Operativ xotira', labelRu: 'ОЗУ', valueUz: '12 GB', valueRu: '12 ГБ' },
      { labelUz: 'Asosiy kamera', labelRu: 'Основная камера', valueUz: '200 MP + 50 MP + 10 MP + 50 MP', valueRu: '200 МП + 50 МП + 10 МП + 50 МП' },
      { labelUz: 'Selfi kamera', labelRu: 'Фронтальная камера', valueUz: '12 MP', valueRu: '12 МП' },
      { labelUz: 'Batareya', labelRu: 'Аккумулятор', valueUz: '5000 mAh, 45W tezkor zaryad', valueRu: '5000 мАч, 45 Вт быстрая зарядка' },
      { labelUz: 'S Pen', labelRu: 'S Pen', valueUz: 'Bor', valueRu: 'Есть' },
      { labelUz: 'Galaxy AI', labelRu: 'Galaxy AI', valueUz: 'Bor', valueRu: 'Есть' },
      { labelUz: 'Himoya', labelRu: 'Защита', valueUz: 'IP68, Titanium korpus', valueRu: 'IP68, титановый корпус' },
      { labelUz: 'Kafolat', labelRu: 'Гарантия', valueUz: '12 oy (Samsung rasmiy)', valueRu: '12 месяцев (официальная Samsung)' },
    ],
  },
  {
    slug: 'macbook-pro-14-m1-pro-512gb',
    categorySlug: 'elektronika',
    brand: 'Apple',
    titleUz: 'MacBook Pro 14" M1 Pro, 512GB',
    titleRu: 'MacBook Pro 14" M1 Pro, 512GB',
    descriptionUz:
      'Professional foydalanuvchilar uchun noutbuk. Apple M1 Pro chip (8 yadroli CPU, 14 yadroli GPU), 14.2" Liquid Retina XDR ekran 120Hz, 16 GB unified memory, 512 GB SSD. Video montaj, 3D modellashtirish, dasturlash uchun ideal. 17 soat batareya. macOS Sequoia.',
    descriptionRu:
      'Ноутбук для профессионалов. Чип Apple M1 Pro (8-ядерный CPU, 14-ядерный GPU), экран 14.2" Liquid Retina XDR 120Гц, 16 ГБ объединённой памяти, SSD 512 ГБ. Идеален для видеомонтажа, 3D, разработки. 17 часов работы. macOS Sequoia.',
    basePrice: 18500000,
    oldPrice: 22000000,
    isFeatured: true,
    images: [
      'https://api.cabinet.smart-market.uz/uploads/images/ff80818136973e97f9260ca7',
      'https://thumbs.dreamstime.com/b/close-up-top-view-macbook-grey-laptop-apple-mackbook-pro-m-chip-top-view-apple-logo-silver-macbook-cover-312529176.jpg',
    ],
    variants: [
      { color: 'Space Gray', size: '14" / 16GB / 512GB', price: 18500000, oldPrice: 22000000, stock: 5 },
      { color: 'Silver', size: '14" / 16GB / 512GB', price: 18500000, oldPrice: 22000000, stock: 3 },
      { color: 'Space Gray', size: '14" / 16GB / 1TB', price: 22500000, stock: 2 },
    ],
    specs: [
      { labelUz: 'Ekran', labelRu: 'Экран', valueUz: '14.2" Liquid Retina XDR, 120Hz', valueRu: '14.2" Liquid Retina XDR, 120Гц' },
      { labelUz: 'Protsessor', labelRu: 'Процессор', valueUz: 'Apple M1 Pro (8C CPU, 14C GPU)', valueRu: 'Apple M1 Pro (8-ядерный CPU, 14-ядерный GPU)' },
      { labelUz: 'Operativ xotira', labelRu: 'ОЗУ', valueUz: '16 GB unified memory', valueRu: '16 ГБ объединённой памяти' },
      { labelUz: 'SSD', labelRu: 'SSD', valueUz: '512 GB', valueRu: '512 ГБ' },
      { labelUz: 'Batareya', labelRu: 'Аккумулятор', valueUz: '17 soat ishlash', valueRu: 'До 17 часов работы' },
      { labelUz: 'Portlar', labelRu: 'Порты', valueUz: '3× Thunderbolt 4, HDMI, SDXC, MagSafe 3', valueRu: '3× Thunderbolt 4, HDMI, SDXC, MagSafe 3' },
      { labelUz: 'OS', labelRu: 'OS', valueUz: 'macOS Sequoia', valueRu: 'macOS Sequoia' },
      { labelUz: 'Kafolat', labelRu: 'Гарантия', valueUz: '12 oy', valueRu: '12 месяцев' },
    ],
  },
  {
    slug: 'asus-tuf-gaming-f15-rtx4060',
    categorySlug: 'elektronika',
    brand: 'ASUS',
    titleUz: 'ASUS TUF Gaming F15, i7 + RTX 4060',
    titleRu: 'ASUS TUF Gaming F15, i7 + RTX 4060',
    descriptionUz:
      'Gaming va og\'ir ish uchun noutbuk. Intel Core i7-13620H, NVIDIA GeForce RTX 4060 8GB, 16 GB DDR5 RAM, 512 GB NVMe SSD. 15.6" FHD IPS 144Hz ekran. Harbiy darajadagi (MIL-STD-810H) chidamli korpus, RGB klaviatura. Windows 11 Home oldindan o\'rnatilgan.',
    descriptionRu:
      'Ноутбук для игр и работы. Intel Core i7-13620H, NVIDIA GeForce RTX 4060 8 ГБ, 16 ГБ DDR5 ОЗУ, 512 ГБ NVMe SSD. Экран 15.6" FHD IPS 144Гц. Корпус военного класса (MIL-STD-810H), RGB-клавиатура. Windows 11 Home предустановлен.',
    basePrice: 11500000,
    oldPrice: 13800000,
    isFeatured: true,
    images: [
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRJXwssRqOBIyaHaMfsA-vF1NLtz0nm1YirFA&s',
    ],
    variants: [
      { color: 'Mecha Gray', size: 'i7 / 16GB / 512GB / RTX 4060', price: 11500000, oldPrice: 13800000, stock: 6 },
      { color: 'Mecha Gray', size: 'i7 / 16GB / 1TB / RTX 4060', price: 12900000, stock: 4 },
      { color: 'Mecha Gray', size: 'i5 / 16GB / 512GB / RTX 4050', price: 9500000, oldPrice: 11200000, stock: 8 },
    ],
    specs: [
      { labelUz: 'Ekran', labelRu: 'Экран', valueUz: '15.6" FHD IPS, 144Hz', valueRu: '15.6" FHD IPS, 144Гц' },
      { labelUz: 'Protsessor', labelRu: 'Процессор', valueUz: 'Intel Core i7-13620H', valueRu: 'Intel Core i7-13620H' },
      { labelUz: 'Video karta', labelRu: 'Видеокарта', valueUz: 'NVIDIA GeForce RTX 4060 8GB', valueRu: 'NVIDIA GeForce RTX 4060 8 ГБ' },
      { labelUz: 'Operativ xotira', labelRu: 'ОЗУ', valueUz: '16 GB DDR5', valueRu: '16 ГБ DDR5' },
      { labelUz: 'SSD', labelRu: 'SSD', valueUz: '512 GB NVMe (1TB opsion)', valueRu: '512 ГБ NVMe (опция 1 ТБ)' },
      { labelUz: 'Klaviatura', labelRu: 'Клавиатура', valueUz: 'RGB yorug\'lik', valueRu: 'RGB-подсветка' },
      { labelUz: 'Chidamlilik', labelRu: 'Надёжность', valueUz: 'MIL-STD-810H harbiy standart', valueRu: 'MIL-STD-810H военный стандарт' },
      { labelUz: 'OS', labelRu: 'OS', valueUz: 'Windows 11 Home', valueRu: 'Windows 11 Home' },
      { labelUz: 'Kafolat', labelRu: 'Гарантия', valueUz: '24 oy', valueRu: '24 месяца' },
    ],
  },
  {
    slug: 'sony-playstation-5-slim-disc',
    categorySlug: 'elektronika',
    brand: 'Sony',
    titleUz: 'Sony PlayStation 5 Slim (Disc Edition)',
    titleRu: 'Sony PlayStation 5 Slim (Disc Edition)',
    descriptionUz:
      'Yangi PS5 Slim — eski modeldan 30% kichikroq va yengilroq. Disk versiyasi (4K UHD Blu-ray pleyer bor). 825 GB SSD, 16 GB GDDR6, 4K 60FPS gacha (ba\'zi o\'yinlarda 120FPS), 8K tayyor. Komplektda: PS5 Slim konsoli, DualSense controller, HDMI kabel, quvvat kabeli. Yangi Spider-Man 2, GTA 6, Elden Ring uchun.',
    descriptionRu:
      'Новый PS5 Slim — на 30% меньше и легче предыдущей модели. Дисковая версия (с проигрывателем 4K UHD Blu-ray). 825 ГБ SSD, 16 ГБ GDDR6, 4K 60 FPS (в некоторых играх 120 FPS), 8K-совместимость. В комплекте: PS5 Slim, контроллер DualSense, HDMI-кабель, кабель питания. Для Spider-Man 2, GTA 6, Elden Ring.',
    basePrice: 7500000,
    oldPrice: 9200000,
    isFeatured: true,
    images: [
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSgg56yfmOe9ZY6nA3nS87C9u2aEEALM5O8dQ&s',
    ],
    variants: [
      { color: 'Oq', size: 'Disc Edition 825GB', price: 7500000, oldPrice: 9200000, stock: 10 },
      { color: 'Oq', size: 'Digital Edition 825GB', price: 6500000, oldPrice: 8000000, stock: 12 },
      { color: 'Oq', size: 'Disc + 2 controller', price: 8500000, stock: 6 },
    ],
    specs: [
      { labelUz: 'CPU', labelRu: 'Процессор', valueUz: 'AMD Zen 2 (8 yadro, 3.5 GHz)', valueRu: 'AMD Zen 2 (8 ядер, 3.5 ГГц)' },
      { labelUz: 'GPU', labelRu: 'Видеокарта', valueUz: 'Custom RDNA 2 (10.28 TFLOPS)', valueRu: 'Custom RDNA 2 (10.28 терафлопс)' },
      { labelUz: 'Operativ xotira', labelRu: 'ОЗУ', valueUz: '16 GB GDDR6', valueRu: '16 ГБ GDDR6' },
      { labelUz: 'SSD', labelRu: 'SSD', valueUz: '825 GB ultra-tezkor', valueRu: '825 ГБ сверхбыстрый' },
      { labelUz: 'Maksimal sifat', labelRu: 'Макс. разрешение', valueUz: '4K @ 60-120FPS, 8K mos', valueRu: '4K @ 60-120 FPS, 8K совместимо' },
      { labelUz: 'Ray Tracing', labelRu: 'Трассировка лучей', valueUz: 'Bor (apparat darajasi)', valueRu: 'Есть (аппаратная)' },
      { labelUz: 'Disk', labelRu: 'Привод', valueUz: '4K UHD Blu-ray', valueRu: '4K UHD Blu-ray' },
      { labelUz: 'Komplekt', labelRu: 'Комплект', valueUz: 'Konsol + DualSense + kabellar', valueRu: 'Консоль + DualSense + кабели' },
      { labelUz: 'Kafolat', labelRu: 'Гарантия', valueUz: '12 oy (rasmiy)', valueRu: '12 месяцев (официальная)' },
    ],
  },
  {
    slug: 'samsung-galaxy-s26-ultra-256gb',
    categorySlug: 'elektronika',
    brand: 'Samsung',
    titleUz: 'Samsung Galaxy S26 Ultra 256GB',
    titleRu: 'Samsung Galaxy S26 Ultra 256GB',
    descriptionUz:
      'Galaxy S26 Ultra — 2026 yilning flagman smartfoni. 6.9" Dynamic AMOLED 2X 120Hz ekran, S Pen, 200 MP asosiy kamera, Snapdragon 8 Gen 4 protsessor. Titanium korpus, IP68 himoya, 5000 mAh batareya, 45W tezkor zaryad. Rasmiy Samsung kafolati 12 oy.',
    descriptionRu:
      'Galaxy S26 Ultra — флагман 2026 года. Экран 6.9" Dynamic AMOLED 2X 120Hz, S Pen, основная камера 200 МП, процессор Snapdragon 8 Gen 4. Титановый корпус, защита IP68, батарея 5000 мАч, быстрая зарядка 45 Вт. Официальная гарантия Samsung 12 месяцев.',
    basePrice: 18500000,
    oldPrice: 22000000,
    isFeatured: true,
    images: [
      'https://api.samsungmobilepress.com/api/v1/file/F0079F4C3B320974850EA001FDD3463F37B966748BDE494FE62748327134D1DCE64158DC226213A89FED047E03845F28FF11247D0F5F079675A5BA7EC119A8674E479D8C6611F18CA1274AB23544EAD1D59F28A1AE5591ADDC088A2826AA2F0B97EDE750BCA1D4633D188D39711E6B63A0AF87D47190E94DC73815539D17511B3AB052BB115C35872B3F0EAC1BAD3CFD',
    ],
    variants: [
      { color: 'Titanium Black', size: '256GB', price: 18500000, oldPrice: 22000000, stock: 12 },
      { color: 'Titanium Gray', size: '256GB', price: 18500000, oldPrice: 22000000, stock: 8 },
      { color: 'Titanium Silver', size: '256GB', price: 18500000, oldPrice: 22000000, stock: 6 },
      { color: 'Titanium Black', size: '512GB', price: 21000000, stock: 5 },
      { color: 'Titanium Gray', size: '512GB', price: 21000000, stock: 4 },
      { color: 'Titanium Black', size: '1TB', price: 25000000, stock: 2 },
    ],
    specs: [
      { labelUz: 'Ekran', labelRu: 'Дисплей', valueUz: '6.9" Dynamic AMOLED 2X, 120Hz', valueRu: '6.9" Dynamic AMOLED 2X, 120Гц' },
      { labelUz: 'Protsessor', labelRu: 'Процессор', valueUz: 'Snapdragon 8 Gen 4', valueRu: 'Snapdragon 8 Gen 4' },
      { labelUz: 'Operativ xotira', labelRu: 'ОЗУ', valueUz: '12 GB', valueRu: '12 ГБ' },
      { labelUz: 'Asosiy kamera', labelRu: 'Основная камера', valueUz: '200 MP + 50 MP + 12 MP + 10 MP', valueRu: '200 МП + 50 МП + 12 МП + 10 МП' },
      { labelUz: 'Selfi kamera', labelRu: 'Фронтальная камера', valueUz: '12 MP', valueRu: '12 МП' },
      { labelUz: 'Batareya', labelRu: 'Аккумулятор', valueUz: '5000 mAh, 45W tezkor zaryad', valueRu: '5000 мАч, 45 Вт быстрая зарядка' },
      { labelUz: 'S Pen', labelRu: 'S Pen', valueUz: 'Bor', valueRu: 'Есть' },
      { labelUz: 'Himoya', labelRu: 'Защита', valueUz: 'IP68, Titanium korpus', valueRu: 'IP68, титановый корпус' },
      { labelUz: 'Kafolat', labelRu: 'Гарантия', valueUz: '12 oy (Samsung rasmiy)', valueRu: '12 месяцев (официальная Samsung)' },
    ],
  },

  // ============== AKSESSUARLAR ==============
  {
    slug: 'tws-bluetooth-quloqchin',
    categorySlug: 'aksessuarlar',
    brand: 'Pro Audio',
    titleUz: 'TWS simsiz quloqchin (Bluetooth 5.3)',
    titleRu: 'TWS беспроводные наушники (Bluetooth 5.3)',
    descriptionUz:
      'Yaxshi sifatdagi simsiz quloqchin. Bluetooth 5.3 — barqaror ulanish. 6 soat ishlash + zaryad keysida 24 soat. Touch boshqaruv, mikrofon. iPhone va Android bilan ishlaydi. Suvga chidamli (IPX4).',
    descriptionRu:
      'Качественные беспроводные наушники. Bluetooth 5.3 — стабильная связь. 6 часов работы + 24 часа с кейсом. Сенсорное управление, микрофон. Работают с iPhone и Android. Защита IPX4.',
    basePrice: 95000,
    oldPrice: 150000,
    isFeatured: true,
    images: [
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQrB0bNLM78HpAcl_5YIpMaI5bD749b0uSQdA&s',
    ],
    variants: [
      { color: 'Oq', size: 'TWS Standart', price: 95000, oldPrice: 150000, stock: 50 },
      { color: 'Qora', size: 'TWS Standart', price: 95000, oldPrice: 150000, stock: 40 },
      { color: 'Qora', size: 'TWS Pro (ANC)', price: 165000, oldPrice: 220000, stock: 20 },
    ],
    specs: [
      { labelUz: 'Bluetooth', labelRu: 'Bluetooth', valueUz: '5.3', valueRu: '5.3' },
      { labelUz: 'Ishlash vaqti', labelRu: 'Время работы', valueUz: '6 soat + 24 soat keys', valueRu: '6 ч + 24 ч с кейсом' },
      { labelUz: 'Suv himoyasi', labelRu: 'Защита от воды', valueUz: 'IPX4', valueRu: 'IPX4' },
      { labelUz: 'Mikrofon', labelRu: 'Микрофон', valueUz: 'Bor', valueRu: 'Есть' },
      { labelUz: 'Mosligi', labelRu: 'Совместимость', valueUz: 'iOS, Android', valueRu: 'iOS, Android' },
    ],
  },
  {
    slug: 'iphone-17-silikon-chexol',
    categorySlug: 'aksessuarlar',
    brand: 'Premium Case',
    titleUz: 'iPhone 17 silikon chexol (MagSafe)',
    titleRu: 'Силиконовый чехол для iPhone 17 (MagSafe)',
    descriptionUz:
      'Yumshoq, premium sifatli silikon chexol. MagSafe magnitlari bilan mos — simsiz zaryadlash bilan ishlaydi. Tushishlardan va chizilishlardan himoya. Yumshoq mikrofibra ichki qatlam.',
    descriptionRu:
      'Мягкий силиконовый чехол премиум-качества. Совместим с MagSafe — работает с беспроводной зарядкой. Защищает от падений и царапин. Мягкая подкладка из микрофибры.',
    basePrice: 95000,
    oldPrice: 150000,
    isFeatured: true,
    images: [
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQrF5XC4ry0bhDK-Rn0V6uJ6M71XEkwXQvvWA&s',
    ],
    variants: [
      { color: 'Qora', size: 'iPhone 17', price: 95000, oldPrice: 150000, stock: 35 },
      { color: 'Ko\'k', size: 'iPhone 17', price: 95000, oldPrice: 150000, stock: 25 },
      { color: 'Qizil', size: 'iPhone 17', price: 95000, oldPrice: 150000, stock: 20 },
      { color: 'Pushti', size: 'iPhone 17', price: 95000, oldPrice: 150000, stock: 18 },
      { color: 'Transparent', size: 'iPhone 17', price: 75000, stock: 40 },
    ],
    specs: [
      { labelUz: 'Material', labelRu: 'Материал', valueUz: 'Premium silikon', valueRu: 'Премиум силикон' },
      { labelUz: 'MagSafe', labelRu: 'MagSafe', valueUz: 'Ha', valueRu: 'Да' },
      { labelUz: 'Mosligi', labelRu: 'Совместимость', valueUz: 'iPhone 17', valueRu: 'iPhone 17' },
      { labelUz: 'Himoya', labelRu: 'Защита', valueUz: 'Tushish + chiziq', valueRu: 'От падений и царапин' },
    ],
  },
  {
    slug: 'samsung-s25-silikon-chexol',
    categorySlug: 'aksessuarlar',
    brand: 'Premium Case',
    titleUz: 'Samsung Galaxy S25 silikon chexol',
    titleRu: 'Силиконовый чехол для Samsung Galaxy S25',
    descriptionUz:
      'Galaxy S25 va S25+ uchun original o\'lchamdagi silikon chexol. Yumshoq tutuv, butun himoya. Kamera va portlar ochiq. Yumshoq mikrofibra ichki qatlam.',
    descriptionRu:
      'Силиконовый чехол точного размера для Galaxy S25 и S25+. Мягкая фактура, полная защита. Камера и порты открыты. Мягкая подкладка из микрофибры.',
    basePrice: 75000,
    oldPrice: 120000,
    images: [
      'https://frankfurt.apollo.olxcdn.com/v1/files/2m3cv28rpto61-UZ/image',
    ],
    variants: [
      { color: 'Qora', size: 'Galaxy S25', price: 75000, oldPrice: 120000, stock: 40 },
      { color: 'Ko\'k', size: 'Galaxy S25', price: 75000, oldPrice: 120000, stock: 25 },
      { color: 'Yashil', size: 'Galaxy S25', price: 75000, oldPrice: 120000, stock: 20 },
      { color: 'Transparent', size: 'Galaxy S25', price: 60000, stock: 50 },
      { color: 'Qora', size: 'Galaxy S25+', price: 85000, stock: 20 },
    ],
    specs: [
      { labelUz: 'Material', labelRu: 'Материал', valueUz: 'Premium silikon', valueRu: 'Премиум силикон' },
      { labelUz: 'Mosligi', labelRu: 'Совместимость', valueUz: 'Galaxy S25 / S25+', valueRu: 'Galaxy S25 / S25+' },
      { labelUz: 'Himoya', labelRu: 'Защита', valueUz: 'To\'liq + kamera', valueRu: 'Полная + камера' },
    ],
  },

  {
    slug: 'colgate-tish-pastasi-100ml',
    categorySlug: 'shaxsiy-parvarish',
    brand: 'Colgate',
    titleUz: 'Colgate Total tish pastasi, 100 ml',
    titleRu: 'Зубная паста Colgate Total, 100 мл',
    descriptionUz: 'Karies va qattig\'lashishga qarshi 12 soat himoya.',
    descriptionRu: '12-часовая защита от кариеса и зубного камня.',
    basePrice: 22000,
    oldPrice: 27000,
    images: [IMG.SOAP],
    variants: [{ size: '100 ml', price: 22000, oldPrice: 27000, stock: 80 }],
    specs: [{ labelUz: 'Hajmi', labelRu: 'Объём', valueUz: '100 ml', valueRu: '100 мл' }],
  },
];

// ============== RUNTIME ==============
async function main() {
  console.log('=== Reseed boshlandi (HAQIQIY supermarket katalogi) ===');

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

  // 0.1. Eshik / telefon / kiyim — hamma boshqa kategoriyalarni yashiramiz
  const hidden = await prisma.category.updateMany({
    where: { slug: { notIn: [...supermarketSlugs] }, isVisible: true },
    data: { isVisible: false },
  });
  if (hidden.count > 0) {
    console.log(`✓ ${hidden.count} ta eski kategoriya yashirildi`);
  }

  // 0.2. Yashirilgan kategoriyalardagi barcha mahsulotlarni deaktivlashtirish
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
      console.log(`✓ ${offCount.count} ta eski mahsulot deaktivlashtirildi`);
    }
  }

  // 1. Yangi slug ro'yxatida bo'lmagan eski mahsulotlarni ham deaktivlashtiramiz
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

    const existing = await prisma.product.findUnique({ where: { slug: p.slug } });

    if (existing) {
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
          images: { create: p.images.map((url, i) => ({ url, position: i })) },
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
          images: { create: p.images.map((url, i) => ({ url, position: i })) },
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
  console.log('\n=== Faol mahsulotlar bo\'yicha kategoriyalar ===');
  for (const s of stats) {
    const cat = categories.find((c) => c.id === s.categoryId);
    if (cat) console.log(`  ${cat.titleUz}: ${s._count} ta`);
  }

  console.log(`\n✅ Reseed tugadi — ${products.length} ta mahsulot, ${SUPERMARKET_CATEGORIES.length} ta kategoriya`);
  console.log('💡 Eslatma: reklama oldidan admin paneldan haqiqiy mahsulot rasmlarini yuklang');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
