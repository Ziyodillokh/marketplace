/**
 * Reseed: Eshik rom marketplace.
 *
 *  • Eski kategoriyalar — isVisible=false (yashirin, lekin order history saqlanadi)
 *  • Eski mahsulotlar — isActive=false
 *  • 5 ta yangi kategoriya (MDF, Massiv, Metall, PVC, Aksessuarlar)
 *  • Har kategoriya uchun 4-5 ta sifatli eshik mahsuloti (rasm, variant, spec bilan)
 *  • Yangi bannerlar (eski "home" bannerlar deaktivlashtiriladi)
 *  • Yangi related rule (MDF eshiklarni ko'rganlar uchun aksessuarlar)
 *
 *  Run:  npm run db:seed:doors
 *        (yoki  npx ts-node prisma/reseed-door-frames.ts)
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const UNSPLASH = (id: string) =>
  `https://images.unsplash.com/${id}?w=900&q=80&auto=format&fit=crop`;

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
  iconUrl?: string;
  bannerUrl?: string;
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

const DOOR_CATEGORY_SLUGS = [
  'door-frames-mdf',
  'door-frames-wood',
  'door-frames-metal',
  'door-frames-pvc',
  'door-accessories',
];

const categories: CategorySeed[] = [
  {
    slug: 'door-frames-mdf',
    titleUz: 'MDF eshik romlari',
    titleRu: 'МДФ дверные блоки',
    position: 1,
    iconUrl: UNSPLASH('photo-1558618666-fcd25c85cd64'),
    bannerUrl: UNSPLASH('photo-1600566753190-17f0baa2a6c3'),
  },
  {
    slug: 'door-frames-wood',
    titleUz: 'Massiv yog\'och eshiklar',
    titleRu: 'Двери из массива дерева',
    position: 2,
    iconUrl: UNSPLASH('photo-1505691938895-1758d7feb511'),
    bannerUrl: UNSPLASH('photo-1583484963886-cfe2bff2945f'),
  },
  {
    slug: 'door-frames-metal',
    titleUz: 'Metall kirish eshiklari',
    titleRu: 'Металлические входные двери',
    position: 3,
    iconUrl: UNSPLASH('photo-1568605114967-8130f3a36994'),
    bannerUrl: UNSPLASH('photo-1513694203232-719a280e022f'),
  },
  {
    slug: 'door-frames-pvc',
    titleUz: 'PVC eshiklar',
    titleRu: 'ПВХ двери',
    position: 4,
    iconUrl: UNSPLASH('photo-1571247473-1bcc4ec1bbc4'),
    bannerUrl: UNSPLASH('photo-1571247473-1bcc4ec1bbc4'),
  },
  {
    slug: 'door-accessories',
    titleUz: 'Eshik aksessuarlari',
    titleRu: 'Дверные аксессуары',
    position: 5,
    iconUrl: UNSPLASH('photo-1556909114-f6e7ad7d3136'),
    bannerUrl: UNSPLASH('photo-1556909114-f6e7ad7d3136'),
  },
];

const products: ProductSeed[] = [
  // ============== MDF ESHIK ROMLARI ==============
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
    images: [
      UNSPLASH('photo-1558618666-fcd25c85cd64'),
      UNSPLASH('photo-1600566753190-17f0baa2a6c3'),
    ],
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
    images: [
      UNSPLASH('photo-1600585154340-be6161a56a0c'),
      UNSPLASH('photo-1600566753190-17f0baa2a6c3'),
    ],
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
      { labelUz: 'Komplekt', labelRu: 'Комплект', valueUz: 'Tabaqa + rom + nalichnik', valueRu: 'Полотно + коробка + наличники' },
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
    images: [
      UNSPLASH('photo-1583484963886-cfe2bff2945f'),
      UNSPLASH('photo-1505691938895-1758d7feb511'),
    ],
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
    images: [
      UNSPLASH('photo-1568605114967-8130f3a36994'),
      UNSPLASH('photo-1558618666-fcd25c85cd64'),
    ],
    variants: [
      { color: 'Yong\'oq', size: '2050×720', price: 720000, stock: 18 },
      { color: 'Yong\'oq', size: '2050×860', price: 750000, stock: 22 },
      { color: 'Mil\'an yong\'og\'i', size: '2050×860', price: 770000, stock: 14 },
      { color: 'Beleniy dub', size: '2050×860', price: 770000, stock: 10 },
    ],
    specs: [
      { labelUz: 'Material', labelRu: 'Материал', valueUz: 'MDF + plyonka', valueRu: 'МДФ + плёнка' },
      { labelUz: 'Komplekt', labelRu: 'Комплект', valueUz: 'Tabaqa + rom + nalichnik', valueRu: 'Полотно + коробка + наличники' },
      { labelUz: 'Kafolat', labelRu: 'Гарантия', valueUz: '12 oy', valueRu: '12 мес' },
    ],
  },

  // ============== MASSIV YOG'OCH ESHIKLAR ==============
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
    images: [
      UNSPLASH('photo-1505691938895-1758d7feb511'),
      UNSPLASH('photo-1583484963886-cfe2bff2945f'),
    ],
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
    images: [
      UNSPLASH('photo-1583484963886-cfe2bff2945f'),
      UNSPLASH('photo-1600585154340-be6161a56a0c'),
    ],
    variants: [
      { color: 'Tabiiy eman', size: '2050×860', price: 5650000, stock: 3 },
      { color: 'Tabiiy eman', size: '2050×960', price: 5800000, stock: 4 },
      { color: 'Kuydirilgan eman', size: '2050×960', price: 6100000, stock: 2 },
    ],
    specs: [
      { labelUz: 'Material', labelRu: 'Материал', valueUz: 'Massiv eman', valueRu: 'Массив дуба' },
      { labelUz: 'Qoplama', labelRu: 'Покрытие', valueUz: 'Lak (UV chidamli)', valueRu: 'Лак (UV-стойкий)' },
      { labelUz: 'Qalinligi', labelRu: 'Толщина', valueUz: '45 mm', valueRu: '45 мм' },
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
      'Классическая дверь из массива сосны. Лёгкая, с приятным ароматом. Подходит даже для бани (с доп. обработкой).',
    basePrice: 2800000,
    oldPrice: 3300000,
    images: [
      UNSPLASH('photo-1521783988139-89397d761dce'),
      UNSPLASH('photo-1505691938895-1758d7feb511'),
    ],
    variants: [
      { color: 'Tabiiy qarag\'ay', size: '2050×720', price: 2700000, oldPrice: 3200000, stock: 6 },
      { color: 'Tabiiy qarag\'ay', size: '2050×860', price: 2800000, oldPrice: 3300000, stock: 8 },
      { color: 'Toza laklangan', size: '2050×860', price: 2950000, oldPrice: 3450000, stock: 5 },
    ],
    specs: [
      { labelUz: 'Material', labelRu: 'Материал', valueUz: 'Massiv qarag\'ay', valueRu: 'Массив сосны' },
      { labelUz: 'Vazni', labelRu: 'Вес', valueUz: '~28 kg', valueRu: '~28 кг' },
      { labelUz: 'Kafolat', labelRu: 'Гарантия', valueUz: '36 oy', valueRu: '36 мес' },
    ],
  },
  {
    slug: 'wood-door-walnut-double-2050x1500',
    categorySlug: 'door-frames-wood',
    brand: 'WoodMaster',
    titleUz: 'Massiv yong\'oq ikki tabaqali eshik 2050×1500',
    titleRu: 'Двустворчатая дверь из массива ореха 2050×1500',
    descriptionUz:
      'Ikki tabaqali keng eshik. Mehmonxona, restoran, ofis kirishlari uchun. Premium furnitura komplektida.',
    descriptionRu:
      'Двустворчатая широкая дверь. Для гостиных, ресторанов, офисов. Премиум фурнитура в комплекте.',
    basePrice: 8500000,
    oldPrice: 9800000,
    images: [
      UNSPLASH('photo-1513694203232-719a280e022f'),
      UNSPLASH('photo-1505691938895-1758d7feb511'),
    ],
    variants: [
      { color: 'Tabiiy yong\'oq', size: '2050×1500', price: 8500000, oldPrice: 9800000, stock: 2 },
      { color: 'Tabiiy yong\'oq', size: '2300×1600', price: 9300000, oldPrice: 10500000, stock: 1 },
    ],
    specs: [
      { labelUz: 'Tip', labelRu: 'Тип', valueUz: 'Ikki tabaqali', valueRu: 'Двустворчатая' },
      { labelUz: 'Material', labelRu: 'Материал', valueUz: 'Massiv yong\'oq', valueRu: 'Массив ореха' },
      { labelUz: 'Furnitura', labelRu: 'Фурнитура', valueUz: 'Premium', valueRu: 'Премиум' },
    ],
  },

  // ============== METALL KIRISH ESHIKLARI ==============
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
    images: [
      UNSPLASH('photo-1568605114967-8130f3a36994'),
      UNSPLASH('photo-1513694203232-719a280e022f'),
    ],
    variants: [
      { color: 'Venge', size: '2050×860', price: 1950000, oldPrice: 2300000, stock: 6 },
      { color: 'Yong\'oq', size: '2050×860', price: 1950000, oldPrice: 2300000, stock: 7 },
      { color: 'Eman', size: '2050×960', price: 2050000, oldPrice: 2400000, stock: 4 },
    ],
    specs: [
      { labelUz: 'Po\'lat qalinligi', labelRu: 'Толщина стали', valueUz: '1.5 mm', valueRu: '1.5 мм' },
      { labelUz: 'Qulflar', labelRu: 'Замки', valueUz: '2 ta', valueRu: '2 шт' },
      { labelUz: 'Ichki panel', labelRu: 'Внутренняя панель', valueUz: 'MDF', valueRu: 'МДФ' },
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
      'Po\'lat 2 mm + termo to\'ldirgich. Xususiy uy va xonadon uchun. Issiqlik chiqarmaydi, sovuq kirishidan saqlaydi. Ichki va tashqi MDF panellar.',
    descriptionRu:
      'Сталь 2 мм + термонаполнитель. Для частного дома и квартиры. Сохраняет тепло, не пропускает холод. Внутренняя и наружная МДФ.',
    basePrice: 3500000,
    oldPrice: 4100000,
    isFeatured: true,
    images: [
      UNSPLASH('photo-1513694203232-719a280e022f'),
      UNSPLASH('photo-1568605114967-8130f3a36994'),
    ],
    variants: [
      { color: 'Venge / Oq', size: '2050×860', price: 3500000, oldPrice: 4100000, stock: 4 },
      { color: 'Eman / Oq', size: '2050×960', price: 3650000, oldPrice: 4250000, stock: 5 },
      { color: 'Yong\'oq / Yong\'oq', size: '2050×960', price: 3700000, oldPrice: 4300000, stock: 3 },
    ],
    specs: [
      { labelUz: 'Po\'lat qalinligi', labelRu: 'Толщина стали', valueUz: '2 mm', valueRu: '2 мм' },
      { labelUz: 'Termo izolyatsiya', labelRu: 'Термоизоляция', valueUz: 'Bor (60 mm pena)', valueRu: 'Есть (60 мм пена)' },
      { labelUz: 'Qulflar', labelRu: 'Замки', valueUz: '2 ta (kalitli + bug\'doysimon)', valueRu: '2 шт (ключевой + сувальдный)' },
      { labelUz: 'Vazni', labelRu: 'Вес', valueUz: '~85 kg', valueRu: '~85 кг' },
    ],
  },
  {
    slug: 'metal-door-bronedver-elite',
    categorySlug: 'door-frames-metal',
    brand: 'FortGuard',
    titleUz: 'Bronedver "Elite" — zirhli kirish eshigi',
    titleRu: 'Бронедверь "Элит" — бронированная входная',
    descriptionUz:
      'Maksimal himoya darajasi. Po\'lat 3 mm + qattiqlashtirilgan reb. 3 ta qulf (smart-qulf kiritilgan). Premium villalar uchun.',
    descriptionRu:
      'Максимальный уровень защиты. Сталь 3 мм + усиленные рёбра. 3 замка (включая smart-замок). Для премиум объектов.',
    basePrice: 4500000,
    oldPrice: 5200000,
    images: [
      UNSPLASH('photo-1568605114967-8130f3a36994'),
      UNSPLASH('photo-1513694203232-719a280e022f'),
    ],
    variants: [
      { color: 'Eman venge', size: '2050×960', price: 4500000, oldPrice: 5200000, stock: 3 },
      { color: 'Eman shokoladli', size: '2050×960', price: 4600000, oldPrice: 5300000, stock: 2 },
      { color: 'Oq emal', size: '2050×860', price: 4500000, oldPrice: 5200000, stock: 2 },
    ],
    specs: [
      { labelUz: 'Po\'lat qalinligi', labelRu: 'Толщина стали', valueUz: '3 mm', valueRu: '3 мм' },
      { labelUz: 'Qulflar', labelRu: 'Замки', valueUz: '3 ta (smart-qulf bilan)', valueRu: '3 шт (smart-замок)' },
      { labelUz: 'Burglar himoya', labelRu: 'Взломостойкость', valueUz: 'IV daraja', valueRu: 'IV класс' },
      { labelUz: 'Kafolat', labelRu: 'Гарантия', valueUz: '5 yil', valueRu: '5 лет' },
    ],
  },
  {
    slug: 'metal-door-economy-2050x860',
    categorySlug: 'door-frames-metal',
    brand: 'EcoSteel',
    titleUz: 'Metall eshik "Economy" 2050×860',
    titleRu: 'Металлическая дверь "Эконом" 2050×860',
    descriptionUz:
      'Iqtisodli variant. Po\'lat list 1.2 mm. Bitta qulf. Texnik xonalar, omborlar, dacha uchun mos.',
    descriptionRu:
      'Бюджетный вариант. Сталь 1.2 мм. Один замок. Подходит для технических помещений, складов, дач.',
    basePrice: 1250000,
    images: [
      UNSPLASH('photo-1568605114967-8130f3a36994'),
      UNSPLASH('photo-1513694203232-719a280e022f'),
    ],
    variants: [
      { color: 'Qora', size: '2050×860', price: 1250000, stock: 12 },
      { color: 'Jigarrang', size: '2050×860', price: 1250000, stock: 9 },
      { color: 'Qora', size: '2050×960', price: 1320000, stock: 6 },
    ],
    specs: [
      { labelUz: 'Po\'lat qalinligi', labelRu: 'Толщина стали', valueUz: '1.2 mm', valueRu: '1.2 мм' },
      { labelUz: 'Qulflar', labelRu: 'Замки', valueUz: '1 ta', valueRu: '1 шт' },
      { labelUz: 'Maqsad', labelRu: 'Назначение', valueUz: 'Texnik xonalar', valueRu: 'Техпомещения' },
    ],
  },

  // ============== PVC ESHIKLAR ==============
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
    images: [
      UNSPLASH('photo-1571247473-1bcc4ec1bbc4'),
      UNSPLASH('photo-1558618666-fcd25c85cd64'),
    ],
    variants: [
      { color: 'Oq', size: '2000×600', price: 430000, oldPrice: 560000, stock: 20 },
      { color: 'Oq', size: '2000×700', price: 450000, oldPrice: 580000, stock: 25 },
      { color: 'Bej', size: '2000×700', price: 460000, oldPrice: 590000, stock: 15 },
      { color: 'Oq mat', size: '2000×800', price: 480000, oldPrice: 610000, stock: 10 },
    ],
    specs: [
      { labelUz: 'Material', labelRu: 'Материал', valueUz: 'PVC profil + filler', valueRu: 'ПВХ профиль + наполнитель' },
      { labelUz: 'Namlikka chidamli', labelRu: 'Влагостойкость', valueUz: '100%', valueRu: '100%' },
      { labelUz: 'Komplekt', labelRu: 'Комплект', valueUz: 'Tabaqa + rom + nalichnik', valueRu: 'Полотно + коробка + наличники' },
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
      'Со вставкой из матового стекла. Пропускает свет, скрывает обзор. Для ванной или гардеробной.',
    basePrice: 750000,
    isFeatured: true,
    images: [
      UNSPLASH('photo-1600585154340-be6161a56a0c'),
      UNSPLASH('photo-1571247473-1bcc4ec1bbc4'),
    ],
    variants: [
      { color: 'Oq', size: '2000×700', price: 730000, stock: 12 },
      { color: 'Oq', size: '2000×800', price: 750000, stock: 14 },
      { color: 'Yong\'oq', size: '2000×800', price: 780000, stock: 9 },
    ],
    specs: [
      { labelUz: 'Shisha', labelRu: 'Стекло', valueUz: 'Matshyali (frosted)', valueRu: 'Матовое (frosted)' },
      { labelUz: 'Material', labelRu: 'Материал', valueUz: 'PVC', valueRu: 'ПВХ' },
      { labelUz: 'Komplekt', labelRu: 'Комплект', valueUz: 'Tabaqa + rom + nalichnik', valueRu: 'Полотно + коробка + наличники' },
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
      'ПВХ дверь со встроенными жалюзи. Контроль света и вентиляции. Идеально для бани и сауны.',
    basePrice: 950000,
    images: [
      UNSPLASH('photo-1571247473-1bcc4ec1bbc4'),
      UNSPLASH('photo-1600585154340-be6161a56a0c'),
    ],
    variants: [
      { color: 'Oq', size: '2000×700', price: 920000, stock: 6 },
      { color: 'Oq', size: '2000×800', price: 950000, stock: 8 },
      { color: 'Bej', size: '2000×800', price: 980000, stock: 5 },
    ],
    specs: [
      { labelUz: 'Jaluzi', labelRu: 'Жалюзи', valueUz: 'O\'rnatilgan, sozlanadi', valueRu: 'Встроенные, регулируемые' },
      { labelUz: 'Material', labelRu: 'Материал', valueUz: 'PVC profil', valueRu: 'ПВХ профиль' },
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
    images: [
      UNSPLASH('photo-1558618666-fcd25c85cd64'),
      UNSPLASH('photo-1571247473-1bcc4ec1bbc4'),
    ],
    variants: [
      { color: 'Oq', size: '2000×580', price: 380000, stock: 18 },
      { color: 'Bej', size: '2000×580', price: 390000, stock: 12 },
    ],
    specs: [
      { labelUz: 'Material', labelRu: 'Материал', valueUz: 'PVC', valueRu: 'ПВХ' },
      { labelUz: 'Komplekt', labelRu: 'Комплект', valueUz: 'Tabaqa + rom', valueRu: 'Полотно + коробка' },
    ],
  },

  // ============== ESHIK AKSESSUARLARI ==============
  {
    slug: 'door-handle-chrome-classic',
    categorySlug: 'door-accessories',
    brand: 'Apecs',
    titleUz: 'Eshik dastagi — xrom, klassik',
    titleRu: 'Дверная ручка — хром, классика',
    descriptionUz:
      'Sifatli xrom qoplamali eshik dastagi. Universal o\'rnatish. Lock-mexanizmi bilan birga ishlatish mumkin.',
    descriptionRu:
      'Качественная хромированная дверная ручка. Универсальное крепление. Совместима с замком.',
    basePrice: 180000,
    oldPrice: 220000,
    images: [
      UNSPLASH('photo-1556909114-f6e7ad7d3136'),
      UNSPLASH('photo-1558618666-fcd25c85cd64'),
    ],
    variants: [
      { color: 'Xrom yaltiroq', price: 180000, oldPrice: 220000, stock: 35 },
      { color: 'Xrom mat', price: 185000, oldPrice: 225000, stock: 28 },
      { color: 'Bronze antik', price: 210000, stock: 18 },
      { color: 'Qora mat', price: 220000, stock: 22 },
    ],
    specs: [
      { labelUz: 'Material', labelRu: 'Материал', valueUz: 'Sink + xrom qoplama', valueRu: 'Цинк + хром' },
      { labelUz: 'Tip', labelRu: 'Тип', valueUz: 'Falevaya', valueRu: 'Фалевая' },
      { labelUz: 'Kafolat', labelRu: 'Гарантия', valueUz: '24 oy', valueRu: '24 мес' },
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
      'Бесшумный магнитный замок. Сертифицированный Apecs. Идеален для детской и спальни.',
    basePrice: 350000,
    images: [
      UNSPLASH('photo-1558618666-fcd25c85cd64'),
      UNSPLASH('photo-1556909114-f6e7ad7d3136'),
    ],
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
      'Качественные петли из нержавеющей стали. Размер 100×70. Идеальны для межкомнатных дверей.',
    basePrice: 95000,
    images: [
      UNSPLASH('photo-1556909114-f6e7ad7d3136'),
      UNSPLASH('photo-1568605114967-8130f3a36994'),
    ],
    variants: [
      { color: 'Xrom', size: '100×70', price: 95000, stock: 60 },
      { color: 'Bronze', size: '100×70', price: 110000, stock: 35 },
      { color: 'Yashirin (skritaya)', size: '100×70', price: 280000, stock: 15 },
    ],
    specs: [
      { labelUz: 'Material', labelRu: 'Материал', valueUz: 'Zanglamas po\'lat', valueRu: 'Нержавеющая сталь' },
      { labelUz: 'O\'lcham', labelRu: 'Размер', valueUz: '100×70 mm', valueRu: '100×70 мм' },
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
      'Комплект МДФ наличников. Для отделки дверного проёма. Подбирается в цвет двери.',
    basePrice: 250000,
    images: [
      UNSPLASH('photo-1600566753190-17f0baa2a6c3'),
      UNSPLASH('photo-1505691938895-1758d7feb511'),
    ],
    variants: [
      { color: 'Venge', size: '70mm × 5m', price: 250000, stock: 30 },
      { color: 'Yong\'oq', size: '70mm × 5m', price: 250000, stock: 25 },
      { color: 'Oq emal', size: '70mm × 5m', price: 270000, stock: 20 },
      { color: 'Eman', size: '80mm × 5m', price: 295000, stock: 15 },
    ],
    specs: [
      { labelUz: 'Material', labelRu: 'Материал', valueUz: 'MDF + ekoshpon', valueRu: 'МДФ + экошпон' },
      { labelUz: 'Uzunligi', labelRu: 'Длина', valueUz: '5 metr (komplekt)', valueRu: '5 м (комплект)' },
    ],
  },
  {
    slug: 'door-extender-dobor-100mm',
    categorySlug: 'door-accessories',
    brand: 'DoorStyle',
    titleUz: 'Dobor (kengaytirgich) 100 mm',
    titleRu: 'Доборная планка 100 мм',
    descriptionUz:
      'Devor qalin bo\'lgan joylarda rom kengaytirish uchun. MDF + ekoshpon. Standart uzunlik 2070 mm.',
    descriptionRu:
      'Для расширения коробки при толстых стенах. МДФ + экошпон. Стандартная длина 2070 мм.',
    basePrice: 180000,
    images: [
      UNSPLASH('photo-1600566753190-17f0baa2a6c3'),
      UNSPLASH('photo-1568605114967-8130f3a36994'),
    ],
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
];

const SEED_MARKER_KEY = 'doors_seed_v1';

async function main() {
  console.log('=== Reseed: Eshik rom marketplace ===\n');

  // 0. Idempotency guard — agar v1 seed allaqachon qo'llangan bo'lsa,
  //    products'ni qayta yozmaymiz (admin paneldan kiritilgan o'zgartirishlarni yo'qotmaslik uchun).
  //    Yangi version uchun SEED_MARKER_KEY ni 'doors_seed_v2' ga o'zgartiring.
  const existingMarker = await prisma.settings.findUnique({ where: { key: SEED_MARKER_KEY } });
  const skipProductsAndCategories = !!existingMarker;
  if (skipProductsAndCategories) {
    const appliedAt = (existingMarker?.value as { appliedAt?: string } | null)?.appliedAt;
    console.log(`⏭  ${SEED_MARKER_KEY} allaqachon qo'llangan (${appliedAt ?? 'oldin'}). Mahsulot/kategoriya seedi o'tkazib yuboriladi.`);
    console.log('   Qayta seed kerak bo\'lsa: DELETE FROM "Settings" WHERE key=\'doors_seed_v1\';');
    await prisma.$disconnect();
    return;
  }

  // 1. Eski (eshik bo'lmagan) kategoriyalarni yashirish
  const oldHidden = await prisma.category.updateMany({
    where: { slug: { notIn: DOOR_CATEGORY_SLUGS } },
    data: { isVisible: false },
  });
  if (oldHidden.count > 0) {
    console.log(`✓ ${oldHidden.count} ta eski kategoriya yashirildi (isVisible=false)`);
  }

  // 2. Eski mahsulotlarni deaktivlashtirish (order history saqlanishi uchun)
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

  // 3. Yangi kategoriyalarni upsert qilish
  const categoryBySlug = new Map<string, string>();
  for (const c of categories) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      update: {
        titleUz: c.titleUz,
        titleRu: c.titleRu,
        position: c.position,
        isVisible: true,
        iconUrl: c.iconUrl ?? null,
        bannerUrl: c.bannerUrl ?? null,
      },
      create: {
        slug: c.slug,
        titleUz: c.titleUz,
        titleRu: c.titleRu,
        position: c.position,
        isVisible: true,
        iconUrl: c.iconUrl ?? null,
        bannerUrl: c.bannerUrl ?? null,
      },
    });
    categoryBySlug.set(c.slug, cat.id);
    console.log(`  📁 ${c.titleUz}`);
  }
  console.log(`✓ ${categories.length} ta kategoriya yangilandi\n`);

  // 4. Mahsulotlarni upsert qilish
  let created = 0;
  let updated = 0;
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
      updated++;
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
      created++;
    }
  }

  // 5. Bannerlar — eski "home" bannerlarni deaktivlashtirib, yangilarini qo'shamiz
  await prisma.banner.updateMany({
    where: { placement: 'home' },
    data: { isActive: false },
  });

  const mdfCatId = categoryBySlug.get('door-frames-mdf');
  const metalCatId = categoryBySlug.get('door-frames-metal');
  const woodCatId = categoryBySlug.get('door-frames-wood');

  await prisma.banner.create({
    data: {
      placement: 'home',
      imageUrlUz: UNSPLASH('photo-1600566753190-17f0baa2a6c3'),
      targetType: 'category',
      targetValue: mdfCatId ?? '',
      position: 1,
      isActive: true,
    },
  });
  await prisma.banner.create({
    data: {
      placement: 'home',
      imageUrlUz: UNSPLASH('photo-1513694203232-719a280e022f'),
      targetType: 'category',
      targetValue: metalCatId ?? '',
      position: 2,
      isActive: true,
    },
  });
  await prisma.banner.create({
    data: {
      placement: 'home',
      imageUrlUz: UNSPLASH('photo-1583484963886-cfe2bff2945f'),
      targetType: 'category',
      targetValue: woodCatId ?? '',
      position: 3,
      isActive: true,
    },
  });
  console.log('\n✓ 3 ta yangi banner qo\'shildi (eski bannerlar deaktivlashtirildi)');

  // 6. Related rules — eshiklarni ko'rganlar uchun aksessuarlar
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

  // 7. Store settings — eshik brendi
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

  // 8. Statistika
  console.log('\n=== Yakuniy hisobot ===');
  console.log(`  Yangi mahsulotlar: ${created}`);
  console.log(`  Yangilangan: ${updated}`);
  const stats = await prisma.product.groupBy({
    by: ['categoryId'],
    where: { isActive: true },
    _count: true,
  });
  for (const s of stats) {
    const cat = await prisma.category.findUnique({ where: { id: s.categoryId } });
    console.log(`  ${cat?.titleUz}: ${s._count} ta`);
  }

  // 9. Marker yozish — keyingi deployda qaytadan ishlamasligi uchun
  await prisma.settings.upsert({
    where: { key: SEED_MARKER_KEY },
    update: { value: { appliedAt: new Date().toISOString(), version: 1 } },
    create: { key: SEED_MARKER_KEY, value: { appliedAt: new Date().toISOString(), version: 1 } },
  });

  console.log('\n✅ Eshik rom reseed tugadi');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
