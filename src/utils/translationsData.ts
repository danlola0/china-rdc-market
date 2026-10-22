import { Language } from '../i18n/translations';
import { Product } from '../types';

export const CATEGORY_TRANSLATIONS: Record<string, Record<Language, string>> = {
  'all': {
    fr: 'Toutes les catégories',
    zh: '全部商品类目',
    en: 'All Categories',
  },
  'Machines & Outillage': {
    fr: 'Machines & Outillage',
    zh: '工程机械与五金工具',
    en: 'Machinery & Hardware Tools',
  },
  'Énergie Solaire & Électricité': {
    fr: 'Énergie Solaire & Électricité',
    zh: '太阳能储能与电力设备',
    en: 'Solar Energy & Power Systems',
  },
  'High-Tech & Téléphonie': {
    fr: 'High-Tech & Téléphonie',
    zh: '数码科技与智能手机',
    en: 'High-Tech & Smartphones',
  },
  'Textile & Mode': {
    fr: 'Textile & Mode (Pagne Wax)',
    zh: '纺织面料与非洲蜡布 (Wax)',
    en: 'Textiles & Wax Prints',
  },
  'Matériaux de Construction': {
    fr: 'Matériaux & BTP (Carrelage, Portes)',
    zh: '建筑材料 (瓷砖/防盗门)',
    en: 'Building Materials (Tiles, Doors)',
  },
  'Véhicules & Pièces Détachées': {
    fr: 'Véhicules & Pièces (Tricycles, Auto)',
    zh: '特种车辆与摩托汽配 (三轮车)',
    en: 'Vehicles & Parts (Tricycles, Auto)',
  },
  'Électroménager': {
    fr: 'Électroménager & Froid',
    zh: '家用电器与制冷设备',
    en: 'Home Appliances & Freezers',
  },
  'Articles ménagers': {
    fr: 'Articles Ménagers & Cuisine',
    zh: '家居日用与不锈钢厨具',
    en: 'Kitchenware & Household',
  },
  'Bazar & Quincaillerie': {
    fr: 'Bazar, Quincaillerie & Gros Yiwu',
    zh: '义乌小商品批发与日用百货',
    en: 'Yiwu Commodities & Hardware',
  },
  'Beauté & Cosmétiques': {
    fr: 'Beauté & Mèches Naturelles',
    zh: '美妆美发与真人假发',
    en: 'Beauty & Hair Extensions',
  },
  'Sourcing & Logistique': {
    fr: 'Audit Usine & Fret Maritime',
    zh: '验厂质检与海运整柜拼箱',
    en: 'Factory Audit & Sea Logistics',
  },
};

export const PRODUCT_TRANSLATIONS: Record<
  string,
  {
    zh: { name: string; shortDesc?: string; description?: string };
    en: { name: string; shortDesc?: string; description?: string };
  }
> = {};

export function getCategoryLabel(categoryName: string, lang: Language): string {
  const item = CATEGORY_TRANSLATIONS[categoryName];
  if (item && item[lang]) return item[lang];
  return categoryName;
}

export function getProductDisplay(product: Product, lang: Language): { name: string; description: string } {
  if (lang === 'fr') {
    return { name: product.name, description: product.description };
  }

  const translated = PRODUCT_TRANSLATIONS[product.id];
  if (translated && translated[lang]) {
    return {
      name: translated[lang].name || product.name,
      description: translated[lang].description || product.description,
    };
  }

  return { name: product.name, description: product.description };
}
