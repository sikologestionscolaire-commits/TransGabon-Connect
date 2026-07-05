import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import os from 'os';

import { GABON_AGENCIES, GABON_ROUTES, DRIVERS, BUS_PLATES, PRICES_BY_DESTINATION } from './src/data';
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first'); 

dotenv.config();

const app = express();
const PORT = 3000;

// Secret pour la signature des jetons (Token JWT)
const JWT_SECRET = process.env.JWT_SECRET || 'transgabon-connect-secret-key-2026';

// Set up JSON body parser
app.use(express.json());

// Initialize Prisma Client natively for PostgreSQL
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

// Crée un pool de connexions vers Neon (PostgreSQL)
const pool = new pg.Pool({ 
  connectionString: process.env.DATABASE_URL 
});

// Crée l'adaptateur requis par Prisma 7
const adapter = new PrismaPg(pool);

// Initialise Prisma Client avec l'adaptateur
const prisma = new PrismaClient({ adapter });

/// Initialize Gemini AI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
      'Connection': 'close' // Force la fermeture de la connexion réseau (évite ECONNRESET)
    }
  }
});

// Helper to convert SQLite string checkpoints back to Array for Frontend compatibility
function formatTrip(trip: any) {
  if (!trip) return null;
  return {
    ...trip,
    checkpoints: trip.checkpoints ? JSON.parse(trip.checkpoints) : []
  };
}

// ==========================================
// SYSTEME DE SÉCURITÉ ET GENERATION DE TOKEN (JWT NATIF)
// ==========================================
function generateToken(payload: { id: string; agencyId?: string; role: string; subRole?: string; name: string }) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token: string) {
  try {
    const [header, body, signature] = token.split('.');
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');
    
    if (signature !== expectedSignature) return null;
    
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch (e) {
    return null;
  }
}

// ==========================================
// SYSTEME DE NOTIFICATIONS SIMULÉES (SMS & EMAIL)
// ==========================================

async function sendSMS(to: string, message: string) {
  console.log(`\n--- 📱 [SIMULATEUR SMS GABON] ---`);
  console.log(`Destinataire : ${to}`);
  console.log(`Message      : "${message}"`);
  console.log(`---------------------------------\n`);
}

async function sendEmail(to: string, subject: string, body: string) {
  console.log(`\n--- ✉️ [SIMULATEUR EMAIL] ---`);
  console.log(`Destinataire : ${to}`);
  console.log(`Sujet        : ${subject}`);
  console.log(`Contenu      : \n${body}`);
  console.log(`-----------------------------\n`);
}

// Middleware Express pour protéger les routes privées
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: Bearer <token>

  if (!token) {
    return res.status(401).json({ success: false, message: "Accès refusé. Jeton d'authentification manquant." });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ success: false, message: "Session expirée ou invalide. Veuillez vous reconnecter." });
  }

  req.user = decoded; 
  next();
}

// ==========================================
// SEEDING SERVICE (CONVERTS STATIC SEEDS TO SQLITE)
// ==========================================
async function seedDatabaseIfEmpty() {
  const agencyCount = await prisma.agency.count();
  if (agencyCount > 0) return;

  console.log("[SEED] Base de données vide. Initialisation des données par défaut...");

  // 1. Seed Agencies
  for (const agency of GABON_AGENCIES) {
    await prisma.agency.create({
      data: {
        id: agency.id,
        name: agency.name,
        packName: agency.packName,
        activeBuses: agency.activeBuses,
        commissionRate: agency.commissionRate,
        monthlyFee: agency.monthlyFee,
        logo: agency.logo,
        joinedDate: agency.joinedDate,
        status: agency.status,
        password: agency.password || 'gabon2026'
      }
    });
  }

  // 2. Seed Buses & Drivers
  const initialPlates = ['G-340-AA', 'G-782-BC', 'G-102-DF', 'G-889-AA', 'G-512-CC', 'G-999-BB', 'G-123-AA', 'G-456-ZZ'];
  const initialDrivers = [
    { name: 'Jean-Pierre Ndong', phone: '+241 077 45 12 89' },
    { name: 'Brice Obiang', phone: '+241 066 18 29 40' },
    { name: 'Marius Moussavou', phone: '+241 074 88 56 12' },
    { name: 'Christian Bekale', phone: '+241 065 33 22 11' },
    { name: 'Serge Ella', phone: '+241 076 90 44 55' },
    { name: 'Sylvestre Mba', phone: '+241 077 11 22 33' },
    { name: 'Gérard Obame', phone: '+241 066 44 55 66' }
  ];

  let busId = 1;
  let driverId = 1;

  for (const agency of GABON_AGENCIES) {
    const numItems = agency.id === 'agency-1' ? 4 : 3;
    for (let i = 0; i < numItems; i++) {
      const plateIndex = (busId - 1) % initialPlates.length;
      const driverIndex = (driverId - 1) % initialDrivers.length;

      await prisma.bus.create({
        data: {
          id: `bus-${busId++}`,
          agencyId: agency.id,
          plate: initialPlates[plateIndex],
          capacity: 40 - (plateIndex % 3) * 5
        }
      });

      const refDriver = initialDrivers[driverIndex];
      await prisma.driver.create({
        data: {
          id: `driver-${driverId++}`,
          agencyId: agency.id,
          name: refDriver.name,
          phone: refDriver.phone
        }
      });
    }
  }

  // 3. Seed Custom Routes
  for (const route of GABON_ROUTES) {
    await prisma.gabonRouteInfo.create({
      data: {
        id: route.id,
        departure: route.departure,
        arrival: route.arrival,
        distance: route.distance,
        roadCondition: route.roadCondition,
        estimatedDuration: route.estimatedDuration,
        checkpoints: JSON.stringify(route.checkpoints)
      }
    });
  }

  // 4. Seed Tariffs
  let tariffIdCount = 1;
  for (const agency of GABON_AGENCIES) {
    for (const route of GABON_ROUTES) {
      const basePrice = PRICES_BY_DESTINATION[route.arrival] || 10000;
      const variation = agency.id === 'agency-1' ? 0 : agency.id === 'agency-2' ? 1000 : agency.id === 'agency-3' ? -1000 : 500;
      await prisma.tariff.create({
        data: {
          id: `tariff-${tariffIdCount++}`,
          agencyId: agency.id,
          agencyName: agency.name,
          departure: route.departure,
          arrival: route.arrival,
          price: basePrice + variation
        }
      });
    }
  }

  // 5. Seed Trips
  const dates = [
    new Date(), 
    new Date(Date.now() + 24 * 60 * 60 * 1000), 
  ];

  let tripIdCounter = 1;

  for (let dateIdx = 0; dateIdx < dates.length; dateIdx++) {
    const date = dates[dateIdx];
    for (let routeIdx = 0; routeIdx < GABON_ROUTES.length; routeIdx++) {
      const route = GABON_ROUTES[routeIdx];
      const numTrips = routeIdx % 2 === 0 ? 2 : 1;
      
      for (let i = 0; i < numTrips; i++) {
        const agency = GABON_AGENCIES[(routeIdx + i + dateIdx) % GABON_AGENCIES.length];
        const driver = DRIVERS[(routeIdx + i) % DRIVERS.length];
        const bus = BUS_PLATES[(routeIdx + i) % BUS_PLATES.length];

        const hour = 6 + i * 5;
        const depDate = new Date(date);
        depDate.setHours(hour, 0, 0, 0);

        const durationMinutes = route.distance * 1.5;
        const arrDate = new Date(depDate.getTime() + durationMinutes * 60 * 1000);

        const tariff = await prisma.tariff.findFirst({
          where: { agencyId: agency.id, departure: route.departure, arrival: route.arrival }
        });
        const price = tariff ? tariff.price : (PRICES_BY_DESTINATION[route.arrival] || 10000);

        await prisma.trip.create({
          data: {
            id: `trip-${tripIdCounter++}`,
            agencyId: agency.id,
            agencyName: agency.name,
            departure: route.departure,
            arrival: route.arrival,
            departureTime: depDate.toISOString(),
            arrivalTime: arrDate.toISOString(),
            price: price,
            busCapacity: bus.capacity,
            availableSeats: bus.capacity - Math.floor(Math.random() * 10) - 5,
            busNumber: bus.plate,
            checkpoints: JSON.stringify(route.checkpoints),
            driverName: driver.name,
            driverPhone: driver.phone
          }
        });
      }
    }
  }

  // 6. Seed Bookings
  const dbTrips = await prisma.trip.findMany();
  await prisma.booking.createMany({
    data: [
      {
        id: 'TX-GAB-1029',
        tripId: 'trip-1',
        travelerName: 'Marius Mba Obame',
        travelerPhone: '+241 077 29 11 04',
        travelerCni: '240910029302',
        seatNumber: 12,
        status: 'EMBARQUE',
        paymentMethod: 'AIRTEL_MONEY',
        paymentPhone: '077291104',
        amount: dbTrips.find(t => t.id === 'trip-1')?.price || 15000,
        transactionId: 'AM-TX-9920192',
        createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
        boardedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        paymentType: 'EN_LIGNE'
      },
      {
        id: 'TX-GAB-3490',
        tripId: 'trip-1',
        travelerName: 'Divine Louembe',
        travelerPhone: '+241 065 14 38 90',
        travelerCni: '110291938202',
        seatNumber: 15,
        status: 'PAYE',
        paymentMethod: 'MOOV_MONEY',
        paymentPhone: '065143890',
        amount: dbTrips.find(t => t.id === 'trip-1')?.price || 15000,
        transactionId: 'MV-TX-4481029',
        createdAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
        paymentType: 'EN_LIGNE'
      },
      {
        id: 'TX-GAB-7729',
        tripId: 'trip-2',
        travelerName: 'Stéphane Ndong',
        travelerPhone: '+241 074 55 99 22',
        travelerCni: '150910010920',
        seatNumber: 5,
        status: 'PAYE',
        paymentMethod: 'AIRTEL_MONEY',
        paymentPhone: '074559922',
        amount: dbTrips.find(t => t.id === 'trip-2')?.price || 25000,
        transactionId: 'AM-TX-3409182',
        createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
        paymentType: 'EN_LIGNE'
      }
    ]
  });

  // 7. Seed Reviews
  await prisma.review.createMany({
    data: [
      {
        id: 'rev-1',
        agencyId: 'agency-1',
        tripId: 'trip-1',
        reviewerName: 'Marius Mba Obame',
        rating: 5,
        comment: "Superbe voyage avec Major Transport ! Le bus est parti pile à l'heure de la gare routière de Libreville. Chauffeur très professionnel et prudent sur l'axe Kango-Bifoun. À recommander ! ⭐⭐⭐⭐⭐",
        createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: 'rev-2',
        agencyId: 'agency-2',
        reviewerName: 'Divine Louembe',
        rating: 4,
        comment: "La Transgabonelle propose des bus bien entretenus et climatisés. Un petit retard au départ à cause du chargement des bagages, mais trajet très agréable vers Oyem.",
        createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: 'rev-3',
        agencyId: 'agency-3',
        reviewerName: 'Stéphane Ndong',
        rating: 5,
        comment: "Rien à dire, voyage vers Mouila très propre. Paiement mobile money facile et embarquement rapide par QR code.",
        createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString()
      }
    ]
  });

  // 8. Seed Agency Users (Default CHEF & AGENT for testing)
  const userCount = await prisma.agencyUser.count();
  if (userCount === 0) {
    console.log("[SEED] Création des comptes utilisateurs par défaut pour les agences...");
    for (const agency of GABON_AGENCIES) {
      await prisma.agencyUser.create({
        data: {
          username: `chef_${agency.id.replace('-', '')}`,
          password: 'gabon2026',
          name: `Chef ${agency.name}`,
          role: 'CHEF',
          agencyId: agency.id
        }
      });

      await prisma.agencyUser.create({
        data: {
          username: `agent_${agency.id.replace('-', '')}`,
          password: 'gabon2026',
          name: `Agent ${agency.name}`,
          role: 'AGENT',
          agencyId: agency.id
        }
      });
    }
    console.log("[SEED] Comptes agences initialisés.");
  }

  // 9. Seed SuperAdmin par défaut (S'il n'existe pas déjà)
  const superAdminCount = await prisma.superAdmin.count();
  if (superAdminCount === 0) {
    console.log("[SEED] Initialisation du compte SuperAdmin central...");
    await prisma.superAdmin.create({
      data: {
        username: 'admin',
        password: 'admin2026',
        name: 'SuperAdmin SaaS'
      }
    });
    console.log("[SEED] Compte SuperAdmin initialisé.");
  }

  console.log("[SEED] Base de données initialisée.");
}

// ==========================================
// ENDPOINT SÉCURISÉ D'AUTHENTIFICATION (LOGIN)
// ==========================================
app.post('/api/auth/login', async (req, res) => {
  const { role, password, username } = req.body;

  if (!role || !password) {
    return res.status(400).json({ success: false, message: "Rôle et mot de passe requis." });
  }

  try {
    if (role === 'superadmin') {
      const usernameInput = username || 'admin';
      const superAdmin = await prisma.superAdmin.findUnique({
        where: { username: usernameInput }
      });

      if (!superAdmin || superAdmin.password !== password) {
        return res.status(401).json({ success: false, message: "Identifiants ou mot de passe administrateur incorrects." });
      }

      const token = generateToken({ id: superAdmin.id, role: 'superadmin', name: superAdmin.name });
      return res.json({ success: true, token, user: { id: superAdmin.id, role: 'superadmin', name: superAdmin.name } });
      
    } else if (role === 'agent') {
      if (!username) {
        return res.status(400).json({ success: false, message: "Nom d'utilisateur requis." });
      }

      // Recherche de l'agent opérationnel d'embarquement (doit posséder le rôle AGENT ou CHEF d'agence)
      const user = await prisma.agencyUser.findUnique({
        where: { username },
        include: { agency: true }
      });

      if (!user || user.password !== password) {
        return res.status(401).json({ success: false, message: "Identifiants ou mot de passe incorrects." });
      }

      // On génère le token avec le rôle 'agent' pour l'App.tsx
      const token = generateToken({
        id: user.id,
        agencyId: user.agencyId,
        role: 'agent',
        subRole: user.role,
        name: user.name
      });

      return res.json({
        success: true,
        token,
        user: {
          id: user.id,
          agencyId: user.agencyId,
          role: 'agent',
          subRole: user.role,
          name: user.name,
          agencyName: user.agency.name
        }
      });

    } else if (role === 'agency') {
      if (!username) {
        return res.status(400).json({ success: false, message: "Nom d'utilisateur requis." });
      }

      // Recherche de l'utilisateur d'agence dans la base de données
      const user = await prisma.agencyUser.findUnique({
        where: { username },
        include: { agency: true }
      });

      if (!user || user.password !== password) {
        return res.status(401).json({ success: false, message: "Identifiants ou mot de passe incorrects." });
      }

      // Génération du token incluant le sous-rôle (CHEF ou AGENT)
      const token = generateToken({
        id: user.id,
        agencyId: user.agencyId,
        role: 'agency',
        subRole: user.role, // "CHEF" ou "AGENT"
        name: user.name
      });

      return res.json({
        success: true,
        token,
        user: {
          id: user.id,
          agencyId: user.agencyId,
          role: 'agency',
          subRole: user.role,
          name: user.name,
          agencyName: user.agency.name
        }
      });
    }

    return res.status(401).json({ success: false, message: "Mot de passe incorrect." });

  } catch (error: any) {
    res.status(500).json({ success: false, message: "Erreur lors de la connexion.", error: error.message });
  }
});

app.post('/api/bookings/pay-cash', authenticateToken, async (req, res) => {
  const { bookingId } = req.body;

  if (!bookingId) {
    return res.status(400).json({ success: false, message: "Identifiant de réservation manquant" });
  }

  // Interdiction formelle pour les simples agents d'embarquement de valider un encaissement
  if (req.user.role === 'agency' && req.user.subRole === 'AGENT') {
    return res.status(403).json({ success: false, message: "Accès refusé. Les agents d'embarquement ne sont pas autorisés à encaisser des espèces." });
  }

  try {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { trip: true } });
    if (!booking) {
      return res.status(404).json({ success: false, message: "Réservation introuvable" });
    }

    if (req.user.role === 'agency' && req.user.agencyId !== booking.trip?.agencyId) {
      return res.status(403).json({ success: false, message: "Non autorisé." });
    }

    if (booking.status !== 'EN_ATTENTE') {
      return res.status(400).json({ success: false, message: "Cette réservation est déjà payée ou embarquée." });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'PAYE',
        paymentMethod: 'AGENCE',
        transactionId: `CSH-REC-${Math.floor(1000000 + Math.random() * 9000000)}`
      }
    });

    res.json({
      success: true,
      message: `Paiement en espèces de ${booking.amount.toLocaleString()} FCFA validé ! Le billet est marqué comme PAYÉ.`,
      data: {
        booking: updatedBooking,
        trip: formatTrip(booking.trip)
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// SECURE API ENDPOINTS
// ==========================================

// 1. Fetch available trips (PUBLIC)
app.get('/api/trips', async (req, res) => {
  const { departure, arrival, agencyId } = req.query;
  try {
    const where: any = {};
    if (departure) where.departure = departure as string;
    if (arrival) where.arrival = arrival as string;
    if (agencyId) where.agencyId = agencyId as string;

    const dbTrips = await prisma.trip.findMany({
      where,
      orderBy: { departureTime: 'asc' }
    });

    res.json({ success: true, count: dbTrips.length, data: dbTrips.map(formatTrip) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Add custom trip (PROTECTED)
app.post('/api/trips', authenticateToken, async (req, res) => {
  const { agencyId, departure, arrival, departureTime, price, busCapacity, busNumber, checkpoints, driverName, driverPhone } = req.body;

  // L'agence connectée ne peut créer des trajets que pour elle-même
  if (req.user.role === 'agency' && req.user.id !== agencyId) {
    return res.status(403).json({ success: false, message: "Non autorisé à planifier pour une autre agence." });
  }

  if (!agencyId || !departure || !arrival || !departureTime || !price || !busCapacity || !busNumber) {
    return res.status(400).json({ success: false, message: "Paramètres d'itinéraire manquants ou invalides" });
  }

  try {
    const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
    if (!agency) {
      return res.status(404).json({ success: false, message: "Agence non reconnue" });
    }

    const depDate = new Date(departureTime);
    const route = await prisma.gabonRouteInfo.findFirst({ where: { departure, arrival } });
    const distance = route ? route.distance : 300;
    const arrDate = new Date(depDate.getTime() + (distance * 1.5) * 60 * 1000);

    const computedCheckpoints = checkpoints || (route ? JSON.parse(route.checkpoints) : []);

    const newTrip = await prisma.trip.create({
      data: {
        id: `trip-${Date.now()}`,
        agencyId,
        agencyName: agency.name,
        departure,
        arrival,
        departureTime: depDate.toISOString(),
        arrivalTime: arrDate.toISOString(),
        price: Number(price),
        busCapacity: Number(busCapacity),
        availableSeats: Number(busCapacity),
        busNumber,
        checkpoints: JSON.stringify(computedCheckpoints),
        driverName: driverName || 'Chauffeur Intérimaire',
        driverPhone: driverPhone || '+241 077 00 00 00'
      }
    });

    res.json({ success: true, message: "Voyage planifié avec succès !", data: formatTrip(newTrip) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- DYNAMIC CUSTOM ROUTES ENDPOINTS (PROTECTED FOR WRITE) ---
app.get('/api/routes', async (req, res) => {
  try {
    const routes = await prisma.gabonRouteInfo.findMany();
    const formatted = routes.map(r => ({
      ...r,
      checkpoints: r.checkpoints ? JSON.parse(r.checkpoints) : []
    }));
    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/routes', authenticateToken, async (req, res) => {
  const { departure, arrival, distance, roadCondition, estimatedDuration, checkpoints } = req.body;
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: "Réservé au SuperAdmin." });
  }

  if (!departure || !arrival) {
    return res.status(400).json({ success: false, message: "Le départ et la destination sont obligatoires." });
  }

  try {
    const existing = await prisma.gabonRouteInfo.findFirst({ where: { departure, arrival } });
    if (existing) {
      return res.status(400).json({ success: false, message: `L'itinéraire ${departure} ➔ ${arrival} existe déjà.` });
    }

    const newRoute = await prisma.gabonRouteInfo.create({
      data: {
        id: `route-${Date.now()}`,
        departure,
        arrival,
        distance: distance ? Number(distance) : 250,
        roadCondition: roadCondition || 'Praticable avec nids de poule',
        estimatedDuration: estimatedDuration || '4h',
        checkpoints: JSON.stringify(checkpoints || [])
      }
    });

    res.json({
      success: true,
      message: "Itinéraire/Ligne ajouté avec succès !",
      data: { ...newRoute, checkpoints: JSON.parse(newRoute.checkpoints) }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/routes/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { departure, arrival, distance, roadCondition, estimatedDuration, checkpoints } = req.body;
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: "Réservé au SuperAdmin." });
  }

  try {
    const route = await prisma.gabonRouteInfo.findUnique({ where: { id } });
    if (!route) {
      return res.status(404).json({ success: false, message: "Itinéraire introuvable" });
    }

    const updated = await prisma.gabonRouteInfo.update({
      where: { id },
      data: {
        departure: departure || route.departure,
        arrival: arrival || route.arrival,
        distance: distance !== undefined ? Number(distance) : route.distance,
        roadCondition: roadCondition || route.roadCondition,
        estimatedDuration: estimatedDuration || route.estimatedDuration,
        checkpoints: checkpoints ? JSON.stringify(checkpoints) : route.checkpoints
      }
    });

    res.json({
      success: true,
      message: "Itinéraire mis à jour avec succès !",
      data: { ...updated, checkpoints: JSON.parse(updated.checkpoints) }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/routes/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: "Réservé au SuperAdmin." });
  }

  try {
    const route = await prisma.gabonRouteInfo.findUnique({ where: { id } });
    if (!route) {
      return res.status(404).json({ success: false, message: "Itinéraire introuvable" });
    }

    await prisma.gabonRouteInfo.delete({ where: { id } });
    res.json({ success: true, message: `Itinéraire ${route.departure} ➔ ${route.arrival} supprimé.` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- BUSES ENDPOINTS (PROTECTED) ---
app.get('/api/buses', authenticateToken, async (req, res) => {
  const { agencyId } = req.query;
  try {
    const where: any = {};
    if (agencyId) where.agencyId = agencyId as string;
    
    if (req.user.role === 'agency') {
      where.agencyId = req.user.agencyId;
    }

    const dbBuses = await prisma.bus.findMany({ where });
    res.json({ success: true, count: dbBuses.length, data: dbBuses });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/buses', authenticateToken, async (req, res) => {
  const { agencyId, plate, capacity } = req.body;
  if (req.user.role === 'agency' && req.user.agencyId !== agencyId) {
    return res.status(403).json({ success: false, message: "Non autorisé." });
  }

  if (!agencyId || !plate || !capacity) {
    return res.status(400).json({ success: false, message: "Tous les champs sont requis." });
  }
  try {
    const newBus = await prisma.bus.create({
      data: {
        id: `bus-${Date.now()}`,
        agencyId,
        plate,
        capacity: Number(capacity)
      }
    });
    res.json({ success: true, message: "Bus enregistré avec succès !", data: newBus });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/buses/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const bus = await prisma.bus.findUnique({ where: { id } });
    if (!bus) return res.status(404).json({ success: false, message: "Bus non trouvé." });
    
    if (req.user.role === 'agency' && req.user.agencyId !== bus.agencyId) {
      return res.status(403).json({ success: false, message: "Non autorisé." });
    }

    await prisma.bus.delete({ where: { id } });
    res.json({ success: true, message: "Bus supprimé avec succès !" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- DRIVERS ENDPOINTS (PROTECTED) ---
app.get('/api/drivers', authenticateToken, async (req, res) => {
  const { agencyId } = req.query;
  try {
    const where: any = {};
    if (agencyId) where.agencyId = agencyId as string;
    
    if (req.user.role === 'agency') {
      where.agencyId = req.user.agencyId;
    }

    const dbDrivers = await prisma.driver.findMany({ where });
    res.json({ success: true, count: dbDrivers.length, data: dbDrivers });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/drivers', authenticateToken, async (req, res) => {
  const { agencyId, name, phone } = req.body;
  if (req.user.role === 'agency' && req.user.agencyId !== agencyId) {
    return res.status(403).json({ success: false, message: "Non autorisé." });
  }

  if (!agencyId || !name || !phone) {
    return res.status(400).json({ success: false, message: "Tous les champs sont requis." });
  }
  try {
    const newDriver = await prisma.driver.create({
      data: {
        id: `driver-${Date.now()}`,
        agencyId,
        name,
        phone
      }
    });
    res.json({ success: true, message: "Chauffeur enregistré avec succès !", data: newDriver });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/drivers/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const driver = await prisma.driver.findUnique({ where: { id } });
    if (!driver) return res.status(404).json({ success: false, message: "Chauffeur non trouvé." });
    
    if (req.user.role === 'agency' && req.user.agencyId !== driver.agencyId) {
      return res.status(403).json({ success: false, message: "Non autorisé." });
    }

    await prisma.driver.delete({ where: { id } });
    res.json({ success: true, message: "Chauffeur supprimé avec succès !" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- TRIPS EDIT / DELETE ENDPOINTS (PROTECTED) ---
app.put('/api/trips/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { departure, arrival, departureTime, price, busCapacity, busNumber, driverName, driverPhone, checkpoints } = req.body;
  
  try {
    const currentTrip = await prisma.trip.findUnique({ where: { id } });
    if (!currentTrip) {
      return res.status(404).json({ success: false, message: "Voyage introuvable" });
    }

    if (req.user.role === 'agency' && req.user.agencyId !== currentTrip.agencyId) {
      return res.status(403).json({ success: false, message: "Non autorisé à modifier ce trajet." });
    }

    const depDate = departureTime ? new Date(departureTime) : new Date(currentTrip.departureTime);
    const route = await prisma.gabonRouteInfo.findFirst({
      where: { departure: departure || currentTrip.departure, arrival: arrival || currentTrip.arrival }
    });
    const distance = route ? route.distance : 300;
    const arrDate = new Date(depDate.getTime() + (distance * 1.5) * 60 * 1000);

    const updated = await prisma.trip.update({
      where: { id },
      data: {
        departure: departure || currentTrip.departure,
        arrival: arrival || currentTrip.arrival,
        departureTime: depDate.toISOString(),
        arrivalTime: arrDate.toISOString(),
        price: price !== undefined ? Number(price) : currentTrip.price,
        busCapacity: busCapacity !== undefined ? Number(busCapacity) : currentTrip.busCapacity,
        busNumber: busNumber || currentTrip.busNumber,
        driverName: driverName || currentTrip.driverName,
        driverPhone: driverPhone || currentTrip.driverPhone,
        checkpoints: checkpoints ? JSON.stringify(checkpoints) : currentTrip.checkpoints
      }
    });

    res.json({ success: true, message: "Voyage mis à jour avec succès !", data: formatTrip(updated) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/trips/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const trip = await prisma.trip.findUnique({ where: { id } });
    if (!trip) return res.status(404).json({ success: false, message: "Trajet non trouvé." });

    if (req.user.role === 'agency' && req.user.agencyId !== trip.agencyId) {
      return res.status(403).json({ success: false, message: "Non autorisé." });
    }

    await prisma.trip.delete({ where: { id } });
    res.json({ success: true, message: "Voyage supprimé du réseau." });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Fetch all bookings (PROTECTED)
app.get('/api/bookings', authenticateToken, async (req, res) => {
  const { agencyId, travelerPhone } = req.query;

  try {
    const where: any = {};
    if (travelerPhone) {
      where.OR = [
        { travelerPhone: { contains: travelerPhone as string } },
        { paymentPhone: { contains: travelerPhone as string } }
      ];
    }
    
    if (req.user.role === 'agency') {
      where.trip = { agencyId: req.user.agencyId };
    } else if (req.user.role === 'agent') {
      where.trip = { agencyId: req.user.agencyId }; // RESTRICTION OPÉRATIONNELLE : L'agent de quai ne voit que les billets de sa compagnie !
    } else if (agencyId) {
      where.trip = { agencyId: agencyId as string };
    }

    const dbBookings = await prisma.booking.findMany({
      where,
      include: { trip: true }
    });

    const formatted = dbBookings.map(b => ({
      ...b,
      tripDetails: formatTrip(b.trip)
    }));

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Create new ticket booking (PUBLIC - travelers can book)
app.post('/api/bookings', async (req, res) => {
  const { tripId, travelerName, travelerPhone, travelerCni, seatNumber, paymentMethod, paymentPhone, paymentType } = req.body;

  if (!tripId || !travelerName || !travelerPhone || !travelerCni || !seatNumber) {
    return res.status(400).json({ success: false, message: "Champs de réservation incomplets" });
  }

  const isOnline = paymentType !== 'EN_AGENCE';
  if (isOnline && (!paymentMethod || !paymentPhone)) {
    return res.status(400).json({ success: false, message: "Méthode et numéro de paiement mobile requis." });
  }

  try {
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) return res.status(404).json({ success: false, message: "Voyage introuvable" });
    if (trip.availableSeats <= 0) return res.status(400).json({ success: false, message: "Bus complet !" });

    const isSeatTaken = await prisma.booking.findFirst({
      where: { tripId, seatNumber: Number(seatNumber), NOT: { status: 'ANNULE' } }
    });
    if (isSeatTaken) return res.status(400).json({ success: false, message: `Le siège N° ${seatNumber} est déjà réservé.` });

    const bookingId = `TX-GAB-${Math.floor(1000 + Math.random() * 9000)}`;
    const amount = trip.price;

    let finalStatus: 'EN_ATTENTE' | 'PAYE' = 'PAYE';
    let finalMethod: 'AIRTEL_MONEY' | 'MOOV_MONEY' | 'AGENCE' = 'AGENCE';
    let finalPhone = paymentPhone || '';
    let finalTxId = '';

    if (!isOnline) {
      finalStatus = 'EN_ATTENTE';
      finalMethod = 'AGENCE';
      finalPhone = travelerPhone;
      finalTxId = `CSH-AG-${Math.floor(1000000 + Math.random() * 9000000)}`;
    } else {
      finalStatus = 'PAYE';
      finalMethod = paymentMethod as 'AIRTEL_MONEY' | 'MOOV_MONEY';
      const prefix = finalMethod === 'AIRTEL_MONEY' ? 'AM' : 'MV';
      finalTxId = `${prefix}-TX-${Math.floor(1000000 + Math.random() * 9000000)}`;
    }

    const newBooking = await prisma.booking.create({
      data: {
        id: bookingId,
        tripId,
        travelerName,
        travelerPhone,
        travelerCni,
        seatNumber: Number(seatNumber),
        status: finalStatus,
        paymentMethod: finalMethod,
        paymentPhone: finalPhone,
        paymentType: isOnline ? 'EN_LIGNE' : 'EN_AGENCE',
        amount,
        transactionId: finalTxId,
        createdAt: new Date().toISOString()
      }
    });

    await prisma.trip.update({
      where: { id: tripId },
      data: { availableSeats: { decrement: 1 } }
    });

    const welcomeMsg = `Bonjour ${travelerName} ô ! Votre billet ${bookingId} (${trip.departure} -> ${trip.arrival}) est reserve (Siege N°${seatNumber}). Statut: ${finalStatus}. Bon voyage avec ${trip.agencyName} !`;
    await sendSMS(travelerPhone, welcomeMsg);

    res.json({
      success: true,
      message: isOnline 
        ? "Ticket payé et validé avec succès !" 
        : "Réservation enregistrée ! Veuillez payer en agence avant l'embarquement.",
      data: { ...newBooking, tripDetails: formatTrip(trip) }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4b. Record Cash Payment in Agency (PROTECTED)
app.post('/api/bookings/pay-cash', authenticateToken, async (req, res) => {
  const { bookingId } = req.body;

  if (!bookingId) {
    return res.status(400).json({ success: false, message: "Identifiant de réservation manquant" });
  }

  // Interdiction formelle pour les simples agents d'embarquement de valider un encaissement
  if (req.user.role === 'agency' && req.user.subRole === 'AGENT') {
    return res.status(403).json({ success: false, message: "Accès refusé. Les agents d'embarquement ne sont pas autorisés à encaisser des espèces." });
  }

  try {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { trip: true } });
    if (!booking) {
      return res.status(404).json({ success: false, message: "Réservation introuvable" });
    }

    if (req.user.role === 'agency' && req.user.agencyId !== booking.trip?.agencyId) {
      return res.status(403).json({ success: false, message: "Non autorisé." });
    }

    if (booking.status !== 'EN_ATTENTE') {
      return res.status(400).json({ success: false, message: "Cette réservation est déjà payée ou embarquée." });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'PAYE',
        paymentMethod: 'AGENCE',
        transactionId: `CSH-REC-${Math.floor(1000000 + Math.random() * 9000000)}`
      }
    });

    res.json({
      success: true,
      message: `Paiement en espèces de ${booking.amount.toLocaleString()} FCFA validé ! Le billet est marqué comme PAYÉ.`,
      data: {
        booking: updatedBooking,
        trip: formatTrip(booking.trip)
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Mobile money simulated API checkout (PUBLIC)
app.post('/api/payment/simulate', (req, res) => {
  const { phone, amount, operator } = req.body;

  if (!phone || !amount || !operator) {
    return res.status(400).json({ success: false, message: "Champs de transaction invalides" });
  }

  const numericPhone = phone.replace(/\D/g, '');
  if (numericPhone.length < 8) {
    return res.status(400).json({ success: false, message: "Numéro de téléphone gabonais invalide" });
  }

  const txRef = `${operator === 'AIRTEL_MONEY' ? 'AM' : 'MV'}-SIM-${Math.floor(1000000 + Math.random() * 9000000)}`;

  setTimeout(() => {
    res.json({
      success: true,
      status: 'APPROVED',
      transactionId: txRef,
      operatorReference: `OP-${Math.floor(10000000 + Math.random() * 90000000)}`,
      amount: Number(amount),
      currency: 'FCFA',
      phone,
      timestamp: new Date().toISOString(),
      message: `Paiement Mobile Money reçu avec succès sur l'API sécurisée GabonPay.`
    });
  }, 1000);
});

// 6. Validation terrain par QR Code / Code billet (PROTECTED)
app.post('/api/tickets/validate', authenticateToken, async (req, res) => {
  const { ticketId } = req.body;

  if (!ticketId) {
    return res.status(400).json({ success: false, message: "Code de billet manquant" });
  }

  try {
    const booking = await prisma.booking.findUnique({ where: { id: ticketId }, include: { trip: true } });
    if (!booking) {
      return res.status(404).json({ success: false, message: "Billet introuvable dans le système national" });
    }

    if (req.user.role === 'agency' && req.user.agencyId !== booking.trip?.agencyId) {
      return res.status(403).json({ success: false, message: "Non autorisé à valider pour une autre agence." });
    }

    if (req.user.role === 'agent' && req.user.agencyId !== booking.trip?.agencyId) {
      return res.status(403).json({ success: false, message: "Accès refusé. Vous ne pouvez pas valider de billets pour une autre compagnie." });
    }

    if (booking.status === 'EMBARQUE') {
      return res.status(400).json({ success: false, message: "Ce billet a déjà été validé à l'embarquement !" });
    }

    if (booking.status === 'ANNULE') {
      return res.status(400).json({ success: false, message: "Attention, ce billet a été annulé par le voyageur" });
    }

    const originalStatus = booking.status;
    const updatedBooking = await prisma.booking.update({
      where: { id: ticketId },
      data: {
        status: 'EMBARQUE',
        boardedAt: new Date().toISOString()
      }
    });

    res.json({
      success: true,
      message: originalStatus === 'EN_ATTENTE'
        ? `Espèces de ${booking.amount.toLocaleString()} FCFA collectées avec succès en agence ! Embarquement validé.`
        : "Embarquement validé ! Bon voyage.",
      data: {
        booking: updatedBooking,
        trip: formatTrip(booking.trip)
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// NOTATION & AVIS CLIENTS ENDPOINTS
// ==========================================

// 6a. Fetch reviews (PUBLIC)
app.get('/api/reviews', async (req, res) => {
  const { agencyId, tripId } = req.query;
  try {
    const where: any = {};
    if (agencyId) where.agencyId = agencyId as string;
    if (tripId) where.tripId = tripId as string;

    const dbReviews = await prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, count: dbReviews.length, data: dbReviews });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6b. Submit a review (PUBLIC)
app.post('/api/reviews', async (req, res) => {
  const { agencyId, tripId, reviewerName, rating, comment } = req.body;

  if (!agencyId || !reviewerName || rating === undefined || !comment) {
    return res.status(400).json({ success: false, message: "Informations de l'avis incomplètes" });
  }

  const numericRating = Number(rating);
  if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
    return res.status(400).json({ success: false, message: "La note doit être comprise entre 1 et 5 étoiles" });
  }

  try {
    const newReview = await prisma.review.create({
      data: {
        id: `rev-${Date.now()}`,
        agencyId,
        tripId,
        reviewerName,
        rating: numericRating,
        comment,
        createdAt: new Date().toISOString()
      }
    });

    res.json({ success: true, message: "Merci pour votre avis !", data: newReview });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. Core SaaS Dashboard statistics endpoint (PROTECTED - SaaS SuperAdmin Only)
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: "Accès réservé au SuperAdmin de la plateforme." });
  }

  try {
    const activeBookings = await prisma.booking.findMany({
      where: { status: { in: ['PAYE', 'EMBARQUE'] } },
      include: { trip: true }
    });

    const totalTicketsSold = activeBookings.length;
    const totalEarnings = activeBookings.reduce((sum, b) => sum + b.amount, 0);

    const baseAgencies = await prisma.agency.findMany();
    const monthlySaaSFlatFee = baseAgencies.reduce((sum, a) => sum + a.monthlyFee, 0);

    let totalCommissions = 0;
    activeBookings.forEach(b => {
      if (b.trip) {
        const agency = baseAgencies.find(a => a.id === b.trip.agencyId);
        const rate = agency ? agency.commissionRate : 1.0;
        totalCommissions += b.amount * (rate / 100);
      }
    });

    const agencyBreakdown = baseAgencies.map(a => {
      const agencyBookings = activeBookings.filter(b => b.trip?.agencyId === a.id);
      const sales = agencyBookings.reduce((sum, b) => sum + b.amount, 0);
      const comm = sales * (a.commissionRate / 100);

      return {
        name: a.name,
        pack: a.packName,
        sales: sales,
        commissionEarned: comm,
        buses: a.activeBuses,
        subscriptionFee: a.monthlyFee,
        activeTickets: agencyBookings.length
      };
    });

    const activeTripsCount = await prisma.trip.count();

    res.json({
      success: true,
      stats: {
        totalTicketsSold,
        totalEarnings,
        platformRevenue: totalCommissions + monthlySaaSFlatFee,
        commissionRevenue: totalCommissions,
        subscriptionRevenue: monthlySaaSFlatFee,
        activeAgenciesCount: baseAgencies.length,
        activeTripsCount,
      },
      agencyBreakdown
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// DYNAMIC CRUD FOR AGENCIES & TARIFFS
// ==========================================

// 7a. Get all agencies (PUBLIC - Excludes Sensitive Passwords)
app.get('/api/agencies', async (req, res) => {
  try {
    const allAgencies = await prisma.agency.findMany({
      select: {
        id: true,
        name: true,
        packName: true,
        activeBuses: true,
        commissionRate: true,
        monthlyFee: true,
        logo: true,
        joinedDate: true,
        status: true
      }
    });
    res.json({ success: true, count: allAgencies.length, data: allAgencies });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7b. Create an agency (PROTECTED - SuperAdmin Only)
app.post('/api/agencies', authenticateToken, async (req, res) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: "Action réservée au SuperAdmin." });
  }

  const { name, packName, activeBuses, commissionRate, monthlyFee, logo, password } = req.body;
  if (!name || !packName) {
    return res.status(400).json({ success: false, message: "Nom et type de Pack requis." });
  }

  try {
    const newAgency = await prisma.agency.create({
      data: {
        id: `agency-${Date.now()}`,
        name,
        packName: packName || 'Starter',
        activeBuses: Number(activeBuses) || 0,
        commissionRate: Number(commissionRate) || 1.0,
        monthlyFee: Number(monthlyFee) || 15000,
        logo: logo || '🚌',
        joinedDate: new Date().toISOString().split('T')[0],
        status: 'ACTIVE',
        password: password || 'gabon2026'
      }
    });

    const routes = await prisma.gabonRouteInfo.findMany();
    for (const route of routes) {
      await prisma.tariff.create({
        data: {
          id: `tariff-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          agencyId: newAgency.id,
          agencyName: newAgency.name,
          departure: route.departure,
          arrival: route.arrival,
          price: PRICES_BY_DESTINATION[route.arrival] || 12000
        }
      });
    }

    res.json({ success: true, message: `L'agence "${name}" a été ajoutée avec succès !`, data: newAgency });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7c. Update an agency (PROTECTED)
app.put('/api/agencies/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, packName, activeBuses, commissionRate, monthlyFee, logo, status, password } = req.body;

  if (req.user.role === 'agency' && req.user.agencyId !== id) {
    return res.status(403).json({ success: false, message: "Non autorisé." });
  }

  try {
    const agency = await prisma.agency.findUnique({ where: { id } });
    if (!agency) {
      return res.status(404).json({ success: false, message: "Agence introuvable." });
    }

    const updated = await prisma.agency.update({
      where: { id },
      data: {
        name: name || agency.name,
        packName: packName || agency.packName,
        activeBuses: activeBuses !== undefined ? Number(activeBuses) : agency.activeBuses,
        commissionRate: commissionRate !== undefined ? Number(commissionRate) : agency.commissionRate,
        monthlyFee: monthlyFee !== undefined ? Number(monthlyFee) : agency.monthlyFee,
        logo: logo || agency.logo,
        status: status || agency.status,
        password: password || agency.password || 'gabon2026'
      }
    });

    if (name && name !== agency.name) {
      await prisma.tariff.updateMany({
        where: { agencyId: id },
        data: { agencyName: name }
      });
      await prisma.trip.updateMany({
        where: { agencyId: id },
        data: { agencyName: name }
      });
    }

    res.json({ success: true, message: `L'agence "${updated.name}" a été mise à jour avec succès.`, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7d. Delete an agency (PROTECTED - SuperAdmin Only)
app.delete('/api/agencies/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: "Action réservée au SuperAdmin." });
  }

  try {
    const agency = await prisma.agency.findUnique({ where: { id } });
    if (!agency) {
      return res.status(404).json({ success: false, message: "Agence introuvable." });
    }

    await prisma.agency.delete({ where: { id } });
    res.json({ success: true, message: `L'agence "${agency.name}" et toutes ses dépendances ont été supprimées.` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7e. Get all tariffs (PUBLIC)
app.get('/api/tariffs', async (req, res) => {
  try {
    const tariffs = await prisma.tariff.findMany();
    res.json({ success: true, count: tariffs.length, data: tariffs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7f. Create a tariff (PROTECTED)
app.post('/api/tariffs', authenticateToken, async (req, res) => {
  const { agencyId, departure, arrival, price } = req.body;
  if (req.user.role === 'agency' && req.user.agencyId !== agencyId) {
    return res.status(403).json({ success: false, message: "Non autorisé." });
  }

  if (!agencyId || !departure || !arrival || price === undefined) {
    return res.status(400).json({ success: false, message: "Tous les champs sont requis." });
  }

  try {
    const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
    if (!agency) {
      return res.status(404).json({ success: false, message: "Compagnie de transport non identifiée." });
    }

    const existing = await prisma.tariff.findFirst({
      where: { agencyId, departure, arrival }
    });
    if (existing) {
      return res.status(400).json({ success: false, message: `Un tarif existe déjà pour cette ligne.` });
    }

    const newTariff = await prisma.tariff.create({
      data: {
        id: `tariff-${Date.now()}`,
        agencyId,
        agencyName: agency.name,
        departure,
        arrival,
        price: Number(price)
      }
    });

    res.json({ success: true, message: `Tarif ajouté avec succès !`, data: newTariff });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7g. Update a tariff (PROTECTED)
app.put('/api/tariffs/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { price, departure, arrival } = req.body;

  try {
    const tariff = await prisma.tariff.findUnique({ where: { id } });
    if (!tariff) {
      return res.status(404).json({ success: false, message: "Tarif introuvable." });
    }

    if (req.user.role === 'agency' && req.user.agencyId !== tariff.agencyId) {
      return res.status(403).json({ success: false, message: "Non autorisé." });
    }

    const updated = await prisma.tariff.update({
      where: { id },
      data: {
        price: price !== undefined ? Number(price) : tariff.price,
        departure: departure || tariff.departure,
        arrival: arrival || tariff.arrival
      }
    });

    res.json({ success: true, message: "Tarif mis à jour avec succès.", data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7h. Delete a tariff (PROTECTED)
app.delete('/api/tariffs/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const tariff = await prisma.tariff.findUnique({ where: { id } });
    if (!tariff) return res.status(404).json({ success: false, message: "Tarif non trouvé." });

    if (req.user.role === 'agency' && req.user.agencyId !== tariff.agencyId) {
      return res.status(403).json({ success: false, message: "Non autorisé." });
    }

    await prisma.tariff.delete({ where: { id } });
    res.json({ success: true, message: "Tarif supprimé avec succès." });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 8. Gemini Assistant Samba Endpoint (PUBLIC - Sécurisé avec Retry Auto)
app.post('/api/ai/chat', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ success: false, message: "Format de messages invalide" });
  }

  try {
    const conversation = messages.map((m: any) => `${m.sender === 'user' ? 'Voyageur' : 'Samba (Assistant IA)'}: ${m.text}`).join('\n');
    
    const systemPrompt = `Tu es Samba, un assistant d'intelligence artificielle spécialisé dans le transport terrestre au Gabon.
    Ton rôle est d'aider les voyageurs et les agences de voyage gabonaises.
    Sois chaleureux, poli et utilise des expressions courantes gabonaises de manière naturelle (ex: "Bonjour ô", "Y a pas de problème", "Tranquille", "C'est propre").
    Fournis des informations réalistes sur la géographie du Gabon, les routes nationales (Nationale 1 vers le sud/est, Nationale 2 vers le nord), les contrôles de police/gendarmerie (Rappeler que la CNI nationale ou le Passeport en cours de validité est STRICTEMENT OBLIGATOIRE à Bifoun, Kango, Alembe pour voyager en sécurité).
    Si on te pose des questions sur les agences de voyage partenaires, cite : Major Transport, La Transgabonelle, TTO, Mvett Voyages, La Louetsi.
    Explique que le paiement se fait instantanément via Airtel Money (*150#) ou Moov Money (*555#) de manière totalement sécurisée.
    Garde tes réponses concises, informatives et faciles à lire pour un utilisateur mobile.`;

    const prompt = `${systemPrompt}\n\nVoici la conversation en cours :\n${conversation}\nSamba (Assistant IA):`;

    let response;
    const maxRetries = 3;
    let delay = 1000;

    // Boucle de retentatives automatiques en cas d'erreur de connexion transitoire (ECONNRESET)
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        response = await ai.models.generateContent({
          model: 'gemini-2.0-flash', 
          contents: prompt,
        });
        break; // Si l'appel réussit, on sort immédiatement de la boucle
      } catch (err: any) {
        const errorText = err.message || "";
        const isNetworkError = errorText.includes("fetch failed") || errorText.includes("ECONNRESET") || err.code === "ECONNRESET";

        if (isNetworkError && attempt < maxRetries) {
          console.warn(`[Gemini Retry] Tentative ${attempt}/${maxRetries} échouée en raison d'un problème réseau (${errorText}). Nouvelle tentative dans ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Temps d'attente doublé à chaque tentative (backoff)
        } else {
          throw err; // Propage l'erreur si elle n'est pas réseau ou si les tentatives sont épuisées
        }
      }
    }

    res.json({
      success: true,
      text: response?.text || "Désolé, j'ai eu un petit problème de réseau. Repose ta question s'il te plaît !"
    });

  } catch (error: any) {
    console.error("Gemini AI API Error:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la génération IA.",
      error: error.message
    });
  }
});

// ==========================================
// VITE OR STATIC FRONTEND INTEGRATION
// ==========================================
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const interfaceName in interfaces) {
    const addresses = interfaces[interfaceName];
    if (addresses) {
      for (const addr of addresses) {
        if (addr.family === 'IPv4' && !addr.internal) {
          return addr.address;
        }
      }
    }
  }
  return 'localhost';
}

async function startServer() {
  try {
    await seedDatabaseIfEmpty();
  } catch (error) {
    console.error("[SEED ERROR] Failed to seed database:", error);
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite Middleware...");
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        host: true 
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    const localIP = getLocalIpAddress();
    console.log(`\n==================================================`);
    console.log(`[OK] Serveur démarré avec succès !`);
    console.log(`🏠 Local:           http://localhost:${PORT}`);
    console.log(`🌐 Réseau local:    http://${localIP}:${PORT}`); 
    console.log(`==================================================\n`);
  });
}

startServer();


// ==========================================
// PORTAIL GESTION DES COLIS (FRET & BAGAGES)
// ==========================================

// 1. Enregistrer un nouveau colis (PROTECTED - Agence uniquement)
app.post('/api/parcels', authenticateToken, async (req, res) => {
  const { senderName, senderPhone, receiverName, receiverPhone, departure, arrival, weight, description, price, agencyId, tripId } = req.body;

  if (req.user.role === 'agency' && req.user.agencyId !== agencyId) {
    return res.status(403).json({ success: false, message: "Non autorisé à enregistrer un colis pour une autre agence." });
  }

  if (!senderName || !senderPhone || !receiverName || !receiverPhone || !departure || !arrival || !price || !agencyId) {
    return res.status(400).json({ success: false, message: "Informations d'expédition incomplètes." });
  }

  try {
    const parcelId = `COL-GAB-${Math.floor(10000 + Math.random() * 90000)}`;

    const newParcel = await prisma.parcel.create({
      data: {
        id: parcelId,
        senderName,
        senderPhone,
        receiverName,
        receiverPhone,
        departure,
        arrival,
        weight: weight ? Number(weight) : null,
        description: description || null,
        price: Number(price),
        status: 'ENREGISTRE',
        agencyId,
        tripId: tripId || null,
        createdAt: new Date().toISOString()
      },
      include: { trip: true }
    });

    const senderMsg = `TransGabon Connect : Votre colis ${parcelId} à destination de ${arrival} a bien ete enregistre. Tarif: ${price} FCFA. Merci de votre confiance !`;
    const receiverMsg = `Bonjour ${receiverName}, un colis (Ref: ${parcelId}) vous a ete expedie depuis ${departure} par ${senderName}. Vous recevrez un SMS des son arrivee à la gare de destination.`;
    
    await sendSMS(senderPhone, senderMsg);
    await sendSMS(receiverPhone, receiverMsg);

    res.json({ 
      success: true, 
      message: `Colis ${parcelId} enregistré avec succès !`, 
      data: { ...newParcel, trip: formatTrip(newParcel.trip) }
    });

  } catch (error: any) {
    res.status(500).json({ success: false, message: "Erreur lors de l'enregistrement du colis.", error: error.message });
  }
});


// 2. Récupérer la liste des colis (PROTECTED)
app.get('/api/parcels', authenticateToken, async (req, res) => {
  const { agencyId, status, searchPhone } = req.query;

  try {
    const where: any = {};

    if (req.user.role === 'agency') {
      where.agencyId = req.user.agencyId;
    } else if (agencyId) {
      where.agencyId = agencyId as string;
    }

    if (status) {
      where.status = status as string;
    }

    if (searchPhone) {
      where.OR = [
        { senderPhone: { contains: searchPhone as string } },
        { receiverPhone: { contains: searchPhone as string } }
      ];
    }

    const parcels = await prisma.parcel.findMany({
      where,
      include: {
        trip: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const formatted = parcels.map(p => ({
      ...p,
      trip: formatTrip(p.trip)
    }));

    res.json({ success: true, count: formatted.length, data: formatted });

  } catch (error: any) {
    res.status(500).json({ success: false, message: "Erreur lors de la récupération des colis.", error: error.message });
  }
});

// 3. Mettre à jour un colis : Statut ou attribution à un bus (PROTECTED)
app.put('/api/parcels/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status, tripId } = req.body;

  try {
    const parcel = await prisma.parcel.findUnique({ where: { id } });
    if (!parcel) {
      return res.status(404).json({ success: false, message: "Colis introuvable." });
    }

    if (req.user.role === 'agency' && req.user.agencyId !== parcel.agencyId) {
      return res.status(403).json({ success: false, message: "Non autorisé à modifier ce colis." });
    }

    const dataToUpdate: any = {};
    if (status) dataToUpdate.status = status;
    if (tripId !== undefined) dataToUpdate.tripId = tripId;

    if (status === 'LIVRE') {
      dataToUpdate.deliveredAt = new Date().toISOString();
    }

    const updatedParcel = await prisma.parcel.update({
      where: { id },
      data: dataToUpdate,
      include: { trip: true }
    });

    if (status === 'ARRIVE') {
      const arriveMsg = `Bonjour ${parcel.receiverName}, bonne nouvelle ! Votre colis ${parcel.id} est arrive à la gare de ${parcel.arrival}. Veuillez vous presenter muni d'une CNI pour le recuperer.`;
      await sendSMS(parcel.receiverPhone, arriveMsg);
    } else if (status === 'LIVRE') {
      const deliveredMsg = `TransGabon Connect : Le colis ${parcel.id} expedie à ${parcel.receiverName} a ete retire avec succes à la gare de ${parcel.arrival}.`;
      await sendSMS(parcel.senderPhone, deliveredMsg);
    }

    res.json({ 
      success: true, 
      message: `Colis ${id} mis à jour avec succès.`, 
      data: { ...updatedParcel, trip: formatTrip(updatedParcel.trip) }
    });

  } catch (error: any) {
    res.status(500).json({ success: false, message: "Erreur lors de la mise à jour du colis.", error: error.message });
  }
});

// 4. Supprimer un colis (PROTECTED - Utile en cas d'annulation avant expédition)
app.delete('/api/parcels/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const parcel = await prisma.parcel.findUnique({ where: { id } });
    if (!parcel) {
      return res.status(404).json({ success: false, message: "Colis introuvable." });
    }

    if (req.user.role === 'agency' && req.user.agencyId !== parcel.agencyId) {
      return res.status(403).json({ success: false, message: "Non autorisé à supprimer ce colis." });
    }

    await prisma.parcel.delete({ where: { id } });
    res.json({ success: true, message: `Colis ${id} supprimé.` });

  } catch (error: any) {
    res.status(500).json({ success: false, message: "Erreur lors de la suppression.", error: error.message });
  }
});


// ========================================================
// GENERATION DE BILLET PDF ELECTRONIQUE AVEC QR CODE (PUBLIC)
// ========================================================
// ========================================================================
// GENERATION DE BILLET PDF ELECTRONIQUE AVEC QR CODE (STRICTEMENT 1 PAGE)
// ========================================================================
app.get('/api/bookings/:id/pdf', async (req, res) => {
  const { id } = req.params;

  try {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { trip: true }
    });

    if (!booking) {
      return res.status(404).send("Billet introuvable dans le système national TransGabon Connect.");
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Billet_${booking.id}.pdf`);

    // Génération du QR Code de contrôle
    const qrCodeBuffer = await QRCode.toBuffer(booking.id, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 120
    });

    // Initialisation du document PDF en format A5 Paysage (595.28 x 420)
    // Nous désactivons les marges automatiques pour un contrôle parfait des éléments
    const doc = new PDFDocument({ size: 'A5', layout: 'landscape', margin: 0 });
    doc.pipe(res); 

    const width = 595.28;
    const height = 420;

    // 1. BANDEAU D'EN-TÊTE (Bleu Sombre #0f172a)
    doc.rect(0, 0, width, 65).fill('#0f172a');

    // Titre et Sous-titre principal
    doc.fillColor('#ffffff')
       .fontSize(14)
       .font('Helvetica-Bold')
       .text("TRANSGABON CONNECT", 20, 16);
       
    doc.fillColor('#38bdf8')
       .fontSize(7.5)
       .font('Helvetica-Bold')
       .text("RESEAU NATIONAL DE TRANSPORT TERRESTRE GABONAIS", 20, 36);

    // Titre du coupon de contrôle (à droite)
    doc.fillColor('#ffffff')
       .fontSize(12)
       .font('Helvetica-Bold')
       .text("COUPON COMPAGNIE", 435, 16);
       
    doc.fillColor('#94a3b8')
       .fontSize(7.5)
       .font('Helvetica')
       .text("TALON D'EMBARQUEMENT", 435, 34);

    // Badge émeraude pour le Code de Réservation (au milieu)
    doc.roundedRect(280, 16, 125, 26, 6).fill('#10b981');
    doc.fillColor('#ffffff')
       .fontSize(10.5)
       .font('Helvetica-Bold')
       .text(booking.id, 280, 24, { align: 'center', width: 125 });

    // 2. LIGNE DE DÉCOUPE POINTILLÉE (Tear-off stub indicator)
    doc.moveTo(420, 0)
       .lineTo(420, 335)
       .lineWidth(1.5)
       .dash(4, { space: 4 })
       .stroke('#cbd5e1')
       .undash(); // désactive le mode pointillé pour la suite du dessin

    // 3. CARTES D'INFORMATIONS (Partie gauche)
    
    // CARTE 1 : Trajet (Y: 80 à 195)
    doc.roundedRect(20, 80, 380, 115, 8).fill('#f8fafc');
    doc.roundedRect(20, 80, 380, 115, 8).lineWidth(1).stroke('#e2e8f0');

    doc.fillColor('#64748b').fontSize(7.5).font('Helvetica-Bold').text("DÉTAILS DU VOYAGE", 32, 90);
    
    // Titre du trajet en grand
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(13).text(`${booking.trip?.departure} ➔ ${booking.trip?.arrival}`, 32, 102);

    doc.fontSize(8.5).font('Helvetica');
    
    doc.fillColor('#475569').text("Compagnie :", 32, 126);
    doc.font('Helvetica-Bold').fillColor('#0f172a').text(booking.trip?.agencyName || 'Partenaire National', 95, 126);

    doc.font('Helvetica').fillColor('#475569');
    doc.text("Départ le :", 32, 141);
    doc.font('Helvetica-Bold').fillColor('#0f172a').text(booking.trip?.departureTime ? new Date(booking.trip.departureTime).toLocaleString('fr-FR') : 'Non spécifié', 95, 141);

    doc.font('Helvetica').fillColor('#475569');
    doc.text("Autobus N° :", 32, 156);
    doc.font('Helvetica-Bold').fillColor('#0f172a').text(booking.trip?.busNumber || 'N/A', 95, 156);

    doc.font('Helvetica').fillColor('#475569');
    doc.text("Siège Assigné :", 32, 171);
    doc.font('Helvetica-Bold').fillColor('#10b981').text(`N° ${booking.seatNumber}`, 105, 171);


    // CARTE 2 : Passager & Sécurité (Y: 210 à 320)
    doc.roundedRect(20, 210, 380, 110, 8).fill('#f8fafc');
    doc.roundedRect(20, 210, 380, 110, 8).lineWidth(1).stroke('#e2e8f0');

    doc.fillColor('#64748b').fontSize(7.5).font('Helvetica-Bold').text("INFORMATIONS PASSAGER", 32, 220);

    doc.fontSize(8.5).font('Helvetica');
    
    doc.fillColor('#475569').text("Nom complet :", 32, 235);
    doc.font('Helvetica-Bold').fillColor('#0f172a').text(booking.travelerName, 100, 235);

    doc.font('Helvetica').fillColor('#475569');
    doc.text("Téléphone :", 32, 250);
    doc.font('Helvetica-Bold').fillColor('#0f172a').text(booking.travelerPhone, 95, 250);

    doc.font('Helvetica').fillColor('#475569');
    doc.text("CNI / Passport :", 32, 265);
    doc.font('Helvetica-Bold').fillColor('#0f172a').text(booking.travelerCni, 110, 265);

    doc.font('Helvetica').fillColor('#475569');
    doc.text("Paiement :", 32, 280);
    doc.font('Helvetica-Bold').fillColor('#0f172a').text(`${booking.paymentMethod?.replace('_', ' ') || 'AGENCE'} (${booking.transactionId})`, 95, 280);

    doc.font('Helvetica').fillColor('#475569');
    doc.text("Prix payé :", 32, 295);
    doc.font('Helvetica-Bold').fillColor('#10b981').text(`${booking.amount.toLocaleString()} FCFA`, 95, 295);


    // 4. TALON DE CONTRÔLE (Partie droite, coupon détachable)
    
    // Image du Code QR
    doc.image(qrCodeBuffer, 442, 80, { width: 100 });

    doc.fillColor('#64748b')
       .fontSize(7)
       .font('Helvetica-Bold')
       .text(`RÉFERENCE : ${booking.id}`, 435, 190, { align: 'center', width: 115 });

    // Badge dynamique de statut
    const statusColor = booking.status === 'EMBARQUE' ? '#10b981' : booking.status === 'PAYE' ? '#2563eb' : '#f43f5e';
    const statusText = booking.status === 'EMBARQUE' ? 'EMBARQUE' : booking.status === 'PAYE' ? 'BILLET PAYE' : 'EN ATTENTE';
    
    doc.roundedRect(435, 205, 115, 20, 4).fill(statusColor);
    doc.fillColor('#ffffff')
       .fontSize(7.5)
       .font('Helvetica-Bold')
       .text(statusText, 435, 211, { align: 'center', width: 115 });

    // Affichage géant du numéro de Siège sur le talon
    doc.fillColor('#64748b').fontSize(7.5).font('Helvetica-Bold').text("SIEGE ASSIGNÉ", 435, 240, { align: 'center', width: 115 });
    doc.fillColor('#10b981').fontSize(26).font('Helvetica-Bold').text(`${booking.seatNumber}`, 435, 252, { align: 'center', width: 115 });

    doc.fillColor('#64748b')
       .fontSize(7)
       .font('Helvetica')
       .text(`Bus N°: ${booking.trip?.busNumber || 'N/A'}`, 435, 287, { align: 'center', width: 115 });

    // 5. PIED DE PAGE DE SÉCURITÉ (Y: 335 à 420)
    doc.rect(0, 335, width, 85).fill('#f1f5f9');
    doc.moveTo(0, 335).lineTo(width, 335).lineWidth(1).stroke('#cbd5e1');

    doc.fillColor('#b91c1c')
       .fontSize(8)
       .font('Helvetica-Bold')
       .text("⚠️ REGLEMENTATION & PROTOCOLE DE SECURITE ROUTIERE DU GABON :", 20, 348);

    doc.fillColor('#334155')
       .fontSize(7.5)
       .font('Helvetica')
       .text("La carte nationale d'identité (CNI) ou le Passeport en cours de validité est STRICTEMENT OBLIGATOIRE pour franchir les contrôles de gendarmerie et de police aux barrières de Kango, Bifoun, Alembe et Ndjolé. Présentez ce titre de transport imprimé ou sur votre téléphone portable dès votre arrivée à la gare routière d'embarquement.", 20, 362, { width: 555, lineGap: 1.5 });

    doc.end();

  } catch (error: any) {
    console.error("[PDF ERROR] Impossible de générer le billet :", error);
    res.status(500).send("Erreur serveur lors de la génération du billet.");
  }
});

// À ajouter dans votre code serveur Express (sans authenticateToken)
app.get('/api/parcels/track/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const parcel = await prisma.parcel.findUnique({
      where: { id },
      select: {
        id: true,
        departure: true,
        arrival: true,
        status: true,
        description: true,
        createdAt: true,
        deliveredAt: true
      }
    });
    if (!parcel) {
      return res.status(404).json({ success: false, message: "Colis introuvable." });
    }
    res.json({ success: true, data: parcel });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =====================================================================
// ENPOINT PUBLIC : Suivi et récupération de billet par le voyageur (SÉCURISÉ)
// =====================================================================
app.get('/api/bookings/track/:id', async (req, res) => {
  const { id } = req.params;
  const { phone } = req.query;

  if (!id || !phone) {
    return res.status(400).json({ success: false, message: "Code de billet et numéro de téléphone requis." });
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { trip: true }
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: "Billet introuvable dans le système national." });
    }

    // Mesure de sécurité : On nettoie et compare les numéros de téléphone pour éviter l'espionnage
    const cleanPhone = (phone as string).replace(/\D/g, '');
    const cleanBookingPhone = booking.travelerPhone.replace(/\D/g, '');

    // On vérifie si la fin des numéros correspond (gère les formats 077, +241, 066 etc.)
    if (!cleanBookingPhone.endsWith(cleanPhone) && !cleanPhone.endsWith(cleanBookingPhone)) {
      return res.status(403).json({ success: false, message: "Le numéro de téléphone ne correspond pas à ce billet." });
    }

    res.json({
      success: true,
      data: {
        ...booking,
        tripDetails: formatTrip(booking.trip)
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Erreur lors de la récupération du billet.", error: error.message });
  }
});

// Récupérer les utilisateurs de l'agence (Réservé au rôle CHEF)
app.get('/api/agency/users', authenticateToken, async (req, res) => {
  if (req.user.role !== 'agency' || req.user.subRole !== 'CHEF') {
    return res.status(403).json({ success: false, message: "Accès réservé aux Chefs d'agence." });
  }

  try {
    const users = await prisma.agencyUser.findMany({
      where: { agencyId: req.user.agencyId },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        createdAt: true
      }
    });
    res.json({ success: true, data: users });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Créer un collaborateur (Réservé au rôle CHEF)
app.post('/api/agency/users', authenticateToken, async (req, res) => {
  if (req.user.role !== 'agency' || req.user.subRole !== 'CHEF') {
    return res.status(403).json({ success: false, message: "Accès réservé aux Chefs d'agence." });
  }

  const { username, password, name, role } = req.body;
  if (!username || !password || !name || !role) {
    return res.status(400).json({ success: false, message: "Champs requis manquants." });
  }

  try {
    const existing = await prisma.agencyUser.findUnique({ where: { username } });
    if (existing) {
      return res.status(400).json({ success: false, message: "Ce nom d'utilisateur est déjà pris." });
    }

    const newUser = await prisma.agencyUser.create({
      data: {
        username,
        password,
        name,
        role, 
        agencyId: req.user.agencyId
      }
    });

    res.json({ success: true, message: `Utilisateur "${name}" créé avec succès !`, data: newUser });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Supprimer un collaborateur (Réservé au rôle CHEF)
app.delete('/api/agency/users/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'agency' || req.user.subRole !== 'CHEF') {
    return res.status(403).json({ success: false, message: "Accès réservé aux Chefs d'agence." });
  }

  const { id } = req.params;

  try {
    const user = await prisma.agencyUser.findUnique({ where: { id } });
    if (!user || user.agencyId !== req.user.agencyId) {
      return res.status(404).json({ success: false, message: "Utilisateur introuvable dans votre agence." });
    }

    if (user.id === req.user.id) {
      return res.status(400).json({ success: false, message: "Vous ne pouvez pas supprimer votre propre compte." });
    }

    await prisma.agencyUser.delete({ where: { id } });
    res.json({ success: true, message: "Compte collaborateur supprimé." });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================================
// API POUR LA GESTION CENTRALE SUPERADMIN (JWT SÉCURISÉ)
// ========================================================

// 1. Profil Administrateur central (Mise à jour d'identifiants & Mot de passe)
app.put('/api/admin/profile', authenticateToken, async (req, res) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: "Action réservée au SuperAdmin de la plateforme." });
  }
  
  const { username, password, name } = req.body;
  
  try {
    const admin = await prisma.superAdmin.findUnique({ where: { id: req.user.id } });
    if (!admin) {
      return res.status(404).json({ success: false, message: "Compte SuperAdmin introuvable." });
    }

    const updated = await prisma.superAdmin.update({
      where: { id: req.user.id },
      data: {
        username: username || admin.username,
        password: password || admin.password,
        name: name || admin.name
      }
    });

    res.json({
      success: true,
      message: "Vos identifiants d'administration ont été mis à jour avec succès !",
      data: {
        id: updated.id,
        username: updated.username,
        name: updated.name
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Gestion globale des utilisateurs d'agences par le SuperAdmin
app.get('/api/admin/agency-users', authenticateToken, async (req, res) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: "Action réservée au SuperAdmin de la plateforme." });
  }

  try {
    const users = await prisma.agencyUser.findMany({
      include: { agency: true },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = users.map(u => ({
      id: u.id,
      username: u.username,
      name: u.name,
      role: u.role,
      agencyId: u.agencyId,
      agencyName: u.agency.name,
      createdAt: u.createdAt
    }));

    res.json({ success: true, data: formatted });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/agency-users', authenticateToken, async (req, res) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: "Action réservée au SuperAdmin de la plateforme." });
  }

  const { username, password, name, role, agencyId } = req.body;
  if (!username || !password || !name || !role || !agencyId) {
    return res.status(400).json({ success: false, message: "Champs d'enregistrement d'utilisateur requis manquants." });
  }

  try {
    const existing = await prisma.agencyUser.findUnique({ where: { username } });
    if (existing) {
      return res.status(400).json({ success: false, message: "Ce nom d'utilisateur est déjà utilisé par un autre collaborateur d'agence." });
    }

    const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
    if (!agency) {
      return res.status(404).json({ success: false, message: "Agence cible introuvable." });
    }

    const newUser = await prisma.agencyUser.create({
      data: {
        username,
        password,
        name,
        role,
        agencyId
      }
    });

    res.json({
      success: true,
      message: `Compte d'accès d'agence créé pour "${name}" avec succès !`,
      data: newUser
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/admin/agency-users/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: "Action réservée au SuperAdmin de la plateforme." });
  }

  const { id } = req.params;

  try {
    const user = await prisma.agencyUser.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ success: false, message: "Compte d'agence introuvable." });
    }

    await prisma.agencyUser.delete({ where: { id } });
    res.json({ success: true, message: `Le compte d'accès pour "${user.name}" a été révoqué.` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});