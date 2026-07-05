import React, { useState, useEffect } from 'react';
import { Trip, Booking } from '../types';
import { QrCode, ClipboardList, CheckCircle, Search, Bus, MapPin, UserCheck, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MobileAgentProps {
  onValidateBooking: (ticketId: string) => Promise<{ success: boolean; message: string; data?: any }>;
  bookings: Booking[];
  trips: Trip[];
}

export default function MobileAgent({ onValidateBooking, bookings, trips }: MobileAgentProps) {
  const [activeTab, setActiveTab] = useState<'scan' | 'manifest'>('scan');
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [scanInputCode, setScanInputCode] = useState('');
  
  // Scanning animation simulator
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);

  // Synchronisation asynchrone pour sélectionner le premier trajet dès qu'ils sont chargés du serveur
  useEffect(() => {
    if (!selectedTripId && trips.length > 0) {
      setSelectedTripId(trips[0].id);
    }
  }, [trips, selectedTripId]);

  // Filtered bookings for the selected trip
  const activeTrip = trips.find(t => t.id === selectedTripId);
  const tripBookings = bookings.filter(b => b.tripId === selectedTripId);

  // Simulate scanning ticket
  const handleSimulatedScan = async (ticketId: string) => {
    setIsScanning(true);
    setScanResult(null);

    // Short artificial scanning timeout
    setTimeout(async () => {
      setIsScanning(false);
      const res = await onValidateBooking(ticketId);
      setScanResult({
        success: res.success,
        message: res.message
      });
      if (res.success) {
        setScanInputCode('');
      }
    }, 1200);
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      {/* Mobile Wrapper Simulator Frame */}
      <div className="relative w-[375px] h-[780px] bg-slate-900 rounded-[48px] border-8 border-slate-800 shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Top Notch Status Bar */}
        <div className="absolute top-0 inset-x-0 h-8 bg-slate-950 flex justify-between items-center px-6 z-30 rounded-t-[40px]">
          <span className="text-[11px] font-medium tracking-tight text-amber-500">10:15</span>
          <div className="w-20 h-4 bg-slate-900 rounded-full border border-slate-800/60 absolute left-1/2 -translate-x-1/2 top-1"></div>
          <div className="flex items-center space-x-1.5 text-xs">
            <span className="text-[9px] font-bold text-slate-400">Agent-App</span>
            <div className="w-5 h-2.5 border border-slate-100/40 rounded-sm p-0.5 flex">
              <div className="h-full w-4 bg-amber-500 rounded-2xs"></div>
            </div>
          </div>
        </div>

        {/* Dynamic App Body */}
        <div className="flex-1 pt-8 pb-14 overflow-y-auto bg-slate-950 relative">
          
          {/* Header */}
          <div className="bg-gradient-to-b from-amber-950/40 to-slate-950 px-4 pt-4 pb-3 flex justify-between items-center border-b border-slate-900">
            <div>
              <div className="flex items-center space-x-1">
                <span className="text-xl">📋</span>
                <h1 className="text-sm font-bold tracking-tight text-white">Validation Embarquement</h1>
              </div>
              <p className="text-[10px] text-amber-500 font-mono">Terminal Agence Terrain</p>
            </div>
            <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full text-[8px] font-bold">
              GARE ROUTIÈRE
            </span>
          </div>

          {/* TRIP SELECTOR FOR AGENT */}
          <div className="p-3 bg-slate-900/40 border-b border-slate-900">
            <label className="block text-[8px] uppercase font-bold text-slate-400 mb-1">Sélectionner un voyage actif</label>
            <div className="relative">
              <Bus className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-amber-500" />
              <select
                value={selectedTripId}
                onChange={(e) => {
                  setSelectedTripId(e.target.value);
                  setScanResult(null);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-1.5 pl-8 pr-3 text-xs text-white focus:outline-none focus:border-amber-500 appearance-none text-left"
              >
                <option value="">-- Choisir un départ --</option>
                {trips.map(t => (
                  <option key={t.id} value={t.id}>
                    [{t.agencyName}] {t.departure} ➔ {t.arrival} ({t.busNumber})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {activeTrip && (
            <div className="px-3 py-2 bg-slate-900/10 border-b border-slate-900 flex justify-between items-center text-[9px] text-slate-400">
              <div className="flex items-center">
                <MapPin className="w-3 h-3 mr-1 text-slate-500" />
                <span>Capacité : <strong>{activeTrip.busCapacity} sièges</strong></span>
              </div>
              <div className="flex items-center">
                <UserCheck className="w-3 h-3 mr-1 text-slate-500" />
                <span>Embarqués : <strong className="text-emerald-400">{tripBookings.filter(b => b.status === 'EMBARQUE').length}</strong></span>
              </div>
            </div>
          )}

          {/* MAIN TAB SWITCHING */}
          {activeTab === 'scan' ? (
            /* --- SCANNER VIEW --- */
            <div className="p-4 space-y-4" id="agent-scan-panel">
              <div className="text-center space-y-1">
                <h3 className="text-xs font-bold text-white">Scanner de Billet</h3>
                <p className="text-[9px] text-slate-400">Vérification instantanée par QR code ou saisie manuelle</p>
              </div>

              {/* SIMULATED CAMERA VIEWPORT */}
              <div className="relative w-56 h-56 mx-auto bg-slate-900 rounded-3xl border-2 border-slate-800 overflow-hidden flex flex-col items-center justify-center">
                
                {/* Scanner Grid Lines Overlays */}
                <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-amber-500"></div>
                <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-amber-500"></div>
                <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-amber-500"></div>
                <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-amber-500"></div>

                {/* Laser animation */}
                <div className="absolute inset-x-4 h-0.5 bg-amber-500/80 shadow-md shadow-amber-500/50 animate-bounce"></div>

                {isScanning ? (
                  <div className="text-center space-y-1 z-10">
                    <span className="text-2xl animate-spin block">🌀</span>
                    <span className="text-[10px] text-amber-500 font-mono">Lecture du code QR...</span>
                  </div>
                ) : (
                  <div className="text-center space-y-2 px-4 z-10">
                    <QrCode className="w-12 h-12 text-slate-600 mx-auto" />
                    <span className="text-[9px] text-slate-500 text-center">Simulez le scan en sélectionnant un billet existant ci-dessous</span>
                  </div>
                )}
              </div>

              {/* QUICK SCAN TRIGGERS FROM RECENT BOOKINGS */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
                <label className="block text-[8px] uppercase font-bold text-slate-400 mb-2">Billets à quai (Pour simulation)</label>
                
                {tripBookings.length === 0 ? (
                  <p className="text-[9px] text-slate-500 text-center py-2">Aucun voyageur n'a acheté de billet pour ce départ.</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {tripBookings.map(b => (
                      <div 
                        key={b.id}
                        onClick={() => !isScanning && handleSimulatedScan(b.id)}
                        className={`p-2 rounded-xl flex justify-between items-center text-left text-xs transition-all cursor-pointer ${
                          b.status === 'EMBARQUE'
                            ? 'bg-slate-950/50 border border-emerald-950/40 opacity-60 pointer-events-none'
                            : 'bg-slate-950 border border-slate-800 hover:border-amber-500/40'
                        }`}
                      >
                        <div>
                          <p className="font-bold text-white text-[10px]">{b.travelerName}</p>
                          <p className="text-[8px] text-slate-400 font-mono">Réf : {b.id} | Siège : {b.seatNumber}</p>
                        </div>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                          b.status === 'EMBARQUE' ? 'bg-emerald-500/10 text-emerald-400' :
                          b.status === 'EN_ATTENTE' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                          'bg-amber-500/20 text-amber-500'
                        }`}>
                          {b.status === 'EMBARQUE' ? 'EMBARQUÉ' : 
                           b.status === 'EN_ATTENTE' ? 'À PAYER' : 'PAYÉ (Vérifier)'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* MANUAL CODE ENTRY */}
              <div className="space-y-1.5 text-left">
                <label className="block text-[8px] uppercase font-bold text-slate-400">Saisie Manuelle Code Billet</label>
                <div className="flex space-x-1">
                  <input
                    type="text"
                    placeholder="Ex: TX-GAB-1029"
                    value={scanInputCode}
                    onChange={(e) => setScanInputCode(e.target.value.toUpperCase())}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                  <button
                    onClick={() => scanInputCode.trim() && handleSimulatedScan(scanInputCode.trim())}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold px-3 py-1.5 rounded-xl text-xs cursor-pointer"
                  >
                    Valider
                  </button>
                </div>
              </div>

              {/* SCAN RESULT RESPONSE */}
              <AnimatePresence>
                {scanResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`p-3 rounded-2xl border text-center text-xs flex items-center justify-center space-x-2 ${
                      scanResult.success 
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' 
                        : 'bg-rose-500/10 border-rose-500/40 text-rose-400'
                    }`}
                  >
                    {scanResult.success ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
                    <p>{scanResult.message}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            /* --- MANIFEST PASSENGER VIEW --- */
            <div className="p-4 space-y-3 animate-fade-in" id="agent-manifest-panel">
              <div className="flex justify-between items-center mb-1 text-left">
                <h3 className="text-xs font-bold text-white">Manifeste Passagers</h3>
                <span className="text-[9px] text-slate-400">{tripBookings.length} total</span>
              </div>

              <div className="space-y-2 max-h-[480px] overflow-y-auto">
                {tripBookings.length === 0 ? (
                  <p className="text-[10px] text-slate-500 text-center py-10">Aucun voyageur sur ce trajet.</p>
                ) : (
                  tripBookings.map((b) => (
                    <div 
                      key={b.id}
                      className="bg-slate-900 border border-slate-800/80 rounded-2xl p-3 flex justify-between items-start text-left"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-md font-bold">
                            Siège {b.seatNumber}
                          </span>
                          <h4 className="text-xs font-bold text-white">{b.travelerName}</h4>
                        </div>
                        <p className="text-[9px] text-slate-400">CNI : {b.travelerCni}</p>
                        <p className="text-[9px] text-slate-400 font-mono">Contact : {b.travelerPhone}</p>
                        <p className="text-[8px] text-slate-500 font-mono">Billet : {b.id}</p>
                      </div>

                      <div className="text-right flex flex-col items-end space-y-2 shrink-0">
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                          b.status === 'EMBARQUE' ? 'bg-emerald-500/10 text-emerald-400' : 
                          b.status === 'EN_ATTENTE' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse' :
                          'bg-amber-500/10 text-amber-500'
                        }`}>
                          {b.status === 'EMBARQUE' ? 'EMBARQUÉ' : 
                           b.status === 'EN_ATTENTE' ? 'À PAYER' : 'PAYÉ'}
                        </span>

                        {b.status !== 'EMBARQUE' && (
                          <button
                            onClick={() => onValidateBooking(b.id)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-2 py-1 rounded text-[8px] cursor-pointer"
                          >
                            Embarquer
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM NAVIGATION TAB BAR */}
        <div className="absolute bottom-0 inset-x-0 h-14 bg-slate-950/95 border-t border-slate-900 flex justify-around items-center px-4 z-20">
          <button 
            onClick={() => setActiveTab('scan')}
            className={`flex flex-col items-center justify-center space-y-0.5 cursor-pointer ${activeTab === 'scan' ? 'text-amber-500' : 'text-slate-500 hover:text-slate-400'}`}
          >
            <QrCode className="w-4 h-4" />
            <span className="text-[9px]">Scanner QR</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('manifest')}
            className={`flex flex-col items-center justify-center space-y-0.5 cursor-pointer ${activeTab === 'manifest' ? 'text-amber-500' : 'text-slate-500 hover:text-slate-400'}`}
          >
            <ClipboardList className="w-4 h-4" />
            <span className="text-[9px]">Manifeste</span>
          </button>
        </div>

      </div>
    </div>
  );
}