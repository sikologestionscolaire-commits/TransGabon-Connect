import React, { useState, useEffect } from 'react';
import { Trip, Booking, Agency, Review, Bus, Driver, GabonRouteInfo } from '../types';
import { GABON_ROUTES, DRIVERS, BUS_PLATES } from '../data';
import { 
  PlusCircle, Calendar, DollarSign, Bus as BusIcon, TrendingUp, Users, 
  RefreshCw, Layers, ShieldCheck, Star, Clock, MapPin, Trash2, Edit, 
  AlertCircle, CheckCircle, Package 
} from 'lucide-react';

interface AgencyDashboardProps {
  user: any; // Contient les informations de l'utilisateur d'agence connecté (id, subRole, name, agencyId)
  onAddTrip: (tripData: any) => Promise<{ success: boolean; data?: Trip; message: string }>;
  trips: Trip[];
  bookings: Booking[];
  agencies: Agency[];
  reviews: Review[];
  onRefreshData?: () => void;
}

export default function AgencyDashboard({ user, onAddTrip, trips, bookings, agencies, reviews, onRefreshData }: AgencyDashboardProps) {
  const selectedAgencyId = user?.agencyId || agencies[0]?.id || '';
  
  // Dynamic collections from backend
  const [routes, setRoutes] = useState<GabonRouteInfo[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [parcels, setParcels] = useState<any[]>([]); 
  const [agencyUsers, setAgencyUsers] = useState<any[]>([]); // Liste des collaborateurs de l'agence
  const [isLoadingDynamic, setIsLoadingDynamic] = useState(false);

  // Active sub-tab inside dashboard
  const [dashboardTab, setDashboardTab] = useState<'trips' | 'buses' | 'drivers' | 'routes' | 'parcels' | 'users'>('trips');

  // Form states for creating/editing a trip
  const [departure, setDeparture] = useState('Libreville');
  const [arrival, setArrival] = useState('Oyem');
  const [departureDate, setDepartureDate] = useState(new Date().toISOString().split('T')[0]);
  const [departureTimeOnly, setDepartureTimeOnly] = useState('06:00');
  const [price, setPrice] = useState(15000);
  const [busCapacity, setBusCapacity] = useState(40);
  const [busNumber, setBusNumber] = useState('G-450-AA');
  const [driverName, setDriverName] = useState('Jean-Pierre Ndong');
  const [driverPhone, setDriverPhone] = useState('+241 077 45 12 89');
  
  // Trip editing states
  const [editingTripId, setEditingTripId] = useState<string | null>(null);

  // CRUD Form states for Route
  const [routeDeparture, setRouteDeparture] = useState('');
  const [routeArrival, setRouteArrival] = useState('');
  const [routeDistance, setRouteDistance] = useState(250);
  const [routeCondition, setRouteCondition] = useState('Praticable avec nids de poule');
  const [routeDuration, setRouteDuration] = useState('4h');
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);

  // CRUD Form states for Bus
  const [busPlate, setBusPlate] = useState('');
  const [busCapacityState, setBusCapacityState] = useState(40);
  const [editingBusId, setEditingBusId] = useState<string | null>(null);

  // CRUD Form states for Driver
  const [driverNameState, setDriverNameState] = useState('');
  const [driverPhoneState, setDriverPhoneState] = useState('');
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);

  // Form states for Parcels
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [parcelDeparture, setParcelDeparture] = useState('Libreville');
  const [parcelArrival, setParcelArrival] = useState('Oyem');
  const [parcelWeight, setParcelWeight] = useState('');
  const [parcelDescription, setParcelDescription] = useState('');
  const [parcelPrice, setParcelPrice] = useState(5000);
  const [parcelTripId, setParcelTripId] = useState('');

  // Form states for Agency Users (CHEF only)
  const [userForm, setUserForm] = useState({ username: '', password: '', name: '', role: 'AGENT' });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formFeedback, setFormFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [crudFeedback, setCrudFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [processingBookingId, setProcessingBookingId] = useState<string | null>(null);
  const [cashFeedback, setCashFeedback] = useState<string | null>(null);

  const activeAgency = agencies.find(a => a.id === selectedAgencyId);

  // Filter trips & bookings for selected agency
  const agencyTrips = trips.filter(t => t.agencyId === selectedAgencyId);
  const agencyBookings = bookings.filter(b => {
    const trip = trips.find(t => t.id === b.tripId);
    return trip?.agencyId === selectedAgencyId && (b.status === 'PAYE' || b.status === 'EMBARQUE');
  });

  // Pending cash collections for counter clerks
  const pendingCashBookings = bookings.filter(b => {
    const trip = trips.find(t => t.id === b.tripId);
    return trip?.agencyId === selectedAgencyId && b.status === 'EN_ATTENTE';
  });

  // Filter reviews for this agency
  const agencyReviews = (reviews || []).filter(r => r.agencyId === selectedAgencyId);
  const averageRating = agencyReviews.length > 0 
    ? (agencyReviews.reduce((sum, r) => sum + r.rating, 0) / agencyReviews.length).toFixed(1)
    : '5.0';

  // Calculate earnings
  const totalAgencySales = agencyBookings.reduce((sum, b) => sum + b.amount, 0);
  const platformFee = totalAgencySales * ((activeAgency?.commissionRate || 1.0) / 100);
  const netAgencyEarnings = totalAgencySales - platformFee;

  const handleValidateCashPayment = async (bookingId: string) => {
    setProcessingBookingId(bookingId);
    setCashFeedback(null);
    try {
      const activeToken = localStorage.getItem('token');
      const response = await fetch('/api/bookings/pay-cash', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify({ bookingId })
      });
      const data = await response.json();
      if (data.success) {
        setCashFeedback(data.message);
        if (onRefreshData) {
          onRefreshData();
        }
      } else {
        setCashFeedback(`Erreur : ${data.message}`);
      }
    } catch (err) {
      setCashFeedback("Erreur de communication avec le guichet central");
    } finally {
      setProcessingBookingId(null);
    }
  };

  // --- DYNAMIC DATA FETCHING ---
  const fetchRoutes = async () => {
    try {
      const res = await fetch('/api/routes');
      const data = await res.json();
      if (data.success) {
        setRoutes(data.data);
        if (data.data.length > 0) {
          setDeparture(data.data[0].departure);
          setArrival(data.data[0].arrival);
        }
      }
    } catch (err) {
      console.error("Error fetching routes:", err);
    }
  };

  const fetchBuses = async () => {
    try {
      const activeToken = localStorage.getItem('token');
      const res = await fetch(`/api/buses?agencyId=${selectedAgencyId}`, {
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      const data = await res.json();
      if (data.success) {
        setBuses(data.data);
        if (data.data.length > 0) {
          setBusNumber(data.data[0].plate);
          setBusCapacity(data.data[0].capacity);
        }
      }
    } catch (err) {
      console.error("Error fetching buses:", err);
    }
  };

  const fetchDrivers = async () => {
    try {
      const activeToken = localStorage.getItem('token');
      const res = await fetch(`/api/drivers?agencyId=${selectedAgencyId}`, {
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      const data = await res.json();
      if (data.success) {
        setDrivers(data.data);
        if (data.data.length > 0) {
          setDriverName(data.data[0].name);
          setDriverPhone(data.data[0].phone);
        }
      }
    } catch (err) {
      console.error("Error fetching drivers:", err);
    }
  };

  const fetchParcels = async () => {
    try {
      const activeToken = localStorage.getItem('token');
      const res = await fetch(`/api/parcels?agencyId=${selectedAgencyId}`, {
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      const data = await res.json();
      if (data.success) {
        setParcels(data.data);
      }
    } catch (err) {
      console.error("Error fetching parcels:", err);
    }
  };

  const fetchAgencyUsers = async () => {
    if (user?.subRole !== 'CHEF') return;
    try {
      const activeToken = localStorage.getItem('token');
      const res = await fetch('/api/agency/users', {
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      const data = await res.json();
      if (data.success) {
        setAgencyUsers(data.data);
      }
    } catch (err) {
      console.error("Erreur de récupération des collaborateurs :", err);
    }
  };

  useEffect(() => {
    if (selectedAgencyId && user) {
      setIsLoadingDynamic(true);
      Promise.all([
        fetchRoutes(), 
        fetchBuses(), 
        fetchDrivers(),
        fetchParcels(),
        fetchAgencyUsers()
      ]).finally(() => {
        setIsLoadingDynamic(false);
      });
    }
  }, [selectedAgencyId, user]);

  // --- CRUD ACTIONS ---

  // 1. Lignes & Itinéraires
  const handleSaveRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    setCrudFeedback(null);
    if (!routeDeparture || !routeArrival) {
      setCrudFeedback({ success: false, message: "Veuillez remplir le départ et l'arrivée." });
      return;
    }
    try {
      const payload = {
        departure: routeDeparture,
        arrival: routeArrival,
        distance: Number(routeDistance),
        roadCondition: routeCondition,
        estimatedDuration: routeDuration
      };

      const activeToken = localStorage.getItem('token');
      const url = editingRouteId ? `/api/routes/${editingRouteId}` : '/api/routes';
      const method = editingRouteId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setCrudFeedback({ success: true, message: data.message });
        setEditingRouteId(null);
        setRouteDeparture('');
        setRouteArrival('');
        setRouteDistance(250);
        setRouteCondition('Praticable avec nids de poule');
        setRouteDuration('4h');
        fetchRoutes();
      } else {
        setCrudFeedback({ success: false, message: data.message });
      }
    } catch (err) {
      setCrudFeedback({ success: false, message: "Erreur réseau lors de l'enregistrement de l'itinéraire" });
    }
  };

  const handleDeleteRoute = async (id: string) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cet itinéraire ?")) return;
    setCrudFeedback(null);
    try {
      const activeToken = localStorage.getItem('token');
      const res = await fetch(`/api/routes/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      const data = await res.json();
      if (data.success) {
        setCrudFeedback({ success: true, message: data.message });
        fetchRoutes();
      } else {
        setCrudFeedback({ success: false, message: data.message });
      }
    } catch (err) {
      setCrudFeedback({ success: false, message: "Erreur réseau lors de la suppression de l'itinéraire" });
    }
  };

  // 2. Bus
  const handleSaveBus = async (e: React.FormEvent) => {
    e.preventDefault();
    setCrudFeedback(null);
    if (!busPlate) {
      setCrudFeedback({ success: false, message: "L'immatriculation est obligatoire." });
      return;
    }
    try {
      const payload = {
        agencyId: selectedAgencyId,
        plate: busPlate,
        capacity: Number(busCapacityState)
      };

      const activeToken = localStorage.getItem('token');
      const url = editingBusId ? `/api/buses/${editingBusId}` : '/api/buses';
      const method = editingBusId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setCrudFeedback({ success: true, message: data.message });
        setEditingBusId(null);
        setBusPlate('');
        setBusCapacityState(40);
        fetchBuses();
      } else {
        setCrudFeedback({ success: false, message: data.message });
      }
    } catch (err) {
      setCrudFeedback({ success: false, message: "Erreur réseau lors de l'enregistrement du bus" });
    }
  };

  const handleDeleteBus = async (id: string) => {
    if (!window.confirm("Voulez-vous vraiment supprimer ce bus de la flotte ?")) return;
    setCrudFeedback(null);
    try {
      const activeToken = localStorage.getItem('token');
      const res = await fetch(`/api/buses/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      const data = await res.json();
      if (data.success) {
        setCrudFeedback({ success: true, message: data.message });
        fetchBuses();
      } else {
        setCrudFeedback({ success: false, message: data.message });
      }
    } catch (err) {
      setCrudFeedback({ success: false, message: "Erreur réseau lors de la suppression du bus" });
    }
  };

  // 3. Chauffeurs
  const handleSaveDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setCrudFeedback(null);
    if (!driverNameState || !driverPhoneState) {
      setCrudFeedback({ success: false, message: "Tous les champs chauffeur sont requis." });
      return;
    }
    try {
      const payload = {
        agencyId: selectedAgencyId,
        name: driverNameState,
        phone: driverPhoneState
      };

      const activeToken = localStorage.getItem('token');
      const url = editingDriverId ? `/api/drivers/${editingDriverId}` : '/api/drivers';
      const method = editingDriverId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setCrudFeedback({ success: true, message: data.message });
        setEditingDriverId(null);
        setDriverNameState('');
        setDriverPhoneState('');
        fetchDrivers();
      } else {
        setCrudFeedback({ success: false, message: data.message });
      }
    } catch (err) {
      setCrudFeedback({ success: false, message: "Erreur réseau lors de l'enregistrement du chauffeur" });
    }
  };

  const handleDeleteDriver = async (id: string) => {
    if (!window.confirm("Voulez-vous vraiment supprimer ce chauffeur ?")) return;
    setCrudFeedback(null);
    try {
      const activeToken = localStorage.getItem('token');
      const res = await fetch(`/api/drivers/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      const data = await res.json();
      if (data.success) {
        setCrudFeedback({ success: true, message: data.message });
        fetchDrivers();
      } else {
        setCrudFeedback({ success: false, message: data.message });
      }
    } catch (err) {
      setCrudFeedback({ success: false, message: "Erreur réseau lors de la suppression du chauffeur" });
    }
  };

  // 4. Supprimer un trajet planifié
  const handleDeleteTrip = async (tripId: string) => {
    if (!window.confirm("Voulez-vous vraiment annuler et supprimer ce voyage planifié ?")) return;
    try {
      const activeToken = localStorage.getItem('token');
      const res = await fetch(`/api/trips/${tripId}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      const data = await res.json();
      if (data.success) {
        if (onRefreshData) onRefreshData();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error("Error deleting trip:", err);
    }
  };

  // 5. Colis & Fret
  const handleSaveParcel = async (e: React.FormEvent) => {
    e.preventDefault();
    setCrudFeedback(null);
    if (!senderName || !senderPhone || !receiverName || !receiverPhone || !parcelDeparture || !parcelArrival || !parcelPrice) {
      setCrudFeedback({ success: false, message: "Veuillez remplir les champs obligatoires du colis." });
      return;
    }
    try {
      const payload = {
        senderName,
        senderPhone,
        receiverName,
        receiverPhone,
        departure: parcelDeparture,
        arrival: parcelArrival,
        weight: parcelWeight ? Number(parcelWeight) : null,
        description: parcelDescription,
        price: Number(parcelPrice),
        agencyId: selectedAgencyId,
        tripId: parcelTripId || null
      };

      const activeToken = localStorage.getItem('token');
      const url = '/api/parcels';

      const res = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setCrudFeedback({ success: true, message: data.message });
        setSenderName('');
        setSenderPhone('');
        setReceiverName('');
        setReceiverPhone('');
        setParcelWeight('');
        setParcelDescription('');
        setParcelPrice(5000);
        setParcelTripId('');
        fetchParcels();
      } else {
        setCrudFeedback({ success: false, message: data.message });
      }
    } catch (err) {
      setCrudFeedback({ success: false, message: "Erreur réseau lors de l'enregistrement du colis." });
    }
  };

  const handleUpdateParcelStatus = async (parcelId: string, status: string) => {
    try {
      const activeToken = localStorage.getItem('token');
      const res = await fetch(`/api/parcels/${parcelId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        fetchParcels();
      }
    } catch (err) {
      console.error("Erreur de mise à jour du statut du colis :", err);
    }
  };

  const handleDeleteParcel = async (parcelId: string) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cet enregistrement de colis ?")) return;
    try {
      const activeToken = localStorage.getItem('token');
      const res = await fetch(`/api/parcels/${parcelId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      const data = await res.json();
      if (data.success) {
        fetchParcels();
      }
    } catch (err) {
      console.error("Erreur de suppression du colis :", err);
    }
  };

  // 6. Gestion d'Équipe (CRUD Utilisateurs - CHEF uniquement)
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCrudFeedback(null);
    try {
      const activeToken = localStorage.getItem('token');
      const res = await fetch('/api/agency/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify(userForm)
      });
      const data = await res.json();
      if (data.success) {
        setCrudFeedback({ success: true, message: data.message });
        setUserForm({ username: '', password: '', name: '', role: 'AGENT' });
        fetchAgencyUsers();
      } else {
        setCrudFeedback({ success: false, message: data.message });
      }
    } catch (err) {
      setCrudFeedback({ success: false, message: "Erreur réseau." });
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm("Voulez-vous révoquer l'accès de ce collaborateur ?")) return;
    try {
      const activeToken = localStorage.getItem('token');
      const res = await fetch(`/api/agency/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      const data = await res.json();
      if (data.success) {
        fetchAgencyUsers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleArrivalChange = (targetCity: string) => {
    setArrival(targetCity);
    const activeRoutes = routes.length > 0 ? routes : GABON_ROUTES;
    const route = activeRoutes.find(r => r.arrival === targetCity);
    if (route) {
      if (targetCity === 'Oyem') setPrice(15000);
      else if (targetCity === 'Franceville') setPrice(25000);
      else if (targetCity === 'Lambaréné') setPrice(8000);
      else if (targetCity === 'Mouila') setPrice(12000);
      else if (targetCity === 'Tchibanga') setPrice(18000);
      else if (targetCity === 'Bitam') setPrice(17000);
      else setPrice(15000); 
    }
  };

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormFeedback(null);

    const fullDepartureTime = `${departureDate}T${departureTimeOnly}:00`;

    const res = await onAddTrip({
      agencyId: selectedAgencyId,
      departure,
      arrival,
      departureTime: fullDepartureTime,
      price: Number(price),
      busCapacity: Number(busCapacity),
      busNumber,
      driverName,
      driverPhone
    });

    setIsSubmitting(false);
    if (res.success) {
      setFormFeedback({ success: true, message: "Le voyage a été planifié et est désormais réservable par les voyageurs !" });
      setDepartureTimeOnly('06:00');
    } else {
      setFormFeedback({ success: false, message: res.message || "Erreur de planification" });
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 text-slate-850 text-slate-800" id="agency-web-panel">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-4 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-950 flex items-center">
            🏢 Espace Partenaire Agences de Voyage ({activeAgency?.name || 'Agence'})
          </h2>
          <p className="text-xs text-slate-500">Gérez votre flotte de bus, planifiez vos départs et suivez vos gains au Gabon</p>
        </div>

        {/* Accréditation Badge */}
        <div className="flex items-center space-x-2 bg-slate-100 border border-slate-200 text-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold font-mono">
          <span>💼 Accréditation :</span>
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
            user?.subRole === 'CHEF' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800 animate-pulse'
          }`}>
            {user?.subRole === 'CHEF' ? "CHEF D'AGENCE" : "AGENT D'EMBARQUEMENT"}
          </span>
        </div>
      </div>

      {activeAgency && (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center space-x-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                XAF
              </div>
              <div className="text-left">
                <span className="text-[10px] text-slate-500 uppercase block font-bold">Chiffre d'Affaires</span>
                <span className="text-sm font-extrabold text-slate-900">{totalAgencySales.toLocaleString()} FCFA</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center space-x-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-700" />
              </div>
              <div className="text-left">
                <span className="text-[10px] text-slate-500 uppercase block font-bold">Gains Nets (Moins SaaS)</span>
                <span className="text-sm font-extrabold text-blue-700">{netAgencyEarnings.toLocaleString()} FCFA</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center space-x-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
                <BusIcon className="w-5 h-5 text-slate-700" />
              </div>
              <div className="text-left">
                <span className="text-[10px] text-slate-500 uppercase block font-bold">Départs Planifiés</span>
                <span className="text-sm font-extrabold text-slate-900">{agencyTrips.length} départs</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center space-x-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center">
                <Users className="w-5 h-5 text-indigo-700" />
              </div>
              <div className="text-left">
                <span className="text-[10px] text-slate-500 uppercase block font-bold">Voyageurs Réservés</span>
                <span className="text-sm font-extrabold text-slate-900">{agencyBookings.length} passagers</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center space-x-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-yellow-50 text-yellow-800 flex items-center justify-center animate-none">
                <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
              </div>
              <div className="text-left">
                <span className="text-[10px] text-slate-500 uppercase block font-bold">Note Voyageurs</span>
                <span className="text-sm font-extrabold text-slate-900 flex items-center">
                  {averageRating} / 5 <span className="text-[9px] text-slate-400 font-normal ml-1">({agencyReviews.length} avis)</span>
                </span>
              </div>
            </div>
          </div>

          {/* Sub-tab Navigation */}
          <div className="flex border-b border-slate-200 pb-px gap-2">
            <button
              onClick={() => { setDashboardTab('trips'); setCrudFeedback(null); }}
              className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
                dashboardTab === 'trips'
                  ? 'border-blue-600 text-blue-600 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Voyages & Planification</span>
            </button>
            <button
              onClick={() => { setDashboardTab('buses'); setCrudFeedback(null); }}
              className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
                dashboardTab === 'buses'
                  ? 'border-blue-600 text-blue-600 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <BusIcon className="w-3.5 h-3.5" />
              <span>Gestion Flotte (Bus)</span>
            </button>
            <button
              onClick={() => { setDashboardTab('drivers'); setCrudFeedback(null); }}
              className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
                dashboardTab === 'drivers'
                  ? 'border-blue-600 text-blue-600 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Chauffeurs</span>
            </button>
            <button
              onClick={() => { setDashboardTab('routes'); setCrudFeedback(null); }}
              className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
                dashboardTab === 'routes'
                  ? 'border-blue-600 text-blue-600 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Lignes & Itinéraires</span>
            </button>
            <button
              onClick={() => { setDashboardTab('parcels'); setCrudFeedback(null); }}
              className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
                dashboardTab === 'parcels'
                  ? 'border-blue-600 text-blue-600 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Package className="w-3.5 h-3.5 text-blue-500" />
              <span>Colis & Bagages (Fret)</span>
            </button>
            {user?.subRole === 'CHEF' && (
              <button
                onClick={() => { setDashboardTab('users'); setCrudFeedback(null); }}
                className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
                  dashboardTab === 'users'
                    ? 'border-blue-600 text-blue-600 font-extrabold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-blue-500" />
                <span>Utilisateurs (Équipe)</span>
              </button>
            )}
          </div>

          {/* DYNAMIC SUB-VIEW */}
          {dashboardTab === 'trips' && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* LEFT COLUMN: CREATE TRIP PLANNER FORM */}
                <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm text-left">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
                    <PlusCircle className="w-4 h-4 mr-1.5 text-blue-600" />
                    Planifier un Nouveau Trajet
                  </h3>

                  <form onSubmit={handleCreateTrip} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Départ</label>
                        <select
                          value={departure}
                          disabled={user?.subRole === 'AGENT'}
                          onChange={(e) => setDeparture(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-850 focus:outline-none"
                        >
                          {Array.from(new Set((routes.length > 0 ? routes : GABON_ROUTES).map(r => r.departure))).map(dep => (
                            <option key={dep} value={dep}>{dep}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Destination</label>
                        <select
                          value={arrival}
                          disabled={user?.subRole === 'AGENT'}
                          onChange={(e) => handleArrivalChange(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-850 focus:outline-none"
                        >
                          {Array.from(new Set((routes.length > 0 ? routes : GABON_ROUTES).filter(r => r.departure === departure).map(r => r.arrival))).map(arr => (
                            <option key={arr} value={arr}>{arr}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Date de Départ</label>
                        <input
                          type="date"
                          disabled={user?.subRole === 'AGENT'}
                          value={departureDate}
                          onChange={(e) => setDepartureDate(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-850 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Heure de Départ</label>
                        <input
                          type="time"
                          disabled={user?.subRole === 'AGENT'}
                          value={departureTimeOnly}
                          onChange={(e) => setDepartureTimeOnly(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-850 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Tarif Billet (FCFA)</label>
                        <input
                          type="number"
                          disabled={user?.subRole === 'AGENT'}
                          value={price}
                          onChange={(e) => setPrice(Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-850 focus:outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Immatriculation Bus</label>
                        <select
                          value={busNumber}
                          disabled={user?.subRole === 'AGENT'}
                          onChange={(e) => {
                            setBusNumber(e.target.value);
                            const match = (buses.length > 0 ? buses : BUS_PLATES).find(b => b.plate === e.target.value);
                            if (match) setBusCapacity(match.capacity);
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-850 focus:outline-none"
                        >
                          {(buses.length > 0 ? buses : BUS_PLATES).map((b, i) => (
                            <option key={b.plate + i} value={b.plate}>{b.plate} ({b.capacity} places)</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Nom Chauffeur</label>
                        <select
                          value={driverName}
                          disabled={user?.subRole === 'AGENT'}
                          onChange={(e) => {
                            setDriverName(e.target.value);
                            const match = (drivers.length > 0 ? drivers : DRIVERS).find(d => d.name === e.target.value);
                            if (match) setDriverPhone(match.phone);
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-850 focus:outline-none"
                        >
                          {(drivers.length > 0 ? drivers : DRIVERS).map((d, i) => (
                            <option key={d.name + i} value={d.name}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Contact Chauffeur</label>
                        <input
                          type="text"
                          disabled
                          value={driverPhone}
                          className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2 text-xs text-slate-500 font-mono"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting || user?.subRole === 'AGENT'}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-2 px-4 rounded-xl text-xs transition-all cursor-pointer mt-2 shadow-sm"
                    >
                      {user?.subRole === 'AGENT' ? 'Action réservée au Chef d\'agence' : isSubmitting ? 'Planification...' : 'Ajouter le Voyage au Réseau'}
                    </button>

                    {formFeedback && (
                      <div className={`p-3 rounded-xl border text-xs text-center ${
                        formFeedback.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
                      }`}>
                        {formFeedback.message}
                      </div>
                    )}
                  </form>
                </div>

                {/* RIGHT COLUMN: LIST OF ACTIVE DEPARTURES & LIVE PASSENGERS */}
                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 space-y-4 flex flex-col h-[460px] shadow-sm">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Départs Agence Planifiés
                    </h3>
                    <span className="text-[10px] text-slate-500 font-mono">{agencyTrips.length} départs enregistrés</span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {agencyTrips.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-10">Aucun départ planifié.</p>
                    ) : (
                      agencyTrips.map(trip => {
                        const tripSales = bookings
                          .filter(b => b.tripId === trip.id && (b.status === 'PAYE' || b.status === 'EMBARQUE'))
                          .reduce((sum, b) => sum + b.amount, 0);

                        return (
                          <div key={trip.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col md:flex-row justify-between gap-3 hover:bg-slate-100/50 transition-colors">
                            <div className="space-y-1 text-left flex-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs font-extrabold text-slate-900">{trip.departure} ➔ {trip.arrival}</span>
                                  <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono uppercase">{trip.busNumber}</span>
                                </div>
                                {user?.subRole === 'CHEF' && (
                                  <button
                                    onClick={() => handleDeleteTrip(trip.id)}
                                    className="text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 p-1.5 rounded-lg border border-rose-100 hover:border-rose-200 transition-colors cursor-pointer text-[10px] font-bold flex items-center space-x-1"
                                    title="Annuler ce voyage"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Annuler</span>
                                  </button>
                                )}
                              </div>
                              
                              <p className="text-[10px] text-slate-600 mt-1 text-left">
                                Départ : <strong>{new Date(trip.departureTime).toLocaleDateString('fr-FR')} à {new Date(trip.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                              </p>
                              <p className="text-[10px] text-slate-500 text-left">
                                Chauffeur : {trip.driverName} ({trip.driverPhone})
                              </p>
                            </div>

                            <div className="md:text-right flex flex-col md:items-end justify-between border-t md:border-t-0 border-slate-200 pt-2 md:pt-0 shrink-0">
                              <div>
                                <p className="text-[9px] text-slate-500">Remplissage</p>
                                <p className="text-xs font-bold text-slate-900">
                                  {trip.busCapacity - trip.availableSeats} / {trip.busCapacity} sièges
                                </p>
                              </div>
                              <p className="text-[10px] text-emerald-600 font-bold mt-1">
                                +{tripSales.toLocaleString()} FCFA
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Package Tier Notice */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center text-[10px] text-slate-600">
                    <div className="flex items-center space-x-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>SaaS Plan : <strong>Pack {activeAgency.packName}</strong></span>
                    </div>
                    <span className="text-slate-500">Frais platforme de {activeAgency.commissionRate}% actif</span>
                  </div>
                </div>

              </div>

              {/* BOTTOM SECTION: CASH INTAKES & TRAVELER REVIEWS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6 border-t border-slate-200">
                {/* PENDING CASH COLLECTION PANEL */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 flex flex-col shadow-sm">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
                      <DollarSign className="w-4 h-4 mr-1 text-emerald-600" />
                      Guichet Espèces : Paiements en Agence ({pendingCashBookings.length})
                    </h3>
                    <span className="text-[10px] bg-rose-50 text-rose-600 border border-rose-200 px-2 py-0.5 rounded-full font-bold animate-pulse">À Encaisser</span>
                  </div>

                  {cashFeedback && (
                    <div className="bg-blue-50 border border-blue-200 text-blue-800 p-2.5 rounded-xl text-xs text-center font-medium">
                      {cashFeedback}
                    </div>
                  )}

                  <div className="overflow-y-auto max-h-[300px] space-y-2 pr-1 flex-1">
                    {pendingCashBookings.length === 0 ? (
                      <div className="text-center py-10 bg-slate-900/30 rounded-2xl border border-slate-900">
                        <p className="text-xs text-slate-400">Aucun paiement en espèces en attente pour vos bus actuellement.</p>
                      </div>
                    ) : (
                      pendingCashBookings.map(booking => {
                        const trip = trips.find(t => t.id === booking.tripId);
                        return (
                          <div key={booking.id} className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between text-left">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-1.5">
                                <span className="text-xs font-bold text-slate-900">{booking.travelerName}</span>
                                <span className="text-[9px] bg-slate-200 text-slate-700 px-1 py-0.2 rounded font-mono">{booking.id}</span>
                              </div>
                              <p className="text-[10px] text-slate-500">
                                Trajet : {trip?.departure} ➔ {trip?.arrival} • Siège : N° {booking.seatNumber}
                              </p>
                              <p className="text-[9px] text-slate-400 font-mono">
                                Tel : {booking.travelerPhone}
                              </p>
                            </div>

                            <div className="text-right space-y-1.5 shrink-0">
                              <p className="text-xs font-extrabold text-slate-900">{booking.amount.toLocaleString()} FCFA</p>
                              {user?.subRole === 'CHEF' ? (
                                <button
                                  onClick={() => handleValidateCashPayment(booking.id)}
                                  disabled={processingBookingId === booking.id}
                                  className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-slate-950 font-extrabold text-[9px] px-2.5 py-1 rounded-lg shadow-sm transition-all cursor-pointer animate-fade-in"
                                >
                                  {processingBookingId === booking.id ? 'Validation...' : 'Encaisser Espèces'}
                                </button>
                              ) : (
                                <span className="text-[9.5px] text-rose-500 font-semibold bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-lg">Encaissement réservé au Chef</span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* REVIEWS & RATINGS LIST LOGS */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 flex flex-col shadow-sm">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
                      <Star className="w-4 h-4 mr-1 fill-yellow-500 text-yellow-500" />
                      Retours & Avis Clients ({agencyReviews.length})
                    </h3>
                    <div className="flex items-center space-x-1 bg-yellow-400/15 border border-yellow-400/20 px-2.5 py-0.5 rounded-full">
                      <span className="text-[10px] font-bold text-yellow-700">Moyenne : {averageRating} / 5</span>
                    </div>
                  </div>

                  <div className="overflow-y-auto max-h-[300px] space-y-2 pr-1 flex-1">
                    {agencyReviews.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 text-xs">
                        Aucun avis client publié pour le moment.
                      </div>
                    ) : (
                      agencyReviews.map(rev => (
                        <div key={rev.id} className="bg-slate-50 border border-slate-150 p-3 rounded-xl space-y-1.5 text-left">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-1.5">
                              <span className="text-[10px] font-bold text-slate-900">{rev.reviewerName}</span>
                              <span className="text-[8px] text-slate-400">{new Date(rev.createdAt).toLocaleDateString('fr-FR')}</span>
                            </div>
                            <div className="flex text-[9px]">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <span key={i}>{i < rev.rating ? '⭐' : '☆'}</span>
                              ))}
                            </div>
                          </div>
                          <p className="text-[10.5px] text-slate-600 italic leading-relaxed text-left">
                            "{rev.comment}"
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* FLOTTE DE BUS TAB */}
          {dashboardTab === 'buses' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
              {/* Form to add/edit bus */}
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm text-left">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
                  <PlusCircle className="w-4 h-4 mr-1.5 text-blue-600" />
                  {editingBusId ? "Modifier le Bus" : "Ajouter un Bus à la Flotte"}
                </h3>

                <form onSubmit={handleSaveBus} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Immatriculation du Bus</label>
                    <input
                      type="text"
                      required
                      disabled={user?.subRole === 'AGENT'}
                      placeholder="Ex: G-540-AB ou RG-110-AA"
                      value={busPlate}
                      onChange={(e) => setBusPlate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-850 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Capacité (Sièges)</label>
                    <input
                      type="number"
                      required
                      disabled={user?.subRole === 'AGENT'}
                      min={10}
                      max={80}
                      value={busCapacityState}
                      onChange={(e) => setBusCapacityState(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-850 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex space-x-2 pt-1">
                    <button
                      type="submit"
                      disabled={user?.subRole === 'AGENT'}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-2 rounded-xl text-xs transition-all cursor-pointer shadow-sm"
                    >
                      {user?.subRole === 'AGENT' ? "Action réservée au Chef d'agence" : editingBusId ? "Enregistrer" : "Ajouter à la Flotte"}
                    </button>
                    {editingBusId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingBusId(null);
                          setBusPlate('');
                          setBusCapacityState(40);
                        }}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        Annuler
                      </button>
                    )}
                  </div>

                  {crudFeedback && (
                    <div className={`p-2.5 rounded-xl border text-xs text-center ${
                      crudFeedback.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}>
                      {crudFeedback.message}
                    </div>
                  )}
                </form>
              </div>

              {/* Bus list */}
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 space-y-4 flex flex-col h-[400px] shadow-sm text-left">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Flotte d'Immatriculation Enregistrée
                </h3>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {buses.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs">
                      Aucun bus personnalisé enregistré. Vos départs utilisent les plaques standards du réseau.
                    </div>
                  ) : (
                    buses.map(bus => (
                      <div key={bus.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between hover:bg-slate-100/50 transition-all">
                        <div className="flex items-center space-x-3">
                          <div className="bg-blue-100 text-blue-800 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs uppercase">
                            🚌
                          </div>
                          <div>
                            <p className="text-xs font-extrabold text-slate-900">{bus.plate}</p>
                            <p className="text-[10px] text-slate-500">Capacité : {bus.capacity} places de bord</p>
                          </div>
                        </div>

                        {user?.subRole === 'CHEF' && (
                          <div className="flex items-center space-x-1.5">
                            <button
                              onClick={() => {
                                setEditingBusId(bus.id);
                                setBusPlate(bus.plate);
                                setBusCapacityState(bus.capacity);
                              }}
                              className="text-slate-600 hover:text-slate-900 bg-slate-200/60 p-1.5 rounded-lg transition-colors cursor-pointer"
                              title="Modifier"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteBus(bus.id)}
                              className="text-rose-600 hover:text-rose-800 bg-rose-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                              title="Supprimer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* CHAUFFEURS TAB */}
          {dashboardTab === 'drivers' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
              {/* Form to add/edit driver */}
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm text-left">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
                  <PlusCircle className="w-4 h-4 mr-1.5 text-blue-600" />
                  {editingDriverId ? "Modifier le Chauffeur" : "Enregistrer un Chauffeur"}
                </h3>

                <form onSubmit={handleSaveDriver} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Nom Complet</label>
                    <input
                      type="text"
                      required
                      disabled={user?.subRole === 'AGENT'}
                      placeholder="Ex: Paul Mba"
                      value={driverNameState}
                      onChange={(e) => setDriverNameState(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-850 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Téléphone de Contact</label>
                    <input
                      type="text"
                      required
                      disabled={user?.subRole === 'AGENT'}
                      placeholder="Ex: +241 074 50 11 22"
                      value={driverPhoneState}
                      onChange={(e) => setDriverPhoneState(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-850 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex space-x-2 pt-1">
                    <button
                      type="submit"
                      disabled={user?.subRole === 'AGENT'}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-2 rounded-xl text-xs transition-all cursor-pointer shadow-sm"
                    >
                      {user?.subRole === 'AGENT' ? "Action réservée au Chef d'agence" : "Enregistrer"}
                    </button>
                    {editingDriverId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingDriverId(null);
                          setDriverNameState('');
                          setDriverPhoneState('');
                        }}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2 px-3 rounded-xl text-xs transition-all cursor-pointer"
                      >
                        Annuler
                      </button>
                    )}
                  </div>

                  {crudFeedback && (
                    <div className={`p-2.5 rounded-xl border text-xs text-center ${
                      crudFeedback.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}>
                      {crudFeedback.message}
                    </div>
                  )}
                </form>
              </div>

              {/* Driver list */}
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 space-y-4 flex flex-col h-[400px] shadow-sm text-left">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Chauffeurs Enregistrés
                </h3>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {drivers.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs">
                      Aucun chauffeur personnalisé enregistré. Vos départs utilisent les chauffeurs standards du réseau.
                    </div>
                  ) : (
                    drivers.map(driver => (
                      <div key={driver.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between hover:bg-slate-100/50 transition-all">
                        <div className="flex items-center space-x-3">
                          <div className="bg-indigo-100 text-indigo-800 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs">
                            🧑‍✈️
                          </div>
                          <div>
                            <p className="text-xs font-extrabold text-slate-900">{driver.name}</p>
                            <p className="text-[10px] text-slate-500">Contact : {driver.phone}</p>
                          </div>
                        </div>

                        {user?.subRole === 'CHEF' && (
                          <div className="flex items-center space-x-1.5">
                            <button
                              onClick={() => {
                                setEditingDriverId(driver.id);
                                setDriverNameState(driver.name);
                                setDriverPhoneState(driver.phone);
                              }}
                              className="text-slate-600 hover:text-slate-900 bg-slate-200/60 p-1.5 rounded-lg transition-colors cursor-pointer"
                              title="Modifier"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteDriver(driver.id)}
                              className="text-rose-600 hover:text-rose-800 bg-rose-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                              title="Supprimer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* LIGNES & ITINERAIRES TAB */}
          {dashboardTab === 'routes' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
              {/* Form to add/edit route */}
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm text-left">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
                  <PlusCircle className="w-4 h-4 mr-1.5 text-blue-600" />
                  {editingRouteId ? "Modifier la Ligne" : "Ajouter une Nouvelle Ligne"}
                </h3>

                <form onSubmit={handleSaveRoute} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Ville de Départ</label>
                    <input
                      type="text"
                      required
                      disabled={user?.subRole === 'AGENT'}
                      placeholder="Ex: Libreville"
                      value={routeDeparture}
                      onChange={(e) => setRouteDeparture(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-850 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Ville de Destination</label>
                    <input
                      type="text"
                      required
                      disabled={user?.subRole === 'AGENT'}
                      placeholder="Ex: Mouila"
                      value={routeArrival}
                      onChange={(e) => setRouteArrival(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-8550 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Distance (km)</label>
                      <input
                        type="number"
                        required
                        disabled={user?.subRole === 'AGENT'}
                        value={routeDistance}
                        onChange={(e) => setRouteDistance(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-850 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Durée Estimée</label>
                      <input
                        type="text"
                        required
                        disabled={user?.subRole === 'AGENT'}
                        placeholder="Ex: 5h"
                        value={routeDuration}
                        onChange={(e) => setRouteDuration(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-850 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">État de la Route Nationale</label>
                    <select
                      value={routeCondition}
                      disabled={user?.subRole === 'AGENT'}
                      onChange={(e) => setRouteCondition(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-850 focus:outline-none focus:border-blue-500"
                    >
                      <option value="Excellente">Excellente (Bitume neuf)</option>
                      <option value="Praticable avec nids de poule">Praticable avec nids de poule</option>
                      <option value="Difficile (Travaux)">Difficile (Travaux en cours)</option>
                      <option value="Dégradée">Dégradée / Piste de latérite</option>
                    </select>
                  </div>

                  <div className="flex space-x-2 pt-1">
                    <button
                      type="submit"
                      disabled={user?.subRole === 'AGENT'}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-2 rounded-xl text-xs transition-all cursor-pointer shadow-sm"
                    >
                      {user?.subRole === 'AGENT' ? "Action réservée au Chef d'agence" : editingRouteId ? "Enregistrer" : "Créer l'Itinéraire"}
                    </button>
                    {editingRouteId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRouteId(null);
                          setRouteDeparture('');
                          setRouteArrival('');
                          setRouteDistance(250);
                          setRouteCondition('Praticable avec nids de poule');
                          setRouteDuration('4h');
                        }}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        Annuler
                      </button>
                    )}
                  </div>

                  {crudFeedback && (
                    <div className={`p-2.5 rounded-xl border text-xs text-center ${
                      crudFeedback.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}>
                      {crudFeedback.message}
                    </div>
                  )}
                </form>
              </div>

              {/* Route list */}
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 space-y-4 flex flex-col h-[400px] shadow-sm text-left">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Lignes / Itinéraires Nationaux Disponibles
                </h3>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {(routes.length > 0 ? routes : GABON_ROUTES).map(route => (
                    <div key={route.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between hover:bg-slate-100/50 transition-all">
                      <div className="flex items-center space-x-3">
                        <div className="bg-emerald-100 text-emerald-800 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs">
                          📍
                        </div>
                        <div>
                          <p className="text-xs font-extrabold text-slate-900">{route.departure} ➔ {route.arrival}</p>
                          <p className="text-[10px] text-slate-500 text-left">
                            {route.distance} km • Durée : {route.estimatedDuration} • Route : <span className="font-semibold text-slate-700">{route.roadCondition}</span>
                          </p>
                        </div>
                      </div>

                      {user?.subRole === 'CHEF' && (
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => {
                              setEditingRouteId(route.id);
                              setRouteDeparture(route.departure);
                              setRouteArrival(route.arrival);
                              setRouteDistance(route.distance);
                              setRouteCondition(route.roadCondition);
                              setRouteDuration(route.estimatedDuration);
                            }}
                            className="text-slate-600 hover:text-slate-900 bg-slate-200/60 p-1.5 rounded-lg transition-colors cursor-pointer"
                            title="Modifier"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteRoute(route.id)}
                            className="text-rose-600 hover:text-rose-800 bg-rose-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* COLIS & BAGAGES (FRET) TAB */}
          {dashboardTab === 'parcels' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
              
              {/* LEFT COLUMN: REGISTRATION FORM */}
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm text-left">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
                  <Package className="w-4 h-4 mr-1.5 text-blue-600" />
                  Enregistrer un Colis / Fret
                </h3>

                <form onSubmit={handleSaveParcel} className="space-y-3">
                  <div className="border-b border-slate-100 pb-2 mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Expéditeur (Départ)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Nom Expéditeur</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Stéphane Ndong"
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-850 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Tél Expéditeur</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: 077451289"
                        value={senderPhone}
                        onChange={(e) => setSenderPhone(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-850 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="border-b border-slate-100 pb-2 mb-2 pt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Destinataire (Arrivée)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Nom Destinataire</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Divine Louembe"
                        value={receiverName}
                        onChange={(e) => setReceiverName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-850 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Tél Destinataire</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: 065143890"
                        value={receiverPhone}
                        onChange={(e) => setReceiverPhone(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-850 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="border-b border-slate-100 pb-2 mb-2 pt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Détails de l'Expédition</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Ville Départ</label>
                      <select
                        value={parcelDeparture}
                        onChange={(e) => setParcelDeparture(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-850 focus:outline-none"
                      >
                        {Array.from(new Set((routes.length > 0 ? routes : GABON_ROUTES).map(r => r.departure))).map(dep => (
                          <option key={dep} value={dep}>{dep}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Ville Arrivée</label>
                      <select
                        value={parcelArrival}
                        onChange={(e) => setParcelArrival(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-850 focus:outline-none"
                      >
                        {Array.from(new Set((routes.length > 0 ? routes : GABON_ROUTES).map(r => r.arrival))).map(arr => (
                          <option key={arr} value={arr}>{arr}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Poids (kg) - Optionnel</label>
                      <input
                        type="number"
                        placeholder="Ex: 15"
                        value={parcelWeight}
                        onChange={(e) => setParcelWeight(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-850 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Prix de l'Envoi (FCFA)</label>
                      <input
                        type="number"
                        required
                        value={parcelPrice}
                        onChange={(e) => setParcelPrice(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-850 focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Description du contenu</label>
                    <input
                      type="text"
                      placeholder="Ex: Carton de vêtements..."
                      value={parcelDescription}
                      onChange={(e) => setParcelDescription(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-850 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Associer à un voyage (Optionnel)</label>
                    <select
                      value={parcelTripId}
                      onChange={(e) => setParcelTripId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-850 focus:outline-none"
                    >
                      <option value="">Sélectionner un bus de départ...</option>
                      {agencyTrips.map(trip => (
                        <option key={trip.id} value={trip.id}>
                          {new Date(trip.departureTime).toLocaleDateString('fr-FR')} à {new Date(trip.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({trip.departure} ➔ {trip.arrival}) - Bus {trip.busNumber}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition-all cursor-pointer shadow-sm mt-2"
                  >
                    Enregistrer l'Expédition & Envoyer les SMS
                  </button>

                  {crudFeedback && (
                    <div className={`p-2.5 rounded-xl border text-xs text-center ${
                      crudFeedback.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}>
                      {crudFeedback.message}
                    </div>
                  )}
                </form>
              </div>

              {/* RIGHT COLUMN: LIST AND TRACKING CONTROL */}
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 space-y-4 flex flex-col h-[650px] shadow-sm text-left">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Registre des Colis Envoyés ({parcels.length})
                  </h3>
                  <span className="text-[10px] text-slate-500 font-mono">Suivi en temps réel de votre fret</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {parcels.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs">
                      Aucun colis enregistré pour votre compagnie de transport actuellement.
                    </div>
                  ) : (
                    parcels.map(p => (
                      <div key={p.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between hover:bg-slate-100/50 transition-colors">
                        
                        <div className="flex justify-between items-start border-b border-slate-200 pb-2 mb-2">
                          <div>
                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Référence : {p.id}</span>
                            <div className="text-xs font-extrabold text-slate-900 mt-0.5">{p.departure} ➔ {p.arrival}</div>
                          </div>
                          
                          {user?.subRole === 'CHEF' && (
                            <button
                              onClick={() => handleDeleteParcel(p.id)}
                              className="text-rose-600 hover:text-rose-800 bg-rose-50 p-1 rounded-lg border border-rose-100"
                              title="Supprimer ce colis"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-[10.5px] text-slate-600">
                          <div>
                            <p>👨‍💼 <strong>Expéditeur :</strong> {p.senderName} ({p.senderPhone})</p>
                            <p className="mt-1">🧑‍🤝‍🧑 <strong>Destinataire :</strong> {p.receiverName} ({p.receiverPhone})</p>
                          </div>
                          <div className="text-right text-left">
                            <p>⚖️ <strong>Poids :</strong> {p.weight ? `${p.weight} kg` : "N/A"}</p>
                            <p className="mt-1">📝 <strong>Desc :</strong> {p.description || "Aucune description"}</p>
                            <p className="mt-1 text-emerald-700 font-extrabold text-xs">{p.price.toLocaleString()} FCFA</p>
                          </div>
                        </div>

                        <div className="border-t border-slate-200 pt-2.5 mt-2 flex flex-col sm:flex-row justify-between items-center gap-2">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-[10px] text-slate-500">Statut :</span>
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-extrabold ${
                              p.status === 'ENREGISTRE' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                              p.status === 'ARRIVE' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200 animate-pulse' :
                              'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}>
                              {p.status}
                            </span>
                          </div>

                          <div className="flex space-x-1.5">
                            {p.status === 'ENREGISTRE' && (
                              <button
                                onClick={() => handleUpdateParcelStatus(p.id, 'ARRIVE')}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[9px] px-2.5 py-1 rounded-lg shadow-xs cursor-pointer transition-all"
                              >
                                Marquer comme Arrivé à quai
                              </button>
                            )}
                            {p.status === 'ARRIVE' && (
                              <button
                                onClick={() => handleUpdateParcelStatus(p.id, 'LIVRE')}
                                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-[9px] px-2.5 py-1 rounded-lg shadow-xs cursor-pointer transition-all"
                              >
                                Confirmer Retrait (Livré)
                              </button>
                            )}
                            {p.status === 'LIVRE' && (
                              <span className="text-[10px] text-slate-400 font-bold flex items-center">
                                <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Colis livré et retiré
                              </span>
                            )}
                          </div>
                        </div>

                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TEAM MEMBERS GESTION (CHEF ONLY) */}
          {dashboardTab === 'users' && user?.subRole === 'CHEF' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
              
              {/* Formulaire d'enregistrement */}
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm text-left">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
                  <PlusCircle className="w-4 h-4 mr-1.5 text-blue-600" />
                  Enregistrer un Collaborateur
                </h3>

                <form onSubmit={handleSaveUser} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Nom Complet</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Marius Ndong"
                      value={userForm.name}
                      onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-850 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Identifiant (Nom d'utilisateur)</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: marius_mby"
                      value={userForm.username}
                      onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-8550 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Mot de Passe de Sécurité</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-850 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Rôle / Accréditation</label>
                    <select
                      value={userForm.role}
                      onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-850 focus:outline-none"
                    >
                      <option value="CHEF">Chef d'agence (Tous accès)</option>
                      <option value="AGENT">Agent d'embarquement (Terrain uniquement)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs transition-all shadow-sm"
                  >
                    Ajouter le Collaborateur
                  </button>
                </form>
              </div>

              {/* Tableau de l'équipe */}
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 space-y-4 flex flex-col h-[400px] shadow-sm text-left">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Comptes d'Équipe configurés
                </h3>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {agencyUsers.map(collab => (
                    <div key={collab.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-extrabold text-slate-900">{collab.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">ID : {collab.username}</p>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full ${
                          collab.role === 'CHEF' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {collab.role === 'CHEF' ? 'CHEF' : 'AGENT'}
                        </span>

                        <button
                          onClick={() => handleDeleteUser(collab.id)}
                          className="text-rose-600 hover:text-rose-800 bg-rose-50 p-1.5 rounded-lg border border-rose-100 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}
        </>
      )}
    </div>
  );
}