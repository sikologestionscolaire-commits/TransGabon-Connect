import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// INTERCEPTION GLOBALE DES APPELS D'API POUR L'APK MOBILE & LE WEB
const ORIGINAL_FETCH = window.fetch;
window.fetch = function (input, init) {
  if (typeof input === 'string' && input.startsWith('/api')) {
    
    // 1. Détecte si le site est ouvert depuis Render en production
    const isProductionWeb = window.location.hostname.includes('onrender.com');

    // 2. Mettez 'true' pour que l'APK mobile se connecte au serveur Render de production,
    // ou 'false' si vous développez et testez l'APK sur votre réseau local (192.168.1.250).
    const FORCE_PRODUCTION_APK = true; 

    // Choix automatique de l'API
    const API_BASE = (isProductionWeb || FORCE_PRODUCTION_APK)
      ? 'https://transgabon-connect.onrender.com' // API de Production (Render)
      : 'http://192.168.1.250:3000';              // API de Développement (Votre PC local)

    return ORIGINAL_FETCH(API_BASE + input, init);
  }
  return ORIGINAL_FETCH(input, init);
};