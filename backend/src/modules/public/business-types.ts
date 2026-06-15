import { BusinessType } from '@prisma/client';

/** Biznes turi → o'zbekcha nom. Onboarding tanlovida ishlatiladi. */
export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  CLOTHING: 'Kiyim-kechak',
  SHOES_ACCESSORIES: 'Poyabzal va aksessuarlar',
  ELECTRONICS: 'Elektronika va texnika',
  PHONES_GADGETS: 'Telefon va gadjetlar',
  FOOD_GROCERY: 'Oziq-ovqat va market',
  COSMETICS: 'Kosmetika va parfyumeriya',
  BEAUTY_HEALTH: "Go'zallik va sog'liq",
  PHARMACY: 'Dorixona',
  HOME_GOODS: "Uy-ro'zg'or buyumlari",
  FURNITURE: 'Mebel',
  KIDS: 'Bolalar mahsulotlari',
  TOYS: "O'yinchoqlar",
  SPORTS: 'Sport va fitnes',
  BOOKS_STATIONERY: 'Kitob va kanstovarlar',
  AUTO_PARTS: 'Avto ehtiyot qismlar',
  FLOWERS_GIFTS: "Gullar va sovg'alar",
  JEWELRY: 'Zargarlik',
  CONSTRUCTION: 'Qurilish mollari',
  PET_SUPPLIES: 'Uy hayvonlari mahsulotlari',
  RESTAURANT_CAFE: 'Restoran va kafe',
  OTHER: 'Boshqa',
};

export interface BusinessTypeOption {
  value: BusinessType;
  label: string;
}

/** Tanlov ro'yxati (frontend select uchun). */
export const BUSINESS_TYPE_OPTIONS: BusinessTypeOption[] = (
  Object.keys(BUSINESS_TYPE_LABELS) as BusinessType[]
).map((value) => ({ value, label: BUSINESS_TYPE_LABELS[value] }));
