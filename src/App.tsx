import React, { useState, useEffect } from 'react';
import { Trip, Booking, Agency, Review, Tariff } from './types';
import MobileTraveler from './components/MobileTraveler';
import MobileAgent from './components/MobileAgent';
import AgencyDashboard from './components/AgencyDashboard';
import SuperAdmin from './components/SuperAdmin';
import ApiSandbox from './components/ApiSandbox';
import { 
  Bus, Smartphone, QrCode, Terminal, HelpCircle, Layers, 
  LogOut, Lock, Menu, ChevronUp 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [activePortal, setActivePortal] = useState<'traveler' | 'agent' | 'agency' | 'superadmin' | 'api'>('traveler');
  
  // Navigation Collapsible State 
  const [isNavOpen, setIsNavOpen] = useState<boolean>(true);

  // Authentication State
  const [loggedInRole, setLoggedInRole] = useState<'agent' | 'agency' | 'superadmin' | null>(null);
  const [loggedInAgency, setLoggedInAgency] = useState<Agency | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null); 
  const [passwordInput, setPasswordInput] = useState('');
  const [usernameInput, setUsernameInput] = useState(''); 
  const [selectedAgencyId, setSelectedAgencyId] = useState('');
  const [authError, setAuthError] = useState(''); 

  const [trips, setTrips] = useState<Trip[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [loading, setLoading] = useState(true);
  const [authToken, setAuthToken] = useState<string | null>(localStorage.getItem('token'));

  // Récupération initiale des données de l'Express backend
  const fetchData = async () => {
    try {
      const headers: HeadersInit = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};

      // Filtrage dynamique des départs côté serveur selon l'agence de l'utilisateur connecté
      const agencyIdQuery = (loggedInRole === 'agency' || loggedInRole === 'agent') && currentUser?.agencyId 
        ? `?agencyId=${currentUser.agencyId}` 
        : '';

      const tripsRes = await fetch(`/api/trips${agencyIdQuery}`);
      const tripsData = await tripsRes.json();
      if (tripsData.success) {
        setTrips(tripsData.data);
      }

      // Requête protégée : Ne charger les réservations de l'agence connectée QUE SI l'utilisateur est authentifié
      if (authToken) {
        const bookingsRes = await fetch('/api/bookings', { headers });
        const bookingsData = await bookingsRes.json();
        if (bookingsData.success) {
          setBookings(bookingsData.data);
        }
      } else {
        setBookings([]); 
      }

      const reviewsRes = await fetch('/api/reviews');
      const reviewsData = await reviewsRes.json();
      if (reviewsData.success) {
        setReviews(reviewsData.data);
      }

      // Endpoint public
      const agenciesRes = await fetch('/api/agencies');
      const agenciesData = await agenciesRes.json();
      if (agenciesData.success) {
        setAgencies(agenciesData.data);
      }

      const tariffsRes = await fetch('/api/tariffs');
      const tariffsData = await tariffsRes.json();
      if (tariffsData.success) {
        setTariffs(tariffsData.data);
      }
    } catch (err) {
      console.error("Error communicating with full-stack Express server:", err);
    } finally {
      setLoading(false);
    }
  };

  // Restauration de session intelligente en décodant le jeton JWT stocké
  useEffect(() => {
    const savedToken = localStorage.getItem('token') || localStorage.getItem('adminToken');
    if (savedToken && agencies.length > 0) {
      try {
        const parts = savedToken.split('.');
        if (parts.length === 3) {
          const bodyBase64 = parts[1];
          const base64 = bodyBase64.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(
            window.atob(base64)
              .split('')
              .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          );
          
          const payload = JSON.parse(jsonPayload);
          if (payload && payload.role) {
            setLoggedInRole(payload.role);
            setAuthToken(savedToken);
            setCurrentUser(payload); // Restauration du payload d'authentification
            if (payload.role === 'agency' || payload.role === 'agent') {
              const fullAgency = agencies.find(a => a.id === payload.agencyId);
              setLoggedInAgency(fullAgency || null);
            }
          }
        }
      } catch (err) {
        console.error("Erreur lors de la récupération automatique de session", err);
        handleLogout();
      }
    }
  }, [agencies]);

  useEffect(() => {
    fetchData();
  }, [authToken]); 

  // Handle portal tab switching with auth checks
  const handlePortalSwitch = (portal: 'traveler' | 'agent' | 'agency' | 'superadmin' | 'api') => {
    setAuthError('');
    setPasswordInput('');
    
    if (portal === 'traveler') {
      setActivePortal('traveler');
      return;
    }

    // Check if already logged into the required role
    if (portal === 'agent' && loggedInRole === 'agent') {
      setActivePortal('agent');
    } else if (portal === 'agency' && loggedInRole === 'agency') {
      setActivePortal('agency');
    } else if (portal === 'superadmin' && loggedInRole === 'superadmin') {
      setActivePortal('superadmin');
    } else if (portal === 'api' && loggedInRole === 'superadmin') {
      // Sandbox API protected under superadmin
      setActivePortal('api');
    } else {
      // Trigger authentication challenge
      setActivePortal(portal);
    }
  };

  // Perform login check
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: activePortal === 'api' ? 'superadmin' : activePortal,
          password: passwordInput,
          // Correction de l'envoi de l'identifiant pour le rôle 'agent' également
          username: (activePortal === 'agency' || activePortal === 'agent' || activePortal === 'superadmin' || activePortal === 'api') ? usernameInput : undefined
        })
      });

      const data = await response.json();

      if (data.success) {
        setLoggedInRole(data.user.role);
        setCurrentUser(data.user); // Stockage de l'utilisateur et de son sous-rôle (CHEF / AGENT)
        if (data.user.role === 'agency' || data.user.role === 'agent') {
          const fullAgency = agencies.find(a => a.id === data.user.agencyId);
          setLoggedInAgency(fullAgency || null);
        }
        setAuthToken(data.token);
        localStorage.setItem('token', data.token);
        setAuthError('');
        setUsernameInput('');
        setPasswordInput('');
      } else {
        setAuthError(data.message || "Erreur de connexion.");
      }
    } catch (err) {
      setAuthError("Impossible de contacter le service d'authentification.");
    }
  };

  // Logout handler
  const handleLogout = () => {
    setLoggedInRole(null);
    setLoggedInAgency(null);
    setCurrentUser(null);
    setAuthToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('adminToken');
    setPasswordInput('');
    setUsernameInput('');
    setActivePortal('traveler');
  };

  // Callback to plan a new trip (Agency view)
  const handleAddTrip = async (tripData: any) => {
    try {
      const response = await fetch('/api/trips', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(tripData)
      });
      const data = await response.json();
      if (data.success) {
        setTrips(prev => [...prev, data.data]);
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message };
      }
    } catch (err) {
      return { success: false, message: "Impossible de joindre le serveur de planification" };
    }
  };

  // Callback to submit a new review
  const handleAddReview = async (reviewData: { agencyId: string; tripId?: string; reviewerName: string; rating: number; comment: string }) => {
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewData)
      });
      const data = await response.json();
      if (data.success) {
        setReviews(prev => [data.data, ...prev]);
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message };
      }
    } catch (err) {
      return { success: false, message: "Erreur lors de l'envoi de l'avis sur le réseau." };
    }
  };

  // Callback to log a new traveler ticket booking
  const handleAddBooking = (newBooking: Booking) => {
    setBookings(prev => [newBooking, ...prev]);
    fetchData();
  };

  // Validation d'un billet à l'embarquement terrain
  const handleValidateBooking = async (ticketId: string) => {
    try {
      const response = await fetch('/api/tickets/validate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ ticketId })
      });
      const data = await response.json();
      if (data.success) {
        setBookings(prev => 
          prev.map(b => b.id === ticketId ? { ...b, status: 'EMBARQUE', boardedAt: new Date().toISOString() } : b)
        );
        return { success: true, message: data.message, data: data.data };
      } else {
        return { success: false, message: data.message };
      }
    } catch (err) {
      return { success: false, message: "Erreur réseau lors de la validation du billet" };
    }
  };

  // Determine if the currently active portal requires authentication and is currently locked
  const isPortalLocked = () => {
    if (activePortal === 'traveler') return false;
    if (activePortal === 'agent' && loggedInRole !== 'agent') return true;
    if (activePortal === 'agency' && loggedInRole !== 'agency') return true;
    if (activePortal === 'superadmin' && loggedInRole !== 'superadmin') return true;
    if (activePortal === 'api' && loggedInRole !== 'superadmin') return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-850 flex flex-col selection:bg-emerald-500 selection:text-white">
      
      {/* 1. EN-TÊTE FIXE COMPACT (TOUJOURS VISIBLE) */}
      <header className="bg-slate-950 border-b border-slate-900 sticky top-0 z-50 px-6 py-3 flex justify-between items-center shadow-lg text-white">
        <div className="flex items-center space-x-3 text-left cursor-pointer" onClick={() => handlePortalSwitch('traveler')}>
          <div className="bg-emerald-500 text-slate-950 w-8 h-8 rounded-xl font-bold text-lg flex items-center justify-center">
            T
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight text-white flex items-center">
              TransGabon Connect
            </h1>
            <p className="text-[10px] text-slate-400 hidden sm:block">Centrale Nationale de Réservation Terrestre</p>
          </div>
        </div>

        {/* Status de session & Bouton Toggle Menu */}
        <div className="flex items-center space-x-3">
          {loggedInRole ? (
            <span className="font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
              Connecté : {loggedInRole === 'agency' ? loggedInAgency?.name : loggedInRole.toUpperCase()}
            </span>
          ) : (
            <span className="font-mono bg-slate-800 text-slate-400 border border-slate-700/50 px-2 py-0.5 rounded text-[10px] hidden sm:inline-block">
              Visiteur Public
            </span>
          )}

          {/* Bouton pour Ouvrir / Masquer le menu de navigation */}
          <button
            onClick={() => setIsNavOpen(!isNavOpen)}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer text-white"
          >
            {isNavOpen ? (
              <>
                <span className="hidden sm:inline">Masquer le menu</span>
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              </>
            ) : (
              <>
                <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                <span>Ouvrir le Menu</span>
              </>
            )}
          </button>

          {/* Bouton Déconnexion Directe */}
          {loggedInRole && (
            <button
              onClick={handleLogout}
              className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all flex items-center space-x-1 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* 2. BARRE DE NAVIGATION PORTAILS RÉTACTABLE ET ANIMÉE */}
      <AnimatePresence>
        {isNavOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-xl text-white relative z-40 overflow-hidden text-left"
          >
            <div className="flex flex-col text-left space-y-0.5 max-w-sm">
              <span className="text-[10px] text-emerald-400 uppercase font-black tracking-wider">Écosystème Applicatif National</span>
              <p className="text-[11px] text-slate-400">Cliquez sur l'une des applications ci-dessous pour changer de rôle de simulation.</p>
            </div>

            {/* Hub des boutons d'onglets de portails */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handlePortalSwitch('traveler')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  activePortal === 'traveler'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Apli Voyageur</span>
              </button>

              <button
                onClick={() => handlePortalSwitch('agent')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  activePortal === 'agent'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Apli Embarquement</span>
              </button>

              <button
                onClick={() => handlePortalSwitch('agency')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  activePortal === 'agency'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                <Bus className="w-3.5 h-3.5" />
                <span>Portail Agence</span>
              </button>

              <button
                onClick={() => handlePortalSwitch('superadmin')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  activePortal === 'superadmin'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>SaaS SuperAdmin</span>
              </button>

              <button
                onClick={() => handlePortalSwitch('api')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  activePortal === 'api'
                    ? 'bg-slate-700 text-white border border-slate-600'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Sandbox API</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. GUIDE TEXTE ÉDUCATIF COMPACT */}
      <div className="bg-white border-b border-slate-200 px-6 py-2.5 text-[11px] text-slate-600 flex flex-col md:flex-row items-center justify-between gap-2 shadow-sm text-left">
        <div className="flex items-center space-x-2">
          <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <p>
            💡 <strong>Guide de l'Écosystème :</strong> Réservez un billet sur l'<strong>Apli Voyageur</strong> (Paiement simulé), puis validez-le instantanément sur l'<strong>Apli Embarquement</strong> pour simuler le terrain !
          </p>
        </div>
      </div>

      {/* CORE PORTAL VIEWER STAGE */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 space-y-3">
            <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
            <p className="text-xs text-slate-500">Connexion au réseau de transport gabonais...</p>
          </div>
        ) : isPortalLocked() ? (
          
          /* LOGIN FORM COMPONENT */
          <div className="max-w-md mx-auto my-12 bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden text-left">
            <div className="bg-slate-900 text-white p-6 flex items-center space-x-4">
              <div className="p-3 bg-slate-800 rounded-2xl text-emerald-400">
                <Lock className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="font-extrabold text-base">Portail Sécurisé</h3>
                <p className="text-xs text-slate-400">Veuillez vous authentifier pour continuer</p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="p-6 space-y-4">
              {/* Ajout dynamique du champ Nom d'utilisateur pour le rôle 'agent' opérationnel d'agence */}
              {(activePortal === 'agency' || activePortal === 'agent' || activePortal === 'superadmin' || activePortal === 'api') && (
                <div className="space-y-1.5 animate-fade-in">
                  <label className="text-xs font-bold text-slate-700">Nom d'utilisateur (Identifiant) :</label>
                  <input
                    type="text"
                    placeholder={
                      activePortal === 'agency' ? "Ex: chef_agency1" : 
                      activePortal === 'agent' ? "Ex: agent_agency1" : "Ex: admin"
                    }
                    className="w-full text-xs p-3 border border-slate-200 rounded-2xl bg-slate-50 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-mono text-left"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  {activePortal === 'agent' ? "Mot de passe d'agent de quai :" : "Mot de passe de sécurité :"}
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full text-xs p-3 border border-slate-200 rounded-2xl bg-slate-50 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all font-mono"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  required
                />
              </div>

              {authError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-2xl font-semibold">
                  ⚠️ {authError}
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => handlePortalSwitch('traveler')}
                  className="flex-1 py-3 text-xs font-semibold border border-slate-200 rounded-2xl hover:bg-slate-50 text-slate-600 text-center cursor-pointer transition-all animate-fade-in"
                >
                  Retour au Public
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 text-xs font-bold bg-slate-900 text-white rounded-2xl hover:bg-slate-800 text-center cursor-pointer transition-all shadow-md"
                >
                  Se Connecter
                </button>
              </div>
            </form>
          </div>

        ) : (
          <div className="space-y-6">
            {activePortal === 'traveler' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Mobile View Emulator */}
                <div className="lg:col-span-5">
                  <MobileTraveler 
                    onAddBooking={handleAddBooking}
                    bookings={bookings}
                    trips={trips}
                    reviews={reviews}
                    onAddReview={handleAddReview}
                    agencies={agencies}
                  />
                </div>

                {/* Information panel & help instructions next to traveler mockup */}
                <div className="lg:col-span-7 space-y-6 text-left">
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm text-slate-800">
                    <h3 className="text-base font-bold text-slate-900 flex items-center">
                      📱 L'Expérience Voyageur Mobile au Gabon
                    </h3>
                    
                    <p className="text-xs text-slate-600 leading-relaxed">
                      L'application mobile voyageur simplifie la vie des citoyens gabonais en leur permettant de réserver leurs places de bus en quelques clics depuis Libreville vers Oyem, Franceville, Bitam ou Mouila.
                    </p>

                    <div className="space-y-3 pt-2 text-xs">
                      <div className="flex items-start space-x-3">
                        <span className="bg-emerald-50 text-emerald-700 w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 border border-emerald-100">1</span>
                        <div>
                          <strong className="text-slate-900">Recherche d'Itinéraires :</strong> 
                          <span className="text-slate-600"> Choix des départs basés sur les trajets réels de nos compagnies partenaires gabonaises.</span>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <span className="bg-emerald-50 text-emerald-700 w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 border border-emerald-100">2</span>
                        <div>
                          <strong className="text-slate-900">Plan de Sièges Interactif :</strong> 
                          <span className="text-slate-600"> Les passagers choisissent précisément leur siège dans le bus de manière dynamique.</span>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <span className="bg-emerald-50 text-emerald-700 w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 border border-emerald-100">3</span>
                        <div>
                          <strong className="text-slate-900">Intégration Mobile Money & Fret :</strong> 
                          <span className="text-slate-600"> Sélection rapide entre Airtel Money et Moov Money pour les billets, et espace dédié au suivi temps réel des colis.</span>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <span className="bg-emerald-50 text-emerald-700 w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 border border-emerald-100">4</span>
                        <div>
                          <strong className="text-slate-900">Billet Électronique & QR :</strong> 
                          <span className="text-slate-600"> Génération immédiate du titre de transport intégrant un code QR sécurisé.</span>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <span className="bg-emerald-50 text-emerald-700 w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 border border-emerald-100">5</span>
                        <div>
                          <strong className="text-slate-900">Suivi GPS Temps Réel :</strong> 
                          <span className="text-slate-600"> Visualisation du bus sur le trajet avec estimation de l'arrivée aux différents checkpoints de route.</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Samba Bot Description banner */}
                  <div className="bg-gradient-to-r from-emerald-50 to-emerald-100/40 border border-emerald-200 rounded-3xl p-6 flex items-start space-x-4 shadow-sm">
                    <span className="text-3xl bg-white p-2.5 rounded-2xl shadow-sm border border-emerald-200">🤖</span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center">
                        Samba - Conseiller IA Route du Gabon
                        <span className="ml-2 bg-yellow-400 text-slate-950 font-black text-[8px] px-1.5 py-0.5 rounded-full uppercase">Gemini</span>
                      </h4>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        Intégré en bas de l'application, l'assistant IA Gemini ("Samba") répond aux clients sur l'état des routes nationales, les formalités de gendarmerie gabonaise (sécurité aux barrières), les agences disponibles et l'aide au paiement mobile money.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activePortal === 'agent' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-5">
                  <MobileAgent 
                    onValidateBooking={handleValidateBooking}
                    bookings={bookings}
                    trips={trips}
                  />
                </div>

                <div className="lg:col-span-7 space-y-6 text-left">
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm text-slate-800">
                    <h3 className="text-base font-bold text-slate-900 flex items-center">
                      🧑‍✈️ Validation Terrain & Embarquement
                    </h3>
                    
                    <p className="text-xs text-slate-600 leading-relaxed">
                      L'application mobile de contrôle permet aux agents de quai des gares routières de valider instantanément les passagers au moment d'entrer dans le bus, ce qui garantit la conformité et met à jour le manifeste.
                    </p>

                    <div className="space-y-4 pt-2 text-xs">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-slate-700">
                        <strong className="text-amber-800 block mb-1">Simuler la validation d'un billet :</strong>
                        <ol className="list-decimal pl-4 space-y-1 text-slate-600">
                          <li>Réservez d'abord un billet sur l'onglet <strong>Apli Voyageur</strong>.</li>
                          <li>Revenez sur cet onglet, sélectionnez le trajet correspondant.</li>
                          <li>Cliquez sur le voyageur dans le panneau <em className="text-slate-900 font-semibold">"Billets à quai"</em> pour simuler la lecture du QR code.</li>
                          <li>Le serveur Express valide le billet, met à jour le statut sur "EMBARQUÉ", et synchronise les rapports financiers !</li>
                        </ol>
                      </div>

                      <div className="flex items-start space-x-3">
                        <span className="bg-amber-50 text-amber-700 w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 border border-amber-200">✓</span>
                        <div>
                          <strong className="text-slate-900">Sécurité accrue :</strong> 
                          <span className="text-slate-600"> Empêche la double utilisation ou l'usage frauduleux d'un billet électronique de transport.</span>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <span className="bg-amber-50 text-amber-700 w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 border border-amber-200">✓</span>
                        <div>
                          <strong className="text-slate-900">Manifeste de bord légal :</strong> 
                          <span className="text-slate-600"> Génère automatiquement le manifeste numérique requis pour les checkpoints de police.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activePortal === 'agency' && (
              <AgencyDashboard 
                user={currentUser}
                onAddTrip={handleAddTrip}
                trips={trips}
                bookings={bookings}
                agencies={agencies}
                reviews={reviews}
                onRefreshData={fetchData} 
              />
            )}

            {activePortal === 'superadmin' && (
              <SuperAdmin agencies={agencies} onRefreshData={fetchData} />
            )}

            {activePortal === 'api' && (
              <ApiSandbox />
            )}
          </div>
        )}
      </main>

      {/* FOOTER BRUTALIST & MINIMAL */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-[10px] text-slate-500 mt-12 space-y-1">
        <p>© 2026 TransGabon Connect • Tous droits réservés.</p>
        <p>Conçu spécifiquement pour la numérisation et la structuration économique des gences de voyage du Gabon.</p>
      </footer>

    </div>
  );
}