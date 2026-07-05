
import React, { useEffect, useState } from 'react';
import { Agency, Tariff } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { 
  TrendingUp, Users, ShieldAlert, Award, ChevronRight, Activity, 
  Cpu, Plus, Trash2, Edit2, Check, X, DollarSign, MapPin, KeyRound, 
  UserCheck, ShieldCheck 
} from 'lucide-react';

interface SuperAdminProps {
  agencies: Agency[];
  onRefreshData?: () => void;
}

export default function SuperAdmin({ agencies, onRefreshData }: SuperAdminProps) {
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'agencies' | 'tariffs' | 'agency_users' | 'profile'>('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [agencyList, setAgencyList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dynamic state for dynamic tariffs and agency CRUD
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const [selectedTariff, setSelectedTariff] = useState<Tariff | null>(null);

  // Agency Users list from server for SuperAdmin
  const [globalAgencyUsers, setGlobalAgencyUsers] = useState<any[]>([]);

  // Agency Form fields
  const [agencyForm, setAgencyForm] = useState({
    name: '',
    logo: '🚌',
    packName: 'Premium' as 'Starter' | 'Premium' | 'Enterprise',
    password: '',
    activeBuses: 4,
    monthlyFee: 35000
  });

  // Tariff Form fields
  const [tariffForm, setTariffForm] = useState({
    agencyId: '',
    departure: 'Libreville',
    arrival: 'Oyem',
    price: 15000
  });

  // SuperAdmin Profile Form fields
  const [adminProfileForm, setAdminForm] = useState({
    username: 'admin',
    name: 'SuperAdmin SaaS',
    password: ''
  });

  // Agency User creation Form fields for SuperAdmin
  const [adminUserForm, setAdminUserForm] = useState({
    username: '',
    password: '',
    name: '',
    role: 'AGENT',
    agencyId: ''
  });

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const fetchStats = async () => {
    try {
      const activeToken = localStorage.getItem('adminToken');
      if (!activeToken) return;

      const response = await fetch('/api/dashboard/stats', {
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
        setAgencyList(data.agencyBreakdown);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTariffs = async () => {
    try {
      const response = await fetch('/api/tariffs');
      const data = await response.json();
      if (data.success) {
        setTariffs(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchGlobalAgencyUsers = async () => {
    try {
      const activeToken = localStorage.getItem('adminToken');
      if (!activeToken) return;

      const response = await fetch('/api/admin/agency-users', {
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      const data = await response.json();
      if (data.success) {
        setGlobalAgencyUsers(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchTariffs();
    fetchGlobalAgencyUsers();
    
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  // --- AGENCY CRUD ACTIONS ---

  const handleCreateAgency = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const activeToken = localStorage.getItem('adminToken');
      const response = await fetch('/api/agencies', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify(agencyForm)
      });
      const data = await response.json();
      if (data.success) {
        showMsg(`Compagnie "${agencyForm.name}" ajoutée avec succès !`);
        setAgencyForm({
          name: '',
          logo: '🚌',
          packName: 'Premium',
          password: '',
          activeBuses: 4,
          monthlyFee: 35000
        });
        fetchStats();
        if (onRefreshData) onRefreshData();
      } else {
        showMsg(data.message || "Erreur lors de la création", 'error');
      }
    } catch (err) {
      console.error(err);
      showMsg("Erreur réseau", 'error');
    }
  };

  const handleUpdateAgency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgency) return;
    try {
      const activeToken = localStorage.getItem('adminToken');
      const response = await fetch(`/api/agencies/${selectedAgency.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify(agencyForm)
      });
      const data = await response.json();
      if (data.success) {
        showMsg(`Compagnie "${agencyForm.name}" modifiée avec succès !`);
        setSelectedAgency(null);
        setAgencyForm({
          name: '',
          logo: '🚌',
          packName: 'Premium',
          password: '',
          activeBuses: 4,
          monthlyFee: 35000
        });
        fetchStats();
        if (onRefreshData) onRefreshData();
      } else {
        showMsg(data.message || "Erreur lors de la mise à jour", 'error');
      }
    } catch (err) {
      console.error(err);
      showMsg("Erreur réseau", 'error');
    }
  };

  const handleDeleteAgency = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette agence de voyage ? Tous les voyages associés seront impactés.")) return;
    try {
      const activeToken = localStorage.getItem('adminToken');
      const response = await fetch(`/api/agencies/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      const data = await response.json();
      if (data.success) {
        showMsg("Compagnie supprimée avec succès !");
        fetchStats();
        if (onRefreshData) onRefreshData();
      } else {
        showMsg(data.message || "Impossible de supprimer l'agence", 'error');
      }
    } catch (err) {
      console.error(err);
      showMsg("Erreur de communication avec l'API", 'error');
    }
  };

  const startEditAgency = (agency: Agency) => {
    setSelectedAgency(agency);
    setAgencyForm({
      name: agency.name,
      logo: agency.logo,
      packName: agency.packName,
      password: agency.password || '',
      activeBuses: agency.activeBuses,
      monthlyFee: agency.monthlyFee
    });
  };

  // --- TARIFF CRUD ACTIONS ---

  const handleCreateTariff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tariffForm.agencyId) {
      showMsg("Veuillez sélectionner une agence", 'error');
      return;
    }
    try {
      const activeToken = localStorage.getItem('adminToken');
      const response = await fetch('/api/tariffs', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify(tariffForm)
      });
      const data = await response.json();
      if (data.success) {
        showMsg("Tarification de trajet ajoutée avec succès !");
        setTariffForm({
          agencyId: '',
          departure: 'Libreville',
          arrival: 'Oyem',
          price: 15000
        });
        fetchTariffs();
        if (onRefreshData) onRefreshData();
      } else {
        showMsg(data.message || "Erreur de création", 'error');
      }
    } catch (err) {
      console.error(err);
      showMsg("Erreur réseau", 'error');
    }
  };

  const handleUpdateTariff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTariff) return;
    try {
      const activeToken = localStorage.getItem('adminToken');
      const response = await fetch(`/api/tariffs/${selectedTariff.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify(tariffForm)
      });
      const data = await response.json();
      if (data.success) {
        showMsg("Tarification mise à jour avec succès !");
        setSelectedTariff(null);
        setTariffForm({
          agencyId: '',
          departure: 'Libreville',
          arrival: 'Oyem',
          price: 15000
        });
        fetchTariffs();
        if (onRefreshData) onRefreshData();
      } else {
        showMsg(data.message || "Erreur lors de la mise à jour", 'error');
      }
    } catch (err) {
      console.error(err);
      showMsg("Erreur réseau", 'error');
    }
  };

  const handleDeleteTariff = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer ce tarif ?")) return;
    try {
      const activeToken = localStorage.getItem('adminToken');
      const response = await fetch(`/api/tariffs/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      const data = await response.json();
      if (data.success) {
        showMsg("Tarif supprimé avec succès !");
        fetchTariffs();
        if (onRefreshData) onRefreshData();
      } else {
        showMsg(data.message || "Erreur de suppression", 'error');
      }
    } catch (err) {
      console.error(err);
      showMsg("Erreur réseau", 'error');
    }
  };

  const startEditTariff = (tariff: Tariff) => {
    setSelectedTariff(tariff);
    setTariffForm({
      agencyId: tariff.agencyId,
      departure: tariff.departure,
      arrival: tariff.arrival,
      price: tariff.price
    });
  };

  // --- SUPERADMIN PROFILE MODIFICATION ---
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const activeToken = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify(adminProfileForm)
      });
      const data = await response.json();
      if (data.success) {
        showMsg("Votre profil d'administration a été mis à jour avec succès !");
        setAdminForm(prev => ({ ...prev, password: '' })); // Vider le champ MDP après succès
      } else {
        showMsg(data.message || "Erreur lors de la mise à jour", 'error');
      }
    } catch (err) {
      showMsg("Erreur réseau", 'error');
    }
  };

  // --- AGENCY USERS CREATION BY ADMIN ---
  const handleCreateAgencyUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUserForm.agencyId) {
      showMsg("Veuillez sélectionner une agence cible", 'error');
      return;
    }
    try {
      const activeToken = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/agency-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify(adminUserForm)
      });
      const data = await response.json();
      if (data.success) {
        showMsg(data.message);
        setAdminUserForm({
          username: '',
          password: '',
          name: '',
          role: 'AGENT',
          agencyId: ''
        });
        fetchGlobalAgencyUsers();
      } else {
        showMsg(data.message || "Erreur lors de la création du compte d'accès d'agence", 'error');
      }
    } catch (err) {
      showMsg("Erreur réseau", 'error');
    }
  };

  const handleDeleteAgencyUser = async (id: string) => {
    if (!confirm("Voulez-vous vraiment révoquer ce compte d'accès d'agence ?")) return;
    try {
      const activeToken = localStorage.getItem('adminToken');
      const response = await fetch(`/api/admin/agency-users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      const data = await response.json();
      if (data.success) {
        showMsg(data.message);
        fetchGlobalAgencyUsers();
      } else {
        showMsg(data.message || "Impossible de supprimer ce collaborateur", 'error');
      }
    } catch (err) {
      showMsg("Erreur de connexion", 'error');
    }
  };

  const saasRevenueHistory = [
    { month: 'Jan', Subscriptions: 110000, Commissions: 45000 },
    { month: 'Feb', Subscriptions: 125000, Commissions: 58000 },
    { month: 'Mar', Subscriptions: 150000, Commissions: 72000 },
    { month: 'Apr', Subscriptions: 150000, Commissions: 98000 },
    { month: 'May', Subscriptions: 165000, Commissions: 112000 },
    { month: 'Jun', Subscriptions: 180000, Commissions: 130000 },
    { month: 'Jul', Subscriptions: 200000, Commissions: 145000 },
    { month: 'Aug', Subscriptions: 220000, Commissions: 160000 },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 text-slate-850" id="super-admin-panel">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-4 gap-2">
        <div>
          <h2 className="text-xl font-bold text-slate-950 flex items-center">
            👑 Super-Administration Centrale (SaaS)
          </h2>
          <p className="text-xs text-slate-500">Abonnements SaaS, commissions de billetterie & régulation des tarifs gabonais</p>
        </div>
        <div className="bg-emerald-100 border border-emerald-200 text-emerald-800 px-3 py-1 rounded-xl text-xs flex items-center font-mono shadow-sm">
          <Activity className="w-3.5 h-3.5 mr-1.5 animate-pulse" />
          REGULATEUR NATIONAL
        </div>
      </div>

      {/* Sub tabs navigation */}
      <div className="flex flex-wrap space-x-1 bg-slate-100 p-1 rounded-2xl w-fit">
        <button
          onClick={() => setActiveSubTab('dashboard')}
          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'dashboard' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          📈 Tableau de bord
        </button>
        <button
          onClick={() => setActiveSubTab('agencies')}
          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'agencies' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          🏢 Gestion des Agences ({agencies.length})
        </button>
        <button
          onClick={() => setActiveSubTab('agency_users')}
          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'agency_users' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          🧑‍🤝‍🧑 Comptes Agences ({globalAgencyUsers.length})
        </button>
        <button
          onClick={() => setActiveSubTab('tariffs')}
          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'tariffs' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          💵 Gestion des Tarifs ({tariffs.length})
        </button>
        <button
          onClick={() => setActiveSubTab('profile')}
          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'profile' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          👤 Mon Compte Admin
        </button>
      </div>

      {message && (
        <div className={`p-3 rounded-2xl text-xs font-semibold flex items-center shadow-sm border ${
          message.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <span>{message.type === 'success' ? '✅' : '⚠️'}</span>
          <span className="ml-2">{message.text}</span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20">
          <span className="text-xl animate-spin block">🌀</span>
          <p className="text-xs text-slate-500 mt-2">Calcul des revenus récurrents du marché gabonais...</p>
        </div>
      ) : (
        <>
          {activeSubTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Top High-level KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1 shadow-sm text-left">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Volume d'Affaires Global (GMV)</span>
                  <p className="text-lg font-extrabold text-slate-900">{(stats?.totalEarnings || 0).toLocaleString()} FCFA</p>
                  <span className="text-[9px] text-slate-500">Ventes totales de billets</span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1 shadow-sm text-left">
                  <span className="text-[10px] text-emerald-800 uppercase font-bold block">REVENUS SAAS GLOBAUX (MRR)</span>
                  <p className="text-lg font-extrabold text-emerald-700">{(stats?.platformRevenue || 0).toLocaleString()} FCFA</p>
                  <span className="text-[9px] text-slate-500">Abonnements + commissions SaaS</span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1 shadow-sm text-left">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Abonnements Fixes Agences</span>
                  <p className="text-lg font-extrabold text-slate-900">{(stats?.subscriptionRevenue || 0).toLocaleString()} FCFA/mois</p>
                  <span className="text-[9px] text-slate-500">{agencies.length} Agences partenaires enregistrées</span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1 shadow-sm text-left">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Commissions de Billetterie</span>
                  <p className="text-lg font-extrabold text-slate-900">{(stats?.commissionRevenue || 0).toLocaleString()} FCFA</p>
                  <span className="text-[9px] text-slate-500">Basé sur les taux de 0.8% à 1.5%</span>
                </div>
              </div>

              {/* Visual Revenue Performance Section */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* SaaS MRR GROWTH CHART */}
                <div className="lg:col-span-8 bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 shadow-sm text-left">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Croissance des Revenus Récurrents (MRR)
                  </h3>
                  
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={saasRevenueHistory}>
                        <defs>
                          <linearGradient id="colorSubs" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorComms" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="month" stroke="#64748b" fontSize={10} />
                        <YAxis stroke="#64748b" fontSize={10} unit=" F" />
                        <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#1e293b', fontSize: '11px' }} />
                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                        <Area type="monotone" dataKey="Subscriptions" name="Abonnements Agences" stroke="#10b981" fillOpacity={1} fill="url(#colorSubs)" />
                        <Area type="monotone" dataKey="Commissions" name="Commissions Billets" stroke="#3b82f6" fillOpacity={1} fill="url(#colorComms)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* BREAKDOWN BOX BY SUBSCRIPTION PACKS */}
                <div className="lg:col-span-4 bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm text-slate-800 text-left">
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Modèle Économique National
                    </h3>
                    <p className="text-[11px] text-slate-500">Plans tarifaires SaaS facturés mensuellement aux compagnies de transport gabonaises :</p>
                    
                    <div className="space-y-3 pt-2">
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                        <div>
                          <span className="text-[10px] font-bold text-amber-600 block">PACK STARTER</span>
                          <span className="text-[9px] text-slate-500 font-medium">1.5% commission + 15k FCFA/mois</span>
                        </div>
                      </div>

                      <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                        <div>
                          <span className="text-[10px] font-bold text-blue-600 block">PACK PREMIUM</span>
                          <span className="text-[9px] text-slate-500 font-medium">1.0% commission + 35k FCFA/mois</span>
                        </div>
                      </div>

                      <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                        <div>
                          <span className="text-[10px] font-bold text-emerald-600 block">PACK ENTERPRISE</span>
                          <span className="text-[9px] text-slate-500 font-medium">0.8% commission + 50k FCFA/mois</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 mt-4 text-[9px] text-slate-500 flex items-center space-x-2 shadow-sm">
                    <Cpu className="w-4 h-4 text-emerald-600 shrink-0" />
                    <p>Système multi-tenant hébergé de manière sécurisée et extensible à tout autre type de transport gabonais (bateaux, gares fluviales).</p>
                  </div>
                </div>
              </div>

              {/* PARTNER AGENCIES DETAILED EARNINGS TABLE */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 shadow-sm text-left">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Statuts Financiers des Compagnies Partenaires
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-800">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 uppercase font-bold text-[9px]">
                        <th className="py-2">Compagnie</th>
                        <th className="py-2">SaaS Plan</th>
                        <th className="py-2 text-right">Abonnement Fixe</th>
                        <th className="py-2 text-right">Ventes Ticket</th>
                        <th className="py-2 text-right">Commissions Générées</th>
                        <th className="py-2 text-right">Gains Récurrents Totaux</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {agencyList.map((ag) => {
                        const totalRec = ag.subscriptionFee + ag.commissionEarned;
                        const match = agencies.find(a => a.name === ag.name);
                        return (
                          <tr key={ag.name} className="hover:bg-slate-100/50 transition-all">
                            <td className="py-3 font-bold text-slate-900 flex items-center">
                              <span className="mr-1.5 text-base">{match?.logo || '🚌'}</span> {ag.name}
                            </td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                                ag.pack === 'Enterprise' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                ag.pack === 'Premium' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}>
                                {ag.pack}
                              </span>
                            </td>
                            <td className="py-3 text-right font-mono">{ag.subscriptionFee.toLocaleString()} F</td>
                            <td className="py-3 text-right font-mono text-slate-500">{ag.sales.toLocaleString()} F</td>
                            <td className="py-3 text-right font-mono text-indigo-700">{ag.commissionEarned.toLocaleString()} F</td>
                            <td className="py-3 text-right font-mono text-emerald-700 font-bold">{totalRec.toLocaleString()} F</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'agencies' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form to Add / Edit */}
              <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center">
                  <Plus className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                  {selectedAgency ? "Modifier l'Agence" : "Ajouter une Agence de Voyage"}
                </h3>

                <form onSubmit={selectedAgency ? handleUpdateAgency : handleCreateAgency} className="space-y-3 text-left">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Nom de l'Agence *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Major Transport"
                      value={agencyForm.name}
                      onChange={(e) => setAgencyForm({ ...agencyForm, name: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Emoji Logo</label>
                      <select
                        value={agencyForm.logo}
                        onChange={(e) => setAgencyForm({ ...agencyForm, logo: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs focus:outline-none focus:border-emerald-500 appearance-none"
                      >
                        <option value="🚌">🚌 Bus Standard</option>
                        <option value="🦁">🦁 Lion Express</option>
                        <option value="🏆">🏆 Star Transport</option>
                        <option value="⚡">⚡ Gabon Rapide</option>
                        <option value="🦅">🦅 L'Ogooué Trans</option>
                        <option value="🐆">🐆 Panthère Voyage</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Plan Abonnement</label>
                      <select
                        value={agencyForm.packName}
                        onChange={(e) => {
                          const pack = e.target.value as 'Starter' | 'Premium' | 'Enterprise';
                          const fees = pack === 'Starter' ? 15000 : pack === 'Premium' ? 35000 : 50000;
                          setAgencyForm({ ...agencyForm, packName: pack, monthlyFee: fees });
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Starter">Starter (15k F)</option>
                        <option value="Premium">Premium (35k F)</option>
                        <option value="Enterprise">Enterprise (50k F)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Nombre de Bus</label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={agencyForm.activeBuses}
                        onChange={(e) => setAgencyForm({ ...agencyForm, activeBuses: parseInt(e.target.value) || 1 })}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Abonnement Mensuel (FCFA)</label>
                      <input
                        type="number"
                        min={0}
                        required
                        value={agencyForm.monthlyFee}
                        onChange={(e) => setAgencyForm({ ...agencyForm, monthlyFee: parseInt(e.target.value) || 0 })}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex space-x-2 pt-2">
                    {selectedAgency && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAgency(null);
                          setAgencyForm({
                            name: '',
                            logo: '🚌',
                            packName: 'Premium',
                            password: '',
                            activeBuses: 4,
                            monthlyFee: 35000
                          });
                        }}
                        className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        Annuler
                      </button>
                    )}
                    <button
                      type="submit"
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      {selectedAgency ? "Enregistrer" : "Créer l'Agence"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Agencies List table */}
              <div className="lg:col-span-7 bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 text-left">Compagnies Agréées</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-800">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 uppercase font-bold text-[9px]">
                        <th className="py-2">Compagnie</th>
                        <th className="py-2">Formule</th>
                        <th className="py-2 text-right">Bus</th>
                        <th className="py-2 text-right">Mensualité</th>
                        <th className="py-2 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {agencies.map((agency) => (
                        <tr key={agency.id} className="hover:bg-slate-100/50 transition-all">
                          <td className="py-3 font-bold text-slate-900 flex items-center">
                            <span className="mr-1.5 text-base">{agency.logo || '🚌'}</span>
                            <div>
                              <span>{agency.name}</span>
                              <span className="block text-[8px] text-slate-400 font-mono font-normal">ID: {agency.id}</span>
                            </div>
                          </td>
                          <td className="py-3">
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-slate-200 text-slate-700">
                              {agency.packName}
                            </span>
                          </td>
                          <td className="py-3 text-right font-mono">{agency.activeBuses}</td>
                          <td className="py-3 text-right font-mono text-emerald-700 font-bold">{agency.monthlyFee.toLocaleString()} F</td>
                          <td className="py-3 text-center">
                            <div className="flex justify-center items-center space-x-1">
                              <button
                                onClick={() => startEditAgency(agency)}
                                className="p-1 hover:bg-slate-200 text-slate-600 rounded cursor-pointer"
                                title="Modifier"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteAgency(agency.id)}
                                className="p-1 hover:bg-rose-100 text-rose-600 rounded cursor-pointer"
                                title="Supprimer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* COMPTES AGENCES (SUPERADMIN CONFIGURE ACCES COLLABORATEURS DE TOUTES LES AGENCES) */}
          {activeSubTab === 'agency_users' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
              {/* Form to create agency accounts */}
              <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center text-left">
                  <Plus className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                  Créer un compte Collaborateur d'Agence
                </h3>

                <form onSubmit={handleCreateAgencyUser} className="space-y-3 text-left">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Agence cible *</label>
                    <select
                      required
                      value={adminUserForm.agencyId}
                      onChange={(e) => setAdminUserForm({ ...adminUserForm, agencyId: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs focus:outline-none"
                    >
                      <option value="">-- Sélectionner l'agence cible --</option>
                      {agencies.map(ag => (
                        <option key={ag.id} value={ag.id}>{ag.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Nom complet *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Marius Obiang"
                      value={adminUserForm.name}
                      onChange={(e) => setAdminUserForm({ ...adminUserForm, name: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Identifiant (username) *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: marius_major"
                      value={adminUserForm.username}
                      onChange={(e) => setAdminUserForm({ ...adminUserForm, username: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Mot de Passe de Sécurité *</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={adminUserForm.password}
                      onChange={(e) => setAdminUserForm({ ...adminUserForm, password: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Rôle / Accréditation *</label>
                    <select
                      value={adminUserForm.role}
                      onChange={(e) => setAdminUserForm({ ...adminUserForm, role: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs focus:outline-none"
                    >
                      <option value="CHEF">Chef d'agence (Tous accès d'agence)</option>
                      <option value="AGENT">Agent d'embarquement (Terrain uniquement)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                  >
                    Créer le compte agence
                  </button>
                </form>
              </div>

              {/* Table of all agency users on the platform */}
              <div className="lg:col-span-7 bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 text-left">Comptes d'Accès Agences enregistrés</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-800">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 uppercase font-bold text-[9px]">
                        <th className="py-2">Nom / ID</th>
                        <th className="py-2">Compagnie affiliée</th>
                        <th className="py-2">Accréditation</th>
                        <th className="py-2 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {globalAgencyUsers.map(collab => (
                        <tr key={collab.id} className="hover:bg-slate-100/50 transition-all">
                          <td className="py-3">
                            <p className="font-bold text-slate-900">{collab.name}</p>
                            <p className="text-[9px] text-slate-400 font-mono">ID : {collab.username}</p>
                          </td>
                          <td className="py-3 font-semibold text-slate-700">
                            {collab.agencyName}
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                              collab.role === 'CHEF' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {collab.role === 'CHEF' ? 'CHEF' : 'AGENT'}
                            </span>
                          </td>
                          <td className="py-3 text-center">
                            <button
                              onClick={() => handleDeleteAgencyUser(collab.id)}
                              className="p-1 hover:bg-rose-100 text-rose-600 rounded cursor-pointer"
                              title="Révoquer l'accès"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'tariffs' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form to Add / Edit Tariff */}
              <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center text-left">
                  <DollarSign className="w-3.5 h-3.5 mr-1 text-indigo-500" />
                  {selectedTariff ? "Modifier la Tarification" : "Créer une Tarification de Trajet"}
                </h3>

                <form onSubmit={selectedTariff ? handleUpdateTariff : handleCreateTariff} className="space-y-3 text-left">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Compagnie de Transport *</label>
                    <select
                      required
                      value={tariffForm.agencyId}
                      onChange={(e) => setTariffForm({ ...tariffForm, agencyId: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">-- Choisir une agence --</option>
                      {agencies.map(ag => (
                        <option key={ag.id} value={ag.id}>{ag.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Ville Départ *</label>
                      <select
                        value={tariffForm.departure}
                        onChange={(e) => setTariffForm({ ...tariffForm, departure: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Libreville">Libreville</option>
                        <option value="Oyem">Oyem</option>
                        <option value="Bitam">Bitam</option>
                        <option value="Mouila">Mouila</option>
                        <option value="Port-Gentil">Port-Gentil</option>
                        <option value="Lambaréné">Lambaréné</option>
                        <option value="Franceville">Franceville</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Destination *</label>
                      <select
                        value={tariffForm.arrival}
                        onChange={(e) => setTariffForm({ ...tariffForm, arrival: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Oyem">Oyem</option>
                        <option value="Libreville">Libreville</option>
                        <option value="Bitam">Bitam</option>
                        <option value="Mouila">Mouila</option>
                        <option value="Port-Gentil">Port-Gentil</option>
                        <option value="Lambaréné">Lambaréné</option>
                        <option value="Franceville">Franceville</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Prix Fixé (FCFA) *</label>
                    <input
                      type="number"
                      min={1000}
                      step={500}
                      required
                      placeholder="Ex: 15000"
                      value={tariffForm.price}
                      onChange={(e) => setTariffForm({ ...tariffForm, price: parseInt(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs focus:outline-none focus:border-emerald-500 font-mono text-emerald-700 font-bold"
                    />
                    <span className="text-[8px] text-slate-400">Régule le tarif public officiel de l'agence sur cet itinéraire</span>
                  </div>

                  <div className="flex space-x-2 pt-2">
                    {selectedTariff && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTariff(null);
                          setTariffForm({
                            agencyId: '',
                            departure: 'Libreville',
                            arrival: 'Oyem',
                            price: 15000
                          });
                        }}
                        className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        Annuler
                      </button>
                    )}
                    <button
                      type="submit"
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      {selectedTariff ? "Enregistrer" : "Créer le Tarif"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Tariffs List Table */}
              <div className="lg:col-span-7 bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 text-left">Tarifs Nationaux Homologués</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-800">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 uppercase font-bold text-[9px]">
                        <th className="py-2">Compagnie</th>
                        <th className="py-2">Ligne de voyage</th>
                        <th className="py-2">Tarification</th>
                        <th className="py-2 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {tariffs.map((tariff) => (
                        <tr key={tariff.id} className="hover:bg-slate-100/50 transition-all">
                          <td className="py-3 font-semibold text-slate-900">
                            {tariff.agencyName}
                          </td>
                          <td className="py-3 font-bold text-slate-700">
                            {tariff.departure} ➔ {tariff.arrival}
                          </td>
                          <td className="py-3 font-mono font-bold text-emerald-600">
                            {tariff.price.toLocaleString()} FCFA
                          </td>
                          <td className="py-3 text-center">
                            <div className="flex justify-center space-x-1">
                              <button
                                onClick={() => startEditTariff(tariff)}
                                className="p-1 hover:bg-slate-200 text-slate-600 rounded cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteTariff(tariff.id)}
                                className="p-1 hover:bg-rose-100 text-rose-600 rounded cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* MON COMPTE ADMIn (MODIFICATION PROFIL SUPERADMIN) */}
          {activeSubTab === 'profile' && (
            <div className="max-w-md mx-auto bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 text-left animate-fade-in">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
                <KeyRound className="w-4 h-4 mr-1.5 text-blue-600" />
                Paramètres de Sécurité de mon Compte
              </h3>
              <p className="text-[11px] text-slate-500">Mettez à jour vos identifiants administrateur de la plateforme TransGabon Connect.</p>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Nom Public</label>
                  <input
                    type="text"
                    required
                    value={adminProfileForm.name}
                    onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })} // Erreur d'orthographe d'état corrigée
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Identifiant Administrateur (username)</label>
                  <input
                    type="text"
                    required
                    value={adminProfileForm.username}
                    onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Nouveau mot de passe de sécurité</label>
                  <input
                    type="password"
                    placeholder="Saisissez un nouveau mot de passe..."
                    value={adminProfileForm.password}
                    onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none font-mono"
                  />
                  <span className="text-[8px] text-slate-400 block mt-1">Laissez vide si vous souhaitez conserver le mot de passe actuel.</span>
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-xl text-xs transition-all cursor-pointer shadow-sm"
                >
                  Mettre à jour mes identifiants
                </button>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
}