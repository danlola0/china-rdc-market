import heroCargo from '../assets/images/hero_sourcing_cargo_1792489343216.jpg';
import machineryIndustrial from '../assets/images/product_machinery_industrial_1792489344351.jpg';
import solarElectronics from '../assets/images/product_electronics_solar_1792489344486.jpg';
import textileWholesale from '../assets/images/product_textile_fashion_1792489344650.jpg';

// Images statiques du site (importées pour être incluses dans le build Vite)
export const GENERATED_IMAGES = {
  heroCargo,
  machineryIndustrial,
  solarElectronics,
  textileWholesale,
};

// Listes de référence
export const CATEGORIES = [
  { id: 'all', name: 'Toutes les catégories', icon: 'LayoutGrid' },
  { id: 'Machines & Outillage', name: 'Machines & Outillage', icon: 'Wrench' },
  { id: 'Énergie Solaire & Électricité', name: 'Énergie Solaire & Électricité', icon: 'Sun' },
  { id: 'High-Tech & Téléphonie', name: 'High-Tech & Téléphonie', icon: 'Smartphone' },
  { id: 'Textile & Mode', name: 'Textile & Mode (Pagne Wax)', icon: 'Shirt' },
  { id: 'Matériaux de Construction', name: 'Matériaux & BTP (Carrelage, Portes)', icon: 'Building2' },
  { id: 'Véhicules & Pièces Détachées', name: 'Véhicules & Pièces (Tricycles, Auto)', icon: 'Truck' },
  { id: 'Électroménager', name: 'Électroménager & Froid', icon: 'Tv' },
  { id: 'Bazar & Quincaillerie', name: 'Bazar, Quincaillerie & Gros Yiwu', icon: 'Package' },
  { id: 'Beauté & Cosmétiques', name: 'Beauté & Mèches Naturelles', icon: 'Sparkles' },
];

export const CHINESE_CITIES = [
  'Toutes les villes',
  'Guangzhou',
  'Yiwu',
  'Shenzhen',
  'Ningbo',
  'Foshan',
  'Shanghai',
  'Dongguan',
  'Hangzhou',
];

export const DRC_CITIES = [
  'Kinshasa',
  'Lubumbashi',
  'Goma',
  'Matadi',
  'Kisangani',
  'Kolwezi',
  'Bukavu',
  'Boma',
  'Likasi',
  'Kikwit',
];
