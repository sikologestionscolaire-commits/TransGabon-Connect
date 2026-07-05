import React, { useState, useEffect } from 'react';
import { Trip, Booking, ChatMessage, Review, Agency } from '../types';
import { GABON_ROUTES } from '../data';
import { 
  Search, MapPin, Calendar, Clock, CreditCard, ChevronRight, Bus, 
  User, Shield, Compass, Sparkles, MessageSquare, Send, X, AlertCircle, 
  Star, Package, Download, CheckCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MobileTravelerProps {
  onAddBooking: (booking: Booking) => void;
  bookings: Booking[];
  trips: Trip[];
  reviews?: Review[];
  agencies: Agency[];
  onAddReview: (reviewData: { agencyId: string; tripId?: string; reviewerName: string; rating: number; comment: string }) => Promise<{ success: boolean; message: string }>;
}

export default function MobileTraveler({ onAddBooking, bookings, trips, reviews = [], agencies = [], onAddReview }: MobileTravelerProps) {
  // Navigation states
  const [activeTab, setActiveTab] = useState<'search' | 'trips' | 'tickets' | 'colis'>('search');
  
  // Agency Selection State (Requirement: Passengers must select an agency first)
  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null);
  
  // Search parameters
  const [departure, setDeparture] = useState('Libreville');
  const [arrival, setArrival] = useState('Oyem');
  const [travelDate, setTravelDate] = useState(new Date().toISOString().split('T')[0]);
  const [filteredTrips, setFilteredTrips] = useState<Trip[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Booking states
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [travelerName, setTravelerName] = useState('');
  const [travelerPhone, setTravelerPhone] = useState('');
  const [travelerCni, setTravelerCni] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'AIRTEL_MONEY' | 'MOOV_MONEY' | 'AGENCE'>('AIRTEL_MONEY');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [paymentType, setPaymentType] = useState<'EN_LIGNE' | 'EN_AGENCE'>('EN_LIGNE');

  // NOUVEL ÉTAT POUR L'ÉCRAN DE CONFIRMATION DE SUCCÈS
  const [lastCreatedBooking, setLastCreatedBooking] = useState<Booking | null>(null);

  // Review / feedback states
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [targetBookingForReview, setTargetBookingForReview] = useState<Booking | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  
  // USSD Simulation State
  const [showUssdModal, setShowUssdModal] = useState(false);
  const [ussdPin, setUssdPin] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Samba AI Chat Drawer
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'ai',
      text: 'Bonjour ô ! Je suis Samba, ton conseiller de route. Tu veux voyager où au Gabon ? Demande-moi tout sur les billets, les prix ou l\'état de la route ! 🌴🚗',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [isAiTyping, setIsAiTyping] = useState(false);

  // Selected ticket for live tracking
  const [trackingTicket, setTrackingTicket] = useState<Booking | null>(null);
  const [trackingProgress, setTrackingProgress] = useState(0);

  // Parcel tracking states
  const [trackParcelId, setTrackParcelId] = useState('');
  const [trackedParcel, setTrackedParcel] = useState<any | null>(null);
  const [trackError, setTrackError] = useState('');
  const [isTrackingParcel, setIsTrackingParcel] = useState(false);

  // Simulating tracking moving
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (trackingTicket) {
      interval = setInterval(() => {
        setTrackingProgress((prev) => {
          if (prev >= 100) return 0; // Loop tracking for simulation
          return prev + 5;
        });
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [trackingTicket]);

  // Handle Search
  const handleSearch = () => {
    let results = trips.filter(t => 
      t.departure.toLowerCase() === departure.toLowerCase() &&
      t.arrival.toLowerCase() === arrival.toLowerCase()
    );
    if (selectedAgencyId) {
      results = results.filter(t => t.agencyId === selectedAgencyId);
    }
    setFilteredTrips(results);
    setHasSearched(true);
    setActiveTab('trips');
  };

  // Select Trip to start booking
  const startBooking = (trip: Trip) => {
    setSelectedTrip(trip);
    setSelectedSeat(null);
    setTravelerName('');
    setTravelerPhone('');
    setTravelerCni('');
    setPaymentPhone('');
  };

  // Initiate Payment - Opens Simulated USSD or registers in-agency reservation
  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeat) {
      alert("S'il vous plaît, choisissez un siège.");
      return;
    }
    if (!travelerName || !travelerPhone || !travelerCni) {
      alert("S'il vous plaît, remplissez tous les champs obligatoires du voyageur.");
      return;
    }

    if (paymentType === 'EN_LIGNE') {
      if (!paymentPhone) {
        alert("S'il vous plaît, renseignez le numéro Mobile Money.");
        return;
      }
      setShowUssdModal(true);
    } else {
      // Direct cash booking - pay at agency counter
      setIsProcessingPayment(true);
      try {
        const response = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tripId: selectedTrip?.id,
            travelerName,
            travelerPhone,
            travelerCni,
            seatNumber: selectedSeat,
            paymentType: 'EN_AGENCE'
          })
        });

        const resData = await response.json();
        
        if (resData.success) {
          onAddBooking(resData.data);
          // AFFICHE LE PANNEAU DE CONFIRMATION DE SUCCÈS
          setLastCreatedBooking(resData.data);
          setSelectedTrip(null);
        } else {
          alert(resData.message || "Erreur de validation");
        }
      } catch (err) {
        console.error(err);
        alert("Erreur lors de la connexion à l'API de réservation.");
      } finally {
        setIsProcessingPayment(false);
      }
    }
  };

  // Submit traveler review for trip and agency
  const submitReview = async () => {
    if (!targetBookingForReview) return;
    setIsSubmittingReview(true);
    try {
      const trip = trips.find(t => t.id === targetBookingForReview.tripId);
      const agencyId = trip?.agencyId || 'agency-1';

      const res = await onAddReview({
        agencyId,
        tripId: targetBookingForReview.tripId,
        reviewerName: targetBookingForReview.travelerName,
        rating: reviewRating,
        comment: reviewComment
      });

      if (res.success) {
        alert("Votre avis a été enregistré avec succès ! Merci de votre contribution.");
        setShowReviewModal(false);
        setReviewComment('');
        setReviewRating(5);
        setTargetBookingForReview(null);
      } else {
        alert(res.message);
      }
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la publication de votre avis.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Execute Simulated Mobile Money payment
  const confirmPaymentUssd = async () => {
    if (!selectedTrip || !selectedSeat) return;
    setIsProcessingPayment(true);

    try {
      // Step 1: Query local API simulation to record booking
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: selectedTrip.id,
          travelerName,
          travelerPhone,
          travelerCni,
          seatNumber: selectedSeat,
          paymentMethod,
          paymentPhone,
          paymentType: 'EN_LIGNE'
        })
      });

      const resData = await response.json();
      
      if (resData.success) {
        onAddBooking(resData.data);
        setTimeout(() => {
          setIsProcessingPayment(false);
          setShowUssdModal(false);
          setSelectedTrip(null);
          // AFFICHE LE PANNEAU DE CONFIRMATION DE SUCCÈS
          setLastCreatedBooking(resData.data);
        }, 1500);
      } else {
        alert(resData.message || "Erreur de validation");
        setIsProcessingPayment(false);
      }
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la connexion à l'API de paiement.");
      setIsProcessingPayment(false);
    }
  };

  // Suivi de colis (Public)
  const handleTrackParcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackParcelId.trim()) return;
    setIsTrackingParcel(true);
    setTrackError('');
    setTrackedParcel(null);

    try {
      const res = await fetch(`/api/parcels/track/${trackParcelId.trim().toUpperCase()}`);
      const data = await res.json();
      if (data.success) {
        setTrackedParcel(data.data);
      } else {
        setTrackError(data.message || "Aucun colis trouvé avec cette référence.");
      }
    } catch (err) {
      setTrackError("Erreur lors de la connexion au réseau national de suivi.");
    } finally {
      setIsTrackingParcel(false);
    }
  };

  // Handle AI Samba Message Send
  const sendSambaMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: chatInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsAiTyping(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...chatMessages, userMsg].map(m => ({ sender: m.sender, text: m.text }))
        })
      });
      const data = await response.json();
      
      if (data.success) {
        setChatMessages(prev => [...prev, {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: data.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      } else {
        throw new Error();
      }
    } catch (err) {
      setChatMessages(prev => [...prev, {
        id: `ai-err-${Date.now()}`,
        sender: 'ai',
        text: "Pardon, petit problème de réseau gabonais ! Réessaie un coup.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsAiTyping(false);
    }
  };

  // Check which checkpoint is active based on simulated progress
  const getActiveCheckpoint = (checkpoints: string[], progress: number) => {
    if (checkpoints.length === 0) return '';
    const index = Math.min(
      Math.floor((progress / 100) * (checkpoints.length + 1)),
      checkpoints.length
    );
    if (index === 0) return "Départ de Libreville";
    if (index === checkpoints.length) return "Arrivée imminente";
    return `Passage : ${checkpoints[index - 1]}`;
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      {/* Mobile Wrapper Simulator Frame */}
      <div className="relative w-[375px] h-[780px] bg-slate-900 rounded-[48px] border-8 border-slate-800 shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Top Notch Status Bar */}
        <div className="absolute top-0 inset-x-0 h-8 bg-slate-950 flex justify-between items-center px-6 z-30 rounded-t-[40px]">
          <span className="text-[11px] font-medium tracking-tight">09:41</span>
          <div className="w-20 h-4 bg-slate-900 rounded-full border border-slate-800/60 absolute left-1/2 -translate-x-1/2 top-1"></div>
          <div className="flex items-center space-x-1.5 text-xs">
            <span className="text-[10px] font-bold text-emerald-500">4G</span>
            <div className="w-5 h-2.5 border border-slate-100/40 rounded-sm p-0.5 flex">
              <div className="h-full w-4 bg-emerald-500 rounded-2xs"></div>
            </div>
          </div>
        </div>

        {/* Dynamic App Body */}
        <div className="flex-1 pt-8 pb-14 overflow-y-auto bg-slate-950 relative">
          
          {/* Header */}
          <div className="bg-gradient-to-b from-emerald-900/40 to-slate-950 px-4 pt-4 pb-3 flex justify-between items-center border-b border-slate-900">
            <div>
              <div className="flex items-center space-x-1">
                <span className="text-xl">🇬🇦</span>
                <h1 className="text-base font-bold tracking-tight text-white">TransGabon Connect</h1>
              </div>
              <p className="text-[10px] text-emerald-400">Réseau Terrestre National</p>
            </div>
            
            {/* Samba floating action button */}
            <button 
              onClick={() => setShowChat(true)}
              className="relative bg-emerald-500 hover:bg-emerald-600 p-2 rounded-full shadow-lg flex items-center justify-center text-white transition-all cursor-pointer animate-pulse"
              id="traveler-samba-btn"
            >
              <Sparkles className="w-4 h-4" />
              <span className="absolute -bottom-1 -right-1 bg-yellow-400 text-slate-900 font-extrabold text-[8px] px-1 rounded-full">Samba</span>
            </button>
          </div>

          {!selectedAgencyId && activeTab !== 'tickets' && activeTab !== 'colis' ? (
            /* --- AGENCY SELECTION WELCOME SCREEN --- */
            <div className="p-4 space-y-4 text-left" id="agency-selection-screen">
              <div className="bg-gradient-to-r from-emerald-950 to-slate-900 border border-slate-800 rounded-3xl p-4 text-center relative overflow-hidden shadow-md">
                <Compass className="w-8 h-8 mx-auto text-emerald-400 mb-2 animate-bounce" />
                <h2 className="text-sm font-bold text-white mb-1">Centrale de Réservation Nationale</h2>
                <p className="text-[10px] text-slate-300">Sélectionnez une agence de transport agréée par l'État gabonais pour commencer votre réservation</p>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Compagnies de Transport Actives ({agencies.length})</h3>
                
                {agencies.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    Aucune compagnie disponible actuellement.
                  </div>
                ) : (
                  agencies.map(agency => {
                    const agencyReviews = reviews.filter(r => r.agencyId === agency.id);
                    const avgRating = agencyReviews.length > 0
                      ? (agencyReviews.reduce((sum, r) => sum + r.rating, 0) / agencyReviews.length).toFixed(1)
                      : "5.0";

                    return (
                      <div 
                        key={agency.id}
                        onClick={() => {
                          setSelectedAgencyId(agency.id);
                          setDeparture('Libreville');
                          // Find any trip destination of this agency or default to Oyem
                          const agencyTrips = trips.filter(t => t.agencyId === agency.id);
                          if (agencyTrips.length > 0) {
                            setArrival(agencyTrips[0].arrival);
                          } else {
                            setArrival('Oyem');
                          }
                          setFilteredTrips([]);
                          setHasSearched(false);
                          setActiveTab('search');
                        }}
                        className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all shadow-sm active:scale-95"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl bg-slate-800 p-2 rounded-xl border border-slate-700">{agency.logo || '🚌'}</span>
                          <div>
                            <h4 className="text-xs font-bold text-white flex items-center">
                              {agency.name}
                              <span className={`ml-1.5 px-1.5 py-0.2 rounded text-[7px] font-bold ${
                                agency.packName === 'Enterprise' ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-800/30' :
                                agency.packName === 'Premium' ? 'bg-blue-950 text-blue-400 border border-blue-900/30' :
                                'bg-amber-950 text-amber-400 border border-amber-900/30'
                              }`}>
                                {agency.packName}
                              </span>
                            </h4>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-[9px] text-slate-400 flex items-center">
                                <Star className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500 mr-0.5" />
                                {avgRating} ({agencyReviews.length} avis)
                              </span>
                              <span className="text-[8px] text-slate-500">•</span>
                              <span className="text-[9px] text-slate-400 font-medium">
                                {agency.activeBuses} Bus actifs
                              </span>
                            </div>
                          </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Active selected agency header/badge inside search to easily switch */}
              {selectedAgencyId && (
                <div className="px-4 py-1.5 flex justify-between items-center bg-slate-900/90 border-b border-slate-950 text-[10px] text-slate-400 sticky top-0 z-10 backdrop-blur-sm">
                  <div className="flex items-center space-x-1.5">
                    <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    <span>Agence :</span>
                    <strong className="text-white">
                      {agencies.find(a => a.id === selectedAgencyId)?.name || 'Sélectionnée'}
                    </strong>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedAgencyId(null);
                      setSelectedTrip(null);
                    }}
                    className="text-emerald-400 font-bold hover:underline cursor-pointer"
                  >
                    Changer d'agence
                  </button>
                </div>
              )}

              {/* MAIN TAB SWITCHING */}
              {selectedTrip ? (
            /* --- STEP 2: BOOKING COMPONENT --- */
            <div className="p-4" id="traveler-booking-panel">
              <div className="flex items-center justify-between mb-4">
                <button 
                  onClick={() => setSelectedTrip(null)}
                  className="text-xs text-slate-400 hover:text-white flex items-center cursor-pointer"
                >
                  ← Retour aux voyages
                </button>
                <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  {selectedTrip.agencyName}
                </span>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 mb-4">
                <div className="flex justify-between items-center text-xs mb-2">
                  <span className="text-slate-400">Itinéraire</span>
                  <span className="font-bold text-white">{selectedTrip.departure} ➔ {selectedTrip.arrival}</span>
                </div>
                <div className="flex justify-between items-center text-xs mb-2">
                  <span className="text-slate-400">Départ</span>
                  <span className="text-white">
                    {new Date(selectedTrip.departureTime).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} à {new Date(selectedTrip.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Prix du billet</span>
                  <span className="text-emerald-400 font-bold">{selectedTrip.price.toLocaleString()} FCFA</span>
                </div>
              </div>

              {/* AGENCY & TRIP REVIEWS PREVIEW */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 mb-4 space-y-2 text-left">
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-800/60">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-300">★ Avis & Commentaires ({reviews.filter(r => r.tripId === selectedTrip.id || r.agencyId === selectedTrip.agencyId).length})</h4>
                  {(() => {
                    const tripReviews = reviews.filter(r => r.tripId === selectedTrip.id || r.agencyId === selectedTrip.agencyId);
                    const avg = tripReviews.length > 0 
                      ? (tripReviews.reduce((sum, r) => sum + r.rating, 0) / tripReviews.length).toFixed(1)
                      : null;
                    return avg ? (
                      <span className="text-yellow-400 font-bold text-xs">★ {avg} / 5</span>
                    ) : (
                      <span className="text-slate-500 text-[9px]">Nouveau trajet</span>
                    );
                  })()}
                </div>

                {(() => {
                  const tripReviews = reviews.filter(r => r.tripId === selectedTrip.id || r.agencyId === selectedTrip.agencyId);
                  return tripReviews.length === 0 ? (
                    <p className="text-[9px] text-slate-500 italic">Aucun avis encore. Voyagez et soyez le premier à laisser un commentaire !</p>
                  ) : (
                    <div className="max-h-[85px] overflow-y-auto space-y-2 pr-1">
                      {tripReviews.map(r => (
                        <div key={r.id} className="text-[10px] bg-slate-950/40 p-2 rounded-xl border border-slate-900">
                          <div className="flex justify-between text-slate-400 text-[8px] mb-0.5">
                            <span className="font-semibold text-white">{r.reviewerName}</span>
                            <span className="text-yellow-500">{'★'.repeat(r.rating)}</span>
                          </div>
                          <p className="text-slate-300 text-[9px] leading-relaxed">{r.comment}</p>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* SEAT SELECTOR GRID */}
              <div className="mb-5">
                <h3 className="text-xs font-semibold text-white mb-2 flex items-center">
                  <Bus className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                  Sélectionnez votre Siège
                </h3>
                
                {/* Simulated Bus Layout Grid */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 max-w-xs mx-auto">
                  {/* Front row - Driver and guide */}
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800 text-[10px]">
                    <div className="flex items-center text-amber-500 font-bold">
                      <span className="mr-1">🧑‍✈️</span> Volant Chauffeur
                    </div>
                    <div className="text-slate-500">Porte Entrée</div>
                  </div>

                  {/* Seat Matrix: 4 columns */}
                  <div className="grid grid-cols-5 gap-2 justify-center">
                    {Array.from({ length: 30 }).map((_, idx) => {
                      const seatNum = idx + 1;
                      const isAisle = idx % 5 === 2; // Col 3 is corridor
                      const isTaken = (seatNum % 7 === 0 || seatNum % 4 === 1) && seatNum !== 12 && seatNum !== 15;

                      if (isAisle) {
                        return <div key={`aisle-${idx}`} className="w-6 h-6 flex items-center justify-center text-[8px] text-slate-700 font-bold">Allée</div>;
                      }

                      const isSelected = selectedSeat === seatNum;

                      return (
                        <button
                          key={`seat-${seatNum}`}
                          disabled={isTaken}
                          type="button"
                          onClick={() => setSelectedSeat(seatNum)}
                          className={`w-7 h-7 rounded text-[10px] font-bold transition-all flex items-center justify-center cursor-pointer ${
                            isTaken 
                              ? 'bg-slate-800 text-slate-600 border border-slate-800 cursor-not-allowed'
                              : isSelected
                              ? 'bg-emerald-500 text-white border border-emerald-400 scale-105 shadow-md shadow-emerald-500/20'
                              : 'bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600'
                          }`}
                        >
                          {seatNum}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex justify-center space-x-4 mt-3 pt-2 border-t border-slate-800 text-[9px]">
                    <div className="flex items-center"><div className="w-2.5 h-2.5 bg-slate-700 rounded mr-1"></div> Libre</div>
                    <div className="flex items-center"><div className="w-2.5 h-2.5 bg-emerald-500 rounded mr-1"></div> Choisi</div>
                    <div className="flex items-center"><div className="w-2.5 h-2.5 bg-slate-800 rounded mr-1"></div> Réservé</div>
                  </div>
                </div>
              </div>

              {/* RESERVATION FORM */}
              <form onSubmit={handlePay} className="space-y-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Nom Complet du Voyageur *</label>
                  <div className="relative">
                    <User className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
                    <input 
                      type="text" 
                      required
                      placeholder="Mba Obame Jean" 
                      value={travelerName}
                      onChange={(e) => setTravelerName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-8 pr-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-left">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Téléphone de Contact *</label>
                    <input 
                      type="tel" 
                      required
                      placeholder="+241 077..." 
                      value={travelerPhone}
                      onChange={(e) => setTravelerPhone(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center">
                      N° CNI / Passport *
                      <Shield className="w-2.5 h-2.5 ml-1 text-emerald-400" />
                    </label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ex: 102923..." 
                      value={travelerCni}
                      onChange={(e) => setTravelerCni(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                    <span className="text-[7px] text-slate-500 block mt-0.5">Requis pour contrôles de gendarmerie</span>
                  </div>
                </div>

                {/* PAYMENT SECTION WITH SELECTION */}
                <div className="border-t border-slate-900 pt-3 text-left">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-2">Option de Paiement</label>
                  
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setPaymentType('EN_LIGNE')}
                      className={`py-2 px-3 rounded-xl border flex flex-col items-center justify-center text-xs cursor-pointer transition-all space-y-1 ${
                        paymentType === 'EN_LIGNE'
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      <span>Payer en Ligne</span>
                      <span className="text-[9px] text-slate-400 font-normal">Mobile Money</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPaymentType('EN_AGENCE');
                        setPaymentMethod('AGENCE');
                      }}
                      className={`py-2 px-3 rounded-xl border flex flex-col items-center justify-center text-xs cursor-pointer transition-all space-y-1 ${
                        paymentType === 'EN_AGENCE'
                          ? 'bg-blue-500/10 border-blue-500 text-blue-400 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      <span>Payer à l'Agence</span>
                      <span className="text-[9px] text-slate-400 font-normal">Espèces au guichet</span>
                    </button>
                  </div>

                  {paymentType === 'EN_LIGNE' ? (
                    <div className="space-y-2">
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Opérateur</label>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('AIRTEL_MONEY')}
                          className={`py-2 px-3 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition-all ${
                            paymentMethod === 'AIRTEL_MONEY'
                              ? 'bg-amber-500/10 border-amber-500 text-amber-500 font-bold'
                              : 'bg-slate-900 border-slate-800 text-slate-400'
                          }`}
                        >
                          <span>Airtel Money</span>
                          <span className="text-[10px]">🟠</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPaymentMethod('MOOV_MONEY')}
                          className={`py-2 px-3 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition-all ${
                            paymentMethod === 'MOOV_MONEY'
                              ? 'bg-blue-500/10 border-blue-500 text-blue-400 font-bold'
                              : 'bg-slate-900 border-slate-800 text-slate-400'
                          }`}
                        >
                          <span>Moov Money</span>
                          <span className="text-[10px]">🔵</span>
                        </button>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Numéro Mobile Money Gabon *</label>
                        <div className="relative">
                          <CreditCard className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
                          <input 
                            type="tel" 
                            required={paymentType === 'EN_LIGNE'}
                            placeholder={paymentMethod === 'AIRTEL_MONEY' ? 'Ex: 077 28 19 40' : 'Ex: 065 11 22 33'} 
                            value={paymentPhone}
                            onChange={(e) => setPaymentPhone(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-8 pr-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <p className="text-[8px] text-amber-500 mt-1 flex items-center">
                          <AlertCircle className="w-2.5 h-2.5 mr-0.5 animate-pulse" />
                          Simulation : une boîte USSD d'autorisation Push s'ouvrira après soumission.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-[10px] text-slate-300 space-y-1">
                      <p className="font-semibold text-blue-400">💵 Règlement en Espèces au Comptoir</p>
                      <p className="leading-relaxed">Votre place est réservée. Vous réglerez le billet de <strong>{selectedTrip.price.toLocaleString()} FCFA</strong> directement au guichet de la compagnie avant l'embarquement.</p>
                      <p className="text-[9px] text-slate-400">Veuillez vous présenter au moins 30 minutes à l'avance.</p>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center mt-4 cursor-pointer shadow-md shadow-emerald-500/10"
                >
                  {paymentType === 'EN_LIGNE' 
                    ? `Déclencher le Paiement (${selectedTrip.price.toLocaleString()} FCFA)`
                    : `Confirmer ma Réservation (${selectedTrip.price.toLocaleString()} FCFA)`
                  }
                </button>
              </form>
            </div>
          ) : (
            /* --- STEP 1: HOME SEARCH OR LIST --- */
            <div>
              {activeTab === 'search' && (
                <div className="p-4" id="traveler-search-panel">
                  {/* Hero banner */}
                  <div className="bg-gradient-to-r from-emerald-950 to-slate-900 border border-slate-800 rounded-3xl p-4 mb-5 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl"></div>
                    <Compass className="w-8 h-8 mx-auto text-emerald-400 mb-2" />
                    <h2 className="text-sm font-bold text-white mb-1">Voyagez en toute confiance au Gabon</h2>
                    <p className="text-[10px] text-slate-300">Paiement 100% mobile money sécurisé & suivi en temps réel</p>
                  </div>

                  {/* Search inputs */}
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-4">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Ville de Départ</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-emerald-500" />
                        <select 
                          value={departure}
                          onChange={(e) => setDeparture(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-2 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-emerald-500 appearance-none text-left"
                        >
                          <option value="Libreville">Libreville (Gare Routière)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Destination</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-amber-500" />
                        <select 
                          value={arrival}
                          onChange={(e) => setArrival(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-2 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-emerald-500 appearance-none text-left"
                        >
                          {Array.from(new Set(GABON_ROUTES.map(r => r.arrival))).map(city => (
                            <option key={city} value={city}>{city}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Date de Voyage</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input 
                          type="date"
                          value={travelDate}
                          onChange={(e) => setTravelDate(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-2 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-emerald-500 text-left"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleSearch}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-2xl text-xs transition-all flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      <Search className="w-4 h-4" />
                      <span>Rechercher les Trajets</span>
                    </button>
                  </div>

                  {/* Regulatory Banner */}
                  <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-3 mt-4 flex items-start space-x-2 text-left">
                    <Shield className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <p className="text-[9px] text-slate-400">
                      <strong>Réglementation Nationale :</strong> Une pièce d'identité en cours de validité (CNI ou Passeport) est obligatoire pour franchir les checkpoints gendarmerie.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'trips' && (
                <div className="p-4" id="traveler-results-panel">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-bold text-slate-300">Trajets disponibles</h3>
                    <button 
                      onClick={() => setActiveTab('search')} 
                      className="text-[10px] text-emerald-400 underline hover:text-emerald-300 cursor-pointer"
                    >
                      Modifier la recherche
                    </button>
                  </div>

                  <p className="text-[10px] text-slate-500 mb-3 text-left">{departure} ➔ {arrival}</p>

                  <div className="space-y-3">
                    {filteredTrips.length === 0 ? (
                      <div className="text-center py-10 bg-slate-900/30 rounded-2xl border border-slate-900">
                        <p className="text-xs text-slate-400">Aucun départ trouvé pour cette date.</p>
                        <p className="text-[9px] text-slate-500 mt-1">Créez de nouveaux voyages depuis l'interface Agence pour les voir ici !</p>
                      </div>
                    ) : (
                      filteredTrips.map(trip => {
                        const tripReviews = reviews.filter(r => r.tripId === trip.id || r.agencyId === trip.agencyId);
                        const avgRating = tripReviews.length > 0 
                          ? (tripReviews.reduce((sum, r) => sum + r.rating, 0) / tripReviews.length).toFixed(1)
                          : null;
                        return (
                          <div 
                            key={trip.id} 
                            className="bg-slate-900 border border-slate-800/80 rounded-2xl p-3 hover:border-emerald-500/50 transition-all cursor-pointer text-left"
                            onClick={() => startBooking(trip)}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center space-x-1.5">
                                <span className="text-base">🏆</span>
                                <div>
                                  <h4 className="text-xs font-bold text-white">{trip.agencyName}</h4>
                                  <div className="flex items-center space-x-1">
                                    <span className="text-[8px] bg-slate-800 text-slate-400 px-1 rounded uppercase font-mono">{trip.busNumber}</span>
                                    {avgRating && (
                                      <span className="text-[9px] text-yellow-500 font-bold flex items-center ml-1">
                                        ★ {avgRating} <span className="text-[8px] text-slate-500 font-normal ml-0.5">({tripReviews.length})</span>
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <span className="text-xs font-extrabold text-emerald-400">{trip.price.toLocaleString()} FCFA</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-slate-800/60 pt-2 text-slate-300">
                              <div className="flex items-center">
                                <Clock className="w-3 h-3 mr-1 text-slate-500" />
                                <span>{new Date(trip.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <div className="flex items-center justify-end">
                                <span className="text-slate-500">Sièges restants : </span>
                                <span className="ml-1 font-bold text-white">{trip.availableSeats}/{trip.busCapacity}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'tickets' && (
                <div className="p-4" id="traveler-tickets-panel">
                  <h3 className="text-xs font-bold text-slate-300 mb-3 text-left">Mes Billets</h3>

                  {bookings.length === 0 ? (
                    <div className="text-center py-10 bg-slate-900/30 rounded-2xl border border-slate-900">
                      <p className="text-xs text-slate-400">Vous n'avez pas encore acheté de billet.</p>
                      <button 
                        onClick={() => setActiveTab('search')}
                        className="mt-3 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold py-1.5 px-3 rounded-full cursor-pointer"
                      >
                        Acheter un Billet
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {bookings.map(booking => {
                        const trip = trips.find(t => t.id === booking.tripId);
                        const isTrackingThis = trackingTicket?.id === booking.id;

                        return (
                          <div key={booking.id} className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                            {/* Ticket header */}
                            <div className="bg-gradient-to-r from-emerald-900/40 to-slate-900 px-4 py-3 flex justify-between items-center border-b border-slate-800/80">
                              <div className="text-left">
                                <span className="text-[10px] font-bold text-emerald-400">BILLET NATIONAL</span>
                                <h4 className="text-xs font-extrabold text-white">{booking.id}</h4>
                              </div>
                              <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold ${
                                booking.status === 'EMBARQUE' 
                                  ? 'bg-emerald-500/10 text-emerald-400' 
                                  : booking.status === 'EN_ATTENTE'
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/25 animate-pulse'
                                  : 'bg-amber-500/10 text-amber-500'
                              }`}>
                                {booking.status === 'EMBARQUE' 
                                  ? 'EMBARQUÉ' 
                                  : booking.status === 'EN_ATTENTE'
                                  ? 'À PAYER EN AGENCE'
                                  : 'PAYÉ (VALIDÉ)'
                                }
                              </span>
                            </div>

                            {/* Ticket Body */}
                            <div className="p-4 space-y-3">
                              <div className="flex justify-between text-xs">
                                <div className="text-left">
                                  <span className="text-[9px] text-slate-500 block">Voyageur</span>
                                  <span className="font-bold text-white">{booking.travelerName}</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-[9px] text-slate-500 block">Siège</span>
                                  <span className="font-bold text-emerald-400">N° {booking.seatNumber}</span>
                                </div>
                              </div>

                              <div className="flex justify-between text-xs border-t border-slate-800/60 pt-2">
                                <div className="text-left">
                                  <span className="text-[9px] text-slate-500 block">Trajet</span>
                                  <span className="font-bold text-white">
                                    {trip ? trip.departure : 'Libreville'} ➔ {trip ? trip.arrival : 'Oyem'}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="text-[9px] text-slate-500 block">Bus</span>
                                  <span className="font-mono text-white text-[10px] bg-slate-800 px-1.5 py-0.5 rounded">
                                    {trip ? trip.busNumber : 'G-450-AA'}
                                  </span>
                                </div>
                              </div>

                              {/* QR CODE DISPLAY */}
                              <div className="flex flex-col items-center justify-center py-4 bg-white/5 rounded-2xl border border-white/5">
                                {/* Dummy pixelated QR code */}
                                <div className="w-24 h-24 bg-white p-2 rounded-xl flex items-center justify-center">
                                  <div className="grid grid-cols-6 gap-0.5 w-full h-full bg-slate-900 p-0.5">
                                    {Array.from({ length: 36 }).map((_, i) => (
                                      <div 
                                        key={i} 
                                        className={`w-full h-full ${
                                          (i * 3 + 1) % 5 === 0 || i % 7 === 0 || (i > 10 && i < 20) || i === 0 || i === 5 || i === 30 || i === 35
                                            ? 'bg-slate-950' 
                                            : 'bg-white'
                                        }`}
                                      ></div>
                                    ))}
                                  </div>   
                                </div>
                                <span className="text-[8px] text-slate-400 mt-2">Présentez ce code QR à l'embarquement terrain</span>
                              </div>

                              {/* COMPOSANT À COLLER (Bouton de téléchargement du billet PDF officiel) */}
                              <a
                                href={`/api/bookings/${booking.id}/pdf`}
                                download
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-1.5 px-3 rounded-xl text-[10px] flex items-center justify-center space-x-1 cursor-pointer transition-all shadow-md shadow-emerald-500/10 text-center"
                              >
                                <span>📥</span>
                                <span>Télécharger le billet PDF</span>
                              </a>

                              {/* BOUTON SUIVANT (Live Track Trigger button) */}
                              <button
                                onClick={() => {
                                  setTrackingTicket(booking);
                                  setTrackingProgress(10);
                                }}
                                className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700/50 text-white font-bold py-1.5 px-3 rounded-xl text-[10px] flex items-center justify-center space-x-1 cursor-pointer transition-all"
                              >
                                <span>🗺️</span>
                                <span>{isTrackingThis ? 'Suivi en cours' : 'Lancer le suivi en temps réel'}</span>
                              </button>

                              {/* Leave a review button */}
                              {booking.status !== 'EN_ATTENTE' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTargetBookingForReview(booking);
                                    setReviewRating(5);
                                    setReviewComment('');
                                    setShowReviewModal(true);
                                  }}
                                  className="w-full mt-2 bg-gradient-to-r from-yellow-500/10 to-amber-500/15 hover:from-yellow-500/20 hover:to-amber-500/25 border border-yellow-500/30 text-yellow-400 font-bold py-1.5 px-3 rounded-xl text-[10px] flex items-center justify-center space-x-1 cursor-pointer transition-all shadow-sm"
                                >
                                  <span>⭐</span>
                                  <span>Laisser un Avis & Note Voyageur</span>
                                </button>
                              )}

                              {/* REAL-TIME TRACKING EXPANSION */}
                              {isTrackingThis && trip && (
                                <div className="mt-3 bg-slate-950 border border-slate-800 rounded-2xl p-3">
                                  <div className="flex justify-between items-center text-[10px] mb-2">
                                    <span className="text-emerald-400 font-bold flex items-center animate-pulse">
                                      <span className="w-2 h-2 bg-emerald-500 rounded-full mr-1"></span>
                                      En Route - GPS Actif
                                    </span>
                                    <span className="text-slate-500">
                                      {getActiveCheckpoint(trip.checkpoints ? JSON.parse(trip.checkpoints) : [], trackingProgress)}
                                    </span>
                                  </div>
                                  <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${trackingProgress}%` }}></div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'colis' && (
                <div className="p-4" id="traveler-colis-panel">
                  <h3 className="text-xs font-bold text-slate-300 mb-3 text-left">Suivi de Fret & Colis</h3>

                  <form onSubmit={handleTrackParcel} className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-3 mb-4 text-left">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Numéro de Colis (Ref)</label>
                      <div className="relative">
                        <Package className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
                        <input 
                          type="text" 
                          required
                          placeholder="Ex: COL-GAB-12903" 
                          value={trackParcelId}
                          onChange={(e) => setTrackParcelId(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-8 pr-3 text-xs text-white focus:outline-none focus:border-emerald-500 uppercase font-mono"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isTrackingParcel}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-1.5 px-3 rounded-xl text-[11px] transition-all cursor-pointer flex items-center justify-center"
                    >
                      {isTrackingParcel ? 'Recherche...' : 'Rechercher le Colis'}
                    </button>
                  </form>

                  {trackError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] rounded-xl font-semibold mb-4 text-left flex items-center space-x-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{trackError}</span>
                    </div>
                  )}

                  {trackedParcel && (
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 text-left space-y-4">
                      <div className="border-b border-slate-850 pb-2">
                        <span className="text-[9px] font-bold text-emerald-400">RÉFÉRENCE : {trackedParcel.id}</span>
                        <div className="text-xs font-bold text-white mt-0.5">{trackedParcel.departure} ➔ {trackedParcel.arrival}</div>
                        {trackedParcel.description && <p className="text-[9px] text-slate-400 mt-1 italic">"{trackedParcel.description}"</p>}
                      </div>

                      {/* Timeline status */}
                      <div className="relative pl-6 space-y-5 border-l border-slate-800 text-[11px]">
                        <div className="relative">
                          <span className={`absolute -left-[30px] top-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center text-[8px] font-bold ${
                            ['ENREGISTRE', 'ARRIVE', 'LIVRE'].includes(trackedParcel.status)
                              ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                              : 'bg-slate-950 border-slate-800 text-slate-600'
                          }`}>✓</span>
                          <div className="font-bold text-white">Colis Enregistré</div>
                          <p className="text-[9px] text-slate-400">Pris en charge à la gare de départ ({trackedParcel.departure}).</p>
                        </div>

                        <div className="relative">
                          <span className={`absolute -left-[30px] top-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center text-[8px] font-bold ${
                            ['ARRIVE', 'LIVRE'].includes(trackedParcel.status)
                              ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                              : 'bg-slate-950 border-slate-800 text-slate-600'
                          }`}>✓</span>
                          <div className="font-bold text-white">Arrivé à destination</div>
                          <p className="text-[9px] text-slate-400">Arrivé à la gare de {trackedParcel.arrival}. En attente de retrait.</p>
                        </div>

                        <div className="relative">
                          <span className={`absolute -left-[30px] top-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center text-[8px] font-bold ${
                            trackedParcel.status === 'LIVRE'
                              ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                              : 'bg-slate-950 border-slate-800 text-slate-600'
                          }`}>✓</span>
                          <div className="font-bold text-white">Colis Retiré (Livré)</div>
                          <p className="text-[9px] text-slate-400">Remis en main propre au destinataire.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
        </div>

        {/* BOTTOM NAVIGATION TAB BAR */}
        <div className="absolute bottom-0 inset-x-0 h-14 bg-slate-950/95 border-t border-slate-900 flex justify-around items-center px-4 z-20">
          <button 
            onClick={() => { setSelectedTrip(null); setActiveTab('search'); }}
            className={`flex flex-col items-center justify-center space-y-0.5 cursor-pointer ${activeTab === 'search' ? 'text-emerald-500' : 'text-slate-500 hover:text-slate-400'}`}
          >
            <Search className="w-4 h-4" />
            <span className="text-[9px]">Rechercher</span>
          </button>
          
          <button 
            onClick={() => { setSelectedTrip(null); setActiveTab('trips'); }}
            className={`flex flex-col items-center justify-center space-y-0.5 cursor-pointer ${activeTab === 'trips' ? 'text-emerald-500' : 'text-slate-500 hover:text-slate-400'}`}
          >
            <Bus className="w-4 h-4" />
            <span className="text-[9px]">Voyages</span>
          </button>

          <button 
            onClick={() => { setSelectedTrip(null); setActiveTab('colis'); }}
            className={`flex flex-col items-center justify-center space-y-0.5 cursor-pointer ${activeTab === 'colis' ? 'text-emerald-500' : 'text-slate-500 hover:text-slate-400'}`}
          >
            <Package className="w-4 h-4" />
            <span className="text-[9px]">Suivi Colis</span>
          </button>

          <button 
            onClick={() => { setSelectedTrip(null); setActiveTab('tickets'); }}
            className={`flex flex-col items-center justify-center space-y-0.5 cursor-pointer ${activeTab === 'tickets' ? 'text-emerald-500' : 'text-slate-500 hover:text-slate-400'}`}
          >
            <div className="relative">
              <CreditCard className="w-4 h-4" />
              {bookings.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-slate-900 font-bold text-[8px] w-3 h-3 flex items-center justify-center rounded-full">
                  {bookings.length}
                </span>
              )}
            </div>
            <span className="text-[9px]">Billets</span>
          </button>
        </div>

        {/* --- USSD PUSH TRANSACTION MODAL DIALOG --- */}
        <AnimatePresence>
          {showUssdModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90 flex items-center justify-center z-50 p-6"
            >
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 w-full text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center mx-auto">
                  📲
                </div>
                
                <h3 className="text-sm font-bold text-white">Simulation Push Mobile Money</h3>
                
                <div className="space-y-1 text-xs text-slate-300">
                  <p>Confirmation reçue pour le compte :</p>
                  <p className="font-mono text-amber-500 font-bold">{paymentPhone}</p>
                  <p className="text-[10px] text-slate-400">Montant de la transaction :</p>
                  <p className="font-bold text-white">{selectedTrip?.price.toLocaleString()} FCFA</p>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] uppercase font-bold text-slate-400">Entrez votre Code Secret (4 chiffres)</label>
                  <input 
                    type="password" 
                    maxLength={4} 
                    placeholder="••••" 
                    value={ussdPin}
                    onChange={(e) => setUssdPin(e.target.value.replace(/\D/g, ''))}
                    className="w-24 text-center bg-slate-950 border border-slate-800 rounded-xl p-2 font-mono text-base text-white focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[7px] text-slate-500 block">Simulez l'autorisation pour l'API sécurisée</span>
                </div>

                <div className="flex space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowUssdModal(false)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-1.5 px-3 rounded-xl text-xs cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    disabled={ussdPin.length < 4 || isProcessingPayment}
                    onClick={confirmPaymentUssd}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-1.5 px-3 rounded-xl text-xs cursor-pointer flex items-center justify-center"
                  >
                    {isProcessingPayment ? 'Validation...' : 'Autoriser'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* REVIEW MODAL POPUP */}
        <AnimatePresence>
          {showReviewModal && targetBookingForReview && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90 z-40 flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-5 w-full max-w-[310px] text-left relative shadow-2xl"
              >
                <button 
                  onClick={() => {
                    setShowReviewModal(false);
                    setTargetBookingForReview(null);
                  }}
                  className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>

                <h3 className="text-xs font-bold text-white mb-1 uppercase tracking-wider">Laisser un avis</h3>
                <p className="text-[9px] text-slate-400 mb-4">Notez votre trajet avec la compagnie.</p>

                <div className="space-y-4">
                  {/* Stars select */}
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1.5">Note globale</label>
                    <div className="flex space-x-2">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          className="text-xl transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                        >
                          {star <= reviewRating ? '⭐' : '☆'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Comment area */}
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">Votre commentaire</label>
                    <textarea
                      rows={3}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Ex: Bus propre, départ à l'heure, conduite sécurisée sur la route d'Oyem !"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-[10px] text-white focus:outline-none focus:border-yellow-500 placeholder:text-slate-600"
                    />
                  </div>

                  <button
                    onClick={submitReview}
                    disabled={isSubmittingReview}
                    className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-slate-800 text-slate-950 font-extrabold py-2 px-4 rounded-xl text-xs transition-all flex items-center justify-center space-x-1 cursor-pointer shadow-md shadow-yellow-500/10"
                  >
                    {isSubmittingReview ? 'Publication...' : 'Publier l\'avis'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- SAMBA AI CHAT COMPONENT (DRAWER-STYLE) --- */}
        <AnimatePresence>
          {showChat && (
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute inset-x-0 bottom-0 top-12 bg-slate-950 rounded-t-3xl border-t border-slate-800 shadow-2xl z-40 flex flex-col"
            >
              {/* Drawer Header */}
              <div className="p-4 border-b border-slate-900 flex justify-between items-center bg-slate-900/40">
                <div className="flex items-center space-x-1.5">
                  <span className="bg-yellow-400 text-slate-950 p-1.5 rounded-full text-xs">🤖</span>
                  <div>
                    <h3 className="text-xs font-bold text-white flex items-center">
                      Samba IA
                      <span className="ml-1.5 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                    </h3>
                    <p className="text-[8px] text-slate-400">Assistant Route Gabon</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowChat(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-full cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Chat messages */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {chatMessages.map(msg => (
                  <div 
                    key={msg.id} 
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] rounded-2xl p-2.5 text-xs ${
                      msg.sender === 'user' 
                        ? 'bg-emerald-600 text-white rounded-br-none' 
                        : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-bl-none'
                    }`}>
                      <p className="leading-relaxed">{msg.text}</p>
                      <span className="text-[7px] text-slate-400 block text-right mt-1">{msg.timestamp}</span>
                    </div>
                  </div>
                ))}
                
                {isAiTyping && (
                  <div className="flex justify-start">
                    <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl rounded-bl-none p-2.5 text-xs flex items-center space-x-1">
                      <span className="animate-bounce">●</span>
                      <span className="animate-bounce [animation-delay:0.2s]">●</span>
                      <span className="animate-bounce [animation-delay:0.4s]">●</span>
                      <span className="text-[8px] text-slate-400 ml-1">Samba réfléchit...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="p-3 border-t border-slate-900 bg-slate-950 flex space-x-2">
                <input 
                  type="text" 
                  placeholder="Ex: Quelle est l'état de la route vers Oyem ?" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendSambaMessage()}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <button 
                  onClick={sendSambaMessage}
                  disabled={!chatInput.trim()}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white p-1.5 rounded-xl transition-all cursor-pointer disabled:bg-slate-800 disabled:text-slate-600"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}