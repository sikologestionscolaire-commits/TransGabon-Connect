import { Agency, GabonRouteInfo } from './types';

export const GABON_AGENCIES: Agency[] = [
  {
    id: 'agency-1',
    name: 'Major Transport',
    packName: 'Enterprise',
    activeBuses: 24,
    commissionRate: 0.8, // 0.8%
    monthlyFee: 50000, // 50,000 FCFA
    logo: '🏆',
    joinedDate: '2025-01-10',
    status: 'ACTIVE'
  },
  {
    id: 'agency-2',
    name: 'La Transgabonelle',
    packName: 'Premium',
    activeBuses: 15,
    commissionRate: 1.0, // 1.0%
    monthlyFee: 35000, // 35,000 FCFA
    logo: '🦁',
    joinedDate: '2025-03-15',
    status: 'ACTIVE'
  },
  {
    id: 'agency-3',
    name: 'TTO (Transport de l\'Ogooué)',
    packName: 'Premium',
    activeBuses: 12,
    commissionRate: 1.0,
    monthlyFee: 35000,
    logo: '🛶',
    joinedDate: '2025-05-20',
    status: 'ACTIVE'
  },
  {
    id: 'agency-4',
    name: 'Mvett Voyages',
    packName: 'Starter',
    activeBuses: 6,
    commissionRate: 1.5, // 1.5%
    monthlyFee: 15000, // 15,000 FCFA
    logo: '🪕',
    joinedDate: '2026-02-01',
    status: 'ACTIVE'
  },
  {
    id: 'agency-5',
    name: 'La Louetsi',
    packName: 'Starter',
    activeBuses: 4,
    commissionRate: 1.5,
    monthlyFee: 15000,
    logo: '🌲',
    joinedDate: '2026-04-12',
    status: 'ACTIVE'
  }
];

export const GABON_ROUTES: GabonRouteInfo[] = [
  {
    id: 'route-lv-oyem',
    departure: 'Libreville',
    arrival: 'Oyem',
    distance: 410,
    roadCondition: 'Praticable avec nids de poule',
    estimatedDuration: '7h',
    checkpoints: ['Kango', 'Bifoun', 'Ndjolé', 'Mitzic']
  },
  {
    id: 'route-lv-franceville',
    departure: 'Libreville',
    arrival: 'Franceville',
    distance: 700,
    roadCondition: 'Difficile (Travaux)',
    estimatedDuration: '11h 30m',
    checkpoints: ['Kango', 'Bifoun', 'Ndjolé', 'Lopé', 'Lastourville', 'Moanda']
  },
  {
    id: 'route-lv-lambarene',
    departure: 'Libreville',
    arrival: 'Lambaréné',
    distance: 240,
    roadCondition: 'Excellente',
    estimatedDuration: '3h 45m',
    checkpoints: ['Kango', 'Bifoun']
  },
  {
    id: 'route-lv-mouila',
    departure: 'Libreville',
    arrival: 'Mouila',
    distance: 440,
    roadCondition: 'Praticable avec nids de poule',
    estimatedDuration: '6h 45m',
    checkpoints: ['Kango', 'Bifoun', 'Lambaréné', 'Fougamou']
  },
  {
    id: 'route-lv-tchibanga',
    departure: 'Libreville',
    arrival: 'Tchibanga',
    distance: 590,
    roadCondition: 'Dégradée',
    estimatedDuration: '9h',
    checkpoints: ['Kango', 'Bifoun', 'Lambaréné', 'Fougamou', 'Mouila']
  },
  {
    id: 'route-lv-bitam',
    departure: 'Libreville',
    arrival: 'Bitam',
    distance: 485,
    roadCondition: 'Praticable avec nids de poule',
    estimatedDuration: '8h 15m',
    checkpoints: ['Kango', 'Bifoun', 'Ndjolé', 'Mitzic', 'Oyem']
  }
];

// Seed trip helper values
export const DRIVERS = [
  { name: 'Jean-Pierre Ndong', phone: '+241 077 45 12 89' },
  { name: 'Brice Obiang', phone: '+241 066 18 29 40' },
  { name: 'Marius Moussavou', phone: '+241 074 88 56 12' },
  { name: 'Christian Bekale', phone: '+241 065 33 22 11' },
  { name: 'Serge Ella', phone: '+241 076 90 44 55' }
];

export const BUS_PLATES = [
  { plate: 'G-340-AA', capacity: 40 },
  { plate: 'G-782-BC', capacity: 30 },
  { plate: 'G-102-DF', capacity: 45 },
  { plate: 'G-889-AA', capacity: 40 },
  { plate: 'G-512-CC', capacity: 32 }
];

export const PRICES_BY_DESTINATION: { [key: string]: number } = {
  'Oyem': 15000,
  'Franceville': 25000,
  'Lambaréné': 8000,
  'Mouila': 12000,
  'Tchibanga': 18000,
  'Bitam': 17000
};
