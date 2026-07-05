export interface Trip {
  id: string;
  agencyId: string;
  agencyName: string;
  departure: string; // e.g. "Libreville"
  arrival: string; // e.g. "Oyem"
  departureTime: string; // e.g. "2026-07-02T06:00:00"
  arrivalTime: string; // e.g. "2026-07-02T13:00:00"
  price: number; // in FCFA (XAF)
  busCapacity: number; // e.g. 40
  availableSeats: number;
  busNumber: string; // e.g. "G-450-AA"
  checkpoints: string[]; // e.g. ["Kango", "Bifoun", "Ndjolé"]
  driverName: string;
  driverPhone: string;
}

export interface Booking {
  id: string;
  tripId: string;
  tripDetails?: Trip;
  travelerName: string;
  travelerPhone: string;
  travelerCni: string; // CNI ou Passport (obligatoire au Gabon)
  seatNumber: number;
  status: 'EN_ATTENTE' | 'PAYE' | 'EMBARQUE' | 'ANNULE';
  paymentMethod: 'AIRTEL_MONEY' | 'MOOV_MONEY' | 'AGENCE';
  paymentPhone: string;
  paymentType?: 'EN_LIGNE' | 'EN_AGENCE'; // Type de paiement choisi
  amount: number;
  transactionId: string;
  createdAt: string;
  boardedAt?: string;
}

export interface Review {
  id: string;
  tripId?: string;
  agencyId: string;
  reviewerName: string;
  rating: number; // de 1 à 5 étoiles
  comment: string;
  createdAt: string;
}

export interface Agency {
  id: string;
  name: string;
  packName: 'Starter' | 'Premium' | 'Enterprise';
  activeBuses: number;
  commissionRate: number; // percentage, e.g. 1.5%
  monthlyFee: number; // FCFA/month
  logo: string;
  joinedDate: string;
  status: 'ACTIVE' | 'SUSPENDED';
  password?: string; // Mot de passe d'authentification agence
}

export interface Tariff {
  id: string;
  agencyId: string;
  agencyName: string;
  departure: string;
  arrival: string;
  price: number;
}

export interface GabonRouteInfo {
  id: string;
  departure: string;
  arrival: string;
  distance: number; // km
  roadCondition: 'Excellente' | 'Praticable avec nids de poule' | 'Difficile (Travaux)' | 'Dégradée';
  estimatedDuration: string; // e.g. "7h"
  checkpoints: string[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export interface Bus {
  id: string;
  agencyId: string;
  plate: string;
  capacity: number;
}

export interface Driver {
  id: string;
  agencyId: string;
  name: string;
  phone: string;
}

// Nouvelle interface de typage pour les Colis & Fret (Bagages)
export interface Parcel {
  id: string;
  senderName: string;
  senderPhone: string;
  receiverName: string;
  receiverPhone: string;
  departure: string;
  arrival: string;
  weight?: number | null;
  description?: string | null;
  price: number;
  status: 'ENREGISTRE' | 'ARRIVE' | 'LIVRE';
  agencyId: string;
  tripId?: string | null;
  trip?: Trip | null; // Détails du voyage associé s'il y en a un
  createdAt: string;
  deliveredAt?: string | null;
}