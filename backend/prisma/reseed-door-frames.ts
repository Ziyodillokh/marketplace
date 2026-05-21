/**
 * Reseed: Eshik rom marketplace (v2).
 *
 *  • 5 ta kategoriya (MDF, Massiv, Metall, PVC, Aksessuarlar)
 *  • Har kategoriya uchun 6-8 ta mahsulot (variantlar, speclar bilan)
 *  • Brendlangan placeholder rasmlar (placehold.co) — har doim yuklanadi
 *  • Admin paneldan haqiqiy mahsulot rasmlarini yuklab almashtirib chiqing
 *  • Idempotent: doors_seed_v2 marker key bo'lsa, qayta ishlamaydi
 *
 *  Run:  npm run db:seed:doors
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SEED_MARKER_KEY = 'doors_seed_v2';

const DOOR_CATEGORY_SLUGS = [
  'door-frames-mdf',
  'door-frames-wood',
  'door-frames-metal',
  'door-frames-pvc',
  'door-accessories',
];

// Brendlangan placeholder. Har doim yuklanadi, kategoriya rangi + nom.
const ph = (color: string, text: string, w = 900, h = 600) =>
  `https://placehold.co/${w}x${h}/${color}/FFFFFF/png?text=${encodeURIComponent(text)}&font=roboto`;

// Kategoriya ranglari (Material Design palitrasidan)
const COLORS = {
  mdf: '8D6E63',       // brown 400
  wood: '5D4037',      // brown 700 (dark)
  metal: '455A64',     // blueGrey 700
  pvc: '90A4AE',       // blueGrey 300
  accessories: 'B8860B', // dark goldenrod
};

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

interface CategorySeed {
  slug: string;
  titleUz: string;
  titleRu: string;
  position: number;
  iconUrl: string;
  bannerUrl: string;
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

const categories: CategorySeed[] = [
  {
    slug: 'door-frames-mdf',
    titleUz: 'MDF eshik romlari',
    titleRu: 'МДФ дверные блоки',
    position: 1,
    iconUrl: ph(COLORS.mdf, 'MDF\nESHIK', 600, 400),
    bannerUrl: ph(COLORS.mdf, 'MDF ESHIK ROMLARI', 1200, 600),
  },
  {
    slug: 'door-frames-wood',
    titleUz: 'Massiv yog\'och eshiklar',
    titleRu: 'Двери из массива дерева',
    position: 2,
    iconUrl: ph(COLORS.wood, 'MASSIV\nYOG\'OCH', 600, 400),
    bannerUrl: ph(COLORS.wood, 'MASSIV YOG\'OCH ESHIKLAR', 1200, 600),
  },
  {
    slug: 'door-frames-metal',
    titleUz: 'Metall kirish eshiklari',
    titleRu: 'Металлические входные двери',
    position: 3,
    iconUrl: ph(COLORS.metal, 'METALL\nKIRISH', 600, 400),
    bannerUrl: ph(COLORS.metal, 'METALL KIRISH ESHIKLARI', 1200, 600),
  },
  {
    slug: 'door-frames-pvc',
    titleUz: 'PVC eshiklar',
    titleRu: 'ПВХ двери',
    position: 4,
    iconUrl: ph(COLORS.pvc, 'PVC\nESHIK', 600, 400),
    bannerUrl: ph(COLORS.pvc, 'PVC ESHIKLAR', 1200, 600),
  },
  {
    slug: 'door-accessories',
    titleUz: 'Eshik aksessuarlari',
    titleRu: 'Дверные аксессуары',
    position: 5,
    iconUrl: ph(COLORS.accessories, 'AKSESSUARLAR', 600, 400),
    bannerUrl: ph(COLORS.accessories, 'ESHIK AKSESSUARLARI', 1200, 600),
  },
];

// Helper — har bir product uchun 2 ta placeholder (front + side)
const pImg = (cat: keyof typeof COLORS, label: string) => [
  ph(COLORS[cat], label, 900, 1200),
  ph(COLORS[cat], `${label}\n(view 2)`, 900, 1200),
];

const products: ProductSeed[] = [
  // ============== MDF ESHIK ROMLARI (7) ==============
  {
    slug: 'mdf-door-classic-venge-2050x860',
    categorySlug: 'door-frames-mdf',
    brand: 'DoorStyle',
    titleUz: 'MDF eshik "Klassik" Venge 2050×860',
    titleRu: 'МДФ дверь "Классик" Венге 2050×860',
    descriptionUz:
      'Klassik dizayndagi MDF eshik. Komplektga eshik tabaqasi, rom va nalichnik kiradi. Namlikka chidamli ekoshpon qoplama. Yotoq xona va mehmonxona uchun mos.',
    descriptionRu:
      'МДФ дверь в классическом дизайне. В комплекте дверное полотно, коробка и наличники. Влагостойкое покрытие экошпон. Для спальни и гостиной.',
    basePrice: 950000,
    oldPrice: 1150000,
    isFeatured: true,
    images: pImg('mdf', 'MDF Klassik\nVenge'),
    variants: [
      { color: 'Venge', size: '2050×720', price: 920000, oldPrice: 1120000, stock: 8 },
      { color: 'Venge', size: '2050×860', price: 950000, oldPrice: 1150000, stock: 12 },
      { color: 'Venge', size: '2050×960', price: 990000, oldPrice: 1190000, stock: 7 },
      { color: 'Yong\'oq', size: '2050×860', price: 950000, oldPrice: 1150000, stock: 10 },
    ],
    specs: [
      { labelUz: 'Material', labelRu: 'Материал', valueUz: 'MDF + ekoshpon', valueRu: 'МДФ + экошпон' },
      { labelUz: 'Komplekt', labelRu: 'Комплект', valueUz: 'Tabaqa + rom + nalichnik', valueRu: 'Полотно + коробка + наличники' },
      { labelUz: 'Qalinligi', labelRu: 'Толщина', valueUz: '40 mm', valueRu: '40 мм' },
      { labelUz: 'Kafolat', labelRu: 'Гарантия', valueUz: '24 oy', valueRu: '24 мес' },
    ],
  },
  {
    slug: 'mdf-door-modern-white-2050x860',
    categorySlug: 'door-frames-mdf',
    brand: 'DoorStyle',
    titleUz: 'MDF eshik "Modern" Oq emal 2050×860',
    titleRu: 'МДФ дверь "Модерн" Белая эмаль 2050×860',
    descriptionUz:
      'Minimalist oq emal qoplamali MDF eshik. Yashirin petla, magnit qulf. Yorug\' va keng interyer uchun ideal.',
    descriptionRu:
      'Минималистичная МДФ дверь с покрытием белая эмаль. Скрытые петли, магнитный замок. Идеальна для светлого интерьера.',
    basePrice: 1150000,
    oldPrice: 1400000,
    isFeatured: true,
    images: pImg('mdf', 'MDF Modern\nOq emal'),
    variants: [
      { color: 'Oq emal', size: '2050×720', price: 1100000, oldPrice: 1350000, stock: 6 },
      { color: 'Oq emal', size: '2050×860', price: 1150000, oldPrice: 1400000, stock: 14 },
      { color: 'Oq emal', size: '2050×960', price: 1220000, oldPrice: 1450000, stock: 5 },
      { color: 'Kapuchino', size: '2050×860', price: 1180000, stock: 4 },
    ],
    specs: [
      { labelUz: 'Material', labelRu: 'Материал', valueUz: 'MDF + oq emal', valueRu: 'МДФ + белая эмаль' },
      { labelUz: 'Petla', labelRu: 'Петли', valueUz: 'Yashirin', valueRu: 'Скрытые' },
      { labelUz: 'Qulf', labelRu: 'Замок', valueUz: 'Magnit', valueRu: 'Магнитный' },
    ],
  },
  {
    slug: 'mdf-door-premium-oak-2050x960',
    categorySlug: 'door-frames-mdf',
    brand: 'EuroDoor',
    titleUz: 'MDF eshik "Premium" Eman shponi 2050×960',
    titleRu: 'МДФ дверь "Премиум" Шпон дуба 2050×960',
    descriptionUz:
      'Tabiiy eman shponi qoplamali premium MDF eshik. Sifatli furnitura komplekti bilan. Yuqori akustik izolyatsiya.',
    descriptionRu:
      'МДФ дверь с покрытием из натурального шпона дуба. Премиум фурнитура в комплекте. Высокая шумоизоляция.',
    basePrice: 1750000,
    oldPrice: 2100000,
    images: pImg('mdf', 'MDF Premium\nEman shponi'),
    variants: [
      { color: 'Eman tabiiy', size: '2050×860', price: 1720000, oldPrice: 2080000, stock: 5 },
      { color: 'Eman tabiiy', size: '2050×960', price: 1750000, oldPrice: 2100000, stock: 7 },
      { color: 'Eman tutash', size: '2050×960', price: 1780000, oldPrice: 2130000, stock: 4 },
    ],
    specs: [
      { labelUz: 'Material', labelRu: 'Материал', valueUz: 'MDF + tabiiy eman shponi', valueRu: 'МДФ + натуральный шпон дуба' },
      { labelUz: 'Akustik izolyatsiya', labelRu: 'Шумоизоляция', valueUz: '32 dB', valueRu: '32 дБ' },
      { labelUz: 'Furnitura', labelRu: 'Фурнитура', valueUz: 'Premium komplekt', valueRu: 'Премиум комплект' },
    ],
  },
  {
    slug: 'mdf-door-standard-walnut-2050x860',
    categorySlug: 'door-frames-mdf',
    brand: 'HomeDoor',
    titleUz: 'MDF eshik "Standart" Yong\'oq 2050×860',
    titleRu: 'МДФ дверь "Стандарт" Орех 2050×860',
    descriptionUz:
      'Iqtisodli MDF eshik. Oddiy va ishonchli. Ko\'p ijara kvartira va ofislar uchun mos. Komplektga rom va nalichnik kiradi.',
    descriptionRu:
      'Бюджетная МДФ дверь. Простая и надёжная. Подходит для квартир и офисов. В комплекте коробка и наличники.',
    basePrice: 750000,
    images: pImg('mdf', 'MDF Standart\nYong\'oq'),
    variants: [
      { color: 'Yong\'oq', size: '2050×720', price: 720000, stock: 18 },
      { color: 'Yong\'oq', size: '2050×860', price: 750000, stock: 22 },
      { color: 'Mil\'an yong\'og\'i', size: '2050×860', price: 770000, stock: 14 },
      { color: 'Beleniy dub', size: '2050×860', price: 770000, stock: 10 },
    ],
    specs: [
      { labelUz: 'Material', labelRu: 'Материал', valueUz: 'MDF + plyonka', valueRu: 'МДФ + плёнка' },
      { labelUz: 'Kafolat', labelRu: 'Гарантия', valueUz: '12 oy', valueRu: '12 мес' },
    ],
  },
  {
    slug: 'mdf-door-loft-cappuccino-2050x860',
    categorySlug: 'door-frames-mdf',
    brand: 'DoorStyle',
    titleUz: 'MDF eshik "Loft" Kapuchino 2050×860',
    titleRu: 'МДФ дверь "Лофт" Капучино 2050×860',
    descriptionUz:
      'Loft uslubidagi MDF eshik. Frezerlangan dizayn, qora metall vstavkalar. Industrial interyerlar uchun.',
    descriptionRu:
      'МДФ дверь в стиле лофт. Фрезерованный дизайн, чёрные металлические вставки. Для индустриального интерьера.',
    basePrice: 1050000,
    oldPrice: 1280000,
    images: pImg('mdf', 'MDF Loft\nKapuchino'),
    variants: [
      { color: 'Kapuchino', size: '2050×860', price: 1050000, oldPrice: 1280000, stock: 9 },
      { color: 'Kapuchino', size: '2050×960', price: 1100000, oldPrice: 1320000, stock: 6 },
      { color: 'Grafit', size: '2050×860', price: 1080000, oldPrice: 1300000, stock: 5 },
    ],
    specs: [
      { labelUz: 'Uslub', labelRu: 'Стиль', valueUz: 'Loft', valueRu: 'Лофт' },
      { labelUz: 'Material', labelRu: 'Материал', valueUz: 'MDF + plyonka + metall', valueRu: 'МДФ + плёнка + металл' },
    ],
  },
  {
    slug: 'mdf-door-italian-belyi-dub-2050x860',
    categorySlug: 'door-frames-mdf',
    brand: 'EuroDoor',
    titleUz: 'MDF eshik "Italyan" Beleniy dub 2050×860',
    titleRu: 'МДФ дверь "Итальянская" Беленый дуб 2050×860',
    descriptionUz:
      'Italyan dizaynlari asosida ishlangan MDF eshik. 3D frezerlash, premium furnitura. Yorug\' beleniy dub rangi.',
    descriptionRu:
      'МДФ дверь по итальянскому дизайну. 3D фрезеровка, премиум фурнитура. Светлый беленый дуб.',
    basePrice: 1320000,
    oldPrice: 1580000,
    isFeatured: true,
    images: pImg('mdf', 'MDF Italyan\nBeleniy dub'),
    variants: [
      { color: 'Beleniy dub', size: '2050×860', price: 1320000, oldPrice: 1580000, stock: 8 },
      { color: 'Beleniy dub', size: '2050×960', price: 1380000, oldPrice: 1650000, stock: 6 },
      { color: 'Sonoma dub', size: '2050×860', price: 1320000, oldPrice: 1580000, stock: 5 },
    ],
    specs: [
      { labelUz: 'Frezerlash', labelRu: 'Фрезеровка', valueUz: '3D dizayn', valueRu: '3D дизайн' },
      { labelUz: 'Material', labelRu: 'Материал', valueUz: 'MDF + ekoshpon', valueRu: 'МДФ + экошпон' },
    ],
  },
  {
    slug: 'mdf-door-eco-walnut-2050x720',
    categorySlug: 'door-frames-mdf',
    brand: 'HomeDoor',
    titleUz: 'MDF eshik "Eco" Mil\'an yong\'og\'i 2050×720',
    titleRu: 'МДФ дверь "Эко" Миланский орех 2050×720',
    descriptionUz:
      'Eng iqtisodli variant. Tor o\'rinlar uchun. Hojatxona, omborcha eshiklari.',
    descriptionRu:
      'Самый бюджетный вариант. Для узких проёмов. Двери в санузел, кладовку.',
    basePrice: 690000,
    images: pImg('mdf', 'MDF Eco\nMil\'an y.'),
    variants: [
      { color: 'Mil\'an yong\'og\'i', size: '2050×600', price: 670000, stock: 12 },
      { color: 'Mil\'an yong\'og\'i', size: '2050×720', price: 690000, stock: 20 },
      { color: 'Mil\'an yong\'og\'i', size: '2050×800', price: 720000, stock: 15 },
    ],
    specs: [
      { labelUz: 'Material', labelRu: 'Материал', valueUz: 'MDF + plyonka', valueRu: 'МДФ + плёнка' },
      { labelUz: 'Maqsad', labelRu: 'Назначение', valueUz: 'Hojatxona/Ombor', valueRu: 'Санузел/Кладовка' },
    ],
  },

  // ============== MASSIV YOG'OCH ESHIKLAR (6) ==============
  {
    slug: 'wood-door-walnut-lux-2050x860',
    categorySlug: 'door-frames-wood',
    brand: 'WoodMaster',
    titleUz: 'Massiv yong\'oq eshik "Lux" 2050×860',
    titleRu: 'Дверь из массива ореха "Люкс" 2050×860',
    descriptionUz:
      '100% massiv yong\'oq daraxtidan tayyorlangan eshik. Qo\'lda o\'yib bezatilgan. Premium klass interyer uchun.',
    descriptionRu:
      'Дверь из 100% массива ореха. Ручная резьба. Для интерьеров премиум-класса.',
    basePrice: 4500000,
    oldPrice: 5200000,
    isFeatured: true,
    images: pImg('wood', 'Massiv\nYong\'oq Lux'),
    variants: [
      { color: 'Tabiiy yong\'oq', size: '2050×860', price: 4500000, oldPrice: 5200000, stock: 4 },
      { color: 'Tabiiy yong\'oq', size: '2050×960', price: 4750000, oldPrice: 5400000, stock: 3 },
      { color: 'Tutash yong\'oq', size: '2050×860', price: 4650000, oldPrice: 5300000, stock: 2 },
    ],
    specs: [
      { labelUz: 'Material', labelRu: 'Материал', valueUz: '100% massiv yong\'oq', valueRu: '100% массив ореха' },
      { labelUz: 'Bezak', labelRu: 'Декор', valueUz: 'Qo\'lda o\'yilgan', valueRu: 'Ручная резьба' },
      { labelUz: 'Qalinligi', labelRu: 'Толщина', valueUz: '45 mm', valueRu: '45 мм' },
      { labelUz: 'Kafolat', labelRu: 'Гарантия', valueUz: '5 yil', valueRu: '5 лет' },
    ],
  },
  {
    slug: 'wood-door-oak-premium-2050x960',
    categorySlug: 'door-frames-wood',
    brand: 'WoodMaster',
    titleUz: 'Massiv eman eshik "Premium" 2050×960',
    titleRu: 'Дверь из массива дуба "Премиум" 2050×960',
    descriptionUz:
      'Tabiiy eman daraxtidan. Antiseptik va laklash bilan ishlangan. Eng yuqori chidamlilik va estetik ko\'rinish.',
    descriptionRu:
      'Из натурального массива дуба. Антисептик и лакирование. Максимальная прочность и эстетика.',
    basePrice: 5800000,
    images: pImg('wood', 'Massiv Eman\nPremium'),
    variants: [
      { color: 'Tabiiy eman', size: '2050×860', price: 5650000, stock: 3 },
      { color: 'Tabiiy eman', size: '2050×960', price: 5800000, stock: 4 },
      { color: 'Kuydirilgan eman', size: '2050×960', price: 6100000, stock: 2 },
    ],
    specs: [
      { labelUz: 'Material', labelRu: 'Материал', valueUz: 'Massiv eman', valueRu: 'Массив дуба' },
      { labelUz: 'Qoplama', labelRu: 'Покрытие', valueUz: 'Lak (UV chidamli)', valueRu: 'Лак (UV-стойкий)' },
    ],
  },
  {
    slug: 'wood-door-pine-classic-2050x860',
    categorySlug: 'door-frames-wood',
    brand: 'TerraWood',
    titleUz: 'Massiv qarag\'ay eshik "Klassik" 2050×860',
    titleRu: 'Дверь из массива сосны "Классик" 2050×860',
    descriptionUz:
      'Tabiiy qarag\'ay daraxtidan klassik eshik. Yengil, hidi yoqimli. Hammom va sauna uchun ham mos (qo\'shimcha ishlov bilan).',
    descriptionRu:
      'Классическая дверь из массива сосны. Лёгкая, с приятным ароматом. Подходит даже для бани.',
    basePrice: 2800000,
    oldPrice: 3300000,
    images: pImg('wood', 'Massiv\nQarag\'ay'),
    variants: [
      { color: 'Tabiiy qarag\'ay', size: '2050×720', price: 2700000, oldPrice: 3200000, stock: 6 },
      { color: 'Tabiiy qarag\'ay', size: '2050×860', price: 2800000, oldPrice: 3300000, stock: 8 },
      { color: 'Toza laklangan', size: '2050×860', price: 2950000, oldPrice: 3450000, stock: 5 },
    ],
    specs: [
      { labelUz: 'Material', labelRu: 'Материал', valueUz: 'Massiv qarag\'ay', valueRu: 'Массив сосны' },
      { labelUz: 'Vazni', labelRu: 'Вес', valueUz: '~28 kg', valueRu: '~28 кг' },
    ],
  },
  {
    slug: 'wood-door-walnut-double-2050x1500',
    categorySlug: 'door-frames-wood',
    brand: 'WoodMaster',
    titleUz: 'Massiv yong\'oq ikki tabaqali 2050×1500',
    titleRu: 'Двустворчатая из массива ореха 2050×1500',
    descriptionUz:
      'Ikki tabaqali keng eshik. Mehmonxona, restoran, ofis kirishlari uchun. Premium furnitura komplektida.',
    descriptionRu:
      'Двустворчатая широкая дверь. Для гостиных, ресторанов, офисов. Премиум фурнитура в комплекте.',
    basePrice: 8500000,
    oldPrice: 9800000,
    images: pImg('wood', 'Yong\'oq\nIkki tabaqali'),
    variants: [
      { color: 'Tabiiy yong\'oq', size: '2050×1500', price: 8500000, oldPrice: 9800000, stock: 2 },
      { color: 'Tabiiy yong\'oq', size: '2300×1600', price: 9300000, oldPrice: 10500000, stock: 1 },
    ],
    specs: [
      { labelUz: 'Tip', labelRu: 'Тип', valueUz: 'Ikki tabaqali', valueRu: 'Двустворчатая' },
      { labelUz: 'Material', labelRu: 'Материал', valueUz: 'Massiv yong\'oq', valueRu: 'Массив ореха' },
    ],
  },
  {
    slug: 'wood-door-oak-carved-classic-2050x860',
    categorySlug: 'door-frames-wood',
    brand: 'WoodMaster',
    titleUz: 'Massiv eman "Klassik" o\'yilgan 2050×860',
    titleRu: 'Массив дуба "Классик" с резьбой 2050×860',
    descriptionUz:
      'Qo\'lda o\'yib bezatilgan klassik massiv eman eshik. Antikvar uslubdagi villalar uchun.',
    descriptionRu:
      'Резная классическая дверь из массива дуба. Для антикварных вилл.',
    basePrice: 6500000,
    isFeatured: true,
    images: pImg('wood', 'Eman O\'yilgan\nKlassik'),
    variants: [
      { color: 'Tabiiy eman', size: '2050×860', price: 6500000, stock: 2 },
      { color: 'Antik patina', size: '2050×960', price: 7100000, stock: 1 },
    ],
    specs: [
      { labelUz: 'Bezak', labelRu: 'Декор', valueUz: 'Qo\'lda o\'yilgan', valueRu: 'Ручная резьба' },
      { labelUz: 'Material', labelRu: 'Материал', valueUz: 'Massiv eman', valueRu: 'Массив дуба' },
    ],
  },
  {
    slug: 'wood-door-pine-eco-2050x800',
    categorySlug: 'door-frames-wood',
    brand: 'TerraWood',
    titleUz: 'Massiv qarag\'ay "Eco" laklangan 2050×800',
    titleRu: 'Массив сосны "Эко" лакированный 2050×800',
    descriptionUz:
      'Iqtisodli massiv qarag\'ay eshik. Eko-lak qoplama, daraxt strukturasi ko\'rinib turadi.',
    descriptionRu:
      'Бюджетная дверь из массива сосны. Эко-лак, видна структура дерева.',
    basePrice: 2300000,
    oldPrice: 2700000,
    images: pImg('wood', 'Qarag\'ay\nEco'),
    variants: [
      { color: 'Tabiiy qarag\'ay', size: '2050×720', price: 2200000, oldPrice: 2600000, stock: 7 },
      { color: 'Tabiiy qarag\'ay', size: '2050×800', price: 2300000, oldPrice: 2700000, stock: 9 },
      { color: 'Tabiiy qarag\'ay', size: '2050×860', price: 2400000, oldPrice: 2800000, stock: 6 },
    ],
    specs: [
      { labelUz: 'Qoplama', labelRu: 'Покрытие', valueUz: 'Eko-lak', valueRu: 'Эко-лак' },
      { labelUz: 'Material', labelRu: 'Материал', valueUz: 'Massiv qarag\'ay', valueRu: 'Массив сосны' },
    ],
  },

  // ============== METALL KIRISH ESHIKLARI (7) ==============
  {
    slug: 'metal-door-standard-2050x860',
    categorySlug: 'door-frames-metal',
    brand: 'SteelGuard',
    titleUz: 'Metall kirish eshigi "Standart" 2050×860',
    titleRu: 'Металлическая входная дверь "Стандарт" 2050×860',
    descriptionUz:
      'Po\'lat list 1.5 mm. Ichki MDF panel. Ikki qulf, ko\'zoynak. Kvartira kirishi uchun.',
    descriptionRu:
      'Стальной лист 1.5 мм. Внутренняя МДФ панель. Два замка, глазок. Для входа в квартиру.',
    basePrice: 1950000,
    oldPrice: 2300000,
    images: pImg('metal', 'Metall\nStandart'),
    variants: [
      { color: 'Venge', size: '2050×860', price: 1950000, oldPrice: 2300000, stock: 6 },
      { color: 'Yong\'oq', size: '2050×860', price: 1950000, oldPrice: 2300000, stock: 7 },
      { color: 'Eman', size: '2050×960', price: 2050000, oldPrice: 2400000, stock: 4 },
    ],
    specs: [
      { labelUz: 'Po\'lat qalinligi', labelRu: 'Толщина стали', valueUz: '1.5 mm', valueRu: '1.5 мм' },
      { labelUz: 'Qulflar', labelRu: 'Замки', valueUz: '2 ta', valueRu: '2 шт' },
      { labelUz: 'Ko\'zoynak', labelRu: 'Глазок', valueUz: 'Bor', valueRu: 'Есть' },
    ],
  },
  {
    slug: 'metal-door-premium-thermo-2050x960',
    categorySlug: 'door-frames-metal',
    brand: 'TermoSteel',
    titleUz: 'Metall eshik "Premium" termo izolyatsiyali',
    titleRu: 'Металлическая дверь "Премиум" с термоизоляцией',
    descriptionUz:
      'Po\'lat 2 mm + termo to\'ldirgich. Xususiy uy va xonadon uchun. Issiqlik chiqarmaydi, sovuq kirishidan saqlaydi.',
    descriptionRu:
      'Сталь 2 мм + термонаполнитель. Для частного дома и квартиры. Сохраняет тепло.',
    basePrice: 3500000,
    oldPrice: 4100000,
    isFeatured: true,
    images: pImg('metal', 'Metall\nPremium Termo'),
    variants: [
      { color: 'Venge / Oq', size: '2050×860', price: 3500000, oldPrice: 4100000, stock: 4 },
      { color: 'Eman / Oq', size: '2050×960', price: 3650000, oldPrice: 4250000, stock: 5 },
      { color: 'Yong\'oq / Yong\'oq', size: '2050×960', price: 3700000, oldPrice: 4300000, stock: 3 },
    ],
    specs: [
      { labelUz: 'Po\'lat qalinligi', labelRu: 'Толщина стали', valueUz: '2 mm', valueRu: '2 мм' },
      { labelUz: 'Termo izolyatsiya', labelRu: 'Термоизоляция', valueUz: '60 mm pena', valueRu: '60 мм пена' },
      { labelUz: 'Qulflar', labelRu: 'Замки', valueUz: '2 ta', valueRu: '2 шт' },
    ],
  },
  {
    slug: 'metal-door-bronedver-elite',
    categorySlug: 'door-frames-metal',
    brand: 'FortGuard',
    titleUz: 'Bronedver "Elite" — zirhli kirish eshigi',
    titleRu: 'Бронедверь "Элит" — бронированная входная',
    descriptionUz:
      'Maksimal himoya darajasi. Po\'lat 3 mm + qattiqlashtirilgan reb. 3 ta qulf (smart-qulf kiritilgan).',
    descriptionRu:
      'Максимальный уровень защиты. Сталь 3 мм + усиленные рёбра. 3 замка (включая smart).',
    basePrice: 4500000,
    oldPrice: 5200000,
    images: pImg('metal', 'Bronedver\nElite'),
    variants: [
      { color: 'Eman venge', size: '2050×960', price: 4500000, oldPrice: 5200000, stock: 3 },
      { color: 'Eman shokoladli', size: '2050×960', price: 4600000, oldPrice: 5300000, stock: 2 },
      { color: 'Oq emal', size: '2050×860', price: 4500000, oldPrice: 5200000, stock: 2 },
    ],
    specs: [
      { labelUz: 'Po\'lat qalinligi', labelRu: 'Толщина стали', valueUz: '3 mm', valueRu: '3 мм' },
      { labelUz: 'Qulflar', labelRu: 'Замки', valueUz: '3 ta + smart', valueRu: '3 шт + smart' },
      { labelUz: 'Burglar himoya', labelRu: 'Взломостойкость', valueUz: 'IV daraja', valueRu: 'IV класс' },
    ],
  },
  {
    slug: 'metal-door-economy-2050x860',
    categorySlug: 'door-frames-metal',
    brand: 'EcoSteel',
    titleUz: 'Metall eshik "Economy" 2050×860',
    titleRu: 'Металлическая дверь "Эконом" 2050×860',
    descriptionUz:
      'Iqtisodli variant. Po\'lat list 1.2 mm. Bitta qulf. Texnik xonalar, omborlar, dacha uchun.',
    descriptionRu:
      'Бюджетный вариант. Сталь 1.2 мм. Один замок. Для технических помещений, складов, дач.',
    basePrice: 1250000,
    images: pImg('metal', 'Metall\nEconomy'),
    variants: [
      { color: 'Qora', size: '2050×860', price: 1250000, stock: 12 },
      { color: 'Jigarrang', size: '2050×860', price: 1250000, stock: 9 },
      { color: 'Qora', size: '2050×960', price: 1320000, stock: 6 },
    ],
    specs: [
      { labelUz: 'Po\'lat qalinligi', labelRu: 'Толщина стали', valueUz: '1.2 mm', valueRu: '1.2 мм' },
      { labelUz: 'Qulflar', labelRu: 'Замки', valueUz: '1 ta', valueRu: '1 шт' },
    ],
  },
  {
    slug: 'metal-door-loft-black-2050x860',
    categorySlug: 'door-frames-metal',
    brand: 'SteelGuard',
    titleUz: 'Metall eshik "Loft" qora 2050×860',
    titleRu: 'Металлическая дверь "Лофт" чёрная 2050×860',
    descriptionUz:
      'Loft uslubidagi qora metall eshik. Mat qoplama. Zamonaviy interyer uchun ideal.',
    descriptionRu:
      'Чёрная металлическая дверь в стиле лофт. Матовое покрытие. Идеальна для современного интерьера.',
    basePrice: 2650000,
    oldPrice: 3100000,
    images: pImg('metal', 'Metall\nLoft Qora'),
    variants: [
      { color: 'Qora mat', size: '2050×860', price: 2650000, oldPrice: 3100000, stock: 5 },
      { color: 'Qora mat', size: '2050×960', price: 2750000, oldPrice: 3200000, stock: 4 },
      { color: 'Grafit', size: '2050×860', price: 2700000, oldPrice: 3150000, stock: 3 },
    ],
    specs: [
      { labelUz: 'Uslub', labelRu: 'Стиль', valueUz: 'Loft', valueRu: 'Лофт' },
      { labelUz: 'Po\'lat qalinligi', labelRu: 'Толщина стали', valueUz: '1.8 mm', valueRu: '1.8 мм' },
    ],
  },
  {
    slug: 'metal-door-china-classic-2050x960',
    categorySlug: 'door-frames-metal',
    brand: 'ChinaSteel',
    titleUz: 'Metall eshik "China" Klassik 2050×960',
    titleRu: 'Металлическая дверь "Китайская" Классик',
    descriptionUz:
      'Xitoy ishlab chiqaruvchidan iqtisodli metall eshik. Ikki MDF panel, klassik furnitura.',
    descriptionRu:
      'Бюджетная металлическая дверь из Китая. Две МДФ панели, классическая фурнитура.',
    basePrice: 2200000,
    oldPrice: 2550000,
    images: pImg('metal', 'Metall\nChina'),
    variants: [
      { color: 'Yong\'oq / Yong\'oq', size: '2050×860', price: 2150000, oldPrice: 2500000, stock: 8 },
      { color: 'Venge / Oq', size: '2050×960', price: 2200000, oldPrice: 2550000, stock: 10 },
      { color: 'Eman / Eman', size: '2050×960', price: 2250000, oldPrice: 2600000, stock: 6 },
    ],
    specs: [
      { labelUz: 'Po\'lat qalinligi', labelRu: 'Толщина стали', valueUz: '1.5 mm', valueRu: '1.5 мм' },
      { labelUz: 'Panellar', labelRu: 'Панели', valueUz: '2 ta MDF', valueRu: '2 МДФ' },
    ],
  },
  {
    slug: 'metal-door-smart-electronic-lock',
    categorySlug: 'door-frames-metal',
    brand: 'TermoSteel',
    titleUz: 'Metall eshik "Smart" elektron qulf bilan',
    titleRu: 'Металлическая дверь "Smart" с электронным замком',
    descriptionUz:
      'Zamonaviy biometrik elektron qulf (barmoq izi + kalit kodi + Wi-Fi). Smart uy tizimi bilan integratsiya.',
    descriptionRu:
      'Современный биометрический замок (отпечаток + код + Wi-Fi). Интеграция со smart home.',
    basePrice: 5200000,
    oldPrice: 6000000,
    isFeatured: true,
    images: pImg('metal', 'Metall Smart\n+ E-qulf'),
    variants: [
      { color: 'Eman venge', size: '2050×960', price: 5200000, oldPrice: 6000000, stock: 3 },
      { color: 'Oq emal', size: '2050×960', price: 5300000, oldPrice: 6100000, stock: 2 },
    ],
    specs: [
      { labelUz: 'Qulf', labelRu: 'Замок', valueUz: 'Elektron biometrik', valueRu: 'Электронный биометрический' },
      { labelUz: 'Boshqaruv', labelRu: 'Управление', valueUz: 'Wi-Fi + barmoq + kod', valueRu: 'Wi-Fi + отпечаток + код' },
    ],
  },

  // ============== PVC ESHIKLAR (6) ==============
  {
    slug: 'pvc-door-standard-bathroom',
    categorySlug: 'door-frames-pvc',
    brand: 'PlastDoor',
    titleUz: 'PVC eshik "Standart" hojatxona uchun',
    titleRu: 'ПВХ дверь "Стандарт" для санузла',
    descriptionUz:
      'Hojatxona va vanna xonalari uchun ideal. Namlikka 100% chidamli. Yengil, parvarish qilish oson.',
    descriptionRu:
      'Идеальна для санузла и ванной. 100% влагостойкая. Лёгкая, простая в уходе.',
    basePrice: 450000,
    oldPrice: 580000,
    images: pImg('pvc', 'PVC Standart\nHojatxona'),
    variants: [
      { color: 'Oq', size: '2000×600', price: 430000, oldPrice: 560000, stock: 20 },
      { color: 'Oq', size: '2000×700', price: 450000, oldPrice: 580000, stock: 25 },
      { color: 'Bej', size: '2000×700', price: 460000, oldPrice: 590000, stock: 15 },
      { color: 'Oq mat', size: '2000×800', price: 480000, oldPrice: 610000, stock: 10 },
    ],
    specs: [
      { labelUz: 'Material', labelRu: 'Материал', valueUz: 'PVC profil', valueRu: 'ПВХ профиль' },
      { labelUz: 'Namlikka chidamli', labelRu: 'Влагостойкость', valueUz: '100%', valueRu: '100%' },
    ],
  },
  {
    slug: 'pvc-door-lux-frosted-glass',
    categorySlug: 'door-frames-pvc',
    brand: 'PlastDoor',
    titleUz: 'PVC eshik "Lux" matshyali shisha bilan',
    titleRu: 'ПВХ дверь "Люкс" с матовым стеклом',
    descriptionUz:
      'Matshyali shisha vstavkasi. Yorug\'lik o\'tkazadi, lekin ko\'rinishni yashiradi. Hammom yoki garderobxona uchun.',
    descriptionRu:
      'Со вставкой из матового стекла. Пропускает свет, скрывает обзор.',
    basePrice: 750000,
    isFeatured: true,
    images: pImg('pvc', 'PVC Lux\nMatshyali'),
    variants: [
      { color: 'Oq', size: '2000×700', price: 730000, stock: 12 },
      { color: 'Oq', size: '2000×800', price: 750000, stock: 14 },
      { color: 'Yong\'oq', size: '2000×800', price: 780000, stock: 9 },
    ],
    specs: [
      { labelUz: 'Shisha', labelRu: 'Стекло', valueUz: 'Matshyali (frosted)', valueRu: 'Матовое (frosted)' },
      { labelUz: 'Material', labelRu: 'Материал', valueUz: 'PVC', valueRu: 'ПВХ' },
    ],
  },
  {
    slug: 'pvc-door-premium-blinds',
    categorySlug: 'door-frames-pvc',
    brand: 'PlastDoor',
    titleUz: 'PVC eshik "Premium" jaluzili',
    titleRu: 'ПВХ дверь "Премиум" с жалюзи',
    descriptionUz:
      'O\'rnatilgan jaluzili PVC eshik. Yorug\'lik va shamollatish boshqaruvi. Hammom va saunalar uchun ideal.',
    descriptionRu:
      'ПВХ дверь со встроенными жалюзи. Контроль света и вентиляции.',
    basePrice: 950000,
    images: pImg('pvc', 'PVC Premium\nJaluzili'),
    variants: [
      { color: 'Oq', size: '2000×700', price: 920000, stock: 6 },
      { color: 'Oq', size: '2000×800', price: 950000, stock: 8 },
      { color: 'Bej', size: '2000×800', price: 980000, stock: 5 },
    ],
    specs: [
      { labelUz: 'Jaluzi', labelRu: 'Жалюзи', valueUz: 'O\'rnatilgan, sozlanadi', valueRu: 'Встроенные, регулируемые' },
    ],
  },
  {
    slug: 'pvc-door-mini-580x2000',
    categorySlug: 'door-frames-pvc',
    brand: 'EconoPlast',
    titleUz: 'PVC eshik "Mini" 2000×580',
    titleRu: 'ПВХ дверь "Мини" 2000×580',
    descriptionUz:
      'Tor o\'rinlar uchun mini PVC eshik. Kichik hojatxonalar, omborchalar uchun.',
    descriptionRu:
      'Мини ПВХ дверь для узких проёмов. Маленькие санузлы, кладовые.',
    basePrice: 380000,
    images: pImg('pvc', 'PVC Mini\n580×2000'),
    variants: [
      { color: 'Oq', size: '2000×580', price: 380000, stock: 18 },
      { color: 'Bej', size: '2000×580', price: 390000, stock: 12 },
    ],
    specs: [
      { labelUz: 'Material', labelRu: 'Материал', valueUz: 'PVC', valueRu: 'ПВХ' },
    ],
  },
  {
    slug: 'pvc-door-maxi-900x2000',
    categorySlug: 'door-frames-pvc',
    brand: 'PlastDoor',
    titleUz: 'PVC eshik "Maxi" 2000×900',
    titleRu: 'ПВХ дверь "Макси" 2000×900',
    descriptionUz:
      'Keng PVC eshik. Katta vanna xonalar va saunalar uchun.',
    descriptionRu:
      'Широкая ПВХ дверь. Для больших ванных и саун.',
    basePrice: 620000,
    images: pImg('pvc', 'PVC Maxi\n900×2000'),
    variants: [
      { color: 'Oq', size: '2000×900', price: 620000, stock: 10 },
      { color: 'Bej', size: '2000×900', price: 640000, stock: 7 },
    ],
    specs: [
      { labelUz: 'Material', labelRu: 'Материал', valueUz: 'PVC profil', valueRu: 'ПВХ профиль' },
      { labelUz: 'Maqsad', labelRu: 'Назначение', valueUz: 'Katta xonalar', valueRu: 'Большие помещения' },
    ],
  },
  {
    slug: 'pvc-door-eco-bamboo-design',
    categorySlug: 'door-frames-pvc',
    brand: 'PlastDoor',
    titleUz: 'PVC eshik "Eco" bambuk dizayni',
    titleRu: 'ПВХ дверь "Эко" с дизайном бамбук',
    descriptionUz:
      'Bambuk struktura imitatsiyasidagi PVC eshik. Eko-uslubdagi interyer uchun.',
    descriptionRu:
      'ПВХ дверь с имитацией бамбука. Для эко-интерьеров.',
    basePrice: 720000,
    images: pImg('pvc', 'PVC Eco\nBambuk'),
    variants: [
      { color: 'Bambuk', size: '2000×700', price: 700000, stock: 8 },
      { color: 'Bambuk', size: '2000×800', price: 720000, stock: 9 },
    ],
    specs: [
      { labelUz: 'Dizayn', labelRu: 'Дизайн', valueUz: 'Bambuk imitatsiyasi', valueRu: 'Имитация бамбука' },
      { labelUz: 'Material', labelRu: 'Материал', valueUz: 'PVC profil', valueRu: 'ПВХ профиль' },
    ],
  },

  // ============== ESHIK AKSESSUARLARI (8) ==============
  {
    slug: 'door-handle-chrome-classic',
    categorySlug: 'door-accessories',
    brand: 'Apecs',
    titleUz: 'Eshik dastagi — xrom, klassik',
    titleRu: 'Дверная ручка — хром, классика',
    descriptionUz:
      'Sifatli xrom qoplamali eshik dastagi. Universal o\'rnatish. Lock-mexanizmi bilan birga ishlatish mumkin.',
    descriptionRu:
      'Качественная хромированная дверная ручка. Универсальное крепление.',
    basePrice: 180000,
    oldPrice: 220000,
    images: pImg('accessories', 'Dastagi\nXrom'),
    variants: [
      { color: 'Xrom yaltiroq', price: 180000, oldPrice: 220000, stock: 35 },
      { color: 'Xrom mat', price: 185000, oldPrice: 225000, stock: 28 },
      { color: 'Bronze antik', price: 210000, stock: 18 },
      { color: 'Qora mat', price: 220000, stock: 22 },
    ],
    specs: [
      { labelUz: 'Material', labelRu: 'Материал', valueUz: 'Sink + xrom qoplama', valueRu: 'Цинк + хром' },
      { labelUz: 'Tip', labelRu: 'Тип', valueUz: 'Falevaya', valueRu: 'Фалевая' },
    ],
  },
  {
    slug: 'door-lock-magnetic-apecs',
    categorySlug: 'door-accessories',
    brand: 'Apecs',
    titleUz: 'Magnit eshik qulfi (Apecs)',
    titleRu: 'Магнитный дверной замок (Apecs)',
    descriptionUz:
      'Tovushsiz magnit qulf. Sertifikatlangan Apecs brendi. Bolalar xonasi va yotoq xona uchun ideal.',
    descriptionRu:
      'Бесшумный магнитный замок. Сертифицированный Apecs.',
    basePrice: 350000,
    images: pImg('accessories', 'Qulf\nMagnit Apecs'),
    variants: [
      { color: 'Xrom', price: 350000, stock: 20 },
      { color: 'Bronze', price: 370000, stock: 12 },
    ],
    specs: [
      { labelUz: 'Tip', labelRu: 'Тип', valueUz: 'Magnit, tovushsiz', valueRu: 'Магнитный, бесшумный' },
      { labelUz: 'Brand', labelRu: 'Бренд', valueUz: 'Apecs', valueRu: 'Apecs' },
    ],
  },
  {
    slug: 'door-hinges-set-3pcs',
    categorySlug: 'door-accessories',
    brand: 'Apecs',
    titleUz: 'Eshik petlasi — 3 dona to\'plam',
    titleRu: 'Дверные петли — комплект 3 шт',
    descriptionUz:
      'Sifatli zanglamas po\'lat petlalar. 100×70 o\'lcham. Ichki eshiklar uchun ideal.',
    descriptionRu:
      'Качественные петли из нержавеющей стали. Размер 100×70.',
    basePrice: 95000,
    images: pImg('accessories', 'Petla\n3 dona'),
    variants: [
      { color: 'Xrom', size: '100×70', price: 95000, stock: 60 },
      { color: 'Bronze', size: '100×70', price: 110000, stock: 35 },
      { color: 'Yashirin', size: '100×70', price: 280000, stock: 15 },
    ],
    specs: [
      { labelUz: 'Material', labelRu: 'Материал', valueUz: 'Zanglamas po\'lat', valueRu: 'Нержавеющая сталь' },
      { labelUz: 'Soni', labelRu: 'Количество', valueUz: '3 dona', valueRu: '3 шт' },
    ],
  },
  {
    slug: 'door-trim-set-5m',
    categorySlug: 'door-accessories',
    brand: 'DoorStyle',
    titleUz: 'Nalichnik to\'plami (5 metr)',
    titleRu: 'Комплект наличников (5 метров)',
    descriptionUz:
      'MDF nalichnik to\'plami. Eshik atrofini bezash uchun. Eshik rangiga moslab tanlash mumkin.',
    descriptionRu:
      'Комплект МДФ наличников. Подбирается в цвет двери.',
    basePrice: 250000,
    images: pImg('accessories', 'Nalichnik\n5 metr'),
    variants: [
      { color: 'Venge', size: '70mm × 5m', price: 250000, stock: 30 },
      { color: 'Yong\'oq', size: '70mm × 5m', price: 250000, stock: 25 },
      { color: 'Oq emal', size: '70mm × 5m', price: 270000, stock: 20 },
      { color: 'Eman', size: '80mm × 5m', price: 295000, stock: 15 },
    ],
    specs: [
      { labelUz: 'Material', labelRu: 'Материал', valueUz: 'MDF + ekoshpon', valueRu: 'МДФ + экошпон' },
      { labelUz: 'Uzunligi', labelRu: 'Длина', valueUz: '5 metr', valueRu: '5 м' },
    ],
  },
  {
    slug: 'door-extender-dobor-100mm',
    categorySlug: 'door-accessories',
    brand: 'DoorStyle',
    titleUz: 'Dobor (kengaytirgich) 100 mm',
    titleRu: 'Доборная планка 100 мм',
    descriptionUz:
      'Devor qalin bo\'lgan joylarda rom kengaytirish uchun. MDF + ekoshpon.',
    descriptionRu:
      'Для расширения коробки при толстых стенах. МДФ + экошпон.',
    basePrice: 180000,
    images: pImg('accessories', 'Dobor\n100mm'),
    variants: [
      { color: 'Venge', size: '100×2070 mm', price: 180000, stock: 40 },
      { color: 'Yong\'oq', size: '100×2070 mm', price: 180000, stock: 35 },
      { color: 'Oq emal', size: '100×2070 mm', price: 195000, stock: 22 },
      { color: 'Venge', size: '150×2070 mm', price: 230000, stock: 15 },
    ],
    specs: [
      { labelUz: 'Material', labelRu: 'Материал', valueUz: 'MDF + ekoshpon', valueRu: 'МДФ + экошпон' },
      { labelUz: 'Uzunligi', labelRu: 'Длина', valueUz: '2070 mm', valueRu: '2070 мм' },
    ],
  },
  {
    slug: 'door-threshold-strip',
    categorySlug: 'door-accessories',
    brand: 'DoorStyle',
    titleUz: 'Eshik porogi (chiziqlovchi planka)',
    titleRu: 'Дверной порог (соединительная планка)',
    descriptionUz:
      'Pol qoplama uchrashuvini yashiradigan porog. Alyumin yoki MDF. Stiluzliklarni o\'zgartirish uchun.',
    descriptionRu:
      'Порог для скрытия стыка напольных покрытий. Алюминий или МДФ.',
    basePrice: 120000,
    images: pImg('accessories', 'Porog\nPlanka'),
    variants: [
      { color: 'Alyumin xrom', size: '900 mm', price: 120000, stock: 50 },
      { color: 'Alyumin bronze', size: '900 mm', price: 130000, stock: 35 },
      { color: 'MDF Venge', size: '900 mm', price: 110000, stock: 28 },
    ],
    specs: [
      { labelUz: 'Material', labelRu: 'Материал', valueUz: 'Alyumin / MDF', valueRu: 'Алюминий / МДФ' },
      { labelUz: 'Uzunligi', labelRu: 'Длина', valueUz: '900 mm', valueRu: '900 мм' },
    ],
  },
  {
    slug: 'door-smart-lock-electronic',
    categorySlug: 'door-accessories',
    brand: 'Xiaomi',
    titleUz: 'Smart-qulf elektron (barmoq izi + kod)',
    titleRu: 'Smart-замок электронный (отпечаток + код)',
    descriptionUz:
      'Zamonaviy elektron qulf. Barmoq izi, kalit kodi, Wi-Fi va Bluetooth. Smart uy tizimi bilan integratsiya.',
    descriptionRu:
      'Современный электронный замок. Отпечаток, код, Wi-Fi и Bluetooth. Smart home интеграция.',
    basePrice: 1650000,
    oldPrice: 1950000,
    isFeatured: true,
    images: pImg('accessories', 'Smart-qulf\nElektron'),
    variants: [
      { color: 'Qora', price: 1650000, oldPrice: 1950000, stock: 8 },
      { color: 'Kumush', price: 1650000, oldPrice: 1950000, stock: 6 },
      { color: 'Bronze', price: 1750000, oldPrice: 2050000, stock: 3 },
    ],
    specs: [
      { labelUz: 'Boshqaruv', labelRu: 'Управление', valueUz: 'Barmoq + kod + Wi-Fi', valueRu: 'Отпечаток + код + Wi-Fi' },
      { labelUz: 'Batareya', labelRu: 'Батарея', valueUz: '~9 oy ishlash', valueRu: '~9 мес работы' },
      { labelUz: 'Brand', labelRu: 'Бренд', valueUz: 'Xiaomi', valueRu: 'Xiaomi' },
    ],
  },
  {
    slug: 'door-sealant-set',
    categorySlug: 'door-accessories',
    brand: 'DoorStyle',
    titleUz: 'Eshik germetik to\'plami',
    titleRu: 'Комплект уплотнителей для двери',
    descriptionUz:
      'Eshik atrofini zichlash uchun rezina germetik. Shamol, chang, tovushdan himoya. 5 metr.',
    descriptionRu:
      'Резиновый уплотнитель для двери. Защита от ветра, пыли, шума. 5 метров.',
    basePrice: 85000,
    images: pImg('accessories', 'Germetik\n5 metr'),
    variants: [
      { color: 'Qora', size: '5m', price: 85000, stock: 80 },
      { color: 'Oq', size: '5m', price: 85000, stock: 60 },
      { color: 'Jigarrang', size: '5m', price: 90000, stock: 45 },
    ],
    specs: [
      { labelUz: 'Material', labelRu: 'Материал', valueUz: 'Rezina (EPDM)', valueRu: 'Резина (EPDM)' },
      { labelUz: 'Uzunligi', labelRu: 'Длина', valueUz: '5 metr', valueRu: '5 м' },
    ],
  },
];

async function main() {
  console.log('=== Reseed v2: Eshik rom marketplace ===\n');

  // 0. Idempotency guard
  const existingMarker = await prisma.settings.findUnique({ where: { key: SEED_MARKER_KEY } });
  if (existingMarker) {
    const appliedAt = (existingMarker.value as { appliedAt?: string } | null)?.appliedAt;
    console.log(`⏭  ${SEED_MARKER_KEY} allaqachon qo'llangan (${appliedAt ?? 'oldin'}). O'tkazib yuboriladi.`);
    console.log(`   Qayta seed kerak bo'lsa: DELETE FROM "Settings" WHERE key='${SEED_MARKER_KEY}';`);
    await prisma.$disconnect();
    return;
  }

  // 1. Eski (eshik bo'lmagan) kategoriyalarni yashirish
  const oldHidden = await prisma.category.updateMany({
    where: { slug: { notIn: DOOR_CATEGORY_SLUGS } },
    data: { isVisible: false },
  });
  if (oldHidden.count > 0) {
    console.log(`✓ ${oldHidden.count} ta eski kategoriya yashirildi`);
  }

  // 2. Eski mahsulotlarni deaktivlashtirish
  const newSlugs = new Set(products.map((p) => p.slug));
  const oldProducts = await prisma.product.findMany({ select: { slug: true } });
  const toDeactivate = oldProducts.filter((p) => !newSlugs.has(p.slug)).map((p) => p.slug);
  if (toDeactivate.length > 0) {
    await prisma.product.updateMany({
      where: { slug: { in: toDeactivate } },
      data: { isActive: false },
    });
    console.log(`✓ ${toDeactivate.length} ta eski mahsulot deaktivlashtirildi`);
  }

  // 3. Kategoriyalarni upsert
  const categoryBySlug = new Map<string, string>();
  for (const c of categories) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      update: {
        titleUz: c.titleUz,
        titleRu: c.titleRu,
        position: c.position,
        isVisible: true,
        iconUrl: c.iconUrl,
        bannerUrl: c.bannerUrl,
      },
      create: {
        slug: c.slug,
        titleUz: c.titleUz,
        titleRu: c.titleRu,
        position: c.position,
        isVisible: true,
        iconUrl: c.iconUrl,
        bannerUrl: c.bannerUrl,
      },
    });
    categoryBySlug.set(c.slug, cat.id);
    console.log(`  📁 ${c.titleUz}`);
  }
  console.log(`✓ ${categories.length} ta kategoriya yangilandi\n`);

  // 4. Mahsulotlarni upsert
  let created = 0;
  let updated = 0;
  for (const p of products) {
    const categoryId = categoryBySlug.get(p.categorySlug);
    if (!categoryId) {
      console.warn(`⚠️  Category not found: ${p.categorySlug}`);
      continue;
    }

    const discountPct = p.oldPrice
      ? Math.round(((p.oldPrice - p.basePrice) / p.oldPrice) * 100)
      : null;

    const existing = await prisma.product.findUnique({ where: { slug: p.slug } });

    const productData = {
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
    };

    const nested = {
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
    };

    if (existing) {
      await prisma.productImage.deleteMany({ where: { productId: existing.id } });
      await prisma.productVariant.deleteMany({ where: { productId: existing.id } });
      await prisma.productSpec.deleteMany({ where: { productId: existing.id } });
      await prisma.product.update({
        where: { id: existing.id },
        data: { ...productData, ...nested },
      });
      console.log(`  ↻ ${p.titleUz}`);
      updated++;
    } else {
      await prisma.product.create({
        data: { slug: p.slug, ...productData, ...nested },
      });
      console.log(`  + ${p.titleUz}`);
      created++;
    }
  }

  // 5. Bannerlar
  await prisma.banner.updateMany({ where: { placement: 'home' }, data: { isActive: false } });

  const mdfCatId = categoryBySlug.get('door-frames-mdf');
  const metalCatId = categoryBySlug.get('door-frames-metal');
  const woodCatId = categoryBySlug.get('door-frames-wood');
  const pvcCatId = categoryBySlug.get('door-frames-pvc');

  await prisma.banner.create({
    data: {
      placement: 'home',
      imageUrlUz: ph(COLORS.mdf, 'MDF ESHIK ROMLARI\nChegirma -20%', 1200, 500),
      targetType: 'category',
      targetValue: mdfCatId ?? '',
      position: 1,
      isActive: true,
    },
  });
  await prisma.banner.create({
    data: {
      placement: 'home',
      imageUrlUz: ph(COLORS.metal, 'METALL KIRISH\nESHIKLARI\nIshonchli himoya', 1200, 500),
      targetType: 'category',
      targetValue: metalCatId ?? '',
      position: 2,
      isActive: true,
    },
  });
  await prisma.banner.create({
    data: {
      placement: 'home',
      imageUrlUz: ph(COLORS.wood, 'MASSIV YOG\'OCH\nPremium sifat', 1200, 500),
      targetType: 'category',
      targetValue: woodCatId ?? '',
      position: 3,
      isActive: true,
    },
  });
  await prisma.banner.create({
    data: {
      placement: 'home',
      imageUrlUz: ph(COLORS.pvc, 'PVC ESHIKLAR\nNamlikka chidamli', 1200, 500),
      targetType: 'category',
      targetValue: pvcCatId ?? '',
      position: 4,
      isActive: true,
    },
  });
  console.log('\n✓ 4 ta yangi banner qo\'shildi');

  // 6. Related rules
  const accessoriesCatId = categoryBySlug.get('door-accessories');
  if (accessoriesCatId) {
    await prisma.relatedRule.deleteMany({});
    for (const sourceSlug of ['door-frames-mdf', 'door-frames-wood', 'door-frames-metal', 'door-frames-pvc']) {
      const sourceId = categoryBySlug.get(sourceSlug);
      if (sourceId) {
        await prisma.relatedRule.create({
          data: {
            sourceCategoryId: sourceId,
            targetCategoryId: accessoriesCatId,
            position: 1,
            isActive: true,
          },
        });
      }
    }
    console.log('✓ Related rules: har bir eshik kategoriyasi → aksessuarlar');
  }

  // 7. Store settings
  await prisma.settings.upsert({
    where: { key: 'store' },
    update: {
      value: {
        name: 'Eshik Rom',
        phone: '+998901234567',
        address: 'Toshkent, O\'zbekiston',
        workingHours: '09:00–20:00',
      },
    },
    create: {
      key: 'store',
      value: {
        name: 'Eshik Rom',
        phone: '+998901234567',
        address: 'Toshkent, O\'zbekiston',
        workingHours: '09:00–20:00',
      },
    },
  });

  // 8. Marker
  await prisma.settings.upsert({
    where: { key: SEED_MARKER_KEY },
    update: { value: { appliedAt: new Date().toISOString(), version: 2 } },
    create: { key: SEED_MARKER_KEY, value: { appliedAt: new Date().toISOString(), version: 2 } },
  });

  // 9. Stats
  console.log('\n=== Yakuniy hisobot ===');
  console.log(`  Yangi: ${created}, Yangilangan: ${updated}, Jami: ${products.length}`);
  const stats = await prisma.product.groupBy({
    by: ['categoryId'],
    where: { isActive: true },
    _count: true,
  });
  for (const s of stats) {
    const cat = await prisma.category.findUnique({ where: { id: s.categoryId } });
    console.log(`  ${cat?.titleUz}: ${s._count} ta`);
  }
  console.log('\n✅ Eshik rom v2 reseed tugadi');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
