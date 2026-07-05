import React, { useState, useEffect } from 'react';
import { Play, Code, Database, Server, RefreshCw, ChevronRight, KeyRound } from 'lucide-react';

export default function ApiSandbox() {
  const [activeEndpoint, setActiveEndpoint] = useState<'GET_TRIPS' | 'POST_BOOKING' | 'SIMULATE_PAY' | 'VALIDATE_QR' | 'GET_PARCEL'>('GET_TRIPS');
  const [requestBody, setRequestBody] = useState<string>('');
  const [authToken, setAuthToken] = useState<string>(''); // Token JWT pour tester les routes d'agences sécurisées
  const [responseOutput, setResponseOutput] = useState<string>('// Cliquez sur "Tester l\'API" pour effectuer une requête en direct au serveur Express.');
  const [loading, setLoading] = useState(false);

  // Predefined parameters for display
  const endpoints = {
    GET_TRIPS: {
      method: 'GET',
      path: '/api/trips',
      description: 'Récupère la liste de tous les départs de bus programmés au Gabon avec filtrage possible par destination.',
      body: null
    },
    POST_BOOKING: {
      method: 'POST',
      path: '/api/bookings',
      description: 'Enregistre une réservation de billet de transport terrestre avec assignation de siège et méthode de paiement.',
      body: JSON.stringify({
        tripId: "trip-1",
        travelerName: "Marius Obame",
        travelerPhone: "+241 077 12 34 56",
        travelerCni: "240102930293",
        seatNumber: 18,
        paymentMethod: "AIRTEL_MONEY",
        paymentPhone: "077123456"
      }, null, 2)
    },
    SIMULATE_PAY: {
      method: 'POST',
      path: '/api/payment/simulate',
      description: 'Déclenche une requête de push USSD sécurisée de paiement mobile money (Airtel/Moov Money API standard).',
      body: JSON.stringify({
        phone: "076123456",
        amount: 15000,
        operator: "AIRTEL_MONEY"
      }, null, 2)
    },
    VALIDATE_QR: {
      method: 'POST',
      path: '/api/tickets/validate',
      description: 'Valide un ticket de voyage à l\'embarquement terrain à partir du QR code ou de l\'identifiant unique (Sécurisé).',
      body: JSON.stringify({
        ticketId: "TX-GAB-1029"
      }, null, 2)
    },
    GET_PARCEL: {
      method: 'GET',
      path: '/api/parcels/track/COL-GAB-1029', // Exemple avec une référence de seed
      description: 'Permet à un voyageur de suivre l\'acheminement national d\'un colis anonymement sans authentification.',
      body: null
    }
  };

  // Récupération automatique d'une session de test active du localStorage (Agence ou SuperAdmin)
  useEffect(() => {
    const storedToken = localStorage.getItem('token') || localStorage.getItem('adminToken') || '';
    setAuthToken(storedToken);
  }, []);

  // Sync body when endpoint changes
  useEffect(() => {
    const ep = endpoints[activeEndpoint];
    setRequestBody(ep.body ? ep.body : '');
    setResponseOutput('// Prêt pour le test d\'API sécurisée.');
  }, [activeEndpoint]);

  const handleTestApi = async () => {
    setLoading(true);
    setResponseOutput('// Envoi de la requête HTTP...');
    const ep = endpoints[activeEndpoint];

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      // Si un token JWT est renseigné, on l'injecte dans les en-têtes d'autorisation
      if (authToken.trim()) {
        headers['Authorization'] = `Bearer ${authToken.trim()}`;
      }

      let options: RequestInit = {
        method: ep.method,
        headers: headers
      };

      if (ep.method === 'POST') {
        options.body = requestBody;
      }

      // Query real server
      const response = await fetch(ep.path, options);
      const data = await response.json();
      
      setResponseOutput(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setResponseOutput(JSON.stringify({
        success: false,
        message: "Erreur de connexion avec l'API sécurisée",
        error: err.message
      }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 text-slate-850" id="api-sandbox-panel">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-950 flex items-center">
          🔌 API Sandbox Intégrée & Documentation
        </h2>
        <p className="text-xs text-slate-500">
          Explorez et testez en direct l'API sécurisée de billetterie et de paiement pour le marché gabonais.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: ENDPOINT SELECTOR, JWT ENTRY & DOC */}
        <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center">
            <Server className="w-4 h-4 mr-1.5 text-blue-600" />
            Endpoints de l'Application
          </h3>

          <div className="space-y-2">
            {(Object.keys(endpoints) as Array<keyof typeof endpoints>).map((key) => {
              const item = endpoints[key];
              const isActive = activeEndpoint === key;

              return (
                <button
                  key={key}
                  onClick={() => setActiveEndpoint(key)}
                  className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex justify-between items-center shadow-sm ${
                    isActive 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold' 
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-350 hover:bg-slate-100/30'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1.5">
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                        item.method === 'GET' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {item.method}
                      </span>
                      <span className="text-[10px] font-mono text-slate-900">{item.path}</span>
                    </div>
                    <p className="text-[9px] text-slate-500 line-clamp-1">{item.description}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              );
            })}
          </div>

          {/* En-tête d'authentification dynamique JWT */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 text-[10px] text-slate-600 shadow-sm text-left">
            <span className="font-bold text-slate-800 flex items-center">
              <KeyRound className="w-3.5 h-3.5 mr-1 text-slate-500" /> Jeton de Sécurité (JWT)
            </span>
            <p className="text-[9px] text-slate-500 leading-relaxed">
              Indispensable pour tester les endpoints sécurisés. Les jetons d'agences ou d'administration actifs y sont automatiquement pré-remplis.
            </p>
            <input
              type="text"
              placeholder="Collez votre Bearer Token JWT ici..."
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-[9.5px] text-slate-700 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Active documentation text block */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 text-[10px] text-slate-600 shadow-sm text-left">
            <span className="font-bold text-slate-800">Sécurité et Authentification</span>
            <p className="leading-relaxed">
              Toutes les requêtes de l'API de paiement mobile (Airtel Money Gabon / Moov Money) utilisent un protocole OAuth 2.0 sécurisé avec chiffrement TLS et jeton d'authentification Bearer token pour empêcher les fraudes.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: REQUEST BODY INPUT & LIVE SERVER OUTPUT RESPONSE */}
        <div className="lg:col-span-7 bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col space-y-3 h-[420px] shadow-sm">
          
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center">
              <Code className="w-4 h-4 mr-1.5 text-blue-600" />
              Requête & Console Réponse
            </h3>
            
            <button
              onClick={handleTestApi}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white font-bold px-3 py-1.5 rounded-xl text-[10px] flex items-center space-x-1 cursor-pointer transition-all shadow-sm"
            >
              <Play className="w-3 h-3 text-white fill-current" />
              <span>{loading ? 'Requête en cours...' : 'Tester l\'API'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
            {/* Request JSON Body Input area */}
            <div className="flex flex-col space-y-1.5 text-left">
              <span className="text-[9px] font-bold text-slate-500 uppercase">JSON Body (Editable)</span>
              {endpoints[activeEndpoint].body ? (
                <textarea
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  className="w-full flex-1 bg-white border border-slate-200 rounded-xl p-3 font-mono text-[9px] text-slate-850 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none shadow-inner"
                />
              ) : (
                <div className="w-full flex-1 bg-slate-100 border border-slate-200 rounded-xl p-3 font-mono text-[9px] text-slate-400 flex items-center justify-center text-center">
                  Pas de corps de requête nécessaire pour GET
                </div>
              )}
            </div>

            {/* Server Response block */}
            <div className="flex flex-col space-y-1.5 text-left">
              <span className="text-[9px] font-bold text-slate-500 uppercase">Server Response (Live output)</span>
              <pre className="w-full flex-1 bg-slate-950 border border-slate-850 rounded-xl p-3 font-mono text-[9px] text-emerald-400 overflow-auto whitespace-pre-wrap select-text shadow-inner">
                {responseOutput}
              </pre>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}